/**
 * The smoke's host half, in Node: lib/host/index.js applied to a fake cordis
 * context, and its private routes driven with the request shapes that matter
 * (D75).
 */
'use strict'
const fs = require('fs')
const http = require('http')
const path = require('path')
const { Readable } = require('stream')
const { pathToFileURL } = require('url')
const { brotliDecompressSync } = require('zlib')
const { ROOT, HOST, same, check } = require('./shared.cjs')
const { subagentChoiceChecks } = require('./host-half-subagent.cjs')
const { subagentStoreChecks } = require('./host-half-subagent-models.cjs')
const { hostUsage } = require('./host-half-usage.cjs')

// ---------------------------------------------------------------------------
// Host half
// ---------------------------------------------------------------------------

/**
 * lib/host/index.js applied to a fake cordis context.
 *
 * @param mod - the host-half module.
 * @param options - `fenced` offers the host's own request check, `home` answers
 *   `dshHomePath` with a scratch harness home, and `live` names the sessions the
 *   fake `sessions` service reports as open, and `events` maps a session id to
 *   the durable events the fake `sessionQuery` answers for it. That service
 *   carries the host's three shapes: the per-id read, the point observation
 *   (each read is pushed onto `reads`, each lease release onto `releases`) and
 *   the batch reader (a corpus listing per call, its size pushed onto
 *   `listCalls`); `stored` is the snapshot list the fake `sessionPersistence`
 *   answers (each listing is pushed onto `lists`); `registry` is the fake
 *   `workspaceRegistry` service object itself, whose `unarchived` list records
 *   every call.
 */
function fakeHost(mod, options = {}) {
  const { fenced, home, live = [], events, stored, reads, releases, lists, listCalls, registry, tails, queryShapes } = options
  const shapes = queryShapes ?? ['readSession', 'observeSession', 'readTitleSnapshots']
  const routes = {}
  const settings = { configure: () => () => {} }
  // Modelled on the host's connection.requestRejection(): the Host/Origin fence
  // (loopback, no cross-site marker, Origin naming the Host), then the cookie.
  const connection = {
    requestRejection(req) {
      const h = req.headers
      if (!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(h.host ?? '')) return 403
      if (h['sec-fetch-site'] === 'cross-site') return 403
      if (h.origin !== undefined && new URL(h.origin).host !== h.host) return 403
      return /dsh-auth-/.test(h.cookie ?? '') ? undefined : 401
    },
  }
  const ctx = {
    fiber: { entry: { id: 'include:ui-skin-deepcraft' } },
    logger: { warn() {} },
    get: (name) => {
      if (name === 'connection' && fenced) return connection
      if (name === 'dshHomePath' && home !== undefined) return (...segments) => path.join(home, ...segments)
      if (name === 'sessions') return {
        get: (id) => (live.includes(id) ? {} : undefined),
        list: () => live.map((id) => ({
          id,
          header: { id },
          // The host's own `Session.seq` is the next sequence number, not the
          // event count: this log's events are numbered from 1.
          seq: (events?.[id] ?? []).reduce((next, event) => Math.max(next, event.seq + 1), 0),
          // The host's own live Session: the events from one seq onward (D3).
          snapshotEvents: (fromSeq) => {
            if (tails !== undefined) tails.push([id, fromSeq])
            return (events?.[id] ?? []).filter((event) => event.seq >= fromSeq)
          },
        })),
      }
      if (name === 'sessionPersistence' && stored !== undefined) {
        return { list: async () => { if (lists !== undefined) lists.push(stored.length); return stored } }
      }
      if (name === 'sessionQuery' && events !== undefined) {
        // The host reads one log per id; the fake records the id and answers the
        // same complete event array the real service hands back.
        const log = (id) => {
          if (reads !== undefined) reads.push(id)
          return events[id] ?? []
        }
        // An id the real backend does not know is refused, and resolving one it
        // does know through `readSession` means listing the whole stored corpus
        // (every header opened). The host half is expected to avoid that walk
        // entirely, so `listCalls` records every id that would have cost it.
        const known = (id) => stored === undefined || live.includes(id) || stored.some((entry) => entry.header.id === id)
        const missing = (id) => Object.assign(new Error(`session "${id}" not found`), { code: 'SESSION_QUERY_SESSION_NOT_FOUND' })
        const listed = (id) => {
          if (listCalls !== undefined) listCalls.push(id)
          return stored?.find((entry) => entry.header.id === id)
        }
        return {
          ...(shapes.includes('observeSession') ? {
            // The listing-free read: a `stat` by id and the restored log in a
            // disposable lease, released through `Symbol.dispose`.
            observeSession: async (id) => {
              if (!known(id)) throw missing(id)
              return {
                source: 'prepared',
                header: { id },
                events: log(id),
                cursor: -1,
                revision: 'r',
                [Symbol.dispose]() { if (releases !== undefined) releases.push(id) },
              }
            },
          } : {}),
          ...(shapes.includes('readSession') ? {
            // The fallback for a host publishing only this one: it resolves the
            // id through a corpus listing, so the fake charges it that walk.
            readSession: async (id) => {
              const snapshot = listed(id)
              if (!known(id)) throw missing(id)
              return { session: snapshot?.header ?? { id }, events: log(id) }
            },
          } : {}),
          ...(shapes.includes('readTitleSnapshots') ? {
            // The service's REAL batch reader folds TITLES: its projector
            // consumes `source.events` and discards them, so the value carries no
            // events at all. A caller that expects a log from it is caught here
            // rather than silently folding nothing.
            readTitleSnapshots: async (sessionIds) => {
              if (listCalls !== undefined) listCalls.push(...sessionIds)
              return sessionIds.map((id) => {
                if (!known(id)) return { status: 'rejected', sessionId: id, reason: missing(id) }
                return { status: 'fulfilled', sessionId: id, value: { session: { id } } }
              })
            },
          } : {}),
        }
      }
      if (name === 'workspaceRegistry' && registry !== undefined) return registry
      return undefined
    },
    effect: (fn) => fn(),
    inject: (deps, cb) => cb({
      effect: (fn) => fn(),
      get: (name) => ctx.get(name),
      settings,
      webServer: { register(route) { routes[route.path] = route; return () => {} } },
    }),
  }
  mod.apply(ctx)
  return { routes }
}

