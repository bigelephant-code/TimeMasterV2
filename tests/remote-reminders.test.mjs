import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { once } from 'node:events'
import { test } from 'node:test'

const require = createRequire(import.meta.url)
const {
  REMOTE_REMINDER_TIMEOUT_MS,
  normalizeLoopbackEndpoint,
  normalizeQqbotTarget,
  normalizeRemoteReminderConfig,
  createReminderOccurrenceKey,
  createReminderEventId,
  buildReminderText,
  buildOpenClawPayload,
  classifyDeliveryStatus,
  deliverOpenClawReminder,
  normalizeRemoteReminderOutbox,
  enqueueRemoteReminder,
  computeRetryDelayMs,
  markRemoteReminderResult,
  markRemoteReminderAttempting,
  pruneRemoteReminderOutbox
} = require('../src/main/remote-reminders.js')

const todo = {
  id: 'todo-42',
  listId: 'default',
  title: '提交月度报表',
  note: '内部备注，不应默认发给远程 AI',
  date: '2026-08-13',
  startTime: '14:00',
  endTime: '14:30',
  remindBefore: 10
}

test('remote reminder config defaults off and accepts only the exact loopback hook endpoint', () => {
  assert.deepEqual(normalizeRemoteReminderConfig(), {
    enabled: false,
    endpoint: 'http://127.0.0.1:18789/hooks/agent',
    token: '',
    channel: 'qqbot',
    mode: 'agent',
    target: null,
    accountId: null,
    includeNote: false
  })

  // 未知或缺失的投递模式必须回落到既有的 agent 行为，绝不能默认启用直投。
  assert.equal(normalizeRemoteReminderConfig({ mode: 'direct' }).mode, 'direct')
  for (const mode of [undefined, null, '', 'DIRECT', 'agent', 'anything']) {
    assert.equal(normalizeRemoteReminderConfig({ mode }).mode, mode === 'direct' ? 'direct' : 'agent', String(mode))
  }

  const accepted = [
    'http://127.0.0.1:18789/hooks/agent',
    'http://localhost:18789/hooks/agent',
    'http://[::1]:18789/hooks/agent'
  ]
  for (const endpoint of accepted) assert.ok(normalizeLoopbackEndpoint(endpoint), endpoint)

  const rejected = [
    'https://127.0.0.1:18789/hooks/agent',
    'http://127.0.0.2:18789/hooks/agent',
    'http://0.0.0.0:18789/hooks/agent',
    'http://example.com/hooks/agent',
    'http://127.0.0.1:18789/hooks/agent/',
    'http://127.0.0.1:18789/hooks/agent?token=secret',
    'http://user:secret@127.0.0.1:18789/hooks/agent'
  ]
  for (const endpoint of rejected) assert.equal(normalizeLoopbackEndpoint(endpoint), null, endpoint)

  const invalidEnabled = normalizeRemoteReminderConfig({
    enabled: true,
    endpoint: 'http://example.com/hooks/agent',
    target: 'qqbot:c2c:user-1'
  })
  assert.equal(invalidEnabled.enabled, false)
  assert.equal(invalidEnabled.endpoint, null)
})

test('qqbot targets support c2c, group and channel while rejecting ambiguous destinations', () => {
  assert.equal(normalizeQqbotTarget('c2c:user-open-id'), 'qqbot:c2c:user-open-id')
  assert.equal(normalizeQqbotTarget('qqbot:group:group-open-id'), 'qqbot:group:group-open-id')
  assert.equal(normalizeQqbotTarget('qqbot:channel:channel-id'), 'qqbot:channel:channel-id')
  assert.equal(normalizeQqbotTarget({ type: 'group', id: 'group-7' }), 'qqbot:group:group-7')
  assert.equal(normalizeQqbotTarget('dm:user-open-id'), null)
  assert.equal(normalizeQqbotTarget('c2c:'), null)
  assert.equal(normalizeQqbotTarget('group:has whitespace'), null)

  const config = normalizeRemoteReminderConfig({
    enabled: true,
    target: 'qqbot:channel:work',
    accountId: 'primary',
    token: 'local-secret'
  })
  assert.equal(config.enabled, true)
  assert.equal(config.accountId, 'primary')
  assert.equal(config.includeNote, false)

  const invalidAccount = normalizeRemoteReminderConfig({
    enabled: true,
    target: 'qqbot:c2c:user-1',
    accountId: 'bad account'
  })
  assert.equal(invalidAccount.enabled, false)
  assert.equal(invalidAccount.accountId, null)
})

test('occurrence keys and event IDs are stable and change with a new occurrence', () => {
  assert.equal(createReminderOccurrenceKey(todo), '2026-08-13T14:00-14:30#10')
  const first = createReminderEventId(todo)
  const second = createReminderEventId({ ...todo })
  const nextDay = createReminderEventId({ ...todo, date: '2026-08-14' })
  const anotherRoute = createReminderEventId(todo, createReminderOccurrenceKey(todo), 'route-b')
  assert.equal(first, second)
  assert.match(first, /^tmr_[a-f0-9]{32}$/)
  assert.notEqual(first, nextDay)
  assert.notEqual(first, anotherRoute)
})

