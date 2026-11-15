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

/**
 * One shared write lane (D75): `send` runs after the previous write settles,
 * so two answers never land out of order. A refusal rejects the caller's
 * promise but lets the next write through instead of poisoning the lane, and
 * the lane clears only its own settled promise — comparing the entry against
 * the work promise itself would leave a dead one armed and every read waiting
 * on it forever.
 */
export function createWriteLane() {
  let inFlight: Promise<unknown> | null = null
  return {
    /** Whether a write is still in flight; reads queue behind it. */
    busy(): Promise<unknown> | null {
      return inFlight
    },
    /** Run `send` after the previous write, keeping the caller's promise's own outcome. */
    run<T>(send: () => Promise<T>): Promise<T> {
      const work = (inFlight ?? Promise.resolve()).then(send, send)
      const settled = work.then(() => undefined, () => undefined)
      settled.then(() => {
        if (inFlight === settled) inFlight = null
      })
      inFlight = settled
      return work
    },
  }
}
