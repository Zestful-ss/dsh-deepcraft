/**
 * css.mjs — the stylesheet half of the build (D9).
 *
 * Every stylesheet is plain CSS: it is parsed with PostCSS, and the rules the
 * skin's CSS lives by are checked on the syntax tree, selectors through
 * postcss-selector-parser:
 *
 *   scope        every selector holds `body[data-dsh-deepcraft]` (outside :not());
 *   :has()       only in its selector's last compound, at every nesting level (D9)
 *   token gates  a rule writing a host token carries a palette gate or the
 *                typeface gate, and every private token a palette defines has
 *                an alias under the host's (D80)
 *   attributes   every `data-dsh-*` attribute a selector reads is one the
 *                browser half writes, read off its syntax tree (scripts/source-tree.mjs)
 *   motion       a time or an easing curve is written only in the token
 *                stylesheet, no two keyframes say the same thing, and every
 *                motion token is read somewhere (D9)
 *   layers       a z-index above the local orders 0 to 9 is a layer token,
 *                and every layer token is read somewhere (D9)
 *
 * The token stylesheet is generated from packages/client/src/theme/tokens.json, and so are the
 * token, motion and layer tables in docs/STYLE.md; it also declares the brand marks' addresses
 * as `--dsh-deepcraft-image-<name>`, the one thing in the CSS only the build knows.
 *
 * The joined sheet ships minified (scripts/shared/minify-css.cjs): comments and
 * formatting are for the source, and the checks above read the source.
 */
import fs from 'node:fs'
import path from 'node:path'
import postcss from 'postcss'
import selectorParser from 'postcss-selector-parser'
import { TOKEN_SHEET, tokenSheet } from './shared/design-tokens.mjs'
import { minifyCss } from './shared/minify-css.cjs'
import { loadModule } from './shared/ts-module.cjs'
import { ruleKey } from './shared/rule-key.cjs'

/** The selector root every skin rule hangs off. */
const SCOPE_TAG = 'body'
/** The element a rule painting the document has to be written on. */
const DOCUMENT_TAG = 'html'
const SCOPE_ATTRIBUTE = 'data-dsh-deepcraft'
const SCOPE = `${SCOPE_TAG}[${SCOPE_ATTRIBUTE}]`
/**
 * A z-index a sheet may write as it is: an order among siblings inside one
 * box (D9). Anything that stacks against the host's own surfaces is a layer
 * token instead.
 */
const LOCAL_LAYER = /^(?:auto|-1|[0-9])$/

/**
 * A time and an easing curve as a declaration's value spells them (D9). A
 * name such as `--dsh-deepcraft-ease-out` is no match, and neither is a digit
 * inside an identifier: the character before must not continue an identifier or
 * a number. `linear` and the step functions are mechanical timing, not a style
 * choice, and stay.
 */
