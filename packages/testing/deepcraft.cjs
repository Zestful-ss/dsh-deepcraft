#!/usr/bin/env node
/**
 * deepcraft.cjs — the DeepCraft scenario on the real host (D66, D77).
 *
 * Registered in the lane's scenario table (packages/testing/scenarios.cjs).
 * The walk switches themes through the skin's own settings page, drives the
 * whale girl through every hand gesture on the home card, samples the states
 * the live turn asks for, checks where the account-hold page belongs, writes
 * the DeepSeek home and conversation captures, and exports the eighteen
 * animation sheets the build drew.
 *
 * Every setting is written by pressing the real control; nothing here sets a
 * body attribute to imitate a preference.
 */
'use strict'
const fs = require('node:fs')
const path = require('node:path')
const { bound } = require('./bounds.cjs')
const { waitForSkin, dismissOverlays } = require('./dsh-web.cjs')
const { openSkinSettings, SETTINGS_PAGE } = require('./settings-route.cjs')
const { sanitizePage } = require('../../scripts/shared/privacy.cjs')

const SKIN = {
  page: SETTINGS_PAGE,
  tab: '.dsh-deepcraft-settings-tabs [role="tab"]',
  row: '.dsh-deepcraft-settings-row',
  rowTitle: '.dsh-deepcraft-settings-row-title',
  brandCard: (brand) => `.dsh-deepcraft-brand-card[data-brand="${brand}"]`,
  whale: '.dsh-deepcraft-deepy',
  whaleHit: '.dsh-deepcraft-deepy-hit',
  whaleStrip: '.dsh-deepcraft-deepy-strip',
  accountBtn: '.dsh-deepcraft-account-btn',
  banRow: '[data-dsh-deepcraft-ban-row] .dsh-deepcraft-account-popover-row',
  ban: '.dsh-deepcraft-ban',
  menuTrigger: '[aria-haspopup="menu"][data-signed-out]',
}

/** The preferences this walk writes, each by its own row title in either language. */
const ROWS = {
  mascot: /吉祥物|Mascot/,
  scope: /出现位置|Where it appears/,
  motion: /动画效果|Animation/,
  banLocale: /封号彩蛋|Account-hold easter egg/,
}
const TABS = {
  general: /^(通用|General)$/,
  appearance: /^(外观|Appearance)$/,
  sidebar: /^(侧栏|Sidebar)$/,
  motion: /^(动效|Motion)$/,
}
const BRANDS = { claude: 'claude', deepseek: 'deepseek' }
const MOTIONS = { system: /^(随系统|Follow the system)$/, reduced: /^(减弱|Reduced)$/, full: /^(总是|Always)$/ }
const MASCOTS = { brand: /^(自动|Follow the brand)$/, off: /^(关闭|Off)$/, deepy: /^Deepy$/ }
const SCOPES = { home: /^(首页|Home)$/, all: /^(首页与对话|Home and conversation)$/ }
const BAN_CHOICE = { off: /^(关闭|Off)$/ }

/** How long the whale may take to appear, change state or leave. */
const WHALE_WAIT_MS = bound('deepcraftWhaleWaitMs')

const bodyAttr = (page, name) => page.evaluate((key) => document.body.getAttribute(key), name)

/** A label's exact match, for a control whose text was read back from the page. */
const labelRe = (text) => new RegExp(`^${String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`)

/** Open one settings tab by its label in either language. */
async function openTab(page, label) {
  await page.locator(SKIN.tab).filter({ hasText: label }).first().click()
  await page.waitForTimeout(250)
}

/** The row whose title matches; the title is the row's own text, in either language. */
const rowOf = (page, title) => page.locator(SKIN.row).filter({ has: page.locator(SKIN.rowTitle).filter({ hasText: title }) }).first()

/** The label of the choice picked in one row. */
const pickedIn = async (page, title) => rowOf(page, title).locator('button[data-active]').first().textContent()

/** Pick one choice in one row by its label. */
async function pickIn(page, title, label) {
  await rowOf(page, title).getByRole('button', { name: label }).first().click()
  await page.waitForTimeout(250)
}

/** Whether a row refuses input right now. */
const rowDisabled = (page, title) => rowOf(page, title).first().getAttribute('data-disabled')

