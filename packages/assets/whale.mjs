/**
 * whale.mjs — Deepy's sheets, drawn as smooth SVG at build time.
 *
 * The character is a young whale girl: a large round head, blue hair with
 * whale-fin ears and a little tail, big eyes and a sailor-style outfit. The
 * browser plays the same cell layout the sprite has always used: one frame per
 * 54×54 cell (a 52×52 canvas plus one logical pixel of transparent margin on
 * every side, DEEPY_GUTTER), eight cells to a row. `scripts/build.mjs` turns
 * these strings into the routed assets or inline data URIs the player loads, so
 * no drawing happens at runtime and no image library is needed.
 *
 * Every animation shares one head, face, hair, outfit, arms, legs and shadow;
 * an action changes the pose and adds its own small props. Coordinates are the
 * 52×52 logical grid.
 */

const CANVAS = 52

/** The animation table's shape, as the sheet tables declare it. */
const ACTIONS = new Set([
  'idle', 'idle-look', 'idle-spout', 'thinking', 'typing', 'music', 'conducting',
  'building', 'error', 'happy', 'notification', 'compacting', 'sleeping', 'waking',
  'poke-left', 'poke-right', 'tickle', 'drag',
])

function defs(name) {
  return `<defs>
<linearGradient id="${name}-hair" x1="8" y1="10" x2="40" y2="44" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#a8e2ff"/><stop offset=".55" stop-color="#5b9bfa"/><stop offset="1" stop-color="#3c5fd6"/></linearGradient>
<linearGradient id="${name}-skin" x1="12" y1="22" x2="34" y2="43" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff0e8"/><stop offset="1" stop-color="#ffd4c2"/></linearGradient>
<linearGradient id="${name}-outfit" x1="13" y1="37" x2="34" y2="48" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#dceaff"/></linearGradient>
<linearGradient id="${name}-tail" x1="34" y1="33" x2="49" y2="47" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#7db8ff"/><stop offset="1" stop-color="#2f4fb8"/></linearGradient>
<radialGradient id="${name}-shadow" cx="24" cy="49.4" r="14" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#3c5fd6" stop-opacity=".18"/><stop offset="1" stop-color="#3c5fd6" stop-opacity="0"/></radialGradient>
<radialGradient id="${name}-glow" cx="18" cy="20" r="14" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ffffff" stop-opacity=".38"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient>
<clipPath id="${name}-clip"><rect x="0" y="0" width="${CANVAS}" height="${CANVAS}"/></clipPath>
</defs>`
}

/** The neutral pose every action starts from. */
function neutral() {
  return { dx: 0, dy: 0, tilt: 0, tail: 0, arm: 0, eye: 'open', openness: 1, pupil: 0, mouth: 'smile', blush: 0.45 }
}

function pose(name, frame, frames) {
  const turn = (2 * Math.PI * frame) / frames
  const u = frames > 1 ? frame / (frames - 1) : 0
  const swell = Math.sin(Math.PI * u)
  const p = neutral()
  p.dy = 0.6 * Math.sin(turn)
  p.tail = 6 * Math.sin(turn)
  switch (name) {
    case 'idle':
      break
    case 'idle-look':
      p.pupil = 0.8 * Math.sin(turn)
      p.tilt = 1.2 * Math.sin(turn)
      break
    case 'idle-spout':
      p.dy = 0.5 * Math.sin(turn)
      break
    case 'thinking':
      p.tilt = -3
      p.tail = 3 * Math.sin(turn)
      break
    case 'typing':
      p.dy = 0.15 * Math.sin(turn)
      p.arm = -8
      break
    case 'music':
      p.tilt = 5 * Math.sin(turn)
      p.tail = 8 * Math.sin(turn)
      break
    case 'conducting':
      p.tilt = 2 * Math.sin(2 * turn)
      p.arm = -24 + 18 * Math.sin(turn)
      break
    case 'building':
      p.arm = -12
      break
    case 'error':
      p.dx = 0.6 * Math.sin(2 * turn)
      p.tilt = 0.6 * Math.sin(3 * turn)
      p.eye = 'worried'
      p.mouth = 'wavy'
      break
    case 'happy':
      p.dy = -2 * Math.abs(Math.sin(turn))
      p.tail = 10 * Math.sin(turn)
      p.eye = 'happy'
      p.mouth = 'open'
      p.blush = 0.7
      break
    case 'notification':
      p.tail = 4 * Math.sin(turn)
      p.eye = 'wide'
      break
    case 'compacting':
      p.arm = -10
      break
    case 'sleeping':
      p.dy = 0.25 * Math.sin(turn)
      p.eye = 'closed'
      p.mouth = 'small'
      break
    case 'waking':
      p.dy = 0.5 * (1 - u)
      p.arm = 14 * swell
      p.eye = u < 0.55 ? 'closed' : 'open'
      p.openness = u
      break
    case 'poke-left':
    case 'poke-right': {
      const dir = name === 'poke-left' ? 1 : -1
      p.dx = 0.5 * swell * dir
      p.tilt = 2 * swell * dir
      p.eye = u > 0.25 && u < 0.45 ? 'closed' : 'open'
      p.mouth = 'small'
      break
    }
    case 'tickle':
      p.tilt = 3 * Math.sin(4 * Math.PI * u)
      p.arm = 18 * Math.sin(6 * Math.PI * u)
      p.eye = 'happy'
      p.mouth = 'open'
      p.blush = 0.7
      break
    case 'drag':
      p.dy = -1
      p.eye = 'wide'
      p.arm = -38
      break
    default:
      throw new Error(`whale: no pose for "${name}"`)
  }
  return p
}

