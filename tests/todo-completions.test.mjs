import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { test } from 'node:test'

const require = createRequire(import.meta.url)
const {
  normalizeTodoCompletionHistory,
  recordTodoCompletion
} = require('../src/main/todo-completions.js')

test('a repeating todo records its completed occurrence before advancing', () => {
  const todo = {
    date: '2026-08-13',
    done: false,
    title: '每周复盘',
    listId: 'work',
    repeat: 'weekly'
  }
  const record = recordTodoCompletion(todo, 123456)
  assert.deepEqual(record, {
    date: '2026-08-13',
    status: 'completed',
    completedAt: 123456,
    title: '每周复盘',
    listId: 'work'
  })
  assert.equal(todo.date, '2026-08-13')
})

test('completion history de-duplicates the same scheduled occurrence', () => {
  const todo = { date: '2026-08-13', done: false, title: '去重完成记录' }
  const first = recordTodoCompletion(todo, 10)
  const second = recordTodoCompletion(todo, 20)
  assert.deepEqual(second, first)
  assert.equal(todo.completionHistory.length, 1)
})

test('completion history rejects undated and already-completed todos', () => {
  assert.equal(recordTodoCompletion({ date: null, done: false }), null)
  assert.equal(recordTodoCompletion({ date: '2026-08-13', done: true }), null)
})

test('stored completion history is normalized to immutable completed records', () => {
  const todo = {
    completionHistory: [
      { date: '2026-08-13', status: 'incomplete', completedAt: '42', title: 123 },
      { date: '2026-08-13', completedAt: 99 },
      { date: 'bad', completedAt: 100 }
    ]
  }
  assert.equal(normalizeTodoCompletionHistory(todo), true)
  assert.deepEqual(todo.completionHistory, [{
    date: '2026-08-13',
    status: 'completed',
    completedAt: 42,
    title: '123',
    listId: null
  }])
})
