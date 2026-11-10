import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'chatFollow',
  order: 190,
  reads: ['chatFold'],
  contracts: ['chat.call', 'chat.flow', 'chat.flow-block', 'chat.following-tail', 'chat.following-tail-attribute', 'chat.phase', 'chat.running', 'chat.scroller', 'chat.shimmer', 'chat.streaming', 'chat.think-row', 'chat.think-running', 'process.body', 'process.content', 'process.expanded-mode'],
  pref: 'chatAnimations',
  yieldsTo: 'dsh-chat-ux',
  stylesheets: [{ file: 'chat-follow.css', rank: 160 }],
  settingsRows: [{
    // The chat-area switch, what remains after the waiting line took a switch
    // of its own.
    tab: 'conversation',
    rank: 14,
    pref: 'chatAnimations',
    title: 'chatAnimationsTitle',
  }],
  cases: ['chat-follow']
} satisfies FeatureManifest
