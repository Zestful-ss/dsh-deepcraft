// packages/contracts/src/services.ts
var OFFICIAL_MODEL_GROUP = "deepseek-official";

// packages/contracts/src/prefs.ts
var BRAND_CLAUDE = "claude";
var BRAND_DEEPSEEK = "deepseek";
var BRAND_DEEPSEEK_LEGACY = "off";
var BRANDS = [BRAND_CLAUDE, BRAND_DEEPSEEK];
var BRAND_INK_ORIGINAL = "original";
var BRAND_INK_TEXT = "text";
var BRAND_INKS = [BRAND_INK_ORIGINAL, BRAND_INK_TEXT];
var BRAND_NAME_MAX = 40;
var MOTION_SYSTEM = "system";
var MOTION_REDUCED = "reduced";
var MOTION_FULL = "full";
var MOTION_MODES = [MOTION_SYSTEM, MOTION_REDUCED, MOTION_FULL];
var STATUS_MOTION_SWEEP = "sweep";
var STATUS_MOTION_WASH = "wash";
var STATUS_MOTIONS = [STATUS_MOTION_SWEEP, STATUS_MOTION_WASH];
var CARET_MOTION_OFF = "off";
var CARET_MOTION_TYPING = "typing";
var CARET_MOTIONS = [CARET_MOTION_TYPING, CARET_MOTION_OFF];
var CHAT_REVEAL_OFF = "off";
var CHAT_REVEAL_ON = "on";
var CHAT_REVEAL_MODES = [CHAT_REVEAL_ON, CHAT_REVEAL_OFF];
var MESSAGE_ENTER_FLIGHT = "flight";
var MESSAGE_ENTER_GROW = "grow";
var MESSAGE_ENTER_MODES = [MESSAGE_ENTER_FLIGHT, MESSAGE_ENTER_GROW];
var PALETTE_CLAUDE = "claude";
var PALETTE_HOST = "host";
var PALETTES = [PALETTE_CLAUDE, PALETTE_HOST];
var TYPEFACE_CLAUDE = "claude";
var TYPEFACE_HOST = "host";
var TYPEFACES = [TYPEFACE_CLAUDE, TYPEFACE_HOST];
var MASCOT_BRAND = "brand";
var MASCOT_CRAB = "crab";
var MASCOT_DEEPY = "deepy";
var MASCOT_OFF = "off";
var MASCOTS = [MASCOT_BRAND, MASCOT_CRAB, MASCOT_DEEPY, MASCOT_OFF];
var MASCOT_SCOPE_HOME = "home";
var MASCOT_SCOPE_ALL = "all";
var MASCOT_SCOPES = [MASCOT_SCOPE_HOME, MASCOT_SCOPE_ALL];
var SEARCH_STYLE_ICON = "icon";
var SEARCH_STYLE_OVERLAY = "overlay";
var SEARCH_STYLE_STANDALONE = "standalone";
var SEARCH_STYLES = [SEARCH_STYLE_ICON, SEARCH_STYLE_OVERLAY, SEARCH_STYLE_STANDALONE];
var SIDEBAR_LAYOUT_RELAXED = "relaxed";
var SIDEBAR_LAYOUT_COMPACT = "compact";
var SIDEBAR_LAYOUTS = [SIDEBAR_LAYOUT_RELAXED, SIDEBAR_LAYOUT_COMPACT];
var ONGOING_INDICATOR_BREATHE = "breathe";
var ONGOING_INDICATOR_RING = "ring";
var ONGOING_INDICATORS = [ONGOING_INDICATOR_BREATHE, ONGOING_INDICATOR_RING];
var CHAT_ANIMATIONS_OFF = "off";
var STATS_POSITION_INLINE = "inline";
var STATS_POSITION_CONTEXT = "context";
var STATS_POSITIONS = [STATS_POSITION_INLINE, STATS_POSITION_CONTEXT];
var BAN_LOCALE_EN = "en";
var BAN_LOCALE_ZH = "zh";
var BAN_LOCALE_OFF = "off";
var BAN_LOCALES = [BAN_LOCALE_EN, BAN_LOCALE_ZH, BAN_LOCALE_OFF];
var HOME_LAYOUT_CLASSIC = "classic";
var HOME_LAYOUT_STUDIO = "studio";
var HOME_LAYOUTS = [HOME_LAYOUT_CLASSIC, HOME_LAYOUT_STUDIO];
var COMPOSER_SCOPE_OFF = "off";
var COMPOSER_SCOPE_HERO = "hero";
var COMPOSER_SCOPE_CONVERSATION = "conversation";
var COMPOSER_SCOPE_ALL = "all";
var COMPOSER_SCOPES = [COMPOSER_SCOPE_OFF, COMPOSER_SCOPE_HERO, COMPOSER_SCOPE_CONVERSATION, COMPOSER_SCOPE_ALL];
var AUTO_POPOVER_OFF = "off";
var AUTO_POPOVER_ACCOUNT = "account";
var AUTO_POPOVER_ALL = "all";
var AUTO_POPOVER_SCOPES = [AUTO_POPOVER_OFF, AUTO_POPOVER_ACCOUNT, AUTO_POPOVER_ALL];
var PAGE_ZOOM_SYSTEM = "system";
var PAGE_ZOOM_08 = "0.8";
var PAGE_ZOOM_1 = "1";
var PAGE_ZOOM_125 = "1.25";
var PAGE_ZOOM_15 = "1.5";
var PAGE_ZOOMS = [PAGE_ZOOM_SYSTEM, PAGE_ZOOM_08, PAGE_ZOOM_1, PAGE_ZOOM_125, PAGE_ZOOM_15];
var USERNAME_MAX = 64;
var QUICK_PROVIDERS_MAX = 64;
var PROVIDER_ID_MAX = 128;
var PET_ID_MAX = 63;
var PREFS = {
  brand: { type: "choice", values: BRANDS, default: BRAND_CLAUDE, legacy: { [BRAND_DEEPSEEK_LEGACY]: BRAND_DEEPSEEK } },
  brandName: { type: "text", default: "", max: BRAND_NAME_MAX },
  brandInk: { type: "choice", values: BRAND_INKS, default: BRAND_INK_ORIGINAL },
  brandAccent: { type: "color", default: "" },
  motion: { type: "choice", values: MOTION_MODES, default: MOTION_SYSTEM },
  statusMotion: { type: "choice", values: STATUS_MOTIONS, default: STATUS_MOTION_SWEEP },
  /** An earlier build stored the two words; `precise` is what the switch being on means. */
  statusDetail: { type: "boolean", default: true, legacy: { precise: true, simple: false } },
  collapseFooter: { type: "boolean", default: true },
  /** It was a boolean before it grew its choices. */
  autoPopover: { type: "choice", values: AUTO_POPOVER_SCOPES, default: AUTO_POPOVER_ALL, legacy: { true: AUTO_POPOVER_ALL, false: AUTO_POPOVER_OFF } },
  composerScope: { type: "choice", values: COMPOSER_SCOPES, default: COMPOSER_SCOPE_ALL },
  modelPicker: { type: "boolean", default: true },
  modelDescriptions: { type: "boolean", default: true },
  peakrate: { type: "boolean", default: true },
  /**
   * The provider ids the picker's first level carries: ids rather than names,
   * so a catalog rename does not lose the stored selection. The official
   * service is the picker's default rather than a choice, so a stored id for it
   * is dropped.
   */
  quickProviders: { type: "list", default: [], max: QUICK_PROVIDERS_MAX, entryMax: PROVIDER_ID_MAX, drop: [OFFICIAL_MODEL_GROUP] },
  username: { type: "text", default: "", max: USERNAME_MAX },
  pageZoom: { type: "choice", values: PAGE_ZOOMS, default: PAGE_ZOOM_SYSTEM },
  banLocale: { type: "choice", values: BAN_LOCALES, default: BAN_LOCALE_EN },
  homeLayout: { type: "choice", values: HOME_LAYOUTS, default: HOME_LAYOUT_STUDIO },
  homeRipple: { type: "boolean", default: false },
  palette: { type: "choice", values: PALETTES, default: PALETTE_CLAUDE },
  typeface: { type: "choice", values: TYPEFACES, default: TYPEFACE_CLAUDE },
  /** The mascot on the composer; the resolved one rides the document. */
  mascot: { type: "choice", values: MASCOTS, default: MASCOT_BRAND },
  mascotScope: { type: "choice", values: MASCOT_SCOPES, default: MASCOT_SCOPE_ALL },
  /** Each theme's chat pet and desktop pet, by package directory id; one choice per place. */
  chatPetClaude: { type: "text", default: "crab-buddy", max: PET_ID_MAX },
  chatPetDeepseek: { type: "text", default: "whaledou", max: PET_ID_MAX },
  desktopPetClaude: { type: "text", default: "claude-opus-scholar", max: PET_ID_MAX },
  desktopPetDeepseek: { type: "text", default: "deepseek", max: PET_ID_MAX },
  /** The native desktop player is off until the reader asks for it; the chat pet is independent. */
  desktopPetEnabled: { type: "boolean", default: false },
  permissionsControl: { type: "boolean", default: true },
  statsPosition: { type: "choice", values: STATS_POSITIONS, default: STATS_POSITION_CONTEXT },
  workspaceView: { type: "boolean", default: true },
  dockCards: { type: "boolean", default: true },
  sidebarSearch: { type: "boolean", default: true },
  searchStyle: { type: "choice", values: SEARCH_STYLES, default: SEARCH_STYLE_OVERLAY },
  sidebarLayout: { type: "choice", values: SIDEBAR_LAYOUTS, default: SIDEBAR_LAYOUT_RELAXED },
  ongoingIndicator: { type: "choice", values: ONGOING_INDICATORS, default: ONGOING_INDICATOR_BREATHE },
  turnNav: { type: "boolean", default: true },
  viewTabs: { type: "boolean", default: true },
  headerBand: { type: "boolean", default: true },
  /** It held a choice before it became a switch again; every retired choice meant on bar `off`. */
  chatAnimations: { type: "boolean", default: true, legacy: { [CHAT_ANIMATIONS_OFF]: false, enhanced: true, redraw: true } },
  chatWait: { type: "boolean", default: true },
  chatSend: { type: "boolean", default: true },
  chatReveal: { type: "choice", values: CHAT_REVEAL_MODES, default: CHAT_REVEAL_OFF },
  caretMotion: { type: "choice", values: CARET_MOTIONS, default: CARET_MOTION_TYPING },
  messageEnter: { type: "choice", values: MESSAGE_ENTER_MODES, default: MESSAGE_ENTER_FLIGHT }
};
var PREF_DEFAULTS = Object.freeze(Object.fromEntries(
  Object.entries(PREFS).map(([key, spec]) => [key, spec.default])
));
var COLOR_RE = /^#[0-9a-f]{6}$/i;
function clampPref(spec, raw) {
  const legacy = spec.legacy === void 0 ? void 0 : spec.legacy[String(raw)];
  if (legacy !== void 0) return legacy;
  switch (spec.type) {
    case "boolean":
      return typeof raw === "boolean" ? raw : spec.default;
    case "choice":
      return typeof raw === "string" && spec.values.includes(raw) ? raw : spec.default;
    case "text":
      return typeof raw === "string" ? raw.trim().slice(0, spec.max) : spec.default;
    case "color":
      return typeof raw === "string" && COLOR_RE.test(raw) ? raw.toLowerCase() : spec.default;
    case "list": {
      if (!Array.isArray(raw)) return spec.default;
      const out = [];
      for (let i = 0; i < raw.length && out.length < spec.max; i++) {
        const entry = raw[i];
        if (typeof entry !== "string" || entry === "" || entry.length > spec.entryMax) continue;
        if (spec.drop.includes(entry) || out.includes(entry)) continue;
        out.push(entry);
      }
      return out;
    }
  }
}
function clampPrefs(value) {
  const section = value !== null && typeof value === "object" ? value : {};
  const out = {};
  for (const [key, spec] of Object.entries(PREFS)) out[key] = clampPref(spec, section[key]);
  return out;
}

// packages/contracts/src/package.ts
var PACKAGE_NAME = "dsh-deepcraft";

// packages/host/src/index.ts
import { configureDesktopPets } from "./pets/desktop.js";
import { installSessionBridge } from "./pets/session.js";
import { registerRoutes } from "./routes.js";
import { registerSettings } from "./settings.js";
import { Config } from "./settings.js";
var name = PACKAGE_NAME;
function apply(ctx, config) {
  const prefs = clampPrefs(config);
  const releaseDesktop = configureDesktopPets(ctx, {
    enabled: prefs.desktopPetEnabled,
    petId: prefs.brand === BRAND_DEEPSEEK ? prefs.desktopPetDeepseek : prefs.desktopPetClaude
  });
  if (typeof ctx.effect === "function") ctx.effect(() => () => releaseDesktop());
  installSessionBridge(ctx);
  if (typeof ctx.inject === "function") ctx.inject(["webServer"], (scope) => {
    registerRoutes(ctx, scope);
  });
  else registerRoutes(ctx, ctx);
  registerSettings(ctx);
}
export {
  Config,
  apply,
  name
};
