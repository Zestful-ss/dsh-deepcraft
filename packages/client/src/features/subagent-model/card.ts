import { SUBAGENT_ROUTES_MAX, subagentRouteKey } from '@dsh-deepcraft/contracts/subagent'
import { buildElement } from '@dsh-deepcraft/engine/dom'
import { POPOVER_CHECK_SVG, buildPopoverItem } from '../../shared/popover'
import { copy } from './copy'
import { effortIsStale, orderedEffortIds, routeLadder, routeNames, selectionLabel } from './state'
import type { RouteLadder } from './state'
import type { SubagentModelRoute, SubagentModelsReason, SubagentRouteEfforts } from '@dsh-deepcraft/contracts/subagent'
import type { HostModelCatalogSnapshot } from '@dsh-deepcraft/contracts/services'
import type { CopyKey } from './copy'

/** Everything the card draws, and nothing it decides. */
export interface SeatView {
  /** The routes the session's official policy allows. */
  allowed: SubagentModelRoute[]
  /** The routes the reader picked. */
  selected: SubagentModelRoute[]
  /** The session's catalog, for the rows' own names. */
  catalog: HostModelCatalogSnapshot | null
  /** Why the entry cannot act, when the host says so. */
  reason?: SubagentModelsReason
  /** Each allowed route's ladder resolved host-side; the fallback where the catalog cannot say. */
  efforts?: SubagentRouteEfforts[]
  /** A write is in flight. */
  saving: boolean
  /** The last write failed; the saved selection still applies. */
  failed: boolean
  /** The last press was refused because the list is full. */
  full: boolean
}

/** The three decisions the card sends. */
export interface SeatHandlers {
  toggle(route: SubagentModelRoute): void
  /** Set or clear (undefined) one picked route's reasoning effort. */
  effort?(route: SubagentModelRoute, effort: string | undefined): void
  clear(): void
}

/** The sentence one unavailable reason carries. */
export const REASON_COPY: Record<SubagentModelsReason, CopyKey> = {
  'no-policy': 'reasonNoPolicy',
  'no-session': 'reasonNoSession',
  'store-unavailable': 'reasonStore',
  'stale-selection': 'reasonStale',
}

/**
 * The reasons that stop the entry from acting at all: the host found no list to
 * offer, no session to read it for, or no store to keep a pick in.
 *
 * A pick the policy no longer allows is NOT one of them: the reader has to fix
 * it, so the rows and the clear row stay usable while the note says what is
 * wrong (`stale-selection`).
 */
const BLOCKING: readonly SubagentModelsReason[] = ['no-policy', 'no-session', 'store-unavailable']

/** Whether the entry can name and change a pick right now. */
export function seatActs(view: SeatView) {
  return view.allowed.length > 0 && (view.reason === undefined || !BLOCKING.includes(view.reason))
}

/**
 * Whether the entry belongs on the page at all.
 *
 * Until the host answers there is nothing to draw, and a session whose
 * composition recorded no allowed list has nothing to choose: the composer's row
 * is the scarcest space in the interface, and the official switch being off is a
 * fact about that profile, said once by the settings row, not a control worth
 * its width in every session (`narrow` in the end-to-end lane holds the row's
 * other controls at 330px). A store that failed is different — that is a fault
 * the reader can only learn here, so it shows.
 */
export function seatShown(view: SeatView & { loading: boolean }): boolean {
  if (view.loading) return false
  return view.reason !== 'no-policy' && view.reason !== 'no-session'
}

/** The trigger's accessible name, which carries the state the label alone leaves out. */
export function triggerTitle(view: SeatView): string {
  if (!seatActs(view)) {
    return copy('triggerLabelUnavailable', { reason: copy(REASON_COPY[view.reason ?? 'no-policy']) })
  }
  const label = selectionLabel(view.selected, view.catalog)
  if (label.kind === 'one') return copy('triggerLabelOne', { model: label.name })
  if (label.kind === 'many') return copy('triggerLabelMany', { count: label.count })
  return copy('triggerLabelNone')
}

/**
 * One effort level's option: a real button so the keys reach it, the shared
 * check slot marking the level in force. A press is this option's own — it must
 * not reach the row's toggle, and a button cannot sit inside one anyway.
 */
function buildEffortOption(
  route: SubagentModelRoute,
  label: string,
  effort: string | undefined,
  current: string | undefined,
  handlers: SeatHandlers,
  saving: boolean,
): HTMLButtonElement {
  const option = buildElement('button', 'dsh-deepcraft-subagent-model-effort-option')
  option.type = 'button'
  const check = buildElement('span', 'dsh-deepcraft-popover-check')
  check.innerHTML = current === effort ? POPOVER_CHECK_SVG : ''
  option.appendChild(check)
  option.appendChild(buildElement('span', 'dsh-deepcraft-subagent-model-effort-text', label))
  option.disabled = saving
  option.addEventListener('click', (event) => {
    event.stopPropagation()
    if (saving) return
    handlers.effort?.(route, effort)
  })
  return option
}

/**
 * The effort options under one picked row: the model's own name for each level,
 * or the copy's name for the unspecified and the states a ladder cannot fill.
 * A stored id the ladder no longer declares still shows, marked stale, so the
 * reader sees what is in force and can clear it back to unspecified.
 */
