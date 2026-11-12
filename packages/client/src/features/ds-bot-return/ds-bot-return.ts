import * as React from 'react'
import { PACKAGE_NAME } from '../../constants'
import { readPrefs, subscribePrefs } from '../../core/prefs'
import type { Prefs } from '@dsh-deepcraft/contracts/prefs'
import { hostSlots } from '@dsh-deepcraft/engine/host'
import type { HostContext } from '@dsh-deepcraft/engine/host'
import { DS_BOT_AGENT_MODE, DS_BOT_MODE_KEY, pageOwner, subscribePageOwner } from '../../shared/visual-owner'

/**
 * The one control this theme keeps while ds-bot's Bot surface owns the page
 * (D82): a return pill in the host's sidebar footer action slot, beside
 * ds-bot's own account entry. Bot surface has no reverse of the
 * one-click entry ds-bot puts on the host, and no mode API, so the pill writes
 * ds-bot's saved mode and reloads. It reads no theme stylesheet or token: the
 * page has neither while it is yielded.
 */

const BUTTON_CLASS = 'dsh-deepcraft-ds-bot-return'
const STYLE_ATTRIBUTE = 'data-dsh-deepcraft-ds-bot-return'
/** The host slot ds-bot's Bot sidebar keeps mounted for its own account and connector entries. */
const FOOTER_SLOT = 'sidebar.footer.action'

const STYLE = `
.${BUTTON_CLASS}{display:inline-flex;align-items:center;gap:6px;box-sizing:border-box;height:32px;max-width:150px;padding:0 12px;border:1px solid var(--bt-line,rgba(0,0,0,.14));border-radius:999px;background:var(--bt-card,#fff);color:var(--bt-ink,#141413);font-family:var(--bt-font,inherit);font-size:13px;font-weight:500;line-height:20px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer;box-shadow:0 1px 2px rgba(0,0,0,.08)}
.${BUTTON_CLASS}:hover{background:var(--bt-hover,rgba(0,0,0,.05))}
.${BUTTON_CLASS}:active{transform:scale(.97)}
.${BUTTON_CLASS}:focus-visible{outline:2px solid var(--bt-star,#4d6bfe);outline-offset:2px}
`

/** Whether ds-bot's Bot surface owns the page now, followed as the owner changes. */
function useBotSurface() {
  const [bot, setBot] = React.useState(() => pageOwner() === 'ds-bot')
  React.useEffect(() => subscribePageOwner(next => setBot(next === 'ds-bot')), [])
  return bot
}

/** The reader's own brand on the pill, followed as the preference changes. */
function useBrandName() {
  const [name, setName] = React.useState(() => readPrefs().brandName.trim() || 'DeepCraft')
  React.useEffect(() => subscribePrefs((prefs: Prefs) => setName(prefs.brandName.trim() || 'DeepCraft')), [])
  return name
}

/** The return pill itself; the host renders it in the footer slot ds-bot also fills. */
function ReturnPill() {
  const bot = useBotSurface()
  const name = useBrandName()
  if (!bot) return null
  return React.createElement(
    'button',
    {
      type: 'button',
      className: BUTTON_CLASS,
      onClick: () => {
        // No ds-bot API switches the surface live; its saved mode is the path
        // it reads at boot. A reload is the only reliable way back without
        // touching its React tree (D82).
        localStorage.setItem(DS_BOT_MODE_KEY, DS_BOT_AGENT_MODE)
        location.reload()
      },
    },
    React.createElement('span', { 'aria-hidden': true }, '←'),
    React.createElement('span', null, name),
  )
}

export function install(ctx: HostContext) {
  const style = document.createElement('style')
  style.setAttribute(STYLE_ATTRIBUTE, '')
  style.textContent = STYLE
  document.head.append(style)

  let fiber: { dispose?: () => void } | null = null
  if (typeof ctx.inject === 'function') {
    fiber = ctx.inject(['slots'], (scope) => {
      const slots = hostSlots(scope)
      if (slots === null) return
      // The host seats its account at the footer's start and ds-bot's connector
      // entry stands at -100; -250 puts the pill between them, beside the
      // account on the Bot side.
      scope.effect(() => slots.inject(FOOTER_SLOT, () => slots.register(
        {
          name: FOOTER_SLOT,
          id: `${PACKAGE_NAME}-return`,
          order: -250,
        },
        ReturnPill,
      )), 'dsh-deepcraft: ds-bot return pill')
    })
  }

  return () => {
    fiber?.dispose?.()
    style.remove()
  }
}
