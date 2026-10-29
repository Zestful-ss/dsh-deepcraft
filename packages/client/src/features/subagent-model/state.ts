import { SUBAGENT_ROUTES_MAX, subagentRouteKey } from '@dsh-deepcraft/contracts/subagent'
import { orderEffortIds } from '../effort/ladder'
import type { SubagentModelRoute, SubagentRouteEfforts } from '@dsh-deepcraft/contracts/subagent'
import type { HostModelCatalogSnapshot } from '@dsh-deepcraft/contracts/services'

/**
 * What the entry says, decided from the selection alone: nothing picked, one
 * route (named by the catalog where it can be), or how many are picked. The
 * trigger's copy turns each into a sentence, so this stays free of text.
 */
export type SelectionLabel =
  | { kind: 'none' }
  | { kind: 'one', name: string }
  | { kind: 'many', count: number }

/** One route's two display names, each falling back to its own id. */
export interface RouteNames {
  model: string
  provider: string
}

/** The catalog's own names for one route; an id the catalog lacks reads as itself. */
export function routeNames(route: SubagentModelRoute, catalog: HostModelCatalogSnapshot | null): RouteNames {
  if (catalog === null) return { model: route.model, provider: route.provider }
  for (const group of catalog.groups) {
    if (group.id !== route.provider) continue
    for (const model of group.models) {
      if (model.id !== route.model) continue
      return { model: model.name || model.id, provider: group.name || group.id }
    }
    return { model: route.model, provider: group.name || group.id }
  }
  return { model: route.model, provider: route.provider }
}

/**
 * What the trigger prints for `selected` (copy.ts turns it into text).
 *
 * @param selected - the routes this session delegates on.
 * @param catalog - the session's model catalog, for the model's own name.
 */
export function selectionLabel(selected: readonly SubagentModelRoute[], catalog: HostModelCatalogSnapshot | null): SelectionLabel {
  if (selected.length === 0) return { kind: 'none' }
  if (selected.length === 1) return { kind: 'one', name: routeNames(selected[0], catalog).model }
  return { kind: 'many', count: selected.length }
}

/**
 * One row's press: drop the route when it is picked, add it otherwise.
 *
 * The addition is refused past `SUBAGENT_ROUTES_MAX` — a null answer means the
 * row keeps its state, and the card says why. The order routes arrive in is the
 * order they were picked: it carries no priority, and the host reads the set.
 *
 * @param selected - the routes picked so far.
 * @param route - the row's route.
 * @returns the next selection, or `null` when the press changes nothing possible.
 */
export function toggleRoute(
  selected: readonly SubagentModelRoute[],
  route: SubagentModelRoute,
): SubagentModelRoute[] | null {
  const key = subagentRouteKey(route)
  const at = selected.findIndex((candidate) => subagentRouteKey(candidate) === key)
  if (at !== -1) return [...selected.slice(0, at), ...selected.slice(at + 1)]
  if (selected.length >= SUBAGENT_ROUTES_MAX) return null
  return [...selected, { provider: route.provider, model: route.model }]
}

/**
 * Whether two selections are the same set, ignoring order: the host stores a
 * set, so a reordered list is not a change worth a write.
 */
export function sameSelection(left: readonly SubagentModelRoute[], right: readonly SubagentModelRoute[]): boolean {
  if (left.length !== right.length) return false
  const keys = new Set(left.map((route) => subagentRouteKey(route)))
  return right.every((route) => keys.has(subagentRouteKey(route)))
}

/**
 * One route's reasoning ladder as the card draws it: `ok` when the levels are
 * known, `no-efforts` when the model declares none, `unknown` when neither the
 * catalog nor the host could say.
 */
export interface RouteLadder {
  state: 'ok' | 'no-efforts' | 'unknown'
  efforts: { id: string, name: string }[]
  defaultEffort?: string
}

/**
 * The ladder one route offers. The session catalog's own `reasoning` answers
 * first; where the catalog lacks the model or carries no reasoning block, the
 * GET answer's resolved `efforts` speak instead, and a route neither knows is
 * `unknown`.
 */
export function routeLadder(
  route: SubagentModelRoute,
  catalog: HostModelCatalogSnapshot | null,
  efforts: readonly SubagentRouteEfforts[] | undefined,
): RouteLadder {
  if (catalog !== null) {
    for (const group of catalog.groups) {
      if (group.id !== route.provider) continue
      for (const model of group.models) {
        if (model.id !== route.model) continue
        if (model.reasoning !== undefined) {
          return model.reasoning.efforts.length === 0
            ? { state: 'no-efforts', efforts: [] }
            : { state: 'ok', efforts: model.reasoning.efforts, defaultEffort: model.reasoning.defaultEffort }
        }
      }
    }
  }
  const resolved = efforts?.find((entry) => entry.provider === route.provider && entry.model === route.model)
  if (resolved !== undefined) {
    return { state: resolved.state, efforts: resolved.efforts, defaultEffort: resolved.defaultEffort }
  }
  return { state: 'unknown', efforts: [] }
}

/** The ladder's ids in display order: unspecified leads, the declared levels follow by strength. */
export function orderedEffortIds(ladder: RouteLadder): (string | undefined)[] {
  return orderEffortIds([undefined, ...ladder.efforts.map((level) => level.id)])
}

/**
 * Whether a stored effort no longer belongs to the route: `id` is set and the
 * ladder does not declare it. A stale id stays in force until the reader clears
 * it, so the card shows it rather than dropping it silently.
 */
export function effortIsStale(ladder: RouteLadder, id: string | undefined): boolean {
  return id !== undefined && !ladder.efforts.some((level) => level.id === id)
}

/**
 * One effort press on a picked route: the next selection with that route's
 * `reasoningEffort` set, or the field dropped when `effort` is undefined. A
 * press that changes nothing, or on a route that is not picked, answers null.
 */
export function setRouteEffort(
  selected: readonly SubagentModelRoute[],
  route: SubagentModelRoute,
  effort: string | undefined,
): SubagentModelRoute[] | null {
  const key = subagentRouteKey(route)
  const at = selected.findIndex((candidate) => subagentRouteKey(candidate) === key)
  if (at === -1) return null
  if (selected[at].reasoningEffort === effort) return null
  const next = selected.slice()
  const entry = { ...next[at] }
  if (effort === undefined) delete entry.reasoningEffort
  else entry.reasoningEffort = effort
  next[at] = entry
  return next
}
