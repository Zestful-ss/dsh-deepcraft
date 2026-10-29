/**
 * The route the browser half reads and writes one session's subagent route
 * selection through (D79).
 *
 * `GET ?session=<id>` answers what the session's composition allows and what
 * the reader picked; `POST { session, routes }` replaces the pick, and one empty
 * list clears it. Every write is validated here rather than in the page: only a
 * route in that session's own official policy may be stored, so a page cannot
 * put a route into the record the host's tool would then refuse (D75).
 *
 * The session is named by the request body because a plugin route carries no
 * session of its own; the id is resolved against the host's own registry, and an
 * id this process has not opened answers `no-session` — the stored record is
 * keyed by id alone, but the policy that validates a write is a host-side
 * projection only a live session answers.
 */
import { SUBAGENT_MODELS_PATH } from '@dsh-deepcraft/contracts/routes'
import { holdsRoute, readSubagentRoutes, subagentRouteKey, SUBAGENT_MODELS_CONTRACT } from '@dsh-deepcraft/contracts/subagent'
import type { SubagentModelRoute, SubagentModelsAnswer, SubagentModelsRefusal, SubagentRouteEfforts } from '@dsh-deepcraft/contracts/subagent'
import { fenceRefused, methodRefused, readRequestBody, sendJson } from '@dsh-deepcraft/engine/node/http'
import { readSubagentRoutes as readPolicyRoutes } from '../subagent-choice.js'
import type { SubagentModelStore, SubagentSelectionRead } from './store.js'
import type { DshContext, DshLlm, DshRequest, DshResponse, DshRoute, DshSession } from '@dsh-deepcraft/engine/node/dsh'

/** Largest write body read: a full route list, with room for its ids. */
const BODY_MAX = 16 * 1024
/** Longest session id this route takes; a real one is a uuid. */
const SESSION_ID_MAX = 200

