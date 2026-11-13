import * as React from 'react'
import * as primitives from '@deepseek-ai/dsh-client-ui-primitives'
import * as reactDom from 'react-dom/client'
import type { StateDotState } from '@deepseek-ai/dsh-client-ui-primitives'
import { currentSessionId, findSidebarRoot, hostContextMenus, hostLocale, hostSessions, hostUiSession, hostUiWorkspace, hostWorkspaces, watchWorkspaceRegion } from '@dsh-deepcraft/engine/host'
import { removeStrayNodes } from './popover'
import { workspaceTitles } from './openable-sessions'
import type { HostContextMenusService, HostSessionListSnapshot, HostSessionStatus, HostSessionStatusSnapshot, HostSessionSummary, HostSessionsService, HostUiSessionService, HostWorkspacesService } from '@dsh-deepcraft/contracts/services'
import type { HostContext, HostValue } from '@dsh-deepcraft/engine/host'

/**
 * One block of conversation rows in the sidebar, drawn by the skin above the
 * host's own workspace groups (D40, D85). Both readers — the pinned aggregate
 * and the recent one — draw the same list: a status dot, the title, the
 * workspace it lives in and the host's own session menu, mounted as one element
 * before the host's tree. Each supplies only what it selects, where its block
 * stands, and the words its heading and menu carry; the mount, the live
 * subscriptions, the render and the teardown are here once.
 */

/** The host's translate seat for the workspace namespace. */
export type WorkspaceText = (key: string, params?: Record<string, string | number>) => string

/** One status line the row carries: its dot's state and its accessible words. */
export interface RowStatus {
  state: StateDotState
  label: string
}

/** One conversation row as a block draws it. */
export interface SessionBlockRow {
  id: string
  title: string
  workspace: string
  statuses: RowStatus[]
}

/** The host services the block follows, once each has mounted. */
export interface SessionBlockServices {
  workspaces: HostWorkspacesService
  sessions: HostSessionsService
  uiSession: HostUiSessionService | null
  menus: HostContextMenusService
  shell: HostValue
}

/** What one reader supplies to {@link installSessionBlock}. */
export interface SessionBlockOptions {
  /** The block's own name: its section's `data-dsh-deepcraft-session-block` and class suffix. */
  kind: 'pins' | 'recent'
  /** The heading above its rows, and the name its group carries. */
  heading: string
  /** The menu button's accessible name for one row. */
  menuLabel(title: string): string
  /** The rows to draw now, or null while a source the block reads is not ready. */
  gather(services: SessionBlockServices): SessionBlockRow[] | null
  /**
   * Where the block stands among the section's children: `first` above every
   * sibling, `above-tree` right before the host's own list.
   */
  place: 'first' | 'above-tree'
  /**
   * One action of the reader's own, drawn before the host's menu button — the
   * recent block's delete. Absent for a block whose rows only open the host's menu.
   */
  extraActions?(row: SessionBlockRow): React.ReactElement | null
  /** Ask the scheduler for a pass when a host source changes. */
  schedule(): void
}

/** One session's statuses, in the host's own precedence (waiting, running, unread, idle). */
export function statusesOf(
  summary: HostSessionSummary,
  status: HostSessionStatus | undefined,
  subagentsRunning: number,
  t: WorkspaceText,
): RowStatus[] {
  const subagents: RowStatus | undefined = subagentsRunning === 0
    ? undefined
    : { state: 'ongoing', label: t(subagentsRunning === 1 ? 'status.subagentsRunning.one' : 'status.subagentsRunning.other', { n: subagentsRunning }) }
  const interaction = status?.pendingInteraction
  const pendingKind = typeof interaction === 'object' && interaction !== null && 'kind' in interaction ? interaction.kind : undefined
  let pending: RowStatus | undefined
  if (pendingKind === 'approval') pending = { state: 'warning', label: t('status.waitingApproval') }
  else if (pendingKind === 'plan-review') pending = { state: 'warning', label: t('status.planReview') }
  else if (pendingKind === 'question') pending = { state: 'warning', label: t('status.waitingAnswer') }
  if (pending !== undefined) return subagents === undefined ? [pending] : [pending, subagents]
  const running = status?.running ?? summary.running
  if (running === true) {
    const primary: RowStatus = { state: 'ongoing', label: t('status.running') }
    return subagents === undefined ? [primary] : [primary, subagents]
  }
  if (subagents !== undefined) return [subagents]
  if (status?.completionUnread === true) return [{ state: 'done', label: t('status.completed') }]
  return [{ state: 'idle', label: t('status.idle') }]
}

