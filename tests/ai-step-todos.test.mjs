import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const {
  MAX_STEPS_PER_BATCH,
  stepTodoSignature,
  buildStepTodoDrafts,
  createStepTodos,
  undoStepBatch,
  normalizeStepBatches
} = require('../src/main/ai-step-todos.js')

const HASH_A = 'a'.repeat(64)
const HASH_B = 'b'.repeat(64)

const parentTodo = (overrides = {}) => ({
  id: 'parent-1',
  listId: 'list-work',
  title: '开通速卖通店铺',
  priority: 3,
  quadrant: 2,
  done: false,
  ...overrides
})

const plan = (overrides = {}) => ({
  todoId: 'parent-1',
  sourceHash: HASH_A,
  steps: [
    { id: 'step-1', title: '查阅官方入驻政策', detail: '确认资质清单与费用', estimatedMinutes: 30, done: false },
    { id: 'step-2', title: '准备入驻资料', detail: '', estimatedMinutes: 60, done: false },
    { id: 'step-3', title: '提交审核', detail: '注意审核时长', estimatedMinutes: 15, done: false }
  ],
  ...overrides
})

// 模拟 repo.createTodo：返回与真实实现同形状的待办。
function makeCreator () {
  let seq = 0
  const calls = []
  const created = []
  const createTodo = (input) => {
    calls.push(input)
    const todo = {
      id: `new-${++seq}`,
      listId: input.listId,
      title: input.title,
      note: input.note,
      date: null,
      startTime: null,
      endTime: null,
      done: false,
      priority: input.priority,
      quadrant: input.quadrant,
      updatedAt: 5000
    }
    created.push(todo)
    return todo
  }
  return { createTodo, calls, created }
}

test('drafts inherit the parent list and quadrant and record provenance in the note', () => {
  const result = buildStepTodoDrafts({ plan: plan(), parentTodo: parentTodo(), stepIds: ['step-1', 'step-3'] })
  assert.equal(result.ok, true)
  assert.equal(result.drafts.length, 2)

  const [first] = result.drafts
  assert.equal(first.stepId, 'step-1')
  assert.equal(first.title, '查阅官方入驻政策')
  assert.equal(first.listId, 'list-work')
  assert.equal(first.priority, 3)
  assert.equal(first.quadrant, 2)
  assert.equal(first.estimatedMinutes, 30)
  assert.match(first.note, /来自 AI 拆解：开通速卖通店铺（步骤 step-1，预计 30 分钟）/)
  assert.match(first.note, /确认资质清单与费用/)

  // 步骤没有 detail 时只保留出处行，不留空行。
  const noDetail = buildStepTodoDrafts({ plan: plan(), parentTodo: parentTodo(), stepIds: ['step-2'] })
  assert.doesNotMatch(noDetail.drafts[0].note, /\n/)
})

test('draft building rejects unusable selections without side effects', () => {
  const cases = [
    [{ stepIds: [] }, 'no_steps_selected'],
    [{ stepIds: ['step-1', 'step-1'] }, 'duplicate_steps'],
    [{ stepIds: ['step-9'] }, 'unknown_step'],
    [{ stepIds: Array.from({ length: MAX_STEPS_PER_BATCH + 1 }, (_, i) => `step-${i}`) }, 'too_many_steps'],
    [{ stepIds: ['step-1'], parentTodo: parentTodo({ done: true }) }, 'parent_done'],
    [{ stepIds: ['step-1'], parentTodo: null }, 'parent_missing'],
    [{ stepIds: ['step-1'], plan: plan({ sourceHash: 'not-a-hash' }) }, 'plan_missing']
  ]
  for (const [overrides, reason] of cases) {
    const result = buildStepTodoDrafts({ plan: plan(), parentTodo: parentTodo(), ...overrides })
    assert.equal(result.ok, false, reason)
    assert.equal(result.reason, reason)
  }
})

