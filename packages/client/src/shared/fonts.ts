/**
 * The reader's own family list, as a CSS stack. Names are split on commas,
 * stripped of characters that could end the value or the declaration, and
 * double-quoted; CSS generic families stay unquoted. The role's own fallback
 * always follows, so a font the machine lacks never leaves text unstyled.
 */

/** Families CSS itself understands; quoting one would ask for a font by that literal name. */
const GENERIC = new Set([
  'serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui',
  'ui-serif', 'ui-sans-serif', 'ui-monospace', 'ui-rounded', 'emoji', 'math', 'fangsong',
])

/**
 * @param list - the reader's comma-separated family names.
 * @param fallback - the role's stack, appended after the names.
 * @returns a CSS family list.
 */
export function customFontStack(list: string, fallback: string) {
  const names = list
    .split(',')
    .map(name => name.replace(/["'\\;{}<>]/g, '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(name => name !== '')
  if (names.length === 0) return fallback
  const quoted = names.map(name => GENERIC.has(name.toLowerCase()) ? name : `"${name}"`)
  return `${quoted.join(', ')}, ${fallback}`
}
