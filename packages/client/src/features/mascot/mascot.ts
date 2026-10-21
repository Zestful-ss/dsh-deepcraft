import { MASCOT_CRAB, MASCOT_DEEPY, MASCOT_OFF, MASCOT_PETDEX, MASCOT_SCOPE_ALL } from '../../constants'
import { readPrefs, resolveMascot, resolveThemePet } from '../../core/prefs'
import { createMascotCrab } from './crab'
import { createMascotWhale } from './whale'
import { createPetdexMascot } from './petdex'
import { decodePet, ensurePet } from '../../shared/petdex'
import type { PetDescriptor } from '@dsh-deepcraft/contracts/pets'
import type { HostContext } from '@dsh-deepcraft/engine/host'
import type { FeatureUi } from '../../core/feature'
import type manifest from './mascot.manifest'

/**
 * The companion on the composer: chosen per theme and following its own switch
 * (D78).
 *
 * `brand` means the theme's Petdex package (crab-buddy under Claude, whaledou
 * under DeepSeek), drawn from its own atlas. The two original characters stay
 * selectable by hand, and `off` retires the composer guest. `mascotScope` still
 * decides whether the composer guest also stands in the conversation.
 *
 * One chat instance is on the page at a time. A package that cannot be
 * fetched or decoded leaves the previous instance in place instead of
 * blanking the corner.
 */
export function install(ctx: HostContext, ui: FeatureUi<typeof manifest>) {
  const crab = createMascotCrab(ctx, ui)
  const whale = createMascotWhale(ctx, ui)
  let petdex: { id: string, player: ReturnType<typeof createPetdexMascot> } | null = null
  /** The package the current request is for, so a pass does not start it twice. */
  let requested: string | null = null
  /** Bumped by every request and teardown; a late answer for an older one is dropped. */
  let generation = 0
  /** The package that failed last, and when: a broken package is retried after a pause, not every pass. */
  let failedId: string | null = null
  let failedAt = 0

  function releaseChat() {
    crab.release()
    whale.release()
    if (petdex !== null) {
      petdex.player.dispose()
      petdex = null
    }
    requested = null
    generation += 1
  }

  async function openPetdex(id: string, conversation: boolean) {
    if (requested === id) return
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
      failedId = id
      failedAt = Date.now()
      if (token === generation) requested = null
      return
    }
    if (token !== generation) return
    const prefs = readPrefs()
    if (resolveMascot(prefs) !== MASCOT_PETDEX || resolveThemePet(prefs) !== id) return
    failedId = null
    if (petdex !== null) petdex.player.dispose()
    petdex = { id, player: createPetdexMascot(ctx, ui, pet) }
    petdex.player.sync(conversation)
  }

  function sync() {
    const prefs = readPrefs()
    const mascot = resolveMascot(prefs)
    const conversation = prefs.mascotScope === MASCOT_SCOPE_ALL
    if (mascot === MASCOT_CRAB) {
      crab.sync(conversation)
      whale.release()
      if (petdex !== null) { petdex.player.release(); petdex.player.dispose(); petdex = null }
      requested = null
      generation += 1
    } else if (mascot === MASCOT_DEEPY) {
      whale.sync(conversation)
      crab.release()
      if (petdex !== null) { petdex.player.release(); petdex.player.dispose(); petdex = null }
      requested = null
      generation += 1
    } else if (mascot === MASCOT_PETDEX) {
      crab.release()
      whale.release()
      if (petdex !== null) petdex.player.sync(conversation)
      void openPetdex(resolveThemePet(prefs), conversation)
    } else if (mascot === MASCOT_OFF) {
      releaseChat()
    }
  }

  function onActivity() {
    crab.onActivity()
    whale.onActivity()
    petdex?.player.onActivity()
  }

  ui.mascot = { sync, onActivity }

  return () => {
    releaseChat()
    crab.dispose()
    whale.dispose()
    delete ui.mascot
  }
}
