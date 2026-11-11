#!/usr/bin/env node
/**
 * settings-route.cjs — entering the skin's settings page from the host's shell
 * (D66).
 *
 * The way in is the host's own shortcut, and which shell answers it decides the
 * route: the older web shell opens the settings dialog itself, while the newer
 * one — the desktop and the current web shell — answers it with its account
 * menu, whose settings row leads to the dialog. Both lanes that walk the
 * settings page come in through here, so the route lives in one place.
 */
'use strict'
const { bound } = require('./bounds.cjs')

/** The skin's settings root: what both routes end on. */
const SETTINGS_PAGE = '.dsh-deepcraft-settings'

/** How long the settings dialog may take after its entry is pressed. */
const SETTINGS_WAIT_MS = bound('settingsRouteDialogWaitMs')

/**
 * Open the skin's settings page in the host's shell.
 *
 * The page registers into the host's settings dialog, so the dialog has to be
 * open first. The host offers two entries and which one exists depends on the
 * shell: a settings button in the sidebar footer, or the settings row of the
 * account menu (the desktop keeps it there). The direct shortcut opens the
 * dialog itself on some shell versions; it is tried first and the entries are
 * the fallback, exactly the path the skin's own Ctrl+, drive presses.
 *
 * @param page - the Playwright page on the host.
 */
async function openSkinSettings(page) {
  const settings = page.locator(SETTINGS_PAGE).first()
  const visible = () => settings.isVisible().catch(() => false)
  await page.keyboard.press('Control+Alt+Comma')
  if (!await settings.waitFor({ state: 'visible', timeout: 3000 }).then(() => true, () => false)) {
    // The footer's settings button opens the dialog directly where the host
    // has one; the desktop keeps that entry inside the account menu instead.
    const button = page.locator('[data-dsh-deepcraft-part~="settings-area"] button[aria-haspopup="dialog"]').first()
    if (await button.count() > 0) {
      await button.click()
      await page.waitForTimeout(600)
    }
  }
  if (!await visible()) {
    const trigger = page.locator('[aria-haspopup="menu"][data-signed-out]').first()
    if (await trigger.count() > 0) {
      await trigger.click()
      await page.waitForTimeout(400)
      // The settings row is marked with its keyboard shortcut on one host build
      // and stands first on another; the label is read here, where the interface
      // language is known, and only the shortcut path is label-free.
      const marked = page.locator('[role="menu"] [role="menuitem"][aria-keyshortcuts]').first()
      const named = page.locator('[role="menu"] [role="menuitem"]').filter({ hasText: /^(Settings|设置)$/ }).first()
      const row = await marked.count() > 0 ? marked : named
      if (await row.count() > 0) {
        // Dispatched rather than clicked: opening the dialog detaches the menu
        // under the pointer, and a real click would lose that race.
        await row.dispatchEvent('click')
        await page.waitForTimeout(800)
      }
    }
  }
  const entry = page.getByText('DeepCraft', { exact: true }).first()
  await entry.click({ force: true })
  await settings.waitFor({ timeout: SETTINGS_WAIT_MS })
}

/**
 * Write the reader's custom accent through the colour well. React reads the
 * native setter's write; a plain `value =` update is invisible to it.
 *
 * @param page - the Playwright page on the host.
 * @param value - a `#rrggbb` colour.
 */
async function setAccentColor(page, value) {
  await page.evaluate((hex) => {
    const input = document.querySelector('.dsh-deepcraft-settings-color')
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
    setter.call(input, hex)
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new Event('change', { bubbles: true }))
  }, value)
}

module.exports = { openSkinSettings, setAccentColor, SETTINGS_PAGE }
