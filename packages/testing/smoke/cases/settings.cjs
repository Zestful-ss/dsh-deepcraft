'use strict'
const { check, basicChecks, commonChecks } = require('./_shared.cjs')

module.exports = {
  'late-forms'(r) {
    check('apply() completes', r.applyError === null, r.applyError)
    check('the store stays on the shipped palette until the namespace is served',
      r.lateBefore === 'ocean', JSON.stringify(r.lateBefore))
    check('a namespace served after apply still binds the form and its value',
      r.lateAfter === 'forest',
      JSON.stringify({ after: r.lateAfter }))
    commonChecks(r)
  },
  settings(r) {
    basicChecks(r)
    const settings = r.settings || {}
    check('the settings section registers with the settings dialog', settings.registered === true, JSON.stringify(settings.registered))
    const expected = {
      general: { rows: ['recentSessions', 'subagentModelPicker', 'subagentModelChoice'], disabled: [] },
      appearance: {
        rows: ['palette', 'brandAccent', 'fontUi', 'fontProse', 'fontCode', 'motion', 'mascot', 'chatPet', 'mascotScope', 'materialRadius', 'materialShadow', 'materialMotion', 'materialGlass', 'materialAmbient', 'brandName', 'brandMark', 'brandWordmark', 'brandInk', 'wallpaperSource', 'wallpaperVisibility', 'wallpaperBlur', 'wallpaperMotion', 'wallpaperLite'],
        // The wallpaper children grey out until the source is `custom`.
        disabled: ['wallpaperVisibility', 'wallpaperBlur', 'wallpaperMotion', 'wallpaperLite'],
      },
    }
    const pages = settings.pages || {}
    for (const tab of Object.keys(expected)) {
      const page = pages[tab] || {}
      check(`the ${tab} tab is selected in the two-tab strip and carries its rows`,
        JSON.stringify(page.tabs) === JSON.stringify(Object.keys(expected)) && page.selected === tab &&
          JSON.stringify(page.rows) === JSON.stringify(expected[tab].rows) &&
          JSON.stringify(page.disabled || []) === JSON.stringify(expected[tab].disabled) &&
          JSON.stringify(page.notes || []) === '[]',
        JSON.stringify(page))
    }
    const off = settings.parentsOff || {}
    check('a sub-row greys out while its parent is off: the accent, the pet, its scope and the wallpaper controls',
      !!off.appearance && JSON.stringify(off.appearance.disabled) === '["brandAccent","chatPet","mascotScope","wallpaperVisibility","wallpaperBlur","wallpaperMotion","wallpaperLite"]',
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
}
