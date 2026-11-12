/**
 * The reader's own wallpaper, shared by both halves: which file the host half
 * holds, the formats and the size it takes, and the answer its status route
 * sends.
 */

/** Accepted content types, each with the extension the stored file carries. */
export const WALLPAPER_TYPES: Readonly<Record<string, string>> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
}

/** Largest file the host half stores: a wallpaper scene runs to tens of megabytes. */
export const WALLPAPER_MAX_BYTES = 100 * 1024 * 1024

/** The stored wallpaper, or null while the reader has none in place. */
export interface WallpaperState {
  type: string
  /** Changes whenever the bytes do, so an address naming it busts the image cache. */
  version: string
  /** Whether the file is a video: the layer and the settings preview read it here. */
  video: boolean
}

/** The status route's answer. */
export interface WallpaperAnswer {
  ok: true
  wallpaper: WallpaperState | null
}
