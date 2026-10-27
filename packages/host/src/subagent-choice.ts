/**
 * The subagent model rule (D12, D73).
 *
 * The official `subagent` tool treats a missing `provider`/`model` pair as
 * inheritance of the parent route. While the preference `subagentModelChoice`
 * is on, this module denies that omission through the tools guard and states
 * the rule in the prompt, so the calling model names a route from the session's
 * own allowed list. It never picks a route: an explicit pair passes here even
 * when it equals the parent's, and the official tool's `assertAllowedModelSelection`
 * remains the whitelist. The rule covers the official tool's executions only;
 * a direct `subagents.startActivation` call never reaches it.
 */
import type { DshContext } from '@dsh-deepcraft/engine/node/dsh'

/** One provider route the session's policy allows. */
export interface SubagentRoute {
  provider: string
  model: string
}

/** What the guard observes on one tool execution. */
export interface SubagentChoiceInput {
  enabled: boolean
  toolName: string
  provider: unknown
  model: unknown
  routes: readonly SubagentRoute[] | undefined
}

/** The official tool's default name; the rule applies to this tool alone. */
const SUBAGENT_TOOL_NAME = 'subagent'
/** The projection the official tool records at composition time. */
const POLICY_KEY = 'subagentModelSelectionPolicy'
/** The prompt slot after the official `TOOL_SUBAGENT` order (2800). */
const PROMPT_ORDER = 2810

/** The allowed routes as one list, in the policy's own order. */
function routeList(routes: readonly SubagentRoute[]): string {
  return routes.map((route) => `${route.provider}/${route.model}`).join(', ')
}

/**
 * The denial reason for one execution, or `undefined` to let it run.
 *
 * Only an omitted or half-written pair is denied; an explicit pair is left to
 * the official tool's whitelist, and this rule does not compare it with the
 * parent route.
 *
 * @param input - the execution as the guard sees it.
 * @returns the reason to deny, or nothing.
 */
export function subagentChoiceDenial(input: SubagentChoiceInput): string | undefined {
  if (!input.enabled || input.toolName !== SUBAGENT_TOOL_NAME) return undefined
  const routes = input.routes
  if (routes === undefined || routes.length === 0) return undefined
  const providerNamed = typeof input.provider === 'string' && input.provider.trim() !== ''
  const modelNamed = typeof input.model === 'string' && input.model.trim() !== ''
  if (providerNamed && modelNamed) return undefined
  return `This session requires provider and model on subagent. Allowed routes: ${routeList(routes)}. The same route as the parent is allowed. Call list_subagent_models, then retry with both fields. Do not omit them.`
}

/**
 * The prompt sentence stating the rule for the current session.
 *
 * @param enabled - the preference's live value.
 * @param routes - the session's allowed routes, when it has a policy.
 * @returns the sentence, or an empty contribution.
 */
export function subagentChoicePrompt(enabled: boolean, routes: readonly SubagentRoute[] | undefined): string {
  if (!enabled || routes === undefined || routes.length === 0) return ''
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
export function readSubagentRoutes(projections: unknown, session: unknown): readonly SubagentRoute[] | undefined {
  if (session === null || session === undefined) return undefined
  if (projections === null || typeof projections !== 'object') return undefined
  if (!('stateOf' in projections) || typeof projections.stateOf !== 'function') return undefined
  const policy: unknown = projections.stateOf.call(projections, session, POLICY_KEY)
  if (!Array.isArray(policy) || policy.length === 0) return undefined
  const routes: SubagentRoute[] = []
  for (const entry of policy) {
    if (entry === null || typeof entry !== 'object' || !('provider' in entry) || !('model' in entry)) return undefined
    const { provider, model } = entry
    if (typeof provider !== 'string' || provider === '' || typeof model !== 'string' || model === '') return undefined
    routes.push({ provider, model })
  }
  return routes
}

/**
 * Install the guard and the prompt sentence for this plugin context.
 *
 * A host without the tools service registers nothing rather than failing this
 * fiber: a failed host fiber also drops the client bundle and the whole skin.
 *
 * @param ctx - host plugin context.
 * @param config - the parsed plugin config.
 */
export function registerSubagentChoice(ctx: DshContext, config: unknown): void {
  const tools = ctx.get('tools')
  if (typeof tools?.guard !== 'function') return
  const install = () => {
    const stopGuard = tools.guard((exec: { name?: unknown, arguments?: unknown, agent?: { session?: unknown } }) => {
      const rawArguments: unknown = exec?.arguments
      const provider = rawArguments !== null && typeof rawArguments === 'object' && 'provider' in rawArguments
        ? rawArguments.provider
        : undefined
      const model = rawArguments !== null && typeof rawArguments === 'object' && 'model' in rawArguments
        ? rawArguments.model
        : undefined
      return subagentChoiceDenial({
        enabled: readSubagentChoiceEnabled(config),
        toolName: typeof exec?.name === 'string' ? exec.name : '',
        provider,
        model,
        routes: readSubagentRoutes(ctx.get('sessionProjections'), exec?.agent?.session),
      })
    })
    const prompt = ctx.get('systemPrompt')
    const stopPrompt = typeof prompt?.section === 'function'
      ? prompt.section({
        name: 'deepcraft:subagent-model-choice',
        order: PROMPT_ORDER,
        text: (context: { agent?: { session?: unknown } } | undefined) => subagentChoicePrompt(
          readSubagentChoiceEnabled(config),
          readSubagentRoutes(ctx.get('sessionProjections'), context?.agent?.session),
        ),
      })
      : undefined
    return () => {
      stopGuard()
      if (typeof stopPrompt === 'function') stopPrompt()
    }
  }
  if (typeof ctx.effect === 'function') ctx.effect(install)
  else install()
}
