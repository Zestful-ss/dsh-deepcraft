/**
 * The feature switches: each switched feature's own marks on the page, read
 * after a preference write and a pass. Off has to leave none of a feature's
 * marks (its teardown handed the surface back); on brings them back, live,
 * without touching the others.
 */
(function () {
  var probe = window.__dshSmokeProbe
  var sleep = probe.sleep
  var r = probe.report

  probe.step(async function () {
    await probe.onlyFor(['switches', 'switches-off'], async function () {
      // The host surfaces the two switched features take over: the sidebar's
      // brand row (search) and the conversation's view-tab strip.
      var switchSidebar = document.createElement('div')
      switchSidebar.setAttribute('data-slot', 'sidebar')
      switchSidebar.innerHTML = '<div class="_root_n_1"><div class="_logoRow_n_1" data-window-drag="true">' +
        '<button type="button" class="_brand_n_1 _wide_n_1" aria-label="New session">brand</button>' +
        '<button type="button" class="_iconButton_n_1 _toggle_n_1" aria-label="Collapse sidebar">toggle</button></div></div>'
      document.body.appendChild(switchSidebar)
      var switchHeader = document.createElement('div')
      switchHeader.className = '_header_c_1'
      // The host's own header anchor: the strip's parts are read inside it (D3).
      switchHeader.setAttribute('data-slot', 'conversation.header')
      switchHeader.innerHTML = '<div class="_tabs_c_1">' +
        '<div class="_viewTabs_c_1" role="tablist" data-conversation-tabs="">' +
        '<button type="button" role="tab" aria-selected="true" class="_tab_c_1 _tabActive_c_1">Chat</button>' +
        '<button type="button" role="tab" aria-selected="false" class="_tab_c_1">Trajectory</button></div></div>'
      document.body.appendChild(switchHeader)
      var switchMarks = function () {
        return {
          sidebarSearch: document.querySelectorAll('[data-dsh-deepcraft-search-row], .dsh-deepcraft-search-trigger').length,
          viewTabs: document.querySelectorAll('[data-dsh-view-tabs]').length,
        }
      }
      var settleSwitch = async function (patch) {
        window.__pushForm(patch)
        document.body.appendChild(document.createElement('i'))
        await sleep(300)
        return switchMarks()
      }
      var switchKeys = ['sidebarSearch', 'viewTabs']
      var offValue = function () { return false }
      var onValue = function () { return true }
      // The file change rows take seat keys over rather than drawing marks on
      // the page, so their switch is driven and checked in its own case
      // ('chat-files': offSeats/backSeats). The header band needs the desktop
      // caption row, which this page has not: its switch is driven in its own
      // case too ('header-band': off/back).
      var allSwitches = function (value) {
        var patch = {}
        for (var ki = 0; ki < switchKeys.length; ki++) patch[switchKeys[ki]] = value ? onValue(switchKeys[ki]) : offValue(switchKeys[ki])
        return patch
      }
      await sleep(300)
      r.switches = { start: switchMarks(), steps: [] }
      await probe.onlyFor(['switches'], async function () {
        for (var si = 0; si < switchKeys.length; si++) {
          var offPatch = {}
          offPatch[switchKeys[si]] = offValue(switchKeys[si])
          var off = await settleSwitch(offPatch)
          var onPatch = {}
          onPatch[switchKeys[si]] = onValue(switchKeys[si])
          var on = await settleSwitch(onPatch)
          r.switches.steps.push({ key: switchKeys[si], off: off, on: on })
        }
        r.switches.allOff = await settleSwitch(allSwitches(false))
      })
      r.switches.allOn = await settleSwitch(allSwitches(true))
    })
  })
})()
