import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'workspacePins',
  order: 155,
  contracts: ['shell.sidebar-root', 'workspace.section-label', 'workspace.list-area', 'workspace.tree-row'],
  ungated: '置顶汇总跟随宿主置顶状态',
  stylesheets: [{ file: 'workspace-pins.css', rank: 125 }],
  cases: []
} satisfies FeatureManifest
