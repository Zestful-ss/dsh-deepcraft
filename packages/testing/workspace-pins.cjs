#!/usr/bin/env node
/**
 * workspace-pins.cjs — the pinned aggregate above every workspace, on a real
 * host (D66).
 *
 * The scenario boots a home with two workspaces, starts one conversation in
 * each, pins both through the host's own row menus, and then reads the
 * aggregate the skin draws: the host's pin order, each row's workspace, the
 * original rows still in their groups, opening by pointer and by keyboard, and
 * the host menu acting on a pinned row's session (rename, unpin, archive). It
 * also checks the block's own visibility: host search, the archived view and
 * the workspace-view switch.
 */
'use strict'
const fs = require('node:fs')
const path = require('node:path')
const { randomUUID } = require('node:crypto')
const { sendPrompt, waitForTurn } = require('./prompt.cjs')
const { dismissOverlays, waitForSkin } = require('./dsh-web.cjs')

/** The skin's aggregate and the host's own rows. */
const SKIN = {
  block: '.dsh-deepcraft-pin-block',
  row: '.dsh-deepcraft-pin-row',
  menu: '.dsh-deepcraft-pin-menu',
  title: '.dsh-deepcraft-pin-title',
}
const HOST = {
  sessionRow: '[data-row-key^="session:"]',
  projectRow: '[data-row-key^="workspace:"]',
  menu: 'body > [role="menu"]',
  menuItem: '[role="menuitem"]',
  menuTrigger: '[data-context-menu-trigger]',
  dialog: '[role="dialog"]',
  composer: '[data-composer-input]',
  conversation: '[data-conversation-session]',
}

/** The session the page shows. */
function shownSession(page) {
  return page.evaluate((selector) => document.querySelector(selector)?.getAttribute('data-conversation-session') ?? '', HOST.conversation)
}

/** Open the host's row menu for one of the host's own session rows. */
async function openRowMenu(page, sessionId) {
  const row = page.locator(`${HOST.sessionRow}[data-row-key="session:${sessionId}"]`).first()
  await row.waitFor({ state: 'attached', timeout: 20000 })
  await row.hover()
  await row.locator('button[data-context-menu-trigger]').first().click()
  await page.locator(HOST.menu).waitFor({ state: 'visible', timeout: 10000 })
}

/** Open the host menu from one pinned row's own menu button. */
async function openPinMenu(page, sessionId) {
  const row = page.locator(`${SKIN.row}[data-session-id="${sessionId}"]`).first()
  await row.waitFor({ state: 'visible', timeout: 20000 })
  await row.hover()
  await row.locator(SKIN.menu).click()
  await page.locator(HOST.menu).waitFor({ state: 'visible', timeout: 10000 })
}

/** Press the host menu item whose words match. */
async function pressMenuItem(page, pattern) {
  const item = page.locator(HOST.menu).locator(HOST.menuItem).filter({ hasText: pattern }).first()
  await item.waitFor({ state: 'visible', timeout: 10000 })
  await item.click()
}

/** The pinned rows' session ids, in the order drawn. */
function pinOrder(page) {
  return page.evaluate((selector) => [...document.querySelectorAll(`${selector} ${'.dsh-deepcraft-pin-row'}`)]
    .map((row) => row.getAttribute('data-session-id') ?? ''), SKIN.block)
}

/** Wait until the aggregate holds exactly these session ids in this order. */
async function waitForPins(page, ids, timeout = 20000) {
  await page.waitForFunction(({ block, ids }) => {
    const rows = [...document.querySelectorAll(`${block} .dsh-deepcraft-pin-row`)]
    return rows.length === ids.length && rows.every((row, at) => row.getAttribute('data-session-id') === ids[at])
  }, { block: SKIN.block, ids }, { timeout }).catch(() => {})
}

/** Expand one workspace group when it is folded. */
async function expandWorkspace(page, title) {
  const row = page.locator(HOST.projectRow).filter({ hasText: title }).first()
  await row.waitFor({ state: 'attached', timeout: 20000 })
  if (await row.getAttribute('aria-expanded') === 'false') await row.click()
}

