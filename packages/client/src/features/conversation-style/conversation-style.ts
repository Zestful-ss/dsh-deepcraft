import { CHAT_STYLE_ATTR } from '../../constants'
import type { FeatureUi } from '../../core/feature'
import type { HostContext } from '@dsh-deepcraft/engine/host'
import type manifest from './conversation-style.manifest'

/**
 * The reading layout is the only conversation layout: the body flag exists as
 * the stylesheets' lifecycle mark, set for as long as this theme owns the page.
 */
export function install(_ctx: HostContext, ui: FeatureUi<typeof manifest>) {
  document.body.setAttribute(CHAT_STYLE_ATTR, 'reader')
  // The attribute reflows the composer after this frame's measurements.
  ui.schedule?.()

  return () => {
    document.body.removeAttribute(CHAT_STYLE_ATTR)
  }
}
