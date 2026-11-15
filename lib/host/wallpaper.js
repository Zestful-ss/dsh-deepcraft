// packages/contracts/src/wallpaper.ts
var WALLPAPER_TYPES = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "video/mp4": "mp4"
};
var WALLPAPER_MAX_BYTES = 100 * 1024 * 1024;

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

// packages/host/src/wallpaper.ts
import { createMediaStore, mediaFileRoute, mediaStatusRoute } from "./media-store.js";
var KIND = "wallpaper";
var OPTIONS = {
  dir: "wallpaper",
  types: WALLPAPER_TYPES,
  maxBytes: WALLPAPER_MAX_BYTES,
  signatures: {
    "image/png": [{ offset: 0, bytes: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]) }],
    "image/jpeg": [{ offset: 0, bytes: Buffer.from([255, 216, 255]) }],
    "image/webp": [{ offset: 0, bytes: Buffer.from("RIFF", "latin1") }, { offset: 8, bytes: Buffer.from("WEBP", "latin1") }],
    // An MP4 box opens with a length and the `ftyp` brand tag.
    "video/mp4": [{ offset: 4, bytes: Buffer.from("ftyp", "latin1") }]
  }
};
function wallpaperRoutes(ctx) {
  const store = createMediaStore(ctx, OPTIONS);
  const answer = () => {
    const found = store.find(KIND);
    return { ok: true, wallpaper: found === null ? null : { type: found.type, version: found.version, video: found.type === "video/mp4" } };
  };
  const status = { kind: "exact", path: WALLPAPER_PATH, handler: mediaStatusRoute(ctx, answer) };
  const file = {
    kind: "exact",
    path: WALLPAPER_FILE_PATH,
    handler: mediaFileRoute(ctx, store, OPTIONS, KIND, answer)
  };
  return [
    { label: "wallpaper status", route: status },
    { label: "wallpaper file", route: file }
  ];
}
export {
  wallpaperRoutes
};
