import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'settings',
  handle: 'settingsNav',
  order: 260,
  load: 'deferred',
  contracts: ['shell.account-trigger', 'shell.dark-theme', 'shell.foot-area', 'shell.menu', 'shell.settings-button'],
  ungated: '设置页本身，以及随它一起装上的主题翻转抑制',
  stylesheets: [
    { file: 'settings.css', rank: 310 },
    { file: 'theme-flip.css', rank: 370 },
  ],
  cases: ['settings', 'late-forms', 'host-palette', 'fonts', 'skin-center-handoff', 'skin-center-arrival']
} satisfies FeatureManifest