function eyesMarkup(p) {
  const open = p.eye !== 'closed' && p.eye !== 'happy'
  const height = Math.max(0.25, Math.min(1, p.openness))
  if (p.eye === 'closed') {
    return `<path d="M14.2 29.6 Q17.5 31.7 20.8 29.6" fill="none" stroke="#21406f" stroke-width=".9" stroke-linecap="round"/>
<path d="M26.2 29.6 Q29.5 31.7 32.8 29.6" fill="none" stroke="#21406f" stroke-width=".9" stroke-linecap="round"/>`
  }
  if (p.eye === 'happy') {
    return `<path d="M14.2 30 Q17.5 27 20.8 30" fill="none" stroke="#21406f" stroke-width=".9" stroke-linecap="round"/>
<path d="M26.2 30 Q29.5 27 32.8 30" fill="none" stroke="#21406f" stroke-width=".9" stroke-linecap="round"/>`
  }
  const wide = p.eye === 'wide'
  const rx = wide ? 3.5 : 3.15
  const ry = wide ? 4.3 : 3.85
  const iris = wide ? 2.5 : 2.2
  const brow = p.eye === 'worried'
    ? `<path d="M14 25.2 Q17.5 24.2 20.8 25.5" fill="none" stroke="#21406f" stroke-width=".7" stroke-linecap="round"/>
<path d="M26.2 25.5 Q29.5 24.2 33 25.2" fill="none" stroke="#21406f" stroke-width=".7" stroke-linecap="round"/>`
    : ''
  const eye = (cx) => `<g transform="translate(${p.pupil} 0)"><ellipse cx="${cx}" cy="29.3" rx="${rx}" ry="${ry}" fill="#ffffff"/>
<circle cx="${cx}" cy="29.9" r="${iris}" fill="#3c6fd8"/>
<circle cx="${cx}" cy="30.4" r="${iris * 0.55}" fill="#16284d"/>
<circle cx="${cx + 0.9}" cy="28.7" r=".72" fill="#ffffff"/>
<circle cx="${cx - 0.8}" cy="31" r=".34" fill="#bfe2ff" opacity=".9"/></g>`
  return `${brow}<g transform="scale(1 ${open ? height : 1})" transform-origin="23.5 29.3">${eye(17.5)}${eye(29.5)}</g>`
}

function mouthMarkup(p) {
  const stroke = 'fill="none" stroke="#8f4b45" stroke-width=".75" stroke-linecap="round"'
  switch (p.mouth) {
    case 'open': return `<path d="M21 35.1 Q23.5 38.2 26 35.1 Q23.5 36.2 21 35.1Z" fill="#a6464a" opacity=".9"/>`
    case 'wavy': return `<path d="M21 35.5 Q22.2 34.5 23.5 35.5 Q24.8 36.5 26 35.5" ${stroke}/>`
    case 'small': return `<path d="M22.3 35.4 Q23.5 36.2 24.7 35.4" ${stroke}/>`
    default: return `<path d="M20.8 35.2 Q23.5 37 26.2 35.2" ${stroke}/>`
  }
}

