#!/usr/bin/env node
/**
 * deepcraft.cjs — the default identity and its whale on the real host (D66, D80).
 *
 * Registered in the lane's scenario table (packages/testing/scenarios.cjs).
 * The walk stands the original pixel whale on the composer through the skin's
 * own settings page, drives every hand gesture on the home card, samples the
 * states the live turn asks for, keeps her on the home page and back, holds her
 * still under reduced motion, and writes the ocean home and conversation
 * captures.
 *
 * Every setting is written by pressing the real control; nothing here sets a
 * body attribute to imitate a preference.
 */
'use strict'
const path = require('node:path')
const { bound } = require('./bounds.cjs')
const { openSkinSettings, SETTINGS_PAGE } = require('./settings-route.cjs')
const { dismissOverlays } = require('./dsh-web.cjs')
const { CANVAS } = require('./shoot.cjs')
const { sanitizePage } = require('../../scripts/shared/privacy.cjs')

const SKIN = {
  page: SETTINGS_PAGE,
  tab: '.dsh-deepcraft-settings-tabs [role="tab"]',
  row: '.dsh-deepcraft-settings-row',
  rowTitle: '.dsh-deepcraft-settings-row-title',
  whale: '.dsh-deepcraft-deepy',
  whaleHit: '.dsh-deepcraft-deepy-hit',
  whaleStrip: '.dsh-deepcraft-deepy-strip',
}

/** The preferences this walk writes, each by its own row title in either language. */
const ROWS = {
  mascot: /^(聊天框宠物|Chat pet)$/,
  scope: /出现位置|Where it appears/,
  motion: /动画效果|Animation/,
}
const TABS = {
  appearance: /^(外观|Appearance)$/,
}
const MOTIONS = { system: /^(随系统|Follow the system)$/, reduced: /^(减弱|Reduced)$/, full: /^(总是|Always)$/ }
const MASCOTS = { deepy: /^(原有像素鲸鱼|Original pixel whale)$/, off: /^(关闭|Off)$/ }
const SCOPES = { home: /^(首页|Home)$/, all: /^(首页与对话|Home and conversation)$/ }

/** How long the whale may take to appear, change state or leave. */
const WHALE_WAIT_MS = bound('deepcraftWhaleWaitMs')

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

