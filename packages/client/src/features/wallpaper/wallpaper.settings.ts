import * as React from 'react'
import { WALLPAPER_BLUR_MAX, WALLPAPER_BLUR_MIN, WALLPAPER_BLUR_STEP, WALLPAPER_CUSTOM, WALLPAPER_VISIBILITY_MAX, WALLPAPER_VISIBILITY_MIN, WALLPAPER_VISIBILITY_STEP } from '@dsh-deepcraft/contracts/prefs'
import { WALLPAPER_MAX_BYTES, WALLPAPER_TYPES } from '@dsh-deepcraft/contracts/wallpaper'
import { loadWallpaper, readWallpaper, removeWallpaper, subscribeWallpaper, uploadWallpaper } from '../../shared/custom-wallpaper'
import { featureCopy } from '../../core/i18n'
import COPY from './wallpaper.copy.json'
import type { SettingsRowView } from '../../core/feature'

/**
 * The Appearance tab's wallpaper controls (D72): the file picker under the
 * source row, and the two amount sliders. The values are previewed on the
 * document while the handle moves and written when it lands, so the page in
 * front shows the veil and the blur as the reader judges them.
 */

/** One line of this feature's own interface copy. */
const copy = (key: keyof typeof COPY, params?: { value?: string | number }) => featureCopy(COPY, key, params)

/** The stored file, followed live as uploads and removals land. */
function useWallpaperFile() {
  const [file, setFile] = React.useState(readWallpaper())
  React.useEffect(() => {
    const off = subscribeWallpaper(setFile)
    setFile(readWallpaper())
    void loadWallpaper().then(setFile)
    return off
  }, [])
  return file
}
/**
 * The source row's control: the off / custom choice on one side of the file
 * tile — the preview of the stored image or video, the button that picks a
 * replacement and the reason the last change was refused. The file is held to
 * the accepted formats and size here, so a refusal is said before the bytes
 * travel; the host half checks both again. Picking a file switches the source
 * on, so the choice lands in one move.
 */
function WallpaperSourceControl(props: SettingsRowView) {
  const file = useWallpaperFile()
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const picker = React.useRef<HTMLInputElement>(null)
  const run = (pending: Promise<unknown>) => {
    setBusy(true)
    setError(null)
    pending.then(() => setBusy(false), (reason: { message?: string }) => {
      setBusy(false)
      setError(copy('wallpaperFailed', { value: reason?.message ?? String(reason) }))
    })
  }
  const pick = (event: React.ChangeEvent<HTMLInputElement>) => {
    const picked = event.target.files?.[0]
    event.target.value = ''
    if (picked === undefined) return
    if (WALLPAPER_TYPES[picked.type] === undefined) {
      setError(copy('wallpaperType'))
      return
    }
    if (picked.size > WALLPAPER_MAX_BYTES) {
      setError(copy('wallpaperSize'))
      return
    }
    if (props.prefs.wallpaperSource !== WALLPAPER_CUSTOM) props.write({ wallpaperSource: WALLPAPER_CUSTOM })
    run(uploadWallpaper(picked))
  }
  const custom = props.prefs.wallpaperSource === WALLPAPER_CUSTOM
  return React.createElement(
    'div',
    { className: 'dsh-deepcraft-settings-wallpaper' },
    React.createElement(
      'div',
      { className: 'dsh-deepcraft-settings-wallpaper-top' },
      React.createElement(
        'div',
        { className: 'dsh-deepcraft-settings-wallpaper-preview', 'data-empty': file === null ? '' : undefined },
        file === null
          ? null
          : file.state.video
            ? React.createElement('video', { src: file.url, muted: true, playsInline: true, autoPlay: true, loop: true })
            : React.createElement('img', { src: file.url, alt: '' }),
      ),
      React.createElement(
        'div',
        { className: 'dsh-deepcraft-settings-wallpaper-buttons' },
        React.createElement('input', {
          ref: picker,
          type: 'file',
          accept: Object.keys(WALLPAPER_TYPES).join(','),
          hidden: true,
          onChange: pick,
        }),
        React.createElement('button', {
          type: 'button',
          className: 'dsh-deepcraft-settings-wallpaper-button',
          disabled: busy || props.disabled,
          onClick: () => picker.current!.click(),
        }, file === null ? copy('wallpaperUpload') : copy('wallpaperReplace')),
        file === null ? null : React.createElement('button', {
          type: 'button',
          className: 'dsh-deepcraft-settings-wallpaper-button',
          disabled: busy || props.disabled,
          onClick: () => run(removeWallpaper()),
        }, copy('wallpaperRemove')),
      ),
    ),
    React.createElement(
      'div',
      { className: 'dsh-deepcraft-settings-wallpaper-source' },
      React.createElement(
        'div',
        { className: 'dsh-deepcraft-segments', role: 'group' },
        React.createElement('button', {
          type: 'button',
          className: 'dsh-deepcraft-segment',
          disabled: props.disabled,
          'data-active': custom ? undefined : '',
          'aria-pressed': custom ? 'false' : 'true',
          onClick: () => { if (custom) props.write({ wallpaperSource: 'off' }) },
        }, copy('wallpaperOff')),
        React.createElement('button', {
          type: 'button',
          className: 'dsh-deepcraft-segment',
          disabled: props.disabled,
          'data-active': custom ? '' : undefined,
          'aria-pressed': custom ? 'true' : 'false',
          onClick: () => { if (!custom) props.write({ wallpaperSource: WALLPAPER_CUSTOM }) },
        }, copy('wallpaperCustom')),
      ),
      custom ? null : React.createElement('span', { className: 'dsh-deepcraft-settings-wallpaper-off' }, copy('wallpaperFileDesc')),
    ),
    error === null ? null : React.createElement('div', { className: 'dsh-deepcraft-settings-wallpaper-error', role: 'alert' }, error),
  )
}


