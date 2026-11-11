import { UNTAGGED_SHEET_SELECTOR } from '@dsh-deepcraft/contracts/dom'
import { mountStylesheet as mountSheet, parkForeignSheets as parkSheets } from '@dsh-deepcraft/engine/stylesheet'
import { STYLESHEET } from 'virtual:dsh-deepcraft/generated'
import { FOREIGN_SHEET_TAG, PACKAGE_NAME, STYLE_ID, STYLE_PLUGIN_CSS } from '../constants'

/**
 * This package's sheets, named for the engine that mounts them (D9, D73): the
 * mechanism lives in packages/engine/src/stylesheet.ts, and the ids, the plugin
 * name and the built sheet are this package's own.
 */

/**
 * Park a sibling's untagged stylesheet so no package's bookkeeping can take it.
 *
 * Two moments call this, because a sweep never waits for the skin: the module
 * scope of packages/client/src/entry.ts, the only code of ours that runs before
 * the sweep of our own materialization, and the head watch, which sees a sheet
 * arriving after it.
 */
export function parkForeignSheets() {
  parkSheets(UNTAGGED_SHEET_SELECTOR, STYLE_ID, FOREIGN_SHEET_TAG)
}

/**
 * Mount the skin's stylesheet, once per generation (D81).
 *
 * @returns this generation's stop function.
 */
export function mountStylesheet() {
  return mountSheet({ id: STYLE_ID, text: STYLESHEET, packageName: PACKAGE_NAME, pluginCss: STYLE_PLUGIN_CSS })
}
