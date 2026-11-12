/**
 * Reader files the host half keeps under the harness home: the brand images
 * (brand.ts, D80) and the wallpaper (wallpaper.ts). The shape is the same for
 * every one of them: one directory, files named `<kind>.<extension>`, a temp
 * write and a rename so a read never sees half a file, the declared type held
 * to the byte signature where a format has one, and a bounded body read for
 * the upload.
 */
import { createReadStream, mkdirSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { DshContext, DshRequest, DshResponse } from '@dsh-deepcraft/engine/node/dsh'
import { pluginPath } from './harness-home.js'
import { fenceRefused, methodRefused, readRequestBody, sendJson } from '@dsh-deepcraft/engine/node/http'

export type MediaSignatures = Readonly<Record<string, readonly { offset: number, bytes: Buffer }[]>>

export interface MediaStoreOptions {
  /** The directory under the harness home this store owns. */
  dir: string
  /** Accepted content types, each with the extension the stored file carries. */
  types: Readonly<Record<string, string>>
  /** Largest stored file. */
  maxBytes: number
  signatures?: MediaSignatures
}

/** One stored file, as `find` reports it. */
export interface MediaFile {
  path: string
  type: string
  /** Changes whenever the bytes do: mtime and size together. */
  version: string
  size: number
}

/**
 * The reader-file directory and the reads and writes on it.
 *
 * @param ctx - host plugin context, for the harness home.
 */
export function createMediaStore<K extends string>(ctx: DshContext, opts: MediaStoreOptions) {
  const dir = () => pluginPath(ctx, opts.dir)

  /** The file holding one kind, in the type table's order, or null when there is none. */
  const find = (kind: K): MediaFile | null => {
    for (const [type, extension] of Object.entries(opts.types)) {
      const path = join(dir(), `${kind}.${extension}`)
      const stat = statSync(path, { throwIfNoEntry: false })
      if (stat?.isFile() !== true) continue
      return { path, type, version: `${Math.round(stat.mtimeMs)}-${stat.size}`, size: stat.size }
    }
    return null
  }

  /**
   * Replace one file. The bytes land through a temporary file and a rename, so
   * a read never sees half a file; the same kind under another extension goes
   * afterwards, so a directory read finds one file at every moment.
   */
  const write = (kind: K, type: string, bytes: Buffer) => {
    const extension = opts.types[type]
    mkdirSync(dir(), { recursive: true })
    const target = join(dir(), `${kind}.${extension}`)
    const temporary = `${target}.${process.pid}.tmp`
    writeFileSync(temporary, bytes)
    renameSync(temporary, target)
    for (const other of Object.values(opts.types)) {
      if (other !== extension) rmSync(join(dir(), `${kind}.${other}`), { force: true })
    }
  }

  const remove = (kind: K) => {
    for (const extension of Object.values(opts.types)) rmSync(join(dir(), `${kind}.${extension}`), { force: true })
  }

  return { find, write, remove }
}

/** Whether the bytes open the way their declared format requires; a format without signatures accepts any. */
function matchesSignature(signatures: MediaSignatures | undefined, type: string, bytes: Buffer) {
  const marks = signatures?.[type]
  if (marks === undefined) return true
  return marks.every(({ offset, bytes: expected }) => bytes.subarray(offset, offset + expected.length).equals(expected))
}

/**
 * Store one uploaded file: the content type names the format, and the body is
 * held to the size limit and, where the format has signatures, to them. The
 * failure answers are sent here; the caller answers success with its own
 * status document.
 *
 * @returns the stored bytes, or null once a refusal was sent.
 */
export async function storeMedia<K extends string>(
  store: ReturnType<typeof createMediaStore<K>>,
  opts: MediaStoreOptions,
  kind: K,
  req: DshRequest,
  res: DshResponse,
): Promise<Buffer | null> {
  const type = (req.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase()
  if (opts.types[type] === undefined) {
    sendJson(res, 415, { ok: false, error: 'unsupported media type' })
    return null
  }
  const bytes = await readRequestBody(req, opts.maxBytes)
  if (bytes === null) {
    // The remainder of an oversized body stays unread: the socket is ended
    // gracefully once this answer is flushed — `destroy()` would RST it and
    // drop the response itself.
    res.once('finish', () => setTimeout(() => req.socket.end(), 0))
    sendJson(res, 413, { ok: false, error: 'file too large' })
    return null
  }
  if (bytes.length === 0 || !matchesSignature(opts.signatures, type, bytes)) {
    sendJson(res, 400, { ok: false, error: 'not a file of the declared type' })
    return null
  }
  store.write(kind, type, bytes)
  return bytes
}

/** Headers on every file answer; a caller adds the ones its document type needs. */
const MEDIA_HEADERS = {
  'cache-control': 'no-cache',
  'x-content-type-options': 'nosniff',
}

/**
 * Serve one stored file: whole body on `GET`, headers only on `HEAD`, and one
 * `bytes=` range for the video wallpaper (a `<video>` element asks in ranges).
 * A version the reader already holds is answered 304 through `if-none-match`.
 */
export function serveMedia(
  file: MediaFile,
  req: DshRequest,
  res: DshResponse,
  headers: Readonly<Record<string, string>> = {},
) {
  const all = { ...MEDIA_HEADERS, ...headers, 'content-type': file.type, 'accept-ranges': 'bytes', etag: `"${file.version}"` }
  if (req.headers['if-none-match'] === `"${file.version}"`) {
    res.writeHead(304, all)
    res.end()
    return
  }
  const range = req.headers.range
  if (range !== undefined) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim())
    const start = match?.[1] === '' ? undefined : Number(match?.[1])
    const last = match?.[2] === '' ? undefined : Number(match?.[2])
    if (match === null || (start === undefined && last === undefined) || (start !== undefined && start >= file.size)) {
      res.writeHead(416, { ...all, 'content-range': `bytes */${file.size}` })
      res.end()
      return
    }
    const from = start ?? Math.max(0, file.size - (last as number))
    const to = Math.min(file.size - 1, start === undefined ? file.size - 1 : (last ?? file.size - 1))
    if (to < from) {
      res.writeHead(416, { ...all, 'content-range': `bytes */${file.size}` })
      res.end()
      return
    }
    res.writeHead(206, { ...all, 'content-length': String(to - from + 1), 'content-range': `bytes ${from}-${to}/${file.size}` })
    if (req.method === 'HEAD') {
      res.end()
      return
    }
    createReadStream(file.path, { start: from, end: to }).on('error', () => res.destroy()).pipe(res)
    return
  }
  res.writeHead(200, { ...all, 'content-length': String(file.size) })
  if (req.method === 'HEAD') {
    res.end()
    return
  }
  createReadStream(file.path).on('error', () => res.destroy()).pipe(res)
}

