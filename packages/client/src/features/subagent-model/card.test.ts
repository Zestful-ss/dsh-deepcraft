import { expect, test } from 'vitest'
import { buildCardContent, seatActs, seatShown, triggerTitle } from './card'
import type { SeatView } from './card'
import type { HostModelCatalogSnapshot } from '@dsh-deepcraft/contracts/services'

/**
 * What the entry says and when it may act. The card and the trigger both read
 * these, so a mistake here is a control that offers routes it cannot save or
 * refuses a pick it should let the reader fix.
 */

const CATALOG: HostModelCatalogSnapshot = {
  groups: [{ id: 'magpie', name: 'Magpie', models: [{ id: 'terra', name: 'Terra' }, { id: 'grok', name: 'Grok' }] }],
  current: null,
}

const routes = [{ provider: 'magpie', model: 'terra' }, { provider: 'magpie', model: 'grok' }]

const view = (over: Partial<SeatView> = {}): SeatView => ({
  allowed: routes,
  selected: [],
  catalog: CATALOG,
  saving: false,
  failed: false,
  full: false,
  ...over,
})

test('a session with no allowed list cannot act, and one whose content merely went stale can', () => {
  expect(seatActs(view({ reason: 'no-policy', allowed: [] }))).toBe(false)
  expect(seatActs(view({ reason: 'no-session' }))).toBe(false)
  expect(seatActs(view({ reason: 'store-unavailable' }))).toBe(false)
  // The reader has to fix a stale pick: the rows and the clear row stay usable.
  expect(seatActs(view({ reason: 'stale-selection', selected: routes }))).toBe(true)
  expect(seatActs(view())).toBe(true)
  expect(seatActs(view({ allowed: [] }))).toBe(false)
})

test('the entry stays off the page while the answer is in flight and where there is nothing to choose', () => {
  expect(seatShown({ ...view(), loading: true })).toBe(false)
  expect(seatShown({ ...view({ reason: 'no-policy', allowed: [] }), loading: false })).toBe(false)
  expect(seatShown({ ...view({ reason: 'no-session' }), loading: false })).toBe(false)
  // A fault the reader can only learn here keeps the entry, and so does a pick
  // the policy went stale under.
  expect(seatShown({ ...view({ reason: 'store-unavailable', allowed: [] }), loading: false })).toBe(true)
  expect(seatShown({ ...view({ reason: 'stale-selection', selected: routes }), loading: false })).toBe(true)
  expect(seatShown({ ...view(), loading: false })).toBe(true)
})

test('the accessible name explains an unavailable entry and identifies a selected route', () => {
  const unavailable = triggerTitle(view({ reason: 'no-policy', allowed: [] }))
  expect(unavailable).toMatch(/会话|session/i)
  expect(triggerTitle(view({ selected: [routes[0]] }))).toContain('Terra')
})

test('the card draws one row per allowed route, its check on the picked one, and a clear row only while something is picked', () => {
  const built = buildCardContent(view({ selected: [routes[1]] }), { toggle() {}, clear() {} })
  const rows = built.querySelectorAll('.dsh-deepcraft-subagent-model-option')
  expect(rows).toHaveLength(2)
  expect(rows[0].getAttribute('aria-checked')).toBe('false')
  expect(rows[1].getAttribute('aria-checked')).toBe('true')
  expect(rows[0].getAttribute('role')).toBe('menuitemcheckbox')
  expect(built.querySelector('.dsh-deepcraft-subagent-model-clear')).not.toBeNull()
})

test('a card the entry cannot act in carries the reason and no rows, and the clear row goes away with nothing picked', () => {
  const blocked = buildCardContent(view({ reason: 'no-policy', allowed: [] }), { toggle() {}, clear() {} })
  expect(blocked.querySelectorAll('.dsh-deepcraft-subagent-model-option')).toHaveLength(0)
  expect(blocked.querySelector('.dsh-deepcraft-subagent-model-note')?.textContent).not.toBe('')
  const empty = buildCardContent(view(), { toggle() {}, clear() {} })
  expect(empty.querySelector('.dsh-deepcraft-subagent-model-clear')).toBeNull()
})

test('a failed write says so and keeps the saved rows on show, and a full list says what the limit is', () => {
  const failed = buildCardContent(view({ selected: [routes[0]], failed: true }), { toggle() {}, clear() {} })
  const notes = [...failed.querySelectorAll('.dsh-deepcraft-subagent-model-note')].map((node) => node.textContent ?? '')
  expect(notes.some((line) => /保存|save/i.test(line))).toBe(true)
  expect(failed.querySelectorAll('.dsh-deepcraft-subagent-model-option')).toHaveLength(2)
  const full = buildCardContent(view({ selected: routes, full: true }), { toggle() {}, clear() {} })
  const fullNotes = [...full.querySelectorAll('.dsh-deepcraft-subagent-model-note')].map((node) => node.textContent ?? '')
  expect(fullNotes.some((line) => line.includes('24'))).toBe(true)
})
