/**
 * design-tokens.mjs — the design tokens and the stylesheets and tables they
 * generate (D9, D80).
 *
 * packages/client/src/theme/tokens.json is the one source: the colour palettes,
 * the fonts, the reasoning slider's apex, motion and layers. This module
 * reads and validates it, writes the token stylesheet every palette block of
 * which is gated on its own palette id, and rewrites the three tables in
 * docs/STYLE.md from the same document. The checks over the sheets stay in
 * scripts/css.mjs, which consumes the token sheet this module writes.
 */
import fs from 'node:fs'
import path from 'node:path'
import Ajv2020 from 'ajv/dist/2020.js'

/** The token stylesheet's place in the sheet list: generated, never read from disk. */
export const TOKEN_SHEET = 'theme/tokens.json'
const TOKEN_SCHEMA = 'theme/tokens.schema.json'
/** The region of docs/STYLE.md the token table is written into. */
const TABLE_BEGIN = '<!-- generated:tokens (packages/client/src/theme/tokens.json) -->'
const TABLE_END = '<!-- /generated:tokens -->'
const MOTION_BEGIN = '<!-- generated:motion (packages/client/src/theme/tokens.json) -->'
const MOTION_END = '<!-- /generated:motion -->'
const LAYER_BEGIN = '<!-- generated:layers (packages/client/src/theme/tokens.json) -->'
const LAYER_END = '<!-- /generated:layers -->'

/**
 * Read and validate packages/client/src/theme/tokens.json: its declared shape, each token
 * named once per group, and every skin palette's two themes stated on every row,
 * so no palette inherits a value from another (D80).
 */
export function loadTokens(srcDir, paletteIds) {
  const schema = JSON.parse(fs.readFileSync(path.join(srcDir, TOKEN_SCHEMA), 'utf8'))
  const validate = new Ajv2020({ allErrors: true }).compile(schema)
  const doc = JSON.parse(fs.readFileSync(path.join(srcDir, TOKEN_SHEET), 'utf8'))
  if (!validate(doc)) throw new Error(`build: packages/client/src/${TOKEN_SHEET} ${validate.errors.map((error) => `${error.instancePath || '/'} ${error.message}`).join('; ')}`)
  for (const group of ['apex', 'palette', 'motion', 'layer']) {
    const seen = new Set()
    for (const item of doc[group]) {
      if (seen.has(item.token)) throw new Error(`build: packages/client/src/${TOKEN_SHEET} names ${item.token} twice in ${group}`)
      seen.add(item.token)
    }
  }
  for (const item of doc.palette) {
    for (const id of paletteIds) {
      if (item[id] === undefined) throw new Error(`build: packages/client/src/${TOKEN_SHEET} ${item.token} has no ${id} themes`)
    }
  }
  return doc
}

/** The tokens a palette card's swatch reads: the tile fill, the sample ink, and the dot row, in that order. */
const SWATCH_CANVAS = '--dsh-deepcraft-canvas'
const SWATCH_INK = '--dsw-alias-label-primary'
const SWATCH_DOTS = [
  '--dsw-alias-brand-primary',
  '--dsh-deepcraft-link',
  '--dsw-alias-state-business-primary',
  '--dsw-alias-button-primary-hover',
  '--dsh-deepcraft-chip',
  '--dsw-alias-state-business-tertiary',
]

/**
 * The palette cards' swatch colours, by palette id and theme. A var()
 * reference is resolved against the same row inside the same palette: a card
 * paints the palette it offers, so the colours the bundle carries must be
 * literals — an inline style would otherwise resolve in the live document,
 * where the tokens are the palette in force.
 */
export function paletteSwatches(doc, ids) {
  const literal = (id, theme, token, hops = 0) => {
    if (hops > 4) throw new Error(`build: ${token} in ${id} resolves through too many references`)
    const row = doc.palette.find((item) => item.token === token)
    const value = row?.[id]?.[theme]
    if (value === undefined) throw new Error(`build: the palette card for ${id} needs ${token} in ${theme}`)
    const reference = /^var\((--[a-z0-9-]+)\)$/.exec(value)
    if (reference === null) return value
    return literal(id, theme, reference[1], hops + 1)
  }
  const pick = literal
  const swatches = {}
  for (const id of ids) {
    swatches[id] = {}
    for (const theme of ['light', 'dark']) {
      swatches[id][theme] = {
        canvas: pick(id, theme, SWATCH_CANVAS),
        ink: pick(id, theme, SWATCH_INK),
        dots: SWATCH_DOTS.map((token) => pick(id, theme, token)),
      }
    }
  }
  return swatches
}

