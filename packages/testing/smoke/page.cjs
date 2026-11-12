/**
 * One page's stand-in markup: the host's footer and composer markup, then the
 * stand-in host, the built bundle and the probe. Both page scripts are plain
 * browser scripts, each read as the parts below in this order; what they need
 * from Node — the page name, the cases this load runs, the run's tier and the
 * markup payload — is set on `window` before them.
 */
'use strict'
const fs = require('fs')
const path = require('path')
const { MARKUP } = require('./shared.cjs')
/**
 * The stand-in host's parts, in the order they run: the counters, then the host
 * faces the bundle reads.
 */
const STAND_IN_PARTS = [
  'prelude.js',
  'host-palette.js',
  'settings-form.js',
  'host-fetch.js',
  'empty-sessions.js',
  'mascot.js',
  'sessions.js',
  'model-directory.js',
  'config-forms.js',
  'slots.js',
  'ctx.js',
  'react.js',
  'sibling-sheet.js',
]
/**
 * The probe's parts, in the order they run: the skin and the step registry, then
 * each step in the order the probe takes them.
 */
const PROBE_PARTS = [
  'prelude.js',
  'shell-startup.js',
  'settle.js',
  'sheets.js',
  'shell-pages.js',
  'shell-palette.js',
  'brand.js',
  'petdex.js',
  'peer.js',
  'subagent-model.js',
  'teardown.js',
]
/**
 * The page scripts, read once: the stand-in host runs before the bundle, the
 * probe after it. Every part is an IIFE and the parts are injected as one
 * script, so each boundary carries the statement's own terminator (a part
 * opening with `(function` would otherwise be read as a call of the one before).
 */
const readParts = (dir, parts) =>
  parts.map((part) => fs.readFileSync(path.join(__dirname, dir, part), 'utf8')).join(';\n')
const STAND_IN = readParts('stand-in', STAND_IN_PARTS)
const PROBE = readParts('probe', PROBE_PARTS)

/** The stand-in page for one load: host footer, host composer, then the bundle. */
function page(name, tier, cases) {
  // The host's footer as the web profile draws it: a plugin's own action in the
  // action slot, and the settings launcher that opens its dialog. The skin
  // neither redraws nor takes over any of it (D81).
  var footerActions = '<div class="_footerActions_x_1"><div data-slot="sidebar.footer.action">' +
    '<button id="plugin-action" aria-label="Cost meter" data-cordis-badge="3" style="box-sizing:border-box;display:flex;align-items:center;width:100%;height:42px;padding:0 10px;background:transparent;border:none">' +
    '<svg viewBox="0 0 8 8"><circle cx="4" cy="4" r="3"></circle></svg></button></div></div>'
  var footer = '<div class="_footArea_x_1">' +
    '<div class="_settingsArea_x_1"><button aria-haspopup="dialog">Settings</button></div>' +
    footerActions +
    '</div>'
  // Two of the host's own controls, painted the way the host paints them: the
  // chat's "load earlier" chip (secondary ink on the solid hover fill) and a
  // filled anchor button. The skin supplies the tokens both read; the host
  // supplies the foreground token for a filled control (D80).
  var hostControls = '<style>' +
    'body { --dsw-alias-label-primary-foreground: #ffffff; }' +
    'body[data-ds-dark-theme] { --dsw-alias-label-primary-foreground: #0f1115; }' +
    '._older_h_1 button { border: none; border-radius: 4px; padding: 4px 12px; font-size: 12px;' +
    ' color: var(--dsw-alias-label-secondary); background: var(--dsw-alias-interactive-bg-hover-solid); }' +
    '._linkButton_h_1 { color: var(--dsw-alias-label-primary); background: transparent; }' +
    '._primary_h_1 { color: var(--dsw-alias-label-primary-foreground);' +
    ' background: var(--dsw-alias-button-primary-fill); }' +
    '</style>' +
    '<div class="_older_h_1"><button type="button">Load earlier</button></div>' +
    '<div class="_balance_h_1"><a class="_linkButton_h_1 _primary_h_1" href="#">Top up</a></div>'
  // A skin owns the page from the first frame: the skin center injects this
  // attribute into the served document, before any bundle is evaluated, which
  // is what lets the theme answer before it paints (D81).
  var skinOwner = name === 'skin-center-handoff'
    ? '<script>document.documentElement.setAttribute("data-dsh-skin", "blue-fantasy")</script>'
    : ''
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>dsh-deepcraft smoke: ${name}</title></head>
<body>
${skinOwner}
<div data-slot="root">
<div data-slot="sidebar">
  <div class="_root_x_1">
    <div class="_regionArea_x_1">
${footer}
    </div>
  </div>
</div>
<!-- The host keeps the composer inside its conversation scroller, and the
     scroller's box reaches above the card: the transcript stands there. The
     stand-in has no transcript, so the padding stands for the room it takes.
     Without it the scroller's overflow clips the mascot perched on the card's
     top edge, and a real press cannot reach it. -->
<div data-conversation-scroll style="padding-top: 80px">
<div class="_composerStack_h_1">
<div data-composer-card>
  <div data-composer-input contenteditable="true" id="editor"></div>
  <div class="_row_x_1">
    <div class="_tools_x_1">
      <button class="_add_x_1" aria-label="Add files or run commands" aria-haspopup="listbox" id="commands"><svg viewBox="0 0 16 16" width="14" height="14"><path d="M8 2v12M2 8h12"/></svg></button>
    </div>
    <div class="_trailing_x_1"><button class="_primary_x_1" aria-label="Send message" id="send"><svg viewBox="0 0 16 16" width="16" height="16"><path d="M8 1v14"/></svg></button></div>
  </div>
</div>
</div>
</div>
${hostControls}
</div>
<script>window.SMOKE_CASE = ${JSON.stringify(name)}; window.SMOKE_GROUPS = ${JSON.stringify(cases)}; window.SMOKE_TIER = ${JSON.stringify(tier)}; window.SMOKE_MARKUP = ${JSON.stringify(MARKUP)}</script>
<script>${STAND_IN}</script>
<script src="/client.js"></script>
<script>${PROBE}</script>
</body></html>`
}

module.exports = { page, STAND_IN_PARTS, readParts }
