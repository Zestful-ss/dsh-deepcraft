/**
 * The plugin's private route names, shared by both halves (D73): the host half
 * registers them under this prefix and the browser half addresses them, so
 * every path is declared once.
 */

/** Route prefix this plugin owns. */
export const ROUTE_PREFIX = '/dsh-deepcraft'

/**
 * Session deletion. The harness gives the browser half no deletion API of its
 * own, so the archived row's delete button posts one session id here and the
 * host half removes the stored session directory and drops the id from the
 * workspace registry's archive set.
 */
export const SESSION_DELETE_PATH = `${ROUTE_PREFIX}/session-delete`

/**
 * Cross-session usage roll-up for the home dashboard: the browser half cannot
 * reach the host's `sessionQuery` service or read the cost-meter ledger, so the
 * day buckets are assembled on the host half and handed over as one small JSON
 * document.
 */
export const USAGE_PATH = `${ROUTE_PREFIX}/usage`

/**
 * The reader's own brand images (D80): `GET` answers which of them are in
 * place, each with a version that changes with its bytes.
 */
export const BRAND_PATH = `${ROUTE_PREFIX}/brand`

/** The custom mark's bytes: `GET` serves them, `PUT` replaces them, `DELETE` removes them. */
export const BRAND_MARK_PATH = `${ROUTE_PREFIX}/brand/mark`

/** The custom wordmark's bytes, answered the same three ways as the mark. */
export const BRAND_WORDMARK_PATH = `${ROUTE_PREFIX}/brand/wordmark`

/** The installed pets, as descriptors; the host half owns the directories. */
export const PETS_PATH = `${ROUTE_PREFIX}/pets`

/** `POST { id }`: the descriptor of an installed preset, downloaded on first use. */
export const PETS_ENSURE_PATH = `${PETS_PATH}/ensure`

/** `POST` one ZIP archive: a complete package installed byte for byte. */
export const PETS_IMPORT_PATH = `${PETS_PATH}/import`

/** `POST { url }`: a Petdex pet page, resolved through the official public catalog. */
export const PETS_IMPORT_URL_PATH = `${PETS_PATH}/import-url`

/**
 * One session's subagent route selection: `GET ?session=<id>` answers the
 * routes the session's composition allows and the routes the reader picked,
 * `POST { session, routes }` replaces the pick (an empty list clears it). The
 * official `subagent` tool takes the same provider/model pair, and the host
 * half's guard reads this record, so the two cannot be written apart.
 */
export const SUBAGENT_MODELS_PATH = `${ROUTE_PREFIX}/subagent-models`

/** `GET <id>?v=<version>`: one pet's untouched atlas. */
export const PETS_IMAGE_PATH = `${PETS_PATH}/image`

/**
 * The reader's own wallpaper: `GET` answers whether one is in place, with a
 * version that changes with its bytes (packages/host/src/wallpaper.ts).
 */
export const WALLPAPER_PATH = `${ROUTE_PREFIX}/wallpaper`

/** The wallpaper file's bytes: `GET`/`HEAD` serves them (with `Range` for the video), `PUT` replaces them, `DELETE` removes them. */
export const WALLPAPER_FILE_PATH = `${WALLPAPER_PATH}/file`
