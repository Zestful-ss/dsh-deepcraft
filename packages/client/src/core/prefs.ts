import { FONT_CODE_ATTR, FONT_PROSE_ATTR, FONT_UI_ATTR, MASCOT_ATTR, MASCOT_BRAND, MASCOT_PETDEX, MOTION_ATTR, MOTION_FULL, MOTION_REDUCED, PACKAGE_NAME, PALETTE_ATTR, SETTINGS_ENTRY_FALLBACK, WALLPAPER_ATTR, WALLPAPER_LITE_ATTR } from '../constants'
import { FONT_CUSTOM } from '@dsh-deepcraft/contracts/prefs'
import { FONT_ROLES } from '../theme/fonts'
import { customFontStack } from '../shared/fonts'
import type { PrefKey, Prefs } from '../constants'
import type { HostContext } from '@dsh-deepcraft/engine/host'
import { clampPrefs } from '@dsh-deepcraft/contracts/prefs'
import { notifyAll } from '@dsh-deepcraft/engine/notify'
import { createSettingsBinding } from '@dsh-deepcraft/engine/settings-binding'
import { pageOwner } from '../shared/visual-owner'

/**
 * Skin preferences: the host settings namespace is the store, and every
 * value is mirrored onto the document as an attribute so the stylesheet
 * decides what it means (D75). Until the first read settles — and if
 * it fails — the table's defaults hold. The clamp that turns a stored value
 * into one of these is the table's own (packages/contracts/src/prefs.ts, D73).
 */
export let prefs = clampPrefs({})
const prefsListeners: ((prefs: Prefs) => void)[] = []

const binding = createSettingsBinding({
  namespaces: [PACKAGE_NAME, SETTINGS_ENTRY_FALLBACK],
  adoptForm(value) {
    adoptPrefs(clampPrefs(value))
  },
})

/** Bind the official settings form (engine/src/settings-binding.ts); true once a form is bound. */
export function adoptSettingsForm(ctx: HostContext) {
  return binding.adopt(ctx)
}

/** Release the form and directory subscriptions the binding opened. */
export function disposePrefsBinding() {
  binding.dispose()
}

/** Read the preferences from the form, once it carries values. */
export function loadPrefs() {
  binding.read()
}

/** The current preferences (live object; treat as read-only). */
export function readPrefs() {
  return prefs
}

/** Observe preference changes; returns the unsubscriber. */
export function subscribePrefs(listener: (prefs: Prefs) => void) {
  prefsListeners.push(listener)
  return () => {
    const index = prefsListeners.indexOf(listener)
    if (index !== -1) prefsListeners.splice(index, 1)
  }
}
/**
 * The document mirror: one entry per preference the stylesheet switches on,
 * with the attribute it rides and the resolver that turns the preference into
 * what the rules test (the resolved mascot). One list is the whole contract
 * with the stylesheets: `adoptPrefs` writes these and `clearPrefsAttributes`
 * takes the same names back (entry.ts). Its entries are literals so the build
 * can hold every attribute a stylesheet reads to a name written here (D9).
 */
interface PrefMirror {
  key: PrefKey
  attr: string
  /** The value to write. */
  value(prefs: Prefs): string
}

const MIRRORS = [
  { key: 'palette', attr: PALETTE_ATTR, value: (prefs: Prefs) => prefs.palette },
  { key: 'fontUi', attr: FONT_UI_ATTR, value: (prefs: Prefs) => prefs.fontUi },
  { key: 'fontProse', attr: FONT_PROSE_ATTR, value: (prefs: Prefs) => prefs.fontProse },
  { key: 'fontCode', attr: FONT_CODE_ATTR, value: (prefs: Prefs) => prefs.fontCode },
  { key: 'mascot', attr: MASCOT_ATTR, value: resolveMascot },
  { key: 'wallpaperSource', attr: WALLPAPER_ATTR, value: (prefs: Prefs) => prefs.wallpaperSource },
  { key: 'wallpaperLite', attr: WALLPAPER_LITE_ATTR, value: (prefs: Prefs) => prefs.wallpaperLite ? '1' : '' },
] as const satisfies readonly PrefMirror[]

/** Every attribute the mirror writes, plus the animation answer `writeMotionAttribute` resolves. */
const MIRROR_ATTRS: readonly string[] = [...MIRRORS.map(mirror => mirror.attr), MOTION_ATTR]

