import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'conversationStyle',
  order: 185,
  contracts: [
    'chat.flow', 'chat.flow-block', 'chat.running', 'chat.scroller', 'chat.tool-call-kind',
    'chat.user-row', 'chat.user-kind', 'composer.card', 'composer.input', 'composer.scroll',
    'composer.seat', 'composer.stack', 'composer.stat', 'composer.stats', 'composer.variant',
    'process.group', 'shell.phase', 'shell.slot-anchor',
  ],
  pref: 'chatStyle',
  stylesheets: [
    { file: 'conversation-style.css', rank: 390 },
    { file: 'conversation-composer.css', rank: 395, gate: true },
    { file: 'conversation-hero.css', rank: 396, gate: true },
  ],
  settingsRows: [{
    tab: 'conversation',
    rank: 10,
    pref: 'chatStyle',
    title: 'chatStyleTitle',
    desc: 'chatStyleDesc',
    choiceLabels: { reader: 'chatStyleReader', spine: 'chatStyleSpine', console: 'chatStyleConsole' },
  }],
  cases: ['settings', 'composer', 'hero'],
} satisfies FeatureManifest
