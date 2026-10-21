#!/usr/bin/env node
/**
 * petdex.cjs — Petdex pets on the real host (D78).
 *
 * Registered in the lane's scenario table (packages/testing/scenarios.cjs).
 *
 * Two complete packages are packed here and installed through the host half's
 * own import route, byte for byte; the settings page then picks one per theme,
 * and the home card must draw that package's atlas at 72×78 with its own
 * action names. The run does not download a preset and does not touch the
 * machine's own `~/.petdex`: the host boots with a scratch user home
 * (packages/testing/e2e.cjs), so the library resolves under the run's own
 * directory.
 */
'use strict'
const fs = require('node:fs')
const path = require('node:path')
const { PNG } = require('pngjs')
const { zipSync } = require('fflate')
const { openSkinSettings } = require('./settings-route.cjs')
const { waitForSkin } = require('./dsh-web.cjs')

const ROUTES = {
  library: '/dsh-deepcraft/pets',
  import: '/dsh-deepcraft/pets/import',
  image: '/dsh-deepcraft/pets/image',
}
const ROW = '.dsh-deepcraft-settings-row'
const ROW_TITLE = '.dsh-deepcraft-settings-row-title'
const TITLE = { chat: /聊天框宠物包|Chat pet package/, import: /导入宠物包|Import a pet package/ }

/** The rows on the Appearance tab, in rank order. */
const TAB = /^(外观|Appearance)$/

/** One 768×936 atlas (eight 96-pixel columns, nine 104-pixel rows), coloured per row. */
function atlas(seed) {
  const png = new PNG({ width: 768, height: 936 })
  for (let y = 0; y < 936; y++) {
    for (let x = 0; x < 768; x++) {
      const at = (y * 768 + x) * 4
      png.data[at] = (x + seed * 53) % 256
      png.data[at + 1] = Math.floor(y / 104) * 24
      png.data[at + 2] = (Math.floor(x / 96) * 24 + seed * 31) % 256
      png.data[at + 3] = 255
    }
  }
  return PNG.sync.write(png)
}

/** One package archive: its manifest exactly as the importer must store it. */
function packageZip(id, seed, extra = {}) {
  const manifest = Buffer.from(JSON.stringify({
    id,
    displayName: `${id} e2e`,
    description: 'a package the lane packed',
    spritesheetPath: 'atlas.png',
    ...extra,
  }, null, 2))
  return zipSync({ 'pet.json': manifest, 'atlas.png': atlas(seed) }, { level: 0 })
}

/** POST one archive from the page, through the host's fence and the page's cookie. */
function upload(page, archive) {
  return page.evaluate(async ({ route, bytes }) => {
    const body = Uint8Array.from(atob(bytes), character => character.charCodeAt(0))
    const response = await fetch(route, { method: 'POST', headers: { 'content-type': 'application/zip' }, body })
    return { status: response.status, answer: await response.json() }
  }, { route: ROUTES.import, bytes: Buffer.from(archive).toString('base64') })
}

const rowOf = (page, title) => page.locator(ROW).filter({ has: page.locator(ROW_TITLE).filter({ hasText: title }) }).first()

async function openAppearance(page) {
  await page.locator('.dsh-deepcraft-settings-tabs [role="tab"]').filter({ hasText: TAB }).first().click()
  await page.waitForTimeout(250)
}

/** Open the settings page on its Appearance tab, through the shell's own way in. */
async function openSettings(page) {
  await openSkinSettings(page)
  await openAppearance(page)
}

/** The home page, where the composer guest stands, with the skin installed. */
async function openHome(page, url) {
  await page.goto(new URL('/', url).href)
  await waitForSkin(page)
}

const mascotRow = (page) => page.locator(ROW).filter({ has: page.locator(ROW_TITLE).filter({ hasText: /^(聊天框宠物|Chat pet)$/ }) }).first()

/** Pick one of the mascot row's choices. */
function pickMascot(page, label) {
  return mascotRow(page).locator('button').filter({ hasText: label }).first().click()
}

/** The page's reading of the composer's Petdex guest. */
const readGuest = (page) => page.evaluate(() => {
  const node = document.querySelector('.dsh-deepcraft-petdex')
  if (node === null) return null
  const strip = node.querySelector('.dsh-deepcraft-petdex-strip')
  const sprite = node.querySelector('.dsh-deepcraft-petdex-sprite')
  const box = node.getBoundingClientRect()
  const spriteBox = sprite === null ? null : sprite.getBoundingClientRect()
  return {
    id: node.getAttribute('data-dsh-deepcraft-pet-id'),
    action: node.getAttribute('data-dsh-deepcraft-pet-action'),
    animation: node.getAttribute('data-animation'),
    ready: node.hasAttribute('data-ready'),
    width: box.width,
    height: box.height,
    spriteWidth: spriteBox === null ? null : spriteBox.width,
    spriteHeight: spriteBox === null ? null : spriteBox.height,
    sheet: strip === null ? null : getComputedStyle(strip).backgroundImage,
  }
})

/** The chat picker's options, for a failure that names what the page was offered. */
const chatOptions = (page) => page.evaluate(() => {
  const select = document.querySelector('.dsh-deepcraft-settings-row .dsh-deepcraft-settings-pet-select')
  return select === null ? null : Array.from(select.options).map((option) => option.value)
})

async function waitForGuest(page, id) {
  await page.waitForFunction((wanted) => {
    const node = document.querySelector('.dsh-deepcraft-petdex')
    return node !== null && node.getAttribute('data-dsh-deepcraft-pet-id') === wanted && node.hasAttribute('data-ready')
  }, id, { timeout: 30000 })
  await page.waitForTimeout(300)
  return readGuest(page)
}

