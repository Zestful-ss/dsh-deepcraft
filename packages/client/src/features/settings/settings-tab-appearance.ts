import * as React from 'react'
import { MOTION_FULL, MOTION_REDUCED, MOTION_SYSTEM, PALETTE_EMBER, PALETTE_FOREST, PALETTE_HOST, PALETTE_OCEAN, TYPEFACE_CLAUDE, TYPEFACE_HOST } from '../../constants'
import { accentRow, brandRows } from './settings-brand'
import { copy } from './copy'
import type { Prefs } from '../../constants'
import type { SegmentOption, SettingsTab, SettingsView } from './settings-controls'

/**
 * The settings page's Appearance tab: which palette paints the colours — with
 * the accent colour as that row's sub-row — who sets the type, how much motion
 * the skin runs, and the custom brand rows (settings-brand.ts). The mascot,
 * where it stands and the chat pet are the features' own rows, placed here by
 * their manifests (D72).
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
    const motionOptions: SegmentOption<Prefs['motion']>[] = [
      { value: MOTION_SYSTEM, label: copy('motionSystem') },
      { value: MOTION_REDUCED, label: copy('motionReduced') },
      { value: MOTION_FULL, label: copy('motionFull') },
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
        rank: 24,
        node: controls.row(
          'motion',
          copy('motionTitle'),
          null,
          controls.segment(motionOptions, prefs.motion, value => { write({ motion: value }) }),
        ),
      },
      ...brandRows(view),
    ]
  }
  return { id: 'appearance', label: () => copy('tabAppearance'), rows }
}
