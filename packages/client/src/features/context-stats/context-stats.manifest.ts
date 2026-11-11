import { STATS_POSITION_CONTEXT, STATS_POSITION_INLINE } from '../../constants'
import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'contextStats',
  order: 70,
  load: 'deferred',
  contracts: ['chat.call', 'chat.streaming', 'composer.card', 'composer.dialog-trigger', 'composer.meter-fill', 'composer.stat', 'composer.stats'],
  pref: 'statsPosition',
  // Both positions are this feature's: the line of its own is what the inline
  // one adds, since the panel the meter owns carries the rows either way.
  prefValues: [STATS_POSITION_INLINE, STATS_POSITION_CONTEXT],
  stylesheets: [{ file: 'context-stats.css', rank: 295 }],
  settingsRows: [{
    tab: 'conversation',
    rank: 35,
    pref: 'statsPosition',
    title: 'statsPositionTitle',
    choiceLabels: {
      [STATS_POSITION_INLINE]: 'statsPositionInline',
      [STATS_POSITION_CONTEXT]: 'statsPositionContext',
    },
  }],
  cases: ['context-stats', 'stats-compact', 'stats-inline']
} satisfies FeatureManifest
