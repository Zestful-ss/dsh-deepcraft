// packages/host/src/pets/desktop.ts
import { spawn } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// packages/contracts/src/pets.ts
var PET_MANIFEST_MAX_BYTES = 64 * 1024;
var PET_IMAGE_MAX_BYTES = 16 * 1024 * 1024;
var PET_ARCHIVE_MAX_BYTES = 20 * 1024 * 1024;
var PET_EXTRACTED_MAX_BYTES = 20 * 1024 * 1024;
var PET_ID_RE = /^[a-z0-9][a-z0-9-]{0,62}$/;
var PETDEX_ASSETS = "https://assets.petdex.dev/pets/";
var PETDEX_PRESETS = [
  { id: "crab-buddy", pageUrl: "https://petdex.dev/pets/crab-buddy", assetBase: `${PETDEX_ASSETS}crab-buddy-cc20d1c90732/` },
  { id: "claude-opus-scholar", pageUrl: "https://petdex.dev/pets/claude-opus-scholar", assetBase: `${PETDEX_ASSETS}claude-opus-scholar-88dade9b63fd/` },
  { id: "whaledou", pageUrl: "https://petdex.dev/pets/whaledou", assetBase: `${PETDEX_ASSETS}whaledou-c4cb6b24fb56/` },
  { id: "deepseek", pageUrl: "https://petdex.dev/pets/deepseek", assetBase: `${PETDEX_ASSETS}deepseek-c3fa684cfe03/` }
];
function isPetId(value) {
  return PET_ID_RE.test(value);
}

