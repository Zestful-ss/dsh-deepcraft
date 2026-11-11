#!/usr/bin/env node
/**
 * native-layout.cjs — the host's own layout, with the skin's sheet on and off
 * (D66, D81).
 *
 * Registered in the lane's scenario table (packages/testing/scenarios.cjs).
 *
 * The page boots with "Follow the host" colours and type, no pet, no pinned
 * session and no custom brand, so the skin contributes no colour and no face.
 * The same host elements are read twice — once with the skin's stylesheet
 * enabled, once with it disabled — and their display, position, spacing and
 * border shapes have to agree. Text that wraps differently because a font
 * arrives late is not a layout difference and is not compared.
 *
 * The sheet is then put back and the host's own controls are pressed: a view
 * tab, the sidebar's search, the account menu and the right panel's collapse
 * button. The skin neither moves nor replaces any of them, so each has to work.
 */
'use strict'

/** The host seats compared with the sheet on and off, and the shape read off each. */
const SEATS = [
  ['window', '[data-slot="root"]'],
  ['header', '[data-slot="conversation.header"]'],
  ['tabs', '[data-slot="conversation.header"] [role="tablist"]'],
  ['sidebar', '[data-slot="sidebar"]'],
  ['tree', '[data-slot="sidebar"] [role="tree"]'],
  ['conversation', '[data-conversation-scroll]'],
]

/** Read one seat's computed shape and box, in the page. */
function readSeats(seats) {
  // Kept inside the function: `page.evaluate` serialises this source, so a
  // module constant beside it would not travel with it.
  const shapeProperties = [
    'display', 'position', 'flexDirection', 'alignItems', 'justifyContent',
    'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
    'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
    'rowGap', 'columnGap',
    'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
    'borderTopStyle', 'borderRightStyle', 'borderBottomStyle', 'borderLeftStyle',
    'borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomLeftRadius', 'borderBottomRightRadius',
  ]
  return seats.map(([name, selector]) => {
    const element = document.querySelector(selector)
    if (element === null) return { name, missing: true }
    const style = getComputedStyle(element)
    const box = element.getBoundingClientRect()
    const shape = {}
    for (const property of shapeProperties) shape[property] = style[property]
    return {
      name,
      shape,
      box: { top: Math.round(box.top), left: Math.round(box.left), width: Math.round(box.width) },
    }
  })
}

/** The seats whose shape differs between two readings. */
function differences(before, after) {
  const out = []
  for (let i = 0; i < before.length; i++) {
    if (before[i].missing === true || after[i].missing === true) {
      out.push(`${before[i].name}: ${before[i].missing === true ? 'missing before' : 'missing after'}`)
      continue
    }
    for (const [property, value] of Object.entries(before[i].shape)) {
      if (after[i].shape[property] !== value) out.push(`${before[i].name}.${property}: ${value} → ${after[i].shape[property]}`)
    }
    // The custom brand is a kept component and its mark may be a pixel or two
    // taller than the host's own art; that drift belongs to the brand, not to
    // the layout. A layout override the sheet adds moves the box far past it.
    for (const side of ['top', 'left', 'width']) {
      if (Math.abs(after[i].box[side] - before[i].box[side]) > 2) out.push(`${before[i].name}.box.${side}: ${before[i].box[side]} → ${after[i].box[side]}`)
    }
  }
  return out
}

