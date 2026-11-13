/**
 * The preferences: one declaration each, shared by both halves (D73).
 *
 * The host settings namespace holds the store; this table declares the key,
 * the type and the default, and `clampPrefs` maps a stored value onto the
 * declared shape so a preference is always in force. The browser half mirrors
 * the set onto the document (packages/client/src/core/prefs.ts, D75), and the
 * feature that reads it (its settings row follows the same table, D72).
 */

/* ---------- the value vocabulary ---------- */

/** How the custom brand images are painted: in their own colours, or as a shape in the text colour. */
export const BRAND_INK_ORIGINAL = 'original'
export const BRAND_INK_TEXT = 'text'
export const BRAND_INKS = [BRAND_INK_ORIGINAL, BRAND_INK_TEXT] as const
/** Longest accepted brand name. */
export const BRAND_NAME_MAX = 40

/**
 * The animation choice: `system` follows the operating system's own
 * reduced-motion request, `reduced` stills everything the skin animates,
 * and `full` plays regardless. Only the resolved answer reaches the
 * document: a stylesheet cannot rewrite its own media queries, so "always
 * play" has to be a value the rules can test.
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

/**
 * The material layer's two answers per aspect (D84): the reference theme's
 * value, or the host's own. It is orthogonal to the palette — any palette can
 * carry the shape language, and the shipped default is the reference one.
 */
export const MATERIAL_REFERENCE = 'reference'
export const MATERIAL_HOST = 'host'
export const MATERIAL_RADII = [MATERIAL_REFERENCE, MATERIAL_HOST] as const
export const MATERIAL_SHADOWS_FLAT = 'flat'
export const MATERIAL_SHADOWS = [MATERIAL_SHADOWS_FLAT, MATERIAL_HOST] as const
export const MATERIAL_MOTIONS = [MATERIAL_REFERENCE, MATERIAL_HOST] as const
/** Who sets each type role: the host's own face, one of the skin's, or a family list the reader types. */
export const FONT_HOST = 'host'
export const FONT_FOLLOW = 'follow'
export const FONT_CUSTOM = 'custom'
export const FONT_UI_INTER = 'inter'
export const FONT_UI_GEIST = 'geist'
export const FONT_UI_FIXEL = 'fixel'
export const FONT_UI_ATKINSON = 'atkinson'
export const FONT_UI_ANTHROPIC = 'anthropic'
export const FONT_PROSE_NOTO = 'noto-serif'
export const FONT_PROSE_SOURCE = 'source-serif'
export const FONT_PROSE_LITERATA = 'literata'
export const FONT_PROSE_ANTHROPIC = 'anthropic-serif'
export const FONT_CODE_JETBRAINS = 'jetbrains'
export const FONT_CODE_GEIST = 'geist-mono'
export const FONT_CODE_FIRA = 'fira-code'
export const FONT_CODE_COMMIT = 'commit-mono'
export const FONT_CODE_ANTHROPIC = 'anthropic-mono'
export const FONT_UI_VALUES = [FONT_HOST, FONT_UI_INTER, FONT_UI_GEIST, FONT_UI_FIXEL, FONT_UI_ATKINSON, FONT_UI_ANTHROPIC, FONT_CUSTOM] as const
export const FONT_PROSE_VALUES = [FONT_FOLLOW, FONT_PROSE_NOTO, FONT_PROSE_SOURCE, FONT_PROSE_LITERATA, FONT_PROSE_ANTHROPIC, FONT_CUSTOM] as const
export const FONT_CODE_VALUES = [FONT_HOST, FONT_CODE_JETBRAINS, FONT_CODE_GEIST, FONT_CODE_FIRA, FONT_CODE_COMMIT, FONT_CODE_ANTHROPIC, FONT_CUSTOM] as const
/** Longest accepted custom family list. */
export const FONT_LIST_MAX = 160

/** The mascot on the composer: the reader's Petdex package, or none. */
export const MASCOT_BRAND = 'brand'
export const MASCOT_OFF = 'off'
export const MASCOTS = [MASCOT_BRAND, MASCOT_OFF] as const
/** Where the mascot stands: the home page alone, or the home page and the conversation. */
export const MASCOT_SCOPE_HOME = 'home'
export const MASCOT_SCOPE_ALL = 'all'
export const MASCOT_SCOPES = [MASCOT_SCOPE_HOME, MASCOT_SCOPE_ALL] as const

/** Longest accepted pet id: a package directory name the official player can open. */
export const PET_ID_MAX = 63


