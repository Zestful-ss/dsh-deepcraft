/**
 * The subagent model entry: the seat the host renders it in, the card it opens,
 * one row picked, and the clear row.
 *
 * The host's slot registry hands the component over instead of rendering it, so
 * the probe renders it the way the seat would and anchors the card to a real
 * button standing in that seat. The route behind the entry is answered by the
 * page (stand-in/host-fetch.js), which keeps the record the probe reads back.
 */
(function () {
  var probe = window.__dshSmokeProbe
  var sleep = probe.sleep
  var r = probe.report

  probe.step(async function () {
    await probe.onlyFor(['subagent-model'], async function () {
      var react = window.__react
      var CARD = '.dsh-deepcraft-subagent-model-popover'
      var OPTION = '.dsh-deepcraft-subagent-model-option'
      var CLEAR = '.dsh-deepcraft-subagent-model-clear'

      var read = { present: false, rows: [], cardOpen: false }
      r.subagentModel = read

      var Component = (window.__slotComponents || {})['deepcraft-subagent-model']
      read.present = typeof Component === 'function'
      if (!read.present) return

      // The seat the host renders this entry in, with a real button to anchor
      // the card to: the card is positioned from the trigger's own box.
      var seat = document.createElement('div')
      seat.setAttribute('data-slot', 'conversation.input.right')
      seat.style.cssText = 'position:fixed;left:40px;bottom:60px;z-index:3'
      var anchor = document.createElement('button')
      anchor.type = 'button'
      seat.appendChild(anchor)
      document.body.appendChild(seat)
      await sleep(300)

      /** Render the entry the way the host's seat would, and read its declaration. */
      var renderEntry = function () {
        react.rendering = true
        react.states = null
        var tree = null
        try {
          tree = Component({})
        } finally {
          react.rendering = false
          react.states = null
        }
        if (tree === null || typeof tree !== 'object' || !tree.props) return null
        return { props: tree.props }
      }
      var describe = function (entry) {
        return entry === null ? null : {
          label: entry.props['aria-label'],
          state: entry.props['data-dsh-subagent-model'],
        }
      }

      /** Open the card through the trigger's own declaration, as the host's press would. */
      var press = function (entry) {
        if (entry === null) return
        entry.props.onClick({ currentTarget: anchor })
      }

      /** Every row the open card holds, as the reader sees it. */
      var readRows = function () {
        var card = document.querySelector(CARD)
        var out = []
        read.cardOpen = card !== null && card.getAttribute('data-open') === 'true'
        if (card === null) return out
        var rows = card.querySelectorAll(OPTION)
        for (var i = 0; i < rows.length; i++) {
          out.push({
            text: (rows[i].querySelector('.dsh-deepcraft-popover-item-text') || {}).textContent || '',
            desc: (rows[i].querySelector('.dsh-deepcraft-popover-item-desc') || {}).textContent || '',
            checked: rows[i].getAttribute('aria-checked'),
            role: rows[i].getAttribute('role'),
          })
        }
        return out
      }

      // One press on the entry opens the card the host's seat would show.
      press(renderEntry())
      await sleep(150)
      read.rows = readRows()
      read.expandedAfterPress = (renderEntry() || {}).props['aria-expanded']

      // Pick the first row — deepseek-flash, the route that declares an effort
      // ladder: the entry's own write, answered by the page, and the effort
      // sub-list the pick reveals.
      var options = document.querySelectorAll(CARD + ' ' + OPTION)
      if (options.length > 0) options[0].click()
      await sleep(200)
      var picked = describe(renderEntry())
      read.pickedLabel = picked && picked.label
      read.pickedState = picked && picked.state
      read.pickedRows = readRows()

      /** The effort options a picked route exposes: their labels and which is in force. */
      var readEfforts = function () {
        var card = document.querySelector(CARD)
        if (card === null) return []
        var opts = card.querySelectorAll('.dsh-deepcraft-subagent-model-effort-option')
        var out = []
        for (var i = 0; i < opts.length; i++) {
          out.push({
            text: (opts[i].textContent ?? '').trim(),
            inForce: opts[i].getAttribute('aria-pressed') === 'true',
          })
        }
        return out
      }
      read.effortOptions = readEfforts()

      // Press the highest declared level; the page writes the effort on the route.
      var effortButtons = document.querySelectorAll(CARD + ' .dsh-deepcraft-subagent-model-effort-option')
      if (effortButtons.length > 1) effortButtons[effortButtons.length - 1].click()
      await sleep(200)
      read.effortAfterPick = readEfforts()
      var lastWrite = (window.__subagentModel && window.__subagentModel.writes || []).slice(-1)[0] || {}
      read.effortWritten = (lastWrite.routes && lastWrite.routes[0] && lastWrite.routes[0].reasoningEffort) || null
      read.effortContract = lastWrite.contract === undefined ? null : lastWrite.contract

      // Then the second row, which is how several picks are made.
      var afterFirst = document.querySelector(CARD)
      var rowsAgain = afterFirst === null ? [] : afterFirst.querySelectorAll(OPTION)
      if (rowsAgain.length > 1) rowsAgain[1].click()
      await sleep(200)
      var many = describe(renderEntry())
      read.manyLabel = many && many.label

      // And the clear row, which the card carries while anything is picked.
      var withClear = document.querySelector(CARD)
      var clearRow = withClear === null ? null : withClear.querySelector(CLEAR)
      read.hasClear = clearRow !== null
      if (clearRow !== null) clearRow.click()
      await sleep(200)
      var cleared = describe(renderEntry())
      read.clearedState = cleared && cleared.state

      seat.remove()
    })
  })
})()
