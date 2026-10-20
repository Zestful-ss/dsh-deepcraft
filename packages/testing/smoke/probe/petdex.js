/**
 * The two Petdex chat cases: each theme's own package, drawn from its untouched
 * atlas — the home card, every hand gesture, the nine actions the session
 * states pick, one image URL throughout, the reduced-motion still frame, the
 * quiet minute and the exit.
 */
(function () {
  var probe = window.__dshSmokeProbe
  var sleep = probe.sleep
  var r = probe.report

  /** Every reading of the pet, so the case can prove one atlas served them all. */
  var sheets = {}

  probe.step(async function () {
    await probe.onlyFor(['petdex-claude', 'petdex-deepseek'], async function () {
      var deepseek = window.SMOKE_CASE === 'petdex-deepseek'
      var expectedId = deepseek ? 'whaledou' : 'crab-buddy'
      var driver = window.__deepy
      var read = function () {
        var state = probe.readMascot('petdex')
        if (state !== null) sheets[state.sheet] = true
        return state
      }
      var waitAction = async function (action, what) {
        await probe.until(read, function (readings) {
          var now = readings[readings.length - 1]
          return now !== null && now.action === action && now.ready === true
        }, what)
        return read()
      }
      var hero = document.createElement('div')
      hero.className = '_root_h_1'
      hero.setAttribute('data-phase', 'hero')
      document.body.appendChild(hero)
      for (var wait = 0; wait < 100 && read() === null; wait++) await sleep(50)
      // The atlas decodes once before the mascot shows; a broken package never
      // reports ready.
      for (var ready = 0; ready < 100 && (read() || {}).ready !== true; ready++) await sleep(50)

      var node = document.querySelector('.dsh-deepcraft-petdex')
      var strip = node === null ? null : node.querySelector('.dsh-deepcraft-petdex-strip')
      var sprite = node === null ? null : node.querySelector('.dsh-deepcraft-petdex-sprite')
      var box = node === null ? null : node.getBoundingClientRect()
      var spriteBox = sprite === null ? null : sprite.getBoundingClientRect()
      var stripStyle = strip === null ? null : getComputedStyle(strip)
      r.petdex = {
        brand: document.body.getAttribute('data-dsh-deepcraft-brand'),
        expectedId: expectedId,
        home: read(),
        geometry: node === null ? null : {
          width: box.width,
          height: box.height,
          spriteWidth: spriteBox.width,
          spriteHeight: spriteBox.height,
          stripWidth: parseFloat(stripStyle.width),
          stripHeight: parseFloat(stripStyle.height),
          objectFit: stripStyle.imageRendering,
        },
      }

      // The reader's hand: a left press runs the other way, a right press back,
      // four presses in a row tickle it, and a lift jumps.
      var hit = node === null ? null : node.querySelector('.dsh-deepcraft-petdex-hit')
      probe.pressPart(hit, 0.1)
      await sleep(250)
      r.petdex.left = read()
      try {
        await probe.until(read, function (readings) {
          var now = readings[readings.length - 1]
          return now !== null && now.action === 'running-right'
        }, 'the left poke')
      } catch (error) {
        throw new Error(error.message + ' — ' + JSON.stringify({ hit: hit !== null, home: r.petdex.home, left: r.petdex.left, now: read() }))
      }
      await sleep(1100)
      probe.pressPart(hit, 0.9)
      await sleep(250)
      r.petdex.right = read()
      await sleep(1100)
      for (var tickle = 0; tickle < 4; tickle++) {
        probe.pressPart(hit, 0.5)
        await sleep(90)
      }
      r.petdex.tickle = await waitAction('jumping', 'the tickle')
      await sleep(900)
      var dragBox = hit.getBoundingClientRect()
      var at = { clientX: dragBox.left + dragBox.width / 2, clientY: dragBox.top + dragBox.height / 2 }
      var press = { pointerId: 1, pointerType: 'mouse', isPrimary: true, button: 0, bubbles: true }
      hit.dispatchEvent(new PointerEvent('pointerdown', Object.assign({ buttons: 1 }, press, at)))
      hit.dispatchEvent(new PointerEvent('pointermove', Object.assign({ buttons: 1 }, press, { clientX: at.clientX + 20, clientY: at.clientY + 12 })))
      await sleep(250)
      r.petdex.drag = read()
      hit.dispatchEvent(new PointerEvent('pointerup', Object.assign({ buttons: 0 }, press, { clientX: at.clientX + 20, clientY: at.clientY + 12 })))
      await sleep(300)
      r.petdex.afterDrag = read()

      // Reduced motion pins the action's first frame; the hand still answers.
      window.__pushForm({ motion: 'reduced' })
      await sleep(200)
      var still = read()
      var frameBefore = still === null ? null : still.frame
      await sleep(400)
      r.petdex.still = {
        attr: document.body.getAttribute('data-dsh-deepcraft-motion'),
        frame: frameBefore,
        after: (read() || {}).frame,
        animation: (read() || {}).animation,
      }
      probe.pressPart(hit, 0.1)
      await sleep(250)
      r.petdex.stillPoke = read()
      window.__pushForm({ motion: 'full' })
      await sleep(200)

      // The conversation page: the session's own work picks the native actions.
      // The home card leaves first, or the mascot would keep standing there.
      hero.remove()
      var placed = probe.placeConversation('smoke-petdex')
      await sleep(200)
      driver.setStatus('smoke-petdex', { running: true })
      driver.setTurn('reasoning')
      probe.wakePass()
      r.petdex.thinking = await waitAction('review', 'the review action while thinking')
      driver.setTurn('text')
      probe.wakePass()
      try {
        r.petdex.typing = await waitAction('running', 'the running action while writing')
      } catch (error) {
        throw new Error(error.message + ' — ' + JSON.stringify({ now: read(), status: document.body.getAttribute('data-dsh-deepcraft-mascot') }))
      }
      // An approval: the host hides the composer and mounts its panel after it.
      var panel = document.createElement('div')
      panel.setAttribute('data-approval-key', 'smoke')
      panel.textContent = 'approve?'
      placed.fallback.style.display = 'none'
      placed.fallback.parentElement.appendChild(panel)
      driver.setStatus('smoke-petdex', { running: true, pendingInteraction: { kind: 'approval', key: 'smoke' } })
      r.petdex.notification = await waitAction('waiting', 'the waiting action at an approval')
      // Answered and finished; a compaction runs, then ends.
      panel.remove()
      placed.fallback.style.display = 'contents'
      driver.setTurn(null)
      driver.setStatus('smoke-petdex', { running: false })
      driver.emit({ type: 'compaction/start', seq: 1, time: Date.now(), data: { compactionId: 'c1', turn: null } })
      probe.wakePass()
      r.petdex.compacting = await waitAction('running', 'the running action in a compaction')
      driver.emit({ type: 'compaction/end', seq: 2, time: Date.now(), data: { compactionId: 'c1', turn: null } })
      await probe.until(read, function (readings) {
        var now = readings[readings.length - 1]
        return now !== null && now.animation === 'happy' && now.action === 'waving'
      }, 'the celebration')
      r.petdex.celebrating = read()
      driver.emit({ type: 'tool/result', seq: 3, time: Date.now(), data: { turn: 2, step: 1, message: { isError: true } } })
      r.petdex.failed = await waitAction('failed', 'the failure')
      // The quiet minute: the page's clock moved ahead, then a pointer move
      // wakes it. The package has no sleeping action, so the first idle frame
      // stands still.
      var clock = Date.now
      var ahead = 0
      Date.now = function () { return clock.call(Date) + ahead }
      ahead += 61000
      probe.wakePass()
      r.petdex.asleep = await waitAction('idle', 'the sleeping frame')
      await sleep(700)
      document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true }))
      r.petdex.woken = await waitAction('waving', 'the wake')
      Date.now = clock
      placed.root.remove()
      await sleep(200)
      r.petdex.gone = read() === null
      // The chat switch leaves only the chat place; the desktop choice is not
      // touched by it.
      window.__pushForm({ mascot: 'off' })
      await sleep(300)
      r.petdex.off = read()
      // The home card comes back with the brand, and with it the chat guest.
      var backHero = document.createElement('div')
      backHero.className = '_root_h_1'
      backHero.setAttribute('data-phase', 'hero')
      document.body.appendChild(backHero)
      window.__pushForm({ mascot: 'brand' })
      for (var back = 0; back < 100 && (read() || {}).ready !== true; back++) await sleep(50)
      r.petdex.back = read()
      backHero.remove()
      r.petdex.sheets = Object.keys(sheets)
      await sleep(200)
    })
  })
})()
