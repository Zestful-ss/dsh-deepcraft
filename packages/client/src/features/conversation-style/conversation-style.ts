import { CHAT_STYLE_ATTR } from '../../constants'
import type { Prefs } from '../../constants'
import { readPrefs } from '../../core/prefs'
import type { FeatureUi } from '../../core/feature'
import type { HostContext } from '@dsh-deepcraft/engine/host'
import type manifest from './conversation-style.manifest'

/** Apply the selected arrangement while this theme owns the page. */
export function install(_ctx: HostContext, ui: FeatureUi<typeof manifest>) {
  let current: Prefs['chatStyle'] | null = null

  function sync() {
    const next = readPrefs().chatStyle
    if (next === current) return
    document.body.setAttribute(CHAT_STYLE_ATTR, next)
    current = next
    // The attribute reflows the composer after this frame's measurements.
    ui.schedule?.()
  }

  ui.conversationStyle = { sync }
  sync()

  return () => {
    document.body.removeAttribute(CHAT_STYLE_ATTR)
    delete ui.conversationStyle
  }
}
