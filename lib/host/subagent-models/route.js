// packages/contracts/src/routes.ts
var ROUTE_PREFIX = "/dsh-deepcraft";
var USERNAME_PATH = `${ROUTE_PREFIX}/username`;
var HDSL_PATH = `${ROUTE_PREFIX}/hdsl`;
var HDSL_SKIN_PATH = `${ROUTE_PREFIX}/hdsl-skin.png`;
var SESSION_DELETE_PATH = `${ROUTE_PREFIX}/session-delete`;
var USAGE_PATH = `${ROUTE_PREFIX}/usage`;
var SESSION_SEARCH_PATH = `${ROUTE_PREFIX}/session-search`;
var BRAND_PATH = `${ROUTE_PREFIX}/brand`;
var BRAND_MARK_PATH = `${ROUTE_PREFIX}/brand/mark`;
var BRAND_WORDMARK_PATH = `${ROUTE_PREFIX}/brand/wordmark`;
var PEAKRATE_PATH = `${ROUTE_PREFIX}/peakrate`;
var PETS_PATH = `${ROUTE_PREFIX}/pets`;
var PETS_ENSURE_PATH = `${PETS_PATH}/ensure`;
var PETS_IMPORT_PATH = `${PETS_PATH}/import`;
var PETS_IMPORT_URL_PATH = `${PETS_PATH}/import-url`;
var SUBAGENT_MODELS_PATH = `${ROUTE_PREFIX}/subagent-models`;
var PETS_IMAGE_PATH = `${PETS_PATH}/image`;

// packages/contracts/src/subagent.ts
var SUBAGENT_MODELS_CONTRACT = 2;
var SUBAGENT_ROUTES_MAX = 24;
var PROVIDER_MAX = 120;
var MODEL_MAX = 200;
var EFFORT_MAX = 200;
function subagentRouteKey(route) {
  return `${route.provider}\0${route.model}`;
}
function readRoute(value) {
  if (value === null || typeof value !== "object") return null;
  const { provider, model, reasoningEffort } = value;
  if (typeof provider !== "string" || typeof model !== "string") return null;
  if (provider === "" || provider.length > PROVIDER_MAX) return null;
  if (model === "" || model.length > MODEL_MAX) return null;
  if (reasoningEffort !== void 0 && (typeof reasoningEffort !== "string" || reasoningEffort === "" || reasoningEffort.length > EFFORT_MAX)) return null;
  return reasoningEffort === void 0 ? { provider, model } : { provider, model, reasoningEffort };
}
function readSubagentRoutes(value) {
  if (!Array.isArray(value) || value.length > SUBAGENT_ROUTES_MAX) return null;
  const routes = [];
  const seen = /* @__PURE__ */ new Set();
  for (const entry of value) {
    const route = readRoute(entry);
    if (route === null) return null;
    const key = subagentRouteKey(route);
    if (seen.has(key)) return null;
    seen.add(key);
    routes.push(route);
  }
  return routes;
}
function holdsRoute(routes, route) {
  const key = subagentRouteKey(route);
  for (const candidate of routes) if (subagentRouteKey(candidate) === key) return true;
  return false;
}

// packages/engine/node/http.ts
function refusalOf(ctx, req) {
  const connection = ctx.get("connection");
  if (typeof connection?.requestRejection === "function") return connection.requestRejection(req);
  if (!isLoopbackPeer(req.socket.remoteAddress)) return 403;
  const host = req.headers.host;
  if (host !== void 0) {
    if (!URL.canParse(`http://${host}`)) return 403;
    const name = new URL(`http://${host}`).hostname;
    if (name !== "localhost" && name !== "[::1]" && !/^127\.\d+\.\d+\.\d+$/.test(name)) return 403;
  }
  const site = req.headers["sec-fetch-site"];
  if (site !== void 0 && site !== "same-origin" && site !== "none") return 403;
  const origin = req.headers.origin;
  if (origin === void 0) return void 0;
  if (!URL.canParse(origin)) return 403;
  return new URL(origin).host === host ? void 0 : 403;
}
function isLoopbackPeer(address) {
  if (address === void 0) return false;
  const plain = address.startsWith("::ffff:") ? address.slice("::ffff:".length) : address;
  return plain === "::1" || /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(plain);
}
function sendJson(res, status, payload) {
  const body = Buffer.from(JSON.stringify(payload));
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": String(body.byteLength),
    "cache-control": "no-store"
  });
  res.end(body);
}
function methodRefused(req, res, methods) {
  if (req.method !== void 0 && methods.includes(req.method)) return false;
  res.writeHead(405, { allow: methods.join(", ") });
  res.end();
  return true;
}
function fenceRefused(ctx, req, res) {
  const refused = refusalOf(ctx, req);
  if (refused === void 0) return false;
  sendJson(res, refused, { ok: false, error: refused === 401 ? "unauthorized" : "forbidden" });
  return true;
}
function readRequestBody(req, limit) {
  return new Promise((settle) => {
    const chunks = [];
    let size = 0;
    let over = false;
    req.on("data", (chunk) => {
      if (over) return;
      size += chunk.length;
      if (size > limit) {
        over = true;
        settle(null);
        return;
      }
      chunks.push(Buffer.from(chunk));
    });
    req.on("end", () => {
      if (!over) settle(Buffer.concat(chunks));
    });
    req.on("error", () => {
      if (!over) settle(null);
    });
  });
}

