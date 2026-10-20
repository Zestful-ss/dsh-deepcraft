// packages/host/src/pets/desktop-download.ts
import { createHash } from "node:crypto";
import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { pluginPath } from "../harness-home.js";
var DESKTOP_RELEASE = "desktop-v0.9.2";
var DESKTOP_URL = `https://github.com/crafter-station/petdex/releases/download/${DESKTOP_RELEASE}/petdex-desktop-native-win32-x64.exe`;
var DESKTOP_BYTES = 6594048;
var DESKTOP_SHA256 = "97f5b1db476b74d2b3be4b0bae3f67a0689f0068be2657c4b41cd2406e199e78";
var FILE_NAME = "petdex-desktop-native-win32-x64.exe";
function desktopSupported() {
  return process.platform === "win32" && process.arch === "x64";
}
function desktopExecutablePath(ctx) {
  return pluginPath(ctx, "petdex", DESKTOP_RELEASE, FILE_NAME);
}
async function sha256(path) {
  const bytes = await readFile(path);
  return createHash("sha256").update(bytes).digest("hex");
}
async function verified(path) {
  const info = await stat(path).catch(() => null);
  if (info === null || !info.isFile() || info.size !== DESKTOP_BYTES) return false;
  return await sha256(path) === DESKTOP_SHA256;
}
var pending = null;
var verifiedPath = null;
function ensureDesktopExecutable(ctx) {
  if (pending !== null) return pending;
  pending = (async () => {
    if (!desktopSupported()) throw new Error("the native desktop player is published for Windows x64 only");
    const path = desktopExecutablePath(ctx);
    if (verifiedPath === path || await verified(path)) {
      verifiedPath = path;
      return path;
    }
    await mkdir(dirname(path), { recursive: true });
    const response = await fetch(DESKTOP_URL, { signal: AbortSignal.timeout(12e4) });
    if (!response.ok) throw new Error(`the Petdex release answered ${response.status}`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength !== DESKTOP_BYTES) throw new Error(`the Petdex release is ${bytes.byteLength} bytes, not ${DESKTOP_BYTES}`);
    const digest = createHash("sha256").update(bytes).digest("hex");
    if (digest !== DESKTOP_SHA256) throw new Error("the Petdex release does not match its published digest");
    const part = `${path}.part`;
    await writeFile(part, bytes);
    await rm(path, { force: true });
    await rename(part, path);
    verifiedPath = path;
    return path;
  })().finally(() => {
    pending = null;
  });
  return pending;
}
export {
  DESKTOP_BYTES,
  DESKTOP_RELEASE,
  DESKTOP_SHA256,
  DESKTOP_URL,
  desktopExecutablePath,
  desktopSupported,
  ensureDesktopExecutable
};
