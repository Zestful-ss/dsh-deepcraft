import { SUBAGENT_ROUTES_MAX, subagentRouteKey } from '@dsh-deepcraft/contracts/subagent'
import type { SubagentModelRoute } from '@dsh-deepcraft/contracts/subagent'
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
