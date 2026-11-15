/**
 * Per-event pet notification sounds, shared by both halves: which events carry
 * a sound, the builtin ids, the stored custom file's contract and the status
 * route's answer (mirrors the wallpaper/brand media contract).
 */

/** Events that can carry a notification sound. */
export const PET_SOUND_EVENTS = ['attention', 'error'] as const
export type PetSoundEvent = (typeof PET_SOUND_EVENTS)[number]

/** Bundled sound ids; `off` mutes the event. */
export const PET_SOUND_BUILTINS = ['off', 'chime', 'ding'] as const
export type PetSoundBuiltin = (typeof PET_SOUND_BUILTINS)[number]

/** Accepted content types for a custom sound file, each with its extension. */
export const PET_SOUND_TYPES: Readonly<Record<string, string>> = {
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/ogg': 'ogg',
  'audio/mp4': 'm4a',
}

/** Largest stored sound file. */
export const PET_SOUND_MAX_BYTES = 5 * 1024 * 1024

/** The stored custom sound for one event, or null while it has none. */
export interface PetSoundState {
  type: string
  /** Changes whenever the bytes do, so an address naming it busts the cache. */
  version: string
}

/** The status route's answer: per event, whether a custom file is stored. */
export interface PetSoundAnswer {
  ok: true
  sounds: Record<PetSoundEvent, PetSoundState | null>
}
