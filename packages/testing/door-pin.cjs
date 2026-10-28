#!/usr/bin/env node
/**
 * door-pin.cjs — the status line's pin while a door rolls at the tail, end to
 * end (D74, D40, D66).
 *
 * Registered in the lane's scenario table (packages/testing/scenarios.cjs). It
 * samples the page itself, as reader-scroll.cjs does.
 *
 * A door is the fold's height animation
 * (packages/client/src/features/chat-fold/fold-glide.ts). One that rolls at the
 * tail while the turn streams stands the stream slide down, and its height
 * change takes the host's follow away until the fold hands it back; the tail is
 * still followed all the while, so the status line has to stay pinned where it
 * stood. The scenario runs the standard tier, where a running turn's steps
 * stand in a process group with a header to press, waits for that group to
 * reason at the tail of a full screen, and presses its header twice the way the
 * skin's own folding does — a click with no pointer behind it, which the
 * reader-intent guard does not hear — so one door rolls shut and one rolls open
 * while the reasoning streams.
 */
'use strict'

/** The host's page markers this scenario reads, as packages/testing/lane.cjs names them. */
const HOST = {
  scroller: '[data-conversation-scroll]', // CONVERSATION_SCROLL_SELECTOR
  running: '[data-chat-running]', // CHAT_RUNNING_SELECTOR
  group: '[data-step-process]', // PROCESS_GROUP_SELECTOR
  body: '[data-step-process-body]', // PROCESS_BODY_SELECTOR
  reasoning: '[data-variant="think"][data-state="running"]', // THINK_ROW_SELECTOR in its running phase
}

/** The skin's own marks (packages/client/src/constants.ts). */
const SKIN = {
  rolling: '[data-dsh-deepcraft-rolling]', // CHAT_ROLLING_ATTR
  readerHold: '[data-dsh-deepcraft-reader-hold]', // READER_HOLD_ATTR
}

/**
 * The page-side sampler, run before the page's own scripts.
 *
 * Its callback has to be in a frame before the skin's: a sampler registered
 * later reads after the skin's own frame callbacks have written, and what it
 * catches there is a state the frame has not painted yet — the row's position
 * mid-frame, not the one the reader sees. Registered first, it reads the layout
 * the previous frame left on screen, which is what "did the row move" means.
 *
 * @returns the source of an init script that starts the loop and keeps the
 *     frames on `window.__doorPinTrace`.
 */
function samplerSource() {
  const marks = { ...HOST, ...SKIN }
  return `(() => {
    const marks = ${JSON.stringify(marks)}
    const trace = []
    window.__doorPinTrace = trace
    const sample = () => {
      const group = window.__doorPinGroup
      const scroller = document.querySelector(marks.scroller)
      const row = document.querySelector(marks.running)
      // The row's place on screen, the scroller's own numbers, and the row's
      // place inside the content: a pin that holds shows a steady screen place,
      // and a frame where only the content place moved says the scroller was
      // still catching up rather than the row sliding.
      const rowTop = row === null ? null : Math.round(row.getBoundingClientRect().top * 100) / 100
      const viewTop = scroller === null ? null : Math.round(scroller.getBoundingClientRect().top * 100) / 100
      trace.push({
        row: rowTop,
        pinned: row !== null && getComputedStyle(row).position === 'sticky',
        overflowing: scroller !== null && scroller.scrollHeight > scroller.clientHeight,
        groupRolling: group !== undefined && group.isConnected && group.matches(marks.rolling),
        reader: scroller !== null && scroller.matches(marks.readerHold),
        scrollTop: scroller === null ? null : Math.round(scroller.scrollTop * 100) / 100,
        content: rowTop === null || viewTop === null || scroller === null ? null : Math.round((rowTop - viewTop + scroller.scrollTop) * 100) / 100,
        // The same reading taken once the frame's own writes have landed: the
        // frame callback above runs before the skin's write phase, so the two
        // values answer different questions — what the sampler saw, and what
        // the frame then painted.
        painted: null,
      })
      const entry = trace[trace.length - 1]
      window.setTimeout(() => {
        const node = document.querySelector(marks.running)
        entry.painted = node === null ? null : Math.round(node.getBoundingClientRect().top * 100) / 100
      }, 0)
      if (trace.length < 6000) requestAnimationFrame(sample)
    }
    requestAnimationFrame(sample)
  })()`
}

/**
 * Press the newest process group's header with no pointer behind the click,
 * then wait for that group to roll and its new expanded state to land.
 * @returns what the header said before the press, and the sampler's frames from
 *     the press to the landing as `[from, to)`; null when there was no header.
 */
