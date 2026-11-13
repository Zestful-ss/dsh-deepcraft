'use strict'
/**
 * session-ui.cjs — the sidebar's conversations, read and driven the same way by
 * two scenarios (D66).
 *
 * The recent block and the pinned aggregate both draw rows in the sidebar's
 * session list, and both walks read the same things off the page: which
 * conversation is shown, which rows a block holds and in what order, a new
 * conversation started from the host's own button, and a row that opens its
 * conversation when pressed. Those four reads live here once.
 */

/** The session the page shows, by the conversation root's own attribute. */
const CONVERSATION = '[data-conversation-session]'

/** One block's row id, by the attribute the shared row carries. */
const ROW = '.dsh-deepcraft-session-row'

/** The session the page shows right now, or '' while none does. */
function shownSession(page) {
  return page.evaluate((selector) => document.querySelector(selector)?.getAttribute('data-conversation-session') ?? '', CONVERSATION)
}

/** The session ids one block draws, in the order it draws them. */
function rowsOf(page, block) {
  return page.evaluate(({ block, row }) => [...document.querySelectorAll(`${block} ${row}`)]
    .map((node) => node.getAttribute('data-session-id') ?? ''), { block, row: ROW })
}

/** Wait until one block holds exactly these session ids in this order. */
async function waitForRows(page, block, ids, timeout = 20000) {
  await page.waitForFunction(({ block, row, ids }) => {
    const rows = [...document.querySelectorAll(`${block} ${row}`)]
    return rows.length === ids.length && rows.every((node, at) => node.getAttribute('data-session-id') === ids[at])
  }, { block, row: ROW, ids }, { timeout }).catch(() => {})
}

/** Press the host's own new-session entry and wait for the conversation it opens. */
async function startSession(page, previous, press, timeout = 20000) {
  await press()
  await page.waitForFunction(({ selector, previous }) => {
    const shown = document.querySelector(selector)?.getAttribute('data-conversation-session') ?? ''
    return shown !== '' && shown !== previous
  }, { selector: CONVERSATION, previous }, { timeout })
  return shownSession(page)
}

/** Press one row of a block and wait until its conversation is the shown one. */
async function openRow(page, selector, sessionId, timeout = 20000) {
  await page.locator(selector).click()
  await page.waitForFunction(({ selector, id }) => (document.querySelector(selector)?.getAttribute('data-conversation-session') ?? '') === id,
    { selector: CONVERSATION, id: sessionId }, { timeout })
  return shownSession(page)
}

module.exports = { shownSession, rowsOf, waitForRows, startSession, openRow }