/**
 * One amount: a range input over the preference's declared bounds, with the
 * value beside it. Dragging previews on the document's own custom property,
 * which the next adopted preference set rewrites; the write lands on release
 * (or on a keyboard step, which fires `change` already).
 */
function AmountControl(props: SettingsRowView & {
  pref: 'wallpaperVisibility' | 'wallpaperBlur'
  min: number
  max: number
  step: number
  property: string
  unit: '' | 'px'
  format(value: number): string
}) {
  const stored = props.prefs[props.pref]
  const [draft, setDraft] = React.useState<number | null>(null)
  React.useEffect(() => setDraft(null), [stored])
  const shown = draft ?? stored
  const preview = (value: number) => {
    setDraft(value)
    document.body.style.setProperty(props.property, `${value}${props.unit}`)
  }
  return React.createElement(
    'div',
    { className: 'dsh-deepcraft-settings-wallpaper-amount' },
    React.createElement('input', {
      type: 'range',
      className: 'dsh-deepcraft-settings-wallpaper-slider',
      min: props.min,
      max: props.max,
      step: props.step,
      value: shown,
      disabled: props.disabled,
      onChange: (event: React.ChangeEvent<HTMLInputElement>) => preview(Number(event.target.value)),
      onPointerUp: () => {
        if (draft !== null) props.write({ [props.pref]: draft })
      },
      onKeyUp: (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) {
          props.write({ [props.pref]: Number(event.currentTarget.value) })
        }
      },
      onBlur: () => {
        if (draft !== null) props.write({ [props.pref]: draft })
      },
    }),
    React.createElement('span', { className: 'dsh-deepcraft-settings-wallpaper-value' }, props.format(shown)),
  )
}

/** The controls one feature's settings rows draw themselves (D72). */
export const controls = {
  wallpaperSource: WallpaperSourceControl,
  wallpaperVisibility: (props: SettingsRowView) => React.createElement(AmountControl, {
    ...props,
    pref: 'wallpaperVisibility',
    min: WALLPAPER_VISIBILITY_MIN,
    max: WALLPAPER_VISIBILITY_MAX,
    step: WALLPAPER_VISIBILITY_STEP,
    property: '--dsh-deepcraft-wallpaper-visibility',
    unit: '',
    format: value => copy('wallpaperPercent', { value: Math.round(value * 100) }),
  }),
  wallpaperBlur: (props: SettingsRowView) => React.createElement(AmountControl, {
    ...props,
    pref: 'wallpaperBlur',
    min: WALLPAPER_BLUR_MIN,
    max: WALLPAPER_BLUR_MAX,
    step: WALLPAPER_BLUR_STEP,
    property: '--dsh-deepcraft-wallpaper-blur',
    unit: 'px',
    format: value => copy('wallpaperPixels', { value }),
  }),
}