test('notes are excluded by default and included only with explicit consent', () => {
  const defaultText = buildReminderText(todo)
  assert.match(defaultText, /提交月度报表/)
  assert.match(defaultText, /10 分钟/)
  assert.doesNotMatch(defaultText, /内部备注/)
  assert.match(buildReminderText(todo, { includeNote: true }), /内部备注/)
  assert.match(buildReminderText({ ...todo, startTime: '23:30', endTime: '00:30' }), /23:30–次日00:30/)

  const payload = buildOpenClawPayload(todo, { target: 'qqbot:c2c:user-1' })
  assert.doesNotMatch(payload.message, /内部备注/)
})

test('OpenClaw payload routes through qqbot to the normalized target and optional account', () => {
  const payload = buildOpenClawPayload(todo, {
    target: 'qqbot:group:team-open-id',
    accountId: 'work-bot',
    includeNote: true
  })
  assert.equal(payload.channel, 'qqbot')
  assert.equal(payload.to, 'qqbot:group:team-open-id')
  assert.equal(payload.accountId, 'work-bot')
  assert.equal(payload.deliver, true)
  assert.equal(payload.agentId, 'timemaster-reminders')
  assert.equal(payload.sessionMode, 'isolated')
  assert.match(payload.idempotencyKey, /^tmr_[a-f0-9]{32}$/)
  assert.equal(payload.thinking, 'off')
  assert.equal(payload.timeoutSeconds, 30)
  assert.equal('sessionKey' in payload, false)
  assert.match(payload.message, /内部备注/)
  assert.equal('token' in payload, false)
})

test('HTTP statuses map to accepted, blocked, retry and uncertain outcomes', () => {
  assert.deepEqual(classifyDeliveryStatus(200, { ok: true, runId: 'run-1' }), {
    classification: 'accepted', status: 200, runId: 'run-1'
  })
  assert.equal(classifyDeliveryStatus(200, { ok: true }).classification, 'uncertain')
  for (const status of [400, 401, 403, 404, 413]) {
    assert.equal(classifyDeliveryStatus(status).classification, 'blocked', String(status))
  }
  for (const status of [409, 429, 502, 503]) {
    assert.equal(classifyDeliveryStatus(status).classification, 'retry', String(status))
  }
  for (const status of [408, 500, 501, 504, 599]) {
    assert.equal(classifyDeliveryStatus(status).classification, 'uncertain', String(status))
  }
})

test('delivery uses Bearer auth, idempotency and a 20 second abort without exposing the token', async () => {
  const calls = []
  const clockCalls = []
  const result = await deliverOpenClawReminder({
    endpoint: 'http://localhost:18789/hooks/agent',
    token: 'super-secret-token',
    eventId: 'tmr_1234',
    payload: { channel: 'qqbot', to: 'qqbot:c2c:user-1', message: '提醒', deliver: true }
  }, {
    fetch: async (url, init) => {
      calls.push({ url, init })
      return { status: 200, json: async () => ({ ok: true, runId: 'run-9' }) }
    },
    clock: {
      setTimeout: (callback, ms) => {
        clockCalls.push({ callback, ms })
        return 7
      },
      clearTimeout: (id) => clockCalls.push({ cleared: id })
    }
  })

  assert.deepEqual(result, { classification: 'accepted', status: 200, runId: 'run-9' })
  assert.equal(calls[0].init.headers.authorization, 'Bearer super-secret-token')
  assert.equal(calls[0].init.headers['idempotency-key'], 'tmr_1234')
  assert.equal(JSON.parse(calls[0].init.body).idempotencyKey, 'tmr_1234')
  assert.equal(calls[0].init.redirect, 'error')
  assert.equal(clockCalls[0].ms, REMOTE_REMINDER_TIMEOUT_MS)
  assert.deepEqual(clockCalls[1], { cleared: 7 })
  assert.equal(JSON.stringify(result).includes('super-secret-token'), false)
})

test('delivery interoperates with a real loopback OpenClaw-compatible HTTP endpoint', async (t) => {
  let received
  const server = createServer(async (request, response) => {
    const chunks = []
    for await (const chunk of request) chunks.push(chunk)
    received = {
      method: request.method,
      url: request.url,
      authorization: request.headers.authorization,
      idempotencyKey: request.headers['idempotency-key'],
      body: JSON.parse(Buffer.concat(chunks).toString('utf8'))
    }
    response.writeHead(200, { 'content-type': 'application/json' })
    response.end(JSON.stringify({ ok: true, runId: 'fake-run-001' }))
  })
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  t.after(() => server.close())
  const { port } = server.address()
  const payload = buildOpenClawPayload(todo, { target: 'qqbot:c2c:user-1' })
  const result = await deliverOpenClawReminder({
    endpoint: `http://127.0.0.1:${port}/hooks/agent`,
    token: 'loopback-test-token',
    eventId: 'tmr_loopback_001',
    payload
  })

  assert.deepEqual(result, { classification: 'accepted', status: 200, runId: 'fake-run-001' })
  assert.equal(received.method, 'POST')
  assert.equal(received.url, '/hooks/agent')
  assert.equal(received.authorization, 'Bearer loopback-test-token')
  assert.equal(received.idempotencyKey, 'tmr_loopback_001')
  assert.equal(received.body.channel, 'qqbot')
  assert.equal(received.body.to, 'qqbot:c2c:user-1')
  assert.equal(received.body.agentId, 'timemaster-reminders')
  assert.equal(received.body.idempotencyKey, 'tmr_loopback_001')
})

