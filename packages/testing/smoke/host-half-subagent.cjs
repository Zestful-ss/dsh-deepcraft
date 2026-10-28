/**
 * The subagent model rule's host checks: the pure decisions, the ancestry walk
 * that finds a session's pick, and one registration on a context that records
 * the guard and the prompt section (D73).
 */
'use strict'
const path = require('path')
const { pathToFileURL } = require('url')
const { ROOT, check } = require('./shared.cjs')

/** The store a rule reads: fixed records by session id, so the walk itself is what is under test. */
function stubStore(records, unavailable) {
  return {
    read(sessionId) {
      if (unavailable !== undefined) return { kind: 'unavailable', detail: unavailable }
      const routes = records[sessionId]
      return routes === undefined ? { kind: 'none' } : { kind: 'routes', routes }
    },
    async write() {},
    warm() {},
    dispose() {},
  }
}

async function subagentChoiceChecks() {
  const choice = await import(pathToFileURL(path.join(ROOT, 'lib', 'host', 'subagent-choice.js')).href)
  const routes = [
    { provider: 'magpie-responses', model: 'codex/gpt-6.1-terra' },
    { provider: 'magpie-responses', model: 'grok-4.7' },
  ]
  const denied = 'This session requires provider and model on subagent. Allowed routes: magpie-responses/codex/gpt-6.1-terra, magpie-responses/grok-4.7. The same route as the parent is allowed. Call list_subagent_models, then retry with both fields. Do not omit them.'
  const call = (over) => choice.subagentChoiceDenial({ enabled: true, toolName: 'subagent', provider: undefined, model: undefined, routes, selection: { kind: 'none' }, ...over })

  check('the subagent rule leaves the call alone while the preference is off and nothing is picked', call({ enabled: false }) === undefined)
  check('the subagent rule leaves subagent_fork alone', call({ toolName: 'subagent_fork' }) === undefined)
  check('the subagent rule leaves a session with no policy alone', call({ routes: undefined }) === undefined)
  check('an omitted model pair is denied with both allowed routes in policy order', call({}) === denied, String(call({})))
  check('an explicit pair passes even when it is the first allowed route', call({ provider: routes[0].provider, model: routes[0].model }) === undefined)
  check('an explicit pair outside the list passes to the official tool', call({ provider: 'other', model: 'not-listed' }) === undefined)
  check('a half-written pair is denied', call({ provider: routes[0].provider, model: '   ' }) === denied && call({ provider: routes[0].provider }) === denied)

  // --- one session's picks -------------------------------------------------
  const picked = { kind: 'routes', routes: [routes[1]] }
  const askedAgain = call({ enabled: false, selection: picked })
  check('a pick applies while the preference is off, and asks for that one route',
    typeof askedAgain === 'string' && askedAgain.includes('magpie-responses/grok-4.7') && !askedAgain.includes('codex/gpt-6.1-terra'),
    String(askedAgain))
  check('the parent\'s own route passes when the pick lists it',
    call({ enabled: false, selection: picked, provider: routes[1].provider, model: routes[1].model }) === undefined)
  const outsidePick = call({ enabled: false, selection: picked, provider: routes[0].provider, model: routes[0].model })
  check('a route inside the policy but outside the pick is denied, naming the pick',
    typeof outsidePick === 'string' && outsidePick.includes('not one of them') && outsidePick.includes('magpie-responses/grok-4.7'),
    String(outsidePick))
  const twoPicks = { kind: 'routes', routes }
  check('with two picks either route passes',
    call({ enabled: false, selection: twoPicks, provider: routes[0].provider, model: routes[0].model }) === undefined &&
      call({ enabled: false, selection: twoPicks, provider: routes[1].provider, model: routes[1].model }) === undefined)
  check('a half-written pair is denied while a pick stands', call({ enabled: false, selection: twoPicks, provider: routes[0].provider }) !== undefined)
  const stale = call({ selection: { kind: 'routes', routes: [{ provider: 'gone', model: 'old' }] }, provider: 'gone', model: 'old' })
  check('a pick the policy no longer allows is reported, not silently dropped',
    typeof stale === 'string' && stale.includes('gone/old') && stale.includes('no longer allows'), String(stale))
  const unreadable = call({ selection: { kind: 'unavailable', detail: 'the selection store is still opening' } })
  check('a pick the rule cannot read is reported rather than treated as none',
    typeof unreadable === 'string' && unreadable.includes('still opening') && unreadable.includes('do not omit'), String(unreadable))

  // --- the prompt sentence -------------------------------------------------
  check('the prompt stays empty while the rule is off or the session has no policy',
    choice.subagentChoicePrompt(false, routes, { kind: 'none' }) === '' && choice.subagentChoicePrompt(true, undefined, { kind: 'none' }) === '')
  const prompt = choice.subagentChoicePrompt(true, routes, { kind: 'none' })
  check('the prompt names both routes and the tool that describes them',
    prompt.includes('magpie-responses/codex/gpt-6.1-terra, magpie-responses/grok-4.7') &&
      prompt.includes('list_subagent_models') && prompt.includes('List order is not a default.'), prompt)
  const onePick = choice.subagentChoicePrompt(false, routes, { kind: 'routes', routes: [routes[0]] })
  check('with one pick the prompt states that route and requires it',
    onePick.includes('magpie-responses/codex/gpt-6.1-terra') && onePick.includes('the only route') && !onePick.includes('grok-4.7'),
    onePick)
  const manyPicks = choice.subagentChoicePrompt(false, routes, { kind: 'routes', routes })
  check('with several picks the prompt asks for a choice for the task and denies the order meaning anything',
    manyPicks.includes('task at hand') && manyPicks.includes('List order is not a default.'), manyPicks)
  check('a pick the policy no longer allows, and one that cannot be read, state nothing in the prompt',
    choice.subagentChoicePrompt(false, routes, { kind: 'routes', routes: [{ provider: 'gone', model: 'old' }] }) === '' &&
      choice.subagentChoicePrompt(false, routes, { kind: 'unavailable', detail: 'x' }) === '')

  // --- the ancestry walk ---------------------------------------------------
  const parent = { header: { id: 'parent' } }
  const child = { header: { id: 'child', parentSession: 'parent', origin: 'subagent' } }
  const grandchild = { header: { id: 'grandchild', parentSession: 'child', origin: 'subagent' } }
  const registry = new Map([['parent', parent], ['child', child], ['grandchild', grandchild]])
  const walkCtx = { get: (name) => (name === 'sessions' ? { get: (id) => registry.get(id), list: () => [...registry.values()] } : undefined) }
  check('the walk finds the session\'s own pick first',
    JSON.stringify(choice.resolveSubagentSelection(walkCtx, stubStore({ child: [routes[0]] }), child)) === JSON.stringify({ kind: 'routes', routes: [routes[0]] }))
  check('a child with no pick of its own follows the nearest ancestor that made one',
    JSON.stringify(choice.resolveSubagentSelection(walkCtx, stubStore({ parent: [routes[1]] }), grandchild)) === JSON.stringify({ kind: 'routes', routes: [routes[1]] }))
  check('a chain with no pick anywhere answers none',
    JSON.stringify(choice.resolveSubagentSelection(walkCtx, stubStore({}), grandchild)) === JSON.stringify({ kind: 'none' }))
  check('a store that cannot answer stops the walk and is reported',
    JSON.stringify(choice.resolveSubagentSelection(walkCtx, stubStore({}, 'the selection store is still opening'), child)) ===
      JSON.stringify({ kind: 'unavailable', detail: 'the selection store is still opening' }))
  const noStorage = { read: () => ({ kind: 'unavailable', detail: 'the host provides no storage domain service', permanent: true }) }
  check('a host with no storage at all reads as nothing picked, so delegations still run',
    JSON.stringify(choice.resolveSubagentSelection(walkCtx, noStorage, child)) === JSON.stringify({ kind: 'none' }))
  const brokenStore = { read: () => ({ kind: 'unavailable', detail: 'disk is full', permanent: false }) }
  check('a store that exists but cannot answer stops the walk instead of reading as nothing picked',
    JSON.stringify(choice.resolveSubagentSelection(walkCtx, brokenStore, child)) === JSON.stringify({ kind: 'unavailable', detail: 'disk is full' }))
  check('a session object carrying no header answers none rather than walking',
    JSON.stringify(choice.resolveSubagentSelection(walkCtx, stubStore({ parent: [routes[0]] }), {})) === JSON.stringify({ kind: 'none' }))

  // --- the registration ----------------------------------------------------
  const guardBox = {}
  const sectionBox = {}
  let policy = null
  const flag = { value: false }
  let livePick = []
  const store = stubStore({}, undefined)
  store.read = (sessionId) => (sessionId === 'parent' && livePick.length > 0 ? { kind: 'routes', routes: livePick } : { kind: 'none' })
  const ctx = {
    get(name) {
      if (name === 'tools') return { guard(fn) { guardBox.fn = fn; return () => { guardBox.stopped = true } } }
      if (name === 'systemPrompt') return { section(spec) { sectionBox.spec = spec; return () => { sectionBox.stopped = true } } }
      if (name === 'sessionProjections') return { stateOf: (_session, key) => (key === 'subagentModelSelectionPolicy' ? policy : undefined) }
      if (name === 'sessions') return { get: () => parent, list: () => [parent] }
      return undefined
    },
    effect(run) { run() },
  }
  choice.registerSubagentChoice(ctx, { subagentModelChoice: { get: () => flag.value } }, store)
  const exec = (over) => ({ name: 'subagent', arguments: {}, agent: { session: parent }, ...over })
  check('the rule registers a guard and a prompt section',
    typeof guardBox.fn === 'function' && sectionBox.spec?.name === 'deepcraft:subagent-model-choice' && sectionBox.spec?.order === 2810,
    JSON.stringify({ guard: typeof guardBox.fn, section: sectionBox.spec }))
  check('the guard passes while the preference is off', guardBox.fn(exec()) === undefined, String(guardBox.fn(exec())))
  flag.value = true
  policy = routes
  check('the guard denies an omitted pair once the preference and the policy are live', guardBox.fn(exec()) === denied, String(guardBox.fn(exec())))
  check('the guard passes an explicit route', guardBox.fn(exec({ arguments: { provider: routes[0].provider, model: routes[0].model } })) === undefined)
  check('the prompt section follows the live preference and policy', sectionBox.spec.text({ agent: { session: parent } }) === prompt)
  livePick = [routes[1]]
  flag.value = false
  const guardPick = guardBox.fn(exec({ arguments: { provider: routes[0].provider, model: routes[0].model } }))
  check('the live guard follows the session\'s pick with the preference off',
    typeof guardPick === 'string' && guardPick.includes('not one of them'), String(guardPick))
  check('the live prompt section states the pick', sectionBox.spec.text({ agent: { session: parent } }).includes('the only route'))
  check('a null policy and a malformed route leave the rule out',
    choice.readSubagentRoutes({ stateOf: () => null }, {}) === undefined &&
      choice.readSubagentRoutes({ stateOf: () => [{ provider: '', model: 'x' }] }, {}) === undefined)
}

module.exports = { subagentChoiceChecks }
