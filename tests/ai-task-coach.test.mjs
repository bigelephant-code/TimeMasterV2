import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { test } from 'node:test'

const require = createRequire(import.meta.url)
const {
  DEFAULT_AI_TASK_COACH_ENDPOINT,
  TASK_PLAN_TOOL_NAME,
  DAY_PLAN_TOOL_NAME,
  AI_TASK_COACH_TIMEOUT_MS,
  AI_TASK_COACH_MAX_RESPONSE_BYTES,
  normalizeLoopbackResponsesEndpoint,
  normalizeAiTaskCoachConfig,
  taskSourceHash,
  normalizeTaskPlan,
  buildTaskPlanRequest,
  buildDayPlanRequest,
  extractFunctionCall,
  requestOpenClawPlan,
  scheduleSignature,
  createDeterministicDayPlan,
  applyDayPlan,
  undoDayPlan,
  normalizeAiTaskCoachState
} = require('../src/main/ai-task-coach.js')

const baseTodo = (overrides = {}) => ({
  id: 'todo-1',
  listId: 'default',
  title: '开通速卖通',
  note: '身份证号不应默认发给 AI',
  date: '2026-08-13',
  startTime: null,
  endTime: null,
  time: null,
  done: false,
  priority: 2,
  quadrant: 2,
  repeat: 'none',
  notifiedKey: 'old-reminder',
  startedAt: null,
  order: 0,
  updatedAt: 100,
  rolloverHistory: [{ fromDate: '2026-08-12', rolledTo: '2026-08-13', status: 'incomplete' }],
  ...overrides
})

const rawTaskPlan = (overrides = {}) => ({
  summary: '先准备主体资料，再从官方入口注册并完成店铺基础设置。',
  nextAction: '用 10 分钟列出已有和缺少的主体资料。',
  questions: ['使用企业还是个体工商户主体？'],
  prerequisites: ['营业执照', '法定代表人身份证明'],
  steps: [
    { title: '核对资料', detail: '把资料放进一个专用文件夹。', estimatedMinutes: 20 },
    { title: '进入官方入口', detail: '确认域名和主体信息后注册。', estimatedMinutes: 40 }
  ],
  officialLinks: [{ label: '全球速卖通卖家入口', url: 'https://seller.aliexpress.com/', purpose: '开户注册' }],
  cautions: ['不要把验证码交给第三方。'],
  followUps: ['设置物流模板。'],
  estimatedMinutes: 60,
  ...overrides
})

test('config accepts only the exact loopback HTTP Responses endpoint and clamps planning preferences', () => {
  assert.equal(normalizeLoopbackResponsesEndpoint(DEFAULT_AI_TASK_COACH_ENDPOINT), DEFAULT_AI_TASK_COACH_ENDPOINT)
  for (const accepted of [
    'http://localhost:18789/v1/responses',
    'http://127.0.0.1:9999/v1/responses',
    'http://[::1]:18789/v1/responses'
  ]) assert.ok(normalizeLoopbackResponsesEndpoint(accepted), accepted)

  for (const rejected of [
    'https://127.0.0.1:18789/v1/responses',
    'http://127.0.0.2:18789/v1/responses',
    'http://0.0.0.0:18789/v1/responses',
    'http://example.com/v1/responses',
    'http://127.0.0.1:18789/v1/responses/',
    'http://127.0.0.1:18789/v1/responses?token=x',
    'http://user:password@127.0.0.1:18789/v1/responses'
  ]) assert.equal(normalizeLoopbackResponsesEndpoint(rejected), null, rejected)

  assert.deepEqual(normalizeAiTaskCoachConfig(), {
    enabled: false,
    endpoint: DEFAULT_AI_TASK_COACH_ENDPOINT,
    agentId: 'timemaster-coach',
    includeNote: false,
    autoPlanNewTodos: false,
    workday: { start: '09:00', end: '18:00' },
    lunch: { start: '12:00', end: '13:00' },
    bufferMinutes: 10
  })
  const normalized = normalizeAiTaskCoachConfig({
    enabled: true,
    endpoint: 'http://localhost:19000/v1/responses',
    agentId: 'coach.one',
    includeNote: true,
    autoPlanNewTodos: true,
    workday: { start: '08:30', end: '19:00' },
    lunch: { start: '12:15', end: '13:15' },
    bufferMinutes: 999
  })
  assert.equal(normalized.enabled, true)
  assert.equal(normalized.agentId, 'coach.one')
  assert.equal(normalized.bufferMinutes, 60)
  assert.deepEqual(normalized.workday, { start: '08:30', end: '19:00' })
  assert.deepEqual(normalized.lunch, { start: '12:15', end: '13:15' })
  assert.equal(normalizeAiTaskCoachConfig({ enabled: true, endpoint: 'http://example.com/v1/responses' }).enabled, false)
})

