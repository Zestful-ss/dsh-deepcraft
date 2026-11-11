#!/usr/bin/env node
/**
 * sidebar-rail.cjs — the sidebar rows as the host draws them (D66, D81).
 *
 * Registered in the lane's scenario table (packages/testing/scenarios.cjs).
 *
 * The skin keeps the host's own row height, spacing, icon and order; only
 * colours and families are its. The scenario reads every session and workspace
 * row with the skin's sheet on and off and compares the shape that the sheet
 * could move: display, position, spacing, border and the row's box. Text that
 * wraps differently because a font arrived late is not a layout difference.
 */
'use strict'

/** Every row the host draws in the sidebar: its tree items and keyed rows. */
function readRows() {
  const rows = [...document.querySelectorAll('[data-slot="sidebar"] [role="treeitem"], [data-slot="sidebar"] [data-row-key]')]
  return rows.map((row) => {
    const style = getComputedStyle(row)
    const box = row.getBoundingClientRect()
    return {
      text: (row.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 40),
      shape: {
        display: style.display,
        position: style.position,
        alignItems: style.alignItems,
        marginTop: style.marginTop,
        marginBottom: style.marginBottom,
        paddingTop: style.paddingTop,
        paddingRight: style.paddingRight,
        paddingBottom: style.paddingBottom,
        paddingLeft: style.paddingLeft,
        gap: style.gap,
        borderTopWidth: style.borderTopWidth,
        borderBottomWidth: style.borderBottomWidth,
        borderRadius: style.borderRadius,
      },
      box: { top: Math.round(box.top), left: Math.round(box.left), height: Math.round(box.height) },
    }
  })
}

/** The rows whose shape or box differs beyond a font's own rounding. */
function differences(before, after) {
  const out = []
  if (before.length !== after.length) out.push(`rows: ${before.length} → ${after.length}`)
  for (let i = 0; i < Math.min(before.length, after.length); i++) {
    for (const [property, value] of Object.entries(before[i].shape)) {
      if (after[i].shape[property] !== value) out.push(`row ${i} ${property}: ${value} → ${after[i].shape[property]}`)
    }
    for (const side of ['top', 'left', 'height']) {
      if (Math.abs(after[i].box[side] - before[i].box[side]) > 2) out.push(`row ${i} ${side}: ${before[i].box[side]} → ${after[i].box[side]}`)
    }
  }
  return out
}

function sidebarRailScenario({ check }) {
  return {
    script: 'greeting',
    prompt: 'hello there',
    async assert({ page, session, notes }) {
      notes.on = await page.evaluate(readRows)
      await page.evaluate(() => {
        const sheet = document.getElementById('dsh-deepcraft-style')
        if (sheet === null) throw new Error('the skin mounted no stylesheet')
        sheet.disabled = true
      })
      await page.waitForTimeout(300)
      notes.off = await page.evaluate(readRows)
      await page.evaluate(() => {
        document.getElementById('dsh-deepcraft-style').disabled = false
      })
      await page.waitForTimeout(300)
      const diff = differences(notes.on, notes.off)
      notes.skinNodes = await page.evaluate(() => document.querySelectorAll('[data-slot="sidebar"] [class^="dsh-deepcraft-"], [data-slot="sidebar"] [class*=" dsh-deepcraft-"]').length)
      return [
        check('侧栏里真的有宿主自己的会话行', notes.on.length > 0, `rows=${notes.on.length}`),
        check('插件给侧栏加的样式不改变宿主行的显示、定位、间距、边框与行盒',
          diff.length === 0, diff.slice(0, 6).join(' | ')),
        check('侧栏里没有插件画的节点', notes.skinNodes === 0, `${notes.skinNodes} nodes`),
        check('控制台没有异常', session.problems.length === 0, session.problems.slice(0, 3).join(' | ')),
      ]
    },
  }
}

module.exports = { sidebarRailScenario }
