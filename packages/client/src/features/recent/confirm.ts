import { closeOtherPopovers, positionAnchoredPopover, registerPopover, unregisterPopover } from '../../shared/popover'
import { deleteSession } from './delete-session'
import { copy } from './copy'

/**
 * The delete confirmation (D85).
 *
 * A destructive action gets its own card rather than riding the host's session
 * menu: the card is the skin's, mounted on the body beside the row's trash
 * button, and it states what is lost before anything is sent. Escape or a press
 * outside cancels; the confirm button carries the wait and then reports what the
 * host half answered. A conversation the host still holds open is named there,
 * not deleted: its running turn keeps its store.
 */

/** The card's own name in the shared popover registry: two skin cards never share the screen. */
const POPOVER = 'session-delete'

/** One pending confirmation, while its card is on the page. */
interface Pending {
  card: HTMLElement
  close(): void
}

/** The confirmation on the page, if one is open. */
let pending: Pending | null = null

/** Close the open confirmation, if any. */
export function closeDeleteConfirmation() {
  pending?.close()
}

/**
 * Ask before deleting one conversation.
 *
 * @param options.anchor - the row's own button, which the card is placed against.
 * @param options.title - the conversation's title, as the card and its label say it.
 * @param options.sessionId - the conversation the confirm button deletes.
 * @param options.onDeleted - called once the host half has removed the record.
 */
export function confirmDelete(options: { anchor: HTMLElement, title: string, sessionId: string, onDeleted(): void }) {
  closeDeleteConfirmation()
  closeOtherPopovers(POPOVER)
  const card = document.createElement('div')
  card.className = 'dsh-deepcraft-popover-card dsh-deepcraft-session-delete-card'
  card.setAttribute('role', 'dialog')
  card.setAttribute('aria-label', copy('deleteTitle'))
  const body = document.createElement('div')
  body.className = 'dsh-deepcraft-popover-body'
  const note = document.createElement('p')
  note.className = 'dsh-deepcraft-session-delete-note'
  note.textContent = copy('deleteNote', { title: options.title })
  const actions = document.createElement('div')
  actions.className = 'dsh-deepcraft-session-delete-actions'
  const cancel = document.createElement('button')
  cancel.type = 'button'
  cancel.className = 'dsh-deepcraft-session-delete-button'
  cancel.textContent = copy('deleteCancel')
  const remove = document.createElement('button')
  remove.type = 'button'
  remove.className = 'dsh-deepcraft-session-delete-button dsh-deepcraft-session-delete-danger'
  remove.textContent = copy('deleteConfirm')
  actions.append(cancel, remove)
  body.append(note, actions)
  card.append(body)
  document.body.append(card)

  /** Take the card down and give the page back its listeners. */
  function close() {
    document.removeEventListener('pointerdown', onOutside, true)
    document.removeEventListener('keydown', onKey, true)
    unregisterPopover(POPOVER)
    card.remove()
    if (pending?.card === card) pending = null
    options.anchor.focus()
  }
  function onOutside(event: Event) {
    if (!card.contains(event.target as Node)) close()
  }
  function onKey(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault()
      close()
    }
  }
  cancel.addEventListener('click', () => close())
  remove.addEventListener('click', () => {
    if (remove.hasAttribute('data-busy')) return
    remove.setAttribute('data-busy', '')
    note.textContent = copy('deleteNote', { title: options.title })
    void deleteSession(options.sessionId).then((outcome) => {
      if (outcome.kind === 'open') {
        remove.removeAttribute('data-busy')
        note.textContent = copy('deleteOpen')
        return
      }
      options.onDeleted()
      close()
    }, (error: unknown) => {
      remove.removeAttribute('data-busy')
      note.textContent = copy('deleteFailed', { value: error instanceof Error ? error.message : String(error) })
    })
  })

  pending = { card, close: () => close() }
  registerPopover(POPOVER, () => close())
  document.addEventListener('pointerdown', onOutside, true)
  document.addEventListener('keydown', onKey, true)
  positionAnchoredPopover(options.anchor, card)
  card.setAttribute('data-open', 'true')
  cancel.focus()
}
