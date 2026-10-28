/**
 * Host half of dsh-deepcraft.
 *
 * The skin's effect is browser-only. This half exists for the things a
 * browser-only plugin cannot do:
 *
 *   1. Serve the model copy document. That table is DATA, not code — it ships
 *      beside the bundle as `model-descriptions.json` and the browser half
 *      fetches it at runtime, so the table grows without a rebuild and the
 *      bundle stays free of copy.
 *   2. Serve the bundled code font (and user-supplied text faces) as webfonts.
 *      The skin's code font stack names 'Anthropic Mono Web' first and
 *      'JetBrains Mono' behind it, and a face renders only when its family
 *      resolves — most systems have never installed either. The JetBrains
 *      files ship in this package (SIL OFL), so the fonts route hands them to
 *      the browser half's @font-face and the code face works with zero system
 *      installs. The Anthropic Sans/Serif/Mono faces are NOT in the npm
 *      package (they remain Anthropic's property), but a user who drops them
 *      into `$DSH_HOME/dsh-deepcraft/fonts/` gets the same zero-install
 *      treatment; a missing file simply 404s and the stack falls back to a
 *      system-installed copy, then to the look-alike faces this package does
 *      ship (Inter, Noto Serif, JetBrains Mono — SIL OFL).
 *   3. Resolve the OS user once for the browser half. The username route answers
 *      a single GET and the browser caches it; it runs the host's own request
 *      fence first — see refusalOf() in routes.ts.
 *   4. Serve Deepy's animation sheets. The DeepSeek brand's pixel whale plays
 *      more sprite sheets than are worth inlining into the bundle, so they ship
 *      as files beside it and the browser fetches each one the first time its
 *      animation plays.
 *   5. Deny a `subagent` call that omits its model pair, or names one outside
 *      the routes the reader picked for the session (or the one the
 *      `subagentModelChoice` preference made mandatory); the rule is in
 *      subagent-choice.ts.
 *   6. Keep those picks: one row per session in the plugin's own storage
 *      domain, read and written through the plugin's own route so the page
 *      never guesses what the host's policy allows (subagent-models/).
 *
 * The registrations are defensive. A host without a web server, or with the
 * route prefix already taken, or with the settings service absent, must still
 * activate the plugin: a failed host fiber also drops the client bundle from
 * the module graph and the whole skin with it. The browser half falls back to
 * its defaults when either surface is missing.
 *
 * The routes live in routes.ts, the HDSL account contract in hdsl.ts, the
 * settings surface in settings.ts, and the subagent rule in subagent-choice.ts;
 * this file only mounts them.
 */
import { PACKAGE_NAME } from '@dsh-deepcraft/contracts/package'
import { createSubagentModelStore } from './subagent-models/store.js'
import { registerRoutes } from './routes.js'
import type { DshContext, DshScope } from '@dsh-deepcraft/engine/node/dsh'
import { registerSettings } from './settings.js'
import { registerSubagentChoice } from './subagent-choice.js'

export const name = PACKAGE_NAME
export { Config } from './settings.js'

/**
 * Register the plugin's host surfaces.
 * @param ctx - host plugin context.
 */
export function apply(ctx: DshContext, config?: unknown) {
  // The reader's picks live in the host's domain form, and both the guard and
  // the route read the same handle; one store per generation owns it, and its
  // teardown is registered with the rest of this half.
  const models = createSubagentModelStore(ctx, ctx.logger)
  if (typeof ctx.effect === 'function') ctx.effect(() => () => models.dispose())
  models.warm()
  // Always register through inject, never on the bare ctx. `ctx.get()` reads a
  // service leniently (no inject declaration needed), but the PROPERTY access
  // inside registerRoutes (`scope.webServer`) is gated by the fiber's inject
  // declaration, and a host half re-applies while the web server is already
  // running (a generation relink after a client-bundle rebuild). inject()
  // waits for the service and hands registerRoutes a scope that HAS the
  // declaration, so both a boot-time apply and a hot relink register. A host
  // without a web server simply waits here, and the skin still activates.
  if (typeof ctx.inject === 'function') ctx.inject(['webServer'], (scope: DshScope) => { registerRoutes(ctx, scope, models) })
  else registerRoutes(ctx, ctx as DshScope, models)

  registerSettings(ctx)
  registerSubagentChoice(ctx, config, models)
}
