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
      var TRIGGER = '.dsh-deepcraft-subagent-model-btn'
      var CARD = '.dsh-deepcraft-subagent-model-popover'
      var OPTION = '.dsh-deepcraft-subagent-model-option'
      var CLEAR = '.dsh-deepcraft-subagent-model-clear'

      var read = { present: false, label: null, state: null, expanded: null, rows: [], cardOpen: false, writes: [] }
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
        // The host's own createElement collects children into an array; the
        // entry's label is the one string in it.
        var children = tree.props.children
        var text = typeof children === 'string' ? children : Array.isArray(children) ? children.filter(function (child) { return typeof child === 'string' }).join('') : ''
        return { props: tree.props, text: text }
      }
      var describe = function (entry) {
        return entry === null ? null : {
          text: entry.text,
          label: entry.props['aria-label'],
          state: entry.props['data-dsh-subagent-model'],
          expanded: entry.props['aria-expanded'],
        }
      }

      var first = describe(renderEntry())
      read.label = first && first.label
      read.state = first && first.state
      read.expanded = first && first.expanded
      read.firstText = first && first.text

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

      // Pick the first row: the entry's own write, answered by the page.
      var options = document.querySelectorAll(CARD + ' ' + OPTION)
      if (options.length > 0) options[0].click()
      await sleep(200)
      var picked = describe(renderEntry())
      read.pickedText = picked && picked.text
      read.pickedState = picked && picked.state
      read.pickedRows = readRows()

      // Then the second row, which is how several picks are made.
      var afterFirst = document.querySelector(CARD)
      var rowsAgain = afterFirst === null ? [] : afterFirst.querySelectorAll(OPTION)
      if (rowsAgain.length > 1) rowsAgain[1].click()
      await sleep(200)
      var many = describe(renderEntry())
      read.manyText = many && many.text
      read.manyLabel = many && many.label

      // And the clear row, which the card carries while anything is picked.
      var withClear = document.querySelector(CARD)
      var clearRow = withClear === null ? null : withClear.querySelector(CLEAR)
      read.hasClear = clearRow !== null
      if (clearRow !== null) clearRow.click()
      await sleep(200)
      var cleared = describe(renderEntry())
      read.clearedText = cleared && cleared.text
      read.clearedState = cleared && cleared.state

      var record = window.__subagentModel || { writes: [] }
      read.writes = record.writes.map(function (body) {
        return {
          session: body.session,
          routes: (body.routes || []).map(function (route) { return route.provider + '/' + route.model }),
        }
      })
      read.stored = (record.selected || []).length
      seat.remove()
    })
  })
})()
