"use strict";
const electron = require("electron");
const node_path = require("node:path");
const node_fs = require("node:fs");
const node_crypto = require("node:crypto");
const promises = require("node:fs/promises");
const node_zlib = require("node:zlib");
const node_url = require("node:url");
const { normalizeTaskTime, taskStartTime, taskEndTime } = require("./task-time.js");
const { normalizeTodoRolloverHistory, recordTodoRollover } = require("./todo-rollovers.js");
const { normalizeTodoCompletionHistory, recordTodoCompletion } = require("./todo-completions.js");
const {
  defaultExpenseCategories,
  migrateExpenseCategories,
  categoriesOf,
  categoryOf,
  addExpenseCategory: createExpenseCategory,
  renameExpenseCategory: renameExpenseCategoryDefinition,
  archiveExpenseCategory: archiveExpenseCategoryDefinition,
  restoreExpenseCategory: restoreExpenseCategoryDefinition,
  summarizeExpenseEntries
} = require("./expense-categories.js");
const SMOKE_TEST_FLAG = "--timemaster-smoke-test";
const isSmokeTest = process.argv.includes(SMOKE_TEST_FLAG);
function taskHasTime(todo) {
  return !!(taskStartTime(todo) || taskEndTime(todo));
}
function timeMinutes(value) {
  const time = normalizeTaskTime(value);
  if (!time) return null;
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}
function taskDurationMinutes(todo) {
  const start = timeMinutes(taskStartTime(todo));
  const end = timeMinutes(taskEndTime(todo));
  if (start === null || end === null) return null;
  return end >= start ? end - start : 24 * 60 - start + end;
}
function taskEndsNextDay(todo) {
  const start = timeMinutes(taskStartTime(todo));
  const end = timeMinutes(taskEndTime(todo));
  return start !== null && end !== null && end < start;
}
function taskReminderTime(todo) {
  return taskEndTime(todo) || taskStartTime(todo);
}
function taskTimeRangeLabel(todo) {
  const start = taskStartTime(todo);
  const end = taskEndTime(todo);
  if (start && end) return `${start}–${end}（预计 ${taskDurationMinutes(todo)} 分钟完成）`;
  if (start) return `开始 ${start}`;
  if (end) return `结束 ${end}`;
  return "";
}
const MAX_GOALS = 6;
function canCreateGoal(currentCount) {
  return Number(currentCount) < MAX_GOALS;
}
const GOAL_MODES = ["target", "accumulate", "ledger"];
const GOAL_PERIODS = [
  { id: "day", name: "日", current: "今日" },
  { id: "week", name: "周", current: "本周" },
  { id: "month", name: "月", current: "本月" },
  { id: "quarter", name: "季度", current: "本季" },
  { id: "half", name: "半年", current: "本半年" },
  { id: "year", name: "年", current: "本年" }
];
const PERIOD_IDS = GOAL_PERIODS.map((p) => p.id);
const normalizeGoalPeriod = (value) => PERIOD_IDS.includes(value) ? value : "month";
const normalizeGoalMode = (value) => GOAL_MODES.includes(value) ? value : "target";
const GOAL_PERIOD_KEEP = 11;
const pad = (n) => String(n).padStart(2, "0");
function isoWeekParts(d) {
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  target.setDate(target.getDate() + 3 - (target.getDay() + 6) % 7);
  const isoYear = target.getFullYear();
  const firstThursday = new Date(isoYear, 0, 4);
  firstThursday.setDate(firstThursday.getDate() + 3 - (firstThursday.getDay() + 6) % 7);
  return { isoYear, week: 1 + Math.round((target - firstThursday) / (7 * 864e5)) };
}
function periodKeyOf(period, at = Date.now()) {
  const d = at instanceof Date ? at : new Date(at);
  const y = d.getFullYear();
  const m = d.getMonth();
  switch (normalizeGoalPeriod(period)) {
    case "day":
      return `${y}-${pad(m + 1)}-${pad(d.getDate())}`;
    case "week": {
      const { isoYear, week } = isoWeekParts(d);
      return `${isoYear}-W${pad(week)}`;
    }
    case "quarter":
      return `${y}-Q${Math.floor(m / 3) + 1}`;
    case "half":
      return `${y}-H${m < 6 ? 1 : 2}`;
    case "year":
      return `${y}`;
    default:
      return `${y}-${pad(m + 1)}`;
  }
}
const catsOf = categoriesOf;
const normalizeExpenseCat = (goal, value) => {
  const category = categoryOf(goal, value);
  return category && !category.archivedAt ? category.id : null;
};
const cogsCatsOf = (goal) => catsOf(goal).filter((c) => c.group === "cogs");
const OPEX_LABEL = "期间费用";
const cogsLabel = (goal) => cogsCatsOf(goal)[0]?.name || "货款";
const expenseCategoryGroupLabel = (category) => category?.group === "cogs" ? "货款单列" : category?.group === "opex" ? OPEX_LABEL : "遗留/未分类";
const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;
const normalizeYmd = (value) => YMD_RE.test(String(value || "")) ? String(value) : null;
function removeExpensesForDay(entries = [], goalId, date) {
  const rows = Array.isArray(entries) ? entries : [];
  const day = normalizeYmd(date);
  if (!goalId || !day) return { entries: rows, removedExpenses: 0 };
  const kept = rows.filter((entry) => entry.goalId !== goalId || entry.date !== day);
  return { entries: kept, removedExpenses: rows.length - kept.length };
}
const DATA_VERSION = 4;
const DEFAULT_FOCUS_MINUTES = 30;
let dataDir = "";
let dataFile = "";
let dataBackupFile = "";
let settingsFile = "";
let recoveredDataFromBackup = false;
const MAX_EXPENSE_ENTRIES = 2e4;
let data = {
  version: DATA_VERSION,
  lists: [],
  todos: [],
  goals: [],
  expenses: [],
  focusSessions: [],
  focusTimer: defaultFocusTimer()
};
let settings = defaultSettings();
function defaultFocusTimer(durationMinutes = DEFAULT_FOCUS_MINUTES) {
  return {
    durationMinutes,
    status: "idle",
    startedAt: null,
    runningSince: null,
    elapsedMs: 0,
    endsAt: null
  };
}
const focusMinutes = (value) => {
  const minutes = Math.round(Number(value) || DEFAULT_FOCUS_MINUTES);
  return Math.min(240, Math.max(1, minutes));
};
function normalizeFocusTimer(raw) {
  const durationMinutes = focusMinutes(raw?.durationMinutes);
  const status = ["running", "paused"].includes(raw?.status) ? raw.status : "idle";
  if (status === "idle") return defaultFocusTimer(durationMinutes);
  return {
    durationMinutes,
    status,
    startedAt: Number(raw?.startedAt) || Date.now(),
    runningSince: status === "running" ? Number(raw?.runningSince) || Date.now() : null,
    elapsedMs: Math.max(0, Number(raw?.elapsedMs) || 0),
    endsAt: status === "running" ? Number(raw?.endsAt) || null : null
  };
}
function focusElapsedAt(timer2, now = Date.now()) {
  const runningElapsed = timer2.status === "running" && timer2.runningSince ? Math.max(0, now - timer2.runningSince) : 0;
  const durationMs = timer2.durationMinutes * 60 * 1e3;
  return Math.min(durationMs, Math.max(0, timer2.elapsedMs + runningElapsed));
}
function finishFocusSession({ completed = false, now = Date.now() } = {}) {
  const timer2 = data.focusTimer;
  if (!timer2 || timer2.status === "idle") return null;
  const durationMs = timer2.durationMinutes * 60 * 1e3;
  const elapsedMs = completed ? durationMs : focusElapsedAt(timer2, now);
  const session = elapsedMs >= 1e3 ? {
    id: node_crypto.randomUUID(),
    startedAt: timer2.startedAt || now - elapsedMs,
    endedAt: now,
    durationMs,
    focusedMs: elapsedMs,
    plannedMinutes: timer2.durationMinutes,
    completed: !!completed
  } : null;
  if (session) {
    data.focusSessions.push(session);
    if (data.focusSessions.length > 2e3) data.focusSessions = data.focusSessions.slice(-2e3);
  }
  data.focusTimer = defaultFocusTimer(timer2.durationMinutes);
  scheduleFlush();
  return session;
}
function defaultSettings() {
  return {
    theme: "dark",
    weekStart: 1,
    // 1 = 周一开头，0 = 周日开头
    closeToTray: true,
    autoLaunch: false,
    defaultRemindBefore: 0,
    // 分钟；null 表示默认不提醒
    // 小组件顶部的纪念日：date 在将来就是倒计时，在过去就是正计时
    countdown: { title: "", date: null },
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
  };
}
function readJson(file, fallback) {
  try {
    if (!node_fs.existsSync(file)) return fallback;
    const raw = node_fs.readFileSync(file, "utf8").trim();
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (err) {
    try {
      node_fs.renameSync(file, `${file}.broken-${Date.now()}`);
    } catch {
    }
    console.error(`[store] 读取 ${file} 失败，已改名备份：`, err.message);
    return fallback;
  }
}
function writeJsonAtomic(file, value) {
  const tmp = `${file}.tmp`;
  node_fs.writeFileSync(tmp, JSON.stringify(value, null, 2), "utf8");
  node_fs.renameSync(tmp, file);
}
function isUsableData(value) {
  return !!value && typeof value === "object" && (Array.isArray(value.todos) || Array.isArray(value.lists) || Array.isArray(value.goals));
}
function readDataWithBackup() {
  recoveredDataFromBackup = false;
  const primary = readJson(dataFile, null);
  if (storedDataVersion(primary) > DATA_VERSION) return primary;
  if (isUsableData(primary)) return primary;
  const backup = readJson(dataBackupFile, null);
  if (storedDataVersion(backup) > DATA_VERSION) return backup;
  if (isUsableData(backup)) {
    console.warn("[store] 主数据文件不可用，已从备份恢复");
    // Defer restoring data.json until initStore has applied the version gate and,
    // for old schemas, created a non-overwriting pre-migration copy.
    recoveredDataFromBackup = true;
    return backup;
  }
  return null;
}
function storedDataVersion(value) {
  const version = Number(value?.version);
  return Number.isInteger(version) && version >= 0 ? version : 0;
}
function createPreV4Backup(value) {
  const stamp = Date.now();
  const serialized = JSON.stringify(value, null, 2);
  for (let attempt = 0; attempt < 1e3; attempt++) {
    const suffix = attempt ? `-${attempt}` : "";
    const file = node_path.join(dataDir, `data.pre-v4-${stamp}${suffix}.json`);
    try {
      node_fs.writeFileSync(file, serialized, { encoding: "utf8", flag: "wx" });
      console.warn(`[store] 升级前数据已备份到 ${file}`);
      return file;
    } catch (error) {
      if (error?.code === "EEXIST") continue;
      throw error;
    }
  }
  throw new Error("无法创建不覆盖旧文件的 v4 升级前备份。");
}
let flushTimer = null;
function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flushNow();
  }, 200);
}
function flushNow() {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  writeJsonAtomic(dataFile, data);
  writeJsonAtomic(settingsFile, settings);
  try {
    writeJsonAtomic(dataBackupFile, data);
  } catch (err) {
    console.error("[store] 写备份失败：", err.message);
  }
}
function initStore() {
  dataDir = electron.app.getPath("userData");
  if (!node_fs.existsSync(dataDir)) node_fs.mkdirSync(dataDir, { recursive: true });
  dataFile = node_path.join(dataDir, "data.json");
  dataBackupFile = node_path.join(dataDir, "data.backup.json");
  settingsFile = node_path.join(dataDir, "settings.json");
  data = readDataWithBackup() || {
    version: DATA_VERSION,
    lists: [],
    todos: [],
    goals: [],
    expenses: [],
    focusSessions: [],
    focusTimer: defaultFocusTimer()
  };
  const sourceDataVersion = storedDataVersion(data);
  if (sourceDataVersion > DATA_VERSION) {
    throw new Error(`数据版本 ${sourceDataVersion} 高于本程序支持的版本 ${DATA_VERSION}，已停止启动以避免覆盖新版本数据。`);
  }
  const preMigrationBackupFile = sourceDataVersion < DATA_VERSION ? createPreV4Backup(data) : null;
  if (!Array.isArray(data.lists)) data.lists = [];
  if (!Array.isArray(data.todos)) data.todos = [];
  if (!Array.isArray(data.goals)) data.goals = [];
  if (!Array.isArray(data.expenses)) data.expenses = [];
  if (!Array.isArray(data.focusSessions)) {
    data.focusSessions = [];
    scheduleFlush();
  }
  const normalizedFocusTimer = normalizeFocusTimer(data.focusTimer);
  if (JSON.stringify(normalizedFocusTimer) !== JSON.stringify(data.focusTimer)) scheduleFlush();
  data.focusTimer = normalizedFocusTimer;
  migrateTodoTimes();
  migrateTodoRolloverHistories();
  migrateTodoCompletionHistories();
  migrateGoals();
  if (data.version !== DATA_VERSION) {
    data.version = DATA_VERSION;
    scheduleFlush();
  }
  rollOverUnfinishedTodos();
  settings = { ...defaultSettings(), ...readJson(settingsFile, null) || {} };
  settings.window = { ...defaultSettings().window, ...settings.window || {} };
  settings.widget = { ...defaultSettings().widget, ...settings.widget || {} };
  settings.countdown = { ...defaultSettings().countdown, ...settings.countdown || {} };
  if (recoveredDataFromBackup) scheduleFlush();
  if (data.lists.length === 0) {
    data.lists.push({
      id: node_crypto.randomUUID(),
      name: "默认清单",
      color: "#4c8dff",
      order: 0,
      createdAt: Date.now()
    });
    scheduleFlush();
  }
  try {
    writeJsonAtomic(dataBackupFile, data);
  } catch (err) {
    console.error("[store] 初始备份写入失败：", err.message);
  }
  return { dataDir, dataFile, settingsFile, dataBackupFile, preMigrationBackupFile };
}
function migrateTodoTimes() {
  let changed = false;
  for (const todo of data.todos) {
    const startTime = taskStartTime(todo);
    const endTime = taskEndTime(todo);
    if (todo.startTime !== startTime) changed = true;
    if (todo.endTime !== endTime) changed = true;
    if (todo.time !== endTime) changed = true;
    todo.startTime = startTime;
    todo.endTime = endTime;
    todo.time = endTime;
  }
  if (changed) scheduleFlush();
  return changed;
}
function migrateTodoRolloverHistories() {
  let changed = false;
  for (const todo of data.todos) {
    if (normalizeTodoRolloverHistory(todo)) changed = true;
  }
  if (changed) scheduleFlush();
  return changed;
}
function migrateTodoCompletionHistories() {
  let changed = false;
  for (const todo of data.todos) {
    if (normalizeTodoCompletionHistory(todo)) changed = true;
  }
  if (changed) scheduleFlush();
  return changed;
}
function getSettings() {
  return settings;
}
function patchSettings(patch) {
  settings = {
    ...settings,
    ...patch,
    window: { ...settings.window, ...patch.window || {} },
    widget: { ...settings.widget, ...patch.widget || {} },
    countdown: { ...settings.countdown, ...patch.countdown || {} }
  };
  scheduleFlush();
  return settings;
}
const nextOrder = (rows) => rows.length ? Math.max(...rows.map((r) => r.order ?? 0)) + 1 : 0;
function normalizeReminder(todo) {
  if (!taskHasTime(todo)) todo.remindBefore = null;
  return todo;
}
function localYmd$1(now = /* @__PURE__ */ new Date()) {
  const date = now instanceof Date ? now : new Date(now);
  const pad2 = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}
