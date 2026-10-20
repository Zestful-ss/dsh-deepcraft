/**
 * The small supervisor between the host half and the official player (D78).
 *
 * It exists so the native player has an owner that outlives no more than the
 * host half: when this process is asked to stop, or its IPC channel to the
 * host disappears because DSH exited, it terminates the child it started.
 * Closing the window, choosing the pet and the player's own settings stay
 * with the official program.
 */
import { spawn } from 'node:child_process'
import type { ChildProcess } from 'node:child_process'

/** The argument that makes the built host module run as this worker. */
export const WORKER_FLAG = '--dsh-deepcraft-pet-worker'

interface StartMessage {
  type: 'start'
  executable: string
  petId: string
}

type WorkerMessage = StartMessage | { type: 'stop' }

let child: ChildProcess | null = null
let stopping = false

function stopChild() {
  if (child === null) return
  const running = child
  child = null
  if (running.exitCode === null && running.signalCode === null) running.kill()
}

function shutdown(code = 0) {
  if (stopping) return
  stopping = true
  stopChild()
  process.exit(code)
}

/**
 * Run the supervisor loop. Called only when the built module was started with
 * `WORKER_FLAG`; importing the module in the host process does nothing.
 */
export function runDesktopWorker() {
  process.on('disconnect', () => shutdown())
  process.on('SIGTERM', () => shutdown())
  process.on('SIGINT', () => shutdown())
  process.on('message', (message: WorkerMessage) => {
    if (message.type === 'stop') {
      shutdown()
      return
    }
    if (message.type !== 'start' || child !== null) return
    const running = spawn(message.executable, [], {
      // The official player reads the package directory name from this
      // variable; its global settings file is never written.
      env: { ...process.env, PETDEX_PET: message.petId },
      stdio: 'ignore',
      windowsHide: false,
      detached: false,
    })
    child = running
    running.once('error', (error) => {
      child = null
      process.send?.({ type: 'failed', error: error.message })
    })
    running.once('exit', (code, signal) => {
      child = null
      process.send?.({ type: 'exited', code, signal })
    })
    if (running.pid === undefined) {
      child = null
      process.send?.({ type: 'failed', error: 'the player started without a pid' })
      return
    }
    process.send?.({ type: 'started', pid: running.pid })
  })
  // A message that arrives before this listener is installed can only be a
  // host bug; the worker then waits, and the host's readiness deadline stops it.
  process.send?.({ type: 'ready' })
}

if (process.argv.includes(WORKER_FLAG)) runDesktopWorker()
