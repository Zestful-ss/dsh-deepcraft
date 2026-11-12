import { DS_BOT_ACCOUNT_MENU_SELECTOR, DS_BOT_ACCOUNT_SELECTOR, DS_BOT_FOOT_SELECTOR, DS_BOT_SET_ROW_SELECTOR, DS_BOT_SETTINGS_LAYER_SELECTOR, DS_BOT_SOFT_BUTTON_SELECTOR, DS_BOT_SURFACE_ATTRIBUTE } from '@dsh-deepcraft/contracts/dom'
import { subscribeMutations } from '@dsh-deepcraft/engine/bus'
import { cacheFirstMatch } from '@dsh-deepcraft/engine/host'
import { readPrefs, subscribePrefs } from '../../core/prefs'
import type { Prefs } from '@dsh-deepcraft/contracts/prefs'
import { DS_BOT_AGENT_MODE, DS_BOT_MODE_KEY, pageOwner, subscribePageOwner } from '../../shared/visual-owner'

/**
 * The one control this theme keeps while ds-bot's Bot surface owns the page
 * (D82): a return pill at the start of ds-bot's own sidebar footer, beside its
 * account button. It walks ds-bot's own way back — the classic-agent item in
 * its account menu, or the mode switch in its settings — so the transition is
 * ds-bot's, not a reload. Only when neither control can be found does it write
 * ds-bot's saved mode and reload. It reads no theme stylesheet or token: the
 * page has neither while it is yielded.
 *
 * Newer ds-bot paints its own sidebar and no longer renders the host's footer
 * action slot, so the pill is put into the account row itself; the host slot
 * entry alone was invisible on those versions.
 */

const BUTTON_CLASS = 'dsh-deepcraft-ds-bot-return'
const STYLE_ATTRIBUTE = 'data-dsh-deepcraft-ds-bot-return'
/** The item or row that hands the page back in ds-bot's own words. */
const AGENT_LABEL = /switch to classic agent mode|classic agent mode|经典 agent 模式/i
/** ds-bot's settings entry in the account menu, before any locale's trailing shortcut. */
const SETTINGS_LABEL = /^(settings|bot settings|设置|設定)( |$)/i
const SEPARATOR_CLASS = 'bt-menu-sep'

const STYLE = `
.${BUTTON_CLASS}{display:inline-flex;align-self:center;flex:none;align-items:center;gap:6px;box-sizing:border-box;height:32px;max-width:150px;padding:0 12px;border:1px solid var(--bt-line,rgba(0,0,0,.14));border-radius:999px;background:var(--bt-card,#fff);color:var(--bt-ink,#141413);font-family:var(--bt-font,inherit);font-size:13px;font-weight:500;line-height:20px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer;box-shadow:0 1px 2px rgba(0,0,0,.08)}
.${BUTTON_CLASS}:hover{background:var(--bt-hover,rgba(0,0,0,.05))}
.${BUTTON_CLASS}:active{transform:scale(.97)}
.${BUTTON_CLASS}:focus-visible{outline:2px solid var(--bt-star,#4d6bfe);outline-offset:2px}
.${BUTTON_CLASS}:disabled{opacity:.55;cursor:default}
`

/** Wait for a control ds-bot mounts after a click, or give up. */
function until<T>(find: () => T | null, timeout: number): Promise<T | null> {
  return new Promise((resolve) => {
    const started = performance.now()
    const tick = () => {
      const found = find()
      if (found !== null) return resolve(found)
      if (performance.now() - started >= timeout) return resolve(null)
      setTimeout(tick, 40)
    }
    tick()
  })
}

const words = (element: Element) => (element.textContent ?? '').replace(/\s+/g, ' ').trim()

/** Whether ds-bot has withdrawn its surface, which is how its own switch reports success. */
function agentShown() {
  return !document.body.hasAttribute(DS_BOT_SURFACE_ATTRIBUTE)
}

