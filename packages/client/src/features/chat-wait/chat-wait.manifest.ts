import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'chatWait',
  order: 205,
  contracts: ['chat.following-tail-attribute', 'chat.running', 'chat.running-icon', 'chat.running-text', 'conversation.session', 'conversation.session-attribute'],
  pref: 'chatWait',
  yieldsTo: 'dsh-chat-ux',
  stylesheets: [{ file: 'chat-wait.css', rank: 175 }],
  // The line has its own switch on the Motion tab.
  settingsRows: [{
    tab: 'motion',
    rank: 15,
    pref: 'chatWait',
    title: 'chatWaitTitle',
  }, {
    // The line's detail choice: on writes the specifics a moment carries, off
    // the bare states alone. It belongs to the switch above it.
    tab: 'motion',
    rank: 16,
    pref: 'statusDetail',
    parent: 'chatWait',
    title: 'statusDetailTitle',
  }],
  cases: ['chat-wait']
} satisfies FeatureManifest