test('task source hash is stable, consent-aware and unaffected by schedule-only edits', () => {
  const todo = baseTodo()
  const withoutNote = taskSourceHash(todo)
  assert.equal(withoutNote, taskSourceHash({ ...todo, note: 'another secret', startTime: '15:00', updatedAt: 999 }))
  assert.notEqual(taskSourceHash(todo, { includeNote: true }), taskSourceHash({ ...todo, note: 'changed' }, { includeNote: true }))
  assert.notEqual(withoutNote, taskSourceHash({ ...todo, quadrant: 1 }))
  assert.match(withoutNote, /^[a-f0-9]{64}$/)
})

test('task and day requests pin a non-streaming client function and exclude notes by default', () => {
  const todo = baseTodo()
  const taskRequest = buildTaskPlanRequest(todo, { today: '2026-08-13' })
  assert.equal(taskRequest.model, 'openclaw/timemaster-coach')
  assert.equal(taskRequest.stream, false)
  assert.equal(taskRequest.tools.length, 1)
  assert.equal(taskRequest.tools[0].name, TASK_PLAN_TOOL_NAME)
  assert.deepEqual(taskRequest.tool_choice, { type: 'function', name: TASK_PLAN_TOOL_NAME })
  assert.doesNotMatch(taskRequest.input, /身份证号/)
  assert.equal(JSON.parse(taskRequest.input).task.note, undefined)

  const withNote = buildTaskPlanRequest(todo, {}, { includeNote: true })
  assert.match(withNote.input, /身份证号/)

  const dayRequest = buildDayPlanRequest([todo], { date: '2026-08-13', timezone: 'Asia/Shanghai' })
  assert.equal(dayRequest.stream, false)
  assert.equal(dayRequest.tools[0].name, DAY_PLAN_TOOL_NAME)
  assert.deepEqual(dayRequest.tool_choice, { type: 'function', name: DAY_PLAN_TOOL_NAME })
  assert.doesNotMatch(dayRequest.input, /身份证号/)
  assert.equal(JSON.parse(dayRequest.input).context.date, '2026-08-13')
  assert.equal(JSON.parse(dayRequest.input).context.timezone, 'Asia/Shanghai')
  assert.deepEqual(Object.keys(dayRequest.tools[0].parameters.properties.items.items.properties), [
    'todoId', 'rank', 'estimatedMinutes', 'reason'
  ])
})

test('both requests explain the priority and quadrant scales sent as bare numbers', () => {
  // priority 与 quadrant 只作为裸数字发送，方向相反；缺少刻度说明时模型会把 priority 1 当成最高。
  for (const request of [buildTaskPlanRequest(baseTodo(), {}), buildDayPlanRequest([baseTodo()], {})]) {
    assert.match(request.instructions, /priority[^；]*3=高/)
    assert.match(request.instructions, /数值越大越重要/)
    assert.match(request.instructions, /1=重要且紧急/)
    assert.match(request.instructions, /4=不重要不紧急/)
    assert.match(request.instructions, /数值越小越应优先/)
  }
})

