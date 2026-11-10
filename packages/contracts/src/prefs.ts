/**
 * The preferences: one declaration each, shared by both halves (D73).
 *
 * Every fact about a preference lives here once — its key, its type, the values
 * it accepts, its shipped default, the limit a text or a list keeps to, and the
 * shapes (or names) an earlier build stored. `Prefs`, the value constants the
 * browser half reads, the page attributes' defaults and the host half's Config
 * are derived from this table, so a preference is added by one entry here plus
 * the feature that reads it (its settings row follows the same table, D72).
 */
import { OFFICIAL_MODEL_GROUP } from './services'

/* ---------- the value vocabulary ---------- */

/** How the custom brand images are painted: in their own colours, or as a shape in the text colour. */
export const BRAND_INK_ORIGINAL = 'original'
export const BRAND_INK_TEXT = 'text'
export const BRAND_INKS = [BRAND_INK_ORIGINAL, BRAND_INK_TEXT] as const
/** Longest accepted brand name. */
export const BRAND_NAME_MAX = 40

/**
 * The animation choice: `system` follows the operating system's own
 * reduced-motion setting, `reduced` holds every animation still whatever the
 * system says, and `full` always plays them. The resolved answer rides <body>
 * as an attribute (`reduced` / `full`), so the mascots and the stylesheets read
 * one value instead of asking the system separately.
 */
export const MOTION_SYSTEM = 'system'
export const MOTION_REDUCED = 'reduced'
export const MOTION_FULL = 'full'
export const MOTION_MODES = [MOTION_SYSTEM, MOTION_REDUCED, MOTION_FULL] as const

/**
 * Who paints the colours: one of the skin's own palettes, each a full light
 * and dark set of its own (theme/tokens.json, D80), or the host's colour tokens
 * left to the host and other theme plugins.
 */
export const PALETTE_OCEAN = 'ocean'
export const PALETTE_EMBER = 'ember'
export const PALETTE_FOREST = 'forest'
export const PALETTE_HOST = 'host'
/** The skin's own palettes, in the settings page's order; `PALETTE_HOST` follows them. */
export const SKIN_PALETTES = [PALETTE_OCEAN, PALETTE_EMBER, PALETTE_FOREST] as const
export const PALETTES = [...SKIN_PALETTES, PALETTE_HOST] as const
/** Who sets the type, under the same two answers. */
export const TYPEFACE_CLAUDE = 'claude'
export const TYPEFACE_HOST = 'host'
export const TYPEFACES = [TYPEFACE_CLAUDE, TYPEFACE_HOST] as const

/** The mascot on the composer, chosen apart from the brand: follow the brand, pick one, or show none. */
export const MASCOT_BRAND = 'brand'
export const MASCOT_CRAB = 'crab'
export const MASCOT_DEEPY = 'deepy'
export const MASCOT_OFF = 'off'
export const MASCOTS = [MASCOT_BRAND, MASCOT_CRAB, MASCOT_DEEPY, MASCOT_OFF] as const
/** Where the mascot stands: the home page alone, or the home page and the conversation. */
export const MASCOT_SCOPE_HOME = 'home'
export const MASCOT_SCOPE_ALL = 'all'
export const MASCOT_SCOPES = [MASCOT_SCOPE_HOME, MASCOT_SCOPE_ALL] as const

/** Where the skin's search box stands, and how much of the host's own sidebar search it leaves in place. */
export const SEARCH_STYLE_ICON = 'icon'
export const SEARCH_STYLE_OVERLAY = 'overlay'
export const SEARCH_STYLE_STANDALONE = 'standalone'
export const SEARCH_STYLES = [SEARCH_STYLE_ICON, SEARCH_STYLE_OVERLAY, SEARCH_STYLE_STANDALONE] as const

/** How much air the sidebar keeps around its own rows. */
export const SIDEBAR_LAYOUT_RELAXED = 'relaxed'
export const SIDEBAR_LAYOUT_COMPACT = 'compact'
export const SIDEBAR_LAYOUTS = [SIDEBAR_LAYOUT_RELAXED, SIDEBAR_LAYOUT_COMPACT] as const

/**
 * The mark a conversation still running carries in the sidebar: a light
 * breathing in place over the idle seat's hollow circle, or the ring turning
 * that the skin drew before the light.
 */

/** The chat area's animation switch: on plays the ported set (features/chat-*), off leaves the area to the host. */
export const CHAT_ANIMATIONS_OFF = 'off'

