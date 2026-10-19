/**
 * assets.mjs — every image the skin ships, one directory and one manifest.
 *
 * Two delivery forms, chosen by size:
 *
 *   inline   the file's own bytes ride the bundle as a data URI (an image) or
 *            as markup (the vendor lockups, which the picker stamps into a row
 *            with innerHTML so the mono layer inherits the row's color).
 *   route    the file is written to `lib/assets/<hash>.<ext>` and served by the
 *            host half under ASSETS_ROUTE; the name carries the content hash,
 *            so the address may be cached for good.
 *
 * The deferred features' chunks and their source maps (D72) ride the same route:
 * the build hands their text in (routeText), always routed.
 *
 * A file whose bytes are text (SVG, a chunk) is stored brotli-compressed beside
 * its name; the host half sends it as-is to a client that takes brotli and
 * decompresses it for one that does not, so the package carries the sheets
 * once, small.
 *
 * The whale's sheets are drawn as SVG at build time by packages/assets/whale.mjs;
 * this module only plans their delivery, like every other image.
 *
 * The manifest is also the gate: a file under `packages/assets/src/` that no table or
 * token claims fails the build, so an image added for one run cannot ship
 * unused. `packages/assets/src/fonts/` stands outside that gate: buildFonts copies the
 * faces and the licences the package ships into `lib/fonts/`, where the host
 * half's font route reads them, and Anthropic's own faces sit one directory
 * down, in `anthropic/`, because they never enter the package.
 */
import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { brotliCompressSync } from 'node:zlib'

/** The largest file that rides the bundle rather than the route. */
export const INLINE_LIMIT_BYTES = 16 * 1024
/** Where the host half serves the routed assets. */
export const ASSETS_ROUTE = '/dsh-deepcraft/assets/'
/** The manifest the host half reads to decide what it may serve. */
export const ASSETS_MANIFEST = 'manifest.json'
/** The fonts under packages/assets/src/, delivered by buildFonts rather than by the manifest. */
export const FONT_DIR = 'fonts'
/** The directory inside it for Anthropic's own faces, which the package never carries. */
export const PRIVATE_FONT_DIR = 'anthropic'
/**
 * What `packages/assets/src/fonts/` ships, in the order the build log counts it: the
 * four faces and the three licences plus the authors file, which OFL 1.1
 * requires to travel with the fonts it covers.
 */
const SHIPPED_FONTS = [
  'JetBrainsMonoVariable.ttf',
  'JetBrainsMonoItalicVariable.ttf',
  'InterVariable.woff2',
  'NotoSerifVariable.woff2',
  'OFL.txt',
  'OFL-Inter.txt',
  'OFL-NotoSerif.txt',
  'AUTHORS.txt',
]

/** Content type per extension; an extension outside this table is refused. */
const CONTENT_TYPES = {
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
}

/**
 * Files under packages/assets/src/ that the package does not ship: drawing material for
 * the hand-run scripts. They are inputs, so listing them here is what says the
 * manifest is not silently missing them.
 */
export const SOURCE_ONLY = new Set([
  // scripts/draw-crab.py takes the crab's own laptop frames from these.
  'mascot/crab-laptop-body.png',
  'mascot/crab-laptop-ink.png',
  // scripts/fetch-lobe-combines.py composes the openai lockup from this mark.
  'icons/openai.svg',
  // No upstream icon carries Beam's vendor, so its lockup is composed from this
  // artwork the same way.
  'icons/reflection.svg',
])

/**
 * Every file under the assets directory, with its content hash and the address
 * it is reached by.
 *
 * @param options.assetsDir - the directory the images live in.
 * @param options.generated - assets the build produced rather than read:
 *     path under the directory → text (a mascot's vector or the plugin mark).
 * @param options.sourceOnly - paths under assets/ that do not ship.
 * @param options.limit - the largest file inlined.
 * @returns `{ entries, routed }`; `entries` is keyed by the path under assets/.
 */
