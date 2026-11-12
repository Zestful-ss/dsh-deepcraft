import { WALLPAPER_FILE_ROUTE, WALLPAPER_ROUTE } from '../constants'
import { changeJson, readJson } from './host-json'
import type { WallpaperAnswer, WallpaperState } from '@dsh-deepcraft/contracts/wallpaper'
import { notifyAll } from '@dsh-deepcraft/engine/notify'

/**
 * The reader's own wallpaper as the page paints it: which file the host half
 * holds, each with an address that changes with its bytes. The wallpaper
 * feature's layer paints it (features/wallpaper/wallpaper.ts) and the settings
 * page replaces and removes it; both follow this one state.
 */

/** What the feature and the settings page read: the stored file, and its address. */
export interface WallpaperFile {
  state: WallpaperState
  url: string
}

let file: WallpaperFile | null = null
let requested = false
/** Bumped by every read, so an answer that arrives after a newer one is dropped. */
let generation = 0
const listeners: ((file: WallpaperFile | null) => void)[] = []

/** The file's address, versioned so a replaced file is never served from cache. */
function urlOf(state: WallpaperState) {
  return `${WALLPAPER_FILE_ROUTE}?v=${encodeURIComponent(state.version)}`
}

function adopt(answer: WallpaperAnswer | { ok: false }, at: number): WallpaperFile | null {
  if (at !== generation) return file
  file = answer.ok === true && answer.wallpaper !== null
    ? { state: answer.wallpaper, url: urlOf(answer.wallpaper) }
    : null
  notifyAll(listeners, file)
  return file
}

/** The current wallpaper, or null while the reader has none in place. */
export function readWallpaper() {
  return file
}

/** Follow the wallpaper state; returns the unsubscriber. */
export function subscribeWallpaper(listener: (file: WallpaperFile | null) => void) {
  listeners.push(listener)
  return () => {
    const at = listeners.indexOf(listener)
    if (at !== -1) listeners.splice(at, 1)
  }
}

/**
 * Read the host half's answer, once per page unless told to read again (a file
 * dropped in by hand is seen on the next `fresh` read). A host half that does
 * not answer leaves no wallpaper (D12).
 */
export function loadWallpaper(fresh = false): Promise<WallpaperFile | null> {
  if (requested && !fresh) return Promise.resolve(file)
  requested = true
  const at = ++generation
  return readJson<WallpaperAnswer>(WALLPAPER_ROUTE)
    .then((answer) => adopt(answer, at), () => file)
}

/** One change through the file route: `PUT` the bytes, `DELETE` removes them. */
function change(init: RequestInit) {
  const at = ++generation
  return changeJson<WallpaperAnswer>(WALLPAPER_FILE_ROUTE, init)
    .then(answer => adopt(answer, at))
}

/** Replace the wallpaper with a file the reader picked; the content type names its format. */
export function uploadWallpaper(picked: File) {
  return change({ method: 'PUT', headers: { 'content-type': picked.type }, body: picked })
}

/** Remove the wallpaper: the palette's own ground comes back in its place. */
export function removeWallpaper() {
  return change({ method: 'DELETE' })
}
