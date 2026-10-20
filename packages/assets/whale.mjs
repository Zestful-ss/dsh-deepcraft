/**
 * whale.mjs — Deepy's sheets, drawn as pixel art at build time.
 *
 * The character is a round little whale seen from the side: a stepped outline,
 * a pale-blue body with a lighter belly, one dark eye near the snout and a
 * two-pronged fluke at the tail. The silhouette is written as row spans on an
 * integer grid and rasterised here into runs of whole pixels, so the contour is
 * exactly one pixel wide everywhere and nothing is ever drawn between cells.
 * The browser plays the same cell layout the sprite has always used — one frame
 * per 54×54 cell (a 52×52 canvas plus one logical pixel of transparent margin on
 * every side, DEEPY_GUTTER), eight cells to a row — so `scripts/build.mjs` only
 * turns these strings into the routed assets or inline data URIs the player
 * loads.
 *
 * Each distinct pose is drawn once and every frame that shows it is a `<use>`
 * of it, so a sheet never carries eight copies of the same body. An action
 * moves the animal by whole pixels, lifts or drops the fluke, swaps the eye and
 * adds its own small props. Coordinates are the 52×52 logical canvas, the body
 * grid standing on row 29 of it.
 */

const CANVAS = 52
/** The top of the character grid inside the canvas: the body stands from here down. */
const BODY_TOP = 29

/** The colours every frame is painted from, in the skin's DeepSeek blues. */
const INK = {
  outline: '#3f5297',
  body: '#ced9ff',
  shade: '#9eb2eb',
  belly: '#eef2ff',
  eye: '#243460',
  hint: '#8ea2f2',
  star: '#ffc496',
  error: '#ff8d8d',
}

/** The animation table's shape, as the sheet tables declare it. */
const ACTIONS = new Set([
  'idle', 'idle-look', 'idle-spout', 'idle-laptop', 'thinking', 'typing', 'music',
  'conducting', 'building', 'error', 'happy', 'notification', 'compacting',
  'sleeping', 'waking', 'poke-left', 'poke-right', 'tickle', 'drag',
])

/**
 * The measured master grid: the reference art at 32×24, one character a cell,
 * `o` body and `.` belly. The silhouette is traced from the reference itself
 * (the 32×32 detail drawing), so the back's plate, the heart tail's cleft and
 * the flipper's step land where the art puts them.
 */
const MASTER = [
  '                 ooooooooooo    ',
  '              ooooooooooooooo   ',
  '             oooooooooooooooo   ',
  '             ooooooooooooo.ooo  ',
  ' oooooo    ooooooooooooooooooo  ',
  'oooooooo  ooooooooooooooooooooo ',
  'ooooooooo oooooooooooooooooooooo',
  'oooooooooooooooooooooooooooooooo',
  'oooooooooooooooooooooooooooooooo',
  'oooooooooooooooooooooooooooooooo',
  '  oooooooooooooooooooooooooooooo',
  '   ooooooooooooooooooooooooooooo',
  '   ooooooooooooooooooooooooooooo',
  '  oooooooooooooooooooooooooooooo',
  '   ooooooooooooooooooooooooooooo',
  '   ooooooooooooooooo...ooo..oooo',
  '    oooooooooooooo.....ooo.oooo ',
  '    oooooooooooooo.........ooo  ',
  '      oooo.ooooo.oooo.....ooo   ',
  '       oooooooooo.ooo..ooooo    ',
  '       ooooooooo.ooooooooooo    ',
  '         oooooooooooooooooo     ',
]

/**
 * The pale belly: a large plate low on the right flank, one cell inside the
 * contour, following the animal's own curve rather than a flat bottom band.
 */
const BELLY = {
  10: [28, 30],
  11: [24, 30],
  12: [21, 30],
  13: [18, 30],
  14: [16, 29],
  15: [15, 28],
  16: [14, 27],
  17: [14, 25],
  18: [15, 23],
  19: [17, 21],
}

