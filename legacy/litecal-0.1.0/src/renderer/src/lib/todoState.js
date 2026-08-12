import { parseYmd } from './date.js'

/** 剩余时间进入这个阈值就转玫红提醒 */
export const URGENT_MINUTES = 30

/** 待办的截止时刻（毫秒）；没写时间的按当天 23:59 算，不然一整天都会被判成"临期" */
export function dueAtOf(todo) {
  if (!todo.date) return null
  const d = parseYmd(todo.date)
  if (todo.time) {
    const [h, m] = todo.time.split(':').map(Number)
    d.setHours(Number.isFinite(h) ? h : 23, Number.isFinite(m) ? m : 59, 0, 0)
  } else {
    d.setHours(23, 59, 0, 0)
  }
  return d.getTime()
}

/** 距离截止还有多少分钟，负数表示已经逾期 */
export function remainingMinutes(todo, now = Date.now()) {
  const due = dueAtOf(todo)
  if (due === null) return null
  return Math.floor((due - now) / 60000)
}

/** 已经跑了多久：已结算的 + 当前这一段还没结算的 */
export function elapsedMsOf(todo, now = Date.now()) {
  const base = todo.elapsedMs || 0
  return todo.startedAt ? base + (now - todo.startedAt) : base
}

/**
 * 四象限卡片的视觉状态，优先级从高到低：
 * done（已完成，置灰）> running（计时中，绿）> urgent（临期/逾期，玫红）> normal
 *
 * running 排在 urgent 前面：底色是用户点"启动"换来的即时反馈，
 * 被临期色顶掉会让人以为没点上。临期信号改用卡片外圈的玫红描边表达，两个信息都在。
 */
export function todoState(todo, now = Date.now()) {
  if (todo.done) return 'done'
  if (todo.startedAt) return 'running'
  const left = remainingMinutes(todo, now)
  if (left !== null && left <= URGENT_MINUTES) return 'urgent'
  return 'normal'
}

/** 计时中同时又临期时，额外套一圈玫红描边 */
export function isUrgentRinged(todo, now = Date.now()) {
  if (todo.done || !todo.startedAt) return false
  const left = remainingMinutes(todo, now)
  return left !== null && left <= URGENT_MINUTES
}

/** 跑表样式的 mm:ss，超过一小时补上小时位 */
export function stopwatchLabel(ms) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (n) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

/** 完成后展示的耗时，按需求用分钟做单位 */
export function durationLabel(ms) {
  if (!ms || ms <= 0) return null
  if (ms < 60000) return '不足 1 分钟'
  return `${Math.round(ms / 60000)} 分钟`
}

/** 临期/逾期的文字提示 */
export function remainingLabel(todo, now = Date.now()) {
  const left = remainingMinutes(todo, now)
  if (left === null) return null
  if (left < 0) {
    const over = -left
    return over >= 60 ? `逾期 ${Math.floor(over / 60)} 小时` : `逾期 ${over} 分`
  }
  if (left <= URGENT_MINUTES) return `剩 ${left} 分`
  return null
}
