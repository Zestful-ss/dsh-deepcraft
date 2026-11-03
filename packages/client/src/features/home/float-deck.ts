import * as React from 'react'
import { findComposerInput, hostUiWorkspace } from '@dsh-deepcraft/engine/host'
import type { HostContext } from '@dsh-deepcraft/engine/host'
import { openableSessions } from '../../shared/openable-sessions'
import type { OpenableSession } from '../../shared/openable-sessions'
import { formatCompactTokens } from '../../shared/format'
import { formatHomeCount, homePanelData } from './data'
import type { HomeUsageState, ListSummary } from './data'
import { copy } from './copy'

/**
 * The floating home deck: the block the float layout draws under the hero's
 * composer card, on the new-conversation page.
 *
 * Three things the page can start, in the order a reader needs them: the
 * conversation he was last in, the one before it (or, with nothing open, the
 * commands and file mentions the composer answers), and the Studio usage panel —
 * plus the week's own roll-up over them, and the recent conversations along the
 * bottom. Every card acts through a host service: a session opens through
 * `uiWorkspace.openSession`, the usage card switches the home layout to Studio,
 * and a card standing in for the composer's own start hands it the keyboard.
 *
 * The numbers come from the same store the Studio panel reads
 * (features/home/data.ts), so the two layouts never disagree about a figure.
 */

/** How the sparkline is drawn: 14 days across 78px, its peak 16px above the baseline. */
const SPARK_DAYS = 14
const SPARK_STEP = 6
const SPARK_HEIGHT = 16
const SPARK_BASE = 18
/** Recent conversations the deck's bottom row lists. */
const RECENT_LIMIT = 3

/** How long ago a conversation last moved, in the shell's own words. */
function relativeAge(at: number) {
  const minutes = Math.floor((Date.now() - at) / 60000)
  if (minutes < 1) return copy('homeTimeJustNow')
  if (minutes < 60) return copy('homeTimeMinutes', { count: minutes })
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return copy('homeTimeHours', { count: hours })
  return copy('homeTimeDays', { count: Math.floor(hours / 24) })
}

/** The line under a session card: the workspace it is filed in, and when it last moved. */
function sessionDetail(entry: OpenableSession) {
  return [entry.workspace, relativeAge(entry.summary.updatedAt)].filter(Boolean).join(' · ')
}

/**
 * The deck's React element.
 *
 * @param ctx - the host context the session list and the workspace navigation
 *     are read through.
 * @param onOpenStudio - switches the home layout to Studio, where the usage
 *     overview and the heat grid live.
 * @returns `view`, which draws the deck from the usage store's snapshot.
 */
