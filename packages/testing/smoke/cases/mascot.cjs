'use strict'
const { MARKUP, SKIN_FACE, SKIN_HAT, same, check, contrast, basicChecks, commonChecks } = require('./_shared.cjs')

/** One reading of the mascot probe: where it stands, what it plays and from which sheet. */
const is = (state, animation, place) => !!state && state.animation === animation && state.place === place && state.ready === true
const sheetOf = (state) => (state && state.sheet) || ''

/**
 * The walk both characters take: the same place on the home card, the same
 * conversation states, the same hand gestures, the same idle extras and the
 * same exit. Deepy and the crab answer the same inputs, so one list of checks
 * is read twice.
 */
function stateChecks(r, label) {
  const s = r.states || {}
  check(`${label}: the home card carries it, idling from its own sheet`,
    is(s.home, 'idle', 'card') && sheetOf(s.home) !== '' && sheetOf(s.home) !== 'none', JSON.stringify(s.home))
  check(`${label}: its frames change on its own node without waking a pass`,
    !!s.idle && s.idle.before !== s.idle.after && s.idle.passes === 0, JSON.stringify(s.idle))
  check(`${label}: a click on its left half pokes it, on its own sheet`,
    is(s.poke, 'poke-left', 'card') && sheetOf(s.poke) !== sheetOf(s.home),
    JSON.stringify({ home: sheetOf(s.home), poke: sheetOf(s.poke) }))
  check(`${label}: on the conversation it stands on the input area through thinking and typing`,
    is(s.thinking, 'thinking', 'stack') && is(s.typing, 'typing', 'stack'),
    JSON.stringify({ thinking: s.thinking, typing: s.typing }))
  check(`${label}: two sessions at work play the music tier`,
    is(s.music, 'music', 'stack'), JSON.stringify(s.music))
  check(`${label}: two running subagents conduct`,
    is(s.conducting, 'conducting', 'stack'), JSON.stringify(s.conducting))
  check(`${label}: three sessions at work wear the hard hat`,
    is(s.building, 'building', 'stack'), JSON.stringify(s.building))
  check(`${label}: an approval puts it on the approval panel with the notification`,
    is(s.notification, 'notification', 'panel'), JSON.stringify(s.notification))
  check(`${label}: compaction, the celebration when it ends, and the error shake over it`,
    is(s.compacting, 'compacting', 'stack') && is(s.celebrating, 'happy', 'stack') && is(s.failed, 'error', 'stack'),
    JSON.stringify({ compacting: s.compacting, celebrating: s.celebrating, failed: s.failed }))
  check(`${label}: an idle extra takes the stage and hands it back to the idle`,
    is(s.extra, 'idle-laptop', 'stack') && is(s.afterExtra, 'idle', 'stack'),
    JSON.stringify({ extra: s.extra, after: s.afterExtra }))
  check(`${label}: it idles after work, sleeps after a quiet minute, and a pointer move wakes it`,
    is(s.afterWork, 'idle', 'stack') && is(s.asleep, 'sleeping', 'stack') && is(s.woken, 'waking', 'stack'),
    JSON.stringify({ afterWork: s.afterWork, asleep: s.asleep, woken: s.woken }))
  check(`${label}: reduced motion holds the still frame, and a click still plays`,
    s.stillAttr === 'reduced' && s.alwaysAttr === 'full' && !!s.still && s.still.before === s.still.after,
    JSON.stringify({ stillAttr: s.stillAttr, alwaysAttr: s.alwaysAttr, frames: s.still }))
  check(`${label}: a compaction whose end comes back with the whole feed after a reconnect stops, uncelebrated`,
    is(s.resendBefore, 'compacting', 'stack') && is(s.resent, 'idle', 'stack'),
    JSON.stringify({ before: s.resendBefore, after: s.resent }))
  check(`${label}: it leaves with the conversation, and takes its anchor mark along`, s.gone === true, JSON.stringify(s.gone))
  check(`${label}: kept to the home page it stays off the conversation and stands on the home card`,
    s.backInConversation === true && s.homeOnly === null && is(s.homeOnlyHero, 'idle', 'card'),
    JSON.stringify({ back: s.backInConversation, homeOnly: s.homeOnly, hero: s.homeOnlyHero }))
  check(`${label}: with the mascot off it leaves, and picking the other character puts that one out`,
    s.off === null && s.otherPicked === true, JSON.stringify({ off: s.off, other: s.otherPicked }))
  check(`${label}: it subscribes to the session's chat target, which the host builds only for a subscriber`,
    s.chatFollowed === true, JSON.stringify(s.chatFollowed))
}

