# Style Guide · 设计令牌

Design tokens for `dsh-deepcraft`: three independent colour palettes, the host's own colours beside them, and a brand identity the reader can replace (D80). A palette decides colours alone; the identity — the default whale and wordmark, or the reader's own name, mark and accent — stays the same under every palette.

## Palette

**Ocean blue (the default).** A low-saturation periwinkle `#5368C9` for fills,
the lighter `#5F73D9` reserved for the selected plate and the ripple's front, a
deeper step for text links on the light canvas and a lighter one on the dark.
The neutrals are a warm-free grey ladder: a near-white canvas `#FCFCFB` under a
light-grey sidebar in light, and a charcoal canvas `#202427` under a blue-black
sidebar in dark. User bubbles take the accent's own light tint, and inline code
keeps the body ink as the host draws it. Selected rows, hover plates, the
segmented controls' beds and the solid hover chip carry the accent at low alpha —
a blue wash rather than another grey step — so selection reads as the palette's
own.

**Warm ember.** The warm counterpart: ivory light `#FCFCFB` and warm black
`#141413`, an ember `#D97757` for every action with `#C6613F` as the light hover,
warm-compatible slate prose links and a warm neutral surface ladder. Button ink
on the ember fill is `#141413`, which reads at 5.9:1.

**Forest green.** Warm ember's ground and semantics with a green accent family:
`#397657` fills with `#FCFCFB` ink, `#2C6046` and `#438061` hovers, and
`#286649` / `#86C5A2` links, ripple and heat ink on the light and dark canvases.

**The default identity.** The brand area paints the host's own whale and its
wordmark as masks in the label ink, the wordmark without the HARNESS chip its
artwork carries (`brand/deepseek-mark.svg`, `brand/deepseek-word.svg`); the
new-conversation hero takes the same whale in the accent, and the account row's
picture, with no avatar behind it, is the pixel whale the mascot draws
(`brand/deepcraft-mark.svg`). The reader's own images and name replace these
through the custom-brand layer. The violet top rung of the reasoning slider stays
under every palette.

Rules:

- Never pure white, never pure black, never cool grays in the warm palettes. The
  reader's own message plate is the one fill that is not a step of the warm
  surface ladder and not the canvas either (`--dsw-specific-bubble`: the neutral
  the table header wears in light, a 6% white lift in dark) — the product's own
  light tint is a cool blue-grey, which reads blue beside this canvas.
- Accent usage stays under ~10% of visible elements.

**Links and the data palette.** Prose links keep an auxiliary hue of their own
rather than the accent: warm ember's a warm-compatible slate, ocean's the
periwinkle of its blue family, forest's the green of its own family. The
underline derives from the link in force; a prose link keeps that hue under the
pointer while an interface link's hover follows the accent. The skin also
carries a private run of data hues — a continuous ramp ink and six categorical
steps after the accent plus a neutral — in each palette, with the host palette
deriving them from the host's accent mixed toward its canvas, since another
theme's hues are not the skin's to name. A custom accent retunes the accent,
the prose link, the data ink and the low-alpha beds together; the categorical
hues stay each palette's own (D80).

The table below is generated from `packages/client/src/theme/tokens.json` by `npm run build`;
edit the JSON, not the table. Each palette states its own light and dark values,
so no cell falls back to another palette's; `—` is a token that palette leaves
unset.

