// packages/host/src/pets/desktop-worker.ts
import { spawn } from "node:child_process";
var WORKER_FLAG = "--dsh-deepcraft-pet-worker";
var child = null;
var stopping = false;
function stopChild() {
  if (child === null) return;
  const running = child;
  child = null;
  if (running.exitCode === null && running.signalCode === null) running.kill();
}
function shutdown(code = 0) {
  if (stopping) return;
  stopping = true;
  stopChild();
  process.exit(code);
}
function runDesktopWorker() {
  process.on("disconnect", () => shutdown());
  process.on("SIGTERM", () => shutdown());
  process.on("SIGINT", () => shutdown());
  process.on("message", (message) => {
    if (message.type === "stop") {
      shutdown();
      return;
    }
    if (message.type !== "start" || child !== null) return;
    const running = spawn(message.executable, [], {
      // The official player reads the package directory name from this
      // variable; its global settings file is never written.
      env: { ...process.env, PETDEX_PET: message.petId },
      stdio: "ignore",
      windowsHide: false,
      detached: false
    });
    child = running;
    running.once("error", (error) => {
      child = null;
      process.send?.({ type: "failed", error: error.message });
    });
    running.once("exit", (code, signal) => {
      child = null;
      process.send?.({ type: "exited", code, signal });
    });
    if (running.pid === void 0) {
      child = null;
      process.send?.({ type: "failed", error: "the player started without a pid" });
      return;
    }
    process.send?.({ type: "started", pid: running.pid });
  });
  process.send?.({ type: "ready" });
}
if (process.argv.includes(WORKER_FLAG)) runDesktopWorker();
export {
  WORKER_FLAG,
  runDesktopWorker
};