export function planAssets({ assetsDir, generated = new Map(), sourceOnly = SOURCE_ONLY, limit = INLINE_LIMIT_BYTES }) {
  const root = assetsDir
  const entries = new Map()
  const add = (file, bytes, text) => {
    const extension = path.extname(file)
    const type = CONTENT_TYPES[extension]
    if (type === undefined) throw new Error(`build: packages/assets/src/${file} has no content type; add its extension to packages/assets/assets.mjs`)
    const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 12)
    const inline = bytes.byteLength <= limit
    const name = hash + extension
    // An SVG is text either way: it is read as one so a lockup can be stamped
    // into the DOM, and a mark is inlined as its own text rather than base64.
    const source = text ?? (type === 'image/svg+xml' ? bytes.toString('utf8').replace(/\r\n/g, '\n').trim() : undefined)
    // A data URI carries an image; text assets stay text, because the lockups
    // are stamped into the DOM rather than painted from a URL.
    const url = inline
      ? source === undefined
        ? `data:${type};base64,${bytes.toString('base64')}`
        : `data:${type},${encodeURIComponent(source)}`
      : ASSETS_ROUTE + name
    entries.set(file, { file, bytes, text: source, type, hash, name, url, inline })
  }
  const walk = (dir) => fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((item) => {
    const file = dir === '' ? item.name : `${dir}/${item.name}`
    // The fonts are not routed assets: buildFonts copies them, and they are
    // not images an extension table could type.
    if (item.isDirectory()) return file === FONT_DIR ? [] : walk(file)
    return [file]
  })
  for (const file of walk('').sort()) {
    if (sourceOnly.has(file) || generated.has(file)) continue
    add(file, fs.readFileSync(path.join(root, file)))
  }
  for (const [file, text] of generated) add(file, Buffer.from(text, 'utf8'), text)
  return { entries, routed: [...entries.values()].filter((entry) => !entry.inline) }
}

/**
 * Refuse an asset nothing names: a file under packages/assets/src/ that no animation
 * table, brand token or lockup reads would otherwise ship (or sit in the
 * repository) with nothing to say it is unused.
 *
 * @param plan - the plan (planAssets).
 * @param claimed - the paths the build read.
 */
export function checkClaimed(plan, claimed) {
  for (const file of plan.entries.keys()) {
    if (!claimed.has(file)) throw new Error(`build: packages/assets/src/${file} is read by nothing; name it in an animation table, a brand token or delete it`)
  }
}

/**
 * Route a text file the build produced rather than read from packages/assets/src/: a
 * feature chunk or its source map (D72). It is never inlined — a chunk inlined
 * into the bundle would put its feature back — and the build names it.
 *
 * @param plan - the plan (planAssets); the entry joins its routed files.
 * @param file - the key the plan holds it under.
 * @param name - its file name under lib/assets/, which its address carries.
 * @param type - its content type.
 * @param text - its contents.
 * @returns the entry, whose `url` is the route's address for it.
 */
export function routeText(plan, { file, name, type, text }) {
  const bytes = Buffer.from(text, 'utf8')
  const entry = { file, bytes, text, type, hash: name.split('.')[0], name, url: ASSETS_ROUTE + name, inline: false }
  plan.entries.set(file, entry)
  plan.routed.push(entry)
  return entry
}

/**
 * Write the routed assets and the manifest the host half serves them from.
 *
 * Text assets are stored brotli-compressed beside their name (the payload the
 * route prefers); everything else is stored as it is.
 *
 * The order is the point: the new files go down first and the manifest after
 * them, so every name the manifest carries is already on disk when a client
 * asks for it; files the new manifest does not name are removed last, so a page
 * still running the previous build keeps finding its own.
 *
 * `retain` carries the previous manifest's entries over, for the linked
 * checkout that rebuilds against a live page (D72): the page that booted the
 * previous bundle asks for that build's chunk names, and this keeps them
 * addressable. An entry whose file is gone is dropped, because the manifest is
 * the gate the route answers from.
 *
 * @param libDir - the build output directory.
 * @param plan - the plan (planAssets).
 * @param options.retain - whether the previous manifest's entries carry over.
 * @param options.compress - bytes → their brotli form; the build passes one that
 *     reads its cache (scripts/build-cache.mjs).
 * @returns `{ files, bytes, kept }` of what was written and what carried over, for the build log.
 */
