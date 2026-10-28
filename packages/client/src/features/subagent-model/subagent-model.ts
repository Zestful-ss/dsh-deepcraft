/**
 * The composer's subagent model entry.
 *
 * A session's official composition records which routes an agent may delegate
 * on; this entry is where the reader picks one or several of them, and the host
 * half's rule then holds the calling model to that pick (subagent-choice.ts).
 * It stands in the host's own `conversation.input.right` seat, beside the model
 * seat, and speaks only to the plugin's own route: the allowed list, the saved
 * selection and every write come from the host, so the page never guesses what
 * the session's policy holds.
 *
 * The trigger is a slotted component because the seat is the host's; the card is
 * the skin's usual body-mounted popover, so a composer that clips its overflow
 * cannot cut it off.
 */
import * as React from 'react'
import { SUBAGENT_MODELS_ROUTE } from '../../constants'
import { buildElement, setAttributeIfChanged } from '@dsh-deepcraft/engine/dom'
import { currentSessionId, hostSessions, registerSlotEntry, sessionModelCatalog, sessionModelDirectory } from '@dsh-deepcraft/engine/host'
import { closeOtherPopovers, positionAnchoredPopover, registerPopover, setMenuPopoverOpen, unregisterPopover } from '../../shared/popover'
import { readSubagentRoutes } from '@dsh-deepcraft/contracts/subagent'
import { buildCardContent, seatActs, seatShown, triggerTitle } from './card'
import { toggleRoute } from './state'
import type { HostContext } from '@dsh-deepcraft/engine/host'
import type { SubagentModelRoute, SubagentModelsAnswer, SubagentModelsReason } from '@dsh-deepcraft/contracts/subagent'
import type { SeatHandlers, SeatView } from './card'
import type manifest from './subagent-model.manifest'

/** The host's session-scoped seat this entry fills, immediately before the model seat. */
const SEAT_SLOT = 'conversation.input.right'
/** The entry's id inside that seat. */
const SEAT_ID = 'deepcraft-subagent-model'
/** The popover's own name in the shared registry, so two skin cards never share the screen. */
const POPOVER_NAME = 'subagent-model'
/** Gap between the trigger and the card. */
const CARD_GAP = 6

/** What the entry holds right now, after every read and write. */
interface SeatState extends SeatView {
  loading: boolean
}

/** The state before the first answer. */
const EMPTY: SeatState = {
  allowed: [],
  selected: [],
  catalog: null,
  loading: true,
  saving: false,
  failed: false,
  full: false,
}

/** The host's own answer read as routes: anything else is not an answer this page may act on. */
function routesOf(value: unknown): SubagentModelRoute[] {
  return readSubagentRoutes(value) ?? []
}

/** The reason a host answer carries, when it names one this page knows. */
function reasonOf(value: unknown): SubagentModelsReason | undefined {
  const allowed: SubagentModelsReason[] = ['no-policy', 'no-session', 'store-unavailable', 'stale-selection']
  return allowed.find((reason) => reason === value)
}

