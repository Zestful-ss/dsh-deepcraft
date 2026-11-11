/**
 * The stylesheet bookkeeping every case shares (D9): the skin's own sheet wears
 * this package's module-system tags, and a sibling's untagged sheet — one
 * planted before the bundle ran and one arriving after it — is parked by this
 * package before any materialization can claim it.
 */
(function () {
  var probe = window.__dshSmokeProbe
  var sleep = probe.sleep
  var r = probe.report

  probe.step(async function () {
    var skinStyle = document.getElementById('dsh-deepcraft-style')
    r.stylesheet = skinStyle !== null
    // The host's claim sweep reads untagged tags alone, so a tagged sheet cannot
    // be claimed by a sibling package and removed by that sibling's reload.
    r.sheetPlugin = skinStyle ? skinStyle.getAttribute('data-plugin') : null
    r.sheetPluginCss = skinStyle ? skinStyle.getAttribute('data-plugin-css') : null
    r.sheetClaimable = skinStyle ? skinStyle.matches('style:not([data-plugin])') : null
    // The sibling's sheet, planted before this bundle's factory ran: this
    // package must keep it out of its own bookkeeping.
    var siblingSheet = probe.siblingSheet = document.getElementById('smoke-sibling-sheet')
    r.siblingSheetTag = siblingSheet ? siblingSheet.getAttribute('data-plugin') : null
    r.siblingSheetClaimable = siblingSheet ? siblingSheet.matches('style:not([data-plugin])') : null
    // A sibling's sheet that arrives after this bundle's factory ran: the head
    // watch parks it before the next package materializes.
    var lateSheet = document.createElement('style')
    lateSheet.id = 'smoke-late-sibling-sheet'
    lateSheet.textContent = '.smoke-late-sibling-sheet{color:rgb(4, 5, 6)}'
    document.head.appendChild(lateSheet)
    await Promise.resolve()
    await sleep(0)
    r.lateSheetTag = lateSheet.getAttribute('data-plugin')
    r.lateSheetClaimable = lateSheet.matches('style:not([data-plugin])')
    lateSheet.remove()
  })
})()
