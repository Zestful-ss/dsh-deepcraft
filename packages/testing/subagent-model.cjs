/**
 * subagent-model.cjs — the composer's subagent model entry, and the rule it
 * feeds, on a real host (D66).
 *
 * The entry exists only where a session recorded which routes it may delegate
 * on. This scenario walks its compact trigger, the complete names in the list,
 * saved choices after a reload, and the card in a narrow dark window. The second
 * prompt checks the host rule with calls that omit the route, name an unpicked
 * route, and name the selected route.
 */
'use strict'
const fs = require('node:fs')
const path = require('node:path')
const { sendPrompt, waitForTurn } = require('./prompt.cjs')
const { DEFAULT_LOG } = require('./mock-llm.cjs')
const { openSkinSettings, setAccentColor } = require('./settings-route.cjs')

/**
 * Every request the scripted model received since `since`, as raw bodies.
 *
 * The rule's effect is what the MODEL was told, and the page shows nothing of a
 * call refused before it ran: the requests are where a refusal is observable. A
 * body is the raw JSON text the host sent, so the search is a substring test.
 */
function requestsSince(since) {
  const bodies = []
  for (const name of fs.readdirSync(DEFAULT_LOG).sort()) {
    const file = path.join(DEFAULT_LOG, name)
    let logged
    try {
      logged = JSON.parse(fs.readFileSync(file, 'utf8'))
    } catch {
      continue
    }
    if (typeof logged.at !== 'string' || Date.parse(logged.at) < since) continue
    bodies.push(typeof logged.body === 'string' ? logged.body : JSON.stringify(logged.body ?? ''))
  }
  return bodies
}

/** Two available routes and a long route name absent from the catalog. */
const PROVIDER = 'deepseek-official'
const LONG_MODEL = 'deepseek-v4-flash-opencode-model-with-a-long-provider-route-and-extended-context'
const ROUTES = [
  { provider: PROVIDER, model: 'deepseek-flash' },
  { provider: PROVIDER, model: 'deepseek-v4-pro' },
  { provider: PROVIDER, model: LONG_MODEL },
  // The capsule's own fourth route: the host policy takes it without the
  // catalog naming it, so the count can reach the top rung.
  { provider: PROVIDER, model: `${LONG_MODEL}-capsule` },
]

/**
 * The patch that turns the official settings on with the routes for this boot.
 * The web-app bundle mounts the settings plugin and the standard preset gives
 * the `subagent` tool its model fields; this is the config the Plugins page writes.
 */
const PATCH = [
  '- id: subagent-model-selection-settings',
  '  config:',
  '    enabled: true',
  '    allowedModels:',
  ...ROUTES.flatMap((route) => [`      - provider: ${route.provider}`, `        model: ${route.model}`]),
]

/** The scripted answers: one greeting, then the three `subagent` calls and the child's own reply. */
const SCRIPT = {
  conversation: [
    { text: ['Ready when you are.'] },
    { thinking: ['Delegate without naming a route.'], tool: { name: 'subagent', input: { description: 'no route', prompt: 'say something' } } },
    { thinking: ['Delegate on the other allowed route.'], tool: { name: 'subagent', input: { description: 'other route', prompt: 'say something', provider: ROUTES[1].provider, model: ROUTES[1].model } } },
    { thinking: ['Delegate on the route the reader picked.'], tool: { name: 'subagent', input: { description: 'picked route', prompt: 'say something', provider: ROUTES[0].provider, model: ROUTES[0].model, reasoning_effort: 'high' } } },
    { text: ['child finished'] },
    { text: ['all done'] },
    // The background subagent's finishing notice is one more turn of its own,
    // which draws the scripted thinking and the off-effort call before the
    // reader has lowered the pick; the denial it earns is part of the flow.
    { thinking: ['Delegate off.'], tool: { name: 'subagent', input: { description: 'picked route off', prompt: 'say something', provider: ROUTES[0].provider, model: ROUTES[0].model, reasoning_effort: 'off' } } },
    { text: ['child finished'] },
    // The reader's own second prompt, after the pick reads "off".
    { thinking: ['Delegate off again.'], tool: { name: 'subagent', input: { description: 'picked route off', prompt: 'say something', provider: ROUTES[0].provider, model: ROUTES[0].model, reasoning_effort: 'off' } } },
    { text: ['child finished'] },
    { text: ['done again'] },
    // The second session's own first turn, after the rule has answered.
    { text: ['Second session here.'] },
  ],
  auxiliary: { text: ['Scripted delegation'] },
}

