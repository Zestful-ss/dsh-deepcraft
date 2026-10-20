/**
 * The desktop player's event queue (D78): DSH session events are normalized
 * once, the latest projection per root session is kept as a snapshot, and
 * only the projections the player can use now are delivered.
 *
 * The queue, the per-root coalescing, the critical-event preference and the
 * 300 ms request timeout are Petdex's own DSH bridge (MIT, Copyright (c) 2026
 * Crafter Station). The snapshot replay is this plugin's:
 * the desktop player owns a fixed port and is briefly restarted when the
 * theme's pet changes, so the state already accepted has to survive that gap.
 */
import {
  PET_REPLAY_MAX_SNAPSHOTS,
  PET_REPLAY_TERMINAL_MS,
} from '@dsh-deepcraft/contracts/pets'
import { createNormalizer } from './normalize.js'
import type { PetEventLike, PetProjection, PetSessionLike } from './normalize.js'

/** The player's fixed loopback address; the port and the protocol are the official ones. */
export const HOOK_SERVER = 'http://127.0.0.1:7777'
/** The header the player authenticates state and bubble writes with. */
export const HOOK_TOKEN_HEADER = 'x-petdex-update-token'
/** The integration version reported in the bubble payload. */
const INTEGRATION_VERSION = '0.1.0'
/** Most projections queued before one is dropped; critical ones outrank the rest. */
const MAX_PENDING = 64
/** How long one delivery may take before it is abandoned. */
const REQUEST_TIMEOUT_MS = 300

/** One HTTP write to the player, ready to send once a token is known. */
export interface HookRequest {
  path: string
  headers: Record<string, string>
  body: Record<string, unknown>
}

/** What the bridge calls to deliver one projection; a rejection is reported no further. */
export type ProjectionDelivery = (projection: PetProjection) => Promise<void>

/** Whether a projection carries the end of a turn or an approval the reader must answer. */
function isCritical(projection: PetProjection) {
  return projection.kind.startsWith('intervention.') ||
    projection.kind === 'turn.completed' ||
    projection.kind === 'turn.failed' ||
    projection.kind === 'turn.blocked'
}

/**
 * The two writes the player accepts for one projection: its state and the
 * bubble beside it. The payload layout is the official bridge's.
 */
export function projectionToRequests(projection: PetProjection, token: string): HookRequest[] {
  const headers = { [HOOK_TOKEN_HEADER]: token }
  return [{
    path: '/state',
    headers,
    body: { state: projection.state, agent_source: 'dsh' },
  }, {
    path: '/bubble',
    headers,
    body: {
      text: projection.text,
      title: 'DeepSeek Harness',
      busy: projection.busy,
      agent_source: 'dsh',
      session_id: projection.rootSessionId,
      source_app: 'default_browser',
      integration_version: INTEGRATION_VERSION,
      source_session_id: projection.sourceSessionId,
      source_seq: projection.sourceSeq,
      event_kind: projection.kind,
    },
  }]
}

