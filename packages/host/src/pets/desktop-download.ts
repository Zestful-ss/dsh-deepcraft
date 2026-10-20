/**
 * The official Petdex Windows player, downloaded on first use (D78).
 *
 * The release binary is the upstream build, not a fork: the URL, length and
 * digest below identify one published asset, and the file is used only after
 * both the length and the digest match. Nothing is installed system-wide and
 * no installer script runs.
 */
import { createHash } from 'node:crypto'
import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { DshContext } from '@dsh-deepcraft/engine/node/dsh'
import { pluginPath } from '../harness-home.js'

/** The release this plugin is verified against. */
export const DESKTOP_RELEASE = 'desktop-v0.9.2'
/** The Windows x64 asset's official address. */
export const DESKTOP_URL = `https://github.com/crafter-station/petdex/releases/download/${DESKTOP_RELEASE}/petdex-desktop-native-win32-x64.exe`
/** The asset's published length. */
export const DESKTOP_BYTES = 6_594_048
/** The asset's published SHA-256. */
export const DESKTOP_SHA256 = '97f5b1db476b74d2b3be4b0bae3f67a0689f0068be2657c4b41cd2406e199e78'

const FILE_NAME = 'petdex-desktop-native-win32-x64.exe'

/** Whether this process can run the official Windows player at all. */
export function desktopSupported() {
  return process.platform === 'win32' && process.arch === 'x64'
}

/** The path a release's executable is cached at, under the plugin's own directory. */
export function desktopExecutablePath(ctx: DshContext) {
  return pluginPath(ctx, 'petdex', DESKTOP_RELEASE, FILE_NAME)
}

/** The digest of one file, read in order. */
async function sha256(path: string) {
  const bytes = await readFile(path)
  return createHash('sha256').update(bytes).digest('hex')
}

/** Whether the file at `path` is the published release, length and digest both. */
async function verified(path: string) {
  const info = await stat(path).catch(() => null)
  if (info === null || !info.isFile() || info.size !== DESKTOP_BYTES) return false
  return await sha256(path) === DESKTOP_SHA256
}

/** One download per process; a second caller awaits the first. */
let pending: Promise<string> | null = null
/** A path already verified in this process, so a restart does not hash 6.3 MB again. */
let verifiedPath: string | null = null

/**
 * The official player's executable, downloaded and verified when it is absent
 * or was altered.
 *
 * @param ctx - host plugin context, for the plugin's own directory.
 */
export function ensureDesktopExecutable(ctx: DshContext): Promise<string> {
  if (pending !== null) return pending
  pending = (async () => {
    if (!desktopSupported()) throw new Error('the native desktop player is published for Windows x64 only')
    const path = desktopExecutablePath(ctx)
    if (verifiedPath === path || await verified(path)) {
      verifiedPath = path
      return path
    }
    await mkdir(dirname(path), { recursive: true })
    const response = await fetch(DESKTOP_URL, { signal: AbortSignal.timeout(120_000) })
    if (!response.ok) throw new Error(`the Petdex release answered ${response.status}`)
    const bytes = new Uint8Array(await response.arrayBuffer())
    if (bytes.byteLength !== DESKTOP_BYTES) throw new Error(`the Petdex release is ${bytes.byteLength} bytes, not ${DESKTOP_BYTES}`)
    const digest = createHash('sha256').update(bytes).digest('hex')
    if (digest !== DESKTOP_SHA256) throw new Error('the Petdex release does not match its published digest')
    const part = `${path}.part`
    await writeFile(part, bytes)
    // Windows refuses a rename onto an existing file; an unverified copy at
    // the target is the only thing this removes.
    await rm(path, { force: true })
    await rename(part, path)
    verifiedPath = path
    return path
  })().finally(() => {
    pending = null
  })
  return pending
}
