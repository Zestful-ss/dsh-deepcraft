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
 * (packages/testing/e2e.cjs), so the library and the official player both
 * resolve under the run's directory.
 *
 * The desktop player is exercised only where the official Windows build can
 * run: the switch is pressed on the real page, the host's status is followed,
 * and an owned process has its `/whoami` pid matched against the status. A
 * player the machine started itself is reported, never adopted or ended.
 */
'use strict'
const fs = require('node:fs')
const path = require('node:path')
const { PNG } = require('pngjs')
const { zipSync } = require('fflate')
const { openSkinSettings } = require('./settings-route.cjs')

const ROUTES = {
  library: '/dsh-deepcraft/pets',
  import: '/dsh-deepcraft/pets/import',
  image: '/dsh-deepcraft/pets/image',
  desktop: '/dsh-deepcraft/pets/desktop',
}
const HOOK = 'http://127.0.0.1:7777'
const ROW = '.dsh-deepcraft-settings-row'
const ROW_TITLE = '.dsh-deepcraft-settings-row-title'
const TITLE = { chat: /聊天框宠物包|Chat pet package/, import: /导入宠物包|Import a pet package/, desktop: /桌面宠物|Desktop pet/ }

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

/** The home page, where the composer guest stands. */
function openHome(page, url) {
  return page.goto(new URL('/', url).href)
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

const statusOf = (page) => page.evaluate(async (route) => {
  const answer = await fetch(route).then((response) => response.json())
  return answer.status
}, ROUTES.desktop)

/** Wait until the switch has settled: running, or the reason it cannot be. */
async function waitDesktopEnabled(page, timeoutMs = 40000) {
  const started = Date.now()
  let status = null
  while (Date.now() - started < timeoutMs) {
    status = await statusOf(page)
    if (status.phase === 'running' || status.phase === 'external' || status.phase === 'unsupported' || status.phase === 'error') return status
    await page.waitForTimeout(250)
  }
  return status
}

/** Wait for one exact state: the phase and the pet the host is on, so a restart is not read as its predecessor. */
async function waitForDesktop(page, wanted, timeoutMs = 40000) {
  const started = Date.now()
  let status = null
  while (Date.now() - started < timeoutMs) {
    status = await statusOf(page)
    if (status.phase === wanted.phase && (wanted.petId === undefined || status.petId === wanted.petId) &&
      (wanted.notPid === undefined || status.pid !== wanted.notPid)) return status
    await page.waitForTimeout(250)
  }
  return status
}

/** The official player's own answer, read from Node: no page origin, no CORS. */
async function hook(pathName) {
  try {
    const response = await fetch(`${HOOK}${pathName}`, { signal: AbortSignal.timeout(500) })
    return response.ok ? await response.json() : null
  } catch {
    return null
  }
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

      // The desktop player: switch on, follow the host's status, and only ever
      // judge a process whose pid the port reports itself.
      await openSettings(page)
      const desktopRow = rowOf(page, TITLE.desktop)
      await desktopRow.locator('.dsh-deepcraft-settings-pet-toggle').check()
      read.desktop = await waitDesktopEnabled(page)
      if (read.desktop.phase === 'running') {
        // The theme's desktop pet is this run's own package, so the process it
        // starts has a package to draw.
        await desktopRow.locator('.dsh-deepcraft-settings-pet-select').selectOption(claudeId)
        read.desktopOwned = await waitForDesktop(page, { phase: 'running', petId: claudeId })
        read.whoami = await hook('/whoami')
        read.desktopToken = fs.existsSync(path.join(home, 'user', '.petdex', 'runtime', 'update-token'))
        // A theme switch restarts the process this plugin owns, and only that one.
        await pickBrand(page, 'deepseek')
        await rowOf(page, TITLE.desktop).locator('.dsh-deepcraft-settings-pet-select').selectOption(deepseekId)
        read.desktopSwitched = await waitForDesktop(page, { phase: 'running', petId: deepseekId, notPid: read.desktopOwned?.pid })
        read.whoamiSwitched = await hook('/whoami')
        await pickBrand(page, 'claude')
        await rowOf(page, TITLE.desktop).locator('.dsh-deepcraft-settings-pet-select').selectOption(claudeId)
        read.desktopBack = await waitForDesktop(page, { phase: 'running', petId: claudeId, notPid: read.desktopSwitched?.pid })
      }
      // The chat guest follows its own switch and leaves alone.
      await openHome(page, url)
      await page.waitForTimeout(300)
      // The library reports what was installed, with the original ids intact.
      read.library = await page.evaluate(async (route) => (await fetch(route)).json(), ROUTES.library)
      read.userHome = path.join(home, 'user', '.petdex', 'pets')
      read.stored = fs.existsSync(path.join(read.userHome, claudeId, 'pet.json')) &&
        fs.existsSync(path.join(read.userHome, deepseekId, 'pet.json'))
    },
    async duringTurn({ page, home }) {
      // The window goes away while the host keeps working: the projection runs
      // in the host process, and the player's own state must follow it.
      if (read.desktop?.phase !== 'running') return
      const cdp = await page.context().newCDPSession(page)
      const { windowId } = await cdp.send('Browser.getWindowForTarget')
      await cdp.send('Browser.setWindowBounds', { windowId, bounds: { windowState: 'minimized' } })
      const tokenPath = path.join(home, 'user', '.petdex', 'runtime', 'update-token')
      const states = new Set()
      const until = Date.now() + 6000
      while (Date.now() < until) {
        const token = fs.existsSync(tokenPath) ? fs.readFileSync(tokenPath, 'utf8').trim() : ''
        if (token !== '') {
          const answer = await fetch(`${HOOK}/state`, { headers: { 'x-petdex-update-token': token }, signal: AbortSignal.timeout(400) })
            .then((response) => response.ok ? response.json() : null).catch(() => null)
          if (typeof answer?.state === 'string') states.add(answer.state)
        }
        await new Promise((settle) => setTimeout(settle, 50))
      }
      const { bounds } = await cdp.send('Browser.getWindowBounds', { windowId })
      read.minimized = { states: [...states], windowState: bounds.windowState }
      await cdp.send('Browser.setWindowBounds', { windowId, bounds: { windowState: 'normal' } })
    },
    async afterTurn({ page }) {
      if (read.desktop?.phase !== 'running') return
      await openSettings(page)
      await rowOf(page, TITLE.desktop).locator('.dsh-deepcraft-settings-pet-toggle').uncheck()
      read.desktopOff = await waitForDesktop(page, { phase: 'off' }, 20000)
      read.afterOff = await hook('/health')
    },
    async assert() {
      const claude = read.claude
      const deepseek = read.deepseek
      const imported = read.imported ?? []
      const desktop = read.desktop ?? null
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
        check('DeepSeek 主题画自己选中的人：两个位置的主题字段互不影响',
          !!deepseek && deepseek.id === 'e2e-whale' && deepseek.ready && deepseek.sheet.includes(`${ROUTES.image}/e2e-whale`),
          JSON.stringify(deepseek)),
        check('切回 Claude 后仍是 Claude 原先选中的包',
          !!read.backToClaude && read.backToClaude.id === 'e2e-crab', JSON.stringify(read.backToClaude)),
        check('导入后库里两个包都在，清单 id 未被改写',
          read.library?.ok === true && ['e2e-crab', 'e2e-whale'].every((id) => read.library.pets.some((pet) => pet.id === id && pet.sourceId === id)),
          JSON.stringify(read.library?.pets?.map((pet) => pet.id))),
        check('桌宠开关交给宿主；Windows 上自有进程的 pid 必须就是端口报告的那一个',
          desktop !== null && (
            (desktop.phase === 'running' && read.desktopOwned?.phase === 'running' && read.desktopOwned.petId === 'e2e-crab' &&
              read.whoami?.pid === read.desktopOwned.pid && read.desktopToken === true &&
              read.desktopSwitched?.phase === 'running' && read.desktopSwitched.petId === 'e2e-whale' &&
              read.whoamiSwitched?.pid === read.desktopSwitched.pid && read.whoamiSwitched?.pid !== read.desktopOwned.pid &&
              read.desktopBack?.phase === 'running' && read.desktopBack.petId === 'e2e-crab') ||
            desktop.phase === 'external' || desktop.phase === 'unsupported'),
          JSON.stringify({ desktop, owned: read.desktopOwned, switched: read.desktopSwitched, back: read.desktopBack, whoami: read.whoami, token: read.desktopToken })),
        check('关闭后自有桌宠退出，端口不再有人应答',
          read.desktop?.phase !== 'running' || (read.desktopOff?.phase === 'off' && read.afterOff === null),
          JSON.stringify({ off: read.desktopOff, health: read.afterOff })),
        check('窗口最小化时，DSH 的工作仍传到桌宠（跳起、工作、挥手、等待之一）',
          read.desktop?.phase !== 'running' ||
            (read.minimized?.windowState === 'minimized' &&
              read.minimized.states.some((state) => ['jumping', 'running', 'waiting', 'waving'].includes(state))),
          JSON.stringify(read.minimized)),
        check('聊天位置的开关只收起聊天宠物，随后重新出现',
          read.chatOff === null && read.chatBack?.id === 'e2e-crab',
          JSON.stringify({ off: read.chatOff, back: read.chatBack })),
      ]
    },
  }
}

module.exports = { petdexScenario }
