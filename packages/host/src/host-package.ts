/**
 * The packages the HARNESS itself resolves, not this plugin (D12, D75).
 *
 * The host half keeps no runtime dependency of its own: `schemastery` and
 * `zod` arrive from the host that loads this plugin, and the copy that matters
 * is the one that host instance was built with. Two things keep a plain import
 * from naming it:
 *
 *   - A plugin installed by link (`link:D:/…`) resolves its realpath outside the
 *     profile tree, so Node never walks the profile's `node_modules` and the
 *     plain import fails outright.
 *   - The copy the profile's interception layer would offer can belong to a
 *     DIFFERENT installation (the Desktop bundle's schemastery 3.18.2, which has
 *     no `.volatile()`), and a schema validated by another copy's factory is not
 *     the instance the host validates forms against.
 *
 * The harness always carries these beside its own bin, so it is asked first;
 * normal resolution stays as the fallback for a plainly installed plugin.
 */
import { createRequire } from 'node:module'

/**
 * Resolve one host-provided package.
 *
 * The guarded import is deliberate and carries its reason: the module may be
 * absent, so neither the type check nor the build may require it to be
 * installed, and a throw here would fail this fiber — which also drops the
 * client bundle and the whole skin with it.
 *
 * @param specifier - the package name, kept a value so the build cannot require it.
 * @returns the module, or null when neither the harness nor this plugin can resolve it.
 */
export async function resolveHostPackage(specifier: string): Promise<any> {
  try {
    const anchor = typeof process.argv[1] === 'string' && process.argv[1] !== '' ? process.argv[1] : process.execPath
    return createRequire(anchor)(specifier)
  } catch { /* the anchor carries no copy: try normal resolution */ }
  try {
    return await import(specifier)
  } catch {
    return null
  }
}
