/**
 * The host faces the preview adds to the smoke stand-in: the real React the
 * bundle is handed, the host's ui-primitives as inert stand-ins, the module
 * loader the bundle registers with, and the settings form made durable in
 * localStorage so a choice survives a reload.
 *
 * The stand-in parts before this file stop at the host's faces; the fake React
 * (stand-in/react.js) is the one part left out, because the settings page is
 * rendered here as real React rather than read as a plain tree.
 */
(function () {
  var host = window.__dshSmokeHost
  var React = window.React
  var h = React.createElement

  var PREFS_KEY = 'dsh-deepcraft-preview-prefs'
  var stored = null
  try { stored = JSON.parse(window.localStorage.getItem(PREFS_KEY) || 'null') } catch (error) { /* private mode */ }
  if (stored !== null && typeof stored === 'object') Object.assign(host.formValue, stored)

  var formListeners = host.formListeners
  var extraListeners = []
  function persist() {
    try { window.localStorage.setItem(PREFS_KEY, JSON.stringify(host.formValue)) } catch (error) { /* private mode */ }
  }
  function notify() {
    for (var i = 0; i < formListeners.length; i += 1) formListeners[i]()
    for (var j = 0; j < extraListeners.length; j += 1) extraListeners[j]()
  }
  // The stand-in answers the pet-install route with a 200 and no `pet` on a
  // page that carries no pet packages, which the skin's own `ensurePet` reads
  // as an installation and adopts as `undefined`. A refusal is what the host
  // sends for a package it does not know, and what the mascot falls back from.
  var pageFetch = window.fetch
  window.fetch = function (input) {
    var url = typeof input === 'string' ? input : (input && input.url) || ''
    if (url === '/dsh-deepcraft/pets/ensure') {
      return Promise.resolve(new Response(JSON.stringify({ ok: false, error: 'the preview carries no pet packages' }), {
        status: 404,
        headers: { 'content-type': 'application/json' },
      }))
    }
    return pageFetch.apply(window, arguments)
  }

  // The shell's language: the preview reads Chinese, so the skin's copy files
  // answer with their `zh` lines and the host strings the skin reads are
  // translated here. The stand-in's locale service exists only for a few smoke
  // cases; this one is always present and always Chinese.
  var hostText = {
    'chat.deepDiving': '深度思考中',
    'duration.compactSeconds': '{seconds} 秒',
    'duration.compactMinutes': '{minutes} 分 {seconds} 秒',
    'duration.secondUnit': '秒',
    'duration.minuteUnit': '分 ',
    'duration.hourUnit': '小时 ',
  }
  var permissionText = {
    'preset.readOnly': '仅可查看',
    'preset.workspaceWrite': '工作区内修改',
    'preset.fullAccess': '完全权限',
    'auto.label': '自动审查',
  }
  var localeService = {
    getSnapshot: function () { return { active: 'zh' } },
    subscribe: function () { return function () {} },
    bind: function (namespace) {
      var table = namespace === 'permission.access' ? permissionText : namespace === 'chat' ? hostText : {}
      return function (key, params) {
        var text = table[key] === undefined ? key : table[key]
        if (params === undefined) return text
        return text.replace(/\{(\w+)\}/g, function (match, name) { return String(params[name]) })
      }
    },
  }
  var baseGet = window.__ctx.get
  window.__ctx.get = function (name) {
    return name === 'locale' ? localeService : baseGet.call(window.__ctx, name)
  }

  // The form controller the settings binding writes through: every field is
  // stored and announced, which is what the host does after its own write.
  host.form.set = function (name, value) {
    host.formValue[name] = value
    persist()
    notify()
    return Promise.resolve(true)
  }
  window.__previewWrite = function (patch) {
    Object.assign(host.formValue, patch)
    persist()
    notify()
  }
  window.__previewPrefs = function () {
    return Object.assign({}, host.formValue)
  }
  window.__previewSubscribe = function (listener) {
    extraListeners.push(listener)
  }

  /** One inert primitive: the skin's own rows are what this page is for. */
  function primitive(type) {
    return function (props) {
      if (type === 'Modal' && props && props.open === false) return null
      return h('span', { className: props && props.className, 'data-preview-primitive': type }, props && props.children)
    }
  }
  var primitives = {
    Tag: primitive('Tag'),
    Toast: primitive('Toast'),
    Modal: primitive('Modal'),
    Tooltip: primitive('Tooltip'),
    DisclosureRow: primitive('DisclosureRow'),
    TextShimmer: function (props) { return h('span', { 'data-shimmer': '' }, props && props.children) },
    DiffBlock: primitive('DiffBlock'),
    ReadBlock: primitive('ReadBlock'),
    StateDot: primitive('StateDot'),
    IconBrowseOutlineRegular: primitive('IconBrowseOutlineRegular'),
    IconEditOutlineRegular: primitive('IconEditOutlineRegular'),
    IconEllipsisOutlineRegular: primitive('IconEllipsisOutlineRegular'),
    IconInspectOutlineRegular: primitive('IconInspectOutlineRegular'),
    IconPanelLeftOutlineRegular: primitive('IconPanelLeftOutlineRegular'),
    IconTrashOutlineRegular: primitive('IconTrashOutlineRegular'),
    IconUnarchiveOutlineRegular: primitive('IconUnarchiveOutlineRegular'),
    IconWarningOutlineRegular: primitive('IconWarningOutlineRegular'),
    // The file rows print the two line counts; this page shows no diff, so the
    // counts stand at zero and the row keeps its shape.
    diffTotals: function () { return { added: 0, removed: 0 } },
  }
  var primitivesNamespace = new Proxy(primitives, {
    get: function (target, name) {
      if (typeof name !== 'string' || name in target) return target[name]
      var made = primitive(name)
      target[name] = made
      return made
    },
  })

  // The host's module loader: the bundle registers its factory and this page
  // hands it the three packages the build left external.
  window.__ModuleLoader__ = {
    load: function (definition) {
      window.__skin = definition.factory(function (name) {
        if (name === 'react') return React
        if (name === 'react-dom/client') return window.ReactDOM
        if (name === '@deepseek-ai/dsh-client-ui-primitives') return primitivesNamespace
        throw new Error('preview: the bundle asked for an unknown module "' + name + '"')
      })
    },
  }

  window.__previewTheme = {
    read: function () {
      try { return window.localStorage.getItem('dsh-deepcraft-preview-theme') === 'light' ? 'light' : 'dark' } catch (error) { return 'dark' }
    },
    write: function (theme) {
      try { window.localStorage.setItem('dsh-deepcraft-preview-theme', theme) } catch (error) { /* private mode */ }
      document.body.toggleAttribute('data-ds-dark-theme', theme === 'dark')
    },
  }
})()
