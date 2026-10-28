/**
 * The subagent model rule (D12, D73).
 *
 * The official `subagent` tool treats a missing `provider`/`model` pair as
 * inheritance of the parent route. Two things here stop that silently:
 *
 *   - The reader can pick routes for one session (the composer's own entry,
 *     stored by subagent-models/store.ts). While a pick exists the calling model
 *     must name a route from it, so the session routes its subagents through the
 *     models its reader chose rather than through whatever the parent runs.
 *   - The preference `subagentModelChoice` makes an explicit pair mandatory in
 *     every session, whether or not the reader picked anything.
 *
 * The guard never picks a route itself and never rewrites the call's arguments:
 * it denies and says what to name (D79). An explicit pair stays the official tool's
 * own whitelist to check, and the parent's route is allowed whenever the pick
 * (or the policy) lists it. The rule covers the official tool's executions only;
 * a direct `subagents.startActivation` call never reaches it.
 */
import { holdsRoute } from '@dsh-deepcraft/contracts/subagent'
import type { SubagentModelRoute } from '@dsh-deepcraft/contracts/subagent'
import type { SubagentModelStore } from './subagent-models/store.js'
import type { DshContext, DshSession, DshSessions } from '@dsh-deepcraft/engine/node/dsh'

/** What the guard observes on one tool execution. */
export interface SubagentChoiceInput {
  enabled: boolean
  toolName: string
  provider: unknown
  model: unknown
  /** The calling session's official allowed routes; `undefined` without a policy. */
  routes: readonly SubagentModelRoute[] | undefined
  /** What the reader picked for that session or its nearest ancestor that picked. */
  selection: SubagentSelection
}

/**
 * The reader's pick as the rule sees it. `unavailable` is a record it could not
 * read: the rule reports that instead of treating the session as unchosen,
 * because inheriting the parent route is exactly what the reader meant to stop.
 */
export type SubagentSelection =
  | { kind: 'none' }
  | { kind: 'routes', routes: SubagentModelRoute[] }
  | { kind: 'unavailable', detail: string }

/** The official tool's default name; the rule applies to this tool alone. */
const SUBAGENT_TOOL_NAME = 'subagent'
/** The projection the official tool records at composition time. */
const POLICY_KEY = 'subagentModelSelectionPolicy'
/** The prompt slot after the official `TOOL_SUBAGENT` order (2800). */
const PROMPT_ORDER = 2810
/**
 * How far up the delegation chain a pick is looked for. The host bounds
 * delegation depth itself; this only keeps a malformed chain from spinning.
 */
const ANCESTRY_MAX = 32

/** The allowed routes as one list, in the policy's own order. */
function routeList(routes: readonly SubagentModelRoute[]): string {
  return routes.map((route) => `${route.provider}/${route.model}`).join(', ')
}

/** What a `provider`/`model` argument pair says: both named, one named, or neither. */
function pairNamed(provider: unknown, model: unknown) {
  const providerNamed = typeof provider === 'string' && provider.trim() !== ''
  const modelNamed = typeof model === 'string' && model.trim() !== ''
  return { providerNamed, modelNamed, complete: providerNamed && modelNamed }
}

/**
 * The denial reason for one execution, or `undefined` to let it run.
 *
 * @param input - the execution as the guard sees it.
 * @returns the reason to deny, or nothing.
 */
export function subagentChoiceDenial(input: SubagentChoiceInput): string | undefined {
  if (input.toolName !== SUBAGENT_TOOL_NAME) return undefined
  const policy = input.routes
  // Without a policy the tool carries no model fields at all, so the model has
  // nothing it could name and the rule stays out of the call.
  if (policy === undefined || policy.length === 0) return undefined
  const named = pairNamed(input.provider, input.model)
  const selection = input.selection
  if (selection.kind === 'unavailable') {
    return `This session's subagent model selection cannot be read: ${selection.detail}. Retry the call once the selection is readable; do not omit provider and model.`
  }
  if (selection.kind === 'routes') {
    const outside = selection.routes.filter((route) => !holdsRoute(policy, route))
    if (outside.length > 0) {
      return `This session's saved subagent selection names routes its policy no longer allows: ${routeList(outside)}. The reader must change the selection in the composer; the allowed routes are ${routeList(policy)}.`
    }
    if (named.complete) {
      const route = { provider: input.provider as string, model: input.model as string }
      if (holdsRoute(selection.routes, route)) return undefined
      return `This session routes its subagents through the models its reader picked: ${routeList(selection.routes)}. "${route.provider}/${route.model}" is not one of them. Pass provider and model from that list; the parent's own route is allowed when it is one of them.`
    }
    return `This session routes its subagents through the models its reader picked: ${routeList(selection.routes)}. Pass provider and model together from that list. Do not omit them. Use list_subagent_models for descriptions.`
  }
  if (!input.enabled) return undefined
  if (named.complete) return undefined
  return `This session requires provider and model on subagent. Allowed routes: ${routeList(policy)}. The same route as the parent is allowed. Call list_subagent_models, then retry with both fields. Do not omit them.`
}