/** How many direct subagents of `id` run right now. */
export function runningSubagents(
  id: string,
  list: HostSessionListSnapshot,
  statuses: HostSessionStatusSnapshot | null,
) {
  const catalog = list.projectionsBySession[id]?.values?.subagentCatalog
  if (!Array.isArray(catalog)) return 0
  let count = 0
  for (let i = 0; i < catalog.length; i++) {
    const child = catalog[i]
    if (typeof child !== 'object' || child === null || !('id' in child) || typeof child.id !== 'string') continue
    const live = statuses?.get(child.id)?.running
    if ((live ?? list.byId[child.id]?.running) === true) count++
  }
  return count
}

/** The host's own live status map, or null while it is unreachable. */
function statusesSnapshot(ctx: HostContext, services: SessionBlockServices): HostSessionStatusSnapshot | null {
  const service = services.uiSession ?? hostUiSession(ctx)
  if (service === null || service.sessionStatus === undefined) return null
  return service.sessionStatus.getSnapshot()
}

/**
 * The rows one block draws for `ids`, in the order given.
 *
 * The block's readers differ only in which conversations they pick: both draw
 * the same row out of the host's two lists — the title, the workspace it lives
 * in and its statuses — and both leave out what the host never prompted, what
 * is archived and what belongs to a subagent.
 *
 * @returns null while either host list has not answered.
 */
