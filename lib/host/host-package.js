// packages/host/src/host-package.ts
import { createRequire } from "node:module";
async function resolveHostPackage(specifier) {
  try {
    const anchor = typeof process.argv[1] === "string" && process.argv[1] !== "" ? process.argv[1] : process.execPath;
    return createRequire(anchor)(specifier);
  } catch {
  }
  try {
    return await import(specifier);
  } catch {
    return null;
  }
}
export {
  resolveHostPackage
};
