import { installSessionBlock, sessionRows } from '../../shared/session-block'
import type { SessionBlockRow, SessionBlockServices } from '../../shared/session-block'
import type { HostContext } from '@dsh-deepcraft/engine/host'
import type { FeatureUi } from '../../core/feature'
import type manifest from './workspace-pins.manifest'
import { copy } from './copy'

/**
 * The pinned conversations, gathered above every workspace.
 *
 * The host keeps one pin set for the whole registry and sorts each workspace's
 * own rows by it, so a pinned conversation lives inside its group. This list is
 * the cross-workspace view of that same set: the host's order (most recently
 * pinned first), each row naming its workspace, opening and acting through the
 * host's own services. The host's rows stay where they are — they carry other
 * plugins' seats and count toward the host's per-group row limit.
 *
 * The block itself — mount, live subscriptions, row drawing, teardown — is the
 * shared one (packages/client/src/shared/session-block.ts); this module only
 * names the pinned ids.
 */

/** The pinned ids, in the host's own order; an empty set draws no block. */
function gather(ctx: HostContext, services: SessionBlockServices): SessionBlockRow[] | null {
  const pinned = services.workspaces.list.getSnapshot().pinnedSessionIds
  if (!Array.isArray(pinned) || pinned.length === 0) return []
  return sessionRows(ctx, services, pinned)
}

export function install(ctx: HostContext, ui: FeatureUi<typeof manifest>) {
  const block = installSessionBlock(ctx, {
    kind: 'pins',
    heading: copy('pinsTitle'),
    menuLabel: (title: string) => copy('pinsMenu', { title }),
    place: 'above-tree',
    schedule: () => ui.schedule?.(),
    gather: services => gather(ctx, services),
  })
  ui.workspacePins = { sync: block.sync }
  return () => {
    delete ui.workspacePins
    block.dispose()
  }
}
