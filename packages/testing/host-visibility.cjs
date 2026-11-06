#!/usr/bin/env node
/**
 * host-visibility.cjs — the host's own footer controls under the skin (D66):
 * the account entry opens the host's own menu with a real press and closes on
 * Escape, any footer action the host mounts stays visible and pressable, and
 * the connection indicator's outage button stays visible and answers one.
 *
 * The web shell this lane boots mounts no Cordis footer entry (that panel is
 * the desktop's); when one is mounted the run presses it and fails on a panel
 * that does not open, and the run never stands a stand-in in its place.
 */
'use strict'

/** The host's own account entry in the footer. */
const ACCOUNT = '[data-dsh-deepcraft-part~="foot-area"] [aria-haspopup="menu"][data-signed-out]'
/** Whatever a plugin mounted in the footer's action slot. */
const FOOTER_ENTRY = '[data-slot="sidebar.footer.action"] > *'
/** The Cordis panel's footer action, where the host mounts one. */
const CORDIS_ACTION = '[data-slot="sidebar.footer.action"] button[data-cordis-badge]'
/** The host's panel, mounted beside that button while it is open. */
const CORDIS_PANEL = '[data-cordis-panel]'
/** The connection indicator's outage state: a button naming the retry action. */
const OUTAGE = '[data-dsh-deepcraft-part~="foot-area"] button[data-phase="disconnected"]'

function hostVisibilityScenario({ check }) {
  return {
    script: 'greeting',
    prompt: 'hello there',
    async afterTurn(context) {
      const { page, notes, session } = context
      const browser = session.context

      const account = page.locator(ACCOUNT).first()
      await account.waitFor({ state: 'visible', timeout: 20000 })
      const foot = await page.locator('[data-dsh-deepcraft-part~="foot-area"]').first().boundingBox()
      notes.footer = {
        account: { box: await account.boundingBox(), foot, label: await account.getAttribute('aria-label') },
        entries: await page.evaluate((selector) => [...document.querySelectorAll(selector)].map((node) => {
          const box = node.getBoundingClientRect()
          return {
            label: node.getAttribute('aria-label') ?? (node.textContent || '').trim().slice(0, 40),
            display: getComputedStyle(node).display,
            width: box.width,
            height: box.height,
            marked: node.hasAttribute('data-dsh-deepcraft-footer-entry') || node.hasAttribute('data-dsh-deepcraft-footer-hidden'),
          }
        }), FOOTER_ENTRY),
      }

      await account.click()
      // The host portals its menu to <body>; a card elsewhere in the page is
      // another surface's, not the menu this press opened.
      const menu = page.locator('body > [role="menu"]').first()
      const menuOpen = await menu.waitFor({ state: 'visible', timeout: 10000 }).then(() => true, () => false)
      notes.footer.menu = menuOpen ? { box: await menu.boundingBox(), items: await menu.locator('[role="menuitem"]').count() } : null
      if (menuOpen) await page.keyboard.press('Escape')
      notes.footer.menuClosed = menuOpen
        ? await menu.waitFor({ state: 'detached', timeout: 5000 }).then(() => true, () => false)
        : false

      const cordis = page.locator(CORDIS_ACTION).first()
      notes.footer.cordis = { present: await cordis.count() > 0 }
      if (notes.footer.cordis.present) {
        await cordis.waitFor({ state: 'visible', timeout: 10000 })
        notes.footer.cordis.box = await cordis.boundingBox()
        await cordis.click()
        const panel = page.locator(CORDIS_PANEL).first()
        notes.footer.cordis.panel = await panel.waitFor({ state: 'visible', timeout: 10000 })
          .then(async () => panel.boundingBox(), () => null)
        await cordis.click()
        notes.footer.cordis.panelAfter = await page.locator(CORDIS_PANEL).count()
      }

      const outage = page.locator(OUTAGE).first()
      notes.connection = {
        start: await page.evaluate(() => ({ online: navigator.onLine, outage: document.querySelectorAll('button[data-phase]').length })),
      }
      try {
        await browser.setOffline(true)
        let visible = true
        await outage.waitFor({ state: 'visible', timeout: 20000 }).catch(() => { visible = false })
        notes.connection.offline = {
          online: await page.evaluate(() => navigator.onLine),
          visible,
          box: visible ? await outage.boundingBox() : null,
          label: visible ? await outage.getAttribute('aria-label') : null,
        }
        if (visible) await outage.click()
      } finally {
        await browser.setOffline(false)
      }
      const cleared = await page.locator('[data-dsh-deepcraft-part~="foot-area"] button[data-phase]').first()
        .waitFor({ state: 'detached', timeout: 25000 }).then(() => true, () => false)
      notes.connection.restored = {
        online: await page.evaluate(() => navigator.onLine),
        cleared,
        outageLeft: await page.locator(OUTAGE).count(),
      }
      notes.connection.updatePill = await page.evaluate(() => document.querySelectorAll('[data-dsh-deepcraft-part~="settings-area"] button[aria-disabled]:not([aria-haspopup])').length)
    },
    async assert({ notes, session }) {
      const footer = notes.footer
      const connection = notes.connection
      const problems = session.problems.filter((line) => !/\[connection\]|ERR_INTERNET_DISCONNECTED/.test(line))
      const accountInside = footer.account.box !== null && footer.account.foot !== null &&
        footer.account.box.x >= footer.account.foot.x - 1 &&
        footer.account.box.x + footer.account.box.width <= footer.account.foot.x + footer.account.foot.width + 1 &&
        footer.account.box.width > 0 && footer.account.box.height > 0
      const entriesShown = footer.entries.every((entry) => entry.display !== 'none' && entry.width > 0 && entry.height > 0 && entry.marked === false)
      const checks = [
        check('宿主的账户入口在页脚内可见，真实点击打开它自己的菜单并在 Esc 后收起',
          accountInside && typeof footer.account.label === 'string' && footer.account.label.length > 0 &&
          footer.menu !== null && footer.menu.items > 0 && footer.menu.box !== null &&
          footer.menu.box.width > 0 && footer.menu.box.height > 0 && footer.menuClosed === true,
          JSON.stringify(footer)),
        check('页脚动作插槽里宿主挂载的入口都保留自己的盒子，主题不隐藏也不改写',
          entriesShown, JSON.stringify(footer.entries)),
      ]
      if (footer.cordis.present) {
        checks.push(check('Cordis 的页脚入口可见，点击打开宿主自己的面板，再点关闭',
          footer.cordis.box !== null && footer.cordis.box.width > 0 && footer.cordis.box.height > 0 &&
          footer.cordis.panel !== null && footer.cordis.panel.width > 0 && footer.cordis.panel.height > 0 &&
          footer.cordis.panelAfter === 0,
          JSON.stringify(footer.cordis)))
      }
      checks.push(
        check('离线后宿主的断线按钮可见，并接受一次真实点击',
          connection.offline.online === false && connection.offline.visible === true &&
          connection.offline.box !== null && connection.offline.box.width > 0 &&
          typeof connection.offline.label === 'string' && connection.offline.label.length > 0,
          JSON.stringify(connection.offline)),
        check('恢复联网后断线提示收起，页面回到在线',
          connection.restored.online === true && connection.restored.cleared === true && connection.restored.outageLeft === 0,
          JSON.stringify(connection.restored)),
        check('除断线重连的预期提示外，控制台没有异常', problems.length === 0, problems.slice(0, 3).join(' | ')),
      )
      return checks
    },
  }
}

module.exports = { hostVisibilityScenario }
