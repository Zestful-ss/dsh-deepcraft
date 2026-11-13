// packages/host/src/media-store.ts
import { createReadStream, mkdirSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pluginPath } from "./harness-home.js";

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

// packages/host/src/media-store.ts
function createMediaStore(ctx, opts) {
  const dir = () => pluginPath(ctx, opts.dir);
  const find = (kind) => {
    for (const [type, extension] of Object.entries(opts.types)) {
      const path = join(dir(), `${kind}.${extension}`);
      const stat = statSync(path, { throwIfNoEntry: false });
      if (stat?.isFile() !== true) continue;
      return { path, type, version: `${Math.round(stat.mtimeMs)}-${stat.size}`, size: stat.size };
    }
    return null;
  };
  const write = (kind, type, bytes) => {
    const extension = opts.types[type];
    mkdirSync(dir(), { recursive: true });
    const target = join(dir(), `${kind}.${extension}`);
    const temporary = `${target}.${process.pid}.tmp`;
    writeFileSync(temporary, bytes);
    renameSync(temporary, target);
    for (const other of Object.values(opts.types)) {
      if (other !== extension) rmSync(join(dir(), `${kind}.${other}`), { force: true });
    }
  };
  const remove = (kind) => {
    for (const extension of Object.values(opts.types)) rmSync(join(dir(), `${kind}.${extension}`), { force: true });
  };
  return { find, write, remove };
}
function matchesSignature(signatures, type, bytes) {
  const marks = signatures?.[type];
  if (marks === void 0) return true;
  return marks.every(({ offset, bytes: expected }) => bytes.subarray(offset, offset + expected.length).equals(expected));
}
async function storeMedia(store, opts, kind, req, res) {
  const type = (req.headers["content-type"] ?? "").split(";")[0].trim().toLowerCase();
  if (opts.types[type] === void 0) {
    sendJson(res, 415, { ok: false, error: "unsupported media type" });
    return null;
  }
  const bytes = await readRequestBody(req, opts.maxBytes);
  if (bytes === null) {
    res.once("finish", () => setTimeout(() => req.socket.end(), 0));
    sendJson(res, 413, { ok: false, error: "file too large" });
    return null;
  }
  if (bytes.length === 0 || !matchesSignature(opts.signatures, type, bytes)) {
    sendJson(res, 400, { ok: false, error: "not a file of the declared type" });
    return null;
  }
  store.write(kind, type, bytes);
  return bytes;
}
var MEDIA_HEADERS = {
  "cache-control": "no-cache",
  "x-content-type-options": "nosniff"
};
function serveMedia(file, req, res, headers = {}) {
  const all = { ...MEDIA_HEADERS, ...headers, "content-type": file.type, "accept-ranges": "bytes", etag: `"${file.version}"` };
  if (req.headers["if-none-match"] === `"${file.version}"`) {
    res.writeHead(304, all);
    res.end();
    return;
  }
  const range = req.headers.range;
  if (range !== void 0) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    const start = match?.[1] === "" ? void 0 : Number(match?.[1]);
    const last = match?.[2] === "" ? void 0 : Number(match?.[2]);
    if (match === null || start === void 0 && last === void 0 || start !== void 0 && start >= file.size) {
      res.writeHead(416, { ...all, "content-range": `bytes */${file.size}` });
      res.end();
      return;
    }
    const from = start ?? Math.max(0, file.size - last);
    const to = Math.min(file.size - 1, start === void 0 ? file.size - 1 : last ?? file.size - 1);
    if (to < from) {
      res.writeHead(416, { ...all, "content-range": `bytes */${file.size}` });
      res.end();
      return;
    }
    res.writeHead(206, { ...all, "content-length": String(to - from + 1), "content-range": `bytes ${from}-${to}/${file.size}` });
    if (req.method === "HEAD") {
      res.end();
      return;
    }
    createReadStream(file.path, { start: from, end: to }).on("error", () => res.destroy()).pipe(res);
    return;
  }
  res.writeHead(200, { ...all, "content-length": String(file.size) });
  if (req.method === "HEAD") {
    res.end();
    return;
  }
  createReadStream(file.path).on("error", () => res.destroy()).pipe(res);
}
function mediaStatusRoute(ctx, answer) {
  return (req, res) => {
    if (methodRefused(req, res, ["GET"])) return;
    if (fenceRefused(ctx, req, res)) return;
    sendJson(res, 200, answer());
  };
}
function mediaFileRoute(ctx, store, opts, kind, answer, headers = {}) {
  return (req, res) => {
    if (methodRefused(req, res, ["GET", "HEAD", "PUT", "DELETE"])) return;
    if (fenceRefused(ctx, req, res)) return;
    if (req.method === "PUT" || req.method === "DELETE") {
      const done = req.method === "PUT" ? storeMedia(store, opts, kind, req, res).then((stored) => {
        if (stored !== null) sendJson(res, 200, answer());
      }) : Promise.resolve().then(() => {
        store.remove(kind);
        sendJson(res, 200, answer());
      });
      void done.catch((error) => {
        if (res.headersSent) res.destroy();
        else sendJson(res, 500, { ok: false, error: String(error?.message ?? String(error)) });
      });
      return;
    }
    const found = store.find(kind);
    if (found === null) {
      res.writeHead(404, { "cache-control": "no-store" });
      res.end();
      return;
    }
    serveMedia(found, req, res, headers);
  };
}
export {
  createMediaStore,
  mediaFileRoute,
  mediaStatusRoute,
  serveMedia,
  storeMedia
};
