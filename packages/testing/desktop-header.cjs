#!/usr/bin/env node
/**
 * desktop-header.cjs — the Windows desktop's own header, untouched (D66, D81).
 *
 * Registered in the lane's scenario table (packages/testing/scenarios.cjs).
 *
 * The desktop shell supplies a caption row above the columns. The skin used to
 * lift the session title into it; now the host keeps its own row, its own
 * title and its own controls. The scenario runs the page as that window and
 * reads the header with the skin's sheet on and off: the title stays where the
 * host puts it, inside the conversation column, and no skin node stands in the
 * caption row.
 */
'use strict'
const { settlePage } = require('./lane.cjs')
const { showWindowsTitlebar } = require('./windows-titlebar.cjs')

async function readHeader(page) {
  return page.evaluate(() => {
    const card = document.querySelector('[data-dsh-deepcraft-part~="center-column"]')
    const title = document.querySelector('[data-dsh-header-title]')
    const row = document.querySelector('[data-dsh-header-row]')
    if (!card || !title || !row) return null
    const cardBox = card.getBoundingClientRect()
    const titleBox = title.getBoundingClientRect()
    const rowBox = row.getBoundingClientRect()
    const atTitle = document.elementFromPoint(titleBox.left + titleBox.width / 2, titleBox.top + titleBox.height / 2)
    return {
      title: { top: Math.round(titleBox.top), left: Math.round(titleBox.left) },
      card: { top: Math.round(cardBox.top), left: Math.round(cardBox.left) },
      row: { top: Math.round(rowBox.top) },
      titleVisible: title.checkVisibility() && (atTitle === title || title.contains(atTitle)),
      skinNodes: document.querySelectorAll('[class^="dsh-deepcraft-"], [class*=" dsh-deepcraft-"]').length,
    }
  })
}

function desktopHeaderScenario({ check }) {
  return {
    script: {
      conversation: [{ text: ['The session is ready.'] }],
      auxiliary: { text: ['A long session title for checking the desktop conversation header'] },
    },
    prompt: 'Check the conversation header',
    viewport: { width: 1278, height: 1022 },
    beforeSend: ({ page }) => showWindowsTitlebar(page),
    async assert({ page, session }) {
      await page.waitForSelector('[data-dsh-header-row]')
      await settlePage(page)
      const withSheet = await readHeader(page)
      await page.evaluate(() => {
        const sheet = document.getElementById('dsh-deepcraft-style')
        if (sheet === null) throw new Error('the skin mounted no stylesheet')
        sheet.disabled = true
      })
      await page.waitForTimeout(300)
      const withoutSheet = await readHeader(page)
      await page.evaluate(() => {
        document.getElementById('dsh-deepcraft-style').disabled = false
      })
      await page.waitForTimeout(300)
      return [
        check('桌面窗口里宿主自己的标题行仍然在会话列里，标题完整显示',
          withSheet !== null && withSheet.titleVisible === true &&
            withSheet.title.top >= withSheet.card.top && withSheet.title.left >= withSheet.card.left,
          JSON.stringify(withSheet)),
        check('插件样式启用与停用时标题与标题行的位置一致，皮肤不把标题移进窗口顶端',
          withSheet !== null && withoutSheet !== null &&
            withSheet.title.top === withoutSheet.title.top && withSheet.title.left === withoutSheet.title.left &&
            withSheet.row.top === withoutSheet.row.top,
          JSON.stringify({ on: withSheet, off: withoutSheet })),
        check('页眉里没有插件画的标题或标签', withSheet !== null && withSheet.skinNodes === 0, JSON.stringify(withSheet)),
        check('控制台没有异常', session.problems.length === 0, session.problems.slice(0, 3).join(' | ')),
      ]
    },
  }
}

module.exports = { desktopHeaderScenario }
