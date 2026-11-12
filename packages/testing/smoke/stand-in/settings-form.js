/**
 * The settings store and the value each case starts it on: the plugin action
 * patched with the markup payload, and the preferences the case seeds before
 * the bundle. The late-forms case's store answers only after the namespace is
 * served, so the shipped default holds until then.
 */
(function () {
  var host = window.__dshSmokeHost
  var CASE = host.CASE
  var MARKUP = host.MARKUP

  if (CASE === 'markup') {
    var action = document.getElementById('plugin-action')
    action.setAttribute('aria-label', MARKUP)
    action.setAttribute('data-cordis-badge', MARKUP)
  }
  var formListeners = []
  var formValue = {}
  // The default identity's pet is whaledou; the Petdex case below picks its own.
  if (CASE === 'petdex-claude') Object.assign(formValue, { palette: 'ember', chatPet: 'crab-buddy' })
  // The late-forms case is served the forest palette after apply; the shipped
  // ocean palette stands until the namespace arrives.
  if (CASE === 'late-forms') formValue.palette = 'forest'
  var form = {
    getSnapshot: function () { return { status: 'ready', value: formValue } },
    subscribe: function (listener) {
      formListeners.push(listener)
      return function () {}
    },
    set: function () { return Promise.resolve(true) },
  }
  // The settings store, driven by hand: __pushForm writes a value and notifies
  // the skin's subscription, which is what the settings page's own writes do.
  window.__pushForm = function (patch) {
    Object.assign(formValue, patch)
    for (var i = 0; i < formListeners.length; i++) formListeners[i]()
  }
  host.form = form
  host.formValue = formValue
  host.formListeners = formListeners
})()
