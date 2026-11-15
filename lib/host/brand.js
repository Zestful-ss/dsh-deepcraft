// packages/contracts/src/brand.ts
var BRAND_IMAGE_KINDS = ["mark", "wordmark"];
var BRAND_IMAGE_TYPES = {
  "image/png": "png",
  "image/svg+xml": "svg",
  "image/webp": "webp"
};
var BRAND_IMAGE_MAX_BYTES = 2 * 1024 * 1024;

// packages/contracts/src/routes.ts
var ROUTE_PREFIX = "/dsh-deepcraft";
var SESSION_DELETE_PATH = `${ROUTE_PREFIX}/session-delete`;
var USAGE_PATH = `${ROUTE_PREFIX}/usage`;
var BRAND_PATH = `${ROUTE_PREFIX}/brand`;
var BRAND_MARK_PATH = `${ROUTE_PREFIX}/brand/mark`;
var BRAND_WORDMARK_PATH = `${ROUTE_PREFIX}/brand/wordmark`;
var PETS_PATH = `${ROUTE_PREFIX}/pets`;
var PETS_ENSURE_PATH = `${PETS_PATH}/ensure`;
var PETS_IMPORT_PATH = `${PETS_PATH}/import`;
var PETS_IMPORT_URL_PATH = `${PETS_PATH}/import-url`;
var SUBAGENT_MODELS_PATH = `${ROUTE_PREFIX}/subagent-models`;
var PETS_IMAGE_PATH = `${PETS_PATH}/image`;
var WALLPAPER_PATH = `${ROUTE_PREFIX}/wallpaper`;
var WALLPAPER_FILE_PATH = `${WALLPAPER_PATH}/file`;

// packages/host/src/brand.ts
import { createMediaStore, mediaFileRoute, mediaStatusRoute } from "./media-store.js";
var IMAGE_PATHS = { mark: BRAND_MARK_PATH, wordmark: BRAND_WORDMARK_PATH };
var OPTIONS = {
  dir: "brand",
  types: BRAND_IMAGE_TYPES,
  maxBytes: BRAND_IMAGE_MAX_BYTES,
  signatures: {
    "image/png": [{ offset: 0, bytes: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]) }],
    "image/webp": [{ offset: 0, bytes: Buffer.from("RIFF", "latin1") }, { offset: 8, bytes: Buffer.from("WEBP", "latin1") }]
  }
};
var IMAGE_HEADERS = {
  "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox"
};
function brandRoutes(ctx) {
  const store = createMediaStore(ctx, OPTIONS);
  const stateOf = (file) => file === null ? null : { type: file.type, version: file.version };
  const answer = () => ({ ok: true, mark: stateOf(store.find("mark")), wordmark: stateOf(store.find("wordmark")) });
  const status = { kind: "exact", path: BRAND_PATH, handler: mediaStatusRoute(ctx, answer) };
  const images = BRAND_IMAGE_KINDS.map((kind) => ({
    label: `brand ${kind}`,
    route: { kind: "exact", path: IMAGE_PATHS[kind], handler: mediaFileRoute(ctx, store, OPTIONS, kind, answer, IMAGE_HEADERS) }
  }));
  return [{ label: "brand status", route: status }, ...images];
}
export {
  brandRoutes
};
