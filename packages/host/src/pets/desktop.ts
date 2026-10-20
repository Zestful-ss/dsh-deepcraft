/**
 * The native desktop pet, owned by this plugin (D78).
 *
 * The official Petdex player draws, drags, stays above other windows and
 * listens on a fixed loopback port. This controller only decides which
 * package it opens and when it runs: it starts one supervisor, waits until
 * the child it started is the process answering `/whoami`, delivers the
 * bridge's projections with the player's runtime token, and stops what it
 * owns when the selection changes, the plugin unloads or DSH exits.
 *
 * A player someone else started is never adopted: its port is reported as
 * `external`, it receives no state and is never stopped.
 */
import { spawn } from 'node:child_process'
import type { ChildProcess } from 'node:child_process'
import { readFile, stat } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { isPetId } from '@dsh-deepcraft/contracts/pets'
import type { DesktopPetSelection, DesktopPetStatus } from '@dsh-deepcraft/contracts/pets'
import type { DshContext } from '@dsh-deepcraft/engine/node/dsh'
import { HOOK_SERVER, createBridge, postRequest, projectionToRequests } from './bridge.js'
import type { PetBridge } from './bridge.js'
import type { PetProjection } from './normalize.js'
import { desktopSupported, ensureDesktopExecutable } from './desktop-download.js'
import { WORKER_FLAG } from './desktop-worker.js'

/** How long the whole start — spawn, port, token, ownership — may take. */
const START_DEADLINE_MS = 10_000
/** How long the supervisor may take to end its child before it is killed. */
const STOP_DEADLINE_MS = 5_000
/** How long the port may stay occupied after a stop before the next start gives up. */
const PORT_RELEASE_MS = 3_000
/** How often readiness is polled. */
const POLL_MS = 100

const OFF: DesktopPetStatus = { phase: 'off', petId: null, pid: null, error: null }

function delay(ms: number): Promise<void> {
  const { promise, resolve } = Promise.withResolvers<void>()
  setTimeout(resolve, ms)
  return promise
}

/** Whether anything answers the player's fixed port right now. */
async function hookAnswers() {
  try {
    const response = await fetch(`${HOOK_SERVER}/health`, { signal: AbortSignal.timeout(500) })
    await response.arrayBuffer().catch(() => undefined)
    return true
  } catch {
    return false
  }
}

/** One JSON answer from the player, or null when it does not answer. */
async function hookJson(path: string) {
  try {
    const response = await fetch(`${HOOK_SERVER}${path}`, { signal: AbortSignal.timeout(500) })
    if (!response.ok) return null
    return await response.json() as Record<string, unknown>
  } catch {
    return null
  }
}

/** The player's runtime token, read fresh from the file the player writes on start. */
async function runtimeToken() {
  const token = await readFile(join(homedir(), '.petdex', 'runtime', 'update-token'), 'utf8').catch(() => '')
  return token.trim()
}

/** The runtime token only when this start wrote it: a stale file from an earlier process is no token at all. */
async function freshRuntimeToken(startedAt: number) {
  const path = join(homedir(), '.petdex', 'runtime', 'update-token')
  const info = await stat(path).catch(() => null)
  if (info === null || info.mtimeMs < startedAt) return ''
  return runtimeToken()
}

/** The selection in the shape the controller compares. */
function selectionOf(value: DesktopPetSelection): DesktopPetSelection {
  return { enabled: value.enabled === true, petId: isPetId(value.petId) ? value.petId : '' }
}

/** Raised when the fixed port belongs to a process this controller did not start. */
class ForeignPlayer extends Error {}

/** One owned official player and the bridge that feeds it. */
class DesktopController {
  private ctx: DshContext
  private desired: DesktopPetSelection = { enabled: false, petId: '' }
  private state: DesktopPetStatus = { ...OFF }
  private worker: ChildProcess | null = null
  private closed = false
  /** The operation chain: one start, stop or sync runs at a time. */
  private queue: Promise<void> = Promise.resolve()
  private readonly bridge: PetBridge

  constructor(ctx: DshContext) {
    this.ctx = ctx
    this.bridge = createBridge(projection => this.deliver(projection))
  }

  setContext(ctx: DshContext) {
    this.ctx = ctx
  }

  status(): DesktopPetStatus {
    return { ...this.state }
  }

