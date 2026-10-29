/**
 * The subagent route selection's host checks: the store over a fake domain
 * facility, and the route that reads and writes one session (D75).
 *
 * The fake facility validates what it is handed with the spec's own schema, so
 * the record's shape is exercised as the host's domain form would exercise it;
 * nothing here re-implements the domain beyond the four calls the store makes.
 */
'use strict'
const path = require('path')
const { EventEmitter } = require('events')
const { pathToFileURL } = require('url')
const { ROOT, check } = require('./shared.cjs')

/** One in-memory domain: `get`, `put` and `delete` over a map, `put` validating with the spec's schema. */
function makeDomain(spec) {
  const tables = new Map()
  return {
    name: spec.name,
    table(name) {
      if (!tables.has(name)) {
        const schema = spec.tables[name].valueSchema
        const rows = new Map()
        tables.set(name, {
          rows,
          get: (key) => rows.get(key),
          put: async (key, value) => { rows.set(key, schema.parse(value)) },
          delete: async (key) => rows.delete(key),
        })
      }
      return tables.get(name)
    },
    close: async () => {},
  }
}

/** The domain form: one name per process, `already-open` for the second caller, `get` for the handle. */
function fakeDomainFacility() {
  const domains = new Map()
  const facility = {
    spec: null,
    async open(spec) {
      facility.spec = spec
      if (domains.has(spec.name)) throw Object.assign(new Error(`domain '${spec.name}' is already open`), { code: 'already-open' })
      const domain = makeDomain(spec)
      domains.set(spec.name, domain)
      return domain
    },
    get: (name) => domains.get(name),
  }
  return facility
}

/** A request the route's handler takes: Node's shape, with one body chunk. */
function request(method, url, body, headers = { host: '127.0.0.1:3080' }) {
  const emitter = new EventEmitter()
  emitter.method = method
  emitter.url = url
  emitter.headers = headers
  emitter.socket = { remoteAddress: '127.0.0.1' }
  setImmediate(() => {
    if (body !== undefined) emitter.emit('data', Buffer.from(typeof body === 'string' ? body : JSON.stringify(body)))
    emitter.emit('end')
  })
  return emitter
}

/** A response that records its status and parsed body. */
function response() {
  const out = { status: 0, body: null }
  return {
    out,
    headersSent: false,
    writeHead(status) { out.status = status; this.headersSent = true },
    end(chunk) { if (chunk !== undefined) out.body = JSON.parse(Buffer.from(chunk).toString('utf8')) },
    destroy() {},
  }
}

/**
 * The context both modules read: one live parent session, one of its children,
 * the policy the fake composition recorded, the domain facility and — when a
 * case hands one over — the llm service the route resolves effort ladders
 * through. `llm` is a map of `provider/model` to a reasoning block, or a
 * function that throws for a model the resolver rejects.
 */
function fakeContext(policy, llm) {
  const parent = { header: { id: 'session-parent' } }
  const child = { header: { id: 'session-child', parentSession: 'session-parent', origin: 'subagent' } }
  const live = new Map([[parent.header.id, parent], [child.header.id, child]])
  const facility = fakeDomainFacility()
  const llmService = llm === undefined ? undefined : {
    async resolveModelInfo(provider, model) {
      const key = `${provider}/${model}`
      if (typeof llm === 'function') return llm(provider, model)
      const reasoning = llm[key]
      if (reasoning === undefined) throw new Error(`no such model ${key}`)
      return { provider, id: model, name: model, reasoning }
    },
  }
  return {
    facility,
    contexts: live,
    ctx: {
      logger: { warn() {} },
      get(name) {
        if (name === 'storageDomain') return facility
        if (name === 'sessions') return { get: (id) => live.get(id), list: () => [...live.values()] }
        if (name === 'sessionProjections') {
          return { stateOf: (session, key) => (key === 'subagentModelSelectionPolicy' ? (live.has(session.header.id) ? policy : undefined) : undefined) }
        }
        if (name === 'llm') return llmService
        return undefined
      },
    },
  }
}