async function pressGroup(page) {
  const pressed = await page.evaluate((marks) => {
    const groups = [...document.querySelectorAll(marks.group)]
    const group = groups[groups.length - 1]
    const header = group === undefined ? null : group.querySelector('[aria-controls]')
    if (!(header instanceof HTMLElement)) return null
    const expanded = header.getAttribute('aria-expanded')
    window.__doorPinGroup = group
    const from = window.__doorPinTrace.length
    header.click()
    return { expanded, from }
  }, HOST)
  if (pressed === null) return null
  await page.waitForFunction(({ from, rolling, expanded, body }) => {
    const group = window.__doorPinGroup
    if (group === undefined || !group.isConnected) return false
    const header = group.querySelector('[aria-controls]')
    const content = group.querySelector(body)
    const opened = expanded === 'false'
    return header?.getAttribute('aria-expanded') === String(opened) && content !== null &&
      content.hasAttribute('hidden') !== opened &&
      window.__doorPinTrace.slice(from).some((frame) => frame.groupRolling) && !group.matches(rolling)
  }, { from: pressed.from, rolling: SKIN.rolling, expanded: pressed.expanded, body: HOST.body }, { timeout: 10000 })
  return { ...pressed, to: await page.evaluate(() => window.__doorPinTrace.length) }
}

function doorPinScenario({ check }) {
  return {
    script: 'tailReasoning',
    prompt: 'list the files and think it over',
    delayMs: 300,
    viewport: { width: 1280, height: 600 },
    patch: [
      '- id: ui-chat',
      '  config:',
      '    transcriptView: standard',
    ],
    // The sampler's frame callback goes in before the bundle's (D66).
    initScript: samplerSource(),
    /**
     * Wait for the running group to reason, open, under a transcript taller than
     * the viewport, then roll its door shut and open again.
     */
    async duringTurn(context) {
      const { page } = context
      await page.waitForFunction((marks) => {
        const scroller = document.querySelector(marks.scroller)
        const groups = [...document.querySelectorAll(marks.group)]
        const group = groups[groups.length - 1]
        if (scroller === null || group === undefined) return false
        const body = group.querySelector(marks.body)
        if (body === null || body.hasAttribute('hidden')) return false
        if (group.querySelector(marks.reasoning) === null) return false
        return scroller.scrollHeight - scroller.clientHeight > scroller.clientHeight / 2
      }, HOST, { timeout: 30000 })
      context.notes.shut = await pressGroup(page)
      context.notes.open = await pressGroup(page)
      context.notes.streaming = await page.evaluate((marks) => window.__doorPinGroup !== undefined && window.__doorPinGroup.querySelector(marks) !== null, HOST.reasoning)
    },
    async afterTurn(context) {
      context.notes.trace = await context.page.evaluate(() => window.__doorPinTrace ?? [])
    },
    async assert({ session, notes }) {
      // Each door is read on its own frames, from its press to its landing.
      const trace = notes.trace ?? []
      // A frame is judged on the place it painted: the row's own reading at the
      // next task is the layout that frame left on screen.
      const doorFrames = (door) => door === null || door === undefined ? []
        : trace.slice(door.from, door.to)
          .filter((frame) => frame.row !== null && frame.overflowing && !frame.reader)
          .map((frame) => ({ ...frame, row: frame.painted === null || frame.painted === undefined ? frame.row : frame.painted }))
      const doors = [doorFrames(notes.shut), doorFrames(notes.open)]
      const rolling = doors.flatMap((frames) => frames.filter((frame) => frame.groupRolling))
      const slipped = rolling.filter((frame) => !frame.pinned)
      const spreads = doors.map((frames) => frames.length === 0 ? null : Math.max(...frames.map((frame) => frame.row)) - Math.min(...frames.map((frame) => frame.row)))
      // Which of the two moved: the screen place, or the place inside the
      // content the scroller had not caught up with yet.
      const spreadOf = (frames, key) => {
        const values = frames.map((frame) => frame[key]).filter((value) => value !== null && value !== undefined)
        return values.length === 0 ? null : Math.round((Math.max(...values) - Math.min(...values)) * 100) / 100
      }
      const contentSpreads = doors.map((frames) => spreadOf(frames, 'content'))
      const scrollSpreads = doors.map((frames) => spreadOf(frames, 'scrollTop'))
      return [
        check('两扇门都在推理流式输出时滚过',
          notes.shut?.expanded === 'true' && notes.open?.expanded === 'false' && notes.streaming === true &&
            doors.every((frames) => frames.some((frame) => frame.groupRolling)),
          JSON.stringify({ shut: notes.shut, open: notes.open, streamingAfter: notes.streaming, doorFrames: doors.map((frames) => frames.filter((frame) => frame.groupRolling).length) })),
        check('门滚动的每一帧状态行都钉着', rolling.length > 0 && slipped.length === 0,
          `${slipped.length} of ${rolling.length} door frames unpinned${slipped.length === 0 ? '' : `, row ${Math.min(...slipped.map((f) => f.row))}..${Math.max(...slipped.map((f) => f.row))}`}`),
        check('从按下到门落定，状态行停在同一处，连半个像素也不动', spreads.every((spread) => spread === 0),
          `spread per door ${JSON.stringify(spreads)} over ${doors.map((frames) => frames.length).join(' and ')} frames; content ${JSON.stringify(contentSpreads)}, scrollTop ${JSON.stringify(scrollSpreads)}`),
        check('控制台没有异常', session.problems.length === 0, session.problems.slice(0, 3).join(' | ')),
      ]
    },
  }
}

module.exports = { doorPinScenario }