const TIME_PATTERN = /(?<![\w.#-])(\d*\.?\d+)(ms|s)(?![\w-])/g
const EASE_PATTERN = /(?<![\w-])(?:ease|ease-in|ease-out|ease-in-out)(?![\w-])|cubic-bezier\(/

/** The prefix of the attributes the skin writes; the host's own are read as contracts (D3). */
const SKIN_ATTRIBUTE_PREFIX = 'data-dsh-'
/** The attribute carrying the skin's own names for host elements; the one host anchor a rule reads (D3). */
const PART_ATTRIBUTE = 'data-dsh-deepcraft-part'
/** The attribute carrying what an element's subtree holds; a relation the pass answers (D9). */
const HOLDS_ATTRIBUTE = 'data-dsh-deepcraft-holds'

/* ---------- selectors ---------- */

/** The compound a selector node sits in: its siblings up to the nearest combinators. */
function compoundOf(node) {
  const nodes = node.parent.nodes
  let start = nodes.indexOf(node)
  let end = start
  while (start > 0 && nodes[start - 1].type !== 'combinator') start--
  while (end < nodes.length - 1 && nodes[end + 1].type !== 'combinator') end++
  return nodes.slice(start, end + 1)
}

/** Whether a selector node sits inside a :not(). */
function negated(node) {
  for (let parent = node.parent; parent !== undefined; parent = parent.parent) {
    if (parent.type === 'pseudo' && parent.value.toLowerCase() === ':not') return true
  }
  return false
}

/**
 * The scope compounds of one selector: each scope attribute
 * (`[data-dsh-deepcraft]` unless named) on a `body` compound outside
 * :not(), with the compound around it. A rule that paints the document
 * element reaches the scope through `html:has(…)`.
 */
function scopeCompounds(selector, scopeAttribute = SCOPE_ATTRIBUTE) {
  const found = []
  selector.walkAttributes((attribute) => {
    if (attribute.attribute !== scopeAttribute || negated(attribute)) return
    const compound = compoundOf(attribute)
    if (compound.some((node) => node.type === 'tag' && node.value === SCOPE_TAG)) found.push({ attribute, compound })
  })
  return found
}

/** Whether a selector's scope compound carries `[attribute="value"]`. */
function carries(selector, attribute, value) {
  return scopeCompounds(selector).some(({ compound }) => compound.some((node) => node.type === 'attribute' && node.attribute === attribute && node.value === value))
}

/**
 * Refuse a `:has()` outside its selector's last compound (D9): `A:has(B) C`
 * re-matches every descendant of every A on each DOM change below it. Each
 * level is checked on the way out, so `:is(A:has(B) C)` and
 * `A:not(:has(B)) C` are refused too.
 */
function checkHasPlacement(where, selector) {
  selector.walkPseudos((pseudo) => {
    if (pseudo.value.toLowerCase() !== ':has') return
    for (let node = pseudo; ;) {
      const level = node.parent
      if (level.nodes.slice(level.index(node) + 1).some((item) => item.type === 'combinator')) {
        throw new Error(`build: ${where} has a :has() followed by a combinator; mark the element from the skin's pass instead`)
      }
      if (level.parent.type !== 'pseudo') return
      node = level.parent
    }
  })
}

/**
 * Refuse a `:has()` that asks about a mark (D9). What the argument selects on is
 * what the skin already knows — a part, a host `data-*` mark, one of the skin's
 * own markers — so the pass answers it as `data-dsh-deepcraft-holds`
 * (core/parts-table.ts) and the rule reads the answer. Two shapes stay: a
 * `:has()` over state the skin cannot mark (a pseudo-class, a class name), and
 * the document element's own entry into scope, where the whole gate compound
 * sits inside the `:has()` (D9) and nothing else can carry the rule.
 */
function checkHasMarks(where, selector) {
  selector.walkPseudos((pseudo) => {
    if (pseudo.value.toLowerCase() !== ':has') return
    if (compoundOf(pseudo).some((node) => node.type === 'tag' && node.value === DOCUMENT_TAG)) return
    pseudo.walkAttributes((attribute) => {
      throw new Error(`build: ${where} has a :has() asking whether an element holds [${attribute.attribute}]; write the relation in packages/client/src/core/parts-table.ts and read ${HOLDS_ATTRIBUTE} instead`)
    })
  })
}

/** Whether a selector's scope compound carries `[attribute]` at all, whatever its value. */
function carriesAttribute(selector, attribute) {
  return scopeCompounds(selector).some(({ compound }) => compound.some((node) => node.type === 'attribute' && node.attribute === attribute))
}

/** Whether a selector's scope compound excludes `[attribute="value"]` through a `:not()`. */
function excludesValue(selector, attribute, value) {
  return scopeCompounds(selector).some(({ compound }) => compound.some((node) => {
    if (node.type !== 'pseudo' || node.value.toLowerCase() !== ':not') return false
    let found = false
    node.walkAttributes((inner) => {
      if (inner.attribute === attribute && inner.value === value) found = true
    })
    return found
  }))
}

/**
 * Whether one selector stands under a palette gate (D80): it names one of the
 * skin's own palettes, or it names the palette attribute and excludes the
 * host's value in the same compound. Under "follow the host" the rules that
 * write host tokens drop out and the host's own tokens stand.
 */
function paletteGated(selector, gates) {
  const { attribute, ids, host } = gates.palette
  return ids.some((id) => carries(selector, attribute, id)) || (carriesAttribute(selector, attribute) && excludesValue(selector, attribute, host))
}

/**
 * Hold every write of a host token to its gate (D80), and record the private
 * tokens a skin palette defines and the host palette aliases.
 *
 * A `--dsw-font-*` declaration must sit in a rule whose every selector carries
 * the skin typeface gate; any other `--dsw-*` one in a rule whose every
 * selector stands under a palette gate. A private colour token defined under
 * one of the skin's palettes needs a value under the host palette.
 */
function checkTokenGates(label, rule, selectors, gates, names) {
  const every = (predicate) => selectors.every(predicate)
  for (const node of rule.nodes) {
    if (node.type !== 'decl' || !node.prop.startsWith('--')) continue
    const name = node.prop
    const where = `${label}:${node.source.start.line}`
    if (name.startsWith('--dsw-font-')) {
      if (!every((selector) => carries(selector, gates.typeface.attribute, gates.typeface.claude))) throw new Error(`build: ${where} writes ${name} outside the skin typeface gate`)
    } else if (name.startsWith('--dsw-')) {
      if (!every((selector) => paletteGated(selector, gates))) throw new Error(`build: ${where} writes ${name} outside a palette gate`)
    }
    if (!name.startsWith('--dsh-deepcraft-')) continue
    if (name.startsWith('--dsh-deepcraft-font-')) {
      if (every((selector) => carries(selector, gates.typeface.attribute, gates.typeface.claude))) names.skin.add(name)
      if (every((selector) => carries(selector, gates.typeface.attribute, gates.typeface.host))) names.host.add(name)
      continue
    }
    if (gates.palette.ids.some((id) => every((selector) => carries(selector, gates.palette.attribute, id)))) names.skin.add(name)
    if (every((selector) => carries(selector, gates.palette.attribute, gates.palette.host))) names.host.add(name)
  }
}

/** Whether a declaration is one of the motion properties the literal check reads. */
function motionProperty(prop) {
  return prop.startsWith('transition') || prop.startsWith('animation') || prop.startsWith('--')
}

/**
 * Hold every time and easing curve in a stylesheet to the token table (D9):
 * outside the token sheet itself, motion values are read as `var(--dsh-deepcraft-…)`
 * and never written as literals, so one look at the token table answers what the
 * skin's motion is made of. `linear` and the step functions are timing rather
 * than a style choice, and a zero delay or duration is no motion at all, so both
 * stay in the sheets.
 */
function checkMotionLiterals(sheet, label, rule) {
  if (sheet.file === TOKEN_SHEET) return
  for (const node of rule.nodes) {
    if (node.type !== 'decl' || !motionProperty(node.prop)) continue
    const time = [...node.value.matchAll(TIME_PATTERN)].map((match) => match[0]).filter((value) => Number.parseFloat(value) !== 0)
    const easing = node.value.match(EASE_PATTERN)
    if (time.length === 0 && easing === null) continue
    const found = [...time, ...easing === null ? [] : [easing]].join(', ')
    throw new Error(`build: ${label}:${node.source.start.line} writes ${found} in ${node.prop}; read the token table in packages/client/src/${TOKEN_SHEET} (D9)`)
  }
}

/**
 * Hold every z-index in a stylesheet to the layer tokens (D9): a sheet orders
 * siblings inside its own box with a literal from -1 to 9, and anything that has
 * to clear what the host draws reads `var(--dsh-deepcraft-layer-…)`, so the
 * levels the skin stacks on are one table.
 */
function checkLayerLiterals(sheet, label, rule) {
  if (sheet.file === TOKEN_SHEET) return
  for (const node of rule.nodes) {
    if (node.type !== 'decl' || node.prop !== 'z-index') continue
    const value = node.value.trim()
    if (LOCAL_LAYER.test(value) || /^var\(--dsh-deepcraft-layer-[a-z0-9-]+\)$/.test(value)) continue
    throw new Error(`build: ${label}:${node.source.start.line} writes z-index: ${value}; above the local orders -1 to 9, read a layer from packages/client/src/${TOKEN_SHEET} (D9)`)
  }
}

/**
 * Record one sheet's keyframes, refusing a second body that says the same thing
 * as an earlier one: the same effect twice is what the shared presets are for
 * (D9). A keyframe's own curve cannot read a token — Chromium drops a `var()`
 * there and runs the stretch linear — so the curve goes on the animation and
 * the keyframes take it from there.
 *
 * @param seen - signature → `name (file:line)`, across the sheets in cascade order.
 */
function collectKeyframes(label, root, seen) {
  root.walkAtRules(/keyframes$/i, (at) => {
    at.walkDecls('animation-timing-function', (node) => {
      if (node.value.includes('var(')) throw new Error(`build: ${label}:${node.source.start.line} reads a token in a keyframe's animation-timing-function, which runs linear; give the animation that curve (D9)`)
    })
    const body = at.nodes.map((rule) => `${rule.selector}{${rule.nodes.filter((node) => node.type === 'decl').map((node) => `${node.prop}:${node.value.replace(/\s+/g, ' ')}`).join(';')}}`).join(' ')
    const where = `${at.params} (${label}:${at.source.start.line})`
    const first = seen.get(body)
    if (first !== undefined) throw new Error(`build: ${where} repeats the keyframes of ${first}; use the shared preset (D9)`)
    seen.set(body, where)
  })
}

/** Where a sheet's rules are reported: its file under packages/client/src. */
function sheetLabel(sheet) {
  return `packages/client/src/${sheet.file}`
}

/**
 * Parse one stylesheet and check every rule.
 *
 * @param read - collects the skin attributes the sheet's selectors read, each with where.
 * @param keyframes - signature → where, across the sheets, for the repeat check (D9).
 * @param relations - relation name → where, for the hold-mark check (D9).
 * @returns the sheet's text, comments and formatting kept.
 */
function processSheet(sheet, text, gates, names, read, parts, relations, keyframes) {
  const label = sheetLabel(sheet)
  const root = postcss.parse(text, { from: label })
  const scopeAttribute = SCOPE_ATTRIBUTE
  root.walkRules((rule) => {
    if (rule.parent.type === 'atrule' && /keyframes$/i.test(rule.parent.name)) return
    const where = `${label}:${rule.source.start.line}`
    const selectors = selectorParser().astSync(rule.selector)
    selectors.walkAttributes((attribute) => {
      if (attribute.attribute.startsWith(SKIN_ATTRIBUTE_PREFIX) && !read.has(attribute.attribute)) read.set(attribute.attribute, where)
      if (attribute.attribute === HOLDS_ATTRIBUTE && attribute.operator === '~=' && typeof attribute.value === 'string' && !relations.has(attribute.value)) {
        relations.set(attribute.value, where)
      }
      if (attribute.attribute !== PART_ATTRIBUTE || attribute.operator !== '~=') return
      if (typeof attribute.value === 'string' && !parts.has(attribute.value)) parts.set(attribute.value, where)
    })
    for (const selector of selectors.nodes) {
      const scopes = scopeCompounds(selector, scopeAttribute)
      if (scopes.length === 0) throw new Error(`build: ${where} selector "${selector.toString().trim()}" is not under ${SCOPE_TAG}[${scopeAttribute}]`)
      checkHasPlacement(where, selector)
      checkHasMarks(where, selector)
    }
    checkTokenGates(label, rule, selectors.nodes, gates, names)
    checkMotionLiterals(sheet, label, rule)
    checkLayerLiterals(sheet, label, rule)
  })
  collectKeyframes(label, root, keyframes)
  return root.toString()
}

/* ---------- the stylesheet ---------- */

/**
 * Hold every motion and layer token to a reader (D9): a token nothing
 * reads is a value the token table claims the skin uses and nothing does. The
 * readers are the stylesheets and, for motion, the browser half's TypeScript,
 * which reads the same table through packages/client/src/shared/motion.ts.
 *
 * The names the browser half asks for are checked the other way round: a name
 * that is not a motion token throws where it is read, so a misspelt one has to
 * fail here instead of on the page.
 *
 * @param doc - packages/client/src/theme/tokens.json.
 * @param sheetText - every stylesheet but the token sheet, and the tokens' own values.
 * @param sources - the browser half on its syntax tree (scripts/source-tree.mjs).
 */
function checkTokensRead(doc, sheetText, sources) {
  const names = new Set(doc.motion.map((item) => item.token))
  for (const [name, where] of sources.motion) {
    if (names.has(name)) continue
    throw new Error(`build: ${where} reads the motion token ${name}, which packages/client/src/${TOKEN_SHEET} does not declare (D9)`)
  }
  const named = (token) => [...sources.strings].some((text) => text.includes(token))
  for (const item of doc.motion) {
    if (sheetText.includes(item.token) || named(item.token)) continue
    throw new Error(`build: packages/client/src/${TOKEN_SHEET} declares ${item.token}, which no stylesheet or module reads (D9)`)
  }
  // A layer is read by the sheets alone: the browser half stacks nothing by
  // hand, it marks the element and the sheet places it (D9).
  for (const item of doc.layer) {
    if (sheetText.includes(item.token)) continue
    throw new Error(`build: packages/client/src/${TOKEN_SHEET} declares ${item.token}, which no stylesheet reads (D9)`)
  }
}

/**
 * Hold every skin attribute a selector reads to the browser half: some code
 * has to write it (scripts/source-tree.mjs follows the name into the DOM call
 * or the React props that write it). An attribute renamed in the code, written
 * nowhere any more, or misspelt in a sheet leaves a rule that matches nothing.
 *
 * @param read - attribute name → where a selector first reads it.
 * @param sources - the browser half on its syntax tree.
 */
function checkAttributes(read, sources) {
  for (const [name, where] of read) {
    if (!sources.attributes.has(name)) throw new Error(`build: ${where} reads [${name}], which nothing in the browser half's sources writes`)
  }
}

/**
 * Hold every part name a selector reads to the table that defines it (D3).
 *
 * `[data-dsh-deepcraft-part~="x"]` is the whole of a host anchor now, so a
 * misspelt or retired name leaves a rule that matches nothing — the failure the
 * substring selectors hid, made loud. The table is data
 * (packages/client/src/core/parts-table.ts), so the build reads the same list the
 * browser half walks.
 *
 * @param parts - part name → where a selector first reads it.
 */
function checkParts(parts) {
  const known = new Set(partNames())
  if (known.size === 0) {
    throw new Error('build: packages/engine/src/parts-table.ts defines no part names')
  }
  for (const [name, where] of parts) {
    if (!known.has(name)) throw new Error(`build: ${where} reads the part "${name}", which packages/engine/src/parts-table.ts does not define`)
  }
}

/**
 * The part names and hold relations the marking pass answers from, read in Node
 * the way the browser half builds them: the tables are functions of the skin's
 * own attribute vocabulary, which this reads from the browser half's constants
 * (packages/client/src/core/parts.ts, D73).
 */
function partsVocabulary() {
  const { PART_ATTR } = loadModule('packages/client/src/constants.ts')
  return { part: PART_ATTR }
}

/** Every part name the tables define, sorted. */
function partNames() {
  const { partNames } = loadModule('packages/engine/src/parts-table.ts')
  return partNames()
}

/** Every relation a stylesheet reads. */
function holdRelations() {
  const { holdRelations } = loadModule('packages/engine/src/parts-table.ts')
  return holdRelations(partsVocabulary())
}

/**
 * Hold every relation a stylesheet reads to the table the pass answers from
 * (D9), in both directions: a rule reading a mark no relation declares matches
 * nothing, and a declared relation no rule reads is a mark written for nobody.
 * The selectors inside the declarations are checked too, so a part name they
 * name is one the table defines.
 *
 * @param relations - relation name → where a selector first reads it.
 */
function checkHolds(relations) {
  const relationsTable = holdRelations()
  if (!Array.isArray(relationsTable)) throw new Error('build: packages/engine/src/parts-table.ts exports no hold relations')
  const known = new Set(partNames())
  const declared = new Set()
  for (const relation of relationsTable) {
    declared.add(relation.name)
    for (const side of [relation.holder, relation.held, relation.scope]) {
      if (typeof side !== 'string') continue
      for (const match of side.matchAll(/\[data-dsh-deepcraft-part~="([^"]+)"\]/g)) {
        if (!known.has(match[1])) {
          throw new Error(`build: the hold relation "${relation.name}" names the part "${match[1]}", which packages/engine/src/parts-table.ts does not define`)
        }
      }
    }
  }
  for (const [name, where] of relations) {
    if (!declared.has(name)) throw new Error(`build: ${where} reads the hold "${name}", which packages/engine/src/parts-table.ts does not declare`)
  }
  for (const name of declared) {
    if (!relations.has(name)) throw new Error(`build: the hold relation "${name}" is declared but no stylesheet reads it — take it out of HOLD_RELATIONS`)
  }
}

/**
 * Every sheet in cascade order, checked, gated and joined.
 *
 * @param options.sheets - `{ file, rank, scope? }` in cascade order (TOKEN_SHEET generated).
 * @param options.srcDir - the source directory.
 * @param options.sources - the browser half on its syntax tree (scripts/source-tree.mjs).
 * @param options.tokenDoc - packages/client/src/theme/tokens.json (loadTokens).
 * @param options.gates - `{ palette: { attribute, ids, host }, typeface: { attribute, claude, host } }`.
 * @param options.images - brand mark name → its address, for the token sheet.
 * @returns `{ main }`: the theme's sheet, minified once every check has read
 *     every sheet.
 */
export function buildStylesheet({ sheets, srcDir, sources, tokenDoc, gates, images }) {
  const names = { skin: new Set(), host: new Set() }
  const read = new Map()
  const parts = new Map()
  const relations = new Map()
  const keyframes = new Map()
  const processed = sheets.map((sheet) => {
    const source = sheet.file === TOKEN_SHEET
      ? tokenSheet(tokenDoc, gates, images, SCOPE)
      : fs.readFileSync(path.join(srcDir, sheet.file), 'utf8').replace(/\r\n/g, '\n')
    return { sheet, text: processSheet(sheet, source, gates, names, read, parts, relations, keyframes).replace(/\n+$/, '') }
  })
  const joined = () => processed.map((item) => item.text).join('\n\n')
  for (const name of names.skin) {
    if (!names.host.has(name)) throw new Error(`build: ${name} is defined under a skin palette or typeface but has no alias under the host's`)
  }
  checkAttributes(read, sources)
  checkParts(parts)
  checkHolds(relations)
  // The token sheet declares every token, so it is no reader of any: what reads
  // a token is another sheet, or another token's value (a shorthand).
  const readers = [
    ...processed.filter((item) => item.sheet.file !== TOKEN_SHEET).map((item) => item.text),
    ...tokenDoc.motion.map((item) => item.value),
  ].join('\n')
  checkTokensRead(tokenDoc, readers, sources)
  const main = minifyCss(joined())
  checkImportance(main, srcDir)
  return { main }
}

/**
 * Every `!important` the built sheet carries must be one the importance walk
 * decided (D9): the weight is only ever there over a host `!important`, an
 * inline style or another skin rule, and which of those it stands over was read
 * off the page by that walk. The walk writes every declaration it read — the
 * ones it proved necessary with what each beats, and the ones no page state
 * could reach with the verdict that says so — into
 * packages/testing/importance-ledger.json, keyed by the declaration's rule text
 * and property, which is the same key this check computes over the built sheet.
 * A declaration in no entry is weight nobody has read the page for: write the
 * reason into a decision, then run the walk with `DSH_IMPORTANCE_LEDGER=write`
 * and read the ledger's diff. That run builds the very sheet it is about to
 * record, so the check stands aside for it; nothing else sets the variable.
 *
 * @param main - the built theme sheet, minified, as the page runs it.
 * @param srcDir - packages/client/src, from which the repository root is reached.
 */
function checkImportance(main, srcDir) {
  if (process.env.DSH_IMPORTANCE_LEDGER === 'write') return
  const root = path.resolve(srcDir, '..', '..', '..')
  const ledger = JSON.parse(fs.readFileSync(path.join(root, 'packages', 'testing', 'importance-ledger.json'), 'utf8')).entries
  const problems = []
  postcss.parse(main).walkRules((rule) => {
    const important = rule.nodes.filter((node) => node.type === 'decl' && node.important)
    if (important.length === 0) return
    const key = ruleKey(rule)
    for (const node of important) {
      if (ledger[`${key}|${node.prop.toLowerCase()}`] !== undefined) continue
      problems.push(`${rule.selector.replace(/\s+/g, ' ').slice(0, 90)} { ${node.prop} }`)
    }
  })
  if (problems.length > 0) {
    throw new Error(`build: ${problems.length} !important declaration(s) the importance walk has not decided — read the page for each (the weight is only for a host !important, an inline style or another skin rule), then record it: ${problems.slice(0, 3).join('；')}`)
  }
}
