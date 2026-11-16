import { PET_SOUND_CUSTOM, PET_SOUND_OFF } from '@dsh-deepcraft/contracts/prefs'
import type { Prefs } from '@dsh-deepcraft/contracts/prefs'
import { petSoundUrl } from '../../shared/pet-sound'
import type { PetSoundEvent } from '../../shared/pet-sound'
import type { MascotMoment } from './mascot-signals'

/**
 * The sound a moment plays. `attention` celebrates a finished turn or an
 * approval arriving; `error` answers a failed tool result; `start` a turn
 * beginning; `select` is the reader's own poke. Each event picks a bundled
 * tone, `off`, or the reader's own uploaded file the host half serves
 * (packages/contracts/src/pet-sound.ts).
 */

/** One shared context for the bundled tones; created on the first play, after the reader has gestured. */
let audioContext: AudioContext | null = null

/**
 * The bundled tone each id synthesizes, as `[frequency Hz, seconds]` notes in
 * order. The names mirror the reference theme's island sound set
 * (AGENT_ISLAND_SOUND_OPTIONS).
 */
const NOTES: Readonly<Record<string, readonly (readonly [number, number])[]>> = {
  'startup-chime': [[523, 0.09], [784, 0.14], [1047, 0.20]],
  'ring-chime': [[932, 0.06], [932, 0.16]],
  'item-found': [[660, 0.10], [880, 0.12], [990, 0.18]],
  'gem-collect': [[523, 0.06], [659, 0.06], [784, 0.06], [1047, 0.16]],
  'item-fanfare': [[523, 0.10], [523, 0.10], [523, 0.10], [659, 0.16], [784, 0.24]],
  'victory-fanfare': [[392, 0.12], [523, 0.12], [659, 0.12], [784, 0.26], [659, 0.10], [784, 0.34]],
  'secret-chime': [[1047, 0.08], [1175, 0.08], [1319, 0.14], [1568, 0.20]],
  'error-buzz': [[233, 0.14], [196, 0.22]],
  chime: [[660, 0.12], [990, 0.16]],
  ding: [[880, 0.18]],
}

/** The bundled tone each id synthesizes: a short note run over the shared context. */
function playBuiltin(id: string) {
  const notes = NOTES[id]
  if (notes === undefined) throw new Error(`pet-sound: "${id}" is not a bundled tone`)
  audioContext ??= new AudioContext()
  const ctx = audioContext
  // A context built before the first gesture starts suspended and would stay
  // that way for the page's life: resume on every play so the first gesture's
  // next moment is heard (D12 — a refused resume keeps the animation only).
  if (ctx.state === 'suspended') void ctx.resume().catch(() => {})
  let at = ctx.currentTime
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

/** The pref key one event's pick lives under. */
const PREF_OF: Record<PetSoundEvent, keyof Prefs> = {
  select: 'petSoundSelect',
  start: 'petSoundStart',
  attention: 'petSoundAttention',
  error: 'petSoundError',
}

/** The event each pick belongs to (playPetSound reads it from prefs). */
function pickOf(event: PetSoundEvent, prefs: Prefs) {
  return String(prefs[PREF_OF[event]])
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
