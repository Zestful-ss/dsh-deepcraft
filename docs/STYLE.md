# Style Guide · 设计令牌

`dsh-deepcraft` paints colours and type onto the host's own interface (D81). A
palette decides colours alone, the three font roles decide families alone, and every
host control keeps the geometry, spacing, motion and behaviour the host gives
it. The brand identity — the default whale and wordmark, or the reader's own
name, mark and accent — stays the same under every palette (D80).

## Palette

One palette of the skin's own, plus the host's colours left in place:

**Cindy (the default).** A graphite `#3C3F43` for fills, a deeper `#2E3237`
for the hover and `#EEEEEE` as the dark accent, blue `#1D4ED8` for prose
links on the light canvas and `#93C5FD` on the dark. The neutrals are a warm
ladder: an ivory canvas `#F2F2ED` under a light-warm sidebar in light, and
the same `#181818` under canvas and sidebar in dark.

**Follow the host** leaves the host's `--dsw-*` tokens as whoever painted them
wrote them — the host itself or another theme plugin.

The palette overrides the host's own token names, so a host control repaints
without the skin touching its rules. The table below is generated from
`packages/client/src/theme/tokens.json` by `npm run build`; edit the JSON, not
the table. Each palette states its own light and dark values, so no cell falls
back to another palette's; `—` is a token that palette leaves unset.

