import { PET_SOUND_CUSTOM, PET_SOUND_OFF } from '@dsh-deepcraft/contracts/prefs'
import type { Prefs } from '@dsh-deepcraft/contracts/prefs'
import { petSoundUrl } from '../../shared/pet-sound'
import type { PetSoundEvent } from '../../shared/pet-sound'
import type { MascotMoment } from './mascot-signals'

/**
 * The sound a moment plays. `attention` celebrates a finished turn or an
 * approval arriving; `error` answers a failed tool result. Each event picks a
 * bundled tone, `off`, or the reader's own uploaded file the host half serves
 * (packages/contracts/src/pet-sound.ts).
 */

/** One shared context for the bundled tones; created on the first play, after the reader has gestured. */
let audioContext: AudioContext | null = null

/** The bundled tone each id synthesizes: one short pleasant note pair. */
function playBuiltin(id: string) {
  audioContext ??= new AudioContext()
  const ctx = audioContext
  // A context built before the first gesture starts suspended and would stay
  // that way for the page's life: resume on every play so the first gesture's
  // next moment is heard (D12 — a refused resume keeps the animation only).
  if (ctx.state === 'suspended') void ctx.resume().catch(() => {})
  const now = ctx.currentTime
  const notes: [number, number][] = id === 'ding' ? [[880, 0.18]] : [[660, 0.12], [990, 0.16]]
  let at = now
  for (const [frequency, length] of notes) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = frequency
    gain.gain.setValueAtTime(0, at)
    gain.gain.linearRampToValueAtTime(0.08, at + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, at + length)
    osc.connect(gain).connect(ctx.destination)
    osc.start(at)
    osc.stop(at + length)
    at += length
  }
}

/** The event each pick belongs to (playPetSound reads it from prefs). */
function pickOf(event: PetSoundEvent, prefs: Prefs) {
  return event === 'error' ? prefs.petSoundError : prefs.petSoundAttention
}

/** Play one event's configured sound; `off` and a missing custom file play nothing. */
export function playPetSound(event: PetSoundEvent, prefs: Prefs) {
  previewPetSound(pickOf(event, prefs), event)
}

/** Play a pick directly (the settings preview button); same rules as playPetSound. */
export function previewPetSound(pick: string, event: PetSoundEvent) {
  if (pick === PET_SOUND_OFF) return
  if (pick === PET_SOUND_CUSTOM) {
    const url = petSoundUrl(event)
    if (url !== null) void new Audio(url).play().catch(() => { /* autoplay refused: the moment still animates (D12) */ })
    return
  }
  try {
    playBuiltin(pick)
  } catch {
    // AudioContext construction can be refused before a gesture; the moment still animates (D12).
  }
}

/** The sound event a moment carries, or null while it has none. */
export function soundOfMoment(moment: MascotMoment): PetSoundEvent | null {
  return moment === 'error' ? 'error' : moment === 'attention' ? 'attention' : null
}
