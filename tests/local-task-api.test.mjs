import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const {
  DEFAULT_LOCAL_TASK_API_PORT,
  MAX_TODOS,
  createCapabilityToken,
  normalizeLocalTaskApiConfig,
  capabilityUrl,
  isLoopbackAddress,
  todayTodosPayload,
  handleTaskApiRequest
} = require('../src/main/local-task-api.js')

const TOKEN = 'a'.repeat(32)
const TODAY = '2026-08-15'

const todo = (overrides = {}) => ({
  id: 'todo-1',
  title: '核对样品尺寸',
  note: '这条备注绝不能出现在响应里',
  listId: 'list-work',
  date: TODAY,
  startTime: '09:30',
  endTime: '10:00',
  priority: 2,
  quadrant: 1,
  done: false,
  elapsedMs: 1234,
  rolloverHistory: [{ from: '2026-08-14' }],
  completionHistory: [{ at: 1 }],
  ...overrides
})

const request = (overrides = {}) => ({ method: 'GET', url: `/v1/${TOKEN}/todos/today`, remoteAddress: '127.0.0.1', ...overrides })
const context = (overrides = {}) => ({ token: TOKEN, todos: [todo()], today: TODAY, now: 1000, ...overrides })

test('capability tokens are random hex and build a single fixed URL', () => {
  const first = createCapabilityToken()
  const second = createCapabilityToken()
  assert.match(first, /^[a-f0-9]{32}$/)
  assert.notEqual(first, second)

  assert.equal(
    capabilityUrl({ enabled: true, port: 18930 }, TOKEN),
    `http://127.0.0.1:18930/v1/${TOKEN}/todos/today`
  )
  // 没有可用凭据时不给出任何地址，避免界面展示一个必然 404 的 URL。
  assert.equal(capabilityUrl({ enabled: true }, 'short'), '')

  assert.deepEqual(normalizeLocalTaskApiConfig(), { enabled: false, port: DEFAULT_LOCAL_TASK_API_PORT })
  assert.equal(normalizeLocalTaskApiConfig({ port: 80 }).port, DEFAULT_LOCAL_TASK_API_PORT, '拒绝特权端口')
  assert.equal(normalizeLocalTaskApiConfig({ port: 70000 }).port, DEFAULT_LOCAL_TASK_API_PORT)
  assert.equal(normalizeLocalTaskApiConfig({ enabled: true, port: 20000 }).port, 20000)
})

test('the response carries planning fields only', () => {
  const result = handleTaskApiRequest(request(), context())
  assert.equal(result.status, 200)
  assert.deepEqual(Object.keys(result.body).sort(), ['date', 'generatedAt', 'todos'])
  assert.equal(result.body.date, TODAY)
  assert.equal(result.body.todos.length, 1)

  // 这是整个接口的安全边界：除规划字段外一律不返回。
  assert.deepEqual(Object.keys(result.body.todos[0]).sort(), ['done', 'endTime', 'priority', 'quadrant', 'startTime', 'title'])
  const serialized = JSON.stringify(result.body)
  for (const leaked of ['备注', 'todo-1', 'list-work', 'rolloverHistory', 'completionHistory', 'elapsedMs']) {
    assert.doesNotMatch(serialized, new RegExp(leaked), `响应泄露了 ${leaked}`)
  }
})

test('only today is visible and the list is bounded', () => {
  const payload = todayTodosPayload([
    todo(),
    todo({ title: '昨天的事', date: '2026-08-14' }),
    todo({ title: '明天的事', date: '2026-08-16' }),
    todo({ title: '没有日期' , date: null })
  ], { today: TODAY, now: 5 })
  assert.deepEqual(payload.todos.map((row) => row.title), ['核对样品尺寸'])
  assert.equal(payload.generatedAt, 5)

  // 标题为空的条目不占位；数量有上限，避免单次响应无限增长。
  const many = Array.from({ length: MAX_TODOS + 50 }, (_, index) => todo({ title: `任务 ${index}` }))
  assert.equal(todayTodosPayload([...many, todo({ title: '   ' })], { today: TODAY }).todos.length, MAX_TODOS)

  assert.deepEqual(todayTodosPayload([todo()], { today: 'not-a-date' }).todos, [])
})

test('anything but an exact GET on the capability path is refused', () => {
  // 凭据不符一律 404：不确认这个地址是否存在。
  for (const url of [
    `/v1/${'b'.repeat(32)}/todos/today`,
    '/v1/short/todos/today',
    `/v1/${TOKEN}/todos/tomorrow`,
    `/v1/${TOKEN}/todos`,
    `/v1/${TOKEN}/expenses/today`,
    '/todos/today',
    `/v1/${TOKEN.toUpperCase()}/todos/today`
  ]) {
    assert.equal(handleTaskApiRequest(request({ url }), context()).status, 404, url)
  }

  // 写入类方法不存在，连 200 的机会都没有。
  for (const method of ['POST', 'PUT', 'DELETE', 'PATCH', 'HEAD']) {
    assert.equal(handleTaskApiRequest(request({ method }), context()).status, 405, method)
  }

  // 非本机来源直接拒绝，即便凭据正确。
  for (const remoteAddress of ['192.168.1.10', '10.0.0.5', '', undefined]) {
    assert.equal(handleTaskApiRequest(request({ remoteAddress }), context()).status, 403)
  }
  assert.ok(isLoopbackAddress('::ffff:127.0.0.1'))
  assert.ok(!isLoopbackAddress('192.168.1.10'))

  // 服务端没有配置凭据时，任何请求都进不来。
  assert.equal(handleTaskApiRequest(request(), context({ token: '' })).status, 404)
})

test('query strings never change what is returned', () => {
  const withQuery = handleTaskApiRequest(request({ url: `/v1/${TOKEN}/todos/today?date=2026-08-14&all=1` }), context())
  assert.equal(withQuery.status, 200)
  assert.equal(withQuery.body.date, TODAY, '日期只由主进程决定，不接受调用方指定')
})
