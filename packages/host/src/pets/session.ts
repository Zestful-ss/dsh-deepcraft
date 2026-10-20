/**
 * The host's subscription to DSH session events (D78). It lives in the host
 * process, so a minimized page does not pause it: the desktop player keeps
 * following turns while the window is in the background.
 */
import type { DshContext } from '@dsh-deepcraft/engine/node/dsh'
import { desktopPetBridge } from './desktop.js'
import type { PetEventLike, PetSessionLike } from './normalize.js'

/** A value as one of the two shapes the normalizer reads, after the object check. */
function asSession(value: unknown): PetSessionLike | null {
  return value !== null && typeof value === 'object' ? value as PetSessionLike : null
}

function asEvent(value: unknown): PetEventLike {
  return value !== null && typeof value === 'object' ? value as PetEventLike : {}
}

/**
 * Subscribe the desktop player's bridge to the sessions service. The service
 * is optional: a host without one keeps the skin and the chat pet, and the
 * desktop player simply receives no events.
 *
 * @param ctx - host plugin context.
 */
export function installSessionBridge(ctx: DshContext) {
  if (typeof ctx.inject !== 'function') return
  ctx.inject(['sessions'], (scope) => {
    const sessions = scope.sessions
    if (sessions === undefined || sessions === null || typeof sessions.list !== 'function') return
    const bridge = desktopPetBridge()
    if (bridge === null) return
    const on = scope.on
    if (typeof on !== 'function') return
    try {
      for (const session of sessions.list()) bridge.onCreated(asSession(session))
    } catch {
      // A list that cannot be read leaves the live subscription below; the
      // first event still brings its own session.
    }
    const offs = [
      on('session/created', session => bridge.onCreated(asSession(session)), { global: true }),
      on('session/disposed', session => bridge.onDisposed(asSession(session)), { global: true }),
      on('session/event', (session, event) => {
        const source = asSession(session)
        if (source !== null) bridge.onEvent(source, asEvent(event))
      }, { global: true }),
    ]
    scope.effect(() => () => {
      for (const off of offs) if (typeof off === 'function') off()
    }, 'dsh-deepcraft: session bridge')
  })
}