<!-- generated:tokens (packages/client/src/theme/tokens.json) -->
| Token | Cindy light | Cindy dark | Host alias | Use |
|---|---|---|---|---|
| `--dsw-alias-bg-base` | `#f2f2ed` | `#181818` | host's own |  |
| `--dsw-alias-bg-layer-1` | `#fdfdf8` | `#1f1f1f` | host's own |  |
| `--dsw-alias-bg-layer-2` | `#fafaf5` | `#1d1d1d` | host's own |  |
| `--dsw-alias-bg-layer-3` | `#eeeee9` | `#1d1d1d` | host's own |  |
| `--dsw-alias-bg-overlay` | `#fdfdf8` | `#1f1f1f` | host's own |  |
| `--dsw-alias-border-l1` | `rgba(0, 0, 0, 0.08)` | `rgba(255, 255, 255, 0.10)` | host's own | the standard edge: card and panel outlines, dividers, field outlines |
| `--dsw-alias-border-l2` | `rgba(0, 0, 0, 0.10)` | `rgba(255, 255, 255, 0.13)` | host's own |  |
| `--dsw-alias-border-l3` | `rgba(0, 0, 0, 0.14)` | `rgba(255, 255, 255, 0.20)` | host's own |  |
| `--dsw-alias-brand-primary` | `#3c3f43` | `#eeeeee` | host's own | the single accent: checks, focus rings, selected marks |
| `--dsw-alias-brand-text` | `#fcfcfc` | `#151515` | host's own |  |
| `--dsw-alias-button-primary-fill` | `#3c3f43` | `#eeeeee` | host's own |  |
| `--dsw-alias-button-primary-hover` | `#2e3237` | `#e2e2e2` | host's own |  |
| `--dsw-alias-button-elevated-fill` | `#fdfdf8` | `#1f1f1f` | host's own |  |
| `--dsw-alias-button-floating-fill` | `#fdfdf8` | `#1f1f1f` | host's own |  |
| `--dsw-alias-button-floating-hover` | `#eeeee9` | `#1d1d1d` | host's own |  |
| `--dsw-alias-button-info-fill` | `#417cdd` | `#417cdd` | host's own |  |
| `--dsw-alias-button-info-hover` | `#417cdd` | `#417cdd` | host's own |  |
| `--dsw-alias-interactive-bg-active` | `rgba(0, 0, 0, 0.08)` | `rgba(255, 255, 255, 0.10)` | host's own |  |
| `--dsh-deepcraft-hover-bg` | `rgba(0, 0, 0, 0.05)` | `rgba(255, 255, 255, 0.06)` | `var(--dsw-alias-interactive-bg-hover)` | hover wash |
| `--dsh-deepcraft-link` | `#1d4ed8` | `#93c5fd` | `var(--dsw-alias-link)` | markdown links |
| `--dsw-alias-markdown-code-block` | `#fafaf5` | `#191919` | host's own |  |
| `--dsw-alias-markdown-code-block-banner` | `#fafaf5` | `#1d1d1d` | host's own |  |
| `--dsw-alias-interactive-bg-hover` | `var(--dsh-deepcraft-hover-bg)` | `var(--dsh-deepcraft-hover-bg)` | host's own |  |
| `--dsw-alias-interactive-bg-hover-solid` | `#eeeee9` | `#1d1d1d` | host's own | the host's solid hover chip |
| `--dsw-alias-label-primary` | `rgba(0, 0, 0, 0.88)` | `rgba(255, 255, 255, 0.82)` | host's own |  |
| `--dsw-alias-label-primary-bluish` | `rgba(0, 0, 0, 0.88)` | `rgba(255, 255, 255, 0.82)` | host's own |  |
| `--dsw-alias-label-secondary` | `rgba(0, 0, 0, 0.56)` | `rgba(255, 255, 255, 0.55)` | host's own |  |
| `--dsw-alias-label-tertiary` | `rgba(0, 0, 0, 0.44)` | `rgba(255, 255, 255, 0.40)` | host's own |  |
| `--dsw-alias-label-caption` | `rgba(0, 0, 0, 0.32)` | `rgba(255, 255, 255, 0.30)` | host's own |  |
| `--dsw-alias-label-shimmer` | `color-mix(in srgb, rgba(0, 0, 0, 0.88) 30%, transparent)` | `color-mix(in srgb, rgba(255, 255, 255, 0.82) 45%, transparent)` | host's own | the highlight band's tint over running words: the host's own rows and the skin's band (shared/sweep-band.ts) alike |
| `--dsw-alias-label-deep-diving-shimmer` | `color-mix(in srgb, rgba(0, 0, 0, 0.88) 30%, transparent)` | `color-mix(in srgb, rgba(255, 255, 255, 0.82) 45%, transparent)` | host's own | the band's tint inside the running row, which the host points --dsw-alias-label-shimmer at; the warm palettes wear the same band as everywhere else |
| `--dsw-alias-state-business-primary` | `#417cdd` | `#417cdd` | host's own |  |
| `--dsw-alias-state-business-tertiary` | `#eeeee9` | `#1d1d1d` | host's own |  |
| `--dsw-alias-link` | `#1d4ed8` | `#93c5fd` | host's own | text link at rest |
| `--dsw-shadow-lv2` | `none` | `none` | host's own |  |
| `--dsw-specific-input-major` | `#fdfdf8` | `#1f1f1f` | host's own |  |
| `--dsw-specific-selector` | `#fdfdf8` | `#353535` | host's own |  |
| `--dsw-specific-sidebar-fill` | `#eeeee9` | `#181818` | host's own |  |
| `--dsw-alias-brand-primary-new-colorprimary-new-color` | `#3c3f43` | `#eeeeee` | host's own |  |
| `--dsh-deepcraft-canvas` | `#f2f2ed` | `#181818` | `var(--dsw-alias-bg-base)` | the page canvas |
| `--dsh-deepcraft-raised` | `#fdfdf8` | `#1f1f1f` | `var(--dsw-alias-bg-overlay)` | popovers and menus raised above the dark canvas |
| `--dsh-deepcraft-card` | `#fdfdf8` | `#1f1f1f` | `var(--dsw-alias-bg-overlay)` | cards on the canvas: the subagent model card |
| `--dsh-deepcraft-ink-strong` | `rgba(0, 0, 0, 0.95)` | `rgba(255, 255, 255, 1.00)` | `var(--dsw-alias-label-primary)` | active row ink |
| `--dsh-deepcraft-session-ink` | `rgba(0, 0, 0, 0.56)` | `rgba(255, 255, 255, 0.55)` | `var(--dsw-alias-label-secondary)` | session title at rest |
| `--dsh-deepcraft-logo-ink` | `rgba(0, 0, 0, 0.95)` | `rgba(255, 255, 255, 1.00)` | `var(--dsw-alias-label-primary)` | sidebar brand art: the whale and the wordmark |
| `--dsw-specific-menu` | `rgba(251, 251, 246, 0.90)` | `rgba(21, 21, 21, 0.80)` | host's own |  |
| `--dsw-specific-bubble` | `#fdfdf8` | `#1f1f1f` | host's own | user message bubble |
| `--dsh-deepcraft-chip` | `rgba(0, 0, 0, 0.05)` | `rgba(255, 255, 255, 0.06)` | `var(--dsw-specific-selector)` | segmented control and switch at rest |
| `--dsw-alias-label-primary-foreground` | `#fcfcfc` | `#151515` | host's own | the ink on a filled primary button: light on the accent in both palettes |
<!-- /generated:tokens -->

