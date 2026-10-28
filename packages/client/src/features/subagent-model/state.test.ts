import { expect, test } from 'vitest'
import { SUBAGENT_ROUTES_MAX } from '@dsh-deepcraft/contracts/subagent'
import { routeNames, sameSelection, selectionLabel, toggleRoute } from './state'
import type { HostModelCatalogSnapshot } from '@dsh-deepcraft/contracts/services'

/**
 * The entry's own decisions, without the host: what the trigger says, and what
 * one row's press does to the selection. Both are read by the card and the
 * trigger, so a mistake here is a wrong label or a pick that never lands.
 */

const CATALOG: HostModelCatalogSnapshot = {
  groups: [{
    id: 'magpie',
    name: 'Magpie',
    models: [{ id: 'terra', name: 'Terra' }, { id: 'grok', name: '' }],
  }],
  current: null,
}

const terra = { provider: 'magpie', model: 'terra' }
const grok = { provider: 'magpie', model: 'grok' }

test('the trigger names the one route, counts several, and says nothing for none', () => {
  expect(selectionLabel([], CATALOG)).toEqual({ kind: 'none' })
  expect(selectionLabel([grok], CATALOG)).toEqual({ kind: 'one', name: 'grok' })
  expect(selectionLabel([terra, grok], CATALOG)).toEqual({ kind: 'many', count: 2 })
})

test('a route the catalog does not list reads as its own id', () => {
  expect(selectionLabel([{ provider: 'other', model: 'm' }], CATALOG)).toEqual({ kind: 'one', name: 'm' })
  expect(selectionLabel([grok], null)).toEqual({ kind: 'one', name: 'grok' })
})

test('a row carries the model name over the provider name, each falling back to its id', () => {
  expect(routeNames(terra, CATALOG)).toEqual({ model: 'Terra', provider: 'Magpie' })
  // A provider whose model name is empty still reads as its id.
  expect(routeNames(grok, CATALOG)).toEqual({ model: 'grok', provider: 'Magpie' })
  expect(routeNames({ provider: 'other', model: 'm' }, CATALOG)).toEqual({ model: 'm', provider: 'other' })
})

test('a press adds a route, and a second press on the same route takes it back out', () => {
  const picked = toggleRoute([], terra)
  expect(picked).toEqual([terra])
  const twice = toggleRoute([terra, grok], terra)
  expect(twice).toEqual([grok])
  // Removing from the middle keeps the rest in their own order.
  expect(toggleRoute([terra, grok, { provider: 'magpie', model: 'third' }], grok)).toEqual([terra, { provider: 'magpie', model: 'third' }])
})

test('the list stops at the cap instead of dropping the oldest pick', () => {
  const full = Array.from({ length: SUBAGENT_ROUTES_MAX }, (_, index) => ({ provider: 'magpie', model: `m${index}` }))
  expect(toggleRoute(full, { provider: 'magpie', model: 'extra' })).toBeNull()
  // A press that removes is still allowed at the cap.
  expect(toggleRoute(full, full[0])).toHaveLength(SUBAGENT_ROUTES_MAX - 1)
})

test('one route is the same route however its pair was built, and order is not a change', () => {
  expect(sameSelection([terra], [{ provider: 'magpie', model: 'terra' }])).toBe(true)
  expect(sameSelection([terra, grok], [grok, terra])).toBe(true)
  expect(sameSelection([terra], [grok])).toBe(false)
  expect(sameSelection([terra], [])).toBe(false)
  // Two routes of the same model under different providers are different routes.
  expect(sameSelection([terra], [{ provider: 'other', model: 'terra' }])).toBe(false)
})
