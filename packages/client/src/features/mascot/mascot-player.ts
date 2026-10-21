import { COMPOSER_STACK, conversationSessionId, findComposerCard, findComposerSeat, findConversationSession, findHeroRoot } from '@dsh-deepcraft/engine/host'
import { motionReduced } from '../../core/prefs'
import { createMascotSignals } from './mascot-signals'
import type { PetdexState } from '@dsh-deepcraft/contracts/pets'
import type { MascotMoment } from './mascot-signals'
import { decideStage, finishStage, freshStage, nextDecisionAt, switchSettles, takeMoment } from './mascot-stage'
import type { MascotPick, PlayMode } from './mascot-stage'
import { buildElement, createStamp, setAttributeIfChanged } from '@dsh-deepcraft/engine/dom'
import type { HostContext } from '@dsh-deepcraft/engine/host'
import type { FeatureUi } from '../../core/feature'
import type manifest from './mascot.manifest'

/** One animation's sheet: its frame count, its crop box `[x, y, width, height]` in atlas pixels, and its still frame. */
export interface MascotSheet {
  frames: number
  box: number[]
  still: number
  /** The atlas row the frames start on, when frames flow by a row of their own (a Petdex action). */
  row?: number
  /** Rows the whole atlas carries; an original character's strip is its own frames alone. */
  atlasRows?: number
  /** Per-frame durations; absent on the original characters, which use one frame time. */
  frameDurationsMs?: readonly number[]
  /** The native action this animation plays, as the Petdex packages name it. */
  nativeState?: PetdexState
}

/** A character's sheet pipeline: whether a sheet plays, whether it never will, how it is painted. */
export interface MascotSheets {
  ready(key: string): boolean
  failed(key: string): boolean
  paint(style: CSSStyleDeclaration, key: string): void
  dispose(): void
}

/**
 * The characters the player plays. A union of literals: the anchor mark is
 * built from the name, and the build reads the marks the stylesheets key on
 * off this type (scripts/source-tree.mjs).
 */
export type MascotName = 'crab' | 'deepy' | 'petdex'

/** What one character hands the player (see createMascotPlayer). */
export interface MascotCharacter {
  name: MascotName
  sheets: Record<string, MascotSheet>
  /** One frame's time for a table without per-frame durations. */
  frameMs?: number
  /** The transparent margin each atlas cell carries, in atlas pixels. */
  gutter?: number
  /** CSS pixels per atlas pixel; absent means the original characters' 2×. */
  scale?: number
  /** The installed package this character draws, when it is a Petdex pet. */
  petId?: string
  extras: string[]
  createSheets(onReady: () => void): MascotSheets
}

/**
 * One mascot on the composer — the crab or Deepy — played from its sheets
 * by the state the agent is in (packages/client/src/features/mascot/mascot-signals.ts).
 *
 * It stands on the composer card, or on the approval panel that takes the
 * card's place: that panel is the composer chain's fallback wrapper, whose
 * class-name fragment is the placement contract. The chat target is
 * subscribed while a session is followed, because an unsubscribed read
 * answers nothing in the trajectory view; one-off moments come from the
 * session's event stream. Priority and the clock rules are mascot-stage.ts's.
 *
 * Frames are a WAAPI `steps()` translation of the sheet strip, so playing
 * needs no timer and no DOM mutation and never wakes a pass; the old sheet
 * keeps playing until the new one is ready, so a switch never blinks. A host
 * placement slot or activity service retires the host reads here.
 *
 * @param ui - shared handle table (`ui.composer`).
 * @param character - `{ name, sheets, frameMs, gutter, extras, createSheets }`:
 *     `name` prefixes the class names, the custom properties and the anchor
 *     mark (`dsh-deepcraft-<name>`); `sheets` is the animation table
 *     (`{ frames, box, still }` per key, every key the signals, moments,
 *     sleep, extras and reactions name); `gutter` the transparent margin
 *     each frame cell carries in the character's sheets, in logical pixels
 *     (absent when they carry none); `extras` the idle extras;
 *     `createSheets(onReady)` returns `{ ready, failed, paint, dispose }`.
 * @returns `{ sync, release, onActivity, dispose }`.
 */