## Palettes, material and font roles · 配色、材质与字体归属

The Colours row chooses the skin's own palette — **Cindy** (the default) — or
**Follow the host**. Every
rule that writes a host colour token carries a palette gate in its selector;
under "follow the host" those rules drop out and the host's own tokens stand,
or another theme plugin's, such as a wallpaper plugin that clears the canvas
and turns the overlays to glass (D80).

The **material** layer is orthogonal to the palette (D84): five own rows choose
the corner scale (4 / 8 / 12px or the host's), flat shadows (levels off,
elevation drawn as a stroke) or the host's, the durations (150 / 200 / 250ms or
the host's), the sidebar's glass and the ambient light. The shipped defaults are
the reference theme's, so a fresh install wears 12px corners, flat shadows and
the reference timing; each aspect falls back to the host's value on its own.
`packages/client/src/theme/material.css` holds the rules, gated on the five
`data-dsh-deepcraft-material-*` attributes rather than on a palette — the build
accepts a host-token write under either gate. A palette's aliases (focus ring,
inline code, citation, diff, tooltip, toast, scrollbar, switch thumb) stay in
the palette tables: the material layer borrows shape, never a palette's colour.

Three independent rows choose the **interface**, **prose** and **code** font.
Each role has **Follow the host** (the interface and code roles; prose instead
follows the interface), a curated set of bundled families, and **Custom**,
where the reader names installed families in a comma-separated list. The font
rules are generated from `packages/client/src/theme/fonts.ts`; a custom list is
sanitised in `packages/client/src/shared/fonts.ts` and always ends in the
role's CJK-aware fallback.

A custom accent colour sits over the skin's palettes and rebuilds the accent,
the low-alpha beds and the prose link from the one colour; under the host's
palette the row is disabled and the stored colour kept.

## Typography

Only families are stated (D81): every host element keeps the size, weight,
line height and spacing its own rules give it.

- **Interface** — chrome and body (`--dsw-font-family`). `Follow the host`
  leaves the host's own token untouched.
- **Prose** — Markdown body and headings (`--dsh-deepcraft-font-prose`); it
  follows the interface by default.
- **Code** — code blocks, inline code and technical labels
  (`--ds-font-family-code`). `Follow the host` leaves the host's own token
  untouched.
- **Brand** — the lockup follows the prose face (`--dsh-deepcraft-font-brand`).

A family declaration lands after the host's own `font:` shorthands and
overrides the family they name alone. The `@font-face` registrations serve the
bundled faces and the user's own copies from `$DSH_HOME/dsh-deepcraft/fonts/`;
a missing file falls through the stack. The bundled Latin faces are Inter,
Geist Sans, Fixel Text, Atkinson Hyperlegible, Noto Serif, Source Serif 4,
Literata, JetBrains Mono, Geist Mono, Fira Code and Commit Mono, all under the
SIL OFL; the Anthropic faces stay user-supplied and are not shipped.

## Right sidebar · 右侧栏

**The start page.** The host centers its stack of entries in a box that never
grows, so a list taller than the pane is clipped at both ends with no way to
reach it. On the card the stack scrolls: `margin-top: auto` on the first entry
and `margin-bottom: auto` on the last. The two auto margins absorb the free
space exactly as `center` did while the list fits, and fall to zero once it does
not. Nothing else of the column's look is the skin's (D81).

## Popovers · 多选一弹层

Every single-choice popover the skin still draws — the subagent model card and
the pinned-session card — starts from one recipe, owned by
`packages/client/src/shared/popover.ts` and `popover.css`.

Two rules hold across all of them. A pointer opens a card only after a **100 ms
dwell** — long enough that crossing a 28px trigger on the way somewhere else
unfolds nothing — and the card closes 100 ms after the pointer leaves. And
**only one card is on screen at a time**: each popover registers its close path
with `registerPopover(name, close)` and calls `closeOtherPopovers(name)` on the
way open.

The subagent model entry uses a 28px concentric-circles icon button beside the
model control. An accent dot marks a saved selection; the button's tooltip
names it and the selection card wraps model and provider names onto as many
lines as needed.

