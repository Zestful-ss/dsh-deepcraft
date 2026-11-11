/**
 * The smoke’s browser-half assertions: what each case’s report must show
 * (the report is the object the scripts under packages/testing/smoke/probe/ build in the page).
 *
 * The cases live in cases/, one module per subject; this file keeps the table
 * the runner reads (D66).
 */
'use strict'
const shell = require('./cases/shell.cjs')
const settings = require('./cases/settings.cjs')
const agent = require('./cases/agent.cjs')
const mascot = require('./cases/mascot.cjs')
const subagentModel = require('./cases/subagent-model.cjs')
const peer = require('./cases/peer.cjs')

const CASES = { ...shell, ...settings, ...agent, ...mascot, ...subagentModel, ...peer }


module.exports = { CASES }
