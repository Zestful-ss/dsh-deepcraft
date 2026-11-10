/**
 * The preview page's own behaviour: apply the built skin to the stand-in host,
 * mount the settings page the skin registers, switch the scenes, and reload when
 * `npm run dev` writes a new bundle.
 *
 * The settings page is the skin's own React component from the slot registry
 * (packages/client/src/features/settings/settings.ts); it arrives with its
 * deferred chunk, so the mount waits for the registry entry rather than for a
 * fixed time.
 */
(function () {
  var React = window.React
  var ReactDOM = window.ReactDOM
  var body = document.body

  // The theme first: the settings page measures its own paint when it mounts.
  var theme = window.__previewTheme.read()
  window.__previewTheme.write(theme)

  var applyError = null
  try {
    window.__skin.apply(window.__ctx)
  } catch (error) {
    applyError = String((error && error.stack) || error)
  }

  /* ---------- scenes ---------- */

  var scenes = Array.prototype.slice.call(document.querySelectorAll('[data-scene]'))
  var sceneButtons = Array.prototype.slice.call(document.querySelectorAll('[data-scene-target]'))

  function showScene(name, writeHash) {
    if (name !== 'settings') name = 'chat'
    for (var i = 0; i < scenes.length; i += 1) scenes[i].hidden = scenes[i].getAttribute('data-scene') !== name
    for (var j = 0; j < sceneButtons.length; j += 1) {
      var on = sceneButtons[j].getAttribute('data-scene-target') === name
      sceneButtons[j].setAttribute('aria-selected', on ? 'true' : 'false')
    }
    if (writeHash) history.replaceState(null, '', name === 'chat' ? location.pathname : '#' + name)
    if (name === 'settings') mountSettings()
  }

  for (var b = 0; b < sceneButtons.length; b += 1) {
    sceneButtons[b].addEventListener('click', function () {
      showScene(this.getAttribute('data-scene-target'), true)
    })
  }

  /* ---------- the settings page ---------- */

  var mount = document.getElementById('preview-settings-mount')
  var mounted = false
  var mountWaited = 0

  function mountSettings() {
    if (mounted || mount === null) return
    var components = window.__slotComponents || {}
    var Section = components.deepcraft
    if (typeof Section !== 'function') return
    mounted = true
    ReactDOM.createRoot(mount).render(React.createElement(Section))
  }

  // The chunk lands after apply; the poll stops once the section is on the page
  // or after the wait the page needs to say it never arrived.
  var mountPoll = setInterval(function () {
    mountSettings()
    mountWaited += 200
    if (mounted || mountWaited >= 10000) {
      clearInterval(mountPoll)
      if (!mounted) {
        mount.textContent = '设置页没有到达，请查看下方诊断。'
        mount.setAttribute('data-preview-failed', '')
      }
    }
  }, 200)
  if (location.hash === '#settings') showScene('settings', false)
  else showScene('chat', false)

  /* ---------- palette and theme ---------- */

  var palette = document.getElementById('preview-palette')
  var themeButton = document.getElementById('preview-theme')
  var paletteNames = ['ocean', 'ember', 'forest', 'host']

  /** The palette the document carries, once the skin has mirrored the prefs. */
  function currentPalette() {
    var mirrored = body.getAttribute('data-dsh-deepcraft-palette')
    if (mirrored !== null) return mirrored
    var stored = window.__previewPrefs().palette
    return typeof stored === 'string' ? stored : 'ocean'
  }

  function syncPalette() {
    if (palette === null) return
    var value = currentPalette()
    if (paletteNames.indexOf(value) !== -1) palette.value = value
  }

  if (palette !== null) {
    palette.addEventListener('change', function () {
      window.__previewWrite({ palette: palette.value })
      syncPalette()
    })
  }
  if (themeButton !== null) {
    var paintTheme = function () {
      themeButton.textContent = theme === 'dark' ? '浅色模式' : '深色模式'
      themeButton.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false')
    }
    paintTheme()
    themeButton.addEventListener('click', function () {
      theme = theme === 'dark' ? 'light' : 'dark'
      window.__previewTheme.write(theme)
      paintTheme()
    })
  }
  var reload = document.getElementById('preview-reload')
  if (reload !== null) reload.addEventListener('click', function () { location.reload() })
  window.__previewSubscribe(syncPalette)
  syncPalette()

  /* ---------- the build and the diagnostics ---------- */

  var buildNode = document.getElementById('preview-build')
  var errorsNode = document.getElementById('preview-errors')
  var diagnostics = document.getElementById('preview-diagnostics-list')

  function paintBuild() {
    var id = body.getAttribute('data-dsh-deepcraft')
    if (buildNode !== null) buildNode.textContent = id === null ? '页面上没有皮肤' : '构建 ' + id.slice(0, 8)
  }

  function paintErrors() {
    var errors = (window.__uncaught || []).concat(window.__errors || [])
    if (applyError !== null) errors.unshift(applyError)
    if (errorsNode !== null) {
      errorsNode.textContent = errors.length === 0 ? '无报错' : errors.length + ' 个错误'
      errorsNode.toggleAttribute('data-preview-bad', errors.length !== 0)
    }
    if (diagnostics !== null) {
      diagnostics.textContent = ''
      for (var i = 0; i < errors.length; i += 1) {
        var item = document.createElement('li')
        item.textContent = errors[i]
        diagnostics.appendChild(item)
      }
    }
  }

  function paint() {
    paintBuild()
    paintErrors()
  }
  paint()
  setInterval(paint, 1000)

  var stamp = null
  function pollBuild() {
    fetch('/api/preview/build', { cache: 'no-store' })
      .then(function (response) { return response.json() })
      .then(function (answer) {
        if (stamp !== null && answer.client !== stamp) location.reload()
        stamp = answer.client
      })
      .catch(function () { /* the server went away: the page stays as it is */ })
  }
  pollBuild()
  setInterval(pollBuild, 900)
})()
