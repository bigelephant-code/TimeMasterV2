import { Notification } from 'electron'
import { repo } from './store.js'

/**
 * 到点提醒。
 *
 * 每 20 秒扫一遍待办，命中就发一条 Windows 原生通知。
 * 没有用 setTimeout 对每条待办单独排期，原因是待办随时会被改/删，
 * 轮询实现简单且不会漏；20 秒的精度对日程提醒完全够。
 */

const TICK_MS = 20 * 1000
/** 允许迟到的窗口：睡眠唤醒后补发，但超过 10 分钟的就算过期不再打扰 */
const GRACE_MS = 10 * 60 * 1000

let timer = null
let onFired = null

function parseDueAt(todo) {
  if (!todo.date) return null
  const [y, m, d] = todo.date.split('-').map(Number)
  if (!y || !m || !d) return null
  let hh = 9
  let mm = 0
  if (todo.time) {
    const parts = todo.time.split(':').map(Number)
    if (Number.isFinite(parts[0])) hh = parts[0]
    if (Number.isFinite(parts[1])) mm = parts[1]
  }
  return new Date(y, m - 1, d, hh, mm, 0, 0).getTime()
}

function occurrenceKey(todo) {
  return `${todo.date || ''}T${todo.time || ''}#${todo.remindBefore ?? 0}`
}

function bodyOf(todo) {
  const bits = []
  if (todo.time) bits.push(todo.time)
  if (todo.note) bits.push(todo.note.slice(0, 80))
  return bits.join('  ·  ') || '该处理这条待办了'
}

function tick() {
  if (!Notification.isSupported()) return
  const now = Date.now()
  let changed = false

  for (const todo of repo.rawTodos()) {
    if (todo.done) continue
    if (todo.remindBefore === null || todo.remindBefore === undefined) continue

    const dueAt = parseDueAt(todo)
    if (dueAt === null) continue

    const fireAt = dueAt - Number(todo.remindBefore) * 60 * 1000
    if (now < fireAt) continue
    if (now - fireAt > GRACE_MS) continue

    const key = occurrenceKey(todo)
    if (todo.notifiedKey === key) continue

    new Notification({
      title: todo.title || '待办提醒',
      body: bodyOf(todo),
      silent: false
    }).show()

    todo.notifiedKey = key
    changed = true
  }

  if (changed) {
    repo.markFlushDirty()
    onFired?.()
  }
}

export function startReminders(notifyRenderers) {
  onFired = notifyRenderers
  stopReminders()
  timer = setInterval(tick, TICK_MS)
  // 启动时先扫一次，接住"关机时错过的提醒"
  setTimeout(tick, 3000)
}

export function stopReminders() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}
