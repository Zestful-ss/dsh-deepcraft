/**
 * The two file formats an import reads, through mature parsers rather than a
 * second implementation of either (D78): fflate streams the ZIP and counts the
 * bytes it actually produces, and image-size reads the atlas header.
 *
 * The build bundles both libraries into this module alone
 * (`packages/host/build.mjs`), so the published package installs no parser of
 * its own and no ZIP or image parser is hand-written here.
 */
import { Unzip, UnzipInflate, zipSync } from 'fflate'
import { imageSize } from 'image-size'
import {
  PET_ARCHIVE_MAX_BYTES,
  PET_ARCHIVE_MAX_ENTRIES,
  PET_EXTRACTED_MAX_BYTES,
  PET_IMAGE_MAX_BYTES,
  PET_MANIFEST_MAX_BYTES,
} from '@dsh-deepcraft/contracts/pets'
import { PetRefusal } from './errors.js'

/**
 * One manifest as a JSON object.
 *
 * @param bytes - the manifest exactly as it arrived.
 * @returns its fields; anything that is not a JSON object is refused.
 */
export function readManifestObject(bytes: Uint8Array): Record<string, unknown> {
  let parsed: unknown
  try {
    parsed = JSON.parse(new TextDecoder().decode(bytes))
  } catch (error) {
    throw new PetRefusal(`the manifest is not JSON: ${(error as { message?: string } | null)?.message ?? String(error)}`, 400)
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) throw new PetRefusal('the manifest is not a JSON object', 400)
  return parsed as Record<string, unknown>
}

/** One decoded atlas header. */
export interface AtlasSize {
  width: number
  height: number
  /** `png` or `webp`: the only formats a package may carry. */
  type: 'png' | 'webp'
}

/** The manifest and atlas a package's root carries, plus any notice files kept beside them. */
export interface PetFiles {
  manifest: Uint8Array
  image: Uint8Array
  extras: { name: string, bytes: Uint8Array }[]
}

/** A file name a package root may carry besides the manifest and atlas. */
const SIDE_FILE_RE = /^(readme|license|licence|notice)(\.[a-z0-9]+)?$/i

/**
 * Whether a package may carry this root-level name. Only the manifest, the
 * atlas the manifest names and a licence/readme/notice file are stored: an
 * archive cannot use this route to drop an executable anywhere.
 */
export function isPackageSideFile(name: string) {
  return SIDE_FILE_RE.test(name)
}

/**
 * One root-level package file name: no separator, no traversal, no drive
 * letter and no reserved device name, so joining it under the store cannot
 * escape it on Windows.
 */