/**
 * Where the window's wallpaper comes from: `off` leaves the window bare
 * (each palette's own canvas and the material layer's ambient light), `custom`
 * layers the reader's own image or video under the whole shell.
 */
export const WALLPAPER_OFF = 'off'
export const WALLPAPER_CUSTOM = 'custom'
export const WALLPAPER_SOURCES = [WALLPAPER_OFF, WALLPAPER_CUSTOM] as const

/**
 * How a wallpaper plays while it is a video: `static` holds its first frame,
 * `dynamic` lets it loop while the page is shown. Still images read it never.
 */
export const WALLPAPER_MOTION_STATIC = 'static'
export const WALLPAPER_MOTION_DYNAMIC = 'dynamic'
export const WALLPAPER_MOTIONS = [WALLPAPER_MOTION_STATIC, WALLPAPER_MOTION_DYNAMIC] as const

/** How much of the wallpaper shows through the canvas veil: 0 hides it under the canvas colour, 1 shows it bare. */
export const WALLPAPER_VISIBILITY_MIN = 0
export const WALLPAPER_VISIBILITY_MAX = 1
export const WALLPAPER_VISIBILITY_STEP = 0.05
/** The blur over the wallpaper, in CSS pixels; 0 leaves it sharp. */
export const WALLPAPER_BLUR_MIN = 0
export const WALLPAPER_BLUR_MAX = 20
export const WALLPAPER_BLUR_STEP = 1
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
interface NumberSpec extends PrefSpecBase { readonly type: 'number', readonly default: number, readonly min: number, readonly max: number, readonly step: number }

interface ColorSpec extends PrefSpecBase { readonly type: 'color', readonly default: string }

/** One preference's declaration: its type, its default, and what its type adds to that. */
export type PrefSpec = BooleanSpec | ChoiceSpec | TextSpec | ColorSpec | NumberSpec

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
  /** The material layer's corner scale: the reference theme's 4/8/12, or the host's own (D84). */
  materialRadius: { type: 'choice', values: MATERIAL_RADII, default: MATERIAL_REFERENCE },
  /** Its shadows: flat (levels off, elevation drawn as a stroke), or the host's. */
  materialShadow: { type: 'choice', values: MATERIAL_SHADOWS, default: MATERIAL_SHADOWS_FLAT },
  /** Its durations: the reference theme's 150/200/250ms, or the host's. */
  materialMotion: { type: 'choice', values: MATERIAL_MOTIONS, default: MATERIAL_REFERENCE },
  /** The sidebar's liquid glass: a translucent tint, a blur and an inner hairline. */
  materialGlass: { type: 'boolean', default: true },
  /** The ambient light behind the whole shell: three soft radial washes. */
  materialAmbient: { type: 'boolean', default: true },
  /** The session must name a subagent model rather than inherit the parent route. */
  subagentModelChoice: { type: 'boolean', default: false },
  /** The composer's own entry for the routes one session delegates on. */
  subagentModelPicker: { type: 'boolean', default: true },
  palette: { type: 'choice', values: PALETTES, default: PALETTE_OCEAN },
  fontUi: { type: 'choice', values: FONT_UI_VALUES, default: FONT_UI_ANTHROPIC },
  fontProse: { type: 'choice', values: FONT_PROSE_VALUES, default: FONT_PROSE_ANTHROPIC },
  fontCode: { type: 'choice', values: FONT_CODE_VALUES, default: FONT_CODE_ANTHROPIC },
  fontUiCustom: { type: 'text', default: '', max: FONT_LIST_MAX },
  fontProseCustom: { type: 'text', default: '', max: FONT_LIST_MAX },
  fontCodeCustom: { type: 'text', default: '', max: FONT_LIST_MAX },
  /** The mascot on the composer; the resolved one rides the document. */
  mascot: { type: 'choice', values: MASCOTS, default: MASCOT_BRAND },
  mascotScope: { type: 'choice', values: MASCOT_SCOPES, default: MASCOT_SCOPE_ALL },
  /** The chat pet, by package directory id; it follows neither the palette nor the brand (D80). */
  chatPet: { type: 'text', default: 'whaledou', max: PET_ID_MAX },
  /**
   * The reader's own wallpaper: `custom` mounts the layer the host half's
   * wallpaper file serves under; `off` takes it off again (live, D72).
   */
  wallpaperSource: { type: 'choice', values: WALLPAPER_SOURCES, default: WALLPAPER_OFF },
  /** How much of it shows through the canvas veil; the value reaches the sheet as `--dsh-deepcraft-wallpaper-visibility`. */
  wallpaperVisibility: { type: 'number', default: 0.4, min: WALLPAPER_VISIBILITY_MIN, max: WALLPAPER_VISIBILITY_MAX, step: WALLPAPER_VISIBILITY_STEP },
  /** The blur over it, in CSS pixels; the value reaches the sheet as `--dsh-deepcraft-wallpaper-blur`. */
  wallpaperBlur: { type: 'number', default: 0, min: WALLPAPER_BLUR_MIN, max: WALLPAPER_BLUR_MAX, step: WALLPAPER_BLUR_STEP },
  /** A video wallpaper's play choice; a still image never reads it. */
  wallpaperMotion: { type: 'choice', values: WALLPAPER_MOTIONS, default: WALLPAPER_MOTION_STATIC },
  /** Low power: stills the video and drops the wallpaper's blur. */
  wallpaperLite: { type: 'boolean', default: false },
  /** The sidebar's recent block: conversations touched in the last day, at the top (D85). */
  recentSessions: { type: 'boolean', default: true },
} as const satisfies Record<string, PrefSpec>

