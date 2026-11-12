/**
 * The host contract as one table (D3): the literals in packages/contracts/src/dom.ts,
 * each with what the skin reads it for and how the contract test checks it on
 * a live host (D66).
 *
 * The table is build and test data rather than runtime data: the browser bundle
 * carries the literals alone, so the notes cost the page nothing. The build
 * holds the two lists together — every exported literal of the DOM contract has
 * to appear here, and every id has to be named by a feature manifest (D72) or by
 * the plugin's own shell — so a selector cannot enter the skin without a note
 * and an owner, and a host upgrade can be audited from this list alone.
 *
 * The host build these entries were checked on is the one the service shapes
 * name (packages/contracts/src/services.ts, 0.2.1-alpha.1), and the lane's
 * `contract` scenario walks every `probe` below against a live host (D3, D66).
 */
import { ACCOUNT_TRIGGER_SELECTOR, DS_BOT_ACCOUNT_MENU_SELECTOR, DS_BOT_SET_ROW_SELECTOR, DS_BOT_SETTINGS_LAYER_SELECTOR, DS_BOT_SOFT_BUTTON_SELECTOR, CHAIN_OVERLAY_FALLBACK_ATTRIBUTE, COMPOSER_CARD_SELECTOR, COMPOSER_INPUT_SELECTOR, COMPOSER_RIGHT_SLOT_SELECTOR, COMPOSER_SELECTOR, COMPOSER_STACK_SELECTOR, CONVERSATION_HEADER_SLOT_SELECTOR, CONVERSATION_SCROLL_SELECTOR, CONVERSATION_SESSION_ATTRIBUTE, CONVERSATION_SESSION_SELECTOR, DARK_THEME_ATTRIBUTE, DS_BOT_ACCOUNT_SELECTOR, DS_BOT_FOOT_SELECTOR, DS_BOT_SURFACE_ATTRIBUTE, FOOT_AREA_SELECTOR, MENU_ROLE_SELECTOR, MODEL_SLOT_SELECTOR, PHASE_ATTRIBUTE, RIGHTBAR_COLUMN_SELECTOR, ROOT_SLOT_SELECTOR, SETTINGS_BUTTON_SELECTOR, SIDEBAR_ROOT_SELECTOR, SIDEBAR_SLOT_SELECTOR, SKIN_CENTER_ATTRIBUTE, UNTAGGED_SHEET_SELECTOR, WORKSPACE_LIST_AREA_SELECTOR, WORKSPACE_SECTION_LABEL_SELECTOR, WORKSPACE_TREE_ROW_SELECTOR } from './dom'

/**
 * The page state an entry is checked in (D66): the empty page, the moment a
 * submission goes through, an answer streaming in, a settled conversation of two
 * turns, the host's own account menu open, or the host's dark flip. `any` holds
 * everywhere the page is served.
 */
type HostDomProbeState = 'any' | 'hero' | 'sending' | 'streaming' | 'conversation' | 'menu' | 'dark'

/**
 * How the literal is checked:
 *
 * - `selector` — it matches at least `min` elements (default 1).
 * - `attribute` — some element carries it.
 * - `property` — the document element resolves it as a custom property.
 * - `global` — the dotted path resolves on the page.
 * - `value` — the string appears as the value of some attribute.
 * - `none` — no page form: a number, a value only another platform writes, or a
 *   literal of a plugin this instance does not install. The behaviour scenarios
 *   and the unit tests hold these; the contract test reports them by id so a
 *   host upgrade still walks the whole list.
 */
type HostDomProbeKind = 'selector' | 'attribute' | 'property' | 'global' | 'value' | 'none'

/** How the contract test checks one entry against a live host. */
interface HostDomProbe {
  state: HostDomProbeState
  kind: HostDomProbeKind
  /** At least how many matches a selector needs; defaults to 1. */
  min?: number
  /** The entry a relative selector is resolved against. */
  within?: string
}

/**
 * One entry of the table: the literal the host writes, and what the skin reads
 * it for.
 */
interface HostDomEntry {
  /** Stable id; a feature manifest names it (D72) and the contract test reports by it. */
  id: string
  /** The literal, as the host writes it. */
  value: string
  /** How the contract test checks it (D66). */
  probe: HostDomProbe
  /** What the host means by it, and what reads it. */
  use: string
  /**
   * Set on an entry no feature reads: the plugin's own shell does, through the
   * core and shared modules (the boot graph, stylesheet parking, the page-owner
   * verdict, the marking pass). Every other entry is named by a feature manifest.
   */
  owner?: 'core'
}