export function checkedRootName(name: string) {
  if (name === '' || name === '.' || name === '..') throw new PetRefusal(`"${name}" is not a package file name`, 400)
  if (name.includes('/') || name.includes('\\') || name.includes('\0')) {
    throw new PetRefusal(`"${name}" must sit at the package root`, 400)
  }
  if (/^[a-z]:/i.test(name) || /[<>:"|?*]/.test(name)) throw new PetRefusal(`"${name}" is not a package file name`, 400)
  return name
}

/**
 * Read one ZIP archive into its root files, enforcing every import limit on
 * the bytes actually produced: a header's declared size is not trusted.
 *
 * Directory entries are refused rather than skipped: a package's files sit at
 * the root, and a folder entry means the archive wrapped them in a directory
 * this importer refuses to guess through.
 */
export function readZip(archive: Uint8Array): { files: Map<string, Uint8Array>, extras: { name: string, bytes: Uint8Array }[] } {
  if (archive.byteLength > PET_ARCHIVE_MAX_BYTES) throw new PetRefusal(`the archive is larger than ${PET_ARCHIVE_MAX_BYTES} bytes`, 413)
  const files = new Map<string, Uint8Array>()
  const extras: { name: string, bytes: Uint8Array }[] = []
  let extracted = 0
  let entries = 0
  const unzip = new Unzip((file) => {
    const name = file.name
    if (name.endsWith('/')) throw new PetRefusal('the archive must hold its package at the root, not in a folder', 400)
    checkedRootName(name)
    entries += 1
    if (entries > PET_ARCHIVE_MAX_ENTRIES) throw new PetRefusal(`the archive carries more than ${PET_ARCHIVE_MAX_ENTRIES} entries`, 413)
    if (files.has(name)) throw new PetRefusal(`the archive carries "${name}" twice`, 400)
    const chunks: Uint8Array[] = []
    let size = 0
    file.ondata = (error, chunk, final) => {
      if (error !== null) throw new PetRefusal(`the archive could not be read: ${error.message}`, 400)
      size += chunk.byteLength
      extracted += chunk.byteLength
      if (size > PET_IMAGE_MAX_BYTES) throw new PetRefusal(`"${name}" is larger than ${PET_IMAGE_MAX_BYTES} bytes`, 413)
      if (extracted > PET_EXTRACTED_MAX_BYTES) throw new PetRefusal(`the extracted archive is larger than ${PET_EXTRACTED_MAX_BYTES} bytes`, 413)
      chunks.push(chunk)
      if (!final) return
      const bytes = new Uint8Array(size)
      let at = 0
      for (const part of chunks) {
        bytes.set(part, at)
        at += part.byteLength
      }
      files.set(name, bytes)
      if (isPackageSideFile(name)) extras.push({ name, bytes })
    }
    file.start()
  })
  unzip.register(UnzipInflate)
  try {
    unzip.push(archive, true)
  } catch (error) {
    if (error instanceof PetRefusal) throw error
    throw new PetRefusal(`the archive could not be read: ${(error as { message?: string } | null)?.message ?? String(error)}`, 400)
  }
  return { files, extras }
}

/**
 * Split a package's root files into the manifest, the atlas its manifest names
 * and the side files worth keeping. Missing either required file is refused.
 */
export function pickPetFiles(files: Map<string, Uint8Array>, manifestName: string, imageName: string): PetFiles {
  const manifest = files.get(manifestName)
  if (manifest === undefined) throw new PetRefusal(`the package carries no ${manifestName} at its root`, 400)
  const image = files.get(imageName)
  if (image === undefined) throw new PetRefusal(`the package carries no ${imageName}, which its manifest names`, 400)
  if (manifest.byteLength > PET_MANIFEST_MAX_BYTES) throw new PetRefusal(`the manifest is larger than ${PET_MANIFEST_MAX_BYTES} bytes`, 413)
  if (image.byteLength > PET_IMAGE_MAX_BYTES) throw new PetRefusal(`the atlas is larger than ${PET_IMAGE_MAX_BYTES} bytes`, 413)
  const extras: { name: string, bytes: Uint8Array }[] = []
  for (const [name, bytes] of files) {
    if (name === manifestName || name === imageName) continue
    if (!isPackageSideFile(name)) throw new PetRefusal(`the package carries an unsupported file "${name}"`, 415)
    extras.push({ name, bytes })
  }
  return { manifest, image, extras }
}

/** Read one atlas header; the format must be PNG or WebP and the size must be readable. */
export function readAtlasSize(bytes: Uint8Array): AtlasSize {
  let size: { width?: number, height?: number, type?: string }
  try {
    size = imageSize(bytes)
  } catch (error) {
    throw new PetRefusal(`the atlas header could not be read: ${(error as { message?: string } | null)?.message ?? String(error)}`, 400)
  }
  if (size.type !== 'png' && size.type !== 'webp') throw new PetRefusal('the atlas must be a PNG or WebP image', 415)
  if (typeof size.width !== 'number' || typeof size.height !== 'number' || size.width <= 0 || size.height <= 0) {
    throw new PetRefusal('the atlas has no readable size', 400)
  }
  return { width: size.width, height: size.height, type: size.type }
}

/**
 * Pack a directory the reader picked into one uncompressed ZIP for the import
 * route: the files are transferred as they are, not re-encoded.
 */
export function zipPackage(files: { name: string, bytes: Uint8Array }[]) {
  const entries: Record<string, Uint8Array> = {}
  for (const file of files) {
    checkedRootName(file.name)
    if (entries[file.name] !== undefined) throw new PetRefusal(`two files are named "${file.name}"`, 400)
    entries[file.name] = file.bytes
  }
  return zipSync(entries, { level: 0 })
}
