import { computed, reactive } from 'vue'
import { todayYmd } from './lib/date.js'

const api = window.api

export const state = reactive({
  ready: false,
  lists: [],
  todos: [],
  goals: [],
  settings: null,

  // —— 界面状态，不落盘 ——
  view: 'calendar', // calendar | todo | matrix
  calendarMode: 'month', // month | week | day
  cursor: todayYmd(), // 视图锚点：决定当前显示哪个月/周
  selected: todayYmd(), // 选中的那一天
  activeListId: null, // null = 全部清单
  filter: 'all', // all | active | done
  editing: null, // 正在编辑的待办；{} 表示新建
  settingsOpen: false
})

function applySnapshot(snap) {
  state.lists = snap.lists || []
  state.todos = snap.todos || []
  state.goals = snap.goals || []
}

export async function initStore() {
  const [snap, settings] = await Promise.all([api.data.snapshot(), api.settings.get()])
  applySnapshot(snap)
  state.settings = settings
  applyTheme(settings.theme)
  state.ready = true

  // 另一个窗口（小组件/主窗口）改了数据，这边跟着更新
  api.data.onChanged(applySnapshot)
  api.settings.onChanged((s) => {
    state.settings = s
    applyTheme(s.theme)
  })
}

export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme === 'light' ? 'light' : 'dark'
}

/* ---------------- 派生数据 ---------------- */

/** 按日期分组，日历格子上标点用 */
export const todosByDate = computed(() => {
  const map = new Map()
  for (const t of state.todos) {
    if (!t.date) continue
    if (!map.has(t.date)) map.set(t.date, [])
    map.get(t.date).push(t)
  }
  for (const arr of map.values()) {
    arr.sort(byTimeThenOrder)
  }
  return map
})

export function byTimeThenOrder(a, b) {
  if (a.done !== b.done) return a.done ? 1 : -1
  if (a.time && b.time) return a.time.localeCompare(b.time)
  if (a.time) return -1
  if (b.time) return 1
  return (a.order ?? 0) - (b.order ?? 0)
}

export function todosOn(dateStr) {
  return todosByDate.value.get(dateStr) || []
}

/** 当前清单 + 筛选条件下的待办 */
export const visibleTodos = computed(() => {
  let rows = state.todos
  if (state.activeListId) rows = rows.filter((t) => t.listId === state.activeListId)
  if (state.filter === 'active') rows = rows.filter((t) => !t.done)
  if (state.filter === 'done') rows = rows.filter((t) => t.done)
  return [...rows].sort(byTimeThenOrder)
})

export const listById = computed(() => new Map(state.lists.map((l) => [l.id, l])))

export function countOpen(listId) {
  return state.todos.filter((t) => t.listId === listId && !t.done).length
}

/* ---------------- 动作 ---------------- */

export const actions = {
  createList: (name) => api.lists.create(name),
  renameList: (id, name) => api.lists.update(id, { name }),
  removeList: (id) => api.lists.remove(id),

  createTodo: (input) => api.todos.create(input),
  updateTodo: (id, patch) => api.todos.update(id, patch),
  toggleTodo: (id) => api.todos.toggle(id),
  startTodo: (id) => api.todos.start(id),
  stopTodo: (id) => api.todos.stop(id),
  /** 启动/停止一个键搞定 */
  toggleTimer: (todo) => (todo.startedAt ? api.todos.stop(todo.id) : api.todos.start(todo.id)),
  removeTodo: (id) => api.todos.remove(id),
  clearCompleted: (listId) => api.todos.clearCompleted(listId),

  createGoal: (input) => api.goals.create(input),
  updateGoal: (id, patch) => api.goals.update(id, patch),
  addGoalProgress: (id, delta) => api.goals.addProgress(id, delta),
  removeGoal: (id) => api.goals.remove(id),

  patchSettings: (patch) => api.settings.patch(patch),

  /** 快速新增：只给标题和日期，其余走默认 */
  quickAdd(title, dateStr) {
    const trimmed = String(title || '').trim()
    if (!trimmed) return null
    return api.todos.create({
      title: trimmed,
      date: dateStr || null,
      listId: state.activeListId || state.lists[0]?.id,
      remindBefore: state.settings?.defaultRemindBefore ?? null
    })
  },

  openEditor(todo) {
    state.editing = todo ? { ...todo } : { date: state.selected }
  },
  closeEditor() {
    state.editing = null
  }
}

export const QUADRANTS = [
  { id: 1, name: '重要且紧急', hint: '马上做', color: '#ff5d5d' },
  { id: 2, name: '重要不紧急', hint: '排计划', color: '#4c8dff' },
  { id: 3, name: '紧急不重要', hint: '能交就交', color: '#ffb020' },
  { id: 4, name: '不重要不紧急', hint: '尽量别做', color: '#8b93a7' }
]

export const PRIORITIES = [
  { id: 0, name: '无', color: 'transparent' },
  { id: 1, name: '低', color: '#4c8dff' },
  { id: 2, name: '中', color: '#ffb020' },
  { id: 3, name: '高', color: '#ff5d5d' }
]

export const REPEATS = [
  { id: 'none', name: '不重复' },
  { id: 'daily', name: '每天' },
  { id: 'weekly', name: '每周' },
  { id: 'monthly', name: '每月' },
  { id: 'yearly', name: '每年' }
]

export const REMIND_OPTIONS = [
  { id: null, name: '不提醒' },
  { id: 0, name: '准点' },
  { id: 5, name: '提前 5 分钟' },
  { id: 15, name: '提前 15 分钟' },
  { id: 30, name: '提前 30 分钟' },
  { id: 60, name: '提前 1 小时' },
  { id: 1440, name: '提前 1 天' }
]