/**
 * The prompt sentence stating the rule for the current session.
 *
 * With a pick the sentence names the picked routes and asks for one of them for
 * the task at hand; without one it states only what the preference made
 * mandatory. A selection the rule cannot read states nothing here: the tool call
 * itself carries the fault to the model.
 *
 * @param enabled - the preference's live value.
 * @param routes - the session's allowed routes, when it has a policy.
 * @param selection - what the reader picked.
 * @returns the sentence, or an empty contribution.
 */
export function subagentChoicePrompt(
  enabled: boolean,
  routes: readonly SubagentModelRoute[] | undefined,
  selection: SubagentSelection,
): string {
  if (routes === undefined || routes.length === 0) return ''
  if (selection.kind === 'routes') {
    const picked = selection.routes
    const outside = picked.filter((route) => !holdsRoute(routes, route))
    if (outside.length > 0) return ''
    if (picked.length === 1) {
      return `When calling \`subagent\`, pass provider and model together as ${routeList(picked)}. That is the only route this session delegates on. Any other route, and an omitted pair, is rejected.`
    }
    return `When calling \`subagent\`, pass provider and model together, choosing for the task at hand from the routes this session delegates on: ${routeList(picked)}. Any other route, and an omitted pair, is rejected. List order is not a default. Use list_subagent_models for descriptions.`
  }
  if (selection.kind === 'unavailable' || !enabled) return ''
  return `When calling \`subagent\`, pass provider and model together from this session's allowed routes: ${routeList(routes)}. Omitting either field is rejected. The parent's own route is allowed when it is in that list. Use list_subagent_models for descriptions. List order is not a default.`
}

/**
 * The preference's live value.
 *
 * A schemastery volatile field is a stable reference updated in place, so it is
 * read through `get()` on every use; a host whose schema factory lacks
 * `volatile()` hands over a plain boolean and reloads on a write instead.
 *
 * @param config - the parsed plugin config.
 * @returns whether the rule is on.
 */
export function readSubagentChoiceEnabled(config: unknown): boolean {
  if (config === null || typeof config !== 'object' || !('subagentModelChoice' in config)) return false
  const field = config.subagentModelChoice
  const value = field !== null && typeof field === 'object' && 'get' in field && typeof field.get === 'function'
    ? field.get()
    : field
  return value === true
}

/**
 * The routes the session's official policy recorded.
 *
 * A `null` projection is an initial state, and a session composed without the
 * official model-selection switch has no model fields on the tool; both answer
 * `undefined` so the rule stays out of a call the model cannot satisfy.
 *
 * @param projections - the host's session projection registry.
 * @param session - the calling agent's session.
 * @returns the routes in policy order, or `undefined` without a policy.
 */
export function readSubagentRoutes(projections: unknown, session: unknown): readonly SubagentModelRoute[] | undefined {
  if (session === null || session === undefined) return undefined
  if (projections === null || typeof projections !== 'object') return undefined
  if (!('stateOf' in projections) || typeof projections.stateOf !== 'function') return undefined
  const policy: unknown = projections.stateOf.call(projections, session, POLICY_KEY)
  if (!Array.isArray(policy) || policy.length === 0) return undefined
  const routes: SubagentModelRoute[] = []
  for (const entry of policy) {
    if (entry === null || typeof entry !== 'object' || !('provider' in entry) || !('model' in entry)) return undefined
    const { provider, model } = entry
    if (typeof provider !== 'string' || provider === '' || typeof model !== 'string' || model === '') return undefined
    routes.push({ provider, model })
  }
  return routes
}

/** One session's own id, or none when the value is not a session. */
function sessionIdOf(session: unknown): string | null {
  if (session === null || typeof session !== 'object' || !('header' in session)) return null
  const id = (session as { header?: { id?: unknown } }).header?.id
  return typeof id === 'string' && id !== '' ? id : null
}