<!-- generated:tokens (packages/client/src/theme/tokens.json) -->
| Token | Ocean light | Ocean dark | Ember light | Ember dark | Forest light | Forest dark | Host alias | Use |
|---|---|---|---|---|---|---|---|---|
| `--dsw-alias-bg-base` | `#fcfcfb` | `#202427` | `#fcfcfb` | `#141413` | `#fcfcfb` | `#141413` | host's own |  |
| `--dsw-alias-bg-layer-1` | `#fcfcfb` | `#24282d` | `#fcfcfb` | `#1c1b1a` | `#fcfcfb` | `#1c1b1a` | host's own |  |
| `--dsw-alias-bg-layer-2` | `#f2f2ef` | `#2b3038` | `#fbfbf9` | `#242320` | `#fbfbf9` | `#242320` | host's own |  |
| `--dsw-alias-bg-layer-3` | `#ededea` | `#343b45` | `#f9f9f6` | `#2e2c29` | `#f9f9f6` | `#2e2c29` | host's own |  |
| `--dsw-alias-bg-overlay` | `#fcfcfb` | `#2b3038` | `#ffffff` | `#242320` | `#ffffff` | `#242320` | host's own |  |
| `--dsw-alias-border-l1` | `#e5e5e1` | `#3b424c` | `#e8e6dc` | `rgba(255, 255, 255, 0.09)` | `#e8e6dc` | `rgba(255, 255, 255, 0.09)` | host's own | the standard edge: card and panel outlines, dividers, field outlines |
| `--dsw-alias-border-l2` | `#d4d5d2` | `#505863` | `#dedcd2` | `rgba(255, 255, 255, 0.18)` | `#dedcd2` | `rgba(255, 255, 255, 0.18)` | host's own |  |
| `--dsw-alias-border-l3` | `#b9bdc5` | `#6b7482` | `#d0cdc1` | `rgba(255, 255, 255, 0.30)` | `#d0cdc1` | `rgba(255, 255, 255, 0.30)` | host's own |  |
| `--dsw-alias-brand-primary` | `#5368c9` | `#5368c9` | `#d97757` | `#d97757` | `#397657` | `#397657` | host's own | the single accent: checks, focus rings, selected marks |
| `--dsw-alias-brand-text` | `#fcfcfb` | `#fcfcfb` | `#141413` | `#141413` | `#fcfcfb` | `#fcfcfb` | host's own |  |
| `--dsw-alias-button-primary-fill` | `#5368c9` | `#5368c9` | `#d97757` | `#d97757` | `#397657` | `#397657` | host's own |  |
| `--dsw-alias-button-primary-hover` | `#3e5bd6` | `#596dce` | `#c6613f` | `#e08a6d` | `#2c6046` | `#438061` | host's own |  |
| `--dsw-alias-button-elevated-fill` | `#fcfcfb` | `#2b3038` | `#ffffff` | `#242320` | `#ffffff` | `#242320` | host's own |  |
| `--dsw-alias-button-floating-fill` | `#fcfcfb` | `#2b3038` | `#ffffff` | `#242320` | `#ffffff` | `#242320` | host's own |  |
| `--dsw-alias-button-floating-hover` | `#ededea` | `#343b45` | `#ffffff` | `#2e2c29` | `#ffffff` | `#2e2c29` | host's own |  |
| `--dsw-alias-button-info-fill` | `#5368c9` | `#5368c9` | `#d97757` | `#d97757` | `#397657` | `#397657` | host's own |  |
| `--dsw-alias-button-info-hover` | `#3e5bd6` | `#596dce` | `#c6613f` | `#e08a6d` | `#2c6046` | `#438061` | host's own |  |
| `--dsw-alias-interactive-bg-active` | `rgba(83, 104, 201, 0.26)` | `rgba(142, 162, 242, 0.32)` | `rgba(217, 119, 87, 0.30)` | `rgba(217, 119, 87, 0.30)` | `rgba(57, 118, 87, 0.20)` | `rgba(134, 197, 162, 0.24)` | host's own |  |
| `--dsh-deepcraft-hover-bg` | `rgba(83, 104, 201, 0.14)` | `rgba(142, 162, 242, 0.16)` | `rgba(0, 0, 0, 0.08)` | `rgba(255, 255, 255, 0.08)` | `rgba(57, 118, 87, 0.10)` | `rgba(134, 197, 162, 0.12)` | `var(--dsw-alias-interactive-bg-hover)` | hover wash |
| `--dsh-deepcraft-inline-code-bg` | `rgba(32, 33, 36, 0.045)` | `rgba(238, 240, 243, 0.06)` | `rgba(0, 0, 0, 0.05)` | `rgba(255, 255, 255, 0.05)` | `rgba(0, 0, 0, 0.05)` | `rgba(255, 255, 255, 0.05)` | `var(--dsw-alias-markdown-inline-code)` | inline code fill |
| `--dsh-deepcraft-inline-code-fg` | `var(--dsw-alias-label-primary)` | `var(--dsw-alias-label-primary)` | `#943333` | `#e8a08a` | `#286649` | `#86c5a2` | `var(--dsw-alias-label-primary)` | inline code ink |
| `--dsh-deepcraft-link` | `#3e5bd6` | `#8ea2f2` | `#3d5f86` | `#a9c2df` | `#286649` | `#86c5a2` | `var(--dsw-alias-link)` | markdown links |
| `--dsh-deepcraft-link-underline` | `color-mix(in srgb, var(--dsh-deepcraft-link) 60%, transparent)` | `color-mix(in srgb, var(--dsh-deepcraft-link) 60%, transparent)` | `color-mix(in srgb, var(--dsh-deepcraft-link) 60%, transparent)` | `color-mix(in srgb, var(--dsh-deepcraft-link) 60%, transparent)` | `color-mix(in srgb, var(--dsh-deepcraft-link) 60%, transparent)` | `color-mix(in srgb, var(--dsh-deepcraft-link) 60%, transparent)` | `color-mix(in srgb, var(--dsw-alias-link) 60%, transparent)` | markdown link underline |
| `--dsw-alias-markdown-code-block` | `#f7f7f5` | `#252a30` | `#ffffff` | `#1c1b1a` | `#ffffff` | `#1c1b1a` | host's own |  |
| `--dsw-alias-markdown-code-block-banner` | `#f2f2ef` | `#2b3038` | `#ffffff` | `#242320` | `#ffffff` | `#242320` | host's own |  |
| `--dsw-alias-interactive-bg-hover` | `var(--dsh-deepcraft-hover-bg)` | `var(--dsh-deepcraft-hover-bg)` | `var(--dsh-deepcraft-hover-bg)` | `var(--dsh-deepcraft-hover-bg)` | `var(--dsh-deepcraft-hover-bg)` | `var(--dsh-deepcraft-hover-bg)` | host's own |  |
| `--dsw-alias-interactive-bg-hover-solid` | `#e4e8f8` | `#38415a` | `#f0efe9` | `#2e2c29` | `#e6efe9` | `#273b30` | host's own | the host's solid hover chip |
| `--dsw-alias-label-primary` | `#202124` | `#eef0f3` | `#141413` | `#faf9f5` | `#141413` | `#faf9f5` | host's own |  |
| `--dsw-alias-label-primary-bluish` | `#202124` | `#eef0f3` | `#141413` | `#faf9f5` | `#141413` | `#faf9f5` | host's own |  |
| `--dsw-alias-label-secondary` | `#61646b` | `#adb2bb` | `#6e6a60` | `#b0aea5` | `#6e6a60` | `#b0aea5` | host's own |  |
| `--dsw-alias-label-tertiary` | `#6c7078` | `#8b9099` | `#8f8a7e` | `#8f8d84` | `#8f8a7e` | `#8f8d84` | host's own |  |
| `--dsw-alias-label-caption` | `#70747c` | `#8b9099` | `#a6a094` | `#6b6a65` | `#a6a094` | `#6b6a65` | host's own |  |
| `--dsw-alias-label-shimmer` | `color-mix(in srgb, #202124 30%, transparent)` | `color-mix(in srgb, #eef0f3 45%, transparent)` | `color-mix(in srgb, #141413 30%, transparent)` | `color-mix(in srgb, #faf9f5 45%, transparent)` | `color-mix(in srgb, #141413 30%, transparent)` | `color-mix(in srgb, #faf9f5 45%, transparent)` | host's own | the highlight band's tint over running words: the host's own rows and the skin's band (shared/sweep-band.ts) alike |
| `--dsw-alias-label-deep-diving-shimmer` | `color-mix(in srgb, #202124 30%, transparent)` | `color-mix(in srgb, #eef0f3 45%, transparent)` | `color-mix(in srgb, #141413 30%, transparent)` | `color-mix(in srgb, #faf9f5 45%, transparent)` | `color-mix(in srgb, #141413 30%, transparent)` | `color-mix(in srgb, #faf9f5 45%, transparent)` | host's own | the band's tint inside the running row, which the host points --dsw-alias-label-shimmer at; the warm palettes wear the same band as everywhere else |
| `--dsw-alias-state-business-primary` | `#5368c9` | `#8ea2f2` | `#d97757` | `#d97757` | `#397657` | `#86c5a2` | host's own |  |
| `--dsw-alias-state-business-tertiary` | `#e2e7fc` | `#313f6b` | `#e9dfd2` | `#3a2a22` | `#e3eee6` | `#243a2e` | host's own |  |
| `--dsw-alias-link` | `#3e5bd6` | `#8ea2f2` | `#b9542f` | `#e08a6d` | `#286649` | `#86c5a2` | host's own | text link at rest |
| `--dsw-shadow-lv2` | `0 4px 18px rgba(20, 20, 19, 0.10), 0 1px 3px rgba(20, 20, 19, 0.05)` | `0 4px 16px rgba(0, 0, 0, 0.30), 0 1px 3px rgba(0, 0, 0, 0.14)` | `0 4px 18px rgba(20, 20, 19, 0.10), 0 1px 3px rgba(20, 20, 19, 0.05)` | `0 4px 16px rgba(0, 0, 0, 0.30), 0 1px 3px rgba(0, 0, 0, 0.14)` | `0 4px 18px rgba(20, 20, 19, 0.10), 0 1px 3px rgba(20, 20, 19, 0.05)` | `0 4px 16px rgba(0, 0, 0, 0.30), 0 1px 3px rgba(0, 0, 0, 0.14)` | host's own |  |
| `--dsw-specific-input-major` | `#f7f7f5` | `#252a30` | `#ffffff` | `#0f0e0d` | `#ffffff` | `#0f0e0d` | host's own |  |
| `--dsw-specific-selector` | `#eef0fa` | `#333a4a` | `#fbfbf9` | `#2e2c29` | `#eef4ef` | `#263a2e` | host's own |  |
| `--dsw-specific-sidebar-fill` | `#f2f2ef` | `#1d2124` | `#fbfbf9` | `#141413` | `#fbfbf9` | `#141413` | host's own |  |
| `--dsw-alias-brand-primary-new-colorprimary-new-color` | `#5368c9` | `#5368c9` | `#d97757` | `#d97757` | `#397657` | `#397657` | host's own |  |
| `--dsh-deepcraft-canvas` | `#fcfcfb` | `#202427` | `#fcfcfb` | `#141413` | `#fcfcfb` | `#141413` | `var(--dsw-alias-bg-base)` | the page canvas, the search box |
| `--dsh-deepcraft-sidebar-canvas` | `#f2f2ef` | `#1d2124` | `#fbfbf9` | `#141413` | `#fbfbf9` | `#141413` | `var(--dsw-specific-sidebar-fill)` | the sidebar |
| `--dsh-deepcraft-raised` | `#fcfcfb` | `#2b3038` | `var(--dsw-alias-bg-overlay)` | `#1e1e1d` | `var(--dsw-alias-bg-overlay)` | `#1e1e1d` | `var(--dsw-alias-bg-overlay)` | popovers and menus raised above the dark canvas |
| `--dsh-deepcraft-card` | `#fcfcfb` | `#2b3038` | `#fcfcfb` | `#1e1e1d` | `#fcfcfb` | `#1e1e1d` | `var(--dsw-alias-bg-overlay)` | cards on the canvas in light and raised in dark: the account popover, the search palette |
| `--dsh-deepcraft-ink-strong` | `#202124` | `#eef0f3` | `var(--dsw-alias-label-primary)` | `#f5f4ef` | `var(--dsw-alias-label-primary)` | `#f5f4ef` | `var(--dsw-alias-label-primary)` | active row ink |
| `--dsh-deepcraft-session-ink` | `#61646b` | `#adb2bb` | `var(--dsw-alias-label-secondary)` | `#8c8983` | `var(--dsw-alias-label-secondary)` | `#8c8983` | `var(--dsw-alias-label-secondary)` | session title at rest |
| `--dsh-deepcraft-table-head` | `#f2f2ef` | `#2b3038` | `#f0f0ef` | `#242320` | `#f0f0ef` | `#242320` | `var(--dsw-alias-bg-layer-2)` | table header row |
| `--dsh-deepcraft-ripple-ink` | `#8b8f97` | `#8b9099` | `#8a8a85` | `#8c8a82` | `#8a8a85` | `#8c8a82` | `var(--dsw-alias-label-secondary, #8a8a85)` | the new-conversation page's glyph field, and the wake a ripple leaves in it |
| `--dsh-deepcraft-ripple-wave` | `#5f73d9` | `#8ea2f2` | `#c6613f` | `#e08a6d` | `#286649` | `#86c5a2` | `var(--dsw-alias-link, #3b6ef0)` | the front of a ripple in the new-conversation page's glyph field |
| `--dsh-deepcraft-scrollbar` | `rgba(185, 189, 197, 0.8)` | `rgba(80, 88, 99, 0.9)` | `rgba(208, 205, 193, 0.9)` | `rgba(58, 56, 51, 0.9)` | `rgba(208, 205, 193, 0.9)` | `rgba(58, 56, 51, 0.9)` | `var(--dsw-alias-border-l2)` | scrollbar thumb |
| `--dsh-deepcraft-scrollbar-hover` | `rgba(139, 143, 151, 0.9)` | `rgba(107, 116, 130, 0.9)` | `rgba(143, 138, 126, 0.8)` | `rgba(107, 106, 101, 0.9)` | `rgba(143, 138, 126, 0.8)` | `rgba(107, 106, 101, 0.9)` | `var(--dsw-alias-label-caption)` | scrollbar thumb under the pointer |
| `--dsh-deepcraft-link-hover` | `color-mix(in oklab, var(--dsw-alias-link) 84%, var(--dsw-alias-label-primary))` | `color-mix(in oklab, var(--dsw-alias-link) 84%, var(--dsw-alias-label-primary))` | `color-mix(in oklab, var(--dsw-alias-link) 84%, var(--dsw-alias-label-primary))` | `color-mix(in oklab, var(--dsw-alias-link) 84%, var(--dsw-alias-label-primary))` | `color-mix(in oklab, var(--dsw-alias-link) 84%, var(--dsw-alias-label-primary))` | `color-mix(in oklab, var(--dsw-alias-link) 84%, var(--dsw-alias-label-primary))` | `color-mix(in oklab, var(--dsw-alias-link) 84%, var(--dsw-alias-label-primary))` | text link under the pointer |
| `--dsh-deepcraft-logo-ink` | `#202124` | `#eef0f3` | `#141413` | `#faf9f5` | `#141413` | `#faf9f5` | `var(--dsw-alias-label-primary)` | sidebar brand art: the whale and the wordmark |
| `--dsw-specific-menu` | `#fcfcfb` | `#2b3038` | `#ffffff` | `var(--dsh-deepcraft-raised)` | `#ffffff` | `var(--dsh-deepcraft-raised)` | host's own |  |
| `--dsw-specific-bubble` | `#e3e8fc` | `#303c55` | `#f0f0ef` | `rgba(255, 255, 255, 0.06)` | `#e6f1e8` | `#293e33` | host's own | user message bubble |
| `--dsh-deepcraft-chip` | `#eef0fa` | `#333a4a` | `#f6f6f4` | `var(--dsw-specific-selector)` | `#eef4ef` | `#263a2e` | `var(--dsw-specific-selector)` | segmented control and switch at rest |
| `--dsw-alias-label-primary-foreground` | `#fcfcfb` | `#fcfcfb` | `#141413` | `#141413` | `#141413` | `#141413` | host's own | the ink on a filled primary button: light on the accent in both palettes |
<!-- /generated:tokens -->

