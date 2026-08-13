import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const {
  GATEWAY_DIRECT_TIMEOUT_MS,
  normalizeGatewayWsUrl,
  buildDirectSendParams,
  classifyGatewayError,
  deliverDirectReminder
} = require('../src/main/gateway-direct-send.js')

const ENDPOINT = 'http://127.0.0.1:18789/hooks/agent'
const EVENT_ID = 'tmr_0123456789abcdef'
const REMINDER = '时间大师提醒：核对样品尺寸\n提醒设置：提前 10 分钟\n计划：2026-08-14 09:30–10:00'

// 最小 WebSocket 替身：记录客户端发出的帧，并按脚本回放服务端帧。
class FakeWebSocket {
  constructor (url) {
    this.url = url
    this.sent = []
    this.closed = false
    this.listeners = new Map()
    FakeWebSocket.last = this
    queueMicrotask(() => this.script?.(this))
  }

  addEventListener (type, handler) {
    if (!this.listeners.has(type)) this.listeners.set(type, [])
    this.listeners.get(type).push(handler)
  }

  emit (type, event) {
    for (const handler of this.listeners.get(type) || []) handler(event)
  }

  serverFrame (frame) {
    this.emit('message', { data: JSON.stringify(frame) })
  }

  send (raw) {
    this.sent.push(JSON.parse(raw))
  }

  close () {
    this.closed = true
  }
}

const challenge = { type: 'event', event: 'connect.challenge', payload: { nonce: 'n', ts: 1 } }
const helloOk = (methods = ['send', 'agent']) => ({
  type: 'res',
  id: 'connect',
  ok: true,
  payload: {
    type: 'hello-ok',
    protocol: 4,
    server: { version: 'test' },
    features: { methods },
    auth: { role: 'operator', scopes: ['operator.write'] },
    policy: { maxPayload: 1024 }
  }
})

function withScript (script) {
  class Scripted extends FakeWebSocket {
    constructor (url) {
      super(url)
      this.script = script
    }
  }
  return Scripted
}

const baseRequest = (overrides = {}) => ({
  endpoint: ENDPOINT,
  token: 'gateway-operator-token',
  target: 'qqbot:c2c:REDACTED_OPENID',
  message: REMINDER,
  eventId: EVENT_ID,
  ...overrides
})

test('only loopback gateway origins are accepted and normalized to a ws url', () => {
  assert.equal(normalizeGatewayWsUrl('http://127.0.0.1:18789/hooks/agent'), 'ws://127.0.0.1:18789')
  assert.equal(normalizeGatewayWsUrl('http://localhost:18789/hooks/agent'), 'ws://localhost:18789')
  assert.equal(normalizeGatewayWsUrl('ws://127.0.0.1:18789'), 'ws://127.0.0.1:18789')

  for (const bad of [
    'http://example.com:18789/hooks/agent',
    'https://127.0.0.1:18789/hooks/agent',
    'http://user:pw@127.0.0.1:18789/hooks/agent',
    'http://127.0.0.1/hooks/agent',
    'http://10.0.0.5:18789/hooks/agent',
    ''
  ]) {
    assert.equal(normalizeGatewayWsUrl(bad), null, bad)
  }
})

test('invalid requests are blocked before any socket is opened', async () => {
  let constructed = 0
  class Counting extends FakeWebSocket {
    constructor (url) {
      super(url)
      constructed += 1
    }
  }
  const cases = [
    [{ endpoint: 'http://example.com:18789/hooks/agent' }, 'invalid_endpoint'],
    [{ token: '' }, 'missing_token'],
    [{ eventId: 'has spaces' }, 'invalid_event_id'],
    [{ target: '' }, 'invalid_target'],
    [{ message: '   ' }, 'empty_message']
  ]
  for (const [overrides, reason] of cases) {
    const result = await deliverDirectReminder(baseRequest(overrides), { WebSocket: Counting })
    assert.equal(result.classification, 'blocked', reason)
    assert.equal(result.reason, reason)
  }
  assert.equal(constructed, 0)
})

