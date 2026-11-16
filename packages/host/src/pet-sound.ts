/**
 * The reader's own pet notification sounds, kept under the harness home's
 * `dsh-deepcraft/pet-sounds/` as `<event>.<ext>` — one custom file per event.
 *
 * The status route answers which events carry a file and each one's version;
 * the file route serves, replaces and removes the bytes (D75), addressed as
 * `/dsh-deepcraft/pet-sounds/file?event=<attention|error>`.
 */
import { PET_SOUND_EVENTS, PET_SOUND_MAX_BYTES, PET_SOUND_TYPES } from '@dsh-deepcraft/contracts/pet-sound'
import type { PetSoundAnswer, PetSoundEvent, PetSoundState } from '@dsh-deepcraft/contracts/pet-sound'
import { PET_SOUNDS_PATH, PET_SOUND_FILE_PATH } from '@dsh-deepcraft/contracts/routes'
import type { DshContext, DshRequest, DshResponse, DshRoute } from '@dsh-deepcraft/engine/node/dsh'
import { createMediaStore, mediaFileRoute, mediaStatusRoute } from './media-store.js'
import type { MediaFile } from './media-store.js'

const OPTIONS = {
  dir: 'pet-sounds',
  types: PET_SOUND_TYPES,
  maxBytes: PET_SOUND_MAX_BYTES,
} as const

/** The `event` query parameter must name a known sound event. */
function eventOf(req: DshRequest): PetSoundEvent | null {
  const value = new URL(req.url ?? '/', 'http://local').searchParams.get('event')
  return PET_SOUND_EVENTS.includes(value as PetSoundEvent) ? (value as PetSoundEvent) : null
}

/**
 * The pet-sound routes, for the caller to register one by one.
 *
 * @param ctx - host plugin context.
 * @returns each route with the label its registration failure is reported under.
 */
export function petSoundRoutes(ctx: DshContext): { label: string, route: DshRoute }[] {
  const store = createMediaStore<PetSoundEvent>(ctx, OPTIONS)
  const stateOf = (file: MediaFile | null): PetSoundState | null =>
    file === null ? null : { type: file.type, version: file.version }
  const answer = (): PetSoundAnswer => ({
    ok: true,
    sounds: Object.fromEntries(PET_SOUND_EVENTS.map(event => [event, stateOf(store.find(event))])) as PetSoundAnswer['sounds'],
  })

  const status: DshRoute = { kind: 'exact', path: PET_SOUNDS_PATH, handler: mediaStatusRoute(ctx, answer) }
  const file: DshRoute = {
    kind: 'exact',
    path: PET_SOUND_FILE_PATH,
    handler: (req: DshRequest, res: DshResponse) => {
      const event = eventOf(req)
      if (event === null) {
        res.writeHead(400, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ ok: false, error: 'unknown sound event' }))
        return
      }
      mediaFileRoute(ctx, store, OPTIONS, event, answer)(req, res)
    },
  }
  return [
    { label: 'pet sounds status', route: status },
    { label: 'pet sound file', route: file },
  ]
}
