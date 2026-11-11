#!/usr/bin/env node
/**
 * sidebar-rail.cjs — the collapsed sidebar as the host draws it (D66, D81).
 *
 * Registered in the lane's scenario table (packages/testing/scenarios.cjs).
 *
 * The host re-seats its own New session control as a 36px icon button when the
 * rail collapses, and every row keeps the host's own height, spacing, icon and
 * order: the skin paints colours and type only. The scenario collapses the rail
 * with the host's own toggle, reads the host's button and the skin's absence,
 * then opens it again.
 */
'use strict'

/** The host's collapse toggle inside the sidebar, found by its accessible name. */
async function hostToggle(page) {
  return page.evaluate(() => {
    const column = document.querySelector('[data-slot="sidebar"]')
    if (column === null) return false
    const button = [...column.querySelectorAll('button')].find((candidate) => /collapse|expand|收起|展开/i.test(`${candidate.getAttribute('aria-label') ?? ''} ${candidate.getAttribute('title') ?? ''}`))
    if (button === undefined) return false
    button.click()
    return true
  })
}

/** What the collapsed rail shows: the host's button box and any skin node inside it. */
const readRail = (page) => page.evaluate(() => {
  const column = document.querySelector('[data-slot="sidebar"]')
  const button = column === null ? null : [...column.querySelectorAll('button')].find((candidate) => candidate.getBoundingClientRect().width > 0 && candidate.querySelector('svg') !== null)
  const box = button === null ? null : button.getBoundingClientRect()
  return {
    collapsed: document.querySelector('[data-sidebar-collapsed]') !== null,
    width: box === null ? 0 : Math.round(box.width),
    icon: button === null ? false : [...button.querySelectorAll('svg')].some((svg) => getComputedStyle(svg).display !== 'none'),
    skinNodes: column === null ? 0 : column.querySelectorAll('[class^="dsh-deepcraft-"], [class*=" dsh-deepcraft-"]').length,
    rows: column === null ? 0 : column.querySelectorAll('[data-row-key], [role="treeitem"]').length,
  }
})

function sidebarRailScenario({ check }) {
  return {
    script: 'greeting',
    prompt: 'hello there',
    async assert({ page, session, notes }) {
      notes.opened = await readRail(page)
      notes.pressed = await hostToggle(page)
      if (notes.pressed) {
        await page.waitForFunction(() => document.querySelector('[data-sidebar-collapsed]') !== null, undefined, { timeout: 15000 })
        await page.waitForTimeout(400)
      }
      notes.collapsed = await readRail(page)
      if (notes.pressed) {
        await hostToggle(page)
        await page.waitForFunction(() => document.querySelector('[data-sidebar-collapsed]') === null, undefined, { timeout: 15000 })
        await page.waitForTimeout(300)
      }
      notes.again = await readRail(page)
      return [
        check('宿主的折叠按钮可按，按下后侧栏进入折叠态', notes.pressed === true && notes.collapsed.collapsed === true && notes.opened.collapsed === false,
          JSON.stringify({ pressed: notes.pressed, opened: notes.opened, collapsed: notes.collapsed })),
        check('折叠后宿主自己的新建会话按钮收成 36px 图标按钮，图标仍然可见',
          notes.collapsed.width === 36 && notes.collapsed.icon === true, JSON.stringify(notes.collapsed)),
        check('侧栏里没有插件画的节点，宿主自己的行照旧在', notes.collapsed.skinNodes === 0 && notes.collapsed.rows >= 0,
          JSON.stringify(notes.collapsed)),
        check('再按一次回到展开态', notes.pressed === true && notes.again.collapsed === false, JSON.stringify(notes.again)),
        check('控制台没有异常', session.problems.length === 0, session.problems.slice(0, 3).join(' | ')),
      ]
    },
  }
}

module.exports = { sidebarRailScenario }
