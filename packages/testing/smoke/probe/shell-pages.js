/**
 * The palette case's page reads: the four palettes' canvases and accents.
 */
(function () {
  var probe = window.__dshSmokeProbe
  var sleep = probe.sleep
  var r = probe.report

  probe.step(async function () {
    await probe.onlyFor(['palette'], async function () {
      var readTheme = function () {
        var body = getComputedStyle(document.body)
        var primaryBtn = document.querySelector('._primary_h_1')
        return {
          canvas: body.backgroundColor,
          accent: body.getPropertyValue('--dsw-alias-brand-primary').trim(),
          buttonFill: primaryBtn === null ? '' : getComputedStyle(primaryBtn).backgroundColor,
          buttonInk: primaryBtn === null ? '' : getComputedStyle(primaryBtn).color,
        }
      }
      r.palettes = {}
      for (var at = 0; at < ['ocean', 'ember', 'forest'].length; at++) {
        var id = ['ocean', 'ember', 'forest'][at]
        window.__pushForm({ palette: id })
        await sleep(150)
        var light = readTheme()
        document.body.setAttribute('data-ds-dark-theme', '')
        var dark = readTheme()
        var raised = getComputedStyle(document.body).getPropertyValue('--dsh-deepcraft-raised').trim()
        document.body.removeAttribute('data-ds-dark-theme')
        r.palettes[id] = Object.assign(light, { dark: Object.assign(dark, { raised: raised }) })
      }
      window.__pushForm({ palette: 'ocean' })
      await sleep(150)
      // The material layer's defaults, then every aspect back to the host's
      // value on its own (D84). The column is a stand-in for the host's own
      // sidebar part, so the glass rule paints its ::before.
      var column = document.createElement('div')
      column.setAttribute('data-dsh-deepcraft-part', 'sidebar-column')
      document.body.appendChild(column)
      r.material = {
        radius: getComputedStyle(document.body).getPropertyValue('--dsw-radius-md').trim(),
        shadow: getComputedStyle(document.body).getPropertyValue('--dsw-shadow-lv1').trim(),
        fast: getComputedStyle(document.body).getPropertyValue('--ds-transition-duration-fast').trim(),
        glass: getComputedStyle(column, '::before').backdropFilter,
        ambient: getComputedStyle(document.body).backgroundImage,
      }
      window.__pushForm({ materialRadius: 'host', materialShadow: 'host', materialMotion: 'host', materialGlass: false, materialAmbient: false })
      await sleep(250)
      r.materialOff = {
        radius: getComputedStyle(document.body).getPropertyValue('--dsw-radius-md').trim(),
        shadow: getComputedStyle(document.body).getPropertyValue('--dsw-shadow-lv1').trim(),
        glass: getComputedStyle(column, '::before').backdropFilter,
        ambient: getComputedStyle(document.body).backgroundImage,
      }
      column.remove()
      window.__pushForm({ materialRadius: 'reference', materialShadow: 'flat', materialMotion: 'reference', materialGlass: true, materialAmbient: true })
      await sleep(150)
    })
  })
})()
