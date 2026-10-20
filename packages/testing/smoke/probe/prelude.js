/**
 * Runs in the page after the bundle: applies the skin, then runs the steps the
 * other parts register, in the order page.cjs injects them, and answers with the
 * report object the cases read.
 *
 * A part reaches shared state through window.__dshSmokeProbe alone: the report
 * it fills in, the registration list, the readers every part uses, and the
 * surfaces a step builds and a later one hands back at teardown.
 */
(function () {
  window.__applyError = null
  try { window.__skin.apply(window.__ctx) } catch (e) { window.__applyError = String((e && e.stack) || e) }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms) }) }
  /** One frame, through the rAF the stand-in did not wrap, so asking for it is no pass of the skin's. */
  function frame() { return new Promise(function (done) { window.__nativeRaf(function () { done() }) }) }
  /** Whether every finite animation on the page has landed; an endless one is the page's own life. */
  function landed() {
    return document.getAnimations().every(function (animation) {
      if (animation.playState !== 'running' && animation.playState !== 'pending') return true
      var timing = animation.effect === null ? null : animation.effect.getComputedTiming()
      return timing !== null && timing.iterations === Infinity
    })
  }
  /**
   * Record `read()` on every frame from now until the page has settled, and
   * answer the readings with the settled one last (D66: the settle rule). The
   * page has settled when its finite animations have landed and the skin has
   * asked for no pass for eight frames' worth of a 60 Hz display (134 ms, over
   * at least two frames, so a slower display waits the same wall clock). A clock
   * of the page's own — the waiting line ticks four times a second while a turn
   * runs — is its life, the way an endless animation is, so a quiet run between
   * two ticks counts. `quietMs` adds a stretch of wall clock with no pass at
   * all, for a reading that counts passes itself. A page that never settles
   * fails the step by name.
   */
  async function watch(read, quietMs) {
    var readings = []
    var quietFrames = 0
    var lastPass = performance.now()
    var started = performance.now()
    for (;;) {
      if (read !== undefined) readings.push(read())
      var before = window.__passes
      await frame()
      if (window.__passes === before) quietFrames += 1
      else {
        quietFrames = 0
        lastPass = performance.now()
      }
      if (quietFrames >= 2 && performance.now() - lastPass >= Math.max(134, quietMs || 0) && landed()) break
      if (performance.now() - started > 8000) throw new Error('smoke: the page did not settle within eight seconds')
    }
    if (read !== undefined) readings.push(read())
    return readings
  }
  /** Wait for the page to settle (see watch). */
  function settle(quietMs) { return watch(undefined, quietMs) }
  /**
   * Record `read()` on every frame until `reached(readings)` holds, for a page
   * that keeps moving on a clock of its own and so never settles; the readings
   * end with the one that reached. A state that never comes fails the step by
   * name once `limitMs` (eight seconds unless the state's own clock is longer)
   * has passed.
   */
  async function until(read, reached, what, limitMs) {
    var limit = limitMs === undefined ? 8000 : limitMs
    var readings = []
    var started = performance.now()
    for (;;) {
      readings.push(read())
      if (reached(readings)) return readings
      if (performance.now() - started > limit) throw new Error('smoke: ' + what + ' did not happen within ' + limit + ' ms')
      await frame()
    }
  }
  function attrs(el) { return el ? Array.prototype.map.call(el.attributes, function (a) { return a.name }) : null }
  // A segmented control's sliding pill (packages/client/src/shared/sliding-pill.ts) against
  // the item it should sit under: its mark, its written placement, the item's
  // own fill (which gives way to the pill) and the transitions running on it.
  function pillState(control, item) {
    var box = control.getBoundingClientRect()
    var itemBox = item.getBoundingClientRect()
    var slides = control.getAnimations({ subtree: true }).filter(function (a) {
      return a.effect && a.effect.pseudoElement === '::before'
    })
    return {
      attr: control.hasAttribute('data-dsh-deepcraft-pill'),
      content: getComputedStyle(control, '::before').content,
      x: parseFloat(control.style.getPropertyValue('--dsh-deepcraft-pill-x')),
      w: parseFloat(control.style.getPropertyValue('--dsh-deepcraft-pill-w')),
      itemX: itemBox.left - box.left - control.clientLeft,
      itemW: itemBox.width,
      itemFill: getComputedStyle(item).backgroundColor,
      slides: slides.map(function (a) { return a.transitionProperty }),
    }
  }

  /**
   * One mascot node's live reading: the semantic animation, the native action a
   * Petdex package is playing, the frame the strip is translated to, the image
   * it draws and the anchor it stands on.
   */
  function readMascot(name) {
    var node = document.querySelector('.dsh-deepcraft-' + name)
    if (node === null) return null
    var strip = node.querySelector('.dsh-deepcraft-' + name + '-strip')
    var matrix = getComputedStyle(strip).transform
    var offsets = matrix === 'none' ? null : matrix.match(/matrix\([^,]+,[^,]+,[^,]+,[^,]+,\s*(-?[\d.]+),\s*(-?[\d.]+)\)/)
    return {
      animation: node.getAttribute('data-animation'),
      action: node.getAttribute('data-dsh-deepcraft-pet-action'),
      petId: node.getAttribute('data-dsh-deepcraft-pet-id'),
      ready: node.hasAttribute('data-ready'),
      place: node.parentElement === null ? null : node.parentElement.getAttribute('data-dsh-deepcraft-' + name + '-anchor'),
      frame: offsets === null ? '0px 0px' : offsets[1] + 'px ' + offsets[2] + 'px',
      sheet: getComputedStyle(strip).backgroundImage,
    }
  }

  /**
   * The host's conversation page as the mascot reads it: the scroll anchor,
   * its session, the composer seat, the chain wrapper and the composer stack.
   */
  function placeConversation(sessionId) {
    var root = document.createElement('div')
    root.setAttribute('data-phase', 'active')
    root.setAttribute('data-conversation-scroll', '')
    root.innerHTML = '<div data-conversation-content data-conversation-session="' + sessionId + '"><div data-composer-seat>' +
      '<div data-slot="conversation.composer" style="display:contents">' +
      '<div data-chain-overlay-fallback="conversation.composer" style="display:contents">' +
      '<div class="_composerStack_x_1"><div class="_inputBar_x_1">input</div></div></div></div></div></div>'
    document.body.appendChild(root)
    return {
      root: root,
      fallback: root.querySelector('[data-chain-overlay-fallback]'),
      stack: root.querySelector('._composerStack_x_1'),
    }
  }

  /** One press-and-release on a mascot's hit box, at `fraction` across it. */
  function pressPart(node, fraction) {
    var box = node.getBoundingClientRect()
    var point = { clientX: box.left + box.width * fraction, clientY: box.top + box.height / 2 }
    var press = Object.assign({ pointerId: 1, pointerType: 'mouse', isPrimary: true, button: 0, bubbles: true }, point)
    node.dispatchEvent(new PointerEvent('pointerdown', Object.assign({ buttons: 1 }, press)))
    node.dispatchEvent(new PointerEvent('pointerup', Object.assign({ buttons: 0 }, press)))
  }

  /** A DOM write that asks the skin for one more pass, for a state that waits only on its own timer. */
  function wakePass() {
    var node = document.createElement('span')
    document.body.appendChild(node)
    document.body.removeChild(node)
  }

  var probe = {
    sleep: sleep,
    readMascot: readMascot,
    placeConversation: placeConversation,
    pressPart: pressPart,
    wakePass: wakePass,
    frame: frame,
    watch: watch,
    settle: settle,
    until: until,
    attrs: attrs,
    pillState: pillState,
    report: { applyError: window.__applyError, teardownRegistered: typeof window.__dispose === 'function' },
    steps: [],
    // The view-tab strip and the search root the shell cases build, and the
    // sibling's sheet the page carried before the bundle ran: the teardown step
    // reads all three back.
    viewStrip: null,
    searchRoot: null,
    siblingSheet: null,
    /** Register one step; the parts run in the order page.cjs injects them. */
    step: function (body) { probe.steps.push(body) },
    /**
     * One case's own collection: `body` runs when the cases this page load
     * carries include one of `names` (page.cjs sets window.SMOKE_GROUPS to
     * them, and window.SMOKE_CASE to the page's own name for the pages that
     * carry a single case). This is the only place that decides, and a list
     * that matches none of them leaves that case's assertions short of their
     * fields, so they fail.
     */
    onlyFor: async function (names, body) {
      var running = window.SMOKE_GROUPS || [window.SMOKE_CASE]
      if (names.some(function (name) { return running.indexOf(name) !== -1 })) await body()
    },
  }
  window.__dshSmokeProbe = probe
  window.__smoke = (async function () {
    // Every part is injected as one script, so yielding once lets that script
    // finish registering its steps before the first one runs.
    await Promise.resolve()
    for (var i = 0; i < probe.steps.length; i++) await probe.steps[i]()
    return probe.report
  })()
})()
