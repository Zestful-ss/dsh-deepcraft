import * as React from 'react'
import {
  FONT_CODE_ANTHROPIC, FONT_CODE_COMMIT, FONT_CODE_FIRA, FONT_CODE_GEIST, FONT_CODE_JETBRAINS,
  FONT_CUSTOM, FONT_FOLLOW, FONT_HOST, FONT_LIST_MAX, FONT_PROSE_ANTHROPIC, FONT_PROSE_LITERATA, FONT_PROSE_NOTO, FONT_PROSE_SOURCE,
  FONT_UI_ANTHROPIC, FONT_UI_ATKINSON, FONT_UI_FIXEL, FONT_UI_GEIST, FONT_UI_INTER,
  MOTION_FULL, MOTION_REDUCED, MOTION_SYSTEM,
  MATERIAL_HOST, MATERIAL_REFERENCE, MATERIAL_SHADOWS_FLAT,
  PALETTE_EMBER, PALETTE_FOREST, PALETTE_HOST, PALETTE_OCEAN,
} from '../../constants'
import { accentRow, brandRows } from './settings-brand'
import { copy } from './copy'
import type { Prefs } from '../../constants'
import type { SegmentOption, SettingsTab, SettingsView } from './settings-controls'

/** A saved family list, held locally while the reader types and committed on blur or Enter. */
function FontCustomInput(props: { value: string, placeholder: string, onSave(value: string): void }) {
  const [draft, setDraft] = React.useState(props.value)
  React.useEffect(() => setDraft(props.value), [props.value])
  return React.createElement('input', {
    className: 'dsh-deepcraft-settings-input dsh-deepcraft-font-custom-input',
    type: 'text',
    value: draft,
    placeholder: props.placeholder,
    maxLength: FONT_LIST_MAX,
    spellCheck: false,
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => setDraft(event.currentTarget.value),
    onBlur: () => props.onSave(draft),
    onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') { event.currentTarget.blur() }
    },
  })
}