function buildEffortList(
  view: SeatView,
  route: SubagentModelRoute,
  stored: string | undefined,
  ladder: RouteLadder,
  handlers: SeatHandlers,
): HTMLElement {
  const list = buildElement('div', 'dsh-deepcraft-subagent-model-effort')
  list.appendChild(buildElement('span', 'dsh-deepcraft-subagent-model-effort-label', copy('effortTitle')))
  if (ladder.state === 'ok') {
    const names = new Map(ladder.efforts.map((level) => [level.id, level.name || level.id]))
    for (const id of orderedEffortIds(ladder)) {
      const label = id === undefined ? copy('effortUnspecified') : names.get(id) ?? id
      list.appendChild(buildEffortOption(route, label, id, stored, handlers, view.saving))
    }
  } else {
    list.appendChild(buildEffortOption(route, copy('effortUnspecified'), undefined, stored, handlers, view.saving))
    list.appendChild(buildElement(
      'div',
      'dsh-deepcraft-subagent-model-effort-note',
      ladder.state === 'no-efforts' ? copy('effortNone') : copy('effortUnknown'),
    ))
  }
  if (effortIsStale(ladder, stored)) {
    const stale = buildEffortOption(route, stored as string, stored, stored, handlers, view.saving)
    stale.classList.add('dsh-deepcraft-subagent-model-effort-stale')
    list.appendChild(stale)
    list.appendChild(buildElement('div', 'dsh-deepcraft-subagent-model-effort-note', copy('effortStale')))
  }
  return list
}

/**
 * One entry in the route list: the model row, and — only while the route is
 * picked — its effort sub-list as a sibling, since a button cannot nest in the
 * row's own button.
 */
function buildRouteEntry(view: SeatView, route: SubagentModelRoute, handlers: SeatHandlers): HTMLElement {
  const wrap = buildElement('div', 'dsh-deepcraft-subagent-model-entry')
  wrap.appendChild(buildRouteRow(view, route, handlers))
  const pickedRoute = view.selected.find((candidate) => subagentRouteKey(candidate) === subagentRouteKey(route))
  if (pickedRoute !== undefined) {
    wrap.appendChild(buildEffortList(view, route, pickedRoute.reasoningEffort, routeLadder(route, view.catalog, view.efforts), handlers))
  }
  return wrap
}

/** One model row: its name, the provider under it, and a check while it is picked. */
function buildRouteRow(view: SeatView, route: SubagentModelRoute, handlers: SeatHandlers) {
  const picked = view.selected.some((candidate) => subagentRouteKey(candidate) === subagentRouteKey(route))
  const names = routeNames(route, view.catalog)
  const built = buildPopoverItem({
    className: 'dsh-deepcraft-subagent-model-option',
    role: 'menuitemcheckbox',
    lines: 2,
    check: true,
  })
  const row = built.row
  row.setAttribute('aria-checked', picked ? 'true' : 'false')
  if (built.text !== null) built.text.textContent = names.model
  if (built.desc !== null) built.desc.textContent = names.provider
  if (built.check !== null) built.check.innerHTML = picked ? POPOVER_CHECK_SVG : ''
  row.disabled = view.saving
  row.addEventListener('click', () => {
    if (view.saving) return
    handlers.toggle(route)
  })
  return row
}

/**
 * The card's content: the heading with the rule, the note when the entry cannot
 * act or the last write failed, one row per allowed route, and the clear row.
 *
 * The rules the entry obeys are said here rather than in the settings page: a
 * reader looking at the list is deciding one session's delegation, and the two
 * modes (one route, several) read differently in words.
 *
 * @param view - what to draw.
 * @param handlers - the card's decisions.
 */
export function buildCardContent(view: SeatView, handlers: SeatHandlers): HTMLElement {
  const content = buildElement('div', 'dsh-deepcraft-popover-body dsh-deepcraft-subagent-model-content')
  const head = buildElement('div', 'dsh-deepcraft-subagent-model-head')
  head.appendChild(buildElement('span', 'dsh-deepcraft-subagent-model-title', copy('title')))
  const hint = !seatActs(view) ? '' : view.selected.length === 1 ? copy('hintOne') : copy('hint')
  if (hint !== '') head.appendChild(buildElement('span', 'dsh-deepcraft-subagent-model-hint', hint))
  content.appendChild(head)

  const note = view.reason === undefined
    ? view.failed
      ? copy('saveFailed')
      : view.full
        ? copy('full', { max: SUBAGENT_ROUTES_MAX })
        : ''
    : copy(REASON_COPY[view.reason])
  if (note !== '') content.appendChild(buildElement('div', 'dsh-deepcraft-subagent-model-note', note))

  if (seatActs(view)) {
    const list = buildElement('div', 'dsh-deepcraft-subagent-model-list')
    for (const route of view.allowed) list.appendChild(buildRouteEntry(view, route, handlers))
    content.appendChild(list)
  }

  if (view.selected.length > 0) {
    const clear = buildPopoverItem({ className: 'dsh-deepcraft-subagent-model-clear', lines: 2 })
    if (clear.text !== null) clear.text.textContent = copy('clear')
    if (clear.desc !== null) clear.desc.textContent = copy('clearDesc')
    clear.row.disabled = view.saving || !seatActs(view)
    clear.row.addEventListener('click', () => {
      if (view.saving) return
      handlers.clear()
    })
    content.appendChild(clear.row)
  }

  if (view.saving) content.appendChild(buildElement('div', 'dsh-deepcraft-subagent-model-note', copy('saving')))
  return content
}
