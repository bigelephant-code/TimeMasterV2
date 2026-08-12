import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'

/**
 * 本地持久化层。
 *
 * 刻意不用原生 SQLite：本机没有 MSVC 生成工具，better-sqlite3 之类要现编译。
 * 数据量级（清单 + 待办，撑死几千条）用 JSON 全量载入内存足够，读写都是 O(n) 但 n 很小。
 * 所有出口都收敛在本文件的 repo 对象里，将来要换 SQLite 只动这一处。
 */

const DATA_VERSION = 1

let dataDir = ''
let dataFile = ''
let settingsFile = ''

/** @type {{version:number, lists:any[], todos:any[], goals:any[]}} */
let data = { version: DATA_VERSION, lists: [], todos: [], goals: [] }

let settings = defaultSettings()

function defaultSettings() {
  return {
    theme: 'dark',
    weekStart: 1, // 1 = 周一开头，0 = 周日开头
    closeToTray: true,
    autoLaunch: false,
    defaultRemindBefore: 0, // 分钟；null 表示默认不提醒
    // 小组件顶部的纪念日：date 在将来就是倒计时，在过去就是正计时
    countdown: { title: '', date: null },
    window: { width: 1040, height: 700, x: null, y: null },
    widget: {
      enabled: true,
      x: null,
      y: null,
      width: 396,
      height: 604,
      locked: false,
      alwaysOnTop: false,
      opacity: 0.96
    }
  }
}

function readJson(file, fallback) {
  try {
    if (!existsSync(file)) return fallback
    const raw = readFileSync(file, 'utf8').trim()
    if (!raw) return fallback
    return JSON.parse(raw)
  } catch (err) {
    // 文件损坏时留一份现场，不要直接覆盖掉用户数据
    try {
      renameSync(file, `${file}.broken-${Date.now()}`)
    } catch {
      /* 留不下就算了，继续用默认值启动 */
    }
    console.error(`[store] 读取 ${file} 失败，已改名备份：`, err.message)
    return fallback
  }
}

/** 先写临时文件再改名，避免写一半断电留下半截 JSON */
function writeJsonAtomic(file, value) {
  const tmp = `${file}.tmp`
  writeFileSync(tmp, JSON.stringify(value, null, 2), 'utf8')
  renameSync(tmp, file)
}

let flushTimer = null
function scheduleFlush() {
  if (flushTimer) return
  flushTimer = setTimeout(() => {
    flushTimer = null
    flushNow()
  }, 200)
}

export function flushNow() {
  if (flushTimer) {
    clearTimeout(flushTimer)
    flushTimer = null
  }
  writeJsonAtomic(dataFile, data)
  writeJsonAtomic(settingsFile, settings)
}

export function initStore() {
  dataDir = app.getPath('userData')
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true })
  dataFile = join(dataDir, 'data.json')
  settingsFile = join(dataDir, 'settings.json')

  data = readJson(dataFile, null) || { version: DATA_VERSION, lists: [], todos: [], goals: [] }
  if (!Array.isArray(data.lists)) data.lists = []
  if (!Array.isArray(data.todos)) data.todos = []
  // goals 是后加的，老数据文件里没有这个键
  if (!Array.isArray(data.goals)) data.goals = []

  settings = { ...defaultSettings(), ...(readJson(settingsFile, null) || {}) }
  settings.window = { ...defaultSettings().window, ...(settings.window || {}) }
  settings.widget = { ...defaultSettings().widget, ...(settings.widget || {}) }
  settings.countdown = { ...defaultSettings().countdown, ...(settings.countdown || {}) }

  if (data.lists.length === 0) {
    data.lists.push({
      id: randomUUID(),
      name: '默认清单',
      color: '#4c8dff',
      order: 0,
      createdAt: Date.now()
    })
    scheduleFlush()
  }
  return { dataDir, dataFile, settingsFile }
}

export function getSettings() {
  return settings
}

export function patchSettings(patch) {
  settings = {
    ...settings,
    ...patch,
    window: { ...settings.window, ...(patch.window || {}) },
    widget: { ...settings.widget, ...(patch.widget || {}) },
    countdown: { ...settings.countdown, ...(patch.countdown || {}) }
  }
  scheduleFlush()
  return settings
}

const nextOrder = (rows) => (rows.length ? Math.max(...rows.map((r) => r.order ?? 0)) + 1 : 0)

/**
 * 没有具体时间的待办不该有提醒。
 * 否则调度器会按默认的 09:00 去算触发点，凭空在早上响一次。
 */
function normalizeReminder(todo) {
  if (!todo.time) todo.remindBefore = null
  return todo
}

const toNumber = (v, fallback = 0) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