/**
 * Adopt a preference set: mirror it onto the document, then notify. A page a
 * skin or ds-bot owns carries none of this theme's attributes (D81): the set is
 * kept, and taking the page back mirrors it (entry.ts). The form answers
 * whenever it answers, and the settings section installs whenever its chunk
 * arrives (D72), so a yielded page hears adoptions too.
 */
export function adoptPrefs(next: Prefs) {
  prefs = next
  if (pageOwner() === null) {
    for (const mirror of MIRRORS) document.body.setAttribute(mirror.attr, mirror.value(next))
    writeFontCustoms(next)
    writeWallpaperNumbers(next)
    writeMotionAttribute(next.motion)
  }
  notifyAll(prefsListeners, next)
}

/** The custom family lists a role uses when its choice is `custom`; every other role takes its own stack. */
const FONT_CUSTOMS = [
  { choice: 'fontUi', text: 'fontUiCustom', role: FONT_ROLES.ui },
  { choice: 'fontProse', text: 'fontProseCustom', role: FONT_ROLES.prose },
  { choice: 'fontCode', text: 'fontCodeCustom', role: FONT_ROLES.code },
] as const

/** Write the reader's own family lists beside the choice attributes; a role not on `custom` leaves none behind. */
function writeFontCustoms(next: Prefs) {
  for (const { choice, text, role } of FONT_CUSTOMS) {
    if (next[choice] === FONT_CUSTOM) document.body.style.setProperty(role.customProperty, customFontStack(next[text], role.fallback))
    else document.body.style.removeProperty(role.customProperty)
  }
}

/** The two wallpaper amounts reach the sheet as custom properties (theme/wallpaper.css reads them off body). */
function writeWallpaperNumbers(next: Prefs) {
  document.body.style.setProperty('--dsh-deepcraft-wallpaper-visibility', String(next.wallpaperVisibility))
  document.body.style.setProperty('--dsh-deepcraft-wallpaper-blur', `${next.wallpaperBlur}px`)
}

/** Take back every attribute adoptPrefs mirrors onto the document: the page goes back to the host (entry.ts). */
export function clearPrefsAttributes() {
  for (const name of MIRROR_ATTRS) document.body.removeAttribute(name)
  for (const { role } of FONT_CUSTOMS) document.body.style.removeProperty(role.customProperty)
  document.body.style.removeProperty('--dsh-deepcraft-wallpaper-visibility')
  document.body.style.removeProperty('--dsh-deepcraft-wallpaper-blur')
}

/** Whether the operating system asks for reduced motion right now. */
function systemPrefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Resolve the animation choice onto the document. Only the two answers the
 * rest of the plugin acts on reach the attribute: a stylesheet cannot rewrite
 * its own media queries, so "always play" has to be a value the rules test.
 */
function writeMotionAttribute(mode: string) {
  const reduced = mode === MOTION_REDUCED || (mode !== MOTION_FULL && systemPrefersReducedMotion())
  document.body.setAttribute(MOTION_ATTR, reduced ? MOTION_REDUCED : MOTION_FULL)
}

/**
 * Re-resolve the current choice when the system's own setting flips. The
 * listeners hear about it only when the resolved answer really moved, because
 * features act on that answer rather than reading it lazily (D40).
 */
export function refreshMotionAttribute() {
  const before = document.body.getAttribute(MOTION_ATTR)
  writeMotionAttribute(prefs.motion)
  if (document.body.getAttribute(MOTION_ATTR) !== before) notifyAll(prefsListeners, prefs)
}

/**
 * Whether the skin must hold its animations still, right now. The mascots ask
 * this instead of the media query, which cannot express "always play".
 */
export function motionReduced() {
  const resolved = document.body.getAttribute(MOTION_ATTR)
  if (resolved === MOTION_REDUCED) return true
  if (resolved === MOTION_FULL) return false
  return systemPrefersReducedMotion()
}

/** The mascot actually on the page: `brand` resolves to the theme's own Petdex pet. */
export function resolveMascot(current: Prefs) {
  if (current.mascot !== MASCOT_BRAND) return current.mascot
  return MASCOT_PETDEX
}

/**
 * Write a partial preference change through the official form.
 *
 * @returns a promise for the resolved preferences, or null when the form does
 *          not carry values yet or refused the change.
 */
export function savePrefs(patch: Partial<Prefs>): Promise<Prefs | null> {
  return binding.save(patch).then(accepted => accepted === null || accepted === false ? null : prefs)
}