/** Where the session's numbers show: in the context popover the meter opens, or on a line of their own under the input card. */
export const STATS_POSITION_INLINE = 'inline'
export const STATS_POSITION_CONTEXT = 'context'
export const STATS_POSITIONS = [STATS_POSITION_INLINE, STATS_POSITION_CONTEXT] as const

/**
 * How the page's boxes are set: `float` lifts the conversation column and the
 * controls off a warm frame, `flat` leaves every box flush in the host's own
 * arrangement.
 */
export const PAGE_LOOK_FLOAT = 'float'
export const PAGE_LOOK_FLAT = 'flat'
export const PAGE_LOOKS = [PAGE_LOOK_FLOAT, PAGE_LOOK_FLAT] as const

/** Home-page layouts. `float` is the deck under a card composer; `classic` is the centered hero; `studio` is the dashboard form, Claude Code's own home. */
export const HOME_LAYOUT_FLOAT = 'float'
export const HOME_LAYOUT_CLASSIC = 'classic'
export const HOME_LAYOUT_STUDIO = 'studio'
export const HOME_LAYOUTS = [HOME_LAYOUT_FLOAT, HOME_LAYOUT_CLASSIC, HOME_LAYOUT_STUDIO] as const

/** Composer surfaces the restyle may cover, in settings order. */
export const COMPOSER_SCOPE_OFF = 'off'
export const COMPOSER_SCOPE_HERO = 'hero'
export const COMPOSER_SCOPE_CONVERSATION = 'conversation'
export const COMPOSER_SCOPE_ALL = 'all'
export const COMPOSER_SCOPES = [COMPOSER_SCOPE_OFF, COMPOSER_SCOPE_HERO, COMPOSER_SCOPE_CONVERSATION, COMPOSER_SCOPE_ALL] as const

/** How eagerly the skin's popovers open on hover: click only, the account popover alone, or every popover the skin owns. */
export const AUTO_POPOVER_OFF = 'off'
export const AUTO_POPOVER_ACCOUNT = 'account'
export const AUTO_POPOVER_ALL = 'all'
export const AUTO_POPOVER_SCOPES = [AUTO_POPOVER_OFF, AUTO_POPOVER_ACCOUNT, AUTO_POPOVER_ALL] as const

/** Longest accepted custom username. */
export const USERNAME_MAX = 64
/** Most quick-provider ids kept, and the longest id accepted. */
export const QUICK_PROVIDERS_MAX = 64
export const PROVIDER_ID_MAX = 128
/** Longest accepted pet id: a package directory name the official player can open. */
export const PET_ID_MAX = 63

/* ---------- the table ---------- */

interface PrefSpecBase {
  /**
   * The shapes (or names) an earlier build stored, by the value as written:
   * each maps onto what it means under this declaration. A stored value that is
   * neither here nor acceptable under the declaration reads as the default.
   */
  readonly legacy?: Readonly<Record<string, unknown>>
}

interface BooleanSpec extends PrefSpecBase { readonly type: 'boolean', readonly default: boolean }
interface ChoiceSpec extends PrefSpecBase { readonly type: 'choice', readonly values: readonly string[], readonly default: string }
interface TextSpec extends PrefSpecBase { readonly type: 'text', readonly default: string, readonly max: number }
interface ColorSpec extends PrefSpecBase { readonly type: 'color', readonly default: string }
interface ListSpec extends PrefSpecBase { readonly type: 'list', readonly default: readonly string[], readonly max: number, readonly entryMax: number, readonly drop: readonly string[] }

/** One preference's declaration: its type, its default, and what its type adds to that. */
export type PrefSpec = BooleanSpec | ChoiceSpec | TextSpec | ColorSpec | ListSpec

/**
 * One declaration per preference (D73). A `choice`'s values are the set a stored
 * value is held to; a `legacy` entry is a shape an earlier build wrote. The host
 * half's form carries the keys and the defaults and stays permissive about the
 * shapes, so an old value never keeps the package from starting.
 */
