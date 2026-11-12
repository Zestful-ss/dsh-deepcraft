// packages/contracts/src/package.ts
var PACKAGE_NAME = "dsh-deepcraft";

// packages/host/src/index.ts
import { createSubagentModelStore } from "./subagent-models/store.js";
import { registerRoutes } from "./routes.js";
import { registerSettings } from "./settings.js";
import { registerSubagentChoice } from "./subagent-choice.js";
import { Config } from "./settings.js";
var name = PACKAGE_NAME;
function apply(ctx, config) {
  const models = createSubagentModelStore(ctx, ctx.logger);
  if (typeof ctx.effect === "function") ctx.effect(() => () => models.dispose());
  models.warm();
  if (typeof ctx.inject === "function") ctx.inject(["webServer"], (scope) => {
    registerRoutes(ctx, scope, models);
  });
  else registerRoutes(ctx, ctx, models);
  registerSettings(ctx);
  registerSubagentChoice(ctx, config, models);
}
export {
  Config,
  apply,
  name
};
