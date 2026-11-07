import * as React from 'react'
import { PAGE_LOOK_FLAT, PAGE_LOOK_FLOAT, PALETTE_EMBER, PALETTE_FOREST, PALETTE_HOST, PALETTE_OCEAN, TYPEFACE_CLAUDE, TYPEFACE_HOST } from '../../constants'
import { accentRow, brandRows } from './settings-brand'
import { copy } from './copy'
import type { Prefs } from '../../constants'
import type { SegmentOption, SettingsTab, SettingsView } from './settings-controls'

/**
 * The settings page's Appearance tab: which palette paints the colours — with
 * the accent colour as that row's sub-row — who sets the type, and the custom
 * brand rows (settings-brand.ts). The home layout, the mascot and where it
 * stands are the features' own rows, placed here by their manifests (D72).
 */
export function createSettingsAppearanceTab(): SettingsTab {
  function rows(view: SettingsView) {
    const prefs = view.prefs
    const write = view.write
    const controls = view.controls
    const paletteOptions: SegmentOption<Prefs['palette']>[] = [
      { value: PALETTE_OCEAN, label: copy('paletteOcean') },
      { value: PALETTE_EMBER, label: copy('paletteEmber') },
      { value: PALETTE_FOREST, label: copy('paletteForest') },
      { value: PALETTE_HOST, label: copy('paletteHost') },
    ]
    const typefaceOptions: SegmentOption<Prefs['typeface']>[] = [
      { value: TYPEFACE_CLAUDE, label: copy('typefaceClaude') },
      { value: TYPEFACE_HOST, label: copy('typefaceHost') },
    ]
    const pageLookOptions: SegmentOption<Prefs['pageLook']>[] = [
      { value: PAGE_LOOK_FLOAT, label: copy('pageLookFloat') },
      { value: PAGE_LOOK_FLAT, label: copy('pageLookFlat') },
    ]
    return [
      {
        rank: 10,
        node: controls.row(
          'palette',
          copy('paletteTitle'),
          copy('paletteDesc'),
          React.createElement(
            'div',
            { className: 'dsh-deepcraft-palette-options' },
            controls.segment(paletteOptions, prefs.palette, value => { write({ palette: value }) }),
          ),
          { block: true },
        ),
      },
      accentRow(view),
      {
        rank: 20,
        node: controls.row(
          'typeface',
          copy('typefaceTitle'),
          copy('typefaceDesc'),
          controls.segment(typefaceOptions, prefs.typeface, value => { write({ typeface: value }) }),
        ),
      },
      {
        rank: 22,
        node: controls.row(
          'pageLook',
          copy('pageLookTitle'),
          copy('pageLookDesc'),
          controls.segment(pageLookOptions, prefs.pageLook, value => { write({ pageLook: value }) }),
        ),
      },
      ...brandRows(view),
    ]
  }
  return { id: 'appearance', label: () => copy('tabAppearance'), rows }
}
