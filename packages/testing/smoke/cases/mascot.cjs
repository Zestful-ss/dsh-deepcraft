'use strict'
const { check, basicChecks, commonChecks } = require('./_shared.cjs')

/**
 * The Petdex cases: the reader's chosen package, drawn from one untouched atlas. The
 * native action is read beside the semantic animation, so a mapping that
 * drifts from the official rows fails here; the atlas URL is collected across
 * every reading, because one package is one image whatever it plays.
 */
function petdexChecks(r, label, { palette, id }) {
  const p = r.petdex || {}
  const home = p.home || null
  const geometry = p.geometry || null
  check(`${label}: the chosen package is on the page, drawn by Petdex`,
    p.palette === palette && !!home && home.petId === id && home.ready === true,
    JSON.stringify({ palette: p.palette, home }))
  check(`${label}: the window is 72×78 and the atlas keeps eight columns by nine rows`,
    !!geometry && geometry.width === 72 && geometry.height === 78 &&
      geometry.spriteWidth === 72 && geometry.spriteHeight === 78 &&
      geometry.stripWidth === 576 && geometry.stripHeight === 702 && geometry.objectFit === 'auto',
    JSON.stringify(geometry))
  check(`${label}: one atlas URL served every action`,
    Array.isArray(p.sheets) && p.sheets.length === 1 && p.sheets[0].indexOf('/pets/image/' + id) !== -1,
    JSON.stringify(p.sheets))
  check(`${label}: it idles from the idle row`,
    !!home && home.animation === 'idle' && home.action === 'idle' && home.place === 'card',
    JSON.stringify(home))
  check(`${label}: a left press runs right and a right press runs left, as the package names them`,
    !!p.left && p.left.animation === 'poke-left' && p.left.action === 'running-right' &&
      !!p.right && p.right.animation === 'poke-right' && p.right.action === 'running-left',
    JSON.stringify({ left: p.left, right: p.right }))
  check(`${label}: four presses tickle it into a jump, and a lift jumps`,
    !!p.tickle && p.tickle.animation === 'tickle' && p.tickle.action === 'jumping' &&
      !!p.drag && p.drag.animation === 'drag' && p.drag.action === 'jumping' &&
      !!p.afterDrag && p.afterDrag.animation === 'idle',
    JSON.stringify({ tickle: p.tickle, drag: p.drag, after: p.afterDrag }))
  check(`${label}: the session's states pick review, running and waiting`,
    !!p.thinking && p.thinking.animation === 'thinking' && p.thinking.action === 'review' &&
      !!p.typing && p.typing.animation === 'typing' && p.typing.action === 'running' &&
      !!p.notification && p.notification.animation === 'notification' && p.notification.action === 'waiting',
    JSON.stringify({ thinking: p.thinking, typing: p.typing, waiting: p.notification }))
  check(`${label}: a compaction runs, its end waves, and a failed tool shakes`,
    !!p.compacting && p.compacting.action === 'running' &&
      !!p.celebrating && p.celebrating.animation === 'happy' && p.celebrating.action === 'waving' &&
      !!p.failed && p.failed.animation === 'error' && p.failed.action === 'failed',
    JSON.stringify({ compacting: p.compacting, celebrating: p.celebrating, failed: p.failed }))
  check(`${label}: the quiet minute stands on the idle row's first frame, and a pointer move waves`,
    !!p.asleep && p.asleep.animation === 'sleeping' && p.asleep.action === 'idle' && p.asleep.frame === '0px 0px' &&
      !!p.woken && p.woken.action === 'waving',
    JSON.stringify({ asleep: p.asleep, woken: p.woken }))
  check(`${label}: reduced motion pins the first frame and the hand still answers`,
    !!p.still && p.still.attr === 'reduced' && p.still.frame === p.still.after &&
      !!p.stillPoke && p.stillPoke.animation === 'poke-left' && p.stillPoke.action === 'running-right',
    JSON.stringify({ still: p.still, poke: p.stillPoke }))
  check(`${label}: the chat switch retires it and the theme brings it back`,
    p.off === null && !!p.back && p.back.petId === id && p.gone === true,
    JSON.stringify({ off: p.off, back: p.back, gone: p.gone }))
}

module.exports = {
  'petdex-claude'(r) {
    basicChecks(r)
    petdexChecks(r, 'the ember palette’s Petdex pet', { palette: 'ember', id: 'crab-buddy' })
    commonChecks(r)
  },
  'petdex-deepseek'(r) {
    basicChecks(r)
    petdexChecks(r, 'the ocean palette’s Petdex pet', { palette: 'ocean', id: 'whaledou' })
    commonChecks(r)
  },
}
