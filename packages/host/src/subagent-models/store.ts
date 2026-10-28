/**
 * The per-session record of which subagent routes a session may route between
 * (D79).
 *
 * The choice is plugin state, not host state: the host's own projection records
 * what the session's composition ALLOWS, and this records what the reader PICKED
 * from that list. It lives in the host's domain form (D75) — one schema-validated
 * table under the plugin's own domain name, written through the `json` backend
 * into `$DSH_HOME/storages/` — so it survives a restart without touching the
 * session log, which no plugin may append to with events the host does not know.
 *
 * Reads are synchronous off the domain's own state, because the tool guard that
 * spends them cannot await; a domain that is not open yet answers
 * `unavailable` rather than "nothing selected", so a rule that cannot see the
 * record reports the fault instead of silently falling back to inheritance.
 */
import { readSubagentRoutes } from '@dsh-deepcraft/contracts/subagent'
import type { SubagentModelRoute } from '@dsh-deepcraft/contracts/subagent'
import { resolveHostPackage } from '../host-package.js'
import type { DshContext, DshStorageDomain, DshStorageDomainFacility, DshStorageTable } from '@dsh-deepcraft/engine/node/dsh'

/** The domain's name; the host's own name rule for a unit is lower-case and underscores. */
const DOMAIN_NAME = 'deepcraft_subagent_models'
/** The one table: one record per session id. */
const TABLE_NAME = 'selections'
/**
 * The stored record's schema version. A record whose shape changes bumps this,
 * and the facility refuses to open a unit written under a version it does not
 * know rather than reading it wrong.
 */
const DOMAIN_VERSION = 1
/**
 * How long a name another generation still holds is retried: the host re-applies
 * this plugin after a client-bundle rebuild while the previous generation's
 * handle is closing, and closing is asynchronous.
 */
const REOPEN_ATTEMPTS = 20
const REOPEN_INTERVAL_MS = 25

/** One zod value builder, as far as the record schema chains on it. */
interface ZodValue {
  min(value: number): ZodValue
  /** Refuse an object carrying a key the schema does not name. */
  strict(): ZodValue
}

/** The zod factory, as far as this module builds a schema with it (host-package.ts resolves it). */
interface ZodFactory {
  object(shape: Record<string, unknown>): unknown
  array(item: unknown): unknown
  string(): ZodValue
}

/**
 * What a read answers. `permanent` marks a host that carries no storage at all:
 * no record can exist there, so a rule reading it takes the answer as "nothing
 * picked" instead of holding every delegation back. A store that exists but
 * cannot answer is NOT permanent — a saved pick may be behind it.
 */
export type SubagentSelectionRead =
  | { kind: 'routes', routes: SubagentModelRoute[] }
  | { kind: 'none' }
  | { kind: 'unavailable', detail: string, permanent: boolean }

/** The store one plugin generation owns. */
export interface SubagentModelStore {
  /** The routes saved for one session, synchronously, from the domain's own state. */
  read(sessionId: string): SubagentSelectionRead
  /** Replace one session's routes; an empty list clears the record. Rejects when the write did not land. */
  write(sessionId: string, routes: readonly SubagentModelRoute[]): Promise<void>
  /** Open the domain ahead of the first use, so the first tool call does not pay for it. */
  warm(): void
  /** Release the handle this generation opened. */
  dispose(): void
}

/** The record's shape: at least one route, since clearing deletes the record instead. */
function recordSchema(zod: ZodFactory) {
  const route = (zod.object({ provider: zod.string().min(1), model: zod.string().min(1) }) as ZodValue).strict()
  return (zod.object({ routes: (zod.array(route) as ZodValue).min(1) }) as ZodValue).strict()
}

/** The domain spec handed to `open`: a plain object, which is all the facility reads. */
function domainSpec(zod: ZodFactory) {
  return {
    name: DOMAIN_NAME,
    version: DOMAIN_VERSION,
    tables: { [TABLE_NAME]: { valueSchema: recordSchema(zod) } },
  }
}

/** The record's routes, or none when the stored value is not one this plugin wrote. */
function routesOf(value: unknown): SubagentModelRoute[] {
  if (value === null || typeof value !== 'object' || !('routes' in value)) return []
  return readSubagentRoutes((value as { routes: unknown }).routes) ?? []
}

/** The code a domain failure carries, when it carries one (`already-open`, `closed`, …). */
function failureCode(error: unknown): string {
  const code = (error as { code?: unknown } | null)?.code
  return typeof code === 'string' ? code : ''
}

/** A message for one failure, for the guard's sentence and the host's log. */
function failureText(error: unknown): string {
  return String((error as { message?: string } | null)?.message ?? String(error))
}

