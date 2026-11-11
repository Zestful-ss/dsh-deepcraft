/**
 * The session list and binding each case's page carries: the mascot's own
 * session, and the list that throws for the sync-fault case.
 */
(function () {
  var host = window.__dshSmokeHost
  var CASE = host.CASE
  var deepy = host.deepy

  var sessions = deepy !== undefined
    ? deepy.sessions
    : CASE === 'sync-fault'
      ? { list: { getSnapshot: function () { throw new Error('session list unavailable') } }, binding: function () { return null } }
      : undefined
  host.sessions = sessions
})()