/** Close the settings dialog. */
async function closeSettings(page) {
  await page.keyboard.press('Escape')
  await page.waitForSelector(SKIN.page, { state: 'detached', timeout: WHALE_WAIT_MS }).catch(() => {})
  await page.waitForTimeout(300)
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

/** The sheet of the animation on screen, for the "own art" check. */
const sheetOf = (page) => page.evaluate((selector) => getComputedStyle(document.querySelector(selector)).getPropertyValue('--dsh-deepcraft-deepy-sheet'), SKIN.whale)

/** The colours a palette paints: the canvas, the accent and the prose link, read off the page. */
async function readPalette(page) {
  return page.evaluate(() => {
    const style = getComputedStyle(document.body)
    return {
      canvas: style.backgroundColor,
      accent: style.getPropertyValue('--dsw-alias-brand-primary').trim(),
      link: style.getPropertyValue('--dsh-deepcraft-link').trim(),
    }
  })
}

/** Capture the page in both schemes under one palette, swept for personal data. */
async function capture(page, out, name, palette) {
  const expected = CANVAS[palette]
  if (expected === undefined) throw new Error(`deepcraft: no recorded palette for "${palette}"`)
  const files = []
  for (const scheme of ['light', 'dark']) {
    if (scheme === 'dark') await page.evaluate(() => document.body.setAttribute('data-ds-dark-theme', ''))
    const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
    if (background !== expected[scheme]) throw new Error(`deepcraft: ${scheme} palette did not take effect (${background}, expected ${expected[scheme]})`)
    const { visibleText } = await sanitizePage((expression) => page.evaluate(expression))
    const file = path.join(out, `${name}-${scheme}.png`)
    await page.screenshot({ path: file })
    files.push(file)
    if (visibleText.length === 0) throw new Error(`deepcraft: ${file} carries no visible text`)
  }
  await page.evaluate(() => document.body.removeAttribute('data-ds-dark-theme'))
  return files
}

function deepcraftScenario({ check }) {
  return {
    script: 'greeting',
    prompt: 'hello there',
    delayMs: 600,
    viewport: { width: 1440, height: 900 },
    async beforeSend(context) {
      const { page, out } = context
      const notes = { gestures: {}, states: {}, files: [] }
      context.notes.deepcraft = notes
      // What the walk found before it changed anything, to put back at the end.
      await dismissOverlays(page)
      await openSkinSettings(page)
      await openTab(page, TABS.appearance)
      notes.before = {
        mascotPick: await pickedIn(page, ROWS.mascot),
        scope: await pickedIn(page, ROWS.scope),
      }
      await pickIn(page, ROWS.scope, SCOPES.all)
      await pickIn(page, ROWS.mascot, MASCOTS.deepy)
      notes.before.motionPick = await pickedIn(page, ROWS.motion)
      await pickIn(page, ROWS.motion, MOTIONS.full)
      await closeSettings(page)
      await waitWhale(page, true)
      notes.palette = { home: await readPalette(page) }
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

      notes.files.push(...await capture(page, out, 'deepcraft-home', 'ocean'))
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
      const { page, out } = context
      const notes = context.notes.deepcraft
      notes.states.afterTurn = await animationOf(page)
      notes.palette.conversation = await readPalette(page)
      notes.files.push(...await capture(page, out, 'deepcraft-conversation', 'ocean'))

      // Scope: keeping her on the home card leaves the conversation without her.
      await dismissOverlays(page)
      await openSkinSettings(page)
      await openTab(page, TABS.appearance)
      await pickIn(page, ROWS.scope, SCOPES.home)
      await closeSettings(page)
      await waitWhale(page, false)
      notes.states.homeOnlyAbsent = true
      await dismissOverlays(page)
      await openSkinSettings(page)
      await openTab(page, TABS.appearance)
      await pickIn(page, ROWS.scope, SCOPES.all)
      await closeSettings(page)
      await waitWhale(page, true)

      // Reduced motion: the sheet's still frame stands, and a press still reacts.
      await dismissOverlays(page)
      await openSkinSettings(page)
      await openTab(page, TABS.appearance)
      await pickIn(page, ROWS.motion, MOTIONS.reduced)
      await closeSettings(page)
      await page.waitForTimeout(400)
      notes.states.reducedAnimated = await page.evaluate((selector) => document.querySelector(selector)?.getAnimations().length ?? -1, SKIN.whaleStrip)
      notes.states.reducedPoke = await pressAt(page, 6)
      await dismissOverlays(page)
      await openSkinSettings(page)
      await openTab(page, TABS.appearance)
      await pickIn(page, ROWS.motion, labelRe(notes.before.motionPick))
      await closeSettings(page)

      // The theme's own identity: no brand attribute, and the whale mask the
      // sidebar and the hero paint is the one the body defines.
      notes.identity = await page.evaluate(() => ({
        brandAttr: document.body.hasAttribute('data-dsh-deepcraft-brand'),
        maskToken: getComputedStyle(document.body).getPropertyValue('--dsh-deepcraft-mask-deepseek-mark').trim(),
      }))

      // Put the first page back where the walk found it.
      await dismissOverlays(page)
      await openSkinSettings(page)
      await openTab(page, TABS.appearance)
      await pickIn(page, ROWS.mascot, labelRe(notes.before.mascotPick))
      await pickIn(page, ROWS.scope, labelRe(notes.before.scope))
      await pickIn(page, ROWS.motion, labelRe(notes.before.motionPick))
      await closeSettings(page)
    },
    async assert(context) {
      const notes = context.notes.deepcraft
      const gestures = notes.gestures
      const states = notes.states
      return [
        check('首页卡片上站着像素小鲸鱼，播放构建为它画出的帧图',
          gestures.idle === 'idle' && /^(url\(["']?)?(data:image\/svg\+xml|(?:https?:[^"']*)?\/dsh-deepcraft\/assets\/[0-9a-f]{12}\.svg)/.test(gestures.sheet || ''),
          JSON.stringify({ idle: gestures.idle, sheet: gestures.sheet })),
        check('点左脸与点右脸各自触发一次反应',
          gestures.left === 'poke-left' && gestures.right === 'poke-right',
          JSON.stringify({ left: gestures.left, right: gestures.right })),
        check('连点四下挠痒，随后回到空闲', gestures.tickle === 'tickle', `tickle=${gestures.tickle}`),
        check('按住移动把它提起来，松开后回到当时的动画',
          gestures.drag === 'drag' && gestures.afterDrag !== null && gestures.afterDrag !== 'drag',
          JSON.stringify({ drag: gestures.drag, after: gestures.afterDrag })),
        check('真实的一轮里，流式状态让鲸鱼换成思考与写作的帧图',
          states.streamed.includes('thinking') && (states.streamed.includes('typing') || states.streamed.includes('building')),
          JSON.stringify(states.streamed)),
        check('把出现位置限制在首页之后，对话页上没有它', states.homeOnlyAbsent === true, `afterTurn=${states.afterTurn}`),
        check('动画设为减弱时鲸鱼停在静帧，点一下仍有反应',
          states.reducedAnimated === 0 && states.reducedPoke === 'poke-left',
          JSON.stringify({ animations: states.reducedAnimated, poke: states.reducedPoke })),
        check('页面不带旧品牌属性，侧栏标志画的是皮肤自己的鲸鱼',
          notes.identity.brandAttr === false && /^url\(/.test(notes.identity.maskToken || ''),
          JSON.stringify(notes.identity)),
        check('首页与对话画的是同一套 ocean 配色', notes.palette.home.accent === '#5368c9' && notes.palette.conversation.accent === '#5368c9',
          JSON.stringify(notes.palette)),
        check('控制台没有异常', context.session.problems.length === 0, context.session.problems.slice(0, 3).join(' | ')),
      ]
    },
  }
}

module.exports = { deepcraftScenario }
