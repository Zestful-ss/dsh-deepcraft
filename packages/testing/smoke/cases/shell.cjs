'use strict'
const { check, basicChecks, commonChecks } = require('./_shared.cjs')

/** The shell surfaces a wallpaper plugin shows through, and what the warm palette paints them */
const EMBER_SHELL = ['body', 'sidebar', 'conversation']
const EMBER_FILLS = [['body', 'rgb(252, 252, 251)'], ['sidebar', 'rgb(251, 251, 249)'], ['conversation', 'rgb(252, 252, 251)']]

module.exports = {
  // The three font roles: bundled choices, host leave-alone, and a custom list.
  fonts(r) {
    basicChecks(r)
    const f = r.fonts || {}
    const theme = f.theme || {}
    const host = f.host || {}
    const custom = f.custom || {}
    check('the bundled choices reach the interface, prose and code tokens',
      theme.family.includes('DeepCraft Geist Sans') && theme.prose.includes('DeepCraft Literata') &&
        theme.code.includes('DeepCraft Fira Code') &&
        theme.markdown.includes('DeepCraft Literata') && theme.codeText.includes('DeepCraft Fira Code'),
      JSON.stringify(theme))
    check('host leaves the host\'s own interface and code tokens, and prose follows them',
      host.family === '"Host Sans", sans-serif' && host.code === '"Host Mono", monospace' &&
        host.markdown === '"Host Sans", sans-serif' && host.codeText === '"Host Mono", monospace',
      JSON.stringify(host))
    check('a custom list is quoted, keeps CSS generics, and ends in the role fallback',
      custom.family.includes('"Fira Sans", monospace') && custom.markdown.includes('"Fira Sans", monospace'),
      JSON.stringify(custom))
    commonChecks(r)
  },
  // The skin's three palettes (D80): each one's canvases, accents and computed
  // primary button fills.
  palette(r) {
    basicChecks(r)
    const palettes = r.palettes || {}
    const EXPECTED = [
      ['ocean', { light: 'rgb(252, 252, 251)', dark: 'rgb(32, 36, 39)', accent: '#5368c9', button: 'rgb(83, 104, 201)', raised: '#2b3038' }],
      ['ember', { light: 'rgb(252, 252, 251)', dark: 'rgb(20, 20, 19)', accent: '#d97757', button: 'rgb(217, 119, 87)', raised: '#1e1e1d' }],
      ['forest', { light: 'rgb(252, 252, 251)', dark: 'rgb(20, 20, 19)', accent: '#397657', button: 'rgb(57, 118, 87)', raised: '#1e1e1d' }],
    ]
    for (const [id, want] of EXPECTED) {
      const palette = palettes[id] || {}
      const dark = palette.dark || {}
      check(`${id}: the palette has its own canvases, accent and button fill in light and dark`,
        palette.canvas === want.light && palette.accent === want.accent && dark.canvas === want.dark &&
          dark.accent === want.accent && dark.buttonFill === want.button,
        JSON.stringify({ light: { canvas: palette.canvas, accent: palette.accent, button: palette.buttonFill }, dark: { canvas: dark.canvas, accent: dark.accent, button: dark.buttonFill } }))
      check(`${id}: the dark canvas keeps the palette's own raised surface`, dark.raised === want.raised, JSON.stringify(dark))
    }
    commonChecks(r)
  },
  // The custom brand over a skin palette (D80): both images painted where the
  // default identity's art stood, the text-colour ink and the accent once the
  // preferences ask for them, and the brand's own accent back once it is cleared.
  'custom-brand'(r) {
    basicChecks(r)
    const brand = r.customBrand || {}
    const images = brand.images || {}
    const markUrl = '/dsh-deepcraft/brand/mark?v=1-1'
    const wordUrl = '/dsh-deepcraft/brand/wordmark?v=1-1'
    check('the mark the host half holds replaces the brand\'s art in the sidebar and on the hero',
      images.markAttr === '' && images.hostArt === 'none' &&
        images.mark.image.includes(markUrl) && images.mark.mask === 'none' && images.mark.width === '18px' &&
        images.hero.image.includes(markUrl) && images.hero.width === '42.5px',
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
      tinted.accent === '#1a7f5a' && tinted.accentInk === '#faf9f5',
      JSON.stringify({ accent: tinted.accent, ink: tinted.accentInk }))
    const forestTinted = brand.forestTinted || {}
    check('a custom accent remains in force when switching to another skin palette',
      forestTinted.accent === '#1a7f5a' && forestTinted.buttonFill === 'rgb(26, 127, 90)',
      JSON.stringify(forestTinted))
    const cleared = brand.cleared || {}
    check('clearing the accent hands the brand\'s own accent back, and the images return to their own colours',
      cleared.accent === '#d97757' && cleared.tintAttr === null && cleared.mark.image.includes(markUrl),
      JSON.stringify(cleared))
    check('teardown takes the custom brand\'s values off <body>',
      Array.isArray(r.leftBrandProperties) && r.leftBrandProperties.length === 0, JSON.stringify(r.leftBrandProperties))
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
      host.popover === 'rgb(240, 241, 250)' && /blur\(16px\)/.test(host.popoverBlur || ''),
      JSON.stringify(host))
    check('the host\'s own type reaches every element the skin does not set a family on',
      host.heading === '"Host Sans", sans-serif', JSON.stringify(host.heading))
    const wall = hp.wallpaper || {}
    check('a wallpaper plugin\'s cleared canvas and glass reach the sidebar and the cards',
      wall.sidebar === 'rgba(0, 0, 0, 0)' && wall.popover === 'rgba(255, 255, 255, 0.6)' && wall.body === 'rgba(0, 0, 0, 0)',
      JSON.stringify(wall))
    const ember = hp.ember || {}
    check('back on the warm palette the skin\'s colours and faces return',
      ember.base === '#fcfcfb' && ember.body === 'rgb(252, 252, 251)' && ember.popover === 'rgb(255, 255, 255)',
      JSON.stringify(ember))
    // A wallpaper under the warm palette. The shell canvases stand down and
    // one fixed mask in the canvas colour lies over the wallpaper; the base
    // canvas the host paints its dialogs and cards with stays opaque. Taking
    // the marker away brings the fills back and lifts the mask. The document
    // element's canvas stays behind the layer.
    const wallEmber = hp.emberWallpaper || {}
    check('with a skin palette and a wallpaper up the shell stands down under one mask',
      EMBER_SHELL.every((key) => wallEmber[key] === 'rgba(0, 0, 0, 0)') && wallEmber.sidebarFill === 'transparent' &&
        wallEmber.maskPosition === 'fixed' && /^color\(srgb 0\.98\d* 0\.98\d* 0\.98\d* \/ 0\.86\)$/.test(wallEmber.mask || '') &&
        wallEmber.html === 'rgb(252, 252, 251)',
      JSON.stringify(wallEmber))
    check('and the base canvas keeps its fill',
      wallEmber.base === '#fcfcfb' && wallEmber.popover === ember.popover,
      JSON.stringify({ wallpaper: wallEmber, ember }))
    check('with the wallpaper gone the skin\'s own fills are back and the mask is lifted',
      EMBER_FILLS.every(([key, value]) => ember[key] === value) && ember.sidebarFill === '#fbfbf9' &&
        ember.mask === 'rgba(0, 0, 0, 0)',
      JSON.stringify(ember))
    commonChecks(r)
  },
}
