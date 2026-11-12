/**
 * One request against the host half's status-and-change routes (the brand
 * images, the wallpaper): the answer is a JSON document with `ok`, and a
 * refusal rejects with the reason it gave rather than a bare status.
 */

/** The shape every changing answer carries: `ok: true` and the state, or `ok: false` and a reason. */
type Answer = { ok: true } | { ok: false, error?: string }

/** One status read: the JSON document, or a rejection carrying the status. */
export function readJson<A>(route: string): Promise<A> {
  return fetch(route, { credentials: 'same-origin', headers: { accept: 'application/json' } })
    .then(response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return response.json()
    })
}

/**
 * One changing request: parse the JSON answer and reject with the reason it
 * carries (or the status, when the route answered no document at all).
 */
export function changeJson<A extends Answer>(route: string, init: RequestInit): Promise<A> {
  return fetch(route, { ...init, credentials: 'same-origin' })
    .then(response => response.json().then((answer: A) => {
      if (answer.ok !== true) throw new Error(answer.error ?? `HTTP ${response.status}`)
      return answer
    }))
}