/**
 * What a reader reads on the brand's palettes: the body ink and a link on the
 * canvas, and — where the brand promises it — a filled accent against the ink
 * it carries. Read as contrast, not as hex, so a palette change that keeps the
 * page legible does not fail an old value.
 */
function paletteChecks(r, label, { accent = false } = {}) {
  const s = r.states || {}
  check(`${label}: the body ink reads on the canvas in both palettes`,
    contrast(s.ink, s.canvas) >= 4.5 && !!s.dark && contrast(s.dark.ink, s.dark.canvas) >= 4.5,
    JSON.stringify({ light: [s.ink, s.canvas], dark: s.dark && [s.dark.ink, s.dark.canvas] }))
  check(`${label}: a link reads on the canvas in both palettes`,
    contrast(s.link, s.canvas) >= 3 && !!s.dark && contrast(s.dark.link, s.dark.canvas) >= 3,
    JSON.stringify({ light: [s.link, s.canvas], dark: s.dark && [s.dark.link, s.dark.canvas] }))
  if (accent) {
    check(`${label}: a filled accent carries its own ink in both palettes`,
      contrast(s.accentInk, s.accent) >= 4.5 && !!s.dark && contrast(s.dark.accentInk, s.dark.accent) >= 4.5,
      JSON.stringify({ light: [s.accentInk, s.accent], dark: s.dark && [s.dark.accentInk, s.dark.accent] }))
  }
}

/**
 * The Petdex cases: each theme's package, drawn from one untouched atlas. The
 * native action is read beside the semantic animation, so a mapping that
 * drifts from the official rows fails here; the atlas URL is collected across
 * every reading, because one package is one image whatever it plays.
 */
function petdexChecks(r, label, { brand, id }) {
  const p = r.petdex || {}
  const home = p.home || null
  const geometry = p.geometry || null
  check(`${label}: the theme's own package is on the page, drawn by Petdex`,
    p.brand === brand && !!home && home.petId === id && home.ready === true,
    JSON.stringify({ brand: p.brand, home }))
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
    petdexChecks(r, 'the Claude Petdex pet', { brand: 'claude', id: 'crab-buddy' })
    commonChecks(r)
  },
  'petdex-deepseek'(r) {
    basicChecks(r)
    petdexChecks(r, 'the DeepSeek Petdex pet', { brand: 'deepseek', id: 'whaledou' })
    commonChecks(r)
  },
  'crab-states'(r) {
    basicChecks(r)
    const s = r.states || {}
    check('the crab case runs under the Claude brand, with the crab out',
      s.brand === 'claude' && s.crab === true, JSON.stringify({ brand: s.brand, crab: s.crab }))
    paletteChecks(r, 'Claude')
    stateChecks(r, 'the crab')
    commonChecks(r)
  },
  // The DeepSeek brand's whale: the same walk as the crab's, with its own
  // palettes and its own art.
  deepy(r) {
    basicChecks(r)
    const s = r.states || {}
    check('the brand stored as "off" reads as DeepSeek, and the crab gives way to the whale',
      s.brand === 'deepseek' && s.crab === false, JSON.stringify({ brand: s.brand, crab: s.crab }))
    paletteChecks(r, 'DeepSeek', { accent: true })
    stateChecks(r, 'the whale')
    commonChecks(r)
  },
}
