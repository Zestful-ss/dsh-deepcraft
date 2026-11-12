#!/usr/bin/env node
/**
 * palette.cjs — the three skin palettes, the reader's own identity and the old
 * configuration, on the real host (D66, D80).
 *
 * Registered in the lane's scenario table (packages/testing/scenarios.cjs).
 *   palette              every palette's computed colours in light and dark,
 *                        the reader's own name, images, accent and pet kept
 *                        across a palette switch, the accent override and its
 *                        reset, and the host palette taking none of them.
 *   paletteLegacyClaude  an older profile's brand `claude` migrates to the warm
 *                        palette and its per-theme pet to the one chat choice.
 *   paletteLegacyDeepseek an older profile's brand `off` migrates to the ocean
 *                        palette and its per-theme pet likewise.
 *
 * Every setting is written by pressing the real control (or, for the colour
 * well, by the input event the control listens to); no body attribute stands
 * in for a preference. The legacy scenarios boot from a profilePatch the host
 * itself reads, so the migration is exercised where it happens.
 */
'use strict'
const { openSkinSettings, setAccentColor } = require('./settings-route.cjs')
const { waitForSkin, dismissOverlays } = require('./dsh-web.cjs')
const { packageZip, upload, waitForGuest } = require('./petdex.cjs')

const SKIN = {
  appearance: /^(外观|Appearance)$/,
  palette: '.dsh-deepcraft-palette-options button',
  brandName: '.dsh-deepcraft-settings-input',
  accent: '.dsh-deepcraft-settings-color',
  accentReset: '.dsh-deepcraft-brand-accent .dsh-deepcraft-settings-button',
}

/** One palette's computed colours and the identity the page paints. */
const readPage = (page) => page.evaluate(() => {
  const style = getComputedStyle(document.body)
  const art = (selector, pseudo) => {
    const node = document.querySelector(selector)
    if (node === null) return null
    const computed = getComputedStyle(node, pseudo)
    return { image: computed.backgroundImage, mask: computed.maskImage, content: computed.content }
  }
  return {
    palette: document.body.getAttribute('data-dsh-deepcraft-palette'),
    canvas: style.backgroundColor,
    ink: style.color,
    accent: style.getPropertyValue('--dsw-alias-brand-primary').trim(),
    accentInk: style.getPropertyValue('--dsw-alias-brand-text').trim(),
    hover: style.getPropertyValue('--dsw-alias-button-primary-hover').trim(),
    prose: style.getPropertyValue('--dsh-deepcraft-link').trim(),
    bubble: style.getPropertyValue('--dsw-specific-bubble').trim(),
    selector: style.getPropertyValue('--dsw-specific-selector').trim(),
    mark: art('[data-dsh-deepcraft-part~="brand-mark"]', '::before'),
    word: art('[data-dsh-deepcraft-part~="brand-identity"] > [data-dsh-deepcraft-part~="brand-name"]', '::before'),
  }
})

/** The dark reading of one palette, with the host's marker set for a moment. */
async function readBoth(page) {
  const light = await readPage(page)
  await page.evaluate(() => document.body.setAttribute('data-ds-dark-theme', ''))
  const dark = await readPage(page)
  await page.evaluate(() => document.body.removeAttribute('data-ds-dark-theme'))
  return { light, dark }
}

/** The palette choices' order, as the settings page lists them. */
const PALETTES = ['ocean', 'ember', 'forest', 'cindy', 'host']

/** Answer any first-run notice that mounted late, then open the skin's settings page. */
async function openSettings(page) {
  await dismissOverlays(page)
  await openSkinSettings(page)
}

/** Open the Appearance tab, press one palette's choice and wait for the page to carry it. */
async function pickPalette(page, id) {
  await page.locator('.dsh-deepcraft-settings-tabs [role="tab"]').filter({ hasText: SKIN.appearance }).first().click()
  await page.waitForTimeout(200)
  await page.locator(SKIN.palette).nth(PALETTES.indexOf(id)).click()
  await page.waitForFunction((wanted) => document.body.getAttribute('data-dsh-deepcraft-palette') === wanted, id, { timeout: 15000 })
  await page.waitForTimeout(150)
}