**Host token bindings.** The skin supplies its palette through the host's own
alias tokens, so a host control that reads more than one token for one surface
has to be given all of them. A filled primary button is that case: the host takes
the fill from `--dsw-alias-brand-primary`, but the hover from a monochrome step
of its own scale (light `#43454a`, dark `#ebeef2`) and the label from a
foreground token the skin leaves alone. `--dsw-alias-button-primary-fill` and
`--dsw-alias-button-primary-hover` therefore state both steps in each palette.
Two fills are palette-specific rather than carried over from the dark base:
`--dsw-alias-interactive-bg-hover-solid` (a solid chip, lighter than the canvas
in light) and `--dsw-alias-button-elevated-fill` (a surface above the canvas in
light, a raised gray in dark).

## Palettes and typefaces · 配色与字体归属

The Colours row chooses one of the skin's own palettes — **Ocean blue** (the
default), **Warm ember** or **Forest green** — or **Follow the host**; the
Typefaces row chooses the skin's faces or the host's. Every rule that writes a
host token carries a palette gate in its selector: one of the skin palettes'
ids for a palette block, or `[data-dsh-deepcraft-palette]:not([data-dsh-deepcraft-palette="host"])`
for a rule that holds under all of them; `--dsw-font-*` carries the typeface
gate. The rule that paints the skin's canvas onto the host's frame (`<html>`,
`<body>`, `#root`, the sidebar and conversation columns) carries the same gate;
the build refuses an ungated one. Under "follow the host" those rules drop out:
the host's own tokens stand, or another theme plugin's, such as a wallpaper
plugin that clears the canvas and turns the overlays to glass (D80).