/** The entry's own button, and the card it opens. */
const TRIGGER = '.dsh-deepcraft-subagent-model-btn'
const CARD = '.dsh-deepcraft-subagent-model-popover'
const OPTION = '.dsh-deepcraft-subagent-model-option'
const ENTRY = '.dsh-deepcraft-subagent-model-entry'
const CLEAR = '.dsh-deepcraft-subagent-model-clear'

/** Press the effort option whose label reads `level`, inside the open card. */
function pickEffort(page, level) {
  return page.evaluate((wanted) => {
    const options = [...document.querySelectorAll('.dsh-deepcraft-subagent-model-popover[data-open="true"] .dsh-deepcraft-subagent-model-effort-option')]
    const target = options.find((o) => (o.textContent ?? '').trim().toLowerCase() === wanted)
    if (target === undefined) return false
    target.click()
    return true
  }, level)
}

/** Wait on the record answering the picked route's effort back, not on a pause. */
function waitForEffort(page, level, timeout = 30000) {
  return page.waitForFunction(async (wanted) => {
    const id = document.querySelector('[data-conversation-session]')?.getAttribute('data-conversation-session') ?? ''
    const r = await fetch(`/dsh-deepcraft/subagent-models?session=${encodeURIComponent(id)}`, { credentials: 'same-origin', headers: { accept: 'application/json' } }).then((x) => x.json()).catch(() => null)
    return r !== null && Array.isArray(r.selected) && r.selected[0]?.reasoningEffort === wanted
  }, level, { timeout })
}

/** Read what the entry shows: its text, its state mark, and the card's rows. */
function readEntry(page) {
  return page.evaluate((selectors) => {
    const trigger = document.querySelector(selectors.trigger)
    const card = document.querySelector(selectors.card)
    const open = card !== null && card.getAttribute('data-open') === 'true'
    const box = (element) => {
      if (element === null) return null
      const rect = element.getBoundingClientRect()
      return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height }
    }
    return {
      present: trigger !== null,
      box: box(trigger),
      text: (trigger?.textContent ?? '').trim(),
      state: trigger?.getAttribute('data-dsh-subagent-model') ?? null,
      label: trigger?.getAttribute('aria-label') ?? null,
      expanded: trigger?.getAttribute('aria-expanded') ?? null,
      card: {
        open,
        box: box(card),
        rows: card === null ? [] : [...card.querySelectorAll(selectors.option)].map((row) => {
          const text = row.querySelector('.dsh-deepcraft-popover-item-text')
          return {
            text: (text?.textContent ?? '').trim(),
            desc: (row.querySelector('.dsh-deepcraft-popover-item-desc')?.textContent ?? '').trim(),
            checked: row.getAttribute('aria-checked'),
            lines: text === null ? 0 : text.scrollHeight / parseFloat(getComputedStyle(text).lineHeight),
            clipped: text === null || text.scrollWidth > text.clientWidth,
          }
        }),
      },
      viewport: { width: window.innerWidth, height: window.innerHeight },
    }
  }, { trigger: TRIGGER, card: CARD, option: OPTION })
}

/** The session the page shows. */
function shownSession(page) {
  return page.evaluate(() => document.querySelector('[data-conversation-session]')?.getAttribute('data-conversation-session') ?? '')
}

/**
 * The record the host keeps for one session — the one the page shows unless
 * `session` names another.
 */
function readRecord(page, session) {
  return page.evaluate(async (asked) => {
    const id = asked.session === undefined
      ? document.querySelector('[data-conversation-session]')?.getAttribute('data-conversation-session') ?? ''
      : asked.session
    const response = await fetch(`${asked.path}?session=${encodeURIComponent(id)}`, { credentials: 'same-origin', headers: { accept: 'application/json' } })
    return response.json()
  }, { path: '/dsh-deepcraft/subagent-models', session })
}

/** Open the card unless it is already up: a press on the trigger toggles it. */
async function ensureCardOpen(page) {
  const open = await page.evaluate((selectors) => document.querySelector(selectors.card)?.getAttribute('data-open') === 'true', { card: CARD })
  if (!open) await page.click(TRIGGER)
  await page.waitForSelector(`${CARD}[data-open="true"]`, { timeout: 5000 }).catch(() => {})
}