**Card**

| Property | Value |
|---|---|
| background | `var(--dsw-alias-bg-overlay)` |
| border | `1px solid var(--dsw-alias-border-l1)` |
| radius | 12px |
| shadow | `0 8px 24px rgba(20,20,19,.12), 0 2px 6px rgba(20,20,19,.08)`; in dark the token table's deeper drop |
| padding | 6px |
| layout | flex column, `gap: 6px`; a list body stacks its rows 3px apart |
| z-index | `var(--dsh-deepcraft-layer-float)` |
| open | `opacity 0 → 1`, `translateY(4px) scale(.98) → none`, `.15s ease`, origin on the anchor's side |

**Row**

| Property | Value |
|---|---|
| min-height | 32px — a floor, not a cap: a two-line row grows |
| padding | `2px 7px` |
| radius | 6px |
| text | 13px / 20px, `var(--dsw-alias-label-primary)` |
| hover | `var(--dsh-deepcraft-hover-bg, rgba(0, 0, 0, .08))` |
| icon | 16px, `var(--dsw-alias-label-secondary)` |
| two-line row | name 13px / 16px at 500; description 11px / 14px in `label-tertiary` |
| current row | trailing `IconCheckOutline16` in `var(--dsw-alias-brand-primary)` — the accent is what marks the choice |
| disabled | `opacity: .4`, `cursor: not-allowed` |

**Heading, separator, footer**

- heading row: 11px / 16px at 600, `letter-spacing: .04em`, uppercase, `label-tertiary`, `padding: 6px 7px 2px`
- separator: `0.5px` `var(--dsw-alias-border-l2)`, `margin: 2px 4px`, drawn as a top border on a zero-height box
- pinned footer: `margin-top` / `padding-top` 4px, and the same `0.5px` line above it

## Motion

Every duration, curve, distance, blur and scale the skin uses is a token here,
and a stylesheet or a Web Animations call reads the token rather than writing
the value (D9). One value per role, so a faster feedback or a calmer swap is one
edit; the build refuses a time or a curve written anywhere else.

- Feedback: a control answering hover, press or focus.
- Surface and open: a menu, a popover, a settings page arriving.
- Exit: a dismissal, deliberately quicker than the entrance.
- The transitions this skin carries — a menu growing out of its trigger, a settings page sliding, a switch's knob bouncing — read these tokens where their own sheets live; `THIRD_PARTY_NOTICES.md` names each one.
  A feature that needs its own effect reads the tokens and keeps its own
  keyframes.

The table below is generated from `packages/client/src/theme/tokens.json` by
`npm run build`; edit the JSON, not the table.

