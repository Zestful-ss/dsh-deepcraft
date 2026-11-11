import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'subagentModel',
  order: 85,
  contracts: ['composer.model-slot', 'composer.right-slot'],
  pref: 'subagentModelPicker',
  stylesheets: [{ file: 'subagent-model.css', rank: 268 }],
  cases: ['subagent-model'],
} satisfies FeatureManifest
