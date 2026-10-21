import * as React from 'react'
import { BRAND_DEEPSEEK } from '../../constants'
import { PETDEX_ACTIONS, PETDEX_STATES } from '@dsh-deepcraft/contracts/pets'
import type { PetDescriptor, PetdexState } from '@dsh-deepcraft/contracts/pets'
import {
  decodePet,
  ensurePet,
  importPetArchive,
  importPetFolder,
  importPetLink,
  loadPetLibrary,
  readPetLibrary,
  subscribePetLibrary,
} from '../../shared/petdex'
import type { PetLibrary } from '../../shared/petdex'
import { copy } from '../settings/copy'
import type { SettingsRowView } from '../../core/feature'

/**
 * The Appearance tab's pets (D78): the chat guest's package is read from the
 * current theme's own field, and one import adds complete Petdex packages to
 * the shared library.
 *
 * The preview plays the package's own nine actions, from the untouched atlas.
 * Importing downloads nothing on its own: a folder, a ZIP or a Petdex link is
 * verified and installed by the host half, decoded here, and only then chosen
 * for the chat position of the theme in front.
 */

/** The library, followed live as imports and first-use downloads land. */
function usePetLibrary(): PetLibrary {
  const [library, setLibrary] = React.useState<PetLibrary>({ pets: [], invalid: [] })
  React.useEffect(() => {
    const unsubscribe = subscribePetLibrary(setLibrary)
    // A page that just installed a package reads the library again: the store
    // is per page, and the settings page may already have been open.
    setLibrary(readPetLibrary())
    void loadPetLibrary(true).then(setLibrary, () => undefined)
    return unsubscribe
  }, [])
  return library
}

/** The chat field of the theme in front. */
function chatField(brand: string) {
  return brand === BRAND_DEEPSEEK ? 'chatPetDeepseek' as const : 'chatPetClaude' as const
}

/** One package's nine native actions, played at the author's own frame times. */
function PetPreview(props: { pet: PetDescriptor }) {
  const { pet } = props
  const [action, setAction] = React.useState<PetdexState>('idle')
  const [frame, setFrame] = React.useState(0)
  React.useEffect(() => {
    setFrame(0)
    const durations = PETDEX_ACTIONS[action].frameDurationsMs
    let current = 0
    let timer = 0
    const tick = () => {
      current = (current + 1) % durations.length
      setFrame(current)
      timer = window.setTimeout(tick, durations[current])
    }
    timer = window.setTimeout(tick, durations[0])
    return () => { window.clearTimeout(timer) }
  }, [pet.id, action])
  const scale = 96 / pet.frameWidth
  const native = PETDEX_ACTIONS[action]
  return React.createElement(
    'div',
    { className: 'dsh-deepcraft-settings-pet-preview' },
    React.createElement('div', {
      className: 'dsh-deepcraft-settings-pet-preview-window',
      role: 'img',
      'aria-label': `${pet.displayName}: ${action}`,
      style: {
        width: `${pet.frameWidth * scale}px`,
        height: `${pet.frameHeight * scale}px`,
        backgroundImage: `url("${pet.imageUrl}")`,
        backgroundSize: `${pet.frameWidth * 8 * scale}px ${pet.atlasRows * pet.frameHeight * scale}px`,
        backgroundPosition: `${-frame * pet.frameWidth * scale}px ${-native.row * pet.frameHeight * scale}px`,
      },
    }),
    React.createElement(
      'div',
      { className: 'dsh-deepcraft-settings-pet-actions' },
      PETDEX_STATES.map(state => React.createElement(
        'button',
        {
          key: state,
          type: 'button',
          className: 'dsh-deepcraft-settings-pet-action',
          'data-active': state === action ? '' : undefined,
          'aria-pressed': state === action ? 'true' : 'false',
          onClick: () => { setAction(state) },
        },
        state,
      )),
    ),
  )
}

/** A select over the installed packages, with a value the library no longer holds kept visible. */
function PetSelect(props: {
  pets: PetDescriptor[]
  value: string
  disabled?: boolean
  onPick(value: string): void
}) {
  const known = props.pets.some(pet => pet.id === props.value)
  return React.createElement(
    'select',
    {
      className: 'dsh-deepcraft-settings-pet-select',
      value: props.value,
      disabled: props.disabled === true,
      onChange: (event: React.ChangeEvent<HTMLSelectElement>) => { props.onPick(event.currentTarget.value) },
    },
    known ? null : React.createElement('option', { value: props.value }, props.value),
    props.pets.map(pet => React.createElement('option', { key: pet.id, value: pet.id }, pet.displayName)),
  )
}