test('function extraction accepts exactly one whitelisted matching function call', () => {
  const good = {
    id: 'resp-1',
    output: [
      { type: 'message', content: [] },
      { type: 'function_call', name: TASK_PLAN_TOOL_NAME, arguments: JSON.stringify(rawTaskPlan()) }
    ]
  }
  assert.equal(extractFunctionCall(good, TASK_PLAN_TOOL_NAME).summary, rawTaskPlan().summary)
  assert.throws(() => extractFunctionCall({ output: [{ type: 'function_call', name: 'shell', arguments: '{}' }] }, TASK_PLAN_TOOL_NAME), /唯一且匹配/)
  assert.throws(() => extractFunctionCall({ output: [
    { type: 'function_call', name: TASK_PLAN_TOOL_NAME, arguments: '{}' },
    { type: 'function_call', name: TASK_PLAN_TOOL_NAME, arguments: '{}' }
  ] }, TASK_PLAN_TOOL_NAME), /唯一且匹配/)
  assert.throws(() => extractFunctionCall({ output: [{ type: 'function_call', name: TASK_PLAN_TOOL_NAME, arguments: '{' }] }, TASK_PLAN_TOOL_NAME), /有效 JSON/)
  assert.throws(() => extractFunctionCall(good, 'not-allowed'), /不支持/)
})

test('task-plan normalization caps content and rejects non-HTTPS or credential-bearing links', () => {
  const sourceHash = taskSourceHash(baseTodo())
  const plan = normalizeTaskPlan(rawTaskPlan({
    questions: Array.from({ length: 20 }, (_, index) => `问题 ${index}`),
    steps: [{ title: 'A'.repeat(200), detail: 'D'.repeat(1_000), estimatedMinutes: 99_999 }]
  }), { todoId: 'todo-1', sourceHash, generatedAt: 123 })
  assert.equal(plan.todoId, 'todo-1')
  assert.equal(plan.sourceHash, sourceHash)
  assert.equal(plan.generatedAt, 123)
  assert.equal(plan.questions.length, 8)
  assert.equal(plan.steps[0].title.length, 120)
  assert.equal(plan.steps[0].detail.length, 800)
  assert.equal(plan.steps[0].estimatedMinutes, 24 * 60)
  assert.equal(plan.steps[0].done, false)
  const progressed = normalizeTaskPlan({ ...rawTaskPlan(), steps: [{ ...rawTaskPlan().steps[0], done: true }] }, {
    todoId: 'todo-1', sourceHash, generatedAt: 124
  })
  assert.equal(progressed.steps[0].done, true)
  assert.equal(plan.officialLinks[0].url, 'https://seller.aliexpress.com/')

  for (const url of ['http://seller.aliexpress.com/', 'file:///C:/secret', 'javascript:alert(1)', 'https://user:pass@example.com/']) {
    assert.throws(() => normalizeTaskPlan(rawTaskPlan({
      officialLinks: [{ label: 'bad', url, purpose: 'bad' }]
    }), { todoId: 'todo-1', sourceHash }), /链接/)
  }
  assert.throws(() => normalizeTaskPlan(rawTaskPlan({ steps: [] }), { todoId: 'todo-1', sourceHash }), /至少需要一个/)
})

test('OpenClaw delivery uses bearer auth, agent routing, no redirects and the 90 second abort', async () => {
  const calls = []
  const clockCalls = []
  const response = {
    id: 'resp-9',
    output: [{ type: 'function_call', name: TASK_PLAN_TOOL_NAME, arguments: JSON.stringify(rawTaskPlan()) }]
  }
  const result = await requestOpenClawPlan({
    endpoint: 'http://localhost:18789/v1/responses',
    token: 'top-secret',
    agentId: 'coach',
    body: buildTaskPlanRequest(baseTodo()),
    expectedTool: TASK_PLAN_TOOL_NAME
  }, {
    fetch: async (url, init) => {
      calls.push({ url, init })
      return new Response(JSON.stringify(response), { status: 200, headers: { 'content-type': 'application/json' } })
    },
    clock: {
      setTimeout: (callback, ms) => {
        clockCalls.push({ callback, ms })
        return 7
      },
      clearTimeout: (id) => clockCalls.push({ cleared: id })
    }
  })
  assert.equal(result.responseId, 'resp-9')
  assert.equal(result.arguments.summary, rawTaskPlan().summary)
  assert.equal(calls[0].url, 'http://localhost:18789/v1/responses')
  assert.equal(calls[0].init.headers.authorization, 'Bearer top-secret')
  assert.equal(calls[0].init.headers['x-openclaw-agent-id'], 'coach')
  assert.equal(calls[0].init.redirect, 'error')
  assert.equal(JSON.parse(calls[0].init.body).stream, false)
  assert.equal(clockCalls[0].ms, AI_TASK_COACH_TIMEOUT_MS)
  assert.deepEqual(clockCalls[1], { cleared: 7 })
})

