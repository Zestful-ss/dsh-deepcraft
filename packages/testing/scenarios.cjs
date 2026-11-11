/**
 * scenarios.cjs — the end-to-end lane's scenario table (D66). The runner
 * (packages/testing/e2e.cjs) boots one instance per scenario; each entry here
 * says what to send and what the settled page must show.
 */
'use strict'
const path = require('node:path')
const { HOST, readFlow, check, observe } = require('./lane.cjs')
const { recordProbes } = require('./contract-probe.cjs')
const { sendPrompt, waitForTurn } = require('./prompt.cjs')
const { importanceScenario } = require('./importance.cjs')
const { motionScenario } = require('./motion.cjs')
const { longSessionScenario } = require('./long-session.cjs')
const { sidebarRailScenario } = require('./sidebar-rail.cjs')
const { remoteSettingsScenario } = require('./remote-settings.cjs')
const { hostVisibilityScenario } = require('./host-visibility.cjs')
const { customBrandScenario } = require('./custom-brand.cjs')
const { deepcraftScenario } = require('./deepcraft.cjs')
const { petdexScenario } = require('./petdex.cjs')
const { paletteScenario, legacyScenario } = require('./palette.cjs')
const { subagentModelScenario } = require('./subagent-model.cjs')
const { workspacePinsScenario } = require('./workspace-pins.cjs')
const { dsBotScenario } = require('./ds-bot.cjs')
const { desktopHeaderScenario } = require('./desktop-header.cjs')
const { nativeLayoutScenario } = require('./native-layout.cjs')
const { CANVAS } = require('./shoot.cjs')
const { sanitizePage } = require('../../scripts/shared/privacy.cjs')
const { bound } = require('./bounds.cjs')

/**
 * How far behind the tail the host's own follow may lag while it keeps the
 * scroller at the end: the value and the reason it holds it are in
 * packages/testing/bounds.json.
 */
const MAX_FOLLOW_GAP_PX = bound('laneFollowMaxGapPx')

/**
 * Capture the page in both palettes and prove the capture is fit to keep: the
 * palette is the one the page carries, and the visible text carries no
 * personal data (scripts/shared/privacy.cjs). The files land in the run's out
 * directory for a reviewer; nothing is compared against a stored picture.
 */
async function captureBothSchemes(context) {
  const { page, out } = context
  const palette = await page.evaluate(() => document.body.getAttribute('data-dsh-deepcraft-palette'))
  const canvas = CANVAS[palette]
  if (canvas === undefined) throw new Error(`the page carries palette "${palette}", which has no recorded palette`)
  const files = []
  const checks = []
  for (const scheme of ['light', 'dark']) {
    if (scheme === 'dark') {
      // The same DOM flip the theme service's presenter produces for the dark
      // snapshot; no durable preference is read or written.
      await page.evaluate(() => document.body.setAttribute('data-ds-dark-theme', ''))
    }
    const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
    const wanted = canvas[scheme]
    if (background !== wanted) throw new Error(`${scheme} palette did not take effect (body bg ${background}, expected ${wanted})`)
    const { caught, visibleText } = await sanitizePage((expression) => page.evaluate(expression))
    const file = path.join(out, `shots-${scheme}.png`)
    await page.screenshot({ path: file })
    files.push(file)
    checks.push(check(`${scheme} 截图的可见文本没有个人数据`, true, `sweep caught ${caught.length}; ${visibleText.replace(/\s+/g, ' ').length} chars; ${file}`))
  }
  return { checks, files }
}

