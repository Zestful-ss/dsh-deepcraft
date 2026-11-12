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
var FONT_HOST = "host";
var FONT_FOLLOW = "follow";
var FONT_CUSTOM = "custom";
var FONT_UI_INTER = "inter";
var FONT_UI_GEIST = "geist";
var FONT_UI_FIXEL = "fixel";
var FONT_UI_ATKINSON = "atkinson";
var FONT_UI_ANTHROPIC = "anthropic";
var FONT_PROSE_NOTO = "noto-serif";
var FONT_PROSE_SOURCE = "source-serif";
var FONT_PROSE_LITERATA = "literata";
var FONT_PROSE_ANTHROPIC = "anthropic-serif";
var FONT_CODE_JETBRAINS = "jetbrains";
var FONT_CODE_GEIST = "geist-mono";
var FONT_CODE_FIRA = "fira-code";
var FONT_CODE_COMMIT = "commit-mono";
var FONT_CODE_ANTHROPIC = "anthropic-mono";
var FONT_UI_VALUES = [FONT_HOST, FONT_UI_INTER, FONT_UI_GEIST, FONT_UI_FIXEL, FONT_UI_ATKINSON, FONT_UI_ANTHROPIC, FONT_CUSTOM];
var FONT_PROSE_VALUES = [FONT_FOLLOW, FONT_PROSE_NOTO, FONT_PROSE_SOURCE, FONT_PROSE_LITERATA, FONT_PROSE_ANTHROPIC, FONT_CUSTOM];
var FONT_CODE_VALUES = [FONT_HOST, FONT_CODE_JETBRAINS, FONT_CODE_GEIST, FONT_CODE_FIRA, FONT_CODE_COMMIT, FONT_CODE_ANTHROPIC, FONT_CUSTOM];
var FONT_LIST_MAX = 160;
var MASCOT_BRAND = "brand";
var MASCOT_OFF = "off";
var MASCOTS = [MASCOT_BRAND, MASCOT_OFF];
var MASCOT_SCOPE_HOME = "home";
var MASCOT_SCOPE_ALL = "all";
var MASCOT_SCOPES = [MASCOT_SCOPE_HOME, MASCOT_SCOPE_ALL];
var PET_ID_MAX = 63;
var PREFS = {
  brandName: { type: "text", default: "", max: BRAND_NAME_MAX },
  brandInk: { type: "choice", values: BRAND_INKS, default: BRAND_INK_ORIGINAL },
  brandAccent: { type: "color", default: "" },
  motion: { type: "choice", values: MOTION_MODES, default: MOTION_SYSTEM },
  /** The session must name a subagent model rather than inherit the parent route. */
  subagentModelChoice: { type: "boolean", default: false },
  /** The composer's own entry for the routes one session delegates on. */
  subagentModelPicker: { type: "boolean", default: true },
  palette: { type: "choice", values: PALETTES, default: PALETTE_OCEAN },
  fontUi: { type: "choice", values: FONT_UI_VALUES, default: FONT_UI_ANTHROPIC },
  fontProse: { type: "choice", values: FONT_PROSE_VALUES, default: FONT_PROSE_ANTHROPIC },
  fontCode: { type: "choice", values: FONT_CODE_VALUES, default: FONT_CODE_ANTHROPIC },
  fontUiCustom: { type: "text", default: "", max: FONT_LIST_MAX },
  fontProseCustom: { type: "text", default: "", max: FONT_LIST_MAX },
  fontCodeCustom: { type: "text", default: "", max: FONT_LIST_MAX },
  /** The mascot on the composer; the resolved one rides the document. */
  mascot: { type: "choice", values: MASCOTS, default: MASCOT_BRAND },
  mascotScope: { type: "choice", values: MASCOT_SCOPES, default: MASCOT_SCOPE_ALL },
  /** The chat pet, by package directory id; it follows neither the palette nor the brand (D80). */
  chatPet: { type: "text", default: "whaledou", max: PET_ID_MAX }
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
var LEGACY_FIELDS = ["brand", "chatPetClaude", "chatPetDeepseek", "typeface"];
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
