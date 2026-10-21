// packages/host/src/pets/normalize.ts
var MAX_PARENT_DEPTH = 16;
var FIXED_EVENTS = {
  "turn/start": ["turn.started", "jumping", "Starting", true],
  "step/start": ["step.started", "running", "Working", true],
  "step/end": ["step.completed", "running", "Working", true],
  "tool/call": ["tool.started", "running", "Using a tool", true],
  "tool/result": ["tool.completed", "running", "Working", true],
  "tool-workflow/run-start": ["workflow.started", "running", "Workflow running", true],
  "tool-workflow/agent-start": ["workflow.updated", "running", "Subagent working", true],
  "tool-workflow/agent-end": ["workflow.updated", "running", "Workflow running", true],
  "tool-workflow/run-end": ["workflow.completed", "running", "Workflow finished", true],
  "goal/change": ["goal.changed", "running", "Goal updated", true],
  "compaction/start": ["compaction.started", "running", "Optimizing context", true],
  "compaction/end": ["compaction.completed", "running", "Working", true]
};
function safeId(value) {
  return typeof value === "string" && value.length > 0 ? value : null;
}
function approvalId(event) {
  const data = event.data !== null && typeof event.data === "object" ? event.data : {};
  return safeId(data.id) ?? `seq-${String(event.seq)}`;
}
function createNormalizer() {
  const sessions = /* @__PURE__ */ new Map();
  const highWater = /* @__PURE__ */ new Map();
  const approvals = /* @__PURE__ */ new Map();
  function rememberSession(session) {
    const id = safeId(session?.id);
    if (id === null) return;
    const previous = sessions.get(id);
    sessions.set(id, {
      parentSession: safeId(session?.header?.parentSession) ?? previous?.parentSession ?? null,
      origin: safeId(session?.header?.origin) ?? previous?.origin ?? null
    });
  }
  function forgetSession(session) {
    const id = safeId(session?.id);
    if (id === null) return;
    sessions.delete(id);
    highWater.delete(id);
    approvals.delete(id);
  }
  function rootFor(sourceSessionId) {
    let current = sourceSessionId;
    const seen = /* @__PURE__ */ new Set([current]);
    for (let depth = 0; depth < MAX_PARENT_DEPTH; depth += 1) {
      const info = sessions.get(current);
      if (info?.origin !== "subagent" || info.parentSession === null) return current;
      if (seen.has(info.parentSession)) return null;
      current = info.parentSession;
      seen.add(current);
    }
    return null;
  }
  function baseProjection(session, event) {
    rememberSession(session);
    const sourceSessionId = safeId(session?.id);
    if (sourceSessionId === null || typeof event.seq !== "number" || !Number.isSafeInteger(event.seq)) return null;
    const previousSeq = highWater.get(sourceSessionId);
    if (previousSeq !== void 0 && event.seq <= previousSeq) return null;
    highWater.set(sourceSessionId, event.seq);
    const rootSessionId = rootFor(sourceSessionId);
    if (rootSessionId === null) return null;
    return {
      rootSessionId,
      sourceSessionId,
      sourceSeq: event.seq,
      occurredAt: typeof event.time === "number" && Number.isFinite(event.time) ? event.time : Date.now()
    };
  }
  function normalize(session, event) {
    const type = safeId(event?.type);
    if (type === null || event === null || event === void 0) return null;
    const base = baseProjection(session, event);
    if (base === null) return null;
    if (type === "approval/asked") {
      const open2 = approvals.get(base.rootSessionId) ?? /* @__PURE__ */ new Set();
      open2.add(`${base.sourceSessionId}:${approvalId(event)}`);
      approvals.set(base.rootSessionId, open2);
      return { kind: "intervention.requested", ...base, state: "waiting", text: "Needs your attention", busy: true };
    }
    if (type === "approval/decided") {
      const open2 = approvals.get(base.rootSessionId) ?? /* @__PURE__ */ new Set();
      open2.delete(`${base.sourceSessionId}:${approvalId(event)}`);
      if (open2.size === 0) approvals.delete(base.rootSessionId);
      return {
        kind: open2.size === 0 ? "intervention.resolved" : "intervention.requested",
        ...base,
        state: open2.size === 0 ? "running" : "waiting",
        text: open2.size === 0 ? "Working" : "Needs your attention",
        busy: true
      };
    }
    if (type === "turn/end") {
      if (base.sourceSessionId !== base.rootSessionId) {
        return { kind: "subagent.updated", ...base, state: "running", text: "Subagent finished", busy: true };
      }
      approvals.delete(base.rootSessionId);
      const data = event.data !== null && typeof event.data === "object" ? event.data : {};
      const reason = data.reason !== null && typeof data.reason === "object" ? data.reason.kind : void 0;
      if (reason === "completed") return { kind: "turn.completed", ...base, state: "waving", text: "Done", busy: false };
      if (reason === "blocked" || reason === "max-tokens") {
        return { kind: "turn.blocked", ...base, state: "waiting", text: "Needs your attention", busy: true };
      }
      return { kind: "turn.failed", ...base, state: "failed", text: "Stopped", busy: false };
    }
    const open = approvals.get(base.rootSessionId);
    if (open !== void 0 && open.size > 0) {
      return { kind: "intervention.requested", ...base, state: "waiting", text: "Needs your attention", busy: true };
    }
    const fixed = FIXED_EVENTS[type];
    if (fixed === void 0) return null;
    const [kind, state, text, busy] = fixed;
    return { kind, ...base, state, text, busy };
  }
  return { rememberSession, forgetSession, normalize };
}
export {
  createNormalizer
};
