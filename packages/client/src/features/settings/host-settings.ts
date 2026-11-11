import { SETTINGS_BUTTON_SELECTOR } from '@dsh-deepcraft/contracts/dom'
import { findFootArea, findHostMenu } from '@dsh-deepcraft/engine/host'
import { hasSkinClass } from '@dsh-deepcraft/engine/dom'

/** Rhythm and give-up point of the poll for the host's account menu after the trigger's own click. */
const MENU_LOOK_INTERVAL_MS = 40
const MENU_LOOK_TRIES = 20

/** A click the host's React handlers actually see (pointerdown + click). */
function realClick(el: HTMLElement) {
  const rect = el.getBoundingClientRect()
  const init = {
    bubbles: true, cancelable: true, composed: true, button: 0, buttons: 1,
    clientX: Math.round(rect.left + rect.width / 2),
    clientY: Math.round(rect.top + rect.height / 2)
  }
  el.dispatchEvent(new PointerEvent('pointerdown', init))
  el.dispatchEvent(new MouseEvent('mousedown', init))
  el.dispatchEvent(new PointerEvent('pointerup', init))
  el.dispatchEvent(new MouseEvent('mouseup', init))
  el.click()
}

/** The settings page's way into the host's own settings dialog. */
export interface HostSettings {
  /** Open the host's settings through the entry it provides. */
  openSettings(): void
  /** Drop the poll for the host's account menu. */
  stopSettingsDrive(): void
}

/**
 * The host's own way into its settings, for Ctrl+, and the page's own
 * entry: the settings button where the host has one, or else the settings
 * row of its account menu, which is where the desktop keeps it. Nothing here
 * draws or moves a host control; it presses what the host already offers.
 */
export function createHostSettings(): HostSettings {
  /** The wait between two looks for the host's menu, while one is in flight. */
  let lookTimer: ReturnType<typeof setTimeout> | undefined

  /**
   * The host's account trigger: the menu anchor the host itself marks with
   * the sign-in state (`data-signed-out`). The footer scope comes first —
   * that is where the account row lives — and the document is the fallback
   * for a host that seats it elsewhere.
   */
  function hostAccountTrigger() {
    const foot = findFootArea()
    const scopes: (ParentNode | null)[] = [foot, document]
    for (const scope of scopes) {
      if (scope === null) continue
      const el = scope.querySelector<HTMLElement>('[aria-haspopup="menu"][data-signed-out]')
      if (el !== null && !hasSkinClass(el)) return el
    }
    return null
  }

  /**
   * The host's settings button, a dialog trigger in the footer, or null. The
   * desktop has none: its account menu took that slot and carries 设置
   * itself, and "any button that is not a menu anchor" there is the update
   * pill beside it. The account trigger matches the settings area's own
   * shape, so it is turned away here.
   */
  function hostSettingsTrigger() {
    const foot = findFootArea()
    if (foot === null) return null
    const trigger = foot.querySelector<HTMLElement>(SETTINGS_BUTTON_SELECTOR)
    return trigger !== null && trigger === hostAccountTrigger() ? null : trigger
  }

  /**
   * The host's open account menu, or null while it is closed. Identified
   * through the trigger, never through the menu's text: the account trigger
   * reports `aria-expanded` while its menu is up, so the open host menu is
   * the account menu.
   */
  function findAccountMenu() {
    const trigger = hostAccountTrigger()
    if (trigger === null || trigger.getAttribute('aria-expanded') !== 'true') return null
    return findHostMenu()
  }

  /**
   * The settings row of an open account menu. A host build that lists the
   * shortcut marks the row with `aria-keyshortcuts`; one that does not keeps
   * Settings as the menu's first row. The visible label follows the interface
   * language and is never read.
   */
  function settingsRowOf(menu: Element) {
    return menu.querySelector<HTMLElement>('[role="menuitem"][aria-keyshortcuts]')
      ?? menu.querySelector<HTMLElement>('[role="menuitem"]')
  }

  /** Open the host's settings through whichever entry the host provides. */
  function openSettings() {
    const trigger = hostSettingsTrigger()
    if (trigger !== null) {
      trigger.click()
      return
    }
    const account = hostAccountTrigger()
    if (account === null) return
    realClick(account)
    let tries = 0
    function look(account: HTMLElement) {
      lookTimer = undefined
      const menu = findAccountMenu()
      if (menu !== null) {
        const row = settingsRowOf(menu)
        if (row === null) {
          // No settings row in this menu: fold it back, the drive is over.
          realClick(account)
          return
        }
        const previous = menu.style.visibility
        menu.style.visibility = 'hidden'
        realClick(row)
        menu.style.visibility = previous
        return
      }
      if (tries++ > MENU_LOOK_TRIES) return
      lookTimer = setTimeout(() => { look(account) }, MENU_LOOK_INTERVAL_MS)
    }
    lookTimer = setTimeout(() => { look(account) }, MENU_LOOK_INTERVAL_MS)
  }

  /** Drop the poll for the host's menu; the settings page's teardown calls this. */
  function stopSettingsDrive() {
    clearTimeout(lookTimer)
    lookTimer = undefined
  }

  return { openSettings, stopSettingsDrive }
}