The skin's own surfaces read only its private tokens and host tokens. Under the
host palette each private token is an alias of a host token (the token table's
Host alias column), so those surfaces follow whoever paints the host's. Every
private colour token states its values in all three palettes and its host alias
in `packages/client/src/theme/tokens.json`; the build refuses a missing one.
Cards take the host's overlay layer rather than its canvas: a plugin that
clears the canvas still gives its overlays a readable fill, and the shared
popover card blurs what lies behind it (`blur(16px) saturate(1.4)`).

Under the host typeface the skin's own faces fall back to the host's:
`--dsh-deepcraft-font-serif`, `-prose` and `-brand` to `--dsw-font-family` (the
host carries no serif), `--dsh-deepcraft-font-code` to `--ds-font-family-code`.
The stored value for the skin's faces keeps its earlier name `claude`; the row
reads it as **Theme**.

The reasoning slider's violet top rung (`--dsh-deepcraft-apex*`) stays under
every palette. Translucent neutral hover tints stay literal; they read on any
canvas. Every other colour that paints a surface, a text, a border or
an accent reads a token. A custom accent colour sits over the skin's palettes
and rebuilds the accent, the low-alpha beds and the prose link from the one
colour; under the host's palette the row is disabled and the stored colour kept.

## Windows titlebar · 桌面顶栏

On the Windows desktop the 40px caption row has no colour of its own: the
sidebar and the conversation run to the window's top edge, each in its own
fill (`--dsh-claude-sidebar-canvas`, `--dsh-claude-canvas`), and the sidebar's
0.5px `--dsw-alias-border-l1` hairline runs with them from the top edge to the
bottom. The conversation column and the fullscreen file panel lose the host's
16px top-left corner, so the hairline meets them straight. The three window
buttons sit on the page itself: no block of their own behind them, and they dim
with a modal's mask like everything else. Their hover plate is the system's, a
tint of the button glyph's colour.

## Right sidebar · 右侧栏

A panel docked in the right column is a card: 8px inside the column on every
side, a 16px radius, the skin's 1px `--dsw-alias-border-l1` hairline and the
host's own panel elevation (`--dsw-elevation-prominent` — a `.5px` stroke, a
3px/8px drop and a 20px halo). The frame's canvas shows through the gap, and
the host's `.5px` left border on the first dock column gives way to the
hairline.

The card hangs on what paints the column: a docked tab's pane
(`[data-dockkit-host="dock"] > [data-dockkit-pane]`) or the column's own empty
host (`[data-dockkit-empty]`), which the pane inside it leaves transparent.

The card is the only look: every rule above stands unconditionally, and the
dock's own resting look is not offered. A panel pulled out of the sidebar keeps
the host's own floating-window frame (`[data-dockkit-host="float"]`); a split
column gives each pane its own card, with the drag divider left on the seam
between them.

**The start page.** The host centers its stack of entries in a box that never
grows, so a list taller than the pane was clipped at both ends, its first rows
out of reach. On the card the stack scrolls: `justify-content: flex-start`,
`margin-top: auto` on the first entry and `margin-bottom: auto` on the last.
The two auto margins absorb the free space exactly as `center` did while the
list fits, and fall to zero once it does not, so the stack starts at the top
and scrolls to its end.

## Typography

- **Serif display** — headings / editorial statements (`--dsh-claude-font-serif`).
- **Sans UI** — chrome, body (`--dsw-font-family`).
- **Mono** — code, technical labels (`--dsh-claude-font-code`).


## Shapes

- Radius: 4 / 8 / 16 px; 12px for a popover card and 6px for its rows (the
  popover table below); pills for CTAs (`9999px`). A shape copied from a host
  control keeps that control's own geometry rather than the scale above: the
  workspace segments' 7px, the view tabs' 5px and the file pills' 999px.
- A host control whose layout the host itself measures keeps that measurement's
  input: the conversation's view tabs are counted from the tab row's own width
  (120px a view), so the row keeps the width the host gives it and only the
  tablist inside it hugs the tabs. A row narrowed to its content reads as one
  view and pushes the rest into More.
- Borders: 1px, and in dark not a colour but a highlight. The three border
  tokens are one translucent white at `.09` / `.18` / `.30`, so a card, a panel,
  a code block or a keycap reads as a chamfer catching the top light over
  whatever fill it sits on rather than as a contour whose colour has to be
  re-picked per surface. The light rungs stay the warm opaque ladder.
- Hairline: 0.5px, for the split between the sidebar and the conversation
  (`theme/chrome.css`, one device pixel on a retina display and the width the
  product itself states), the Markdown table frame and the trajectory chip
  (`theme/typography.css`, `features/chat-files`). Every other single-direction
  rule stays 1px.
- Spacing: 4 px rhythm.

## Motion

Every duration, curve, distance, blur and scale the skin uses is a token here,
and a stylesheet or a Web Animations call reads the token rather than writing the
value (D9). One value per role, so a faster feedback or a calmer swap is one
edit; the build refuses a time or a curve written anywhere else.

- Feedback: a control answering hover, press or focus.
- Reveal: content entering the chat area at the host's own 120 ms.
- Surface: an entrance — a menu, a popover, a panel, a dialog, a toast.
- Exit: a dismissal, deliberately quicker than the entrance.
- Travel: something moving along its own track (a fold's door, the reasoning
  slider).
- The swap, its gap and the roll of a figure's digits come from the transitions
  this skin ports; `THIRD_PARTY_NOTICES.md` names each one.
- Loop periods are separate from durations: a sweep, a pulse, a blink, a breath.
- Open: a menu growing out of its trigger, a dialog out of the centre, a
  settings page sliding in — the transitions.dev surfaces, settling on their own
  curve and closing on the exit duration.
- The presets these tokens feed live in `packages/client/src/shared/motion.css`:
  a surface arriving or leaving, a menu growing out of its trigger, a plain
  fade, one half of a wording swap, the pulse a placeholder and the sidebar's
  ongoing light share, and the band
  the waiting line's words wear.
  A feature that needs its own effect reads the tokens and keeps its own
  keyframes.

The table below is generated from `packages/client/src/theme/tokens.json` by `npm run build`;
edit the JSON, not the table.

