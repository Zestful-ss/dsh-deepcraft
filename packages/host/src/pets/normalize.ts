/**
 * The DSH session events projected onto the nine states the official desktop
 * player accepts (D78), ported from Petdex's own DSH integration (MIT,
 * Copyright (c) 2026 Crafter Station) at the revision the desktop release was
 * cut from.
 *
 * Two changes are this plugin's. A pending approval outranks ordinary
 * progress, so a tool step between two open approvals cannot replace
 * `waiting`; and a terminal turn clears the approvals it ends, so the next
 * turn never inherits a stale `waiting`.
 */
import type { PetdexState } from '@dsh-deepcraft/contracts/pets'

/** How deep a subagent's parent chain is followed before it is treated as unresolved. */
const MAX_PARENT_DEPTH = 16

/** The event types that always mean the same thing, and why. */
const FIXED_EVENTS: Readonly<Record<string, readonly [kind: PetKind, state: PetdexState, text: string, busy: boolean]>> = {
  'turn/start': ['turn.started', 'jumping', 'Starting', true],
  'step/start': ['step.started', 'running', 'Working', true],
  'step/end': ['step.completed', 'running', 'Working', true],
  'tool/call': ['tool.started', 'running', 'Using a tool', true],
  'tool/result': ['tool.completed', 'running', 'Working', true],
  'tool-workflow/run-start': ['workflow.started', 'running', 'Workflow running', true],
  'tool-workflow/agent-start': ['workflow.updated', 'running', 'Subagent working', true],
  'tool-workflow/agent-end': ['workflow.updated', 'running', 'Workflow running', true],
  'tool-workflow/run-end': ['workflow.completed', 'running', 'Workflow finished', true],
  'goal/change': ['goal.changed', 'running', 'Goal updated', true],
  'compaction/start': ['compaction.started', 'running', 'Optimizing context', true],
  'compaction/end': ['compaction.completed', 'running', 'Working', true],
}

/** The kinds a projection carries; the terminal ones are replayed after a restart. */
export type PetKind =
  | 'turn.started' | 'turn.completed' | 'turn.failed' | 'turn.blocked'
  | 'step.started' | 'step.completed'
  | 'tool.started' | 'tool.completed'
  | 'workflow.started' | 'workflow.updated' | 'workflow.completed'
  | 'goal.changed'
  | 'compaction.started' | 'compaction.completed'
  | 'intervention.requested' | 'intervention.resolved'
  | 'subagent.updated'

/** One normalized event, exactly what the desktop player is told. */
export interface PetProjection {
  kind: PetKind
  rootSessionId: string
  sourceSessionId: string
  sourceSeq: number
  occurredAt: number
  state: PetdexState
  text: string
  busy: boolean
}

/** The two fields of a session the projection reads. */
export interface PetSessionLike {
  id?: unknown
  header?: { parentSession?: unknown, origin?: unknown }
}

/** The fields of a session event the projection reads. */
export interface PetEventLike {
  type?: unknown
  seq?: unknown
  time?: unknown
  data?: unknown
}

interface SessionInfo {
  parentSession: string | null
  origin: string | null
}

