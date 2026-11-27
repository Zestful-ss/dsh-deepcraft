import { describe, expect, it } from 'vitest'
import { deleteFailureStatus } from './delete-session'

/**
 * The status a deletion without a reason of its own is reported with.
 *
 * A 405 or 404 reaches the browser half only when the host's own static
 * fallback answered the route — the plugin's host half never came up in that
 * process — so those two are the ones the card translates into the restart
 * guidance; every other status keeps the number it carries.
 */
describe('deleteFailureStatus', () => {
  it('translates the fallback answers into the host-down marker', () => {
    expect(deleteFailureStatus(404)).toBe('HOST_NOT_RUNNING')
    expect(deleteFailureStatus(405)).toBe('HOST_NOT_RUNNING')
  })

  it('keeps every other status as the number it carries', () => {
    expect(deleteFailureStatus(500)).toBe('HTTP 500')
    expect(deleteFailureStatus(403)).toBe('HTTP 403')
    expect(deleteFailureStatus(200)).toBe('HTTP 200')
  })
})
