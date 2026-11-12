import { expect, test } from 'vitest'
import { BRAND_INK_ORIGINAL, BRAND_INK_TEXT, BRAND_NAME_MAX, FONT_CODE_ANTHROPIC, FONT_FOLLOW, FONT_HOST, FONT_UI_ANTHROPIC, MASCOT_OFF, MASCOT_PETDEX, PREF_DEFAULTS } from '../constants'
import { resolveMascot } from './prefs'
import { clampPrefs as normalizePrefs } from '@dsh-deepcraft/contracts/prefs'

test('an empty or unreadable value reads as the defaults', () => {
  expect(normalizePrefs({})).toEqual(PREF_DEFAULTS)
  expect(normalizePrefs(null)).toEqual(PREF_DEFAULTS)
  expect(normalizePrefs('nonsense')).toEqual(PREF_DEFAULTS)
})

test('a switch stays on unless stored as false', () => {
  expect(normalizePrefs({ subagentModelPicker: false }).subagentModelPicker).toBe(false)
  expect(normalizePrefs({ subagentModelPicker: 0 }).subagentModelPicker).toBe(true)
  expect(normalizePrefs({ subagentModelPicker: 'false' }).subagentModelPicker).toBe(true)
})

test('a choice outside its set reads as its default', () => {
  expect(normalizePrefs({ motion: 'reduced' }).motion).toBe('reduced')
  expect(normalizePrefs({ motion: 'sometimes' }).motion).toBe(PREF_DEFAULTS.motion)
  expect(normalizePrefs({ motion: 1 }).motion).toBe(PREF_DEFAULTS.motion)
})

test('the older brand and palette choices land on one independent palette (D80)', () => {
  expect(normalizePrefs({ brand: 'off', palette: 'claude' }).palette).toBe('ocean')
  expect(normalizePrefs({ brand: 'deepseek' }).palette).toBe('ocean')
  expect(normalizePrefs({ brand: 'claude' }).palette).toBe('ember')
  expect(normalizePrefs({ brand: 'anthropic' }).palette).toBe('ember')
  expect(normalizePrefs({ palette: 'claude' }).palette).toBe('ember')
  expect(normalizePrefs({ palette: 'host' }).palette).toBe('host')
  expect(normalizePrefs({ palette: 'forest' }).palette).toBe('forest')
  // The retired reference palette keeps the warm one; its material now rides
  // the layer's own defaults (D84).
  expect(normalizePrefs({ palette: 'cindy' }).palette).toBe('ember')
  expect(normalizePrefs({}).palette).toBe('ocean')
})

test('the material layer defaults to the reference theme and answers each aspect on its own (D84)', () => {
  const defaults = normalizePrefs({})
  expect(defaults.materialRadius).toBe('reference')
  expect(defaults.materialShadow).toBe('flat')
  expect(defaults.materialMotion).toBe('reference')
  expect(defaults.materialGlass).toBe(true)
  expect(defaults.materialAmbient).toBe(true)
  expect(normalizePrefs({ materialRadius: 'host', materialShadow: 'host', materialMotion: 'host' })).toMatchObject({
    materialRadius: 'host', materialShadow: 'host', materialMotion: 'host',
  })
  expect(normalizePrefs({ materialGlass: false, materialAmbient: false })).toMatchObject({ materialGlass: false, materialAmbient: false })
  expect(normalizePrefs({ materialRadius: 'rounded' }).materialRadius).toBe('reference')
  expect(normalizePrefs({ materialShadow: 'soft' }).materialShadow).toBe('flat')
})
test('the brand name is trimmed and cut to its limit', () => {
  expect(normalizePrefs({ brandName: '  Acme  ' }).brandName).toBe('Acme')
  expect(normalizePrefs({ brandName: 'n'.repeat(BRAND_NAME_MAX + 10) }).brandName).toHaveLength(BRAND_NAME_MAX)
  expect(normalizePrefs({ brandName: false }).brandName).toBe('')
})

test('the custom accent keeps a #rrggbb colour, lower-cased, and reads anything else as unset', () => {
  expect(normalizePrefs({ brandAccent: '#1A7F5A' }).brandAccent).toBe('#1a7f5a')
  expect(normalizePrefs({ brandAccent: '#abc' }).brandAccent).toBe('')
  expect(normalizePrefs({ brandAccent: 'red' }).brandAccent).toBe('')
  expect(normalizePrefs({}).brandAccent).toBe('')
})

test('the custom images keep their own colours unless the text colour is chosen', () => {
  expect(normalizePrefs({}).brandInk).toBe(BRAND_INK_ORIGINAL)
  expect(normalizePrefs({ brandInk: BRAND_INK_TEXT }).brandInk).toBe(BRAND_INK_TEXT)
  expect(normalizePrefs({ brandInk: 'mono' }).brandInk).toBe(BRAND_INK_ORIGINAL)
})

test('the chat pet is one choice and the older per-theme fields move into it (D80)', () => {
  expect(normalizePrefs({}).chatPet).toBe('whaledou')
  expect(normalizePrefs({ chatPet: '  my-pet  ' }).chatPet).toBe('my-pet')
  expect(normalizePrefs({ brand: 'off', palette: 'claude', chatPetDeepseek: 'my-whale' }).chatPet).toBe('my-whale')
  expect(normalizePrefs({ brand: 'deepseek', chatPetDeepseek: '' }).chatPet).toBe('whaledou')
  expect(normalizePrefs({ brand: 'claude', palette: 'claude', chatPetClaude: 'my-crab' }).chatPet).toBe('my-crab')
  expect(normalizePrefs({ palette: 'claude' }).chatPet).toBe('crab-buddy')
  expect(normalizePrefs({ brand: 'claude', palette: 'forest', chatPet: 'new-pet' }).chatPet).toBe('new-pet')
})

test('"follow the theme" resolves to the Petdex guest, off leaves the chat place, and the retired characters fall back to Petdex', () => {
  expect(resolveMascot(normalizePrefs({}))).toBe(MASCOT_PETDEX)
  expect(resolveMascot(normalizePrefs({ mascot: MASCOT_OFF }))).toBe(MASCOT_OFF)
  expect(resolveMascot(normalizePrefs({ mascot: 'crab' }))).toBe(MASCOT_PETDEX)
  expect(resolveMascot(normalizePrefs({ mascot: 'deepy' }))).toBe(MASCOT_PETDEX)
})

test('the retired single typeface choice migrates to the three font roles', () => {
  const host = normalizePrefs({ typeface: 'host' })
  expect(host.fontUi).toBe(FONT_HOST)
  expect(host.fontProse).toBe(FONT_FOLLOW)
  expect(host.fontCode).toBe(FONT_HOST)
  const theme = normalizePrefs({ typeface: 'claude' })
  expect(theme.fontUi).toBe(FONT_UI_ANTHROPIC)
  expect(theme.fontProse).toBe('anthropic-serif')
  expect(theme.fontCode).toBe(FONT_CODE_ANTHROPIC)
})