// packages/host/src/pets/desktop.ts
import { HOOK_SERVER, createBridge, postRequest, projectionToRequests } from "./bridge.js";
import { desktopSupported, ensureDesktopExecutable } from "./desktop-download.js";
import { WORKER_FLAG } from "./desktop-worker.js";
var START_DEADLINE_MS = 1e4;
var STOP_DEADLINE_MS = 5e3;
var PORT_RELEASE_MS = 3e3;
var POLL_MS = 100;
var OFF = { phase: "off", petId: null, pid: null, error: null };
function delay(ms) {
  const { promise, resolve } = Promise.withResolvers();
  setTimeout(resolve, ms);
  return promise;
}
async function hookAnswers() {
  try {
    const response = await fetch(`${HOOK_SERVER}/health`, { signal: AbortSignal.timeout(500) });
    await response.arrayBuffer().catch(() => void 0);
    return true;
  } catch {
    return false;
  }
}
async function hookJson(path) {
  try {
    const response = await fetch(`${HOOK_SERVER}${path}`, { signal: AbortSignal.timeout(500) });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}
async function runtimeToken() {
  const token = await readFile(join(homedir(), ".petdex", "runtime", "update-token"), "utf8").catch(() => "");
  return token.trim();
}
async function freshRuntimeToken(startedAt) {
  const path = join(homedir(), ".petdex", "runtime", "update-token");
  const info = await stat(path).catch(() => null);
  if (info === null || info.mtimeMs < startedAt) return "";
  return runtimeToken();
}
function selectionOf(value) {
  return { enabled: value.enabled === true, petId: isPetId(value.petId) ? value.petId : "" };
}
var ForeignPlayer = class extends Error {
};
var DesktopController = class {
  ctx;
  desired = { enabled: false, petId: "" };
  state = { ...OFF };
  worker = null;
  closed = false;
  /** The operation chain: one start, stop or sync runs at a time. */
  queue = Promise.resolve();
  bridge;
  constructor(ctx) {
    this.ctx = ctx;
    this.bridge = createBridge((projection) => this.deliver(projection));
  }
  setContext(ctx) {
    this.ctx = ctx;
  }
  status() {
    return { ...this.state };
  }
  syncSelection(selection) {
    const next = selectionOf(selection);
    if (next.enabled === this.desired.enabled && next.petId === this.desired.petId) return;
    this.desired = next;
    this.enqueue();
  }
  /** The bridge a host session subscription feeds. */
  bridgeHandle() {
    return this.bridge;
  }
  /** Whether a projection can be delivered right now. */
  async deliver(projection) {
    if (this.state.phase !== "running") return;
    const token = await runtimeToken();
    if (token === "") return;
    for (const request of projectionToRequests(projection, token)) await postRequest(request);
  }
  enqueue() {
    this.queue = this.queue.then(() => this.applyNow(), () => this.applyNow());
  }
  set(next) {
    this.state = next;
  }
  async applyNow() {
    if (this.closed) return;
    const desired = this.desired;
    if (!desired.enabled) {
      await this.stopOwned();
      this.set({ ...OFF, petId: desired.petId === "" ? null : desired.petId });
      return;
    }
    if (!desktopSupported()) {
      this.set({ phase: "unsupported", petId: desired.petId, pid: null, error: "the native desktop player is published for Windows x64 only" });
      return;
    }
    if (desired.petId === "") {
      this.set({ phase: "error", petId: null, pid: null, error: "no desktop pet is selected" });
      return;
    }
    if (this.state.phase === "running" && this.state.petId === desired.petId) return;
    await this.start(desired.petId);
  }
  async start(petId) {
    await this.stopOwned();
    this.set({ phase: "starting", petId, pid: null, error: null });
    if (await hookAnswers()) {
      this.set({ phase: "external", petId, pid: null, error: "another Petdex player holds 127.0.0.1:7777; close it to let DSH own the desktop pet" });
      return;
    }
    try {
      const executable = await ensureDesktopExecutable(this.ctx);
      if (this.closed || !this.desired.enabled || this.desired.petId !== petId) return;
      await this.spawnAndOwn(executable, petId);
    } catch (error) {
      const foreign = error instanceof ForeignPlayer;
      await this.stopOwned();
      this.set({
        phase: foreign ? "external" : "error",
        petId,
        pid: null,
        error: error?.message ?? String(error)
      });
    }
  }
  /** Spawn the supervisor, wait for the native pid, then require the port to report that pid. */
  async spawnAndOwn(executable, petId) {
    const workerPath = fileURLToPath(new URL("./desktop-worker.js", import.meta.url));
    const worker = spawn(process.execPath, [workerPath, WORKER_FLAG], {
      // A fork through Electron needs this flag to run as Node; on a plain
      // Node host it is inert.
      env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
      stdio: ["ignore", "ignore", "ignore", "ipc"],
      windowsHide: true
    });
    this.worker = worker;
    const startedAt = Date.now();
    const pid = await this.waitStarted(worker, executable, petId);
    await this.waitReady(worker, pid, startedAt);
    this.set({ phase: "running", petId, pid, error: null });
    this.bridge.clearPending();
    this.bridge.replay();
  }
  /** The supervisor's answer that the official executable is a live child. */
  waitStarted(worker, executable, petId) {
    const { promise, resolve, reject } = Promise.withResolvers();
    let sent = false;
    const finish = (error, pid) => {
      worker.off("message", onMessage);
      worker.off("exit", onExit);
      worker.off("error", onError);
      clearTimeout(deadline);
      if (error !== null) reject(error);
      else resolve(pid);
    };
    const onMessage = (message) => {
      if (message.type === "ready" && !sent) {
        sent = true;
        try {
          worker.send?.({ type: "start", executable, petId });
        } catch (error) {
          finish(error);
        }
        return;
      }
      if (message.type === "started" && typeof message.pid === "number") finish(null, message.pid);
      else if (message.type === "failed") finish(new Error(String(message.error ?? "the player failed to start")));
    };
    const onExit = (code) => finish(new Error(`the player's supervisor exited with code ${String(code)}`));
    const onError = (error) => finish(error);
    const deadline = setTimeout(() => finish(new Error("the player did not start within 10 seconds")), START_DEADLINE_MS);
    worker.on("message", onMessage);
    worker.once("exit", onExit);
    worker.once("error", onError);
    return promise;
  }
  /** The player is ready only when the port answers with the child's own pid and a fresh token exists. */
  async waitReady(worker, pid, startedAt) {
    const deadline = Date.now() + START_DEADLINE_MS;
    let foreign = false;
    while (Date.now() < deadline) {
      if (worker.exitCode !== null) throw new Error(`the player exited with code ${String(worker.exitCode)}`);
      if (worker.signalCode !== null) throw new Error(`the player was ended by ${worker.signalCode}`);
      if (await freshRuntimeToken(startedAt) !== "") {
        const who = await hookJson("/whoami");
        if (who !== null && typeof who.pid === "number") {
          if (who.pid === pid) {
            const health = await hookJson("/health");
            if (health !== null && health.ok === true) return;
          } else {
            foreign = true;
          }
        }
      }
      await delay(POLL_MS);
    }
    throw foreign ? new ForeignPlayer("another Petdex player holds 127.0.0.1:7777; close it to let DSH own the desktop pet") : new Error("the player did not become ready within 10 seconds");
  }
  /** Stop the child this controller started, and wait for its port. */
  async stopOwned() {
    this.bridge.clearPending();
    const worker = this.worker;
    this.worker = null;
    if (worker !== null) {
      const exited = Promise.withResolvers();
      worker.once("exit", () => exited.resolve());
      try {
        worker.send?.({ type: "stop" });
      } catch {
      }
      const killer = setTimeout(() => {
        if (worker.exitCode === null && worker.signalCode === null) worker.kill();
      }, STOP_DEADLINE_MS);
      await Promise.race([exited.promise, delay(STOP_DEADLINE_MS + 1e3)]);
      clearTimeout(killer);
    }
    const until = Date.now() + PORT_RELEASE_MS;
    while (Date.now() < until) {
      if (!await hookAnswers()) return;
      await delay(POLL_MS);
    }
  }
  /** Stop what this controller owns, for good. */
  async shutdown() {
    this.closed = true;
    this.bridge.dispose();
    this.queue = this.queue.then(() => this.stopOwned(), () => this.stopOwned());
    await this.queue;
    this.set({ ...OFF });
  }
};
var REGISTRY = /* @__PURE__ */ Symbol.for("dsh-deepcraft.petdex.desktop");
function registry() {
  const holder = globalThis;
  let found = holder[REGISTRY];
  if (found === void 0) {
    found = { controller: null, leases: 0 };
    holder[REGISTRY] = found;
  }
  return found;
}
function configureDesktopPets(ctx, selection) {
  const state = registry();
  if (state.controller === null) state.controller = new DesktopController(ctx);
  else state.controller.setContext(ctx);
  const controller = state.controller;
  state.leases += 1;
  controller.syncSelection(selection);
  let released = false;
  return () => {
    if (released) return;
    released = true;
    state.leases -= 1;
    if (state.leases > 0) return;
    if (state.controller === controller) state.controller = null;
    void controller.shutdown();
  };
}
function desktopPetBridge() {
  return registry().controller?.bridgeHandle() ?? null;
}
function desktopPetStatus() {
  return registry().controller?.status() ?? { ...OFF };
}
function syncDesktopPets(ctx, selection) {
  const state = registry();
  if (state.controller === null) state.controller = new DesktopController(ctx);
  else state.controller.setContext(ctx);
  state.controller.syncSelection(selection);
  return state.controller.status();
}
export {
  configureDesktopPets,
  desktopPetBridge,
  desktopPetStatus,
  syncDesktopPets
};
