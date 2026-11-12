/**
 * whale.mjs — the plugin's own mark, drawn as pixel art at build time.
 *
 * The mark is the round little whale seen from the side: a stepped outline,
 * a pale-blue body with a lighter belly, one dark eye near the snout and a
 * two-pronged fluke at the tail. The silhouette is written as row spans on an
 * integer grid and rasterised here into runs of whole pixels, so the contour is
 * exactly one pixel wide everywhere and nothing is ever drawn between cells.
 * `scripts/build.mjs` turns the resting pose into the routed brand mark.
 */

/** The colours every frame is painted from, in the skin's DeepSeek blues. */
const INK = {
  outline: '#3f5297',
  body: '#ced9ff',
  shade: '#9eb2eb',
  belly: '#eef2ff',
  eye: '#243460',
}

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

/**
 * The plugin mark: the same pixel whale at rest, its body centred in a square
 * so the icon keeps the sidebar's cap height wherever it is painted.
 */
export function renderWhaleIcon() {
  const pose = neutral()
  const size = 32
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges"><g transform="translate(0 4)">${bodyMarkup(pose)}</g></svg>`
}
