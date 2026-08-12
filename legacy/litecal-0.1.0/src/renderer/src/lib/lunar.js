import { Solar, HolidayUtil } from 'lunar-javascript'
import { parseYmd } from './date.js'

/**
 * 农历 / 节气 / 法定节假日。
 *
 * 全部本地算，不联网 —— 原版这一块是打 xzdesktop-calandarapi.cqttech.com 取的。
 * lunar-javascript 自带国务院历年放假调休数据，getHoliday 返回的 isWork()
 * 为 true 表示"调休上班"。
 */

const cache = new Map()

function compute(dateStr) {
  const d = parseYmd(dateStr)
  const solar = Solar.fromYmd(d.getFullYear(), d.getMonth() + 1, d.getDate())
  const lunar = solar.getLunar()

  const jieQi = lunar.getJieQi() || ''
  const lunarFestivals = lunar.getFestivals() || []
  const solarFestivals = solar.getFestivals() || []
  const dayInChinese = lunar.getDayInChinese()
  const monthInChinese = `${lunar.getMonthInChinese()}月`

  let holiday = null
  try {
    const h = HolidayUtil.getHoliday(d.getFullYear(), d.getMonth() + 1, d.getDate())
    if (h) holiday = { name: h.getName(), isWork: h.isWork() }
  } catch {
    // 数据表没覆盖到的年份（一般是明年放假安排还没公布）就当普通日子
  }

  // 一格里只放得下一行字，按重要性挑一个：农历节日 > 公历节日 > 节气 > 初一显示月份 > 农历日
  let label = dayInChinese
  let tone = 'normal'
  if (lunarFestivals.length) {
    label = lunarFestivals[0]
    tone = 'festival'
  } else if (solarFestivals.length) {
    label = solarFestivals[0]
    tone = 'festival'
  } else if (jieQi) {
    label = jieQi
    tone = 'jieqi'
  } else if (dayInChinese === '初一') {
    label = monthInChinese
    tone = 'month'
  }

  return {
    label,
    tone,
    jieQi,
    dayInChinese,
    monthInChinese,
    festivals: [...lunarFestivals, ...solarFestivals],
    holiday,
    ganzhi: `${lunar.getYearInGanZhi()}年 ${lunar.getMonthInGanZhi()}月 ${lunar.getDayInGanZhi()}日`,
    animal: lunar.getYearShengXiao(),
    /** 紧凑写法，给小组件那一行用：丙午马年 */
    yearGz: `${lunar.getYearInGanZhi()}${lunar.getYearShengXiao()}年`,
    /** 完整农历表述，小组件和日详情用 */
    full: `${lunar.getMonthInChinese()}月${dayInChinese}`
  }
}

export function lunarInfo(dateStr) {
  let hit = cache.get(dateStr)
  if (!hit) {
    hit = compute(dateStr)
    // 来回翻月份会反复算同几天，缓存住；超过一年份量就整个丢掉重来
    if (cache.size > 800) cache.clear()
    cache.set(dateStr, hit)
  }
  return hit
}
