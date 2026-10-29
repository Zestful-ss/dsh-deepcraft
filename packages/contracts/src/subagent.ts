/**
 * The subagent model selection both halves exchange.
 *
 * The browser half asks its own route for one session's allowed list and saved
 * selection, and writes the reader's choice back; the host half validates every
 * write against the session's own official policy. Both halves build and read
 * the same pairs, so the rules about what a route is live here rather than in
 * either half alone.
 */

/** One provider/model pair, exactly as the host's `subagent` tool takes it. */
export interface SubagentModelRoute {
  provider: string
  model: string
  /** The reasoning effort this route delegates on, when the reader picked one; absent = the model's default. */
  reasoningEffort?: string
}

/**
 * The write-contract generation the page declares on a POST. A write carrying
 * `reasoningEffort` on any route must name generation 2: a record holding
 * efforts is unreadable to an earlier plugin generation's strict schema, so a
 * write that does not declare the new contract is refused rather than letting
 * it overwrite — and silently drop — a stored effort.
 */
export const SUBAGENT_MODELS_CONTRACT = 2

/** One route's declared reasoning ladder, as the host resolved it for the card. */
export interface SubagentRouteEfforts {
  /** The route this ladder belongs to (provider+model; effort is data, not identity). */
  provider: string
  model: string
  /** The levels the model offers, in the adapter's own order; empty when it offers none. */
  efforts: { id: string, name: string }[]
  /** The level the model uses when none is passed, when it declares one. */
  defaultEffort?: string
  /**
   * How the lookup went: `ok` = levels are authoritative, `no-efforts` = the
   * model declares no reasoning ladder, `unknown` = neither the catalog nor a
   * direct query could say (the card lets the reader fall back to unspecified).
   */
  state: 'ok' | 'no-efforts' | 'unknown'
}

/**
 * How many routes one session may select. The official allowed list is a short
 * list of routes the reader means to route between; a cap keeps a stored record
 * small and bounds what a prompt sentence has to name.
 */
export const SUBAGENT_ROUTES_MAX = 24

/** The provider id's own length cap, as the host's settings field holds it. */
const PROVIDER_MAX = 120
/** The model id's own length cap; a route id is a catalog id, not a sentence. */
const MODEL_MAX = 200
/** The effort id's own length cap, read against the model's declared levels. */
const EFFORT_MAX = 200

/** The key one route compares by, and the only place that separator is written. */
export function subagentRouteKey(route: SubagentModelRoute): string {
  return `${route.provider}\u0000${route.model}`
}

/** One route, when `value` names a complete pair of ids this plugin accepts. */
function readRoute(value: unknown): SubagentModelRoute | null {
  if (value === null || typeof value !== 'object') return null
  const { provider, model, reasoningEffort } = value as { provider?: unknown, model?: unknown, reasoningEffort?: unknown }
  if (typeof provider !== 'string' || typeof model !== 'string') return null
  // An id is compared byte for byte with the catalog's, so padding is a
  // different route rather than the same one.
  if (provider === '' || provider.length > PROVIDER_MAX) return null
  if (model === '' || model.length > MODEL_MAX) return null
  if (reasoningEffort !== undefined && (typeof reasoningEffort !== 'string' || reasoningEffort === '' || reasoningEffort.length > EFFORT_MAX)) return null
  return reasoningEffort === undefined ? { provider, model } : { provider, model, reasoningEffort }
}

/**
 * A route list read the way the host's own policy reader reads one: every entry
 * a complete pair, no repeats, and at most `SUBAGENT_ROUTES_MAX` of them.
 *
 * @param value - the request's field, or a stored record's.
 * @returns the routes in their own order, or `null` when the value is not one.
 */
export function readSubagentRoutes(value: unknown): SubagentModelRoute[] | null {
  if (!Array.isArray(value) || value.length > SUBAGENT_ROUTES_MAX) return null
  const routes: SubagentModelRoute[] = []
  const seen = new Set<string>()
  for (const entry of value) {
    const route = readRoute(entry)
    if (route === null) return null
    const key = subagentRouteKey(route)
    if (seen.has(key)) return null
    seen.add(key)
    routes.push(route)
  }
  return routes
}

/** Whether `routes` holds `route`. */
export function holdsRoute(routes: readonly SubagentModelRoute[], route: SubagentModelRoute): boolean {
  const key = subagentRouteKey(route)
  for (const candidate of routes) if (subagentRouteKey(candidate) === key) return true
  return false
}

/** The answer both the read and the write route give. */
export interface SubagentModelsAnswer {
  /** The routes the session's official policy allows, in policy order; empty without a policy. */
  allowed: SubagentModelRoute[]
  /** The routes the reader picked for this session; empty when there is no separate choice. */
  selected: SubagentModelRoute[]
  /** Each allowed route's declared reasoning ladder, when the host could resolve any. */
  efforts?: SubagentRouteEfforts[]
  /**
   * Why the entry cannot act: no official policy, a stored route the policy no
   * longer allows, a store that failed. Absent when it can.
   */
  reason?: SubagentModelsReason
}

/**
 * Why the entry cannot act, as a code the browser half turns into a sentence:
 * the host names the condition because only the host can tell them apart.
 */
export type SubagentModelsReason =
  /** The session's composition recorded no allowed list: the official switch is off for it. */
  | 'no-policy'
  /** No such live session: a cold one has no projection the host can read. */
  | 'no-session'
  /** The stored selection names a route the session's policy does not allow. */
  | 'stale-selection'
  /** The plugin's own storage domain could not be opened or read. */
  | 'store-unavailable'

/**
 * Why a write was refused. The read's reasons carry over, and a write adds the
 * two the reader can fix: a body that is not a route list, and a route the
 * session's official policy does not allow.
 */
export type SubagentModelsRefusal = SubagentModelsReason | 'invalid-routes' | 'route-not-allowed' | 'effort-not-allowed' | 'stale-write'

/** What a write sends: the session, the routes it selects (an empty list clears), and the contract generation it was written under. */
export interface SubagentModelsWrite {
  session: string
  routes: SubagentModelRoute[]
  /** The write-contract generation (SUBAGENT_MODELS_CONTRACT); absent on an old-generation write. */
  contract?: number
}
