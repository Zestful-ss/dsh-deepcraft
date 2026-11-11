/**
 * The page's first collections: a generation disposed while its feature
 * chunks are on their way, and the served-namespace read the late-forms case
 * makes before the host's directory has answered.
 */
(function () {
  var probe = window.__dshSmokeProbe
  var sleep = probe.sleep
  var r = probe.report

  probe.step(async function () {
    await probe.onlyFor(['chunk-late'], async function () {
      // The way a hot reload ends a generation (D72): the chunks apply()
      // sent for still arrive, and must install nothing. The settings section
      // is the one a slot registration would show.
      window.__dispose()
      await sleep(600)
      r.lateSlots = (window.__slots || []).map(function (entry) { return entry.key })
      r.lateNodes = document.querySelectorAll(':is([class^="dsh-deepcraft-"], [class*=" dsh-deepcraft-"])').length
    })
    await probe.onlyFor(['late-forms'], async function () {
      // The directory has not answered yet: the skin holds the shipped palette.
      r.lateBefore = document.body.getAttribute('data-dsh-deepcraft-palette')
      window.__serveNamespace()
      // A pass is driven by a mutation, the way the live page drives one.
      document.body.appendChild(document.createElement('i'))
      await sleep(200)
      r.lateAfter = document.body.getAttribute('data-dsh-deepcraft-palette')
    })
  })
})()
