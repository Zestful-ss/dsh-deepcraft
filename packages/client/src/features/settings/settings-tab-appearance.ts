import * as React from 'react'
import {
  FONT_CODE_ANTHROPIC, FONT_CODE_COMMIT, FONT_CODE_FIRA, FONT_CODE_GEIST, FONT_CODE_JETBRAINS,
  FONT_CUSTOM, FONT_FOLLOW, FONT_HOST, FONT_LIST_MAX, FONT_PROSE_ANTHROPIC, FONT_PROSE_LITERATA, FONT_PROSE_NOTO, FONT_PROSE_SOURCE,
  FONT_UI_ANTHROPIC, FONT_UI_ATKINSON, FONT_UI_FIXEL, FONT_UI_GEIST, FONT_UI_HARMONY, FONT_UI_INTER,
  MOTION_FULL, MOTION_REDUCED, MOTION_SYSTEM,
  MATERIAL_HOST, MATERIAL_REFERENCE, MATERIAL_SHADOWS_FLAT,
  PALETTE_ATTR, PALETTE_HOST, SKIN_PALETTES,
} from '../../constants'
import { accentRow, brandRows } from './settings-brand'
import { PALETTE_SWATCHES } from 'virtual:dsh-deepcraft/generated'
import { copy } from './copy'
import type { Prefs } from '../../constants'
import type { SegmentOption, SettingsTab, SettingsView } from './settings-controls'

/** A saved family list, held locally while the reader types and committed on blur or Enter. */
function FontCustomInput(props: { value: string, placeholder: string, onSave(value: string): void }) {
  const [draft, setDraft] = React.useState(props.value)
  const editing = React.useRef(false)
  React.useEffect(() => { if (!editing.current) setDraft(props.value) }, [props.value])
  return React.createElement('input', {
    className: 'dsh-deepcraft-settings-input dsh-deepcraft-font-custom-input',
    type: 'text',
    value: draft,
    placeholder: props.placeholder,
    maxLength: FONT_LIST_MAX,
    spellCheck: false,
    onFocus: () => { editing.current = true },
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => setDraft(event.currentTarget.value),
    onBlur: () => {
      editing.current = false
      props.onSave(draft)
    },
    onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') { event.currentTarget.blur() }
    },
  })
}

/** One palette card's two halves: the light theme on the left and the dark on the right, each half painting its own "Aa" and dot row (D80). */
function SwatchHalf(props: { swatch: { canvas: string, ink: string, dots: string[] } }) {
  return React.createElement(
    'div',
    { className: 'dsh-deepcraft-palette-half', style: { background: props.swatch.canvas } },
    React.createElement('span', { className: 'dsh-deepcraft-palette-sample', style: { color: props.swatch.ink } }, 'Aa'),
    React.createElement(
      'div',
      { className: 'dsh-deepcraft-palette-dots' },
      props.swatch.dots.map((dot, index) => React.createElement('span', { key: index, className: 'dsh-deepcraft-palette-dot', style: { background: dot } })),
    ),
  )
}

/**
 * The Colours row's picker: one card per skin palette — its two themes as two
 * halves painted in the palette's own colours (the swatches the build reads
 * out of theme/tokens.json) — followed by the host card. Hovering a card
 * tries the palette on the document at once and clicking keeps it; the
 * pointer leaving the grid hands the document back to the stored choice.
 */
function PalettePicker(props: { prefs: Prefs, write: SettingsView['write'], disabled?: boolean }) {
  // The stored palette as of the latest render: the restore target for a
  // hover that never became a pick. The props already carry it on every
  // adoption, so the ref only keeps the latest value reachable from the
  // unmount cleanup's empty dependency list.
  const stored = React.useRef(props.prefs.palette)
  stored.current = props.prefs.palette
  const previewing = React.useRef(false)
  React.useEffect(() => () => {
    // The page unmounting mid-hover gives the document back to the stored palette.
    if (previewing.current) document.body.setAttribute(PALETTE_ATTR, stored.current)
  }, [])
  const restore = () => {
    previewing.current = false
    document.body.setAttribute(PALETTE_ATTR, stored.current)
  }
  const preview = (palette: string) => {
    previewing.current = true
    document.body.setAttribute(PALETTE_ATTR, palette)
  }
  const card = (palette: Prefs['palette']) => {
    const swatch = PALETTE_SWATCHES[palette]
    return React.createElement(
      'button',
      {
        key: palette,
        type: 'button',
        className: 'dsh-deepcraft-picker-tile dsh-deepcraft-palette-card',
        'data-palette': palette,
        'data-active': palette === props.prefs.palette ? '' : undefined,
        'aria-pressed': palette === props.prefs.palette ? 'true' : 'false',
        disabled: props.disabled,
        onMouseEnter: () => preview(palette),
        onClick: () => {
          previewing.current = false
          props.write({ palette })
        },
      },
      React.createElement(
        'div',
        { className: 'dsh-deepcraft-palette-tile' },
        swatch === undefined
          ? React.createElement('div', { className: 'dsh-deepcraft-palette-half dsh-deepcraft-palette-host-tile' },
              React.createElement('span', { className: 'dsh-deepcraft-palette-sample' }, 'Aa'))
          : [React.createElement(SwatchHalf, { key: 'light', swatch: swatch.light }), React.createElement(SwatchHalf, { key: 'dark', swatch: swatch.dark })],
      ),
      React.createElement('span', { className: 'dsh-deepcraft-picker-tile-name' }, copy(`palette${palette.charAt(0).toUpperCase()}${palette.slice(1)}` as Parameters<typeof copy>[0])),
    )
  }
  return React.createElement(
    'div',
    { className: 'dsh-deepcraft-picker-tile-grid dsh-deepcraft-palette-options', onMouseLeave: restore },
    ([...SKIN_PALETTES, PALETTE_HOST] as Prefs['palette'][]).map(card),
  )
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
      { value: MATERIAL_REFERENCE, label: copy('materialShadowReference') },
      { value: MATERIAL_SHADOWS_FLAT, label: copy('materialShadowFlat') },
      { value: MATERIAL_HOST, label: copy('materialHost') },
    ]
    const materialMotionOptions: SegmentOption<Prefs['materialMotion']>[] = [
      { value: MATERIAL_REFERENCE, label: copy('materialMotionReference') },
      { value: MATERIAL_HOST, label: copy('materialHost') },
    ]
    const uiOptions: SegmentOption<Prefs['fontUi']>[] = [
      { value: FONT_HOST, label: copy('fontHost') },
      { value: FONT_UI_HARMONY, label: copy('fontHarmony') },
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
          React.createElement(PalettePicker, { prefs, write }),
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
