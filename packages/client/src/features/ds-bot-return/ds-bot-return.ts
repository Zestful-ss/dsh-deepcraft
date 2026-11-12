import { DS_BOT_ACCOUNT_SELECTOR, DS_BOT_FOOT_SELECTOR } from '@dsh-deepcraft/contracts/dom'
import { subscribeMutations } from '@dsh-deepcraft/engine/bus'
import { cacheFirstMatch } from '@dsh-deepcraft/engine/host'
import { readPrefs, subscribePrefs } from '../../core/prefs'
import type { Prefs } from '@dsh-deepcraft/contracts/prefs'
import { DS_BOT_AGENT_MODE, DS_BOT_MODE_KEY, pageOwner, subscribePageOwner } from '../../shared/visual-owner'

/**
 * The one control this theme keeps while ds-bot's Bot surface owns the page
 * (D82): a return pill at the start of ds-bot's own sidebar footer, beside its
 * account button. Bot surface has no reverse of the one-click entry ds-bot
 * puts on the host, and no mode API, so the pill writes ds-bot's saved mode
 * and reloads. It reads no theme stylesheet or token: the page has neither
 * while it is yielded.
 *
 * Newer ds-bot paints its own sidebar and no longer renders the host's footer
 * action slot, so the pill is put into the account row itself; the host slot
 * entry alone was invisible on those versions.
 */

const BUTTON_CLASS = 'dsh-deepcraft-ds-bot-return'
const STYLE_ATTRIBUTE = 'data-dsh-deepcraft-ds-bot-return'

const STYLE = `
.${BUTTON_CLASS}{display:inline-flex;align-self:center;flex:none;align-items:center;gap:6px;box-sizing:border-box;height:32px;max-width:150px;padding:0 12px;border:1px solid var(--bt-line,rgba(0,0,0,.14));border-radius:999px;background:var(--bt-card,#fff);color:var(--bt-ink,#141413);font-family:var(--bt-font,inherit);font-size:13px;font-weight:500;line-height:20px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer;box-shadow:0 1px 2px rgba(0,0,0,.08)}
.${BUTTON_CLASS}:hover{background:var(--bt-hover,rgba(0,0,0,.05))}
.${BUTTON_CLASS}:active{transform:scale(.97)}
.${BUTTON_CLASS}:focus-visible{outline:2px solid var(--bt-star,#4d6bfe);outline-offset:2px}
`

export function install() {
  const findFoot = cacheFirstMatch<HTMLElement>(DS_BOT_FOOT_SELECTOR)
  const findAccount = cacheFirstMatch<HTMLElement>(DS_BOT_ACCOUNT_SELECTOR)

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
  const onClick = () => {
    // No ds-bot API switches the surface live; its saved mode is the path it
    // reads at boot. A reload is the only reliable way back without touching
    // its React tree (D82).
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
