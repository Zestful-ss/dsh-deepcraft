'use strict'
const { BAND_ANIMATION, same, check, basicChecks, commonChecks } = require('./_shared.cjs')

module.exports = {
  'late-forms'(r) {
    check('apply() completes', r.applyError === null, r.applyError)
    check('the store stays on the defaults (the floating home) until the namespace is served',
      r.lateBefore === 'float', JSON.stringify(r.lateBefore))
    check('a namespace served after apply still binds the form and its value (classic)',
      r.lateAfter === null && r.homeLayoutAttr === null,
      JSON.stringify({ after: r.lateAfter, final: r.homeLayoutAttr }))
    commonChecks(r)
  },
  settings(r) {
    basicChecks(r)
    const settings = r.settings || {}
    check('the settings section registers with the settings dialog', settings.registered === true, JSON.stringify(settings.registered))
    const expected = {
      general: ['username', 'autoPopover'],
      appearance: ['palette', 'brandAccent', 'typeface', 'pageLook', 'homeLayout', 'homeRipple', 'mascot', 'chatPet', 'mascotScope', 'brandName', 'brandMark', 'brandWordmark', 'brandInk'],
      composer: ['composerScope', 'modelPicker', 'modelDescriptions', 'quickProviders', 'subagentModelPicker', 'peakrate', 'permissionsControl', 'subagentModelChoice'],
      sidebar: ['collapseFooter', 'sidebarSearch', 'searchStyle', 'workspaceView', 'dockCards', 'sidebarLayout'],
      conversation: ['turnNav', 'statsPosition', 'viewTabs', 'headerBand'],
      motion: ['motion', 'chatAnimations', 'chatWait', 'statusDetail'],
    }
    // Greyed by the page itself rather than by a preference: the title-bar
    // band waits for the Windows desktop window.
    const expectedGrey = { conversation: ['headerBand'] }
    const pages = settings.pages || {}
    for (const tab of Object.keys(expected)) {
      const page = pages[tab] || {}
      check(`the ${tab} tab is selected in the six-tab strip and carries its rows, greying only the rows that wait for something`,
        JSON.stringify(page.tabs) === JSON.stringify(Object.keys(expected)) && page.selected === tab &&
          JSON.stringify(page.rows) === JSON.stringify(expected[tab]) &&
          JSON.stringify(page.disabled || []) === JSON.stringify(expectedGrey[tab] || []) &&
          JSON.stringify(page.notes || []) === JSON.stringify(expectedGrey[tab] || []),
        JSON.stringify(page))
    }
    const onWindows = settings.onWindows || {}
    check('on the Windows window the title-bar row takes input and carries no note',
      JSON.stringify(onWindows.rows) === JSON.stringify(expected.conversation) &&
        JSON.stringify(onWindows.disabled) === '[]' && JSON.stringify(onWindows.notes) === '[]',
      JSON.stringify(onWindows))
    const off = settings.parentsOff || {}
    check('a sub-row greys out while its parent is off: the accent colour with the colours following the host, the mascot\'s place with the mascot off, the model descriptions, the quick providers and the peak rate meter with the model picker off, the search box\'s style with the sidebar search off',
      !!off.appearance && JSON.stringify(off.appearance.disabled) === '["brandAccent","chatPet","mascotScope"]' &&
        !!off.composer && JSON.stringify(off.composer.disabled) === '["modelDescriptions","quickProviders","peakrate"]' &&
        !!off.sidebar && JSON.stringify(off.sidebar.disabled) === '["searchStyle"]',
      JSON.stringify(off))
    const unmet = settings.requirementsOff || {}
    check('with the composer restyle off, the model picker with its sub-rows, the permission control and the statistics\' position grey out, the two switches and the position saying what they wait for; with the footer takeover off, the host footer entries stay under their own control',
      !!unmet.composer && JSON.stringify(unmet.composer.disabled) === '["modelPicker","modelDescriptions","quickProviders","peakrate","permissionsControl"]' &&
        JSON.stringify(unmet.composer.notes) === '["modelPicker","permissionsControl"]' &&
        !!unmet.conversation && JSON.stringify(unmet.conversation.disabled) === '["statsPosition","headerBand"]' &&
        JSON.stringify(unmet.conversation.notes) === '["statsPosition","headerBand"]' &&
        !!unmet.sidebar && JSON.stringify(unmet.sidebar.disabled) === '[]' && JSON.stringify(unmet.sidebar.notes) === '[]',
      JSON.stringify(unmet))
    const hero = settings.heroOnly || {}
    check('with the restyle on the home page alone, the picker and the permission control take input and the statistics\' position still waits for a conversation',
      !!hero.composer && JSON.stringify(hero.composer.disabled) === '[]' &&
        !!hero.conversation && JSON.stringify(hero.conversation.disabled) === '["statsPosition","headerBand"]',
      JSON.stringify(hero))
    const link = settings.link || {}
    const mark = settings.mark || {}
    check('the heading carries the plugin\'s repository link, opening in a new tab with an accessible name',
      link.href === 'https://github.com/Zestful-ss/dsh-deepcraft' && link.target === '_blank' &&
        (link.rel || '').includes('noopener') && typeof link.label === 'string' && link.label.length > 0,
      JSON.stringify(link))
    check('the link\'s mark is the inlined asset, painted as a mask in the quiet ink',
      mark.mask.includes('data:image/svg+xml') && mark.size === '16px×16px',
      JSON.stringify(mark))
    commonChecks(r)
  },
  'dock-cards'(r) {
    basicChecks(r)
    const dock = r.dock || {}
    const card = dock.card || {}
    const flush = dock.flush || {}
    const back = dock.back || {}
    const carded = (one) => one.radius === '16px' && parseFloat(one.border) > 0 &&
      one.overflow === 'hidden' && one.shadow !== 'none'
    const flat = (one) => one.margin === '0px' && one.radius === '0px' &&
      parseFloat(one.border) === 0 && one.overflow === 'visible' && one.shadow === 'none'
    check('every docked pane floats as the skin\'s card: 8px inside the column, a hairline, a 16px radius and the host\'s elevation',
      card.look === 'card' && card.empty.margin === '8px' && card.pane.margin === '8px' &&
        carded(card.empty) && carded(card.pane) && carded(card.left) && carded(card.right),
      JSON.stringify(card))
    check('a split comes in toward the seam, and the dock\'s own resting line goes',
      card.left.margin === '6px 3px 6px 6px' && card.right.margin === '6px 6px 6px 3px' && card.divider === 'rgba(0, 0, 0, 0)',
      JSON.stringify({ left: card.left, right: card.right, divider: card.divider }))
    check('switching the cards off leaves every pane in the host\'s own fill, flush with the column, split panes included',
      flush.look === 'flush' && flat(flush.empty) && flat(flush.pane) && flat(flush.left) && flat(flush.right),
      JSON.stringify(flush))
    check('and the dock\'s own resting line is back between the flush panes',
      flush.divider === 'rgb(0, 0, 255)', JSON.stringify(flush.divider))
    check('switching them back on brings the cards back without a reload',
      back.look === 'card' && same(back, card), JSON.stringify(back))
    commonChecks(r)
  },
  switches(r) {
    basicChecks(r)
    const sw = r.switches || {}
    const keys = Object.keys(sw.start || {})
    const present = (marks, key) => !!marks && marks[key] > 0
    check('every switched feature is on by default', keys.length === 5 && keys.every((key) => present(sw.start, key)), JSON.stringify(sw.start))
    for (const step of sw.steps || []) {
      check(`switching ${step.key} off leaves none of its marks and keeps the others`,
        !present(step.off, step.key) && keys.filter((key) => key !== step.key).every((key) => present(step.off, key)),
        JSON.stringify(step.off))
      check(`switching ${step.key} back on brings it back, live`,
        keys.every((key) => present(step.on, key)), JSON.stringify(step.on))
    }
    check('all switches off leave no switched feature on the page',
      !!sw.allOff && keys.every((key) => !present(sw.allOff, key)), JSON.stringify(sw.allOff))
    check('all switches back on bring every feature back', !!sw.allOn && keys.every((key) => present(sw.allOn, key)), JSON.stringify(sw.allOn))
    const rail = sw.rail || {}
    check('the host dropping the section heading takes the workspace control and the archived list off the page with it',
      !!rail.wide && rail.wide.segments > 0 && !!rail.collapsed &&
        rail.collapsed.segments === 0 && rail.collapsed.list === 0,
      JSON.stringify(rail))
    check('the heading coming back seats both in the section again',
      !!rail.back && rail.back.segments > 0 && rail.back.list > 0, JSON.stringify(rail.back))
    commonChecks(r)
  },
  'switches-off'(r) {
    basicChecks(r)
    const sw = r.switches || {}
    const keys = Object.keys(sw.start || {})
    check('a feature switched off before the page loads never installs',
      keys.length === 5 && keys.every((key) => sw.start[key] === 0), JSON.stringify(sw.start))
    check('switching them on installs every one, live',
      !!sw.allOn && keys.every((key) => sw.allOn[key] > 0), JSON.stringify(sw.allOn))
    commonChecks(r)
  },
}