/**
 * The settings page's Appearance tab: which palette paints the colours — with
 * the accent colour as that row's sub-row — the three font roles, how much
 * motion the skin runs, the material layer's five aspects (D84, independent of
 * the palette), and the custom brand rows (settings-brand.ts). The mascot,
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
    const motionOptions: SegmentOption<Prefs['motion']>[] = [
      { value: MOTION_SYSTEM, label: copy('motionSystem') },
      { value: MOTION_REDUCED, label: copy('motionReduced') },
      { value: MOTION_FULL, label: copy('motionFull') },
    ]
    const radiusOptions: SegmentOption<Prefs['materialRadius']>[] = [
      { value: MATERIAL_REFERENCE, label: copy('materialRadiusReference') },
      { value: MATERIAL_HOST, label: copy('materialHost') },
    ]
    const shadowOptions: SegmentOption<Prefs['materialShadow']>[] = [
      { value: MATERIAL_SHADOWS_FLAT, label: copy('materialShadowFlat') },
      { value: MATERIAL_HOST, label: copy('materialHost') },
    ]
    const materialMotionOptions: SegmentOption<Prefs['materialMotion']>[] = [
      { value: MATERIAL_REFERENCE, label: copy('materialMotionReference') },
      { value: MATERIAL_HOST, label: copy('materialHost') },
    ]
    const uiOptions: SegmentOption<Prefs['fontUi']>[] = [
      { value: FONT_HOST, label: copy('fontHost') },
      { value: FONT_UI_INTER, label: copy('fontInter') },
      { value: FONT_UI_GEIST, label: copy('fontGeistSans') },
      { value: FONT_UI_FIXEL, label: copy('fontFixel') },
      { value: FONT_UI_ATKINSON, label: copy('fontAtkinson') },
      { value: FONT_UI_ANTHROPIC, label: copy('fontAnthropic') },
      { value: FONT_CUSTOM, label: copy('fontCustom') },
    ]
    const proseOptions: SegmentOption<Prefs['fontProse']>[] = [
      { value: FONT_FOLLOW, label: copy('fontFollowUi') },
      { value: FONT_PROSE_NOTO, label: copy('fontNotoSerif') },
      { value: FONT_PROSE_SOURCE, label: copy('fontSourceSerif') },
      { value: FONT_PROSE_LITERATA, label: copy('fontLiterata') },
      { value: FONT_PROSE_ANTHROPIC, label: copy('fontAnthropicSerif') },
      { value: FONT_CUSTOM, label: copy('fontCustom') },
    ]
    const codeOptions: SegmentOption<Prefs['fontCode']>[] = [
      { value: FONT_HOST, label: copy('fontHost') },
      { value: FONT_CODE_JETBRAINS, label: copy('fontJetBrains') },
      { value: FONT_CODE_GEIST, label: copy('fontGeistMono') },
      { value: FONT_CODE_FIRA, label: copy('fontFiraCode') },
      { value: FONT_CODE_COMMIT, label: copy('fontCommitMono') },
      { value: FONT_CODE_ANTHROPIC, label: copy('fontAnthropicMono') },
      { value: FONT_CUSTOM, label: copy('fontCustom') },
    ]
    const select = <V extends string>(value: V, options: SegmentOption<V>[], onChange: (value: V) => void) => React.createElement(
      'select',
      {
        className: 'dsh-deepcraft-settings-select',
        value,
        onChange: (event: React.ChangeEvent<HTMLSelectElement>) => onChange(event.currentTarget.value as V),
      },
      options.map(option => React.createElement('option', { key: option.value, value: option.value }, option.label)),
    )
    const customRow = (id: string, value: string, save: (value: string) => void, rank: number) => ({
      rank,
      node: controls.row(id, copy('fontCustomTitle'), copy('fontCustomDesc'), React.createElement(FontCustomInput, {
        value,
        placeholder: copy('fontCustomPlaceholder'),
        onSave: save,
      })),
    })
    const rows = [
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
        node: controls.row('fontUi', copy('fontUiTitle'), copy('fontUiDesc'), select(prefs.fontUi, uiOptions, value => { write({ fontUi: value }) })),
      },
      ...(prefs.fontUi === FONT_CUSTOM ? [customRow('fontUiCustom', prefs.fontUiCustom, value => { write({ fontUiCustom: value }) }, 21)] : []),
      {
        rank: 22,
        node: controls.row('fontProse', copy('fontProseTitle'), copy('fontProseDesc'), select(prefs.fontProse, proseOptions, value => { write({ fontProse: value }) })),
      },
      ...(prefs.fontProse === FONT_CUSTOM ? [customRow('fontProseCustom', prefs.fontProseCustom, value => { write({ fontProseCustom: value }) }, 23)] : []),
      {
        rank: 24,
        node: controls.row('fontCode', copy('fontCodeTitle'), copy('fontCodeDesc'), select(prefs.fontCode, codeOptions, value => { write({ fontCode: value }) })),
      },
      ...(prefs.fontCode === FONT_CUSTOM ? [customRow('fontCodeCustom', prefs.fontCodeCustom, value => { write({ fontCodeCustom: value }) }, 25)] : []),
      {
        rank: 30,
        node: controls.row(
          'motion',
          copy('motionTitle'),
          null,
          controls.segment(motionOptions, prefs.motion, value => { write({ motion: value }) }),
        ),
      },
      {
        rank: 41,
        node: controls.row('materialRadius', copy('materialRadiusTitle'), copy('materialRadiusDesc'), controls.segment(radiusOptions, prefs.materialRadius, value => { write({ materialRadius: value }) })),
      },
      {
        rank: 42,
        node: controls.row('materialShadow', copy('materialShadowTitle'), copy('materialShadowDesc'), controls.segment(shadowOptions, prefs.materialShadow, value => { write({ materialShadow: value }) })),
      },
      {
        rank: 43,
        node: controls.row('materialMotion', copy('materialMotionTitle'), copy('materialMotionDesc'), controls.segment(materialMotionOptions, prefs.materialMotion, value => { write({ materialMotion: value }) })),
      },
      {
        rank: 44,
        node: controls.row('materialGlass', copy('materialGlassTitle'), copy('materialGlassDesc'), controls.toggle(prefs.materialGlass, value => { write({ materialGlass: value }) })),
      },
      {
        rank: 45,
        node: controls.row('materialAmbient', copy('materialAmbientTitle'), copy('materialAmbientDesc'), controls.toggle(prefs.materialAmbient, value => { write({ materialAmbient: value }) })),
      },
      ...brandRows(view),
    ]
    return rows
  }
  return { id: 'appearance', label: () => copy('tabAppearance'), rows }
}