/** Wait until the entry's accessible name carries the chosen route. */
async function waitForLabel(page, text, timeout = 8000) {
  await page.waitForFunction((wanted) => {
    const trigger = document.querySelector(wanted.selector)
    return trigger !== null && (trigger.getAttribute('aria-label') ?? '').includes(wanted.text)
  }, { selector: TRIGGER, text }, { timeout }).catch(() => {})
}

/** Wait until the entry is in `state` again. */
async function waitForState(page, state, timeout = 8000) {
  await page.waitForFunction((wanted) => document.querySelector(wanted.selector)?.getAttribute('data-dsh-subagent-model') === wanted.state,
    { selector: TRIGGER, state }, { timeout }).catch(() => {})
}

/** The capsule mark's value, both halves' boxes and their computed outline colours. */
function readCapsule(page) {
  return page.evaluate((selectors) => {
    const parent = document.querySelector(selectors.capsule)
    const subagent = document.querySelector(selectors.trigger)
    const model = document.querySelector(selectors.model)
    const box = (element) => {
      if (element === null) return null
      const rect = element.getBoundingClientRect()
      return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height }
    }
    const colour = (shadow) => String(shadow).match(/rgba?\([^)]+\)/)?.[0] ?? String(shadow)
    return {
      value: parent?.getAttribute(selectors.attr) ?? null,
      label: subagent?.getAttribute('aria-label') ?? '',
      subagent: box(subagent),
      model: box(model),
      subagentColour: colour(subagent === null ? '' : getComputedStyle(subagent).boxShadow),
      modelColour: colour(model === null ? '' : getComputedStyle(model).boxShadow),
      parentDisplay: parent === null ? null : getComputedStyle(parent).display,
      gap: parent === null ? null : getComputedStyle(parent).gap,
    }
  }, { capsule: '[data-dsh-deepcraft-model-capsule]', attr: 'data-dsh-deepcraft-model-capsule', trigger: TRIGGER, model: '[data-dsh-deepcraft-model-capsule-part="model"]' })
}

/** Wait until the capsule carries `value`; the write follows the host's answer. */
function waitForCapsule(page, value, timeout = 10000) {
  return page.waitForFunction((wanted) => document.querySelector(wanted.selector)?.getAttribute(wanted.attr) === wanted.value,
    { selector: '[data-dsh-deepcraft-model-capsule]', attr: 'data-dsh-deepcraft-model-capsule', value }, { timeout })
    .then(() => true, () => false)
}

/** The capsule's rung and the edge colour the page's own tokens resolve to. */
function readCapsuleEdge(page, selector) {
  return page.evaluate((selector) => {
    const part = document.querySelector(`${selector} [data-dsh-deepcraft-model-capsule-part="subagent"]`)
    const model = document.querySelector(`${selector} [data-dsh-deepcraft-model-capsule-part="model"]`)
    const parent = document.querySelector(selector)
    const body = getComputedStyle(document.body)
    const probe = document.createElement('span')
    probe.style.color = body.getPropertyValue('--dsw-alias-state-business-primary').trim()
    document.body.appendChild(probe)
    const expected = getComputedStyle(probe).color
    probe.remove()
    return {
      value: parent?.getAttribute('data-dsh-deepcraft-model-capsule') ?? null,
      palette: document.body.getAttribute('data-dsh-deepcraft-palette'),
      dark: document.body.hasAttribute('data-ds-dark-theme'),
      accent: document.body.hasAttribute('data-dsh-deepcraft-accent'),
      edge: (String(part === null ? '' : getComputedStyle(part).boxShadow).match(/rgba?\([^)]+\)/) ?? [''])[0],
      expected,
      radius: part === null ? null : getComputedStyle(part).borderTopLeftRadius,
      seam: part === null ? null : getComputedStyle(part).borderTopRightRadius,
      modelSeam: model === null ? null : getComputedStyle(model).borderTopLeftRadius,
    }
  }, selector)
}

/** The catalog's own name for the first route's model. */
const PICKED = 'DeepSeek-V4.1-Flash'
/** The catalog's own name for the provider group those routes belong to. */
const PROVIDER_NAME = 'DeepSeek'

/**
 * What the host's rule says when it refuses a call the reader's pick excludes,
 * and when it refuses one that names no route at all.
 */
