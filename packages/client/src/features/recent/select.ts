/**
 * The recent block's selection: which conversations belong in it, and in what
 * order.
 *
 * "Recent" is the reader's working set: a conversation counts while its last
 * activity is inside the window, newest first, and the block stops at its own
 * limit so a busy day cannot push the host's own list off the screen. Archived
 * conversations, placeholder rows the host never prompted and subagent children
 * never belong here — the block speaks for the conversations the reader opened.
 */

/** How far back the block reaches: one day (D85). */
export const RECENT_WINDOW_MS = 24 * 60 * 60 * 1000

/** The most rows the block draws; the rest stay in the host's own groups. */
export const RECENT_LIMIT = 10

/** The fields the selection reads of one session summary. */
export interface RecentCandidate {
  id: string
  updatedAt: number
  blank?: boolean
  origin?: string
}

/**
 * The rows of the recent block, newest first.
 *
 * @param entries - the host list's summaries, in its own order.
 * @param archived - the ids the workspace list holds as archived.
 * @param now - the clock the window is measured against.
 */
export function selectRecent(entries: readonly RecentCandidate[], archived: ReadonlySet<string>, now: number): RecentCandidate[] {
  const inside = entries.filter((entry) => entry.blank !== true
    && entry.origin !== 'subagent'
    && !archived.has(entry.id)
    && Number.isFinite(entry.updatedAt)
    && now - entry.updatedAt <= RECENT_WINDOW_MS)
  inside.sort((a, b) => b.updatedAt - a.updatedAt)
  return inside.slice(0, RECENT_LIMIT)
}
