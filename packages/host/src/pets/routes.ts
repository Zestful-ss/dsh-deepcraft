/**
 * The pets routes (D78): the library the official desktop player can see, the
 * three ways a complete package arrives, and the desktop player's status.
 *
 * Every route runs the same request fence as the rest of the plugin's private
 * routes, answers with the refusal's own status and never with a filesystem
 * path. An import either installs a complete package or changes nothing.
 */
import { PET_ARCHIVE_MAX_BYTES, isPetId } from '@dsh-deepcraft/contracts/pets'
import type { DesktopPetSelection } from '@dsh-deepcraft/contracts/pets'
import {
  PETS_DESKTOP_PATH,
  PETS_DESKTOP_SYNC_PATH,
  PETS_ENSURE_PATH,
  PETS_IMAGE_PATH,
  PETS_IMPORT_PATH,
  PETS_IMPORT_URL_PATH,
  PETS_PATH,
} from '@dsh-deepcraft/contracts/routes'
import type { DshContext, DshRequest, DshResponse, DshRoute } from '@dsh-deepcraft/engine/node/dsh'
import { fenceRefused, methodRefused, readRequestBody, sendJson } from '@dsh-deepcraft/engine/node/http'
import { desktopPetStatus, syncDesktopPets } from './desktop.js'
import { PetRefusal } from './errors.js'
import { ensurePreset, importFromPetdex, importZip, listPets, readPetImage } from './library.js'

/** Largest body a JSON request may carry; every one of them is two short fields. */
const JSON_BODY_MAX = 8 * 1024
/** Newline or quote in a request is the client's error; the images are addressed by id. */
const ID_IN_PATH_RE = /^([a-z0-9][a-z0-9-]{0,62})$/

/**
 * One JSON request body.
 *
 * @returns the parsed object, or a refusal when the body is oversized or not an object.
 */
async function jsonBody(req: DshRequest): Promise<Record<string, unknown>> {
  const raw = await readRequestBody(req, JSON_BODY_MAX)
  if (raw === null) throw new PetRefusal(`the request is larger than ${JSON_BODY_MAX} bytes`, 413)
  let body: unknown
  try {
    body = JSON.parse(raw.toString('utf8'))
  } catch {
    throw new PetRefusal('the request is not JSON', 400)
  }
  if (body === null || typeof body !== 'object' || Array.isArray(body)) throw new PetRefusal('the request is not a JSON object', 400)
  return body as Record<string, unknown>
}

/** Answer one refusal: a `PetRefusal` keeps its status and message, anything else is a 500. */
function sendFailure(res: DshResponse, error: unknown, fallback: string) {
  if (error instanceof PetRefusal) {
    sendJson(res, error.status, { ok: false, error: error.message })
    return
  }
  sendJson(res, 500, { ok: false, error: fallback })
}

/** Answer one promise: a refusal keeps its status and message, any other failure is a 500. */
function answer(res: DshResponse, promise: Promise<object>) {
  void promise.then((payload) => {
    sendJson(res, 200, { ok: true, ...payload })
  }, (error: unknown) => {
    sendFailure(res, error, (error as { message?: string } | null)?.message ?? String(error))
  })
}

/** The fence and method check every route here runs first. */
function guarded(ctx: DshContext, req: DshRequest, res: DshResponse, methods: string[]) {
  return methodRefused(req, res, methods) || fenceRefused(ctx, req, res)
}

/**
 * The pets routes, for the caller to register one by one.
 *
 * @param ctx - host plugin context.
 */
