import { BAN_LOCALE_EN, BAN_LOCALE_ZH, BRAND_CLAUDE } from '../../constants'
import type { FeatureManifest } from '../../core/feature'

/** The theme the account-hold easter egg belongs to (D77). */
const brands = [BRAND_CLAUDE] as const

export default {
  id: 'ban',
  order: 130,
  load: 'deferred',
  brands,
  contracts: ['api.window-controls', 'shell.fullscreen', 'shell.platform', 'shell.top-clearance', 'shell.windows-titlebar'],
  // The page's language is the switch: `off` is the third value of that row,
  // which stands under the footer takeover whose popover holds the account row.
  pref: 'banLocale',
  prefValues: [BAN_LOCALE_EN, BAN_LOCALE_ZH],
  stylesheets: [{ file: 'ban-screen.css', rank: 250 }],
  settingsRows: [{
    tab: 'sidebar',
    rank: 15,
    pref: 'banLocale',
    parent: 'collapseFooter',
    requires: { pref: 'brand', values: brands, note: 'banThemeRequired' },
    title: 'banLocaleTitle',
    desc: 'banLocaleDesc',
    choiceLabels: { off: 'banLocaleOff', zh: 'banLocaleZh', en: 'banLocaleEn' },
  }],
  cases: ['desktop', 'settings']
} satisfies FeatureManifest