<!-- generated:motion (packages/client/src/theme/tokens.json) -->
| Token | Value | Use |
|---|---|---|
| `--dsh-deepcraft-duration-feedback` | `120ms` | a control answering hover, press or focus: its colour, background, border, shadow, or a small turn or slide of its own parts |
| `--dsh-deepcraft-duration-reveal` | `120ms` | content entering the chat area: an opened row's body, and each streamed piece of the answer |
| `--dsh-deepcraft-duration-surface` | `150ms` | a floating surface or a group of controls appearing: popover cards, menus, panels, the search dialog, a toast, a strip fading in |
| `--dsh-deepcraft-duration-exit` | `120ms` | a surface leaving on the reader's dismissal: a menu or a dialog closing, the overtime badge leaving |
| `--dsh-deepcraft-duration-open` | `250ms` | a surface growing out of its anchor: a menu out of its trigger, a full-window dialog out of the centre, a settings page sliding in, the overtime badge sliding onto its line |
| `--dsh-deepcraft-duration-swap` | `150ms` | each half of a wording swap: the old words leaving, the new ones arriving |
| `--dsh-deepcraft-duration-swap-gap` | `50ms` | the offset the words arriving start after the words leaving, so the two halves of a wording swap travel together |
| `--dsh-deepcraft-duration-roll` | `160ms` | a figure's characters rolling over to new digits |
| `--dsh-deepcraft-duration-move` | `200ms` | something travelling along its own track: a fold's door |
| `--dsh-deepcraft-duration-count` | `220ms` | a session number counting to its new reading |
| `--dsh-deepcraft-duration-slide` | `240ms` | the segmented controls' sliding highlight, a sidebar icon's quarter turn, the wording box taking the width of the words arriving, and streamed content sliding up from the bottom edge |
| `--dsh-deepcraft-duration-fade` | `300ms` | a slow cross-fade: the theme flip, the titlebar tabs' hover reveal, a placeholder handing its place to what it stood for |
| `--dsh-deepcraft-duration-bounce` | `350ms` | a switch's knob travelling across with its double bounce |
| `--dsh-deepcraft-duration-step` | `500ms` | one step of the reasoning window's text rising two lines |
| `--dsh-deepcraft-duration-pop` | `500ms` | something popping into place: the overtime badge's own pill |
| `--dsh-deepcraft-duration-rise` | `500ms` | a line of the home greeting rising into place |
| `--dsh-deepcraft-duration-stagger` | `70ms` | how far behind the piece before it a staggered piece starts: the greeting's second line |
| `--dsh-deepcraft-duration-reduced` | `0.01ms` | every skin animation and transition under the Reduced animation choice (D40) |
| `--dsh-deepcraft-period-host-sweep` | `1500ms` | one pass of the highlight band across the waiting line's words and a running process group's header |
| `--dsh-deepcraft-duration-host-sweep-delay` | `300ms` | how long the highlight band waits after its words appear before its first pass |
| `--dsh-deepcraft-period-pulse` | `1600ms` | a placeholder breathing while its numbers are computed |
| `--dsh-deepcraft-period-breathe` | `2400ms` | one breath of the sidebar's ongoing-conversation light |
| `--dsh-deepcraft-period-landed` | `1400ms` | the mark on the turn the conversation navigator landed on |
| `--dsh-deepcraft-period-hold` | `840ms` | how long the reasoning window's text stands between two steps |
| `--dsh-deepcraft-ease-standard` | `ease` | feedback and surfaces: the default curve |
| `--dsh-deepcraft-ease-out` | `ease-out` | something arriving and settling: a fold's door, content entering the chat area, the landing mark |
| `--dsh-deepcraft-ease-in-out` | `ease-in-out` | something that leaves and returns, or swaps in place: wording swaps, pulses, flashes |
| `--dsh-deepcraft-ease-glide` | `cubic-bezier(0.22, 0.61, 0.36, 1)` | travel along a track: the sliding highlight, the search dialog's entrance, the reasoning window's step, the wording box's width, the stream's slide |
| `--dsh-deepcraft-ease-roll` | `cubic-bezier(0.4, 0, 0.2, 1)` | digits rolling over: the file rows' tail and the process group header's counts |
| `--dsh-deepcraft-ease-spring` | `cubic-bezier(0.34, 1.45, 0.64, 1)` | a small overshoot as something lands: the overtime badge popping in, a switch's knob bouncing past its end |
| `--dsh-deepcraft-ease-settle` | `cubic-bezier(0.22, 1, 0.36, 1)` | a surface or a page settling into place out of its anchor: menus and dialogs opening and closing, a settings page sliding, the overtime badge sliding onto its line, the greeting's lines rising |
| `--dsh-deepcraft-ease-host-sweep` | `steps(48, end)` | the band across the waiting line's words and a running process group's header |
| `--dsh-deepcraft-distance-nudge` | `4px` | the short offset a surface rises from, and a small row's wording swap travels |
| `--dsh-deepcraft-distance-travel` | `8px` | the waiting line's wording swap, a settings page's slide, and the overtime badge's sideways slide |
| `--dsh-deepcraft-distance-rise` | `12px` | how far below its place a line of the home greeting starts, and the overtime badge's upward slide |
| `--dsh-deepcraft-blur-soft` | `2px` | the blur words and badges pass through while they swap or pop in, and a placeholder passes through as it hands its place over |
| `--dsh-deepcraft-blur-enter` | `3px` | the blur a settings page or a line of the home greeting passes through as it slides or rises in |
| `--dsh-deepcraft-scale-surface` | `0.98` | the scale a surface grows from as it rises |
| `--dsh-deepcraft-scale-dropdown` | `0.97` | the scale a menu grows from out of its trigger |
| `--dsh-deepcraft-scale-dropdown-exit` | `0.99` | the scale a menu shrinks to while it fades on closing |
| `--dsh-deepcraft-timing-feedback` | `var(--dsh-deepcraft-duration-feedback) var(--dsh-deepcraft-ease-standard)` | shorthand: a control's state change, written after the property in a transition |
| `--dsh-deepcraft-timing-surface` | `var(--dsh-deepcraft-duration-surface) var(--dsh-deepcraft-ease-standard)` | shorthand: a surface appearing, written after the property or the keyframes' name |
<!-- /generated:motion -->

## Layers

A z-index the skin writes is one of two kinds (D9). Inside one box, siblings
are ordered with a literal from -1 to 9: a fill painted under its own content,
a label over its sliding pill. Anything that has to clear what the host draws
around it — a control standing beside the composer's own, the window's title
row, a floating card, a surface over the whole window —
stands on a layer token, and the build refuses any other number.

The table below is generated from `packages/client/src/theme/tokens.json` by `npm run build`;
edit the JSON, not the table.

<!-- generated:layers (packages/client/src/theme/tokens.json) -->
| Token | Value | Use |
|---|---|---|
| `--dsh-deepcraft-layer-chrome` | `30` | the window's title row the skin draws into: the header band's title and actions, the titlebar's view tabs, over the host's own header |
| `--dsh-deepcraft-layer-float` | `99999` | a floating card or menu over everything the host draws: the popover cards |
<!-- /generated:layers -->

## Text selection

Selection is the one surface that leaves the palette on purpose — it is a
transient gesture, not part of the interface, so it uses the platform's two
solid paints and looks the same on both canvases:

| State | Background | Text |
|---|---|---|
| Window focused | `#3366D0` | `#FFFFFF` |
| Window unfocused | `#C7C7C6` | `#000000` |

Both are solid (never translucent) and `!important`, so they override whatever
colour the text underneath carries — links, inline code, syntax tokens. CSS
cannot read window focus: Chromium reaches the inactive paint through its own
internal `-internal-inactive-selection-*` properties, which a stylesheet cannot
address. A feature-owned mirror therefore copies `document.hasFocus()` onto
`data-dsh-deepcraft-window-blur` and the stylesheet switches on that attribute;
the selection itself survives the blur.

