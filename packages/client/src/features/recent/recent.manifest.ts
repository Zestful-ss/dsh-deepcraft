import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'recent',
  order: 150,
  contracts: ['shell.sidebar-root', 'workspace.section-label', 'workspace.list-area', 'workspace.tree-row'],
  pref: 'recentSessions',
  stylesheets: [{ file: 'recent.css', rank: 126 }],
  settingsRows: [{
    tab: 'general',
    rank: 40,
    pref: 'recentSessions',
    title: 'recentTitle',
    desc: 'recentDesc',
  }],
  cases: [],
} satisfies FeatureManifest
