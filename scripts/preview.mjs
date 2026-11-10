#!/usr/bin/env node
/**
 * preview.mjs — serve the plugin's live preview page: the built bundle against a host stand-in, with scenes, auto-reload and the settings page mounted (`npm run preview`).
 *
 * The real page is the scratch `dsh web` instance (packages/testing/dsh-web.cjs),
 * and that is still the only place timing and host behaviour are judged. This
 * page answers the other question — what the skin paints — without a host on the
 * machine: the smoke suite's stand-in faces are the host, the built bundle is
 * the plugin, and preview.html carries the host markup the scenes need. The
 * stand-in list is the smoke's own (packages/testing/smoke/page.cjs), so a face
 * that learns a host service is learned here too.
 *
 * The routes are the ones a host serves the package: the bundle at /client.js,
 * the routed assets and the fonts under /dsh-deepcraft/ from lib/. The asset
 * files are brotli payloads (lib/assets/manifest.json says so) and are
 * decompressed here; the Anthropic faces are the reader's own download and are
 * read from packages/assets/src/fonts/anthropic/ when lib/fonts/ lacks them.
 *
 * The build id is polled by preview.html; a rebuild under `npm run dev` reloads
 * the page on its own.
 *
 * Usage: node scripts/preview.mjs [--port <n>]
 */
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { createRequire } from 'node:module'
import { brotliDecompressSync } from 'node:zlib'

const require = createRequire(import.meta.url)
const { argOf } = require('../packages/testing/cli-args.cjs')
const { STAND_IN_PARTS, readParts } = require('../packages/testing/smoke/page.cjs')

const ROOT = path.resolve(import.meta.dirname, '..')
const PREVIEW_DIR = path.join(import.meta.dirname, 'preview')
const PAGE = path.join(ROOT, 'preview.html')
const CLIENT = path.join(ROOT, 'lib', 'client.js')
const ASSETS_DIR = path.join(ROOT, 'lib', 'assets')
const ASSET_MANIFEST = path.join(ASSETS_DIR, 'manifest.json')
const FONTS_DIR = path.join(ROOT, 'lib', 'fonts')
const DROP_POINT = path.join(ROOT, 'packages', 'assets', 'src', 'fonts', 'anthropic')
const MODEL_COPY = path.join(ROOT, 'lib', 'model-descriptions.json')
const VENDOR = {
  '/vendor/react.js': path.join(ROOT, 'node_modules', 'react', 'umd', 'react.development.js'),
  '/vendor/react-dom.js': path.join(ROOT, 'node_modules', 'react-dom', 'umd', 'react-dom.development.js'),
}
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
}
/** The stand-in parts the preview loads: every face but the fake React, which this page replaces with the real one. */
const STAND_IN = readParts('stand-in', STAND_IN_PARTS.filter(part => part !== 'react.js'))
const port = Number(argOf('port') ?? 5178)
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error('preview: --port takes a number from 1 to 65535')
  process.exit(2)
}
if (!fs.existsSync(CLIENT) || !fs.existsSync(ASSET_MANIFEST)) {
  console.error('preview: lib/ is not built — run `npm run build` (or keep `npm run dev` running) first')
  process.exit(2)
}

/** The asset manifest, re-read when the build replaces it. */
let manifest = null
let manifestStamp = ''
let assetCache = new Map()
function assets() {
  const stamp = `${fs.statSync(ASSET_MANIFEST).mtimeMs}:${fs.statSync(ASSET_MANIFEST).size}`
  if (stamp !== manifestStamp) {
    manifest = JSON.parse(fs.readFileSync(ASSET_MANIFEST, 'utf8'))
    manifestStamp = stamp
    assetCache = new Map()
  }
  return manifest.assets
}

/** One routed asset's bytes, decompressed once per build. */
function asset(name) {
  const entry = assets()[name]
  if (entry === undefined) return null
  const cached = assetCache.get(name)
  if (cached !== undefined) return cached
  const file = path.join(ASSETS_DIR, name) + (entry.encoding === 'br' ? '.br' : '')
  const raw = fs.readFileSync(file)
  const body = entry.encoding === 'br' ? brotliDecompressSync(raw) : raw
  const out = { body, type: entry.type ?? 'application/octet-stream' }
  assetCache.set(name, out)
  return out
}