export function install(ctx: HostContext) {
  let state: SeatState = EMPTY
  /** The session whose answer is loaded, so a switch starts a new read. */
  let loadedSession: string | null = null
  /** The trigger the host rendered, kept for the card's anchor and its open state. */
  let trigger: HTMLElement | null = null
  let card: HTMLElement | null = null
  let open = false
  /** A write or read in flight, so two answers never land out of order. */
  let generation = 0
  const listeners = new Set<() => void>()

  /** Tell the slot's component to redraw; the card, when up, redraws with it. */
  function refresh() {
    for (const listener of listeners) listener()
    if (open) paintCard()
  }

  function subscribe(listener: () => void) {
    listeners.add(listener)
    return () => { listeners.delete(listener) }
  }

  /**
   * The session the shell shows, or null before one exists.
   *
   * A list that cannot be read leaves the entry in its unavailable state rather
   * than retiring the feature: this control is one seat in the composer, and the
   * rest of the skin is no worse for it (D12 — the catch isolates this reader).
   */
  function sessionId(): string | null {
    const sessions = hostSessions(ctx)
    if (sessions === null) return null
    try {
      return currentSessionId(ctx, sessions) ?? null
    } catch {
      return null
    }
  }

  /** The view the card and the trigger draw: the state, plus the catalog the names come from. */
  function view(): SeatState {
    const id = loadedSession ?? sessionId()
    return id === null ? state : { ...state, catalog: sessionModelCatalog(ctx, id) }
  }

  /** Read one session's allowed routes and saved selection. */
  async function load(id: string) {
    const mine = ++generation
    loadedSession = id
    state = { ...EMPTY }
    refresh()
    let answer: SubagentModelsAnswer | null = null
    try {
      const response = await fetch(`${SUBAGENT_MODELS_ROUTE}?session=${encodeURIComponent(id)}`, {
        credentials: 'same-origin',
        headers: { accept: 'application/json' },
      })
      const body: unknown = await response.json()
      if (body !== null && typeof body === 'object') answer = body as SubagentModelsAnswer
    } catch {
      // The route itself could not be reached: the entry says so and stays inert
      // rather than showing a selection that may not be the one in force.
      answer = null
    }
    if (mine !== generation) return
    state = answer === null
      ? { ...EMPTY, loading: false, reason: 'store-unavailable' }
      : {
          allowed: routesOf(answer.allowed),
          selected: routesOf(answer.selected),
          catalog: null,
          reason: reasonOf(answer.reason),
          loading: false,
          saving: false,
          failed: false,
          full: false,
        }
    refresh()
  }

  /** Start a read for whichever session is shown now, when it is not the one already loaded. */
  function sync() {
    const id = sessionId()
    if (id === loadedSession) return
    if (id === null) {
      loadedSession = null
      state = EMPTY
      refresh()
      return
    }
    void load(id)
    watchCatalog()
  }

  /** Write the selection, keeping the saved one on show when the write does not land. */
  async function save(routes: readonly SubagentModelRoute[]) {
    const id = loadedSession
    if (id === null || state.saving) return
    const mine = ++generation
    state = { ...state, saving: true, failed: false, full: false }
    refresh()
    try {
      const response = await fetch(SUBAGENT_MODELS_ROUTE, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { accept: 'application/json', 'content-type': 'application/json' },
        body: JSON.stringify({ session: id, routes }),
      })
      const body: unknown = await response.json()
      if (mine !== generation) return
      if (!response.ok || body === null || typeof body !== 'object' || (body as { ok?: unknown }).ok !== true) {
        state = { ...state, saving: false, failed: true }
        refresh()
        return
      }
      const answer = body as SubagentModelsAnswer
      state = {
        ...state,
        allowed: routesOf(answer.allowed),
        selected: routesOf(answer.selected),
        reason: reasonOf(answer.reason),
        saving: false,
        failed: false,
        full: false,
      }
    } catch {
      if (mine !== generation) return
      state = { ...state, saving: false, failed: true }
    }
    refresh()
  }

  const handlers: SeatHandlers = {
    toggle(route) {
      const next = toggleRoute(state.selected, route)
      if (next === null) {
        state = { ...state, full: true }
        refresh()
        return
      }
      void save(next)
    },
    clear() {
      if (state.selected.length === 0) return
      void save([])
    },
  }

  // ---------- the card ----------

  /** Build the card once; its content is replaced on every redraw. */
  function ensureCard(): HTMLElement {
    if (card !== null && card.parentElement !== null) return card
    card = buildElement('div', 'dsh-deepcraft-popover-card dsh-deepcraft-subagent-model-popover')
    setMenuPopoverOpen(card, false)
    document.body.appendChild(card)
    return card
  }

  function paintCard() {
    if (card === null) return
    card.replaceChildren(buildCardContent(view(), handlers))
    if (trigger !== null) positionAnchoredPopover(trigger, card, { side: 'above-left', gap: CARD_GAP })
  }

  function placeCard() {
    if (card === null) return
    if (trigger === null) return
    positionAnchoredPopover(trigger, card, { side: 'above-left', gap: CARD_GAP })
  }

  function closeCard() {
    if (!open) return
    open = false
    if (card !== null) setMenuPopoverOpen(card, false)
    if (trigger !== null) {
      setAttributeIfChanged(trigger, 'aria-expanded', 'false')
      setAttributeIfChanged(trigger, 'data-open', 'false')
    }
  }

  function openCard(anchor: HTMLElement) {
    trigger = anchor
    closeOtherPopovers(POPOVER_NAME)
    ensureCard()
    // Paint before the reveal: a card that opens empty and fills a frame later
    // reads as a flicker, and the first paint is also what positions it.
    paintCard()
    open = true
    setMenuPopoverOpen(card as HTMLElement, true, anchor)
    setAttributeIfChanged(anchor, 'aria-expanded', 'true')
    setAttributeIfChanged(anchor, 'data-open', 'true')
  }

  /** A press outside the card and its trigger closes it; Escape closes it from anywhere. */
  function onDocumentPress(event: Event) {
    if (!open) return
    const node = event.target as Node | null
    if (node !== null && (card?.contains(node) === true || trigger?.contains(node) === true)) return
    closeCard()
  }

  function onDocumentKey(event: KeyboardEvent) {
    if (!open || event.key !== 'Escape') return
    closeCard()
    trigger?.focus()
  }

  // ---------- the trigger ----------

  /**
   * The slotted component. It draws from the closure's state and redraws when
   * that state changes, so one trigger and one card always agree: the host
   * renders the button, the skin renders everything inside and behind it.
   */
  function Seat() {
    const [, bump] = React.useState(0)
    React.useEffect(() => {
      const stop = subscribe(() => { bump((version) => version + 1) })
      sync()
      return stop
    }, [])
    const drawn = view()
    if (!seatShown(drawn)) return null
    const usable = seatActs(drawn)
    return React.createElement('button', {
      type: 'button',
      id: SEAT_ID,
      className: 'dsh-deepcraft-subagent-model-btn',
      'data-dsh-subagent-model': usable ? (drawn.selected.length > 0 ? 'chosen' : 'empty') : 'unavailable',
      'aria-label': triggerTitle(drawn),
      'aria-haspopup': 'menu',
      'aria-expanded': open ? 'true' : 'false',
      title: triggerTitle(drawn),
      disabled: drawn.loading,
      onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
        const anchor = event.currentTarget
        if (open) closeCard()
        else openCard(anchor)
      },
    }, React.createElement('svg', {
      viewBox: '0 0 20 20', width: 16, height: 16, fill: 'none',
      stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round',
      'aria-hidden': true, focusable: false,
    },
    React.createElement('circle', { cx: 10, cy: 4, r: 2 }),
    React.createElement('path', { d: 'M10 6v3M5 12v-1a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1' }),
    React.createElement('circle', { cx: 5, cy: 14.5, r: 2.5 }),
    React.createElement('circle', { cx: 15, cy: 14.5, r: 2.5 })))
  }

  /** Register the trigger in the host's seat; the fiber is what takes it down again. */
  function registerSeat() {
    return registerSlotEntry(ctx, 'dsh-deepcraft: subagent model entry', SEAT_SLOT, {
      name: SEAT_SLOT,
      id: SEAT_ID,
      order: 10,
    }, Seat)
  }

  registerPopover(POPOVER_NAME, closeCard)
  document.addEventListener('pointerdown', onDocumentPress, true)
  document.addEventListener('keydown', onDocumentKey, true)

  // The session the shell shows decides which answer is on show, and a host
  // render can replace the slotted node without telling the closure.
  const sessions = hostSessions(ctx)
  // A session switch is what changes the answer, and `sync` reads it on every
  // notice: re-rendering the seat on each list event would put a React commit in
  // the composer's frame for no change at all.
  const stopSessions = typeof sessions?.list?.subscribe === 'function' ? sessions.list.subscribe(() => { sync() }) : null
  // The catalog arrives after the entry does: names for the rows and the
  // trigger come from it, so its store is worth hearing.
  let stopCatalog: (() => void) | null = null
  function watchCatalog() {
    const id = loadedSession
    if (stopCatalog !== null) {
      stopCatalog()
      stopCatalog = null
    }
    if (id === null) return
    const directory = sessionModelDirectory(ctx, id)
    if (typeof directory?.store?.subscribe === 'function') {
      // The names come from the catalog's snapshot: only a new one redraws.
      let shown = sessionModelCatalog(ctx, id)
      stopCatalog = directory.store.subscribe(() => {
        const next = sessionModelCatalog(ctx, id)
        if (next === shown) return
        shown = next
        refresh()
      })
    }
    if (typeof directory?.load === 'function') {
      // A failed catalog load is the host's own to report through the store;
      // this only keeps the rejection out of the pass.
      Promise.resolve(directory.load()).catch(() => {})
    }
  }

  const seatFiber = registerSeat()
  sync()
  watchCatalog()

  // The scheduler's own pass is where a host re-render lands; keep the card
  // anchored while the window moves under it.
  function onViewportChange() {
    if (open) placeCard()
  }
  window.addEventListener('resize', onViewportChange)

  return () => {
    // The seat's entry goes with this feature: a generation retired for another
    // plugin's page (D74) must not leave its control behind.
    if (seatFiber !== null && typeof seatFiber.dispose === 'function') seatFiber.dispose()
    document.removeEventListener('pointerdown', onDocumentPress, true)
    document.removeEventListener('keydown', onDocumentKey, true)
    window.removeEventListener('resize', onViewportChange)
    unregisterPopover(POPOVER_NAME)
    if (typeof stopSessions === 'function') stopSessions()
    if (stopCatalog !== null) stopCatalog()
    listeners.clear()
    closeCard()
    if (card !== null) card.remove()
    card = null
    trigger = null
  }
}
