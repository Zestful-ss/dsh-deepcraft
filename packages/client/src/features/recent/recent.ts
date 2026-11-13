import * as React from 'react'
import * as primitives from '@deepseek-ai/dsh-client-ui-primitives'
import { installSessionBlock, sessionRows } from '../../shared/session-block'
import type { SessionBlockRow, SessionBlockServices } from '../../shared/session-block'
import type { HostContext } from '@dsh-deepcraft/engine/host'
import type { FeatureUi } from '../../core/feature'
import type manifest from './recent.manifest'
import { confirmDelete } from './confirm'
import { copy } from './copy'
import { selectRecent } from './select'

/**
 * The recent conversations, at the very top of the sidebar (D85).
 *
 * A reader's working set is what they touched today: this block lists the
 * conversations whose last activity is inside the day, newest first, capped so a
 * busy day cannot push the host's own list off the screen. It sits above the
 * pinned aggregate and the host's workspace groups, draws the host's own status
 * dot and menu, and adds the one action the host's row does not offer — deleting
 * the stored conversation, behind a confirmation (features/recent/confirm.ts).
 *
 * The block's mount, subscriptions and drawing are the shared one
 * (packages/client/src/shared/session-block.ts); this module picks the rows,
 * hides the ones the reader deleted, and draws the delete action.
 */

export function install(ctx: HostContext, ui: FeatureUi<typeof manifest>) {
  /** The conversations this page deleted: the host's list drops them once it rescans. */
  const deleted = new Set<string>()

  /** The day's rows, in the order the block draws them. */
  function gather(services: SessionBlockServices): SessionBlockRow[] | null {
    const snapshot = services.workspaces.list.getSnapshot()
    const list = services.sessions.list.getSnapshot()
    for (const id of [...deleted]) if (list.byId[id] === undefined) deleted.delete(id)
    const candidates = list.ids
      .map(id => list.byId[id])
      .filter(summary => summary !== undefined && !deleted.has(summary.id))
    const picked = selectRecent(candidates, new Set(snapshot.archivedSessionIds), Date.now())
    return sessionRows(ctx, services, picked.map(entry => entry.id))
  }

  const block = installSessionBlock(ctx, {
    kind: 'recent',
    heading: copy('recentHeading'),
    menuLabel: (title: string) => copy('recentMenu', { title }),
    place: 'first',
    schedule: () => ui.schedule?.(),
    gather,
    extraActions: row => React.createElement('button', {
      type: 'button',
      className: 'dsh-deepcraft-session-delete',
      'aria-label': copy('deleteSession', { title: row.title }),
      title: copy('deleteSession', { title: row.title }),
      onClick(event: React.MouseEvent<HTMLButtonElement>) {
        event.stopPropagation()
        confirmDelete({
          anchor: event.currentTarget,
          title: row.title,
          sessionId: row.id,
          onDeleted() {
            deleted.add(row.id)
            ui.schedule?.()
          },
        })
      },
    }, React.createElement(primitives.IconTrashOutlineRegular, { size: 14 })),
  })
  ui.recent = { sync: block.sync }
  return () => {
    delete ui.recent
    block.dispose()
  }
}
