/**
 * The host's timing as one table (D3): the orders the skin depends on, what
 * breaks when one stops holding, and the check that holds each of them.
 *
 * The DOM contract (dom.ts, table.ts) says what the host's marks mean; this file
 * says *when* they happen — inside which callback, in which order relative to
 * the skin's own work. These are the assumptions a host upgrade breaks silently:
 * a selector that still matches but fires a frame later leaves the reader with a
 * jitter no smoke case notices.
 *
 * The checks are named rather than described: a scenario of the end-to-end lane
 * (packages/testing/e2e.cjs) or a unit test beside its module. The build refuses an entry
 * that names neither, and the lane refuses a scenario name outside
 * E2E_SCENARIOS, so an assumption cannot enter this table without something that
 * would notice it changing.
 */

/** The end-to-end lane's scenarios; the lane checks its own names against these. */
export const E2E_SCENARIOS = ['conversation', 'hostVisibility', 'tool', 'nativeLayout', 'scroll', 'motion', 'longSession', 'sidebarRail', 'rightbar', 'contract', 'importance', 'remoteSettings', 'customBrand', 'deepcraft', 'petdex', 'palette', 'paletteLegacyClaude', 'paletteLegacyDeepseek', 'dsBot', 'subagentModel', 'workspacePins', 'shots', 'desktopHeader'] as const

/** One timing assumption, and how it is held. */
interface HostTimingEntry {
  /** Stable id; a check names it when it fails. */
  id: string
  /** The order the host works in, as the skin depends on it. */
  assumption: string
  /** What the skin does with that order, and what breaks without it. */
  use: string
  /** Where it is held: `scenario:<name>` of the lane, or a `*.test.ts` path. */
  checks: string[]
}

export const HOST_TIMING: HostTimingEntry[] = [
  {
    id: 'host.native-controls',
    assumption: 'The host renders its own view tabs, sidebar search, account menu and right-panel toggle on the page, and each one acts on its own click.',
    use: 'The skin paints colours and type only, so these controls stay where the host puts them and keep working; the lane compares their boxes with the skin sheet on and off, then presses each one (D81).',
    checks: ['scenario:nativeLayout'],
  },
  {
    id: 'host.rightbar-toggle',
    assumption: 'The host mounts the right panel\u2019s own collapse control only while that panel is expanded.',
    use: 'The lane opens the panel through the host\u2019s expand button and closes it through that control, which the skin neither moves nor replaces.',
    checks: ['scenario:rightbar'],
  },
  {
    id: 'host.composer-right-seat',
    assumption: 'The composer renders its `conversation.input.right` list seat for a bound session, ahead of the model seat, and mounts a registered entry as that session binds.',
    use: 'The subagent model entry stands in that seat so the reader changes one session\u2019s delegation beside the model seat; the slot it registers into is a host declaration, not a DOM shape the skin owns.',
    checks: ['scenario:subagentModel'],
  },
]
