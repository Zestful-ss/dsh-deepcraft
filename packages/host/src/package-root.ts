import { PACKAGE_NAME } from '@dsh-deepcraft/contracts/package'
import { findPackageRoot } from '@dsh-deepcraft/engine/node/package-root'

let cached: string | null = null

/** @returns the plugin package's directory, found once from this module's location. */
export function packageRoot() {
  cached ??= findPackageRoot(import.meta.url, PACKAGE_NAME)
  return cached
}