export function sessionRows(ctx: HostContext, services: SessionBlockServices, ids: readonly string[]): SessionBlockRow[] | null {
  const snapshot = services.workspaces.list.getSnapshot()
  const list = services.sessions.list.getSnapshot()
  if (snapshot.phase !== 'ready' || list.phase !== 'ready') return null
  const archived = new Set(snapshot.archivedSessionIds)
  const titles = workspaceTitles(snapshot)
  const statuses = statusesSnapshot(ctx, services)
  const locale = hostLocale(ctx)
  if (locale === null) return []
  const t = locale.bind('workspace')
  const rows: SessionBlockRow[] = []
  for (const id of ids) {
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

/** Draw one block and keep it in step with the host until `dispose`. */
export function installSessionBlock(ctx: HostContext, options: SessionBlockOptions) {
  const region = watchWorkspaceRegion()
  const blockClass = `dsh-deepcraft-session-block-${options.kind}`
  /** The skin's own block, and the React root drawing its rows. */
  let block: HTMLElement | null = null
  let root: reactDom.Root | null = null
  /** What the last render drew; a tick that changes none of it costs no React commit. */
  let rendered: string | null = null
  /** The services the block reads, once each has mounted. */
  let services: SessionBlockServices | null = null
  /** The host's list subscription handles, each taken once per service. */
  let stopped: (() => void)[] = []
  let disposed = false

  /** Run the block's own pass, which reads whatever the host lists now hold. */
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
    // The host's search results replace the tree's subject; a block speaks for
    // the live grouped list alone.
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
    const rows = services === null ? null : options.gather(services)
    if (rows === null || rows.length === 0) {
      drop()
      return
    }
    render(rows, tree, section)
    const sidebar = findSidebarRoot()
    removeStrayNodes(sidebar ?? document, `.${blockClass}`, [block])
  }

  /** Follow every source the block reads, once each has mounted. */
  function watch() {
    if (services === null) {
      const workspaces = hostWorkspaces(ctx)
      const sessions = hostSessions(ctx)
      const menus = hostContextMenus(ctx)
      const shell = hostUiWorkspace(ctx)
      if (workspaces === null || workspaces.list === undefined) return false
      if (sessions === null || sessions.list === undefined) return false
      if (menus === null || shell === null || shell === undefined) return false
      services = { workspaces, sessions, uiSession: hostUiSession(ctx), menus, shell }
      stopped.push(workspaces.list.subscribe(options.schedule))
      stopped.push(sessions.list.subscribe(options.schedule))
      if (services.uiSession?.current?.subscribe !== undefined) stopped.push(services.uiSession.current.subscribe(options.schedule))
      if (services.uiSession?.sessionStatus !== undefined) stopped.push(services.uiSession.sessionStatus.subscribe(options.schedule))
      stopped.push(menus.active.subscribe(options.schedule))
    } else {
      // A service can mount after the block: one that arrived late is taken on
      // the next pass rather than waited for.
      const uiSession = services.uiSession ?? hostUiSession(ctx)
      if (uiSession !== null && uiSession !== services.uiSession) {
        services.uiSession = uiSession
        if (uiSession.current?.subscribe !== undefined) stopped.push(uiSession.current.subscribe(options.schedule))
        if (uiSession.sessionStatus !== undefined) stopped.push(uiSession.sessionStatus.subscribe(options.schedule))
      }
    }
    return true
  }

  /** The open menu's target, when it names one of these rows. */
  function menuOpenFor(id: string) {
    const active = services?.menus.active.getSnapshot()
    if (active === null || active === undefined || active.kind !== 'session') return false
    const value = active.value
    return typeof value === 'object' && value !== null && 'sessionId' in value && value.sessionId === id
  }

  /** Open the host's own session menu, whose actions stay the host's. */
  function openMenu(id: string, title: string, point: { x: number, y: number }) {
    services?.menus.open({ kind: 'session', value: { sessionId: id, displayTitle: title } }, point)
  }

  /** The host's own durable title for the row's menu target. */
  function durableTitle(id: string) {
    return services?.sessions.list.getSnapshot().byId[id]?.title?.trim() ?? ''
  }

  /** One row: the conversation button, its status and its menu button. */
  function rowElement(item: SessionBlockRow, current: string | null | undefined) {
    const title = durableTitle(item.id)
    const open = () => services?.shell?.openSession(item.id)
    const showMenu = (point: { x: number, y: number }) => openMenu(item.id, title, point)
    return React.createElement('div', {
      key: item.id,
      className: 'dsh-deepcraft-session-row',
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
    React.createElement('span', { className: 'dsh-deepcraft-session-status' },
      React.createElement(primitives.StateDot, { state: item.statuses[0].state }),
      item.statuses.map(status => React.createElement('span', { key: status.label, className: 'dsh-deepcraft-session-sr' }, status.label))),
    React.createElement('span', { className: 'dsh-deepcraft-session-title' }, item.title),
    item.workspace === '' ? null : React.createElement('span', { className: 'dsh-deepcraft-session-workspace' }, item.workspace),
    options.extraActions === undefined ? null : options.extraActions(item),
    React.createElement('button', {
      type: 'button',
      className: 'dsh-deepcraft-session-menu',
      'aria-label': options.menuLabel(item.title),
      'aria-haspopup': 'menu',
      'aria-expanded': menuOpenFor(item.id) ? 'true' : 'false',
      'data-context-menu-trigger': '',
      title: options.menuLabel(item.title),
      onClick(event: React.MouseEvent<HTMLButtonElement>) {
        event.stopPropagation()
        const rect = event.currentTarget.getBoundingClientRect()
        showMenu({ x: rect.left, y: rect.bottom })
      },
    }, React.createElement(primitives.IconEllipsisOutlineRegular, { size: 14 })))
  }

  /** Draw the block's rows, if anything about them changed. */
  function render(rows: SessionBlockRow[], tree: HTMLElement, section: HTMLElement) {
    const current = services === null ? null : currentSessionId(ctx, services.sessions)
    const signature = JSON.stringify({
      rows,
      current,
      open: rows.map(item => menuOpenFor(item.id)),
    })
    if (signature === rendered && block !== null && block.parentElement === section) return
    if (block === null || block.parentElement !== section) {
      if (root !== null) root.unmount()
      root = null
      if (block !== null && block.parentElement !== null) block.parentElement.removeChild(block)
      block = document.createElement('div')
      block.className = `${blockClass} dsh-deepcraft-session-block`
      // The pointer over the block scrolls the block: the host's list is the
      // block's own ancestor here, so without this the wheel reaches it first
      // and the rows under the pointer stay put. At either end of the block's
      // list the event is left alone and the host's list takes it as usual.
      block.addEventListener('wheel', (event) => {
        const list = block?.querySelector('.dsh-deepcraft-session-list')
        if (!(list instanceof HTMLElement)) return
        const room = list.scrollHeight - list.clientHeight
        if (room <= 0) return
        if ((event.deltaY < 0 && list.scrollTop <= 0) || (event.deltaY > 0 && list.scrollTop >= room)) return
        list.scrollTop += event.deltaY
        event.preventDefault()
      }, { passive: false })
      if (options.place === 'first') section.insertBefore(block, section.firstElementChild)
      else section.insertBefore(block, tree)
      root = reactDom.createRoot(block)
    }
    rendered = signature
    root?.render(React.createElement('section', {
      className: 'dsh-deepcraft-session-section',
      'data-dsh-deepcraft-session-block': options.kind,
    },
    React.createElement('div', { className: 'dsh-deepcraft-session-heading' }, options.heading),
    React.createElement('div', { className: 'dsh-deepcraft-session-list', role: 'group', 'aria-label': options.heading },
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

  return {
    sync,
    dispose() {
      disposed = true
      for (let i = 0; i < stopped.length; i++) stopped[i]()
      stopped = []
      drop()
      region.release()
    },
  }
}