async function pickBrand(page, brand) {
  // The two brand cards live on the General tab.
  await page.locator('.dsh-deepcraft-settings-tabs [role="tab"]').filter({ hasText: /^(通用|General)$/ }).first().click()
  await page.waitForTimeout(250)
  await page.locator(`.dsh-deepcraft-brand-card[data-brand="${brand}"]`).first().click()
  await page.waitForTimeout(400)
  await openAppearance(page)
}

function petdexScenario({ check }) {
  const read = {}
  return {
    script: 'greeting',
    prompt: 'hello there',
    async beforeSend({ page, home, url }) {
      read.packages = []
      await openSettings(page)
      const claudeId = 'e2e-crab'
      const deepseekId = 'e2e-whale'
      read.imported = []
      for (const [id, seed] of [[claudeId, 1], [deepseekId, 2]]) {
        const answer = await upload(page, packageZip(id, seed))
        read.imported.push({ id, status: answer.status, pet: answer.answer.pet })
      }
      // A declared version that disagrees with the atlas is refused as a whole.
      read.wrongVersion = await upload(page, packageZip('e2e-bad', 3, { spriteVersionNumber: 2 }))
      read.traversal = await upload(page, zipSync({ '../evil.png': atlas(4) }, { level: 0 }))
      // The picker reads the library when the page mounts: reload so the two
      // packages installed above are offered.
      await page.reload()
      await page.waitForTimeout(800)
      await openSettings(page)

      // Each theme's chat field chooses its own package.
      await pickBrand(page, 'claude')
      await openAppearance(page)
      read.libraryEarly = await page.evaluate(async () => (await fetch('/dsh-deepcraft/pets')).json())
      read.chatOptions = await chatOptions(page)
      if (!(read.chatOptions ?? []).includes(claudeId)) {
        throw new Error(`the chat picker does not offer ${claudeId}: ${JSON.stringify({ options: read.chatOptions, library: read.libraryEarly })}`)
      }
      await rowOf(page, TITLE.chat).locator('.dsh-deepcraft-settings-pet-select').selectOption(claudeId)
      await page.waitForTimeout(200)
      await openHome(page, url)
      read.claude = await waitForGuest(page, claudeId)

      await openSettings(page)
      await pickBrand(page, 'deepseek')
      await rowOf(page, TITLE.chat).locator('.dsh-deepcraft-settings-pet-select').selectOption(deepseekId)
      await page.waitForTimeout(200)
      await openHome(page, url)
      read.deepseek = await waitForGuest(page, deepseekId)

      await openSettings(page)
      await pickBrand(page, 'claude')
      await openHome(page, url)
      read.backToClaude = await waitForGuest(page, claudeId)

      // The chat switch retires the guest alone.
      await openSettings(page)
      await pickMascot(page, /^(关闭|Off)$/)
      await openHome(page, url)
      await page.waitForTimeout(400)
      read.chatOff = await readGuest(page)
      await openSettings(page)
      await pickMascot(page, /跟随主题宠物|Theme pet/)
      await openHome(page, url)
      read.chatBack = await waitForGuest(page, claudeId)

      // The library reports what was installed, with the original ids intact.
      read.library = await page.evaluate(async (route) => (await fetch(route)).json(), ROUTES.library)
      read.userHome = path.join(home, 'user', '.petdex', 'pets')
      read.stored = fs.existsSync(path.join(read.userHome, claudeId, 'pet.json')) &&
        fs.existsSync(path.join(read.userHome, deepseekId, 'pet.json'))
    },
    async assert() {
      const claude = read.claude
      const deepseek = read.deepseek
      const imported = read.imported ?? []
      return [
        check('两个完整包经宿主半边的导入路由原样落盘',
          imported.length === 2 && imported.every((entry) => entry.status === 200 && entry.pet?.id === entry.id) && read.stored === true,
          JSON.stringify(imported)),
        check('版本与图集不符的包整包拒绝；穿越路径的条目也拒绝',
          read.wrongVersion?.status === 400 && read.traversal?.status === 400,
          JSON.stringify({ version: read.wrongVersion?.status, traversal: read.traversal?.status })),
        check('Claude 主题画 Claude 选中的包：72×78，同一张原图',
          !!claude && claude.id === 'e2e-crab' && claude.ready && claude.width === 72 && claude.height === 78 &&
            claude.spriteWidth === 72 && claude.spriteHeight === 78 &&
            typeof claude.sheet === 'string' && claude.sheet.includes(`${ROUTES.image}/e2e-crab`) && claude.action === 'idle',
          JSON.stringify(claude)),
        check('DeepSeek 主题画自己选中的人：两个主题各自的聊天框字段互不影响',
          !!deepseek && deepseek.id === 'e2e-whale' && deepseek.ready && deepseek.sheet.includes(`${ROUTES.image}/e2e-whale`),
          JSON.stringify(deepseek)),
        check('切回 Claude 后仍是 Claude 原先选中的包',
          !!read.backToClaude && read.backToClaude.id === 'e2e-crab', JSON.stringify(read.backToClaude)),
        check('导入后库里两个包都在，清单 id 未被改写',
          read.library?.ok === true && ['e2e-crab', 'e2e-whale'].every((id) => read.library.pets.some((pet) => pet.id === id && pet.sourceId === id)),
          JSON.stringify(read.library?.pets?.map((pet) => pet.id))),
        check('聊天位置的开关收起聊天宠物，随后重新出现',
          read.chatOff === null && read.chatBack?.id === 'e2e-crab',
          JSON.stringify({ off: read.chatOff, back: read.chatBack })),
      ]
    },
  }
}

module.exports = { petdexScenario }