## Markdown material

A quote is a **container**, not a link: it keeps the prose face on a neutral bar
and wash (text `#B0AEA5`, light `#6E6A60`), and whatever sits inside it keeps its
own material — links keep the brand's link hue, inline-code chips stay warm
red, file mentions stay in the link hue. Never paint the quote itself with the
link colour: the colour inherits into the block's inline code and mentions,
which is exactly the leak that made every path inside a quote read as a link.

**Inline file mentions are links, not code.** The host resolves a file path
inside an inline code span to a button (`.fileMention`, hashed — match it with
`[class*="_fileMention"]`) and paints it with its link alias. The generic
inline-code chip rule is more specific than that class, so a mention inherits
the chip's warm red unless a rule names it. A mention takes the link's hue, weight
500, and the link's underline (solid in the link tone at rest, solid and fully
opaque on hover, same thickness and offset — the same treatment the skin gives an
anchor); the chip itself is left alone — the same fill, hairline, radius and
padding as any other inline code. Plain inline code keeps its warm text. Note the
hover rule names `color` and `text-decoration-color` rather than the
`text-decoration` shorthand: the shorthand resets `text-decoration-thickness` to
`auto` and thins the line mid-hover.

## Inline code

The chip hugs its glyphs. The host builds it as an `inline-flex` box that
inherits the prose line box — 23px for a 15px code size — which left ~5px of
empty wash above and below the text. The skin sets `line-height: 1.2` on inline
code (27px → 22px, with the 1px padding as the visible inset); lower values
start clipping descenders. The fill, hairline, radius and size are unchanged.

## Popovers · 多选一弹层

Every single-choice popover in the skin — the subagent model card, the account
drawer, the turn navigator's card and the search palette — is meant to start
from one recipe. New popovers take it rather than inventing a card.

Two rules hold across all of them, both owned by `shared/popover.ts`. A
pointer opens a card only after a **100 ms dwell** — long enough that crossing a
28px trigger on the way somewhere else unfolds nothing — and the card closes
100 ms after the pointer leaves. And **only one card is on screen
at a time**: each popover registers its close path with `registerPopover(name,
close)` and calls `closeOtherPopovers(name)` on the way open, so opening the
subagent card folds the account drawer, and either folds the context panel.

The context meter's popover is the host's own panel (it portals it, places it,
and dismisses it), so the skin drives its trigger on hover and paints nothing of
the shell itself. What it carries is described under "Context popover" below.

The subagent model entry uses a 28px concentric-circles icon button beside the
model control. An
accent dot marks a saved selection; the button's tooltip names it and the
selection card wraps model and provider names onto as many lines as needed.

**Card**

| Property | Value |
|---|---|
| background | `var(--dsw-alias-bg-overlay)`; dark `#1e1e1d` |
| border | `1px solid var(--dsw-alias-border-l1)`; dark the same stroke, which the dark ladder makes a highlight. The edge stays the card's own border: the box the placement reads and the opening animation scales keeps the paint path it has always had, and no stroke is drawn inside it |
| radius | 12px |
| shadow | `0 8px 24px rgba(20,20,19,.12), 0 2px 6px rgba(20,20,19,.08)`; dark `0 8px 28px rgba(0,0,0,.65), 0 2px 8px rgba(0,0,0,.45)` |
| padding | 6px |
| layout | flex column, `gap: 6px`; a list body stacks its rows 3px apart |
| z-index | 99999, above the host's own menus (1100) |
| open | `opacity 0 → 1`, `translateY(4px) scale(.98) → none`, `.15s ease`, origin on the anchor's side |

**Row**

| Property | Value |
|---|---|
| min-height | 32px — a floor, not a cap: a two-line row grows |
| padding | `2px 7px` |
| radius | 6px |
| text | 13px / 20px, `var(--dsw-alias-label-primary)` |
| hover | `var(--dsh-claude-hover-bg, rgba(0, 0, 0, .08))` |
| icon | 16px, `var(--dsw-alias-label-secondary)` |
| two-line row | name 13px / 16px at 500; description 11px / 14px in `label-tertiary` |
| current row | trailing `IconCheckOutline16` in `var(--dsw-alias-brand-primary)` — the accent is what marks the choice |
| disabled | `opacity: .4`, `cursor: not-allowed` |

**Heading, separator, footer**

- heading row: 11px / 16px at 600, `letter-spacing: .04em`, uppercase, `label-tertiary`, `padding: 6px 7px 2px`
- separator: `0.5px` `var(--dsw-alias-border-l2)` — the host's own line on a menu
  surface (`Menu.module.css`) — `margin: 2px 4px`, drawn as a top border on a
  zero-height box. One rule in the shared shell covers every separator in a card,
  the host's own menu separators included, so the line is one thickness wherever
  it appears and does not follow the card's opening scale
- pinned footer: `margin-top` / `padding-top` 4px, and the same `0.5px`
  `var(--dsw-alias-border-l2)` line above it

**Host surfaces**

The host's dropdown menus are one shared primitive (primitives' `Menu`), and its
two class-name families hash in opposite directions: the primitive ships inside
the web shell as `_<local>_<hash>_<n>` (`_itemWrap_1nxmc_92`,
`_itemLabel_1nxmc_174`), while the client-ui packages hash as `<hash>_<local>`
(`daogkW_itemName`, `p_FcLG_cardWorkspaceTrigger`). A substring matcher therefore
takes the longest stable piece of whichever family it targets — `_itemWrap_`,
`_itemLabel_`, `_viewport_` on one side, `_itemName`, `_itemDesc` on the other —
never the bare local name.


**The account card** is that primitive too, and it carries the skin's rows
inside it. The host mounts it with nothing but its own three entries and places
it from that geometry; `features/account/surface.ts` injects the skin's container
a frame later, the card grows, and the host re-places it on the frame after the
list changed. Nothing may be painted in between: the card would fade in at the
height and the place it is about to leave — low, then jumping up mid-fade. So
while the account row is armed the card stays unpainted (the same armed window
that carries its one-shot entrance), and the feature stamps
`data-dsh-claude-account-ready` once the skin's rows are inside it and its
placement has been read twice with the same value. The entrance animation hangs
on that stamp, so it plays on the card the reader will actually see.

## Context popover · 上下文弹层

The context meter's popover is the host's own panel: the skin opens it by
pressing the host's trigger (hover, with the shared 100 ms dwell and close
grace, gated on the "open popovers on hover" preference; a click still works),
and paints nothing of its shell or its dismissal. It mounts
instead of toggling `data-open`, so the feature stamps the panel and it takes
the cards' own short rise as a one-shot animation — same 4px, same `scale(.98)`,
same 0.15s — and a surface the skin opens arrives the same way wherever it is
the host's.