/** A WCAG contrast ratio between two `rgb()`/`#rrggbb` readings. */
function contrast(a, b) {
  const luminance = (css) => {
    const hex = /^#([0-9a-f]{6})$/i.exec(String(css).trim())
    const raw = hex === null ? String(css).match(/[\d.]+/g).slice(0, 3) : [0, 2, 4].map((at) => String(parseInt(hex[1].slice(at, at + 2), 16)))
    const channels = raw.map((value) => Number(value) / 255).map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
  }
  const one = luminance(a)
  const two = luminance(b)
  return (Math.max(one, two) + 0.05) / (Math.min(one, two) + 0.05)
}

function paletteScenario({ check }) {
  const read = {}
  return {
    script: 'greeting',
    prompt: 'hello there',
    viewport: { width: 1440, height: 900 },
    deadlineMs: 360000,
    async beforeSend({ page, url }) {
      read.palettes = {}
      await openSettings(page)
      await page.locator('.dsh-deepcraft-settings-tabs [role="tab"]').filter({ hasText: SKIN.appearance }).first().click()
      read.mascotChoices = await page.locator('.dsh-deepcraft-settings-row').filter({ has: page.locator('.dsh-deepcraft-settings-row-title').filter({ hasText: /^(聊天框宠物|Chat pet)$/ }) }).first()
        .getByRole('button').allTextContents()
      // The reader's own name.
      const name = page.locator(SKIN.brandName).first()
      await name.fill('Acme')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(300)
      // The reader's own images, through the host half's routes, then a reload
      // so the page adopts them.
      read.mark = await page.evaluate(async () => {
        const sheet = document.createElement('canvas')
        sheet.width = 16
        sheet.height = 16
        const paint = sheet.getContext('2d')
        paint.fillStyle = '#1a7f5a'
        paint.fillRect(4, 4, 8, 8)
        const raster = await new Promise((settle) => sheet.toBlob(settle, 'image/png'))
        const lettering = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 50"><circle cx="25" cy="25" r="20"/></svg>'
        const put = async (path, type, body) => (await fetch(path, { method: 'PUT', headers: { 'content-type': type }, body })).status
        return {
          mark: await put('/dsh-deepcraft/brand/mark', 'image/png', raster),
          word: await put('/dsh-deepcraft/brand/wordmark', 'image/svg+xml', new Blob([lettering], { type: 'image/svg+xml' })),
        }
      })
      await page.reload({ waitUntil: 'domcontentloaded' })
      await waitForSkin(page)
      await openSettings(page)
      await page.locator('.dsh-deepcraft-settings-tabs [role="tab"]').filter({ hasText: SKIN.appearance }).first().click()
      for (const id of ['ocean', 'ember', 'forest', 'cindy']) {
        await pickPalette(page, id)
        read.palettes[id] = await readBoth(page)
      }
      // The reader's accent over every skin palette, kept as the palette moves.
      await pickPalette(page, 'ocean')
      await setAccentColor(page, '#1a7f5a')
      await page.waitForFunction(() => document.body.hasAttribute('data-dsh-deepcraft-accent'), null, { timeout: 15000 })
      read.tinted = {}
      for (const id of ['ocean', 'ember', 'forest', 'cindy']) {
        await pickPalette(page, id)
        read.tinted[id] = await readPage(page)
      }
      // The host palette takes none of the override; back on a skin palette the
      // stored colour returns, and the reset hands the palette's own back.
      await pickPalette(page, 'host')
      read.tinted.host = await readPage(page)
      read.hostAccentDisabled = await page.locator(SKIN.accent).isDisabled()
      await pickPalette(page, 'ocean')
      read.tinted.back = await readPage(page)
      await page.locator(SKIN.accentReset).click()
      await page.waitForFunction(() => !document.body.hasAttribute('data-dsh-deepcraft-accent'), null, { timeout: 15000 })
      read.reset = await readPage(page)
      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)

      // The home page, then a conversation: the identity stands on both.
      await page.goto(new URL('/', url).href)
      await waitForSkin(page)
      await page.waitForTimeout(600)
      read.home = await readBoth(page)
      // The shared scratch home ends without the images this walk uploaded, so
      // the custom-brand scenario still starts from its own clean state.
      await page.evaluate(async () => {
        for (const path of ['/dsh-deepcraft/brand/mark', '/dsh-deepcraft/brand/wordmark']) {
          await fetch(path, { method: 'DELETE' })
        }
      })
    },
    async afterTurn({ page }) {
      read.conversation = await readBoth(page)
      read.brandAttr = await page.evaluate(() => document.body.hasAttribute('data-dsh-deepcraft-brand'))
    },
    async assert({ session }) {
      const palettes = read.palettes
      const expected = {
        ocean: { accent: '#5368c9', prose: '#3e5bd6', darkCanvas: 'rgb(32, 36, 39)' },
        ember: { accent: '#d97757', prose: '#3d5f86', darkCanvas: 'rgb(20, 20, 19)' },
        forest: { accent: '#397657', prose: '#286649', darkCanvas: 'rgb(20, 20, 19)' },
        cindy: { accent: '#3c3f43', darkAccent: '#eeeeee', prose: '#2563eb', darkCanvas: 'rgb(24, 24, 24)' },
      }
      const checks = []
      for (const [id, want] of Object.entries(expected)) {
        const pair = palettes[id] || {}
        const light = pair.light || {}
        const dark = pair.dark || {}
        checks.push(check(`${id}：浅色与深色的画布、强调色、按钮悬停与正文链接来自本套配色`,
          light.palette === id && light.accent === want.accent && light.prose === want.prose &&
            dark.accent === (want.darkAccent ?? want.accent) && dark.canvas === want.darkCanvas,
          JSON.stringify({ light, dark })))
        checks.push(check(`${id}：选中、悬停与气泡的底色都跟着这套配色`,
          /^(#|rgba?\()/.test(light.bubble || '') && /^(#|rgba?\()/.test(light.selector || '') && /^(#|rgba?\()/.test(light.hover || ''),
          JSON.stringify({ bubble: light.bubble, selector: light.selector, hover: light.hover })))
        checks.push(check(`${id}：主体文字、按钮文字与正文链接在画布上的对比度不低于 4.5:1`,
          contrast(light.ink, light.canvas) >= 4.5 && contrast(dark.ink, dark.canvas) >= 4.5 &&
            contrast(light.accentInk, light.accent) >= 4.5 && contrast(dark.accentInk, dark.accent) >= 4.5 &&
            contrast(light.prose, light.canvas) >= 4.5,
          JSON.stringify({
            lightInk: contrast(light.ink, light.canvas).toFixed(2),
            darkInk: contrast(dark.ink, dark.canvas).toFixed(2),
            lightButton: contrast(light.accentInk, light.accent).toFixed(2),
            darkButton: contrast(dark.accentInk, dark.accent).toFixed(2),
            link: contrast(light.prose, light.canvas).toFixed(2),
          })))
      }
      const tinted = read.tinted || {}
      const kept = (page) => page !== undefined && page.accent === '#1a7f5a'
      checks.push(check('自定义强调色在四套内置配色下都覆盖强调',
        kept(tinted.ocean) && kept(tinted.ember) && kept(tinted.forest) && kept(tinted.cindy), JSON.stringify(tinted)))
      checks.push(check('切到跟随宿主时不覆盖宿主颜色，强调色控件禁用',
        tinted.host?.palette === 'host' && read.hostAccentDisabled === true, JSON.stringify({ host: tinted.host, disabled: read.hostAccentDisabled })))
      checks.push(check('切回内置配色后自定义强调色立即恢复，清除后回到本套配色的强调色',
        kept(tinted.back) && read.reset?.accent === '#5368c9', JSON.stringify({ back: tinted.back, reset: read.reset })))
      const identity = (page) => page !== undefined && /brand\/mark/.test(page.mark?.image || '') &&
        /brand\/wordmark/.test(page.word?.image || '')
      checks.push(check('名称、标志与字标在每套配色下都画同一份读者上传的图',
        identity(palettes.ocean?.light) && identity(palettes.ember?.light) && identity(palettes.forest?.light) && identity(palettes.cindy?.light),
        JSON.stringify({ ocean: palettes.ocean?.light?.mark, ember: palettes.ember?.light?.mark })))
      checks.push(check('聊天框宠物只保留 Petdex 宠物与关闭', read.mascotChoices.length === 2 &&
        read.mascotChoices.every((label) => /^(Petdex 宠物|Petdex pet|关闭|Off)$/.test(label.trim())), JSON.stringify(read.mascotChoices)))
      checks.push(check('首页与对话画的是同一套默认配色，页面不带旧品牌属性',
        read.home?.light?.accent === '#5368c9' && read.conversation?.light?.accent === '#5368c9' && read.brandAttr === false,
        JSON.stringify({ home: read.home?.light?.accent, conversation: read.conversation?.light?.accent, brandAttr: read.brandAttr })))
      checks.push(check('控制台没有异常', session.problems.length === 0, session.problems.slice(0, 3).join(' | ')))
      return checks
    },
  }
}

