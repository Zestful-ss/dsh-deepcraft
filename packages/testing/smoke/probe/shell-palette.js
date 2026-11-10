/**
 * The host-palette case: the host's own colours and type, the tokens and frames
 * the skin must leave alone, and what a wallpaper plugin's cleared canvas
 * reaches. Then the settings case: the section rendered through the stand-in
 * React, tab by tab, with the sub-rows that grey out behind a parent, and the
 * heading's link to the plugin's repository.
 */
(function () {
  var probe = window.__dshSmokeProbe
  var sleep = probe.sleep
  var r = probe.report

  probe.step(async function () {
    // Following the host's colours and type: with the host's palette in the
    // page, the skin writes none of the host's tokens, paints none of the
    // host's frame, and its own surfaces read the host's tokens; a wallpaper
    // plugin's cleared canvas and glass then reach both. Back on the warm palette the
    // skin's own palette returns.
    await probe.onlyFor(['host-palette'], async function () {
      var hostProbe = function (html) {
        var holder = document.createElement('div')
        holder.innerHTML = html
        document.body.appendChild(holder.firstChild)
        return document.body.lastChild
      }
      var hostNodes = {
        sidebar: hostProbe('<div data-pane="sidebar">s</div>'),
        conversation: hostProbe('<div data-pane="conversation">c</div>'),
        popover: hostProbe('<div class="dsh-deepcraft-popover-card" data-open="true">p</div>'),
        search: hostProbe('<div class="dsh-deepcraft-search-dialog">q</div>'),
        group: hostProbe('<span class="dsh-deepcraft-model-group">g</span>'),
        heading: hostProbe('<h1>h</h1>'),
        code: hostProbe('<pre><code>c</code></pre>'),
      }
      var readHost = async function (patch, wallpaper) {
        if (patch !== null) window.__pushForm(patch)
        if (wallpaper) document.body.setAttribute('data-we-wallpaper', '')
        else document.body.removeAttribute('data-we-wallpaper')
        await sleep(120)
        var bodyStyle = getComputedStyle(document.body)
        return {
          base: bodyStyle.getPropertyValue('--dsw-alias-bg-base').trim(),
          family: bodyStyle.getPropertyValue('--dsw-font-family').trim(),
          body: bodyStyle.backgroundColor,
          // The mask the warm palette lays over a wallpaper
          mask: getComputedStyle(document.body, '::after').backgroundColor,
          maskPosition: getComputedStyle(document.body, '::after').position,
          html: getComputedStyle(document.documentElement).backgroundColor,
          sidebar: getComputedStyle(hostNodes.sidebar).backgroundColor,
          // The sidebar element carries this token itself: the skin canvas
          // while the palette paints it, cleared while a wallpaper is up.
          sidebarFill: getComputedStyle(hostNodes.sidebar).getPropertyValue('--dsw-specific-sidebar-fill').trim(),
          conversation: getComputedStyle(hostNodes.conversation).backgroundColor,
          popover: getComputedStyle(hostNodes.popover).backgroundColor,
          popoverBlur: getComputedStyle(hostNodes.popover).backdropFilter,
          // The account drawer the footer feature built (it sweeps any other copy).
          account: getComputedStyle(document.querySelector('.dsh-deepcraft-account-popover')).backgroundColor,
          search: getComputedStyle(hostNodes.search).backgroundColor,
          group: getComputedStyle(hostNodes.group).backgroundColor,
          groupInk: getComputedStyle(hostNodes.group).color,
          heading: getComputedStyle(hostNodes.heading).fontFamily,
          code: getComputedStyle(hostNodes.code.firstChild).fontFamily,
        }
      }
      await sleep(300)
      r.hostPalette = {
        host: await readHost({ palette: 'host', typeface: 'host' }, false),
        wallpaper: await readHost(null, true),
        ember: await readHost({ palette: 'ember', typeface: 'claude' }, false),
        // The wallpaper plugin showing one under the warm palette: the
        // shell stands down, one mask lies over the wallpaper, and the base
        // canvas and the skin's own faces keep their fill.
        emberWallpaper: await readHost(null, true),
      }
      document.body.removeAttribute('data-we-wallpaper')
      await sleep(120)
      for (var hostKey in hostNodes) hostNodes[hostKey].remove()
    })
    // The settings page, rendered through the stand-in React into a plain tree:
    // the tab strip, which rows each tab carries, and the sub-rows that grey
    // out while their parent is off. A tab is opened by standing the tab state
    // in for a click (the stand-in's `states`).
    await probe.onlyFor(['settings'], async function () {
      var Section = (window.__slotComponents || {})['deepcraft']
      var walk = function (node, visit) {
        if (node === null || node === undefined || typeof node !== 'object') return
        if (Array.isArray(node)) { node.forEach(function (child) { walk(child, visit) }); return }
        visit(node)
        walk(node.props && node.props.children, visit)
      }
      var renderTab = function (tabId) {
        var react = window.__react
        react.rendering = true
        react.states = tabId === 'general' ? null : { general: tabId }
        var tree = Section({})
        react.rendering = false
        react.states = null
        var out = { tabs: [], selected: null, rows: [], disabled: [], notes: [], notice: null, link: null }
        walk(tree, function (node) {
          var props = node.props || {}
          if (props.role === 'tab') {
            out.tabs.push(props.key)
            if (props['aria-selected'] === 'true') out.selected = props.key
          }
          if (typeof props.className === 'string' && /(^| )dsh-deepcraft-settings-row( |$)/.test(props.className)) {
            var rowKey = props.key
            out.rows.push(rowKey)
            if (props['data-disabled'] === '') out.disabled.push(rowKey)
            walk(props.children, function (child) {
              if (((child.props || {}).className || '') === 'dsh-deepcraft-settings-row-note' && out.notes.indexOf(rowKey) < 0) out.notes.push(rowKey)
            })
          }
          if (typeof props.className === 'string' && /(^| )dsh-deepcraft-settings-tab-notice( |$)/.test(props.className)) {
            out.notice = [].concat(props.children).filter(function (child) { return typeof child === 'string' }).join('')
          }
          if (props.className === 'dsh-deepcraft-settings-repo') {
            out.link = { href: props.href, target: props.target, rel: props.rel, label: props['aria-label'] }
          }
        })
        return out
      }
      r.settings = { registered: typeof Section === 'function', pages: {} }
      if (r.settings.registered) {
        var tabIds = ['general', 'appearance', 'composer', 'sidebar', 'conversation']
        for (var ti = 0; ti < tabIds.length; ti++) r.settings.pages[tabIds[ti]] = renderTab(tabIds[ti])
        r.settings.link = r.settings.pages.general.link
        // The heading's mark: the build inlines the asset into the token sheet
        // and the rule paints it as a mask over the link's own box, so the
        // address and the size are read off the rendered pseudo-element.
        var linkNode = document.createElement('a')
        linkNode.className = 'dsh-deepcraft-settings-repo'
        document.body.appendChild(linkNode)
        var markStyle = getComputedStyle(linkNode, '::before')
        r.settings.mark = {
          mask: (markStyle.maskImage === 'none' ? markStyle.webkitMaskImage : markStyle.maskImage).slice(0, 48),
          size: markStyle.width + '×' + markStyle.height,
          ink: markStyle.backgroundColor,
        }
        linkNode.remove()
        window.__pushForm({ modelPicker: false, mascot: 'off', sidebarSearch: false, palette: 'host' })
        r.settings.parentsOff = { appearance: renderTab('appearance'), composer: renderTab('composer'), sidebar: renderTab('sidebar') }
        window.__pushForm({ modelPicker: true, mascot: 'brand', sidebarSearch: true, palette: 'ocean' })
        // The rows that wait for another setting: the composer restyle off greys
        // the picker, its sub-rows, the permission control and the statistics'
        // position; the footer takeover off greys the easter egg under it. Home
        // only still leaves the statistics without a conversation to stand in.
        window.__pushForm({ composerScope: 'off', collapseFooter: false })
        r.settings.requirementsOff = { composer: renderTab('composer'), conversation: renderTab('conversation'), sidebar: renderTab('sidebar') }
        window.__pushForm({ composerScope: 'hero', collapseFooter: true })
        r.settings.heroOnly = { composer: renderTab('composer'), conversation: renderTab('conversation') }
        window.__pushForm({ composerScope: 'all' })
        // On the Windows window the title-bar row takes input; everywhere else
        // it stays greyed with its note.
        document.documentElement.setAttribute('data-windows-titlebar', '')
        r.settings.onWindows = renderTab('conversation')
        document.documentElement.removeAttribute('data-windows-titlebar')
      }
    })
  })
})()