/** The scenarios: each boots its own instance, sends its prompt, and asserts. */
const SCENARIOS = {
  desktopHeader: desktopHeaderScenario({ check }),
  /** The host's own footer controls under the skin: the Cordis action and the outage button. */
  hostVisibility: hostVisibilityScenario({ check }),
  /** The host's own layout with the skin's sheet on and off, and its controls pressed (native-layout.cjs, D81). */
  nativeLayout: nativeLayoutScenario({ check }),
  /** A scripted answer: the reader's message, the thought, the markdown. */
  conversation: {
    script: 'greeting',
    prompt: 'hello there',
    async assert({ page, session }) {
      const flow = await readFlow(page)
      return [
        check('读者的消息成为一行', flow.userRows === 1 && flow.text.includes('hello there'), `userRows=${flow.userRows}`),
        check('脚本回答的标题与列表都在页面里', flow.text.includes('Hello') && flow.text.includes('first point'), flow.text.slice(0, 120)),
        check('思考过程归入一个过程组', flow.processGroups === 1 && flow.kinds.includes('turn-process'), `processGroups=${flow.processGroups} kinds=${flow.kinds.join(',')}`),
        check('流式标记已经收起', flow.streaming === 0, `streaming=${flow.streaming}`),
        check('控制台没有异常', session.problems.length === 0, session.problems.slice(0, 3).join(' | ')),
      ]
    },
  },
  /**
   * The right panel's own collapse control: the skin keeps no button of its
   * own, the host's expand button opens the panel, and the host's own control
   * closes it again (D81).
   */
  rightbar: {
    script: 'greeting',
    prompt: 'hello there',
    async assert({ page, session }) {
      const read = () => page.evaluate(() => ({
        skinButtons: document.querySelectorAll('.dsh-deepcraft-rightbar-close').length,
        host: document.querySelector('[data-sidebar-right-open] [data-sidebar-right-toggle]') !== null,
        expand: document.querySelector('[data-sidebar-right-expand]') !== null,
        panel: document.querySelector('[data-sidebar-right-open]') !== null,
      }))
      const before = await read()
      await page.locator('[data-sidebar-right-expand]').first().click()
      await page.waitForFunction(() => document.querySelector('[data-sidebar-right-open]') !== null, undefined, { timeout: 15000 })
      await page.waitForTimeout(300)
      const open = await read()
      await page.locator('[data-sidebar-right-toggle]').first().click()
      await page.waitForFunction(() => document.querySelector('[data-sidebar-right-open]') === null, undefined, { timeout: 15000 })
      await page.waitForTimeout(300)
      const closed = await read()
      return [
        check('收起时宿主的打开按钮在，插件不画自己的按钮',
          before.expand === true && before.panel === false && before.skinButtons === 0,
          JSON.stringify(before)),
        check('面板打开后宿主自己的收起按钮就在面板里',
          open.panel === true && open.host === true && open.skinButtons === 0,
          JSON.stringify(open)),
        check('按下宿主的按钮面板收起，打开按钮回到原处',
          closed.panel === false && closed.expand === true && closed.host === false,
          JSON.stringify(closed)),
        check('控制台没有异常', session.problems.length === 0, session.problems.slice(0, 3).join(' | ')),
      ]
    },
  },
  /** A scripted tool call: its row, its call id, and the answer that follows. */
  tool: {
    script: 'inspect',
    prompt: 'look at the workspace',
    async assert({ page, session }) {
      const flow = await readFlow(page)
      return [
        check('工具调用单独成行', flow.toolRows === 1, `toolRows=${flow.toolRows}`),
        check('调用行带着调用编号', flow.callIds.length > 0 && flow.callIds.every((id) => id !== null && id !== ''), `callIds=${JSON.stringify(flow.callIds)}`),
        check('工具结果之后的回答已渲染', flow.text.includes('workspace holds these files'), flow.text.slice(-160)),
        check('过程组收住了整轮', flow.processGroups === 1 && flow.kinds.includes('turn-tail'), `processGroups=${flow.processGroups} kinds=${flow.kinds.join(',')}`),
        check('控制台没有异常', session.problems.length === 0, session.problems.slice(0, 3).join(' | ')),
      ]
    },
  },
  /**
   * The host's own follow through a long answer: the tail stays at the end
   * with no frame sliding back, and the composer stands still (D81).
   */
  scroll: {
    script: 'long',
    prompt: 'write a long answer',
    delayMs: 300,
    // A short viewport, so the streamed answer outgrows it and the tail has to follow.
    viewport: { width: 1280, height: 600 },
    async assert({ session, trace }) {
      // Only the frames from when the conversation's scroller exists carry a position.
      const sampled = trace.filter((frame) => frame.height !== undefined)
      const following = sampled.filter((frame) => frame.following)
      const gaps = following.map((frame) => frame.gap)
      const worst = gaps.length === 0 ? 0 : Math.max(...gaps)
      const first = sampled[0]
      const last = sampled[sampled.length - 1]
      const grown = first === undefined || last === undefined ? 0 : last.height - first.height
      const moved = sampled.filter((frame, i) => i > 0 && frame.top !== sampled[i - 1].top).length
      // A frame that slides back has the position moving up while the content it
      // shows stays or grows; one that runs away has the gap to the tail opening
      // while nothing arrived.
      const backward = sampled.filter((frame, i) => i > 0 && frame.top < sampled[i - 1].top && frame.height >= sampled[i - 1].height)
      const escaped = sampled.filter((frame, i) => i > 0 && frame.gap > sampled[i - 1].gap + 1 && frame.height <= sampled[i - 1].height)
      return [
        check('逐帧采样真的在跑', sampled.length > 30, `frames=${sampled.length}`),
        check('回答在采样期间长出来', grown > 100, `grew ${grown}px during the trace`),
        check('位置跟着内容走', moved > 5, `moved in ${moved} of ${sampled.length} frames`),
        check('没有倒退的一帧', backward.length === 0, `backward=${backward.length}${backward.length === 0 ? '' : ` at ${backward.slice(0, 3).map((f) => f.t).join(',')}ms`}`),
        check('尾部没有自己跑远', escaped.length === 0, `escaped=${escaped.length}${escaped.length === 0 ? '' : ` at ${escaped.slice(0, 3).map((f) => f.t).join(',')}ms`}`),
        check('跟随期间尾部留在视野里', worst <= MAX_FOLLOW_GAP_PX, `maxGap=${worst}px of ${following.length} following frames`),
        check('落定后回到末尾', last !== undefined && last.gap <= 4, `lastGap=${last === undefined ? 'n/a' : last.gap}`),
        check('控制台没有异常', session.problems.length === 0, session.problems.slice(0, 3).join(' | ')),
      ]
    },
  },
  /** The transitions.dev surfaces where they move: the settings switch and a tab change (motion.cjs, D9). */
  motion: motionScenario({ check }),
  /** The host contract table, entry by entry, in the page state each one lives in (D3). */
  contract: {
    script: 'inspect',
    prompt: 'look at the workspace',
    // A slow stream, so the states that last a moment are wide enough to read.
    delayMs: 400,
    /** The empty page: the hero composer, the shell, the boot graph, the document. */
    async beforeSend(context) {
      context.notes.contract = []
      // A short window: the shell finishes mounting its slots just after the skin
      // is up, so a single read would race the composer's own render.
      await recordProbes(context, ['hero', 'any'], 4000)
    },
    /**
     * A second turn brings the states the first one has already left: the
     * submission echo while the flight is up, the streaming marks, and a second
     * mark in the turn rail. The probes for those states have to be read inside
     * this send, so they run before the turn is waited for.
     */
    async afterTurn(context) {
      const second = sendPrompt(context.page, 'look again')
      // One window over both momentary states: the submission goes through while
      // the echo is expected, and the answer streams right after it.
      await recordProbes(context, ['sending', 'streaming'], 9000)
      await second
      await waitForTurn(context.page)
      await recordProbes(context, 'conversation')
      // Any host menu does: every menu shares the role, the list and the foreground.
      const trigger = context.page.locator('[aria-haspopup="menu"]:not(:is([class^="dsh-deepcraft"], [class*=" dsh-deepcraft"])):visible').first()
      if (await trigger.count() > 0) {
        await trigger.click()
        await recordProbes(context, 'menu', 3000)
        await context.page.keyboard.press('Escape')
      }
      await context.page.evaluate(() => document.body.setAttribute('data-ds-dark-theme', ''))
      await recordProbes(context, 'dark')
    },
    async assert({ session, notes }) {
      const results = notes.contract
      const byState = (state) => results.filter((result) => result.state === state)
      const failed = results.filter((result) => !result.ok)
      const unchecked = results.filter((result) => result.observed === 'reported, not checked here')
      const line = (state) => {
        const state_ = byState(state)
        const broken = state_.filter((result) => !result.ok).map((result) => `${result.id} (${result.observed})`)
        return check(`${state} 状态的条目都在`, broken.length === 0, `${state_.length} 条${broken.length === 0 ? '' : `，失效：${broken.join('、')}`}`)
      }
      return [
        ...[...new Set(results.map((result) => result.state))].map((state) => line(state)),
        check('没有页面形态的条目已逐条列出', unchecked.length > 0, `${unchecked.length} 条由行为场景与单元测试持有：${unchecked.map((result) => result.id).join('、')}`),
        check('控制台没有异常', session.problems.length === 0, session.problems.slice(0, 3).join(' | ')),
        ...failed.slice(0, 8).map((result) => check(`契约条目 ${result.id} 仍然成立`, false, `${result.observed}（${result.state}）`)),
      ]
    },
  },
  /** The collapsed rail as the host draws it, its own control where the host puts it (sidebar-rail.cjs). */
  sidebarRail: sidebarRailScenario({ check }),
  /** What a frame costs in a transcript that is already long (long-session.cjs, D40). */
  longSession: longSessionScenario({ check }),
  /** Every `!important` the skin writes is needed on the real page (packages/testing/importance.cjs, D9). */
  importance: importanceScenario({ check, observe, sendPrompt, waitForTurn, host: HOST }),
  /** A page under a non-loopback name reads and writes the host's settings beside the loopback one (packages/testing/remote-settings.cjs, D75). */
  remoteSettings: remoteSettingsScenario({ check }),
  /** The reader's own brand images through the host half's routes and on the real shell (packages/testing/custom-brand.cjs, D80). */
  customBrand: customBrandScenario({ check }),
  /** DeepCraft's own walk: the default identity, the whale's gestures and states, and a plain account menu (packages/testing/deepcraft.cjs, D80). */
  deepcraft: deepcraftScenario({ check }),
  /** Complete Petdex packages imported into the real host and kept as one pet across palettes (packages/testing/petdex.cjs, D80). */
  petdex: petdexScenario({ check }),
  /** Every skin palette's computed colours and the reader's own identity across a switch (palette.cjs, D80). */
  palette: paletteScenario({ check }),
  /** An older profile's brand and per-theme pet migrate to one palette and one pet (palette.cjs, D80). */
  paletteLegacyClaude: legacyScenario('claude', { check }),
  paletteLegacyDeepseek: legacyScenario('deepseek', { check }),
  /** The page yielded whole to ds-bot's published browser half, and taken back through ds-bot's own entry (packages/testing/ds-bot.cjs, D81). */
  dsBot: dsBotScenario({ check }),
  /** The composer's subagent model entry: one pick, its record, and its reload (packages/testing/subagent-model.cjs). */
  subagentModel: subagentModelScenario({ check }),
  /** The pinned aggregate above every workspace, through the host's own menus (packages/testing/workspace-pins.cjs). */
  workspacePins: workspacePinsScenario({ check }),
  /** Both palettes captured to the run's out directory and swept for personal data. */
  shots: {
    script: 'greeting',
    prompt: 'hello there',
    // The README frame's own size, so the capture is the picture the docs carry.
    viewport: { width: 1440, height: 900 },
    async assert(context) {
      const { session } = context
      const flow = await readFlow(context.page)
      const capture = await captureBothSchemes(context)
      return [
        check('脚本回答已渲染', flow.text.includes('Hello') && flow.streaming === 0, `streaming=${flow.streaming}`),
        ...capture.checks,
        check('控制台没有异常', session.problems.length === 0, session.problems.slice(0, 3).join(' | ')),
      ]
    },
  },
}

module.exports = { SCENARIOS }
