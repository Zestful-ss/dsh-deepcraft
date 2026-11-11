/**
 * The subagent-model page's model directory: the entry names its rows from the
 * catalog, and a route the catalog does not carry has to read as its own id.
 */
(function () {
  var host = window.__dshSmokeHost
  if (host.CASE === 'subagent-model') {
    var subagentSnapshot = {
      status: 'ready',
      current: { provider: 'deepseek-official', model: 'deepseek-flash' },
      groups: [
        { id: 'deepseek-official', name: 'DeepSeek', models: [
          { id: 'deepseek-flash', name: 'DeepSeek-V4.1-Flash', reasoning: { defaultEffort: 'low', efforts: [{ id: 'low', name: 'Low' }, { id: 'high', name: 'High' }] } },
          { id: 'deepseek-v4-pro', name: 'DeepSeek-V4-Pro' },
        ] },
      ],
    }
    var subagentDirectory = {
      load: function () { return Promise.resolve() },
      select: function () { return Promise.resolve() },
      store: {
        getSnapshot: function () { return subagentSnapshot },
        subscribe: function () { return function () {} },
      },
    }
    host.modelDirectories = {
      directoryFor: function (id) { return id === 'smoke-session' ? subagentDirectory : undefined },
    }
    host.sessions = {
      list: {
        getSnapshot: function () { return { current: 'smoke-session', phase: 'ready', ids: ['smoke-session'], byId: {}, projectionsBySession: {} } },
      },
      get: function (id) { return id === 'smoke-session' ? { header: { id: 'smoke-session' } } : undefined },
      binding: function () { return undefined },
    }
    return
  }
})()
