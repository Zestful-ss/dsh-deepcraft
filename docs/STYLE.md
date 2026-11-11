# Style Guide · 设计令牌

`dsh-deepcraft` paints colours and type onto the host's own interface (D81). A
palette decides colours alone, the typeface decides families alone, and every
host control keeps the geometry, spacing, motion and behaviour the host gives
it. The brand identity — the default whale and wordmark, or the reader's own
name, mark and accent — stays the same under every palette (D80).

## Palette

Three palettes of the skin's own, plus the host's colours left in place:

**Ocean blue (the default).** A low-saturation periwinkle `#5368C9` for fills,
the lighter `#5F73D9` for the selected plate, a deeper step for text links on
the light canvas and a lighter one on the dark. The neutrals are a warm-free
grey ladder: a near-white canvas `#FCFCFB` under a light-grey sidebar in light,
and a charcoal canvas `#202427` under a blue-black sidebar in dark.

**Warm ember.** The warm counterpart: ivory light `#FCFCFB` and warm black
`#141413`, an ember `#D97757` for every action with `#C6613F` as the light
hover, warm-compatible slate prose links and a warm neutral surface ladder.

**Forest green.** A cool green `#397657` on the same warm-neutral ground as
ember, with its own link step and surface ladder.

**Follow the host** leaves the host's `--dsw-*` tokens as whoever painted them
wrote them — the host itself or another theme plugin.

The palette overrides the host's own token names, so a host control repaints
without the skin touching its rules. The table below is generated from
`packages/client/src/theme/tokens.json` by `npm run build`; edit the JSON, not
the table. Each palette states its own light and dark values, so no cell falls
back to another palette's; `—` is a token that palette leaves unset.

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
| `--dsh-deepcraft-link` | `#3e5bd6` | `#8ea2f2` | `#3d5f86` | `#a9c2df` | `#286649` | `#86c5a2` | `var(--dsw-alias-link)` | markdown links |
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
| `--dsh-deepcraft-canvas` | `#fcfcfb` | `#202427` | `#fcfcfb` | `#141413` | `#fcfcfb` | `#141413` | `var(--dsw-alias-bg-base)` | the page canvas |
| `--dsh-deepcraft-raised` | `#fcfcfb` | `#2b3038` | `var(--dsw-alias-bg-overlay)` | `#1e1e1d` | `var(--dsw-alias-bg-overlay)` | `#1e1e1d` | `var(--dsw-alias-bg-overlay)` | popovers and menus raised above the dark canvas |
| `--dsh-deepcraft-card` | `#fcfcfb` | `#2b3038` | `#fcfcfb` | `#1e1e1d` | `#fcfcfb` | `#1e1e1d` | `var(--dsw-alias-bg-overlay)` | cards on the canvas: the subagent model card |
| `--dsh-deepcraft-ink-strong` | `#202124` | `#eef0f3` | `var(--dsw-alias-label-primary)` | `#f5f4ef` | `var(--dsw-alias-label-primary)` | `#f5f4ef` | `var(--dsw-alias-label-primary)` | active row ink |
| `--dsh-deepcraft-session-ink` | `#61646b` | `#adb2bb` | `var(--dsw-alias-label-secondary)` | `#8c8983` | `var(--dsw-alias-label-secondary)` | `#8c8983` | `var(--dsw-alias-label-secondary)` | session title at rest |
| `--dsh-deepcraft-logo-ink` | `#202124` | `#eef0f3` | `#141413` | `#faf9f5` | `#141413` | `#faf9f5` | `var(--dsw-alias-label-primary)` | sidebar brand art: the whale and the wordmark |
| `--dsw-specific-menu` | `#fcfcfb` | `#2b3038` | `#ffffff` | `var(--dsh-deepcraft-raised)` | `#ffffff` | `var(--dsh-deepcraft-raised)` | host's own |  |
| `--dsw-specific-bubble` | `#e3e8fc` | `#303c55` | `#f0f0ef` | `rgba(255, 255, 255, 0.06)` | `#e6f1e8` | `#293e33` | host's own | user message bubble |
| `--dsh-deepcraft-chip` | `#eef0fa` | `#333a4a` | `#f6f6f4` | `var(--dsw-specific-selector)` | `#eef4ef` | `#263a2e` | `var(--dsw-specific-selector)` | segmented control and switch at rest |
| `--dsw-alias-label-primary-foreground` | `#fcfcfb` | `#fcfcfb` | `#141413` | `#141413` | `#141413` | `#141413` | host's own | the ink on a filled primary button: light on the accent in both palettes |
<!-- /generated:tokens -->

## Palettes and typefaces · 配色与字体归属

The Colours row chooses one of the skin's own palettes — **Ocean blue** (the
default), **Warm ember** or **Forest green** — or **Follow the host**; the
Typefaces row chooses the skin's faces or the host's. Every rule that writes a
host token carries a palette gate in its selector, and `--dsw-font-*` carries
the typeface gate; the build refuses an ungated one.

