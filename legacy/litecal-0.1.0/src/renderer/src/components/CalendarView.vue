<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import Icon from './Icon.vue'
import TodoItem from './TodoItem.vue'
import { actions, state, todosOn } from '../store.js'
import { lunarInfo } from '../lib/lunar.js'
import {
  addDays,
  addMonths,
  isoWeekNumber,
  isSameMonth,
  monthGrid,
  parseYmd,
  todayYmd,
  weekGrid,
  weekdayLabels
} from '../lib/date.js'

const quickText = ref('')
const weekStart = computed(() => state.settings?.weekStart ?? 1)
const labels = computed(() => weekdayLabels(weekStart.value))

const cells = computed(() =>
  state.calendarMode === 'week'
    ? weekGrid(state.cursor, weekStart.value)
    : monthGrid(state.cursor, weekStart.value)
)

const heading = computed(() => {
  const d = parseYmd(state.cursor)
  if (state.calendarMode === 'day') {
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
  }
  return `${d.getFullYear()}年${String(d.getMonth() + 1).padStart(2, '0')}月`
})

const selectedInfo = computed(() => lunarInfo(state.selected))
const selectedDate = computed(() => parseYmd(state.selected))
const selectedTodos = computed(() => todosOn(state.selected))

function step(dir) {
  if (state.calendarMode === 'month') state.cursor = addMonths(state.cursor, dir)
  else if (state.calendarMode === 'week') state.cursor = addDays(state.cursor, dir * 7)
  else state.cursor = addDays(state.cursor, dir)
}

function goToday() {
  state.cursor = todayYmd()
  state.selected = todayYmd()
}

function pick(day) {
  state.selected = day
  // 点到上/下月的日子就把视图跟着翻过去
  if (state.calendarMode === 'month' && !isSameMonth(day, state.cursor)) state.cursor = day
}

async function quickAdd() {
  const text = quickText.value
  quickText.value = ''
  await actions.quickAdd(text, state.selected)
}

/* —— 日视图 —— */
const timelineEl = ref(null)
/** 没写时间的待办单独放"全天"一行，别混进某个整点里 */
const allDayTodos = computed(() => selectedTodos.value.filter((t) => !t.time))
const todosAtHour = (hour) =>
  selectedTodos.value.filter((t) => t.time && Number(t.time.split(':')[0]) === hour)

/** 切到日视图时滚到当前钟点，不然一进来只看得到凌晨 */
async function scrollToNow() {
  await nextTick()
  const el = timelineEl.value
  if (!el) return
  const hour = new Date().getHours()
  el.scrollTop = Math.max(0, (hour - 1) * 46)
}
watch(
  () => state.calendarMode,
  (m) => {
    if (m === 'day') scrollToNow()
  },
  { immediate: true }
)

const isToday = (d) => d === todayYmd()
const dayNum = (d) => parseYmd(d).getDate()
/** 表头第 i 列是不是周末（0 = 周日，6 = 周六） */
const headIsWeekend = (i) => {
  const wd = (i + weekStart.value) % 7
  return wd === 0 || wd === 6
}
const weekdayName = (d) => ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][parseYmd(d).getDay()]
</script>