/**
 * The curl inside the tail, in the outline colour: the heart's inner loop,
 * drawn as a ring so the body colour shows through its middle.
 */
const CURL = [
  [3, 5], [4, 5], [5, 5],
  [2, 6], [6, 6],
  [2, 7], [6, 7],
  [3, 8], [4, 8], [5, 8],
]

/**
 * The tail's outer tip, the cells the swing moves. The rest of the tail stays
 * fixed, so a whole-pixel swing can never tear the tail off the flank.
 */
const TAIL_TIP = { rows: [4, 9], cols: [0, 2] }

/**
 * The eyes by expression: pairs of `[x, y, w, h]` in body cells. The animal
 * looks out from the front, so both eyes always move and change together.
 */
const EYES = {
  open: [[19, 10, 2, 2], [27, 10, 2, 2]],
  blink: [[19, 11, 2, 1], [27, 11, 2, 1]],
  wide: [[18, 9, 3, 3], [26, 9, 3, 3]],
  closed: [[19, 11, 2, 1], [27, 11, 2, 1]],
  happy: [[19, 10, 2, 1], [27, 10, 2, 1]],
  worried: [[19, 11, 2, 1], [27, 11, 2, 1]],
}

/** A neutral pose: where every action starts. */
function neutral() {
  return { dx: 0, dy: 0, eye: 'open', eyeX: 0, tail: 0, props: '' }
}

/** Every cell of one span table, shifted by `dx` and `dy`. */
function spans(table, dx, dy) {
  const cells = new Set()
  for (const [row, [from, to]] of Object.entries(table)) {
    for (let x = from; x <= to; x++) cells.add(`${x + dx},${Number(row) + dy}`)
  }
  return cells
}

/**
 * Whether all four orthogonal neighbours of a cell are part of the same shape.
 * Only the orthogonal reach keeps a diagonal step from reading as a hole, so
 * the contour stays exactly one logical pixel wide.
 */
function interior(cells, x, y) {
  return cells.has(`${x - 1},${y}`) && cells.has(`${x + 1},${y}`) && cells.has(`${x},${y - 1}`) && cells.has(`${x},${y + 1}`)
}

/** Horizontal runs of one cell set, merged per row: `[x, y, width]`. */
function runs(cells) {
  const rows = new Map()
  for (const cell of cells) {
    const [x, y] = cell.split(',').map(Number)
    if (!rows.has(y)) rows.set(y, [])
    rows.get(y).push(x)
  }
  const out = []
  for (const [y, xs] of [...rows].sort((a, b) => a[0] - b[0])) {
    xs.sort((a, b) => a - b)
    let start = xs[0]
    let last = xs[0]
    for (const x of xs.slice(1)) {
      if (x === last + 1) {
        last = x
        continue
      }
      out.push([start, y, last - start + 1])
      start = x
      last = x
    }
    out.push([start, y, last - start + 1])
  }
  return out
}

/** Runs painted as rects of one colour. */
const paint = (list, fill) => list.map(([x, y, w]) => `<rect x="${x}" y="${y}" width="${w}" height="1" fill="${fill}"/>`).join('')