/** One rule of the token sheet; a block with nothing in it is left out. */
function tokenBlock(selector, declarations) {
  if (declarations.length === 0) return ''
  return `${selector} {\n${declarations.map(([token, value]) => `  ${token}: ${value};`).join('\n')}\n}\n`
}

/** The declarations a group holds for one choice: `pick` reads the value, undefined when the token has none there. */
function declarationsOf(items, pick) {
  return items.flatMap((item) => {
    const value = pick(item)
    return value === undefined ? [] : [[item.token, value]]
  })
}

/**
 * The token stylesheet, in cascade order.
 *
 * Each colour palette states its whole light and dark set in its own block, so
 * one palette never inherits a value from another (D80). Every block that
 * writes a host token carries a palette gate, so under "follow the host" the
 * host's own tokens stand. The palette blocks name `[data-ds-dark-theme]` for
 * dark on purpose: the host's own dark block weighs the same (0,1,1) as a bare
 * `body[data-dsh-deepcraft]`, so whichever sheet the loader appended last would
 * win; naming the attribute lifts these above it. The brand marks' addresses
 * come first: every palette paints with them. The motion and layer tokens are
 * ungated blocks beside them: the same durations, curves, distances and
 * stacking levels under every palette (D9).
 *
 * @param doc - packages/client/src/theme/tokens.json.
 * @param gates - the palette attribute and values (D9, D80).
 * @param images - brand mark name → its address (data URI or route).
 * @param scope - the selector root every skin rule hangs off (`body[data-dsh-deepcraft]`).
 * @param fonts - the font catalogue (packages/client/src/theme/fonts.ts): faces and role stacks.
 */