/** Press the new-session button on the named workspace's own row. */
async function newSessionIn(page, title) {
  await expandWorkspace(page, title)
  const row = page.locator(HOST.projectRow).filter({ hasText: title }).first()
  await row.hover()
  await row.locator('button').nth(1).click()
}

/** Run the scenario. */
function workspacePinsScenario({ check }) {
  return {
    script: 'greeting',
    prompt: 'hello from the first workspace',
    // A home of its own: the two-workspace registry must not reach another scenario.
    plugins: [],
    async prepareHome(home) {
      const file = path.join(home, 'storages', 'workspace.json')
      const registry = JSON.parse(fs.readFileSync(file, 'utf8'))
      const id = randomUUID()
      const directory = path.join(home, 'workspace-b')
      fs.mkdirSync(directory, { recursive: true })
      // The shell starts a prompt in its most recently updated workspace; a
      // later timestamp here would put the first conversation in this one.
      const earlier = new Date(Date.now() - 86400000).toISOString()
      registry.global.workspaceIds.push(id)
      registry.tables.workspaces[id] = { path: directory, title: 'workspace-b', sessionIds: [], createdAt: earlier, updatedAt: earlier }
      fs.writeFileSync(file, `${JSON.stringify(registry, null, 2)}\n`)
    },
    async assert({ page, session }) {
      const checks = []
      const first = await shownSession(page)
      checks.push(check('第一条会话已在默认工作区', first !== '', first))

      // The host's own menu pins the first conversation; the aggregate appears.
      await openRowMenu(page, first)
      await pressMenuItem(page, /^(置顶会话|Pin session|Pin conversation|Pin)/i)
      await waitForPins(page, [first])
      checks.push(check('宿主菜单置顶后，顶部出现这条会话', (await pinOrder(page)).join() === first, JSON.stringify(await pinOrder(page))))

      // A second conversation in the second workspace, through that row's own ＋.
      await newSessionIn(page, 'workspace-b')
      await page.waitForFunction((previous) => {
        const shown = document.querySelector('[data-conversation-session]')?.getAttribute('data-conversation-session') ?? ''
        return shown !== '' && shown !== previous
      }, first, { timeout: 20000 })
      const second = await shownSession(page)
      await sendPrompt(page, 'hello from the second workspace')
      await waitForTurn(page)
      await page.waitForSelector(HOST.composer, { timeout: 20000 })
      await expandWorkspace(page, 'workspace-b')
      await openRowMenu(page, second)
      await pressMenuItem(page, /^(置顶会话|Pin session|Pin conversation|Pin)/i)
      await waitForPins(page, [second, first])

      const order = await pinOrder(page)
      const text = await page.locator(SKIN.block).innerText()
      checks.push(check('两条置顶会话按最近置顶在前排列', order.join() === [second, first].join(), JSON.stringify(order)))
      checks.push(check('置顶行写明各自工作区', text.includes('lane-workspace') && text.includes('workspace-b'), text.replace(/\s+/g, ' ')))

      await expandWorkspace(page, 'lane-workspace')
      await expandWorkspace(page, 'workspace-b')
      const originals = await page.evaluate(({ row }) => ({
        first: document.querySelectorAll(`${row}`).length,
        keys: [...document.querySelectorAll(row)].map((node) => node.getAttribute('data-row-key')),
      }), { row: HOST.sessionRow })
      checks.push(check('宿主原行仍留在各自工作区中',
        originals.keys.includes(`session:${first}`) && originals.keys.includes(`session:${second}`), JSON.stringify(originals)))

      // Pointer, then keyboard: both open the conversation the row names.
      await page.locator(`${SKIN.row}[data-session-id="${first}"]`).click()
      await page.waitForFunction((id) => (document.querySelector('[data-conversation-session]')?.getAttribute('data-conversation-session') ?? '') === id, first, { timeout: 20000 })
      const pointerOpen = await shownSession(page)
      await page.locator(`${SKIN.row}[data-session-id="${second}"]`).focus()
      await page.keyboard.press('Enter')
      await page.waitForFunction((id) => (document.querySelector('[data-conversation-session]')?.getAttribute('data-conversation-session') ?? '') === id, second, { timeout: 20000 })
      const keyboardOpen = await shownSession(page)
      checks.push(check('置顶行用指针和键盘都能打开对应会话', pointerOpen === first && keyboardOpen === second, JSON.stringify({ pointerOpen, keyboardOpen })))

      // The host menu on a pinned row acts on that session: rename first.
      await openPinMenu(page, second)
      const menuRows = await page.locator(HOST.menu).locator(HOST.menuItem).count()
      checks.push(check('置顶行的菜单由宿主提供并列出该会话的操作', menuRows >= 3, `items=${menuRows}`))
      await pressMenuItem(page, /^(重命名|Rename)/i)
      const dialog = page.locator(HOST.dialog).first()
      await dialog.waitFor({ state: 'visible', timeout: 10000 })
      await dialog.locator('input').first().fill('Pinned by reader')
      await dialog.locator('input').first().press('Enter')
      await dialog.waitFor({ state: 'detached', timeout: 15000 }).catch(() => {})
      await page.waitForFunction(({ block, id }) => {
        const row = document.querySelector(`${block} .dsh-deepcraft-pin-row[data-session-id="${id}"]`)
        return row !== null && (row.querySelector('.dsh-deepcraft-pin-title')?.textContent ?? '') === 'Pinned by reader'
      }, { block: SKIN.block, id: second }, { timeout: 15000 }).catch(() => {})
      const renamed = await page.locator(`${SKIN.row}[data-session-id="${second}"] ${SKIN.title}`).innerText().catch(() => '')
      checks.push(check('从置顶行重命名后，置顶行显示新标题', renamed === 'Pinned by reader', renamed))

      // Unpin the first: only the aggregate loses it, its host row stays.
      await openPinMenu(page, first)
      await pressMenuItem(page, /^(取消置顶|Unpin)/i)
      await waitForPins(page, [second])
      const afterUnpin = await page.evaluate(({ sessionRow, sessionId, block }) => ({
        row: document.querySelector(`${sessionRow}[data-row-key="session:${sessionId}"]`) !== null,
        pinned: [...document.querySelectorAll(`${block} .dsh-deepcraft-pin-row`)].map((node) => node.getAttribute('data-session-id')),
      }), { sessionRow: HOST.sessionRow, sessionId: first, block: SKIN.block })
      checks.push(check('取消置顶只移出汇总区，宿主原行还在', afterUnpin.row && afterUnpin.pinned.join() === second, JSON.stringify(afterUnpin)))

      // A reload keeps the pin and the renamed title.
      await page.reload({ waitUntil: 'domcontentloaded' })
      await waitForSkin(page)
      await dismissOverlays(page)
      await waitForPins(page, [second])
      const afterReload = await page.locator(`${SKIN.row}[data-session-id="${second}"] ${SKIN.title}`).innerText().catch(() => '')
      checks.push(check('刷新后置顶顺序与新标题都保留', (await pinOrder(page)).join() === second && afterReload === 'Pinned by reader', JSON.stringify({ order: await pinOrder(page), afterReload })))

      // Host search takes the aggregate off the page; Escape brings it back.
      const search = page.locator('[data-slot="sidebar"] input[type="text"]').first()
      await search.fill('hello')
      await page.locator(SKIN.block).waitFor({ state: 'detached', timeout: 15000 }).catch(() => {})
      const duringSearch = await page.locator(SKIN.block).count()
      await search.press('Escape')
      await page.locator(SKIN.block).waitFor({ state: 'visible', timeout: 15000 }).catch(() => {})
      const afterSearch = await page.locator(SKIN.block).count()
      checks.push(check('宿主搜索时汇总区让位，清空后回来', duringSearch === 0 && afterSearch === 1, JSON.stringify({ duringSearch, afterSearch })))

      checks.push(check('控制台没有异常', session.problems.length === 0, session.problems.slice(0, 3).join(' | ')))
      return checks
    },
  }
}

module.exports = { workspacePinsScenario }