export function createHomeFloatDeck(ctx: HostContext, onOpenStudio: () => void) {
  /** One suggestion card: a title and the line under it, the whole card the press target. */
  function suggestionCard(key: string, title: string, detail: string, run: () => void) {
    return React.createElement(
      'button',
      { key, type: 'button', className: 'dsh-deepcraft-home-sugg-card', onClick: run },
      React.createElement('span', { className: 'dsh-deepcraft-home-sugg-title' }, title),
      React.createElement('span', { className: 'dsh-deepcraft-home-sugg-detail' }, detail),
    )
  }

  /**
   * A card that resumes a conversation, or — with none to resume — the card
   * standing in for the composer itself.
   *
   * @param entry - the session to resume, or undefined where there is none.
   * @param resumeTitle - the copy key naming the resume line.
   * @param startTitle - the copy key of the card that stands in for the composer.
   * @param startDetail - the copy key of that card's line.
   */
  function sessionCard(entry: OpenableSession | undefined, resumeTitle: 'homeContinueTitle' | 'homeResumeTitle', startTitle: 'homeContinueFallbackTitle' | 'homeCommandsTitle', startDetail: 'homeContinueFallbackDesc' | 'homeCommandsDesc') {
    if (entry === undefined) return suggestionCard(startTitle, copy(startTitle), copy(startDetail), () => { findComposerInput()?.focus() })
    return suggestionCard(resumeTitle, copy(resumeTitle, { title: entry.summary.displayTitle }), sessionDetail(entry), () => hostUiWorkspace(ctx).openSession(entry.summary.id))
  }

  /** The week's roll-up and its sparkline; both read off the 7d window. */
  function weekLine(state: HomeUsageState, listed: ListSummary | null, bookPick: number) {
    const week = homePanelData(state, listed, '7d', bookPick)
    const cells = week.grid.cells.slice(-SPARK_DAYS)
    let peak = 0
    for (let i = 0; i < cells.length; i++) if (cells[i].tokens > peak) peak = cells[i].tokens
    const points: string[] = []
    for (let i = 0; i < cells.length; i++) {
      const y = peak > 0 ? SPARK_BASE - cells[i].tokens / peak * SPARK_HEIGHT : SPARK_BASE
      points.push(`${i * SPARK_STEP},${Math.round(y * 10) / 10}`)
    }
    return {
      week,
      points: points.join(' '),
      /** Whether the week has any figure to draw: a flat line on an empty week reads as a stray mark. */
      drawable: peak > 0,
      text: copy('homeWeekSummary', {
        sessions: week.sessions === null ? '—' : formatHomeCount(week.sessions),
        tokens: formatCompactTokens(week.tokens),
      }),
    }
  }

  return {
    /**
     * The deck for the page on screen.
     *
     * @param state - the usage store's snapshot (features/home/data.ts).
     * @param listed - the session list's roll-up, or null while it has not answered.
     * @param bookPick - the panel's yardstick draw, passed through to the shared figures.
     */
    view(state: HomeUsageState, listed: ListSummary | null, bookPick: number) {
      const sessions = openableSessions(ctx)
      const summary = weekLine(state, listed, bookPick)
      const month = homePanelData(state, listed, '30d', bookPick)
      const usageDetail = month.known && month.tokens > 0
        ? copy('homeUsageCardDesc', { tokens: formatCompactTokens(month.tokens), model: month.model ?? '—' })
        : copy('homeUsageCardEmptyDesc')
      return React.createElement(
        'section',
        { className: 'dsh-deepcraft-home-float', 'data-dsh-deepcraft-home-float-deck': '' },
        React.createElement(
          'div',
          { className: 'dsh-deepcraft-home-week' },
          React.createElement('span', null, summary.text),
          summary.drawable
            ? React.createElement(
              'svg',
              { className: 'dsh-deepcraft-home-week-spark', width: '78', height: '20', viewBox: '0 0 78 20', 'aria-hidden': 'true' },
              React.createElement('polyline', {
                points: summary.points,
                fill: 'none',
                stroke: 'currentColor',
                strokeWidth: '1.6',
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
              }),
            )
            : null,
        ),
        React.createElement(
          'div',
          { className: 'dsh-deepcraft-home-sugg' },
          sessionCard(sessions[0], 'homeContinueTitle', 'homeContinueFallbackTitle', 'homeContinueFallbackDesc'),
          sessionCard(sessions[1], 'homeResumeTitle', 'homeCommandsTitle', 'homeCommandsDesc'),
          suggestionCard('usage', copy('homeUsageCardTitle'), usageDetail, onOpenStudio),
        ),
        sessions.length === 0
          ? null
          : React.createElement(
            'div',
            { className: 'dsh-deepcraft-home-recents' },
            React.createElement('span', { className: 'dsh-deepcraft-home-recents-label' }, copy('homeRecentsLabel')),
            sessions.slice(0, RECENT_LIMIT).map(entry => React.createElement(
              'button',
              {
                key: entry.summary.id,
                type: 'button',
                className: 'dsh-deepcraft-home-recent',
                title: sessionDetail(entry),
                onClick() { hostUiWorkspace(ctx).openSession(entry.summary.id) },
              },
              entry.summary.displayTitle,
            )),
          ),
      )
    },
  }
}
