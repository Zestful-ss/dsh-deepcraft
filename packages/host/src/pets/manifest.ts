/**
 * A package's own manifest, read without editing it: the id, name and atlas
 * filename the author wrote, and the geometry the untouched image carries.
 *
 * The version rule is the official one (`src/lib/sprite-version.ts`): a
 * missing `spriteVersionNumber` is version 1, `2` is version 2, and any other
 * declared value is invalid. The geometry must agree with the declared version
 * — nine rows or eleven, eight columns — and a proportionally scaled atlas is
 * accepted only when every cell boundary lands on a whole pixel.
 */
import { createHash } from 'node:crypto'
import {
  PET_ATLAS_COLUMNS,
  PET_ATLAS_MAX_PIXELS,
  PET_ATLAS_ROWS_V1,
  PET_ATLAS_ROWS_V2,
  PET_FRAME_HEIGHT,
  PET_FRAME_WIDTH,
  PET_IMAGE_MAX_BYTES,
  PET_MANIFEST_FILE,
  PET_MANIFEST_MAX_BYTES,
  isPetId,
} from '@dsh-deepcraft/contracts/pets'
import { checkedRootName, readAtlasSize, readManifestObject } from './codecs.js'
import { PetRefusal } from './errors.js'

/** What one verified package says about itself. */
export interface ParsedPet {
  /** The id the manifest carries, untouched. */
  sourceId: string
  displayName: string
  spriteVersionNumber: 1 | 2
  frameWidth: number
  frameHeight: number
  atlasRows: number
  /** The atlas file name the manifest names, stored as written. */
  spritesheetPath: string
  /** `SHA256(manifest bytes || 0x00 || atlas bytes)`. */
  version: string
}

/**
 * Verify one manifest against its atlas bytes and derive the descriptor.
 *
 * @param manifestBytes - the manifest exactly as it arrived.
 * @param imageBytes - the atlas exactly as it arrived.
 */
export function parsePet(manifestBytes: Uint8Array, imageBytes: Uint8Array): ParsedPet {
  if (manifestBytes.byteLength > PET_MANIFEST_MAX_BYTES) throw new PetRefusal(`the manifest is larger than ${PET_MANIFEST_MAX_BYTES} bytes`, 413)
  if (imageBytes.byteLength > PET_IMAGE_MAX_BYTES) throw new PetRefusal(`the atlas is larger than ${PET_IMAGE_MAX_BYTES} bytes`, 413)
  const fields = readManifestObject(manifestBytes)

  const sourceId = fields.id
  if (typeof sourceId !== 'string' || sourceId === '' || sourceId.length > 200) throw new PetRefusal('the manifest carries no usable id', 400)
  if (sourceId.includes('/') || sourceId.includes('\\') || sourceId.includes('\0')) throw new PetRefusal('the manifest id names a path', 400)
  const displayName = typeof fields.displayName === 'string' && fields.displayName.trim() !== '' ? fields.displayName.trim() : sourceId

  const spritesheetPath = fields.spritesheetPath
  if (typeof spritesheetPath !== 'string') throw new PetRefusal('the manifest names no spritesheetPath', 400)
  checkedRootName(spritesheetPath)
  const extension = spritesheetPath.toLowerCase().split('.').pop()
  if (extension !== 'png' && extension !== 'webp') throw new PetRefusal('spritesheetPath must name a PNG or WebP file', 415)

  const declared = fields.spriteVersionNumber
  if (declared !== undefined && declared !== 1 && declared !== 2) {
    throw new PetRefusal(`spriteVersionNumber must be 1 or 2, not ${JSON.stringify(declared)}`, 400)
  }

  const atlas = readAtlasSize(imageBytes)
  if (extension !== atlas.type) throw new PetRefusal(`spritesheetPath names a ${extension}, but the atlas is ${atlas.type}`, 400)
  if (atlas.width > PET_ATLAS_MAX_PIXELS || atlas.height > PET_ATLAS_MAX_PIXELS || atlas.width * atlas.height > PET_ATLAS_MAX_PIXELS) {
    throw new PetRefusal(`the atlas carries more than ${PET_ATLAS_MAX_PIXELS} pixels`, 413)
  }
  if (atlas.width % PET_ATLAS_COLUMNS !== 0) throw new PetRefusal('the atlas width is not a whole number of columns', 400)
  const frameWidth = atlas.width / PET_ATLAS_COLUMNS

  const fits = (rows: number) => atlas.height % rows === 0 && frameWidth * PET_FRAME_HEIGHT === (atlas.height / rows) * PET_FRAME_WIDTH
  const observed: 1 | 2 | null = fits(PET_ATLAS_ROWS_V1) ? 1 : fits(PET_ATLAS_ROWS_V2) ? 2 : null
  if (observed === null) {
    throw new PetRefusal('the atlas is neither nine nor eleven rows of proportionally scaled 192×208 cells', 400)
  }
  if (declared !== undefined && declared !== observed) {
    throw new PetRefusal(`spriteVersionNumber ${declared} does not match the atlas, which holds version ${observed} rows`, 400)
  }
  const atlasRows = observed === 2 ? PET_ATLAS_ROWS_V2 : PET_ATLAS_ROWS_V1

  const hash = createHash('sha256')
  hash.update(manifestBytes)
  hash.update(Buffer.from([0]))
  hash.update(imageBytes)

  return {
    sourceId,
    displayName,
    spriteVersionNumber: observed,
    frameWidth,
    frameHeight: atlas.height / atlasRows,
    atlasRows,
    spritesheetPath,
    version: hash.digest('hex'),
  }
}

/** The manifest file a package root must carry. */
export const MANIFEST_NAME = PET_MANIFEST_FILE

/** Whether the manifest's own id can name its directory; other ids install under a hash name. */
export function usableDirectoryName(sourceId: string) {
  return isPetId(sourceId)
}