export const HOST_DOM: HostDomEntry[] = [
  { id: 'composer.seat', value: COMPOSER_SELECTOR, probe: { state: 'hero', kind: 'selector' }, use: 'the composer seat: a pointer or key inside it is the reader typing' },
  { id: 'composer.input', value: COMPOSER_INPUT_SELECTOR, probe: { state: 'hero', kind: 'selector' }, use: 'the editable draft inside the composer card, read by the scheduler\u2019s content-only verdict', owner: 'core' },
  { id: 'composer.card', value: COMPOSER_CARD_SELECTOR, probe: { state: 'hero', kind: 'selector' }, use: 'the composer card: the mascot stands on the hero\u2019s, and the scheduler reads it for pointer and resize routes' },
  { id: 'composer.model-slot', value: MODEL_SLOT_SELECTOR, probe: { state: 'hero', kind: 'selector' }, use: 'the host\u2019s model selection slot, whose button the subagent entry draws its capsule beside' },
  { id: 'composer.right-slot', value: COMPOSER_RIGHT_SLOT_SELECTOR, probe: { state: 'conversation', kind: 'selector' }, use: 'the composer\u2019s right-hand list seat, into which the subagent model entry registers beside the model slot; the two share one capsule when nothing else stands in it' },
  { id: 'composer.stack', value: COMPOSER_STACK_SELECTOR, probe: { state: 'hero', kind: 'selector' }, use: 'the card with the todo, goal and queue cards stacked above it, which the mascot stands on' },
  { id: 'composer.fallback-panel', value: CHAIN_OVERLAY_FALLBACK_ATTRIBUTE, probe: { state: 'any', kind: 'none' }, use: 'the host\u2019s panel that replaces the composer card, which the mascot stands on' },
  { id: 'chat.scroller', value: CONVERSATION_SCROLL_SELECTOR, probe: { state: 'conversation', kind: 'selector' }, use: 'the session scroller the scheduler and the wallpaper layering read the column by', owner: 'core' },
  { id: 'conversation.session', value: CONVERSATION_SESSION_SELECTOR, probe: { state: 'conversation', kind: 'selector' }, use: 'the shown conversation column, where the mascot reads the session it sits in' },
  { id: 'conversation.session-attribute', value: CONVERSATION_SESSION_ATTRIBUTE, probe: { state: 'conversation', kind: 'attribute' }, use: 'the session id the column carries' },
  { id: 'shell.phase', value: PHASE_ATTRIBUTE, probe: { state: 'any', kind: 'attribute' }, use: 'the page\u2019s phase: hero before a session is chosen, active once one is shown; the mascot picks the hero or the composer seat by it' },
  { id: 'workspace.section-label', value: WORKSPACE_SECTION_LABEL_SELECTOR, probe: { state: 'any', kind: 'selector', within: 'shell.sidebar-slot' }, use: 'the workspace section\u2019s heading: the reader takes the one whose section keeps a list area, and the pinned aggregate mounts against it' },
  { id: 'workspace.list-area', value: WORKSPACE_LIST_AREA_SELECTOR, probe: { state: 'any', kind: 'selector', within: 'shell.sidebar-slot' }, use: 'the workspace section\u2019s list area, holding the session tree; the pinned aggregate stands before it' },
  { id: 'workspace.tree-row', value: WORKSPACE_TREE_ROW_SELECTOR, probe: { state: 'any', kind: 'selector', within: 'workspace.list-area' }, use: 'a workspace tree row, by the host\u2019s own row key or either row part: the list area is recognised by holding one' },
  { id: 'shell.foot-area', value: FOOT_AREA_SELECTOR, probe: { state: 'any', kind: 'selector' }, use: 'the sidebar footer block holding the host\u2019s settings entry and account trigger; the settings page\u2019s Ctrl+, drive presses them there' },
  { id: 'shell.menu', value: MENU_ROLE_SELECTOR, probe: { state: 'menu', kind: 'selector' }, use: 'an open host menu, read as the account menu when the account trigger reports it open' },
  { id: 'shell.account-trigger', value: ACCOUNT_TRIGGER_SELECTOR, probe: { state: 'any', kind: 'none' }, use: 'the host\u2019s own account trigger in the footer, marked with the sign-in state; on a host without a settings button its menu carries the settings row the page opens' },
  { id: 'shell.settings-button', value: SETTINGS_BUTTON_SELECTOR, probe: { state: 'any', kind: 'selector' }, use: 'the popup-opening control in the footer\u2019s settings area: the host\u2019s settings dialog trigger where that launcher fills the slot, the account trigger on the desktop, which the caller turns away' },
  { id: 'shell.root-slot', value: ROOT_SLOT_SELECTOR, probe: { state: 'any', kind: 'selector' }, use: 'the root slot: the shell frame is its own element child, and the three columns are what the part walk reads inside it (D3)', owner: 'core' },
  { id: 'shell.sidebar-slot', value: SIDEBAR_SLOT_SELECTOR, probe: { state: 'any', kind: 'selector' }, use: 'the sidebar\u2019s slot anchor: the region the part walk reads the sidebar\u2019s own class names in (D3)', owner: 'core' },
  { id: 'shell.header-slot', value: CONVERSATION_HEADER_SLOT_SELECTOR, probe: { state: 'any', kind: 'selector' }, use: 'the conversation header\u2019s slot anchor: the region the part walk reads the header\u2019s class names in (D3)', owner: 'core' },
  { id: 'shell.rightbar-column', value: RIGHTBAR_COLUMN_SELECTOR, probe: { state: 'any', kind: 'selector' }, use: 'the right sidebar\u2019s own column, marked by the host; the docked panels the skin draws as cards are read here (D3)', owner: 'core' },
  { id: 'shell.sidebar-root', value: SIDEBAR_ROOT_SELECTOR, probe: { state: 'any', kind: 'selector' }, use: 'the sidebar column\u2019s own box, where the pinned aggregate is scoped' },
  { id: 'shell.dark-theme', value: DARK_THEME_ATTRIBUTE, probe: { state: 'dark', kind: 'attribute' }, use: 'the host flipped its own light/dark theme, which the settings page\u2019s transition suppression follows' },
  { id: 'shell.skin-center', value: SKIN_CENTER_ATTRIBUTE, probe: { state: 'any', kind: 'none' }, use: 'another skin owns the page; this theme yields (D81). The host\u2019s skin center writes it, and the web profile mounts none', owner: 'core' },
  { id: 'boot.graph', value: '__DSH_BOOT__', probe: { state: 'any', kind: 'global' }, use: 'the boot graph, naming every client entry before any of them runs; the page-owner verdict reads ds-bot\u2019s entry there', owner: 'core' },
  { id: 'ds-bot.entry', value: 'ds-bot', probe: { state: 'any', kind: 'none' }, use: 'ds-bot\u2019s entry id inside the boot graph: the page has its Bot surface to give way to (D81); this instance does not install it', owner: 'core' },
  { id: 'ds-bot.surface', value: DS_BOT_SURFACE_ATTRIBUTE, probe: { state: 'any', kind: 'none' }, use: 'ds-bot\u2019s Bot surface is painted, so this theme gives the page way (D81); this instance does not install it', owner: 'core' },
  { id: 'ds-bot.saved-mode', value: 'ds-bot:surface', probe: { state: 'any', kind: 'none' }, use: 'the local storage key holding ds-bot\u2019s mode, read before its browser half runs so the first frame already belongs to the right owner (D81), and written by the return pill to hand the page back (D82); this instance does not install it', owner: 'core' },
  { id: 'ds-bot.global', value: 'dshBot', probe: { state: 'any', kind: 'none' }, use: 'the registry ds-bot puts on `window` while its browser half runs; from then on its own attribute answers the verdict, before then its saved mode does (D81)', owner: 'core' },
  { id: 'ds-bot.foot', value: DS_BOT_FOOT_SELECTOR, probe: { state: 'any', kind: 'none' }, use: 'ds-bot\u2019s own Bot sidebar footer row, where the return pill stands before the account button (D82); this instance does not install it' },
  { id: 'ds-bot.account', value: DS_BOT_ACCOUNT_SELECTOR, probe: { state: 'any', kind: 'none' }, use: 'ds-bot\u2019s account button: the row marker when a ds-bot version does not paint the footer class (D82); this instance does not install it' },
  { id: 'ds-bot.account-menu', value: DS_BOT_ACCOUNT_MENU_SELECTOR, probe: { state: 'any', kind: 'none' }, use: 'ds-bot\u2019s account menu, whose classic-Agent item is the return pill\u2019s short path (D82); this instance does not install it' },
  { id: 'ds-bot.settings-layer', value: DS_BOT_SETTINGS_LAYER_SELECTOR, probe: { state: 'any', kind: 'none' }, use: 'ds-bot\u2019s settings layer, where the return pill finds the mode switch on versions without the menu item (D82); this instance does not install it' },
  { id: 'ds-bot.set-row', value: DS_BOT_SET_ROW_SELECTOR, probe: { state: 'any', kind: 'none' }, use: 'a ds-bot settings row; the classic-Agent row holds the switch the return pill presses (D82); this instance does not install it' },
  { id: 'ds-bot.soft-button', value: DS_BOT_SOFT_BUTTON_SELECTOR, probe: { state: 'any', kind: 'none' }, use: 'ds-bot\u2019s small action button, including the mode switch inside its row (D82); this instance does not install it' },
  { id: 'head.untagged-sheets', value: UNTAGGED_SHEET_SELECTOR, probe: { state: 'any', kind: 'none' }, use: 'every untagged stylesheet, which the host\u2019s claim sweep would otherwise take; read in the boot sweep, before the host tags its sheets, and the smoke\u2019s sibling cases hold it', owner: 'core' },
]
