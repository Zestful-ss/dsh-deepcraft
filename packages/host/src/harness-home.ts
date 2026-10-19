import { PACKAGE_NAME } from '@dsh-deepcraft/contracts/package'
import type { DshContext } from '@dsh-deepcraft/engine/node/dsh'
import { harnessPath } from '@dsh-deepcraft/engine/node/harness-home'

/**
 * One path inside this plugin's own directory in the harness home, which holds
 * everything of ours that lives beside the host's own stores: the reader's
 * dropped-in fonts and brand images, and the usage record.
 *
 * @param ctx - host plugin context.
 * @param segments - path segments under the plugin's directory.
 * @returns the resolved path.
 */
export function pluginPath(ctx: DshContext, ...segments: string[]): string {
  return harnessPath(ctx, PACKAGE_NAME, ...segments)
}
