import { PACKAGE_NAME } from '@dsh-deepcraft/contracts/package'
import { createCacheFiles } from '@dsh-deepcraft/engine/node/cache-file'

/** This plugin's derived cache files (packages/engine/node/cache-file.ts). */
export const { cachePath, readJsonDocument, writeJsonDocument } = createCacheFiles(PACKAGE_NAME)