/**
 * The nearest pick a session's delegations follow: its own, else the closest
 * ancestor that made one.
 *
 * A child session inherits its parent's policy rather than its pick, so without
 * this walk a second-level delegation would fall back to inheritance while the
 * session the reader configured two levels up had said otherwise.
 *
 * @param ctx - host plugin context, for the session registry and the store.
 * @param store - the selection store.
 * @param session - the calling session.
 * @returns the pick, or `none` when no session on the chain has one.
 */
export function resolveSubagentSelection(ctx: DshContext, store: SubagentModelStore, session: unknown): SubagentSelection {
  const sessions = ctx.get('sessions') as DshSessions | undefined
  let current: unknown = session
  for (let depth = 0; depth < ANCESTRY_MAX; depth++) {
    const id = sessionIdOf(current)
    if (id === null) return { kind: 'none' }
    const read = store.read(id)
    if (read.kind === 'routes') return { kind: 'routes', routes: read.routes }
    // A host with no storage at all can hold no pick: the walk answers `none`
    // there, so a missing service never holds every delegation back. A store
    // that exists but cannot answer may hide a saved pick, and that is reported.
    if (read.kind === 'unavailable' && !read.permanent) return { kind: 'unavailable', detail: read.detail }
    const parentId = (current as DshSession).header?.parentSession
    if (typeof parentId !== 'string' || parentId === '' || typeof sessions?.get !== 'function') return { kind: 'none' }
    current = sessions.get(parentId)
    if (current === undefined) return { kind: 'none' }
  }
  return { kind: 'none' }
}

/**
 * Install the guard and the prompt sentence for this plugin context.
 *
 * A host without the tools service registers nothing rather than failing this
 * fiber: a failed host fiber also drops the client bundle and the whole skin.
 *
 * @param ctx - host plugin context.
 * @param config - the parsed plugin config.
 * @param store - the store the reader's picks live in.
 */
export function registerSubagentChoice(ctx: DshContext, config: unknown, store: SubagentModelStore): void {
  /** The guard: one denial reason per `subagent` execution. */
  const installGuard = () => {
    const tools = ctx.get('tools')
    // A service still activating answers nothing here, and the rule would then
    // never register for the process's life; `inject` below waits for it.
    if (typeof tools?.guard !== 'function') return
    return tools.guard((exec: { name?: unknown, arguments?: unknown, agent?: { session?: unknown } }) => {
      const rawArguments: unknown = exec?.arguments
      const provider = rawArguments !== null && typeof rawArguments === 'object' && 'provider' in rawArguments
        ? rawArguments.provider
        : undefined
      const model = rawArguments !== null && typeof rawArguments === 'object' && 'model' in rawArguments
        ? rawArguments.model
        : undefined
      const session = exec?.agent?.session
      return subagentChoiceDenial({
        enabled: readSubagentChoiceEnabled(config),
        toolName: typeof exec?.name === 'string' ? exec.name : '',
        provider,
        model,
        routes: readSubagentRoutes(ctx.get('sessionProjections'), session),
        selection: resolveSubagentSelection(ctx, store, session),
      })
    })
  }
  /** The sentence the calling model reads, evaluated per assembled prompt. */
  const installPrompt = () => {
    const prompt = ctx.get('systemPrompt')
    if (typeof prompt?.section !== 'function') return
    return prompt.section({
      name: 'deepcraft:subagent-model-choice',
      order: PROMPT_ORDER,
      text: (context: { agent?: { session?: unknown } } | undefined) => {
        const session = context?.agent?.session
        return subagentChoicePrompt(
          readSubagentChoiceEnabled(config),
          readSubagentRoutes(ctx.get('sessionProjections'), session),
          resolveSubagentSelection(ctx, store, session),
        )
      },
    })
  }
  /** Run one registration inside this generation, dropping its answer with it. */
  const within = (register: () => (() => void) | undefined) => {
    if (typeof ctx.effect !== 'function') {
      register()
      return
    }
    ctx.effect(() => {
      const stop = register()
      return () => {
        if (typeof stop === 'function') stop()
      }
    })
  }
  // Each waits on its own service: a host without prompts still gets the rule,
  // and one without tools still gets the sentence.
  if (typeof ctx.inject === 'function') {
    ctx.inject(['tools'], () => { within(installGuard) })
    ctx.inject(['systemPrompt'], () => { within(installPrompt) })
    return
  }
  within(installGuard)
  within(installPrompt)
}