function character(name, p) {
  return `<g transform="translate(${p.dx} ${p.dy}) rotate(${p.tilt} 23.5 31)">
<ellipse cx="24" cy="49.4" rx="14" ry="1.3" fill="url(#${name}-shadow)"/>
<g transform="rotate(${p.tail} 36 43)">
<path d="M35 44 C39 43 42 39 40 35 C44 35 46 37 46 40 C48 36 50 34 51 33 C52 39 49 44 45 47 L38 49Z" fill="url(#${name}-tail)"/>
</g>
<rect x="20.5" y="38" width="7" height="5" rx="2" fill="url(#${name}-skin)"/>
<path d="M14 39 Q23.5 36 33 39 L34 45 Q23.5 49 13 45Z" fill="url(#${name}-outfit)"/>
<path d="M16 38 Q23.5 41 31 38 L30 42 Q23.5 44.6 17 42Z" fill="#4d8cf5"/>
<path d="M21.5 41.2 L23.5 42.2 L21.5 43Z" fill="#3c5fd6"/><path d="M25.5 41.2 L23.5 42.2 L25.5 43Z" fill="#3c5fd6"/>
<circle cx="23.5" cy="42.2" r=".8" fill="#a8c8ff"/>
<rect x="18" y="45.4" width="4.6" height="5.2" rx="2.2" fill="url(#${name}-skin)"/>
<rect x="24.9" y="45.4" width="4.6" height="5.2" rx="2.2" fill="url(#${name}-skin)"/>
<rect x="17" y="48.4" width="6.4" height="2.8" rx="1.4" fill="#3159b8"/>
<rect x="24.2" y="48.4" width="6.4" height="2.8" rx="1.4" fill="#3159b8"/>
<g transform="rotate(${-p.arm} 15.5 39.5)"><path d="M15.5 39.5 C12 40.2 10.6 43 12.2 44.4 C14 45.8 15.8 44 16.2 41.6Z" fill="url(#${name}-skin)"/><path d="M15.5 39.5 C13.6 39.8 12.4 40.8 11.6 42 L14.4 42.6Z" fill="#5b9bfa"/></g>
<g transform="rotate(${p.arm} 31.5 39.5)"><path d="M31.5 39.5 C35 40.2 36.4 43 34.8 44.4 C33 45.8 31.2 44 30.8 41.6Z" fill="url(#${name}-skin)"/><path d="M31.5 39.5 C33.4 39.8 34.6 40.8 35.4 42 L32.6 42.6Z" fill="#5b9bfa"/></g>
<ellipse cx="23.5" cy="27" rx="16" ry="16.5" fill="url(#${name}-hair)"/>
<path d="M8 26 C4 25 2 28 3 31 C4 34 7 34 9 32Z" fill="url(#${name}-hair)"/>
<path d="M39 26 C43 25 45 28 44 31 C43 34 40 34 38 32Z" fill="url(#${name}-hair)"/>
<ellipse cx="23.5" cy="28" rx="13.6" ry="13.9" fill="url(#${name}-skin)"/>
<path d="M10.5 25 Q11.5 13 23.5 11.5 Q35.5 13 36.5 25 Q33.5 20.5 30.5 22.5 Q28 17.5 25 22.5 Q22 17.5 19 22.5 Q16 18.5 13.5 22.5 Q12 20.5 10.5 25Z" fill="url(#${name}-hair)"/>
<path d="M9.5 23 Q6.5 30 8 37 L11.5 35 Q10 29 11.5 23Z" fill="url(#${name}-hair)"/>
<path d="M37.5 23 Q40.5 30 39 37 L35.5 35 Q37 29 35.5 23Z" fill="url(#${name}-hair)"/>
<ellipse cx="18" cy="20" rx="9" ry="6" fill="url(#${name}-glow)"/>
<path d="M35 10 C37 8.6 39 9.2 39.5 11 C41.5 10 43 11 42.2 13 C41.2 15.4 38 15 36 13Z" fill="#4d8cf5" opacity=".95"/>
<ellipse cx="13.5" cy="33.2" rx="2.5" ry="1.2" fill="#ff9fb0" opacity="${p.blush}"/>
<ellipse cx="33.5" cy="33.2" rx="2.5" ry="1.2" fill="#ff9fb0" opacity="${p.blush}"/>
${eyesMarkup(p)}
${mouthMarkup(p)}
</g>`
}

