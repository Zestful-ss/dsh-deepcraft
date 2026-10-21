// packages/contracts/src/pets.ts
var PET_MANIFEST_MAX_BYTES = 64 * 1024;
var PET_IMAGE_MAX_BYTES = 16 * 1024 * 1024;
var PET_ARCHIVE_MAX_BYTES = 20 * 1024 * 1024;
var PET_EXTRACTED_MAX_BYTES = 20 * 1024 * 1024;
var PET_REPLAY_TERMINAL_MS = 5e3;
var PET_REPLAY_MAX_SNAPSHOTS = 64;
var PETDEX_ASSETS = "https://assets.petdex.dev/pets/";
var PETDEX_PRESETS = [
  { id: "crab-buddy", pageUrl: "https://petdex.dev/pets/crab-buddy", assetBase: `${PETDEX_ASSETS}crab-buddy-cc20d1c90732/` },
  { id: "claude-opus-scholar", pageUrl: "https://petdex.dev/pets/claude-opus-scholar", assetBase: `${PETDEX_ASSETS}claude-opus-scholar-88dade9b63fd/` },
  { id: "whaledou", pageUrl: "https://petdex.dev/pets/whaledou", assetBase: `${PETDEX_ASSETS}whaledou-c4cb6b24fb56/` },
  { id: "deepseek", pageUrl: "https://petdex.dev/pets/deepseek", assetBase: `${PETDEX_ASSETS}deepseek-c3fa684cfe03/` }
];

// packages/host/src/pets/bridge.ts
import { createNormalizer } from "./normalize.js";
var HOOK_SERVER = "http://127.0.0.1:7777";
var HOOK_TOKEN_HEADER = "x-petdex-update-token";
var INTEGRATION_VERSION = "0.1.0";
var MAX_PENDING = 64;
var REQUEST_TIMEOUT_MS = 300;
function isCritical(projection) {
  return projection.kind.startsWith("intervention.") || projection.kind === "turn.completed" || projection.kind === "turn.failed" || projection.kind === "turn.blocked";
}
function projectionToRequests(projection, token) {
  const headers = { [HOOK_TOKEN_HEADER]: token };
  return [{
    path: "/state",
    headers,
    body: { state: projection.state, agent_source: "dsh" }
  }, {
    path: "/bubble",
    headers,
    body: {
      text: projection.text,
      title: "DeepSeek Harness",
      busy: projection.busy,
      agent_source: "dsh",
      session_id: projection.rootSessionId,
      source_app: "default_browser",
      integration_version: INTEGRATION_VERSION,
      source_session_id: projection.sourceSessionId,
      source_seq: projection.sourceSeq,
      event_kind: projection.kind
    }
  }];
}
async function postRequest(request) {
  const response = await fetch(`${HOOK_SERVER}${request.path}`, {
    method: "POST",
    headers: { ...request.headers, "content-type": "application/json" },
    body: JSON.stringify(request.body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  });
  await response.arrayBuffer().catch(() => void 0);
  if (!response.ok) throw new Error(`Petdex hook answered ${response.status}`);
}
function createBridge(deliver) {
  const normalizer = createNormalizer();
  const pending = [];
  const accepted = /* @__PURE__ */ new Map();
  let draining = null;
  let disposed = false;
  async function drain() {
    while (pending.length > 0) {
      const projection = pending.shift();
      try {
        await deliver(projection);
      } catch {
      }
    }
  }
  function ensureDrain() {
    if (draining !== null || disposed) return;
    draining = drain().finally(() => {
      draining = null;
      if (pending.length > 0) ensureDrain();
    });
  }
  function enqueue(projection) {
    if (disposed) return;
    if (!isCritical(projection)) {
      for (let index = pending.length - 1; index >= 0; index -= 1) {
        const queued = pending[index];
        if (queued.rootSessionId === projection.rootSessionId && !isCritical(queued)) {
          pending[index] = projection;
          ensureDrain();
          return;
        }
      }
    }
    if (pending.length >= MAX_PENDING) {
      const replaceable = pending.findIndex((event) => !isCritical(event));
      if (replaceable >= 0) pending.splice(replaceable, 1);
      else if (!isCritical(projection)) return;
      else pending.shift();
    }
    pending.push(projection);
    ensureDrain();
  }
  function replayOne(projection) {
    const existing = pending.findIndex((queued) => queued.rootSessionId === projection.rootSessionId && !isCritical(queued));
    if (existing >= 0) {
      pending[existing] = projection;
      return;
    }
    if (pending.length < MAX_PENDING) pending.push(projection);
  }
  function remember(projection) {
    accepted.delete(projection.rootSessionId);
    accepted.set(projection.rootSessionId, { projection, at: Date.now() });
    while (accepted.size > PET_REPLAY_MAX_SNAPSHOTS) {
      const oldest = accepted.keys().next();
      if (oldest.done === true) break;
      accepted.delete(oldest.value);
    }
  }
  function onEvent(session, event) {
    try {
      const projection = normalizer.normalize(session, event);
      if (projection === null) return;
      remember(projection);
      enqueue(projection);
    } catch {
    }
  }
  return {
    onCreated: normalizer.rememberSession,
    onDisposed: normalizer.forgetSession,
    onEvent,
    /** Drop what has not left yet; a restart starts from the snapshots below. */
    clearPending() {
      pending.length = 0;
    },
    /**
     * Send the state a restarted player should show without waiting for the
     * next event: work still in progress, or a turn that ended moments ago.
     */
    replay() {
      const now = Date.now();
      for (const { projection, at } of accepted.values()) {
        const terminal = projection.kind === "turn.completed" || projection.kind === "turn.failed" || projection.kind === "turn.blocked";
        if (projection.busy || terminal && now - at <= PET_REPLAY_TERMINAL_MS) replayOne(projection);
      }
      ensureDrain();
    },
    dispose() {
      disposed = true;
      pending.length = 0;
      accepted.clear();
    },
    async idle() {
      while (draining !== null) await draining;
    }
  };
}
export {
  HOOK_SERVER,
  HOOK_TOKEN_HEADER,
  createBridge,
  postRequest,
  projectionToRequests
};