/** A solid block, for props. */
const rect = (x, y, w, h, fill) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`

/** Every body cell the master grid draws, as `x,y` keys. */
function masterCells() {
  const cells = new Set()
  MASTER.forEach((line, y) => {
    [...line].forEach((ch, x) => {
      if (ch !== ' ') cells.add(`${x},${y}`)
    })
  })
  return cells
}

/**
 * The whale at one pose: silhouette, pale belly, tail curl, both eyes, then the
 * action's own props in front. The tail's outer tip is the only part the swing
 * moves; the rest of the tail stays planted on the flank.
 * @param pose - the pose (neutral()).
 */
function bodyMarkup(pose) {
  const all = masterCells()
  const tip = new Set()
  for (const cell of all) {
    const [x, y] = cell.split(',').map(Number)
    if (y >= TAIL_TIP.rows[0] && y <= TAIL_TIP.rows[1] && x >= TAIL_TIP.cols[0] && x <= TAIL_TIP.cols[1]) {
      tip.add(cell)
      all.delete(cell)
    }
  }
  for (const cell of tip) {
    const [x, y] = cell.split(',').map(Number)
    all.add(`${x},${y + pose.tail}`)
  }
  const edge = new Set([...all].filter((cell) => {
    const [x, y] = cell.split(',').map(Number)
    return !interior(all, x, y)
  }))
  const fill = new Set([...all].filter((cell) => !edge.has(cell)))

  // The belly follows its table, clipped to the body's interior.
  const belly = new Set([...spans(BELLY, 0, 0)].filter((cell) => fill.has(cell)))
  const curl = new Set(CURL.map(([x, y]) => `${x},${y}`))

  const eye = []
  for (const [eyeX, eyeY, eyeW, eyeH] of EYES[pose.eye]) {
    for (let y = eyeY; y < eyeY + eyeH; y++) {
      for (let x = eyeX + pose.eyeX; x < eyeX + pose.eyeX + eyeW; x++) eye.push([x, y, 1])
    }
  }

  return `<g transform="translate(${pose.dx} ${pose.dy})">