Its horizontal place is the one thing the skin takes over. ui-chat hangs the
panel from the anchor's LEFT edge and only then clamps it into the viewport
(`useStatDialog`, align `start`), so a trigger at the end of the composer row
leaves the panel against the window's right margin instead of under the ring.
`features/context-stats/stats-binding.ts` reads the meter's right edge and the
panel's own layout width — `offsetWidth`, not its rect: the entrance scales the
box, and a transformed rect is two per cent narrower than the one that settles —
and writes `--dsh-deepcraft-context-panel-left` on the panel itself, which
outranks the host's inline value. The reading is re-taken when the panel's box changes (a size
subscription on the observation bus) and when the viewport moves (`reposition('viewport')`).

What the skin appends to it is the session's numbers
(`features/context-stats/session-stats.ts`), read from the host's `sessionStats`
and `tokenUsage` projections — the same durable whole-log values the host's own
pills render — never by opening the host's stat dialogs. The labels and the
duration / token templates come from the host's `chat` locale namespace, so the
two surfaces read the same words; the host's small formatting rules
(`formatDuration`, `formatTokensPerSecond`, `formatExactTokens`,
`formatCacheHitPercent`) are mirrored so the figures match character for
character.

Which figures appear follows the host's statistics row. Its detailed form gets
the whole list. Its compact form carries only the output speed and the cache-hit
share on the composer line, so the block keeps the four that row leaves out —
the total time, the first-token average, the output speed and the cache-hit
share. The total is the one figure the host has no word for (its dialog names
the model's time and the tool calls' separately): it is their sum, labelled from
the skin's own copy (`contextTotalTime`).

The block: a 1px `var(--dsw-alias-border-l1)` rule and 10px above it, then per
section an 11px / 16px heading at 600 in `label-tertiary` and a two-column grid
(6px by 10px). A row is a stack: 12px / 16px label in `label-tertiary` over a
14px / 20px value at 500 in `label-primary`, the value in tabular figures so
numbers do not dance as they change. Rows follow the host's own rules — one
appears only when its input exists — and the block is rewritten on every
projection frame while the panel is open.

While the projections have answered nothing, the block holds the numbers' place
under the two real headings: bars at a row's own 37px (16 + 1 + 20) in the host's
solid hover fill, pulsing over 1.6s (still under the reduced animation choice).
The place is given up after 2s, so a host that serves no such projection ends at
the panel it drew itself rather than keeping placeholder bars.

**The cards stay aligned**: the account drawer was the outlier
(8px row radius, 2px and 4px card gap, 8px padding, 220 / 260px min-width,
z-index 1000 and 100000) and now follows the table above.

## Context meter · 上下文计量

**The trigger is a pie.** Where the host draws a ring of two circles, the meter
draws two sectors on one centre: the share taken in the colour its occupancy fell
on, the rest of the plate in the quiet tone beside it. The smaller share keeps
the box's radius (8px) and the larger one steps in by up to 1.3px — half the
lift — so a lopsided split reads as the smaller part standing out to the edge,
15% and 85% mirror each other, and an even split is two half discs of one radius;
the step eases to nothing as the split comes even. The seam is one width, 1.2px,
shared between two strokes by the split: the occupied sector's stroke runs from
the whole width at nothing taken to nothing at everything taken, the plate's is
the mirror, and each is half the width at the even split. Each sector is cut by
the stroke around the other's path, so the seam follows the whole boundary — both
radii, the outer arc and the apex — and the two edges move with the split as the
reading crosses the middle. The part that stands out is painted last: the plate
above the even split, the reading's colour below it. The pie is 16px across, one
pixel more than the ring's 14px cell on each side, and concentric with it; the
ring keeps its cell and is hidden while the pie stands, so the trigger's layout
and the room the composer keeps for it are the host's. The occupied sector takes
the reading's own colour (the occupancy ramp, below), the plate the quiet tone
beside it.

**The line of numbers.** On its own line under the card, each figure is plain
text in the line's type (13px / 500, tabular figures), not a run of per-character
spans: a reading that moves is chased from the value on show, closing about two
thirds of the distance every 73ms and the rest within 220ms, a reading that lands
mid-count becomes the new destination, and another session's numbers are chased
from the ones on show too. Only the cache share's figure and the percent sign
after it wear the band; the words before them keep the line's tone. A card too
narrow drops figures in a fixed order, and the widest step folds each token
figure into k / M / B.

## Search · 搜索

**Sidebar box.** The box takes the brand's place in the logo row while the
pointer is over the sidebar: 28px tall, 8px radius, a 1px `#E8E6DC` hairline on
the ivory canvas fill (dark: `#2E2C29` on `#1E1E1D`), a 16px search glyph in the
secondary label, the "Search" label in the tertiary label at 14px, and the
host's search shortcut as 20px keycaps at the right end. The New session row's
own shortcut wears that same keycap: a 20px box with a 1px hairline, 4px radius
and 12px secondary ink, and the `+` the host writes between the two keys goes,
the way the box leaves it out. It is a button like the New session and Plugins
rows below it: the pointer cursor, and on hover the same plate those rows take
(`--dsh-claude-hover-bg`, dark `rgba(255, 255, 255, 0.08)`) laid over its
opaque fill. Box and brand share one grid cell and cross-fade over 0.16s, the
timing the workspace heading and its segmented control trade places with; the
box is excluded from the window drag region. Standalone gives the box a row of
its own under the brand row, shown without a hover; that row adds no inline
padding, so the box's hairline stands on the two edges of the column's own
inset and is exactly as wide as the New session plate below it. In the desktop
titlebar mode the brand row rises 6px, since the sidebar column starts under
the 40px titlebar — as far as it goes with the box still wholly below that
edge, which clips the column. A box narrower than 200px keeps its glyph and
label and leaves the keycaps out.

**Palette.** A modal card set 8vh from the top, 760px wide at most, 16px radius,
on the same ivory fill (dark `#1E1E1D`) under the host's mask. From the top: a
17px borderless input with a 28px close button; the category chips (32px tall,
8px radius, 14px, tertiary at rest and primary when current) sharing one
sliding highlight at `rgba(20, 20, 19, 0.06)`; the list, capped at
`min(520px, 62vh)`, with 13px tertiary section captions and 40px rows (8px
radius, 15px title, an 18px glyph in the secondary label, a 13px tertiary detail
after the title and an optional 13px tertiary excerpt line under it, the match
inside it in the primary label at weight 500 with no fill); a hairline-topped footer
of hints with 20px keycaps. The input text, the chips' text, the captions and
the row glyphs all start on one vertical line 24px in from the card edge. The
highlighted row takes `rgba(20, 20, 19, 0.05)` (dark `rgba(250, 249, 245, 0.07)`)
and shows the Enter glyph; the others hide it. The card fades in and settles
from 6px above at 98.5% scale over 0.18s; on close card and mask fade out
together over 0.14s before the modal unmounts.

## Conversation layout · 对话布局

The page keeps the host's own arrangement: its reading column, its composer and
its controls stay where the host draws them, and the skin only recolours,
reshapes and animates them. The layout settings that used to restyle these
parts are gone.

## Chat / Code switch · 聊天 / 代码切换