function props(name, frame, frames) {
  const turn = (2 * Math.PI * frame) / frames
  const u = frames > 1 ? frame / (frames - 1) : 0
  switch (name) {
    case 'idle-spout': {
      return [0, 0.33, 0.66].map((offset, at) => {
        const rise = (u + offset) % 1
        const x = 20 + at * 4
        const y = 17 - rise * 12
        const opacity = Math.sin(Math.PI * rise).toFixed(2)
        return `<ellipse cx="${x}" cy="${y.toFixed(1)}" rx="1.1" ry="1.6" fill="#bfe6ff" opacity="${opacity}"/>`
      }).join('')
    }
    case 'thinking': {
      return [[37, 13, 2.4], [41.5, 8.5, 1.7], [45, 5, 1.1]].map(([x, y, r], at) => {
        const bob = 0.5 * Math.sin(turn + at * 1.2)
        return `<circle cx="${x}" cy="${(y + bob).toFixed(2)}" r="${r}" fill="#eaf4ff" stroke="#6fa8f8" stroke-width=".55" opacity="${0.55 + 0.35 * Math.sin(turn + at)}"/>`
      }).join('')
    }
    case 'typing': {
      return `<g>
<rect x="12" y="40.5" width="21" height="8" rx="1.7" fill="#2b3a55"/>
<rect x="14" y="42" width="10" height="4.4" rx=".8" fill="#bfe6ff"/>
<rect x="25.5" y="42" width="5" height="4.4" rx=".8" fill="#6fa8f8" opacity=".65"/>
<rect x="10.5" y="47.8" width="24" height="2.4" rx="1.2" fill="#1d2a40"/>
<circle cx="15.5" cy="45.5" r="1.4" fill="url(#${name}-skin)"/>
<circle cx="31.5" cy="45.5" r="1.4" fill="url(#${name}-skin)"/>
</g>`
    }
    case 'music': {
      const bob = 0.7 * Math.sin(turn)
      return `<g transform="translate(0 ${bob.toFixed(2)})" fill="none" stroke="#4d8cf5" stroke-width="1.1" stroke-linecap="round">
<path d="M37 16 V8.5 L43 7 V14.5"/>
<ellipse cx="35.6" cy="16.6" rx="1.8" ry="1.4" fill="#4d8cf5" stroke="none"/>
<ellipse cx="41.6" cy="14.6" rx="1.8" ry="1.4" fill="#4d8cf5" stroke="none"/>
</g>`
    }
    case 'conducting': {
      const angle = 18 * Math.sin(turn)
      return `<g transform="rotate(${angle} 34 42)">
<path d="M34 42 L43 29" stroke="#c8952f" stroke-width="1.2" stroke-linecap="round"/>
<circle cx="34" cy="42" r="1.2" fill="#c8952f"/>
<circle cx="43.5" cy="28.2" r="1.5" fill="#f4d27a"/>
</g>`
    }
    case 'building': {
      return `<g>
<path d="M12 18 Q13 10.5 23.5 10.5 Q34 10.5 35 18Z" fill="#ffd36a"/>
<rect x="9.5" y="17" width="28" height="2.7" rx="1.3" fill="#e6a93a"/>
<rect x="21.8" y="9.2" width="3.4" height="6.2" rx=".8" fill="#e6a93a" opacity=".85"/>
<rect x="7" y="42.5" width="9" height="5.8" rx="1.2" fill="#f0a04b"/>
<rect x="7" y="42.5" width="9" height="1.7" rx=".8" fill="#ffc37a"/>
<circle cx="9.2" cy="42.5" r="1.1" fill="#f0a04b"/><circle cx="13.8" cy="42.5" r="1.1" fill="#f0a04b"/>
</g>`
    }
    case 'error': {
      const shake = 0.8 * Math.sin(turn * 3)
      return `<g transform="translate(${shake} 0)">
<circle cx="41" cy="13" r="5" fill="#ffe1dc" stroke="#d9534f" stroke-width=".8"/>
<path d="M41 10 V14" stroke="#b93a35" stroke-width="1.4" stroke-linecap="round"/>
<circle cx="41" cy="16.4" r=".8" fill="#b93a35"/>
</g>`
    }
    case 'happy': {
      return `<g fill="#ffd36a">
<path d="M42 18 l1.2 2.6 2.6 1.2 -2.6 1.2 -1.2 2.6 -1.2 -2.6 -2.6 -1.2 2.6 -1.2Z"/>
<path d="M8 22 l.9 2 2 .9 -2 .9 -.9 2 -.9 -2 -2 -.9 2 -.9Z" opacity=".85"/>
</g>`
    }
    case 'notification': {
      const pulse = 1 + 0.08 * Math.sin(turn * 2)
      return `<g transform="translate(41 11.5) scale(${pulse})">
<path d="M-3.6 3.2 Q-3.6 -1.6 0 -1.6 Q3.6 -1.6 3.6 3.2Z" fill="#ffd36a" stroke="#c8952f" stroke-width=".6"/>
<path d="M-4.4 3.4 H4.4" stroke="#c8952f" stroke-width="1" stroke-linecap="round"/>
<circle cx="0" cy="5.1" r=".9" fill="#c8952f"/>
</g>`
    }
    case 'compacting': {
      const slide = (0.5 + 0.5 * Math.sin(turn)) * 3
      return `<g>
<rect x="34" y="40" width="14" height="7" rx="1.6" fill="#d9e6ff" stroke="#5b86d8" stroke-width=".7"/>
<rect x="34" y="40" width="14" height="2.2" rx="1.1" fill="#b9d0fb"/>
<g transform="translate(0 ${slide.toFixed(2)}) rotate(-8 39 22)">
<rect x="35" y="19" width="8" height="10" rx="1.2" fill="#ffffff" stroke="#7fa6ea" stroke-width=".6"/>
<path d="M37 22 H41 M37 24.4 H41 M37 26.8 H40" stroke="#9fb9e6" stroke-width=".6" stroke-linecap="round"/>
</g>
<g transform="translate(0 ${(slide * 0.7).toFixed(2)}) rotate(7 45 24)">
<rect x="42" y="21" width="7" height="9" rx="1.1" fill="#ffffff" stroke="#7fa6ea" stroke-width=".6"/>
<path d="M43.6 23.6 H47.4 M43.6 25.8 H47.4" stroke="#9fb9e6" stroke-width=".6" stroke-linecap="round"/>
</g>
</g>`
    }
    case 'sleeping': {
      const drift = 0.7 * Math.sin(turn)
      return `<g transform="translate(${drift.toFixed(2)} 0)" fill="none" stroke="#6f8fca" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
<path d="M38 15 H42.5 L38 20 H42.5" opacity=".85"/>
<path d="M44 9.5 H47.5 L44 13.5 H47.5" opacity=".6"/>
</g>`
    }
    default:
      return ''
  }
}

function frameMarkup(name, frame, frames, gutter) {
  const p = pose(name, frame, frames)
  const col = frame % 8
  const row = Math.floor(frame / 8)
  const cell = CANVAS + gutter * 2
  return `<g transform="translate(${gutter + col * cell} ${gutter + row * cell})" clip-path="url(#${name}-clip)">${character(name, p)}${props(name, frame, frames)}</g>`
}

/**
 * One animation's vector: every frame in its own cell, eight to a row.
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
  const rows = Math.ceil(sheet.frames / 8)
  const width = 8 * (CANVAS + gutter * 2)
  const height = rows * (CANVAS + gutter * 2)
  const frames = Array.from({ length: sheet.frames }, (_, frame) => frameMarkup(name, frame, sheet.frames, gutter)).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${defs(name)}${frames}</svg>`
}

/** The plugin mark: the idle whale girl with her head, hair fins and tail. */
export function renderWhaleIcon() {
  const p = pose('idle', 0, 48)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="38" viewBox="3 8 46 40">${defs('deepcraft-mark')}${character('deepcraft-mark', p)}</svg>`
}