test('a step already promoted from the same plan cannot be promoted twice', () => {
  const { createTodo } = makeCreator()
  const first = createStepTodos({ plan: plan(), parentTodo: parentTodo(), stepIds: ['step-1'], createTodo, now: 1000 })
  assert.equal(first.ok, true)

  const again = buildStepTodoDrafts({
    plan: plan(),
    parentTodo: parentTodo(),
    stepIds: ['step-1', 'step-2'],
    batches: [first.batch]
  })
  assert.equal(again.ok, false)
  assert.equal(again.reason, 'already_promoted')
  assert.deepEqual(again.stepIds, ['step-1'])

  // 未被提升的步骤仍然可用。
  const others = buildStepTodoDrafts({ plan: plan(), parentTodo: parentTodo(), stepIds: ['step-2'], batches: [first.batch] })
  assert.equal(others.ok, true)

  // 重新生成拆解后步骤内容已变，旧批次不应继续拦截。
  const regenerated = buildStepTodoDrafts({
    plan: plan({ sourceHash: HASH_B }),
    parentTodo: parentTodo(),
    stepIds: ['step-1'],
    batches: [first.batch]
  })
  assert.equal(regenerated.ok, true)

  // 已撤销的批次同样不再拦截。
  const undone = { ...first.batch, status: 'undone', undoneAt: 2000 }
  assert.equal(buildStepTodoDrafts({ plan: plan(), parentTodo: parentTodo(), stepIds: ['step-1'], batches: [undone] }).ok, true)
})

test('creation is all-or-nothing and never runs partially', () => {
  const { createTodo, calls } = makeCreator()
  const rejected = createStepTodos({
    plan: plan(),
    parentTodo: parentTodo(),
    stepIds: ['step-1', 'step-9'],
    createTodo,
    now: 1000
  })
  assert.equal(rejected.ok, false)
  assert.equal(rejected.reason, 'unknown_step')
  // 校验全部通过后才开始创建，因此一条也不该被写入。
  assert.equal(calls.length, 0)
})

test('a successful batch records the step, todo and signature for every item', () => {
  const { createTodo, created } = makeCreator()
  const result = createStepTodos({ plan: plan(), parentTodo: parentTodo(), stepIds: ['step-1', 'step-2'], createTodo, now: 7000 })

  assert.equal(result.ok, true)
  assert.equal(result.batch.parentTodoId, 'parent-1')
  assert.equal(result.batch.planSourceHash, HASH_A)
  assert.equal(result.batch.status, 'applied')
  assert.equal(result.batch.createdAt, 7000)
  assert.deepEqual(result.createdTodoIds, ['new-1', 'new-2'])
  assert.deepEqual(result.batch.items.map((item) => item.stepId), ['step-1', 'step-2'])
  for (const [index, item] of result.batch.items.entries()) {
    assert.equal(item.signature, stepTodoSignature(created[index]))
  }
  // 子待办不带日期与时间，交给「AI 安排今天」或用户自行排程。
  for (const todo of created) {
    assert.equal(todo.date, null)
    assert.equal(todo.startTime, null)
  }
})

test('undo removes exactly the untouched todos this batch created', () => {
  const { createTodo, created } = makeCreator()
  const { batch } = createStepTodos({ plan: plan(), parentTodo: parentTodo(), stepIds: ['step-1', 'step-2'], createTodo, now: 1000 })
  const todos = [parentTodo(), ...created]

  const result = undoStepBatch({ todos, batch })
  assert.equal(result.ok, true)
  assert.deepEqual(result.removeTodoIds, ['new-1', 'new-2'])
  assert.deepEqual(result.missingTodoIds, [])
  assert.ok(!result.removeTodoIds.includes('parent-1'))
})