test('a successful send transmits the reminder verbatim with an idempotency key', async () => {
  const Socket = withScript((socket) => {
    socket.serverFrame(challenge)
    queueMicrotask(() => {
      socket.serverFrame(helloOk())
      queueMicrotask(() => {
        socket.serverFrame({ type: 'res', id: EVENT_ID, ok: true, payload: { result: { id: 'qq-msg-42' } } })
      })
    })
  })

  const result = await deliverDirectReminder(baseRequest(), { WebSocket: Socket, clientVersion: '0.1.11' })
  assert.deepEqual(result, { classification: 'accepted', status: 200, runId: 'qq-msg-42' })

  const [connect, send] = FakeWebSocket.last.sent
  assert.equal(connect.method, 'connect')
  assert.equal(connect.params.client.id, 'gateway-client')
  assert.equal(connect.params.client.mode, 'backend')
  assert.deepEqual(connect.params.scopes, ['operator.write'])
  assert.equal(connect.params.auth.token, 'gateway-operator-token')

  assert.equal(send.method, 'send')
  assert.equal(send.id, EVENT_ID)
  assert.equal(send.params.channel, 'qqbot')
  assert.equal(send.params.to, 'qqbot:c2c:REDACTED_OPENID')
  assert.equal(send.params.idempotencyKey, EVENT_ID)
  // 直投的全部意义：文本一字不改地送出，不经过任何模型复述。
  assert.equal(send.params.message, REMINDER)
  assert.equal(send.params.accountId, undefined)
  assert.equal(FakeWebSocket.last.closed, true)
})

test('an explicit accountId is forwarded and absent keys stay absent', () => {
  assert.deepEqual(buildDirectSendParams({ target: 'qqbot:c2c:X', message: 'hi', eventId: EVENT_ID, accountId: ' acc ' }), {
    channel: 'qqbot',
    to: 'qqbot:c2c:X',
    message: 'hi',
    idempotencyKey: EVENT_ID,
    accountId: 'acc'
  })
})

test('gateway rejections map to blocked or retry without claiming delivery', async () => {
  const reject = (error) => withScript((socket) => {
    socket.serverFrame(challenge)
    queueMicrotask(() => {
      socket.serverFrame(helloOk())
      queueMicrotask(() => socket.serverFrame({ type: 'res', id: EVENT_ID, ok: false, error }))
    })
  })

  const unauthorized = await deliverDirectReminder(baseRequest(), { WebSocket: reject({ code: 'UNAUTHORIZED' }) })
  assert.equal(unauthorized.classification, 'blocked')
  assert.equal(unauthorized.reason, 'gateway_unauthorized')

  const retryable = await deliverDirectReminder(baseRequest(), { WebSocket: reject({ code: 'BUSY', retryable: true }) })
  assert.equal(retryable.classification, 'retry')

  const unknown = await deliverDirectReminder(baseRequest(), { WebSocket: reject({ code: 'WEIRD' }) })
  assert.equal(unknown.classification, 'blocked')
  assert.equal(unknown.reason, 'gateway_rejected')

  assert.deepEqual(classifyGatewayError({ code: 'FORBIDDEN' }), { classification: 'blocked', reason: 'gateway_forbidden' })
})

test('a failed handshake or a gateway without send never reports delivery', async () => {
  const authFail = withScript((socket) => {
    socket.serverFrame(challenge)
    queueMicrotask(() => socket.serverFrame({ type: 'res', id: 'connect', ok: false, error: { code: 'UNAUTHORIZED' } }))
  })
  const denied = await deliverDirectReminder(baseRequest(), { WebSocket: authFail })
  assert.equal(denied.classification, 'blocked')
  assert.equal(denied.reason, 'gateway_auth_failed')
  assert.equal(FakeWebSocket.last.sent.length, 1)

  const noSend = withScript((socket) => {
    socket.serverFrame(challenge)
    queueMicrotask(() => socket.serverFrame(helloOk(['agent', 'health'])))
  })
  const unsupported = await deliverDirectReminder(baseRequest(), { WebSocket: noSend })
  assert.equal(unsupported.classification, 'blocked')
  assert.equal(unsupported.reason, 'send_unsupported')
})

test('a connection lost after the send is uncertain rather than accepted or retried', async () => {
  const dropAfterSend = withScript((socket) => {
    socket.serverFrame(challenge)
    queueMicrotask(() => {
      socket.serverFrame(helloOk())
      queueMicrotask(() => socket.emit('close', {}))
    })
  })
  const result = await deliverDirectReminder(baseRequest(), { WebSocket: dropAfterSend })
  // 消息可能已经离开网关，重发会造成重复提醒，因此只能记为不确定。
  assert.equal(result.classification, 'uncertain')
  assert.equal(result.reason, 'connection_closed')
})

test('a silent gateway aborts on the shared timeout and stays uncertain', async () => {
  let fired = null
  const clock = {
    setTimeout: (fn, ms) => { fired = { fn, ms }; return 't' },
    clearTimeout: () => {}
  }
  const silent = withScript((socket) => socket.serverFrame(challenge))
  const pending = deliverDirectReminder(baseRequest(), { WebSocket: silent, clock })
  await Promise.resolve()
  assert.equal(fired.ms, GATEWAY_DIRECT_TIMEOUT_MS)
  fired.fn()
  const result = await pending
  assert.equal(result.classification, 'uncertain')
  assert.equal(result.reason, 'request_aborted')
})
