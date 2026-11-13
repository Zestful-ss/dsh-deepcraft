import { expect, test } from 'vitest'
import { RECENT_LIMIT, RECENT_WINDOW_MS, selectRecent } from './select'

const NOW = Date.UTC(2026, 10, 13, 12, 0, 0)
const HOUR = 60 * 60 * 1000

test('the day\'s conversations, newest first', () => {
  const rows = selectRecent([
    { id: 'old', updatedAt: NOW - 3 * 24 * HOUR },
    { id: 'today', updatedAt: NOW - 2 * HOUR },
    { id: 'now', updatedAt: NOW },
    { id: 'yesterday', updatedAt: NOW - 20 * HOUR },
  ], new Set(), NOW)
  expect(rows.map(row => row.id)).toEqual(['now', 'today', 'yesterday'])
})

test('the window reaches exactly one day back and no further', () => {
  expect(selectRecent([{ id: 'edge', updatedAt: NOW - RECENT_WINDOW_MS }], new Set(), NOW)).toHaveLength(1)
  expect(selectRecent([{ id: 'past', updatedAt: NOW - RECENT_WINDOW_MS - 1 }], new Set(), NOW)).toHaveLength(0)
})

test('archived, blank and subagent rows stay out', () => {
  expect(selectRecent([
    { id: 'archived', updatedAt: NOW },
    { id: 'blank', updatedAt: NOW, blank: true },
    { id: 'child', updatedAt: NOW, origin: 'subagent' },
    { id: 'kept', updatedAt: NOW - HOUR },
  ], new Set(['archived']), NOW).map(row => row.id)).toEqual(['kept'])
})

test('an unreadable timestamp is no activity at all', () => {
  expect(selectRecent([{ id: 'broken', updatedAt: Number.NaN }], new Set(), NOW)).toHaveLength(0)
})

test('a busy day stops at the block\'s limit, newest kept', () => {
  const rows = Array.from({ length: RECENT_LIMIT + 4 }, (_, at) => ({ id: `s${at}`, updatedAt: NOW - at * 60 * 1000 }))
  const picked = selectRecent(rows, new Set(), NOW)
  expect(picked).toHaveLength(RECENT_LIMIT)
  expect(picked[0].id).toBe('s0')
  expect(picked[picked.length - 1].id).toBe(`s${RECENT_LIMIT - 1}`)
})
