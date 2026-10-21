/**
 * The pets library as the browser half reads it (D78): one shared client for
 * every caller, one in-flight request per question, and the installed list
 * that both the mascot and the settings page follow.
 *
 * The host half owns every file; this module never learns a path or a token.
 */
import { zipSync } from 'fflate'
import type {
  PetDescriptor,
  PetLibraryError,
} from '@dsh-deepcraft/contracts/pets'
import { PET_MANIFEST_FILE } from '@dsh-deepcraft/contracts/pets'
import {
  PETS_ENSURE_ROUTE,
  PETS_IMPORT_ROUTE,
  PETS_IMPORT_URL_ROUTE,
  PETS_ROUTE,
} from '../constants'

/** The installed packages, as the last answer listed them. */
export interface PetLibrary {
  pets: PetDescriptor[]
  invalid: PetLibraryError[]
}

let library: PetLibrary = { pets: [], invalid: [] }
const listeners: ((library: PetLibrary) => void)[] = []
let loading: Promise<PetLibrary> | null = null

/** The library in hand (live object; treat as read-only). */
export function readPetLibrary() {
  return library
}

/** Observe library changes; returns the unsubscriber. */
export function subscribePetLibrary(listener: (library: PetLibrary) => void) {
  listeners.push(listener)
  return () => {
    const at = listeners.indexOf(listener)
    if (at >= 0) listeners.splice(at, 1)
  }
}

function adopt(next: PetLibrary) {
  library = next
  for (const listener of [...listeners]) listener(library)
}

/** Add or replace one descriptor the host answered with, keeping the rest of the list. */
function adoptPet(pet: PetDescriptor) {
  const pets = library.pets.filter(item => item.id !== pet.id)
  pets.push(pet)
  pets.sort((a, b) => a.id.localeCompare(b.id))
  adopt({ pets, invalid: library.invalid.filter(item => item.id !== pet.id) })
}

/** The reason a host refusal carries, as one error for the caller to show. */
async function refusal(response: Response) {
  const body = await response.json().catch(() => null) as { error?: unknown } | null
  const reason = body !== null && typeof body.error === 'string' ? body.error : `the host answered ${response.status}`
  return new Error(reason)
}

/** Read the installed packages once; a second caller awaits the same request. */
export function loadPetLibrary(force = false): Promise<PetLibrary> {
  if (loading !== null) return loading
  if (!force && library.pets.length > 0) return Promise.resolve(library)
  loading = fetch(PETS_ROUTE, { headers: { accept: 'application/json' } })
    .then(async (response) => {
      if (!response.ok) throw await refusal(response)
      const body = await response.json() as { pets?: PetDescriptor[], invalid?: PetLibraryError[] }
      adopt({ pets: body.pets ?? [], invalid: body.invalid ?? [] })
      return library
    })
    .finally(() => {
      loading = null
    })
  return loading
}

/**
 * Make sure one package is installed. A preset missing from the library is
 * downloaded by the host half on this call; an id the host does not know is
 * refused with its reason.
 */
export async function ensurePet(id: string): Promise<PetDescriptor> {
  // An installed package — a preset from an earlier run or an imported one —
  // is already in the library, and only a preset the library lacks is fetched
  // from the host's download route.
  const known = library.pets.find(pet => pet.id === id)
  if (known !== undefined) return known
  const listed = await loadPetLibrary().catch(() => null)
  const installed = listed?.pets.find(pet => pet.id === id)
  if (installed !== undefined) return installed
  const response = await fetch(PETS_ENSURE_ROUTE, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id }),
  })
  if (!response.ok) throw await refusal(response)
  const body = await response.json() as { pet: PetDescriptor }
  adoptPet(body.pet)
  return body.pet
}

/** Install one ZIP archive as it arrived. */
export async function importPetArchive(archive: Blob | Uint8Array): Promise<PetDescriptor> {
  // fflate hands back a view over a plain ArrayBuffer; the cast names that,
  // where the DOM types only accept an ArrayBufferView of a known buffer.
  const payload = archive instanceof Uint8Array
    ? new Blob([archive.buffer.slice(archive.byteOffset, archive.byteOffset + archive.byteLength) as ArrayBuffer])
    : archive
  const response = await fetch(PETS_IMPORT_ROUTE, {
    method: 'POST',
    headers: { 'content-type': 'application/zip' },
    body: payload,
  })
  if (!response.ok) throw await refusal(response)
  const answer = await response.json() as { pet: PetDescriptor }
  adoptPet(answer.pet)
  return answer.pet
}

/**
 * Pack the files of one picked directory, as they are, into an uncompressed
 * archive for the import route. Only the package's own root files travel: a
 * subdirectory means the reader picked the parent folder, and the host half
 * would refuse the wrapped archive anyway.
 */
export async function importPetFolder(files: FileList): Promise<PetDescriptor> {
  const entries: Record<string, Uint8Array> = {}
  for (const file of Array.from(files)) {
    const relative = (file as File & { webkitRelativePath?: string }).webkitRelativePath ?? file.name
    const name = relative.split('/').pop() ?? ''
    if (relative.includes('/') && relative.split('/').length !== 2) {
      throw new Error('pick the folder that holds pet.json itself, not one above it')
    }
    if (name === '') continue
    if (entries[name] !== undefined) throw new Error(`two files are named "${name}"`)
    entries[name] = new Uint8Array(await file.arrayBuffer())
  }
  if (entries[PET_MANIFEST_FILE] === undefined) throw new Error(`the folder carries no ${PET_MANIFEST_FILE}`)
  return importPetArchive(zipSync(entries, { level: 0 }))
}

/** Install the complete package one Petdex pet page names. */
export async function importPetLink(url: string): Promise<PetDescriptor> {
  const response = await fetch(PETS_IMPORT_URL_ROUTE, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ url }),
  })
  if (!response.ok) throw await refusal(response)
  const body = await response.json() as { pet: PetDescriptor }
  adoptPet(body.pet)
  return body.pet
}

/** Decode one pet's atlas before it is put on show; a broken file fails here, not as an empty box. */
export async function decodePet(pet: PetDescriptor) {
  const image = new Image()
  image.src = pet.imageUrl
  await image.decode()
}
