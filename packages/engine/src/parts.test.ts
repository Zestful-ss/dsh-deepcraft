import { afterEach, expect, test } from 'vitest'
import { installParts } from './parts'
import { HOLDS_ATTR, PART_ATTR, TEST_VOCABULARY } from './test-vocabulary'

/**
 * The holds a stylesheet reads as structure (D9): core/parts.ts answers the
 * relations in core/parts-table.ts from the same walk that writes the parts, so
 * a rule matching an element by what its subtree contains reads one attribute
 * instead of asking the browser on every change below it.
 */

const settle = () => new Promise(resolve => setTimeout(resolve, 0))

const cleanups: (() => void)[] = []
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup()
  document.body.replaceChildren()
})

/** The hold mark on an element, or null. */
const holds = (element: Element | null) => element === null ? null : element.getAttribute(HOLDS_ATTR)

/** The part mark on an element, or null. */
const partOf = (selector: string) => document.querySelector(selector)?.getAttribute(PART_ATTR) ?? null

test('a hold as its own child counts the direct child alone', async () => {
  document.body.innerHTML =
    '<div data-slot="root"><div class="_frame_ab"><div class="_sidebarCol_ab"></div><div class="_centerCol_ab"></div></div></div>'
  cleanups.push(installParts(TEST_VOCABULARY))
  const frame = document.querySelector('[data-test-part~="layout-frame"]')
  expect(holds(frame)).toBe('sidebar-column')

  // The same column one box deeper is not the frame's own child, so the rule
  // that reads `A:has(> B)` stays quiet.
  const column = document.querySelector('[data-test-part~="sidebar-column"]')!
  const wrapper = document.createElement('div')
  wrapper.className = '_slot_wrap_ab'
  column.parentElement!.appendChild(wrapper)
  wrapper.appendChild(column)
  await settle()
  expect(holds(frame)).toBeNull()
})

test('a holder that takes its attribute after the node it holds still marks it', async () => {
  document.body.innerHTML = '<div class="_phase_ab"><div data-conversation-scroll=""></div></div>'
  cleanups.push(installParts(TEST_VOCABULARY))
  const phase = document.querySelector('[class~="_phase_ab"]')
  expect(holds(phase)).toBeNull()
  phase!.setAttribute('data-phase', 'active')
  await settle()
  expect(holds(phase)).toBe('conversation-scroll')
})

test('the settings dialog marks its section rail outside the conversation box', async () => {
  document.body.innerHTML =
    '<div class="_overlay_ab"><div role="dialog"><div class="_navList_ab"><button class="_navCell_ab"></button></div></div></div>'
  cleanups.push(installParts(TEST_VOCABULARY))
  expect(partOf('[class~="_navList_ab"]')).toBe('nav-list')
})

test('the teardown takes every hold mark off with the parts', async () => {
  document.body.innerHTML =
    '<div data-slot="root"><div class="_frame_ab"><div class="_sidebarCol_ab"></div></div></div>'
  const dispose = installParts(TEST_VOCABULARY)
  expect(holds(document.querySelector('[data-test-part~="layout-frame"]'))).toBe('sidebar-column')
  dispose()
  expect(document.querySelectorAll(`[${HOLDS_ATTR}]`).length).toBe(0)
  expect(document.querySelectorAll(`[${PART_ATTR}]`).length).toBe(0)
})