export function writeAssets(libDir, plan, { retain = false, compress = brotliCompressSync } = {}) {
  const dir = path.join(libDir, 'assets')
  fs.mkdirSync(dir, { recursive: true })
  const manifestPath = path.join(dir, ASSETS_MANIFEST)
  // This manifest is the build's own output: one that does not parse is a build
  // that was killed, and it fails here instead of quietly dropping the set.
  const previous = retain && fs.existsSync(manifestPath)
    ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')).assets ?? {}
    : {}
  const assets = {}
  let bytes = 0
  for (const entry of plan.routed) {
    const compressed = entry.text !== undefined
    const payload = compressed ? compress(entry.bytes) : entry.bytes
    fs.writeFileSync(path.join(dir, entry.name + (compressed ? '.br' : '')), payload)
    assets[entry.name] = { type: entry.type, encoding: compressed ? 'br' : null, bytes: entry.bytes.byteLength }
    bytes += payload.byteLength
  }
  let kept = 0
  for (const [name, asset] of Object.entries(previous)) {
    if (assets[name] !== undefined) continue
    const stored = asset.encoding === 'br' ? `${name}.br` : name
    if (!fs.existsSync(path.join(dir, stored))) continue
    assets[name] = asset
    kept += 1
  }
  fs.writeFileSync(manifestPath, JSON.stringify({ version: 1, assets }, null, 2) + '\n')
  for (const file of fs.readdirSync(dir)) {
    if (file === ASSETS_MANIFEST) continue
    // A stored asset is its own name, or that name plus `.br`; no asset name
    // ends in `.br`, so the suffix is unambiguous.
    if (assets[file.endsWith('.br') ? file.slice(0, -3) : file] !== undefined) continue
    fs.rmSync(path.join(dir, file))
  }
  return { files: plan.routed.length, bytes, kept }
}

/**
 * Copy the faces the package ships, with the licences and the authors file that
 * OFL 1.1 requires to travel with them, from `packages/assets/src/fonts/` into
 * `<out>/fonts/`, where the host half's font route reads them.
 *
 * The file list is the whole contract for that directory, as the manifest is
 * for the rest of packages/assets/src/: a name it does not carry ships nothing, and
 * Anthropic's own faces live one directory down in `anthropic/`, out of the
 * package.
 *
 * @param options.assetsDir - the directory the fonts live in.
 * @param options.libDir - the build output directory.
 * @returns `{ files, bytes }` of what was written, for the build log.
 */
export function buildFonts({ assetsDir, libDir }) {
  const source = path.join(assetsDir, FONT_DIR)
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (entry.name !== PRIVATE_FONT_DIR) throw new Error(`build: packages/assets/src/${FONT_DIR}/${entry.name}/ is a directory the build does not ship; only ${PRIVATE_FONT_DIR}/ is one`)
      continue
    }
    if (!SHIPPED_FONTS.includes(entry.name)) throw new Error(`build: packages/assets/src/${FONT_DIR}/${entry.name} ships nothing; add it to SHIPPED_FONTS or delete it`)
  }
  const target = path.join(libDir, FONT_DIR)
  fs.rmSync(target, { recursive: true, force: true })
  fs.mkdirSync(target, { recursive: true })
  let bytes = 0
  for (const name of SHIPPED_FONTS) {
    // The file list was checked against the directory above, so a missing one
    // is a build bug rather than a state a user can reach.
    fs.copyFileSync(path.join(source, name), path.join(target, name))
    bytes += fs.statSync(path.join(target, name)).size
  }
  return { files: SHIPPED_FONTS.length, bytes }
}