// packages/host/src/subagent-models/route.ts
import { readSubagentRoutes as readPolicyRoutes } from "../subagent-choice.js";
var BODY_MAX = 16 * 1024;
var SESSION_ID_MAX = 200;
function routeOf(ctx, store) {
  function liveSession(sessionId) {
    if (sessionId === "" || sessionId.length > SESSION_ID_MAX) return null;
    const sessions = ctx.get("sessions");
    if (typeof sessions?.get !== "function") return null;
    return sessions.get(sessionId) ?? null;
  }
  function copyRoutes(routes) {
    return routes.map((route) => route.reasoningEffort === void 0 ? { provider: route.provider, model: route.model } : { provider: route.provider, model: route.model, reasoningEffort: route.reasoningEffort });
  }
  function reasoningOf(info) {
    const reasoning = info?.reasoning;
    if (reasoning === null || reasoning === void 0 || typeof reasoning !== "object") return null;
    const efforts = reasoning.efforts;
    if (!Array.isArray(efforts) || efforts.length === 0) return null;
    const levels = efforts.map((entry) => entry).filter((entry) => typeof entry.id === "string" && typeof entry.name === "string");
    if (levels.length === 0) return null;
    const defaultEffort = reasoning.defaultEffort;
    return { efforts: levels, ...typeof defaultEffort === "string" ? { defaultEffort } : {} };
  }
  async function routeEfforts(routes) {
    const llm = ctx.get("llm");
    return Promise.all(routes.map(async (route) => {
      if (llm === void 0 || llm === null || typeof llm.resolveModelInfo !== "function") {
        return { provider: route.provider, model: route.model, efforts: [], state: "unknown" };
      }
      try {
        const reasoning = reasoningOf(await llm.resolveModelInfo(route.provider, route.model));
        if (reasoning === null) return { provider: route.provider, model: route.model, efforts: [], state: "no-efforts" };
        return { provider: route.provider, model: route.model, efforts: reasoning.efforts, defaultEffort: reasoning.defaultEffort, state: "ok" };
      } catch {
        return { provider: route.provider, model: route.model, efforts: [], state: "unknown" };
      }
    }));
  }
  function withEfforts(answer, efforts) {
    return efforts.length === 0 ? answer : { ...answer, efforts };
  }
  async function read(sessionId) {
    const session = liveSession(sessionId);
    if (session === null) return { allowed: [], selected: [], reason: "no-session" };
    const policy = readPolicyRoutes(ctx.get("sessionProjections"), session);
    if (policy === void 0) return { allowed: [], selected: [], reason: "no-policy" };
    const allowed = copyRoutes(policy);
    const efforts = await routeEfforts(allowed);
    const selection = store.read(sessionId);
    if (selection.kind === "unavailable") return withEfforts({ allowed, selected: [], reason: "store-unavailable" }, efforts);
    if (selection.kind === "none") return withEfforts({ allowed, selected: [] }, efforts);
    const selected = copyRoutes(selection.routes);
    const stale = selected.some((route) => !holdsRoute(allowed, route));
    return withEfforts(stale ? { allowed, selected, reason: "stale-selection" } : { allowed, selected }, efforts);
  }
  function staleWrite(contract, routes, stored) {
    if (contract >= SUBAGENT_MODELS_CONTRACT) return false;
    if (routes.some((route) => route.reasoningEffort !== void 0)) return true;
    return stored.kind === "routes" && stored.routes.some((route) => route.reasoningEffort !== void 0);
  }
  function refuse(res, status, error, message) {
    sendJson(res, status, { ok: false, error, message });
  }
  async function write(req, res) {
    const raw = await readRequestBody(req, BODY_MAX);
    if (raw === null) {
      refuse(res, 413, "invalid-routes", "the selection body is unreadable or too large");
      return;
    }
    let body;
    try {
      body = JSON.parse(raw.toString("utf8"));
    } catch {
      refuse(res, 400, "invalid-routes", "the selection body is not JSON");
      return;
    }
    const fields = body !== null && typeof body === "object" ? body : {};
    const sessionId = typeof fields.session === "string" ? fields.session : "";
    const session = liveSession(sessionId);
    if (session === null) {
      refuse(res, 409, "no-session", "no live session carries that id");
      return;
    }
    const policy = readPolicyRoutes(ctx.get("sessionProjections"), session);
    if (policy === void 0) {
      refuse(res, 409, "no-policy", "the session recorded no allowed subagent routes");
      return;
    }
    const routes = readSubagentRoutes(fields.routes);
    if (routes === null) {
      refuse(res, 400, "invalid-routes", "the routes are not a list of distinct provider/model pairs");
      return;
    }
    for (const route of routes) {
      if (!holdsRoute(policy, route)) {
        refuse(res, 400, "route-not-allowed", `the session's policy does not allow ${subagentRouteKey(route).replace("\0", "/")}`);
        return;
      }
    }
    if (routes.some((route) => route.reasoningEffort !== void 0)) {
      const llm = ctx.get("llm");
      for (const route of routes) {
        if (route.reasoningEffort === void 0) continue;
        const name = `${subagentRouteKey(route).replace("\0", "/")} effort ${route.reasoningEffort}`;
        if (llm === void 0 || llm === null || typeof llm.resolveModelInfo !== "function") {
          refuse(res, 400, "effort-not-allowed", `the reasoning ladder of ${name} could not be resolved`);
          return;
        }
        let reasoning;
        try {
          reasoning = reasoningOf(await llm.resolveModelInfo(route.provider, route.model));
        } catch {
          refuse(res, 400, "effort-not-allowed", `the reasoning ladder of ${name} could not be resolved`);
          return;
        }
        if (reasoning === null || !reasoning.efforts.some((effort) => effort.id === route.reasoningEffort)) {
          refuse(res, 400, "effort-not-allowed", `the model declares no reasoning effort ${name}`);
          return;
        }
      }
    }
    const stored = store.read(sessionId);
    if (staleWrite(typeof fields.contract === "number" ? fields.contract : 0, routes, stored)) {
      refuse(res, 409, "stale-write", "the stored selection or this write carries reasoning efforts; write again under the current contract");
      return;
    }
    try {
      await store.write(sessionId, routes);
    } catch (error) {
      refuse(res, 500, "store-unavailable", String(error?.message ?? String(error)));
      return;
    }
    sendJson(res, 200, { ok: true, ...await read(sessionId) });
  }
  return {
    kind: "exact",
    path: SUBAGENT_MODELS_PATH,
    handler: (req, res) => {
      if (methodRefused(req, res, ["GET", "POST"])) return;
      if (fenceRefused(ctx, req, res)) return;
      if (req.method === "POST") {
        void write(req, res).catch((error) => {
          if (res.headersSent) res.destroy();
          else sendJson(res, 500, { ok: false, error: "store-unavailable", message: String(error?.message ?? String(error)) });
        });
        return;
      }
      const sessionId = new URL(req.url ?? "/", "http://local").searchParams.get("session") ?? "";
      void read(sessionId).then(
        (answer) => sendJson(res, 200, { ok: true, ...answer }),
        (error) => {
          if (res.headersSent) res.destroy();
          else sendJson(res, 500, { ok: false, error: "store-unavailable", message: String(error?.message ?? String(error)) });
        }
      );
    }
  };
}
function subagentModelRoutes(ctx, store) {
  return [{ label: "subagent models", route: routeOf(ctx, store) }];
}
export {
  subagentModelRoutes
};