export function install() {
  const findFoot = cacheFirstMatch<HTMLElement>(DS_BOT_FOOT_SELECTOR)
  const findAccount = cacheFirstMatch<HTMLElement>(DS_BOT_ACCOUNT_SELECTOR)
  const findMenu = cacheFirstMatch<HTMLElement>(DS_BOT_ACCOUNT_MENU_SELECTOR)
  const findLayer = cacheFirstMatch<HTMLElement>(DS_BOT_SETTINGS_LAYER_SELECTOR)

  /** Press ds-bot's own switch; false when this ds-bot version does not offer the path. */
  async function switchThroughDsBot() {
    const account = findAccount()
    if (account === null) return false
    account.click()
    const menu = await until(() => findMenu(), 1200)
    if (menu === null) return false
    const items = [...menu.querySelectorAll<HTMLElement>('[role="menuitem"]')]
    // 0.1.x puts the mode item in the menu itself.
    const direct = items.find(item => AGENT_LABEL.test(words(item)))
    if (direct !== undefined) {
      direct.click()
      return await until(() => agentShown() ? true : null, 2000) !== null
    }
    // 0.3.x keeps it in Settings → Mode. The menu's own structure still names
    // the row when the shell language is outside the labels above.
    const settings = items.find(item => SETTINGS_LABEL.test(words(item)))
      ?? items.find(item => item.nextElementSibling?.classList.contains(SEPARATOR_CLASS))
    if (settings === undefined) return false
    settings.click()
    const layer = await until(() => findLayer(), 2000)
    if (layer === null) return false
    const row = [...layer.querySelectorAll<HTMLElement>(DS_BOT_SET_ROW_SELECTOR)].find(candidate => AGENT_LABEL.test(words(candidate)))
    const control = row?.querySelector<HTMLElement>(DS_BOT_SOFT_BUTTON_SELECTOR) ?? null
    if (control === null) return false
    control.click()
    return await until(() => agentShown() ? true : null, 2000) !== null
  }

  const style = document.createElement('style')
  style.setAttribute(STYLE_ATTRIBUTE, '')
  style.textContent = STYLE
  document.head.append(style)

  const button = document.createElement('button')
  button.type = 'button'
  button.className = BUTTON_CLASS
  button.hidden = true
  const arrow = document.createElement('span')
  arrow.textContent = '←'
  arrow.setAttribute('aria-hidden', 'true')
  const label = document.createElement('span')
  button.append(arrow, label)

  /** The footer row the account button sits in, when the Bot surface owns the page. */
  function row() {
    if (pageOwner() !== 'ds-bot') return null
    const foot = findFoot()
    if (foot !== null && foot.isConnected) return foot
    const account = findAccount()
    if (account === null || !account.isConnected) return null
    return account.parentElement
  }

  let host: HTMLElement | null = null
  let offChild: (() => void) | null = null
  let offParent: (() => void) | null = null
  /** Put the pill before the account button; ds-bot re-renders the row, so put it back when React takes it out. */
  function mount(target: HTMLElement) {
    label.textContent = readPrefs().brandName.trim() || 'DeepCraft'
    button.disabled = false
    if (host === target && button.isConnected) return
    unmount()
    host = target
    target.prepend(button)
    button.hidden = false
    offChild = subscribeMutations(target, { childList: true }, () => {
      if (!button.isConnected) target.prepend(button)
    })
    if (target.parentElement !== null) {
      offParent = subscribeMutations(target.parentElement, { childList: true }, () => {
        if (!target.isConnected) place()
      })
    }
  }
  function unmount() {
    offChild?.()
    offChild = null
    offParent?.()
    offParent = null
    host = null
    button.remove()
  }
  /** Write the reader's brand on the pill, and keep it in the row while ds-bot owns the page. */
  function place() {
    label.textContent = readPrefs().brandName.trim() || 'DeepCraft'
    const target = row()
    if (target === null) unmount()
    else mount(target)
  }

  // ds-bot may paint its footer after this generation installed, so look for
  // it only while the Bot surface owns the page and stop at the first find.
  let looking: (() => void) | null = null
  function look() {
    if (looking !== null || pageOwner() !== 'ds-bot') return
    looking = subscribeMutations(document.body, { childList: true, subtree: true }, () => {
      if (row() === null) return
      stopLooking()
      place()
    })
  }
  function stopLooking() {
    looking?.()
    looking = null
  }

  const offOwner = subscribePageOwner(next => {
    if (next !== 'ds-bot') {
      stopLooking()
      unmount()
      return
    }
    look()
    place()
  })
  const offPrefs = subscribePrefs((prefs: Prefs) => {
    label.textContent = prefs.brandName.trim() || 'DeepCraft'
  })
  const onClick = async () => {
    if (button.disabled) return
    button.disabled = true
    let switched = false
    // ds-bot owns the switch, and a control that changed shape must not trap
    // the reader on the Bot page: the saved-mode reload below is the fallback.
    try { switched = await switchThroughDsBot() } catch { switched = false }
    if (switched) return
    button.disabled = false
    localStorage.setItem(DS_BOT_MODE_KEY, DS_BOT_AGENT_MODE)
    location.reload()
  }
  button.addEventListener('click', onClick)

  look()
  place()

  return () => {
    button.removeEventListener('click', onClick)
    offPrefs()
    offOwner()
    stopLooking()
    unmount()
    style.remove()
  }
}
