import { PET_SPRITES } from 'virtual:dsh-deepcraft/generated'
import { buildElement } from '@dsh-deepcraft/engine/dom'
import { motionMs } from '../../shared/motion'
import { createMascotPlayer, imageSheets } from './mascot-player'
import type { MascotSheet } from './mascot-player'
import type { HostContext } from '@dsh-deepcraft/engine/host'
import type { FeatureUi } from '../../core/feature'
import type manifest from './mascot.manifest'

/**
 * The island characters: one still sprite each, plus the character's own face —
 * two eye dots placed by its config and the sparkles a celebration draws —
 * with the motion carried by island.css rather than a frame strip (D80's kept
 * hand-drawn character, replaying the reference theme's island vocabulary:
 * idle floats, working types, waiting stares, a win hops).
 *
 * The sheet table keeps the player's contract: one 128px frame per semantic
 * key, its duration the loop's own beat from island.css, so a once animation
 * still ends on schedule. The strip never moves; the sprite is what the
 * stylesheet animates.
 */

/** The pet ids the settings page and `chatPet` write for the shipped island characters. */
export const ISLAND_PETS = ['cindy', 'annie', 'blackcat', 'boli', 'chaku', 'erika', 'muffin', 'pululu', 'tarara', 'whitesnow'] as const

/** The pet id of the reference character, kept for callers that name it directly. */
export const ISLAND_PET_CINDY: IslandPetId = 'cindy'

export type IslandPetId = (typeof ISLAND_PETS)[number]

/** Whether a `chatPet` value names a shipped island character. */
export const isIslandPet = (id: string): id is IslandPetId => (ISLAND_PETS as readonly string[]).includes(id)

/** The sprite's edge in the window, in CSS pixels; the source art is 128px. */
const SPRITE_EDGE = 56
const SPRITE_PX = 128

/** One key's loop or once play time in milliseconds; the motion table carries the same numbers (D9). */
const BEATS: Readonly<Record<string, number>> = {
  idle: motionMs('--dsh-deepcraft-duration-island-float'),
  waving: motionMs('--dsh-deepcraft-duration-island-hop'),
  jumping: motionMs('--dsh-deepcraft-duration-island-hop'),
  thinking: motionMs('--dsh-deepcraft-duration-island-focus'),
  typing: motionMs('--dsh-deepcraft-duration-island-type'),
  music: motionMs('--dsh-deepcraft-duration-island-type'),
  conducting: motionMs('--dsh-deepcraft-duration-island-type'),
  building: motionMs('--dsh-deepcraft-duration-island-type'),
  compacting: motionMs('--dsh-deepcraft-duration-island-type'),
  error: motionMs('--dsh-deepcraft-duration-island-shake'),
  happy: motionMs('--dsh-deepcraft-duration-island-hop'),
  notification: motionMs('--dsh-deepcraft-duration-island-focus'),
  sleeping: motionMs('--dsh-deepcraft-duration-island-sleep'),
  waking: motionMs('--dsh-deepcraft-duration-island-float'),
  'poke-left': motionMs('--dsh-deepcraft-duration-island-lean'),
  'poke-right': motionMs('--dsh-deepcraft-duration-island-lean'),
  tickle: motionMs('--dsh-deepcraft-duration-island-hop'),
  drag: motionMs('--dsh-deepcraft-duration-island-type'),
}

/**
 * The character's face: the dot centres and sizes the island source states
 * (AgentIslandSection's per-skin table), as fractions of the 128px sprite.
 * `left`/`right` are the eye centres; `imageScale` is the sprite's own scale
 * inside its stage. Pululu paints its whole face and gets a `null` entry.
 */
interface IslandFace {
  eyeColor: string
  leftX: number
  rightX: number
  eyeY: number
  eyeRx: number
  eyeRy: number
  imageScale?: number
}

