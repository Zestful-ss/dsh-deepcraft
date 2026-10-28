import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'subagentModel',
  order: 85,
  contracts: [],
  pref: 'subagentModelPicker',
  stylesheets: [{ file: 'subagent-model.css', rank: 268 }],
  settingsRows: [{
    // The entry is the reader's way to route one session's subagents; the rule
    // it feeds is the host half's, and stands on its own switch (rank 55).
    tab: 'composer',
    rank: 40,
    pref: 'subagentModelPicker',
    title: 'pickerTitle',
    desc: 'pickerDesc',
  }],
  cases: ['subagent-model'],
} satisfies FeatureManifest
