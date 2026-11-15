import * as React from 'react'
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
import { loadPetSounds, readPetSounds, subscribePetSounds, uploadPetSound, removePetSound } from '../../shared/pet-sound'
import type { PetSoundEvent, PetSounds } from '../../shared/pet-sound'
import { previewPetSound } from './pet-sound'
import { PET_SOUND_CHOICES, PET_SOUND_CUSTOM, PET_SOUND_OFF } from '@dsh-deepcraft/contracts/prefs'
import { PET_SOUND_TYPES } from '@dsh-deepcraft/contracts/pet-sound'
import type { PetLibrary } from '../../shared/petdex'
import { ISLAND_PETS } from './island'
import { copy } from '../settings/copy'
import type { CopyKey } from '../settings/copy'
import type { SettingsRowView } from '../../core/feature'

/**
 * The Appearance tab's pets (D80): the chat guest's package is read from the
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

/** A select over the shipped island characters and the installed packages, with a value the library no longer holds kept visible. */
function PetSelect(props: {
  pets: PetDescriptor[]
  value: string
  disabled?: boolean
  onPick(value: string): void
}) {
  const known = ISLAND_PETS.includes(props.value as typeof ISLAND_PETS[number]) || props.pets.some(pet => pet.id === props.value)
  return React.createElement(
    'select',
    {
      className: 'dsh-deepcraft-settings-pet-select',
      value: props.value,
      disabled: props.disabled === true,
      onChange: (event: React.ChangeEvent<HTMLSelectElement>) => { props.onPick(event.currentTarget.value) },
    },
    known ? null : React.createElement('option', { value: props.value }, props.value),
    ISLAND_PETS.map(id => React.createElement('option', { key: id, value: id }, copy(`petIsland_${id}`))),
    props.pets.map(pet => React.createElement('option', { key: pet.id, value: pet.id }, pet.displayName)),
  )
}

/** The chat guest, its selected package's actions previewed, and the import controls beside them. */
function ChatPetControl(view: SettingsRowView) {
  const library = usePetLibrary()
  const selected = view.prefs.chatPet
  const pet = library.pets.find(item => item.id === selected)
  React.useEffect(() => {
    // A preset the reader has never displayed yet is downloaded on first
    // sight, so the picker and the preview can name it.
    if (pet === undefined && !ISLAND_PETS.includes(selected as typeof ISLAND_PETS[number])) void ensurePet(selected).catch(() => undefined)
  }, [pet, selected])
  return React.createElement(
    'div',
    { className: 'dsh-deepcraft-settings-pet-control' },
    React.createElement(PetSelect, {
      pets: library.pets,
      value: selected,
      disabled: view.disabled,
      onPick(value) {
        view.write({ chatPet: value })
      },
    }),
    React.createElement(PetSoundControl, view),
    pet === undefined ? null : React.createElement(PetPreview, { pet }),
    React.createElement(ImportPetControl, view),
  )
}

/**
 * Per-event sound picks: each moment takes a bundled tone, `off`, or the
 * reader's own uploaded file the host half stores (pet-sound contract). The
 * preview button plays the current pick; the upload button names a file for
 * `custom`, and picking `custom` without a file yet arms the upload.
 */
function PetSoundControl(view: SettingsRowView) {
  const [, setSounds] = React.useState<PetSounds | null>(null)
  React.useEffect(() => {
    const unsubscribe = subscribePetSounds(setSounds)
    loadPetSounds()
    return unsubscribe
  }, [])
  const fileInput = React.useRef<HTMLInputElement | null>(null)
  const pending = React.useRef<PetSoundEvent | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  function writePick(event: PetSoundEvent, value: string) {
    view.write({ [event === 'error' ? 'petSoundError' : 'petSoundAttention']: value })
  }

  function eventRow(event: PetSoundEvent, labelKey: CopyKey) {
    const choice = event === 'error' ? view.prefs.petSoundError : view.prefs.petSoundAttention
    const stored = readPetSounds()[event]
    return React.createElement('div', { key: event, className: 'dsh-deepcraft-settings-pet-sound-row' },
      React.createElement('span', { className: 'dsh-deepcraft-settings-pet-sound-label' }, copy(labelKey)),
      React.createElement('select', {
        className: 'dsh-deepcraft-settings-pet-sound-select',
        value: choice,
        disabled: view.disabled,
        onChange: (change: React.ChangeEvent<HTMLSelectElement>) => { writePick(event, change.currentTarget.value) },
      },
        PET_SOUND_CHOICES.map(id => React.createElement('option', { key: id, value: id }, copy(`petSound_${id}`))),
      ),
      React.createElement('button', {
        type: 'button',
        className: 'dsh-deepcraft-settings-pet-button',
        disabled: view.disabled || choice === PET_SOUND_OFF,
        'aria-label': copy('petSoundPreview', { event: copy(labelKey) }),
        title: copy('petSoundPreview', { event: copy(labelKey) }),
        onClick: () => { previewPetSound(choice, event) },
      }, '▶'),
      choice !== PET_SOUND_CUSTOM ? null : React.createElement(React.Fragment, null,
        React.createElement('button', {
          type: 'button',
          className: 'dsh-deepcraft-settings-pet-button',
          disabled: view.disabled,
          onClick: () => { pending.current = event; fileInput.current?.click() },
        }, copy(stored === null ? 'petSoundUpload' : 'petSoundReplace')),
        stored === null ? null : React.createElement('button', {
          type: 'button',
          className: 'dsh-deepcraft-settings-pet-button',
          disabled: view.disabled,
          onClick: () => { void removePetSound(event).catch(() => setError(copy('petSoundFailed'))) },
        }, copy('petSoundRemove')),
      ),
    )
  }

  return React.createElement('div', { className: 'dsh-deepcraft-settings-pet-sound' },
    React.createElement('div', { className: 'dsh-deepcraft-settings-pet-sound-title' }, copy('petSounds')),
    eventRow('attention', 'petSoundAttention'),
    eventRow('error', 'petSoundError'),
    React.createElement('input', {
      ref: fileInput,
      type: 'file',
      accept: Object.keys(PET_SOUND_TYPES).join(','),
      hidden: true,
      onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.currentTarget.files?.[0]
        event.currentTarget.value = ''
        const target = pending.current
        pending.current = null
        if (file === undefined || target === null) return
        setError(null)
        void uploadPetSound(target, file).catch(() => setError(copy('petSoundFailed')))
      },
    }),
    error === null ? null : React.createElement('p', {
      className: 'dsh-deepcraft-settings-pet-status',
      role: 'alert',
    }, error),
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
  const onChange = () => {
    input.removeEventListener('cancel', onCancel)
    resolve(input.files)
    input.value = ''
  }
  const onCancel = () => {
    // The other side stays armed through a cancel: the next pick's handler
    // would see a stale change listener empty the selection first.
    input.removeEventListener('change', onChange)
    resolve(null)
  }
  input.addEventListener('change', onChange, { once: true })
  input.addEventListener('cancel', onCancel, { once: true })
  input.click()
  return promise
}

/** Import a complete package from a ZIP, a folder or a Petdex page. */
function ImportPetControl(view: SettingsRowView) {
  const library = usePetLibrary()
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
      view.write({ chatPet: pet.id })
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

/** The row the mascot manifest places in the Appearance tab. */
export const controls = {
  chatPet: ChatPetControl,
}