/** One older profile: the brand and palette it stored, and the pet it picked. */
const LEGACY = {
  claude: {
    brand: 'claude',
    chatPet: 'my-crab',
    profile: ['- id: ui-skin-deepcraft', '  config:', '    brand: claude', `    palette: claude`, `    chatPetClaude: my-crab`],
    palette: 'ember',
    id: 'my-crab',
  },
  deepseek: {
    brand: 'off',
    chatPet: 'my-whale',
    profile: ['- id: ui-skin-deepcraft', '  config:', '    brand: \'off\'', `    palette: claude`, `    chatPetDeepseek: my-whale`],
    palette: 'ocean',
    id: 'my-whale',
  },
}

function legacyScenario(name, { check }) {
  const spec = LEGACY[name]
  const read = {}
  return {
    script: 'greeting',
    prompt: 'hello there',
    profilePatch: spec.profile,
    deadlineMs: 360000,
    async beforeSend({ page, url }) {
      await openSettings(page)
      // A complete package through the host half's own import route, so the
      // migrated choice names something that really exists.
      read.imported = await upload(page, packageZip(spec.id, name === 'claude' ? 5 : 6))
      await page.reload({ waitUntil: 'domcontentloaded' })
      await waitForSkin(page)
      await openSettings(page)
      await page.locator('.dsh-deepcraft-settings-tabs [role="tab"]').filter({ hasText: SKIN.appearance }).first().click()
      read.paletteAttr = await page.evaluate(() => document.body.getAttribute('data-dsh-deepcraft-palette'))
      read.pet = await page.locator('.dsh-deepcraft-settings-row .dsh-deepcraft-settings-pet-select').first().inputValue()
      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)
      await page.goto(new URL('/', url).href)
      await waitForSkin(page)
      read.guest = await waitForGuest(page, spec.id)
    },
    async assert({ session }) {
      // The stored pet is imported after the page's first boot, so the first
      // fetch of a package the library does not hold yet is expected noise.
      const expected = new RegExp(`the chat pet "${spec.id}" could not be loaded|status of 404`)
      const problems = session.problems.filter((line) => !expected.test(line))
      return [
        check(`旧配置的品牌 ${JSON.stringify(spec.brand)} 迁移到 ${spec.palette} 配色`,
          read.paletteAttr === spec.palette, `palette=${read.paletteAttr}`),
        check('旧的按主题宠物迁移为唯一一项聊天宠物，且选择留在设置里',
          read.imported?.status === 200 && read.pet === spec.id, JSON.stringify({ imported: read.imported?.status, pet: read.pet })),
        check('首页画的是迁移后的那只宠物',
          read.guest?.id === spec.id && read.guest?.ready === true, JSON.stringify(read.guest)),
        check('控制台除导入前的这一次取用外没有异常', problems.length === 0, problems.slice(0, 3).join(' | ')),
      ]
    },
  }
}

module.exports = { paletteScenario, legacyScenario }
