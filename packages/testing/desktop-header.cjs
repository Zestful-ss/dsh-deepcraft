#!/usr/bin/env node
/** The mode label remains readable when a desktop title leaves the floating card. */
'use strict'
const { settlePage } = require('./lane.cjs')
const { showWindowsTitlebar } = require('./windows-titlebar.cjs')

async function readHeader(page) {
  return page.evaluate(() => {
    const card = document.querySelector('[data-dsh-deepcraft-part~="center-column"]')
    const title = document.querySelector('[data-dsh-header-title]')
    const row = document.querySelector('[data-dsh-header-row]')
    const label = document.querySelector('[data-dsh-deepcraft-part~="header-label"]')
    if (!card || !title || !row || !label) return null
    const cardBox = card.getBoundingClientRect()
    const titleBox = title.getBoundingClientRect()
    const rowBox = row.getBoundingClientRect()
    const labelBox = label.getBoundingClientRect()
    const atLabel = document.elementFromPoint(labelBox.left + labelBox.width / 2, labelBox.top + labelBox.height / 2)
    return {
      title: { top: titleBox.top, bottom: titleBox.bottom },
      card: { top: cardBox.top, bottom: cardBox.bottom },
      row: { top: rowBox.top },
      label: { top: labelBox.top, bottom: labelBox.bottom, width: labelBox.width, text: label.textContent.trim() },
      labelVisible: label.checkVisibility() && (atLabel === label || label.contains(atLabel)),
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
      const reading = await readHeader(page)
      await page.evaluate(() => document.body.setAttribute('data-dsh-deepcraft-page-look', 'flat'))
      await settlePage(page)
      const flat = await readHeader(page)
      return [
        check('桌面浮层的会话模式完整显示在卡片内', reading !== null && reading.label.text.length > 0 && reading.label.width > 0 &&
          reading.label.top >= reading.card.top && reading.label.bottom <= reading.card.bottom && reading.labelVisible,
        JSON.stringify(reading)),
        check('会话标题与模式标签各占一行', reading !== null && reading.title.bottom <= reading.label.top, JSON.stringify(reading)),
        check('平铺版面保留标题行的原有位置和可见模式', flat !== null && flat.row.top < flat.card.top && flat.labelVisible,
          JSON.stringify(flat)),
        check('控制台没有异常', session.problems.length === 0, session.problems.slice(0, 3).join(' | ')),
      ]
    },
  }
}

module.exports = { desktopHeaderScenario }
