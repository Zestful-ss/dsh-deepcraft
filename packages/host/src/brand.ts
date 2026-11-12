/**
 * The reader's own brand images (D80), kept under the harness home's
 * `dsh-deepcraft/brand/` as `mark.<ext>` and `wordmark.<ext>`.
 *
 * The status route answers which images are in place and each one's version;
 * the image routes serve, replace and remove the bytes (D75).
 */
import { BRAND_IMAGE_KINDS, BRAND_IMAGE_MAX_BYTES, BRAND_IMAGE_TYPES } from '@dsh-deepcraft/contracts/brand'
import type { BrandAnswer, BrandImageKind, BrandImageState } from '@dsh-deepcraft/contracts/brand'
import { BRAND_MARK_PATH, BRAND_PATH, BRAND_WORDMARK_PATH } from '@dsh-deepcraft/contracts/routes'
import type { DshContext, DshRoute } from '@dsh-deepcraft/engine/node/dsh'
import { createMediaStore, mediaFileRoute, mediaStatusRoute } from './media-store.js'
import type { MediaFile } from './media-store.js'

/** Each image's route. */
const IMAGE_PATHS: Record<BrandImageKind, string> = { mark: BRAND_MARK_PATH, wordmark: BRAND_WORDMARK_PATH }

const OPTIONS = {
  dir: 'brand',
  types: BRAND_IMAGE_TYPES,
  maxBytes: BRAND_IMAGE_MAX_BYTES,
  signatures: {
    'image/png': [{ offset: 0, bytes: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) }],
    'image/webp': [{ offset: 0, bytes: Buffer.from('RIFF', 'latin1') }, { offset: 8, bytes: Buffer.from('WEBP', 'latin1') }],
  },
} as const

/**
 * Headers on every image answer. An SVG is a document that can carry script:
 * opened at its own address, `sandbox` keeps it from running any, and
 * `nosniff` keeps the browser from reading the bytes as another type.
 */
const IMAGE_HEADERS = {
  'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
}

/**
 * The brand routes, for the caller to register one by one.
 *
 * @param ctx - host plugin context.
 * @returns each route with the label its registration failure is reported under.
 */
export function brandRoutes(ctx: DshContext): { label: string, route: DshRoute }[] {
  const store = createMediaStore<BrandImageKind>(ctx, OPTIONS)
  const stateOf = (file: MediaFile | null): BrandImageState | null =>
    file === null ? null : { type: file.type, version: file.version }
  const answer = (): BrandAnswer => ({ ok: true, mark: stateOf(store.find('mark')), wordmark: stateOf(store.find('wordmark')) })

  const status: DshRoute = { kind: 'exact', path: BRAND_PATH, handler: mediaStatusRoute(ctx, answer) }
  const images = BRAND_IMAGE_KINDS.map((kind): { label: string, route: DshRoute } => ({
    label: `brand ${kind}`,
    route: { kind: 'exact', path: IMAGE_PATHS[kind], handler: mediaFileRoute(ctx, store, OPTIONS, kind, answer, IMAGE_HEADERS) },
  }))
  return [{ label: 'brand status', route: status }, ...images]
}
