#!/usr/bin/env node
/**
 * recent.cjs — the sidebar's recent block and its delete action, on a real host
 * (D85).
 *
 * The scenario reads the block at the very top of the session section, opens one
 * conversation from it, and presses delete on the conversation the host still
 * holds open: the card names the conversation, the confirm is refused, and the
 * row stays. Deleting a stored record itself is the smoke lane's
 * (packages/testing/smoke/host-half.cjs drives the route against a scratch home),
 * and the 24-hour window is the unit lane's (select.test.ts); this walk proves the
 * block is on the page, in place, and wired to the host's own session data.
 */
'use strict'
const { sendPrompt, waitForTurn } = require('./prompt.cjs')
const { openRow, rowsOf, shownSession, startSession, waitForRows } = require('./session-ui.cjs')

/** The skin's block and the host's own conversation markers. */
const SKIN = {
  block: '.dsh-deepcraft-session-block-recent',
  row: '.dsh-deepcraft-session-row',
  title: '.dsh-deepcraft-session-title',
  trash: '.dsh-deepcraft-session-delete',
  card: '.dsh-deepcraft-session-delete-card',
  confirm: '.dsh-deepcraft-session-delete-danger',
  note: '.dsh-deepcraft-session-delete-note',
}
const HOST = {
  composer: '[data-composer-input]',
  conversation: '[data-conversation-session]',
  // The host's own + on its workspace row, the entry the pinned walk also uses.
  workspaceRow: '[data-row-key^="workspace:"]',
}

function recentScenario({ check }) {
  return {
    script: 'greeting',
    prompt: 'hello from the first conversation',
    async assert({ page, session }) {
      const checks = []
      const first = await shownSession(page)
      await waitForRows(page, SKIN.block, [first])
      const order = await rowsOf(page, SKIN.block)
      const heading = await page.locator(`${SKIN.block} .dsh-deepcraft-session-heading`).innerText().catch(() => '')
      // The block is the section's first child: above the pinned aggregate and
      // the host's own workspace groups.
      const placement = await page.evaluate((block) => {
        const node = document.querySelector(block)
        const section = node?.parentElement
        return { first: section?.firstElementChild === node, treeAfter: node?.nextElementSibling !== null }
      }, SKIN.block)
      checks.push(check('侧栏最上面出现最近会话块，列出当天这条会话',
        order.join() === first && /24|最近/.test(heading) && placement.first && placement.treeAfter,
        JSON.stringify({ order, heading, placement })))

      // A second conversation, newer than the first, takes the top row.
      const second = await startSession(page, first, async () => {
        const row = page.locator(HOST.workspaceRow).first()
        await row.hover()
        await row.locator('button').nth(1).click()
      })
      await sendPrompt(page, 'hello from the second conversation')
      await waitForTurn(page)
      await waitForRows(page, SKIN.block, [second, first])
      checks.push(check('新动过的会话排在最前', (await rowsOf(page, SKIN.block)).join() === [second, first].join(), JSON.stringify(await rowsOf(page, SKIN.block))))

      // A row opens its conversation.
      await openRow(page, `${SKIN.block} ${SKIN.row}[data-session-id="${first}"]`, first)
      checks.push(check('块里的一行按下后打开对应会话', await shownSession(page) === first, await shownSession(page)))

      // Delete on the conversation the host still holds open: the card names it,
      // the confirm is refused with the reason, and the row stays.
      const firstTitle = await page.locator(`${SKIN.block} ${SKIN.row}[data-session-id="${first}"] ${SKIN.title}`).innerText()
      await page.locator(`${SKIN.block} ${SKIN.row}[data-session-id="${first}"] ${SKIN.trash}`).click()
      await page.locator(SKIN.card).waitFor({ state: 'visible', timeout: 10000 })
      const note = await page.locator(SKIN.note).innerText()
      await page.locator(SKIN.confirm).click()
      await page.waitForFunction((selector) => {
        const text = document.querySelector(selector)
        return text !== null && /开着|open/.test(text.textContent ?? '')
      }, SKIN.note, { timeout: 15000 }).catch(() => {})
      const refused = await page.locator(SKIN.note).innerText()
      const stillThere = (await rowsOf(page, SKIN.block)).includes(first)
      await page.keyboard.press('Escape')
      await page.locator(SKIN.card).waitFor({ state: 'detached', timeout: 10000 }).catch(() => {})
      checks.push(check('确认卡写着会话名，还开着的会话不删除并说明先关闭',
        note.includes(firstTitle) && /开着|open/.test(refused) && stillThere,
        JSON.stringify({ note, refused, stillThere })))

      // The refusal is the host's own 409, logged by the browser as a failed load.
      const problems = session.problems.filter((line) => !/status of 409/.test(line))
      checks.push(check('控制台没有异常', problems.length === 0, problems.slice(0, 3).join(' | ')))
      return checks
    },
  }
}

module.exports = { recentScenario }