export function petRoutes(ctx: DshContext): { label: string, route: DshRoute }[] {
  return [{
    label: 'pets library',
    route: {
      kind: 'exact',
      path: PETS_PATH,
      handler: (req: DshRequest, res: DshResponse) => {
        if (guarded(ctx, req, res, ['GET', 'HEAD'])) return
        answer(res, listPets())
      },
    },
  }, {
    label: 'pet ensure',
    route: {
      kind: 'exact',
      path: PETS_ENSURE_PATH,
      handler: (req: DshRequest, res: DshResponse) => {
        if (guarded(ctx, req, res, ['POST'])) return
        answer(res, jsonBody(req).then((body) => {
          if (typeof body.id !== 'string' || !isPetId(body.id)) throw new PetRefusal('the request names no pet id', 400)
          return ensurePreset(body.id).then(pet => ({ pet }))
        }))
      },
    },
  }, {
    label: 'pet import',
    route: {
      kind: 'exact',
      path: PETS_IMPORT_PATH,
      handler: (req: DshRequest, res: DshResponse) => {
        if (guarded(ctx, req, res, ['POST'])) return
        const type = String(req.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase()
        if (type !== 'application/zip' && type !== 'application/x-zip-compressed') {
          sendJson(res, 415, { ok: false, error: 'the import must be a ZIP archive' })
          return
        }
        answer(res, readRequestBody(req, PET_ARCHIVE_MAX_BYTES).then((raw) => {
          if (raw === null) throw new PetRefusal(`the archive is larger than ${PET_ARCHIVE_MAX_BYTES} bytes`, 413)
          return importZip(new Uint8Array(raw)).then(pet => ({ pet }))
        }))
      },
    },
  }, {
    label: 'pet import link',
    route: {
      kind: 'exact',
      path: PETS_IMPORT_URL_PATH,
      handler: (req: DshRequest, res: DshResponse) => {
        if (guarded(ctx, req, res, ['POST'])) return
        answer(res, jsonBody(req).then((body) => {
          if (typeof body.url !== 'string') throw new PetRefusal('the request names no Petdex link', 400)
          return importFromPetdex(body.url).then(pet => ({ pet }))
        }))
      },
    },
  }, {
    label: 'pet image',
    route: {
      kind: 'prefix',
      path: PETS_IMAGE_PATH,
      handler: (req: DshRequest, res: DshResponse) => {
        if (guarded(ctx, req, res, ['GET', 'HEAD'])) return
        const sub = new URL(req.url ?? '/', 'http://local').pathname.slice(PETS_IMAGE_PATH.length)
        const match = /^\/([^/]+)$/.exec(sub)
        let name = ''
        try {
          name = match === null ? '' : decodeURIComponent(match[1])
        } catch {
          // A malformed escape is no pet name; the 404 below is the answer.
        }
        if (!ID_IN_PATH_RE.test(name)) {
          sendJson(res, 404, { ok: false, error: 'no such pet' })
          return
        }
        void readPetImage(name).then(({ bytes, type }) => {
          res.writeHead(200, {
            'content-type': type === 'png' ? 'image/png' : 'image/webp',
            'content-length': String(bytes.byteLength),
            // The address carries the content version, so a hit is the same bytes.
            'cache-control': 'private, max-age=31536000, immutable',
            'x-content-type-options': 'nosniff',
          })
          res.end(req.method === 'HEAD' ? undefined : Buffer.from(bytes))
        }, (error: unknown) => {
          sendFailure(res, error, 'the image could not be read')
        })
      },
    },
  }, {
    label: 'desktop pet status',
    route: {
      kind: 'exact',
      path: PETS_DESKTOP_PATH,
      handler: (req: DshRequest, res: DshResponse) => {
        if (guarded(ctx, req, res, ['GET', 'HEAD'])) return
        sendJson(res, 200, { ok: true, status: desktopPetStatus() })
      },
    },
  }, {
    label: 'desktop pet sync',
    route: {
      kind: 'exact',
      path: PETS_DESKTOP_SYNC_PATH,
      handler: (req: DshRequest, res: DshResponse) => {
        if (guarded(ctx, req, res, ['POST'])) return
        void jsonBody(req).then((body) => {
          if (typeof body.enabled !== 'boolean') throw new PetRefusal('the request carries no enabled flag', 400)
          if (typeof body.petId !== 'string' || !isPetId(body.petId)) throw new PetRefusal('the request names no pet id', 400)
          const selection: DesktopPetSelection = { enabled: body.enabled, petId: body.petId }
          sendJson(res, 200, { ok: true, status: syncDesktopPets(ctx, selection) })
        }, (error: unknown) => {
          sendFailure(res, error, 'the request could not be read')
        })
      },
    },
  }]
}