test('OpenClaw delivery rejects remote endpoints, oversized bodies and hides the token from errors', async () => {
  await assert.rejects(() => requestOpenClawPlan({
    endpoint: 'http://example.com/v1/responses', body: {}, expectedTool: TASK_PLAN_TOOL_NAME
  }), /必须是本机/)

  await assert.rejects(() => requestOpenClawPlan({
    endpoint: DEFAULT_AI_TASK_COACH_ENDPOINT,
    body: {},
    expectedTool: TASK_PLAN_TOOL_NAME
  }, {
    fetch: async () => ({
      ok: true,
      status: 200,
      headers: { get: () => String(AI_TASK_COACH_MAX_RESPONSE_BYTES + 1) },
      text: async () => '{}'
    })
  }), /超过安全上限/)

  await assert.rejects(() => requestOpenClawPlan({
    endpoint: DEFAULT_AI_TASK_COACH_ENDPOINT,
    token: 'never-leak-me',
    body: {},
    expectedTool: TASK_PLAN_TOOL_NAME
  }, {
    fetch: async () => { throw new Error('failure never-leak-me') }
  }), (error) => !String(error.message).includes('never-leak-me') && String(error.message).includes('[已隐藏]'))
})

test('upstream gateway failures report the real reason instead of a bare status code', async () => {
  const respondWith = (status, body) => ({
    fetch: async () => ({
      ok: status >= 200 && status < 300,
      status,
      headers: { get: () => null },
      text: async () => body
    })
  })
  const plan = {
    endpoint: DEFAULT_AI_TASK_COACH_ENDPOINT,
    body: {},
    expectedTool: TASK_PLAN_TOOL_NAME
  }

  await assert.rejects(
    () => requestOpenClawPlan(plan, respondWith(401, JSON.stringify({
      error: { code: 'authentication_error', message: '403 预扣费额度失败, 用户剩余额度不足' }
    }))),
    (error) => /HTTP 401/.test(error.message) && /预扣费额度失败/.test(error.message)
  )

  await assert.rejects(
    () => requestOpenClawPlan(plan, respondWith(200, JSON.stringify({
      id: 'resp-fail', status: 'failed', output: [], error: { message: '上游模型超时' }
    }))),
    (error) => /生成方案失败/.test(error.message) && /上游模型超时/.test(error.message)
  )

  await assert.rejects(
    () => requestOpenClawPlan(plan, respondWith(502, '<html>bad gateway</html>')),
    (error) => /HTTP 502/.test(error.message)
  )

  await assert.rejects(
    () => requestOpenClawPlan({ ...plan, token: 'never-leak-me' }, respondWith(401, JSON.stringify({
      error: { message: 'token never-leak-me rejected' }
    }))),
    (error) => !error.message.includes('never-leak-me') && error.message.includes('[已隐藏]')
  )
})