Under "follow the host" those rules drop out: the host's own tokens stand, or
another theme plugin's, such as a wallpaper plugin that clears the canvas and
turns the overlays to glass (D80). The skin's own surfaces read its private
tokens, which alias host tokens under the host palette.

Under the host typeface the skin's own faces fall back to the host's:
`--dsh-deepcraft-font-serif`, `-prose` and `-brand` to `--dsw-font-family` (the
host carries no serif), `--dsh-deepcraft-font-code` to `--ds-font-family-code`.
The stored value for the skin's faces keeps its earlier name `claude`; the row
reads it as **Theme**.

A custom accent colour sits over the skin's palettes and rebuilds the accent,
the low-alpha beds and the prose link from the one colour; under the host's
palette the row is disabled and the stored colour kept.

## Typography

Only families are stated (D81): every host element keeps the size, weight,
line height and spacing its own rules give it.

- **Serif prose** — Markdown body and headings (`--dsh-deepcraft-font-prose`).
- **Sans UI** — chrome and body (`--dsw-font-family`).
- **Mono** — code and technical labels (`--dsh-deepcraft-font-code`).

A family declaration lands after the host's own `font:` shorthands and
overrides the family they name alone. The `@font-face` registrations serve the
bundled faces and the user's own copies from `$DSH_HOME/dsh-deepcraft/fonts/`;
a missing file falls through the stack.

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

## The composer crab · 输入卡片上的螃蟹

The pixel crab is one of the mascots the Mascot row offers. It stands where
Deepy does — the composer card's top edge on the home page, the input area or
the panel that replaces it in a conversation (unless Where it appears keeps it
to the home page) — and follows the same states with the same keys. It is drawn
on a 52×36 grid of cells at 2px a cell, crisp (`pixelated`, 104×72px): feet on
the bottom row, on the edge of what it stands on; the right claw four cells in
from the grid's right edge, so it stands 8px inside the card's right edge. The
resting crab — shell 16×12 cells, claws 4×4, eyes 2×2, four legs 2×4 — is
48×32px (columns 24–47, rows 20–35) and only it takes the pointer. The shell is
the clay accent `#d97757` in both themes, the side-on back `#b9603f`, the eyes
`#141413`; the props are an ink mask filled with the tertiary label ink. Every
frame lasts 80ms. With the animation choice resolved to "reduced" each state
holds its still frame; a click or a pull still plays its reaction.

| State | Animation | Still frame |
|---|---|---|
| idle, every 20–40 s a look around, a claw wave or the whole laptop routine | `idle`, `idle-look`, `idle-wave`, `idle-laptop` | 0 |
| the model reasons or has not answered: eyes up to a thought bubble | `thinking` | 18 |
| the model writes or tools run: 1 / 2 / 3+ sessions at work | `typing` / `music` / `building` | 0 / 0 / 0 |
| subagents running: 1 / 2+ | `music` / `conducting` | 0 / 0 |
| a compaction runs: squashed | `compacting` | 3 |
| an approval, a question or a plan review waits: an exclamation mark | `notification` | 0 |
| a tool call or a turn failed (4.8 s): crossed eyes, a shake | `error` | 4 |
| a turn or a compaction finished (5.2 s): hops, claws up | `happy` | 3 |
| a quiet minute / the next pointer move or key | `sleeping` / `waking` | 0 / 11 |
| a click on the left / right half, four quick clicks, a pull | `poke-left` / `poke-right`, `tickle`, `drag` | 0 |

## Deepy · 小鲸鱼

Picked in the Mascot row, the mascot is Deepy, the pixel whale: a 52×52 grid of
logical pixels drawn at 2px a pixel (a 104px square), the whale's bottom — row
50 — on the top edge of what it stands on. The art is stepped pixel art on an
integer grid, drawn with `image-rendering: pixelated` so downscales keep crisp
pixel edges. The body is pale blue `#CED9FF` with a deep-blue `#3F5297` outline,
a white-tinted belly `#EEF2FF`, shade and pectoral fin `#9EB2EB`, and a dark eye
`#243460`. Its box sits 8px in from the right end of the card it stands over.
Every frame lasts 50ms. Only the resting body (columns 10–42, rows 32–50, hit
box 64×36px) takes the pointer. With the animation choice resolved to "reduced"
each state holds its still frame; a click or a pull still plays its reaction.

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
| a quiet minute / the next pointer move or key | `sleeping` / `waking` | 10 / 29 |
| a click on the face / the tail, four quick clicks, a pull | `poke-left` / `poke-right`, `tickle`, `drag` | 0 |

## Implementation notes

- Every rule is scoped under `body[data-dsh-deepcraft]`.
- Dark tokens are the base; light overrides use `:not([data-ds-dark-theme])`.
- A surface's stylesheet sits beside its feature under `packages/client/src/features/`;
  the look no single feature owns is in `packages/client/src/theme/`, and the
  parts several features share are in `packages/client/src/shared/`. The host
  selector discipline and the style checks the build runs are in `docs/adr/`
  (D3, D9, D81).