const FACES: Readonly<Record<IslandPetId, IslandFace | null>> = {
  cindy: { eyeColor: 'rgb(107 61 50)', leftX: 6.71 / 16, rightX: 9.3 / 16, eyeY: 9.5 / 16, eyeRx: 0.585 / 16, eyeRy: 0.98 / 16 },
  blackcat: { eyeColor: 'rgb(253 207 69)', leftX: 5.95 / 16, rightX: 10.05 / 16, eyeY: 9.05 / 16, eyeRx: 0.585 / 16, eyeRy: 0.98 / 16 },
  erika: { eyeColor: 'rgb(135 93 66)', leftX: 6.84 / 16, rightX: 9.16 / 16, eyeY: 10.75 / 16, eyeRx: 0.585 / 16, eyeRy: 0.98 / 16 },
  tarara: { eyeColor: 'rgb(61 114 228)', leftX: 6.9 / 16, rightX: 9.7 / 16, eyeY: 10.4 / 16, eyeRx: 0.585 / 16, eyeRy: 0.98 / 16 },
  boli: { eyeColor: 'black', leftX: 5.63 / 16, rightX: 10.63 / 16, eyeY: 8.13 / 16, eyeRx: 0.88 / 16, eyeRy: 0.88 / 16, imageScale: 0.8 },
  whitesnow: { eyeColor: 'black', leftX: 6.86 / 16, rightX: 9.5 / 16, eyeY: 9.64 / 16, eyeRx: 0.465 / 16, eyeRy: 1.02 / 16 },
  annie: { eyeColor: 'rgb(174 33 70)', leftX: 6.31 / 16, rightX: 9.56 / 16, eyeY: 11.69 / 16, eyeRx: 0.585 / 16, eyeRy: 0.98 / 16 },
  chaku: { eyeColor: 'rgb(253 207 69)', leftX: 6.19 / 16, rightX: 9.69 / 16, eyeY: 9.69 / 16, eyeRx: 0.585 / 16, eyeRy: 0.98 / 16 },
  muffin: { eyeColor: 'black', leftX: 5.56 / 16, rightX: 10.56 / 16, eyeY: 9.31 / 16, eyeRx: 0.585 / 16, eyeRy: 0.98 / 16 },
  pululu: null,
}

function sheet(key: string): MascotSheet {
  return {
    frames: 1,
    box: [0, 0, SPRITE_PX, SPRITE_PX],
    still: 0,
    frameDurationsMs: [BEATS[key]],
  }
}

/**
 * One island mascot: `petId` picks the sprite and the face config, both of
 * which live with the package (packages/assets/src/mascot/).
 *
 * @param ui - shared handle table.
 * @param petId - the island character's id; the build refuses a sprite without
 *     a file and a face without a config, so a lookup miss throws.
 */
export function createIslandMascot(ctx: HostContext, ui: FeatureUi<typeof manifest>, petId: IslandPetId) {
  const url = PET_SPRITES[petId]
  const face = FACES[petId]
  if (url === undefined || face === undefined) throw new Error(`dsh-deepcraft-island: "${petId}" carries no sprite or face`)
  const sheets: Record<string, MascotSheet> = {}
  for (const key of Object.keys(BEATS)) sheets[key] = sheet(key)
  return createMascotPlayer(ctx, ui, {
    name: 'island',
    sheets,
    scale: SPRITE_EDGE / SPRITE_PX,
    petId,
    extras: ['waving', 'jumping'],
    decorate(sprite, strip) {
      // A skin may stand inside its stage smaller than the frame (boli), and a
      // skin that paints its own whole face (pululu) takes no eye dots.
      if (face?.imageScale !== undefined) sprite.style.setProperty('--dsh-deepcraft-island-image-scale', `${face.imageScale}`)
      if (face !== null) {
        // The face is drawn over the sprite it belongs to, in the sprite's own
        // coordinates: the eye dots sit inside a box spanning both pupils.
        const eyes = buildElement('span', 'dsh-deepcraft-island-eyes')
        eyes.style.setProperty('--dsh-deepcraft-island-eye-x', `${face.leftX - face.eyeRx}`)
        eyes.style.setProperty('--dsh-deepcraft-island-eye-y', `${face.eyeY - face.eyeRy}`)
        eyes.style.setProperty('--dsh-deepcraft-island-eye-w', `${face.rightX - face.leftX + face.eyeRx * 2}`)
        eyes.style.setProperty('--dsh-deepcraft-island-eye-h', `${face.eyeRy * 2}`)
        eyes.style.setProperty('--dsh-deepcraft-island-eye-color', face.eyeColor)
        for (const side of ['left', 'right']) {
          const dot = buildElement('span', `dsh-deepcraft-island-eye dsh-deepcraft-island-eye-${side}`)
          dot.style.setProperty('--dsh-deepcraft-island-eye-width', `${face.eyeRx * 2}`)
          eyes.appendChild(dot)
        }
        strip.appendChild(eyes)
      }
      // Three sparkles for the win: the stylesheet times them apart.
      for (let at = 0; at < 3; at++) {
        const sparkle = buildElement('span', 'dsh-deepcraft-island-sparkle')
        sparkle.style.setProperty('--dsh-deepcraft-island-sparkle-delay', `${at * 95}ms`)
        strip.appendChild(sparkle)
      }
    },
    createSheets(onReady) {
      return imageSheets(url, '--dsh-deepcraft-island-sheet', onReady)
    },
  })
}
