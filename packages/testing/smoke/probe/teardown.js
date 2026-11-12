/**
 * The run's tail: the host's own controls read as the host painted them, the
 * console records collected, and the teardown — dispose with a pass pending,
 * then every mark, node and sheet the skin must have handed back.
 */
(function () {
  var probe = window.__dshSmokeProbe
  var sleep = probe.sleep
  var r = probe.report

  probe.step(async function () {
    // The plugin's own footer entry, as the host rendered it: the skin must
    // neither rewrite it nor take its box away.
    var action = document.getElementById('plugin-action')
    r.footerPluginAction = action === null ? null : {
      label: action.getAttribute('aria-label'),
      badge: action.getAttribute('data-cordis-badge'),
      display: getComputedStyle(action).display,
      visible: typeof action.checkVisibility === 'function' ? action.checkVisibility() : action.getBoundingClientRect().width > 0,
    }
    // The two host controls the skin's own colour rules must leave readable: the
    // chat's solid hover chip, and a filled anchor button whose ink comes from
    // the host's foreground token.
    var chip = document.querySelector('._older_h_1 button')
    var chipCS = chip ? getComputedStyle(chip) : null
    r.chipInk = chipCS ? chipCS.color : null
    r.chipFill = chipCS ? chipCS.backgroundColor : null
    var topUp = document.querySelector('._balance_h_1 a')
    var topUpCS = topUp ? getComputedStyle(topUp) : null
    r.topUpInk = topUpCS ? topUpCS.color : null
    r.topUpFill = topUpCS ? topUpCS.backgroundColor : null
    // A closed popover card must not answer the host's menu role: the host's
    // keyboard arbitration queries every [role=menu] in the document as a menu
    // that owns the foreground, so a hidden card silently disarms the shortcuts
    // behind it.
    r.closedMenuCards = document.querySelectorAll('.dsh-deepcraft-popover-card[role="menu"]:not([data-open="true"])').length
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
      r.leftMarkers = document.querySelectorAll('[data-dsh-deepcraft-part], [data-dsh-deepcraft-holds], [data-dsh-deepcraft-model-host]').length
      r.leftAttrs = Array.prototype.filter.call(document.body.attributes, function (a) { return /^data-dsh-deepcraft/.test(a.name) }).map(function (a) { return a.name })
      // The custom brand's values ride <body>'s own style (features/brand/brand.ts).
      r.leftBrandProperties = Array.prototype.filter.call(document.body.style, function (name) { return name.indexOf('--dsh-deepcraft-custom-') === 0 })
      r.leftStylesheet = !!document.getElementById('dsh-deepcraft-style')
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
