const pad = (n) => String(n).padStart(2, '0')

/** 全程用本地时区的 'YYYY-MM-DD' 当主键，避免 toISOString() 的 UTC 偏移把日期挪走一天 */
export function ymd(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function parseYmd(str) {
  const [y, m, d] = String(str).split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const todayYmd = () => ymd(new Date())

export function addDays(str, n) {
  const d = parseYmd(str)
  d.setDate(d.getDate() + n)
  return ymd(d)
}

export function addMonths(str, n) {
  const d = parseYmd(str)
  const day = d.getDate()
  d.setDate(1)
  d.setMonth(d.getMonth() + n)
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  d.setDate(Math.min(day, last))
  return ymd(d)
}

export const isSameMonth = (a, b) => a.slice(0, 7) === b.slice(0, 7)

/**
 * 月视图网格。固定 6 行 42 格，月份切换时高度不跳动。
 * @param {string} anchor 该月内任意一天
 * @param {number} weekStart 1 = 周一开头
 */
export function monthGrid(anchor, weekStart = 1) {
  const d = parseYmd(anchor)
  const first = new Date(d.getFullYear(), d.getMonth(), 1)
  const offset = (first.getDay() - weekStart + 7) % 7
  const start = new Date(first)
  start.setDate(first.getDate() - offset)

  const cells = []
  for (let i = 0; i < 42; i++) {
    const cur = new Date(start)
    cur.setDate(start.getDate() + i)
    cells.push(ymd(cur))
  }
  return cells
}

/** 某天所在的一周（7 格） */
export function weekGrid(anchor, weekStart = 1) {
  const d = parseYmd(anchor)
  const offset = (d.getDay() - weekStart + 7) % 7
  const start = new Date(d)
  start.setDate(d.getDate() - offset)
  return Array.from({ length: 7 }, (_, i) => {
    const cur = new Date(start)
    cur.setDate(start.getDate() + i)
    return ymd(cur)
  })
}

export function weekdayLabels(weekStart = 1) {
  const names = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return Array.from({ length: 7 }, (_, i) => names[(i + weekStart) % 7])
}

/** ISO 周数，用于顶部的"第 N 周" */
export function isoWeekNumber(str) {
  const d = parseYmd(str)
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  // 挪到本周周四：ISO 规定周四所在的年份就是这一周归属的年份
  target.setDate(target.getDate() + 3 - ((target.getDay() + 6) % 7))
  const firstThursday = new Date(target.getFullYear(), 0, 4)
  firstThursday.setDate(firstThursday.getDate() + 3 - ((firstThursday.getDay() + 6) % 7))
  return 1 + Math.round((target - firstThursday) / (7 * 86400000))
}

export function isWeekend(str) {
  const day = parseYmd(str).getDay()
  return day === 0 || day === 6
}

/** 相对今天的人话描述，用在待办列表上 */
export function relativeLabel(str) {
  if (!str) return ''
  const diff = Math.round((parseYmd(str) - parseYmd(todayYmd())) / 86400000)
  if (diff === 0) return '今天'
  if (diff === 1) return '明天'
  if (diff === 2) return '后天'
  if (diff === -1) return '昨天'
  if (diff < 0) return `逾期 ${-diff} 天`
  if (diff <= 7) return `${diff} 天后`
  return str.slice(5).replace('-', '/')
}

/** 今年还剩几天（不含今天，跨年当天显示 0） */
export function daysLeftInYear(str = todayYmd()) {
  const d = parseYmd(str)
  const last = new Date(d.getFullYear(), 11, 31)
  return Math.max(0, Math.round((last - d) / 86400000))
}

/**
 * 两个日期相差几天（to - from）。
 * 都归零到当天 0 点再算，避免夏令时/时分秒把结果带偏半天。
 * 正数 = to 在将来，负数 = 已经过去。
 */
export function daysBetween(from, to) {
  const a = parseYmd(from)
  const b = parseYmd(to)
  a.setHours(0, 0, 0, 0)
  b.setHours(0, 0, 0, 0)
  return Math.round((b - a) / 86400000)
}

export function nowHm() {
  const d = new Date()
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}