test('connection refusal retries while abort and lost acknowledgement remain uncertain', async () => {
  const request = {
    endpoint: 'http://127.0.0.1:18789/hooks/agent',
    token: 'secret',
    eventId: 'tmr_network',
    payload: { channel: 'qqbot', to: 'qqbot:c2c:user-1', message: '提醒', deliver: true }
  }
  const passiveClock = {
    setTimeout: () => 1,
    clearTimeout: () => {}
  }
  const refused = await deliverOpenClawReminder(request, {
    fetch: async () => {
      throw Object.assign(new TypeError('fetch failed'), { cause: { code: 'ECONNREFUSED' } })
    },
    clock: passiveClock
  })
  assert.equal(refused.classification, 'retry')
  assert.equal(refused.errorCode, 'ECONNREFUSED')

  let abort
  const aborted = await deliverOpenClawReminder(request, {
    fetch: async (_url, init) => new Promise((_resolve, reject) => {
      abort = () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))
      init.signal.addEventListener('abort', abort, { once: true })
    }),
    clock: {
      setTimeout: (callback, ms) => {
        assert.equal(ms, 20_000)
        queueMicrotask(callback)
        return 2
      },
      clearTimeout: () => {}
    }
  })
  assert.equal(typeof abort, 'function')
  assert.equal(aborted.classification, 'uncertain')
})

test('outbox normalization strips secrets, de-duplicates events and schedules exponential retry', () => {
  const event = {
    eventId: createReminderEventId(todo),
    todoId: todo.id,
    occurrenceKey: createReminderOccurrenceKey(todo),
    routeKey: 'route-a',
    fireAt: 1_000,
    dueAt: 601_000,
    expiresAt: 1_201_000,
    payload: { token: 'must-not-be-stored' },
    authorization: 'Bearer must-not-be-stored'
  }
  const once = enqueueRemoteReminder(null, event, 1_000)
  const twice = enqueueRemoteReminder(once, event, 2_000)
  assert.equal(twice.items.length, 1)
  assert.equal('payload' in twice.items[0], false)
  assert.equal('authorization' in twice.items[0], false)

  assert.deepEqual([
    computeRetryDelayMs(1),
    computeRetryDelayMs(2),
    computeRetryDelayMs(3),
    computeRetryDelayMs(99)
  ], [15_000, 30_000, 60_000, 300_000])

  const retried = markRemoteReminderResult(twice, event.eventId, {
    classification: 'retry',
    status: 503,
    reason: 'http_503'
  }, 10_000)
  assert.equal(retried.items[0].attempts, 1)
  assert.equal(retried.items[0].nextAttemptAt, 25_000)
  assert.equal(retried.items[0].status, 'retry')

  const normalized = normalizeRemoteReminderOutbox({
    items: [retried.items[0], { ...retried.items[0], updatedAt: 11_000 }]
  })
  assert.equal(normalized.items.length, 1)

  const attempting = markRemoteReminderAttempting(normalized, event.eventId, 12_000)
  assert.equal(attempting.items[0].status, 'attempting')
  assert.equal(normalizeRemoteReminderOutbox(attempting).items[0].status, 'attempting')
  const recovered = normalizeRemoteReminderOutbox(attempting, { recoverAttempting: true })
  assert.equal(recovered.items[0].status, 'uncertain')
  assert.equal(recovered.items[0].nextAttemptAt, null)
})

test('outbox pruning removes expired terminal entries and keeps active work first', () => {
  const base = enqueueRemoteReminder(null, {
    eventId: 'tmr_active',
    todoId: 'todo-active',
    occurrenceKey: 'active-occurrence',
    routeKey: 'route-a',
    fireAt: 1_000,
    dueAt: 1_001,
    expiresAt: 60_000
  }, 1_000)
  const accepted = {
    ...base.items[0],
    eventId: 'tmr_accepted',
    status: 'accepted',
    updatedAt: 1_000,
    nextAttemptAt: null
  }
  const pruned = pruneRemoteReminderOutbox({ items: [...base.items, accepted] }, {
    now: 11_001,
    terminalRetentionMs: 10_000,
    maxItems: 10
  })
  assert.deepEqual(pruned.items.map((item) => item.eventId), ['tmr_active'])
})
