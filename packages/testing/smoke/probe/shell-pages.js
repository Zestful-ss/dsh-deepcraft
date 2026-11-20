/**
 * The palette case's page reads: the four palettes' canvases and accents.
 */
(function () {
  var probe = window.__dshSmokeProbe
  var sleep = probe.sleep
  var r = probe.report

  probe.step(async function () {
    await probe.onlyFor(['palette'], async function () {
      var canvasBox = document.createElement('div')
      document.body.appendChild(canvasBox)
      // The canvas token resolves on a probe element: the body's own fill
      // stands down while the shipped wallpaper attribute is up.
      var readTheme = function () {
        var body = getComputedStyle(document.body)
        var primaryBtn = document.querySelector('._primary_h_1')
        var sendBtn = document.querySelector('#send')
        canvasBox.style.backgroundColor = 'var(--dsh-deepcraft-canvas)'
        return {
          canvas: getComputedStyle(canvasBox).backgroundColor,
          accent: body.getPropertyValue('--dsw-alias-brand-primary').trim(),
          buttonFill: primaryBtn === null ? '' : getComputedStyle(primaryBtn).backgroundColor,
          buttonInk: primaryBtn === null ? '' : getComputedStyle(primaryBtn).color,
          infoFill: body.getPropertyValue('--dsw-alias-button-info-fill').trim(),
          sendOnColor: sendBtn === null ? '' : getComputedStyle(sendBtn).getPropertyValue('--dsw-alias-label-on-color').trim(),
          bodyOnColor: body.getPropertyValue('--dsw-alias-label-on-color').trim(),
          shikiKeyword: body.getPropertyValue('--shiki-token-keyword').trim(),
          inlineCode: body.getPropertyValue('--dsw-alias-markdown-inline-code').trim(),
          switchThumb: body.getPropertyValue('--dsw-alias-switch-thumb').trim(),
          platformBg: body.getPropertyValue('--dsw-alias-bg-module-platform').trim(),
          menuFill: body.getPropertyValue('--dsw-menu-surface-fill').trim(),
        }
      }
      r.palettes = {}
      for (var at = 0; at < ['cindy'].length; at++) {
        var id = ['cindy'][at]
        window.__pushForm({ palette: id, wallpaperSource: 'off' })
        await sleep(150)
        var light = readTheme()
        document.body.setAttribute('data-ds-dark-theme', '')
        var dark = readTheme()
        var raised = getComputedStyle(document.body).getPropertyValue('--dsh-deepcraft-raised').trim()
        document.body.removeAttribute('data-ds-dark-theme')
        r.palettes[id] = Object.assign(light, { dark: Object.assign(dark, { raised: raised }) })
      }
      canvasBox.remove()
      // The ambient light asks to be on for its reading: it ships off with the
      // cindy default, and this case proves the layer's own value resolves.
      window.__pushForm({ palette: 'cindy', materialAmbient: true })
      await sleep(150)
      // The material layer's defaults, then every aspect back to the host's
      // value on its own (D84). The column is a stand-in for the host's own
      // sidebar part, so the glass rule paints its ::before.
      var column = document.createElement('div')
      column.setAttribute('data-dsh-deepcraft-part', 'sidebar-column')
      document.body.appendChild(column)
      var activeSwitch = document.createElement('button')
      activeSwitch.setAttribute('role', 'switch')
      activeSwitch.setAttribute('aria-checked', 'true')
      document.body.appendChild(activeSwitch)
      r.material = {
        radius: getComputedStyle(document.body).getPropertyValue('--dsw-radius-md').trim(),
        cornerShape: getComputedStyle(document.body).getPropertyValue('--dsw-corner-shape').trim(),
        shadow: getComputedStyle(document.body).getPropertyValue('--dsw-shadow-lv1').trim(),
        fast: getComputedStyle(document.body).getPropertyValue('--ds-transition-duration-fast').trim(),
        glass: getComputedStyle(column, '::before').backdropFilter,
        ambient: getComputedStyle(document.body).backgroundImage,
        switchTrack: getComputedStyle(activeSwitch).backgroundColor,
      }
      document.body.setAttribute('data-ds-dark-theme', '')
      r.material.darkGlass = getComputedStyle(column).backgroundColor
      document.body.removeAttribute('data-ds-dark-theme')
      document.documentElement.style.setProperty('--dsw-elevation-stroke', '0 0 0 0.5px rgba(0, 0, 0, 0.1)')
      window.__pushForm({ materialShadow: 'flat' })
      await sleep(150)
      r.materialFlat = {
        shadow: getComputedStyle(document.body).getPropertyValue('--dsw-shadow-lv1').trim(),
        shadowLv2: getComputedStyle(document.body).getPropertyValue('--dsw-shadow-lv2').trim(),
        elevation: getComputedStyle(document.body).getPropertyValue('--dsw-elevation-panel').trim(),
      }
      document.documentElement.style.removeProperty('--dsw-elevation-stroke')
      window.__pushForm({ materialRadius: 'host', materialShadow: 'host', materialMotion: 'host', materialGlass: false, materialAmbient: false })
      await sleep(250)
      r.materialOff = {
        radius: getComputedStyle(document.body).getPropertyValue('--dsw-radius-md').trim(),
        cornerShape: getComputedStyle(document.body).getPropertyValue('--dsw-corner-shape').trim(),
        shadow: getComputedStyle(document.body).getPropertyValue('--dsw-shadow-lv1').trim(),
        shadowLv2: getComputedStyle(document.body).getPropertyValue('--dsw-shadow-lv2').trim(),
        glass: getComputedStyle(column, '::before').backdropFilter,
        ambient: getComputedStyle(document.body).backgroundImage,
      }
      column.remove()
      activeSwitch.remove()
      window.__pushForm({ materialRadius: 'reference', materialShadow: 'reference', materialMotion: 'reference', materialGlass: true, materialAmbient: true })
      await sleep(150)
    })
  })
})()