${paint(runs(edge), INK.outline)}
${paint(runs(fill), INK.body)}
${paint(runs(belly), INK.belly)}
${paint(runs(curl), INK.outline)}
${paint(eye, INK.eye)}
${pose.props}
</g>`
}

/** A bubble: a small stepped speech mark above and ahead of the head. */
const bubble = (x, y, size, fill) => rect(x, y, size, size, fill) + rect(x + size, y + size, 1, 1, fill)

/** One star, four cells around a centre: the celebration's sparkle. */
function star(x, y, fill) {
  return rect(x + 1, y, 1, 3, fill) + rect(x, y + 1, 3, 1, fill)
}

/** The poses one animation plays, at most eight, and how a frame picks one. */
function poses(name) {
  const p = []
  switch (name) {
    case 'idle':
      p.push({}, { dy: -1 }, {}, { eye: 'blink' })
      break
    case 'idle-look':
      p.push({ eyeX: -1 }, {}, { eyeX: 1 }, {})
      break
    case 'idle-spout': {
      const rise = (at) => bubble(23 + at * 2, 6 - at * 2, at === 0 ? 2 : 1, INK.hint)
      p.push({ props: rise(0) }, { props: rise(1) }, { props: rise(2) }, {})
      break
    }
    case 'idle-laptop':
      p.push(
        { props: rect(14, 17, 9, 4, INK.outline) + rect(15, 18, 7, 2, INK.belly) + rect(13, 21, 11, 1, INK.outline) },
        { props: rect(14, 16, 9, 5, INK.outline) + rect(15, 17, 7, 3, INK.belly) + rect(13, 21, 11, 1, INK.outline) + rect(16, 18, 1, 1, INK.hint) },
        { props: rect(14, 16, 9, 5, INK.outline) + rect(15, 17, 7, 3, INK.belly) + rect(13, 21, 11, 1, INK.outline) + rect(19, 18, 1, 1, INK.hint) },
        {},
      )
      break
    case 'thinking':
      p.push({ props: bubble(24, 3, 2, INK.hint) }, { props: bubble(27, 1, 1, INK.hint) }, { props: bubble(24, 3, 2, INK.hint) + bubble(27, 1, 1, INK.hint) }, {})
      break
    case 'typing':
      p.push(
        { dx: -1, props: rect(2, 11, 3, 1, INK.hint) + rect(1, 14, 2, 1, INK.hint) },
        { dx: -1, props: rect(3, 11, 3, 1, INK.hint) + rect(2, 14, 2, 1, INK.hint) },
        { props: rect(4, 11, 3, 1, INK.hint) + rect(3, 14, 2, 1, INK.hint) },
        {},
      )
      break
    case 'music':
      p.push(
        { tail: -1, props: rect(27, 4, 1, 4, INK.hint) + rect(28, 4, 2, 1, INK.hint) + rect(26, 7, 2, 2, INK.hint) },
        { tail: 1 },
        { props: rect(26, 5, 1, 4, INK.hint) + rect(27, 5, 2, 1, INK.hint) + rect(25, 8, 2, 2, INK.hint) },
        {},
      )
      break
    case 'conducting':
      p.push(
        { props: rect(16, 1, 1, 1, INK.hint) + rect(12, 4, 1, 1, INK.hint) },
        { props: rect(27, 2, 1, 1, INK.hint) + rect(31, 8, 1, 1, INK.hint) },
        { props: rect(16, 1, 1, 1, INK.hint) + rect(27, 2, 1, 1, INK.hint) },
        { props: rect(12, 4, 1, 1, INK.hint) + rect(31, 8, 1, 1, INK.hint) },
      )
      break
    case 'building':
      p.push(
        { props: rect(15, 1, 8, 2, INK.star) + rect(14, 3, 10, 1, INK.star) },
        { dy: -1, props: rect(15, 0, 8, 2, INK.star) + rect(14, 2, 10, 1, INK.star) + rect(3, 17, 3, 3, INK.shade) },
        { props: rect(15, 1, 8, 2, INK.star) + rect(14, 3, 10, 1, INK.star) + rect(2, 17, 3, 3, INK.shade) },
        {},
      )
      break
    case 'error':
      p.push(
        { dx: -1, eye: 'worried', props: rect(26, 1, 5, 1, INK.error) + rect(26, 5, 5, 1, INK.error) + rect(27, 2, 1, 1, INK.error) + rect(29, 2, 1, 1, INK.error) + rect(28, 3, 1, 2, INK.error) },
        { eye: 'worried', props: rect(27, 0, 5, 1, INK.error) + rect(27, 4, 5, 1, INK.error) + rect(28, 1, 1, 1, INK.error) + rect(30, 1, 1, 1, INK.error) + rect(29, 2, 1, 2, INK.error) },
        { dx: 1, eye: 'worried' },
        { eye: 'worried' },
      )
      break
    case 'happy':
      p.push(
        { dy: -2, eye: 'happy', tail: -1, props: star(27, 1, INK.star) },
        { dy: -1, eye: 'happy', tail: 1, props: star(25, 2, INK.star) + star(30, 4, INK.star) },
        { dy: -2, eye: 'happy', tail: -1, props: star(28, 3, INK.star) },
        {},
      )
      break
    case 'notification':
      p.push(
        { props: rect(26, 1, 6, 4, INK.hint) + rect(28, 2, 2, 2, INK.belly) + rect(26, 5, 6, 1, INK.outline) },
        { props: rect(25, 1, 6, 4, INK.hint) + rect(27, 2, 2, 2, INK.belly) + rect(25, 5, 6, 1, INK.outline) },
        { props: rect(26, 1, 6, 4, INK.hint) + rect(28, 2, 2, 2, INK.belly) + rect(26, 5, 6, 1, INK.outline) },
        {},
      )
      break
    case 'compacting': {
      const card = (x, y) => rect(x, y, 4, 3, INK.belly) + rect(x, y, 4, 1, INK.hint)
      p.push(
        { props: card(25, 3) + card(30, 1) },
        { props: card(27, 4) + card(31, 2) + rect(25, 8, 6, 4, INK.outline) + rect(26, 9, 4, 2, INK.belly) },
        { props: rect(25, 8, 6, 4, INK.outline) + rect(26, 9, 4, 2, INK.belly) },
        {},
      )
      break
    }
    case 'sleeping':
      p.push(
        { eye: 'closed', dy: 1, props: rect(28, 3, 2, 1, INK.hint) + rect(29, 4, 1, 1, INK.hint) + rect(28, 5, 2, 1, INK.hint) },
        { eye: 'closed', dy: 1, props: rect(29, 1, 2, 1, INK.hint) + rect(30, 2, 1, 1, INK.hint) + rect(29, 3, 2, 1, INK.hint) },
        { eye: 'closed', dy: 1, props: rect(27, 4, 1, 1, INK.hint) + rect(30, 0, 1, 1, INK.hint) },
        { eye: 'closed', dy: 1 },
      )
      break
    case 'waking':
      p.push({ eye: 'closed', dy: 1 }, { eye: 'blink', dy: 1 }, { eye: 'open', dy: 0 }, {})
      break
    case 'poke-left':
      p.push({ dx: 2, eye: 'blink', tail: 1 }, { dx: 1, eye: 'blink' }, { dx: 0 }, {})
      break
    case 'poke-right':
      p.push({ dx: -2, eye: 'blink', tail: -1 }, { dx: -1, eye: 'blink' }, { dx: 0 }, {})
      break
    case 'tickle':
      p.push({ dx: 1, eye: 'happy', tail: -1 }, { dx: -1, eye: 'happy', tail: 1 }, { dx: 1, eye: 'happy', tail: -1 }, { dx: 0, eye: 'happy' })
      break
    case 'drag':
      p.push({ dy: -2, eye: 'wide', tail: -1 }, { dy: -3, eye: 'wide', tail: -1 })
      break
    default:
      throw new Error(`whale: no pose for "${name}"`)
  }
  if (p.length > 8) throw new Error(`whale[${name}]: at most eight poses, so a frame never flickers`)
  return p.map((pose) => ({ ...neutral(), ...pose }))
}

/** Which pose a frame shows: the animation's own frames spread over its poses. */
const poseOf = (steps, frames, index) => Math.min(steps - 1, Math.floor((index * steps) / frames))

/**
 * One animation's vector: every frame in its own cell, eight to a row. Each
 * distinct pose is drawn once and every frame that shows it is a `<use>` of it,
 * so the file carries the poses rather than eight copies of the body.
 * @param name - the animation key (DEEPY_SHEETS).
 * @param sheet - `{ frames, box, still }`; the box must cover the whole grid.
 * @param gutter - the transparent margin each cell keeps, in logical pixels.
 */
export function renderWhaleSheet(name, sheet, gutter) {
  if (!ACTIONS.has(name)) throw new Error(`whale: unknown animation "${name}"`)
  if (sheet.box.length !== 4 || sheet.box.some((value, at) => value !== [0, 0, CANVAS, CANVAS][at])) {
    throw new Error(`whale[${name}]: the crop box must be [0, 0, ${CANVAS}, ${CANVAS}]`)
  }
  if (!Number.isInteger(sheet.frames) || sheet.frames < 1 || !Number.isInteger(sheet.still) || sheet.still < 0 || sheet.still >= sheet.frames) {
    throw new Error(`whale[${name}]: frames must be a positive whole number and still one of them`)
  }
  if (!Number.isInteger(gutter) || gutter < 0) throw new Error(`whale[${name}]: the gutter must be a whole number of logical pixels`)
  const list = poses(name)
  const definitions = list.map((pose, at) => `<g id="${name}-p${at}">${bodyMarkup(pose)}</g>`).join('')
  const cell = CANVAS + gutter * 2
  const rows = Math.ceil(sheet.frames / 8)
  const frames = Array.from({ length: sheet.frames }, (_, frame) => {
    const col = frame % 8
    const row = Math.floor(frame / 8)
    const at = poseOf(list.length, sheet.frames, frame)
    return `<use href="#${name}-p${at}" transform="translate(${gutter + col * cell + 10} ${gutter + row * cell + BODY_TOP})"/>`
  }).join('')
  const width = 8 * cell
  const height = rows * cell
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges"><defs>${definitions}</defs>${frames}</svg>`
}

/**
 * The plugin mark: the same pixel whale at rest, its body centred in a square
 * so the icon keeps the sidebar's cap height wherever it is painted.
 */
export function renderWhaleIcon() {
  const pose = neutral()
  const size = 32
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges"><g transform="translate(0 4)">${bodyMarkup(pose)}</g></svg>`
}
