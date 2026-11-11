#!/usr/bin/env node
/**
 * mock-llm.cjs — the scripted model service the end-to-end lane runs against (D66).
 *
 * The lane needs a conversation of a known shape — a thought, an answer that
 * arrives in pieces, a tool call and its result — and it needs the same one every
 * run. This server answers the host's DeepSeek route: the route speaks the
 * Messages protocol, so each request gets the event sequence the official API
 * sends, `message_start` through `message_stop`, with the script's pieces in
 * between. Every request it receives is written to a log beside the tool, so a
 * lane that wonders what the host sent can read it.
 *
 * Only the model is scripted; everything downstream — the agent loop, the
 * session, the client's stores and every component that renders them — is the
 * shipping host (D66). Point the route at this server with a `--patch` overlay:
 *
 *   - id: llm-deepseek
 *     config:
 *       baseURL: http://127.0.0.1:<port>
 *       apiKeyEnv: DSH_E2E_MOCK_KEY
 *
 * Usage: node packages/testing/mock-llm.cjs [--port <n>] [--log <dir>] [--script <name>]
 *        (module use: `const mock = await startMockLlm()` → `{ url, stop, requests }`)
 */
'use strict'
const fs = require('node:fs')
const http = require('node:http')
const path = require('node:path')
const { argOf } = require('./cli-args.cjs')

const ROOT = path.resolve(__dirname, '..', '..')
const DEFAULT_LOG = path.join(ROOT, '.debug', 'e2e', 'mock')
const MODEL = 'deepseek-flash'
const MESSAGES_PATH = '/v1/messages'

/**
 * The scripts the lane can ask for. A script holds one reply per conversation
 * request, in order, and its answer to the shell's auxiliary requests.
 *
 * A reply's pieces become streamed deltas: `thinking` first, then `text`, then
 * the one `tool` call when it has one — a reply with a call settles as
 * `tool_use`, and the host then runs that tool and asks again. `holdMs` keeps
 * the reply silent that long before its first event. The script starts over
 * once it runs out, so a turn that keeps asking still gets an answer.
 */

/** A long answer, in a few pieces: enough lines that the column outgrows the viewport. */
const LONG_LINES = Array.from({ length: 40 }, (_, index) => `- line ${index + 1}: the tail stays in view\n`)
const LONG_PIECES = []
for (let at = 0; at < LONG_LINES.length; at += 5) LONG_PIECES.push(LONG_LINES.slice(at, at + 5).join(''))

const SCRIPTS = {
  /** The lane's default: a thought, then markdown in a few pieces. */
  greeting: {
    conversation: [
      {
        thinking: [
          'The reader said hello. ',
          'A short answer with a heading and a list shows the renderer most of what it does.',
        ],
        text: [
          '# Hello\n\n',
          'This answer was **scripted** by the end-to-end lane.\n\n',
          '- first point\n- second point\n\n',
          'A short final line.',
        ],
      },
    ],
    auxiliary: { text: ['Scripted greeting'] },
  },
  /** A read-only call whose result the lane can watch arrive. */
  inspect: {
    conversation: [
      {
        thinking: ['Look at the workspace before answering.'],
        tool: { name: 'glob', input: { pattern: '*.json' } },
      },
      {
        thinking: ['The listing came back; describe it.'],
        text: ['The workspace holds these files:\n\n', '- one\n- two\n'],
      },
    ],
    auxiliary: { text: ['Scripted inspection'] },
  },
  /**
   * Several rounds in one turn, after the model keeps the reader waiting past
   * the point the waiting line calls overtime: a thought and a tool, a thought
   * and a note with another tool, then the answer. The process groups on both
   * sides of the intermediate note carry thinking and a tool call each.
   */
  /**
   * A long reasoning, delivered a couple of steps at a time: the thinking row's
   * window grows with it and steps it up once it fills the height reasoning may
   * reach, and the
   * reader never loses its last line. Each step is long enough to fill more than
   * a couple of lines even where the host's body renders the whole reasoning as
   * one wrapped paragraph, and the whole script runs well past the host's cap on
   * that body — the lane's own scenario reads the window on both sides of it.
   */
  /** Enough streamed lines to push the column past the viewport edge. */
  long: {
    conversation: [
      {
        thinking: ['A long answer shows the tail staying in view while the column grows.'],
        text: ['# Long answer\n\n', ...LONG_PIECES, '\nLast line.'],
      },
    ],
    auxiliary: { text: ['Scripted long answer'] },
  },
  /**
   * One burst: the whole answer in a single flush, longer than the stretch a
   * stream slide carries. A provider that batches its output sends a response
   * this way, and the column grows by every line between two frames.
   *
   * The lines are short on purpose: an answer whose lines wrap to two or three
   * lines of their own grows taller in the frame that lays them out than
   * between two frames once they are, so it is never paced.
   */
  /**
   * A screenful of answer, then a process group that reasons at the tail: the
   * first reply fills the column past the viewport and calls a tool, and the
   * second reasons in pieces long enough to add a line or two each, for a few
   * seconds, inside the group the tool call opened. The reasoning keeps the turn
   * streaming while the lane rolls a door over that group.
   */
  /**
   * One `run_code` program touching four files, for the file rows: `app.js` is
   * read, changed four times and read again; `notes.md` is written and then
   * read; `only.md` is written once; `plain.md` is read twice and never
   * changed. Every call is dispatched from the one program, which is the shape
   * the rows are read together in: the host keeps one row per call, and a
   * program's calls are the ones that stand side by side under the program's
   * own row. `app.js` is read before it is edited — the host refuses an edit of
   * a file it has not seen — and every replacement chains onto the one before
   * it. `{{workspace}}` is filled in by the lane, which is the side that knows
   * the scratch home, and `{{workspaceCode}}` is the same path with its
   * backslashes doubled: inside a program's own source a single backslash is an
   * escape.
   */
  /**
   * The waiting line's own words: the model reasons in an English clause it is
   * on ("I am checking the file is true"), then in a sentence carrying no clause
   * at all, then in a second clause, and then reads a file. The line has to say
   * the model's clause while it reasons and the file's name while the call runs,
   * and the sentence between the two clauses must not put the waiting word back:
   * the clause stands until the next intent arrives. Each piece is short and the
   * pause between them is the lane's own, so every state stands long enough for
   * the scenario to sample it.
   */
  /**
   * The Markdown tour the README's conversation shot shows: a heading, the
   * inline formats, both list shapes, a table, a code block and a quote, in the
   * language the reader asks in. Scripted so the shot can be retaken on any
   * machine with no model behind it. The auxiliary text answers the host's own
   * title request, and it names the session with the stand-in the shot's guard
   * accepts.
   */
}

