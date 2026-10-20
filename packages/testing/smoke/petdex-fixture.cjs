'use strict'
/**
 * The smoke's Petdex atlas: one 1536×1872 PNG (eight 192×208 columns, nine
 * rows) whose rows carry different colours, so a case can see which action's
 * row is on stage. It is generated here rather than shipped: no pet art
 * belongs in the package, and the geometry is the contract the build and the
 * player both read.
 */
const { PNG } = require('pngjs')

const WIDTH = 1536
const HEIGHT = 1872
const CELL = 208
const ROW_INK = [
  [217, 119, 87], [46, 125, 50], [2, 119, 189], [246, 195, 67],
  [142, 36, 170], [198, 40, 40], [0, 137, 123], [84, 110, 122], [63, 81, 181],
]

let atlas = null

/** The atlas bytes, built once per run. */
function petdexAtlas() {
  if (atlas !== null) return atlas
  const png = new PNG({ width: WIDTH, height: HEIGHT })
  png.data.fill(0)
  for (let row = 0; row < ROW_INK.length; row++) {
    const [red, green, blue] = ROW_INK[row]
    for (let y = row * CELL; y < (row + 1) * CELL; y++) {
      for (let frame = 0; frame < 8; frame++) {
        // A lighter stripe per frame keeps each column apart on screen.
        const shade = 40 + frame * 18
        for (let x = frame * 192; x < (frame + 1) * 192; x++) {
          const at = (y * WIDTH + x) * 4
          png.data[at] = Math.min(255, red + shade)
          png.data[at + 1] = Math.min(255, green + shade)
          png.data[at + 2] = Math.min(255, blue + shade)
          png.data[at + 3] = 255
        }
      }
    }
  }
  atlas = PNG.sync.write(png)
  return atlas
}

module.exports = { petdexAtlas }
