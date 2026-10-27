// packages/host/src/subagent-choice.ts
var SUBAGENT_TOOL_NAME = "subagent";
var POLICY_KEY = "subagentModelSelectionPolicy";
var PROMPT_ORDER = 2810;
function routeList(routes) {
  return routes.map((route) => `${route.provider}/${route.model}`).join(", ");
}
function subagentChoiceDenial(input) {
  if (!input.enabled || input.toolName !== SUBAGENT_TOOL_NAME) return void 0;
  const routes = input.routes;
  if (routes === void 0 || routes.length === 0) return void 0;
  const providerNamed = typeof input.provider === "string" && input.provider.trim() !== "";
  const modelNamed = typeof input.model === "string" && input.model.trim() !== "";
  if (providerNamed && modelNamed) return void 0;
  return `This session requires provider and model on subagent. Allowed routes: ${routeList(routes)}. The same route as the parent is allowed. Call list_subagent_models, then retry with both fields. Do not omit them.`;
}
function subagentChoicePrompt(enabled, routes) {
  if (!enabled || routes === void 0 || routes.length === 0) return "";
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
function registerSubagentChoice(ctx, config) {
  const tools = ctx.get("tools");
  if (typeof tools?.guard !== "function") return;
  const install = () => {
    const stopGuard = tools.guard((exec) => {
      const rawArguments = exec?.arguments;
      const provider = rawArguments !== null && typeof rawArguments === "object" && "provider" in rawArguments ? rawArguments.provider : void 0;
      const model = rawArguments !== null && typeof rawArguments === "object" && "model" in rawArguments ? rawArguments.model : void 0;
      return subagentChoiceDenial({
        enabled: readSubagentChoiceEnabled(config),
        toolName: typeof exec?.name === "string" ? exec.name : "",
        provider,
        model,
        routes: readSubagentRoutes(ctx.get("sessionProjections"), exec?.agent?.session)
      });
    });
    const prompt = ctx.get("systemPrompt");
    const stopPrompt = typeof prompt?.section === "function" ? prompt.section({
      name: "deepcraft:subagent-model-choice",
      order: PROMPT_ORDER,
      text: (context) => subagentChoicePrompt(
        readSubagentChoiceEnabled(config),
        readSubagentRoutes(ctx.get("sessionProjections"), context?.agent?.session)
      )
    }) : void 0;
    return () => {
      stopGuard();
      if (typeof stopPrompt === "function") stopPrompt();
    };
  };
  if (typeof ctx.effect === "function") ctx.effect(install);
  else install();
}
export {
  readSubagentChoiceEnabled,
  readSubagentRoutes,
  registerSubagentChoice,
  subagentChoiceDenial,
  subagentChoicePrompt
};
