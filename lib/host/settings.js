// packages/contracts/src/package.ts
var PACKAGE_NAME = "dsh-deepcraft";

// packages/contracts/src/prefs.ts
var BRAND_INK_ORIGINAL = "original";
var BRAND_INK_TEXT = "text";
var BRAND_INKS = [BRAND_INK_ORIGINAL, BRAND_INK_TEXT];
var BRAND_NAME_MAX = 40;
var MOTION_SYSTEM = "system";
var MOTION_REDUCED = "reduced";
var MOTION_FULL = "full";
var MOTION_MODES = [MOTION_SYSTEM, MOTION_REDUCED, MOTION_FULL];
var PALETTE_OCEAN = "ocean";
var PALETTE_EMBER = "ember";
var PALETTE_FOREST = "forest";
var PALETTE_HOST = "host";
var SKIN_PALETTES = [PALETTE_OCEAN, PALETTE_EMBER, PALETTE_FOREST];
var PALETTES = [...SKIN_PALETTES, PALETTE_HOST];
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
var CHAT_ANIMATIONS_OFF = "off";
var STATS_POSITION_INLINE = "inline";
var STATS_POSITION_CONTEXT = "context";
var STATS_POSITIONS = [STATS_POSITION_INLINE, STATS_POSITION_CONTEXT];
var AUTO_POPOVER_OFF = "off";
var AUTO_POPOVER_ACCOUNT = "account";
var AUTO_POPOVER_ALL = "all";
var AUTO_POPOVER_SCOPES = [AUTO_POPOVER_OFF, AUTO_POPOVER_ACCOUNT, AUTO_POPOVER_ALL];
var USERNAME_MAX = 64;
var PET_ID_MAX = 63;
var PREFS = {
  brandName: { type: "text", default: "", max: BRAND_NAME_MAX },
  brandInk: { type: "choice", values: BRAND_INKS, default: BRAND_INK_ORIGINAL },
  brandAccent: { type: "color", default: "" },
  motion: { type: "choice", values: MOTION_MODES, default: MOTION_SYSTEM },
  /** An earlier build stored the two words; `precise` is what the switch being on means. */
  statusDetail: { type: "boolean", default: true, legacy: { precise: true, simple: false } },
  /** It was a boolean before it grew its choices. */
  autoPopover: { type: "choice", values: AUTO_POPOVER_SCOPES, default: AUTO_POPOVER_ALL, legacy: { true: AUTO_POPOVER_ALL, false: AUTO_POPOVER_OFF } },
  /** The session must name a subagent model rather than inherit the parent route. */
  subagentModelChoice: { type: "boolean", default: false },
  /** The composer's own entry for the routes one session delegates on. */
  subagentModelPicker: { type: "boolean", default: true },
  username: { type: "text", default: "", max: USERNAME_MAX },
  homeRipple: { type: "boolean", default: false },
  palette: { type: "choice", values: PALETTES, default: PALETTE_OCEAN },
  typeface: { type: "choice", values: TYPEFACES, default: TYPEFACE_CLAUDE },
  /** The mascot on the composer; the resolved one rides the document. */
  mascot: { type: "choice", values: MASCOTS, default: MASCOT_BRAND },
  mascotScope: { type: "choice", values: MASCOT_SCOPES, default: MASCOT_SCOPE_ALL },
  /** The chat pet, by package directory id; it follows neither the palette nor the brand (D80). */
  chatPet: { type: "text", default: "whaledou", max: PET_ID_MAX },
  statsPosition: { type: "choice", values: STATS_POSITIONS, default: STATS_POSITION_CONTEXT },
  sidebarSearch: { type: "boolean", default: true },
  searchStyle: { type: "choice", values: SEARCH_STYLES, default: SEARCH_STYLE_OVERLAY },
  turnNav: { type: "boolean", default: true },
  viewTabs: { type: "boolean", default: true },
  headerBand: { type: "boolean", default: true },
  /** It held a choice before it became a switch again; every retired choice meant on bar `off`. */
  chatAnimations: { type: "boolean", default: true, legacy: { [CHAT_ANIMATIONS_OFF]: false, enhanced: true, redraw: true } },
  chatWait: { type: "boolean", default: true }
};
var PREF_DEFAULTS = Object.freeze(Object.fromEntries(
  Object.entries(PREFS).map(([key, spec]) => [key, spec.default])
));

// packages/host/src/settings.ts
import { resolveHostPackage } from "./host-package.js";
function schemaFactoryOf(resolved) {
  if (resolved === null || resolved === void 0) return null;
  const module = resolved;
  for (const candidate of [module, module.default, module.Schema]) {
    const shaped = typeof candidate === "object" || typeof candidate === "function";
    if (candidate !== null && shaped && typeof candidate.object === "function") {
      return candidate;
    }
  }
  return null;
}
var SchemaFactory = schemaFactoryOf(await resolveHostPackage("@deepseek-ai/schemastery"));
function volatileField(field) {
  return typeof field?.volatile === "function" ? field.volatile() : field;
}
var LEGACY_FIELDS = ["brand", "chatPetClaude", "chatPetDeepseek"];
var UNDEFAULTED = { palette: true, chatPet: true };
function prefsField(Schema, key) {
  const field = Schema.union([Schema.string(), Schema.boolean(), Schema.array(Schema.string())]);
  return UNDEFAULTED[key] === true ? field : field.default(PREFS[key].default);
}
var Config = SchemaFactory === null ? void 0 : SchemaFactory.object({
  ...Object.fromEntries(Object.keys(PREFS).map((key) => [key, volatileField(prefsField(SchemaFactory, key))])),
  ...Object.fromEntries(LEGACY_FIELDS.map((key) => [key, volatileField(
    SchemaFactory.union([SchemaFactory.string(), SchemaFactory.boolean(), SchemaFactory.array(SchemaFactory.string())])
  )]))
});
function registerSettings(ctx) {
  if (typeof ctx.inject !== "function") return;
  ctx.inject(["settings"], (scope) => {
    const settings = scope.settings;
    if (typeof settings?.configure !== "function") return;
    scope.effect(
      () => settings.configure({ auto: false }, ctx.fiber),
      `${PACKAGE_NAME}: settings presentation`
    );
  });
}
export {
  Config,
  registerSettings
};