/** One font's bytes: the build output first, then the reader's own Anthropic download. */
function font(name) {
  const safe = path.basename(name)
  for (const dir of [FONTS_DIR, DROP_POINT]) {
    const file = path.join(dir, safe)
    if (fs.existsSync(file)) return { body: fs.readFileSync(file), type: TYPES[path.extname(safe)] ?? 'application/octet-stream' }
  }
  return null
}

/** The current build's identity, as the page polls it. */
function buildStamp() {
  const stat = fs.statSync(CLIENT)
  return `${stat.mtimeMs}:${stat.size}:${fs.statSync(ASSET_MANIFEST).mtimeMs}`
}

function send(res, status, headers, body) {
  res.writeHead(status, { 'cache-control': 'no-store', ...headers })
  res.end(body)
}

function file(res, pathname, type) {
  try {
    send(res, 200, { 'content-type': TYPES[type] ?? 'application/octet-stream' }, fs.readFileSync(pathname))
  } catch {
    send(res, 404, { 'content-type': 'text/plain; charset=utf-8' }, `not found: ${pathname}`)
  }
}

/** The preview's own routes, served before the host-shaped ones. */
function previewRoute(pathname, res) {
  if (pathname === '/preview.html') return file(res, PAGE, '.html')
  if (pathname === '/preview/stand-in.js') return send(res, 200, { 'content-type': TYPES['.js'] }, STAND_IN)
  const name = pathname.startsWith('/preview/') ? path.basename(pathname) : ''
  if (name === '') return false
  const target = path.join(PREVIEW_DIR, name)
  if (!fs.existsSync(target)) return false
  file(res, target, path.extname(name))
  return true
}

/** One request, answered from the preview's routes or the host-shaped ones. */
function handle(req, res) {
  const pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://preview').pathname)
  if (pathname === '/') return send(res, 302, { location: '/preview.html' }, '')
  if (pathname === '/favicon.ico') return send(res, 204, {}, '')
  if (pathname === '/client.js') return file(res, CLIENT, '.js')
  if (VENDOR[pathname] !== undefined) return file(res, VENDOR[pathname], '.js')
  if (pathname === '/dsh-deepcraft/model-descriptions.json') return file(res, MODEL_COPY, '.json')
  // The peak-rate catalog is the host half's; the preview carries none, and an
  // empty answer keeps the page's console clean.
  if (pathname === '/dsh-deepcraft/peakrate') {
    return send(res, 200, { 'content-type': TYPES['.json'] }, JSON.stringify({ ok: true, profiles: [], invalid: [] }))
  }
  if (pathname === '/api/preview/build') {
    return send(res, 200, { 'content-type': TYPES['.json'] }, JSON.stringify({ client: buildStamp() }))
  }
  if (pathname.startsWith('/dsh-deepcraft/assets/')) {
    const hit = asset(path.basename(pathname))
    if (hit === null) return send(res, 404, { 'content-type': 'text/plain; charset=utf-8' }, 'no such asset')
    return send(res, 200, { 'content-type': hit.type }, hit.body)
  }
  if (pathname.startsWith('/dsh-deepcraft/fonts/')) {
    const hit = font(path.basename(pathname))
    if (hit === null) return send(res, 404, { 'content-type': 'text/plain; charset=utf-8' }, 'no such font')
    return send(res, 200, { 'content-type': hit.type }, hit.body)
  }
  if (previewRoute(pathname, res) !== false) return
  send(res, 404, { 'content-type': 'text/plain; charset=utf-8' }, `preview: nothing at ${pathname}`)
}

const server = http.createServer((req, res) => {
  try {
    handle(req, res)
  } catch (error) {
    // One request's failure is reported to the page and the process keeps
    // serving: a rebuild can replace lib/assets/ between two requests.
    console.error(`preview: ${req.url} failed: ${error && error.stack ? error.stack : error}`)
    if (!res.headersSent) send(res, 500, { 'content-type': 'text/plain; charset=utf-8' }, String(error))
  }
})

server.listen(port, '127.0.0.1', () => {
  console.log(`DeepCraft preview: http://127.0.0.1:${port}/preview.html`)
  console.log('The page reloads itself when `npm run dev` writes a new bundle.')
})
