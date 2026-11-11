/**
 * The cases about the other owners of the page: a skin that owns it from the
 * first frame, and one arriving after the theme took it (D81).
 */
(function () {
  var probe = window.__dshSmokeProbe
  var sleep = probe.sleep
  var attrs = probe.attrs
  var r = probe.report

  probe.step(async function () {
    // The two seats the settings page registers: the settings dialog's section
    // and the plugin page's configuration entry (settings.ts). The stand-in's
    // registry splices an entry when its feature comes down, so this answers
    // whether the page stands on the page right now.
    var settingsSeats = function () {
      return (window.__slots || []).filter(function (entry) {
        return entry.key === 'settings.section' || entry.key === 'plugins.bundle.config'
      }).length
    }
    // The seats arrive on a later turn than the install that registers them
    // (settings.ts registers through ctx.inject): a loaded runner took longer
    // than one fixed wait, so a reading asks for the count it expects and
    // gives it up to a few seconds to stand.
    var seatsSettled = async function (wanted) {
      var until = Date.now() + 3000
      while (settingsSeats() !== wanted && Date.now() < until) await sleep(50)
      return settingsSeats()
    }
    // The other owner of the page, a skin, from the first frame (D81): the theme
    // stands its whole visual down, settings page included, then takes the page
    // back when the skin leaves.
    await probe.onlyFor(['skin-center-handoff'], async function () {
      // The settings page registers through ctx.inject, so its seats appear on
      // a later turn than apply() returns. The live seat list is what says the
      // page is on the page: the component map keeps what was registered.
      await sleep(400)
      var owner = {
        sheet: document.getElementById('dsh-deepcraft-style') !== null,
        live: document.body.hasAttribute('data-dsh-deepcraft'),
        handoff: document.body.hasAttribute('data-dsh-deepcraft-handoff'),
        bodyAttrs: attrs(document.body),
        settingsSeats: settingsSeats(),
        uncaught: window.__uncaught.length,
      }
      // The owner leaves: the theme takes the page back in one observer turn.
      document.documentElement.removeAttribute('data-dsh-skin')
      await sleep(300)
      owner.afterRelease = {
        sheet: document.getElementById('dsh-deepcraft-style') !== null,
        live: document.body.hasAttribute('data-dsh-deepcraft'),
        handoff: document.body.hasAttribute('data-dsh-deepcraft-handoff'),
        settingsSeats: await seatsSettled(2),
      }
      // And it returns: the theme gives the page back without a reload.
      document.documentElement.setAttribute('data-dsh-skin', 'blue-fantasy')
      await sleep(300)
      owner.afterReturn = {
        sheet: document.getElementById('dsh-deepcraft-style') !== null,
        live: document.body.hasAttribute('data-dsh-deepcraft'),
        settingsSeats: settingsSeats(),
      }
      r.owner = owner
    })
    // The other owner arriving after the theme took the page (D81): the watch
    // follows a flip whichever way the page booted.
    await probe.onlyFor(['skin-center-arrival'], async function () {
      await sleep(400)
      var arrival = {
        before: {
          sheet: document.getElementById('dsh-deepcraft-style') !== null,
          live: document.body.hasAttribute('data-dsh-deepcraft'),
          settingsSeats: await seatsSettled(2),
        },
      }
      document.documentElement.setAttribute('data-dsh-skin', 'blue-fantasy')
      await sleep(300)
      arrival.yielded = {
        sheet: document.getElementById('dsh-deepcraft-style') !== null,
        live: document.body.hasAttribute('data-dsh-deepcraft'),
        handoff: document.body.hasAttribute('data-dsh-deepcraft-handoff'),
        settingsSeats: settingsSeats(),
      }
      document.documentElement.removeAttribute('data-dsh-skin')
      await sleep(300)
      arrival.back = {
        sheet: document.getElementById('dsh-deepcraft-style') !== null,
        live: document.body.hasAttribute('data-dsh-deepcraft'),
        settingsSeats: await seatsSettled(2),
      }
      r.arrival = arrival
    })
  })
})()