/** Close the settings dialog. */
async function closeSettings(page) {
  await page.keyboard.press('Escape')
  await page.waitForSelector(SKIN.page, { state: 'detached', timeout: WHALE_WAIT_MS }).catch(() => {})
  await page.waitForTimeout(300)
}

/** Open the account menu: the skin's own row, or the host's trigger it takes over. */
async function openAccountMenu(page) {
  const own = page.locator(SKIN.accountBtn).first()
  if (await own.count() > 0) await own.click()
  else await page.locator(SKIN.menuTrigger).first().click()
  await page.waitForTimeout(400)
}

/** Make sure the account menu is open, then wait for the ban row inside it. */
async function ensureBanRow(page) {
  if (await page.locator(SKIN.banRow).count() === 0) await openAccountMenu(page)
  await page.waitForSelector(SKIN.banRow, { timeout: WHALE_WAIT_MS })
}

/** Press the account header row and answer whether the hold page opened. */
async function banOpensFromRow(page) {
  await ensureBanRow(page)
  await page.locator(SKIN.banRow).first().click()
  await page.waitForTimeout(600)
  const opened = await page.locator(SKIN.ban).count() > 0
  if (opened) {
    await page.keyboard.press('Escape')
    await page.waitForSelector(SKIN.ban, { state: 'detached', timeout: WHALE_WAIT_MS }).catch(() => {})
  }
  return opened
}

/** Wait for the whale to be on the page, or to be gone. */
async function waitWhale(page, present) {
  await page.waitForFunction(
    ({ selector, wanted }) => (document.querySelector(selector) !== null) === wanted,
    { selector: SKIN.whale, wanted: present },
    { timeout: WHALE_WAIT_MS },
  )
  if (!present) return
  await page.waitForFunction((selector) => document.querySelector(selector)?.hasAttribute('data-ready') === true, SKIN.whale, { timeout: WHALE_WAIT_MS })
}

const animationOf = (page) => page.evaluate((selector) => document.querySelector(selector)?.getAttribute('data-animation') ?? null, SKIN.whale)

/** One press and release at a point inside the hit box, at `at` from its left edge. */
async function pressAt(page, at, fromRight = false) {
  const box = await page.locator(SKIN.whaleHit).boundingBox()
  if (box === null) throw new Error('deepcraft: the whale has no hit box')
  const x = fromRight ? box.x + box.width - at : box.x + at
  const y = box.y + box.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.up()
  await page.waitForTimeout(150)
  return animationOf(page)
}

/** The sheet of the animation on screen, for the "another sheet" check. */
const sheetOf = (page) => page.evaluate((selector) => getComputedStyle(document.querySelector(selector)).getPropertyValue('--dsh-deepcraft-deepy-sheet'), SKIN.whale)

/** The DeepSeek canvas this theme paints, from its own token sheet (`#fafbff` light, `#13161d` dark). */
const DEEPSEEK_CANVAS = { light: 'rgb(250, 251, 255)', dark: 'rgb(19, 22, 29)' }

/** Capture the page in both palettes, swept for personal data. */
async function capture(page, out, name) {
  const files = []
  for (const scheme of ['light', 'dark']) {
    if (scheme === 'dark') await page.evaluate(() => document.body.setAttribute('data-ds-dark-theme', ''))
    const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
    if (background !== DEEPSEEK_CANVAS[scheme]) throw new Error(`deepcraft: ${scheme} palette did not take effect (${background}, expected ${DEEPSEEK_CANVAS[scheme]})`)
    const { visibleText } = await sanitizePage((expression) => page.evaluate(expression))
    const file = path.join(out, `${name}-${scheme}.png`)
    await page.screenshot({ path: file })
    files.push(file)
    if (visibleText.length === 0) throw new Error(`deepcraft: ${file} carries no visible text`)
  }
  await page.evaluate(() => document.body.removeAttribute('data-ds-dark-theme'))
  return files
}

/**
 * Export the eighteen sheets the build drew, in one SVG: each animation on its
 * own row beside its name. The renderer that made them is what this reads, so
 * the export cannot drift from the shipped art.
 */