/**
 * One request through a registered route; resolves with `{ status, body }`, and
 * with the answer's bytes as `raw` (the skin route answers with a picture).
 *
 * `peer` is the socket address the route sees. The local stand-in reads it, so a
 * request made from this machine carries this machine's address (D75) unless a
 * check asks for another.
 */
function request(host, route, method, body, headers, peer = '127.0.0.1') {
  const req = Readable.from(body ? [Buffer.from(body)] : [])
  Object.assign(req, { method, url: route, headers, socket: { remoteAddress: peer } })
  return new Promise((resolve) => {
    const res = {
      status: 0,
      writeHead(status) { this.status = status },
      end(chunk) {
        const raw = chunk === undefined ? null : (Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)))
        resolve({ status: this.status, body: raw === null ? '' : raw.toString(), raw })
      },
    }
    Promise.resolve(host.routes[route.split('?')[0]].handler(req, res)).catch((error) => resolve({ status: -1, body: String(error), raw: null }))
  })
}

async function hostHalf() {
  const mod = await import(pathToFileURL(HOST).href)
  await subagentChoiceChecks()
  await subagentStoreChecks()
  const PREFS = '/dsh-deepcraft/prefs'
  const browser = { host: '127.0.0.1:43120', origin: 'http://127.0.0.1:43120', 'sec-fetch-site': 'same-origin', cookie: 'dsh-auth-x=1' }
  const crossSite = { host: '127.0.0.1:43120', origin: 'https://attacker.example', 'sec-fetch-site': 'cross-site' }
  const lanPeer = { host: '192.168.1.23:43120' }
  const rebound = { host: 'attacker.example:43120', origin: 'http://attacker.example:43120', 'sec-fetch-site': 'same-origin' }

  // Session deletion: the route removes one stored session directory. The root
  // is a scratch harness home under .debug/, never the user's own.
  const DELETE = '/dsh-deepcraft/session-delete'
  const scratchHome = path.join(ROOT, '.debug', 'smoke-home')
  const scratchCwd = path.join(scratchHome, 'sessions', '--D-smoke--')
  const scratchId = 'session-smoke-delete-0001'

  for (const fenced of [true, false]) {
    console.log(`\nhost half — ${fenced ? "through the host's connection.requestRejection()" : 'through the local stand-in (no connection service)'}`)
    const host = fakeHost(mod, { fenced, home: scratchHome })
    if (fenced) {
      // A profile entry the Config refuses keeps the host from starting the
      // whole package (D75): the values earlier builds stored still pass. A
      // `.volatile()` field resolves to an accessor, read through its `get()`.
      const resolved = (config) => {
        const [[key, stored]] = Object.entries(config)
        try {
          const field = mod.Config(config)[key]
          const value = typeof field?.get === 'function' ? field.get() : field
          return { ok: value === stored, detail: `resolved to ${JSON.stringify(value)}` }
        } catch (error) {
          return { ok: false, detail: `refused: ${error.message}` }
        }
      }
      for (const config of [{ brand: 'off' }, { brand: 'claude' }, { chatPetClaude: 'crab-buddy' }, { chatPetDeepseek: 'whaledou' }, { palette: 'claude' }, { palette: 'forest' }, { chatPet: 'my-pet' }]) {
        const { ok, detail } = resolved(config)
        check(`the Config takes a stored ${JSON.stringify(config)}`, typeof mod.Config === 'function' && ok, detail)
      }
    }
    check('the preferences route is gone', host.routes[PREFS] === undefined)
    check('the session delete route is registered', host.routes[DELETE] !== undefined)
    fs.rmSync(scratchHome, { recursive: true, force: true })
    fs.mkdirSync(path.join(scratchCwd, scratchId), { recursive: true })
    fs.writeFileSync(path.join(scratchCwd, scratchId, 'session.v4.jsonl.zstd'), 'x')
    for (const [label, headers] of [['cross-site page', crossSite], ['LAN peer', lanPeer], ['DNS-rebound page', rebound]]) {
      const refused = await request(host, DELETE, 'POST', JSON.stringify({ sessionId: scratchId }), headers)
      check(`${label}: session delete refused`, refused.status === 401 || refused.status === 403, `HTTP ${refused.status}`)
    }
    const read = await request(host, DELETE, 'GET', '', browser)
    check('session delete answers 405 to a read', read.status === 405, `HTTP ${read.status}`)
    const traversal = await request(host, DELETE, 'POST', JSON.stringify({ sessionId: '../escape' }), browser)
    check('a path-shaped id is refused', traversal.status === 400, `HTTP ${traversal.status}`)
    // A plugin-generated id carries `:` and `@`, which the harness escapes into
    // the directory name it stores the session under; the delete has to reach
    // that name (issue #85).
    const namespacedId = 'im:feishu:dm:ou_9f2:token-7@open.feishu.cn'
    const namespacedDir = path.join(scratchCwd, 'im~003Afeishu~003Adm~003Aou_9f2~003Atoken-7~0040open.feishu.cn')
    fs.mkdirSync(namespacedDir, { recursive: true })
    fs.writeFileSync(path.join(namespacedDir, 'session.v4.jsonl.zstd'), 'x')
    const namespaced = await request(host, DELETE, 'POST', JSON.stringify({ sessionId: namespacedId }), browser)
    check('a namespaced id is deleted under the name the harness stored it under',
      namespaced.status === 200 && JSON.parse(namespaced.body).ghost === false && fs.existsSync(namespacedDir) === false,
      `HTTP ${namespaced.status} ${namespaced.body}`)
    // An id carrying the escape itself names no session: the storage writes `~`
    // as `~007E`, so resolving this one through its own spelling would delete
    // whichever session owns the name it spells out.
    const escapedId = 'im:feishu~002Edm'
    const escapedDir = path.join(scratchCwd, 'im~003Afeishu~002E~002Edm')
    fs.mkdirSync(escapedDir, { recursive: true })
    const escaped = await request(host, DELETE, 'POST', JSON.stringify({ sessionId: escapedId }), browser)
    check('an id carrying the escape is refused',
      escaped.status === 400 && fs.existsSync(escapedDir) === true, `HTTP ${escaped.status}`)
    fs.rmSync(escapedDir, { recursive: true, force: true })
    const absent = await request(host, DELETE, 'POST', JSON.stringify({ sessionId: 'session-smoke-absent' }), browser)
    check('a stored-directory miss answers as a deleted ghost',
      absent.status === 200 && JSON.parse(absent.body).ok === true && JSON.parse(absent.body).ghost === true, `HTTP ${absent.status}`)
    const liveHost = fakeHost(mod, { fenced, home: scratchHome, live: [scratchId] })
    const live = await request(liveHost, DELETE, 'POST', JSON.stringify({ sessionId: scratchId }), browser)
    check('a live session is refused', live.status === 409, `HTTP ${live.status}`)
    check('the refused session is still on disk', fs.existsSync(path.join(scratchCwd, scratchId)) === true)
    const done = await request(host, DELETE, 'POST', JSON.stringify({ sessionId: scratchId }), browser)
    check('a stored session is deleted', done.status === 200 && JSON.parse(done.body).ok === true, `HTTP ${done.status}`)
    check('the session directory is gone', fs.existsSync(path.join(scratchCwd, scratchId)) === false)
    // With a workspace registry the delete also forgets the id: a ghost — an
    // archive entry whose stored directory is already gone — leaves the set
    // through the miss branch, and the stored session's entry goes once the
    // directory itself is gone.
    const trackRegistry = () => ({
      archived: [],
      unarchived: [],
      unarchiveSession(id) {
        this.unarchived.push({ id, dirGone: fs.existsSync(path.join(scratchCwd, id)) === false })
        this.archived = this.archived.filter((known) => known !== id)
        return Promise.resolve()
      },
    })
    const ghostRegistry = trackRegistry()
    ghostRegistry.archived = ['session-smoke-ghost-0001']
    const ghostHost = fakeHost(mod, { fenced, home: scratchHome, registry: ghostRegistry })
    const ghost = await request(ghostHost, DELETE, 'POST', JSON.stringify({ sessionId: 'session-smoke-ghost-0001' }), browser)
    check('a ghost archive entry is deleted and leaves the archive set',
      ghost.status === 200 && JSON.parse(ghost.body).ghost === true && ghostRegistry.archived.length === 0 &&
        same(ghostRegistry.unarchived, [{ id: 'session-smoke-ghost-0001', dirGone: true }]),
      JSON.stringify({ status: ghost.status, body: ghost.body, registry: ghostRegistry }))
    fs.mkdirSync(path.join(scratchCwd, scratchId), { recursive: true })
    fs.writeFileSync(path.join(scratchCwd, scratchId, 'session.v4.jsonl.zstd'), 'x')
    const realRegistry = trackRegistry()
    realRegistry.archived = [scratchId]
    const registryHost = fakeHost(mod, { fenced, home: scratchHome, registry: realRegistry })
    const settled = await request(registryHost, DELETE, 'POST', JSON.stringify({ sessionId: scratchId }), browser)
    check('a stored delete unarchives the id after the directory is gone',
      settled.status === 200 && JSON.parse(settled.body).ghost === false && realRegistry.archived.length === 0 &&
        same(realRegistry.unarchived, [{ id: scratchId, dirGone: true }]),
      JSON.stringify({ status: settled.status, body: settled.body, registry: realRegistry }))
  }

  await hostUsage({ mod, fakeHost, request, browser, scratchHome, scratchCwd })

  // Message-content search over the query service's raw logs: a phrase inside
  // a Chinese sentence matches, case and runs of whitespace do not matter,
  // injected context, tool-call arguments and subagent children stay out, and a
  // stored session is read again only when the palette's prewarm re-lists a
  // moved revision.
  console.log('\nhost half — public assets')
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'lib', 'assets', 'manifest.json'), 'utf8')).assets
  const [assetName, asset] = Object.entries(manifest)[0] ?? []
  if (assetName === undefined) throw new Error('no routed assets in lib/assets/manifest.json; run npm run build')
  // Every name the manifest carries has its file: the manifest is what the
  // route answers from, so an entry an earlier build's cleanup removed (D72)
  // would have the route refuse a name the manifest promises.
  const dangling = Object.entries(manifest)
    .filter(([name, entry]) => !fs.existsSync(path.join(ROOT, 'lib', 'assets', entry.encoding === 'br' ? `${name}.br` : name)))
    .map(([name]) => name)
  check('every asset the manifest names is on disk', dangling.length === 0, dangling.join(', '))
  const storedPath = path.join(ROOT, 'lib', 'assets', asset.encoding === 'br' ? `${assetName}.br` : assetName)
  const assets = fakeHost(mod, {})
  const compressed = await requestAsset(assets, `/dsh-deepcraft/assets/${assetName}`, { 'accept-encoding': 'gzip, br' })
  check('a routed asset is served as it is stored, under its content hash and its own type, cached for good',
    compressed.status === 200 && compressed.headers['content-type'] === asset.type && /immutable/.test(compressed.headers['cache-control']) &&
      compressed.headers['content-encoding'] === 'br' && compressed.raw !== null &&
      Buffer.compare(compressed.raw, fs.readFileSync(storedPath)) === 0,
    `HTTP ${compressed.status} ${JSON.stringify(compressed.headers)}`)
  const plain = await requestAsset(assets, `/dsh-deepcraft/assets/${assetName}`)
  check('a client that does not take brotli gets the same asset decompressed, so nothing is missing',
    plain.status === 200 && plain.headers['content-encoding'] === undefined &&
      plain.raw !== null && plain.raw.toString('utf8') === brotliDecompressSync(fs.readFileSync(storedPath)).toString('utf8'),
    `HTTP ${plain.status} ${JSON.stringify(plain.headers)}`)
  for (const url of ['/dsh-deepcraft/assets/missing.svg', '/dsh-deepcraft/assets/..%2fclient.js',
    '/dsh-deepcraft/assets/../../package.json', '/dsh-deepcraft/assets/', `/dsh-deepcraft/assets/${assetName}/x`]) {
    const answer = await requestAsset(assets, url)
    check(`nothing but a name the build wrote answers under the assets route: ${url}`, answer.status === 404, `HTTP ${answer.status}`)
  }

  // The debug retention (D72): a linked checkout rebuilds while a page runs the
  // previous bundle, which asks for that build's chunk names. The flag keeps
  // those names and their files in the manifest; a build without it ships
  // exactly its own set.
  console.log('\nbuild — the debug asset retention')
  const { writeAssets } = await import(pathToFileURL(path.join(ROOT, 'packages', 'assets', 'assets.mjs')).href)
  const retainDir = path.join(ROOT, '.debug', 'smoke-assets-retention')
  fs.rmSync(retainDir, { recursive: true, force: true })
  const assetPlan = (...names) => ({
    routed: names.map((name) => ({
      file: name, bytes: Buffer.from(name), text: name, type: 'text/javascript; charset=utf-8',
      hash: name.split('.')[0], name, url: `/dsh-deepcraft/assets/${name}`, inline: false,
    })),
  })
  const readRetained = () => JSON.parse(fs.readFileSync(path.join(retainDir, 'assets', 'manifest.json'), 'utf8')).assets
  writeAssets(retainDir, assetPlan('aaaa1111.js'))
  const retained = writeAssets(retainDir, assetPlan('bbbb2222.js'), { retain: true })
  check('the debug build keeps what the earlier build shipped, so a page running it still finds its chunks',
    retained.kept === 1 && readRetained()['aaaa1111.js'] !== undefined &&
      fs.existsSync(path.join(retainDir, 'assets', 'aaaa1111.js.br')),
    `kept ${retained.kept} ${JSON.stringify(Object.keys(readRetained()))}`)
  const exact = writeAssets(retainDir, assetPlan('bbbb2222.js'))
  check('a build without the debug flag ships only its own assets',
    exact.kept === 0 && readRetained()['aaaa1111.js'] === undefined &&
      !fs.existsSync(path.join(retainDir, 'assets', 'aaaa1111.js.br')),
    `kept ${exact.kept} ${JSON.stringify(Object.keys(readRetained()))}`)

  // The faces the package ships: the build copies each into lib/fonts/, which
  // package.json carries, and the route answers it byte for byte under its own
  // content type.
  //
  // The user's own drop point is `$DSH_HOME/dsh-deepcraft/fonts/` (D75): a
  // copy there answers a name the package does not carry, and wins over a
  // bundled face of the same name. Both halves run against a scratch harness
  // home, so the answer says nothing about what the machine running this has
  // installed.
  console.log('\nhost half — the fonts route and the drop point')
  const fontHome = path.join(ROOT, '.debug', 'smoke-font-home')
  const droppedDir = path.join(fontHome, 'dsh-deepcraft', 'fonts')
  fs.rmSync(fontHome, { recursive: true, force: true })
  const fontHost = fakeHost(mod, { home: fontHome })
  const packaged = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).files
  const fontSource = path.join(ROOT, 'packages', 'assets', 'src', 'fonts')
  for (const [name, type] of [['JetBrainsMonoVariable.ttf', 'font/ttf'], ['InterVariable.woff2', 'font/woff2'], ['NotoSerifVariable.woff2', 'font/woff2']]) {
    const face = await requestAsset(fontHost, `/dsh-deepcraft/fonts/${name}`)
    check(`the packaged face ${name} ships in the package and is served as ${type}`,
      packaged.includes('lib') && face.status === 200 && face.headers['content-type'] === type &&
        face.raw !== null && Buffer.compare(face.raw, fs.readFileSync(path.join(fontSource, name))) === 0,
      `HTTP ${face.status} ${JSON.stringify(face.headers)}`)
  }
  const absent = await requestAsset(fontHost, '/dsh-deepcraft/fonts/AnthropicSansWebText.ttf')
  check('a face the package does not carry is a 404 until the user drops one in',
    absent.status === 404, `HTTP ${absent.status}`)
  fs.mkdirSync(droppedDir, { recursive: true })
  fs.writeFileSync(path.join(droppedDir, 'JetBrainsMonoVariable.ttf'), Buffer.from('dropped-mono'))
  // The three faces the package does not carry: the drop point answers each of
  // their names, so a name missing from the route's whitelist shows up here.
  for (const name of ['AnthropicSansWebText.ttf', 'AnthropicSerifWebText.ttf', 'AnthropicMonoWeb.ttf']) {
    const payload = `dropped-${name}`
    fs.writeFileSync(path.join(droppedDir, name), Buffer.from(payload))
    const dropped = await requestAsset(fontHost, `/dsh-deepcraft/fonts/${name}`)
    check(`the face ${name} the package does not carry is served from the drop point`,
      dropped.status === 200 && dropped.headers['content-type'] === 'font/ttf' &&
        dropped.raw !== null && dropped.raw.toString('utf8') === payload,
      `HTTP ${dropped.status} ${JSON.stringify(dropped.headers)}`)
  }
  const overridden = await requestAsset(fontHost, '/dsh-deepcraft/fonts/JetBrainsMonoVariable.ttf')
  check("the user's own copy wins over the bundled face of the same name",
    overridden.status === 200 && overridden.raw !== null && overridden.raw.toString('utf8') === 'dropped-mono',
    `HTTP ${overridden.status} ${JSON.stringify(overridden.headers)}`)
  fs.rmSync(fontHome, { recursive: true, force: true })

  // The pets library and its import boundaries (D80). Every file lands under a
  // scratch user profile, never the machine's own ~/.petdex; the atlas is a
  // generated 768×936 PNG with the v1 geometry (eight columns, nine rows).
  console.log('\nhost half — the pets library')
  const { zipSync } = require('fflate')
  const { PNG } = require('pngjs')
  const petProfile = path.join(ROOT, '.debug', 'smoke-pet-home')
  fs.rmSync(petProfile, { recursive: true, force: true })
  const savedProfile = process.env.USERPROFILE
  const savedHome = process.env.HOME
  // os.homedir() reads USERPROFILE on Windows and HOME elsewhere; both point
  // at the scratch directory so no run touches the machine's own ~/.petdex.
  process.env.USERPROFILE = petProfile
  process.env.HOME = petProfile
  const petHost = fakeHost(mod, { fenced: true, home: path.join(petProfile, 'harness') })
  const atlas = (() => {
    const png = new PNG({ width: 768, height: 936 })
    for (let y = 0; y < 936; y++) for (let x = 0; x < 768; x++) {
      const at = (y * 768 + x) * 4
      png.data[at] = (x + y) % 256
      png.data[at + 1] = Math.floor(y / 104) * 24
      png.data[at + 2] = Math.floor(x / 96) * 24
      png.data[at + 3] = 255
    }
    return PNG.sync.write(png)
  })()
  const petManifest = Buffer.from(JSON.stringify({
    id: 'smoke-pet', displayName: 'Smoke Pet', description: 'a package', spritesheetPath: 'atlas.png',
  }, null, 2))
  const zip = (files) => zipSync(files, { level: 0 })
  const importAnswer = async (archive) => request(petHost, '/dsh-deepcraft/pets/import', 'POST', archive, {
    ...browser, 'content-type': 'application/zip',
  })
  const imported = await importAnswer(zip({ 'pet.json': petManifest, 'atlas.png': atlas }))
  const importedBody = JSON.parse(imported.body)
  check('a complete ZIP installs and answers its descriptor',
    imported.status === 200 && importedBody.ok === true && importedBody.pet.id === 'smoke-pet' &&
      importedBody.pet.sourceId === 'smoke-pet' && importedBody.pet.spriteVersionNumber === 1 &&
      importedBody.pet.frameWidth === 96 && importedBody.pet.frameHeight === 104 && importedBody.pet.atlasRows === 9,
    `HTTP ${imported.status} ${imported.body.slice(0, 200)}`)
  const storedManifest = path.join(petProfile, '.petdex', 'pets', 'smoke-pet', 'pet.json')
  const storedAtlas = path.join(petProfile, '.petdex', 'pets', 'smoke-pet', 'atlas.png')
  check('the manifest and atlas are stored byte for byte',
    fs.existsSync(storedManifest) && Buffer.compare(fs.readFileSync(storedManifest), petManifest) === 0 &&
      Buffer.compare(fs.readFileSync(storedAtlas), atlas) === 0)
  const again = await importAnswer(zip({ 'pet.json': petManifest, 'atlas.png': atlas }))
  check('identical content reuses its directory', JSON.parse(again.body).pet.id === 'smoke-pet')
  const changed = Buffer.from(JSON.stringify({
    id: 'smoke-pet', displayName: 'Smoke Pet v2', spritesheetPath: 'atlas.png',
  }, null, 2))
  const other = await importAnswer(zip({ 'pet.json': changed, 'atlas.png': atlas }))
  const otherBody = JSON.parse(other.body)
  check('different content under the same manifest id installs beside it under a hash name',
    other.status === 200 && otherBody.pet.id !== 'smoke-pet' && otherBody.pet.id.indexOf('dsh-') === 0 &&
      otherBody.pet.sourceId === 'smoke-pet', other.body.slice(0, 200))
  check('the original package stays untouched',
    Buffer.compare(fs.readFileSync(storedManifest), petManifest) === 0)
  const image = await new Promise((resolve) => {
    const req = Readable.from([])
    Object.assign(req, { method: 'GET', url: '/dsh-deepcraft/pets/image/smoke-pet?v=one', headers: browser, socket: { remoteAddress: '127.0.0.1' } })
    const res = {
      status: 0, headers: {}, writeHead(status, headers) { this.status = status; this.headers = headers || {} },
      end(chunk) { resolve({ status: this.status, headers: this.headers, raw: chunk ?? null }) },
    }
    petHost.routes['/dsh-deepcraft/pets/image'].handler(req, res)
  })
  check('the image route answers the stored bytes as a versioned private image',
    image.status === 200 && image.headers['content-type'] === 'image/png' &&
      image.headers['x-content-type-options'] === 'nosniff' &&
      /private/.test(image.headers['cache-control'] || '') && Buffer.compare(image.raw, atlas) === 0,
    `HTTP ${image.status} ${JSON.stringify(image.headers)}`)
  const traversal = await importAnswer(zip({ '../evil.png': atlas }))
  check('an archive entry that escapes the package root is refused', traversal.status === 400, `HTTP ${traversal.status}`)
  const pathManifest = Buffer.from(JSON.stringify({ id: 'smoke-pet', spritesheetPath: '../atlas.png' }))
  const escaping = await importAnswer(zip({ 'pet.json': pathManifest, 'atlas.png': atlas }))
  check('a spritesheetPath that names a path is refused', escaping.status === 400, `HTTP ${escaping.status}`)
  const versionManifest = Buffer.from(JSON.stringify({ id: 'smoke-pet', spritesheetPath: 'atlas.png', spriteVersionNumber: 2 }))
  const wrongVersion = await importAnswer(zip({ 'pet.json': versionManifest, 'atlas.png': atlas }))
  check('a declared version that disagrees with the atlas is refused', wrongVersion.status === 400, `HTTP ${wrongVersion.status}`)
  const unknown = await request(petHost, '/dsh-deepcraft/pets/ensure', 'POST', JSON.stringify({ id: 'missing' }), {
    ...browser, 'content-type': 'application/json',
  })
  check('an id the library does not hold is a 404', unknown.status === 404, `HTTP ${unknown.status}`)
  fs.mkdirSync(path.join(petProfile, '.petdex', 'pets', 'broken'), { recursive: true })
  const listed = await request(petHost, '/dsh-deepcraft/pets', 'GET', '', browser)
  const listedBody = JSON.parse(listed.body)
  check('a broken package is reported beside the readable ones, never in place of them',
    listed.status === 200 && listedBody.invalid.some((entry) => entry.id === 'broken') &&
      listedBody.pets.some((pet) => pet.id === 'smoke-pet'),
    listed.body.slice(0, 300))
  if (savedProfile === undefined) delete process.env.USERPROFILE
  else process.env.USERPROFILE = savedProfile
  if (savedHome === undefined) delete process.env.HOME
  else process.env.HOME = savedHome
  fs.rmSync(petProfile, { recursive: true, force: true })
}

/**
 * One GET through the plugin's public prefix route (the model copy, the fonts,
 * the routed assets); resolves with the status, the headers the route wrote and
 * the bytes.
 *
 * @param host - the fake host (fakeHost).
 * @param url - the request path.
 * @param headers - request headers; the assets route reads accept-encoding.
 */
function requestAsset(host, url, headers = {}) {
  return new Promise((resolve) => {
    const res = {
      status: 0,
      headers: {},
      writeHead(status, headers) {
        this.status = status
        this.headers = headers || {}
      },
      end(chunk) { resolve({ status: this.status, headers: this.headers, raw: chunk === undefined ? null : chunk }) },
    }
    host.routes['/dsh-deepcraft'].handler({ method: 'GET', url, headers }, res)
  })
}

module.exports = { hostHalf }
