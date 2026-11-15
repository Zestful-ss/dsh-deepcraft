import { MASCOT_OFF, MASCOT_PETDEX, MASCOT_SCOPE_ALL } from '../../constants'
import { readPrefs, resolveMascot } from '../../core/prefs'
import { createPetdexMascot } from './petdex'
import { createIslandMascot, isIslandPet } from './island'
import { decodePet, ensurePet } from '../../shared/petdex'
import { loadPetSounds, resetPetSounds } from '../../shared/pet-sound'
import type { PetDescriptor } from '@dsh-deepcraft/contracts/pets'
import type { HostContext } from '@dsh-deepcraft/engine/host'
import type { FeatureUi } from '../../core/feature'
import type manifest from './mascot.manifest'

/**
 * The companion on the composer: the reader's Petdex package, the shipped
 * island character, or none (D80).
 *
 * `brand` means the reader's current pet choice (`chatPet`): an island id
 * draws the packaged still sprite, every other id a Petdex package drawn from
 * its own atlas; `off` retires the composer guest. `mascotScope` decides
 * whether the guest also stands in the conversation. One chat instance is on
 * the page at a time. A package that cannot be fetched or decoded leaves the
 * previous instance in place instead of blanking the corner.
 */
export function install(ctx: HostContext, ui: FeatureUi<typeof manifest>) {
  let petdex: { id: string, player: ReturnType<typeof createPetdexMascot> } | null = null
  /** The package the current request is for, so a pass does not start it twice. */
  let requested: string | null = null
  /** Bumped by every request and teardown; a late answer for an older one is dropped. */
  let generation = 0
  /** The package that failed last, and when: a broken package is retried after a pause, not every pass. */
  let failedId: string | null = null
  let failedAt = 0

  function releaseChat() {
    if (petdex !== null) {
      petdex.player.dispose()
      petdex = null
    }
    requested = null
    failedId = null
    generation += 1
  }

  async function openPetdex(id: string, conversation: boolean) {
    if (requested === id) return
    // An island id answers at once: the sprite ships with the package.
    if (isIslandPet(id)) {
      requested = id
      generation += 1
      try {
        const next = createIslandMascot(ctx, ui, id)
        if (petdex !== null) petdex.player.dispose()
        petdex = { id, player: next }
        petdex.player.sync(conversation)
      } catch (error) {
        // A broken island package names the pet it could not stand up; the
        // previous guest keeps playing and the next pass may try another.
        console.warn(`[dsh-deepcraft] the chat pet "${id}" could not be shown:`, error)
        requested = null
      }
      return
    }
    if (failedId === id && Date.now() - failedAt < 10000) return
    requested = id
    const token = ++generation
    let pet: PetDescriptor
    try {
      pet = await ensurePet(id)
      await decodePet(pet)
    } catch (error) {
      // The previous guest keeps playing; the settings page names the reason
      // for an import it performed itself. A broken package is not fetched
      // again on the next pass.
      console.warn(`[dsh-deepcraft] the chat pet "${id}" could not be loaded:`, error)
      if (token === generation) {
        failedId = id
        failedAt = Date.now()
        requested = null
      }
      return
    }
    if (token !== generation) return
    const prefs = readPrefs()
    if (resolveMascot(prefs) !== MASCOT_PETDEX || prefs.chatPet !== id) return
    failedId = null
    try {
      const next = createPetdexMascot(ctx, ui, pet)
      if (petdex !== null) petdex.player.dispose()
      petdex = { id, player: next }
      // The scope was read before the fetch; the page the mascot lands on is
      // the one the reader sees now.
      petdex.player.sync(prefs.mascotScope === MASCOT_SCOPE_ALL)
    } catch (error) {
      // A malformed package can stand down the whole player: keep the guest
      // that was playing and leave the pick free for another try (D12).
      console.warn(`[dsh-deepcraft] the chat pet "${id}" could not be shown:`, error)
      requested = null
    }
  }

  function sync() {
    const prefs = readPrefs()
    const mascot = resolveMascot(prefs)
    const conversation = prefs.mascotScope === MASCOT_SCOPE_ALL
    if (mascot === MASCOT_PETDEX) {
      if (petdex !== null) petdex.player.sync(conversation)
      void openPetdex(prefs.chatPet, conversation)
    } else if (mascot === MASCOT_OFF) {
      releaseChat()
    }
  }

  function onActivity() {
    petdex?.player.onActivity()
  }

  ui.mascot = { sync, onActivity }
  loadPetSounds()

  return () => {
    releaseChat()
    resetPetSounds()
    delete ui.mascot
  }
}