test('any edited or completed sub-todo blocks the whole undo', () => {
  for (const mutate of [
    (todo) => { todo.title = '我改过的标题'; todo.updatedAt = 9000 },
    (todo) => { todo.done = true; todo.updatedAt = 9000 },
    (todo) => { todo.date = '2026-08-20'; todo.updatedAt = 9000 },
    (todo) => { todo.note = '补充了自己的笔记'; todo.updatedAt = 9000 }
  ]) {
    const { createTodo, created } = makeCreator()
    const { batch } = createStepTodos({ plan: plan(), parentTodo: parentTodo(), stepIds: ['step-1', 'step-2'], createTodo, now: 1000 })
    mutate(created[1])
    const todos = [parentTodo(), ...created]

    const result = undoStepBatch({ todos, batch })
    assert.equal(result.ok, false)
    assert.equal(result.reason, 'undo_conflict')
    assert.deepEqual(result.conflictTodoIds, ['new-2'])
    // 整批拒绝：未被改动的那条也不能删。
    assert.equal(result.removeTodoIds, undefined)
  }
})

test('a sub-todo the user already deleted is skipped instead of blocking undo', () => {
  const { createTodo, created } = makeCreator()
  const { batch } = createStepTodos({ plan: plan(), parentTodo: parentTodo(), stepIds: ['step-1', 'step-2'], createTodo, now: 1000 })
  const todos = [parentTodo(), created[0]]

  const result = undoStepBatch({ todos, batch })
  assert.equal(result.ok, true)
  assert.deepEqual(result.removeTodoIds, ['new-1'])
  assert.deepEqual(result.missingTodoIds, ['new-2'])
})

test('an undone or empty batch cannot be undone again', () => {
  const { createTodo, created } = makeCreator()
  const { batch } = createStepTodos({ plan: plan(), parentTodo: parentTodo(), stepIds: ['step-1'], createTodo, now: 1000 })

  assert.equal(undoStepBatch({ todos: created, batch: { ...batch, status: 'undone', undoneAt: 2000 } }).reason, 'not_applied')
  assert.equal(undoStepBatch({ todos: created, batch: { ...batch, items: [] } }).reason, 'not_applied')
  assert.equal(undoStepBatch({ todos: created, batch: null }).reason, 'not_applied')
})

test('stored batches are normalized, de-duplicated and bounded', () => {
  const good = {
    id: 'batch-1',
    parentTodoId: 'parent-1',
    planSourceHash: HASH_A,
    status: 'applied',
    createdAt: 100,
    items: [
      { stepId: 'step-1', todoId: 'todo-1', title: '甲', signature: HASH_B },
      { stepId: 'step-1', todoId: 'todo-1', title: '重复 todoId 应被丢弃', signature: HASH_B },
      { stepId: 'step-2', todoId: 'todo-2', title: '乙', signature: 'bad-signature' }
    ]
  }
  const [normalized] = normalizeStepBatches([good])
  assert.equal(normalized.items.length, 1)
  assert.equal(normalized.items[0].todoId, 'todo-1')

  // 缺少可用条目、父待办或来源指纹的批次一律丢弃，不能变成无法撤销的孤儿记录。
  assert.deepEqual(normalizeStepBatches([{ ...good, items: [] }]), [])
  assert.deepEqual(normalizeStepBatches([{ ...good, parentTodoId: '' }]), [])
  assert.deepEqual(normalizeStepBatches([{ ...good, planSourceHash: 'nope' }]), [])
  assert.deepEqual(normalizeStepBatches('not an array'), [])

  // undoneAt 存在时状态必须是 undone，避免被当成仍可撤销的批次重复删除。
  assert.equal(normalizeStepBatches([{ ...good, status: 'applied', undoneAt: 900 }])[0].status, 'undone')

  const many = Array.from({ length: 80 }, (_, index) => ({ ...good, id: `batch-${index}`, createdAt: index }))
  const bounded = normalizeStepBatches(many)
  assert.equal(bounded.length, 50)
  assert.equal(bounded[0].createdAt, 79, '保留最新的批次')
})
