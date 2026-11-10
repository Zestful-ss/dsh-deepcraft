import { expect, test } from 'vitest'
import { BRAND_INK_ORIGINAL, BRAND_INK_TEXT, BRAND_NAME_MAX, CHAT_ANIMATIONS_OFF, MASCOT_CRAB, MASCOT_DEEPY, MASCOT_OFF, MASCOT_PETDEX, PREF_DEFAULTS, PROVIDER_ID_MAX, QUICK_PROVIDERS_MAX, USERNAME_MAX } from '../constants'
import { MODEL_OFFICIAL_GROUP } from '../features/model/copy-fallbacks'
import { resolveMascot } from './prefs'
import { clampPrefs as normalizePrefs } from '@dsh-deepcraft/contracts/prefs'

test('an empty or unreadable value reads as the defaults', () => {
  expect(normalizePrefs({})).toEqual(PREF_DEFAULTS)
  expect(normalizePrefs(null)).toEqual(PREF_DEFAULTS)
  expect(normalizePrefs('nonsense')).toEqual(PREF_DEFAULTS)
})

test('a switch stays on unless stored as false', () => {
  expect(normalizePrefs({ turnNav: false }).turnNav).toBe(false)
  expect(normalizePrefs({ turnNav: 0 }).turnNav).toBe(true)
  expect(normalizePrefs({ turnNav: 'false' }).turnNav).toBe(true)
})

test('a choice outside its set reads as its default', () => {
  expect(normalizePrefs({ motion: 'reduced' }).motion).toBe('reduced')
  expect(normalizePrefs({ motion: 'sometimes' }).motion).toBe(PREF_DEFAULTS.motion)
  expect(normalizePrefs({ motion: 1 }).motion).toBe(PREF_DEFAULTS.motion)
  expect(normalizePrefs({ statusDetail: 'simple' }).statusDetail).toBe(false)
  expect(normalizePrefs({ statusDetail: 'precise' }).statusDetail).toBe(true)
  expect(normalizePrefs({ statusDetail: 'verbose' }).statusDetail).toBe(PREF_DEFAULTS.statusDetail)
  expect(normalizePrefs({ pageLook: 'flat' }).pageLook).toBe('flat')
  expect(normalizePrefs({ pageLook: 'invalid' }).pageLook).toBe(PREF_DEFAULTS.pageLook)
  expect(normalizePrefs({ homeLayout: 'float' }).homeLayout).toBe('float')
  expect(normalizePrefs({ homeLayout: 'dashboard' }).homeLayout).toBe(PREF_DEFAULTS.homeLayout)
})

test('the older brand and palette choices land on one independent palette (D80)', () => {
  expect(normalizePrefs({ brand: 'off', palette: 'claude' }).palette).toBe('ocean')
  expect(normalizePrefs({ brand: 'deepseek' }).palette).toBe('ocean')
  expect(normalizePrefs({ brand: 'claude' }).palette).toBe('ember')
  expect(normalizePrefs({ brand: 'anthropic' }).palette).toBe('ember')
  expect(normalizePrefs({ palette: 'claude' }).palette).toBe('ember')
  expect(normalizePrefs({ palette: 'host' }).palette).toBe('host')
  expect(normalizePrefs({ palette: 'forest' }).palette).toBe('forest')
  expect(normalizePrefs({}).palette).toBe('ocean')
})

test('the hover-open preference takes its earlier boolean shape', () => {
  expect(normalizePrefs({ autoPopover: true }).autoPopover).toBe('all')
  expect(normalizePrefs({ autoPopover: false }).autoPopover).toBe('off')
  expect(normalizePrefs({ autoPopover: 'account' }).autoPopover).toBe('account')
  expect(normalizePrefs({ autoPopover: 'often' }).autoPopover).toBe(PREF_DEFAULTS.autoPopover)
})

test('the chat-area animation switch keeps its boolean shape, and a value an earlier build stored under the retired choice reads as on', () => {
  expect(normalizePrefs({ chatAnimations: true }).chatAnimations).toBe(true)
  expect(normalizePrefs({ chatAnimations: false }).chatAnimations).toBe(false)
  expect(normalizePrefs({ chatAnimations: CHAT_ANIMATIONS_OFF }).chatAnimations).toBe(false)
  expect(normalizePrefs({ chatAnimations: 'enhanced' }).chatAnimations).toBe(true)
  expect(normalizePrefs({ chatAnimations: 'redraw' }).chatAnimations).toBe(true)
  expect(normalizePrefs({ chatAnimations: 7 }).chatAnimations).toBe(PREF_DEFAULTS.chatAnimations)
})

test('quick providers keep distinct ids in order, without the official group, within both limits', () => {
  const long = 'x'.repeat(PROVIDER_ID_MAX + 1)
  expect(normalizePrefs({ quickProviders: ['a', 'b', 'a', '', 3, long, MODEL_OFFICIAL_GROUP, 'c'] }).quickProviders).toEqual(['a', 'b', 'c'])
  expect(normalizePrefs({ quickProviders: 'a' }).quickProviders).toEqual([])
  const many = Array.from({ length: QUICK_PROVIDERS_MAX + 5 }, (_, index) => `p${index}`)
  expect(normalizePrefs({ quickProviders: many }).quickProviders).toHaveLength(QUICK_PROVIDERS_MAX)
})

test('the username is trimmed and cut to its limit', () => {
  expect(normalizePrefs({ username: '  Ada  ' }).username).toBe('Ada')
  expect(normalizePrefs({ username: 'y'.repeat(USERNAME_MAX + 10) }).username).toHaveLength(USERNAME_MAX)
  expect(normalizePrefs({ username: 42 }).username).toBe('')
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

test('"follow the theme" resolves to the Petdex guest; a manual character stands, and off only leaves the chat place', () => {
  expect(resolveMascot(normalizePrefs({}))).toBe(MASCOT_PETDEX)
  expect(resolveMascot(normalizePrefs({ mascot: MASCOT_CRAB }))).toBe(MASCOT_CRAB)
  expect(resolveMascot(normalizePrefs({ mascot: MASCOT_DEEPY }))).toBe(MASCOT_DEEPY)
  expect(resolveMascot(normalizePrefs({ mascot: MASCOT_OFF }))).toBe(MASCOT_OFF)
})
