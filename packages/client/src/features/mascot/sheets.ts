/**
 * The mascot sheet tables: which frames each animation holds, the box each
 * frame is cropped to and the frame shown under reduced motion. `scripts/build.mjs`
 * reads them to rebuild every sheet as the vector the browser plays and the
 * host half serves under the assets route, so a face and its animation
 * cannot drift apart.
 */

/**
 * Deepy's animations (features/mascot/whale.ts), one sheet each. The sheets are
 * drawn by packages/assets/whale.mjs at build time: every frame covers the whole
 * 52×52 grid, eight to a row, and the build adds DEEPY_GUTTER around each cell.
 * `still` is the frame shown for the animation when the reader asks for reduced
 * motion.
 */
export const DEEPY_FRAME_MS = 50
/** The one crop box the smooth sheets use: the whale's whole logical grid. */
const DEEPY_BOX = [0, 0, 52, 52]
/**
 * The transparent margin, in logical pixels, that every frame keeps on all
 * four sides in the vector the build produces.
 *
 * The cells stack edge to edge, and the browser draws the vector scaled down.
 * That downscale samples a little way past a frame's edge, and the pixel it
 * finds there is the bottom row of the frame above. A margin wide enough for
 * that reach leaves the sampling nothing but transparency, and a whole logical
 * pixel keeps every strip offset a whole CSS pixel.
 */
export const DEEPY_GUTTER = 1
export const DEEPY_SHEETS: Record<string, { frames: number, box: number[], still: number }> = {
  'idle': { frames: 48, box: DEEPY_BOX, still: 0 },
  'idle-look': { frames: 68, box: DEEPY_BOX, still: 0 },
  'idle-spout': { frames: 64, box: DEEPY_BOX, still: 0 },
  'thinking': { frames: 48, box: DEEPY_BOX, still: 20 },
  'typing': { frames: 48, box: DEEPY_BOX, still: 16 },
  'music': { frames: 32, box: DEEPY_BOX, still: 0 },
  'conducting': { frames: 48, box: DEEPY_BOX, still: 6 },
  'building': { frames: 48, box: DEEPY_BOX, still: 0 },
  'error': { frames: 48, box: DEEPY_BOX, still: 24 },
  'happy': { frames: 52, box: DEEPY_BOX, still: 44 },
  'notification': { frames: 32, box: DEEPY_BOX, still: 12 },
  'compacting': { frames: 56, box: DEEPY_BOX, still: 20 },
  'sleeping': { frames: 64, box: DEEPY_BOX, still: 10 },
  'waking': { frames: 30, box: DEEPY_BOX, still: 29 },
  'poke-left': { frames: 40, box: DEEPY_BOX, still: 0 },
  'poke-right': { frames: 40, box: DEEPY_BOX, still: 0 },
  'tickle': { frames: 48, box: DEEPY_BOX, still: 0 },
  'drag': { frames: 24, box: DEEPY_BOX, still: 0 },
}

/**
 * The composer crab's animations (features/mascot/crab.ts), drawn by
 * scripts/draw-crab.py into packages/assets/src/mascot/crab/: one sheet in the
 * crab's colours and one ink mask per animation, inlined by the build as
 * CRAB_SHEET_URLS.
 *
 * The crab is drawn on a 52×36 grid of cells at 2px a cell, feet on the
 * bottom row, the right claw four cells in from the right edge. A sheet
 * holds its animation's frames eight to a row, each cropped to `box` —
 * `[x, y, width, height]` in cells — and every frame lasts CRAB_FRAME_MS,
 * the pace of Claude Code's own crab. `still` is the frame shown for the
 * animation when the reader asks for reduced motion. The keys are Deepy's,
 * so the two share one state machine; `idle-wave` and `idle-laptop` (Claude
 * Code's laptop routine, whole) are the crab's own idle extras.
 */
export const CRAB_FRAME_MS = 80
export const CRAB_SHEETS: Record<string, { frames: number, box: number[], still: number }> = {
  'idle': { frames: 24, box: [24, 20, 24, 16], still: 0 },
  'idle-look': { frames: 31, box: [24, 20, 24, 16], still: 0 },
  'idle-wave': { frames: 12, box: [24, 15, 24, 21], still: 0 },
  'idle-laptop': { frames: 43, box: [14, 13, 34, 23], still: 0 },
  'thinking': { frames: 32, box: [14, 4, 34, 32], still: 18 },
  'typing': { frames: 6, box: [15, 22, 28, 14], still: 0 },
  'music': { frames: 16, box: [22, 1, 30, 35], still: 0 },
  'conducting': { frames: 24, box: [24, 12, 27, 24], still: 0 },
  'building': { frames: 6, box: [15, 19, 28, 17], still: 0 },
  'error': { frames: 24, box: [23, 11, 26, 25], still: 4 },
  'happy': { frames: 32, box: [18, 6, 34, 30], still: 3 },
  'notification': { frames: 16, box: [24, 8, 24, 28], still: 0 },
  'compacting': { frames: 20, box: [21, 20, 30, 16], still: 3 },
  'sleeping': { frames: 32, box: [23, 3, 29, 33], still: 0 },
  'waking': { frames: 12, box: [24, 4, 24, 32], still: 11 },
  'poke-left': { frames: 10, box: [24, 20, 27, 16], still: 0 },
  'poke-right': { frames: 10, box: [21, 20, 27, 16], still: 0 },
  'tickle': { frames: 16, box: [23, 18, 26, 18], still: 0 },
  'drag': { frames: 8, box: [23, 12, 26, 22], still: 0 },
}