function rollOverUnfinishedTodos(today = localYmd$1()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) return 0;
  const now = Date.now();
  let changed = 0;
  for (const todo of data.todos) {
    if (todo.done || !/^\d{4}-\d{2}-\d{2}$/.test(todo.date || "") || todo.date >= today) continue;
    recordTodoRollover(todo, today, now);
    todo.date = today;
    todo.notifiedKey = null;
    todo.updatedAt = now;
    changed += 1;
  }
  if (changed) scheduleFlush();
  return changed;
}
const toNumber = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};
const toPositiveNumber = (v, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};
const round2 = (n) => Math.round(n * 100) / 100;
function rollGoalPeriod(goal, at = Date.now()) {
  if (!goal || goal.mode !== "accumulate") return false;
  const key = periodKeyOf(goal.period, at);
  if (goal.periodKey === key) return false;
  if (!Array.isArray(goal.periods)) goal.periods = [];
  if (goal.periodKey) {
    goal.periods.push({ key: goal.periodKey, total: round2(goal.periodTotal || 0) });
    if (goal.periods.length > GOAL_PERIOD_KEEP) {
      goal.periods = goal.periods.slice(-GOAL_PERIOD_KEEP);
    }
  }
  goal.periodKey = key;
  goal.periodTotal = 0;
  return true;
}
function migrateGoals() {
  let changed = false;
  for (const goal of data.goals) {
    if (goal.mode === void 0) {
      goal.mode = "target";
      changed = true;
    }
    if (goal.period === void 0) {
      goal.period = "month";
      changed = true;
    }
    if (goal.periodKey === void 0) {
      goal.periodKey = periodKeyOf(goal.period);
      changed = true;
    }
    if (goal.periodTotal === void 0) {
      goal.periodTotal = 0;
      changed = true;
    }
    if (!Array.isArray(goal.periods)) {
      goal.periods = [];
      changed = true;
    }
    if (goal.mode === "ledger" && migrateExpenseCategories(goal, data.expenses).changed) changed = true;
    if (rollGoalPeriod(goal)) changed = true;
  }
  if (changed) scheduleFlush();
  return changed;
}
function accumulate(todo) {
  if (!todo.startedAt) return todo;
  todo.elapsedMs = (todo.elapsedMs || 0) + (Date.now() - todo.startedAt);
  todo.startedAt = null;
  return todo;
}
const repo = {
  /* ---------- 清单 ---------- */
  listLists() {
    return [...data.lists].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  },
  createList(name) {
    const list = {
      id: node_crypto.randomUUID(),
      name: String(name || "新清单").slice(0, 40),
      color: "#4c8dff",
      order: nextOrder(data.lists),
      createdAt: Date.now()
    };
    data.lists.push(list);
    scheduleFlush();
    return list;
  },
  updateList(id, patch) {
    const list = data.lists.find((l) => l.id === id);
    if (!list) return null;
    if (patch.name !== void 0) list.name = String(patch.name).slice(0, 40);
    if (patch.color !== void 0) list.color = patch.color;
    if (patch.order !== void 0) list.order = patch.order;
    scheduleFlush();
    return list;
  },
  removeList(id) {
    if (data.lists.length <= 1) return { ok: false, reason: "至少要保留一个清单" };
    data.lists = data.lists.filter((l) => l.id !== id);
    const fallback = data.lists[0].id;
    for (const t of data.todos) if (t.listId === id) t.listId = fallback;
    scheduleFlush();
    return { ok: true };
  },
  /* ---------- 待办 ---------- */
  listTodos() {
    return [...data.todos].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  },
  createTodo(input = {}) {
    const now = Date.now();
    const startTime = taskStartTime(input);
    const endTime = taskEndTime(input);
    const todo = {
      id: node_crypto.randomUUID(),
      listId: input.listId || data.lists[0]?.id || null,
      title: String(input.title || "").slice(0, 200),
      note: String(input.note || "").slice(0, 2e3),
      date: input.date || null,
      // 'YYYY-MM-DD'
      startTime,
      // 任务开始时间，选填
      endTime,
      // 任务结束/截止时间，选填
      time: endTime,
      // v1 兼容别名，始终与 endTime 同步
      done: false,
      doneAt: null,
      priority: Number(input.priority ?? 0),
      // 0 无 / 1 低 / 2 中 / 3 高
      quadrant: Number(input.quadrant ?? 0),
      // 0 未分类 / 1 重要且紧急 / 2 重要不紧急 / 3 紧急不重要 / 4 都不
      repeat: input.repeat || "none",
      // none | daily | weekly | monthly | yearly
      remindBefore: input.remindBefore ?? null,
      // 提前几分钟提醒；null = 不提醒
      notifiedKey: null,
      startedAt: null,
      // 本轮计时的开始时刻；null = 没在跑
      elapsedMs: 0,
      // 已累计的耗时，支持中途停了再继续
      rolloverHistory: [],
      // 自动顺延历史：原日期保留为“未完成”，当前待办继续移动到新日期
      completionHistory: [],
      // 重复待办完成历史：日期推进前保留本次完成记录
      order: nextOrder(data.todos),
      createdAt: now,
      updatedAt: now
    };
    normalizeReminder(todo);
    data.todos.push(todo);
    scheduleFlush();
    return todo;
  },
  updateTodo(id, patch = {}) {
    const todo = data.todos.find((t) => t.id === id);
    if (!todo) return null;
    const editable = [
      "listId",
      "title",
      "note",
      "date",
      "priority",
      "quadrant",
      "repeat",
      "remindBefore",
      "order",
      "done",
      "doneAt",
      "notifiedKey",
      "startedAt",
      "elapsedMs"
    ];
    for (const key of editable) {
      if (patch[key] !== void 0) todo[key] = patch[key];
    }
    if (patch.startTime !== void 0) todo.startTime = taskStartTime(patch);
    if (patch.endTime !== void 0 || patch.time !== void 0) todo.endTime = taskEndTime(patch);
    todo.time = todo.endTime || null;
    if (patch.date !== void 0 || patch.startTime !== void 0 || patch.endTime !== void 0 || patch.time !== void 0 || patch.remindBefore !== void 0) {
      todo.notifiedKey = null;
    }
    normalizeReminder(todo);
    todo.updatedAt = Date.now();
    scheduleFlush();
    return todo;
  },
  /* ---------- 事件计时 ---------- */
  /** 开始计时。已经在跑就什么都不做，避免重复点丢掉起始时刻。 */
  startTodo(id) {
    const todo = data.todos.find((t) => t.id === id);
    if (!todo || todo.done || todo.startedAt) return todo || null;
    todo.startedAt = Date.now();
    todo.updatedAt = Date.now();
    scheduleFlush();
    return todo;
  },
  /** 停止计时，把这一段累加进 elapsedMs。停了还能再启动，耗时continues累计。 */
  stopTodo(id) {
    const todo = data.todos.find((t) => t.id === id);
    if (!todo) return null;
    accumulate(todo);
    todo.updatedAt = Date.now();
    scheduleFlush();
    return todo;
  },
  /**
   * 勾选完成。重复待办不真正结束，而是把日期推到下一次，
   * 这样一条记录就能长期滚动，不会堆出成百上千条历史。
   */
  toggleTodo(id) {
    const todo = data.todos.find((t) => t.id === id);
    if (!todo) return null;
    if (!todo.done) accumulate(todo);
    if (!todo.done && todo.repeat !== "none" && todo.date) {
      recordTodoCompletion(todo, Date.now());
      todo.date = advanceDate(todo.date, todo.repeat);
      todo.notifiedKey = null;
      todo.elapsedMs = 0;
      todo.updatedAt = Date.now();
      scheduleFlush();
      return todo;
    }
    todo.done = !todo.done;
    todo.doneAt = todo.done ? Date.now() : null;
    if (!todo.done) todo.elapsedMs = 0;
    todo.updatedAt = Date.now();
    scheduleFlush();
    return todo;
  },
  removeTodo(id) {
    const before = data.todos.length;
    data.todos = data.todos.filter((t) => t.id !== id);
    scheduleFlush();
    return { ok: data.todos.length < before };
  },
  clearCompleted(listId) {
    data.todos = data.todos.filter((t) => !(t.done && (!listId || t.listId === listId)));
    scheduleFlush();
    return { ok: true };
  },
  /* ---------- 长期目标 ---------- */
  listGoals() {
    return [...data.goals].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  },
  /** 提醒轮询里调用：跨天/跨月时把累计型主任务翻篇，不用等用户下次记账 */
  rollGoalPeriods() {
    let changed = 0;
    for (const goal of data.goals) if (rollGoalPeriod(goal)) changed += 1;
    if (changed) scheduleFlush();
    return changed;
  },
  createGoal(input = {}) {
    if (!canCreateGoal(data.goals.length)) return null;
    const now = Date.now();
    const mode = normalizeGoalMode(input.mode);
    const period = normalizeGoalPeriod(input.period);
    const goal = {
      id: node_crypto.randomUUID(),
      name: String(input.name || (mode === "ledger" ? "费用台账" : "新目标")).slice(0, 40),
      mode,
      // target = 算百分比；accumulate = 按周期累计；ledger = 费用台账
      // 单位，比如 本 / 篇 / 元。台账记的是钱，默认就给"元"，省一次输入
      unit: String(input.unit || (mode === "ledger" ? "元" : "")).slice(0, 8),
      color: input.color || "#4c8dff",
      history: [],
      // 每次新增留一条流水，方便回看
      // —— 目标模式 ——
      target: toPositiveNumber(input.target, 100),
      current: toNumber(input.current, 0),
      // —— 累计模式 ——
      period,
      // 多久归零一次
      periodKey: periodKeyOf(period, now),
      // 当前落在哪个周期
      periodTotal: Math.max(0, toNumber(input.periodTotal, 0)),
      periods: [],
      // 已结束周期的归档，给迷你趋势图用
      // —— 台账模式 ——
      // 每本台账拥有独立的稳定类别目录。流水只保存类别 id，改名或停用不会改写历史账目。
      ...(mode === "ledger" ? { expenseCategories: defaultExpenseCategories(input.catNames) } : {}),
      order: nextOrder(data.goals),
      createdAt: now,
      updatedAt: now
    };
    data.goals.push(goal);
    scheduleFlush();
    return goal;
  },
  updateGoal(id, patch = {}) {
    const goal = data.goals.find((g) => g.id === id);
    if (!goal) return null;
    const previousMode = goal.mode;
    if (patch.name !== void 0) goal.name = String(patch.name).slice(0, 40);
    if (patch.unit !== void 0) goal.unit = String(patch.unit).slice(0, 8);
    if (patch.color !== void 0) goal.color = patch.color;
    if (patch.target !== void 0) goal.target = toPositiveNumber(patch.target, goal.target);
    if (patch.current !== void 0) goal.current = toNumber(patch.current, goal.current);
    if (patch.order !== void 0) goal.order = patch.order;
    if (patch.mode !== void 0) goal.mode = normalizeGoalMode(patch.mode);
    if (goal.mode === "ledger" && (previousMode !== "ledger" || !Array.isArray(goal.expenseCategories) || goal.expenseCategories.length === 0)) {
      migrateExpenseCategories(goal, data.expenses);
    }
    if (patch.periodTotal !== void 0) {
      goal.periodTotal = Math.max(0, toNumber(patch.periodTotal, goal.periodTotal));
    }
    if (patch.catNames !== void 0 && goal.mode === "ledger" && patch.catNames && typeof patch.catNames === "object") {
      for (const [categoryId, name] of Object.entries(patch.catNames)) {
        renameExpenseCategoryDefinition(goal, categoryId, name);
      }
    }
    if (patch.period !== void 0) {
      const period = normalizeGoalPeriod(patch.period);
      if (period !== goal.period) {
        goal.period = period;
        goal.periodKey = periodKeyOf(period);
        goal.periods = [];
      }
    }
    rollGoalPeriod(goal);
    goal.updatedAt = Date.now();
    scheduleFlush();
    return goal;
  },
  /** 新增一笔进度。delta 可以是负数，用来修正记错的量。 */
  addGoalProgress(id, delta) {
    const goal = data.goals.find((g) => g.id === id);
    if (!goal) return null;
    if (goal.mode === "ledger") return goal;
    const step = toNumber(delta, 0);
    if (!step) return goal;
    rollGoalPeriod(goal);
    const isAccumulate = goal.mode === "accumulate";
    const base = isAccumulate ? goal.periodTotal || 0 : goal.current;
    const next = Math.max(0, round2(base + step));
    const applied = round2(next - base);
    if (!applied) return goal;
    if (isAccumulate) goal.periodTotal = next;
    else goal.current = next;
    goal.history.push({ at: Date.now(), delta: applied });
    if (goal.history.length > 100) goal.history = goal.history.slice(-100);
    goal.updatedAt = Date.now();
    scheduleFlush();
    return goal;
  },
  removeGoal(id) {
    const before = data.goals.length;
    data.goals = data.goals.filter((g) => g.id !== id);
    const expensesBefore = data.expenses.length;
    data.expenses = data.expenses.filter((e) => e.goalId !== id);
    scheduleFlush();
    return {
      ok: data.goals.length < before,
      removedExpenses: expensesBefore - data.expenses.length
    };
  },
  /* ---------- 费用台账 ---------- */
  addExpenseCategory(goalId, input = {}) {
    const goal = data.goals.find((item) => item.id === goalId && item.mode === "ledger");
    const result = createExpenseCategory(goal, input, { idFactory: () => node_crypto.randomUUID() });
    if (result.ok) {
      goal.updatedAt = Date.now();
      scheduleFlush();
    }
    return result;
  },
  renameExpenseCategory(goalId, categoryId, name) {
    const goal = data.goals.find((item) => item.id === goalId && item.mode === "ledger");
    const result = renameExpenseCategoryDefinition(goal, categoryId, name);
    if (result.ok) {
      goal.updatedAt = Date.now();
      scheduleFlush();
    }
    return result;
  },
  archiveExpenseCategory(goalId, categoryId) {
    const goal = data.goals.find((item) => item.id === goalId && item.mode === "ledger");
    const result = archiveExpenseCategoryDefinition(goal, categoryId);
    if (result.ok) {
      goal.updatedAt = Date.now();
      scheduleFlush();
    }
    return result;
  },
  restoreExpenseCategory(goalId, categoryId) {
    const goal = data.goals.find((item) => item.id === goalId && item.mode === "ledger");
    const result = restoreExpenseCategoryDefinition(goal, categoryId);
    if (result.ok) {
      goal.updatedAt = Date.now();
      scheduleFlush();
    }
    return result;
  },
  listExpenses() {
    return [...data.expenses].sort(
      (a, b) => (b.date || "").localeCompare(a.date || "") || (b.at || 0) - (a.at || 0)
    );
  },
  /**
   * 记一笔。金额允许为负——记错了就补一条负数冲掉，比原地改值更符合流水账的习惯，
   * 也留得下痕迹。为 0 的直接拒掉，那是误触。
   */
  addExpense(input = {}) {
    const goal = data.goals.find((g) => g.id === input.goalId && g.mode === "ledger");
    if (!goal) return null;
    const cat = normalizeExpenseCat(goal, input.cat);
    if (!cat) return null;
    const amount = round2(toNumber(input.amount, 0));
    if (!amount) return null;
    const entry = {
      id: node_crypto.randomUUID(),
      goalId: goal.id,
      date: normalizeYmd(input.date) || localYmd$1(),
      cat,
      amount,
      note: String(input.note || "").slice(0, 60),
      at: Date.now()
    };
    data.expenses.push(entry);
    if (data.expenses.length > MAX_EXPENSE_ENTRIES) {
      data.expenses.sort((a, b) => (a.date || "").localeCompare(b.date || "") || a.at - b.at);
      data.expenses = data.expenses.slice(-MAX_EXPENSE_ENTRIES);
    }
    goal.updatedAt = Date.now();
    scheduleFlush();
    return entry;
  },
  updateExpense(id, patch = {}) {
    const entry = data.expenses.find((e) => e.id === id);
    if (!entry) return null;
    if (patch.cat !== void 0) {
      const goal = data.goals.find((item) => item.id === entry.goalId && item.mode === "ledger");
      const cat = normalizeExpenseCat(goal, patch.cat);
      if (cat) entry.cat = cat;
    }
    if (patch.date !== void 0) {
      const date = normalizeYmd(patch.date);
      if (date) entry.date = date;
    }
    if (patch.amount !== void 0) {
      const amount = round2(toNumber(patch.amount, entry.amount));
      if (amount) entry.amount = amount;
    }
    if (patch.note !== void 0) entry.note = String(patch.note).slice(0, 60);
    scheduleFlush();
    return entry;
  },
  removeExpense(id) {
    const before = data.expenses.length;
    data.expenses = data.expenses.filter((e) => e.id !== id);
    scheduleFlush();
    return { ok: data.expenses.length < before };
  },
  /**
   * 清空一本台账某一天的明细，但保留台账本身和其他日期的历史。
   * 小组件“删除今日”只能走这里，不能复用会级联删除整本账的 removeGoal。
   */
  clearLedgerDay(goalId, date) {
    const goal = data.goals.find((g) => g.id === goalId && g.mode === "ledger");
    const day = normalizeYmd(date);
    if (!goal || !day) return { ok: false, removedExpenses: 0 };
    const result = removeExpensesForDay(data.expenses, goal.id, day);
    if (result.removedExpenses > 0) {
      data.expenses = result.entries;
      goal.updatedAt = Date.now();
      scheduleFlush();
    }
    return { ok: true, date: day, removedExpenses: result.removedExpenses };
  },
  /* ---------- 专注办公 ---------- */
  setFocusDuration(minutes) {
    if (data.focusTimer.status !== "idle") return data.focusTimer;
    data.focusTimer = defaultFocusTimer(focusMinutes(minutes));
    scheduleFlush();
    return data.focusTimer;
  },
  startFocus(minutes) {
    if (data.focusTimer.status !== "idle") return data.focusTimer;
    const durationMinutes = focusMinutes(minutes ?? data.focusTimer.durationMinutes);
    const now = Date.now();
    data.focusTimer = {
      durationMinutes,
      status: "running",
      startedAt: now,
      runningSince: now,
      elapsedMs: 0,
      endsAt: now + durationMinutes * 60 * 1e3
    };
    scheduleFlush();
    return data.focusTimer;
  },
  pauseFocus() {
    const timer2 = data.focusTimer;
    if (timer2.status !== "running") return timer2;
    timer2.elapsedMs = focusElapsedAt(timer2);
    timer2.status = "paused";
    timer2.runningSince = null;
    timer2.endsAt = null;
    scheduleFlush();
    return timer2;
  },
  resumeFocus() {
    const timer2 = data.focusTimer;
    if (timer2.status !== "paused") return timer2;
    const durationMs = timer2.durationMinutes * 60 * 1e3;
    const remainingMs = Math.max(0, durationMs - timer2.elapsedMs);
    if (remainingMs <= 0) {
      finishFocusSession({ completed: true });
      return data.focusTimer;
    }
    const now = Date.now();
    timer2.status = "running";
    timer2.runningSince = now;
    timer2.endsAt = now + remainingMs;
    scheduleFlush();
    return timer2;
  },
  finishFocus() {
    const now = Date.now();
    const timer2 = data.focusTimer;
    const completed = timer2.status === "running" && Number(timer2.endsAt || 0) > 0 && now >= timer2.endsAt;
    return finishFocusSession({ completed, now });
  },
  cancelFocus() {
    const durationMinutes = data.focusTimer.durationMinutes;
    data.focusTimer = defaultFocusTimer(durationMinutes);
    scheduleFlush();
    return data.focusTimer;
  },
  completeExpiredFocus(now = Date.now()) {
    const timer2 = data.focusTimer;
    if (timer2.status !== "running" || !timer2.endsAt || now < timer2.endsAt) return null;
    return finishFocusSession({ completed: true, now });
  },
  snapshot() {
    this.completeExpiredFocus();
    this.rollOverUnfinishedTodos();
    return {
      lists: this.listLists(),
      todos: this.listTodos(),
      goals: this.listGoals(),
      expenses: this.listExpenses(),
      focusTimer: { ...data.focusTimer },
      focusSessions: data.focusSessions.map((session) => ({ ...session }))
    };
  },
  /** 提醒调度器用：拿到原始数组好就地改 notifiedKey */
  rawTodos() {
    return data.todos;
  },
  rollOverUnfinishedTodos(today) {
    return rollOverUnfinishedTodos(today);
  },
  markFlushDirty: scheduleFlush
};
function advanceDate(dateStr, repeat) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  switch (repeat) {
    case "daily":
      dt.setDate(dt.getDate() + 1);
      break;
    case "weekly":
      dt.setDate(dt.getDate() + 7);
      break;
    case "monthly": {
      const day = dt.getDate();
      dt.setDate(1);
      dt.setMonth(dt.getMonth() + 1);
      const lastDay = new Date(dt.getFullYear(), dt.getMonth() + 1, 0).getDate();
      dt.setDate(Math.min(day, lastDay));
      break;
    }
    case "yearly":
      dt.setFullYear(dt.getFullYear() + 1);
      break;
    default:
      return dateStr;
  }
  const pad2 = (n) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
}
const STARTUP_ARG = "--startup";
const LOGIN_ITEM_NAME = "TimeMasterV2";
const LEGACY_LOGIN_ITEM_NAMES = [];
function loginItemTarget() {
  if (electron.app.isPackaged) {
    return {
      path: process.execPath,
      args: [STARTUP_ARG]
    };
  }
  return {
    path: process.execPath,
    args: [electron.app.getAppPath(), STARTUP_ARG]
  };
}
function getAutoLaunchStatus() {
  const target = loginItemTarget();
  return electron.app.getLoginItemSettings(target);
}
function setAutoLaunch(enabled) {
  const target = loginItemTarget();
  electron.app.setLoginItemSettings({
    openAtLogin: !!enabled,
    ...enabled ? { enabled: true } : {},
    name: LOGIN_ITEM_NAME,
    ...target
  });
  return getAutoLaunchStatus();
}
function removeLegacyLoginItems() {
  for (const name of LEGACY_LOGIN_ITEM_NAMES) {
    try {
      if (!electron.app.getLoginItemSettings({ name }).openAtLogin) continue;
      electron.app.setLoginItemSettings({ openAtLogin: false, name });
    } catch {
    }
  }
}
function syncAutoLaunch(enabled) {
  removeLegacyLoginItems();
  const current = getAutoLaunchStatus();
  const shouldEnable = !!enabled;
  const needsRepair = shouldEnable ? !current.openAtLogin || !current.executableWillLaunchAtLogin : current.openAtLogin;
  return needsRepair ? setAutoLaunch(shouldEnable) : current;
}
const XML_DECL = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const DAY_MS = 864e5;
function sanitizeXmlText(value) {
  let output = "";
  for (const character of String(value ?? "")) {
    const codePoint = character.codePointAt(0);
    if (
      codePoint === 9 || codePoint === 10 || codePoint === 13 ||
      codePoint >= 32 && codePoint <= 55295 ||
      codePoint >= 57344 && codePoint <= 65533 ||
      codePoint >= 65536 && codePoint <= 1114111
    ) output += character;
  }
  return output;
}
function workbookCategoryKey(value) {
  const raw = String(value ?? "");
  let encoded = "cat-utf16-";
  for (let index = 0; index < raw.length; index++) {
    encoded += raw.charCodeAt(index).toString(16).padStart(4, "0");
  }
  return encoded;
}
const escapeXml = (value) => sanitizeXmlText(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
function columnName(index) {
  let value = index;
  let out = "";
  while (value > 0) {
    value -= 1;
    out = String.fromCharCode(65 + value % 26) + out;
    value = Math.floor(value / 26);
  }
  return out;
}
const cellRef = (row, column) => `${columnName(column)}${row}`;
function textCell(row, column, value, style = 0) {
  const ref = cellRef(row, column);
  return `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
}
function numberCell(row, column, value, style = 0) {
  const ref = cellRef(row, column);
  const number = Number.isFinite(Number(value)) ? Number(value) : 0;
  return `<c r="${ref}" s="${style}"><v>${number}</v></c>`;
}
function formulaNumberCell(row, column, formula, cachedValue, style = 0) {
  const ref = cellRef(row, column);
  const number = Number.isFinite(Number(cachedValue)) ? Number(cachedValue) : 0;
  return `<c r="${ref}" s="${style}"><f>${escapeXml(formula)}</f><v>${number}</v></c>`;
}
function formulaTextCell(row, column, formula, cachedValue, style = 0) {
  const ref = cellRef(row, column);
  return `<c r="${ref}" s="${style}" t="str"><f>${escapeXml(formula)}</f><v>${escapeXml(cachedValue)}</v></c>`;
}
function rowXml(index, cells, height = null) {
  const heightAttrs = height ? ` ht="${height}" customHeight="1"` : "";
  return `<row r="${index}"${heightAttrs}>${cells.join("")}</row>`;
}
function localYmd(date) {
  const pad2 = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}
function excelDateSerialFromYmd(value) {
  const [year, month, day] = String(value).split("-").map(Number);
  if (!year || !month || !day) return null;
  return (Date.UTC(year, month - 1, day) - Date.UTC(1899, 11, 30)) / DAY_MS;
}
function excelDateTimeSerial(timestamp) {
  const date = new Date(Number(timestamp));
  if (Number.isNaN(date.getTime())) return null;
  const localAsUtc = Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
    date.getMilliseconds()
  );
  return (localAsUtc - Date.UTC(1899, 11, 30)) / DAY_MS;
}
const summarizeEntries = (goal, entries) => summarizeExpenseEntries(goal, entries);
function stylesXml() {
  return `${XML_DECL}
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="4">
    <numFmt numFmtId="164" formatCode="yyyy-mm-dd"/>
    <numFmt numFmtId="165" formatCode="yyyy-mm-dd hh:mm:ss"/>
    <numFmt numFmtId="166" formatCode="#,##0.00;[Red](#,##0.00);-"/>
    <numFmt numFmtId="167" formatCode="#,##0"/>
  </numFmts>
  <fonts count="8">
    <font><sz val="11"/><color rgb="FF1F2937"/><name val="Microsoft YaHei"/><family val="2"/></font>
    <font><b/><sz val="18"/><color rgb="FFFFFFFF"/><name val="Microsoft YaHei"/><family val="2"/></font>
    <font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Microsoft YaHei"/><family val="2"/></font>
    <font><b/><sz val="11"/><color rgb="FF1F2937"/><name val="Microsoft YaHei"/><family val="2"/></font>
    <font><b/><sz val="14"/><color rgb="FF1F4E78"/><name val="Microsoft YaHei"/><family val="2"/></font>
    <font><sz val="9"/><color rgb="FF64748B"/><name val="Microsoft YaHei"/><family val="2"/></font>
    <font><b/><sz val="11"/><color rgb="FF2F6B2F"/><name val="Microsoft YaHei"/><family val="2"/></font>
    <font><b/><sz val="11"/><color rgb="FFB42318"/><name val="Microsoft YaHei"/><family val="2"/></font>
  </fonts>
  <fills count="8">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF1F4E78"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFD9EAF7"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFCE4D6"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFE2F0D9"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFDE9E7"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF2F2F2"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="3">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border>
      <left style="thin"><color rgb="FFD9E2F3"/></left>
      <right style="thin"><color rgb="FFD9E2F3"/></right>
      <top style="thin"><color rgb="FFD9E2F3"/></top>
      <bottom style="thin"><color rgb="FFD9E2F3"/></bottom>
      <diagonal/>
    </border>
    <border><left/><right/><top/><bottom style="thin"><color rgb="FFD9E2F3"/></bottom><diagonal/></border>
  </borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="24">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"><alignment vertical="center"/></xf>
    <xf numFmtId="0" fontId="2" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"><alignment vertical="center"/></xf>
    <xf numFmtId="0" fontId="3" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"><alignment vertical="center"/></xf>
    <xf numFmtId="0" fontId="2" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="2" xfId="0" applyBorder="1"><alignment vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="2" xfId="0" applyBorder="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="164" fontId="0" fillId="0" borderId="2" xfId="0" applyNumberFormat="1" applyBorder="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="2" xfId="0" applyBorder="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="166" fontId="0" fillId="0" borderId="2" xfId="0" applyNumberFormat="1" applyBorder="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="2" xfId="0" applyBorder="1"><alignment vertical="center" wrapText="1"/></xf>
    <xf numFmtId="165" fontId="0" fillId="0" borderId="2" xfId="0" applyNumberFormat="1" applyBorder="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="4" borderId="2" xfId="0" applyFill="1" applyBorder="1"><alignment vertical="center"/></xf>
    <xf numFmtId="166" fontId="0" fillId="4" borderId="2" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="0" fontId="3" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="166" fontId="4" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="0" fontId="3" fillId="7" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment vertical="center"/></xf>
    <xf numFmtId="0" fontId="6" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="7" fillId="6" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"><alignment vertical="center"/></xf>
    <xf numFmtId="0" fontId="5" fillId="0" borderId="2" xfId="0" applyFont="1" applyBorder="1"><alignment vertical="center"/></xf>
    <xf numFmtId="167" fontId="0" fillId="0" borderId="2" xfId="0" applyNumberFormat="1" applyBorder="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="167" fontId="4" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1"><alignment horizontal="right" vertical="center"/></xf>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
  <dxfs count="0"/>
  <tableStyles count="0" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16"/>
</styleSheet>`;
}
function summarySheetXml({ goal, entries, scope, selectedDates, exportedAt, appVersion }) {
  const sortedDates = [...new Set(selectedDates || [])].sort();
  const entryDates = entries.map((entry) => entry.date).filter(Boolean).sort();
  const dates = scope === "all" ? entryDates : sortedDates;
  const from = dates[0] || "无记录";
  const to = dates[dates.length - 1] || "无记录";
  const isContinuous = sortedDates.length < 2 || excelDateSerialFromYmd(sortedDates[sortedDates.length - 1]) - excelDateSerialFromYmd(sortedDates[0]) + 1 === sortedDates.length;
  const scopeText = scope === "all" ? "全部历史" : `自定义日期（${sortedDates.length} 天${isContinuous ? "" : "，非连续"}）`;
  const categories = catsOf(goal);
  const totals = summarizeEntries(goal, entries);
  const detailLastRow = Math.max(2, entries.length + 1);
  const sequenceRange = `'费用明细'!$A$2:$A$${detailLastRow}`;
  const groupRange = `'费用明细'!$G$2:$G$${detailLastRow}`;
  const catCodeRange = `'费用明细'!$E$2:$E$${detailLastRow}`;
  const amountRange = `'费用明细'!$H$2:$H$${detailLastRow}`;
  const categoryStartRow = 13;
  const categoryEndRow = Math.max(categoryStartRow, categoryStartRow + categories.length - 1);
  const auditTitleRow = categoryEndRow + 2;
  const auditCountRow = auditTitleRow + 1;
  const auditAmountRow = auditTitleRow + 2;
  const fieldsTitleRow = auditTitleRow + 4;
  const fieldStartRow = fieldsTitleRow + 1;
  const finalRow = fieldStartRow + 2;
  const rows = [];
  rows.push(rowXml(1, [textCell(1, 1, "费用台账对账导出", 1)], 32));
  rows.push(
    rowXml(
      2,
      [textCell(2, 1, "适用于分类核对、金额复算、补录追溯与后续归档", 6)],
      24
    )
  );
  rows.push(rowXml(4, [
    textCell(4, 1, "台账名称", 3),
    textCell(4, 2, goal.name || "费用台账", 4),
    textCell(4, 5, "导出范围", 3),
    textCell(4, 6, scopeText, 4)
  ], 24));
  rows.push(rowXml(5, [
    textCell(5, 1, "开始日期", 3),
    textCell(5, 2, from, 4),
    textCell(5, 5, "结束日期", 3),
    textCell(5, 6, to, 4)
  ], 24));
  rows.push(rowXml(6, [
    textCell(6, 1, "导出时间", 3),
    numberCell(6, 2, excelDateTimeSerial(exportedAt), 20),
    textCell(6, 5, "软件版本", 3),
    textCell(6, 6, appVersion || "", 4)
  ], 24));
  rows.push(rowXml(8, [textCell(8, 1, "总体汇总", 2)], 24));
  rows.push(rowXml(9, [
    textCell(9, 1, "记录笔数", 15),
    formulaNumberCell(9, 2, `COUNTA(${sequenceRange})`, totals.count, 23),
    textCell(9, 3, "期间费用", 15),
    formulaNumberCell(
      9,
      4,
      `SUMIF(${groupRange},"期间费用",${amountRange})`,
      totals.opex,
      16
    ),
    // 标题跟着类别改名走，公式使用稳定的费用口径，避免特殊字符进入公式文本。
    textCell(9, 5, cogsLabel(goal), 15),
    formulaNumberCell(
      9,
      6,
      `SUMIF(${groupRange},"货款单列",${amountRange})`,
      totals.cogs,
      16
    ),
    textCell(9, 7, `合计（${goal.unit || "元"}）`, 15),
    formulaNumberCell(9, 8, `SUM(${amountRange})`, totals.total, 16)
  ], 32));
  rows.push(rowXml(11, [textCell(11, 1, "分类汇总", 2)], 24));
  rows.push(rowXml(12, [
    textCell(12, 1, "稳定类别键", 5),
    textCell(12, 2, "类别名称", 5),
    textCell(12, 3, "费用口径", 5),
    textCell(12, 4, "笔数", 5),
    textCell(12, 5, `金额（${goal.unit || "元"}）`, 5)
  ], 25));
  categories.forEach((cat, index) => {
    const row = categoryStartRow + index;
    const cached = totals.byCat[cat.id] || { count: 0, amount: 0 };
    const bodyStyle = cat.group === "cogs" ? 13 : 6;
    const amountStyle = cat.group === "cogs" ? 14 : 10;
    rows.push(rowXml(row, [
      textCell(row, 1, workbookCategoryKey(cat.id), bodyStyle),
      textCell(row, 2, cat.name, bodyStyle),
      textCell(row, 3, expenseCategoryGroupLabel(cat), bodyStyle),
      formulaNumberCell(row, 4, `SUMPRODUCT(--EXACT(${catCodeRange},A${row}))`, cached.count, 22),
      formulaNumberCell(row, 5, `SUMPRODUCT(--EXACT(${catCodeRange},A${row}),${amountRange})`, cached.amount, amountStyle)
    ], 22));
  });
  const countPass = totals.count === categories.reduce((sum, cat) => sum + totals.byCat[cat.id].count, 0);
  const amountPass = Math.abs(
    totals.total - categories.reduce((sum, cat) => sum + totals.byCat[cat.id].amount, 0)
  ) < 1e-3;
  rows.push(rowXml(auditTitleRow, [textCell(auditTitleRow, 1, "对账检查", 2)], 24));
  rows.push(rowXml(auditCountRow, [
    textCell(auditCountRow, 1, "明细笔数与分类笔数一致", 17),
    formulaTextCell(
      auditCountRow,
      2,
      `IF(B9=SUM(D${categoryStartRow}:D${categoryEndRow}),"PASS","FAIL")`,
      countPass ? "PASS" : "FAIL",
      countPass ? 18 : 19
    )
  ], 23));
  rows.push(rowXml(auditAmountRow, [
    textCell(auditAmountRow, 1, "明细金额与分类金额一致", 17),
    formulaTextCell(
      auditAmountRow,
      2,
      `IF(ABS(H9-SUM(E${categoryStartRow}:E${categoryEndRow}))<0.001,"PASS","FAIL")`,
      amountPass ? "PASS" : "FAIL",
      amountPass ? 18 : 19
    )
  ], 23));
  rows.push(rowXml(fieldsTitleRow, [textCell(fieldsTitleRow, 1, "字段说明", 2)], 24));
  rows.push(rowXml(fieldStartRow, [
    textCell(fieldStartRow, 1, "账务日期决定费用归属；登记时间是实际录入系统的时间，两者不同会标记为“补录”。", 11)
  ], 28));
  rows.push(rowXml(fieldStartRow + 1, [
    textCell(fieldStartRow + 1, 1, "金额列保持 Excel 数值，可直接筛选、求和、透视；负数表示冲减或更正。", 11)
  ], 28));
  rows.push(rowXml(fieldStartRow + 2, [
    textCell(fieldStartRow + 2, 1, "稳定类别键由内部类别 ID 确定；记录 ID 与台账 ID 用于追溯原始数据，建议归档时一并保留。", 11)
  ], 28));
  const merges = [
    "A1:H1",
    "A2:H2",
    "B4:D4",
    "F4:H4",
    "B5:D5",
    "F5:H5",
    "B6:D6",
    "F6:H6",
    "A8:H8",
    "A11:H11",
    `A${auditTitleRow}:H${auditTitleRow}`,
    `B${auditCountRow}:H${auditCountRow}`,
    `B${auditAmountRow}:H${auditAmountRow}`,
    `A${fieldsTitleRow}:H${fieldsTitleRow}`,
    `A${fieldStartRow}:H${fieldStartRow}`,
    `A${fieldStartRow + 1}:H${fieldStartRow + 1}`,
    `A${fieldStartRow + 2}:H${fieldStartRow + 2}`
  ];
  return `${XML_DECL}
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>
  <dimension ref="A1:H${finalRow}"/>
  <sheetViews><sheetView showGridLines="0" workbookViewId="0"><pane ySplit="2" topLeftCell="A3" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
  <sheetFormatPr defaultRowHeight="20"/>
  <cols>
    <col min="1" max="1" width="22" customWidth="1"/>
    <col min="2" max="2" width="18" customWidth="1"/>
    <col min="3" max="3" width="18" customWidth="1"/>
    <col min="4" max="4" width="16" customWidth="1"/>
    <col min="5" max="5" width="18" customWidth="1"/>
    <col min="6" max="6" width="18" customWidth="1"/>
    <col min="7" max="7" width="18" customWidth="1"/>
    <col min="8" max="8" width="18" customWidth="1"/>
  </cols>
  <sheetData>${rows.join("")}</sheetData>
  <mergeCells count="${merges.length}">${merges.map((ref) => `<mergeCell ref="${ref}"/>`).join("")}</mergeCells>
  <pageMargins left="0.35" right="0.35" top="0.5" bottom="0.5" header="0.2" footer="0.2"/>
  <pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0" paperSize="9"/>
</worksheet>`;
}
function detailSheetXml({ goal, entries }) {
  const sorted = [...entries].sort(
    (a, b) => String(a.date || "").localeCompare(String(b.date || "")) || (a.at || 0) - (b.at || 0)
  );
  const rows = [];
  const headers = [
    "序号",
    "台账名称",
    "账务日期",
    "账务月份",
    "稳定类别键",
    "类别名称",
    "费用口径",
    `金额（${goal.unit || "元"}）`,
    "备注",
    "登记时间",
    "登记类型",
    "记录 ID",
    "台账 ID"
  ];
  rows.push(rowXml(1, headers.map((header, index) => textCell(1, index + 1, header, 5)), 28));
  sorted.forEach((entry, index) => {
    const row = index + 2;
    const cat = categoryOf(goal, entry.cat);
    const isGoods = cat?.group === "cogs";
    const registeredDate = entry.at ? new Date(entry.at) : null;
    const registeredDay = registeredDate && !Number.isNaN(registeredDate.getTime()) ? localYmd(registeredDate) : null;
    const registrationType = !registeredDay ? "未知" : registeredDay === entry.date ? "当日登记" : "补录";
    const amountStyle = isGoods ? 14 : 10;
    const accountDate = excelDateSerialFromYmd(entry.date);
    const registeredAt = excelDateTimeSerial(entry.at);
    rows.push(rowXml(row, [
      numberCell(row, 1, index + 1, 22),
      textCell(row, 2, goal.name || "费用台账", 6),
      accountDate === null ? textCell(row, 3, entry.date || "", 6) : numberCell(row, 3, accountDate, 8),
      textCell(row, 4, String(entry.date || "").slice(0, 7), 9),
      textCell(row, 5, workbookCategoryKey(cat?.id ?? entry.cat ?? ""), isGoods ? 13 : 6),
      textCell(row, 6, cat?.name || "未知", isGoods ? 13 : 6),
      textCell(row, 7, expenseCategoryGroupLabel(cat), isGoods ? 13 : 6),
      numberCell(row, 8, entry.amount, amountStyle),
      textCell(row, 9, entry.note || "", 11),
      registeredAt === null ? textCell(row, 10, "", 6) : numberCell(row, 10, registeredAt, 12),
      textCell(row, 11, registrationType, 7),
      textCell(row, 12, entry.id || "", 21),
      textCell(row, 13, entry.goalId || goal.id || "", 21)
    ], entry.note ? 30 : 22));
  });
  const lastRow = Math.max(1, sorted.length + 1);
  return `${XML_DECL}
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>
  <dimension ref="A1:M${lastRow}"/>
  <sheetViews><sheetView showGridLines="0" workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
  <sheetFormatPr defaultRowHeight="20"/>
  <cols>
    <col min="1" max="1" width="8" customWidth="1"/>
    <col min="2" max="2" width="18" customWidth="1"/>
    <col min="3" max="3" width="13" customWidth="1"/>
    <col min="4" max="4" width="12" customWidth="1"/>
    <col min="5" max="5" width="13" customWidth="1"/>
    <col min="6" max="6" width="13" customWidth="1"/>
    <col min="7" max="7" width="14" customWidth="1"/>
    <col min="8" max="8" width="16" customWidth="1"/>
    <col min="9" max="9" width="34" customWidth="1"/>
    <col min="10" max="10" width="22" customWidth="1"/>
    <col min="11" max="11" width="13" customWidth="1"/>
    <col min="12" max="13" width="40" customWidth="1"/>
  </cols>
  <sheetData>${rows.join("")}</sheetData>
  <autoFilter ref="A1:M${lastRow}"/>
  <pageMargins left="0.25" right="0.25" top="0.45" bottom="0.45" header="0.2" footer="0.2"/>
  <pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0" paperSize="9"/>
</worksheet>`;
}
function crcTable() {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index++) {
    let value = index;
    for (let bit = 0; bit < 8; bit++) {
      value = value & 1 ? 3988292384 ^ value >>> 1 : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  return table;
}
const CRC_TABLE = crcTable();
function crc32(buffer) {
  let crc = 4294967295;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 255] ^ crc >>> 8;
  return (crc ^ 4294967295) >>> 0;
}
function dosDateTime(date) {
  const year = Math.max(1980, date.getFullYear());
  const time = date.getHours() << 11 | date.getMinutes() << 5 | Math.floor(date.getSeconds() / 2);
  const day = year - 1980 << 9 | date.getMonth() + 1 << 5 | date.getDate();
  return { time, day };
}
function zipFiles(files, modifiedAt) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  const { time, day } = dosDateTime(modifiedAt);
  for (const file of files) {
    const name = Buffer.from(file.name, "utf8");
    const source = Buffer.isBuffer(file.content) ? file.content : Buffer.from(file.content, "utf8");
    const compressed = node_zlib.deflateRawSync(source, { level: 6 });
    const crc = crc32(source);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(67324752, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(2048, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(day, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(source.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    localParts.push(local, name, compressed);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(33639248, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(2048, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(time, 12);
    central.writeUInt16LE(day, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(source.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, name);
    offset += local.length + name.length + compressed.length;
  }
  const centralBuffer = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(101010256, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralBuffer.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);
  return Buffer.concat([...localParts, centralBuffer, end]);
}
function buildExpenseWorkbook({
  goal,
  entries = [],
  scope = "selection",
  selectedDates = [],
  exportedAt = Date.now(),
  appVersion = ""
}) {
  const workbookGoal = catsOf(goal).length ? goal : {
    ...goal,
    mode: "ledger",
    expenseCategories: defaultExpenseCategories(goal?.catNames)
  };
  const modifiedAt = new Date(exportedAt);
  const timestamp = modifiedAt.toISOString();
  const summaryXml = summarySheetXml({
    goal: workbookGoal,
    entries,
    scope,
    selectedDates,
    exportedAt,
    appVersion
  });
  const detailsXml = detailSheetXml({ goal: workbookGoal, entries });
  const files = [
    {
      name: "[Content_Types].xml",
      content: `${XML_DECL}
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`
    },
    {
      name: "_rels/.rels",
      content: `${XML_DECL}
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`
    },
    {
      name: "docProps/core.xml",
      content: `${XML_DECL}
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:creator>时间大师</dc:creator>
  <cp:lastModifiedBy>时间大师</cp:lastModifiedBy>
  <dc:title>${escapeXml(workbookGoal.name || "费用台账")} 对账导出</dc:title>
  <dc:subject>费用台账明细与汇总</dc:subject>
  <dcterms:created xsi:type="dcterms:W3CDTF">${timestamp}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${timestamp}</dcterms:modified>
</cp:coreProperties>`
    },
    {
      name: "docProps/app.xml",
      content: `${XML_DECL}
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>时间大师</Application>
  <AppVersion>${escapeXml(appVersion || "0.0.0")}</AppVersion>
  <TitlesOfParts><vt:vector size="2" baseType="lpstr"><vt:lpstr>对账汇总</vt:lpstr><vt:lpstr>费用明细</vt:lpstr></vt:vector></TitlesOfParts>
</Properties>`
    },
    {
      name: "xl/workbook.xml",
      content: `${XML_DECL}
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <bookViews><workbookView activeTab="0"/></bookViews>
  <sheets>
    <sheet name="对账汇总" sheetId="1" r:id="rId1"/>
    <sheet name="费用明细" sheetId="2" r:id="rId2"/>
  </sheets>
  <calcPr calcId="191029" calcMode="auto" fullCalcOnLoad="1" forceFullCalc="1"/>
</workbook>`
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      content: `${XML_DECL}
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`
    },
    { name: "xl/styles.xml", content: stylesXml() },
    { name: "xl/worksheets/sheet1.xml", content: summaryXml },
    { name: "xl/worksheets/sheet2.xml", content: detailsXml }
  ];
  return zipFiles(files, modifiedAt);
}
const safeFilePart = (value) => String(value || "").replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_").replace(/[. ]+$/g, "").slice(0, 60) || "费用台账";
const compactDate = (value) => String(value || "").replaceAll("-", "");
async function exportExpenseWorkbook(ownerWindow, snapshot, input = {}) {
  const goalId = typeof input.goalId === "string" ? input.goalId : "";
  const goal = snapshot.goals.find((item) => item.id === goalId && item.mode === "ledger");
  if (!goal) return { ok: false, reason: "找不到要导出的费用台账。" };
  const scope = input.scope === "all" ? "all" : "selection";
  const selectedDates = [
    ...new Set(
      (Array.isArray(input.dates) ? input.dates : []).slice(0, 5e3).map(normalizeYmd).filter(Boolean)
    )
  ].sort();
  if (scope === "selection" && !selectedDates.length) {
    return { ok: false, reason: "请先选择要导出的日期。" };
  }
  const dateSet = new Set(selectedDates);
  const allEntries = snapshot.expenses.filter((entry) => entry.goalId === goal.id);
  const entries = (scope === "all" ? allEntries : allEntries.filter((entry) => dateSet.has(entry.date))).sort(
    (a, b) => String(a.date || "").localeCompare(String(b.date || "")) || (a.at || 0) - (b.at || 0)
  );
  if (!entries.length) {
    return {
      ok: false,
      reason: scope === "all" ? "当前台账没有可导出的历史记录。" : "所选日期没有费用明细。"
    };
  }
  const exportedAt = Date.now();
  const actualDates = entries.map((entry) => entry.date).filter(Boolean).sort();
  const nameRange = scope === "all" ? "全部历史" : `${compactDate(selectedDates[0])}_至_${compactDate(selectedDates[selectedDates.length - 1])}`;
  const fileName = `${safeFilePart(goal.name)}_费用对账_${nameRange}.xlsx`;
  const result = await electron.dialog.showSaveDialog(ownerWindow, {
    title: "导出费用台账 Excel",
    defaultPath: node_path.join(electron.app.getPath("downloads"), fileName),
    filters: [{ name: "Excel 工作簿", extensions: ["xlsx"] }],
    properties: ["createDirectory", "showOverwriteConfirmation"]
  });
  if (result.canceled || !result.filePath) return { ok: false, canceled: true };
  const targetPath = result.filePath.toLowerCase().endsWith(".xlsx") ? result.filePath : `${result.filePath}.xlsx`;
  const workbook = buildExpenseWorkbook({
    goal,
    entries,
    scope,
    selectedDates: scope === "all" ? actualDates : selectedDates,
    exportedAt,
    appVersion: electron.app.getVersion()
  });
  await promises.writeFile(targetPath, workbook);
  return {
    ok: true,
    count: entries.length,
    from: scope === "all" ? actualDates[0] : selectedDates[0],
    to: scope === "all" ? actualDates[actualDates.length - 1] : selectedDates[selectedDates.length - 1],
    fileName: node_path.basename(targetPath),
    filePath: targetPath
  };
}
const ICON_BASE64 = {
  tray16: "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAACj0lEQVR42qWTS2yMYRSGn/P9NzOdmbbTMCghqm6hTdMQkagFYoG4tiIINtJISASJvS0WInEJEgkLIRFxXZIiVi4JFrQqNK2UtKOddsz///MdC0X3zuqczZsnz8kL/zkCoKqVu27EZ78Oy4Y4tP6bPiuBp+K5SilWvuchKijZnGND64auU74zb06x/fmO6rwB2Hk9uvAi725/9sEmH3Wou6PJOE6M+fRETd9TNdkkZu9yYwaeW7fwPUrm3WDb287EeQAXoHuAtnddkW2oVWlpRg63QF0VDDYZsEpVFWxqMGSlzLWPol/7I9UpphXYBsD8EyXLgZKqxqpq9VJHUb98K6mqVVXV7v6ferljdOyOlIOhZk5F5b8EA0UlkwZQur+FrFsovO5TeodD0j5UWmHtAoeu/pi6SUIwRYgCAcAAjBSV6iQ8eBMxq61AbvsoL3ssTdNg8cmI2seG3DFldnuZu++UaTUGN/H7Cy5AyYrEqtRUCBDw8LTPyplK7mjISOjhZwXZ4lK6BdUp8BKQCmD4D0E8tgyXgFphTb3g7QsZKLiQNpQflaEOmAyOBa8CUqlxBKqgIkSxwpgLrAPTXTxPMFbQTqBKwFEmJMCv4J8DADEQBAK9BhCO73ahByYEgpMDd0jAg8gTUhWQTY4jwBcGRyyNUw34Bjmi6AnD0unK6osKroGiQlaoTyvWESaOD8j4MNQt9v57NS/OGI7dE/bctqyZoaxqNMzLKaMeHFqkvBpEO2O0pXJcgCfcZG6wddfFEq0rlM2NEGG41wNLZsCC3G9HVz/DlX5k43Ij9SPx9b9lar6Rr+7qTJ6LPbO+8MP6GISEQEYwCXASkEnD1Bqxy2qJGhLc3l9j2kXkx/+2mV/OxBPd32IzZQAAAABJRU5ErkJggg==",
  tray20: "iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAADwElEQVR42q2UbWiWZRTHf+e67tfn2Ytua8vohRa+lBMjFhgSYYYQKNrELKoP5scQP8z6ECMKiYKSSpIIJFEoRLKgVJSEQIRFrA9RJrPlY9Oab3s23fa83fd1nz7cOkafPXDg4rq4fpzzP38O3OGQ24fDY7ru2FC2s3TFLWk47FQlk2oDPKM00jwTFSariieCiKgKLmz2z7XfbweGX5TvZoHfj+vaz47zza8X8b0kYTqBJFGarPLvDUWMoplCAwpFpVITEIMNFCcxcRPpgmU8d36THDEAh04kH//yN36Q1N3oTWX8rKP/KeGfnRZKKVp2UM7gfMrMroD+Z4CzKW4K8KqumuGNjzQ+AvAARia02ySJlibFvv2s8NKjlp9KytgkfPq6R99yC8DXQwmXb8Cyu6F0MODzn5X3j2BtZ6qZoXtWyBV76hnbG9q3r66qTlWdfnG6qlv3T6tqMnunmujWA1O673RFVTNVdbpqb13ZkWrHniSdrbCeKMwovffenpGyZWXElpUAjplqRjEWQNj7SnRL+gyAJx8QfhyGOMr/egC1FKgrbU2GLwerbD9QY/49ASOXUlb3CG88HfHBDzXOlC0tbT5ZJePapPDJJkvXfAO+EEQKgAFIMiCFoq+UJmC8FDAyJLy7MebktnmsXmwYGTWMPV5keEXIn2c8Jq94jFaFllAghLDAXKAIqiQKHc0CDWHbqx5vrolY8s5NvL5pLtR8/EFHaDIKzxsIhbZWk3dfhDiaA2zcUs4oJCrgYPd6j/dOVBgehKCngG23uLLiRjOy3hwoIlgLxBDHc4BOFYwgQOqA5vzx2z8UHgzAGjCC7TTIBYExYB54BtQARaFpLjBTAYFUwPME6vnE1i61cF3wQoMJDNYXpFXgat6m9fKkCC1zW1aTOyEQSBQoGHYcdby1xueu5UplTPF9xTRD0iIE1xRahcSAb4RC4f9AAAs3asrCDgHPsOuYcOg3x9UBn1P9UKlAJTZoWYlcbrhFrUodpbkArcFcDRNVOoz2H89Y94hl8wsCRcPmPbBqv2PocgaNDKYyImAiEF57DFZ1we5RYXGbaHQL6AFYT0q0BN31azW3+MPUnt1uONinYAwTFeXg73Byi7B6oYITkNzEGwdhQtX1dmIf8vhrdn09/JWuv3iJwzMJVssJNBS/C4JAiELBhIIzUIjBD4UwgssKXW3Qc5/hiXbS/iY2iMjR2QXbfUA3lK+7narZIkRs3SDGB+tDFObGtbFocwzFGBa0ovOaxC1t49zLLWagS/IFe8fjP4aOpNKHLxltAAAAAElFTkSuQmCC",
  tray24: "iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAEZElEQVR42t2VyW/VVRTHP+f+5r4Oj5a2UFoapFQwYQqIC0mrlMRIjMYhGheoLDQuiCGKcUM00ZVjF8SFcSLoxo0DJg4RE4Ro1ChYFIlgQ5NSBTvAg/b19Tfc4+LXKubVP0BvcvO75ya/+znnnvs9B/7rQ640js1o99tf8vzgSNpbjm1hOlaJM0hSiFMlzpQkVRILcSpkFsSBJEEdx5TdBcHh9k52H71DfqkCDKt2P/keB4+M0DE1keKKMp3A2CULmeL7oKJkVrEqULJgFeoccIFUoD6kxuPsqh76vu+TUwBmDtD/SbL30Fk6psfjJPQtwxctY6czRp52ePkeQ3wiIxm12DGF4yn9DzgMvejByRRKQAiSVJKy0D50NN47d647tzhxVm+4PJ6qa8Q7c17Zudnw07mMtnphdSvctk1YudyAKj+fVja2GTqbhJ6bobNVeOuQoi2OZ7JUk4zeKsBkiieicm7ccminQ+8Kh1/Pw0sHE0rTlvcf8WcDFiDjqQ9jvhmC17cHdLV47NiUsqVfYYmI4xu3CpBkyugkXN0m9K4wgNLV6rDst4yljQ7gADo7DbeucRiesHS1uIDlxm5D8zLL6JQQFpQqwEwCVBRfACzjlyyeC7evd9AMvhqMUQuLGoTmADYsNGzodLg4lZGk0NxgaIxgdAa8QOYBZEACdTUwU8lYeGcJlrgwkXvz6H0hu7a63NRf4eSgA+s9OJZAASgJ5TdcFjQIlCEIqAYkFrCKVQg8AwtD8FzMciXrLwAwMFzBJA5siyjebbj4uIEIqIcoEBwXCAQ/mueKUougoEp+zyIwpWSv+kCC3HsBpkJY6mG+TZm0Bv8hQfcpSSAg5IAIovDvCP7SQTb7VQEcgUnoWmMAj8V7psGpIVjn4xQdMKDDFu00SKeAnfXWByeEcD6A1SstIIbNnQKknBsRaPdIMwNGMEWDKQl6XDHFXGSI4AYQ1EDNvBGo5G987gG4wkhltprUGLCCFwjiCY4nmKKgZTAVoE5AwfOFKILaYB5Aaq6oTBZoMnz2Q27u3+HBoKUyI7ie5D81GbILECR5kjMLnse/A3TW2VyDkucBw4Pvpmzf6HLwWYfuZkssihTB1kBtSWmoyxNrRIk8KIRQ52s1QFKgFr4eVDBC01UCl4XXDgjXvpLQ12UYeFiwf0B5SkhGlMkKDJWF61vzsn28DItroc6fR2ipaOyGxkvPqzzxccbYHpfdHyknJg1nxpWeN1OaArhmhbCyGZyCYCNhVVF5Zi3sPQXTBhpD1YaAuAoQ+Rwp4fVJmybPHbDewO8p++4ytIYgLmAc9v+oNAZwSzckCbiqTGWw6zt4Z0JY26LJog7HWx1nX1Q1nOs+1ZUnB/j8kqXNSTKykkJFIZitc6FArYAPGMkVHOX77QtgdTM0dwhbPIbvL7BVJG84/2iZ6z7QlSND2Qszqe1xPImMg4gIrper1PXBL+S1pjaCKID6CG0Iob5WypuKHN5eMI/NHf7/GH8CPIKy/lVI9/0AAAAASUVORK5CYII=",
  tray32: "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",
  app128: "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"
};
const buf = (key) => Buffer.from(ICON_BASE64[key], "base64");
let cachedApp = null;
let cachedTray = null;
function appIcon() {
  if (!cachedApp) cachedApp = electron.nativeImage.createFromBuffer(buf("app128"));
  return cachedApp;
}
function trayIcon() {
  if (cachedTray) return cachedTray;
  const image = electron.nativeImage.createFromBuffer(buf("tray16"), { scaleFactor: 1 });
  image.addRepresentation({ scaleFactor: 1.25, buffer: buf("tray20") });
  image.addRepresentation({ scaleFactor: 1.5, buffer: buf("tray24") });
  image.addRepresentation({ scaleFactor: 2, buffer: buf("tray32") });
  cachedTray = image;
  return cachedTray;
}
const PRELOAD = node_path.join(__dirname, "../preload/index.js");
const isDev = !!process.env.ELECTRON_RENDERER_URL;
let mainWindow = null;
let widgetWindow = null;
let morphOverlayWindow = null;
let morphOverlayReady = null;
let mainMorphImage = null;
const MAIN_MIN_WIDTH = 880;
const MAIN_MIN_HEIGHT = 560;
const MORPH_DURATION = 500;
const MORPH_FRAME_MS = 16;
const MORPH_PADDING = 24;
const MORPH_STEP_TIMEOUT = 1800;
const MORPH_COOLDOWN = 0;
let quitting = false;
let morphing = false;
let morphLockedUntil = 0;
let mainHomeBounds = null;
let widgetHomeBounds = null;
function setQuitting(v) {
  quitting = v;
}
const isAlive = (win) => !!win && !win.isDestroyed();
const widgetOpacity = () => {
  const value = Number(getSettings().widget.opacity);
  return Number.isFinite(value) ? Math.min(1, Math.max(0.2, value)) : 0.92;
};
const lerpBounds = (from, to, progress) => ({
  x: Math.round(from.x + (to.x - from.x) * progress),
  y: Math.round(from.y + (to.y - from.y) * progress),
  width: Math.round(from.width + (to.width - from.width) * progress),
  height: Math.round(from.height + (to.height - from.height) * progress)
});
const easeInOutCubic = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
function withTimeout(promise, ms, label) {
  let timer2 = null;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer2 = setTimeout(() => reject(new Error(`${label}超时`)), ms);
    })
  ]).finally(() => {
    if (timer2) clearTimeout(timer2);
  });
}
const morphUnavailable = () => morphing || Date.now() < morphLockedUntil;
function finishMorph() {
  morphing = false;
  morphLockedUntil = Date.now() + MORPH_COOLDOWN;
}
function animateMorph(update) {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const tick2 = () => {
      const raw = Math.min(1, (Date.now() - startedAt) / MORPH_DURATION);
      update(easeInOutCubic(raw));
      if (raw >= 1) resolve();
      else setTimeout(tick2, MORPH_FRAME_MS);
    };
    tick2();
  });
}
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function unionBounds(a, b) {
  const left = Math.min(a.x, b.x) - MORPH_PADDING;
  const top = Math.min(a.y, b.y) - MORPH_PADDING;
  const right = Math.max(a.x + a.width, b.x + b.width) + MORPH_PADDING;
  const bottom = Math.max(a.y + a.height, b.y + b.height) + MORPH_PADDING;
  return {
    x: left,
    y: top,
    width: Math.max(1, right - left),
    height: Math.max(1, bottom - top)
  };
}
const relativeBounds = (bounds, container) => ({
  x: bounds.x - container.x,
  y: bounds.y - container.y,
  width: bounds.width,
  height: bounds.height
});
function snapshotTransitionHtml() {
  return `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <style>
      * { box-sizing: border-box; }
      html, body {
        width: 100%;
        height: 100%;
        margin: 0;
        overflow: hidden;
        background: transparent;
        user-select: none;
      }
      .shell {
        position: absolute;
        left: 0;
        top: 0;
        width: 1px;
        height: 1px;
        overflow: hidden;
        border-radius: 0;
        contain: strict;
        transform: translate3d(0, 0, 0) scale3d(1, 1, 1);
        transform-origin: top left;
        backface-visibility: hidden;
        will-change: transform, border-radius;
      }
      .layer {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: fill;
        backface-visibility: hidden;
        transform: translateZ(0);
        will-change: opacity;
        pointer-events: none;
        user-select: none;
      }
    </style>
  </head>
  <body>
    <div class="shell">
      <img class="layer source" alt="" draggable="false" />
      <img class="layer target" alt="" draggable="false" />
    </div>
    <script>
      const shell = document.querySelector('.shell')
      const source = document.querySelector('.source')
      const target = document.querySelector('.target')
      let nextState = null

      window.prepareMorph = async (config) => {
        const scaleX = Math.max(0.01, config.to.width / config.from.width)
        const scaleY = Math.max(0.01, config.to.height / config.from.height)
        const shrinking = scaleX < 1 || scaleY < 1

        shell.style.transition = 'none'
        source.style.transition = 'none'
        target.style.transition = 'none'
        shell.style.left = config.from.x + 'px'
        shell.style.top = config.from.y + 'px'
        shell.style.width = config.from.width + 'px'
        shell.style.height = config.from.height + 'px'
        shell.style.transform = 'translate3d(0, 0, 0) scale3d(1, 1, 1)'
        shell.style.borderRadius = config.fromRadius + 'px'
        source.style.opacity = String(config.fromOpacity)
        target.style.opacity = '0'
        source.src = config.fromImage
        target.src = config.toImage

        await Promise.all([
          source.decode().catch(() => undefined),
          target.decode().catch(() => undefined)
        ])

        const sourceDuration = shrinking ? 150 : 250
        const sourceDelay = shrinking ? 300 : 70
        const targetDuration = shrinking ? 170 : 290
        const targetDelay = shrinking ? 325 : 105
        shell.style.transition =
          'transform ' + config.duration + 'ms cubic-bezier(.4, 0, .2, 1), ' +
          'border-radius ' + config.duration + 'ms cubic-bezier(.4, 0, .2, 1)'
        source.style.transition =
          'opacity ' + sourceDuration + 'ms ease-in-out ' + sourceDelay + 'ms'
        target.style.transition =
          'opacity ' + targetDuration + 'ms ease-in-out ' + targetDelay + 'ms'

        nextState = {
          transform:
            'translate3d(' + (config.to.x - config.from.x) + 'px, ' +
            (config.to.y - config.from.y) + 'px, 0) scale3d(' +
            scaleX + ', ' + scaleY + ', 1)',
          borderRadius:
            (config.toRadius / scaleX) + 'px / ' +
            (config.toRadius / scaleY) + 'px',
          toOpacity: config.toOpacity,
          duration: config.duration
        }
        void shell.offsetWidth
        return true
      }

      window.runMorph = () => new Promise((resolve) => {
        if (!nextState) {
          resolve(false)
          return
        }

        let timeout = null
        const finish = () => {
          shell.removeEventListener('transitionend', onTransitionEnd)
          if (timeout) clearTimeout(timeout)
          resolve(true)
        }
        const onTransitionEnd = (event) => {
          if (event.propertyName === 'transform') finish()
        }

        shell.addEventListener('transitionend', onTransitionEnd)
        timeout = setTimeout(finish, nextState.duration + 120)
        requestAnimationFrame(() => requestAnimationFrame(() => {
          shell.style.transform = nextState.transform
          shell.style.borderRadius = nextState.borderRadius
          source.style.opacity = '0'
          target.style.opacity = String(nextState.toOpacity)
        }))
      })
    <\/script>
  </body>
</html>`;
}
async function ensureMorphOverlay(bounds) {
  if (!isAlive(morphOverlayWindow)) {
    morphOverlayWindow = new electron.BrowserWindow({
      ...bounds,
      show: false,
      frame: false,
      transparent: true,
      backgroundColor: "#00000000",
      resizable: false,
      movable: false,
      focusable: false,
      skipTaskbar: true,
      hasShadow: false,
      alwaysOnTop: true,
      webPreferences: {
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
        backgroundThrottling: false
      }
    });
    const overlay2 = morphOverlayWindow;
    overlay2.setIgnoreMouseEvents(true);
    overlay2.setAlwaysOnTop(true, "screen-saver");
    overlay2.on("closed", () => {
      if (morphOverlayWindow === overlay2) {
        morphOverlayWindow = null;
        morphOverlayReady = null;
      }
    });
    morphOverlayReady = withTimeout(
      overlay2.loadURL(
        `data:text/html;charset=UTF-8,${encodeURIComponent(snapshotTransitionHtml())}`
      ),
      MORPH_STEP_TIMEOUT,
      "动画覆盖层预热"
    ).then(() => overlay2).catch((error) => {
      if (isAlive(overlay2)) overlay2.destroy();
      throw error;
    });
  }
  const overlay = await morphOverlayReady;
  if (!isAlive(overlay)) throw new Error("动画覆盖层已失效");
  overlay.setBounds(bounds);
  return overlay;
}
async function snapshotMorph({
  fromWindow,
  toWindow,
  fromBounds,
  toBounds,
  fromOpacity = 1,
  toOpacity = 1,
  fromRadius = 12,
  toRadius = 12,
  fromImageOverride = null,
  toImageOverride = null,
  onImages = null
}) {
  if (!isAlive(fromWindow) || !isAlive(toWindow)) throw new Error("动画窗口已失效");
  const captureImage = async (win, override) => {
    if (override) return override;
    const shot = await win.webContents.capturePage(void 0, { stayHidden: true });
    if (shot.isEmpty()) throw new Error("无法截取窗口画面");
    return shot.toDataURL();
  };
  const [fromImage, toImage] = await withTimeout(
    Promise.all([
      captureImage(fromWindow, fromImageOverride),
      captureImage(toWindow, toImageOverride)
    ]),
    MORPH_STEP_TIMEOUT,
    "窗口截图"
  );
  onImages?.({ fromImage, toImage });
  const overlayBounds = unionBounds(fromBounds, toBounds);
  const from = relativeBounds(fromBounds, overlayBounds);
  const to = relativeBounds(toBounds, overlayBounds);
  const config = {
    fromImage,
    toImage,
    from,
    to,
    fromOpacity,
    toOpacity,
    fromRadius,
    toRadius,
    duration: MORPH_DURATION
  };
  let overlay = null;
  let completed = false;
  try {
    overlay = await ensureMorphOverlay(overlayBounds);
    overlay.setIgnoreMouseEvents(true);
    overlay.setAlwaysOnTop(true, "screen-saver");
    await withTimeout(
      overlay.webContents.executeJavaScript(
        `window.prepareMorph(${JSON.stringify(config)})`
      ),
      MORPH_STEP_TIMEOUT,
      "动画覆盖层加载"
    );
    if (!isAlive(overlay)) throw new Error("动画覆盖层加载失败");
    overlay.showInactive();
    overlay.moveTop();
    fromWindow.hide();
    toWindow.setBounds(toBounds);
    toWindow.setOpacity(0);
    toWindow.showInactive();
    overlay.moveTop();
    await delay(MORPH_FRAME_MS * 2);
    await withTimeout(
      overlay.webContents.executeJavaScript("window.runMorph()"),
      MORPH_STEP_TIMEOUT,
      "动画启动"
    );
    if (!isAlive(toWindow)) throw new Error("目标窗口已失效");
    toWindow.setOpacity(toOpacity);
    toWindow.focus();
    overlay.moveTop();
    await delay(MORPH_FRAME_MS * 2);
    completed = true;
    return true;
  } finally {
    if (isAlive(overlay)) {
      overlay.hide();
      if (!completed) overlay.destroy();
    }
  }
}
function waitForRenderer(win) {
  if (!isAlive(win) || !win.webContents.isLoadingMainFrame()) return Promise.resolve();
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve();
    };
    const timeout = setTimeout(finish, 4e3);
    win.webContents.once("did-finish-load", finish);
  });
}
function loadPage(win, page) {
  if (isDev) {
    win.loadURL(`${process.env.ELECTRON_RENDERER_URL}/${page}`);
  } else {
    win.loadFile(node_path.join(__dirname, "../renderer", page));
  }
}
function isAllowedAppNavigation(rawUrl) {
  try {
    const target = new URL(rawUrl);
    if (isDev) {
      const devServer = new URL(process.env.ELECTRON_RENDERER_URL);
      return target.origin === devServer.origin;
    }
    if (target.protocol !== "file:") return false;
    const rendererDir = node_path.resolve(__dirname, "../renderer");
    const targetPath = node_path.resolve(node_url.fileURLToPath(target));
    return targetPath === rendererDir || targetPath.startsWith(`${rendererDir}${node_path.sep}`);
  } catch {
    return false;
  }
}
function protectAppWindow(win) {
  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  win.webContents.on("will-navigate", (event, url) => {
    if (!isAllowedAppNavigation(url)) event.preventDefault();
  });
}
function clampToScreen(x, y, w, h) {
  if (x === null || y === null || x === void 0 || y === void 0) return null;
  const area = electron.screen.getDisplayMatching({ x, y, width: w, height: h }).workArea;
  const nx = Math.min(Math.max(x, area.x), area.x + area.width - Math.min(w, area.width));
  const ny = Math.min(Math.max(y, area.y), area.y + area.height - Math.min(h, area.height));
  return { x: Math.round(nx), y: Math.round(ny) };
}
function createMainWindow() {
  if (isAlive(mainWindow)) return mainWindow;
  const s = getSettings();
  const width = s.window.width || 1040;
  const height = s.window.height || 700;
  const pos = clampToScreen(s.window.x, s.window.y, width, height);
  mainWindow = new electron.BrowserWindow({
    width,
    height,
    minWidth: MAIN_MIN_WIDTH,
    minHeight: MAIN_MIN_HEIGHT,
    ...pos || {},
    show: false,
    skipTaskbar: true,
    frame: false,
    backgroundColor: s.theme === "light" ? "#f5f6f8" : "#0e1015",
    icon: appIcon(),
    webPreferences: {
      preload: PRELOAD,
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      spellcheck: false,
      // 主界面隐藏后仍需随时参与窗口变形。关闭后台降频，
      // 避免第二次打开时 capturePage 等待 Chromium 重新唤醒。
      backgroundThrottling: false
    }
  });
  protectAppWindow(mainWindow);
  mainMorphImage = null;
  mainHomeBounds = mainWindow.getBounds();
  const persistBounds = () => {
    if (!isAlive(mainWindow) || mainWindow.isMinimized() || morphing) return;
    const b = mainWindow.getNormalBounds();
    mainHomeBounds = { ...b };
    patchSettings({ window: { width: b.width, height: b.height, x: b.x, y: b.y } });
  };
  mainWindow.on("resized", persistBounds);
  mainWindow.on("moved", persistBounds);
  mainWindow.on("close", (e) => {
    if (quitting) return;
    e.preventDefault();
    void returnToWidget();
  });
  mainWindow.on("minimize", (e) => {
    if (quitting) return;
    e.preventDefault();
    void returnToWidget();
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
    mainMorphImage = null;
  });
  loadPage(mainWindow, "index.html");
  return mainWindow;
}
function createWidgetWindow({ show = true } = {}) {
  if (isAlive(widgetWindow)) {
    if (show && !morphing) widgetWindow.show();
    return widgetWindow;
  }
  const s = getSettings();
  const W = Math.max(320, Number(s.widget.width) || 396);
  const H = Math.max(360, Number(s.widget.height) || 604);
  let pos = clampToScreen(s.widget.x, s.widget.y, W, H);
  if (!pos) {
    const area = electron.screen.getPrimaryDisplay().workArea;
    pos = { x: area.x + area.width - W * 2 - 48, y: area.y + 24 };
  }
  widgetWindow = new electron.BrowserWindow({
    width: W,
    height: H,
    ...pos,
    show: false,
    frame: false,
    transparent: true,
    // 四象限比原来的列表需要更多地方，让用户自己拉到合适大小
    resizable: true,
    minWidth: 320,
    minHeight: 360,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    hasShadow: false,
    alwaysOnTop: !!s.widget.alwaysOnTop,
    icon: appIcon(),
    webPreferences: {
      preload: PRELOAD,
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      spellcheck: false,
      // 小组件长期不在前台，Chromium 默认会把后台窗口的渲染和定时器降频，
      // 表现就是时钟不走、别处改了待办这边半天不刷新。常驻面板必须关掉。
      backgroundThrottling: false
    }
  });
  protectAppWindow(widgetWindow);
  widgetWindow.setOpacity(Number(s.widget.opacity) || 0.92);
  widgetHomeBounds = widgetWindow.getBounds();
  widgetWindow.on("ready-to-show", () => {
    if (show && !morphing) widgetWindow.show();
  });
  const persistWidgetBounds = () => {
    if (!isAlive(widgetWindow) || morphing) return;
    const b = widgetWindow.getBounds();
    widgetHomeBounds = { ...b };
    patchSettings({ widget: { x: b.x, y: b.y, width: b.width, height: b.height } });
  };
  widgetWindow.on("moved", persistWidgetBounds);
  widgetWindow.on("resized", persistWidgetBounds);
  widgetWindow.on("closed", () => {
    widgetWindow = null;
  });
  loadPage(widgetWindow, "widget.html");
  void ensureMorphOverlay(widgetWindow.getBounds()).catch((error) => {
    console.warn("[window-morph] 动画层预热失败，将在首次切换时重试：", error.message);
  });
  return widgetWindow;
}
function destroyWidgetWindow() {
  if (isAlive(widgetWindow)) widgetWindow.destroy();
  widgetWindow = null;
}
function applyWidgetSettings() {
  if (!isAlive(widgetWindow)) return;
  const w = getSettings().widget;
  widgetWindow.setAlwaysOnTop(!!w.alwaysOnTop);
  if (!morphing) widgetWindow.setOpacity(widgetOpacity());
  widgetWindow.setIgnoreMouseEvents(false);
}
function ensureWidgetEnabled() {
  if (getSettings().widget.enabled) return;
  const next = patchSettings({ widget: { enabled: true } });
  broadcast("settings:changed", next);
}
async function revealWidget() {
  if (morphUnavailable()) return false;
  if (isAlive(mainWindow) && mainWindow.isVisible()) return returnToWidget();
  ensureWidgetEnabled();
  const widget = createWidgetWindow({ show: false });
  await waitForRenderer(widget);
  if (!isAlive(widget)) return false;
  widget.setOpacity(widgetOpacity());
  widget.setIgnoreMouseEvents(false);
  widget.show();
  widget.focus();
  return true;
}
async function openMainFromWidget(target = null) {
  if (morphUnavailable() || !isAlive(widgetWindow) || !widgetWindow.isVisible() || isAlive(mainWindow) && mainWindow.isVisible()) {
    return false;
  }
  morphing = true;
  const widget = widgetWindow;
  const main = createMainWindow();
  try {
    await waitForRenderer(main);
    if (!isAlive(widget) || !isAlive(main)) return false;
    if (target) {
      mainMorphImage = null;
      main.webContents.send("app:navigate", target);
    }
    const from = widget.getBounds();
    const to = { ...mainHomeBounds || main.getNormalBounds() };
    const opacity = widgetOpacity();
    widgetHomeBounds = { ...from };
    main.setIgnoreMouseEvents(true);
    widget.setIgnoreMouseEvents(true);
    widget.setAlwaysOnTop(false);
    main.setBounds(to);
    main.setOpacity(1);
    await delay(34);
    let usedSnapshot = false;
    try {
      usedSnapshot = await snapshotMorph({
        fromWindow: widget,
        toWindow: main,
        fromBounds: from,
        toBounds: to,
        fromOpacity: opacity,
        toOpacity: 1,
        fromRadius: 16,
        toRadius: 10,
        toImageOverride: mainMorphImage,
        onImages: ({ toImage }) => {
          mainMorphImage = toImage;
        }
      });
    } catch (error) {
      console.warn("[window-morph] 截图动画失败，切换为原生降级动画：", error.message);
    }
    if (!usedSnapshot) {
      if (!isAlive(widget) || !isAlive(main)) return false;
      const mainStart = { ...from };
      widget.setBounds(from);
      widget.setOpacity(opacity);
      widget.showInactive();
      main.hide();
      main.setMinimumSize(320, 360);
      main.setBounds(mainStart);
      main.setOpacity(0);
      main.setAlwaysOnTop(true, "floating");
      main.showInactive();
      main.moveTop();
      await animateMorph((progress) => {
        if (!isAlive(widget) || !isAlive(main)) return;
        main.setBounds(lerpBounds(mainStart, to, progress));
        main.setOpacity(Math.min(1, progress * 1.1));
        widget.setOpacity(opacity * Math.max(0, 1 - progress * 1.18));
      });
    }
    if (!isAlive(widget) || !isAlive(main)) return false;
    widget.hide();
    widget.setBounds(from);
    widget.setOpacity(opacity);
    widget.setAlwaysOnTop(!!getSettings().widget.alwaysOnTop);
    if (!usedSnapshot) {
      main.setBounds(to);
      main.setOpacity(1);
      main.setMinimumSize(MAIN_MIN_WIDTH, MAIN_MIN_HEIGHT);
      main.setAlwaysOnTop(false);
      main.show();
      main.focus();
    }
    return true;
  } finally {
    finishMorph();
    if (isAlive(widget)) widget.setIgnoreMouseEvents(false);
    if (isAlive(main)) main.setIgnoreMouseEvents(false);
  }
}
async function returnToWidget() {
  if (morphUnavailable()) return false;
  if (!isAlive(mainWindow) || !mainWindow.isVisible()) return revealWidget();
  morphing = true;
  const main = mainWindow;
  ensureWidgetEnabled();
  const widget = createWidgetWindow({ show: false });
  try {
    await waitForRenderer(widget);
    if (!isAlive(widget) || !isAlive(main)) return false;
    const opacity = widgetOpacity();
    const from = main.getBounds();
    mainHomeBounds = { ...main.getNormalBounds() };
    const to = { ...widgetHomeBounds || widget.getBounds() };
    const widgetAlwaysOnTop = !!getSettings().widget.alwaysOnTop;
    main.setIgnoreMouseEvents(true);
    widget.setIgnoreMouseEvents(true);
    widget.setAlwaysOnTop(widgetAlwaysOnTop);
    widget.setBounds(to);
    widget.setOpacity(opacity);
    await delay(34);
    let usedSnapshot = false;
    try {
      usedSnapshot = await snapshotMorph({
        fromWindow: main,
        toWindow: widget,
        fromBounds: from,
        toBounds: to,
        fromOpacity: 1,
        toOpacity: opacity,
        fromRadius: 10,
        toRadius: 16,
        onImages: ({ fromImage }) => {
          mainMorphImage = fromImage;
        }
      });
    } catch (error) {
      console.warn("[window-morph] 截图动画失败，切换为原生降级动画：", error.message);
    }
    if (!usedSnapshot) {
      if (!isAlive(widget) || !isAlive(main)) return false;
      const mainEnd = { ...to };
      if (main.isMaximized()) main.unmaximize();
      main.setMinimumSize(320, 360);
      main.setBounds(from);
      main.setOpacity(1);
      main.setAlwaysOnTop(true, "floating");
      main.showInactive();
      widget.hide();
      widget.setBounds(to);
      widget.setOpacity(0);
      widget.showInactive();
      await animateMorph((progress) => {
        if (!isAlive(widget) || !isAlive(main)) return;
        main.setBounds(lerpBounds(from, mainEnd, progress));
        const fadeProgress = Math.max(0, (progress - 0.68) / 0.32);
        main.setOpacity(1 - fadeProgress);
        widget.setOpacity(opacity * fadeProgress);
      });
    }
    if (!isAlive(widget) || !isAlive(main)) return false;
    main.hide();
    if (main.isMaximized()) main.unmaximize();
    main.setOpacity(1);
    main.setBounds(mainHomeBounds);
    main.setMinimumSize(MAIN_MIN_WIDTH, MAIN_MIN_HEIGHT);
    main.setAlwaysOnTop(false);
    if (!usedSnapshot) {
      widget.setBounds(to);
      widget.setOpacity(opacity);
      widget.setAlwaysOnTop(widgetAlwaysOnTop);
      if (!widget.isVisible()) widget.show();
      widget.focus();
    }
    return true;
  } finally {
    finishMorph();
    if (isAlive(main)) main.setIgnoreMouseEvents(false);
    if (isAlive(widget)) widget.setIgnoreMouseEvents(false);
  }
}
const getMainWindow = () => mainWindow;
const getWidgetWindow = () => widgetWindow;
function broadcast(channel, payload) {
  if (channel === "data:changed" || channel === "settings:changed") {
    mainMorphImage = null;
  }
  for (const win of electron.BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send(channel, payload);
  }
}
function pushSnapshot() {
  broadcast("data:changed", repo.snapshot());
}
function pushSettings() {
  broadcast("settings:changed", getSettings());
}
function registerIpc() {
  const handleTrusted = (channel, listener) => {
    electron.ipcMain.handle(channel, (event, ...args) => {
      if (!windowOf(event)) throw new Error(`Rejected IPC from an untrusted sender: ${channel}`);
      return listener(event, ...args);
    });
  };
  handleTrusted("data:snapshot", () => repo.snapshot());
  handleTrusted("settings:get", () => getSettings());
  handleTrusted("list:create", (_e, name) => {
    const r = repo.createList(name);
    pushSnapshot();
    return r;
  });
  handleTrusted("list:update", (_e, id, patch) => {
    const r = repo.updateList(id, patch);
    pushSnapshot();
    return r;
  });
  handleTrusted("list:remove", (_e, id) => {
    const r = repo.removeList(id);
    pushSnapshot();
    return r;
  });
  handleTrusted("todo:create", (_e, input) => {
    const r = repo.createTodo(input);
    pushSnapshot();
    return r;
  });
  handleTrusted("todo:update", (_e, id, patch) => {
    const r = repo.updateTodo(id, patch);
    pushSnapshot();
    return r;
  });
  handleTrusted("todo:toggle", (_e, id) => {
    const r = repo.toggleTodo(id);
    pushSnapshot();
    return r;
  });
  handleTrusted("todo:start", (_e, id) => {
    const r = repo.startTodo(id);
    pushSnapshot();
    return r;
  });
  handleTrusted("todo:stop", (_e, id) => {
    const r = repo.stopTodo(id);
    pushSnapshot();
    return r;
  });
  handleTrusted("todo:remove", (_e, id) => {
    const r = repo.removeTodo(id);
    pushSnapshot();
    return r;
  });
  handleTrusted("todo:clearCompleted", (_e, listId) => {
    const r = repo.clearCompleted(listId);
    pushSnapshot();
    return r;
  });
  handleTrusted("goal:create", (_e, input) => {
    const r = repo.createGoal(input);
    pushSnapshot();
    return r;
  });
  handleTrusted("goal:update", (_e, id, patch) => {
    const r = repo.updateGoal(id, patch);
    pushSnapshot();
    return r;
  });
  handleTrusted("goal:addProgress", (_e, id, delta) => {
    const r = repo.addGoalProgress(id, delta);
    pushSnapshot();
    return r;
  });
  handleTrusted("goal:remove", (_e, id) => {
    const r = repo.removeGoal(id);
    pushSnapshot();
    return r;
  });
  handleTrusted("expense:add", (_e, input) => {
    const r = repo.addExpense(input);
    pushSnapshot();
    return r;
  });
  handleTrusted("expense:update", (_e, id, patch) => {
    const r = repo.updateExpense(id, patch);
    pushSnapshot();
    return r;
  });
  handleTrusted("expense:remove", (_e, id) => {
    const r = repo.removeExpense(id);
    pushSnapshot();
    return r;
  });
  handleTrusted("expense:clearDay", (_e, goalId, date) => {
    const r = repo.clearLedgerDay(goalId, date);
    if (r.ok) pushSnapshot();
    return r;
  });
  handleTrusted("expenseCategory:add", (_e, goalId, input) => {
    const r = repo.addExpenseCategory(goalId, input);
    if (r.ok) pushSnapshot();
    return r;
  });
  handleTrusted("expenseCategory:rename", (_e, goalId, categoryId, name) => {
    const r = repo.renameExpenseCategory(goalId, categoryId, name);
    if (r.ok) pushSnapshot();
    return r;
  });
  handleTrusted("expenseCategory:archive", (_e, goalId, categoryId) => {
    const r = repo.archiveExpenseCategory(goalId, categoryId);
    if (r.ok) pushSnapshot();
    return r;
  });
  handleTrusted("expenseCategory:restore", (_e, goalId, categoryId) => {
    const r = repo.restoreExpenseCategory(goalId, categoryId);
    if (r.ok) pushSnapshot();
    return r;
  });
  handleTrusted("expense:exportExcel", async (e, input) => {
    const win = windowOf(e);
    if (!win || win !== getMainWindow()) return { ok: false, reason: "只能从费用后台导出。" };
    try {
      return await exportExpenseWorkbook(win, repo.snapshot(), input);
    } catch (error) {
      console.error("[expense-export]", error);
      return { ok: false, reason: `导出失败：${error.message || "未知错误"}` };
    }
  });
  handleTrusted("focus:setDuration", (_e, minutes) => {
    const r = repo.setFocusDuration(minutes);
    pushSnapshot();
    return r;
  });
  handleTrusted("focus:start", (_e, minutes) => {
    const r = repo.startFocus(minutes);
    pushSnapshot();
    return r;
  });
  handleTrusted("focus:pause", () => {
    const r = repo.pauseFocus();
    pushSnapshot();
    return r;
  });
  handleTrusted("focus:resume", () => {
    const r = repo.resumeFocus();
    pushSnapshot();
    return r;
  });
  handleTrusted("focus:finish", () => {
    const r = repo.finishFocus();
    pushSnapshot();
    return r;
  });
  handleTrusted("focus:cancel", () => {
    const r = repo.cancelFocus();
    pushSnapshot();
    return r;
  });
  handleTrusted("settings:patch", (_e, patch) => {
    const before = getSettings();
    const wasEnabled = before.widget.enabled;
    const wasAutoLaunch = before.autoLaunch;
    const next = patchSettings(patch || {});
    if (patch?.theme) electron.nativeTheme.themeSource = next.theme === "light" ? "light" : "dark";
    if (patch?.widget) {
      if (next.widget.enabled && !wasEnabled) createWidgetWindow();
      else if (!next.widget.enabled && wasEnabled) destroyWidgetWindow();
      else applyWidgetSettings();
    }
    if (patch?.autoLaunch !== void 0 && patch.autoLaunch !== wasAutoLaunch) {
      setAutoLaunch(next.autoLaunch);
    }
    pushSettings();
    return next;
  });
  handleTrusted("win:minimize", (e) => {
    const win = windowOf(e);
    if (win === getMainWindow()) return returnToWidget();
    win?.minimize();
  });
  handleTrusted("win:toggleMaximize", (e) => {
    const win = windowOf(e);
    if (!win) return;
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
  });
  handleTrusted("win:close", (e) => {
    const win = windowOf(e);
    if (win === getMainWindow()) return returnToWidget();
    win?.close();
  });
  handleTrusted("win:isMaximized", (e) => !!windowOf(e)?.isMaximized());
  handleTrusted("widget:hide", () => {
    patchSettings({ widget: { enabled: false } });
    destroyWidgetWindow();
    pushSettings();
  });
  handleTrusted("widget:openMain", (e, target) => {
    const widget = getWidgetWindow();
    if (!widget || widget.isDestroyed() || widget.webContents.id !== e.sender.id) return false;
    const navigation = target?.view === "expense" ? {
      view: "expense",
      date: /^\d{4}-\d{2}-\d{2}$/.test(String(target.date || "")) ? target.date : null,
      goalId: typeof target.goalId === "string" ? target.goalId.slice(0, 100) : null
    } : null;
    return openMainFromWidget(navigation);
  });
  handleTrusted("app:info", () => ({
    version: electron.app.getVersion(),
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
    dataDir: electron.app.getPath("userData")
  }));
  handleTrusted("app:openDataDir", () => electron.shell.openPath(electron.app.getPath("userData")));
  handleTrusted("app:flush", () => flushNow());
}
function windowOf(event) {
  const wc = event.sender;
  const all = [getMainWindow(), getWidgetWindow()].filter(Boolean);
  return all.find((w) => !w.isDestroyed() && w.webContents.id === wc.id) || null;
}
const TICK_MS = 20 * 1e3;
const FOCUS_TICK_MS = 1e3;
const GRACE_MS = 10 * 60 * 1e3;
let timer = null;
let focusTimer = null;
let onFired = null;
function parseDueAt(todo) {
  if (!todo.date) return null;
  const [y, m, d] = todo.date.split("-").map(Number);
  if (!y || !m || !d) return null;
  const remindAt = taskReminderTime(todo);
  if (!remindAt) return null;
  const [hh, mm] = remindAt.split(":").map(Number);
  const due = new Date(y, m - 1, d, hh, mm, 0, 0);
  if (remindAt === todo.endTime && taskEndsNextDay(todo)) due.setDate(due.getDate() + 1);
  return due.getTime();
}
function occurrenceKey(todo) {
  return `${todo.date || ""}T${todo.startTime || ""}-${todo.endTime || todo.time || ""}#${todo.remindBefore ?? 0}`;
}
function bodyOf(todo) {
  const bits = [];
  const timeLabel = taskTimeRangeLabel(todo);
  if (timeLabel) bits.push(timeLabel);
  if (todo.note) bits.push(todo.note.slice(0, 80));
  return bits.join("  ·  ") || "该处理这条待办了";
}
function tick() {
  const rolledOver = repo.rollOverUnfinishedTodos() + repo.rollGoalPeriods();
  if (!electron.Notification.isSupported()) {
    if (rolledOver) onFired?.();
    return;
  }
  const now = Date.now();
  let changed = rolledOver > 0;
  for (const todo of repo.rawTodos()) {
    if (todo.done) continue;
    if (todo.remindBefore === null || todo.remindBefore === void 0) continue;
    const dueAt = parseDueAt(todo);
    if (dueAt === null) continue;
    const fireAt = dueAt - Number(todo.remindBefore) * 60 * 1e3;
    if (now < fireAt) continue;
    if (now - fireAt > GRACE_MS) continue;
    const key = occurrenceKey(todo);
    if (todo.notifiedKey === key) continue;
    new electron.Notification({
      title: todo.title || "待办提醒",
      body: bodyOf(todo),
      silent: false
    }).show();
    todo.notifiedKey = key;
    changed = true;
  }
  if (changed) {
    repo.markFlushDirty();
    onFired?.();
  }
}
function focusTick() {
  const session = repo.completeExpiredFocus();
  if (!session) return;
  if (electron.Notification.isSupported()) {
    new electron.Notification({
      title: "专注完成",
      body: `本轮 ${session.plannedMinutes} 分钟专注已完成，休息一下吧。`,
      silent: false
    }).show();
  }
  repo.markFlushDirty();
  onFired?.();
}
function startReminders(notifyRenderers) {
  onFired = notifyRenderers;
  stopReminders();
  timer = setInterval(tick, TICK_MS);
  focusTimer = setInterval(focusTick, FOCUS_TICK_MS);
  setTimeout(tick, 3e3);
  setTimeout(focusTick, 1e3);
}
function stopReminders() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  if (focusTimer) {
    clearInterval(focusTimer);
    focusTimer = null;
  }
}
electron.app.setAppUserModelId("com.timemaster.v2");
const smokeUserData = isSmokeTest ? process.env.TIMEMASTER_SMOKE_USER_DATA : null;
if (isSmokeTest && !smokeUserData) throw new Error("Smoke test requires an isolated TIMEMASTER_SMOKE_USER_DATA path.");
const userDataPath = smokeUserData ? node_path.resolve(smokeUserData) : node_path.join(electron.app.getPath("appData"), "timemaster-v2");
if (smokeUserData) {
  const sessionDataPath = node_path.join(userDataPath, "session");
  node_fs.mkdirSync(sessionDataPath, { recursive: true });
  electron.app.setPath("sessionData", sessionDataPath);
}
electron.app.setPath("userData", userDataPath);
let tray = null;
const gotLock = isSmokeTest || electron.app.requestSingleInstanceLock();
if (!gotLock) {
  electron.app.quit();
} else {
  electron.app.on("second-instance", () => {
    void revealWidget();
  });
  electron.app.whenReady().then(bootstrap).catch((error) => {
    console.error("[bootstrap] 启动失败：", error);
    try {
      electron.dialog.showErrorBox("时间大师无法启动", String(error?.message || error));
    } finally {
      electron.app.quit();
    }
  });
}
function bootstrap() {
  initStore();
  registerIpc();
  const allowWidgetGeolocation = (webContents, permission) => permission === "geolocation" && webContents === getWidgetWindow()?.webContents;
  electron.session.defaultSession.setPermissionCheckHandler(allowWidgetGeolocation);
  electron.session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(allowWidgetGeolocation(webContents, permission));
  });
  const settings2 = getSettings();
  electron.nativeTheme.themeSource = settings2.theme === "light" ? "light" : "dark";
  if (isSmokeTest) {
    const main = createMainWindow();
    const widget = settings2.widget.enabled ? createWidgetWindow({ show: false }) : null;
    void runPackagedSmokeTest(main, widget);
    return;
  }
  const autoLaunchStatus = syncAutoLaunch(settings2.autoLaunch);
  if (settings2.autoLaunch && !autoLaunchStatus.executableWillLaunchAtLogin) {
    console.warn("[auto-launch] Windows 启动项校正失败");
  }
  createMainWindow();
  if (settings2.widget.enabled) createWidgetWindow();
  buildTray();
  startReminders(() => pushSnapshot());
  electron.app.on("activate", () => {
    void revealWidget();
  });
}
async function runPackagedSmokeTest(main, widget) {
  const resultFile = node_path.join(electron.app.getPath("userData"), "smoke-result.json");
  const checkWindow = async (win) => {
    await waitForRenderer(win);
    return win.webContents.executeJavaScript(`(async () => ({
      mounted: Boolean(document.querySelector('#app')?.childElementCount),
      apiExposed: typeof window.api?.data?.snapshot === 'function',
      snapshotShape: Array.isArray((await window.api.data.snapshot()).todos)
    }))()`);
  };
  try {
    if (!widget) throw new Error("桌面小组件未创建，打包烟测不能继续。");
    const mainResult = await checkWindow(main);
    const widgetResult = await checkWindow(widget);
    const captureDir = process.env.TIMEMASTER_SMOKE_CAPTURE_DIR;
    if (captureDir) {
      const forceHiddenWindowRepaint = async (win) => {
        const [width, height] = win.getSize();
        win.setSize(width - 1, height);
        await delay(80);
        win.setSize(width, height);
        await delay(180);
        win.webContents.invalidate();
        await delay(80);
      };
      const smokeList = repo.createList("产品研发");
      const personalList = repo.createList("个人成长");
      const todayForTasks = localYmd$1();
      const tomorrowDate = /* @__PURE__ */ new Date();
      tomorrowDate.setDate(tomorrowDate.getDate() + 1);
      const tomorrowForTasks = localYmd$1(tomorrowDate);
      const yesterdayDate = /* @__PURE__ */ new Date();
      yesterdayDate.setDate(yesterdayDate.getDate() - 1);
      const yesterday = localYmd$1(yesterdayDate);
      const smokeTodos = [];
      for (const todo of [
        { listId: smokeList.id, title: "整理 0.1.10 视觉验收清单", date: todayForTasks, startTime: "18:00", endTime: "19:00", priority: 3, quadrant: 1 },
        { listId: smokeList.id, title: "完善开源项目文档", date: todayForTasks, startTime: "19:15", endTime: "20:45", priority: 2, quadrant: 2 },
        { listId: smokeList.id, title: "回顾用户反馈", date: tomorrowForTasks, startTime: "09:30", endTime: "10:00", priority: 2, quadrant: 3 },
        { listId: personalList.id, title: "阅读技术文章", date: todayForTasks, startTime: "22:00", endTime: "23:00", priority: 1, quadrant: 4 },
        { listId: smokeList.id, title: "整理版本截图", date: todayForTasks, startTime: "10:00", endTime: "10:30", priority: 2, quadrant: 2 },
        { listId: smokeList.id, title: "核对安装包哈希", date: todayForTasks, startTime: "11:00", endTime: "11:20", priority: 3, quadrant: 1 },
        { listId: personalList.id, title: "处理待办归档", date: todayForTasks, startTime: "14:00", endTime: "14:30", priority: 1, quadrant: 3 },
        { listId: smokeList.id, title: "准备发布说明", date: todayForTasks, startTime: "15:00", endTime: "15:40", priority: 2, quadrant: 2 },
        { listId: personalList.id, title: "复盘本周安排", date: todayForTasks, startTime: "21:00", endTime: "21:30", priority: 1, quadrant: 4 },
        { listId: smokeList.id, title: "跟进昨日未完成事项", date: yesterday, startTime: "16:00", endTime: "16:30", priority: 2, quadrant: 2 }
      ]) smokeTodos.push(repo.createTodo(todo));
      repo.rollOverUnfinishedTodos(todayForTasks);
      for (const todo of smokeTodos.filter((item) => item.date === todayForTasks).slice(0, 3)) repo.toggleTodo(todo.id);
      const recurringSmokeTodo = repo.createTodo({
        listId: personalList.id,
        title: "每周整理执行复盘",
        date: todayForTasks,
        startTime: "08:30",
        endTime: "09:00",
        priority: 1,
        quadrant: 2,
        repeat: "weekly"
      });
      repo.toggleTodo(recurringSmokeTodo.id);
      const ledger = repo.createGoal({ name: "工作室费用", mode: "ledger", period: "month", unit: "元" });
      const secondLedger = repo.createGoal({ name: "营销台账", mode: "ledger", period: "month", unit: "元" });
      repo.renameExpenseCategory(ledger.id, "office", "软件订阅");
      repo.renameExpenseCategory(secondLedger.id, "office", "广告投放");
      const custom = repo.addExpenseCategory(ledger.id, { name: "订阅服务" });
      const today = localYmd$1();
      for (const entry of [
        { cat: "office", amount: 86.5, note: "打印耗材", date: today },
        { cat: "travel", amount: 42, note: "客户拜访地铁", date: today },
        { cat: "goods", amount: 1260, note: "样品采购", date: yesterday },
        { cat: custom.category.id, amount: 128, note: "设计工具月费", date: today }
      ]) repo.addExpense({ goalId: ledger.id, ...entry });
      repo.addExpense({ goalId: secondLedger.id, cat: "office", amount: 64, note: "素材推广", date: today });
      data.expenses.push({
        id: node_crypto.randomUUID(),
        goalId: ledger.id,
        date: today,
        cat: "smoke-legacy-category",
        amount: 17.25,
        note: "旧版导入记录",
        at: Date.now()
      });
      migrateExpenseCategories(ledger, data.expenses);
      pushSnapshot();
      main.webContents.send("app:navigate", { view: "calendar", date: today });
      main.setSize(1280, 800);
      await delay(450);
      const calendarCapture = await main.webContents.capturePage(void 0, { stayHidden: true });
      node_fs.writeFileSync(node_path.join(captureDir, "calendar.png"), calendarCapture.toPNG());
      main.setSize(880, 620);
      await delay(250);
      const compactCalendarCapture = await main.webContents.capturePage(void 0, { stayHidden: true });
      node_fs.writeFileSync(node_path.join(captureDir, "calendar-compact.png"), compactCalendarCapture.toPNG());
      main.setSize(1280, 800);
      await delay(250);
      await main.webContents.executeJavaScript(`document.querySelector('.calendar-month-summary-buttons .completed')?.click()`);
      await delay(350);
      const completionDetailState = await main.webContents.executeJavaScript(`(() => {
        const detail = document.querySelector('.calendar-month-detail');
        const title = document.querySelector('.calendar-month-detail-title span')?.textContent || '';
        const rows = document.querySelectorAll('.calendar-month-detail-row').length;
        return { title, rows, completedClass: detail?.classList.contains('completed') === true };
      })()`);
      if (!completionDetailState.completedClass || !completionDetailState.title.includes("完成明细") || completionDetailState.rows !== 4) {
        throw new Error(`月历本月完成明细状态错误：${JSON.stringify(completionDetailState)}`);
      }
      await forceHiddenWindowRepaint(main);
      const monthCompletionsCapture = await main.webContents.capturePage(void 0, { stayHidden: true });
      node_fs.writeFileSync(node_path.join(captureDir, "calendar-month-completions.png"), monthCompletionsCapture.toPNG());
      await main.webContents.executeJavaScript(`document.querySelector('.calendar-month-detail-head > button')?.click()`);
      await delay(100);
      await main.webContents.executeJavaScript(`document.querySelector('.calendar-month-summary-buttons .rollover')?.click()`);
      await delay(350);
      const rolloverDetailState = await main.webContents.executeJavaScript(`(() => {
        const detail = document.querySelector('.calendar-month-detail');
        const title = document.querySelector('.calendar-month-detail-title span')?.textContent || '';
        const rows = document.querySelectorAll('.calendar-month-detail-row').length;
        return { title, rows, rolloverClass: detail?.classList.contains('rollover') === true };
      })()`);
      if (!rolloverDetailState.rolloverClass || !rolloverDetailState.title.includes("延期明细") || rolloverDetailState.rows !== 1) {
        throw new Error(`月历本月延期明细状态错误：${JSON.stringify(rolloverDetailState)}`);
      }
      await forceHiddenWindowRepaint(main);
      const monthRolloversCapture = await main.webContents.capturePage(void 0, { stayHidden: true });
      node_fs.writeFileSync(node_path.join(captureDir, "calendar-month-rollovers.png"), monthRolloversCapture.toPNG());
      await main.webContents.executeJavaScript(`document.querySelector('.calendar-month-detail-head > button')?.click()`);
      await delay(100);
      main.webContents.send("app:navigate", { view: "calendar", date: yesterday });
      await delay(250);
      const rolloverCalendarCapture = await main.webContents.capturePage(void 0, { stayHidden: true });
      node_fs.writeFileSync(node_path.join(captureDir, "calendar-rollover-history.png"), rolloverCalendarCapture.toPNG());
      await main.webContents.executeJavaScript(`[...document.querySelectorAll('.nav-item')].find((el) => el.textContent.includes('全部待办'))?.click()`);
      await delay(250);
      const todoCapture = await main.webContents.capturePage(void 0, { stayHidden: true });
      node_fs.writeFileSync(node_path.join(captureDir, "todos.png"), todoCapture.toPNG());
      await main.webContents.executeJavaScript(`[...document.querySelectorAll('.nav-item')].find((el) => el.textContent.includes('四象限'))?.click()`);
      await delay(250);
      const matrixCapture = await main.webContents.capturePage(void 0, { stayHidden: true });
      node_fs.writeFileSync(node_path.join(captureDir, "matrix.png"), matrixCapture.toPNG());
      await main.webContents.executeJavaScript(`document.querySelector('button[title="设置"]')?.click()`);
      await delay(200);
      const settingsCapture = await main.webContents.capturePage(void 0, { stayHidden: true });
      node_fs.writeFileSync(node_path.join(captureDir, "settings.png"), settingsCapture.toPNG());
      await main.webContents.executeJavaScript(`document.querySelector('.mask')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))`);
      await delay(100);
      main.webContents.send("app:navigate", { view: "expense", goalId: ledger.id, date: today });
      main.setSize(1280, 800);
      await delay(450);
      node_fs.mkdirSync(captureDir, { recursive: true });
      const overview = await main.webContents.capturePage(void 0, { stayHidden: true });
      node_fs.writeFileSync(node_path.join(captureDir, "expense-overview.png"), overview.toPNG());
      await main.webContents.executeJavaScript(`document.querySelector('.exp-cat-btn')?.click()`);
      await delay(250);
      const categoryDialogOpened = await main.webContents.executeJavaScript(`Boolean(document.querySelector('.cat-dlg'))`);
      if (!categoryDialogOpened) throw new Error("类别管理弹窗未打开，无法完成视觉烟测。");
      const categories = await main.webContents.capturePage(void 0, { stayHidden: true });
      node_fs.writeFileSync(node_path.join(captureDir, "expense-categories.png"), categories.toPNG());
      await main.webContents.executeJavaScript(`document.querySelector('.cat-dlg')?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`);
      await delay(100);
      const categoryDialogClosed = await main.webContents.executeJavaScript(`!document.querySelector('.cat-dlg')`);
      if (!categoryDialogClosed) throw new Error("类别管理弹窗未能通过 Escape 关闭。");
      main.setSize(900, 620);
      await delay(250);
      const compact = await main.webContents.capturePage(void 0, { stayHidden: true });
      node_fs.writeFileSync(node_path.join(captureDir, "expense-compact.png"), compact.toPNG());
      main.setSize(1280, 800);
      await main.webContents.executeJavaScript(`document.querySelector('.nav-item')?.click()`);
      await delay(250);
      const audit = await main.webContents.capturePage(void 0, { stayHidden: true });
      node_fs.writeFileSync(node_path.join(captureDir, "expense-audit.png"), audit.toPNG());
      await widget.webContents.executeJavaScript(`document.querySelector('.wx-focus-primary')?.click()`);
      await delay(650);
      const widgetFocusState = await widget.webContents.executeJavaScript(`(() => {
        const card = document.querySelector('.wx-focusbar');
        const clock = document.querySelector('.wx-focus-active-clock')?.textContent?.trim() || '';
        const cancel = document.querySelector('.wx-focus-cancel');
        return { active: card?.classList.contains('is-active') === true, clock, cancel: Boolean(cancel) };
      })()`);
      if (!widgetFocusState.active || !/^\d{2,3}:\d{2}$/.test(widgetFocusState.clock) || !widgetFocusState.cancel) {
        throw new Error(`桌面小组件专注翻转计时状态错误：${JSON.stringify(widgetFocusState)}`);
      }
      await widget.webContents.executeJavaScript(`(() => {
        const flipper = document.querySelector('.wx-focus-flipper');
        if (!flipper) return false;
        flipper.style.transition = 'none';
        flipper.style.transform = 'rotateX(180deg)';
        return true;
      })()`);
      await forceHiddenWindowRepaint(widget);
      const widgetFocusActive = await widget.webContents.capturePage(void 0, { stayHidden: true });
      node_fs.writeFileSync(node_path.join(captureDir, "widget-focus-active.png"), widgetFocusActive.toPNG());
      await widget.webContents.executeJavaScript(`(() => {
        const flipper = document.querySelector('.wx-focus-flipper');
        if (flipper) {
          flipper.style.transition = '';
          flipper.style.transform = '';
        }
        document.querySelector('.wx-focus-cancel')?.click();
      })()`);
      await delay(700);
      const widgetFocusReturned = await widget.webContents.executeJavaScript(`!document.querySelector('.wx-focusbar')?.classList.contains('is-active')`);
      if (!widgetFocusReturned) throw new Error("桌面小组件取消专注后未翻回初始界面。");
      await widget.webContents.executeJavaScript(`(() => {
        const flipper = document.querySelector('.wx-focus-flipper');
        if (!flipper) return false;
        flipper.style.transition = 'none';
        flipper.style.transform = 'rotateX(0deg)';
        return true;
      })()`);
      await widget.webContents.executeJavaScript(`document.querySelector('.wx-led-cat')?.click()`);
      await delay(100);
      const widgetLedgerOpened = await widget.webContents.executeJavaScript(`Boolean(document.querySelector('.wx-led-entry'))`);
      if (!widgetLedgerOpened) throw new Error("桌面小组件费用快捷输入未打开。");
      await forceHiddenWindowRepaint(widget);
      const widgetEntry = await widget.webContents.capturePage(void 0, { stayHidden: true });
      node_fs.writeFileSync(node_path.join(captureDir, "widget-entry.png"), widgetEntry.toPNG());
      await widget.webContents.executeJavaScript(`document.querySelector('.wx-led-entry')?.closest('.wx-goal')?.querySelector('.wx-goal-top')?.click()`);
      await delay(100);
      const widgetLedgerClosed = await widget.webContents.executeJavaScript(`!document.querySelector('.wx-led-entry')`);
      if (!widgetLedgerClosed) throw new Error("桌面小组件费用快捷输入未能通过点击空白处取消。");
      await forceHiddenWindowRepaint(widget);
      const widgetLedger = await widget.webContents.capturePage(void 0, { stayHidden: true });
      node_fs.writeFileSync(node_path.join(captureDir, "widget-ledger.png"), widgetLedger.toPNG());
    }
    const ok = mainResult.mounted && mainResult.apiExposed && mainResult.snapshotShape && widgetResult.mounted && widgetResult.apiExposed && widgetResult.snapshotShape;
    node_fs.writeFileSync(resultFile, JSON.stringify({ ok, version: electron.app.getVersion(), main: mainResult, widget: widgetResult }, null, 2), "utf8");
    electron.app.exit(ok ? 0 : 1);
  } catch (error) {
    node_fs.writeFileSync(resultFile, JSON.stringify({ ok: false, error: String(error?.stack || error) }, null, 2), "utf8");
    electron.app.exit(1);
  }
}
function buildTray() {
  tray = new electron.Tray(trayIcon());
  tray.setToolTip("时间大师");
  refreshTrayMenu();
  tray.on("click", () => {
    const main = getMainWindow();
    if (main?.isVisible()) {
      void returnToWidget();
      return;
    }
    const widget = getWidgetWindow();
    if (widget?.isVisible() && widget.isFocused()) widget.hide();
    else void revealWidget();
  });
}
function refreshTrayMenu() {
  if (!tray) return;
  const s = getSettings();
  tray.setContextMenu(
    electron.Menu.buildFromTemplate([
      {
        label: "显示桌面小组件",
        type: "checkbox",
        checked: s.widget.enabled,
        click: (item) => {
          patchSettings({ widget: { enabled: item.checked } });
          if (item.checked) createWidgetWindow();
          else destroyWidgetWindow();
          refreshTrayMenu();
        }
      },
      { type: "separator" },
      {
        label: "开机自动启动",
        type: "checkbox",
        checked: s.autoLaunch,
        click: (item) => {
          patchSettings({ autoLaunch: item.checked });
          setAutoLaunch(item.checked);
          refreshTrayMenu();
        }
      },
      { type: "separator" },
      {
        label: "退出",
        click: () => {
          setQuitting(true);
          electron.app.quit();
        }
      }
    ])
  );
}
electron.app.on("before-quit", () => {
  setQuitting(true);
  stopReminders();
  flushNow();
});
electron.app.on("window-all-closed", () => {
});
