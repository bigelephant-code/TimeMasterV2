import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { test } from 'node:test'

const require = createRequire(import.meta.url)
const {
  normalizeTodoRolloverHistory,
  recordTodoRollover
} = require('../src/main/todo-rollovers.js')

test('automatic rollover records the missed occurrence before its date moves', () => {
  const todo = {
    date: '2026-08-12',
    done: false,
    title: '提交申请材料',
    listId: 'work'
  }
  const record = recordTodoRollover(todo, '2026-08-13', 123456)
  assert.deepEqual(record, {
    fromDate: '2026-08-12',
    rolledTo: '2026-08-13',
    status: 'incomplete',
    recordedAt: 123456,
    title: '提交申请材料',
    listId: 'work'
  })
  assert.equal(todo.date, '2026-08-12', 'recording must happen before the caller moves the active occurrence')
})

test('each daily rollover leaves an immutable incomplete occurrence', () => {
  const todo = { date: '2026-08-11', done: false, title: '连续顺延', listId: 'default' }
  recordTodoRollover(todo, '2026-08-12', 1)
  todo.date = '2026-08-12'
  recordTodoRollover(todo, '2026-08-13', 2)
  todo.date = '2026-08-13'
  assert.deepEqual(todo.rolloverHistory.map((record) => [record.fromDate, record.rolledTo, record.status]), [
    ['2026-08-11', '2026-08-12', 'incomplete'],
    ['2026-08-12', '2026-08-13', 'incomplete']
  ])
})

test('rollover history rejects invalid moves and de-duplicates repeated recording', () => {
  const todo = { date: '2026-08-12', done: false, title: '去重' }
  assert.equal(recordTodoRollover(todo, '2026-08-11'), null)
  assert.equal(recordTodoRollover(todo, 'invalid'), null)
  const first = recordTodoRollover(todo, '2026-08-13', 10)
  const second = recordTodoRollover(todo, '2026-08-13', 20)
  assert.deepEqual(second, first)
  assert.equal(todo.rolloverHistory.length, 1)
  todo.done = true
  assert.equal(recordTodoRollover(todo, '2026-08-14'), null)
})

test('stored rollover history is normalized to auditable incomplete records', () => {
  const todo = {
    rolloverHistory: [
      { fromDate: '2026-08-12', rolledTo: '2026-08-13', status: 'done', recordedAt: '42', title: 123 },
      { fromDate: '2026-08-12', rolledTo: '2026-08-13', recordedAt: 99 },
      { fromDate: 'bad', rolledTo: '2026-08-14' }
    ]
  }
  assert.equal(normalizeTodoRolloverHistory(todo), true)
  assert.deepEqual(todo.rolloverHistory, [{
    fromDate: '2026-08-12',
    rolledTo: '2026-08-13',
    status: 'incomplete',
    recordedAt: 42,
    title: '123',
    listId: null
  }])
})
