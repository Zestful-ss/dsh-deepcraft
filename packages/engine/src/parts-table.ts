/**
 * What the tables are built from: the two attributes the marking pass writes.
 * They are the skin's, so they arrive with the install
 * (packages/engine/src/parts.ts, D73).
 */
export interface PartsTableVocabulary {
  /** The attribute a marked node carries: the part names it stands for, space-separated. */
  part: string
}

/**
 * The host class names the skin reads, as data (D3): host CSS-module local name
 * → the skin's own part name.
 *
 * The host hashes its class names (`_2H3hWW_root`, `_root_38jqx_3`), so a
 * stylesheet cannot match one whole, and a substring match takes whatever else
 * holds the fragment — `title` also names `titleRow` and `subtitle`, `row`
 * also names `grow` and `arrow`. core/parts.ts walks these tables and writes the
 * part names onto the element, so every rule matches one attribute whole (D81).
 *
 * This file is data only, so the build reads it directly (scripts/css.mjs, the
 * part gate) and holds every part a stylesheet reads to the table here. A host
 * rename is one line in this file.
 */
import { CONVERSATION_SCROLL_SELECTOR, RIGHTBAR_COLUMN_SELECTOR, ROOT_SLOT_SELECTOR, SIDEBAR_SLOT_SELECTOR } from '@dsh-deepcraft/contracts/dom'

/** Host CSS-module local name → the skin's part name. */
export type PartTable = Record<string, string>

/** The shell's three columns, read from the root slot down. */
export const FRAME_PARTS: PartTable = {
  sidebarCol: 'sidebar-column',
  centerCol: 'center-column',
  rightbarCol: 'rightbar-column',
}

/** The sidebar, from its slot anchor down. */
export const SIDEBAR_PARTS: PartTable = {
  brand: 'brand-button',
  brandIdentity: 'brand-identity',
  brandMark: 'brand-mark',
  brandName: 'brand-name',
  railMark: 'rail-mark',
  footArea: 'foot-area',
  footerActions: 'footer-actions',
  settingsArea: 'settings-area',
  sectionHeader: 'section-header',
  sectionLabel: 'section-label',
  treeBody: 'tree-body',
  groupSection: 'group-section',
  projectRow: 'project-row',
  sessionRow: 'session-row',
  title: 'row-title',
  projectText: 'row-project-text',
  time: 'row-time',
  list: 'list',
  listArea: 'list-area',
}

/** The composer seat's own parts, read inside the conversation column. */
export const CONVERSATION_PARTS: PartTable = {
  composerStack: 'composer-stack',
  fishHitbox: 'hero-mark',
}

/** The right sidebar's docked panels. */
export const RIGHTBAR_PARTS: PartTable = {
  guide: 'panel-guide',
  panel: 'panel',
}

/**
 * Names read on the whole page: the host's own text roles the skin's typography
 * reads wherever they stand, and the settings dialog's rail, which is an
 * overlay outside the conversation's box.
 */
export const PAGE_PARTS: PartTable = {
  markdown: 'markdown',
  sectionLabel: 'section-label',
  triggerLabel: 'trigger-label',
  selectLabel: 'text-select-label',
  monoLabel: 'text-mono-label',
  mono: 'text-mono',
  codeBlock: 'text-code',
  panel: 'panel',
  overlay: 'overlay',
  navIcon: 'nav-icon',
  navList: 'nav-list',
}

/** One region: the host subtree its parts are read in, and the parts themselves. */
export interface PartRegion {
  /** The host subtree the region's parts are read in; a host contract (D3). */
  within: string
  parts: PartTable
  /**
   * Parts read on the anchor's own element children alone — where the host puts
   * a slot's content.
   */
  rootParts?: PartTable
}

/** Every region, in the order the walk enters them. */
export function partRegions(): PartRegion[] {
  return [
    { within: 'body', parts: PAGE_PARTS },
    {
    within: ROOT_SLOT_SELECTOR,
    parts: FRAME_PARTS,
    rootParts: { frame: 'layout-frame' },
    },
    {
    within: SIDEBAR_SLOT_SELECTOR,
    parts: SIDEBAR_PARTS,
    rootParts: { root: 'sidebar-root' },
    },
    { within: CONVERSATION_SCROLL_SELECTOR, parts: CONVERSATION_PARTS },
    { within: RIGHTBAR_COLUMN_SELECTOR, parts: RIGHTBAR_PARTS },
  ]
}

/** Every part name the tables define, sorted: the whole vocabulary a sheet may read. */
export function partNames(): string[] {
  const names = new Set<string>()
  for (const region of partRegions()) {
    for (const part of Object.values(region.parts)) names.add(part)
    for (const part of Object.values(region.rootParts ?? {})) names.add(part)
  }
  return [...names].sort()
}

/**
 * The structural relations a stylesheet reads as a hold: a rule naming an
 * element because of what its subtree contains (`A:has(B)`) reads
 * `data-dsh-deepcraft-holds` instead, and core/parts.ts keeps that mark current
 * (D9). Each entry answers one question the walk already knows the answer to.
 *
 * `holder` names the element that takes the mark; `*` marks whichever ancestor
 * holds the node, which is what a rule styling an unnamed wrapper needs.
 * `direct` is the `>` in `:has(> B)`: only the held node's own parent counts.
 * `attributes` are the names whose change can move this mark, so the marking
 * pass watches them; a part-based side needs no attribute because the pass
 * already watches class names.
 */
export interface HoldRelation {
  /** The word a stylesheet reads in `[data-dsh-deepcraft-holds~="…"]`. */
  name: string
  /** The element that takes the mark, or `*` for any ancestor that holds the node. */
  holder: string
  /** The held side, matched on each node the pass walks. */
  held: string
  /** Only nodes strictly inside this element are marked. */
  scope?: string
  /** Only the held node's own parent counts. */
  direct?: boolean
  /** Attributes whose changes can move this mark. */
  attributes: string[]
}

/** Every relation a stylesheet reads, and the rule that reads it. */
export function holdRelations(vocabulary: PartsTableVocabulary): HoldRelation[] {
  /** The selector for one part name, so the relations below spell their sides in this vocabulary. */
  const part = (name: string) => `[${vocabulary.part}~="${name}"]`
  return [
    // theme/wallpaper.css: the frame's sidebar column is the one that carries the
    // shell's fill, so the mask's stand-down is scoped to the frame that holds it.
    { name: 'sidebar-column', holder: part('layout-frame'), held: part('sidebar-column'), direct: true, attributes: [] },
    // theme/wallpaper.css: the phase box holding the transcript paints the canvas.
    { name: 'conversation-scroll', holder: '[data-phase]', held: '[data-conversation-scroll]', attributes: ['data-phase', 'data-conversation-scroll'] },
  ]
}
