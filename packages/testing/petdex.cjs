#!/usr/bin/env node
/**
 * petdex.cjs — Petdex pets on the real host (D80).
 *
 * Registered in the lane's scenario table (packages/testing/scenarios.cjs).
 *
 * Two complete packages are packed here and installed through the host half's
 * own import route, byte for byte; the settings page then picks one for the chat
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
const { waitForSkin, dismissOverlays } = require('./dsh-web.cjs')

const ROUTES = {
  library: '/dsh-deepcraft/pets',
  import: '/dsh-deepcraft/pets/import',
  image: '/dsh-deepcraft/pets/image',
}
const ROW = '.dsh-deepcraft-settings-row'
const ROW_TITLE = '.dsh-deepcraft-settings-row-title'
const TITLE = { chat: /聊天框宠物包|Chat pet package/, import: /导入宠物包|Import a pet package/ }
const { sendPrompt, waitForTurn, PROMPT_HOST } = require('./prompt.cjs')

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
  await dismissOverlays(page)
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

/** The palette choices on the Appearance tab, in the settings page's order. */
async function pickPalette(page, at) {
  await page.locator('.dsh-deepcraft-palette-options button').nth(at).click()
  await page.waitForTimeout(300)
}

function petdexScenario({ check }) {
  const read = {}
  return {
    script: 'greeting',
    prompt: 'hello there',
    async beforeSend({ page, home, url }) {
      read.packages = []
      await openSettings(page)
      const firstId = 'e2e-crab'
      const secondId = 'e2e-whale'
      read.imported = []
      for (const [id, seed] of [[firstId, 1], [secondId, 2]]) {
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

      // One choice for the chat position, whatever palette is in force (D80).
      read.libraryEarly = await page.evaluate(async () => (await fetch('/dsh-deepcraft/pets')).json())
      read.chatOptions = await chatOptions(page)
      if (!(read.chatOptions ?? []).includes(firstId)) {
        throw new Error(`the chat picker does not offer ${firstId}: ${JSON.stringify({ options: read.chatOptions, library: read.libraryEarly })}`)
      }
      await rowOf(page, TITLE.chat).locator('.dsh-deepcraft-settings-pet-select').selectOption(firstId)
      await page.waitForTimeout(200)
      await openHome(page, url)
      read.first = await waitForGuest(page, firstId)

      // The palettes change colours alone: the same guest stays through both.
      await openSettings(page)
      await pickPalette(page, 1)
      await openHome(page, url)
      read.hostPalette = await waitForGuest(page, firstId)
      await openSettings(page)
      await pickPalette(page, 0)
      await openHome(page, url)
      read.backPalette = await waitForGuest(page, firstId)

      // A new choice replaces it, and survives a reload.
      await openSettings(page)
      await rowOf(page, TITLE.chat).locator('.dsh-deepcraft-settings-pet-select').selectOption(secondId)
      await page.waitForTimeout(200)
      await openHome(page, url)
      read.second = await waitForGuest(page, secondId)
      await openHome(page, url)
      read.afterReload = await waitForGuest(page, secondId)

      // The chat switch retires the guest alone.
      await openSettings(page)
      await pickMascot(page, /^(关闭|Off)$/)
      await openHome(page, url)
      await page.waitForTimeout(400)
      read.chatOff = await readGuest(page)
      await openSettings(page)
      await pickMascot(page, /Petdex 宠物|Petdex pet/)
      await openHome(page, url)
      read.chatBack = await waitForGuest(page, secondId)

      // Pet sounds: four event rows with the full bundled set, a poke's own
      // tone and the chime a turn opens with. The oscillator spy records each
      // note the page synthesizes; splicing reads one stage at a time.
      await openSettings(page)
      read.soundSurface = await page.evaluate(() => ({
        labels: [...document.querySelectorAll('.dsh-deepcraft-settings-pet-sound-label')].map(node => node.textContent),
        options: [...document.querySelectorAll('.dsh-deepcraft-settings-pet-sound-select')].map(select => [...select.options].map(option => option.value)),
      }))
      await page.locator('.dsh-deepcraft-settings-pet-sound-select').nth(0).selectOption('ring-chime')
      await page.locator('.dsh-deepcraft-settings-pet-sound-select').nth(1).selectOption('startup-chime')
      const spyNotes = `(() => {
        window.__petNotes = []
        if (window.__petSpy) return
        window.__petSpy = true
        const createOscillator = AudioContext.prototype.createOscillator
        const start = OscillatorNode.prototype.start
        AudioContext.prototype.createOscillator = function () {
          const osc = createOscillator.call(this)
          // The tone assigns its frequency after creation: read at start.
          osc.start = function () {
            window.__petNotes.push(osc.frequency.value)
            return start.apply(osc, arguments)
          }
          return osc
        }
      })()`
      await page.evaluate(spyNotes)
      await page.locator('.dsh-deepcraft-settings-pet-sound-row').nth(0).locator('button').first().click()
      await page.waitForTimeout(150)
      read.previewNotes = await page.evaluate(() => window.__petNotes.splice(0))
      await openHome(page, url)
      // A navigation takes the spy with it: arm the home page fresh.
      await page.evaluate(spyNotes)
      await page.locator('.dsh-deepcraft-petdex-hit').first().click()
      await page.waitForTimeout(150)
      read.pokeNotes = await page.evaluate(() => window.__petNotes.splice(0))

      // The library reports what was installed, with the original ids intact.
      read.library = await page.evaluate(async (route) => (await fetch(route)).json(), ROUTES.library)
      read.userHome = path.join(home, 'user', '.petdex', 'pets')
      read.stored = fs.existsSync(path.join(read.userHome, firstId, 'pet.json')) &&
        fs.existsSync(path.join(read.userHome, secondId, 'pet.json'))
    },
    async afterTurn({ page }) {
      // The first prompt's turn opened before the mascot reached the
      // conversation and followed the session, so its turn/start sat in feed
      // history. A second turn on the followed session is the live event. The
      // petdex card mounted on the conversation is the proof the mascot left
      // the home stand and followed this session; `waitForTurn` alone would
      // also settle while nothing but the first turn's tail exists, so the
      // wait is on a NEW tail, not on any tail.
      await page.waitForSelector('.dsh-deepcraft-petdex', { state: 'attached' })
      const tailsBefore = await page.evaluate(
        (selector) => document.querySelectorAll(selector).length,
        PROMPT_HOST.turnTail,
      )
      await page.evaluate(() => window.__petNotes?.splice(0))
      await sendPrompt(page, 'again')
      await page.waitForFunction(
        ({ selector, before }) => document.querySelectorAll(selector).length > before,
        { selector: PROMPT_HOST.turnTail, before: tailsBefore },
      )
      await waitForTurn(page)
      read.turnNotes = await page.evaluate(() => window.__petNotes?.splice(0) ?? null)
    },
    async assert() {
      const first = read.first
      const second = read.second
      const imported = read.imported ?? []
      return [
        check('两个完整包经宿主半边的导入路由原样落盘',
          imported.length === 2 && imported.every((entry) => entry.status === 200 && entry.pet?.id === entry.id) && read.stored === true,
          JSON.stringify(imported)),
        check('版本与图集不符的包整包拒绝；穿越路径的条目也拒绝',
          read.wrongVersion?.status === 400 && read.traversal?.status === 400,
          JSON.stringify({ version: read.wrongVersion?.status, traversal: read.traversal?.status })),
        check('选中的包画在首页：72×78，同一张原图',
          !!first && first.id === 'e2e-crab' && first.ready && first.width === 72 && first.height === 78 &&
            first.spriteWidth === 72 && first.spriteHeight === 78 &&
            typeof first.sheet === 'string' && first.sheet.includes(`${ROUTES.image}/e2e-crab`) && first.action === 'idle',
          JSON.stringify(first)),
        check('换到跟随宿主与换回后仍是同一只宠物，配色不改宠物选择',
          read.hostPalette?.id === 'e2e-crab' && read.backPalette?.id === 'e2e-crab',
          JSON.stringify({ host: read.hostPalette?.id, back: read.backPalette?.id })),
        check('换一只宠物后画的是一只，刷新后选择仍在',
          !!second && second.id === 'e2e-whale' && second.ready && second.sheet.includes(`${ROUTES.image}/e2e-whale`) &&
            read.afterReload?.id === 'e2e-whale',
          JSON.stringify({ second, afterReload: read.afterReload })),
        check('导入后库里两个包都在，清单 id 未被改写',
          read.library?.ok === true && ['e2e-crab', 'e2e-whale'].every((id) => read.library.pets.some((pet) => pet.id === id && pet.sourceId === id)),
          JSON.stringify(read.library?.pets?.map((pet) => pet.id))),
        check('聊天位置的开关收起聊天宠物，随后重新出现',
          read.chatOff === null && read.chatBack?.id === 'e2e-whale',
          JSON.stringify({ off: read.chatOff, back: read.chatBack })),
        check('宠物声音行列出全部四个事件与整套内置音色',
          read.soundSurface?.labels?.length === 4 &&
            read.soundSurface.options?.length === 4 && read.soundSurface.options.every((options) => options.includes('gem-collect') && options.includes('startup-chime')),
          JSON.stringify(read.soundSurface)),
        check('试听放出所选音色，点按宠物放出点按事件的音色',
          Array.isArray(read.previewNotes) && read.previewNotes.length === 2 && read.previewNotes.every((n) => n === 932) &&
            Array.isArray(read.pokeNotes) && read.pokeNotes.length === 2 && read.pokeNotes.every((n) => n === 932),
          JSON.stringify({ preview: read.previewNotes, poke: read.pokeNotes })),
        check('回合开始时放出自选的开场音色',
          Array.isArray(read.turnNotes) && read.turnNotes.length === 3 && read.turnNotes.join(',') === '523,784,1047',
          JSON.stringify(read.turnNotes)),
      ]
    },
  }
}

module.exports = { petdexScenario, packageZip, upload, ROUTES, readGuest, waitForGuest, chatOptions, rowOf, TITLE }