  syncSelection(selection: DesktopPetSelection) {
    const next = selectionOf(selection)
    if (next.enabled === this.desired.enabled && next.petId === this.desired.petId) return
    this.desired = next
    this.enqueue()
  }

  /** The bridge a host session subscription feeds. */
  bridgeHandle() {
    return this.bridge
  }

  /** Whether a projection can be delivered right now. */
  private async deliver(projection: PetProjection) {
    if (this.state.phase !== 'running') return
    const token = await runtimeToken()
    if (token === '') return
    for (const request of projectionToRequests(projection, token)) await postRequest(request)
  }

  private enqueue() {
    this.queue = this.queue.then(() => this.applyNow(), () => this.applyNow())
  }

  private set(next: DesktopPetStatus) {
    this.state = next
  }

  private async applyNow() {
    if (this.closed) return
    const desired = this.desired
    if (!desired.enabled) {
      await this.stopOwned()
      this.set({ ...OFF, petId: desired.petId === '' ? null : desired.petId })
      return
    }
    if (!desktopSupported()) {
      this.set({ phase: 'unsupported', petId: desired.petId, pid: null, error: 'the native desktop player is published for Windows x64 only' })
      return
    }
    if (desired.petId === '') {
      this.set({ phase: 'error', petId: null, pid: null, error: 'no desktop pet is selected' })
      return
    }
    if (this.state.phase === 'running' && this.state.petId === desired.petId) return
    await this.start(desired.petId)
  }

  private async start(petId: string) {
    await this.stopOwned()
    this.set({ phase: 'starting', petId, pid: null, error: null })
    if (await hookAnswers()) {
      this.set({ phase: 'external', petId, pid: null, error: 'another Petdex player holds 127.0.0.1:7777; close it to let DSH own the desktop pet' })
      return
    }
    try {
      const executable = await ensureDesktopExecutable(this.ctx)
      // The selection may have moved while the release downloaded; the queued
      // run after this one starts the pet that is wanted then.
      if (this.closed || !this.desired.enabled || this.desired.petId !== petId) return
      await this.spawnAndOwn(executable, petId)
    } catch (error) {
      const foreign = error instanceof ForeignPlayer
      await this.stopOwned()
      this.set({
        phase: foreign ? 'external' : 'error',
        petId,
        pid: null,
        error: (error as { message?: string } | null)?.message ?? String(error),
      })
    }
  }

  /** Spawn the supervisor, wait for the native pid, then require the port to report that pid. */
  private async spawnAndOwn(executable: string, petId: string) {
    const workerPath = fileURLToPath(new URL('./desktop-worker.js', import.meta.url))
    const worker = spawn(process.execPath, [workerPath, WORKER_FLAG], {
      // A fork through Electron needs this flag to run as Node; on a plain
      // Node host it is inert.
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
      stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
      windowsHide: true,
    })
    this.worker = worker
    const startedAt = Date.now()
    const pid = await this.waitStarted(worker, executable, petId)
    await this.waitReady(worker, pid, startedAt)
    this.set({ phase: 'running', petId, pid, error: null })
    this.bridge.clearPending()
    this.bridge.replay()
  }

  /** The supervisor's answer that the official executable is a live child. */
  private waitStarted(worker: ChildProcess, executable: string, petId: string): Promise<number> {
    const { promise, resolve, reject } = Promise.withResolvers<number>()
    let sent = false
    const finish = (error: Error | null, pid?: number) => {
      worker.off('message', onMessage)
      worker.off('exit', onExit)
      worker.off('error', onError)
      clearTimeout(deadline)
      if (error !== null) reject(error)
      else resolve(pid as number)
    }
    const onMessage = (message: { type?: string, pid?: unknown, error?: unknown }) => {
      if (message.type === 'ready' && !sent) {
        sent = true
        try {
          worker.send?.({ type: 'start', executable, petId })
        } catch (error) {
          finish(error as Error)
        }
        return
      }
      if (message.type === 'started' && typeof message.pid === 'number') finish(null, message.pid)
      else if (message.type === 'failed') finish(new Error(String(message.error ?? 'the player failed to start')))
    }
    const onExit = (code: number | null) => finish(new Error(`the player's supervisor exited with code ${String(code)}`))
    const onError = (error: Error) => finish(error)
    const deadline = setTimeout(() => finish(new Error('the player did not start within 10 seconds')), START_DEADLINE_MS)
    worker.on('message', onMessage)
    worker.once('exit', onExit)
    worker.once('error', onError)
    return promise
  }

