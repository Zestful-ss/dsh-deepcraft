/**
 * The pets library: the directories the official desktop player scans and the
 * imports that fill them (D78).
 *
 * Every package lives at `~/.petdex/pets/<id>/` with its manifest and atlas
 * exactly as they arrived; the official player selects one by that directory
 * name through `PETDEX_PET`, so no path and no global setting of its own is
 * touched. Content is identified by
 * `SHA256(manifest bytes || 0x00 || atlas bytes)`: the same content reuses its
 * directory, different content under the same manifest id installs beside it
 * under a hash name, and an existing package is never overwritten.
 */
import { randomUUID } from 'node:crypto'
import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import {
  PET_ARCHIVE_MAX_BYTES,
  PET_IMAGE_MAX_BYTES,
  PET_MANIFEST_MAX_BYTES,
  isPetId,
  petdexPreset,
  presetImageUrl,
  presetManifestUrl,
} from '@dsh-deepcraft/contracts/pets'
import type { PetDescriptor, PetLibraryError } from '@dsh-deepcraft/contracts/pets'
import { PETS_IMAGE_PATH } from '@dsh-deepcraft/contracts/routes'
import { pickPetFiles, readAtlasSize, readManifestObject, readZip } from './codecs.js'
import { PetRefusal } from './errors.js'
import { MANIFEST_NAME, parsePet, usableDirectoryName } from './manifest.js'
import type { ParsedPet } from './manifest.js'

/** The directory the official desktop player scans. */
function petsRoot() {
  return join(homedir(), '.petdex', 'pets')
}

/** Imports are staged on the same volume as the pets root, so the final rename never crosses one. */
function stagingRoot() {
  return join(homedir(), '.petdex', '.dsh-staging')
}

/** One cached descriptor, keyed by the files' stamps: a package rewritten under us is read again. */
interface CachedPet {
  stamp: string
  descriptor: PetDescriptor
}

const cache = new Map<string, CachedPet>()

/** Imports run one at a time in this process; two renames into the same name would race. */
let queue: Promise<unknown> = Promise.resolve()

function serialized<T>(task: () => Promise<T>): Promise<T> {
  const next = queue.then(task, task)
  queue = next.catch(() => undefined)
  return next
}

/** The descriptor for one parsed package, with the host half's versioned image address. */
function descriptorFor(name: string, parsed: ParsedPet): PetDescriptor {
  return {
    id: name,
    sourceId: parsed.sourceId,
    displayName: parsed.displayName,
    spriteVersionNumber: parsed.spriteVersionNumber,
    frameWidth: parsed.frameWidth,
    frameHeight: parsed.frameHeight,
    atlasRows: parsed.atlasRows,
    version: parsed.version,
    imageUrl: `${PETS_IMAGE_PATH}/${encodeURIComponent(name)}?v=${parsed.version}`,
  }
}

/** Whether a name can be a package directory. */
function checkedName(name: string) {
  if (!isPetId(name)) throw new PetRefusal(`"${name}" is not a pet id`, 400)
  return name
}

/** The manifest's own JSON, read only far enough to learn its atlas filename. */
function atlasNameOf(manifestBytes: Uint8Array) {
  const path = readManifestObject(manifestBytes).spritesheetPath
  if (typeof path !== 'string') throw new PetRefusal('the manifest names no spritesheetPath', 400)
  return path
}

/** One directory's manifest and atlas stamps, for the cache. */
async function stampOf(dir: string, atlasName: string) {
  const [manifest, atlas] = await Promise.all([stat(join(dir, MANIFEST_NAME)), stat(join(dir, atlasName))])
  return `${manifest.size}:${manifest.mtimeMs}:${atlas.size}:${atlas.mtimeMs}`
}

/**
 * Read one installed package.
 *
 * @param name - its directory name, already the id the player selects.
 * @param fresh - read even when the cache holds it (an import just replaced it).
 */
async function readPetAt(name: string, fresh = false): Promise<PetDescriptor> {
  checkedName(name)
  const dir = join(petsRoot(), name)
  const manifestBytes = await readFile(join(dir, MANIFEST_NAME)).catch(() => null)
  if (manifestBytes === null) throw new PetRefusal(`"${name}" carries no ${MANIFEST_NAME}`, 400)
  const atlasName = atlasNameOf(manifestBytes)
  if (!isPetId(name)) throw new PetRefusal(`"${name}" is not a pet id`, 400)
  const imageName = atlasName
  const imageBytes = await readFile(join(dir, imageName)).catch(() => null)
  if (imageBytes === null) throw new PetRefusal(`"${name}" carries no ${imageName}`, 400)
  const stamp = await stampOf(dir, imageName).catch(() => '')
  const cached = cache.get(name)
  if (!fresh && cached !== undefined && cached.stamp === stamp) return cached.descriptor
  const parsed = parsePet(manifestBytes, imageBytes)
  const descriptor = descriptorFor(name, parsed)
  cache.set(name, { stamp, descriptor })
  return descriptor
}