/** One preference's key. */
export type PrefKey = keyof typeof PREFS

/**
 * The preferences a feature switch follows live (D72): flipping one installs or
 * tears down the feature that names it, without a reload. A preference outside
 * this list is read by its feature at the moment it acts.
 */
export const LIVE_PREFS = [
  'mascot',
  'subagentModelPicker',
  'wallpaperSource',
  'recentSessions',
] as const satisfies readonly PrefKey[]
/** A preference a feature switch follows live. */
export type LivePref = typeof LIVE_PREFS[number]

/** One preference's value type, from its declaration. */
type SpecValue<S> =
  S extends { readonly type: 'boolean' } ? boolean :
    S extends { readonly type: 'choice', readonly values: readonly (infer V)[] } ? V :
      S extends { readonly type: 'text' | 'color' } ? string :
        S extends { readonly type: 'number' } ? number :
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
const LEGACY_PALETTE_CINDY = 'cindy'

/**
 * The colour palette a stored configuration means (D80). A value this build
 * knows wins; the host's palette stands; a stored `cindy` keeps the warm palette
 * its material now rides beside (D84); otherwise the old brand (or, without one,
 * the old palette) decides between the skin's blue and its warm palette.
 */
function migratePalette(section: Record<string, unknown>) {
  const raw = section.palette
  if (typeof raw === 'string' && (PALETTES as readonly string[]).includes(raw)) return raw
  if (raw === PALETTE_HOST) return PALETTE_HOST
  if (raw === LEGACY_PALETTE_CINDY) return PALETTE_EMBER
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
    case 'number': {
      if (typeof raw !== 'number' || !Number.isFinite(raw)) return spec.default
      const clamped = Math.min(spec.max, Math.max(spec.min, Math.round(raw / spec.step) * spec.step))
      return Math.round(clamped * 1000) / 1000
    }
    case 'boolean': return typeof raw === 'boolean' ? raw : spec.default
    case 'choice': return typeof raw === 'string' && spec.values.includes(raw) ? raw : spec.default
    case 'text': return typeof raw === 'string' ? raw.trim().slice(0, spec.max) : spec.default
    case 'color': return typeof raw === 'string' && COLOR_RE.test(raw) ? raw.toLowerCase() : spec.default
  }
}

/**
 * Clamp one host value into the preference shape, field by field off the table:
 * a boolean stays on unless stored as `false`, a choice outside its set reads as
 * its default, a text is trimmed to its limit, and a colour must be `#rrggbb`.
 */
export function clampPrefs(value: unknown): Prefs {
  const section: Record<string, unknown> = value !== null && typeof value === 'object' ? value as Record<string, unknown> : {}
  const out: Record<string, unknown> = {}
  for (const [key, spec] of Object.entries(PREFS) as [PrefKey, PrefSpec][]) out[key] = clampPref(spec, section[key])
  // These two read fields the table no longer declares: the older build's brand
  // and its per-theme pets (D80).
  out.palette = migratePalette(section)
  out.chatPet = migrateChatPet(section)
  // The old single typeface choice: `host` meant every role followed the host;
  // the theme value keeps the shipped fonts, which are the table's defaults.
  if (section.fontUi === undefined && section.fontProse === undefined && section.fontCode === undefined && section.typeface === 'host') {
    out.fontUi = FONT_HOST
    out.fontProse = FONT_FOLLOW
    out.fontCode = FONT_HOST
  }
  return out as unknown as Prefs
}
