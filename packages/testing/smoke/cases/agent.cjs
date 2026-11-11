'use strict'
const { MARKUP, same, check, commonChecks } = require('./_shared.cjs')
const { deferredWanted, SHIPPED_PREFS } = require('../shared.cjs')

module.exports = {
  markup(r) {
    check('apply() completes', r.applyError === null, r.applyError)
    check('no injected markup executed', r.pwned === 0, `${r.pwned} executions`)
    check('the plugin\'s own footer entry keeps its label and badge and stays visible, the skin neither cloning nor rewriting it',
      r.footerPluginAction !== null && r.footerPluginAction.label === MARKUP && r.footerPluginAction.badge === MARKUP &&
      r.footerPluginAction.display !== 'none' && r.footerPluginAction.visible === true,
      JSON.stringify(r.footerPluginAction))
    commonChecks(r)
  },
  'chunk-fault'(r) {
    const switchedOff = r.errors.map((line) => (/"([A-Za-z]+)" failed and was switched off/.exec(line) || [])[1]).sort()
    check('apply() completes although no feature chunk loads', r.applyError === null, r.applyError)
    // The page sits on the shipped preferences, so every deferred feature the
    // shipped values want asks for its chunk here.
    check('each deferred feature the page wants was switched off once, and nothing else',
      same(switchedOff, [...deferredWanted(SHIPPED_PREFS)].sort()), r.errors.join(' | '))
    check('each report names the chunk that did not load', r.errors.every((line) => line.includes('/dsh-deepcraft/assets/') && line.includes('failed to load')), r.errors.join(' | '))
    check('the features in the bundle keep running', r.skinApplied === true, JSON.stringify(r.skinApplied))
    commonChecks(r)
  },
  'chunk-late'(r) {
    check('apply() completes', r.applyError === null, r.applyError)
    check('a chunk arriving after its generation ended installs nothing', same(r.lateSlots, []) && r.lateNodes === 0,
      JSON.stringify({ slots: r.lateSlots, nodes: r.lateNodes }))
    check('no feature reported a failure', r.errors.length === 0, r.errors.join(' | '))
    check('nothing the skin runs leaves an uncaught error or an unhandled rejection',
      Array.isArray(r.uncaught) && r.uncaught.length === 0, (r.uncaught || []).join(' | ').slice(0, 600))
  },
  'sync-fault'(r) {
    check('apply() completes', r.applyError === null, r.applyError)
    check('the skin still stands with the session list unavailable', r.skinApplied === true, JSON.stringify(r.skinApplied))
    commonChecks(r)
  },
}
