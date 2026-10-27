// packages/contracts/src/package.ts
var PACKAGE_NAME = "dsh-deepcraft";

// packages/host/src/index.ts
import { registerRoutes } from "./routes.js";
import { registerSettings } from "./settings.js";
import { registerSubagentChoice } from "./subagent-choice.js";
import { Config } from "./settings.js";
var name = PACKAGE_NAME;
function apply(ctx, config) {
  if (typeof ctx.inject === "function") ctx.inject(["webServer"], (scope) => {
    registerRoutes(ctx, scope);
  });
  else registerRoutes(ctx, ctx);
  registerSettings(ctx);
  registerSubagentChoice(ctx, config);
}
export {
  Config,
  apply,
  name
};
