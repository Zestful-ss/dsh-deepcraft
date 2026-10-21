import { MASCOT_BRAND, MASCOT_CRAB, MASCOT_DEEPY } from '../../constants'
import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'mascot',
  order: 40,
  load: 'deferred',
  reads: ['composer'],
  contracts: ['chat.think-running', 'composer.fallback-panel', 'composer.seat', 'composer.stack', 'conversation.session', 'conversation.session-attribute'],
  pref: 'mascot',
  prefValues: [MASCOT_BRAND, MASCOT_CRAB, MASCOT_DEEPY],
  stylesheets: [
    { file: 'crab.css', rank: 350 },
    { file: 'whale.css', rank: 360 },
    { file: 'petdex.css', rank: 365 },
  ],
  settingsRows: [{
    tab: 'appearance',
    rank: 30,
    pref: 'mascot',
    title: 'mascotTitle',
    desc: 'mascotDesc',
    choiceLabels: { brand: 'mascotBrand', crab: 'mascotCrab', deepy: 'mascotDeepy', off: 'mascotOff' },
  }, {
    // The chat pet follows the theme; the field written is the one in front.
    tab: 'appearance',
    rank: 35,
    pref: 'chatPetClaude',
    key: 'chatPet',
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
  }, {
    // Imported packages are selected by the chat row above; this row only adds
    // them, so it takes the other theme field as its own identity.
    tab: 'appearance',
    rank: 55,
    pref: 'chatPetDeepseek',
    key: 'petImport',
    control: 'petImport',
    title: 'petImportTitle',
    desc: 'petImportDesc',
  }],
  cases: ['crab-states', 'deepy', 'petdex-claude', 'petdex-deepseek', 'hero', 'studio']
} satisfies FeatureManifest