/** Wait for the store's open to settle. */
function settle(ms = 60) {
  return new Promise((resolve) => { setTimeout(resolve, ms) })
}

async function subagentStoreChecks() {
  const storeModule = await import(pathToFileURL(path.join(ROOT, 'lib', 'host', 'subagent-models', 'store.js')).href)
  const routeModule = await import(pathToFileURL(path.join(ROOT, 'lib', 'host', 'subagent-models', 'route.js')).href)
  const policy = [{ provider: 'magpie', model: 'terra' }, { provider: 'magpie', model: 'grok' }]

  // --- the store -----------------------------------------------------------
  {
    const { ctx } = fakeContext(policy)
    const store = storeModule.createSubagentModelStore(ctx, ctx.logger)
    check('the store answers "opening" rather than "nothing chosen" before the domain is up',
      store.read('unknown').kind === 'unavailable' && /still opening/.test(store.read('unknown').detail), JSON.stringify(store.read('unknown')))
    await settle()
    check('the store records a session\'s routes and reads them back',
      store.read('s1').kind === 'none', JSON.stringify(store.read('s1')))
    await store.write('s1', [policy[1]])
    check('a write is one record per session id',
      JSON.stringify(store.read('s1')) === JSON.stringify({ kind: 'routes', routes: [policy[1]] }), JSON.stringify(store.read('s1')))
    check('another session keeps its own record', store.read('s2').kind === 'none', JSON.stringify(store.read('s2')))
    await store.write('s1', [])
    check('an empty list clears the record rather than storing an empty one', store.read('s1').kind === 'none', JSON.stringify(store.read('s1')))
    store.dispose()

    // The schema refuses what the store must never accept.
    const table = ctx.get('storageDomain').get('deepcraft_subagent_models').table('selections')
    const refused = []
    for (const bad of [{ routes: [] }, { routes: [{ provider: '', model: 'm' }] }, { routes: [{ provider: 'p' }] }, { routes: [{ provider: 'p', model: 'm', extra: 1 }] }, {}]) {
      try {
        await table.put('bad', bad)
        refused.push(`accepted ${JSON.stringify(bad)}`)
      } catch { /* refused, as it must be */ }
    }
    check('the record schema refuses an empty list, a blank or absent half, an extra key and a bare object', refused.length === 0, refused.join('; '))
  }

  {
    // A second generation adopts the name the previous one still holds.
    const { ctx } = fakeContext(policy)
    const first = storeModule.createSubagentModelStore(ctx, ctx.logger)
    first.warm()
    await settle()
    await first.write('s1', [policy[0]])
    const second = storeModule.createSubagentModelStore(ctx, ctx.logger)
    second.warm()
    await settle()
    check('a generation that finds the domain open reads the same record instead of failing',
      JSON.stringify(second.read('s1')) === JSON.stringify({ kind: 'routes', routes: [policy[0]] }), JSON.stringify(second.read('s1')))
    second.dispose()
    first.dispose()
  }

  {
    const bare = storeModule.createSubagentModelStore({ get: () => undefined, logger: { warn() {} } }, undefined)
    bare.warm()
    await settle(0)
    const bareRead = bare.read('s1')
    check('a host with no storage service reports the reason, and reports it as a host with no store to read',
      /no storage domain service/.test(bareRead.detail ?? '') && bareRead.permanent === true, JSON.stringify(bareRead))
    await bare.write('s1', [{ provider: 'p', model: 'm' }]).then(
      () => check('a write with no store to write to is refused', false, 'resolved'),
      (error) => check('a write with no store to write to is refused', /no storage domain service/.test(String(error)), String(error)),
    )
  }

  // --- the route -----------------------------------------------------------
  {
    const { ctx, facility } = fakeContext(policy)
    const store = storeModule.createSubagentModelStore(ctx, ctx.logger)
    store.warm()
    await settle()
    const route = routeModule.subagentModelRoutes(ctx, store)
    const handler = route[0].route.handler
    check('the selection route is registered once, under the plugin\'s own prefix',
      route.length === 1 && route[0].route.path === '/dsh-deepcraft/subagent-models' && route[0].label === 'subagent models',
      JSON.stringify(route.map((entry) => [entry.label, entry.route.path])))

    const call = async (method, url, body) => {
      const res = response()
      handler(request(method, url, body), res)
      await settle(40)
      return res.out
    }

    const empty = await call('GET', '/dsh-deepcraft/subagent-models?session=session-parent')
    check('a read answers the policy list and no pick',
      empty.status === 200 && JSON.stringify(empty.body.allowed) === JSON.stringify(policy) &&
        empty.body.selected.length === 0 && empty.body.reason === undefined,
      JSON.stringify(empty.body))

    const written = await call('POST', '/dsh-deepcraft/subagent-models', { session: 'session-parent', routes: [policy[1]] })
    check('a write answers the record it just made',
      written.status === 200 && JSON.stringify(written.body.selected) === JSON.stringify([policy[1]]), JSON.stringify(written.body))

    const readBack = await call('GET', '/dsh-deepcraft/subagent-models?session=session-parent')
    check('the pick survives a second read', JSON.stringify(readBack.body.selected) === JSON.stringify([policy[1]]), JSON.stringify(readBack.body))

    const outside = await call('POST', '/dsh-deepcraft/subagent-models', { session: 'session-parent', routes: [{ provider: 'other', model: 'x' }] })
    check('a route the session\'s policy does not allow is refused by the route, not stored',
      outside.status === 400 && outside.body.error === 'route-not-allowed', JSON.stringify(outside.body))

    const half = await call('POST', '/dsh-deepcraft/subagent-models', { session: 'session-parent', routes: [{ provider: 'magpie' }] })
    check('a half-written route is refused', half.status === 400 && half.body.error === 'invalid-routes', JSON.stringify(half.body))

    const notJson = await call('POST', '/dsh-deepcraft/subagent-models', 'not json')
    check('a body that is not JSON is refused', notJson.status === 400 && notJson.body.error === 'invalid-routes', JSON.stringify(notJson.body))

    const cold = await call('GET', '/dsh-deepcraft/subagent-models?session=never-opened')
    check('a session this process has not opened answers "no session"', cold.body.reason === 'no-session', JSON.stringify(cold.body))

    const cleared = await call('POST', '/dsh-deepcraft/subagent-models', { session: 'session-parent', routes: [] })
    check('an empty list clears the pick', cleared.status === 200 && cleared.body.selected.length === 0, JSON.stringify(cleared.body))

    const crossSite = response()
    handler(request('GET', '/dsh-deepcraft/subagent-models?session=session-parent', undefined, { host: '127.0.0.1:3080', 'sec-fetch-site': 'cross-site' }), crossSite)
    check('the route runs the same fence as the rest of the plugin\'s routes', crossSite.out.status === 403, JSON.stringify(crossSite.out))

    const wrongMethod = response()
    handler(request('DELETE', '/dsh-deepcraft/subagent-models?session=session-parent'), wrongMethod)
    check('the route takes only the two methods it declares', wrongMethod.out.status === 405, String(wrongMethod.out.status))

    // A policy the session no longer has, and a pick it no longer allows.
    const stale = fakeContext([{ provider: 'magpie', model: 'terra' }])
    const staleStore = storeModule.createSubagentModelStore(stale.ctx, stale.ctx.logger)
    staleStore.warm()
    await settle()
    await staleStore.write('session-parent', policy)
    const staleHandler = routeModule.subagentModelRoutes(stale.ctx, staleStore)[0].route.handler
    const staleRes = response()
    staleHandler(request('GET', '/dsh-deepcraft/subagent-models?session=session-parent'), staleRes)
    await settle(20)
    check('a stored route the policy no longer allows is reported and kept on show',
      staleRes.out.body.reason === 'stale-selection' && staleRes.out.body.selected.length === 2, JSON.stringify(staleRes.out.body))
    staleStore.dispose()

    const noPolicy = fakeContext(undefined)
    const noPolicyStore = storeModule.createSubagentModelStore(noPolicy.ctx, noPolicy.ctx.logger)
    noPolicyStore.warm()
    await settle()
    const noPolicyHandler = routeModule.subagentModelRoutes(noPolicy.ctx, noPolicyStore)[0].route.handler
    const noPolicyRes = response()
    noPolicyHandler(request('GET', '/dsh-deepcraft/subagent-models?session=session-parent'), noPolicyRes)
    await settle(20)
    check('a session whose composition recorded no policy answers so',
      noPolicyRes.out.body.reason === 'no-policy', JSON.stringify(noPolicyRes.out.body))
    noPolicyStore.dispose()

    // A write the domain refuses answers 500 and leaves the stored record alone.
    const failing = fakeContext(policy)
    const failingStore = storeModule.createSubagentModelStore(failing.ctx, failing.ctx.logger)
    failingStore.warm()
    await settle()
    await failingStore.write('session-parent', [policy[0]])
    const domain = failing.facility.get('deepcraft_subagent_models')
    const table = domain.table('selections')
    table.put = async () => { throw new Error('disk is full') }
    const failingHandler = routeModule.subagentModelRoutes(failing.ctx, failingStore)[0].route.handler
    const failedRes = response()
    failingHandler(request('POST', '/dsh-deepcraft/subagent-models', { session: 'session-parent', routes: [policy[1]] }), failedRes)
    await settle(40)
    check('a write the store refuses answers 500 with its reason',
      failedRes.out.status === 500 && failedRes.out.body.error === 'store-unavailable' && /disk is full/.test(failedRes.out.body.message),
      JSON.stringify(failedRes.out))
    check('the record the failed write would have replaced is still there',
      JSON.stringify(failingStore.read('session-parent')) === JSON.stringify({ kind: 'routes', routes: [policy[0]] }),
      JSON.stringify(failingStore.read('session-parent')))
    failingStore.dispose()

    // --- reasoning effort --------------------------------------------------
    // The llm the route resolves ladders through: terra offers two levels plus
    // a declared default, grok resolves but declares none, and an unknown model throws.
    const llm = {
      'magpie/terra': { defaultEffort: 'low', efforts: [{ id: 'low', name: 'Low' }, { id: 'high', name: 'High' }] },
      'magpie/grok': null,
    }
    const effortPolicy = [{ provider: 'magpie', model: 'terra' }, { provider: 'magpie', model: 'grok' }]
    const effort = fakeContext(effortPolicy, llm)
    const effortStore = storeModule.createSubagentModelStore(effort.ctx, effort.ctx.logger)
    effortStore.warm()
    await settle()
    const effortHandler = routeModule.subagentModelRoutes(effort.ctx, effortStore)[0].route.handler
    const effortCall = async (method, url, body) => {
      const res = response()
      effortHandler(request(method, url, body), res)
      await settle(40)
      return res.out
    }
    const effortRead = await effortCall('GET', '/dsh-deepcraft/subagent-models?session=session-parent')
    check('a read answers each allowed route\'s resolved ladder, including a model that declares none',
      Array.isArray(effortRead.body.efforts) && effortRead.body.efforts.length === 2 &&
        effortRead.body.efforts[0].state === 'ok' && effortRead.body.efforts[0].efforts.length === 2 && effortRead.body.efforts[0].defaultEffort === 'low' &&
        effortRead.body.efforts[1].state === 'no-efforts',
      JSON.stringify(effortRead.body.efforts))

    const effortWrite = await effortCall('POST', '/dsh-deepcraft/subagent-models', { session: 'session-parent', contract: 2, routes: [{ provider: 'magpie', model: 'terra', reasoningEffort: 'high' }] })
    check('a write that names a declared effort stores it and answers it back',
      effortWrite.status === 200 && effortWrite.body.selected[0].reasoningEffort === 'high', JSON.stringify(effortWrite.body))
    const effortReadBack = await effortCall('GET', '/dsh-deepcraft/subagent-models?session=session-parent')
    check('the saved effort survives a second read', effortReadBack.body.selected[0].reasoningEffort === 'high', JSON.stringify(effortReadBack.body.selected))

    const badEffort = await effortCall('POST', '/dsh-deepcraft/subagent-models', { session: 'session-parent', contract: 2, routes: [{ provider: 'magpie', model: 'terra', reasoningEffort: 'ultra' }] })
    check('an effort the model does not declare is refused, not stored',
      badEffort.status === 400 && badEffort.body.error === 'effort-not-allowed', JSON.stringify(badEffort.body))
    const noLadder = await effortCall('POST', '/dsh-deepcraft/subagent-models', { session: 'session-parent', contract: 2, routes: [{ provider: 'magpie', model: 'grok', reasoningEffort: 'high' }] })
    check('an effort on a model that declares none is refused, not stored',
      noLadder.status === 400 && noLadder.body.error === 'effort-not-allowed', JSON.stringify(noLadder.body))

    // The write-contract gate: an old-generation body (no `contract`) that
    // would overwrite a record holding an effort is refused rather than
    // silently dropping the field it cannot read.
    const oldGen = await effortCall('POST', '/dsh-deepcraft/subagent-models', { session: 'session-parent', routes: [{ provider: 'magpie', model: 'grok' }] })
    check('a write without the contract that would overwrite a stored effort is refused as stale',
      oldGen.status === 409 && oldGen.body.error === 'stale-write', JSON.stringify(oldGen.body))
    check('the refused write left the stored effort in place',
      JSON.stringify(effortStore.read('session-parent')) === JSON.stringify({ kind: 'routes', routes: [{ provider: 'magpie', model: 'terra', reasoningEffort: 'high' }] }),
      JSON.stringify(effortStore.read('session-parent')))
    const freshContract = await effortCall('POST', '/dsh-deepcraft/subagent-models', { session: 'session-parent', contract: 2, routes: [] })
    check('a write under the current contract clears the record again',
      freshContract.status === 200 && freshContract.body.selected.length === 0, JSON.stringify(freshContract.body))
    effortStore.dispose()

    // A host whose llm service is absent answers every route `unknown` rather
    // than failing the read, and refuses an effort write closed.
    const noLlm = fakeContext(effortPolicy)
    const noLlmStore = storeModule.createSubagentModelStore(noLlm.ctx, noLlm.ctx.logger)
    noLlmStore.warm()
    await settle()
    const noLlmHandler = routeModule.subagentModelRoutes(noLlm.ctx, noLlmStore)[0].route.handler
    const noLlmRead = response()
    noLlmHandler(request('GET', '/dsh-deepcraft/subagent-models?session=session-parent'), noLlmRead)
    await settle(40)
    check('a host with no llm service still answers the routes, each ladder unknown',
      noLlmRead.out.status === 200 && noLlmRead.out.body.efforts.every((entry) => entry.state === 'unknown'), JSON.stringify(noLlmRead.out.body.efforts))
    const noLlmWrite = response()
    noLlmHandler(request('POST', '/dsh-deepcraft/subagent-models', { session: 'session-parent', contract: 2, routes: [{ provider: 'magpie', model: 'terra', reasoningEffort: 'high' }] }), noLlmWrite)
    await settle(40)
    check('an effort write with no llm to check it against is refused closed',
      noLlmWrite.out.status === 400 && noLlmWrite.out.body.error === 'effort-not-allowed', JSON.stringify(noLlmWrite.out.body))
    noLlmStore.dispose()

    store.dispose()
    check('the domain the store opened carries the version and the one table the record needs',
      facility.spec !== null && facility.spec.name === 'deepcraft_subagent_models' && facility.spec.version === 1 &&
        JSON.stringify(Object.keys(facility.spec.tables)) === '["selections"]',
      JSON.stringify(facility.spec === null ? null : { name: facility.spec.name, version: facility.spec.version, tables: Object.keys(facility.spec.tables) }))
  }
}

module.exports = { subagentStoreChecks }
