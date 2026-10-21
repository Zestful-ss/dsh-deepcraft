/**
 * The Petdex contract: the animation vocabulary a package's atlas carries, the
 * atlas geometry both halves read, the pet a package describes and the presets
 * this plugin offers (D78).
 *
 * A package is its own `pet.json` and one PNG/WebP atlas, byte for byte: the
 * bytes are stored as they arrived and the descriptor below is derived from
 * them, so the browser draws the author's frames. Nothing here redraws,
 * recolours or re-times a pet.
 */

/** The nine actions the Petdex atlas rows name, in row order. */
export const PETDEX_STATES = [
  'idle',
  'running-right',
  'running-left',
  'waving',
  'jumping',
  'failed',
  'waiting',
  'running',
  'review',
] as const

export type PetdexState = typeof PETDEX_STATES[number]

/** One action's row in the atlas and the duration of each of its frames, in milliseconds. */
export interface PetdexAction {
  readonly row: number
  readonly frameDurationsMs: readonly number[]
}

/**
 * The frame timing the Petdex sprite specification publishes for version 1.
 * Idle's irregular beats are the blink, and every action carries its own pace:
 * a global frame time would stretch all of them.
 */
export const PETDEX_ACTIONS: Readonly<Record<PetdexState, PetdexAction>> = {
  'idle': { row: 0, frameDurationsMs: [280, 110, 110, 140, 140, 320] },
  'running-right': { row: 1, frameDurationsMs: [120, 120, 120, 120, 120, 120, 120, 220] },
  'running-left': { row: 2, frameDurationsMs: [120, 120, 120, 120, 120, 120, 120, 220] },
  'waving': { row: 3, frameDurationsMs: [140, 140, 140, 280] },
  'jumping': { row: 4, frameDurationsMs: [140, 140, 140, 140, 280] },
  'failed': { row: 5, frameDurationsMs: [140, 140, 140, 140, 140, 140, 140, 240] },
  'waiting': { row: 6, frameDurationsMs: [150, 150, 150, 150, 150, 260] },
  'running': { row: 7, frameDurationsMs: [120, 120, 120, 120, 120, 220] },
  'review': { row: 8, frameDurationsMs: [150, 150, 150, 150, 150, 280] },
}

/** Frames to a row: the atlas is a grid of eight columns at every version. */
export const PET_ATLAS_COLUMNS = 8
/** The nominal cell at version 1 and 2, in atlas pixels; a scaled atlas keeps the proportions. */
export const PET_FRAME_WIDTH = 192
export const PET_FRAME_HEIGHT = 208
/** Rows an atlas holds: version 1 publishes nine actions, version 2 eleven. */
export const PET_ATLAS_ROWS_V1 = 9
export const PET_ATLAS_ROWS_V2 = 11
/** The most pixels one atlas may carry (16 × 1024 × 1024). */
export const PET_ATLAS_MAX_PIXELS = 16_777_216
/** Limits every import path holds to: the manifest, the atlas, the archive, its extracted bytes and its entries. */
export const PET_MANIFEST_MAX_BYTES = 64 * 1024
export const PET_IMAGE_MAX_BYTES = 16 * 1024 * 1024
export const PET_ARCHIVE_MAX_BYTES = 20 * 1024 * 1024
export const PET_EXTRACTED_MAX_BYTES = 20 * 1024 * 1024
export const PET_ARCHIVE_MAX_ENTRIES = 16
/** A package directory name: what the pets root is listed by. */
export const PET_ID_RE = /^[a-z0-9][a-z0-9-]{0,62}$/
/** The name of the manifest file inside a package; the official download serves it as `petjson.json`. */
export const PET_MANIFEST_FILE = 'pet.json'

/** One installed pet, as the browser half reads it. Paths and tokens never cross this boundary. */
export interface PetDescriptor {
  /** The directory under the pets root. */
  id: string
  /** The id the untouched manifest carries; it differs from `id` only on a hash-named install. */
  sourceId: string
  displayName: string
  spriteVersionNumber: 1 | 2
  /** One cell in atlas pixels; proportional scaling keeps these integers. */
  frameWidth: number
  frameHeight: number
  /** Rows the atlas carries, including any the current player has no action for. */
  atlasRows: number
  /** `SHA256(manifest bytes || 0x00 || atlas bytes)`, which also keys the image cache. */
  version: string
  /** The host half's address for the atlas, versioned by `version`. */
  imageUrl: string
}

/** One package the pets root holds but cannot use; it never takes the rest of the library down. */
export interface PetLibraryError {
  id: string
  error: string
}

/** One preset this plugin offers; the art is downloaded on first use, never shipped. */
export interface PetdexPreset {
  id: string
  /** The public page the reader can open. */
  pageUrl: string
  /** The asset directory the untouched manifest and atlas are downloaded from. */
  assetBase: string
}

const PETDEX_ASSETS = 'https://assets.petdex.dev/pets/'

/** The published packages this plugin can install by id. */
export const PETDEX_PRESETS: readonly PetdexPreset[] = [
  { id: 'crab-buddy', pageUrl: 'https://petdex.dev/pets/crab-buddy', assetBase: `${PETDEX_ASSETS}crab-buddy-cc20d1c90732/` },
  { id: 'claude-opus-scholar', pageUrl: 'https://petdex.dev/pets/claude-opus-scholar', assetBase: `${PETDEX_ASSETS}claude-opus-scholar-88dade9b63fd/` },
  { id: 'whaledou', pageUrl: 'https://petdex.dev/pets/whaledou', assetBase: `${PETDEX_ASSETS}whaledou-c4cb6b24fb56/` },
  { id: 'deepseek', pageUrl: 'https://petdex.dev/pets/deepseek', assetBase: `${PETDEX_ASSETS}deepseek-c3fa684cfe03/` },
]

/** A preset by id, or undefined for an id the library alone may hold. */
export function petdexPreset(id: string): PetdexPreset | undefined {
  return PETDEX_PRESETS.find(preset => preset.id === id)
}

/** The manifest a preset's asset directory serves (the official download names it `petjson.json`). */
export function presetManifestUrl(preset: PetdexPreset) {
  return `${preset.assetBase}petjson.json`
}

/** The atlas a preset's asset directory serves; it is stored under the manifest's own filename. */
export function presetImageUrl(preset: PetdexPreset) {
  return `${preset.assetBase}sprite.webp`
}

/** Rows the atlas of one sprite version carries. */
export function petAtlasRows(version: 1 | 2) {
  return version === 2 ? PET_ATLAS_ROWS_V2 : PET_ATLAS_ROWS_V1
}

/** Whether a name is a package directory the pets root can hold. */
export function isPetId(value: string) {
  return PET_ID_RE.test(value)
}
