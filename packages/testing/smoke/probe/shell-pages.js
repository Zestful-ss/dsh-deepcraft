/**
 * The palette case's page reads: the three palettes' canvases and accents.
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
    })
  })
})()