async function exportSheets(out) {
  const { renderWhaleSheet } = await import('../../packages/assets/whale.mjs')
  const { loadModule } = require('../../scripts/shared/ts-module.cjs')
  const { DEEPY_SHEETS, DEEPY_GUTTER } = loadModule('packages/client/src/features/mascot/sheets.ts')
  const rows = Object.entries(DEEPY_SHEETS)
  const scale = 0.5
  const rowHeight = 54 * 0.5 * Math.ceil(Math.max(...rows.map(([, sheet]) => sheet.frames)) / 8) + 8
  const parts = [`<svg xmlns="http://www.w3.org/2000/svg" width="${(432 + 140) * scale}" height="${rows.length * rowHeight + 20}"><rect width="100%" height="100%" fill="#ffffff"/>`]
  rows.forEach(([name, sheet], at) => {
    const svg = renderWhaleSheet(name, sheet, DEEPY_GUTTER)
    const uri = `data:image/svg+xml;base64,${Buffer.from(svg, 'utf8').toString('base64')}`
    const y = 16 + at * rowHeight
    parts.push(`<text x="8" y="${y + 14}" font-family="sans-serif" font-size="11" fill="#141413">${name}</text>`)
    parts.push(`<image x="110" y="${y}" width="${432 * scale}" height="${(54 * Math.ceil(sheet.frames / 8)) * scale}" href="${uri}"/>`)
  })
  parts.push('</svg>')
  const file = path.join(out, 'deepcraft-whale-sheets.svg')
  fs.writeFileSync(file, parts.join(''), 'utf8')
  return file
}