export const PREFS = {
  brandName: { type: 'text', default: '', max: BRAND_NAME_MAX },
  brandInk: { type: 'choice', values: BRAND_INKS, default: BRAND_INK_ORIGINAL },
  brandAccent: { type: 'color', default: '' },
  motion: { type: 'choice', values: MOTION_MODES, default: MOTION_SYSTEM },
  /** An earlier build stored the two words; `precise` is what the switch being on means. */
  statusDetail: { type: 'boolean', default: true, legacy: { precise: true, simple: false } },
  collapseFooter: { type: 'boolean', default: true },
  /** It was a boolean before it grew its choices. */
  autoPopover: { type: 'choice', values: AUTO_POPOVER_SCOPES, default: AUTO_POPOVER_ALL, legacy: { true: AUTO_POPOVER_ALL, false: AUTO_POPOVER_OFF } },
  composerScope: { type: 'choice', values: COMPOSER_SCOPES, default: COMPOSER_SCOPE_ALL },
  modelPicker: { type: 'boolean', default: true },
  modelDescriptions: { type: 'boolean', default: true },
  /** The session must name a subagent model rather than inherit the parent route. */
  subagentModelChoice: { type: 'boolean', default: false },
  /** The composer's own entry for the routes one session delegates on. */
  subagentModelPicker: { type: 'boolean', default: true },
  peakrate: { type: 'boolean', default: true },
  /**
   * The provider ids the picker's first level carries: ids rather than names,
   * so a catalog rename does not lose the stored selection. The official
   * service is the picker's default rather than a choice, so a stored id for it
   * is dropped.
   */
  quickProviders: { type: 'list', default: [], max: QUICK_PROVIDERS_MAX, entryMax: PROVIDER_ID_MAX, drop: [OFFICIAL_MODEL_GROUP] },
  username: { type: 'text', default: '', max: USERNAME_MAX },
  pageLook: { type: 'choice', values: PAGE_LOOKS, default: PAGE_LOOK_FLOAT },
  homeLayout: { type: 'choice', values: HOME_LAYOUTS, default: HOME_LAYOUT_FLOAT },
  homeRipple: { type: 'boolean', default: false },
  palette: { type: 'choice', values: PALETTES, default: PALETTE_OCEAN },
  typeface: { type: 'choice', values: TYPEFACES, default: TYPEFACE_CLAUDE },
  /** The mascot on the composer; the resolved one rides the document. */
  mascot: { type: 'choice', values: MASCOTS, default: MASCOT_BRAND },
  mascotScope: { type: 'choice', values: MASCOT_SCOPES, default: MASCOT_SCOPE_ALL },
  /** The chat pet, by package directory id; it follows neither the palette nor the brand (D80). */
  chatPet: { type: 'text', default: 'whaledou', max: PET_ID_MAX },
  permissionsControl: { type: 'boolean', default: true },
  statsPosition: { type: 'choice', values: STATS_POSITIONS, default: STATS_POSITION_CONTEXT },
  workspaceView: { type: 'boolean', default: true },
  dockCards: { type: 'boolean', default: true },
  sidebarSearch: { type: 'boolean', default: true },
  searchStyle: { type: 'choice', values: SEARCH_STYLES, default: SEARCH_STYLE_OVERLAY },
  sidebarLayout: { type: 'choice', values: SIDEBAR_LAYOUTS, default: SIDEBAR_LAYOUT_RELAXED },
  turnNav: { type: 'boolean', default: true },
  viewTabs: { type: 'boolean', default: true },
  headerBand: { type: 'boolean', default: true },
  /** It held a choice before it became a switch again; every retired choice meant on bar `off`. */
  chatAnimations: { type: 'boolean', default: true, legacy: { [CHAT_ANIMATIONS_OFF]: false, enhanced: true, redraw: true } },
  chatWait: { type: 'boolean', default: true },
} as const satisfies Record<string, PrefSpec>

/** One preference's key. */
export type PrefKey = keyof typeof PREFS

/**
 * The preferences a feature switch follows live (D72): flipping one installs or
 * tears down the feature that names it, without a reload. A preference outside
 * this list is read by its feature at the moment it acts.
 */
export const LIVE_PREFS = [
  'homeRipple',
  'permissionsControl',
  'statsPosition',
  'workspaceView',
  'sidebarSearch',
  'turnNav',
  'viewTabs',
  'headerBand',
  'chatAnimations',
  'chatWait',
  'peakrate',
  'mascot',
  'modelPicker',
  'subagentModelPicker',
  'collapseFooter',
  'composerScope',
] as const satisfies readonly PrefKey[]

/** A preference a feature switch follows live. */
export type LivePref = typeof LIVE_PREFS[number]

/** One preference's value type, from its declaration. */
type SpecValue<S> =
  S extends { readonly type: 'boolean' } ? boolean :
    S extends { readonly type: 'choice', readonly values: readonly (infer V)[] } ? V :
      S extends { readonly type: 'text' | 'color' } ? string :
        S extends { readonly type: 'list' } ? string[] :
          never

/**
 * The preference shape the browser half reads: one field per declaration above,
 * a choice field carrying its own values as a union, so a misspelt value fails
 * the type check. A boolean preference is on unless stored as an explicit
 * `false`.
 */
export type Prefs = { [K in PrefKey]: SpecValue<typeof PREFS[K]> }

