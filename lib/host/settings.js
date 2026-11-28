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
var PALETTE_CINDY = "cindy";
var PALETTE_OCEAN = "ocean";
var PALETTE_EMBER = "ember";
var PALETTE_FOREST = "forest";
var PALETTE_HOST = "host";
var SKIN_PALETTES = [PALETTE_CINDY, PALETTE_OCEAN, PALETTE_EMBER, PALETTE_FOREST];
var PALETTES = [...SKIN_PALETTES, PALETTE_HOST];
var MATERIAL_REFERENCE = "reference";
var MATERIAL_HOST = "host";
var MATERIAL_RADII = [MATERIAL_REFERENCE, MATERIAL_HOST];
var MATERIAL_SHADOWS_FLAT = "flat";
var MATERIAL_SHADOWS = [MATERIAL_REFERENCE, MATERIAL_SHADOWS_FLAT, MATERIAL_HOST];
var MATERIAL_MOTIONS = [MATERIAL_REFERENCE, MATERIAL_HOST];
var FONT_HOST = "host";
var FONT_FOLLOW = "follow";
var FONT_CUSTOM = "custom";
var PET_SOUND_OFF = "off";
var PET_SOUND_CUSTOM = "custom";
var PET_SOUND_CHOICES = [PET_SOUND_OFF, "startup-chime", "ring-chime", "item-found", "gem-collect", "item-fanfare", "victory-fanfare", "secret-chime", "error-buzz", "chime", "ding", PET_SOUND_CUSTOM];
var FONT_UI_INTER = "inter";
var FONT_UI_HARMONY = "harmony";
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
var FONT_UI_VALUES = [FONT_HOST, FONT_UI_HARMONY, FONT_UI_INTER, FONT_UI_GEIST, FONT_UI_FIXEL, FONT_UI_ATKINSON, FONT_UI_ANTHROPIC, FONT_CUSTOM];
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
var WALLPAPER_OFF = "off";
var WALLPAPER_CUSTOM = "custom";
var WALLPAPER_BUILTIN = "builtin";
var WALLPAPER_SOURCES = [WALLPAPER_OFF, WALLPAPER_CUSTOM, WALLPAPER_BUILTIN];
var WALLPAPER_MOTION_STATIC = "static";
var WALLPAPER_MOTION_DYNAMIC = "dynamic";
var WALLPAPER_MOTIONS = [WALLPAPER_MOTION_STATIC, WALLPAPER_MOTION_DYNAMIC];
var WALLPAPER_VISIBILITY_MIN = 0;
var WALLPAPER_VISIBILITY_MAX = 1;
var WALLPAPER_VISIBILITY_STEP = 0.05;
var WALLPAPER_BLUR_MIN = 0;
var WALLPAPER_BLUR_MAX = 20;
var WALLPAPER_BLUR_STEP = 1;
var BACKGROUND_OPACITY_MIN = 30;
var BACKGROUND_OPACITY_MAX = 100;
var BACKGROUND_OPACITY_STEP = 5;
var PREFS = {
  brandName: { type: "text", default: "", max: BRAND_NAME_MAX },
  brandInk: { type: "choice", values: BRAND_INKS, default: BRAND_INK_ORIGINAL },
  brandAccent: { type: "color", default: "" },
  motion: { type: "choice", values: MOTION_MODES, default: MOTION_SYSTEM },
  /** The material layer's corner scale: the reference theme's 4/8/12, or the host's own (D84). */
  materialRadius: { type: "choice", values: MATERIAL_RADII, default: MATERIAL_REFERENCE },
  /** Its shadows: the reference theme's three levels, flat (levels off, elevation drawn as a stroke), or the host's. */
  materialShadow: { type: "choice", values: MATERIAL_SHADOWS, default: MATERIAL_REFERENCE },
  /** Its durations: the reference theme's 150/200/250ms, or the host's. */
  materialMotion: { type: "choice", values: MATERIAL_MOTIONS, default: MATERIAL_REFERENCE },
  /** The sidebar's liquid glass: a translucent tint, a blur and an inner hairline. */
  materialGlass: { type: "boolean", default: true },
  /** The ambient light behind the whole shell: three soft radial washes; the cindy palette carries none (docs/STYLE.md). */
  materialAmbient: { type: "boolean", default: false },
  /** The session must name a subagent model rather than inherit the parent route. */
  subagentModelChoice: { type: "boolean", default: false },
  /** The composer's own entry for the routes one session delegates on. */
  subagentModelPicker: { type: "boolean", default: true },
  palette: { type: "choice", values: PALETTES, default: PALETTE_CINDY },
  fontUi: { type: "choice", values: FONT_UI_VALUES, default: FONT_UI_HARMONY },
  fontProse: { type: "choice", values: FONT_PROSE_VALUES, default: FONT_FOLLOW },
  fontCode: { type: "choice", values: FONT_CODE_VALUES, default: FONT_CODE_ANTHROPIC },
  fontUiCustom: { type: "text", default: "", max: FONT_LIST_MAX },
  fontProseCustom: { type: "text", default: "", max: FONT_LIST_MAX },
  fontCodeCustom: { type: "text", default: "", max: FONT_LIST_MAX },
  /** The mascot on the composer; the resolved one rides the document. */
  mascot: { type: "choice", values: MASCOTS, default: MASCOT_BRAND },
  mascotScope: { type: "choice", values: MASCOT_SCOPES, default: MASCOT_SCOPE_ALL },
  /** The chat pet, by package directory id; it follows neither the palette nor the brand (D80). */
  chatPet: { type: "text", default: "whaledou", max: PET_ID_MAX },
  /**
   * The sound the pet plays on each moment: a builtin id, `off`, or `custom`
   * naming the file the host half stores for the event (pet-sound contract).
   */
  petSoundAttention: { type: "choice", values: PET_SOUND_CHOICES, default: PET_SOUND_OFF },
  petSoundError: { type: "choice", values: PET_SOUND_CHOICES, default: PET_SOUND_OFF },
  petSoundSelect: { type: "choice", values: PET_SOUND_CHOICES, default: PET_SOUND_OFF },
  petSoundStart: { type: "choice", values: PET_SOUND_CHOICES, default: PET_SOUND_OFF },
  /**
   * The reader's own wallpaper: `custom` mounts the layer the host half's
   * wallpaper file serves under; `builtin` mounts one of the bundled set;
   * `off` takes it off again (live, D72). A fresh install wears Cindy's own
   * `cindy-whisper` over the palette.
   */
  wallpaperSource: { type: "choice", values: WALLPAPER_SOURCES, default: WALLPAPER_BUILTIN },
  /** The bundled wallpaper's id while the source is `builtin`; a text field so the build can hold the set to the files it ships. */
  wallpaperBuiltinId: { type: "text", default: "cindy-whisper", max: 40 },
  /** How much of it shows through the canvas veil; the value reaches the sheet as `--dsh-deepcraft-wallpaper-visibility`. */
  wallpaperVisibility: { type: "number", default: 0.4, min: WALLPAPER_VISIBILITY_MIN, max: WALLPAPER_VISIBILITY_MAX, step: WALLPAPER_VISIBILITY_STEP },
  /** The blur over it, in CSS pixels; the value reaches the sheet as `--dsh-deepcraft-wallpaper-blur`. */
  wallpaperBlur: { type: "number", default: 0, min: WALLPAPER_BLUR_MIN, max: WALLPAPER_BLUR_MAX, step: WALLPAPER_BLUR_STEP },
  /** A video wallpaper's play choice; a still image never reads it. */
  wallpaperMotion: { type: "choice", values: WALLPAPER_MOTIONS, default: WALLPAPER_MOTION_STATIC },
  /** Low power: stills the video and drops the wallpaper's blur. */
  wallpaperLite: { type: "boolean", default: false },
  /**
   * The shell's surface opacity as a percentage (BACKGROUND_OPACITY_*): the
   * canvas, the conversation column and the sidebar's glass scale toward
   * transparent so the window's acrylic backdrop shows through, and a
   * wallpaper's veil scales with the same factor. 100 leaves every fill the
   * paint it has always been. The value reaches the sheet as
   * `--dsh-deepcraft-background-opacity` and the attribute
   * `data-dsh-deepcraft-background-opacity`, both absent at 100.
   */
  backgroundOpacity: { type: "number", default: 100, min: BACKGROUND_OPACITY_MIN, max: BACKGROUND_OPACITY_MAX, step: BACKGROUND_OPACITY_STEP },
  /** The sidebar's recent block: conversations touched in the last day, at the top (D85). */
  recentSessions: { type: "boolean", default: true }
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
  const numeral = typeof Schema.number === "function" ? Schema.number() : Schema.string();
  const field = Schema.union([Schema.string(), Schema.boolean(), numeral, Schema.array(Schema.string())]);
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
