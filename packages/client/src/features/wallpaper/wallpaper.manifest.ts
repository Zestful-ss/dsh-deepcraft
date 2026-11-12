import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'wallpaper',
  order: 145,
  contracts: [],
  pref: 'wallpaperSource',
  prefValues: ['custom'],
  stylesheets: [
    { file: 'wallpaper-ui.css', rank: 367 },
  ],
  settingsRows: [{
    tab: 'appearance',
    rank: 60,
    pref: 'wallpaperSource',
    control: 'wallpaperSource',
    title: 'wallpaperTitle',
    desc: 'wallpaperDesc',
  }, {
    tab: 'appearance',
    rank: 61,
    pref: 'wallpaperVisibility',
    parent: 'wallpaperSource',
    control: 'wallpaperVisibility',
    title: 'wallpaperVisibilityTitle',
    desc: 'wallpaperVisibilityDesc',
  }, {
    tab: 'appearance',
    rank: 63,
    pref: 'wallpaperBlur',
    parent: 'wallpaperSource',
    control: 'wallpaperBlur',
    title: 'wallpaperBlurTitle',
    desc: 'wallpaperBlurDesc',
  }, {
    tab: 'appearance',
    rank: 64,
    pref: 'wallpaperMotion',
    parent: 'wallpaperSource',
    title: 'wallpaperMotionTitle',
    desc: 'wallpaperMotionDesc',
    choiceLabels: { static: 'wallpaperMotionStatic', dynamic: 'wallpaperMotionDynamic' },
  }, {
    tab: 'appearance',
    rank: 65,
    pref: 'wallpaperLite',
    parent: 'wallpaperSource',
    title: 'wallpaperLiteTitle',
    desc: 'wallpaperLiteDesc',
  }],
  cases: [],
} satisfies FeatureManifest