With ds-bot installed, the switch is two 28×22 options on a 2px-padded plate
with a 7px radius, each option 5px: chat bubbles and `</>`, 16px glyphs in the
1.3px stroke the sidebar's glyphs use. It is painted on both sides of the switch
by whoever paints the host's tokens — the theme on the Code side, ds-bot on the
Chat side — so the plate is a translucent tint (`rgba(20, 20, 19, 0.06)`, dark
`rgba(255, 255, 255, 0.08)`), the options take the tertiary label at rest and
the primary on hover, and the checked one is cut from the conversation canvas
(`--dsw-alias-bg-base`) with a 1px `rgba(20, 20, 19, 0.10)` drop (dark: a
`rgba(255, 255, 255, 0.14)` fill and no drop). On the desktop it stands in the
caption row, its right edge 12px inside the sidebar column's, centred in the
row, and leaves the screen while the column is too narrow to keep 8px clear of
the controls at the row's left end; on the web it is a cell of the sidebar's
first row, before the collapse toggle. It moves nothing: there is no
transition, since the press hands the whole page to the other side.

## The waiting line · 模型正在做什么的那一行

The host's running row, its whale, its divider and its live region stay as the
host draws them (D80). The host's own shimmering words step aside for the
skin's line beside the whale: the wording in the
secondary label at 14px on a 24px line,
the turn's clock 8px later in the caption at 13px with tabular figures, and the
"No response yet" badge 8px after that (11px on a 16px line, 0 6px padding, a 5px
radius, the warning label over 16% of itself). The line takes the row's own
width and gives way inside it: the words are carried whole, so a clause the row
has no room for is clipped where the room ends and the copy draws an ellipsis,
with the clock and the badge keeping their places. The wording wears the
highlight band the host's own rows sweep — 1.5s a pass
with the band resting the last third of it, in the host's shimmer tint
(`packages/client/src/shared/motion.css`). A wording that changes runs both
halves of the swap at once and is over in
0.2s: the old one
leaves upward with a 2px blur while the new one, parked one gap, enters from 4px
below; under Reduced motion the band is left out
and the wording is written at once.

With the chat area's own follow on, the row is pinned while the conversation
follows its tail, at the place that follow's glide comes to rest — a height
read off the composer's own box plus the host's transcript
padding — the canvas painted behind it, since the transcript's tail would
otherwise show through. The pin stands only while the host reports the tail (or
the stream glide holds the position) and steps aside for the reader's own
scrolling.


## The composer crab · 输入卡片上的螃蟹

The pixel crab is one of the mascots the Mascot row offers. It stands where Deepy does — the composer card's top edge on
the home page, the input area or the panel that replaces it in a
conversation (unless Where it appears keeps it to the home page) — and follows
the same states with the same keys. It is drawn on a 52×36 grid of cells at 2px
a cell, crisp (`pixelated`, 104×72px): feet on the bottom row, on the edge of
what it stands on; the right claw four cells in from the grid's right edge, so
it stands 8px inside the card's right edge, where the 18px corner starts to
round, and the four spare cells take a lean, a note or a sparkle. The resting
crab — shell 16×12 cells, claws 4×4, eyes 2×2, four legs 2×4 — is 48×32px
(columns 24–47, rows 20–35) and only it takes the pointer. The shell is the clay
accent `#d97757` in both themes, the side-on back `#b9603f`, the eyes `#141413`;
the props (the laptop, the thought bubble, letters, notes, the hard hat) are an
ink mask filled with the tertiary label ink. Every frame lasts 80ms, Claude
Code's pace. Its laptop frames are Claude Code's own routine; the rest are drawn
by `scripts/draw-crab.py` after the same character. With the animation choice
resolved to "reduced" each state holds its still frame; a click or a pull still
plays its reaction.

| State | Animation | Still frame |
|---|---|---|
| idle, every 20–40 s a look around, a claw wave or Claude Code's whole laptop routine | `idle`, `idle-look`, `idle-wave`, `idle-laptop` | 0 |
| the model reasons or has not answered: eyes up to a thought bubble | `thinking` | 18 |
| the model writes or tools run: 1 / 2 / 3+ sessions at work (typing / headphones / typing in a hard hat) | `typing` / `music` / `building` | 0 / 0 / 0 |
| subagents running: 1 / 2+ (headphones / conducting) | `music` / `conducting` | 0 / 0 |
| a compaction runs: squashed | `compacting` | 3 |
| an approval, a question or a plan review waits: an exclamation mark | `notification` | 0 |
| a tool call or a turn failed (4.8 s): crossed eyes, a shake | `error` | 4 |
| a turn or a compaction finished (5.2 s): hops, claws up | `happy` | 3 |
| a quiet minute / the next pointer move or key | `sleeping` / `waking` | 0 / 11 |
| a click on the left / right half, four quick clicks, a pull | `poke-left` / `poke-right`, `tickle`, `drag` | 0 |

## Deepy · 小鲸鱼

Picked in the Mascot row, the mascot is Deepy, the pixel whale: a 52×52 grid of logical pixels drawn at 2px a pixel (a 104px
square), the whale's bottom — row 50 — on the top edge of what it stands on.
The art is stepped pixel art on an integer grid, drawn with `image-rendering: pixelated`
so downscales keep crisp pixel edges. The body is pale blue `#CED9FF` with a deep-blue
`#3F5297` outline, a white-tinted belly `#EEF2FF`, shade and pectoral fin `#9EB2EB`,
and a dark eye `#243460`. Its box sits 8px in from the right end of the card it stands over.
On the home page that is the composer card; in a conversation it is the whole
input area, and the panel that replaces the card while the reader is asked for something
(those panels start 6–8px above their card). Every frame lasts 50ms. Only the resting body
(columns 10–42, rows 32–50, hit box 64×36px) takes the pointer. With the animation choice
resolved to "reduced" each state holds its still frame; a click or a pull still
plays its reaction.

| State | Animation | Still frame |
|---|---|---|
| idle, every 20–40 s a look around, a spout or a laptop routine | `idle`, `idle-look`, `idle-spout`, `idle-laptop` | 0 |
| the model reasons or has not answered | `thinking` | 20 |
| the model writes or tools run: 1 / 2 / 3+ sessions at work | `typing` / `music` / `building` | 16 / 0 / 0 |
| subagents running: 1 / 2+ | `music` / `conducting` | 0 / 6 |
| a compaction runs | `compacting` | 20 |
| an approval, a question or a plan review waits | `notification` | 12 |
| a tool call or a turn failed (4.8 s) | `error` | 24 |
| a turn or a compaction finished (5.2 s) | `happy` | 44 |
| a quiet minute (no work, no pointer move or key) / the next pointer move or key | `sleeping` / `waking` | 10 / 29 |
| a click on the face / the tail, four quick clicks, a pull | `poke-left` / `poke-right`, `tickle`, `drag` | 0 |

## Implementation notes

- Every rule is scoped under `body[data-dsh-deepcraft]`.
- Dark tokens are the base; light overrides use `:not([data-ds-dark-theme])`.
- A surface's stylesheet sits beside its feature under `packages/client/src/features/<feature>/`;
  the look no single feature owns is in `packages/client/src/theme/`, and the parts several
  features share (the popover card and rows, the sliding highlight) are in
  `packages/client/src/shared/`. The host selector discipline and the style checks the build
  runs are in `docs/adr/` (D3, D9, D80).

