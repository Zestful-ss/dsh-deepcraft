import { expect, test } from 'vitest'
import { customFontStack } from './fonts'

const FALLBACK = 'system-ui, sans-serif'

test('a custom list quotes family names and leaves CSS generics alone', () => {
  expect(customFontStack('Fira Sans, monospace', FALLBACK)).toBe('"Fira Sans", monospace, system-ui, sans-serif')
})

test('characters that could end the declaration are dropped', () => {
  expect(customFontStack('Foo"; color: red; } bar, serif', FALLBACK)).toBe('"Foo color: red bar", serif, system-ui, sans-serif')
})

test('an empty list falls back to the role stack', () => {
  expect(customFontStack(' , ', FALLBACK)).toBe(FALLBACK)
  expect(customFontStack('', FALLBACK)).toBe(FALLBACK)
})
