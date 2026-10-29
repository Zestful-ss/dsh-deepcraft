import type { IncomingMessage, ServerResponse } from 'node:http'

/**
 * What the host half reads off the DSH plugin context (D73).
 *
 * The half runs inside DSH's loader, which hands it a context object; DSH ships
 * no types for it, so this file declares the members the half actually touches,
 * with the meaning the half gives them. Reading by name (`get`) is lenient: a
 * host that does not provide a service answers `undefined`, and each reader
 * decides what that means (D12).
 */

/** One host plugin context, as the half reads it. */
export interface DshContext {
  /** A service by name; `undefined` when the host does not provide it. */
  get(name: string): any
  /** Wait for services and hand back a scope that declares them. */
  inject?(deps: string[], run: (scope: DshScope) => void): void
  /**
   * Subscribe one host event; the well-known sessions events are global, so a
   * session started by another page is heard here too.
   *
   * @returns the unsubscribe, where the host answers one.
   */
  on?(name: string, listener: (...args: unknown[]) => void, options?: { global?: boolean }): unknown
  /** The host's logger, when it has one. */
  logger?: { warn?(message: string): void, info?(message: string): void, error?(message: string): void }
  /** Run a function and drop its disposals with this generation. */
  effect?(run: () => void): void
  /** The loader fiber, which carries the entry that mounted this half. */
  fiber?: { entry?: { id?: unknown, options?: unknown } }
}

/** One session's header, as the half reads a session it was handed. */
export interface DshSessionHeader {
  readonly id?: string
  /** The session this one was delegated from; only a subagent's header carries it. */
  readonly parentSession?: string
  readonly origin?: string
}

/** One live session, as far as the half reads it: its durable identity, and nothing it computes. */
export interface DshSession {
  readonly header?: DshSessionHeader
}

/** The sessions service, as the half reads it. */
export interface DshSessions {
  list(): unknown[]
  /** One attached session by id; `undefined` for an id this host process has not opened. */
  get?(id: string): DshSession | undefined
}
/**
 * The host's llm runtime (`ctx.get('llm')`), as the half reads it: the catalog
 * and the resolver the official `subagent` tool's own validation shares. The
 * resolved model info narrows at the reader — the shape this half needs is
 * `reasoning.efforts` with the `id`s `resolveCallConfig` accepts.
 */
export interface DshLlm {
  /** The provider ids this host serves. */
  listProviders(): Promise<unknown>
  /** The models one provider serves. */
  listModels(providerId: string): Promise<unknown>
  /** One model's descriptor, including its reasoning ladder when it declares one; rejects for an id the catalog lacks. */
  resolveModelInfo(provider: string, model: string, signal?: AbortSignal): Promise<unknown>
  /** The call config one provider/model/effort resolves to; rejects for an effort the model does not declare. */
  resolveCallConfig(config: { provider: string, model: string, reasoningEffort?: string }, signal?: AbortSignal): Promise<unknown>
}

/**
 * The session projection registry, as the half reads it: one host-only value
 * per session, folded from that session's own log and keyed by the session
 * object rather than its id, so a stored session answers nothing until the host
 * has attached it.
 */
export interface DshSessionProjections {
  stateOf(session: unknown, key: string): unknown
}

/** One table of a storage domain: synchronous reads from the domain's own state, durable writes. */
export interface DshStorageTable {
  get(key: string): unknown
  put(key: string, value: unknown): Promise<void>
  delete(key: string): Promise<boolean>
}

/** One open storage domain. */
export interface DshStorageDomain {
  table(name: string): DshStorageTable
  close(): Promise<void>
}

/**
 * The host's domain form (`storageDomain`). `open` validates and loads every
 * stored record, so it is asynchronous; a name already open in this process is
 * refused, and `get` answers the handle that holds it.
 */
export interface DshStorageDomainFacility {
  open(spec: unknown): Promise<DshStorageDomain>
  get(name: string): DshStorageDomain | undefined
}

/** The scope `inject` hands back: the base context plus the declared services. */
export interface DshScope extends DshContext {
  webServer?: DshWebServer
  settings?: DshSettings
  sessions?: DshSessions
  /** Run a function and drop it with this generation, naming it in the host's log. */
  effect(run: () => void, name?: string): void
}

/**
 * One host session observation, as the half reads it.
 *
 * The host's `sessionQuery.observeSession` answers a live or stored log without
 * the corpus listing its `readSession` preflights, which is what a per-session
 * read over the whole history can afford. The value is a lease released through
 * the well-known symbol: until it is released a stored log stays pinned in the
 * host's prepared-session cache, whose entries an unreleased observation keeps
 * out of eviction. `events` is the host's own frozen array, read in place and
 * never written to.
 */
export interface DshSessionObservation {
  readonly events: readonly unknown[]
  /** Release the lease (`Symbol.dispose`). */
  dispose(): void
}

/** The host's settings domain, as the half configures it. */
interface DshSettings {
  configure(options: { auto?: boolean }, fiber?: unknown): unknown
}

/** The host's web server service, as the half registers routes on it. */
interface DshWebServer {
  /** Register one route; a path another plugin holds is refused by throwing, and the answer disposes it. */
  register(options: DshRoute): unknown
}

/** One route registration: the path it answers, how paths match, and its handler. */
export interface DshRoute {
  path: string
  /** `prefix` matches every path under `path`; a route without it matches the path alone. */
  kind?: string
  handler: (req: DshRequest, res: DshResponse) => void
}

/** The request the host's web server hands a route handler: Node's own. */
export type DshRequest = IncomingMessage

/** The response the host's web server hands a route handler: Node's own. */
export type DshResponse = ServerResponse