/** Every package the root holds, and every directory that cannot be read. */
export async function listPets(): Promise<{ pets: PetDescriptor[], invalid: PetLibraryError[] }> {
  const entries = await readdir(petsRoot(), { withFileTypes: true }).catch(() => [])
  const names = entries.filter(entry => entry.isDirectory() && isPetId(entry.name)).map(entry => entry.name).sort()
  const pets: PetDescriptor[] = []
  const invalid: PetLibraryError[] = []
  for (const name of names) {
    try {
      pets.push(await readPetAt(name))
    } catch (error) {
      // One broken package stays one reported row; the rest of the library still loads.
      invalid.push({ id: name, error: error instanceof PetRefusal ? error.message : 'the package could not be read' })
    }
  }
  return { pets, invalid }
}

/**
 * The bytes of one package's atlas.
 *
 * @returns the untouched image and its MIME type.
 */
export async function readPetImage(name: string) {
  checkedName(name)
  const dir = join(petsRoot(), name)
  const manifestBytes = await readFile(join(dir, MANIFEST_NAME)).catch(() => null)
  if (manifestBytes === null) throw new PetRefusal(`"${name}" is not installed`, 404)
  const imageName = atlasNameOf(manifestBytes)
  const bytes = await readFile(join(dir, imageName)).catch(() => null)
  if (bytes === null) throw new PetRefusal(`"${name}" carries no ${imageName}`, 404)
  const atlas = readAtlasSize(bytes)
  return { bytes, type: atlas.type }
}

/** Write one package into its own staged directory, then move it into place. */
async function stageAndInstall(name: string, manifest: Uint8Array, image: Uint8Array, atlasName: string, extras: { name: string, bytes: Uint8Array }[]) {
  const stage = join(stagingRoot(), randomUUID())
  await mkdir(stage, { recursive: true })
  try {
    await writeFile(join(stage, MANIFEST_NAME), manifest)
    await writeFile(join(stage, atlasName), image)
    for (const extra of extras) await writeFile(join(stage, extra.name), extra.bytes)
    await mkdir(petsRoot(), { recursive: true })
    const target = join(petsRoot(), name)
    try {
      await rename(stage, target)
    } catch (error) {
      const code = (error as { code?: string } | null)?.code
      // A directory that appeared between the check and the rename is the
      // same race the caller resolves below; anything else propagates.
      if (code !== 'EEXIST' && code !== 'ENOTEMPTY' && code !== 'EPERM') throw error
      const existing = await readPetAt(name, true).catch(() => null)
      if (existing === null || existing.version !== descriptorFor(name, parsePet(manifest, image)).version) {
        throw new PetRefusal(`a different package already holds "${name}"`, 409)
      }
    }
  } finally {
    // A successful rename took the directory; a failed one leaves only its stage.
    await rm(stage, { recursive: true, force: true }).catch(() => undefined)
  }
}

/**
 * Install one verified package, reusing identical content and never
 * overwriting a different one.
 *
 * @returns the descriptor of the directory that now holds it.
 */
function installParsed(parsed: ParsedPet, manifest: Uint8Array, image: Uint8Array, extras: { name: string, bytes: Uint8Array }[]) {
  return serialized(async () => {
    const preferred = usableDirectoryName(parsed.sourceId) ? parsed.sourceId : `dsh-${parsed.version.slice(0, 48)}`
    const hashName = `dsh-${parsed.version.slice(0, 48)}`
    let name = preferred
    const existing = await readPetAt(preferred).catch((error: unknown) => {
      if (error instanceof PetRefusal) return null
      throw error
    })
    if (existing !== null) {
      if (existing.version === parsed.version) return existing
      name = hashName
      const hashed = await readPetAt(hashName).catch(() => null)
      if (hashed !== null) {
        if (hashed.version === parsed.version) return hashed
        throw new PetRefusal(`a different package already holds "${hashName}"`, 409)
      }
    }
    await stageAndInstall(name, manifest, image, parsed.spritesheetPath, extras)
    return readPetAt(name, true)
  })
}

/** The verified parts of one archive, before anything is installed. */
function unpackZip(archive: Uint8Array) {
  const { files } = readZip(archive)
  const manifest = files.get(MANIFEST_NAME)
  if (manifest === undefined) throw new PetRefusal(`the package carries no ${MANIFEST_NAME} at its root`, 400)
  const atlasName = atlasNameOf(manifest)
  const picked = pickPetFiles(files, MANIFEST_NAME, atlasName)
  return { ...picked, parsed: parsePet(picked.manifest, picked.image) }
}