test('deterministic scheduler keeps fixed tasks, rounds today up, avoids lunch and follows AI then quadrant order', () => {
  const todos = [
    baseTodo({ id: 'fixed', title: '固定会议', startTime: '10:00', endTime: '11:00', time: '11:00', quadrant: 3, updatedAt: 1 }),
    baseTodo({ id: 'q2', title: '重要不紧急', quadrant: 2, priority: 2, order: 1, updatedAt: 2 }),
    baseTodo({ id: 'q1', title: '重要紧急', quadrant: 1, priority: 3, order: 2, updatedAt: 3 }),
    baseTodo({ id: 'ai-first', title: 'AI 判断有依赖', quadrant: 4, priority: 0, order: 3, updatedAt: 4 }),
    baseTodo({ id: 'repeat', title: '重复任务', quadrant: 1, repeat: 'daily', updatedAt: 5 }),
    baseTodo({ id: 'running', title: '正在计时', quadrant: 1, startedAt: 123, updatedAt: 6 })
  ]
  const plan = createDeterministicDayPlan({
    date: '2026-08-13',
    todos,
    aiPlan: { items: [{ todoId: 'ai-first', rank: 1, estimatedMinutes: 30, reason: '是后续任务的依赖' }] },
    config: { workday: { start: '09:00', end: '18:00' }, lunch: { start: '12:00', end: '13:00' }, bufferMinutes: 10 },
    now: new Date(2026, 7, 13, 9, 7)
  })
  assert.deepEqual(plan.preserved.map((item) => item.todoId), ['fixed'])
  assert.deepEqual(plan.preserved[0], {
    todoId: 'fixed', startTime: '10:00', endTime: '11:00', reason: 'fixed_schedule', locked: true
  })
  assert.deepEqual(plan.items.map((item) => item.todoId), ['ai-first', 'q1', 'q2'])
  assert.equal(plan.items[0].startTime, '09:15')
  assert.equal(plan.items[0].endTime, '09:45')
  assert.equal(plan.items[1].startTime, '11:10')
  assert.equal(plan.items[1].endTime, '11:40')
  assert.equal(plan.items[2].startTime, '13:00')
  assert.equal(plan.items[2].endTime, '13:30')
  assert.deepEqual(plan.unscheduled.map(({ todoId, reason }) => [todoId, reason]), [
    ['repeat', 'repeating'],
    ['running', 'running']
  ])
  assert.equal(plan.sourceSchedules.length, todos.length)
  assert.ok(plan.sourceSchedules.every((source) => /^[a-f0-9]{64}$/.test(source.signature)))
})

test('scheduler reports capacity shortage instead of overlapping or extending the workday', () => {
  const plan = createDeterministicDayPlan({
    date: '2026-08-13',
    todos: [baseTodo({ id: 'one' }), baseTodo({ id: 'two', updatedAt: 101 })],
    aiPlan: { items: [
      { todoId: 'one', rank: 1, estimatedMinutes: 45, reason: '' },
      { todoId: 'two', rank: 2, estimatedMinutes: 45, reason: '' }
    ] },
    config: { workday: { start: '09:00', end: '10:00' }, lunch: { start: '12:00', end: '13:00' }, bufferMinutes: 10 },
    now: new Date(2026, 7, 12, 8, 0)
  })
  assert.equal(plan.items.length, 1)
  assert.deepEqual(plan.unscheduled, [{ todoId: 'two', estimatedMinutes: 45, reason: 'no_capacity' }])
  assert.match(plan.warnings[0], /容量不足/)
})

test('apply is atomic, changes only schedule fields and never writes rollover history', () => {
  const todos = [baseTodo({ id: 'a', updatedAt: 11 }), baseTodo({ id: 'b', updatedAt: 12 })]
  const plan = createDeterministicDayPlan({
    date: '2026-08-13',
    todos,
    aiPlan: { items: [
      { todoId: 'a', rank: 1, estimatedMinutes: 30, reason: 'first' },
      { todoId: 'b', rank: 2, estimatedMinutes: 30, reason: 'second' }
    ] },
    config: { workday: { start: '09:00', end: '18:00' }, lunch: { start: '12:00', end: '13:00' }, bufferMinutes: 0 },
    now: new Date(2026, 7, 12, 8, 0)
  })
  const before = structuredClone(todos)
  const result = applyDayPlan(todos, plan, { now: 500 })
  assert.equal(result.ok, true)
  assert.deepEqual(result.changedTodoIds, ['a', 'b'])
  assert.equal(todos[0].startTime, '09:00')
  assert.equal(todos[0].endTime, '09:30')
  assert.equal(todos[0].time, '09:30')
  assert.equal(todos[0].notifiedKey, null)
  assert.equal(todos[0].updatedAt, 500)
  assert.deepEqual(todos[0].rolloverHistory, before[0].rolloverHistory)
  for (const field of ['id', 'title', 'note', 'priority', 'quadrant', 'repeat', 'done', 'rolloverHistory']) {
    assert.deepEqual(todos[0][field], before[0][field], field)
  }

  const restored = undoDayPlan(todos, result.undo, { now: 600 })
  assert.equal(restored.ok, true)
  assert.equal(todos[0].startTime, null)
  assert.equal(todos[0].endTime, null)
  assert.equal(todos[0].time, null)
  assert.equal(todos[0].notifiedKey, 'old-reminder')
  assert.equal(todos[0].updatedAt, 600)
})