/** The `{{name}}` slots of a scripted value, filled from the lane's own values. */
function fillVars(value, vars) {
  if (typeof value === 'string') return value.replace(/\{\{(\w+)\}\}/g, (match, name) => vars[name] ?? match)
  if (Array.isArray(value)) return value.map((item) => fillVars(item, vars))
  if (value !== null && typeof value === 'object') {
    const out = {}
    for (const [key, item] of Object.entries(value)) out[key] = fillVars(item, vars)
    return out
  }
  return value
}

/** One SSE frame; the event name repeats the payload's own `type`, as the route checks both. */
function send(res, event) {
  res.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`)
}

/** Wait between pieces, so the reader watches the answer arrive rather than appear. */
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** A plausible token count for scripted text, so the meter shows numbers instead of zero. */
const tokensOf = (text) => Math.max(1, Math.round(text.length / 4))

/**
 * The pause a reply's piece gets: the lane's own delay, or the reply's
 * `pieceDelayMs` where it carries one. A reply that arrives as one burst asks
 * for 0, which puts every piece of it into a single flush.
 */
const pauseFor = (reply, delayMs) => pause(reply.pieceDelayMs ?? delayMs)

/**
 * Stream one reply as Messages events.
 *
 * @param res - the response.
 * @param reply - one script reply (SCRIPTS).
 * @param delayMs - the pause between pieces.
 * @param vars - the values a script's `{{name}}` slots are filled from.
 */
async function streamReply(res, reply, delayMs, vars) {
  // A reply that hesitates keeps the model silent before its first event, the
  // stretch the host shows as waiting for the model.
  if (reply.holdMs !== undefined) await pause(reply.holdMs)
  res.writeHead(200, {
    'content-type': 'text/event-stream; charset=utf-8',
    'cache-control': 'no-cache',
    connection: 'keep-alive',
  })
  let outputTokens = 0
  send(res, {
    type: 'message_start',
    message: {
      id: `msg_mock_${Date.now()}`,
      type: 'message',
      role: 'assistant',
      model: MODEL,
      content: [],
      stop_reason: null,
      stop_sequence: null,
      usage: { input_tokens: 1024, output_tokens: 0 },
    },
  })
  let index = 0
  if (reply.thinking !== undefined) {
    send(res, { type: 'content_block_start', index, content_block: { type: 'thinking', thinking: '' } })
    for (const piece of reply.thinking) {
      send(res, { type: 'content_block_delta', index, delta: { type: 'thinking_delta', thinking: piece } })
      outputTokens += tokensOf(piece)
      await pauseFor(reply, delayMs)
    }
    // The route keeps a thinking signature for replay; a scripted one keeps that path exercised.
    send(res, { type: 'content_block_delta', index, delta: { type: 'signature_delta', signature: 'mock-signature' } })
    send(res, { type: 'content_block_stop', index })
    index += 1
  }
  if (reply.text !== undefined) {
    send(res, { type: 'content_block_start', index, content_block: { type: 'text', text: '' } })
    for (const piece of reply.text) {
      send(res, { type: 'content_block_delta', index, delta: { type: 'text_delta', text: piece } })
      outputTokens += tokensOf(piece)
      await pauseFor(reply, delayMs)
    }
    send(res, { type: 'content_block_stop', index })
    index += 1
  }
  if (reply.tool !== undefined) {
    const id = `toolu_mock_${index}`
    send(res, { type: 'content_block_start', index, content_block: { type: 'tool_use', id, name: reply.tool.name, input: {} } })
    await pauseFor(reply, delayMs)
    // The real API opens a call with empty input and streams the arguments as JSON text.
    const json = JSON.stringify(fillVars(reply.tool.input, vars))
    send(res, { type: 'content_block_delta', index, delta: { type: 'input_json_delta', partial_json: json } })
    outputTokens += tokensOf(json)
    send(res, { type: 'content_block_stop', index })
  }
  send(res, {
    type: 'message_delta',
    delta: { stop_reason: reply.tool === undefined ? 'end_turn' : 'tool_use', stop_sequence: null },
    usage: { output_tokens: outputTokens, input_tokens: 1024 },
  })
  send(res, { type: 'message_stop' })
  res.end()
}

/**
 * The reply one request gets: conversation replies in order, the auxiliary
 * answer for the shell's own calls — those carry no tool catalog — and the
 * script from its first reply again once it runs out, so every turn of a
 * scenario carries the same work.
 */
function replyFor(script, request, state) {
  if (request.tools === undefined || request.tools.length === 0) return script.auxiliary
  const replies = script.conversation
  const reply = replies[state.conversation % replies.length]
  state.conversation += 1
  return reply
}

/**
 * Start the scripted model.
 *
 * @param options.port - the port; 0 lets the OS pick one.
 * @param options.log - where requests are written (created when absent).
 * @param options.script - the script's name (SCRIPTS), or a script of the
 *     caller's own in the same shape: a reading that needs a reply of another
 *     size keeps it beside its own assertions instead of in the table.
 * @param options.delayMs - the pause between streamed pieces.
 * @param options.vars - the values a script's `{{name}}` slots are filled from:
 *     the lane's scratch home is only known at run time (packages/testing/e2e.cjs).
 * @returns `{ url, port, log, requests, stop }`; `url` is the value to configure
 *     the host's route with.
 */
async function startMockLlm(options = {}) {
  const log = options.log ?? DEFAULT_LOG
  const script = typeof options.script === 'object' && options.script !== null
    ? options.script
    : SCRIPTS[options.script ?? 'greeting']
  if (script === undefined) throw new Error(`mock-llm: no script named "${options.script}"`)
  const delayMs = options.delayMs ?? 50
  const vars = options.vars ?? {}
  fs.mkdirSync(log, { recursive: true })
  /** Every request the host made, in order. */
  const requests = []
  /** How many conversation replies the script has handed out. */
  const state = { conversation: 0 }
  let counter = 0
  const server = http.createServer((req, res) => {
    const chunks = []
    req.on('data', (part) => chunks.push(part))
    req.on('end', () => {
      const body = Buffer.concat(chunks).toString('utf8')
      const url = req.url ?? '/'
      const record = { at: new Date().toISOString(), method: req.method, url, headers: req.headers, body }
      requests.push(record)
      fs.writeFileSync(path.join(log, `${String(++counter).padStart(3, '0')}-${url.replace(/[^\w.-]+/g, '_')}.json`), `${JSON.stringify(record, null, 2)}\n`)
      if (!url.startsWith(MESSAGES_PATH)) {
        res.writeHead(404, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ error: { type: 'not_found_error', message: `mock-llm serves ${MESSAGES_PATH} only, not ${url}` } }))
        return
      }
      const request = JSON.parse(body)
      streamReply(res, replyFor(script, request, state), delayMs, vars).catch((error) => {
        res.destroy(error)
      })
    })
  })
  const port = await new Promise((resolve) => server.listen(options.port ?? 0, '127.0.0.1', () => resolve(server.address().port)))
  return {
    url: `http://127.0.0.1:${port}`,
    port,
    log,
    requests,
    stop: () => new Promise((resolve) => server.close(resolve)),
  }
}

module.exports = { startMockLlm, SCRIPTS, DEFAULT_LOG, MESSAGES_PATH }

if (require.main === module) {
  startMockLlm({
    port: argOf('port') === undefined ? 0 : Number(argOf('port')),
    log: argOf('log'),
    script: argOf('script'),
  }).then((mock) => {
    console.log(`mock-llm: ${mock.url}  (requests → ${mock.log})`)
    process.on('SIGINT', () => {
      mock.stop().then(() => process.exit(0))
    })
  }).catch((error) => {
    console.error(error.message)
    process.exit(1)
  })
}
