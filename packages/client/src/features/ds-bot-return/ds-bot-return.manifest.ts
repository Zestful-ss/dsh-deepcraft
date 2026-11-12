import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'dsBotReturn',
  order: 20,
  contracts: ['ds-bot.account', 'ds-bot.account-menu', 'ds-bot.foot', 'ds-bot.saved-mode', 'ds-bot.set-row', 'ds-bot.settings-layer', 'ds-bot.soft-button'],
  ungated: 'Bot 面回主题的入口；只在 ds-bot 占着页面且它的侧栏页脚在页面上时出现（D82）',
  stylesheets: [],
  cases: []
} satisfies FeatureManifest
