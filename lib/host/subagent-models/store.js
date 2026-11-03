// packages/contracts/src/subagent.ts
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

// packages/host/src/subagent-models/store.ts
import { resolveHostPackage } from "../host-package.js";
var DOMAIN_NAME = "deepcraft_subagent_models";
var TABLE_NAME = "selections";
var DOMAIN_VERSION = 1;
var REOPEN_ATTEMPTS = 20;
var REOPEN_INTERVAL_MS = 25;
function recordSchema(zod) {
  const route = zod.object({ provider: zod.string().min(1), model: zod.string().min(1), reasoningEffort: zod.string().min(1).optional() }).strict();
  return zod.object({ routes: zod.array(route).min(1) }).strict();
}
function domainSpec(zod) {
  return {
    name: DOMAIN_NAME,
    version: DOMAIN_VERSION,
    tables: { [TABLE_NAME]: { valueSchema: recordSchema(zod) } }
  };
}
function routesOf(value) {
  if (value === null || typeof value !== "object" || !("routes" in value)) return [];
  return readSubagentRoutes(value.routes) ?? [];
}
function failureCode(error) {
  const code = error?.code;
  return typeof code === "string" ? code : "";
}
function failureText(error) {
  return String(error?.message ?? String(error));
}
function settle(ms) {
  const { promise, resolve } = Promise.withResolvers();
  setTimeout(resolve, ms);
  return promise;
}
function createSubagentModelStore(ctx, log) {
  let domain = null;
  let missing = false;
  let owned = false;
  let failure = null;
  let pending = null;
  let disposed = false;
  function table() {
    if (domain === null) return null;
    try {
      return domain.table(TABLE_NAME);
    } catch (error) {
      failure = failureText(error);
      return null;
    }
  }
  async function open(facility) {
    const zod = await resolveHostPackage("zod");
    if (zod === null || zod === void 0 || typeof zod.object !== "function") {
      failure = "the host resolves no zod to declare the store schema with";
      return;
    }
    const spec = domainSpec(zod);
    for (let attempt = 0; attempt < REOPEN_ATTEMPTS; attempt++) {
      try {
        domain = await facility.open(spec);
        owned = true;
        failure = null;
        return;
      } catch (error) {
        if (failureCode(error) !== "already-open") {
          failure = failureText(error);
          return;
        }
        const held = typeof facility.get === "function" ? facility.get(DOMAIN_NAME) : void 0;
        if (held !== void 0 && held !== null) {
          domain = held;
          owned = false;
          failure = null;
          return;
        }
        if (disposed) return;
        await settle(REOPEN_INTERVAL_MS);
      }
    }
    failure = `the domain name ${DOMAIN_NAME} stayed taken by another generation`;
  }
  function warm() {
    if (disposed || domain !== null) return;
    const facility = ctx.get("storageDomain");
    if (facility === void 0 || facility === null || typeof facility.open !== "function") {
      missing = true;
      return;
    }
    missing = false;
    if (pending !== null) return;
    pending = open(facility).catch((error) => {
      failure = failureText(error);
    });
  }
  function read(sessionId) {
    warm();
    if (missing) return { kind: "unavailable", detail: "the host provides no storage domain service", permanent: true };
    if (failure !== null) return { kind: "unavailable", detail: failure, permanent: false };
    const store = table();
    if (store === null) {
      if (failure !== null) return { kind: "unavailable", detail: failure, permanent: false };
      return { kind: "unavailable", detail: "the selection store is still opening", permanent: false };
    }
    const routes = routesOf(store.get(sessionId));
    return routes.length === 0 ? { kind: "none" } : { kind: "routes", routes };
  }
  async function write(sessionId, routes) {
    warm();
    if (missing) throw new Error("the host provides no storage domain service");
    if (pending !== null) await pending;
    if (failure !== null) throw new Error(failure);
    const store = table();
    if (store === null) throw new Error(failure ?? "the selection store is not open");
    if (routes.length === 0) {
      await store.delete(sessionId);
      return;
    }
    await store.put(sessionId, {
      routes: routes.map((route) => route.reasoningEffort === void 0 ? { provider: route.provider, model: route.model } : { provider: route.provider, model: route.model, reasoningEffort: route.reasoningEffort })
    });
  }
  function dispose() {
    disposed = true;
    if (domain === null || !owned) return;
    const handle = domain;
    domain = null;
    owned = false;
    void handle.close().catch((error) => {
      log?.warn?.(`dsh-deepcraft: the subagent selection store did not close: ${failureText(error)}`);
    });
  }
  return { read, write, warm, dispose };
}
export {
  createSubagentModelStore
};
