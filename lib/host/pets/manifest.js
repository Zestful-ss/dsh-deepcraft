// packages/host/src/pets/manifest.ts
import { createHash } from "node:crypto";

// packages/contracts/src/pets.ts
var PET_ATLAS_COLUMNS = 8;
var PET_FRAME_WIDTH = 192;
var PET_FRAME_HEIGHT = 208;
var PET_ATLAS_ROWS_V1 = 9;
var PET_ATLAS_ROWS_V2 = 11;
var PET_ATLAS_MAX_PIXELS = 16777216;
var PET_MANIFEST_MAX_BYTES = 64 * 1024;
var PET_IMAGE_MAX_BYTES = 16 * 1024 * 1024;
var PET_ARCHIVE_MAX_BYTES = 20 * 1024 * 1024;
var PET_EXTRACTED_MAX_BYTES = 20 * 1024 * 1024;
var PET_ID_RE = /^[a-z0-9][a-z0-9-]{0,62}$/;
var PET_MANIFEST_FILE = "pet.json";
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

// packages/host/src/pets/manifest.ts
import { checkedRootName, readAtlasSize, readManifestObject } from "./codecs.js";
import { PetRefusal } from "./errors.js";
function parsePet(manifestBytes, imageBytes) {
  if (manifestBytes.byteLength > PET_MANIFEST_MAX_BYTES) throw new PetRefusal(`the manifest is larger than ${PET_MANIFEST_MAX_BYTES} bytes`, 413);
  if (imageBytes.byteLength > PET_IMAGE_MAX_BYTES) throw new PetRefusal(`the atlas is larger than ${PET_IMAGE_MAX_BYTES} bytes`, 413);
  const fields = readManifestObject(manifestBytes);
  const sourceId = fields.id;
  if (typeof sourceId !== "string" || sourceId === "" || sourceId.length > 200) throw new PetRefusal("the manifest carries no usable id", 400);
  if (sourceId.includes("/") || sourceId.includes("\\") || sourceId.includes("\0")) throw new PetRefusal("the manifest id names a path", 400);
  const displayName = typeof fields.displayName === "string" && fields.displayName.trim() !== "" ? fields.displayName.trim() : sourceId;
  const spritesheetPath = fields.spritesheetPath;
  if (typeof spritesheetPath !== "string") throw new PetRefusal("the manifest names no spritesheetPath", 400);
  checkedRootName(spritesheetPath);
  const extension = spritesheetPath.toLowerCase().split(".").pop();
  if (extension !== "png" && extension !== "webp") throw new PetRefusal("spritesheetPath must name a PNG or WebP file", 415);
  const declared = fields.spriteVersionNumber;
  if (declared !== void 0 && declared !== 1 && declared !== 2) {
    throw new PetRefusal(`spriteVersionNumber must be 1 or 2, not ${JSON.stringify(declared)}`, 400);
  }
  const atlas = readAtlasSize(imageBytes);
  if (extension !== atlas.type) throw new PetRefusal(`spritesheetPath names a ${extension}, but the atlas is ${atlas.type}`, 400);
  if (atlas.width > PET_ATLAS_MAX_PIXELS || atlas.height > PET_ATLAS_MAX_PIXELS || atlas.width * atlas.height > PET_ATLAS_MAX_PIXELS) {
    throw new PetRefusal(`the atlas carries more than ${PET_ATLAS_MAX_PIXELS} pixels`, 413);
  }
  if (atlas.width % PET_ATLAS_COLUMNS !== 0) throw new PetRefusal("the atlas width is not a whole number of columns", 400);
  const frameWidth = atlas.width / PET_ATLAS_COLUMNS;
  const fits = (rows) => atlas.height % rows === 0 && frameWidth * PET_FRAME_HEIGHT === atlas.height / rows * PET_FRAME_WIDTH;
  const observed = fits(PET_ATLAS_ROWS_V1) ? 1 : fits(PET_ATLAS_ROWS_V2) ? 2 : null;
  if (observed === null) {
    throw new PetRefusal("the atlas is neither nine nor eleven rows of proportionally scaled 192\xD7208 cells", 400);
  }
  if (declared !== void 0 && declared !== observed) {
    throw new PetRefusal(`spriteVersionNumber ${declared} does not match the atlas, which holds version ${observed} rows`, 400);
  }
  const atlasRows = observed === 2 ? PET_ATLAS_ROWS_V2 : PET_ATLAS_ROWS_V1;
  const hash = createHash("sha256");
  hash.update(manifestBytes);
  hash.update(Buffer.from([0]));
  hash.update(imageBytes);
  return {
    sourceId,
    displayName,
    spriteVersionNumber: observed,
    frameWidth,
    frameHeight: atlas.height / atlasRows,
    atlasRows,
    spritesheetPath,
    version: hash.digest("hex")
  };
}
var MANIFEST_NAME = PET_MANIFEST_FILE;
function usableDirectoryName(sourceId) {
  return isPetId(sourceId);
}
export {
  MANIFEST_NAME,
  parsePet,
  usableDirectoryName
};
