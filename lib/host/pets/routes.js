// packages/contracts/src/pets.ts
var PET_MANIFEST_MAX_BYTES = 64 * 1024;
var PET_IMAGE_MAX_BYTES = 16 * 1024 * 1024;
var PET_ARCHIVE_MAX_BYTES = 20 * 1024 * 1024;
var PET_EXTRACTED_MAX_BYTES = 20 * 1024 * 1024;
var PET_ID_RE = /^[a-z0-9][a-z0-9-]{0,62}$/;
var PETDEX_ASSETS = "https://assets.petdex.dev/pets/";
var PETDEX_PRESETS = [
  { id: "crab-buddy", pageUrl: "https://petdex.dev/pets/crab-buddy", assetBase: `${PETDEX_ASSETS}crab-buddy-cc20d1c90732/` },
  { id: "claude-opus-scholar", pageUrl: "https://petdex.dev/pets/claude-opus-scholar", assetBase: `${PETDEX_ASSETS}claude-opus-scholar-88dade9b63fd/` },
  { id: "whaledou", pageUrl: "https://petdex.dev/pets/whaledou", assetBase: `${PETDEX_ASSETS}whaledou-c4cb6b24fb56/` },
  { id: "deepseek", pageUrl: "https://petdex.dev/pets/deepseek", assetBase: `${PETDEX_ASSETS}deepseek-c3fa684cfe03/` }
];
function isPetId(value) {
  return PET_ID_RE.test(value);
}

// packages/contracts/src/routes.ts
var ROUTE_PREFIX = "/dsh-deepcraft";
var USERNAME_PATH = `${ROUTE_PREFIX}/username`;
var HDSL_PATH = `${ROUTE_PREFIX}/hdsl`;
var HDSL_SKIN_PATH = `${ROUTE_PREFIX}/hdsl-skin.png`;
var SESSION_DELETE_PATH = `${ROUTE_PREFIX}/session-delete`;
var USAGE_PATH = `${ROUTE_PREFIX}/usage`;
var SESSION_SEARCH_PATH = `${ROUTE_PREFIX}/session-search`;
var BRAND_PATH = `${ROUTE_PREFIX}/brand`;
var BRAND_MARK_PATH = `${ROUTE_PREFIX}/brand/mark`;
var BRAND_WORDMARK_PATH = `${ROUTE_PREFIX}/brand/wordmark`;
var PEAKRATE_PATH = `${ROUTE_PREFIX}/peakrate`;
var PETS_PATH = `${ROUTE_PREFIX}/pets`;
var PETS_ENSURE_PATH = `${PETS_PATH}/ensure`;
var PETS_IMPORT_PATH = `${PETS_PATH}/import`;
var PETS_IMPORT_URL_PATH = `${PETS_PATH}/import-url`;
var PETS_IMAGE_PATH = `${PETS_PATH}/image`;
var PETS_DESKTOP_PATH = `${PETS_PATH}/desktop`;
var PETS_DESKTOP_SYNC_PATH = `${PETS_PATH}/desktop/sync`;

// packages/engine/node/http.ts
function refusalOf(ctx, req) {
  const connection = ctx.get("connection");
  if (typeof connection?.requestRejection === "function") return connection.requestRejection(req);
  if (!isLoopbackPeer(req.socket.remoteAddress)) return 403;
  const host = req.headers.host;
  if (host !== void 0) {
    if (!URL.canParse(`http://${host}`)) return 403;
    const name = new URL(`http://${host}`).hostname;
    if (name !== "localhost" && name !== "[::1]" && !/^127\.\d+\.\d+\.\d+$/.test(name)) return 403;
  }
  const site = req.headers["sec-fetch-site"];
  if (site !== void 0 && site !== "same-origin" && site !== "none") return 403;
  const origin = req.headers.origin;
  if (origin === void 0) return void 0;
  if (!URL.canParse(origin)) return 403;
  return new URL(origin).host === host ? void 0 : 403;
}
function isLoopbackPeer(address) {
  if (address === void 0) return false;
  const plain = address.startsWith("::ffff:") ? address.slice("::ffff:".length) : address;
  return plain === "::1" || /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(plain);
}
function sendJson(res, status, payload) {
  const body = Buffer.from(JSON.stringify(payload));
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": String(body.byteLength),
    "cache-control": "no-store"
  });
  res.end(body);
}
function methodRefused(req, res, methods) {
  if (req.method !== void 0 && methods.includes(req.method)) return false;
  res.writeHead(405, { allow: methods.join(", ") });
  res.end();
  return true;
}
function fenceRefused(ctx, req, res) {
  const refused = refusalOf(ctx, req);
  if (refused === void 0) return false;
  sendJson(res, refused, { ok: false, error: refused === 401 ? "unauthorized" : "forbidden" });
  return true;
}
function readRequestBody(req, limit) {
  return new Promise((settle) => {
    const chunks = [];
    let size = 0;
    let over = false;
    req.on("data", (chunk) => {
      if (over) return;
      size += chunk.length;
      if (size > limit) {
        over = true;
        settle(null);
        return;
      }
      chunks.push(Buffer.from(chunk));
    });
    req.on("end", () => {
      if (!over) settle(Buffer.concat(chunks));
    });
    req.on("error", () => {
      if (!over) settle(null);
    });
  });
}

