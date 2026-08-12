import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { test } from 'node:test'

const require = createRequire(import.meta.url)
const {
  DEFAULT_EXPENSE_CATEGORIES,
  MAX_EXPENSE_CATEGORY_NAME,
  addExpenseCategory,
  archiveExpenseCategory,
  categoriesOf,
  migrateExpenseCategories,
  renameExpenseCategory,
  restoreExpenseCategory,
  summarizeExpenseEntries
} = require('../src/main/expense-categories.js')

const ledger = (overrides = {}) => ({ id: 'ledger-1', mode: 'ledger', ...overrides })

test('v3 ledgers migrate fixed ids and renamed labels without rewriting entries', () => {
  const goal = ledger({ catNames: { office: '软件订阅' } })
  const entries = [{ id: 'e1', goalId: goal.id, cat: 'office', amount: 88 }]
  const first = migrateExpenseCategories(goal, entries)

  assert.equal(first.changed, true)
  assert.deepEqual(categoriesOf(goal).map((category) => category.id), DEFAULT_EXPENSE_CATEGORIES.map((category) => category.id))
  assert.equal(categoriesOf(goal).find((category) => category.id === 'office').name, '软件订阅')
  assert.equal(entries[0].cat, 'office')

  const second = migrateExpenseCategories(goal, entries)
  assert.equal(second.changed, false)
})

test('unknown legacy category ids are retained as archived recovery categories', () => {
  const goal = ledger()
  const entries = [{ id: 'e1', goalId: goal.id, cat: 'old-misc', amount: 19.5 }]
  migrateExpenseCategories(goal, entries)

  const recovered = categoriesOf(goal).find((category) => category.id === 'old-misc')
  assert.equal(recovered.group, 'unclassified')
  assert.ok(recovered.archivedAt)
  assert.equal(summarizeExpenseEntries(goal, entries).total, 19.5)
})

test('add and rename use stable ids and reject blank or duplicate names', () => {
  const goal = ledger()
  migrateExpenseCategories(goal, [])
  const created = addExpenseCategory(goal, { name: '  软件订阅  ' }, { idFactory: () => 'fixed-id' })

  assert.equal(created.ok, true)
  assert.equal(created.category.id, 'expense-fixed-id')
  assert.equal(created.category.name, '软件订阅')
  assert.equal(addExpenseCategory(goal, { name: '软件订阅' }, { idFactory: () => 'other-id' }).ok, false)
  assert.equal(addExpenseCategory(goal, { name: '   ' }, { idFactory: () => 'blank-id' }).ok, false)

  const entry = { id: 'e1', goalId: goal.id, cat: created.category.id, amount: 20 }
  const renamed = renameExpenseCategory(goal, created.category.id, `长期${'订'.repeat(MAX_EXPENSE_CATEGORY_NAME)}`)
  assert.equal(renamed.ok, true)
  assert.equal(Array.from(renamed.category.name).length, MAX_EXPENSE_CATEGORY_NAME)
  assert.equal(entry.cat, created.category.id)
  assert.equal(renameExpenseCategory(goal, created.category.id, '办公费').ok, false)
})

test('archive hides a category from new use while history remains summarized and restorable', () => {
  const goal = ledger()
  migrateExpenseCategories(goal, [])
  const created = addExpenseCategory(goal, { name: '云服务' }, { idFactory: () => 'cloud' }).category
  const entries = [{ id: 'e1', goalId: goal.id, cat: created.id, amount: 42 }]

  const archived = archiveExpenseCategory(goal, created.id, { now: () => 1234 })
  assert.equal(archived.ok, true)
  assert.equal(categoriesOf(goal).find((category) => category.id === created.id).archivedAt, 1234)
  assert.deepEqual(summarizeExpenseEntries(goal, entries).byCat[created.id], { count: 1, amount: 42 })

  const restored = restoreExpenseCategory(goal, created.id)
  assert.equal(restored.ok, true)
  assert.equal(restored.category.archivedAt, null)
})

test('the cogs category and last active opex category cannot be archived', () => {
  const goal = ledger()
  migrateExpenseCategories(goal, [])
  assert.equal(archiveExpenseCategory(goal, 'goods').ok, false)

  for (const category of categoriesOf(goal).filter((item) => item.group === 'opex').slice(1)) {
    assert.equal(archiveExpenseCategory(goal, category.id).ok, true)
  }
  assert.equal(archiveExpenseCategory(goal, 'freight').ok, false)
})

test('summaries keep archived, unclassified, negative, and unknown amounts auditable', () => {
  const goal = ledger()
  migrateExpenseCategories(goal, [{ goalId: 'ledger-1', cat: 'legacy', amount: 3 }])
  const entries = [
    { goalId: goal.id, cat: 'office', amount: 100 },
    { goalId: goal.id, cat: 'office', amount: -10 },
    { goalId: goal.id, cat: 'goods', amount: 250 },
    { goalId: goal.id, cat: 'legacy', amount: 3 },
    { goalId: goal.id, cat: 'missing-after-migration', amount: 2 }
  ]
  const totals = summarizeExpenseEntries(goal, entries)

  assert.equal(totals.count, 5)
  assert.equal(totals.opex, 90)
  assert.equal(totals.cogs, 250)
  assert.equal(totals.unclassified, 5)
  assert.equal(totals.total, 345)
  assert.deepEqual(totals.unknownIds, ['missing-after-migration'])
})

test('legacy category ids remain opaque foreign keys during migration', () => {
  const ids = [' legacy ', 'x'.repeat(101), 'Case', 'case', 'control\u0001id', '__proto__', 'constructor']
  const goal = ledger()
  const entries = ids.map((cat, index) => ({
    id: `entry-${index}`,
    goalId: goal.id,
    cat,
    amount: index + 1
  }))

  const first = migrateExpenseCategories(goal, entries)
  assert.equal(first.changed, true)
  const migratedIds = new Set(categoriesOf(goal).map((category) => category.id))
  for (const id of ids) assert.ok(migratedIds.has(id), `Migration changed opaque id ${JSON.stringify(id)}`)

  const totals = summarizeExpenseEntries(goal, entries)
  assert.equal(Object.getPrototypeOf(totals.byCat), null)
  const expectedTotal = ids.reduce((sum, _id, index) => sum + index + 1, 0)
  assert.equal(totals.count, ids.length)
  assert.equal(totals.unclassified, expectedTotal)
  assert.equal(totals.total, expectedTotal)
  assert.deepEqual(totals.unknownIds, [])
  for (const id of ids) assert.equal(totals.byCat[id].count, 1)
  assert.equal(migrateExpenseCategories(goal, entries).changed, false)
})

test('an empty ledger category array is repaired to the default catalog', () => {
  const goal = ledger({ expenseCategories: [] })
  const result = migrateExpenseCategories(goal, [])

  assert.equal(result.changed, true)
  assert.deepEqual(categoriesOf(goal).map((category) => category.id), DEFAULT_EXPENSE_CATEGORIES.map((category) => category.id))
})
