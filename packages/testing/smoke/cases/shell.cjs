'use strict'
const { same, check, basicChecks, commonChecks } = require('./_shared.cjs')

/** The shell surfaces a wallpaper plugin shows through, and what the warm palette paints them */
const EMBER_SHELL = ['body', 'sidebar', 'conversation']
const EMBER_FILLS = [['body', 'rgb(252, 252, 251)'], ['sidebar', 'rgb(251, 251, 249)'], ['conversation', 'rgb(252, 252, 251)']]

module.exports = {
  // The skin's three palettes (D80): each one's canvases, accents, computed
  // primary button fills, prose links, inline file mentions, and the ripple wave.
  palette(r) {
    basicChecks(r)
    const palettes = r.palettes || {}
    const EXPECTED = [
      ['ocean', { light: 'rgb(252, 252, 251)', dark: 'rgb(32, 36, 39)', accent: '#5368c9', button: 'rgb(83, 104, 201)', prose: 'rgb(62, 91, 214)', darkProse: 'rgb(142, 162, 242)', wave: '#5f73d9', darkWave: '#8ea2f2', raised: '#2b3038' }],
      ['ember', { light: 'rgb(252, 252, 251)', dark: 'rgb(20, 20, 19)', accent: '#d97757', button: 'rgb(217, 119, 87)', prose: 'rgb(61, 95, 134)', darkProse: 'rgb(169, 194, 223)', wave: '#c6613f', darkWave: '#e08a6d', raised: '#1e1e1d' }],
      ['forest', { light: 'rgb(252, 252, 251)', dark: 'rgb(20, 20, 19)', accent: '#397657', button: 'rgb(57, 118, 87)', prose: 'rgb(40, 102, 73)', darkProse: 'rgb(134, 197, 162)', wave: '#286649', darkWave: '#86c5a2', raised: '#1e1e1d' }],
    ]
    for (const [id, want] of EXPECTED) {
      const palette = palettes[id] || {}
      const dark = palette.dark || {}
      check(`${id}: the palette has its own canvases, accent and button fill in light and dark`,
        palette.canvas === want.light && palette.accent === want.accent && dark.canvas === want.dark &&
          dark.accent === want.accent && dark.buttonFill === want.button,
        JSON.stringify({ light: { canvas: palette.canvas, accent: palette.accent, button: palette.buttonFill }, dark: { canvas: dark.canvas, accent: dark.accent, button: dark.buttonFill } }))
      check(`${id}: prose links and file mentions take the palette's own hue in light and dark`,
        palette.proseLink === want.prose && palette.mention === palette.proseLink &&
          dark.proseLink === want.darkProse && dark.mention === dark.proseLink,
        JSON.stringify({ light: { prose: palette.proseLink, mention: palette.mention }, dark: { prose: dark.proseLink, mention: dark.mention } }))
      check(`${id}: the ripple wave follows the palette`,
        palette.wave === want.wave && dark.wave === want.darkWave,
        JSON.stringify({ light: { wave: palette.wave }, dark: { wave: dark.wave } }))
      check(`${id}: the dark canvas keeps the palette's own raised surface`, dark.raised === want.raised, JSON.stringify(dark))
    }
    commonChecks(r)
  },
  // The custom brand over a skin palette (D80): both images painted where the
  // default identity's art stood, the text-colour ink and the accent once the preferences
  // ask for them, and the brand's own accent back once it is cleared.
  'custom-brand'(r) {
    basicChecks(r)
    const brand = r.customBrand || {}
    const images = brand.images || {}
    const markUrl = '/dsh-deepcraft/brand/mark?v=1-1'
    const wordUrl = '/dsh-deepcraft/brand/wordmark?v=1-1'
    check('the mark the host half holds replaces the brand\'s art in the sidebar, on the hero and as the account row\'s fallback picture',
      images.markAttr === '' && images.hostArt === 'none' &&
        images.mark.image.includes(markUrl) && images.mark.mask === 'none' && images.mark.width === '18px' &&
        images.hero.image.includes(markUrl) && images.hero.width === '42.5px' &&
        typeof images.avatar === 'string' && images.avatar.includes(markUrl),
      JSON.stringify(images))
    check('the wordmark replaces the brand name at the 18px cap height, its width read from the image\'s 4:1 proportions',
      images.wordAttr === 'image' && images.hostWord === 'none' &&
        images.word.image.includes(wordUrl) && images.word.width === '72px' && images.word.height === '18px',
      JSON.stringify(images.word))
    const tinted = brand.tinted || {}
    check('the text-colour choice paints the mark as a shape in the label colour, and the wordmark still outranks a brand name',
      tinted.tintAttr === '' && tinted.mark.image === 'none' && tinted.mark.mask.includes(markUrl) &&
        tinted.mark.fill !== 'rgba(0, 0, 0, 0)' && tinted.wordAttr === 'image',
      JSON.stringify(tinted))
    check('a custom accent takes the accent tokens, with the light ink on a dark fill',
      tinted.accent === '#1a7f5a' && tinted.accentInk === '#faf9f5' && tinted.wave === '#1a7f5a',
      JSON.stringify({ accent: tinted.accent, ink: tinted.accentInk, wave: tinted.wave }))
    const forestTinted = brand.forestTinted || {}
    check('a custom accent remains in force when switching to another skin palette',
      forestTinted.accent === '#1a7f5a' && forestTinted.wave === '#1a7f5a' && forestTinted.buttonFill === 'rgb(26, 127, 90)',
      JSON.stringify(forestTinted))
    const cleared = brand.cleared || {}
    check('clearing the accent hands the brand\'s own accent back, and the images return to their own colours',
      cleared.accent === '#d97757' && cleared.tintAttr === null && cleared.mark.image.includes(markUrl) &&
        cleared.wave === '#c6613f',
      JSON.stringify(cleared))
    check('teardown takes the custom brand\'s values off <body>',
      Array.isArray(r.leftBrandProperties) && r.leftBrandProperties.length === 0, JSON.stringify(r.leftBrandProperties))
    commonChecks(r)
  },
  // The hero page's own extras: the crab on its card, and the glyph field its
  // switch mounts under the hero root's content.
  hero(r) {
    basicChecks(r)
    check('the hero page carries the crab', r.classicCrab === true, JSON.stringify(r.classicCrab))
    const ripple = r.ripple || {}
    check('the glyph field is off until its switch turns it on', ripple.off === true, JSON.stringify(ripple.off))
    check('the hero root carries the glyph field\'s canvas, under its content and taking no press',
      ripple.stamped === true && ripple.canvas === true && ripple.pointerEvents === 'none' && ripple.order === '-1', JSON.stringify(ripple))
    check('the glyph field\'s switch takes the canvas off the hero root, and putting it back mounts it again',
      ripple.gone === true && ripple.back === true, JSON.stringify({ gone: ripple.gone, back: ripple.back }))
    commonChecks(r)
  },
  // The conversation header's tab strip: the pill is drawn under the active tab
  // without sliding in, slides to the tab a switch selects, and the teardown
  // takes it back off.
  'view-tabs'(r) {
    basicChecks(r)
    const pill = r.viewPill || {}
    const under = (s) => !!s && s.attr && s.content !== 'none' && Math.abs(s.x - s.itemX) < 0.5 &&
      Math.abs(s.w - s.itemW) < 0.5 && s.itemFill === 'rgba(0, 0, 0, 0)'
    check('the conversation header\'s tab strip is stamped for the stylesheet', pill.stamped === true, JSON.stringify(pill.stamped))
    // The host decides which views sit in the row from the row's own width
    // (0.2.1-rc.3): a strip that hugs its tabs narrows that input and pushes
    // every view but the first into More.
    check('the tab row keeps the host\'s width, so every view fits in the row the host counts from',
      pill.tabs >= 4 && pill.row >= pill.host * 0.9 && pill.capacity >= pill.tabs,
      JSON.stringify({ row: pill.row, host: pill.host, tabs: pill.tabs, capacity: pill.capacity }))
    check('the view tabs draw their pill under the active tab without sliding in',
      under(pill.first) && pill.first.slides.length === 0, JSON.stringify(pill.first))
    check('a view switch slides the pill to the newly active tab',
      under(pill.switched) && pill.switched.slides.indexOf('transform') !== -1 && pill.switched.x > pill.first.x,
      JSON.stringify(pill.switched), 'timing')
    check('the pill slides whatever the system motion setting: no reduced-motion rule reaches it',
      pill.reducedMotionRules === 0, `${pill.reducedMotionRules} rules`)
    check('teardown takes the pill, its placement and the strip stamp off the view tabs', pill.left === false, JSON.stringify(pill.left))
    commonChecks(r)
  },
  // The header band: the conversation's title and the header's control clusters
  // in the desktop caption row, and the row they leave behind.
  'header-band'(r) {
    basicChecks(r)
    const b = r.band || {}
    const laid = b.laid || {}
    const marks = laid.marks || {}
    const right = b.viewportRight - (b.controls + b.air)
    /** The caption row's own middle for a 28px box; the title sits the skin's optical drop below it. */
    const middle = Math.round((b.band - 28) / 2)
    const top = middle + b.titleDrop
    // Where the row sits with the lift taken back out: the header's own inset.
    const naturalRow = laid.row.y - parseFloat(laid.rowLift || '0')
    check('the caption row takes both sides: the title at the row\'s left, the two control clusters against the caption buttons',
      marks.band === 'title actions' && marks.title === true && marks.utilities === true && marks.corner === true &&
        laid.title.x === laid.row.x && laid.title.y === top &&
        laid.utilities.y === middle && laid.corner.right === right && laid.corner.y === middle &&
        laid.utilities.right === laid.corner.x - b.air,
      JSON.stringify(laid))
    check('the pieces placed there are fixed, stacked over the page and clickable inside the shell\'s drag region',
      laid.titlePosition === 'fixed' && laid.titleZ === '30' &&
        laid.titleRegion === 'no-drag' && laid.utilitiesRegion === 'no-drag' && laid.cornerRegion === 'no-drag',
      JSON.stringify({ position: laid.titlePosition, z: laid.titleZ, regions: [laid.titleRegion, laid.utilitiesRegion, laid.cornerRegion] }))
    check('the title is handed the room left between its own edge and the controls once the strip\'s width is reserved, and the row it left tucks under it',
      laid.titleLeft === laid.row.x + 'px' &&
        laid.titleMax === laid.utilities.x - b.air - ((laid.strip.right - laid.strip.x) + b.air) - laid.title.x + 'px' &&
        laid.row.y === laid.title.y + 28 - b.tuck && laid.rowPosition === 'relative' && laid.rowOffset === laid.rowLift &&
        laid.row.y === laid.rowLift.replace('px', '') * 1 + laid.header.y + parseFloat(laid.headerPaddingTop) &&
        laid.preset.x === laid.row.x,
      JSON.stringify({ left: laid.titleLeft, max: laid.titleMax, lift: laid.rowLift, offset: laid.rowOffset, row: laid.row, header: laid.header, preset: laid.preset, utilities: laid.utilities, strip: laid.strip }))
    const panelClosed = b.panelClosed || {}
    check('the right panel\'s collapse control is the skin\'s own, drawn in the header\'s row: it shows while the panel is open, the panel\'s copy stands down, and it hides with the panel',
      laid.closeInline === 'inline-flex' && laid.closeShown !== 'none' &&
        laid.hostToggleDisplay === 'none' && panelClosed.close === 'none',
      JSON.stringify({ laid: { close: laid.closeInline, shown: laid.closeShown, host: laid.hostToggleDisplay }, closed: panelClosed }))
    const solo = b.solo || {}
    check('with the corner seat empty — the right sidebar is open — the cluster that is there still lifts, into the corner\'s own place',
      solo.marks.band === 'title actions' && solo.marks.corner === false && solo.utilities.right === right,
      JSON.stringify(solo))
    const tight = b.tight || {}
    check('when the shell\'s own seat takes the row\'s left end, both sides stay in the header\'s row: no marker, no stamp, the row back at its own inset',
      tight.marks.band === null && tight.marks.row === false && tight.marks.title === false &&
        tight.marks.utilities === false && tight.marks.corner === false &&
        tight.row.y === naturalRow && tight.title.y > b.band && tight.utilities.y > b.band,
      JSON.stringify({ tight: tight, natural: naturalRow }))
    const off = b.off || {}
    const back = b.back || {}
    check('switching the feature off hands the row back whole — the strip the other feature placed stays — and switching it on places both sides again',
      off.marks.band === null && off.marks.title === false && off.marks.utilities === false && off.marks.corner === false &&
        off.stripStamped === true &&
        back.marks.band === 'title actions' && back.marks.title === true && back.marks.utilities === true,
      JSON.stringify({ off: off, back: back }))
    const left = b.left || {}
    check('taking the desktop shell\'s marker away leaves no band marker and no stamps behind',
      left.band === null && left.row === false && left.title === false && left.utilities === false && left.corner === false,
      JSON.stringify(left))
    commonChecks(r)
  },
  // The sidebar's search box: placed by the style preference — in the brand
  // row resting hidden, in a row of its own below it, or not drawn at all
  // while the host's own button stands — and opening the host's modal through
  // a root of the skin's own.
  search(r) {
    basicChecks(r)
    const search = r.search || {}
    check('the search box goes in the brand row beside the brand, and rests hidden until the sidebar is hovered',
      search.placed === true && search.rowMarked === true && search.resting === 'hidden', JSON.stringify(search))
    check('pressing the search box renders the host modal through a root of the skin\'s own', search.modalRendered === true, JSON.stringify(search))
    const standalone = search.standalone || {}
    check('the Standalone style gives the box a row of its own under the brand row, shown without a hover, and the brand row keeps the host\'s layout',
      standalone.barAfterRow === true && standalone.triggerInBar === true && standalone.triggerVisibility === 'visible' &&
        standalone.rowMarked === false && standalone.hostSlotPosition === 'absolute',
      JSON.stringify(standalone))
    // The rows under it span the column's own padding, so the box's border has
    // to stand on those two edges: its row may add no inline padding of its own.
    check('the Standalone box is exactly as wide as the rows under it',
      standalone.boxWidth !== null && standalone.boxWidth === standalone.barWidth && standalone.boxWidth > 0,
      JSON.stringify({ boxWidth: standalone.boxWidth, barWidth: standalone.barWidth }))
    const icon = search.icon || {}
    check('the Icon style draws no box of the skin\'s, puts the host\'s own search slot back in the header, and takes its click over',
      icon.triggerInRow === false && icon.rowMarked === false && icon.barAfterRow === false &&
        icon.hostSlotPosition !== 'absolute' && icon.hostSlotWidth > 10 && icon.hostClicksReachingHost === 0,
      JSON.stringify(icon))
    const back = search.back || {}
    check('switching the style back to Cover the brand seats the box in the brand row again, live',
      back.triggerInRow === true && back.rowMarked === true && back.triggerVisibility === 'hidden' && back.hostSlotPosition === 'absolute',
      JSON.stringify(back))
    // The New session row carries the same host markup the box's own caps are
    // cut for; both are read field by field, so the hints cannot drift apart.
    const caps = search.keycaps || {}
    const cap = Array.isArray(caps.search) && caps.search.length === 1 ? caps.search[0] : null
    check('the New session row wears the search box\'s own key caps, and the `+` between them is gone',
      cap !== null && Array.isArray(caps.shortcut) && caps.shortcut.length === 2 &&
        caps.shortcut.every((entry) => same(entry, cap)) &&
        caps.separators.length === 1 && caps.separators.every((display) => display === 'none'),
      JSON.stringify(caps))
    check('teardown takes the search box, its row mark and its root away',
      search.left === 0 && search.rootUnmounted === true, JSON.stringify(search))
    commonChecks(r)
  },
  // The account row's self-built drawer: the header, the plugin rows, the
  // settings row, the nickname and the avatar.
  account(r) {
    basicChecks(r)
    check('synthetic path: the popover carries the header and the settings row',
      r.drawer !== null && same(r.drawer, ['settings']) && r.syntheticHeader === true,
      JSON.stringify({ drawer: r.drawer, header: r.syntheticHeader }))
    check('synthetic path injects nothing into a host menu', r.syntheticInject === 0, `${r.syntheticInject} containers`)
    check('a custom nickname outranks the signed-in profile', r.accountUser === 'Tester', JSON.stringify(r.accountUser))
    check('avatar is an <img> sent without a referrer', r.photo !== null && r.photo.referrerPolicy === 'no-referrer', JSON.stringify(r.photo))
    check('the self-built drawer matches the account row box',
      r.syntheticBox !== null && r.syntheticBox.popoverLeft === r.syntheticBox.buttonLeft &&
        r.syntheticBox.popoverWidth === r.syntheticBox.buttonWidth,
      JSON.stringify(r.syntheticBox))
    check('the closed drawer takes its parked rows out of the paint tree',
      r.syntheticVisibility === 'hidden' && r.syntheticRowVisibility === 'hidden',
      JSON.stringify({ panel: r.syntheticVisibility, row: r.syntheticRowVisibility }))
    commonChecks(r)
  },
  popovers(r) {
    basicChecks(r)
    check('a pointer crossing the drawer\'s trigger opens nothing before the dwell elapses',
      r.drawerOpenAtDwell === 0, `${r.drawerOpenAtDwell} open at 50 ms`)
    check('a pointer that stays the dwell out opens the drawer',
      r.drawerOpenPastDwell === 1, `${r.drawerOpenPastDwell} open past the dwell`)
    check('with the hover preference on, a press on the open drawer keeps it open',
      r.drawerAfterPress === 1 && r.drawerOpenAttrAfterPress === 'true',
      JSON.stringify({ open: r.drawerAfterPress, marker: r.drawerOpenAttrAfterPress }))
    check('leaving every trigger leaves no card up',
      r.cardsLeftAfterLeave === 0, `${r.cardsLeftAfterLeave} open`)
    commonChecks(r)
  },
  'host-palette'(r) {
    basicChecks(r)
    const hp = r.hostPalette || {}
    const host = hp.host || {}
    check('under the host\'s colours and type the skin writes none of the host\'s tokens',
      host.base === 'rgb(250, 250, 252)' && host.family === '"Host Sans", sans-serif', JSON.stringify(host))
    check('and paints none of the host\'s frame: the sidebar keeps the host\'s fill, the conversation column and the canvases stay unpainted',
      host.sidebar === 'rgb(244, 245, 250)' && host.conversation === 'rgba(0, 0, 0, 0)' &&
        host.body === 'rgba(0, 0, 0, 0)' && host.html === 'rgba(0, 0, 0, 0)',
      JSON.stringify(host))
    check('the skin\'s own cards take the host\'s overlay layer, blurred behind',
      host.popover === 'rgb(240, 241, 250)' && host.account === 'rgb(240, 241, 250)' && host.search === 'rgb(240, 241, 250)' &&
        /blur\(16px\)/.test(host.popoverBlur || ''),
      JSON.stringify(host))
    check('the skin\'s display and code faces fall back to the host\'s',
      host.heading === '"Host Sans", sans-serif' && host.code === '"Host Mono", monospace', JSON.stringify(host))
    const wall = hp.wallpaper || {}
    check('a wallpaper plugin\'s cleared canvas and glass reach the sidebar and the cards',
      wall.sidebar === 'rgba(0, 0, 0, 0)' && wall.popover === 'rgba(255, 255, 255, 0.6)' &&
        wall.account === 'rgba(255, 255, 255, 0.6)' && wall.body === 'rgba(0, 0, 0, 0)',
      JSON.stringify(wall))
    const ember = hp.ember || {}
    check('back on the warm palette the skin\'s colours and faces return',
      ember.base === '#fcfcfb' && ember.body === 'rgb(252, 252, 251)' && ember.account === 'rgb(252, 252, 251)' &&
        ember.popover === 'rgb(255, 255, 255)' && /Anthropic Serif Web Text/.test(ember.heading || ''),
      JSON.stringify(ember))
    // A wallpaper under the warm palette. The shell canvases stand down and
    // one fixed mask in the canvas colour lies over the wallpaper; the base
    // canvas the host paints its dialogs and cards with stays opaque, and so do
    // the skin's own faces. Taking the marker away brings the fills back and
    // lifts the mask. The document element's canvas stays behind the layer.
    const wallEmber = hp.emberWallpaper || {}
    check('with a skin palette and a wallpaper up the shell stands down under one mask',
      EMBER_SHELL.every((key) => wallEmber[key] === 'rgba(0, 0, 0, 0)') && wallEmber.sidebarFill === 'transparent' &&
        wallEmber.maskPosition === 'fixed' && /^color\(srgb 0\.98\d* 0\.98\d* 0\.98\d* \/ 0\.86\)$/.test(wallEmber.mask || '') &&
        wallEmber.html === 'rgb(252, 252, 251)',
      JSON.stringify(wallEmber))
    check('and the base canvas and the skin\'s own faces keep their fill',
      wallEmber.base === '#fcfcfb' && wallEmber.popover === ember.popover && wallEmber.account === ember.account &&
        wallEmber.search === ember.search,
      JSON.stringify({ wallpaper: wallEmber, ember }))
    check('with the wallpaper gone the skin\'s own fills are back and the mask is lifted',
      EMBER_FILLS.every(([key, value]) => ember[key] === value) && ember.sidebarFill === '#fbfbf9' &&
        ember.mask === 'rgba(0, 0, 0, 0)',
      JSON.stringify(ember))
    commonChecks(r)
  },
}