/** The route one session's selection is read and written through. */
function routeOf(ctx: DshContext, store: SubagentModelStore): DshRoute {
  /** One live session by id, or null. */
  function liveSession(sessionId: string): DshSession | null {
    if (sessionId === '' || sessionId.length > SESSION_ID_MAX) return null
    const sessions = ctx.get('sessions') as { get?(id: string): DshSession | undefined } | undefined
    if (typeof sessions?.get !== 'function') return null
    return sessions.get(sessionId) ?? null
  }

  /** An answer's routes as the contract's own shape, copied off the host's objects. */
  function copyRoutes(routes: readonly SubagentModelRoute[]): SubagentModelRoute[] {
    return routes.map((route) => route.reasoningEffort === undefined
      ? { provider: route.provider, model: route.model }
      : { provider: route.provider, model: route.model, reasoningEffort: route.reasoningEffort })
  }

  /** The effort ladder `resolveModelInfo` reports for one route, or `null` when it carries none. */
  function reasoningOf(info: unknown): { defaultEffort?: string, efforts: { id: string, name: string }[] } | null {
    const reasoning = (info as { reasoning?: unknown } | null)?.reasoning
    if (reasoning === null || reasoning === undefined || typeof reasoning !== 'object') return null
    const efforts = (reasoning as { efforts?: unknown }).efforts
    if (!Array.isArray(efforts) || efforts.length === 0) return null
    const levels = efforts
      .map((entry) => entry as { id?: unknown, name?: unknown })
      .filter((entry): entry is { id: string, name: string } => typeof entry.id === 'string' && typeof entry.name === 'string')
    if (levels.length === 0) return null
    const defaultEffort = (reasoning as { defaultEffort?: unknown }).defaultEffort
    return { efforts: levels, ...(typeof defaultEffort === 'string' ? { defaultEffort } : {}) }
  }

  /**
   * One allowed route's declared ladder: `ok` with the levels, `no-efforts`
   * when the model resolves but declares none, `unknown` when the llm service
   * is absent or the model does not resolve. Each route resolves on its own:
   * one route's failure says so without silencing the others.
   */
  async function routeEfforts(routes: readonly SubagentModelRoute[]): Promise<SubagentRouteEfforts[]> {
    const llm = ctx.get('llm') as DshLlm | undefined
    return Promise.all(routes.map(async (route) => {
      if (llm === undefined || llm === null || typeof llm.resolveModelInfo !== 'function') {
        return { provider: route.provider, model: route.model, efforts: [], state: 'unknown' }
      }
      try {
        const reasoning = reasoningOf(await llm.resolveModelInfo(route.provider, route.model))
        if (reasoning === null) return { provider: route.provider, model: route.model, efforts: [], state: 'no-efforts' }
        return { provider: route.provider, model: route.model, efforts: reasoning.efforts, defaultEffort: reasoning.defaultEffort, state: 'ok' }
      } catch {
        // The model id came from the session's own policy, so a rejection here
        // is a catalog gap or a resolver fault; the route is reported unknown,
        // which the card reads as "the ladder could not be resolved".
        return { provider: route.provider, model: route.model, efforts: [], state: 'unknown' }
      }
    }))
  }

  /** An answer plus the per-route ladders, when at least one resolved. */
  function withEfforts(answer: SubagentModelsAnswer, efforts: SubagentRouteEfforts[]): SubagentModelsAnswer {
    return efforts.length === 0 ? answer : { ...answer, efforts }
  }

  /**
   * What the session allows and has picked. A stored route the policy no longer
   * allows is reported as such and kept on show: the reader has to fix it, and
   * the rule keeps denying while it stands.
   */
  async function read(sessionId: string): Promise<SubagentModelsAnswer> {
    const session = liveSession(sessionId)
    if (session === null) return { allowed: [], selected: [], reason: 'no-session' }
    const policy = readPolicyRoutes(ctx.get('sessionProjections'), session)
    if (policy === undefined) return { allowed: [], selected: [], reason: 'no-policy' }
    const allowed = copyRoutes(policy)
    const efforts = await routeEfforts(allowed)
    const selection = store.read(sessionId)
    if (selection.kind === 'unavailable') return withEfforts({ allowed, selected: [], reason: 'store-unavailable' }, efforts)
    if (selection.kind === 'none') return withEfforts({ allowed, selected: [] }, efforts)
    const selected = copyRoutes(selection.routes)
    const stale = selected.some((route) => !holdsRoute(allowed, route))
    return withEfforts(stale ? { allowed, selected, reason: 'stale-selection' } : { allowed, selected }, efforts)
  }

  /**
   * Whether the write's contract generation may touch the record's efforts.
   * A record holding `reasoningEffort` is unreadable to an older generation's
   * strict schema, so a write that does not declare generation
   * `SUBAGENT_MODELS_CONTRACT` is refused rather than letting it overwrite —
   * and silently drop — what it cannot see.
   */
  function staleWrite(contract: number, routes: readonly SubagentModelRoute[], stored: SubagentSelectionRead): boolean {
    if (contract >= SUBAGENT_MODELS_CONTRACT) return false
    if (routes.some((route) => route.reasoningEffort !== undefined)) return true
    return stored.kind === 'routes' && stored.routes.some((route) => route.reasoningEffort !== undefined)
  }

  /** Refuse one write: a status, a code and the sentence the page logs. */
  function refuse(res: DshResponse, status: number, error: SubagentModelsRefusal, message: string) {
    sendJson(res, status, { ok: false, error, message })
  }

  /** Replace one session's selection, or clear it. */
  async function write(req: DshRequest, res: DshResponse) {
    const raw = await readRequestBody(req, BODY_MAX)
    if (raw === null) {
      refuse(res, 413, 'invalid-routes', 'the selection body is unreadable or too large')
      return
    }
    let body: unknown
    try {
      body = JSON.parse(raw.toString('utf8'))
    } catch {
      refuse(res, 400, 'invalid-routes', 'the selection body is not JSON')
      return
    }
    const fields = body !== null && typeof body === 'object' ? body as { session?: unknown, routes?: unknown, contract?: unknown } : {}
    const sessionId = typeof fields.session === 'string' ? fields.session : ''
    const session = liveSession(sessionId)
    if (session === null) {
      refuse(res, 409, 'no-session', 'no live session carries that id')
      return
    }
    const policy = readPolicyRoutes(ctx.get('sessionProjections'), session)
    if (policy === undefined) {
      refuse(res, 409, 'no-policy', 'the session recorded no allowed subagent routes')
      return
    }
    const routes = readSubagentRoutes(fields.routes)
    if (routes === null) {
      refuse(res, 400, 'invalid-routes', 'the routes are not a list of distinct provider/model pairs')
      return
    }
    for (const route of routes) {
      if (!holdsRoute(policy, route)) {
        refuse(res, 400, 'route-not-allowed', `the session's policy does not allow ${subagentRouteKey(route).replace('\u0000', '/')}`)
        return
      }
    }
    if (routes.some((route) => route.reasoningEffort !== undefined)) {
      const llm = ctx.get('llm') as DshLlm | undefined
      for (const route of routes) {
        if (route.reasoningEffort === undefined) continue
        const name = `${subagentRouteKey(route).replace('\u0000', '/')} effort ${route.reasoningEffort}`
        if (llm === undefined || llm === null || typeof llm.resolveModelInfo !== 'function') {
          // An effort only lands once the model is known to declare it: without
          // the llm service there is nothing to check it against (D12).
          refuse(res, 400, 'effort-not-allowed', `the reasoning ladder of ${name} could not be resolved`)
          return
        }
        let reasoning: { defaultEffort?: string, efforts: { id: string, name: string }[] } | null
        try {
          reasoning = reasoningOf(await llm.resolveModelInfo(route.provider, route.model))
        } catch {
          // A route the policy allows that the resolver rejects cannot prove
          // the effort is real, so the write fails closed rather than storing
          // an unvalidated one.
          refuse(res, 400, 'effort-not-allowed', `the reasoning ladder of ${name} could not be resolved`)
          return
        }
        if (reasoning === null || !reasoning.efforts.some((effort) => effort.id === route.reasoningEffort)) {
          refuse(res, 400, 'effort-not-allowed', `the model declares no reasoning effort ${name}`)
          return
        }
      }
    }
    const stored = store.read(sessionId)
    if (staleWrite(typeof fields.contract === 'number' ? fields.contract : 0, routes, stored)) {
      refuse(res, 409, 'stale-write', 'the stored selection or this write carries reasoning efforts; write again under the current contract')
      return
    }
    try {
      await store.write(sessionId, routes)
    } catch (error) {
      refuse(res, 500, 'store-unavailable', String((error as { message?: string } | null)?.message ?? String(error)))
      return
    }
    sendJson(res, 200, { ok: true, ...await read(sessionId) })
  }

  return {
    kind: 'exact',
    path: SUBAGENT_MODELS_PATH,
    handler: (req: DshRequest, res: DshResponse) => {
      if (methodRefused(req, res, ['GET', 'POST'])) return
      if (fenceRefused(ctx, req, res)) return
      if (req.method === 'POST') {
        // A fault inside the write answers 500 with its message, so the page
        // keeps what it had and says the save failed.
        void write(req, res).catch((error: unknown) => {
          if (res.headersSent) res.destroy()
          else sendJson(res, 500, { ok: false, error: 'store-unavailable', message: String((error as { message?: string } | null)?.message ?? String(error)) })
        })
        return
      }
      /* v8 ignore next -- node:http always sets url on server requests. */
      const sessionId = new URL(req.url ?? '/', 'http://local').searchParams.get('session') ?? ''
      // The read resolves each route's ladder, which is asynchronous; a fault
      // inside it answers 500 like the write's does.
      void read(sessionId).then(
        (answer) => sendJson(res, 200, { ok: true, ...answer }),
        (error: unknown) => {
          if (res.headersSent) res.destroy()
          else sendJson(res, 500, { ok: false, error: 'store-unavailable', message: String((error as { message?: string } | null)?.message ?? String(error)) })
        },
      )
    },
  }
}

/**
 * The route registrations this feature adds.
 *
 * @param ctx - host plugin context.
 * @param store - the selection store this generation owns.
 * @returns one labelled route, in the shape routes.ts registers.
 */
export function subagentModelRoutes(ctx: DshContext, store: SubagentModelStore): { label: string, route: DshRoute }[] {
  return [{ label: 'subagent models', route: routeOf(ctx, store) }]
}
