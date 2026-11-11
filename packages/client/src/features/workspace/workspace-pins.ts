import * as React from 'react'
import * as primitives from '@deepseek-ai/dsh-client-ui-primitives'
import * as reactDom from 'react-dom/client'
import type { StateDotState } from '@deepseek-ai/dsh-client-ui-primitives'
import { currentSessionId, findSidebarRoot, hostContextMenus, hostLocale, hostSessions, hostUiSession, hostUiWorkspace, hostWorkspaces, watchWorkspaceRegion } from '@dsh-deepcraft/engine/host'
import { removeStrayNodes } from '../../shared/popover'
import { workspaceTitles } from '../../shared/openable-sessions'
import type { HostContextMenusService, HostSessionListSnapshot, HostSessionStatus, HostSessionStatusSnapshot, HostSessionSummary, HostSessionsService, HostUiSessionService, HostWorkspacesService } from '@dsh-deepcraft/contracts/services'
import type { HostContext, HostValue } from '@dsh-deepcraft/engine/host'
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
 * It reads the two client lists (`workspaces.list` and `sessions.list`), the
 * live status map and the selection; each tick asks the scheduler for a pass.
 * Archived conversations and subagent children do not belong here, and the
 * block leaves while the host's search results or the collapsed rail show.
 */

/** The host's translate seat for the workspace namespace. */
type WorkspaceText = (key: string, params?: Record<string, string | number>) => string

/** One status line the row carries: its dot's state and its accessible words. */
interface PinStatus {
  state: StateDotState
  label: string
}

/** One pinned row as the section draws it. */
interface PinnedRow {
  id: string
  title: string
  workspace: string
  statuses: PinStatus[]
}

/** One session's statuses, in the host's own precedence (waiting, running, unread, idle). */
function statusesOf(
  summary: HostSessionSummary,
  status: HostSessionStatus | undefined,
  subagentsRunning: number,
  t: WorkspaceText,
): PinStatus[] {
  const subagents: PinStatus | undefined = subagentsRunning === 0
    ? undefined
    : { state: 'ongoing', label: t(subagentsRunning === 1 ? 'status.subagentsRunning.one' : 'status.subagentsRunning.other', { n: subagentsRunning }) }
  const pendingKind = (status?.pendingInteraction as { kind?: unknown } | undefined)?.kind
  let pending: PinStatus | undefined
  if (pendingKind === 'approval') pending = { state: 'warning', label: t('status.waitingApproval') }
  else if (pendingKind === 'plan-review') pending = { state: 'warning', label: t('status.planReview') }
  else if (pendingKind === 'question') pending = { state: 'warning', label: t('status.waitingAnswer') }
  if (pending !== undefined) return subagents === undefined ? [pending] : [pending, subagents]
  const running = status?.running ?? summary.running
  if (running === true) {
    const primary: PinStatus = { state: 'ongoing', label: t('status.running') }
    return subagents === undefined ? [primary] : [primary, subagents]
  }
  if (subagents !== undefined) return [subagents]
  if (status?.completionUnread === true) return [{ state: 'done', label: t('status.completed') }]
  return [{ state: 'idle', label: t('status.idle') }]
}