<!-- generated:motion (packages/client/src/theme/tokens.json) -->
| Token | Value | Use |
|---|---|---|
| `--dsh-deepcraft-duration-feedback` | `120ms` | a control answering hover, press or focus: its colour, background, border, shadow, or a small turn or slide of its own parts |
| `--dsh-deepcraft-duration-exit` | `120ms` | a surface leaving on the reader’s dismissal: a menu or a dialog closing |
| `--dsh-deepcraft-duration-open` | `250ms` | a surface growing out of its anchor: a menu out of its trigger, a full-window dialog out of the centre, a settings page sliding in |
| `--dsh-deepcraft-duration-slide` | `240ms` | the segmented controls' sliding highlight, a sidebar icon's quarter turn, the wording box taking the width of the words arriving, and streamed content sliding up from the bottom edge |
| `--dsh-deepcraft-duration-island-float` | `1.7s` | the island mascot's idle loop and its wake-up float |
| `--dsh-deepcraft-duration-island-type` | `0.52s` | the island mascot's working-state cycle and the drag lift |
| `--dsh-deepcraft-duration-island-focus` | `1.15s` | the island mascot's waiting stare: the head tilt and the eyes narrowing |
| `--dsh-deepcraft-duration-island-hop` | `0.72s` | the island mascot's celebration: the hop and its sparkles |
| `--dsh-deepcraft-duration-island-shake` | `0.4s` | the island mascot's failed-state shake |
| `--dsh-deepcraft-duration-island-sleep` | `2.6s` | the island mascot's sleeping breath |
| `--dsh-deepcraft-duration-island-lean` | `0.32s` | the island mascot's poke lean |
| `--dsh-deepcraft-ease-island-hop` | `cubic-bezier(0.2, 0.9, 0.2, 1)` | the island mascot's hop curve, from the reference theme's island keyframes |
| `--dsh-deepcraft-ease-island-cycle` | `ease-in-out` | the island mascot's breathing cycles: float, type, focus, shake and sleep |
| `--dsh-deepcraft-ease-island-out` | `ease-out` | the island mascot's one-off releases: the sparkles and the poke lean |
| `--dsh-deepcraft-duration-fade` | `300ms` | a slow cross-fade: the theme flip, a placeholder handing its place to what it stood for |
| `--dsh-deepcraft-duration-bounce` | `350ms` | a switch's knob travelling across with its double bounce |
| `--dsh-deepcraft-duration-reduced` | `0.01ms` | every skin animation and transition under the Reduced animation choice (D40) |
| `--dsh-deepcraft-ease-standard` | `ease` | feedback and surfaces: the default curve |
| `--dsh-deepcraft-ease-glide` | `cubic-bezier(0.22, 0.61, 0.36, 1)` | travel along a track: the sliding highlight, a settings page’s slide |
| `--dsh-deepcraft-ease-spring` | `cubic-bezier(0.34, 1.45, 0.64, 1)` | a small overshoot as something lands: a switch’s knob bouncing past its end |
| `--dsh-deepcraft-ease-settle` | `cubic-bezier(0.22, 1, 0.36, 1)` | a surface or a page settling into place out of its anchor: menus and dialogs opening and closing, a settings page sliding |
| `--dsh-deepcraft-distance-travel` | `8px` | a settings page’s slide |
| `--dsh-deepcraft-blur-enter` | `3px` | the blur a settings page or a line of the home greeting passes through as it slides or rises in |
| `--dsh-deepcraft-scale-dropdown` | `0.97` | the scale a menu grows from out of its trigger |
| `--dsh-deepcraft-scale-dropdown-exit` | `0.99` | the scale a menu shrinks to while it fades on closing |
| `--dsh-deepcraft-timing-feedback` | `var(--dsh-deepcraft-duration-feedback) var(--dsh-deepcraft-ease-standard)` | shorthand: a control's state change, written after the property in a transition |
| `--dsh-deepcraft-duration-material-fast` | `150ms` | material layer: the host’s fast transition (D84) |
| `--dsh-deepcraft-duration-material-base` | `200ms` | material layer: the host’s base transition (D84) |
| `--dsh-deepcraft-duration-material-slow` | `250ms` | material layer: the host’s slow transition (D84) |
<!-- /generated:motion -->

## Layers

A z-index the skin writes is one of two kinds (D9). Inside one box, siblings
are ordered with a literal from -1 to 9: a fill painted under its own content,
a label over its sliding pill. Anything that has to clear what the host draws
around it — a floating card, a surface over the whole window — stands on a
layer token, and the build refuses any other number.

The table below is generated from `packages/client/src/theme/tokens.json` by
`npm run build`; edit the JSON, not the table.

<!-- generated:layers (packages/client/src/theme/tokens.json) -->
| Token | Value | Use |
|---|---|---|
| `--dsh-deepcraft-layer-float` | `99999` | a floating card or menu over everything the host draws: the popover cards |
<!-- /generated:layers -->

## The composer's Petdex pet

The chat pet is an installed Petdex package drawn frame for frame from its own
atlas: eight columns of the author's frame size, rows selected by the native
action. The window is 72 CSS pixels wide, its height following the cell's
proportions; the art is neither recoloured nor pixelated. It stands on the
composer card's top edge, inset from the card's own right edge by the anchor's
published clearance plus 8px. Only the image frame takes the pointer. With the
animation choice resolved to "reduced" each state holds its still frame; a
click or a pull still plays its reaction.

## Implementation notes

- Every rule is scoped under `body[data-dsh-deepcraft]`.
- Dark tokens are the base; light overrides use `:not([data-ds-dark-theme])`.
- A surface's stylesheet sits beside its feature under `packages/client/src/features/`;
  the look no single feature owns is in `packages/client/src/theme/`, and the
  parts several features share are in `packages/client/src/shared/`. The host
  selector discipline and the style checks the build runs are in `docs/adr/`
  (D3, D9, D81).
