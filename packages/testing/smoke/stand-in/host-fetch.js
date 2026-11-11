/**
 * The identity routes and the OS-user probe, answered inside the page: the probe
 * for every case, the launcher's contract only for the case that models an HDSL
 * launch, and the launcher's atlas bytes. Three different names — the custom
 * nickname Tester, the account's Ada, the launcher's HDSLPlayer — are what make
 * the fallback order observable.
 */
(function () {
  var host = window.__dshSmokeHost
  var CASE = host.CASE
  var LAUNCHER = host.LAUNCHER

  var realFetch = window.fetch
  // The two Petdex cases hold one installed package each; every other case has
  // no library, so the new theme default downloads nothing and the chat guest
  // stays away where the case expects the original characters or none.
  var PETDEX = CASE === 'petdex-claude' || CASE === 'petdex-deepseek'
  function petDescriptor(id) {
    return {
      id: id,
      sourceId: id,
      displayName: id === 'whaledou' ? 'Whaledou' : 'Crab Buddy',
      spriteVersionNumber: 1,
      frameWidth: 192,
      frameHeight: 208,
      atlasRows: 9,
      version: id + '-v1',
      imageUrl: '/dsh-deepcraft/pets/image/' + id + '?v=' + id + '-v1',
    }
  }
  function petdexPet() {
    return petDescriptor(CASE === 'petdex-deepseek' ? 'whaledou' : 'crab-buddy')
  }
  var PNG_1PX = Uint8Array.from(
    atob(window.SMOKE_PNG),
    function (c) { return c.charCodeAt(0) })
  function jsonResponse(payload) {
    return new Response(JSON.stringify(payload), { headers: { 'content-type': 'application/json' } })
  }
  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : (input && input.url) || ''
    if (url === '/dsh-deepcraft/username') return Promise.resolve(jsonResponse({ ok: true, username: 'Tester' }))
    if (url === '/dsh-deepcraft/pets') {
      return Promise.resolve(jsonResponse(PETDEX ? { ok: true, pets: [petdexPet()], invalid: [] } : { ok: true, pets: [], invalid: [] }))
    }
    if (url === '/dsh-deepcraft/pets/ensure') {
      if (!PETDEX) return Promise.resolve(jsonResponse({ ok: false, error: 'no such preset' }))
      var asked = 'crab-buddy'
      try { asked = JSON.parse((init && init.body) || '{}').id || asked } catch (error) { /* the page sent the default */ }
      return Promise.resolve(jsonResponse({ ok: true, pet: petDescriptor(asked) }))
    }
    if (url.indexOf('/dsh-deepcraft/subagent-models') === 0) {
      // The selection route the composer's entry reads and writes. The page keeps
      // the record itself, so a write is visible on the next read and the probe
      // can say what was sent: `window.__subagentModel` holds the allowed list,
      // the saved routes and every body the page posted.
      if (CASE !== 'subagent-model') return realFetch.apply(window, arguments)
      var record = window.__subagentModel = window.__subagentModel || {
        allowed: [
          { provider: 'deepseek-official', model: 'deepseek-flash' },
          { provider: 'deepseek-official', model: 'deepseek-v4-pro' },
          { provider: 'other-provider', model: 'model-the-catalog-lacks' },
        ],
        // The ladder the host resolved for each allowed route: deepseek-flash
        // declares two levels, the other two none. The page reads the answer's
        // `efforts` for the route its catalog does not carry.
        efforts: [
          { provider: 'deepseek-official', model: 'deepseek-flash', state: 'ok', defaultEffort: 'low', efforts: [{ id: 'low', name: 'Low' }, { id: 'high', name: 'High' }] },
          { provider: 'deepseek-official', model: 'deepseek-v4-pro', state: 'no-efforts', efforts: [] },
          { provider: 'other-provider', model: 'model-the-catalog-lacks', state: 'unknown', efforts: [] },
        ],
        selected: [],
        writes: [],
        reason: undefined,
      }
      if (init !== undefined && init !== null && init.method === 'POST') {
        var sent = {}
        try { sent = JSON.parse(init.body || '{}') } catch (error) { /* the page sent no body */ }
        record.writes.push(sent)
        record.selected = Array.isArray(sent.routes) ? sent.routes : []
        return Promise.resolve(jsonResponse({ ok: true, allowed: record.allowed, selected: record.selected, efforts: record.efforts }))
      }
      var answer = { ok: true, allowed: record.allowed, selected: record.selected, efforts: record.efforts }
      if (record.reason !== undefined) answer.reason = record.reason
      return Promise.resolve(jsonResponse(answer))
    }
    if (url === '/dsh-deepcraft/brand') {
      // The custom-brand case holds both images; the bytes are the runner's to
      // serve (packages/testing/smoke.cjs), since the page loads them as images.
      return Promise.resolve(jsonResponse(CASE === 'custom-brand'
        ? { ok: true, mark: { type: 'image/png', version: '1-1' }, wordmark: { type: 'image/svg+xml', version: '1-1' } }
        : { ok: true, mark: null, wordmark: null }))
    }
    if (url === '/dsh-deepcraft/hdsl') {
      // Three launcher cases: the player's own atlas, a built-in figure (no
      // picture at all), and an atlas the player deleted before the page
      // loaded — the two fallbacks the account row has to survive.
      return Promise.resolve(jsonResponse(LAUNCHER[CASE] !== undefined
        ? {
            ok: true, contract: true, name: 'HDSLPlayer', vendor: 'deepseek', kind: 'official',
            skin: 'local', skinModel: 'default', hasSkinImage: LAUNCHER[CASE].hasSkinImage,
          }
        : { ok: true, contract: false }))
    }
    if (url === '/dsh-deepcraft/hdsl-skin.png') {
      // An <img> or a canvas source loads this outside the fetch stub, so the
      // HTTP stand-in serves the bytes; this branch only keeps a stray request
      // from reaching the real network.
      if (CASE !== 'hdsl') return Promise.resolve(new Response(null, { status: 404 }))
      return Promise.resolve(new Response(PNG_1PX, { headers: { 'content-type': 'image/png' } }))
    }
    return realFetch.apply(window, arguments)
  }
})()
