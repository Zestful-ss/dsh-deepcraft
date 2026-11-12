import { MASCOT_BRAND } from '../../constants'
import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'mascot',
  order: 40,
  load: 'deferred',
  contracts: ['composer.card', 'composer.fallback-panel', 'composer.seat', 'composer.stack', 'conversation.session', 'conversation.session-attribute', 'shell.phase'],
  pref: 'mascot',
  prefValues: [MASCOT_BRAND],
  stylesheets: [
    { file: 'petdex.css', rank: 365 },
  ],
  settingsRows: [{
    tab: 'appearance',
    rank: 30,
    pref: 'mascot',
    title: 'mascotTitle',
    desc: 'mascotDesc',
    choiceLabels: { brand: 'mascotBrand', off: 'mascotOff' },
  }, {
    // One pet for the chat position, whichever palette is in force (D80); the
    // controls below it import a package and take it as the choice.
    tab: 'appearance',
    rank: 35,
    pref: 'chatPet',
    parent: 'mascot',
    control: 'chatPet',
    title: 'petChatTitle',
    desc: 'petChatDesc',
  }, {
    // It belongs to the mascot switch above it.
    tab: 'appearance',
    rank: 40,
    pref: 'mascotScope',
    parent: 'mascot',
    title: 'mascotScopeTitle',
    choiceLabels: { home: 'mascotScopeHome', all: 'mascotScopeAll' },
  }],
  cases: ['petdex-claude', 'petdex-deepseek']
} satisfies FeatureManifest