// packages/host/src/pets/routes.ts
import { desktopPetStatus, syncDesktopPets } from "./desktop.js";
import { PetRefusal } from "./errors.js";
import { ensurePreset, importFromPetdex, importZip, listPets, readPetImage } from "./library.js";
var JSON_BODY_MAX = 8 * 1024;
var ID_IN_PATH_RE = /^([a-z0-9][a-z0-9-]{0,62})$/;
async function jsonBody(req) {
  const raw = await readRequestBody(req, JSON_BODY_MAX);
  if (raw === null) throw new PetRefusal(`the request is larger than ${JSON_BODY_MAX} bytes`, 413);
  let body;
  try {
    body = JSON.parse(raw.toString("utf8"));
  } catch {
    throw new PetRefusal("the request is not JSON", 400);
  }
  if (body === null || typeof body !== "object" || Array.isArray(body)) throw new PetRefusal("the request is not a JSON object", 400);
  return body;
}
function sendFailure(res, error, fallback) {
  if (error instanceof PetRefusal) {
    sendJson(res, error.status, { ok: false, error: error.message });
    return;
  }
  sendJson(res, 500, { ok: false, error: fallback });
}
function answer(res, promise) {
  void promise.then((payload) => {
    sendJson(res, 200, { ok: true, ...payload });
  }, (error) => {
    sendFailure(res, error, error?.message ?? String(error));
  });
}
function guarded(ctx, req, res, methods) {
  return methodRefused(req, res, methods) || fenceRefused(ctx, req, res);
}
function petRoutes(ctx) {
  return [{
    label: "pets library",
    route: {
      kind: "exact",
      path: PETS_PATH,
      handler: (req, res) => {
        if (guarded(ctx, req, res, ["GET", "HEAD"])) return;
        answer(res, listPets());
      }
    }
  }, {
    label: "pet ensure",
    route: {
      kind: "exact",
      path: PETS_ENSURE_PATH,
      handler: (req, res) => {
        if (guarded(ctx, req, res, ["POST"])) return;
        answer(res, jsonBody(req).then((body) => {
          if (typeof body.id !== "string" || !isPetId(body.id)) throw new PetRefusal("the request names no pet id", 400);
          return ensurePreset(body.id).then((pet) => ({ pet }));
        }));
      }
    }
  }, {
    label: "pet import",
    route: {
      kind: "exact",
      path: PETS_IMPORT_PATH,
      handler: (req, res) => {
        if (guarded(ctx, req, res, ["POST"])) return;
        const type = String(req.headers["content-type"] ?? "").split(";")[0].trim().toLowerCase();
        if (type !== "application/zip" && type !== "application/x-zip-compressed") {
          sendJson(res, 415, { ok: false, error: "the import must be a ZIP archive" });
          return;
        }
        answer(res, readRequestBody(req, PET_ARCHIVE_MAX_BYTES).then((raw) => {
          if (raw === null) throw new PetRefusal(`the archive is larger than ${PET_ARCHIVE_MAX_BYTES} bytes`, 413);
          return importZip(new Uint8Array(raw)).then((pet) => ({ pet }));
        }));
      }
    }
  }, {
    label: "pet import link",
    route: {
      kind: "exact",
      path: PETS_IMPORT_URL_PATH,
      handler: (req, res) => {
        if (guarded(ctx, req, res, ["POST"])) return;
        answer(res, jsonBody(req).then((body) => {
          if (typeof body.url !== "string") throw new PetRefusal("the request names no Petdex link", 400);
          return importFromPetdex(body.url).then((pet) => ({ pet }));
        }));
      }
    }
  }, {
    label: "pet image",
    route: {
      kind: "prefix",
      path: PETS_IMAGE_PATH,
      handler: (req, res) => {
        if (guarded(ctx, req, res, ["GET", "HEAD"])) return;
        const sub = new URL(req.url ?? "/", "http://local").pathname.slice(PETS_IMAGE_PATH.length);
        const match = /^\/([^/]+)$/.exec(sub);
        let name = "";
        try {
          name = match === null ? "" : decodeURIComponent(match[1]);
        } catch {
        }
        if (!ID_IN_PATH_RE.test(name)) {
          sendJson(res, 404, { ok: false, error: "no such pet" });
          return;
        }
        void readPetImage(name).then(({ bytes, type }) => {
          res.writeHead(200, {
            "content-type": type === "png" ? "image/png" : "image/webp",
            "content-length": String(bytes.byteLength),
            // The address carries the content version, so a hit is the same bytes.
            "cache-control": "private, max-age=31536000, immutable",
            "x-content-type-options": "nosniff"
          });
          res.end(req.method === "HEAD" ? void 0 : Buffer.from(bytes));
        }, (error) => {
          sendFailure(res, error, "the image could not be read");
        });
      }
    }
  }, {
    label: "desktop pet status",
    route: {
      kind: "exact",
      path: PETS_DESKTOP_PATH,
      handler: (req, res) => {
        if (guarded(ctx, req, res, ["GET", "HEAD"])) return;
        sendJson(res, 200, { ok: true, status: desktopPetStatus() });
      }
    }
  }, {
    label: "desktop pet sync",
    route: {
      kind: "exact",
      path: PETS_DESKTOP_SYNC_PATH,
      handler: (req, res) => {
        if (guarded(ctx, req, res, ["POST"])) return;
        void jsonBody(req).then((body) => {
          if (typeof body.enabled !== "boolean") throw new PetRefusal("the request carries no enabled flag", 400);
          if (typeof body.petId !== "string" || !isPetId(body.petId)) throw new PetRefusal("the request names no pet id", 400);
          const selection = { enabled: body.enabled, petId: body.petId };
          sendJson(res, 200, { ok: true, status: syncDesktopPets(ctx, selection) });
        }, (error) => {
          sendFailure(res, error, "the request could not be read");
        });
      }
    }
  }];
}
export {
  petRoutes
};
