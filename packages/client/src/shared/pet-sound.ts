import { PET_SOUND_EVENTS } from '@dsh-deepcraft/contracts/pet-sound'
import type { PetSoundAnswer, PetSoundEvent, PetSoundState } from '@dsh-deepcraft/contracts/pet-sound'
import { PET_SOUNDS_PATH, PET_SOUND_FILE_PATH } from '@dsh-deepcraft/contracts/routes'
import { changeJson, createWriteLane, readJson } from './host-json'
import { notifyAll } from '@dsh-deepcraft/engine/notify'

/**
 * The reader's own pet sounds as the page plays them: which events carry a
 * stored custom file, each with an address that changes with its bytes. The
 * settings page picks and previews them; the mascot plays them on moments.
 */

export type PetSounds = Record<PetSoundEvent, PetSoundState | null>

let sounds: PetSounds = Object.fromEntries(PET_SOUND_EVENTS.map(event => [event, null])) as PetSounds
let requested = false
/** Bumped by every read, so an answer that arrives after a newer one is dropped. */
let generation = 0
const listeners: ((sounds: PetSounds) => void)[] = []

/** A write still in flight answers after a read that started before it: reads wait on it, same as brand/wallpaper. */
const lane = createWriteLane()

/** The sounds in hand (live object; treat as read-only). */
export function readPetSounds() {
  return sounds
}

/** The address of one event's stored custom file, versioned so replaced bytes are never served from cache. */
export function petSoundUrl(event: PetSoundEvent): string | null {
  const state = sounds[event]
  return state === null ? null : `${PET_SOUND_FILE_PATH}?event=${event}&v=${encodeURIComponent(state.version)}`
}

/** Observe the sounds; returns the unsubscriber. */
export function subscribePetSounds(listener: (sounds: PetSounds) => void) {
  listeners.push(listener)
  return () => {
    const index = listeners.indexOf(listener)
    if (index !== -1) listeners.splice(index, 1)
  }
}

/** Read the host half's status once per arming; a host half that does not answer leaves no custom sound. */
export function loadPetSounds(): void {
  const busy = lane.busy()
  if (busy !== null) { void busy.then(loadPetSounds, loadPetSounds); return }
  if (requested) return
  requested = true
  const at = ++generation
  readJson<PetSoundAnswer>(PET_SOUNDS_PATH)
    .then((answer) => adopt(answer, at), () => { /* the host half did not answer: no custom sound plays (D12) */ })
}

/** Re-arm: the next load() reads again (a new host context). */
export function resetPetSounds() {
  requested = false
  generation++
  for (const event of PET_SOUND_EVENTS) sounds[event] = null
}

function adopt(answer: PetSoundAnswer, at: number) {
  if (at !== generation || answer.ok !== true) return
  sounds = answer.sounds
  notifyAll(listeners, sounds)
}

/**
 * Send one request that changes one event's file and adopt the status it
 * answers with. A refusal rejects with the reason the host half gave. Writes
 * chain, since each answer is a whole-status snapshot: two overlapping writes
 * would let the earlier answer overwrite the later one's file.
 */
function change(event: PetSoundEvent, init: RequestInit) {
  const at = ++generation
  return lane.run(() => changeJson<PetSoundAnswer>(`${PET_SOUND_FILE_PATH}?event=${event}`, init))
    .then(answer => { adopt(answer, at) })
}


/** Replace one event's custom sound with a file the reader picked; the content type names its format. */
export function uploadPetSound(event: PetSoundEvent, file: File) {
  return change(event, { method: 'PUT', headers: { 'content-type': file.type }, body: file })
}

/** Remove one event's custom sound: the builtin choice takes its place. */
export function removePetSound(event: PetSoundEvent) {
  return change(event, { method: 'DELETE' })
}

export { PET_SOUND_EVENTS }
export type { PetSoundEvent }
