import { PETDEX_ACTIONS } from '@dsh-deepcraft/contracts/pets'
import type { PetDescriptor, PetdexState } from '@dsh-deepcraft/contracts/pets'
import { createMascotPlayer } from './mascot-player'
import type { MascotSheet } from './mascot-player'
import type { HostContext } from '@dsh-deepcraft/engine/host'
import type { FeatureUi } from '../../core/feature'
import type manifest from './mascot.manifest'

/**
 * One animation of the composer's Petdex pet: the semantic key the state
 * machine and gestures already speak, and the native action it plays.
 */
const ACTIONS: Readonly<Record<string, { state: PetdexState, frames?: number }>> = {
  idle: { state: 'idle' },
  waving: { state: 'waving' },
  jumping: { state: 'jumping' },
  thinking: { state: 'review' },
  typing: { state: 'running' },
  music: { state: 'running' },
  conducting: { state: 'running' },
  building: { state: 'running' },
  compacting: { state: 'running' },
  error: { state: 'failed' },
  happy: { state: 'waving' },
  notification: { state: 'waiting' },
  // The package has no sleeping action: its first idle frame stands still.
  sleeping: { state: 'idle', frames: 1 },
  waking: { state: 'waving' },
  // A poke sends it the other way, as the original characters do.
  'poke-left': { state: 'running-right' },
  'poke-right': { state: 'running-left' },
  tickle: { state: 'jumping' },
  drag: { state: 'jumping' },
}

/** The composer's width for a pet, in CSS pixels; the height follows the cell's proportions. */
const DISPLAY_WIDTH = 72

/**
 * One installed Petdex package as a composer mascot: the original atlas is
 * drawn frame for frame, at the author's own frame times, with no redraw and
 * no second animation framework.
 *
 * The atlas URL stays the same for every action — actions are rows of one
 * image — and the image is decoded once before the mascot is put on show.
 *
 * @param ui - shared handle table (`ui.composer`).
 * @param pet - the installed package, as the host half describes it.
 */
export function createPetdexMascot(ctx: HostContext, ui: FeatureUi<typeof manifest>, pet: PetDescriptor) {
  const sheets: Record<string, MascotSheet> = {}
  for (const [key, action] of Object.entries(ACTIONS)) {
    const native = PETDEX_ACTIONS[action.state]
    const durations = action.frames === 1
      ? [native.frameDurationsMs.reduce((sum, ms) => sum + ms, 0)]
      : native.frameDurationsMs
    sheets[key] = {
      frames: durations.length,
      row: native.row,
      box: [0, 0, pet.frameWidth, pet.frameHeight],
      still: 0,
      atlasRows: pet.atlasRows,
      frameDurationsMs: durations,
      nativeState: action.state,
    }
  }
  return createMascotPlayer(ctx, ui, {
    name: 'petdex',
    sheets,
    scale: DISPLAY_WIDTH / pet.frameWidth,
    petId: pet.id,
    extras: ['waving', 'jumping'],
    createSheets(onReady) {
      let loaded = false
      let failed = false
      let disposed = false
      const image = new Image()
      image.decoding = 'async'
      image.src = pet.imageUrl
      void image.decode().then(() => {
        if (disposed) return
        loaded = true
        onReady()
      }, () => {
        if (disposed) return
        failed = true
        onReady()
      })
      return {
        ready: () => loaded,
        failed: () => failed,
        paint(style) {
          style.setProperty('--dsh-deepcraft-petdex-sheet', `url("${pet.imageUrl}")`)
        },
        dispose() {
          disposed = true
          image.src = ''
        },
      }
    },
  })
}