export function install(ctx: HostContext, ui: FeatureUi<typeof manifest>) {
  const region = watchWorkspaceRegion()
  /** The skin's own block, and the React root drawing its rows. */
  let block: HTMLElement | null = null
  let root: reactDom.Root | null = null
  /** What the last render drew; a tick that changes none of it costs no React commit. */
  let rendered: string | null = null
  /** The services the section reads, once each has mounted. */
  let workspaces: HostWorkspacesService | null = null
  let sessions: HostSessionsService | null = null
  let uiSession: HostUiSessionService | null = null
  let menus: HostContextMenusService | null = null
  let shell: HostValue = null
  /** The host's list subscriptions, each taken once per service. */
  let stopped: (() => void)[] = []
  let disposed = false

  /** Ask for a pass when a host source changes. */
  function schedule() {
    ui.schedule?.()
  }

  /** Follow every source the section reads, once each has mounted. */
  function watch() {
    const nextWorkspaces = hostWorkspaces(ctx)
    const nextSessions = hostSessions(ctx)
    const nextUiSession = hostUiSession(ctx)
    if (workspaces === null && nextWorkspaces !== null && nextWorkspaces.list !== undefined) {
      workspaces = nextWorkspaces
      stopped.push(nextWorkspaces.list.subscribe(schedule))
    }
    if (sessions === null && nextSessions !== null && nextSessions.list !== undefined) {
      sessions = nextSessions
      stopped.push(nextSessions.list.subscribe(schedule))
    }
    if (uiSession === null && nextUiSession !== null) {
      uiSession = nextUiSession
      if (nextUiSession.current?.subscribe !== undefined) stopped.push(nextUiSession.current.subscribe(schedule))
      if (nextUiSession.sessionStatus !== undefined) stopped.push(nextUiSession.sessionStatus.subscribe(schedule))
    }
    if (menus === null) {
      const nextMenus = hostContextMenus(ctx)
      if (nextMenus !== null) {
        menus = nextMenus
        stopped.push(nextMenus.active.subscribe(schedule))
      }
    }
    if (shell === null) shell = hostUiWorkspace(ctx)
    return workspaces !== null && sessions !== null && menus !== null && shell !== null && shell !== undefined
  }

  /** The host's own live status map, or null while it is unreachable. */
  function statusSnapshot(): HostSessionStatusSnapshot | null {
    const service = uiSession ?? hostUiSession(ctx)
    if (service === null || service.sessionStatus === undefined) return null
    return service.sessionStatus.getSnapshot()
  }

  /** How many direct subagents of `id` run right now. */
  function runningSubagents(id: string, list: HostSessionListSnapshot, statuses: HostSessionStatusSnapshot | null) {
    const catalog = list.projectionsBySession[id]?.values?.subagentCatalog
    if (!Array.isArray(catalog)) return 0
    let count = 0
    for (let i = 0; i < catalog.length; i++) {
      const child = catalog[i] as { id?: unknown }
      if (typeof child.id !== 'string') continue
      const live = statuses?.get(child.id)?.running
      if ((live ?? list.byId[child.id]?.running) === true) count++
    }
    return count
  }

  /** Gather the pinned rows from the two host lists. */
  function gather(): PinnedRow[] | null {
    const followed = workspaces
    const followedSessions = sessions
    if (followed === null || followedSessions === null) return null
    const snapshot = followed.list.getSnapshot()
    const list = followedSessions.list.getSnapshot()
    if (snapshot.phase !== 'ready' || list.phase !== 'ready') return null
    const pinned = snapshot.pinnedSessionIds
    if (!Array.isArray(pinned) || pinned.length === 0) return []
    const archived = new Set(snapshot.archivedSessionIds)
    const titles = workspaceTitles(snapshot)
    const statuses = statusSnapshot()
    const locale = hostLocale(ctx)
    if (locale === null) return []
    const t: WorkspaceText = locale.bind('workspace')
    const rows: PinnedRow[] = []
    for (let i = 0; i < pinned.length; i++) {
      const id = pinned[i]
      const summary = list.byId[id]
      if (summary === undefined || summary.blank === true || summary.origin === 'subagent' || archived.has(id)) continue
      rows.push({
        id,
        title: summary.displayTitle,
        workspace: titles[id] || '',
        statuses: statusesOf(summary, statuses?.get(id), runningSubagents(id, list, statuses), t),
      })
    }
    return rows
  }

  /** The open menu's target, when it names one of these rows. */
  function menuOpenFor(id: string) {
    const active = menus?.active.getSnapshot()
    return active !== null && active !== undefined && active.kind === 'session' && (active.value as { sessionId?: unknown }).sessionId === id
  }

  /** Open the host's own session menu, whose actions stay the host's. */
  function openMenu(id: string, title: string, point: { x: number, y: number }) {
    if (menus === null) return
    menus.open({ kind: 'session', value: { sessionId: id, displayTitle: title } }, point)
  }

  /** The host's own durable title for the row's menu target. */
  function durableTitle(id: string) {
    return sessions?.list.getSnapshot().byId[id]?.title?.trim() ?? ''
  }

  /** One row: the conversation button, its status and its menu button. */
  function rowElement(item: PinnedRow, current: string | null | undefined) {
    const title = durableTitle(item.id)
    const open = () => shell.openSession(item.id)
    const showMenu = (point: { x: number, y: number }) => openMenu(item.id, title, point)
    return React.createElement('div', {
      key: item.id,
      className: 'dsh-deepcraft-pin-row',
      role: 'button',
      tabIndex: 0,
      'data-session-id': item.id,
      'aria-current': current === item.id ? 'true' : undefined,
      onClick: open,
      onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
        if (event.target !== event.currentTarget) return
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          open()
        } else if (event.key === 'ContextMenu' || (event.key === 'F10' && event.shiftKey)) {
          event.preventDefault()
          const rect = event.currentTarget.getBoundingClientRect()
          showMenu({ x: rect.left, y: rect.bottom })
        }
      },
      onContextMenu(event: React.MouseEvent<HTMLDivElement>) {
        event.preventDefault()
        showMenu({ x: event.clientX, y: event.clientY })
      },
    },
    React.createElement('span', { className: 'dsh-deepcraft-pin-status' },
      React.createElement(primitives.StateDot, { state: item.statuses[0].state }),
      item.statuses.map(status => React.createElement('span', { key: status.label, className: 'dsh-deepcraft-pin-sr' }, status.label))),
    React.createElement('span', { className: 'dsh-deepcraft-pin-title' }, item.title),
    item.workspace === '' ? null : React.createElement('span', { className: 'dsh-deepcraft-pin-workspace' }, item.workspace),
    React.createElement('button', {
      type: 'button',
      className: 'dsh-deepcraft-pin-menu',
      'aria-label': copy('pinsMenu', { title: item.title }),
      'aria-haspopup': 'menu',
      'aria-expanded': menuOpenFor(item.id) ? 'true' : 'false',
      'data-context-menu-trigger': '',
      title: copy('pinsMenu', { title: item.title }),
      onClick(event: React.MouseEvent<HTMLButtonElement>) {
        event.stopPropagation()
        const rect = event.currentTarget.getBoundingClientRect()
        showMenu({ x: rect.left, y: rect.bottom })
      },
    }, React.createElement(primitives.IconEllipsisOutlineRegular, { size: 14 })))
  }

  /** Draw the block's rows, if anything about them changed. */
  function render(rows: PinnedRow[], tree: HTMLElement) {
    const current = sessions === null ? null : currentSessionId(ctx, sessions)
    const signature = JSON.stringify({
      rows,
      current,
      open: rows.map(item => menuOpenFor(item.id)),
    })
    if (signature === rendered && block !== null && block.parentElement === tree.parentElement) return
    if (block === null || block.parentElement !== tree.parentElement) {
      if (root !== null) root.unmount()
      root = null
      if (block !== null && block.parentElement !== null) block.parentElement.removeChild(block)
      block = document.createElement('div')
      block.className = 'dsh-deepcraft-pin-block'
      tree.parentElement?.insertBefore(block, tree)
      root = reactDom.createRoot(block)
    }
    rendered = signature
    root?.render(React.createElement('section', {
      className: 'dsh-deepcraft-pin-section',
      'data-dsh-deepcraft-pins': '',
    },
    React.createElement('div', { className: 'dsh-deepcraft-pin-heading' }, copy('pinsTitle')),
    React.createElement('div', { className: 'dsh-deepcraft-pin-list', role: 'group', 'aria-label': copy('pinsTitle') },
      rows.map(item => rowElement(item, current)))))
  }

  /** Remove the block and its React root. */
  function drop() {
    if (root !== null) root.unmount()
    root = null
    if (block !== null && block.parentElement !== null) block.parentElement.removeChild(block)
    block = null
    rendered = null
  }

  function sync() {
    if (disposed) return
    const label = region.findLabel()
    if (label === null) {
      drop()
      return
    }
    const header = label.parentElement
    const section = header?.parentElement
    if (header === null || section === null || section === undefined) {
      drop()
      return
    }
    // The host's search results replace the tree's subject; the aggregate
    // speaks for the live grouped list alone.
    if ((header.querySelector('input')?.value ?? '').trim() !== '') {
      drop()
      return
    }
    if (!watch()) {
      drop()
      return
    }
    const tree = region.findTree(label)
    if (tree === null || tree.parentElement !== section) {
      drop()
      return
    }
    const rows = gather()
    if (rows === null || rows.length === 0) {
      drop()
      return
    }
    render(rows, tree)
    const sidebar = findSidebarRoot()
    removeStrayNodes(sidebar ?? document, '.dsh-deepcraft-pin-block', [block])
  }

  ui.workspacePins = { sync }

  return () => {
    disposed = true
    for (let i = 0; i < stopped.length; i++) stopped[i]()
    stopped = []
    drop()
    region.release()
    delete ui.workspacePins
  }
}