test('apply and undo perform full conflict checks before mutating any task', () => {
  const todos = [baseTodo({ id: 'a', updatedAt: 11 }), baseTodo({ id: 'b', updatedAt: 12 })]
  const plan = createDeterministicDayPlan({
    date: '2026-08-13',
    todos,
    aiPlan: { items: [
      { todoId: 'a', rank: 1, estimatedMinutes: 30, reason: '' },
      { todoId: 'b', rank: 2, estimatedMinutes: 30, reason: '' }
    ] },
    config: { bufferMinutes: 0 },
    now: new Date(2026, 7, 12, 8, 0)
  })
  todos[1].updatedAt = 13
  const staleBefore = structuredClone(todos)
  const stale = applyDayPlan(todos, plan, { now: 500 })
  assert.deepEqual(stale, { ok: false, reason: 'stale_plan', conflictTodoIds: ['b'] })
  assert.deepEqual(todos, staleBefore)

  todos[1].updatedAt = 12
  const applied = applyDayPlan(todos, plan, { now: 500 })
  assert.equal(applied.ok, true)
  todos[1].startTime = '16:00'
  const undoConflictBefore = structuredClone(todos)
  const undoConflict = undoDayPlan(todos, applied.undo, { now: 600 })
  assert.deepEqual(undoConflict, { ok: false, reason: 'undo_conflict', conflictTodoIds: ['b'] })
  assert.deepEqual(todos, undoConflictBefore)
})

test('state normalization keeps valid plans, strictly trims them and retains only 30 latest dates', () => {
  const taskPlans = {}
  for (let index = 0; index < 510; index++) {
    const todoId = `todo-${index}`
    taskPlans[todoId] = {
      ...rawTaskPlan(),
      todoId,
      sourceHash: taskSourceHash(baseTodo({ id: todoId })),
      generatedAt: index
    }
  }
  taskPlans.bad = { todoId: 'bad', sourceHash: 'bad' }
  const dayPlans = Array.from({ length: 35 }, (_, index) => {
    const date = `2026-${String(7 + Math.floor(index / 28)).padStart(2, '0')}-${String(index % 28 + 1).padStart(2, '0')}`
    return {
      id: `day-${index}`,
      date,
      status: index === 34 ? 'applied' : 'draft',
      createdAt: index,
      sourceSchedules: [{ todoId: 'todo-1', signature: scheduleSignature(baseTodo()) }],
      items: [],
      preserved: [],
      unscheduled: [],
      warnings: [],
      appliedAt: index === 34 ? 1000 : null,
      undo: index === 34 ? { id: 'undo-1', planId: `day-${index}`, date, createdAt: 1000, items: [] } : null
    }
  })
  const state = normalizeAiTaskCoachState({ taskPlans, dayPlans }, { now: 1234 })
  assert.equal(Object.keys(state.taskPlans).length, 500)
  assert.equal(state.taskPlans.bad, undefined)
  assert.equal(state.dayPlans.length, 30)
  assert.equal(new Set(state.dayPlans.map((plan) => plan.date)).size, 30)
  assert.equal(state.dayPlans[0].status, 'applied')
  assert.equal(state.dayPlans[0].appliedAt, 1000)
  assert.equal(state.dayPlans[0].undo.id, 'undo-1')
  assert.equal('normalizedAt' in state, false)
})

test('state normalization never lets a newer draft discard an active same-day undo record', () => {
  const date = '2026-08-13'
  const state = normalizeAiTaskCoachState({
    dayPlans: [
      {
        id: 'applied', date, status: 'applied', createdAt: 10, appliedAt: 20,
        sourceSchedules: [], items: [], preserved: [], unscheduled: [], warnings: [],
        undo: { id: 'undo-active', planId: 'applied', date, createdAt: 20, items: [] }
      },
      {
        id: 'newer-draft', date, status: 'draft', createdAt: 30,
        sourceSchedules: [], items: [], preserved: [], unscheduled: [], warnings: []
      }
    ]
  })
  assert.equal(state.dayPlans.length, 1)
  assert.equal(state.dayPlans[0].id, 'applied')
  assert.equal(state.dayPlans[0].undo.id, 'undo-active')
})
