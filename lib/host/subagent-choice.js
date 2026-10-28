// packages/contracts/src/subagent.ts
function subagentRouteKey(route) {
  return `${route.provider}\0${route.model}`;
}
function holdsRoute(routes, route) {
  const key = subagentRouteKey(route);
  for (const candidate of routes) if (subagentRouteKey(candidate) === key) return true;
  return false;
}

// packages/host/src/subagent-choice.ts
var SUBAGENT_TOOL_NAME = "subagent";
var POLICY_KEY = "subagentModelSelectionPolicy";
var PROMPT_ORDER = 2810;
var ANCESTRY_MAX = 32;
function routeList(routes) {
  return routes.map((route) => `${route.provider}/${route.model}`).join(", ");
}
function pairNamed(provider, model) {
  const providerNamed = typeof provider === "string" && provider.trim() !== "";
  const modelNamed = typeof model === "string" && model.trim() !== "";
  return { providerNamed, modelNamed, complete: providerNamed && modelNamed };
}
function subagentChoiceDenial(input) {
  if (input.toolName !== SUBAGENT_TOOL_NAME) return void 0;
  const policy = input.routes;
  if (policy === void 0 || policy.length === 0) return void 0;
  const named = pairNamed(input.provider, input.model);
  const selection = input.selection;
  if (selection.kind === "unavailable") {
    return `This session's subagent model selection cannot be read: ${selection.detail}. Retry the call once the selection is readable; do not omit provider and model.`;
  }
  if (selection.kind === "routes") {
    const outside = selection.routes.filter((route) => !holdsRoute(policy, route));
    if (outside.length > 0) {
      return `This session's saved subagent selection names routes its policy no longer allows: ${routeList(outside)}. The reader must change the selection in the composer; the allowed routes are ${routeList(policy)}.`;
    }
    if (named.complete) {
      const route = { provider: input.provider, model: input.model };
      if (holdsRoute(selection.routes, route)) return void 0;
      return `This session routes its subagents through the models its reader picked: ${routeList(selection.routes)}. "${route.provider}/${route.model}" is not one of them. Pass provider and model from that list; the parent's own route is allowed when it is one of them.`;
    }
    return `This session routes its subagents through the models its reader picked: ${routeList(selection.routes)}. Pass provider and model together from that list. Do not omit them. Use list_subagent_models for descriptions.`;
  }
  if (!input.enabled) return void 0;
  if (named.complete) return void 0;
  return `This session requires provider and model on subagent. Allowed routes: ${routeList(policy)}. The same route as the parent is allowed. Call list_subagent_models, then retry with both fields. Do not omit them.`;
}
function subagentChoicePrompt(enabled, routes, selection) {
  if (routes === void 0 || routes.length === 0) return "";
  if (selection.kind === "routes") {
    const picked = selection.routes;
    const outside = picked.filter((route) => !holdsRoute(routes, route));
    if (outside.length > 0) return "";
    if (picked.length === 1) {
      return `When calling \`subagent\`, pass provider and model together as ${routeList(picked)}. That is the only route this session delegates on. Any other route, and an omitted pair, is rejected.`;
    }
    return `When calling \`subagent\`, pass provider and model together, choosing for the task at hand from the routes this session delegates on: ${routeList(picked)}. Any other route, and an omitted pair, is rejected. List order is not a default. Use list_subagent_models for descriptions.`;
  }
  if (selection.kind === "unavailable" || !enabled) return "";
  return `When calling \`subagent\`, pass provider and model together from this session's allowed routes: ${routeList(routes)}. Omitting either field is rejected. The parent's own route is allowed when it is in that list. Use list_subagent_models for descriptions. List order is not a default.`;
}
function readSubagentChoiceEnabled(config) {
  if (config === null || typeof config !== "object" || !("subagentModelChoice" in config)) return false;
  const field = config.subagentModelChoice;
  const value = field !== null && typeof field === "object" && "get" in field && typeof field.get === "function" ? field.get() : field;
  return value === true;
}
function readSubagentRoutes(projections, session) {
  if (session === null || session === void 0) return void 0;
  if (projections === null || typeof projections !== "object") return void 0;
  if (!("stateOf" in projections) || typeof projections.stateOf !== "function") return void 0;
  const policy = projections.stateOf.call(projections, session, POLICY_KEY);
  if (!Array.isArray(policy) || policy.length === 0) return void 0;
  const routes = [];
  for (const entry of policy) {
    if (entry === null || typeof entry !== "object" || !("provider" in entry) || !("model" in entry)) return void 0;
    const { provider, model } = entry;
    if (typeof provider !== "string" || provider === "" || typeof model !== "string" || model === "") return void 0;
    routes.push({ provider, model });
  }
  return routes;
}
function sessionIdOf(session) {
  if (session === null || typeof session !== "object" || !("header" in session)) return null;
  const id = session.header?.id;
  return typeof id === "string" && id !== "" ? id : null;
}
function resolveSubagentSelection(ctx, store, session) {
  const sessions = ctx.get("sessions");
  let current = session;
  for (let depth = 0; depth < ANCESTRY_MAX; depth++) {
    const id = sessionIdOf(current);
    if (id === null) return { kind: "none" };
    const read = store.read(id);
    if (read.kind === "routes") return { kind: "routes", routes: read.routes };
    if (read.kind === "unavailable" && !read.permanent) return { kind: "unavailable", detail: read.detail };
    const parentId = current.header?.parentSession;
    if (typeof parentId !== "string" || parentId === "" || typeof sessions?.get !== "function") return { kind: "none" };
    current = sessions.get(parentId);
    if (current === void 0) return { kind: "none" };
  }
  return { kind: "none" };
}
function registerSubagentChoice(ctx, config, store) {
  const installGuard = () => {
    const tools = ctx.get("tools");
    if (typeof tools?.guard !== "function") return;
    return tools.guard((exec) => {
      const rawArguments = exec?.arguments;
      const provider = rawArguments !== null && typeof rawArguments === "object" && "provider" in rawArguments ? rawArguments.provider : void 0;
      const model = rawArguments !== null && typeof rawArguments === "object" && "model" in rawArguments ? rawArguments.model : void 0;
      const session = exec?.agent?.session;
      return subagentChoiceDenial({
        enabled: readSubagentChoiceEnabled(config),
        toolName: typeof exec?.name === "string" ? exec.name : "",
        provider,
        model,
        routes: readSubagentRoutes(ctx.get("sessionProjections"), session),
        selection: resolveSubagentSelection(ctx, store, session)
      });
    });
  };
  const installPrompt = () => {
    const prompt = ctx.get("systemPrompt");
    if (typeof prompt?.section !== "function") return;
    return prompt.section({
      name: "deepcraft:subagent-model-choice",
      order: PROMPT_ORDER,
      text: (context) => {
        const session = context?.agent?.session;
        return subagentChoicePrompt(
          readSubagentChoiceEnabled(config),
          readSubagentRoutes(ctx.get("sessionProjections"), session),
          resolveSubagentSelection(ctx, store, session)
        );
      }
    });
  };
  const within = (register) => {
    if (typeof ctx.effect !== "function") {
      register();
      return;
    }
    ctx.effect(() => {
      const stop = register();
      return () => {
        if (typeof stop === "function") stop();
      };
    });
  };
  if (typeof ctx.inject === "function") {
    ctx.inject(["tools"], () => {
      within(installGuard);
    });
    ctx.inject(["systemPrompt"], () => {
      within(installPrompt);
    });
    return;
  }
  within(installGuard);
  within(installPrompt);
}
export {
  readSubagentChoiceEnabled,
  readSubagentRoutes,
  registerSubagentChoice,
  resolveSubagentSelection,
  subagentChoiceDenial,
  subagentChoicePrompt
};
