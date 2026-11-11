/**
 * The DOM half of the host contract (D3): every selector or attribute the skin
 * reads on the host's page, declared once and held to its entry in
 * packages/contracts/src/table.ts. The skin paints colours and type only (D81),
 * so what remains here are the seats the kept features and the page's own
 * marking pass read.
 */

/* ---------- the composer and the conversation ---------- */

/** The composer area: a pointer or key inside it is the reader typing. */
export const COMPOSER_SELECTOR = '[data-composer-seat]'
/** The composer's editable surface (contenteditable); the scheduler reads its content. */
export const COMPOSER_INPUT_SELECTOR = '[data-composer-input]'
/** The card the input sits in. */
export const COMPOSER_CARD_SELECTOR = '[data-composer-card]'
/** The host's model selection slot in the composer. */
export const MODEL_SLOT_SELECTOR = '[data-slot="conversation.input.model"]'
/** The composer's own right-hand list seat, where the subagent model entry stands beside the model slot. */
export const COMPOSER_RIGHT_SLOT_SELECTOR = '[data-slot="conversation.input.right"]'
/** The composer card with the todo, goal and queue cards stacked above it. */
export const COMPOSER_STACK_SELECTOR = '[data-dsh-deepcraft-part~="composer-stack"]'
/** The host's own panel that replaces the composer card, which the mascot stands on. */
export const CHAIN_OVERLAY_FALLBACK_ATTRIBUTE = 'data-chain-overlay-fallback'
/** The conversation's scroller; the scheduler reads the column through it. */
export const CONVERSATION_SCROLL_SELECTOR = '[data-conversation-scroll]'
/** The shown conversation column, and the session id it carries. */
export const CONVERSATION_SESSION_SELECTOR = '[data-phase="active"] [data-conversation-session]'
export const CONVERSATION_SESSION_ATTRIBUTE = 'data-conversation-session'
/** The page's own phase: `hero` before a session is chosen, `active` once one is shown. */
export const PHASE_ATTRIBUTE = 'data-phase'

/* ---------- the sidebar ---------- */

/** The workspace section's label: the heading the view's own control is laid over. */
export const WORKSPACE_SECTION_LABEL_SELECTOR = '[data-dsh-deepcraft-part~="section-label"]'
/** The workspace section's list area: the box holding the session tree. */
export const WORKSPACE_LIST_AREA_SELECTOR = '[data-dsh-deepcraft-part~="list-area"]'
/** The workspace tree's rows: the host's own row key, or either row part. */
export const WORKSPACE_TREE_ROW_SELECTOR = '[data-row-key], [data-dsh-deepcraft-part~="session-row"], [data-dsh-deepcraft-part~="project-row"]'
/** The sidebar footer block; the settings page's entry lives inside it. */
export const FOOT_AREA_SELECTOR = '[data-dsh-deepcraft-part~="foot-area"]'
/** The sidebar's own column, where the pinned aggregate is scoped. */
export const SIDEBAR_ROOT_SELECTOR = '[data-slot="sidebar"] > [data-dsh-deepcraft-part~="sidebar-root"]'
/** The sidebar's slot anchor: the region the part walk reads the sidebar's own class names in (D3). */
export const SIDEBAR_SLOT_SELECTOR = '[data-slot="sidebar"]'

/* ---------- the shell and its menus ---------- */

/** The root slot: the shell frame is its own element child, and the three columns are inside. */
export const ROOT_SLOT_SELECTOR = '[data-slot="root"]'
/** The conversation header's slot anchor: the region the part walk reads the header's class names in (D3). */
export const CONVERSATION_HEADER_SLOT_SELECTOR = '[data-slot="conversation.header"]'
/** The right sidebar's own column, marked by the host; its docked panels are read here (D3). */
export const RIGHTBAR_COLUMN_SELECTOR = '[data-rightbar-col]'
/** An open host menu, portalled to `<body>`. */
export const MENU_ROLE_SELECTOR = '[role="menu"]'
/** The host's account trigger in the sidebar footer, marked with the sign-in state. */
export const ACCOUNT_TRIGGER_SELECTOR = '[aria-haspopup="menu"][data-signed-out]'
/**
 * The control in the footer's settings area that opens a popup: the host's
 * settings dialog trigger where that launcher fills the slot, the account
 * trigger on the desktop, which the caller turns away.
 */
export const SETTINGS_BUTTON_SELECTOR = '[data-dsh-deepcraft-part~="settings-area"] button[aria-haspopup="menu"][data-signed-out], ' +
  '[data-dsh-deepcraft-part~="settings-area"] [data-slot="settings.launcher"] button[aria-haspopup="dialog"], ' +
  '[data-dsh-deepcraft-part~="settings-area"] > button[aria-haspopup="dialog"]'
/** The host's own light/dark flip, written on `<body>`. */
export const DARK_THEME_ATTRIBUTE = 'data-ds-dark-theme'
/** The skin center's stamp on the document element: another skin owns the page (D81). */
export const SKIN_CENTER_ATTRIBUTE = 'data-dsh-skin'
/** Every untagged stylesheet in `<head>`: the host's claim sweep would otherwise take a sibling's. */
export const UNTAGGED_SHEET_SELECTOR = 'style:not([data-plugin])'

/* ---------- ds-bot (Fei2411/DeepSeek-Bot) ---------- */

/**
 * On `<body>` while ds-bot's Bot surface is painted: its shell group writes
 * the motion level there and deletes it when the group withdraws for the
 * shell's own interface (its Agent mode).
 */
export const DS_BOT_SURFACE_ATTRIBUTE = 'data-bt-motion'