/** 目标总值必须为正，否则百分比会除出 Infinity 或负数 */
const toPositiveNumber = (v, fallback) => {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

/** 允许小数进度（跑步公里数之类），但别让浮点误差堆出一长串小数位 */
const round2 = (n) => Math.round(n * 100) / 100

/** 把正在跑的这一段结算进累计耗时；没在跑就是空操作 */
function accumulate(todo) {
  if (!todo.startedAt) return todo
  todo.elapsedMs = (todo.elapsedMs || 0) + (Date.now() - todo.startedAt)
  todo.startedAt = null
  return todo
}

export const repo = {
  /* ---------- 清单 ---------- */
  listLists() {
    return [...data.lists].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  },

  createList(name) {
    const list = {
      id: randomUUID(),
      name: String(name || '新清单').slice(0, 40),
      color: '#4c8dff',
      order: nextOrder(data.lists),
      createdAt: Date.now()
    }
    data.lists.push(list)
    scheduleFlush()
    return list
  },

  updateList(id, patch) {
    const list = data.lists.find((l) => l.id === id)
    if (!list) return null
    if (patch.name !== undefined) list.name = String(patch.name).slice(0, 40)
    if (patch.color !== undefined) list.color = patch.color
    if (patch.order !== undefined) list.order = patch.order
    scheduleFlush()
    return list
  },

  removeList(id) {
    if (data.lists.length <= 1) return { ok: false, reason: '至少要保留一个清单' }
    data.lists = data.lists.filter((l) => l.id !== id)
    const fallback = data.lists[0].id
    for (const t of data.todos) if (t.listId === id) t.listId = fallback
    scheduleFlush()
    return { ok: true }
  },

  /* ---------- 待办 ---------- */
  listTodos() {
    return [...data.todos].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  },

  createTodo(input = {}) {
    const now = Date.now()
    const todo = {
      id: randomUUID(),
      listId: input.listId || data.lists[0]?.id || null,
      title: String(input.title || '').slice(0, 200),
      note: String(input.note || '').slice(0, 2000),
      date: input.date || null, // 'YYYY-MM-DD'
      time: input.time || null, // 'HH:mm'
      done: false,
      doneAt: null,
      priority: Number(input.priority ?? 0), // 0 无 / 1 低 / 2 中 / 3 高
      quadrant: Number(input.quadrant ?? 0), // 0 未分类 / 1 重要且紧急 / 2 重要不紧急 / 3 紧急不重要 / 4 都不
      repeat: input.repeat || 'none', // none | daily | weekly | monthly | yearly
      remindBefore: input.remindBefore ?? null, // 提前几分钟提醒；null = 不提醒
      notifiedKey: null,
      startedAt: null, // 本轮计时的开始时刻；null = 没在跑
      elapsedMs: 0, // 已累计的耗时，支持中途停了再继续
      order: nextOrder(data.todos),
      createdAt: now,
      updatedAt: now
    }
    normalizeReminder(todo)
    data.todos.push(todo)
    scheduleFlush()
    return todo
  },

  updateTodo(id, patch = {}) {
    const todo = data.todos.find((t) => t.id === id)
    if (!todo) return null
    const editable = [
      'listId', 'title', 'note', 'date', 'time', 'priority',
      'quadrant', 'repeat', 'remindBefore', 'order', 'done', 'doneAt',
      'notifiedKey', 'startedAt', 'elapsedMs'
    ]
    for (const key of editable) {
      if (patch[key] !== undefined) todo[key] = patch[key]
    }
    // 改了时间就重新允许提醒一次
    if (patch.date !== undefined || patch.time !== undefined || patch.remindBefore !== undefined) {
      todo.notifiedKey = null
    }
    normalizeReminder(todo)
    todo.updatedAt = Date.now()
    scheduleFlush()
    return todo
  },

  /* ---------- 事件计时 ---------- */

  /** 开始计时。已经在跑就什么都不做，避免重复点丢掉起始时刻。 */
  startTodo(id) {
    const todo = data.todos.find((t) => t.id === id)
    if (!todo || todo.done || todo.startedAt) return todo || null
    todo.startedAt = Date.now()
    todo.updatedAt = Date.now()
    scheduleFlush()
    return todo
  },

  /** 停止计时，把这一段累加进 elapsedMs。停了还能再启动，耗时continues累计。 */
  stopTodo(id) {
    const todo = data.todos.find((t) => t.id === id)
    if (!todo) return null
    accumulate(todo)
    todo.updatedAt = Date.now()
    scheduleFlush()
    return todo
  },

  /**
   * 勾选完成。重复待办不真正结束，而是把日期推到下一次，
   * 这样一条记录就能长期滚动，不会堆出成百上千条历史。
   */
  toggleTodo(id) {
    const todo = data.todos.find((t) => t.id === id)
    if (!todo) return null

    // 计时中直接点完成，等同于先按停止：不能让这段时间白跑
    if (!todo.done) accumulate(todo)

    if (!todo.done && todo.repeat !== 'none' && todo.date) {
      todo.date = advanceDate(todo.date, todo.repeat)
      todo.notifiedKey = null
      // 换到下一次就是新的一轮，耗时重新从零算
      todo.elapsedMs = 0
      todo.updatedAt = Date.now()
      scheduleFlush()
      return todo
    }
    todo.done = !todo.done
    todo.doneAt = todo.done ? Date.now() : null
    // 取消完成 = 这条要重做，清掉上一轮的耗时
    if (!todo.done) todo.elapsedMs = 0
    todo.updatedAt = Date.now()
    scheduleFlush()
    return todo
  },

  removeTodo(id) {
    const before = data.todos.length
    data.todos = data.todos.filter((t) => t.id !== id)
    scheduleFlush()
    return { ok: data.todos.length < before }
  },

  clearCompleted(listId) {
    data.todos = data.todos.filter((t) => !(t.done && (!listId || t.listId === listId)))
    scheduleFlush()
    return { ok: true }
  },

  /* ---------- 长期目标 ---------- */

  listGoals() {
    return [...data.goals].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  },

  createGoal(input = {}) {
    const now = Date.now()
    const goal = {
      id: randomUUID(),
      name: String(input.name || '新目标').slice(0, 40),
      target: toPositiveNumber(input.target, 100), // 总值，进度按它算百分比
      unit: String(input.unit || '').slice(0, 8), // 单位，比如 本 / 篇 / 公里
      current: toNumber(input.current, 0),
      color: input.color || '#4c8dff',
      history: [], // 每次新增留一条流水，方便回看
      order: nextOrder(data.goals),
      createdAt: now,
      updatedAt: now
    }
    data.goals.push(goal)
    scheduleFlush()
    return goal
  },

  updateGoal(id, patch = {}) {
    const goal = data.goals.find((g) => g.id === id)
    if (!goal) return null
    if (patch.name !== undefined) goal.name = String(patch.name).slice(0, 40)
    if (patch.unit !== undefined) goal.unit = String(patch.unit).slice(0, 8)
    if (patch.color !== undefined) goal.color = patch.color
    if (patch.target !== undefined) goal.target = toPositiveNumber(patch.target, goal.target)
    if (patch.current !== undefined) goal.current = toNumber(patch.current, goal.current)
    if (patch.order !== undefined) goal.order = patch.order
    goal.updatedAt = Date.now()
    scheduleFlush()
    return goal
  },

  /** 新增一笔进度。delta 可以是负数，用来修正记错的量。 */
  addGoalProgress(id, delta) {
    const goal = data.goals.find((g) => g.id === id)
    if (!goal) return null
    const step = toNumber(delta, 0)
    if (!step) return goal
    goal.current = round2(goal.current + step)
    goal.history.push({ at: Date.now(), delta: step })
    // 流水只留最近 100 条，不让单个目标把文件撑大
    if (goal.history.length > 100) goal.history = goal.history.slice(-100)
    goal.updatedAt = Date.now()
    scheduleFlush()
    return goal
  },

  removeGoal(id) {
    const before = data.goals.length
    data.goals = data.goals.filter((g) => g.id !== id)
    scheduleFlush()
    return { ok: data.goals.length < before }
  },

  snapshot() {
    return { lists: this.listLists(), todos: this.listTodos(), goals: this.listGoals() }
  },

  /** 提醒调度器用：拿到原始数组好就地改 notifiedKey */
  rawTodos() {
    return data.todos
  },

  markFlushDirty: scheduleFlush
}

/** 把 'YYYY-MM-DD' 按重复规则推进一格 */
export function advanceDate(dateStr, repeat) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  switch (repeat) {
    case 'daily':
      dt.setDate(dt.getDate() + 1)
      break
    case 'weekly':
      dt.setDate(dt.getDate() + 7)
      break
    case 'monthly': {
      // 31 号 + 1 个月落到没有 31 号的月份时，退到该月最后一天
      const day = dt.getDate()
      dt.setDate(1)
      dt.setMonth(dt.getMonth() + 1)
      const lastDay = new Date(dt.getFullYear(), dt.getMonth() + 1, 0).getDate()
      dt.setDate(Math.min(day, lastDay))
      break
    }
    case 'yearly':
      dt.setFullYear(dt.getFullYear() + 1)
      break
    default:
      return dateStr
  }
  const pad = (n) => String(n).padStart(2, '0')
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`
}