function deepcraftScenario({ check }) {
  return {
    script: 'greeting',
    prompt: 'hello there',
    delayMs: 600,
    account: true,
    viewport: { width: 1440, height: 900 },
    async beforeSend(context) {
      const { page, out } = context
      const notes = { gestures: {}, states: {}, files: [], sheets: null }
      context.notes.deepcraft = notes
      // What the walk found before it changed anything, to put back at the end.
      await openSkinSettings(page)
      await openTab(page, TABS.general)
      notes.before = { brand: await bodyAttr(page, 'data-dsh-deepcraft-brand') }
      await openTab(page, TABS.appearance)
      notes.before.mascotPick = await pickedIn(page, ROWS.mascot)
      notes.before.scope = await pickedIn(page, ROWS.scope)
      await pickIn(page, ROWS.scope, SCOPES.all)
      await pickIn(page, ROWS.mascot, MASCOTS.brand)
      await openTab(page, TABS.motion)
      notes.before.motionPick = await pickedIn(page, ROWS.motion)
      await openTab(page, TABS.sidebar)
      notes.before.banLocale = await pickedIn(page, ROWS.banLocale)
      await openTab(page, TABS.general)
      await page.locator(SKIN.brandCard(BRANDS.deepseek)).first().click()
      await page.waitForTimeout(400)
      await openTab(page, TABS.motion)
      await pickIn(page, ROWS.motion, MOTIONS.full)
      await closeSettings(page)
      notes.brandAfterSwitch = await bodyAttr(page, 'data-dsh-deepcraft-brand')
      await waitWhale(page, true)
      notes.gestures.idle = await animationOf(page)
      notes.gestures.sheet = await sheetOf(page)

      // The reader's own hand: a press on either cheek, four taps in a row, and
      // a press that travels before it lifts.
      notes.gestures.left = await pressAt(page, 6)
      await page.waitForTimeout(1200)
      notes.gestures.right = await pressAt(page, 6, true)
      // The run of taps is its own gesture: the previous press must fall outside
      // the 450 ms window before it starts.
      await page.waitForTimeout(700)
      for (let tap = 0; tap < 4; tap++) await pressAt(page, 6)
      notes.gestures.tickle = await animationOf(page)
      await page.waitForTimeout(2500)

      const box = await page.locator(SKIN.whaleHit).boundingBox()
      await page.mouse.move(box.x + 8, box.y + box.height / 2)
      await page.mouse.down()
      await page.mouse.move(box.x + 28, box.y + box.height / 2, { steps: 4 })
      notes.gestures.drag = await animationOf(page)
      await page.mouse.up()
      await page.waitForTimeout(400)
      notes.gestures.afterDrag = await animationOf(page)

      notes.files.push(...await capture(page, out, 'deepcraft-home'))
    },
    async duringTurn(context) {
      const { page } = context
      const notes = context.notes.deepcraft
      const seen = new Set()
      const deadline = Date.now() + bound('deepcraftStateWaitMs')
      await waitWhale(page, true)
      while (Date.now() < deadline && seen.size < 2) {
        const animation = await animationOf(page)
        if (animation !== null) seen.add(animation)
        if (seen.has('thinking') && (seen.has('typing') || seen.has('building'))) break
        await page.waitForTimeout(100)
      }
      notes.states.streamed = [...seen]
    },
    async afterTurn(context) {
      const { page, session, out } = context
      const notes = context.notes.deepcraft
      notes.states.afterTurn = await animationOf(page)
      notes.files.push(...await capture(page, out, 'deepcraft-conversation'))

      // Scope: keeping her on the home card leaves the conversation without her.
      await openSkinSettings(page)
      await openTab(page, TABS.appearance)
      await pickIn(page, ROWS.scope, SCOPES.home)
      await closeSettings(page)
      await waitWhale(page, false)
      notes.states.homeOnlyAbsent = true
      await openSkinSettings(page)
      await openTab(page, TABS.appearance)
      await pickIn(page, ROWS.scope, SCOPES.all)
      await closeSettings(page)
      await waitWhale(page, true)

      // Reduced motion: the sheet's still frame stands, and a press still reacts.
      await openSkinSettings(page)
      await openTab(page, TABS.motion)
      await pickIn(page, ROWS.motion, MOTIONS.reduced)
      await closeSettings(page)
      await page.waitForTimeout(400)
      notes.states.reducedAnimated = await page.evaluate((selector) => document.querySelector(selector)?.getAnimations().length ?? -1, SKIN.whaleStrip)
      notes.states.reducedPoke = await pressAt(page, 6)
      await openSkinSettings(page)
      await openTab(page, TABS.motion)
      await pickIn(page, ROWS.motion, labelRe(notes.before.motionPick))
      await closeSettings(page)

      // The account-hold page belongs to the Claude theme: it opens there, leaves
      // the moment another page puts the theme on DeepSeek, and its row refuses
      // input while DeepSeek is in force.
      await openSkinSettings(page)
      await openTab(page, TABS.general)
      await page.locator(SKIN.brandCard(BRANDS.claude)).first().click()
      await page.waitForTimeout(400)
      await closeSettings(page)
      await openAccountMenu(page)
      await page.waitForSelector(SKIN.banRow, { timeout: WHALE_WAIT_MS })
      notes.ban = { rowIsButton: await page.locator(SKIN.banRow).first().getAttribute('role') }
      await page.locator(SKIN.banRow).first().click()
      await page.waitForSelector(SKIN.ban, { timeout: WHALE_WAIT_MS })
      notes.ban.opened = true

      const remote = await session.context.newPage()
      try {
        await remote.goto(context.url, { waitUntil: 'domcontentloaded' })
        await waitForSkin(remote)
        await dismissOverlays(remote)
        await openSkinSettings(remote)
        await openTab(remote, TABS.general)
        await remote.locator(SKIN.brandCard(BRANDS.deepseek)).first().click()
        await remote.waitForTimeout(400)
        await openTab(remote, TABS.sidebar)
        notes.ban.disabledUnderDeepseek = await rowDisabled(remote, ROWS.banLocale)
        notes.ban.noteUnderDeepseek = await rowOf(remote, ROWS.banLocale).locator('.dsh-deepcraft-settings-row-desc').innerText().catch(() => '')
        // The page holding the overlay answers the theme flip with the other page.
        await page.waitForFunction((selector) => document.querySelector(selector) === null, SKIN.ban, { timeout: WHALE_WAIT_MS })
        notes.ban.closedByThemeFlip = true
        notes.ban.accountUsable = await page.locator(`${SKIN.menuTrigger}, ${SKIN.accountBtn}`).first().isVisible()
        // Back to Claude: the entry returns and the stored language stands; the
        // language choice then turns the easter egg off and back on.
        await openTab(remote, TABS.general)
        await remote.locator(SKIN.brandCard(BRANDS.claude)).first().click()
        await remote.waitForTimeout(400)
        await openTab(remote, TABS.sidebar)
        notes.ban.pickedBack = await pickedIn(remote, ROWS.banLocale)
        await pickIn(remote, ROWS.banLocale, BAN_CHOICE.off)
        await remote.waitForTimeout(900)
        notes.ban.opensAfterOff = await banOpensFromRow(page)
        await pickIn(remote, ROWS.banLocale, labelRe(notes.before.banLocale))
        await remote.waitForTimeout(900)
        notes.ban.opensRestored = await banOpensFromRow(page)
      } finally {
        await remote.close()
      }
      // Put the first page back where the walk found it.
      await openSkinSettings(page)
      await openTab(page, TABS.general)
      await page.locator(SKIN.brandCard(notes.before.brand)).first().click()
      await page.waitForTimeout(400)
      await openTab(page, TABS.appearance)
      await pickIn(page, ROWS.mascot, labelRe(notes.before.mascotPick))
      await pickIn(page, ROWS.scope, labelRe(notes.before.scope))
      await openTab(page, TABS.motion)
      await pickIn(page, ROWS.motion, labelRe(notes.before.motionPick))
      await closeSettings(page)
      notes.sheets = await exportSheets(out)
    },
    async assert(context) {
      const notes = context.notes.deepcraft
      const gestures = notes.gestures
      const states = notes.states
      return [
        check('设置页把主题切到 DeepSeek，页面带上新的品牌标记', notes.brandAfterSwitch === 'deepseek', `brand=${notes.brandAfterSwitch}`),
        check('首页卡片上站着鲸鱼娘，浏览器播放构建画出的矢量帧图',
          gestures.idle === 'idle' && /\/dsh-deepcraft\/assets\/[0-9a-f]{12}\.svg/.test(gestures.sheet || ''),
          JSON.stringify({ idle: gestures.idle, sheet: gestures.sheet })),
        check('点左脸与点右脸各自触发一次反应',
          gestures.left === 'poke-left' && gestures.right === 'poke-right',
          JSON.stringify({ left: gestures.left, right: gestures.right })),
        check('连点四下挠痒，随后回到空闲', gestures.tickle === 'tickle', `tickle=${gestures.tickle}`),
        check('按住移动把她提起来，松开后回到当时的动画',
          gestures.drag === 'drag' && gestures.afterDrag !== null && gestures.afterDrag !== 'drag',
          JSON.stringify({ drag: gestures.drag, after: gestures.afterDrag })),
        check('真实的一轮里，流式状态让鲸鱼娘换成思考与写作的帧图',
          states.streamed.includes('thinking') && (states.streamed.includes('typing') || states.streamed.includes('building')),
          JSON.stringify(states.streamed)),
        check('把出现位置限制在首页之后，对话页上没有她', states.homeOnlyAbsent === true, `afterTurn=${states.afterTurn}`),
        check('动画设为减弱时鲸鱼娘停在静帧，点一下仍有反应',
          states.reducedAnimated === 0 && states.reducedPoke === 'poke-left',
          JSON.stringify({ animations: states.reducedAnimated, poke: states.reducedPoke })),
        check('Claude 主题下账号行是彩蛋入口，点开出现整页',
          notes.ban.rowIsButton === 'button' && notes.ban.opened === true,
          JSON.stringify({ role: notes.ban.rowIsButton })),
        check('另一页面把主题切到 DeepSeek 后，打开的彩蛋撤下，账号入口仍可用',
          notes.ban.closedByThemeFlip === true && notes.ban.accountUsable === true,
          JSON.stringify(notes.ban)),
        check('DeepSeek 主题下彩蛋设置禁用并写明仅 Claude 可用',
          notes.ban.disabledUnderDeepseek !== null && /Claude/.test(notes.ban.noteUnderDeepseek),
          JSON.stringify({ disabled: notes.ban.disabledUnderDeepseek, note: notes.ban.noteUnderDeepseek })),
        check('切回 Claude 时保存的语言仍在，关闭后入口不再打开彩蛋，把语言放回后入口恢复',
          notes.ban.pickedBack === notes.before.banLocale && notes.ban.opensAfterOff === false && notes.ban.opensRestored === true,
          JSON.stringify({ picked: notes.ban.pickedBack, off: notes.ban.opensAfterOff, restored: notes.ban.opensRestored })),
        check('DeepSeek 主题的首页与对话页截图都写出来了', notes.files.length === 4, notes.files.join(' | ')),
        check('十八个动作的帧图导出到一张总览里', notes.sheets !== null && fs.existsSync(notes.sheets), String(notes.sheets)),
        check('控制台没有异常', context.session.problems.length === 0, context.session.problems.slice(0, 3).join(' | ')),
      ]
    },
  }
}

module.exports = { deepcraftScenario }
