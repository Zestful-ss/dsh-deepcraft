/**
 * The run's tail: the host's own controls read as the host painted them, the
 * keymap and the console records collected, and the teardown — dispose with a
 * pass pending, then every mark, node and sheet the skin must have handed back.
 */
(function () {
  var probe = window.__dshSmokeProbe
  var sleep = probe.sleep
  var r = probe.report

  probe.step(async function () {
    // The host's own account row, when the host has one: the skin marks it and
    // repaints it as a Claude row, so the teardown has to hand it back exactly as
    // the host rendered it (D12).
    r.hostRowPresent = document.getElementById('host-account') !== null
    var hostRowAtRest = document.getElementById('host-account')
    r.hostRowMarked = !!(hostRowAtRest && hostRowAtRest.hasAttribute('data-dsh-deepcraft-account-host-row'))
    // The two host controls the skin's own colour rules must leave readable: the
    // chat's solid hover chip, and a filled anchor button whose ink comes from
    // the host's foreground token rather than from the link colour.
    var chip = document.querySelector('._older_h_1 button')
    var chipCS = chip ? getComputedStyle(chip) : null
    r.chipInk = chipCS ? chipCS.color : null
    r.chipFill = chipCS ? chipCS.backgroundColor : null
    var topUp = document.querySelector('._balance_h_1 a')
    var topUpCS = topUp ? getComputedStyle(topUp) : null
    r.topUpInk = topUpCS ? topUpCS.color : null
    r.topUpFill = topUpCS ? topUpCS.backgroundColor : null
    var banRow = document.querySelector('[data-dsh-deepcraft-ban-row]')
    if (banRow) banRow.click()
    var toast = document.querySelector('.dsh-deepcraft-ban-toast-text')
    r.banToast = toast ? toast.textContent : null
    var dismiss = document.querySelector('.dsh-deepcraft-ban [data-dsh-deepcraft-ban-dismiss]')
    if (dismiss) dismiss.click()
    // A closed popover card must not answer the host's menu role: the host's
    // keyboard arbitration queries every [role=menu] in the document as a menu
    // that owns the foreground, so a hidden card silently disarms the shortcuts
    // behind it (the Esc-Esc stop, the close-page and dialog commands).
    r.closedMenuCards = document.querySelectorAll('.dsh-deepcraft-popover-card[role="menu"]:not([data-open="true"])').length
    var editor = document.getElementById('editor')
    editor.focus()
    editor.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
    r.keys = window.__keys.slice()
    await sleep(50)
    r.pwned = window.__pwned
    r.errors = window.__errors.slice()
    r.uncaught = window.__uncaught.slice()
    if (r.teardownRegistered) {
      // Dispose with a pass pending, the way a live page is disposed mid-stream:
      // the mutation's observer callback runs before the await resumes, so a
      // frame is already requested when the teardown starts.
      document.body.appendChild(document.createElement('i'))
      await Promise.resolve()
      window.__dispose()
      var before = window.__passes
      document.body.appendChild(document.createElement('i'))
      await sleep(200)
      r.passesAfterTeardown = window.__passes - before
      r.leftNodes = document.querySelectorAll(':is([class^="dsh-deepcraft-"], [class*=" dsh-deepcraft-"])').length
      r.leftMarkers = document.querySelectorAll('[data-dsh-deepcraft-footer-entry], [data-dsh-deepcraft-footer-hidden], [data-dsh-deepcraft-footer-overlay], [data-dsh-deepcraft-model-host], [data-dsh-deepcraft-account-host-row], [data-dsh-deepcraft-context-stats], [data-dsh-deepcraft-motion], [data-dsh-deepcraft-wait], [data-dsh-deepcraft-deepy-anchor], [data-dsh-deepcraft-crab-anchor]').length
      r.leftAttrs = Array.prototype.filter.call(document.body.attributes, function (a) { return /^data-dsh-(claude|window)/.test(a.name) }).map(function (a) { return a.name })
      // The custom brand's values ride <body>'s own style (features/brand/brand.ts).
      r.leftBrandProperties = Array.prototype.filter.call(document.body.style, function (name) { return name.indexOf('--dsh-deepcraft-custom-') === 0 })
      r.leftStylesheet = !!document.getElementById('dsh-deepcraft-style')
      if (probe.viewStrip) r.viewPill.left = probe.viewStrip.hasAttribute('data-dsh-deepcraft-pill') || probe.viewStrip.hasAttribute('data-dsh-view-tabs') || probe.viewStrip.style.length > 0
      if (r.search) {
        r.search.left = document.querySelectorAll('[data-dsh-deepcraft-search-row], .dsh-deepcraft-search-trigger, .dsh-deepcraft-search-bar').length
        r.search.rootUnmounted = !!probe.searchRoot && probe.searchRoot.unmounted
      }
      r.leftDraftMarks = document.querySelectorAll('[data-dsh-deepcraft-draft-empty]').length
      r.leftControlMarks = document.querySelectorAll('[data-dsh-deepcraft-control]').length
      var hostRowEnd = document.getElementById('host-account')
      r.hostRowEnd = hostRowEnd === null ? null : {
        visibility: getComputedStyle(hostRowEnd).visibility,
        pointerEvents: getComputedStyle(hostRowEnd).pointerEvents,
        display: getComputedStyle(hostRowEnd).display,
        width: hostRowEnd.getBoundingClientRect().width,
      }
      // The host removes every tag carrying this package's id when the package
      // reloads (client-modules' `removeOwnedStyles`); the sibling's sheet must
      // not be among them, whether that step runs before or after the teardown.
      var tagsOwned = document.querySelectorAll('style[data-plugin]')
      for (var to = 0; to < tagsOwned.length; to++) {
        if (tagsOwned[to].getAttribute('data-plugin') === 'dsh-deepcraft') tagsOwned[to].remove()
      }
      r.siblingSheetSurvives = !!probe.siblingSheet && probe.siblingSheet.isConnected
      if (probe.siblingSheet) probe.siblingSheet.remove()
    }
  })
})()
