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
import { holdsRoute, readSubagentRoutes, subagentRouteKey } from '@dsh-deepcraft/contracts/subagent'
import type { SubagentModelRoute, SubagentModelsAnswer, SubagentModelsRefusal } from '@dsh-deepcraft/contracts/subagent'
import { fenceRefused, methodRefused, readRequestBody, sendJson } from '@dsh-deepcraft/engine/node/http'
import { readSubagentRoutes as readPolicyRoutes } from '../subagent-choice.js'
import type { SubagentModelStore } from './store.js'
import type { DshContext, DshRequest, DshResponse, DshRoute, DshSession } from '@dsh-deepcraft/engine/node/dsh'

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
    return routes.map((route) => ({ provider: route.provider, model: route.model }))
  }

  /**
   * What the session allows and has picked. A stored route the policy no longer
   * allows is reported as such and kept on show: the reader has to fix it, and
   * the rule keeps denying while it stands.
   */
  function read(sessionId: string): SubagentModelsAnswer {
    const session = liveSession(sessionId)
    if (session === null) return { allowed: [], selected: [], reason: 'no-session' }
    const policy = readPolicyRoutes(ctx.get('sessionProjections'), session)
    if (policy === undefined) return { allowed: [], selected: [], reason: 'no-policy' }
    const allowed = copyRoutes(policy)
    const selection = store.read(sessionId)
    if (selection.kind === 'unavailable') return { allowed, selected: [], reason: 'store-unavailable' }
    if (selection.kind === 'none') return { allowed, selected: [] }
    const selected = copyRoutes(selection.routes)
    const stale = selected.some((route) => !holdsRoute(allowed, route))
    return stale ? { allowed, selected, reason: 'stale-selection' } : { allowed, selected }
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
    const fields = body !== null && typeof body === 'object' ? body as { session?: unknown, routes?: unknown } : {}
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
    try {
      await store.write(sessionId, routes)
    } catch (error) {
      refuse(res, 500, 'store-unavailable', String((error as { message?: string } | null)?.message ?? String(error)))
      return
    }
    sendJson(res, 200, { ok: true, ...read(sessionId) })
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
      sendJson(res, 200, { ok: true, ...read(sessionId) })
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
