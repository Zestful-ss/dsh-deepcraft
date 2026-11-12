/**
 * The constants the build reads out of the browser half: the gate attributes
 * scripts/css.mjs checks on the syntax tree, the document attributes the
 * preferences resolve onto, and the feature gates. The stylesheets spell the
 * attributes out; the build holds every one they read to a name the browser
 * half writes. The identity constants and the host half's route re-exports live
 * here too.
 *
 * The preference vocabulary is the shared declaration
 * (packages/contracts/src/prefs.ts, D73): the values a preference holds, the
 * table that declares them, `Prefs` and the defaults. What this file adds is the
 * skin's own — the document attribute each value resolves onto, the feature
 * gates, and the identity constants.
 */
export * from '@dsh-deepcraft/contracts/prefs'
import { PACKAGE_NAME } from '@dsh-deepcraft/contracts/package'
export { PACKAGE_NAME }

export const STYLE_ID = 'dsh-deepcraft-style'

/**
 * Settings identity.
 *
 * A settings namespace IS a profile entry id and its schema IS the entry's
 * Config, so the id below is what both halves address — read off the
 * running loader entry where possible, with the id `cordis.patch.yml`
 * inserts as the fallback.
 *
 * PACKAGE_NAME is the other half of the contract: a bundle's own
 * configuration is a `plugins.bundle.config` entry keyed by the bundle's
 * package name, which is what makes it render on this plugin's page.
 */
export const SETTINGS_ENTRY_FALLBACK = 'ui-skin-deepcraft'
/**
 * The skin stylesheet's own key in the client module system's bookkeeping:
 * the sheet is mounted tagged `data-plugin="<PACKAGE_NAME>"` and
 * `data-plugin-css="<STYLE_PLUGIN_CSS>"`, which is what keeps the host's
 * claim sweep and every sibling package's removal off it (D9).
 */
export const STYLE_PLUGIN_CSS = `${PACKAGE_NAME}/client.css`
/**
 * The tag this package gives a sibling's untagged stylesheet so the host's
 * claim sweep cannot attribute it to this package (D9). It carries a slash,
 * so it can never equal a package name — the id every removal step matches
 * on — and no package's reload takes the sheet away.
 */
export const FOREIGN_SHEET_TAG = `${PACKAGE_NAME}/foreign-sheet`
export const BUNDLE_CONFIG_SLOT = 'plugins.bundle.config'
export const SETTINGS_SECTION_SLOT = 'settings.section'
/**
 * The plugin's own repository. The settings page's heading links to it, and
 * the address is read from here rather than written into the component.
 */
export const REPOSITORY_URL = 'https://github.com/Zestful-ss/dsh-deepcraft'


/**
 * The custom brand layer over the default identity (D80, packages/client/src/features/brand/brand.ts). Each part stands only while
 * the reader has supplied it: CUSTOM_MARK_ATTR while a mark image is in place,
 * CUSTOM_WORD_ATTR as `image` while a wordmark image is and as `text` while
 * only a brand name is, CUSTOM_TINT_ATTR while the images take the text colour
 * (`brandInk` set to `text`), and ACCENT_ATTR while a custom accent colour is
 * set. The images, the name and the colour ride <body> as custom properties.
 */
export const CUSTOM_MARK_ATTR = 'data-dsh-deepcraft-custom-mark'
export const CUSTOM_WORD_ATTR = 'data-dsh-deepcraft-custom-word'
export const CUSTOM_WORD_IMAGE = 'image'
export const CUSTOM_WORD_TEXT = 'text'
export const CUSTOM_TINT_ATTR = 'data-dsh-deepcraft-custom-tint'
export const ACCENT_ATTR = 'data-dsh-deepcraft-accent'

/** The document attribute the resolved animation answer rides. */
export const MOTION_ATTR = 'data-dsh-deepcraft-motion'

