'use strict'
const { check, basicChecks } = require('./_shared.cjs')

module.exports = {
  // Another plugin owns the page from the first frame (packages/client/src/shared/visual-owner.ts,
  // D81): the theme paints nothing, keeps no page of its own, and takes the
  // page back the moment the owner leaves.
  'skin-center-handoff'(r) {
    basicChecks(r)
    const owner = r.owner || {}
    const bodyAttrs = owner.bodyAttrs || []
    check('a skin on the page keeps the theme sheet unmounted',
      owner.sheet === false, JSON.stringify(owner.sheet))
    check('the theme claims no body attribute while yielded',
      owner.live === false && owner.handoff === false &&
        !bodyAttrs.some(name => name.indexOf('data-dsh-deepcraft') === 0),
      JSON.stringify(bodyAttrs))
    check('the settings page leaves with the theme',
      owner.settingsSeats === 0, JSON.stringify(owner.settingsSeats))
    check('yielding leaves no uncaught error behind',
      owner.uncaught === 0, JSON.stringify(owner.uncaught))
    check('the theme takes the page back when the skin leaves',
      owner.afterRelease && owner.afterRelease.sheet === true &&
        owner.afterRelease.live === true && owner.afterRelease.handoff === true &&
        owner.afterRelease.settingsSeats === 2,
      JSON.stringify(owner.afterRelease))
    check('and gives it back when a skin returns',
      owner.afterReturn && owner.afterReturn.sheet === false &&
        owner.afterReturn.live === false && owner.afterReturn.settingsSeats === 0,
      JSON.stringify(owner.afterReturn))
    // No commonChecks: the shared baseline asserts a page the theme owns, and
    // this case's page is the other owner's until the last check hands it back.
  },
  // A skin arriving after the theme took the page (packages/client/src/shared/visual-owner.ts,
  // D81): the theme stands down then, and takes the page back when it leaves.
  'skin-center-arrival'(r) {
    basicChecks(r)
    const arrival = r.arrival || {}
    check('the theme owns a page that booted with no skin on it',
      (arrival.before || {}).sheet === true && (arrival.before || {}).live === true && (arrival.before || {}).settingsSeats === 2,
      JSON.stringify(arrival.before))
    check('a skin arriving later takes the sheet and the body marks down',
      (arrival.yielded || {}).sheet === false && (arrival.yielded || {}).live === false && (arrival.yielded || {}).handoff === false,
      JSON.stringify(arrival.yielded))
    check('the settings page leaves through the late yield',
      (arrival.yielded || {}).settingsSeats === 0, JSON.stringify(arrival.yielded))
    check('the theme takes the page back when that skin leaves',
      (arrival.back || {}).sheet === true && (arrival.back || {}).live === true && (arrival.back || {}).settingsSeats === 2,
      JSON.stringify(arrival.back))
  },
}
