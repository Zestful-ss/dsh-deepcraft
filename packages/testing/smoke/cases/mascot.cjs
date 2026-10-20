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

module.exports = {
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
