import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { test } from 'node:test'

const require = createRequire(import.meta.url)
const {
  MAX_EXPENSE_NOTE_LENGTH,
  roundExpenseAmount,
  normalizeExpenseNote,
  expenseEntryVersion,
  updateExpenseEntry
} = require('../src/main/expense-entries.js')

const entry = (overrides = {}) => ({
  id: 'expense-1',
  goalId: 'ledger-1',
  date: '2026-08-17',
  cat: 'office',
  amount: 100,
  note: '原说明',
  at: 1_000,
  ...overrides
})

test('single-entry edits change only amount and note', () => {
  const original = entry()
  const rows = [original, entry({ id: 'expense-2', amount: 8 })]
  const result = updateExpenseEntry(rows, original.id, {
    amount: '120.345',
    note: '新说明',
    expectedUpdatedAt: 1_000,
    id: 'forged-id',
    goalId: 'other-ledger',
    date: '2030-01-01',
    cat: 'goods',
    at: 9_999
  }, 2_000)

  assert.equal(result.ok, true)
  assert.equal(result.changed, true)
  assert.equal(original.amount, 120.35)
  assert.equal(original.note, '新说明')
  assert.equal(original.updatedAt, 2_000)
  assert.deepEqual(
    { id: original.id, goalId: original.goalId, date: original.date, cat: original.cat, at: original.at },
    { id: 'expense-1', goalId: 'ledger-1', date: '2026-08-17', cat: 'office', at: 1_000 }
  )
  assert.equal(rows[1].amount, 8)
})

test('notes can be cleared and are capped by Unicode code points', () => {
  const original = entry()
  assert.equal(updateExpenseEntry([original], original.id, { note: '' }, 2_000).ok, true)
  assert.equal(original.note, '')

  const longNote = `${'账'.repeat(MAX_EXPENSE_NOTE_LENGTH - 1)}😀尾巴`
  assert.equal(normalizeExpenseNote(longNote), `${'账'.repeat(MAX_EXPENSE_NOTE_LENGTH - 1)}😀`)
  assert.equal([...normalizeExpenseNote(longNote)].length, MAX_EXPENSE_NOTE_LENGTH)
})

test('positive and negative amounts use the existing two-decimal rule', () => {
  assert.deepEqual(roundExpenseAmount('12.345'), { ok: true, amount: 12.35 })
  assert.deepEqual(roundExpenseAmount('-12.345'), { ok: true, amount: -12.34 })

  const original = entry()
  const result = updateExpenseEntry([original], original.id, { amount: -25.5 }, 2_000)
  assert.equal(result.ok, true)
  assert.equal(original.amount, -25.5)
})

test('invalid, zero and overflowing amounts never mutate the record', () => {
  for (const amount of ['', ' ', null, 0, -0, 'not-a-number', Infinity, -Infinity, 1e308]) {
    const original = entry()
    const before = structuredClone(original)
    const result = updateExpenseEntry([original], original.id, { amount, note: '不应保存' }, 2_000)
    assert.equal(result.ok, false, `amount ${String(amount)} should be rejected`)
    assert.deepEqual(original, before)
  }
})

test('optimistic version checks prevent stale editors from overwriting a newer value', () => {
  const original = entry({ updatedAt: 3_000 })
  assert.equal(expenseEntryVersion(original), 3_000)

  const result = updateExpenseEntry([original], original.id, {
    amount: 88,
    expectedUpdatedAt: 1_000
  }, 4_000)

  assert.equal(result.ok, false)
  assert.match(result.reason, /其他窗口/)
  assert.equal(original.amount, 100)
  assert.equal(original.updatedAt, 3_000)
})

test('no-op edits do not create a new version', () => {
  const original = entry()
  const result = updateExpenseEntry([original], original.id, {
    amount: 100,
    note: '原说明',
    expectedUpdatedAt: 1_000
  }, 2_000)

  assert.deepEqual(result, { ok: true, changed: false, entry: original })
  assert.equal(original.updatedAt, undefined)
})

test('a deleted entry returns a clear failure without creating data', () => {
  const rows = []
  const result = updateExpenseEntry(rows, 'missing', { amount: 10 }, 2_000)
  assert.equal(result.ok, false)
  assert.match(result.reason, /不存在/)
  assert.deepEqual(rows, [])
})
