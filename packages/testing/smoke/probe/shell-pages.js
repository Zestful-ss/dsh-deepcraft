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
      for (var at = 0; at < ['ocean', 'ember', 'forest', 'cindy'].length; at++) {
        var id = ['ocean', 'ember', 'forest', 'cindy'][at]
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
      window.__pushForm({ palette: 'cindy' })
      await sleep(250)
      var bodyStyle = getComputedStyle(document.body)
      var column = document.createElement('div')
      column.setAttribute('data-dsh-deepcraft-part', 'sidebar-column')
      document.body.appendChild(column)
      var glass = getComputedStyle(column, '::before').backdropFilter
      column.remove()
      r.cindyMaterial = {
        radius: bodyStyle.getPropertyValue('--dsw-radius-md').trim(),
        shadow: bodyStyle.getPropertyValue('--dsw-shadow-lv1').trim(),
        focus: bodyStyle.getPropertyValue('--dsw-focus-ring-color').trim(),
        fast: bodyStyle.getPropertyValue('--ds-transition-duration-fast').trim(),
        glass,
      }
      window.__pushForm({ palette: 'ocean' })
      await sleep(150)
    })
  })
})()