function safeId(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

function approvalId(event: PetEventLike) {
  const data = event.data !== null && typeof event.data === 'object' ? event.data as Record<string, unknown> : {}
  return safeId(data.id) ?? `seq-${String(event.seq)}`
}

export function createNormalizer() {
  const sessions = new Map<string, SessionInfo>()
  const highWater = new Map<string, number>()
  const approvals = new Map<string, Set<string>>()

  function rememberSession(session: PetSessionLike | null | undefined) {
    const id = safeId(session?.id)
    if (id === null) return
    const previous = sessions.get(id)
    sessions.set(id, {
      parentSession: safeId(session?.header?.parentSession) ?? previous?.parentSession ?? null,
      origin: safeId(session?.header?.origin) ?? previous?.origin ?? null,
    })
  }

  function forgetSession(session: PetSessionLike | null | undefined) {
    const id = safeId(session?.id)
    if (id === null) return
    sessions.delete(id)
    highWater.delete(id)
    approvals.delete(id)
  }

  /** The top-level session a source belongs to; null when the chain is broken or too deep. */
  function rootFor(sourceSessionId: string) {
    let current = sourceSessionId
    const seen = new Set([current])
    for (let depth = 0; depth < MAX_PARENT_DEPTH; depth += 1) {
      const info = sessions.get(current)
      if (info?.origin !== 'subagent' || info.parentSession === null) return current
      if (seen.has(info.parentSession)) return null
      current = info.parentSession
      seen.add(current)
    }
    return null
  }

  function baseProjection(session: PetSessionLike | null | undefined, event: PetEventLike) {
    rememberSession(session)
    const sourceSessionId = safeId(session?.id)
    if (sourceSessionId === null || typeof event.seq !== 'number' || !Number.isSafeInteger(event.seq)) return null
    const previousSeq = highWater.get(sourceSessionId)
    if (previousSeq !== undefined && event.seq <= previousSeq) return null
    highWater.set(sourceSessionId, event.seq)
    const rootSessionId = rootFor(sourceSessionId)
    if (rootSessionId === null) return null
    return {
      rootSessionId,
      sourceSessionId,
      sourceSeq: event.seq,
      occurredAt: typeof event.time === 'number' && Number.isFinite(event.time) ? event.time : Date.now(),
    }
  }

  function normalize(session: PetSessionLike | null | undefined, event: PetEventLike | null | undefined): PetProjection | null {
    const type = safeId(event?.type)
    if (type === null || event === null || event === undefined) return null
    const base = baseProjection(session, event)
    if (base === null) return null

    if (type === 'approval/asked') {
      const open = approvals.get(base.rootSessionId) ?? new Set<string>()
      open.add(`${base.sourceSessionId}:${approvalId(event)}`)
      approvals.set(base.rootSessionId, open)
      return { kind: 'intervention.requested', ...base, state: 'waiting', text: 'Needs your attention', busy: true }
    }

    if (type === 'approval/decided') {
      const open = approvals.get(base.rootSessionId) ?? new Set<string>()
      open.delete(`${base.sourceSessionId}:${approvalId(event)}`)
      if (open.size === 0) approvals.delete(base.rootSessionId)
      return {
        kind: open.size === 0 ? 'intervention.resolved' : 'intervention.requested',
        ...base,
        state: open.size === 0 ? 'running' : 'waiting',
        text: open.size === 0 ? 'Working' : 'Needs your attention',
        busy: true,
      }
    }

    if (type === 'turn/end') {
      if (base.sourceSessionId !== base.rootSessionId) {
        return { kind: 'subagent.updated', ...base, state: 'running', text: 'Subagent finished', busy: true }
      }
      approvals.delete(base.rootSessionId)
      const data = event.data !== null && typeof event.data === 'object' ? event.data as Record<string, unknown> : {}
      const reason = data.reason !== null && typeof data.reason === 'object' ? (data.reason as Record<string, unknown>).kind : undefined
      if (reason === 'completed') return { kind: 'turn.completed', ...base, state: 'waving', text: 'Done', busy: false }
      if (reason === 'blocked' || reason === 'max-tokens') {
        return { kind: 'turn.blocked', ...base, state: 'waiting', text: 'Needs your attention', busy: true }
      }
      return { kind: 'turn.failed', ...base, state: 'failed', text: 'Stopped', busy: false }
    }

    // An unresolved approval holds the root at `waiting`; ordinary progress
    // must not paint over the decision the reader is being asked for.
    const open = approvals.get(base.rootSessionId)
    if (open !== undefined && open.size > 0) {
      return { kind: 'intervention.requested', ...base, state: 'waiting', text: 'Needs your attention', busy: true }
    }

    const fixed = FIXED_EVENTS[type]
    if (fixed === undefined) return null
    const [kind, state, text, busy] = fixed
    return { kind, ...base, state, text, busy }
  }

  return { rememberSession, forgetSession, normalize }
}
