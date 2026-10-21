// packages/host/src/pets/session.ts
import { desktopPetBridge } from "./desktop.js";
function asSession(value) {
  return value !== null && typeof value === "object" ? value : null;
}
function asEvent(value) {
  return value !== null && typeof value === "object" ? value : {};
}
function installSessionBridge(ctx) {
  if (typeof ctx.inject !== "function") return;
  ctx.inject(["sessions"], (scope) => {
    const sessions = scope.sessions;
    if (sessions === void 0 || sessions === null || typeof sessions.list !== "function") return;
    const bridge = desktopPetBridge();
    if (bridge === null) return;
    const on = scope.on;
    if (typeof on !== "function") return;
    try {
      for (const session of sessions.list()) bridge.onCreated(asSession(session));
    } catch {
    }
    const offs = [
      on("session/created", (session) => bridge.onCreated(asSession(session)), { global: true }),
      on("session/disposed", (session) => bridge.onDisposed(asSession(session)), { global: true }),
      on("session/event", (session, event) => {
        const source = asSession(session);
        if (source !== null) bridge.onEvent(source, asEvent(event));
      }, { global: true })
    ];
    scope.effect(() => () => {
      for (const off of offs) if (typeof off === "function") off();
    }, "dsh-deepcraft: session bridge");
  });
}
export {
  installSessionBridge
};
