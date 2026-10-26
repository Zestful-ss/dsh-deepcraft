/**
 * The shell cases' page reads: the Claude palette, the classic hero's welcome,
 * the conversation view tabs' pill, the composer's marked host controls and the
 * sidebar's search row. The strip the view-tabs case builds and the root the
 * search case mounts are handed to the probe for the teardown step.
 */
(function () {
  var probe = window.__dshSmokeProbe
  var sleep = probe.sleep
  var pillState = probe.pillState
  var r = probe.report

  probe.step(async function () {
    await probe.onlyFor(['brand'], async function () {
      // Minimal CSS contract fixture to verify CSS inheritance and color rules
      // for prose links and inline file mentions in code. Real host UI mapping
      // is covered by e2e scenarios.
      var linkHolder = document.createElement('div')
      linkHolder.innerHTML =
        '<div class="_markdown_x_1" data-dsh-deepcraft-part="markdown"><a id="smokeProseLink" href="#doc">prose link</a></div>' +
        '<code><span class="_fileMention_x_1" data-dsh-deepcraft-part="file-mention" id="smokeMention">src/app.ts</span></code>' +
        '<code id="smokeCode">plainCode()</code>'
      document.body.appendChild(linkHolder)

      var readTheme = function () {
        var body = getComputedStyle(document.body)
        var primaryBtn = document.querySelector('._primary_h_1')
        var proseLink = document.getElementById('smokeProseLink')
        var mention = document.getElementById('smokeMention')
        var code = document.getElementById('smokeCode')
        return {
          canvas: body.backgroundColor,
          accent: body.getPropertyValue('--dsw-alias-brand-primary').trim(),
          buttonFill: primaryBtn === null ? '' : getComputedStyle(primaryBtn).backgroundColor,
          buttonInk: primaryBtn === null ? '' : getComputedStyle(primaryBtn).color,
          proseLink: proseLink === null ? '' : getComputedStyle(proseLink).color,
          mention: mention === null ? '' : getComputedStyle(mention).color,
          codeFg: code === null ? '' : getComputedStyle(code).color,
          dataInk: body.getPropertyValue('--dsh-deepcraft-data-ink').trim(),
          wave: body.getPropertyValue('--dsh-deepcraft-ripple-wave').trim(),
          ranks: [
            body.getPropertyValue('--dsh-deepcraft-data-1').trim(),
            body.getPropertyValue('--dsh-deepcraft-data-2').trim(),
            body.getPropertyValue('--dsh-deepcraft-data-3').trim(),
            body.getPropertyValue('--dsh-deepcraft-data-4').trim(),
            body.getPropertyValue('--dsh-deepcraft-data-5').trim(),
            body.getPropertyValue('--dsh-deepcraft-data-6').trim(),
            body.getPropertyValue('--dsh-deepcraft-data-7').trim(),
          ],
        }
      }

      var claudeLight = readTheme()
      document.body.setAttribute('data-ds-dark-theme', '')
      var claudeDark = readTheme()
      var claudeRaised = getComputedStyle(document.body).getPropertyValue('--dsh-deepcraft-raised').trim()
      document.body.removeAttribute('data-ds-dark-theme')

      r.claudePalette = Object.assign(claudeLight, {
        dark: Object.assign(claudeDark, { raised: claudeRaised }),
      })

      window.__pushForm({ brand: 'deepseek' })
      await sleep(150)
      var dsLight = readTheme()
      document.body.setAttribute('data-ds-dark-theme', '')
      var dsDark = readTheme()
      var dsRaised = getComputedStyle(document.body).getPropertyValue('--dsh-deepcraft-raised').trim()
      document.body.removeAttribute('data-ds-dark-theme')

      r.deepseekPalette = Object.assign(dsLight, {
        dark: Object.assign(dsDark, { raised: dsRaised }),
      })

      window.__pushForm({ brand: 'claude' })
      await sleep(150)
      linkHolder.remove()
    })
    await probe.onlyFor(['hero'], async function () {
      // The classic hero's welcome is drawn on arrival and holds between
      // passes: the draw pinned to either end of its pool gives two different
      // lines, and a further pass leaves the drawn one alone.
      // The classic hero's welcome sits in the host's conversation anchor, the
      // subtree the skin reads its hero parts inside (D3).
      var greetHolder = document.createElement('div')
      greetHolder.setAttribute('data-conversation-scroll', '')
      var greetRoot = document.createElement('div')
      greetRoot.className = '_root_x_1'
      greetRoot.setAttribute('data-phase', 'hero')
      var greetGroup = document.createElement('div')
      greetGroup.className = '_titleGroup_x_1'
      var greetSpan = document.createElement('span')
      greetSpan.textContent = 'Host greeting'
      greetGroup.appendChild(greetSpan)
      greetRoot.appendChild(greetGroup)
      greetHolder.appendChild(greetRoot)
      var greetRandom = Math.random
      var arrive = async function (draw) {
        Math.random = function () { return draw }
        document.body.appendChild(greetHolder)
        await sleep(150)
        Math.random = greetRandom
        return greetSpan.textContent
      }
      r.greeting = { low: await arrive(0) }
      // The classic hero's permission control is the segment group; the studio
      // hero's is the conversation's trigger
      // (packages/client/src/features/permissions/permissions.ts).
      var heroModes = document.querySelector('[data-composer-card] [data-dsh-deepcraft-part~="modes"]')
      r.classicSegments = heroModes === null ? null
        : Array.prototype.map.call(heroModes.querySelectorAll('.dsh-deepcraft-segments > .dsh-deepcraft-segment'), function (item) { return item.textContent })
      r.classicPermTrigger = heroModes !== null && heroModes.querySelector('.dsh-deepcraft-perm-btn') !== null
      // The crab stands on the classic home page's card too, as Deepy does.
      r.classicCrab = document.querySelector('[data-composer-card] > .dsh-deepcraft-crab') !== null
      // The glyph field stands in the hero root, under its content, and takes no
      // press; its switch, off as the page opens, mounts it and takes it back off.
      r.ripple = { off: greetRoot.querySelector('.dsh-deepcraft-ripple-canvas') === null && !greetRoot.hasAttribute('data-dsh-deepcraft-ripple') }
      window.__pushForm({ homeRipple: true })
      await sleep(150)
      var rippleCanvas = greetRoot.querySelector(':scope > .dsh-deepcraft-ripple-canvas')
      r.ripple.stamped = greetRoot.hasAttribute('data-dsh-deepcraft-ripple')
      r.ripple.canvas = rippleCanvas !== null
      r.ripple.pointerEvents = rippleCanvas === null ? null : getComputedStyle(rippleCanvas).pointerEvents
      r.ripple.order = rippleCanvas === null ? null : getComputedStyle(rippleCanvas).zIndex
      window.__pushForm({ homeRipple: false })
      await sleep(150)
      r.ripple.gone = !greetRoot.hasAttribute('data-dsh-deepcraft-ripple') && greetRoot.querySelector('.dsh-deepcraft-ripple-canvas') === null
      window.__pushForm({ homeRipple: true })
      await sleep(150)
      r.ripple.back = greetRoot.hasAttribute('data-dsh-deepcraft-ripple') && greetRoot.querySelector(':scope > .dsh-deepcraft-ripple-canvas') !== null
      document.body.appendChild(document.createElement('i'))
      await sleep(150)
      r.greeting.held = greetSpan.textContent
      greetHolder.remove()
      await sleep(150)
      r.greeting.high = await arrive(0.999)
      greetHolder.remove()
      await sleep(150)
    })
    await probe.onlyFor(['view-tabs'], async function () {
      // The conversation view tabs (ConversationSession's strip): the pill is
      // drawn under the active tab without sliding in, then slides to the tab a
      // switch selects. The host wraps the buttons in its own tablist inside the
      // strip (0.2.1-rc.3), so the strip and the buttons are not direct
      // siblings. The strip stays until the teardown, which must take the pill
      // back off it.
      var viewHeader = document.createElement('div')
      viewHeader.className = '_header_c_1'
      // The host's own header anchor: the skin reads the tab strip's parts
      // inside it (D3).
      viewHeader.setAttribute('data-slot', 'conversation.header')
      viewHeader.innerHTML = '<div class="_tabs_c_1">' +
        '<div class="_viewTabs_c_1" role="tablist" data-conversation-tabs="">' +
        '<button type="button" role="tab" aria-selected="true" class="_tab_c_1 _tabActive_c_1">Chat</button>' +
        '<button type="button" role="tab" aria-selected="false" class="_tab_c_1">Trajectory</button>' +
        '<button type="button" role="tab" aria-selected="false" class="_tab_c_1">Context</button></div></div>'
      document.body.appendChild(viewHeader)
      await sleep(150)
      // The shell the skin draws is the host's tablist inside the row, so the
      // stamp and the pill live there while the row keeps the host's width.
      var stripRow = viewHeader.firstChild
      probe.viewStrip = stripRow.querySelector('[role="tablist"]') || stripRow
      var viewTabs = probe.viewStrip.querySelectorAll('[role="tab"]')
      r.viewPill = { stamped: probe.viewStrip.hasAttribute('data-dsh-view-tabs'), first: pillState(probe.viewStrip, viewTabs[0]) }
      viewTabs[0].setAttribute('aria-selected', 'false')
      viewTabs[0].className = '_tab_c_1'
      viewTabs[2].setAttribute('aria-selected', 'true')
      viewTabs[2].className = '_tab_c_1 _tabActive_c_1'
      await sleep(60)
      r.viewPill.switched = pillState(probe.viewStrip, viewTabs[2])
      // The slide plays whatever the system's motion setting: no reduced-motion
      // block in the shipped stylesheets may reach the pill.
      r.viewPill.reducedMotionRules = 0
      for (var sheetIndex = 0; sheetIndex < document.styleSheets.length; sheetIndex++) {
        var sheetRules = document.styleSheets[sheetIndex].cssRules
        for (var ruleIndex = 0; ruleIndex < sheetRules.length; ruleIndex++) {
          var mediaRule = sheetRules[ruleIndex]
          if (mediaRule instanceof CSSMediaRule && /prefers-reduced-motion/.test(mediaRule.conditionText) &&
            mediaRule.cssText.indexOf('data-dsh-deepcraft-pill') !== -1) r.viewPill.reducedMotionRules++
        }
      }
    })
    await probe.onlyFor(['composer'], async function () {
      // The composer's host controls are marked by what they are, read from
      // the host's structure; the submit button turning into stop (its glyph
      // becomes a rect) moves its mark with it.
      var controlOf = function (id) { var el = document.getElementById(id); return el && el.getAttribute('data-dsh-deepcraft-control') }
      // The host's own access button, skipping the skin's controls by their own
      // class namespace, read as whole class tokens.
      var accessButton = document.querySelector('[data-slot="conversation.input.permission"] button:not([class^="dsh-deepcraft-"], [class*=" dsh-deepcraft-"])')
      r.controls = { commands: controlOf('commands'), send: controlOf('send'), access: accessButton && accessButton.getAttribute('data-dsh-deepcraft-control') }
      var sendButton = document.getElementById('send')
      var sendSvg = sendButton.querySelector('svg')
      var sendGlyph = sendSvg.innerHTML
      sendSvg.innerHTML = '<rect x="3" y="3" width="10" height="10"></rect>'
      await sleep(60)
      r.controls.stopping = controlOf('send')
      // The stop glyph is the skin's own: the host's square is a scaled SVG glyph
      // whose rasterization lands on a subpixel phase of its own, so the ring and
      // the square are drawn as two boxes the browser snaps alike.
      var ring = getComputedStyle(sendButton, '::before')
      var square = getComputedStyle(sendButton, '::after')
      r.stopGlyph = {
        hostGlyph: getComputedStyle(sendSvg).display,
        ring: ring.width,
        squareWidth: square.width,
        squareHeight: square.height,
        fill: square.backgroundColor,
        ink: getComputedStyle(sendButton).color,
      }
      sendSvg.innerHTML = sendGlyph
      await sleep(60)
      r.controls.back = controlOf('send')
    })
    await probe.onlyFor(['search'], async function () {
      // The sidebar's brand row (ui-sidebar SidebarRoot): the search box goes in
      // beside the wide brand, and pressing it renders the host's Modal through
      // a root of the skin's own. The three box styles are driven through the
      // form the settings page writes to: `overlay` (the default) sits in that
      // row and rests hidden, `standalone` takes a row of its own under it and
      // shows without a hover, `icon` draws no box of the skin's and puts the
      // host's own search button back with the click taken over.
      var sidebarSlot = document.createElement('div')
      sidebarSlot.setAttribute('data-slot', 'sidebar')
      sidebarSlot.innerHTML = '<div class="_root_n_1"><div class="_logoRow_n_1" data-window-drag="true">' +
        '<button type="button" class="_brand_n_1 _wide_n_1" aria-label="New session">brand</button>' +
        '<button type="button" class="_iconButton_n_1 _toggle_n_1" aria-label="Collapse sidebar">toggle</button></div>' +
        // The row under the brand row, with the host's own shortcut markup: one
        // `kbd` per key and a `+` between them.
        '<button type="button" class="_newSession_n_1" aria-keyshortcuts="Control+N">' +
        '<span class="_newSessionLabelMask_n_1"><span class="_newSessionContent_n_1">' +
        '<span class="_newSessionLabel_n_1 _wide_n_1">New session</span></span></span>' +
        '<span class="_newSessionShortcut_n_1"><span class="_keys_n_1">' +
        '<kbd class="_key_n_1">Ctrl</kbd><kbd class="_separator_n_1">+</kbd><kbd class="_key_n_1">K</kbd>' +
        '</span></span></button>' +
        '<div class="_sectionHeader_n_1"><span class="_sectionLabel_n_1">Workspaces</span>' +
        '<div class="_searchSlot_n_1"><button type="button" class="_searchButton_n_1" aria-label="Search sessions">search</button>' +
        '<input class="_searchInput_n_1" type="text" tabindex="-1"></div></div></div>'
      document.body.appendChild(sidebarSlot)
      await sleep(150)
      var logoRow = sidebarSlot.querySelector('[data-dsh-deepcraft-part~="logo-row"]')
      var searchTrigger = logoRow.querySelector('.dsh-deepcraft-search-trigger')
      var rootsBefore = window.__roots.length
      if (searchTrigger) searchTrigger.click()
      await sleep(60)
      probe.searchRoot = window.__roots[rootsBefore]
      // One style at a time, through the form; the box and its rows are read
      // back from the page the same way a reader would see them.
      var styleOf = async function (style) {
        window.__pushForm({ searchStyle: style })
        sidebarSlot.appendChild(document.createElement('i'))
        await sleep(200)
        var box = document.querySelector('.dsh-deepcraft-search-trigger')
        var ownRow = document.querySelector('.dsh-deepcraft-search-bar')
        var slot = sidebarSlot.querySelector('[data-dsh-deepcraft-part~="search-slot"]')
        return {
          triggerInRow: !!logoRow.querySelector('.dsh-deepcraft-search-trigger'),
          rowMarked: logoRow.hasAttribute('data-dsh-deepcraft-search-row'),
          barAfterRow: !!ownRow && ownRow.parentElement === logoRow.parentElement && ownRow.previousElementSibling === logoRow,
          triggerInBar: !!ownRow && !!box && box.parentElement === ownRow,
          triggerVisibility: box ? getComputedStyle(box).visibility : null,
          hostSlotPosition: getComputedStyle(slot).position,
          hostSlotWidth: Math.round(slot.getBoundingClientRect().width),
          barWidth: ownRow === null ? null : Math.round(ownRow.getBoundingClientRect().width),
          boxWidth: box === null ? null : Math.round(box.getBoundingClientRect().width),
        }
      }
      r.search = {
        placed: !!searchTrigger && searchTrigger.previousElementSibling === logoRow.firstElementChild,
        rowMarked: logoRow.hasAttribute('data-dsh-deepcraft-search-row'),
        resting: searchTrigger ? getComputedStyle(searchTrigger).visibility : null,
        modalRendered: !!probe.searchRoot && probe.searchRoot.renders > 0,
      }
      r.search.standalone = await styleOf('standalone')
      r.search.icon = await styleOf('icon')
      // The host's own button is live again in the icon style; a listener on an
      // ancestor stands in for the host's own click handling, which the skin's
      // takeover must keep from running.
      var hostButton = sidebarSlot.querySelector('[data-dsh-deepcraft-part~="search-button"]')
      var reachedHost = 0
      var countHost = function () { reachedHost++ }
      sidebarSlot.addEventListener('click', countHost)
      if (hostButton) hostButton.click()
      await sleep(60)
      sidebarSlot.removeEventListener('click', countHost)
      r.search.icon.hostClicksReachingHost = reachedHost
      r.search.back = await styleOf('overlay')
      // The New session row's shortcut hint and the search box's own caps are
      // the same host markup. The box's caps are built from the host's shortcut
      // catalog, which this stand-in does not carry, so the comparison reads a
      // sample of the search sheet's own cap class instead, and takes both
      // field by field — the two looks cannot then drift apart.
      var capStyle = function (element) {
        var style = getComputedStyle(element)
        return {
          display: style.display, alignItems: style.alignItems, justifyContent: style.justifyContent,
          minWidth: style.minWidth, height: style.height, padding: style.padding, boxSizing: style.boxSizing,
          border: style.border, radius: style.borderRadius, background: style.backgroundColor,
          color: style.color, font: style.font, fontWeight: style.fontWeight, lineHeight: style.lineHeight,
        }
      }
      var sample = document.createElement('kbd')
      sample.className = 'dsh-deepcraft-search-key'
      sample.textContent = 'Ctrl'
      sidebarSlot.appendChild(sample)
      var shortcutCaps = [].slice.call(sidebarSlot.querySelectorAll('[data-dsh-deepcraft-part~="new-session-shortcut"] kbd'))
      r.search.keycaps = {
        shortcut: shortcutCaps.filter(function (cap) { return !/separator/.test(cap.className) }).map(capStyle),
        separators: shortcutCaps.filter(function (cap) { return /separator/.test(cap.className) }).map(function (cap) { return getComputedStyle(cap).display }),
        search: [capStyle(sample)],
      }
      sample.remove()
    })
  })
})()
