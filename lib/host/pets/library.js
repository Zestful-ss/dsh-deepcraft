// packages/host/src/pets/library.ts
import { randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

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
function petdexPreset(id) {
  return PETDEX_PRESETS.find((preset) => preset.id === id);
}
function presetManifestUrl(preset) {
  return `${preset.assetBase}petjson.json`;
}
function presetImageUrl(preset) {
  return `${preset.assetBase}sprite.webp`;
}
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

// packages/host/src/pets/library.ts
import { pickPetFiles, readAtlasSize, readManifestObject, readZip } from "./codecs.js";
import { PetRefusal } from "./errors.js";
import { MANIFEST_NAME, parsePet, usableDirectoryName } from "./manifest.js";
function petsRoot() {
  return join(homedir(), ".petdex", "pets");
}
function stagingRoot() {
  return join(homedir(), ".petdex", ".dsh-staging");
}
var cache = /* @__PURE__ */ new Map();
var queue = Promise.resolve();
function serialized(task) {
  const next = queue.then(task, task);
  queue = next.catch(() => void 0);
  return next;
}
function descriptorFor(name, parsed) {
  return {
    id: name,
    sourceId: parsed.sourceId,
    displayName: parsed.displayName,
    spriteVersionNumber: parsed.spriteVersionNumber,
    frameWidth: parsed.frameWidth,
    frameHeight: parsed.frameHeight,
    atlasRows: parsed.atlasRows,
    version: parsed.version,
    imageUrl: `${PETS_IMAGE_PATH}/${encodeURIComponent(name)}?v=${parsed.version}`
  };
}
function checkedName(name) {
  if (!isPetId(name)) throw new PetRefusal(`"${name}" is not a pet id`, 400);
  return name;
}
function atlasNameOf(manifestBytes) {
  const path = readManifestObject(manifestBytes).spritesheetPath;
  if (typeof path !== "string") throw new PetRefusal("the manifest names no spritesheetPath", 400);
  return path;
}
async function stampOf(dir, atlasName) {
  const [manifest, atlas] = await Promise.all([stat(join(dir, MANIFEST_NAME)), stat(join(dir, atlasName))]);
  return `${manifest.size}:${manifest.mtimeMs}:${atlas.size}:${atlas.mtimeMs}`;
}
async function readPetAt(name, fresh = false) {
  checkedName(name);
  const dir = join(petsRoot(), name);
  const manifestBytes = await readFile(join(dir, MANIFEST_NAME)).catch(() => null);
  if (manifestBytes === null) throw new PetRefusal(`"${name}" carries no ${MANIFEST_NAME}`, 400);
  const atlasName = atlasNameOf(manifestBytes);
  if (!isPetId(name)) throw new PetRefusal(`"${name}" is not a pet id`, 400);
  const imageName = atlasName;
  const imageBytes = await readFile(join(dir, imageName)).catch(() => null);
  if (imageBytes === null) throw new PetRefusal(`"${name}" carries no ${imageName}`, 400);
  const stamp = await stampOf(dir, imageName).catch(() => "");
  const cached = cache.get(name);
  if (!fresh && cached !== void 0 && cached.stamp === stamp) return cached.descriptor;
  const parsed = parsePet(manifestBytes, imageBytes);
  const descriptor = descriptorFor(name, parsed);
  cache.set(name, { stamp, descriptor });
  return descriptor;
}
async function listPets() {
  const entries = await readdir(petsRoot(), { withFileTypes: true }).catch(() => []);
  const names = entries.filter((entry) => entry.isDirectory() && isPetId(entry.name)).map((entry) => entry.name).sort();
  const pets = [];
  const invalid = [];
  for (const name of names) {
    try {
      pets.push(await readPetAt(name));
    } catch (error) {
      invalid.push({ id: name, error: error instanceof PetRefusal ? error.message : "the package could not be read" });
    }
  }
  return { pets, invalid };
}
async function readPetImage(name) {
  checkedName(name);
  const dir = join(petsRoot(), name);
  const manifestBytes = await readFile(join(dir, MANIFEST_NAME)).catch(() => null);
  if (manifestBytes === null) throw new PetRefusal(`"${name}" is not installed`, 404);
  const imageName = atlasNameOf(manifestBytes);
  const bytes = await readFile(join(dir, imageName)).catch(() => null);
  if (bytes === null) throw new PetRefusal(`"${name}" carries no ${imageName}`, 404);
  const atlas = readAtlasSize(bytes);
  return { bytes, type: atlas.type };
}
async function stageAndInstall(name, manifest, image, atlasName, extras) {
  const stage = join(stagingRoot(), randomUUID());
  await mkdir(stage, { recursive: true });
  try {
    await writeFile(join(stage, MANIFEST_NAME), manifest);
    await writeFile(join(stage, atlasName), image);
    for (const extra of extras) await writeFile(join(stage, extra.name), extra.bytes);
    await mkdir(petsRoot(), { recursive: true });
    const target = join(petsRoot(), name);
    try {
      await rename(stage, target);
    } catch (error) {
      const code = error?.code;
      if (code !== "EEXIST" && code !== "ENOTEMPTY" && code !== "EPERM") throw error;
      const existing = await readPetAt(name, true).catch(() => null);
      if (existing === null || existing.version !== descriptorFor(name, parsePet(manifest, image)).version) {
        throw new PetRefusal(`a different package already holds "${name}"`, 409);
      }
    }
  } finally {
    await rm(stage, { recursive: true, force: true }).catch(() => void 0);
  }
}
function installParsed(parsed, manifest, image, extras) {
  return serialized(async () => {
    const preferred = usableDirectoryName(parsed.sourceId) ? parsed.sourceId : `dsh-${parsed.version.slice(0, 48)}`;
    const hashName = `dsh-${parsed.version.slice(0, 48)}`;
    let name = preferred;
    const existing = await readPetAt(preferred).catch((error) => {
      if (error instanceof PetRefusal) return null;
      throw error;
    });
    if (existing !== null) {
      if (existing.version === parsed.version) return existing;
      name = hashName;
      const hashed = await readPetAt(hashName).catch(() => null);
      if (hashed !== null) {
        if (hashed.version === parsed.version) return hashed;
        throw new PetRefusal(`a different package already holds "${hashName}"`, 409);
      }
    }
    await stageAndInstall(name, manifest, image, parsed.spritesheetPath, extras);
    return readPetAt(name, true);
  });
}
function unpackZip(archive) {
  const { files } = readZip(archive);
  const manifest = files.get(MANIFEST_NAME);
  if (manifest === void 0) throw new PetRefusal(`the package carries no ${MANIFEST_NAME} at its root`, 400);
  const atlasName = atlasNameOf(manifest);
  const picked = pickPetFiles(files, MANIFEST_NAME, atlasName);
  return { ...picked, parsed: parsePet(picked.manifest, picked.image) };
}
function importZip(archive) {
  const { parsed, manifest, image, extras } = unpackZip(archive);
  return installParsed(parsed, manifest, image, extras);
}
async function download(url, limit) {
  const response = await fetch(url, { signal: AbortSignal.timeout(3e4) });
  if (!response.ok) throw new PetRefusal(`the source answered ${response.status}`, 502);
  const body = response.body;
  if (body === null) throw new PetRefusal("the source answered no body", 502);
  const chunks = [];
  let size = 0;
  const reader = body.getReader();
  for (; ; ) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value === void 0) continue;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel().catch(() => void 0);
      throw new PetRefusal(`the source answered more than ${limit} bytes`, 413);
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let at = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, at);
    at += chunk.byteLength;
  }
  return bytes;
}
function ensurePreset(id) {
  const preset = petdexPreset(id);
  if (preset === void 0) throw new PetRefusal(`"${id}" is not a preset`, 404);
  return serialized(async () => {
    const installed = await readPetAt(id).catch(() => null);
    if (installed !== null && installed.sourceId === id) return installed;
    const manifest = await download(presetManifestUrl(preset), PET_MANIFEST_MAX_BYTES);
    const atlasName = atlasNameOf(manifest);
    const image = await download(presetImageUrl(preset), PET_IMAGE_MAX_BYTES);
    const parsed = parsePet(manifest, image);
    await stageAndInstall(usableDirectoryName(parsed.sourceId) ? parsed.sourceId : id, manifest, image, atlasName, []);
    return readPetAt(usableDirectoryName(parsed.sourceId) ? parsed.sourceId : id, true);
  });
}
function importFromPetdex(page) {
  let url;
  try {
    url = new URL(page);
  } catch {
    throw new PetRefusal("that is not a URL", 400);
  }
  if (url.protocol !== "https:" || url.hostname !== "petdex.dev" && url.hostname !== "www.petdex.dev") {
    throw new PetRefusal("the link must be a Petdex pet page", 415);
  }
  const match = /^\/pets\/([a-z0-9][a-z0-9-]{0,62})\/?$/.exec(url.pathname);
  if (match === null) throw new PetRefusal("the link is not a Petdex pet page", 415);
  const slug = match[1];
  return (async () => {
    const installed = await readPetAt(slug).catch(() => null);
    if (installed !== null && installed.sourceId === slug) return installed;
    const catalog = await downloadJson(`https://petdex.dev/api/pets/search?q=${encodeURIComponent(slug)}&sort=alpha&limit=8&includeMeta=0`);
    const pets = Array.isArray(catalog.pets) ? catalog.pets : [];
    const found = pets.find((item) => {
      const entry = item !== null && typeof item === "object" ? item : {};
      return entry.slug === slug && typeof entry.zipUrl === "string";
    });
    if (found === void 0) throw new PetRefusal(`Petdex holds no pet named "${slug}"`, 404);
    const archiveUrl = new URL(found.zipUrl);
    if (archiveUrl.protocol !== "https:" || archiveUrl.hostname !== "assets.petdex.dev") {
      throw new PetRefusal("the catalog named an archive outside Petdex", 502);
    }
    const archive = await download(archiveUrl.href, PET_ARCHIVE_MAX_BYTES);
    const unpacked = unpackZip(archive);
    return installParsed(unpacked.parsed, unpacked.manifest, unpacked.image, unpacked.extras);
  })();
}
async function downloadJson(url) {
  const bytes = await download(url, 1024 * 1024);
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch (error) {
    throw new PetRefusal(`the catalog answer is not JSON: ${error?.message ?? String(error)}`, 502);
  }
}
export {
  ensurePreset,
  importFromPetdex,
  importZip,
  listPets,
  readPetImage
};