  /** The player is ready only when the port answers with the child's own pid and a fresh token exists. */
  private async waitReady(worker: ChildProcess, pid: number, startedAt: number) {
    const deadline = Date.now() + START_DEADLINE_MS
    let foreign = false
    while (Date.now() < deadline) {
      if (worker.exitCode !== null) throw new Error(`the player exited with code ${String(worker.exitCode)}`)
      if (worker.signalCode !== null) throw new Error(`the player was ended by ${worker.signalCode}`)
      if (await freshRuntimeToken(startedAt) !== '') {
        const who = await hookJson('/whoami')
        if (who !== null && typeof who.pid === 'number') {
          if (who.pid === pid) {
            const health = await hookJson('/health')
            if (health !== null && health.ok === true) return
          } else {
            foreign = true
          }
        }
      }
      await delay(POLL_MS)
    }
    throw foreign
      ? new ForeignPlayer('another Petdex player holds 127.0.0.1:7777; close it to let DSH own the desktop pet')
      : new Error('the player did not become ready within 10 seconds')
  }

  /** Stop the child this controller started, and wait for its port. */
  private async stopOwned() {
    this.bridge.clearPending()
    const worker = this.worker
    this.worker = null
    if (worker !== null) {
      const exited = Promise.withResolvers<void>()
      worker.once('exit', () => exited.resolve())
      try {
        worker.send?.({ type: 'stop' })
      } catch {
        // A channel already gone is the supervisor's own problem; the kill
        // below still ends it.
      }
      const killer = setTimeout(() => {
        if (worker.exitCode === null && worker.signalCode === null) worker.kill()
      }, STOP_DEADLINE_MS)
      await Promise.race([exited.promise, delay(STOP_DEADLINE_MS + 1_000)])
      clearTimeout(killer)
    }
    const until = Date.now() + PORT_RELEASE_MS
    while (Date.now() < until) {
      if (!await hookAnswers()) return
      await delay(POLL_MS)
    }
  }

  /** Stop what this controller owns, for good. */
  async shutdown() {
    this.closed = true
    this.bridge.dispose()
    this.queue = this.queue.then(() => this.stopOwned(), () => this.stopOwned())
    await this.queue
    this.set({ ...OFF })
  }
}

interface DesktopRegistry {
  controller: DesktopController | null
  leases: number
}

const REGISTRY = Symbol.for('dsh-deepcraft.petdex.desktop')

function registry(): DesktopRegistry {
  const holder = globalThis as unknown as Record<symbol, DesktopRegistry | undefined>
  let found = holder[REGISTRY]
  if (found === undefined) {
    found = { controller: null, leases: 0 }
    holder[REGISTRY] = found
  }
  return found
}

/**
 * Take one generation's lease on the desktop player and hand it the selection
 * to follow. A hot reload keeps the lease count above zero, so the running
 * player is not restarted merely because the bundle changed.
 *
 * @returns the release; the last release stops the owned player.
 */
export function configureDesktopPets(ctx: DshContext, selection: DesktopPetSelection) {
  const state = registry()
  if (state.controller === null) state.controller = new DesktopController(ctx)
  else state.controller.setContext(ctx)
  const controller = state.controller
  state.leases += 1
  controller.syncSelection(selection)
  let released = false
  return () => {
    if (released) return
    released = true
    state.leases -= 1
    if (state.leases > 0) return
    if (state.controller === controller) state.controller = null
    void controller.shutdown()
  }
}

/** The desktop player's bridge, fed by the host's session subscription. */
export function desktopPetBridge(): PetBridge | null {
  return registry().controller?.bridgeHandle() ?? null
}

/** The player's current state, for the settings page. */
export function desktopPetStatus(): DesktopPetStatus {
  return registry().controller?.status() ?? { ...OFF }
}

/**
 * Bring the owned player in line with one selection; a route call does not
 * save it, and a generation's own lease still owns the process.
 */
export function syncDesktopPets(ctx: DshContext, selection: DesktopPetSelection): DesktopPetStatus {
  const state = registry()
  if (state.controller === null) state.controller = new DesktopController(ctx)
  else state.controller.setContext(ctx)
  state.controller.syncSelection(selection)
  return state.controller.status()
}
