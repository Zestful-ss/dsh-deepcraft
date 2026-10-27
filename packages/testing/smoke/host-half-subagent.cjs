/**
 * The subagent model rule's host checks: the pure decision, then one
 * registration on a context that records the guard and the prompt section
 * (D73).
 */
'use strict'
const path = require('path')
const { pathToFileURL } = require('url')
const { ROOT, check } = require('./shared.cjs')

async function subagentChoiceChecks() {
  const choice = await import(pathToFileURL(path.join(ROOT, 'lib', 'host', 'subagent-choice.js')).href)
  const routes = [
    { provider: 'magpie-responses', model: 'codex/gpt-6.1-terra' },
    { provider: 'magpie-responses', model: 'grok-4.7' },
  ]
  const denied = 'This session requires provider and model on subagent. Allowed routes: magpie-responses/codex/gpt-6.1-terra, magpie-responses/grok-4.7. The same route as the parent is allowed. Call list_subagent_models, then retry with both fields. Do not omit them.'
  const call = (over) => choice.subagentChoiceDenial({ enabled: true, toolName: 'subagent', provider: undefined, model: undefined, routes, ...over })

  check('the subagent rule leaves the call alone while the preference is off', call({ enabled: false }) === undefined)
  check('the subagent rule leaves subagent_fork alone', call({ toolName: 'subagent_fork' }) === undefined)
  check('the subagent rule leaves a session with no policy alone', call({ routes: undefined }) === undefined)
  check('an omitted model pair is denied with both allowed routes in policy order', call({}) === denied, String(call({})))
  check('an explicit pair passes even when it is the first allowed route', call({ provider: routes[0].provider, model: routes[0].model }) === undefined)
  check('an explicit pair outside the list passes to the official tool', call({ provider: 'other', model: 'not-listed' }) === undefined)
  check('a half-written pair is denied', call({ provider: routes[0].provider, model: '   ' }) === denied && call({ provider: routes[0].provider }) === denied)
  check('the prompt stays empty while the rule is off or the session has no policy',
    choice.subagentChoicePrompt(false, routes) === '' && choice.subagentChoicePrompt(true, undefined) === '')
  const prompt = choice.subagentChoicePrompt(true, routes)
  check('the prompt names both routes and the tool that describes them',
    prompt.includes('magpie-responses/codex/gpt-6.1-terra, magpie-responses/grok-4.7') &&
      prompt.includes('list_subagent_models') && prompt.includes('List order is not a default.'), prompt)

  const guardBox = {}
  const sectionBox = {}
  let policy = null
  const flag = { value: false }
  const ctx = {
    get(name) {
      if (name === 'tools') return { guard(fn) { guardBox.fn = fn; return () => { guardBox.stopped = true } } }
      if (name === 'systemPrompt') return { section(spec) { sectionBox.spec = spec; return () => { sectionBox.stopped = true } } }
      if (name === 'sessionProjections') return { stateOf: (_session, key) => (key === 'subagentModelSelectionPolicy' ? policy : undefined) }
      return undefined
    },
    effect(run) { run() },
  }
  choice.registerSubagentChoice(ctx, { subagentModelChoice: { get: () => flag.value } })
  const exec = (over) => ({ name: 'subagent', arguments: {}, agent: { session: {} }, ...over })
  check('the rule registers a guard and a prompt section',
    typeof guardBox.fn === 'function' && sectionBox.spec?.name === 'deepcraft:subagent-model-choice' && sectionBox.spec?.order === 2810,
    JSON.stringify({ guard: typeof guardBox.fn, section: sectionBox.spec }))
  check('the guard passes while the preference is off', guardBox.fn(exec()) === undefined, String(guardBox.fn(exec())))
  flag.value = true
  policy = routes
  check('the guard denies an omitted pair once the preference and the policy are live', guardBox.fn(exec()) === denied, String(guardBox.fn(exec())))
  check('the guard passes an explicit route', guardBox.fn(exec({ arguments: { provider: routes[0].provider, model: routes[0].model } })) === undefined)
  check('the prompt section follows the live preference and policy', sectionBox.spec.text({ agent: { session: {} } }) === prompt)
  check('a null policy and a malformed route leave the rule out',
    choice.readSubagentRoutes({ stateOf: () => null }, {}) === undefined &&
      choice.readSubagentRoutes({ stateOf: () => [{ provider: '', model: 'x' }] }, {}) === undefined)
}

module.exports = { subagentChoiceChecks }