export function createMascotPlayer(ctx: HostContext, ui: FeatureUi<typeof manifest>, character: MascotCharacter) {
  /** Clicks this close in a row are one tickle when four of them land. */
  const TICKLE_GAP_MS = 450
  const TICKLE_CLICKS = 4
  /** How far a press travels before it lifts the mascot. */
  const LIFT_PX = 4
  const PREFIX = `dsh-deepcraft-${character.name}` as const
  /** The transparent margin each frame cell carries in this character's sheets (DEEPY_GUTTER), in logical pixels. */
  const GUTTER = character.gutter ?? 0
  /** A marker on the host element the mascot stands on, which makes it the mascot's containing block. */
  const ANCHOR_ATTR = `data-${PREFIX}-anchor` as const
  /** The stamp carrying the anchor mark across re-renders. */
  const anchorStamp = createStamp(ANCHOR_ATTR)
  const SHEETS = character.sheets
  const FRAME_MS = character.frameMs
  /** CSS pixels per atlas pixel: the original characters draw at 2×, a Petdex atlas to the composer's own size. */
  const UNIT = character.scale ?? 2

  /** The nodes the mascot is drawn with, built once per generation. */
  let root: HTMLElement | null = null
  let sprite: HTMLElement | null = null
  let strip: HTMLElement | null = null
  /** The signal reader, created when the mascot first stands somewhere. */
  let signals: ReturnType<typeof createMascotSignals> | null = null

  /**
   * Everything the mascot is doing on the page it stands on: the session it
   * follows, the moment on screen and the one waiting its turn, the
   * reaction, the idle extra, the sleep and wake flags, the quiet spell,
   * the animation playing and the reader's own press or click run
   * (mascot-stage.ts decides on it).
   */
  let stage = freshStage(Date.now())

  /** What the stage's decisions read off the page: an idle extra starts only in motion, on a visible page. */
  const surroundings = () => ({ extras: character.extras, extrasAllowed: !motionReduced() && !document.hidden, random: Math.random })

  /** How long one round of an animation lasts: per-frame durations when the sheet carries them. */
  function playMs(key: string) {
    const sheet = SHEETS[key]
    if (sheet.frameDurationsMs !== undefined) return sheet.frameDurationsMs.reduce((sum, ms) => sum + ms, 0)
    if (FRAME_MS === undefined) throw new Error(`${PREFIX}: "${key}" carries neither frame durations nor a frame time`)
    return sheet.frames * FRAME_MS
  }

  /** The character's sheet pipeline. */
  const sheets = character.createSheets(onSheetReady)

  /** A sheet became playable: read the state again and play what it asks for. */
  function onSheetReady() {
    if (root !== null) step()
  }

  /** @returns the new root; the sprite and the strip are set beside it. */
  function build() {
    const built = buildElement('span', PREFIX)
    built.setAttribute('aria-hidden', 'true')
    sprite = buildElement('span', `${PREFIX}-sprite`)
    strip = buildElement('span', `${PREFIX}-strip`)
    sprite.appendChild(strip)
    built.appendChild(sprite)
    const hit = buildElement('span', `${PREFIX}-hit`)
    hit.addEventListener('pointerdown', onPressStart)
    hit.addEventListener('pointermove', onPressMove)
    hit.addEventListener('pointerup', onPressEnd)
    hit.addEventListener('pointercancel', onPressCancel)
    // The card a mascot stands on can be a button of its own (the home
    // page's "choose a workspace" card): a click on the mascot stays here.
    hit.addEventListener('click', event => { event.stopPropagation() })
    built.appendChild(hit)
    return built
  }

  /**
   * Where the mascot stands on the page shown: the home page's card, or
   * the main conversation's input area (its composer stack, or the panel
   * that takes the card's place) when the conversation is in scope. Null
   * when neither is on screen.
   */
  function findStand(conversation: boolean): { element: Element, session: string | null, place: string } | null {
    // The composer pass answers with the card it read; with that feature off
    // the page (its scope preference) the hero root and the page's first card
    // are the same answer.
    const heroCard = ui.composer
      ? ui.composer.heroCard()
      : findHeroRoot() === null ? null : findComposerCard()
    if (heroCard !== null) return { element: heroCard, session: null, place: 'card' }
    if (!conversation) return null
    if (ui.composer !== undefined && ui.composer.isChatHidden()) return null
    const content = findConversationSession()
    const seat = content === null ? null : findComposerSeat(content)
    if (seat === null) return null
    const session = conversationSessionId(content)
    // The composer chain's own wrapper (ui-renderer): the host hides it
    // inline when a panel is elected, and mounts that panel right after it.
    const fallback = seat.querySelector<HTMLElement>('[data-chain-overlay-fallback="conversation.composer"]')
    if (fallback !== null && fallback.style.display === 'none') {
      const panel = fallback.nextElementSibling
      return panel === null ? null : { element: panel, session, place: 'panel' }
    }
    const stack = seat.querySelector(COMPOSER_STACK)
    return stack === null ? null : { element: stack, session, place: 'stack' }
  }

  /**
   * Each pass: stand where the page puts the mascot, follow that page's
   * session, read its state.
   * @param conversation - whether the conversation page is in scope.
   */
  function sync(conversation: boolean) {
    const stand = findStand(conversation)
    if (stand === null) {
      release()
      return
    }
    if (root === null) root = build()
    if (signals === null) {
      stage.quietSince = Date.now()
      signals = createMascotSignals(ctx, onMoment, refresh)
    }
    if (root.parentNode !== stand.element) stand.element.appendChild(root)
    anchorStamp.mark(stand.element, stand.place)
    if (stand.session !== stage.sessionId) {
      stage.sessionId = stand.session
      // A moment belongs to the page it happened on.
      stage.moment = null
      stage.queued = null
    }
    signals.follow(stage.sessionId)
    refresh()
  }

  /** Read the state again and play what it asks for. */
  function refresh() {
    if (signals === null) return
    stage.level = signals.read(stage.sessionId)
    step()
  }

  /** A moment happened: it takes the stage, or waits behind a greater one (takeMoment). */
  function onMoment(name: MascotMoment) {
    if (takeMoment(stage, name, Date.now())) step()
  }

  /** A once animation reached its last frame: whoever asked for it lets go. */
  function finish(key: string, now: number) {
    finishStage(stage, key, now, Math.random)
  }

  /** Whether the animation choice holds what is on screen now still. */
  function still() {
    return motionReduced() && stage.reaction === null
  }

  /** One frame cell of a sheet: the crop box plus the transparent margin around it. */
  function cellSize(sheet: MascotSheet) {
    return [sheet.box[2] + GUTTER * 2, sheet.box[3] + GUTTER * 2]
  }

  /** One frame's time, from the sheet's own durations or the character's uniform frame time. */
  function frameDuration(key: string, sheet: MascotSheet, frame: number) {
    if (sheet.frameDurationsMs !== undefined) return sheet.frameDurationsMs[frame]
    if (FRAME_MS === undefined) throw new Error(`${PREFIX}: "${key}" carries neither frame durations nor a frame time`)
    return FRAME_MS
  }

  /** The strip translation that puts one frame of a sheet in the window. */
  function frameOffset(sheet: MascotSheet, frame: number) {
    const [cellWidth, cellHeight] = cellSize(sheet)
    return `translate(${-((frame % 8) * cellWidth + GUTTER) * UNIT}px, ${-(((sheet.row ?? 0) + Math.floor(frame / 8)) * cellHeight + GUTTER) * UNIT}px)`
  }

  /**
   * Put an animation on the strip: a WAAPI animation whose keyframes hold
   * each frame for the character's frame time (steps(1) jumps at the
   * slot's end), so a loop runs entirely on the browser's animation engine
   * with no tick of the mascot's own; or the state's still frame, pinned
   * while the motion choice says so. A once animation's end is reported by
   * its `finished`; the deadline schedule() arms is the backstop for a
   * throttled tab.
   */
  function play(strip: HTMLElement, key: string, mode: PlayMode) {
    if (stage.animation !== null) {
      stage.animation.cancel()
      stage.animation = null
    }
    const sheet = SHEETS[key]
    if (still()) {
      strip.style.transform = frameOffset(sheet, sheet.still)
      return
    }
    strip.style.transform = ''
    const keyframes: Keyframe[] = []
    const total = playMs(key)
    let at = 0
    for (let frame = 0; frame < sheet.frames; frame++) {
      keyframes.push({ offset: at / total, transform: frameOffset(sheet, frame), easing: 'steps(1)' })
      at += frameDuration(key, sheet, frame)
    }
    keyframes.push({ offset: 1, transform: frameOffset(sheet, mode === 'loop' ? 0 : sheet.frames - 1) })
    const playing = strip.animate(keyframes, {
      duration: total,
      iterations: mode === 'loop' ? Infinity : 1,
      fill: 'forwards',
    })
    stage.animation = playing
    if (mode !== 'once') return
    playing.finished.then(() => {
      if (stage.animation !== playing || stage.current === null || stage.current.key !== key || stage.current.done === true) return
      stage.current.done = true
      finish(key, Date.now())
      step()
    }, () => {
      // finished rejects on cancel(): a newer animation took the strip.
    })
  }

  /**
   * Advance the mascot: settle what is on screen, then arm the one timer
   * at the next moment a time-based decision can flip. Runs on state
   * reads, sheet arrivals, reactions, the reader's hand and that timer —
   * playing itself needs no tick (play()).
   */
  function step() {
    if (root === null || strip === null || stage.level === null) return
    const now = Date.now()
    if (stage.current !== null && stage.current.mode === 'once' && stage.current.done !== true && now - stage.current.start >= playMs(stage.current.key)) {
      stage.current.done = true
      finish(stage.current.key, now)
    }
    const next = decideStage(stage, now, stage.level, surroundings())
    const switching = stage.current === null || next.key !== stage.current.key || (stage.reaction !== null && stage.reaction.fresh)
    const settled = switchSettles(stage, next, now)
    if (switching && settled) {
      if (sheets.ready(next.key)) show(root, strip, next, now)
      // A once animation whose sheet never came counts as played, so the
      // mascot does not wait on it for good.
      else if (next.mode === 'once' && sheets.failed(next.key)) {
        if (stage.reaction !== null) stage.reaction.fresh = false
        finish(next.key, now)
      }
    } else if (!switching && stage.current !== null) {
      // The motion choice flipped under the animation on stage: pin its
      // still frame, or set it playing again from where it stands.
      if (still() && stage.animation !== null) {
        stage.animation.cancel()
        stage.animation = null
        strip.style.transform = frameOffset(SHEETS[stage.current.key], SHEETS[stage.current.key].still)
      } else if (!still() && stage.animation === null) {
        play(strip, stage.current.key, stage.current.mode)
        // play() put the new animation on the stage.
        const playing = stage.animation as Animation | null
        if (playing !== null && stage.current.mode === 'loop') {
          playing.currentTime = (now - stage.current.start) % playMs(stage.current.key)
        }
      }
    }
    schedule(now, switching && !settled)
  }

  function show(root: HTMLElement, strip: HTMLElement, next: MascotPick, now: number) {
    const sheet = SHEETS[next.key]
    const [cellWidth, cellHeight] = cellSize(sheet)
    stage.current = { key: next.key, mode: next.mode, priority: next.priority, start: now }
    if (stage.reaction !== null && stage.reaction.key === next.key) stage.reaction.fresh = false
    const style = root.style
    sheets.paint(style, next.key)
    style.setProperty(`--${PREFIX}-x`, String(sheet.box[0]))
    style.setProperty(`--${PREFIX}-y`, String(sheet.box[1]))
    style.setProperty(`--${PREFIX}-w`, String(sheet.box[2]))
    // The sprite's height is the one custom property both characters share:
    // crab.css reads it in the merged sprite rule.
    style.setProperty('--dsh-deepcraft-mascot-h', String(sheet.box[3]))
    style.setProperty(`--${PREFIX}-cell-w`, String(cellWidth))
    style.setProperty(`--${PREFIX}-cell-h`, String(cellHeight))
    style.setProperty(`--${PREFIX}-unit`, String(UNIT))
    style.setProperty(`--${PREFIX}-sheet-w`, String(cellWidth * 8))
    style.setProperty(`--${PREFIX}-sheet-h`, String(cellHeight * (sheet.atlasRows ?? Math.ceil(sheet.frames / 8))))
    style.setProperty(`--${PREFIX}-strip-h`, String(cellHeight * Math.ceil(sheet.frames / 8)))
    setAttributeIfChanged(root, 'data-animation', next.key)
    if (character.petId !== undefined) setAttributeIfChanged(root, 'data-dsh-deepcraft-pet-id', character.petId)
    if (sheet.nativeState !== undefined) setAttributeIfChanged(root, 'data-dsh-deepcraft-pet-action', sheet.nativeState)
    play(strip, next.key, next.mode)
    if (!root.hasAttribute('data-ready')) root.setAttribute('data-ready', '')
  }

  /**
   * The one timer, armed at the next moment a time-based decision can flip
   * (nextDecisionAt). Everything else arrives as an event.
   */
  function schedule(now: number, waitSettle: boolean) {
    if (stage.timer !== null) clearTimeout(stage.timer)
    stage.timer = null
    const at = nextDecisionAt(stage, now, waitSettle, playMs)
    if (at === Infinity) return
    stage.timer = setTimeout(() => {
      stage.timer = null
      step()
    }, Math.max(at - now, 0))
  }

  /**
   * The reader's hand on the mascot. A reaction always starts from its
   * first frame (`fresh` until it is shown, even over the same reaction
   * still on screen); until its sheet is ready, what is on screen keeps
   * playing.
   */
  function react(key: string, mode: PlayMode) {
    stage.reaction = { key, mode, fresh: true }
    step()
  }

  function onPressStart(event: PointerEvent) {
    if (event.button !== 0) return
    stage.press = { id: event.pointerId, x: event.clientX, y: event.clientY, lifted: false }
    ;(event.currentTarget as Element).setPointerCapture(event.pointerId)
  }

  function onPressMove(event: PointerEvent) {
    if (stage.press === null || stage.press.lifted || event.pointerId !== stage.press.id) return
    if (Math.hypot(event.clientX - stage.press.x, event.clientY - stage.press.y) < LIFT_PX) return
    stage.press.lifted = true
    stage.clicks = []
    react('drag', 'loop')
  }

  /**
   * The tracked press is over — let go or cancelled: it is cleared, and a
   * lift ends with it. Returns whether it had lifted, or null when the event
   * is not the tracked press.
   */
  function endPress(event: PointerEvent): boolean | null {
    if (stage.press === null || event.pointerId !== stage.press.id) return null
    const lifted = stage.press.lifted
    stage.press = null
    if (lifted) {
      stage.reaction = null
      step()
    }
    return lifted
  }

  /** A press let go without a lift pokes the side it landed on — or tickles, the fourth in a row. */
  function onPressEnd(event: PointerEvent) {
    if (endPress(event) !== false) return
    const now = Date.now()
    if (stage.clicks.length > 0 && now - stage.clicks[stage.clicks.length - 1] > TICKLE_GAP_MS) stage.clicks = []
    stage.clicks.push(now)
    if (stage.clicks.length >= TICKLE_CLICKS) {
      stage.clicks = []
      react('tickle', 'once')
      return
    }
    const box = (event.currentTarget as Element).getBoundingClientRect()
    react(event.clientX - box.left < box.width / 2 ? 'poke-left' : 'poke-right', 'once')
  }

  /** A cancelled press never pokes; endPress has already ended a lift. */
  function onPressCancel(event: PointerEvent) {
    endPress(event)
  }

  /**
   * The reader is at the page: a sleeping mascot wakes up, startled unless
   * stillness was asked for. The hook fires once at the wake (a quiet
   * reader's pointer sweep only rewrites quietSince), so the scheduler's
   * pointer and key paths stay cheap.
   */
  function onActivity() {
    stage.quietSince = Date.now()
    if (!stage.asleep) return
    stage.asleep = false
    stage.waking = !motionReduced()
    step()
  }

  /** The page shows no stand: the mascot leaves it, and its reading stops. */
  function release() {
    if (stage.timer !== null) clearTimeout(stage.timer)
    if (stage.animation !== null) stage.animation.cancel()
    if (root !== null && root.parentNode !== null) root.parentNode.removeChild(root)
    anchorStamp.release()
    if (signals !== null) signals.dispose()
    signals = null
    // One replacement for every field the page owned.
    stage = freshStage(Date.now())
  }

  function dispose() {
    release()
    sheets.dispose()
    root = null
    sprite = null
    strip = null
  }

  return { sync, release, onActivity, dispose }
}
