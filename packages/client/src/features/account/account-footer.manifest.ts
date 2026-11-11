import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'footer',
  order: 120,
  contracts: ['shell.account-trigger', 'shell.foot-area', 'shell.menu', 'shell.menu-list', 'shell.settings-button'],
  ungated: "The footer takeover is the sidebar footer's only look now.",
  stylesheets: [
    { file: 'account-footer.css', rank: 240 },
    { file: 'footer-takeover.css', rank: 290 },
  ],
  cases: ['account', 'desktop', 'markup', 'install-fault']
} satisfies FeatureManifest