/** Wait one reopen interval. */
function settle(ms: number) {
  const { promise, resolve } = Promise.withResolvers<void>()
  setTimeout(resolve, ms)
  return promise
}

/**
 * Create the store for one plugin generation.
 *
 * The storage service is read off the context rather than declared through
 * `inject`: a host without it still activates the skin, and every read then
 * answers `unavailable` with that reason (D12).
 *
 * @param ctx - host plugin context.
 * @param log - where a failed open is reported.
 */
export function createSubagentModelStore(ctx: DshContext, log: { warn?(message: string): void } | undefined): SubagentModelStore {
  let domain: DshStorageDomain | null = null
  /** Set when the host carries no storage domain service; re-read on every call, since one may mount later. */
  let missing = false
  /** Whether this generation owns the handle; a reopened one belongs to the generation that opened it. */
  let owned = false
  let failure: string | null = null
  let pending: Promise<void> | null = null
  let disposed = false

  /** The table, or null while the domain is not open. */
  function table(): DshStorageTable | null {
    if (domain === null) return null
    try {
      return domain.table(TABLE_NAME)
    } catch (error) {
      failure = failureText(error)
      return null
    }
  }

  /**
   * Open the domain, once.
   *
   * A name another generation still holds is retried before it is reported: the
   * previous generation's `close()` settles a moment later, and reporting
   * `already-open` as a storage fault would take the rule out for the rest of
   * the process.
   */
  async function open(facility: DshStorageDomainFacility): Promise<void> {
    const zod = await resolveHostPackage('zod') as ZodFactory | null
    if (zod === null || zod === undefined || typeof zod.object !== 'function') {
      failure = 'the host resolves no zod to declare the store schema with'
      return
    }
    const spec = domainSpec(zod)
    for (let attempt = 0; attempt < REOPEN_ATTEMPTS; attempt++) {
      try {
        domain = await facility.open(spec)
        owned = true
        failure = null
        return
      } catch (error) {
        if (failureCode(error) !== 'already-open') {
          failure = failureText(error)
          return
        }
        const held = typeof facility.get === 'function' ? facility.get(DOMAIN_NAME) : undefined
        if (held !== undefined && held !== null) {
          domain = held
          owned = false
          failure = null
          return
        }
        if (disposed) return
        await settle(REOPEN_INTERVAL_MS)
      }
    }
    failure = `the domain name ${DOMAIN_NAME} stayed taken by another generation`
  }

  function warm() {
    if (disposed || domain !== null) return
    const facility = ctx.get('storageDomain') as DshStorageDomainFacility | undefined
    if (facility === undefined || facility === null || typeof facility.open !== 'function') {
      missing = true
      return
    }
    missing = false
    if (pending !== null) return
    pending = open(facility).catch((error: unknown) => {
      // A rejected open is the store's own failure: recorded here, and reported
      // by every read and write that finds it.
      failure = failureText(error)
    })
  }

  function read(sessionId: string): SubagentSelectionRead {
    warm()
    if (missing) return { kind: 'unavailable', detail: 'the host provides no storage domain service', permanent: true }
    if (failure !== null) return { kind: 'unavailable', detail: failure, permanent: false }
    const store = table()
    if (store === null) {
      if (failure !== null) return { kind: 'unavailable', detail: failure, permanent: false }
      // The open is in flight: a rule that cannot see the record says so
      // rather than treating the session as unchosen.
      return { kind: 'unavailable', detail: 'the selection store is still opening', permanent: false }
    }
    const routes = routesOf(store.get(sessionId))
    return routes.length === 0 ? { kind: 'none' } : { kind: 'routes', routes }
  }

  async function write(sessionId: string, routes: readonly SubagentModelRoute[]): Promise<void> {
    warm()
    if (missing) throw new Error('the host provides no storage domain service')
    if (pending !== null) await pending
    if (failure !== null) throw new Error(failure)
    const store = table()
    if (store === null) throw new Error(failure ?? 'the selection store is not open')
    if (routes.length === 0) {
      await store.delete(sessionId)
      return
    }
    await store.put(sessionId, { routes: routes.map((route) => ({ provider: route.provider, model: route.model })) })
  }

  function dispose() {
    disposed = true
    if (domain === null || !owned) return
    const handle = domain
    domain = null
    owned = false
    // A close that fails has nothing left to protect: the process either ends
    // with the handle, or the facility's own unmount closes it.
    void handle.close().catch((error: unknown) => {
      log?.warn?.(`dsh-deepcraft: the subagent selection store did not close: ${failureText(error)}`)
    })
  }

  return { read, write, warm, dispose }
}