/** The current theme's chat guest, with the selected package's actions previewed. */
function ChatPetControl(view: SettingsRowView) {
  const library = usePetLibrary()
  const field = chatField(view.prefs.brand)
  const selected = view.prefs[field]
  const pet = library.pets.find(item => item.id === selected)
  React.useEffect(() => {
    // A preset the reader has never displayed yet is downloaded on first
    // sight, so the picker and the preview can name it.
    if (pet === undefined) void ensurePet(selected).catch(() => undefined)
  }, [pet, selected])
  return React.createElement(
    'div',
    { className: 'dsh-deepcraft-settings-pet-control' },
    React.createElement(PetSelect, {
      pets: library.pets,
      value: selected,
      disabled: view.disabled,
      onPick(value) {
        if (field === 'chatPetDeepseek') view.write({ chatPetDeepseek: value })
        else view.write({ chatPetClaude: value })
      },
    }),
    pet === undefined ? null : React.createElement(PetPreview, { pet }),
  )
}

/** Pack a picked directory into the same uncompressed archive the ZIP path takes. */
function folderInput(): HTMLInputElement {
  const input = document.createElement('input')
  input.type = 'file'
  // `webkitdirectory` is the only directory picker the browser offers; the
  // attribute is not in the DOM types.
  input.setAttribute('webkitdirectory', '')
  input.multiple = true
  return input
}

/** One picker for a file, opened from a button of the page. */
function pickFiles(input: HTMLInputElement): Promise<FileList | null> {
  const { promise, resolve } = Promise.withResolvers<FileList | null>()
  input.addEventListener('change', () => {
    resolve(input.files)
    input.value = ''
  }, { once: true })
  input.addEventListener('cancel', () => { resolve(null) }, { once: true })
  input.click()
  return promise
}

/** Import a complete package from a ZIP, a folder or a Petdex page. */
function ImportPetControl(view: SettingsRowView) {
  const library = usePetLibrary()
  const field = chatField(view.prefs.brand)
  const [busy, setBusy] = React.useState(false)
  const [message, setMessage] = React.useState<string | null>(null)
  const [url, setUrl] = React.useState('')
  const zipInput = React.useRef<HTMLInputElement | null>(null)

  async function finish(work: Promise<PetDescriptor>) {
    setBusy(true)
    setMessage(null)
    try {
      const pet = await work
      await decodePet(pet)
      if (field === 'chatPetDeepseek') view.write({ chatPetDeepseek: pet.id })
      else view.write({ chatPetClaude: pet.id })
      await loadPetLibrary(true)
      setMessage(copy('petImportDone', { name: pet.displayName }))
    } catch (error) {
      setMessage(copy('petImportFailed', { detail: (error as { message?: string } | null)?.message ?? String(error) }))
    } finally {
      setBusy(false)
    }
  }

  return React.createElement(
    'div',
    { className: 'dsh-deepcraft-settings-pet-control' },
    React.createElement(
      'div',
      { className: 'dsh-deepcraft-settings-pet-buttons' },
      React.createElement('button', {
        type: 'button',
        className: 'dsh-deepcraft-settings-pet-button',
        disabled: busy || view.disabled,
        onClick: () => {
          const input = zipInput.current
          if (input === null) return
          void pickFiles(input).then((files) => {
            const file = files?.[0]
            if (file === undefined) return
            void finish(importPetArchive(file))
          })
        },
      }, copy('petImportZip')),
      React.createElement('button', {
        type: 'button',
        className: 'dsh-deepcraft-settings-pet-button',
        disabled: busy || view.disabled,
        onClick: () => {
          const input = folderInput()
          void pickFiles(input).then((files) => {
            if (files === null || files.length === 0) return
            void finish(importPetFolder(files))
          })
        },
      }, copy('petImportFolder')),
      React.createElement('input', { ref: zipInput, type: 'file', accept: '.zip,application/zip', hidden: true }),
    ),
    React.createElement(
      'div',
      { className: 'dsh-deepcraft-settings-pet-buttons' },
      React.createElement('input', {
        type: 'url',
        className: 'dsh-deepcraft-settings-pet-url',
        placeholder: copy('petImportUrlPlaceholder'),
        value: url,
        disabled: busy || view.disabled,
        onChange: (event: React.ChangeEvent<HTMLInputElement>) => { setUrl(event.currentTarget.value) },
      }),
      React.createElement('button', {
        type: 'button',
        className: 'dsh-deepcraft-settings-pet-button',
        disabled: busy || view.disabled || url.trim() === '',
        onClick: () => { void finish(importPetLink(url.trim())) },
      }, copy('petImportLink')),
    ),
    message === null ? null : React.createElement('p', {
      className: 'dsh-deepcraft-settings-pet-status',
      role: 'alert',
    }, message),
    library.invalid.length === 0 ? null : React.createElement('p', {
      className: 'dsh-deepcraft-settings-pet-status',
      role: 'note',
    }, copy('petImportBroken', { count: String(library.invalid.length) })),
  )
}

/** The two rows the mascot manifest places in the Appearance tab. */
export const controls = {
  chatPet: ChatPetControl,
  petImport: ImportPetControl,
}
