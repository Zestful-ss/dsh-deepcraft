/**
 * changed-paths.mjs — the working tree's changed paths, read once (D66).
 *
 * Two callers ask this question and both need the same answer: the run that
 * picks the unit tests a session's edits reach (`scripts/verify.mjs`) and the
 * rule that refuses an appearance snapshot recorded without the sources that
 * draw the pages (`scripts/ci-scope.mjs`). `git status --porcelain -z` is the
 * one reading — the working tree, because a session edits and runs the gates
 * long before it commits, with untracked files counted so a test written beside
 * its module is reached.
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..', '..')

/**
 * Every path the working tree has changed under `scope`, or the whole tree when
 * no scope is given.
 * @param scope - directories or files to limit the reading to, as `git` takes them.
 * @param options - `{ removed: true }` keeps a deleted path in the answer: the
 *     snapshot rule has to see a file that is gone, while the unit-test picker
 *     wants only files a test can be found beside (the default).
 */
export function changedPaths(...scopeAndOptions) {
  const last = scopeAndOptions[scopeAndOptions.length - 1]
  const options = typeof last === 'object' && last !== null ? last : {}
  const scope = typeof last === 'object' && last !== null ? scopeAndOptions.slice(0, -1) : scopeAndOptions
  const out = execFileSync('git', ['status', '--porcelain', '-z', '--', ...scope], { cwd: ROOT, encoding: 'utf8' })
  const parts = out.split('\0')
  const paths = []
  for (let at = 0; at < parts.length; at += 1) {
    const entry = parts[at]
    if (entry.length === 0) continue
    const status = entry.slice(0, 2)
    const file = entry.slice(3)
    if (file !== '' && (options.removed === true || fs.existsSync(path.join(ROOT, file)))) paths.push(file)
    // A rename or a copy states its original path in the part after this one.
    if (status.includes('R') || status.includes('C')) at += 1
  }
  return paths
}
