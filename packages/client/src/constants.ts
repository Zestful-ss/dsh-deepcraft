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
/** The surface sheets' own element, which stays while ds-bot's surface has the page (D74). */
export const SURFACE_STYLE_ID = 'dsh-deepcraft-surface'

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
/** The surface sheets' key in the same bookkeeping. */
export const SURFACE_PLUGIN_CSS = `${PACKAGE_NAME}/surface.css`
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
export const TYPEFACE_ATTR = 'data-dsh-deepcraft-typeface'
export const MASCOT_ATTR = 'data-dsh-deepcraft-mascot'
/** The mascot "follow the theme" resolves to: the reader's one Petdex package, shared by both places. */
export const MASCOT_PETDEX = 'petdex'
export const SEARCH_STYLE_ATTR = 'data-dsh-deepcraft-search-style'
export const STATS_POSITION_ATTR = 'data-dsh-deepcraft-stats-position'
/**
 * Present while the ported chat-area follow is installed
 * (packages/client/src/features/chat-follow/). The rules hanging off it are that
 * feature's own: a capped process group's body scrolls vertically alone, so the
 * catch-up measures the same distance the host's own smooth scroll does; the
 * host's back-to-end button is placed over the composer; and the waiting line is
 * pinned above it (packages/client/src/features/chat-wait/chat-wait.css).
 * Switched off, the chat area is handed back untouched.
 */
export const CHAT_FOLLOW_ATTR = 'data-dsh-deepcraft-chat-follow'
/**
 * On the flow column while a door rolls
 * (packages/client/src/features/chat-follow/chat-follow.ts). A door's height
 * change reads to the host as a reader who left the tail, and it takes its own
 * data-chat-following-tail away (D3) — the gate the waiting line's pin waits
 * for (packages/client/src/features/chat-wait/chat-wait.css). This mark stands
 * for that gate until the fold hands the follow back.
 */
export const FOLLOW_HOLD_ATTR = 'data-dsh-deepcraft-follow-hold'
/**
 * On a container the reader has taken over with his own scrolling
 * (packages/client/src/shared/scroll-owner.ts), until he comes back to its end. The
 * waiting line's pin (packages/client/src/features/chat-wait/chat-wait.css) reads it: a
 * pin stands only while the skin's own follow is the one moving the position,
 * never over content the reader scrolled back to.
 */
export const READER_HOLD_ATTR = 'data-dsh-deepcraft-reader-hold'
/**
 * On a user message the skin holds folded
 * (packages/client/src/features/chat-fold/message-fold.ts): the stylesheet
 * clamps the bubble to the fold's own cap and softens its bottom edge.
 */
export const MESSAGE_FOLD_ATTR = 'data-dsh-deepcraft-message-fold'
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
 * On the element the fold glide is pressing right now (packages/client/src/features/chat-fold/
 * fold-glide.ts): while it stands, the elements inside lay out at their
 * natural height instead of being squeezed by flex (fold-motion.css).
 */
export const CHAT_ROLLING_ATTR = 'data-dsh-deepcraft-rolling'
/**
 * Present while the ported automatic folding is installed
 * (packages/client/src/features/chat-fold/): the stylesheet's header-summary rules hang off it,
 * and switching the feature off hands the chat area back whole.
 */
export const CHAT_FOLD_ATTR = 'data-dsh-deepcraft-chat-fold'
/** Present while the skin takes over the sidebar footer (settings area + account row). */
export const FOOTER_ATTR = 'data-dsh-deepcraft-footer-takeover'
/**
 * Present while the context statistics are installed
 * (packages/client/src/features/context-stats/context-stats.ts). The host's two stat
 * dialogs are hidden only under it: their numbers are read into the
 * context popover instead, and switched off the feature hands them back.
 */
export const SESSION_STATS_ATTR = 'data-dsh-deepcraft-session-stats'
/**
 * Stamped on the host's own account menu card while it is open (Desktop
 * 0.1.7+). That card is the host's shared Menu portal and its class names
 * are hashed, so packages/client/src/features/account/surface.ts stamps this attribute and
 * features/account/account-footer.css repaints the card, its rows and its
 * separators with the skin's popover language.
 */
export const ACCOUNT_MENU_ATTR = 'data-dsh-deepcraft-account-menu'
/**
 * Set on <body> from the moment the account row is hovered or pressed until
 * its menu closes. The card's own marker needs the menu's rows to identify
 * the card, so it lands two or three frames after the host has already
 * painted the card; an entry animation keyed on it therefore replayed from
 * transparent over a card that was already visible. This one is in place
 * before the host mounts the card, so the animation runs from its first
 * frame.
 */
export const ACCOUNT_ARMED_ATTR = 'data-dsh-deepcraft-account-armed'
/**
 * Stamped on the host's account card by packages/client/src/features/account/surface.ts once
 * the card carries the skin's rows and the host has finished placing it.
 *
 * The host mounts the card with its own rows and places it from that
 * geometry; the skin's container lands a frame later and the card grows, and
 * the host re-places it a frame after that. Revealing on the mount frame
 * fades the card in at a height and a place it is about to leave — it appears
 * low and jumps up mid-fade — so features/account/account-footer.css holds it
 * inside the armed window until this marker lands, and the entry animation
 * hangs on this marker.
 */
export const ACCOUNT_READY_ATTR = 'data-dsh-deepcraft-account-ready'
/**
 * The handoff marker: stamped on `body` while this build is live AND able
 * to give the page back (D74). Its presence is a capability another
 * package can read without running anything: a skin that lists this theme
 * as one of its looks has to know the page can come back, and a build from
 * before D74 does not stamp it.
 */
export const HANDOFF_ATTR = 'data-dsh-deepcraft-handoff'
/**
 * The document attribute the skin center stamps while a skin is painting
 * (D74). It is read at boot and watched afterwards: the value is the skin
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
 * On a user message's bubble (features/chat-fold/message-fold.ts): the
 * bubble's speech shape rounds every corner but the tail's.
 */
export const USER_BUBBLE_ATTR = 'data-dsh-deepcraft-user-bubble'

/**
 * The host half's private routes, under this half's own names. The paths are
 * the shared contract (packages/contracts/src/routes.ts, D73), declared once
 * for both halves.
 */
export {
  BRAND_MARK_PATH as BRAND_MARK_ROUTE,
  BRAND_PATH as BRAND_ROUTE,
  BRAND_WORDMARK_PATH as BRAND_WORDMARK_ROUTE,
  HDSL_PATH as HDSL_ROUTE,
  HDSL_SKIN_PATH as HDSL_SKIN_ROUTE,
  PETS_ENSURE_PATH as PETS_ENSURE_ROUTE,
  PETS_IMAGE_PATH as PETS_IMAGE_ROUTE,
  PETS_IMPORT_PATH as PETS_IMPORT_ROUTE,
  PETS_IMPORT_URL_PATH as PETS_IMPORT_URL_ROUTE,
  PETS_PATH as PETS_ROUTE,
  SESSION_DELETE_PATH as SESSION_DELETE_ROUTE,
  SESSION_SEARCH_PATH as SESSION_SEARCH_ROUTE,
  SUBAGENT_MODELS_PATH as SUBAGENT_MODELS_ROUTE,
  USAGE_PATH as USAGE_ROUTE,
  USERNAME_PATH as USERNAME_ROUTE,
} from '@dsh-deepcraft/contracts/routes'
