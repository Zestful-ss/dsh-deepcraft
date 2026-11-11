/**
 * The session list and binding each case's page carries: the mascot's own
 * session, the turn navigator's, the statistics case's key-addressed faces, the
 * turn fixture's bound session, and the list that throws for the sync-fault
 * case.
 */
(function () {
  var host = window.__dshSmokeHost
  var CASE = host.CASE
  var deepy = host.deepy
  var turnNav = host.turnNav
  var statsCase = host.statsCase
  var statsFixtureCase = host.statsFixtureCase
  var waitFixtureCase = host.waitFixtureCase

  var sessions = deepy !== undefined ? deepy.sessions : turnNav !== undefined ? turnNav.sessions : statsFixtureCase ? statsCase.sessions : waitFixtureCase ? host.emptySessions(function (id) { return id === 'smoke-session' ? {} : undefined }) : CASE === 'sync-fault'
    ? { list: { getSnapshot: function () { throw new Error('session list unavailable') } }, binding: function () { return null } }
    : undefined
  host.sessions = sessions
})()
