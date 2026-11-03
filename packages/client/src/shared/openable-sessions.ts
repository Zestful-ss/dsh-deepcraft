import { hostSessions, hostWorkspaces } from '@dsh-deepcraft/engine/host'
import type { HostContext } from '@dsh-deepcraft/engine/host'
import type { HostSessionSummary, HostWorkspaceListSnapshot } from '@dsh-deepcraft/contracts/services'

/**
 * The sessions a person can open, read from the host's two list services.
 *
 * Two of the skin's surfaces list recent conversations — the search palette's
 * Sessions section and the floating home deck — and both need the host tree's
 * own visibility rule: the session list minus the archived set, the subagent
 * children and the blank placeholders, newest first, each with the workspace
 * title it is filed under.
 */

/** One session a person can open: its own summary and the workspace it is filed under. */
export interface OpenableSession {
  summary: HostSessionSummary
  /** The workspace's title, empty where the workspace list files no title for the session. */
  workspace: string
}

/** Workspace title by session id, from the workspace list's own accounting. */
export function workspaceTitles(snapshot: HostWorkspaceListSnapshot) {
  const titles: Record<string, string> = {}
  for (let i = 0; i < snapshot.items.length; i++) {
    const workspace = snapshot.items[i]
    for (let s = 0; s < workspace.sessionIds.length; s++) {
      if (titles[workspace.sessionIds[s]] === undefined) titles[workspace.sessionIds[s]] = workspace.title
    }
  }
  return titles
}

/**
 * The sessions a person can open, newest first: the host's list minus archived
 * ones, subagent children and blank placeholders.
 *
 * @param ctx - the host context the two list services are read through.
 * @returns one entry per openable session, with the workspace it belongs to
 *     (empty where the workspace list files no title for it).
 */
export function openableSessions(ctx: HostContext) {
  const sessions = hostSessions(ctx)
  const workspaces = hostWorkspaces(ctx)
  const rows: OpenableSession[] = []
  if (!sessions || !workspaces) return rows
  const list = sessions.list.getSnapshot()
  const archive = workspaces.list.getSnapshot()
  const archived = new Set(archive.archivedSessionIds)
  const titles = workspaceTitles(archive)
  for (let i = 0; i < list.ids.length; i++) {
    const summary = list.byId[list.ids[i]]
    if (summary === undefined || summary.blank || summary.origin === 'subagent' || archived.has(summary.id)) continue
    rows.push({ summary, workspace: titles[summary.id] || '' })
  }
  rows.sort((a, b) => b.summary.updatedAt - a.summary.updatedAt)
  return rows
}
