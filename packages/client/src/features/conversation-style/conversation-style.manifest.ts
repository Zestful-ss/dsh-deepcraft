import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'conversationStyle',
  order: 185,
  contracts: [
    'chat.flow', 'chat.flow-block', 'chat.running', 'chat.scroller', 'chat.tool-call-kind',
    'chat.user-row', 'chat.user-kind', 'composer.card', 'composer.scroll', 'composer.seat',
    'composer.stack', 'composer.variant', 'shell.phase', 'shell.slot-anchor',
  ],
  ungated: 'The reading layout is the only conversation layout.',
  stylesheets: [
    { file: 'conversation-style.css', rank: 390 },
    { file: 'conversation-composer.css', rank: 395, gate: true },
    { file: 'conversation-hero.css', rank: 396, gate: true },
  ],
  cases: ['settings', 'composer', 'hero'],
} satisfies FeatureManifest
