/**
 * The page's first collections: a generation disposed while its feature
 * chunks are on their way, the served-namespace read the late-forms case makes
 * before the host's directory has answered, and the popovers case's dwell and
 * press rules on the account drawer.
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
      // The directory has not answered yet: the skin holds the shipped default.
      r.lateBefore = document.body.getAttribute('data-dsh-deepcraft-stats-position')
      window.__serveNamespace()
      // A pass is driven by a mutation, the way the live page drives one.
      document.body.appendChild(document.createElement('i'))
      await sleep(200)
      r.lateAfter = document.body.getAttribute('data-dsh-deepcraft-stats-position')
    })
    await probe.onlyFor(['popovers'], async function () {
      // The shared popover rule (shared/popover.ts): the dwell keeps a pointer
      // that merely crosses a trigger from unfolding anything, and the drawer
      // stays up while the pointer is still on the row it opened from.
      // The controls are built by the first scheduler pass, not by apply().
      await sleep(500)
      var drawerTrigger = document.querySelector('.dsh-deepcraft-account-btn')
      function drawerUp() { return document.querySelectorAll('.dsh-deepcraft-account-popover[data-open="true"]').length }
      // The dwell is 100 ms: at 50 ms a crossing pointer has opened nothing, and
      // by 250 ms a pointer that stayed has the card.
      drawerTrigger.dispatchEvent(new MouseEvent('mouseenter'))
      await sleep(50)
      r.drawerOpenAtDwell = drawerUp()
      await sleep(200)
      r.drawerOpenPastDwell = drawerUp()
      // The reader's hand presses the trigger the dwell just opened: the
      // drawer stays up, since the pointer is still on the row it opened from.
      drawerTrigger.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
      await sleep(150)
      r.drawerAfterPress = drawerUp()
      r.drawerOpenAttrAfterPress = drawerTrigger.getAttribute('data-open')
      drawerTrigger.dispatchEvent(new MouseEvent('mouseleave'))
      await sleep(250)
      r.cardsLeftAfterLeave = drawerUp()
    })
  })
})()
