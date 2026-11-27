import { SESSION_DELETE_ROUTE } from '../../constants'

/**
 * Deleting one stored conversation (D85).
 *
 * The harness gives the browser half no deletion API of its own, so the plugin's
 * host half removes the stored session directory for one id and drops the id
 * from the workspace registry's archive set (packages/host/src/routes.ts). A
 * conversation the host still holds open is refused with `open`: the reader
 * closes it first, so no running turn loses its store.
 */

/** What one deletion answered. */
export type DeleteOutcome = { kind: 'deleted', ghost: boolean } | { kind: 'open' }

/**
 * Delete one conversation's stored record.
 *
 * @param sessionId - the conversation's id.
 * @returns `deleted` with whether only the registry entry was left (`ghost`), or
 *     `open` while the host still holds the conversation.
 */
export async function deleteSession(sessionId: string): Promise<DeleteOutcome> {
  const response = await fetch(SESSION_DELETE_ROUTE, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ sessionId }),
  })
  if (response.status === 409) return { kind: 'open' }
  const answer: unknown = await response.json().catch(() => null)
  const isObject = typeof answer === 'object' && answer !== null
  const ok = isObject && 'ok' in answer ? answer.ok : undefined
  if (!response.ok || ok !== true) {
    const reason = isObject && 'error' in answer ? answer.error : undefined
    if (typeof reason === 'string') throw new Error(reason)
    throw new Error(deleteFailureStatus(response.status))
  }
  return { kind: 'deleted', ghost: isObject && 'ghost' in answer && answer.ghost === true }
}

/**
 * Why one deletion failed, for the answers that carry no reason of their own.
 *
 * The route speaks JSON in every outcome it produces, so a 405 or 404 reaches
 * the browser half only when the host's own static fallback answered instead:
 * the plugin's host half never came up in this process, which a live plugin
 * update can leave behind. The bare status means nothing to the reader, so
 * the copy names the restart instead.
 */
export function deleteFailureStatus(status: number): string {
  if (status === 404 || status === 405) return 'HOST_NOT_RUNNING'
  return `HTTP ${status}`
}