/** Every preference's shipped default, from the table above. */
export const PREF_DEFAULTS = Object.freeze(Object.fromEntries(
  Object.entries(PREFS).map(([key, spec]) => [key, spec.default]),
)) as unknown as Prefs

/** A `#rrggbb` colour, which is all the custom accent accepts. */
const COLOR_RE = /^#[0-9a-f]{6}$/i

/** The values earlier builds stored for their brand choice; only the migration below reads them (D80). */
const LEGACY_BRAND_DEEPSEEK = 'deepseek'
const LEGACY_BRAND_OFF = 'off'
const LEGACY_PALETTE_CLAUDE = 'claude'

/**
 * The colour palette a stored configuration means (D80). A value this build
 * knows wins; the host's palette stands; otherwise the old brand (or, without
 * one, the old palette) decides between the skin's blue and its warm palette.
 */
function migratePalette(section: Record<string, unknown>) {
  const raw = section.palette
  if (typeof raw === 'string' && (PALETTES as readonly string[]).includes(raw)) return raw
  if (raw === PALETTE_HOST) return PALETTE_HOST
  const brand = section.brand
  if (brand !== undefined) {
    return brand === LEGACY_BRAND_DEEPSEEK || brand === LEGACY_BRAND_OFF ? PALETTE_OCEAN : PALETTE_EMBER
  }
  return raw === LEGACY_PALETTE_CLAUDE ? PALETTE_EMBER : PALETTE_OCEAN
}

/**
 * The chat pet a stored configuration means (D80). The current field wins; an
 * older build's per-theme field is read next, with that field's own default
 * when it holds nothing; a configuration that never chose a theme keeps the
 * shipped pet.
 */
function migrateChatPet(section: Record<string, unknown>) {
  const current = typeof section.chatPet === 'string' ? section.chatPet.trim() : ''
  if (current !== '') return current.slice(0, PET_ID_MAX)
  const history = section.brand !== undefined || section.palette !== undefined
    || section.chatPetClaude !== undefined || section.chatPetDeepseek !== undefined
  if (!history) return 'whaledou'
  const brand = section.brand
  const deepseek = brand === LEGACY_BRAND_DEEPSEEK || brand === LEGACY_BRAND_OFF
  const older = typeof section[deepseek ? 'chatPetDeepseek' : 'chatPetClaude'] === 'string'
    ? (section[deepseek ? 'chatPetDeepseek' : 'chatPetClaude'] as string).trim()
    : ''
  return (older || (deepseek ? 'whaledou' : 'crab-buddy')).slice(0, PET_ID_MAX)
}

/** One preference's value, clamped to its declaration; anything unreadable reads as the default. */
function clampPref(spec: PrefSpec, raw: unknown): unknown {
  const legacy = spec.legacy === undefined ? undefined : spec.legacy[String(raw)]
  if (legacy !== undefined) return legacy
  switch (spec.type) {
    case 'boolean': return typeof raw === 'boolean' ? raw : spec.default
    case 'choice': return typeof raw === 'string' && spec.values.includes(raw) ? raw : spec.default
    case 'text': return typeof raw === 'string' ? raw.trim().slice(0, spec.max) : spec.default
    case 'color': return typeof raw === 'string' && COLOR_RE.test(raw) ? raw.toLowerCase() : spec.default
    case 'list': {
      if (!Array.isArray(raw)) return spec.default
      const out: string[] = []
      for (let i = 0; i < raw.length && out.length < spec.max; i++) {
        const entry = raw[i]
        if (typeof entry !== 'string' || entry === '' || entry.length > spec.entryMax) continue
        if (spec.drop.includes(entry) || out.includes(entry)) continue
        out.push(entry)
      }
      return out
    }
  }
}

/**
 * Clamp one host value into the preference shape, field by field off the table:
 * a boolean stays on unless stored as `false`, a choice outside its set reads as
 * its default, a text is trimmed to its limit, a colour must be `#rrggbb`, and a
 * list keeps distinct ids within both limits.
 */
export function clampPrefs(value: unknown): Prefs {
  const section: Record<string, unknown> = value !== null && typeof value === 'object' ? value as Record<string, unknown> : {}
  const out: Record<string, unknown> = {}
  for (const [key, spec] of Object.entries(PREFS) as [PrefKey, PrefSpec][]) out[key] = clampPref(spec, section[key])
  // These two read fields the table no longer declares: the older build's brand
  // and its per-theme pets (D80).
  out.palette = migratePalette(section)
  out.chatPet = migrateChatPet(section)
  return out as unknown as Prefs
}