<template>
  <div class="main">
    <div class="toolbar">
      <button class="tbtn" title="上一页" @click="step(-1)"><Icon name="left" :size="15" /></button>
      <h2>{{ heading }}</h2>
      <button class="tbtn" title="下一页" @click="step(1)"><Icon name="right" :size="15" /></button>

      <span v-if="state.calendarMode !== 'day'" style="color: var(--text-dim); margin-left: 4px">
        第 {{ isoWeekNumber(state.cursor) }} 周
      </span>

      <div class="spacer" style="flex: 1"></div>

      <button class="ghost" @click="goToday">今天</button>
      <div class="seg">
        <button
          v-for="m in [
            { id: 'day', n: '日' },
            { id: 'week', n: '周' },
            { id: 'month', n: '月' }
          ]"
          :key="m.id"
          :class="{ active: state.calendarMode === m.id }"
          @click="state.calendarMode = m.id"
        >
          {{ m.n }}
        </button>
      </div>
    </div>

    <!-- 周视图七列本身就够挤，让它吃满宽度，不再留右侧面板 -->
    <div class="calendar-wrap" :class="{ 'no-panel': state.calendarMode === 'week' }">
      <!-- 月视图 -->
      <div v-if="state.calendarMode === 'month'" style="display: flex; flex-direction: column; min-height: 0">
        <div class="grid-head">
          <div v-for="(l, i) in labels" :key="l" :class="{ we: headIsWeekend(i) }">
            {{ l }}
          </div>
        </div>
        <div class="month-grid">
          <div
            v-for="day in cells"
            :key="day"
            class="cell"
            :class="{
              out: !isSameMonth(day, state.cursor),
              today: isToday(day),
              selected: day === state.selected
            }"
            @click="pick(day)"
            @dblclick="actions.openEditor({ date: day })"
          >
            <span
              v-if="lunarInfo(day).holiday"
              class="badge"
              :class="lunarInfo(day).holiday.isWork ? 'work' : 'rest'"
            >
              {{ lunarInfo(day).holiday.isWork ? '班' : '休' }}
            </span>

            <div class="cell-head">
              <span class="num">{{ dayNum(day) }}</span>
              <span class="sub" :class="lunarInfo(day).tone">{{ lunarInfo(day).label }}</span>
            </div>

            <div class="chips">
              <div
                v-for="t in todosOn(day).slice(0, 3)"
                :key="t.id"
                class="chip"
                :class="{ done: t.done }"
                :title="t.title"
              >
                {{ t.time ? t.time + ' ' : '' }}{{ t.title }}
              </div>
              <div v-if="todosOn(day).length > 3" class="chip more">
                还有 {{ todosOn(day).length - 3 }} 条
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 周视图 -->
      <div v-else-if="state.calendarMode === 'week'" class="week-cols">
        <div v-for="day in cells" :key="day" class="week-col">
          <div
            class="week-col-head"
            :class="{ today: isToday(day) }"
            @click="pick(day)"
            @dblclick="actions.openEditor({ date: day })"
          >
            <div style="font-size: 11px; color: var(--text-dim)">{{ weekdayName(day) }}</div>
            <div style="font-size: 18px; font-weight: 600">{{ dayNum(day) }}</div>
            <div class="sub" :class="lunarInfo(day).tone" style="font-size: 10px">
              {{ lunarInfo(day).label }}
            </div>
          </div>
          <div class="week-col-body">
            <TodoItem v-for="t in todosOn(day)" :key="t.id" :todo="t" />
            <div v-if="!todosOn(day).length" class="empty" style="padding: 10px 4px">—</div>
          </div>
        </div>
      </div>

      <!-- 日视图：按小时铺开，无时间的另起"全天"一行 -->
      <div v-else style="display: flex; flex-direction: column; min-height: 0">
        <div v-if="allDayTodos.length" class="tl-row" style="flex: none; border-bottom-width: 2px">
          <div class="tl-hour">全天</div>
          <div class="tl-body">
            <TodoItem
              v-for="t in allDayTodos"
              :key="t.id"
              :todo="t"
              style="background: var(--bg-soft); border-radius: 6px"
            />
          </div>
        </div>

        <div ref="timelineEl" class="timeline">
          <div v-for="h in 24" :key="h" class="tl-row">
            <div class="tl-hour">{{ String(h - 1).padStart(2, '0') }}:00</div>
            <div class="tl-body">
              <TodoItem
                v-for="t in todosAtHour(h - 1)"
                :key="t.id"
                :todo="t"
                style="background: var(--bg-soft); border-radius: 6px"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- 当日面板 -->
      <div v-if="state.calendarMode !== 'week'" class="day-panel">
        <div class="head">
          <div class="big">
            {{ selectedDate.getMonth() + 1 }}月{{ selectedDate.getDate() }}日
          </div>
          <div class="meta">
            {{ weekdayName(state.selected) }} · {{ selectedInfo.full }}<br />
            {{ selectedInfo.ganzhi }} · {{ selectedInfo.animal }}年
            <template v-if="selectedInfo.festivals.length">
              <br /><span style="color: var(--ok)">{{ selectedInfo.festivals.join('、') }}</span>
            </template>
            <template v-if="selectedInfo.jieQi">
              <br /><span style="color: var(--accent)">节气：{{ selectedInfo.jieQi }}</span>
            </template>
            <template v-if="selectedInfo.holiday">
              <br /><span :style="{ color: selectedInfo.holiday.isWork ? 'var(--danger)' : 'var(--ok)' }">
                {{ selectedInfo.holiday.name }}{{ selectedInfo.holiday.isWork ? ' 调休上班' : ' 放假' }}
              </span>
            </template>
          </div>
        </div>

        <div class="todos">
          <TodoItem v-for="t in selectedTodos" :key="t.id" :todo="t" show-list />
          <div v-if="!selectedTodos.length" class="empty">
            这天还没有安排<br />在下面输入就能加一条
          </div>
        </div>

        <div class="quick">
          <input
            v-model="quickText"
            placeholder="添加待办，回车保存"
            @keyup.enter="quickAdd"
          />
          <button class="primary" title="详细编辑" @click="actions.openEditor({ date: state.selected })">
            <Icon name="plus" :size="14" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