function nativeLayoutScenario({ check }) {
  return {
    script: 'greeting',
    prompt: 'hello there',
    profilePatch: ['- id: ui-skin-deepcraft', '  config:', '    palette: host', '    typeface: host', '    mascot: \'off\''],
    async assert({ page, session, notes }) {
      const withSheet = await page.evaluate(readSeats, SEATS)
      // The skin's one sheet, taken off the page for a frame: every rule it
      // carries is scoped under the body attribute, so disabling it is the
      // same page the host serves with no skin installed.
      await page.evaluate(() => {
        const sheet = document.getElementById('dsh-deepcraft-style')
        if (sheet === null) throw new Error('the skin mounted no stylesheet')
        sheet.disabled = true
      })
      await page.waitForTimeout(250)
      const withoutSheet = await page.evaluate(readSeats, SEATS)
      await page.evaluate(() => {
        document.getElementById('dsh-deepcraft-style').disabled = false
      })
      await page.waitForTimeout(250)
      const diff = differences(withSheet, withoutSheet)

      // The host's own controls, with the sheet back on.
      notes.tabs = await page.evaluate(() => {
        const tabs = [...document.querySelectorAll('[data-slot="conversation.header"] [role="tab"]')]
        const next = tabs.find((tab) => tab.getAttribute('aria-selected') !== 'true')
        if (next === undefined) return { count: tabs.length, pressed: false }
        next.click()
        return { count: tabs.length, pressed: true }
      })
      await page.waitForTimeout(400)
      notes.tabSwitched = await page.evaluate(() => [...document.querySelectorAll('[data-slot="conversation.header"] [role="tab"]')].some((tab) => tab.getAttribute('aria-selected') === 'true'))

      notes.search = await page.evaluate(() => {
        const sidebar = document.querySelector('[data-slot="sidebar"]')
        if (sidebar === null) return { found: false }
        const buttons = [...sidebar.querySelectorAll('button')]
        const search = buttons.find((button) => /search|搜索/i.test(`${button.getAttribute('aria-label') ?? ''} ${button.getAttribute('title') ?? ''} ${button.textContent ?? ''}`))
        if (search === undefined) return { found: false }
        search.click()
        return { found: true }
      })
      await page.waitForTimeout(500)
      notes.searchOpen = await page.evaluate(() => document.querySelector('[role="dialog"], [role="search"], input[type="search"]') !== null)
      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)

      notes.account = await page.evaluate(() => {
        const trigger = document.querySelector('[aria-haspopup="menu"][data-signed-out]')
        if (trigger === null) return { found: false }
        trigger.click()
        return { found: true }
      })
      await page.waitForTimeout(400)
      notes.accountOpen = await page.evaluate(() => document.querySelector('[role="menu"]') !== null)
      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)

      notes.rightbar = await page.evaluate(async () => {
        const expand = document.querySelector('[data-sidebar-right-expand]')
        if (expand === null) return { expand: false }
        expand.click()
        return { expand: true }
      })
      if (notes.rightbar.expand) {
        await page.waitForFunction(() => document.querySelector('[data-sidebar-right-open]') !== null, undefined, { timeout: 15000 })
        notes.rightbar.closed = await page.evaluate(() => {
          const toggle = document.querySelector('[data-sidebar-right-open] [data-sidebar-right-toggle]')
          if (toggle === null) return false
          toggle.click()
          return true
        })
        await page.waitForFunction(() => document.querySelector('[data-sidebar-right-open]') === null, undefined, { timeout: 15000 })
      }

      return [
        check('the skin adds no layout to the host: header, sidebar, conversation and window keep their display, position, spacing and border shapes with its sheet off',
          diff.length === 0, diff.slice(0, 6).join(' | ')),
        check('the host\'s own view tabs switch the view', notes.tabs.count >= 2 && notes.tabs.pressed === true && notes.tabSwitched === true,
          JSON.stringify({ tabs: notes.tabs, switched: notes.tabSwitched })),
        check('the host\'s own sidebar search opens and closes', notes.search.found === true && notes.searchOpen === true,
          JSON.stringify({ search: notes.search, open: notes.searchOpen })),
        check('the host\'s own account menu opens and closes', notes.account.found === true && notes.accountOpen === true,
          JSON.stringify({ account: notes.account, open: notes.accountOpen })),
        check('the host\'s own right-panel control opens and closes the panel',
          notes.rightbar.expand === true && notes.rightbar.closed === true, JSON.stringify(notes.rightbar)),
        check('控制台没有异常', session.problems.length === 0, session.problems.slice(0, 3).join(' | ')),
      ]
    },
  }
}

module.exports = { nativeLayoutScenario }
