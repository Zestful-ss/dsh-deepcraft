// packages/contracts/src/pet-sound.ts
var PET_SOUND_EVENTS = ["select", "start", "attention", "error"];
var PET_SOUND_TYPES = {
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "audio/ogg": "ogg",
  "audio/mp4": "m4a"
};
var PET_SOUND_MAX_BYTES = 5 * 1024 * 1024;

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
var PET_SOUNDS_PATH = `${ROUTE_PREFIX}/pet-sounds`;
var PET_SOUND_FILE_PATH = `${PET_SOUNDS_PATH}/file`;
var WALLPAPER_PATH = `${ROUTE_PREFIX}/wallpaper`;
var WALLPAPER_FILE_PATH = `${WALLPAPER_PATH}/file`;

// packages/host/src/pet-sound.ts
import { createMediaStore, mediaFileRoute, mediaStatusRoute } from "./media-store.js";
var OPTIONS = {
  dir: "pet-sounds",
  types: PET_SOUND_TYPES,
  maxBytes: PET_SOUND_MAX_BYTES
};
function eventOf(req) {
  const value = new URL(req.url ?? "/", "http://local").searchParams.get("event");
  return PET_SOUND_EVENTS.includes(value) ? value : null;
}
function petSoundRoutes(ctx) {
  const store = createMediaStore(ctx, OPTIONS);
  const stateOf = (file2) => file2 === null ? null : { type: file2.type, version: file2.version };
  const answer = () => ({
    ok: true,
    sounds: Object.fromEntries(PET_SOUND_EVENTS.map((event) => [event, stateOf(store.find(event))]))
  });
  const status = { kind: "exact", path: PET_SOUNDS_PATH, handler: mediaStatusRoute(ctx, answer) };
  const file = {
    kind: "exact",
    path: PET_SOUND_FILE_PATH,
    handler: (req, res) => {
      const event = eventOf(req);
      if (event === null) {
        res.once("finish", () => setTimeout(() => req.socket.end(), 0));
        res.writeHead(400, { "content-type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "unknown sound event" }));
        return;
      }
      mediaFileRoute(ctx, store, OPTIONS, event, answer)(req, res);
    }
  };
  return [
    { label: "pet sounds status", route: status },
    { label: "pet sound file", route: file }
  ];
}
export {
  petSoundRoutes
};
