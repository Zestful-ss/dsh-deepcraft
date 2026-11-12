/**
 * The reader's own wallpaper (one file, image or video), kept under the
 * harness home's `dsh-deepcraft/wallpaper/` as `wallpaper.<ext>`.
 *
 * The status route answers whether one is in place and its version; the file
 * route serves the bytes (whole or by range, for the `<video>` element),
 * replaces them on `PUT` and removes them on `DELETE` (D75).
 */
import { WALLPAPER_MAX_BYTES, WALLPAPER_TYPES } from '@dsh-deepcraft/contracts/wallpaper'
import type { WallpaperAnswer } from '@dsh-deepcraft/contracts/wallpaper'
import { WALLPAPER_FILE_PATH, WALLPAPER_PATH } from '@dsh-deepcraft/contracts/routes'
import type { DshContext, DshRoute } from '@dsh-deepcraft/engine/node/dsh'
import { createMediaStore, mediaFileRoute, mediaStatusRoute } from './media-store.js'
import type { MediaFile } from './media-store.js'

const KIND = 'wallpaper'

const OPTIONS = {
  dir: 'wallpaper',
  types: WALLPAPER_TYPES,
  maxBytes: WALLPAPER_MAX_BYTES,
  signatures: {
    'image/png': [{ offset: 0, bytes: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) }],
    'image/jpeg': [{ offset: 0, bytes: Buffer.from([0xff, 0xd8, 0xff]) }],
    'image/webp': [{ offset: 0, bytes: Buffer.from('RIFF', 'latin1') }, { offset: 8, bytes: Buffer.from('WEBP', 'latin1') }],
    // An MP4 box opens with a length and the `ftyp` brand tag.
    'video/mp4': [{ offset: 4, bytes: Buffer.from('ftyp', 'latin1') }],
  },
} as const

/**
 * The wallpaper routes, for the caller to register one by one.
 *
 * @param ctx - host plugin context.
 * @returns each route with the label its registration failure is reported under.
 */
export function wallpaperRoutes(ctx: DshContext): { label: string, route: DshRoute }[] {
  const store = createMediaStore(ctx, OPTIONS)
  const answer = (): WallpaperAnswer => {
    const found: MediaFile | null = store.find(KIND)
    return { ok: true, wallpaper: found === null ? null : { type: found.type, version: found.version, video: found.type === 'video/mp4' } }
  }
  const status: DshRoute = { kind: 'exact', path: WALLPAPER_PATH, handler: mediaStatusRoute(ctx, answer) }
  const file: DshRoute = {
    kind: 'exact',
    path: WALLPAPER_FILE_PATH,
    handler: mediaFileRoute(ctx, store, OPTIONS, KIND, answer),
  }
  return [
    { label: 'wallpaper status', route: status },
    { label: 'wallpaper file', route: file },
  ]
}
