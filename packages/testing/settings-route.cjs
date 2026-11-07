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
 * @param page - the Playwright page on the host.
 */
async function openSkinSettings(page) {
  await page.keyboard.press('Control+Alt+Comma')
  // The shortcut opens the dialog itself on the current shell. On the older
  // one it opens the account menu instead, and the dialog waits one entry in.
  // The entry is dispatched rather than clicked: opening the dialog detaches
  // the menu under the pointer, and a real click would lose that race.
  const settings = page.locator(SETTINGS_PAGE).first()
  const direct = await settings.waitFor({ state: 'visible', timeout: 6000 }).then(() => true, () => false)
  if (!direct) {
    const entry = page.locator('[role="menu"] [role="menuitem"]').first()
    if (await entry.count() > 0) {
      await entry.dispatchEvent('click')
      await page.waitForTimeout(800)
    }
  }
  await page.getByText('DeepCraft', { exact: true }).first().click({ force: true })
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