/** Install one ZIP archive. */
export function importZip(archive: Uint8Array): Promise<PetDescriptor> {
  const { parsed, manifest, image, extras } = unpackZip(archive)
  return installParsed(parsed, manifest, image, extras)
}

/** Read one URL's body, refusing anything over `limit` bytes as it streams. */
async function download(url: string, limit: number) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) })
  if (!response.ok) throw new PetRefusal(`the source answered ${response.status}`, 502)
  const body = response.body
  if (body === null) throw new PetRefusal('the source answered no body', 502)
  const chunks: Uint8Array[] = []
  let size = 0
  const reader = body.getReader()
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    if (value === undefined) continue
    size += value.byteLength
    if (size > limit) {
      await reader.cancel().catch(() => undefined)
      throw new PetRefusal(`the source answered more than ${limit} bytes`, 413)
    }
    chunks.push(value)
  }
  const bytes = new Uint8Array(size)
  let at = 0
  for (const chunk of chunks) {
    bytes.set(chunk, at)
    at += chunk.byteLength
  }
  return bytes
}

/** Download and install one of the four presets, byte for byte, on first use. */
export function ensurePreset(id: string): Promise<PetDescriptor> {
  const preset = petdexPreset(id)
  if (preset === undefined) throw new PetRefusal(`"${id}" is not a preset`, 404)
  return serialized(async () => {
    const installed = await readPetAt(id).catch(() => null)
    if (installed !== null && installed.sourceId === id) return installed
    const manifest = await download(presetManifestUrl(preset), PET_MANIFEST_MAX_BYTES)
    const atlasName = atlasNameOf(manifest)
    const image = await download(presetImageUrl(preset), PET_IMAGE_MAX_BYTES)
    const parsed = parsePet(manifest, image)
    await stageAndInstall(usableDirectoryName(parsed.sourceId) ? parsed.sourceId : id, manifest, image, atlasName, [])
    return readPetAt(usableDirectoryName(parsed.sourceId) ? parsed.sourceId : id, true)
  })
}

/**
 * Install the complete package one Petdex page names. The page's slug is
 * resolved through the catalog's public answer, and only an archive on the
 * official asset host is fetched; the installer script a page links is never
 * run.
 */
export function importFromPetdex(page: string): Promise<PetDescriptor> {
  let url: URL
  try {
    url = new URL(page)
  } catch {
    throw new PetRefusal('that is not a URL', 400)
  }
  if (url.protocol !== 'https:' || (url.hostname !== 'petdex.dev' && url.hostname !== 'www.petdex.dev')) {
    throw new PetRefusal('the link must be a Petdex pet page', 415)
  }
  const match = /^\/pets\/([a-z0-9][a-z0-9-]{0,62})\/?$/.exec(url.pathname)
  if (match === null) throw new PetRefusal('the link is not a Petdex pet page', 415)
  const slug = match[1]
  // The download runs on its own; the install queue is entered once, by
  // installParsed, so this function never waits on a queue it holds.
  return (async () => {
    const installed = await readPetAt(slug).catch(() => null)
    if (installed !== null && installed.sourceId === slug) return installed
    const catalog = await downloadJson(`https://petdex.dev/api/pets/search?q=${encodeURIComponent(slug)}&sort=alpha&limit=8&includeMeta=0`)
    const pets = Array.isArray(catalog.pets) ? catalog.pets : []
    const found = pets.find(item => {
      const entry = item !== null && typeof item === 'object' ? item as Record<string, unknown> : {}
      return entry.slug === slug && typeof entry.zipUrl === 'string'
    }) as Record<string, unknown> | undefined
    if (found === undefined) throw new PetRefusal(`Petdex holds no pet named "${slug}"`, 404)
    const archiveUrl = new URL(found.zipUrl as string)
    if (archiveUrl.protocol !== 'https:' || archiveUrl.hostname !== 'assets.petdex.dev') {
      throw new PetRefusal('the catalog named an archive outside Petdex', 502)
    }
    const archive = await download(archiveUrl.href, PET_ARCHIVE_MAX_BYTES)
    const unpacked = unpackZip(archive)
    return installParsed(unpacked.parsed, unpacked.manifest, unpacked.image, unpacked.extras)
  })()
}

/** One small JSON document from a fixed URL. */
async function downloadJson(url: string) {
  const bytes = await download(url, 1024 * 1024)
  try {
    return JSON.parse(new TextDecoder().decode(bytes)) as Record<string, unknown>
  } catch (error) {
    throw new PetRefusal(`the catalog answer is not JSON: ${(error as { message?: string } | null)?.message ?? String(error)}`, 502)
  }
}
