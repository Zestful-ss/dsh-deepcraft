/**
 * The page is left to settle, then the idle pass count every case draws on.
 */
(function () {
  var probe = window.__dshSmokeProbe
  var sleep = probe.sleep
  var r = probe.report

  probe.step(async function () {
    // Deferred scripts and fonts can schedule frames until startup finishes.
    if (document.readyState !== 'complete') {
      await new Promise(function (resolve, reject) {
        var timeout = setTimeout(function () { reject(new Error('smoke: the page did not finish loading within one minute')) }, 60000)
        window.addEventListener('load', function () { clearTimeout(timeout); resolve() }, { once: true })
      })
    }
    await document.fonts.ready
    // The idle count starts after frame work and finite animations settle.
    await probe.settle(250)
    // A font arriving can ask for another frame.
    if (document.fonts.status === 'loading') {
      await document.fonts.ready
      await probe.settle(250)
    }
    if (window.SMOKE_TIER !== 'quick') {
      var from = window.__passes
      var mark = performance.now()
      await sleep(1000)
      r.idlePasses = window.__passes - from
      // Where the frames of that second landed, for the check's own detail.
      r.idlePassTimes = window.__passTimes
        .filter(function (t) { return t >= mark })
        .map(function (t) { return Math.round(t - mark) })
    }
  })
})()
