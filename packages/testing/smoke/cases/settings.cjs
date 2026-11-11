'use strict'
const { BAND_ANIMATION, same, check, basicChecks, commonChecks } = require('./_shared.cjs')

module.exports = {
  'late-forms'(r) {
    check('apply() completes', r.applyError === null, r.applyError)
    check('the store stays on the shipped default until the namespace is served',
      r.lateBefore === 'context', JSON.stringify(r.lateBefore))
    check('a namespace served after apply still binds the form and its value',
      r.lateAfter === 'context' && r.statsPositionAttr === 'context',
      JSON.stringify({ after: r.lateAfter, final: r.statsPositionAttr }))
    commonChecks(r)
  },
  settings(r) {
    basicChecks(r)
    const settings = r.settings || {}
    check('the settings section registers with the settings dialog', settings.registered === true, JSON.stringify(settings.registered))
    const expected = {
      general: ['username', 'autoPopover', 'subagentModelPicker', 'subagentModelChoice'],
      appearance: ['palette', 'brandAccent', 'typeface', 'motion', 'homeRipple', 'mascot', 'chatPet', 'mascotScope', 'brandName', 'brandMark', 'brandWordmark', 'brandInk'],
      sidebar: ['sidebarSearch', 'searchStyle'],
      conversation: ['chatAnimations', 'chatWait', 'statusDetail', 'turnNav', 'statsPosition', 'viewTabs', 'headerBand'],
    }
    // band waits for the Windows desktop window.
    const expectedGrey = { conversation: ['headerBand'] }
    const pages = settings.pages || {}
    for (const tab of Object.keys(expected)) {
      const page = pages[tab] || {}
      check(`the ${tab} tab is selected in the four-tab strip and carries its rows, greying only the rows that wait for something`,
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
    check('a sub-row greys out while its parent is off: the accent colour with the colours following the host, the mascot\'s place with the mascot off, the search box\'s style with the sidebar search off',
      !!off.appearance && JSON.stringify(off.appearance.disabled) === '["brandAccent","chatPet","mascotScope"]' &&
        !!off.sidebar && JSON.stringify(off.sidebar.disabled) === '["searchStyle"]',
      JSON.stringify(off))
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
  switches(r) {
    basicChecks(r)
    const sw = r.switches || {}
    const keys = Object.keys(sw.start || {})
    const present = (marks, key) => !!marks && marks[key] > 0
    check('every switched feature is on by default', keys.length === 2 && keys.every((key) => present(sw.start, key)), JSON.stringify(sw.start))
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
    commonChecks(r)
  },
  'switches-off'(r) {
    basicChecks(r)
    const sw = r.switches || {}
    const keys = Object.keys(sw.start || {})
    check('a feature switched off before the page loads never installs',
      keys.length === 2 && keys.every((key) => sw.start[key] === 0), JSON.stringify(sw.start))
    check('switching them on installs every one, live',
      !!sw.allOn && keys.every((key) => sw.allOn[key] > 0), JSON.stringify(sw.allOn))
    commonChecks(r)
  },
}