/** POST one request; a refusal becomes an error the caller may ignore (the player is optional UI). */
export async function postRequest(request: HookRequest) {
  const response = await fetch(`${HOOK_SERVER}${request.path}`, {
    method: 'POST',
    headers: { ...request.headers, 'content-type': 'application/json' },
    body: JSON.stringify(request.body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })
  await response.arrayBuffer().catch(() => undefined)
  if (!response.ok) throw new Error(`Petdex hook answered ${response.status}`)
}

/** The bridge one desktop controller owns. */
export interface PetBridge {
  /** A session appeared; its parent chain is remembered for subagent projection. */
  onCreated(session: PetSessionLike | null | undefined): void
  /** A session is gone; its high-water mark and any approvals it held are dropped. */
  onDisposed(session: PetSessionLike | null | undefined): void
  /** One DSH session event, normalized and queued. */
  onEvent(session: PetSessionLike, event: PetEventLike): void
  /** Drop what has not been delivered yet (a restart replaces the transport). */
  clearPending(): void
  /** Queue the accepted snapshots a restarted player still owes the reader. */
  replay(): void
  /** Stop for good. */
  dispose(): void
  /** Resolves when the queue is empty; the bridge's tests await it. */
  idle(): Promise<void>
}

/**
 * Create one bridge over the normalizer.
 *
 * @param deliver - one projection's delivery; its rejection is swallowed here
 *     because the desktop player is optional UI and must never affect DSH.
 */
export function createBridge(deliver: ProjectionDelivery): PetBridge {
  const normalizer = createNormalizer()
  const pending: PetProjection[] = []
  /** The newest accepted projection per root session, oldest first. */
  const accepted = new Map<string, { projection: PetProjection, at: number }>()
  let draining: Promise<void> | null = null
  let disposed = false

  async function drain() {
    while (pending.length > 0) {
      const projection = pending.shift() as PetProjection
      try {
        await deliver(projection)
      } catch {
        // The player is not running or refused one write: the next projection
        // still gets its turn, and DSH carries on.
      }
    }
  }

  function ensureDrain() {
    if (draining !== null || disposed) return
    draining = drain().finally(() => {
      draining = null
      if (pending.length > 0) ensureDrain()
    })
  }

  function enqueue(projection: PetProjection) {
    if (disposed) return
    if (!isCritical(projection)) {
      for (let index = pending.length - 1; index >= 0; index -= 1) {
        const queued = pending[index]
        if (queued.rootSessionId === projection.rootSessionId && !isCritical(queued)) {
          pending[index] = projection
          ensureDrain()
          return
        }
      }
    }
    if (pending.length >= MAX_PENDING) {
      const replaceable = pending.findIndex(event => !isCritical(event))
      if (replaceable >= 0) pending.splice(replaceable, 1)
      else if (!isCritical(projection)) return
      else pending.shift()
    }
    pending.push(projection)
    ensureDrain()
  }

  /**
   * Queue one snapshot for replay: it replaces a queued ordinary projection
   * of the same root, so the player sees the accepted state once.
   */
  function replayOne(projection: PetProjection) {
    const existing = pending.findIndex(queued => queued.rootSessionId === projection.rootSessionId && !isCritical(queued))
    if (existing >= 0) {
      pending[existing] = projection
      return
    }
    if (pending.length < MAX_PENDING) pending.push(projection)
  }

  function remember(projection: PetProjection) {
    accepted.delete(projection.rootSessionId)
    accepted.set(projection.rootSessionId, { projection, at: Date.now() })
    while (accepted.size > PET_REPLAY_MAX_SNAPSHOTS) {
      const oldest = accepted.keys().next()
      if (oldest.done === true) break
      accepted.delete(oldest.value)
    }
  }

  function onEvent(session: PetSessionLike, event: PetEventLike) {
    try {
      const projection = normalizer.normalize(session, event)
      if (projection === null) return
      remember(projection)
      enqueue(projection)
    } catch {
      // One unreadable event must not break the session it belongs to.
    }
  }

  return {
    onCreated: normalizer.rememberSession,
    onDisposed: normalizer.forgetSession,
    onEvent,
    /** Drop what has not left yet; a restart starts from the snapshots below. */
    clearPending() {
      pending.length = 0
    },
    /**
     * Send the state a restarted player should show without waiting for the
     * next event: work still in progress, or a turn that ended moments ago.
     */
    replay() {
      const now = Date.now()
      for (const { projection, at } of accepted.values()) {
        const terminal = projection.kind === 'turn.completed' ||
          projection.kind === 'turn.failed' ||
          projection.kind === 'turn.blocked'
        if (projection.busy || (terminal && now - at <= PET_REPLAY_TERMINAL_MS)) replayOne(projection)
      }
      ensureDrain()
    },
    dispose() {
      disposed = true
      pending.length = 0
      accepted.clear()
    },
    async idle() {
      while (draining !== null) await draining
    },
  }
}