export function tokenSheet(doc, gates, images, scope, fonts) {
  const dark = '[data-ds-dark-theme]'
  const light = ':not([data-ds-dark-theme])'
  const gate = ({ attribute }, value) => `[${attribute}="${value}"]`
  const palettes = gates.palette.ids.flatMap((id) => {
    const selector = `${scope}${gate(gates.palette, id)}`
    return [
      tokenBlock(`${selector}${light}`, declarationsOf(doc.palette, (item) => item[id]?.light)),
      tokenBlock(`${selector}${dark}`, declarationsOf(doc.palette, (item) => item[id]?.dark)),
    ]
  })
  // The document element's own canvas per palette: html sits above the body
  // and cannot read its tokens, so the stylesheet states the canvas colour
  // for each palette and theme here. theme/tokens.css carries none of this —
  // and the transparency gate there keeps winning under a surface opacity,
  // since these blocks never name it.
  const htmlCanvas = gates.palette.ids.flatMap((id) => {
    const canvas = doc.palette.find((item) => item.token === '--dsh-deepcraft-canvas')
    return ['light', 'dark'].flatMap((theme) => {
      const value = canvas?.[id]?.[theme]
      if (value === undefined || /^var\(/.test(value)) return []
      const scheme = theme === 'dark' ? dark : light
      return [`html:has(${scope}${gate(gates.palette, id)}${scheme}) {\n  background-color: ${value};\n}\n`]
    })
  })
  const faces = fonts.FONT_FACES.map((face) => {
    const format = face.format ?? (face.file.endsWith('.woff2') ? 'woff2' : 'truetype')
    const style = face.style === undefined ? '' : `;font-style:${face.style}`
    const range = face.unicodeRange === undefined ? '' : `;unicode-range:${face.unicodeRange}`
    return `@font-face{font-family:"${face.family}";src:url("/dsh-deepcraft/fonts/${face.file}") format("${format}");font-weight:${face.weight}${style}${range};font-display:swap}`
  }).join('\n')
  const roles = Object.values(fonts.FONT_ROLES).flatMap((role) => Object.entries(role.stacks).map(([choice, stack]) => {
    const extra = role.extraProperty !== undefined && choice !== role.hostChoice ? `;${role.extraProperty}: ${stack}` : ''
    return `${scope}[${role.attr}="${choice}"]{${role.property}: ${stack}${extra}}`
  }))
  const fontRules = [faces, ...roles, `${scope}{--dsh-deepcraft-font-brand: var(--dsh-deepcraft-font-prose)}`].filter(Boolean).join('\n')
  return [
    `/* Generated from packages/client/src/${TOKEN_SHEET} and theme/fonts.ts by scripts/shared/design-tokens.mjs; edit those sources. */\n`,
    fontRules,
    tokenBlock(scope, Object.entries(images).map(([name, url]) => [`--dsh-deepcraft-image-${name}`, `url("${url}")`])),
    tokenBlock(scope, declarationsOf(doc.motion, (item) => item.value)),
    tokenBlock(scope, declarationsOf(doc.layer, (item) => item.value)),
    tokenBlock(`${scope}${dark}`, declarationsOf(doc.apex, (item) => item.dark)),
    tokenBlock(`${scope}${light}`, declarationsOf(doc.apex, (item) => item.light)),
    ...palettes,
    ...htmlCanvas,
    tokenBlock(`${scope}${gate(gates.palette, gates.palette.host)}`, declarationsOf(doc.palette, (item) => item.host)),
  ].filter((block) => block !== '').join('\n')
}

/**
 * A token value as a Markdown table cell: a code span, with the backslash
 * escaped before the pipe, since a value's own `\` would otherwise escape the
 * `\|` that keeps the cell from ending at a pipe inside the value.
 */
function tableCell(value) {
  return '`' + value.replace(/\\/g, '\\\\').replace(/\|/g, '\\|') + '`'
}

/** The table's name for a palette id: `ocean` reads `Ocean`. */
function paletteName(id) {
  return id.charAt(0).toUpperCase() + id.slice(1)
}

/**
 * The palettes as a Markdown table: each token's value in every palette's two
 * themes, its value under the host palette (a host token keeps the host's own)
 * and its use.
 */
function tokenTable(doc, ids) {
  const cell = (value) => (value === undefined ? '—' : tableCell(value))
  const rows = doc.palette.map((item) => {
    const host = item.host === undefined && (item.token.startsWith('--dsw-') || item.token.startsWith('--shiki-token-')) ? "host's own" : cell(item.host)
    const values = ids.flatMap((id) => [cell(item[id]?.light), cell(item[id]?.dark)])
    return `| \`${item.token}\` | ${values.join(' | ')} | ${host} | ${item.use ?? ''} |`
  })
  const header = ids.flatMap((id) => [`${paletteName(id)} light`, `${paletteName(id)} dark`])
  return [
    `| Token | ${header.join(' | ')} | Host alias | Use |`,
    `|---|${'---|'.repeat(header.length + 2)}`,
    ...rows,
  ].join('\n')
}

/**
 * Write `table` into the region of docs/STYLE.md between `begin` and `end`.
 * @returns whether the file changed.
 */
function writeRegion(stylePath, begin, end, table) {
  const text = fs.readFileSync(stylePath, 'utf8')
  const from = text.indexOf(begin)
  const to = text.indexOf(end)
  if (from === -1 || to < from) throw new Error(`build: ${path.basename(stylePath)} lacks the ${begin} … ${end} region`)
  const next = text.slice(0, from + begin.length) + '\n' + table + '\n' + text.slice(to)
  if (next === text) return false
  fs.writeFileSync(stylePath, next)
  return true
}

/**
 * Write the token table into its region of docs/STYLE.md.
 * @returns whether the file changed.
 */
export function writeTokenTable(stylePath, doc, ids) {
  return writeRegion(stylePath, TABLE_BEGIN, TABLE_END, tokenTable(doc, ids))
}

/** A group of one-value tokens as a Markdown table: the value and the role it plays. */
function valueTable(items) {
  const rows = items.map((item) => `| \`${item.token}\` | ${tableCell(item.value)} | ${item.use} |`)
  return [
    '| Token | Value | Use |',
    '|---|---|---|',
    ...rows,
  ].join('\n')
}

/**
 * Write the motion table into its region of docs/STYLE.md (D9).
 * @returns whether the file changed.
 */
export function writeMotionTable(stylePath, doc) {
  return writeRegion(stylePath, MOTION_BEGIN, MOTION_END, valueTable(doc.motion))
}

/**
 * Write the layer table into its region of docs/STYLE.md (D9).
 * @returns whether the file changed.
 */
export function writeLayerTable(stylePath, doc) {
  return writeRegion(stylePath, LAYER_BEGIN, LAYER_END, valueTable(doc.layer))
}