const DENIED_NO_PAIR = 'Pass provider and model together from that list'
const DENIED_NOT_PICKED = 'is not one of them'
/** What the prompt says while exactly one route is picked. */
const ONLY_ROUTE = 'That is the only route this session delegates on'

/**
 * The scenario itself.
 *
 * @param options.check - the lane's own assertion shape.
 * @returns the scenario the table registers.
 */
function subagentModelScenario({ check }) {
  return {
    script: SCRIPT,
    prompt: 'hello there',
    patch: PATCH,
    async assert({ page }) {
      const checks = []
      await page.waitForSelector(TRIGGER, { timeout: 20000 }).catch(() => {})
      const first = await readEntry(page)
      const firstSession = await shownSession(page)
      const started = await readRecord(page)
      checks.push(check('会话已允许子代理模型时，输入框右侧出现这个入口',
        first.present && first.state === 'empty', JSON.stringify({ present: first.present, state: first.state, text: first.text, record: started })))

      await ensureCardOpen(page)
      const opened = await readEntry(page)
      checks.push(check('弹层按官方允许列表列出每条路由，并写出所属 provider',
        opened.card.rows.length === ROUTES.length && opened.card.rows.every((row) => row.desc === PROVIDER_NAME) &&
          opened.card.rows.some((row) => row.text === PICKED),
        JSON.stringify(opened.card.rows)))
      const longRow = opened.card.rows.find((row) => row.text === LONG_MODEL)
      checks.push(check('长模型名称在面板内换行，完整内容可见',
        longRow !== undefined && longRow.lines > 1 && longRow.clipped === false,
        JSON.stringify(longRow)))
      checks.push(check('弹层开口朝上并落在窗口之内',
        opened.card.box !== null && opened.card.box.top >= 0 && opened.card.box.bottom <= opened.viewport.height &&
          opened.card.box.left >= 0 && opened.card.box.right <= opened.viewport.width,
        JSON.stringify({ box: opened.card.box, viewport: opened.viewport })))

      await page.click(`${CARD}[data-open="true"] ${ENTRY}:nth-child(1) ${OPTION}`, { timeout: 5000 }).catch(() => {})
      await waitForLabel(page, PICKED)
      const picked = await readEntry(page)
      checks.push(check('选中后入口保持紧凑，完整模型名可以从入口名称与勾选行读出',
        picked.text === '' && picked.box !== null && picked.box.width <= 32 && picked.label?.includes(PICKED) &&
          picked.state === 'chosen' && picked.card.rows[0].checked === 'true',
        JSON.stringify({ box: picked.box, label: picked.label, state: picked.state, rows: picked.card.rows })))

      const stored = await readRecord(page)
      checks.push(check('这一条已经写进宿主保存的记录里，并且回到官方允许列表',
        Array.isArray(stored.selected) && stored.selected.length === 1 && stored.selected[0].model === ROUTES[0].model &&
          stored.allowed.length === ROUTES.length && stored.reason === undefined,
        JSON.stringify(stored)))

      await page.reload({ waitUntil: 'domcontentloaded' })
      await page.waitForSelector(TRIGGER, { timeout: 20000 }).catch(() => {})
      await waitForLabel(page, PICKED, 15000)
      const reopened = await readEntry(page)
      checks.push(check('重新打开页面后，入口仍说明这条选择',
        reopened.label?.includes(PICKED) && reopened.state === 'chosen', JSON.stringify({ label: reopened.label, state: reopened.state })))

      await ensureCardOpen(page)
      await page.click(`${CARD}[data-open="true"] ${CLEAR}`)
      await waitForState(page, 'empty')
      const cleared = await readEntry(page)
      const afterClear = await readRecord(page)
      checks.push(check('清除选择后入口回到未选状态，记录里也不再留下这条',
        cleared.state === 'empty' && Array.isArray(afterClear.selected) && afterClear.selected.length === 0,
        JSON.stringify({ state: cleared.state, record: afterClear })))

      // The rule itself: the session delegates again, this time through the
      // scripted calls the mock answers with. The picked route also carries the
      // effort the reader set, so the delegation must name it.
      await ensureCardOpen(page)
      await page.click(`${CARD}[data-open="true"] ${ENTRY}:nth-child(1) ${OPTION}`)
      await waitForLabel(page, PICKED)
      // Set the picked route's effort to "high" through its own sub-list: the
      // last option of the declared ladder.
      const effortSet = await pickEffort(page, 'high')
      await waitForEffort(page, 'high')
      const sentAt = Date.now()
      await sendPrompt(page, 'delegate now')
      // The first turn already left its tail row, so waiting on a tail again
      // would answer at once: this waits on what the second turn brings — three
      // tool calls, nothing streaming, and the child's own answer in the flow.
      await page.waitForFunction(() => document.querySelectorAll('[data-chat-flow-kind="tool-call"]').length >= 3 &&
        document.querySelectorAll('[data-streaming]').length === 0, undefined, { timeout: 90000 }).catch(() => {})
      await page.waitForFunction(() => (document.querySelector('[data-chat-flow]')?.textContent ?? '').includes('child finished'),
        undefined, { timeout: 90000 }).catch(() => {})
      const flow = await page.evaluate(() => {
        const rows = [...document.querySelectorAll('[data-chat-flow-kind="tool-call"]')]
        // Each call's own node, whether the host draws it as a row or as a card
        // inside one: the refusal is the call's result text.
        const calls = [...document.querySelectorAll('[data-chat-call-id]')].map((node) => (node.textContent ?? '').replace(/\s+/g, ' ').trim())
        return {
          toolRows: rows.length,
          calls,
          text: rows.map((row) => (row.textContent ?? '').replace(/\s+/g, ' ').trim()),
          whole: (document.querySelector('[data-chat-flow]')?.textContent ?? '').replace(/\s+/g, ' ').trim(),
        }
      })
      const requests = requestsSince(sentAt)
      const asked = requests.join('\n')
      checks.push(check('会话模型的提示词里写明了这条会话只走选中的那条路由',
        asked.includes(ONLY_ROUTE), JSON.stringify({ requests: requests.length })))
      checks.push(check('选中路由的思考强度被记下，提示词要求调用带上同一个 reasoning_effort',
        effortSet === true && /reasoning_effort.{0,4}high/.test(asked), JSON.stringify({ effortSet, found: /reasoning_effort/.test(asked) })))
      checks.push(check('带上正确 reasoning_effort 的委派被放行，发往模型服务的请求在 output_config 里带上该强度',
        asked.includes('"output_config"') && /"output_config"\s*:\s*\{[^}]*"effort"\s*:\s*"high"/.test(asked),
        asked.match(/"output_config"[^}]*\}/)?.[0] ?? 'no output_config in requests'))
      checks.push(check('没有写 model 的调用被拒绝，并说出该从哪里取',
        asked.includes(DENIED_NO_PAIR), asked.includes(DENIED_NO_PAIR) ? '' : asked.slice(0, 200)))
      checks.push(check('写了允许列表里没有选中的那条也被拒绝',
        asked.includes(DENIED_NOT_PICKED), asked.includes(DENIED_NOT_PICKED) ? '' : asked.slice(0, 200)))
      // The refusals are this skin's own sentences, so they read the same on
      // every page language; a started call is what carries neither of them.
      checks.push(check('被拒绝的两次调用都没有启动子智能体',
        flow.calls.filter((text) => !text.includes(DENIED_NO_PAIR) && !text.includes(DENIED_NOT_PICKED)).length === 1,
        JSON.stringify(flow.calls)))
      checks.push(check('选中的那条放行，子代理的答复回到父会话里',
        flow.whole.includes('child finished'), flow.whole.slice(-240)))

      // The narrow window and the dark palette: the same card, still whole.
      await page.setViewportSize({ width: 390, height: 760 })
      await page.evaluate(() => { document.body.setAttribute('data-ds-dark-theme', '') })
      await ensureCardOpen(page)
      const narrow = await readEntry(page)
      checks.push(check('窄窗口与深色下，弹层仍然整块落在窗口之内',
        narrow.card.box !== null && narrow.card.box.left >= 0 && narrow.card.box.right <= narrow.viewport.width &&
          narrow.card.box.top >= 0 && narrow.card.box.bottom <= narrow.viewport.height,
        JSON.stringify({ box: narrow.card.box, viewport: narrow.viewport })))

      // The same route at "off": a second pick overwrites the first's level,
      // the guard now asks for "off", and the provider answers
      // `thinking.type: "disabled"` with no `output_config` at all (its
      // mapping in @deepseek-ai/dsh-llm-deepseek).
      await page.setViewportSize({ width: 1280, height: 900 })
      await page.evaluate(() => { document.body.removeAttribute('data-ds-dark-theme') })
      await ensureCardOpen(page)
      const offSet = await pickEffort(page, 'off')
      // The write can wait on the route resolving the model's ladder while a
      // turn is still in flight, so the record is the gate before the prompt.
      await waitForEffort(page, 'off')
      const offSentAt = Date.now()
      await sendPrompt(page, 'delegate again')
      await page.waitForFunction((marker) => document.body.innerText.includes(marker), 'Delegate off again.', { timeout: 20000 }).catch(() => {})
      await waitForTurn(page)
      // The allowed call activates a background subagent; its own model call
      // lands on its own clock, so the check waits on the log itself. The
      // child's call is the request that starts the delegated task: one
      // message, the prompt itself. The parent repeats the same words deep
      // inside its own history, and the child session inherits the rule's
      // `reasoning_effort` sentence, so neither marks it by text alone.
      const childOf = (bodies) => bodies.find((body) => {
        try {
          const request = JSON.parse(body)
          const msgs = request?.messages
          return Array.isArray(msgs) && msgs.length === 1 && JSON.stringify(msgs[0]).includes('say something')
        } catch {
          return false
        }
      }) ?? ''
      const childAt = Date.now() + 15000
      let childCall = ''
      let offRequests = []
      while (Date.now() < childAt && childCall === '') {
        offRequests = requestsSince(offSentAt)
        childCall = childOf(offRequests)
        if (childCall === '') await new Promise((resolve) => setTimeout(resolve, 400))
      }
      const offAsked = offRequests.join('\n')
      checks.push(check('改选 off 后提示词改要同一个档位',
        offSet === true && /reasoning_effort.{0,4}off/.test(offAsked),
        JSON.stringify({ offSet, found: /reasoning_effort/.test(offAsked) })))
      checks.push(check('委派后子代理自己的请求把思考关掉而不是再带 effort',
        childCall !== '' && /"thinking"\s*:\s*\{[^}]*"type"\s*:\s*"disabled"/.test(childCall) && !childCall.includes('"output_config"'),
        JSON.stringify({ child: childCall.match(/"thinking"[^}]*\}/)?.[0] ?? 'none', output: childCall.match(/"output_config"[^}]*\}/)?.[0] ?? 'none' })))

      // A second session of its own: several routes here, and the first
      // session's single pick is still its own.
      await page.setViewportSize({ width: 1280, height: 900 })
      await page.evaluate(() => { document.body.removeAttribute('data-ds-dark-theme') })
      await page.click('button[data-dsh-deepcraft-part~="new-session"]')
      // The shell swaps the composer for the new-session page's own: typing
      // into the one it replaces lands in a node that is about to leave, and
      // the press then submits nothing.
      await page.waitForFunction((previous) => {
        const shown = document.querySelector('[data-conversation-session]')?.getAttribute('data-conversation-session') ?? ''
        return shown !== previous
      }, firstSession, { timeout: 15000 })
      await sendPrompt(page, 'second session')
      await waitForTurn(page)
      await page.waitForSelector(TRIGGER, { timeout: 20000 }).catch(() => {})
      await ensureCardOpen(page)
      const secondOpened = await readEntry(page)
      const secondRows = secondOpened.card.rows.length
      await page.click(`${CARD}[data-open="true"] ${ENTRY}:nth-child(1) ${OPTION}`, { timeout: 5000 }).catch(() => {})
      await page.waitForSelector(`${CARD}[data-open="true"] ${ENTRY}:nth-child(2) ${OPTION}`, { timeout: 5000 }).catch(() => {})
      await page.click(`${CARD}[data-open="true"] ${ENTRY}:nth-child(2) ${OPTION}`, { timeout: 5000 }).catch(() => {})
      // The accessible name changes when the second write lands.
      await page.waitForFunction((selector) => {
        const trigger = document.querySelector(selector)
        return trigger !== null && /2/.test(trigger.getAttribute('aria-label') ?? '')
      }, TRIGGER, { timeout: 8000 }).catch(() => {})
      const second = await readEntry(page)
      const secondSession = await shownSession(page)
      const secondRecord = await readRecord(page)
      const firstRecord = await readRecord(page, firstSession)
      checks.push(check('另一条会话可以同时选两条，入口说明选择数量',
        secondSession !== firstSession && /2/.test(second.label ?? '') && second.card.rows.length === secondRows &&
          second.card.rows.slice(0, 2).every((row) => row.checked === 'true') && second.card.rows[2]?.checked === 'false',
        JSON.stringify({ second: secondSession, first: firstSession, label: second.label, rows: second.card.rows })))
      checks.push(check('两条会话各自保存自己的选择，互不改写',
        Array.isArray(secondRecord.selected) && secondRecord.selected.length === 2 &&
          Array.isArray(firstRecord.selected) && firstRecord.selected.length === 1 && firstRecord.selected[0].model === ROUTES[0].model &&
          firstRecord.selected[0].reasoningEffort === 'off',
        JSON.stringify({ second: secondRecord.selected, first: firstRecord.selected })))

      // The capsule: no pick, then every rung the count can reach.
      await ensureCardOpen(page)
      await page.click(`${CARD}[data-open="true"] ${CLEAR}`)
      const atZero = await waitForCapsule(page, '0')
      const zero = await readCapsule(page)
      const rungs = []
      for (let n = 1; n <= ROUTES.length; n++) {
        await ensureCardOpen(page)
        await page.click(`${CARD}[data-open="true"] ${ENTRY}:nth-child(${n}) ${OPTION}`, { timeout: 5000 }).catch(() => {})
        // The count in the accessible name is the host's answer; the capsule
        // value alone repeats its previous rung until the write lands.
        await waitForLabel(page, String(n), 15000)
        const wanted = String(Math.min(n, 3))
        if (!await waitForCapsule(page, wanted)) break
        rungs.push(await readCapsule(page))
      }
      const atOne = rungs[0]
      const atTwo = rungs[1]
      const atThree = rungs[2]
      const atFour = rungs[3]
      const colours = [zero, atOne, atTwo, atThree].map((reading) => reading?.subagentColour ?? '')
      checks.push(check('未选时入口已排成胶囊，外框是中性色', atZero && zero.value === '0' && zero.parentDisplay === 'flex' && zero.gap === '0px' && zero.subagentColour !== '', JSON.stringify(zero)))
      checks.push(check('选择 1、2、3 条各取一档外框颜色，三档互不相同',
        colours.length === 4 && new Set(colours).size === 4, JSON.stringify(colours)))
      checks.push(check('第 4 条选择停在同一最高档，两半外框同色且等高相接',
        atFour !== undefined && atFour.value === '3' && atFour.subagentColour === atThree?.subagentColour &&
          atFour.subagent !== null && atFour.model !== null &&
          Math.round(atFour.subagent.height) === 28 && Math.round(atFour.model.height) === 28 &&
          Math.abs(atFour.subagent.right - atFour.model.left) <= 1,
        JSON.stringify(atFour)))
      checks.push(check('无障碍名称与鼠标提示说出未选、1 条与 4 条',
        /未选择|none selected/i.test(zero.label) && /1/.test(atOne?.label ?? '') && /4/.test(atFour?.label ?? ''),
        JSON.stringify({ zero: zero.label, one: atOne?.label, four: atFour?.label })))

      // The two menus stay independent: opening one folds the other.
      await page.keyboard.press('Escape')
      await page.click('[data-slot="conversation.input.model"] button')
      await page.waitForSelector('[role="menu"]', { timeout: 5000 }).catch(() => {})
      await page.click(TRIGGER)
      await page.waitForSelector(`${CARD}[data-open="true"]`, { timeout: 5000 }).catch(() => {})
      const menus = await page.evaluate((selectors) => ({
        model: document.querySelector(selectors.model) !== null,
        subagent: document.querySelector(selectors.card) !== null,
      }), { model: '[role="menu"]', card: `${CARD}[data-open="true"]` })
      checks.push(check('打开子代理面板会收起宿主的模型菜单，两个入口都可打开', menus.subagent && !menus.model, JSON.stringify(menus)))
      await page.keyboard.press('Escape')

      // A reload keeps the count, and each session draws its own.
      await page.reload({ waitUntil: 'domcontentloaded' })
      await page.waitForSelector(TRIGGER, { timeout: 20000 }).catch(() => {})
      const keptCount = await waitForCapsule(page, '3')
      await waitForLabel(page, '4', 15000)
      const afterReload = await readCapsule(page)
      await page.click(`[data-row-key="session:${firstSession}"]`)
      await page.waitForFunction((id) => (document.querySelector('[data-conversation-session]')?.getAttribute('data-conversation-session') ?? '') === id, firstSession, { timeout: 15000 }).catch(() => {})
      const firstDrawn = await waitForCapsule(page, '1')
      const inFirst = await readCapsule(page)
      checks.push(check('刷新后颜色按保存的数量恢复，切换会话后换成该会话自己的数量',
        keptCount && afterReload.value === '3' && firstDrawn && inFirst.value === '1', JSON.stringify({ afterReload: afterReload.value, first: inFirst.value })))

      // Back to the session with four routes for the theme and width readings.
      await page.click(`[data-row-key="session:${secondSession}"]`)
      await page.waitForFunction((id) => (document.querySelector('[data-conversation-session]')?.getAttribute('data-conversation-session') ?? '') === id, secondSession, { timeout: 15000 }).catch(() => {})
      await waitForCapsule(page, '3')

      // Every built-in palette, the host palette, both light and dark, and a
      // custom accent: the top rung always resolves to the page's own accent.
      await openSkinSettings(page)
      await page.locator('.dsh-deepcraft-settings-tabs [role="tab"]').filter({ hasText: /^(外观|Appearance)$/ }).first().click()
      const paletteReadings = []
      const paletteIds = ['ocean', 'ember', 'forest', 'host']
      for (let i = 0; i < paletteIds.length; i++) {
        await page.locator('.dsh-deepcraft-palette-options button').nth(i).click()
        await page.waitForFunction((id) => document.body.getAttribute('data-dsh-deepcraft-palette') === id, paletteIds[i], { timeout: 15000 }).catch(() => {})
        const light = await readCapsuleEdge(page, '[data-dsh-deepcraft-model-capsule]')
        await page.evaluate(() => document.body.setAttribute('data-ds-dark-theme', ''))
        await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
        const dark = await readCapsuleEdge(page, '[data-dsh-deepcraft-model-capsule]')
        await page.evaluate(() => document.body.removeAttribute('data-ds-dark-theme'))
        paletteReadings.push({ palette: paletteIds[i], light, dark })
      }
      checks.push(check('四套配色在浅色和深色下都把最高档画成当前强调色',
        paletteReadings.every(({ light, dark }) => light.value === '3' && dark.value === '3' &&
          light.edge === light.expected && dark.edge === dark.expected &&
          light.palette !== null && dark.palette === light.palette),
        JSON.stringify(paletteReadings.map(({ palette, light, dark }) => ({ palette, light: [light.edge, light.expected], dark: [dark.edge, dark.expected] })))))

      await page.locator('.dsh-deepcraft-palette-options button').nth(0).click()
      await page.waitForFunction(() => document.body.getAttribute('data-dsh-deepcraft-palette') === 'ocean', undefined, { timeout: 15000 }).catch(() => {})
      await setAccentColor(page, '#1a7f5a')
      await page.waitForFunction(() => document.body.hasAttribute('data-dsh-deepcraft-accent'), undefined, { timeout: 15000 }).catch(() => {})
      const accentReading = await readCapsuleEdge(page, '[data-dsh-deepcraft-model-capsule]')
      checks.push(check('自定义强调色接管最高档外框', accentReading.accent && accentReading.value === '3' && accentReading.edge === accentReading.expected,
        JSON.stringify({ accent: accentReading.accent, edge: accentReading.edge, expected: accentReading.expected })))

      await page.keyboard.press('Escape')
      await page.locator('[role="dialog"]').first().waitFor({ state: 'detached', timeout: 10000 }).catch(() => {})

      // Two narrow widths: the capsule stays inside the window and keeps its seam.
      const narrowReadings = []
      for (const width of [390, 330]) {
        await page.setViewportSize({ width, height: 760 })
        await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
        await waitForCapsule(page, '3')
        narrowReadings.push({ width, ...await readCapsule(page) })
      }
      checks.push(check('390 与 330 像素宽时胶囊仍在窗口内且两半相接',
        narrowReadings.every((reading) => reading.value === '3' && reading.subagent !== null && reading.model !== null &&
          reading.subagent.left >= 0 && reading.model.right <= reading.width + 1 &&
          Math.abs(reading.subagent.right - reading.model.left) <= 1),
        JSON.stringify(narrowReadings.map(({ width, subagent, model }) => ({ width, subagent: subagent?.left, right: model?.right })))))

      return checks
    },
  }
}

module.exports = { subagentModelScenario }
