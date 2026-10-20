import { DEEPY_FRAME_MS, DEEPY_GUTTER, DEEPY_SHEETS } from './sheets'
import { createMascotPlayer } from './mascot-player'
import { createMascotWhaleSheets } from './whale-sheets'
import type { HostContext } from '@dsh-deepcraft/engine/host'
import type { FeatureUi } from '../../core/feature'
import type manifest from './mascot.manifest'

/**
 * Deepy, the DeepSeek brand's pixel whale, as a mascot character
 * (packages/client/src/features/mascot/mascot-player.ts plays it; packages/client/src/features/mascot/
 * mascot.ts decides which mascot is out).
 *
 * Its animations (DEEPY_SHEETS) are drawn at build time by
 * packages/assets/whale.mjs: between jobs it looks around, spouts, or pulls out
 * a little laptop now and then. The sheets are too large to ride the bundle, so
 * each is fetched from the host half the first time its animation is wanted
 * (whale-sheets.ts).
 *
 * @param ui - shared handle table (`ui.composer`).
 * @returns `{ sync, release, onActivity, dispose }`.
 */
export function createMascotWhale(ctx: HostContext, ui: FeatureUi<typeof manifest>) {
  return createMascotPlayer(ctx, ui, {
    name: 'deepy',
    sheets: DEEPY_SHEETS,
    frameMs: DEEPY_FRAME_MS,
    gutter: DEEPY_GUTTER,
    extras: ['idle-look', 'idle-spout', 'idle-laptop'],
    createSheets(onReady) {
      const sheets = createMascotWhaleSheets(onReady)
      return {
        ready: sheets.ready,
        failed: sheets.failed,
        paint(style, key) {
          style.setProperty('--dsh-deepcraft-deepy-sheet', `url("${sheets.url(key)}")`)
        },
        dispose: sheets.dispose,
      }
    },
  })
}
