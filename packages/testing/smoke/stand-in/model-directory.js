/**
 * The model directory the model-meter page reads: two provider groups, with the
 * model in force sitting in the group level 1 does not list — the case that
 * makes the picker append the seat's own row at the bottom of that level.
 *
 * The ids are the ones the rate catalog's alias table knows, so one row of each
 * kind is on the page: a model a profile claims, a model no profile claims, and
 * the seat's own row.
 *
 * The subagent-model page reads one directory too: the entry names its rows
 * from the catalog, and a route the catalog does not carry has to read as its
 * own id.
 */
(function () {
  var host = window.__dshSmokeHost
  if (host.CASE === 'subagent-model') {
    var subagentSnapshot = {
      status: 'ready',
      current: { provider: 'deepseek-official', model: 'deepseek-flash' },
      groups: [
        { id: 'deepseek-official', name: 'DeepSeek', models: [
          { id: 'deepseek-flash', name: 'DeepSeek-V4.1-Flash' },
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
  if (host.CASE !== 'model-meter') return

  var snapshot = {
    status: 'ready',
    current: { provider: 'zai', model: 'glm-5.3' },
    groups: [
      {
        id: 'deepseek-official',
        name: 'DeepSeek',
        models: [
          // Every model carries the catalog's own description: that is the
          // third source the picker's description line draws from (the copy
          // document is not served to this page), and it is what makes the
          // switch's effect readable on these rows.
          { id: 'deepseek-flash', name: 'V4.1 Flash', description: 'The small, quick one.' },
          // No profile claims this one, so its row carries no meter.
          { id: 'kimi-k3', name: 'Kimi K3', description: 'The long-context one.' },
        ],
      },
      { id: 'zai', name: 'Z.ai', models: [{ id: 'glm-5.3', name: 'GLM-5.3', description: 'The flagship one.' }] },
    ],
  }
  var directory = {
    load: function () { return Promise.resolve() },
    select: function () { return Promise.resolve() },
    store: {
      getSnapshot: function () { return snapshot },
      subscribe: function () { return function () {} },
    },
  }
  host.modelDirectories = {
    directoryFor: function (id) { return id === 'smoke-session' ? directory : undefined },
  }
  host.sessions = {
    list: {
      getSnapshot: function () { return { current: 'smoke-session', phase: 'ready', ids: [], byId: {}, projectionsBySession: {} } },
    },
    binding: function () { return undefined },
  }
})()
