'use strict'
/**
 * media-fixture.cjs — the reader's own file, made where it is needed.
 *
 * The brand mark and the wallpaper both take an image through the host half's
 * file routes, and no scenario ships a binary fixture: one 8×8 green PNG rides
 * this module as base64, turned into a Blob inside the page and PUT to the
 * route the caller names, exactly as the settings page's own picker would send
 * it.
 */

/** An 8×8 solid PNG: signature, IHDR, one deflated IDAT and IEND. */
const PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEUlEQVR4nGOQqo/CihiGlgQArSE8wedLXFYAAAAASUVORK5CYII='

/**
 * One PNG made in the page and PUT to `url`.
 *
 * @returns the answer's status and JSON body, or a null body on a refusal
 *     without one.
 */
async function uploadPng(page, url) {
  return page.evaluate(async ({ target, base64 }) => {
    const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0))
    const response = await fetch(target, { method: 'PUT', headers: { 'content-type': 'image/png' }, body: new Blob([bytes], { type: 'image/png' }) })
    const text = await response.text()
    let answer = null
    try {
      answer = JSON.parse(text)
    } catch {
      // A refusal without a body is still a status the caller judges.
    }
    return { status: response.status, answer }
  }, { target: url, base64: PNG_BASE64 })
}

module.exports = { PNG_BASE64, uploadPng }