/** The status route beside the file route: `GET` answers the caller's status document. */
export function mediaStatusRoute(ctx: DshContext, answer: () => unknown) {
  return (req: DshRequest, res: DshResponse) => {
    if (methodRefused(req, res, ['GET'])) return
    if (fenceRefused(ctx, req, res)) return
    sendJson(res, 200, answer())
  }
}

/**
 * The file route every reader file shares: `GET`/`HEAD` serves the bytes,
 * `PUT` replaces them, `DELETE` removes them. A storage fault answers 500 with
 * the OS error (D12); `answer` builds the status document the writes answer
 * with.
 */
export function mediaFileRoute<K extends string>(
  ctx: DshContext,
  store: ReturnType<typeof createMediaStore<K>>,
  opts: MediaStoreOptions,
  kind: K,
  answer: () => unknown,
  headers: Readonly<Record<string, string>> = {},
) {
  return (req: DshRequest, res: DshResponse) => {
    if (methodRefused(req, res, ['GET', 'HEAD', 'PUT', 'DELETE'])) return
    if (fenceRefused(ctx, req, res)) return
    if (req.method === 'PUT' || req.method === 'DELETE') {
      const done = req.method === 'PUT'
        ? storeMedia(store, opts, kind, req, res).then(stored => {
          if (stored !== null) sendJson(res, 200, answer())
        })
        : Promise.resolve().then(() => {
          store.remove(kind)
          sendJson(res, 200, answer())
        })
      void done.catch((error: unknown) => {
        if (res.headersSent) res.destroy()
        else sendJson(res, 500, { ok: false, error: String((error as { message?: string } | null)?.message ?? String(error)) })
      })
      return
    }
    const found = store.find(kind)
    if (found === null) {
      res.writeHead(404, { 'cache-control': 'no-store' })
      res.end()
      return
    }
    serveMedia(found, req, res, headers)
  }
}