/** The document attributes the choices below resolve onto; the values themselves are in the table (contracts/prefs.ts). */
export const PALETTE_ATTR = 'data-dsh-deepcraft-palette'
export { FONT_CODE_ATTR, FONT_PROSE_ATTR, FONT_UI_ATTR } from './theme/fonts'
export const MASCOT_ATTR = 'data-dsh-deepcraft-mascot'
/**
 * The reader's wallpaper choices the stylesheet keys on (theme/wallpaper.css):
 * WALLPAPER_ATTR carries `wallpaperSource` (`custom` while the layer stands,
 * `none` while it does not), and LITE_ATTR is present (value `1`) while the
 * low-power choice stills the video and drops the blur.
 */
export const WALLPAPER_ATTR = 'data-dsh-deepcraft-wallpaper'
export const WALLPAPER_LITE_ATTR = 'data-dsh-deepcraft-wallpaper-lite'
/** The mascot "follow the theme" resolves to: the reader's one Petdex package, shared by both places. */
export const MASCOT_PETDEX = 'petdex'
/**
 * On a node the skin owns purely for its own bookkeeping. The shared scheduler
 * ignores mutations against such a node (D40), so measuring or redrawing
 * never wakes a pass that no feature needs.
 */
export const QUIET_ATTR = 'data-dsh-deepcraft-quiet'
/**
 * On a host element the stylesheet keys on, carrying the name of the part it
 * plays (packages/client/src/core/parts.ts). Every rule that used to match a
 * fragment of a hashed host class name reads this attribute instead, so a match
 * is exact, a host upgrade that drops the element leaves the part unresolved
 * rather than silently matching something else, and no other skin's class name
 * can collide with these rules (D3).
 */
export const PART_ATTR = 'data-dsh-deepcraft-part'
/**
 * On a host element, naming the parts its own subtree holds
 * (packages/client/src/core/parts.ts, core/parts-table.ts). A rule that used to ask
 * the browser whether an element contains another (`A:has(B)`) reads this
 * mark instead: the marking pass already walks the subtree, so the answer
 * costs one attribute read rather than a style pass over every candidate
 * (D9). The values are the relation names declared in the parts table.
 */
export const HOLDS_ATTR = 'data-dsh-deepcraft-holds'
/**
 * The handoff marker: stamped on `body` while this build is live AND able
 * to give the page back (D81). Its presence is a capability another
 * package can read without running anything: a skin that lists this theme
 * as one of its looks has to know the page can come back, and a build from
 * before D81 does not stamp it.
 */
export const HANDOFF_ATTR = 'data-dsh-deepcraft-handoff'
/**
 * The document attribute the skin center stamps while a skin is painting
 * (D81). It is read at boot and watched afterwards: the value is the skin
 * id, and the presence means the page belongs to a skin.
 */
export const SKIN_STAMP_ATTR = 'data-dsh-skin'
/**
 * On the host's scroller around the settings page while the page is
 * mounted (packages/client/src/features/settings/settings.ts): the stylesheet keeps the
 * scrollbar's room there, so switching tabs never shifts the layout.
 */
export const SETTINGS_SCROLLER_ATTR = 'data-dsh-deepcraft-settings-scroller'

/**
 * The host half's private routes, under this half's own names. The paths are
 * the shared contract (packages/contracts/src/routes.ts, D73), declared once
 * for both halves.
 */
export {
  BRAND_MARK_PATH as BRAND_MARK_ROUTE,
  BRAND_PATH as BRAND_ROUTE,
  BRAND_WORDMARK_PATH as BRAND_WORDMARK_ROUTE,
  PETS_ENSURE_PATH as PETS_ENSURE_ROUTE,
  PETS_IMAGE_PATH as PETS_IMAGE_ROUTE,
  PETS_IMPORT_PATH as PETS_IMPORT_ROUTE,
  PETS_IMPORT_URL_PATH as PETS_IMPORT_URL_ROUTE,
  PETS_PATH as PETS_ROUTE,
  SESSION_DELETE_PATH as SESSION_DELETE_ROUTE,
  SUBAGENT_MODELS_PATH as SUBAGENT_MODELS_ROUTE,
  USAGE_PATH as USAGE_ROUTE,
  WALLPAPER_FILE_PATH as WALLPAPER_FILE_ROUTE,
  WALLPAPER_PATH as WALLPAPER_ROUTE,
} from '@dsh-deepcraft/contracts/routes'
