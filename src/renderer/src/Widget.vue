<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import Icon from './components/Icon.vue'
import { actions, QUADRANTS, state, todosOn } from './store.js'
import { lunarInfo } from './lib/lunar.js'
import { daysBetween, daysLeftInYear, isoWeekNumber, parseYmd, todayYmd } from './lib/date.js'
import {
  durationLabel,
  elapsedMsOf,
  isUrgentRinged,
  remainingLabel,
  stopwatchLabel,
  todoState
} from './lib/todoState.js'

const api = window.api

/* ---------------- 时间基准 ---------------- */
// 计时中的卡片要秒级跳表，所以整个面板跟着 1 秒一拍
const now = ref(Date.now())
const today = ref(todayYmd())
let timer = null

onMounted(() => {
  timer = setInterval(() => {
    now.value = Date.now()
    const t = todayYmd()
    if (t !== today.value) today.value = t // 跨零点自动翻页
  }, 1000)
})
onUnmounted(() => clearInterval(timer))

/* ---------------- 头部信息 ---------------- */
const info = computed(() => lunarInfo(today.value))
const d = computed(() => parseYmd(today.value))
const weekday = computed(
  () => ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][d.value.getDay()]
)
const clock = computed(() => {
  const t = new Date(now.value)
  return `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`
})
const weekNo = computed(() => isoWeekNumber(today.value))
const daysLeft = computed(() => daysLeftInYear(today.value))

/* ---------------- 纪念日：倒计时 / 正计时 ---------------- */
const cdForm = ref(null) // { title, date }
const cdTitleEl = ref(null)

/** null = 还没设过，界面上显示引导 */
const countdown = computed(() => {
  const c = state.settings?.countdown
  if (!c?.date) return null
  const diff = daysBetween(today.value, c.date) // 正数在将来，负数已过去
  return {
    title: c.title || '目标日',
    date: c.date,
    days: Math.abs(diff),
    mode: diff > 0 ? 'future' : diff < 0 ? 'past' : 'today'
  }
})

async function openCountdown() {
  const c = state.settings?.countdown
  cdForm.value = { title: c?.title || '', date: c?.date || todayYmd() }
  await nextTick()
  cdTitleEl.value?.select()
}

async function saveCountdown() {
  const c = cdForm.value
  if (!c) return
  await actions.patchSettings({
    countdown: { title: String(c.title || '').trim().slice(0, 12), date: c.date || null }
  })
  cdForm.value = null
}

async function clearCountdown() {
  await actions.patchSettings({ countdown: { title: '', date: null } })
  cdForm.value = null
}

const rows = computed(() => todosOn(today.value))
const openCount = computed(() => rows.value.filter((t) => !t.done).length)
const doneCount = computed(() => rows.value.filter((t) => t.done).length)

/**
 * 只看今天：填了未来日期的待办会落到那天，不出现在这里。
 * 还没归过象限的（quadrant=0，多是从主窗口快速添加的）暂时收在「重要且紧急」，
 * 让它们至少是可见可操作的，而不是凭空消失。
 */
const inQuadrant = (q) =>
  rows.value
    .filter((t) => (t.quadrant || 0) === q || (q === 1 && !t.quadrant))
    .sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1
      if (!!a.startedAt !== !!b.startedAt) return a.startedAt ? -1 : 1 // 计时中的顶上去
      if (a.time && b.time) return a.time.localeCompare(b.time)
      if (a.time) return -1
      if (b.time) return 1
      return (a.order ?? 0) - (b.order ?? 0)
    })

const unsorted = computed(() => rows.value.filter((t) => !t.quadrant && !t.done))

/* ---------------- 待办：新增 / 编辑 ---------------- */
// compose.id 有值 = 编辑已有待办，没值 = 新建
const compose = ref(null)
const titleEl = ref(null)

async function openCompose(quadrant) {
  compose.value = {
    id: null,
    quadrant,
    title: '',
    date: todayYmd(), // 默认就是今天，可手动改
    time: ''
  }
  await nextTick()
  titleEl.value?.focus()
}

/** 双击卡片进入编辑 */
async function editTodo(todo) {
  compose.value = {
    id: todo.id,
    quadrant: todo.quadrant || 1,
    title: todo.title || '',
    date: todo.date || todayYmd(),
    time: todo.time || ''
  }
  await nextTick()
  titleEl.value?.select()
}

async function saveCompose() {
  const c = compose.value
  if (!c) return
  const title = c.title.trim()
  if (!title) return
  const payload = {
    title,
    date: c.date || todayYmd(),
    time: c.time || null,
    quadrant: c.quadrant
  }
  if (c.id) {
    // 时间被清掉时提醒也要跟着撤，主进程 normalizeReminder 会兜底
    await actions.updateTodo(c.id, payload)
  } else {
    await actions.createTodo({
      ...payload,
      listId: state.lists[0]?.id,
      remindBefore: c.time ? (state.settings?.defaultRemindBefore ?? null) : null
    })
  }
  compose.value = null
}

async function deleteCompose() {
  if (!compose.value?.id) return
  await actions.removeTodo(compose.value.id)
  compose.value = null
}

/** 存到别的日期时给一句话交代，不然用户会以为没保存上 */
const composeHint = computed(() => {
  const c = compose.value
  if (!c || !c.date || c.date === todayYmd()) return null
  const dt = parseYmd(c.date)
  return `${c.id ? '移到' : '将存到'} ${dt.getMonth() + 1} 月 ${dt.getDate()} 日，今天的面板里不显示`
})

/* ---------------- 长期目标 ---------------- */
const goalForm = ref(null) // { id, name, target, unit, current }
const goalNameEl = ref(null)
const progressFor = ref(null) // 正在录进度的目标 id
const progressValue = ref('')
const progressEl = ref(null)
// v-for 里直接写 ref="x" 拿到的是数组，这里用函数 ref 存成单个元素
const setProgressEl = (el) => {
  progressEl.value = el
}

const pct = (g) => (g.target > 0 ? Math.round((g.current / g.target) * 100) : 0)
const barPct = (g) => Math.min(100, Math.max(0, pct(g)))

async function openGoalForm(goal) {
  goalForm.value = goal
    ? { id: goal.id, name: goal.name, target: goal.target, unit: goal.unit, current: goal.current }
    : { id: null, name: '', target: 100, unit: '', current: 0 }
  await nextTick()
  goalNameEl.value?.focus()
}

async function saveGoal() {
  const g = goalForm.value
  if (!g) return
  const name = String(g.name || '').trim()
  if (!name) return
  const payload = {
    name,
    target: Number(g.target) || 1,
    unit: String(g.unit || '').trim(),
    current: Number(g.current) || 0
  }
  if (g.id) await actions.updateGoal(g.id, payload)
  else await actions.createGoal(payload)
  goalForm.value = null
}

async function deleteGoal() {
  if (!goalForm.value?.id) return
  await actions.removeGoal(goalForm.value.id)
  goalForm.value = null
}

/** 点目标行 → 就地录一笔进度 */
async function openProgress(goal) {
  if (progressFor.value === goal.id) return // 已经开着，别把输入清掉
  progressFor.value = goal.id
  progressValue.value = ''
  await nextTick()
  progressEl.value?.focus()
}

function cancelProgress() {
  progressValue.value = '' // 先清值：卸载输入框可能顺带触发 blur，别让它把值提交了
  progressFor.value = null
}

async function submitProgress(goal) {
  const delta = Number(progressValue.value)
  progressFor.value = null
  progressValue.value = ''
  if (!Number.isFinite(delta) || delta === 0) return
  await actions.addGoalProgress(goal.id, delta)
}

/* ---------------- 卡片状态 ---------------- */
const stateOf = (t) => todoState(t, now.value)
const ringed = (t) => isUrgentRinged(t, now.value)
const watchLabel = (t) => stopwatchLabel(elapsedMsOf(t, now.value))
const doneLabel = (t) => durationLabel(t.elapsedMs)
const leftLabel = (t) => remainingLabel(t, now.value)

const locked = computed(() => !!state.settings?.widget?.locked)
const toggleLock = () => actions.patchSettings({ widget: { locked: !locked.value } })
</script>

<template>
  <div class="wx" :class="{ locked }">
    <!-- 顶栏：拖动把手 + 窗口按钮（新增走右键，这里不再放 +） -->
    <div class="wx-bar">
      <button class="wx-icon" :title="locked ? '已锁定，点击解锁' : '锁定位置'" @click="toggleLock">
        <Icon name="pin" :size="12" :style="locked ? 'color:var(--accent)' : ''" />
      </button>
      <div class="wx-drag"></div>
      <button class="wx-icon" title="打开主界面" @click="api.widget.openMain()">
        <Icon name="max" :size="11" />
      </button>
      <button class="wx-icon" title="隐藏小组件" @click="api.widget.hide()">
        <Icon name="x" :size="12" />
      </button>
    </div>

    <!-- 日期头 -->
    <div class="wx-head">
      <div class="wx-hero">
        <div class="wx-day">{{ d.getDate() }}</div>
        <div class="wx-datecol">
          <div class="wx-date">{{ d.getFullYear() }} 年 {{ d.getMonth() + 1 }} 月</div>
          <div class="wx-week">
            <b>{{ weekday }}</b>
            <span v-if="info.jieQi" class="wx-jq">{{ info.jieQi }}</span>
            <span v-else-if="info.festivals.length" class="wx-jq">{{ info.festivals[0] }}</span>
          </div>
          <div class="wx-lunar">
            {{ info.full }} <span class="wx-sep">·</span> {{ info.yearGz }}
          </div>
        </div>

        <!-- 纪念日：将来倒数，过去正数 -->
        <button
          class="wx-cd"
          :class="countdown ? `is-${countdown.mode}` : 'is-empty'"
          :title="countdown ? `${countdown.title} · ${countdown.date}（点击修改）` : '点击设置一个时间节点'"
          @click="openCountdown"
        >
          <template v-if="countdown">
            <div class="wx-cd-k">
              <template v-if="countdown.mode === 'future'">距离 {{ countdown.title }}</template>
              <template v-else-if="countdown.mode === 'past'">{{ countdown.title }} 已过</template>
              <template v-else>{{ countdown.title }}</template>
            </div>
            <div v-if="countdown.mode === 'today'" class="wx-cd-today">就是今天</div>
            <div v-else class="wx-cd-v">
              <b>{{ countdown.days }}</b><i>天</i>
            </div>
          </template>
          <template v-else>
            <div class="wx-cd-k">时间节点</div>
            <div class="wx-cd-set">点击设置</div>
          </template>
        </button>

        <div class="wx-right">
          <div class="wx-clock">{{ clock }}</div>
          <div class="wx-donerow" :class="{ has: doneCount }">今日完成 {{ doneCount }}</div>
        </div>
      </div>

      <!-- 周数 / 年内剩余 / 今日待办 -->
      <div class="wx-stats">
        <div class="wx-stat">
          <div class="wx-stat-k">本年</div>
          <div class="wx-stat-v">第 <b>{{ weekNo }}</b> 周</div>
        </div>
        <div class="wx-stat">
          <div class="wx-stat-k">年内还剩</div>
          <div class="wx-stat-v" :class="{ warn: daysLeft <= 30 }">
            <b>{{ daysLeft }}</b> 天
          </div>
        </div>
        <div class="wx-stat">
          <div class="wx-stat-k">今日待办</div>
          <div class="wx-stat-v" :class="{ clear: !openCount }">
            <template v-if="openCount"><b>{{ openCount }}</b> 件</template>
            <template v-else>已清空</template>
          </div>
        </div>
      </div>
    </div>

    <!-- 长期目标 -->
    <section
      class="wx-goals"
      title="右键新增目标 · 点某一行记进度"
      @contextmenu.prevent="openGoalForm(null)"
    >
      <div class="wx-goals-body">
        <div
          v-for="g in state.goals"
          :key="g.id"
          class="wx-goal"
          :style="{ '--gc': g.color }"
          :title="`${g.name}　${g.current} / ${g.target}${g.unit}　点击记进度 · 右键修改`"
          @click="openProgress(g)"
          @contextmenu.stop.prevent="openGoalForm(g)"
        >
          <div class="wx-goal-top">
            <span class="wx-goal-name">{{ g.name }}</span>

            <template v-if="progressFor === g.id">
              <input
                :ref="setProgressEl"
                v-model="progressValue"
                class="wx-goal-input"
                type="number"
                step="any"
                placeholder="+数值"
                @click.stop
                @keyup.enter="submitProgress(g)"
                @keyup.esc="cancelProgress"
                @blur="submitProgress(g)"
              />
            </template>
            <template v-else>
              <span class="wx-goal-pct"><b>{{ pct(g) }}</b><i>%</i></span>
            </template>
          </div>

          <div class="wx-goal-bar">
            <i :style="{ width: barPct(g) + '%', background: g.color }"></i>
          </div>
        </div>

        <div v-if="!state.goals.length" class="wx-goals-empty">
          右键这里，添加一个长期目标
        </div>
      </div>
    </section>

    <div v-if="unsorted.length" class="wx-unsorted">
      {{ unsorted.length }} 条未分象限，已暂放在「重要且紧急」
    </div>

    <!-- 四象限 -->
    <div class="wx-grid">
      <section
        v-for="q in QUADRANTS"
        :key="q.id"
        class="wx-quad"
        :style="{ '--qc': q.color }"
        @contextmenu.prevent="openCompose(q.id)"
      >
        <header class="wx-quad-head">
          <span class="wx-qdot"></span>
          <span class="wx-qname">{{ q.name }}</span>
          <span class="wx-qn">{{ inQuadrant(q.id).filter((t) => !t.done).length }}</span>
        </header>

        <div class="wx-quad-body">
          <article
            v-for="t in inQuadrant(q.id)"
            :key="t.id"
            class="wx-card"
            :class="[`is-${stateOf(t)}`, { ringed: ringed(t) }]"
            :title="`${t.title}\n双击修改`"
            @dblclick="editTodo(t)"
          >
            <div class="wx-card-title">{{ t.title }}</div>

            <div class="wx-card-meta">
              <span v-if="t.time" class="wx-chip time">{{ t.time }}</span>

              <span v-if="stateOf(t) === 'running'" class="wx-chip run">
                {{ watchLabel(t) }}
              </span>
              <template v-else-if="t.done">
                <span v-if="doneLabel(t)" class="wx-chip done">用时 {{ doneLabel(t) }}</span>
              </template>
              <span v-else-if="leftLabel(t)" class="wx-chip urgent">{{ leftLabel(t) }}</span>
              <span v-else-if="t.elapsedMs > 0" class="wx-chip paused">
                已计 {{ doneLabel(t) }}
              </span>

              <div class="wx-acts">
                <button
                  v-if="!t.done"
                  class="wx-act"
                  :class="{ on: t.startedAt }"
                  :title="t.startedAt ? '结束计时' : '启动计时'"
                  @click.stop="actions.toggleTimer(t)"
                >
                  <Icon :name="t.startedAt ? 'stop' : 'play'" :size="10" />
                </button>
                <button
                  class="wx-act check"
                  :class="{ on: t.done }"
                  :title="t.done ? '取消完成' : '完成'"
                  @click.stop="actions.toggleTodo(t.id)"
                >
                  <Icon name="check" :size="10" />
                </button>
              </div>
            </div>
          </article>

          <div v-if="!inQuadrant(q.id).length" class="wx-empty">右键新增</div>
        </div>
      </section>
    </div>

    <!-- 待办：新增 / 编辑 -->
    <div v-if="compose" class="wx-mask" @click.self="compose = null">
      <div class="wx-form" @keyup.esc="compose = null">
        <div class="wx-form-head">
          <span
            class="wx-qdot"
            :style="{ '--qc': QUADRANTS.find((q) => q.id === compose.quadrant)?.color }"
          ></span>
          {{ compose.id ? '修改待办' : '新增到' }}「{{
            QUADRANTS.find((q) => q.id === compose.quadrant)?.name
          }}」
        </div>

        <input
          ref="titleEl"
          v-model="compose.title"
          class="wx-input"
          placeholder="要做什么？回车保存"
          @keyup.enter="saveCompose"
        />

        <div class="wx-form-row">
          <label>
            <span>日期</span>
            <input v-model="compose.date" class="wx-input" type="date" />
          </label>
          <label>
            <span>时间（可空）</span>
            <input v-model="compose.time" class="wx-input" type="time" />
          </label>
        </div>

        <div class="wx-form-pills">
          <button
            v-for="q in QUADRANTS"
            :key="q.id"
            class="wx-pill"
            :class="{ on: compose.quadrant === q.id }"
            :style="{ '--qc': q.color }"
            @click="compose.quadrant = q.id"
          >
            {{ q.name }}
          </button>
        </div>

        <div v-if="composeHint" class="wx-form-hint">{{ composeHint }}</div>

        <div class="wx-form-acts">
          <button v-if="compose.id" class="wx-btn danger" @click="deleteCompose">删除</button>
          <button class="wx-btn" @click="compose = null">取消</button>
          <button class="wx-btn primary" @click="saveCompose">保存</button>
        </div>
      </div>
    </div>

    <!-- 目标：新增 / 编辑 -->
    <div v-if="goalForm" class="wx-mask" @click.self="goalForm = null">
      <div class="wx-form" @keyup.esc="goalForm = null">
        <div class="wx-form-head">{{ goalForm.id ? '修改目标' : '新建长期目标' }}</div>

        <input
          ref="goalNameEl"
          v-model="goalForm.name"
          class="wx-input"
          placeholder="目标名称，比如「读完 30 本书」"
          @keyup.enter="saveGoal"
        />

        <div class="wx-form-row3">
          <label>
            <span>总值</span>
            <input v-model="goalForm.target" class="wx-input" type="number" step="any" min="0.01" />
          </label>
          <label>
            <span>单位</span>
            <input v-model="goalForm.unit" class="wx-input" placeholder="本" maxlength="8" />
          </label>
          <label>
            <span>当前</span>
            <input v-model="goalForm.current" class="wx-input" type="number" step="any" />
          </label>
        </div>

        <div class="wx-form-hint muted">
          日常记进度不用来这儿：直接点目标那一行，填个增量数值回车就行。
        </div>

        <div class="wx-form-acts">
          <button v-if="goalForm.id" class="wx-btn danger" @click="deleteGoal">删除</button>
          <button class="wx-btn" @click="goalForm = null">取消</button>
          <button class="wx-btn primary" @click="saveGoal">保存</button>
        </div>
      </div>
    </div>

    <!-- 纪念日设置 -->
    <div v-if="cdForm" class="wx-mask" @click.self="cdForm = null">
      <div class="wx-form" @keyup.esc="cdForm = null">
        <div class="wx-form-head">时间节点</div>

        <input
          ref="cdTitleEl"
          v-model="cdForm.title"
          class="wx-input"
          placeholder="名称，比如「春节」「入职」"
          maxlength="12"
          @keyup.enter="saveCountdown"
        />

        <div class="wx-form-row">
          <label>
            <span>日期</span>
            <input v-model="cdForm.date" class="wx-input" type="date" />
          </label>
          <label>
            <span>算法</span>
            <div class="wx-cd-mode">
              {{
                !cdForm.date
                  ? '—'
                  : daysBetween(todayYmd(), cdForm.date) > 0
                    ? '倒数计时'
                    : daysBetween(todayYmd(), cdForm.date) < 0
                      ? '正数计时'
                      : '就是今天'
              }}
            </div>
          </label>
        </div>

        <div class="wx-form-hint muted">
          日期在将来就倒数还差几天，在过去就正数已经过了几天，以今天为基准每天自动更新。
        </div>

        <div class="wx-form-acts">
          <button
            v-if="state.settings?.countdown?.date"
            class="wx-btn danger"
            @click="clearCountdown"
          >
            清除
          </button>
          <button class="wx-btn" @click="cdForm = null">取消</button>
          <button class="wx-btn primary" @click="saveCountdown">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
/* 小组件是独立窗口，样式不走主界面那套布局，单独写在这里 */
.widget-body {
  background: transparent;
}

.wx {
  height: 100vh;
  display: flex;
  flex-direction: column;
  border-radius: 16px;
  background: linear-gradient(160deg, var(--bg-elev) 0%, var(--bg) 100%);
  border: 1px solid var(--border);
  overflow: hidden;
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.45);
  font-feature-settings: 'tnum' 1;
}

/* ---------- 顶栏 ---------- */
.wx-bar {
  display: flex;
  align-items: center;
  height: 26px;
  padding: 0 5px;
  gap: 1px;
  flex: none;
}
.wx-drag {
  flex: 1;
  height: 100%;
  -webkit-app-region: drag;
}
.wx.locked .wx-drag {
  -webkit-app-region: no-drag;
}
.wx-icon {
  width: 21px;
  height: 21px;
  border-radius: 6px;
  display: grid;
  place-items: center;
  color: var(--text-faint);
  -webkit-app-region: no-drag;
  transition: background 0.12s, color 0.12s;
}
.wx-icon:hover {
  background: var(--bg-hover);
  color: var(--text);
}

/* ---------- 日期头 ---------- */
.wx-head {
  display: flex;
  flex-direction: column;
  gap: 11px;
  padding: 2px 14px 11px;
  flex: none;
}

/* 主行：大日期 + 年月/星期农历 + 时钟 */
.wx-hero {
  display: flex;
  align-items: center;
  gap: 10px;
}
.wx-day {
  font-size: 46px;
  font-weight: 700;
  line-height: 0.82;
  letter-spacing: -2px;
  background: linear-gradient(150deg, var(--accent), #82b4ff);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  flex: none;
}
.wx-datecol {
  min-width: 0;
  flex: 1;
}
.wx-date {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.3px;
}
.wx-week {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 4px;
  white-space: nowrap;
}
.wx-week b {
  font-size: 11.5px;
  color: var(--text-dim);
  font-weight: 600;
}
.wx-lunar {
  font-size: 10.5px;
  color: var(--text-faint);
  margin-top: 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.wx-sep {
  opacity: 0.45;
  margin: 0 1px;
}

/* ---------- 纪念日：倒计时 / 正计时 ---------- */
.wx-cd {
  flex: none;
  padding: 5px 9px 7px;
  border-radius: 10px;
  background: var(--bg-soft);
  border: 1px solid transparent;
  text-align: center;
  transition: background 0.14s, border-color 0.14s;
}
.wx-cd:hover {
  background: var(--bg-hover);
  border-color: var(--border);
}
.wx-cd-k {
  font-size: 9.5px;
  color: var(--text-faint);
  letter-spacing: 0.4px;
  white-space: nowrap;
  max-width: 92px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.wx-cd-v {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 2px;
  margin-top: 1px;
}
.wx-cd-v b {
  font-size: 21px;
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: -0.6px;
  font-variant-numeric: tabular-nums;
  /* 预留 5 位数字的宽度，天数增减时整行不跳动 */
  min-width: 5ch;
  text-align: center;
}
.wx-cd-v i {
  font-style: normal;
  font-size: 10px;
  color: var(--text-faint);
}
.wx-cd.is-future .wx-cd-v b {
  color: var(--accent);
}
.wx-cd.is-past .wx-cd-v b {
  color: var(--ok);
}
.wx-cd-today {
  font-size: 15px;
  font-weight: 700;
  color: var(--warn);
  margin-top: 3px;
  min-width: 5ch;
}
.wx-cd-set {
  font-size: 12px;
  color: var(--text-faint);
  margin-top: 4px;
  min-width: 5ch;
}
.wx-cd-mode {
  background: var(--bg-soft);
  border: 1px solid var(--border);
  border-radius: 7px;
  padding: 6px 8px;
  font-size: 12px;
  color: var(--text-dim);
  text-align: center;
}
.wx-jq {
  color: var(--ok);
  background: rgba(62, 207, 142, 0.13);
  border-radius: 4px;
  padding: 0 5px;
  font-size: 10px;
  line-height: 15px;
  margin-left: 1px;
}
.wx-right {
  text-align: right;
  flex: none;
}
.wx-clock {
  font-size: 27px;
  font-weight: 600;
  line-height: 0.92;
  letter-spacing: 0.4px;
  font-variant-numeric: tabular-nums;
}
.wx-donerow {
  font-size: 10px;
  color: var(--text-faint);
  margin-top: 7px;
}
.wx-donerow.has {
  color: var(--ok);
}

/* 统计带：本年第几周 / 年内还剩 / 今日待办 */
.wx-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  background: var(--bg-soft);
  border-radius: 10px;
  padding: 7px 0 8px;
}
.wx-stat {
  text-align: center;
  padding: 0 4px;
}
.wx-stat + .wx-stat {
  border-left: 1px solid var(--border-soft);
}
.wx-stat-k {
  font-size: 9.5px;
  color: var(--text-faint);
  letter-spacing: 0.6px;
}
.wx-stat-v {
  font-size: 10.5px;
  color: var(--text-dim);
  margin-top: 3px;
  white-space: nowrap;
}
.wx-stat-v b {
  font-size: 17px;
  font-weight: 700;
  color: var(--accent);
  margin: 0 2px;
  letter-spacing: -0.3px;
}
/* 年底了给个暖色提示 */
.wx-stat-v.warn b {
  color: var(--warn);
}
.wx-stat-v.clear {
  color: var(--ok);
  font-size: 13px;
  font-weight: 600;
  margin-top: 2px;
}

/* ---------- 长期目标 ---------- */
.wx-goals {
  margin: 0 14px 10px;
  flex: none;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.wx-goals-body {
  max-height: 116px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.wx-goals-body::-webkit-scrollbar {
  width: 4px;
}
.wx-goal {
  padding: 6px 8px 7px;
  border-radius: 8px;
  background: var(--bg-soft);
  cursor: pointer;
  transition: background 0.12s;
}
.wx-goal:hover {
  background: var(--bg-hover);
}
.wx-goal-top {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-bottom: 5px;
}
.wx-goal-name {
  font-size: 11.5px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}
.wx-goal-pct {
  flex: none;
  color: var(--gc);
  letter-spacing: -0.3px;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}
.wx-goal-pct b {
  font-size: 14px;
  font-weight: 700;
}
.wx-goal-pct i {
  font-style: normal;
  font-size: 9px;
  font-weight: 600;
  opacity: 0.6;
  margin-left: 1px;
}
.wx-goal-input {
  width: 78px;
  flex: none;
  background: var(--bg-elev);
  border: 1px solid var(--accent);
  border-radius: 5px;
  padding: 1px 6px;
  font-size: 11px;
  color: var(--text);
  outline: none;
}
/* 轨道做一点内凹感，填充带渐变和辉光，末端加高光收尾 */
.wx-goal-bar {
  height: 6px;
  border-radius: 99px;
  background: rgba(127, 140, 165, 0.2);
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.22), inset 0 0 0 1px rgba(255, 255, 255, 0.04);
  overflow: hidden;
}
.wx-goal-bar i {
  display: block;
  position: relative;
  height: 100%;
  border-radius: 99px;
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--gc) 42%, transparent),
    var(--gc) 76%,
    color-mix(in srgb, var(--gc) 70%, #fff)
  );
  box-shadow: 0 0 9px color-mix(in srgb, var(--gc) 55%, transparent);
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}
.wx-goal-bar i::after {
  content: '';
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 5px;
  border-radius: 99px;
  background: rgba(255, 255, 255, 0.78);
  filter: blur(1.5px);
}
.wx-goals-empty {
  padding: 10px 0;
  text-align: center;
  font-size: 10px;
  color: var(--text-faint);
  opacity: 0.6;
  border: 1px dashed var(--border);
  border-radius: 8px;
}

.wx-unsorted {
  margin: 0 14px 8px;
  padding: 5px 9px;
  border-radius: 7px;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 10px;
  flex: none;
}

/* ---------- 四象限 ---------- */
.wx-grid {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 8px;
  padding: 0 14px 14px;
  min-height: 0;
}
.wx-quad {
  display: flex;
  flex-direction: column;
  min-height: 0;
  border-radius: 11px;
  background: var(--bg-elev);
  border: 1px solid var(--border-soft);
  overflow: hidden;
  position: relative;
}
/* 顶部一条象限色，比整块上色克制 */
.wx-quad::before {
  content: '';
  position: absolute;
  inset: 0 0 auto 0;
  height: 2px;
  background: var(--qc);
  opacity: 0.85;
}
.wx-quad-head {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 8px 9px 6px;
  flex: none;
}
.wx-qdot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--qc);
  flex: none;
}
.wx-qname {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.2px;
  white-space: nowrap;
}
.wx-qn {
  margin-left: auto;
  font-size: 10px;
  color: var(--text-faint);
  min-width: 12px;
  text-align: right;
}
.wx-quad-body {
  flex: 1;
  overflow-y: auto;
  padding: 0 6px 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-height: 0;
}
.wx-quad-body::-webkit-scrollbar {
  width: 4px;
}

/* ---------- 待办卡片 ---------- */
.wx-card {
  border-radius: 8px;
  padding: 6px 7px 5px;
  background: var(--bg-soft);
  border-left: 2px solid transparent;
  transition: background 0.15s, border-color 0.15s;
}
.wx-card-title {
  font-size: 11.5px;
  line-height: 1.4;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  word-break: break-word;
}
.wx-card-meta {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
  min-height: 16px;
}

.wx-chip {
  font-size: 9.5px;
  line-height: 15px;
  padding: 0 5px;
  border-radius: 4px;
  background: rgba(127, 140, 165, 0.16);
  color: var(--text-faint);
  flex: none;
  white-space: nowrap;
}
.wx-chip.time {
  color: var(--accent);
  background: var(--accent-soft);
}
.wx-chip.run {
  color: var(--run);
  background: var(--run-bg);
  font-weight: 600;
  letter-spacing: 0.4px;
}
.wx-chip.urgent {
  color: var(--urgent);
  background: var(--urgent-bg);
  font-weight: 600;
}
.wx-chip.done {
  color: var(--ok);
  background: rgba(62, 207, 142, 0.13);
}

.wx-acts {
  margin-left: auto;
  display: flex;
  gap: 3px;
  flex: none;
}
.wx-act {
  width: 18px;
  height: 18px;
  border-radius: 5px;
  display: grid;
  place-items: center;
  color: var(--text-faint);
  background: rgba(127, 140, 165, 0.12);
  transition: background 0.12s, color 0.12s;
}
.wx-act:hover {
  color: var(--text);
  background: var(--bg-hover);
}
.wx-act.on {
  background: var(--run);
  color: #fff;
}
.wx-act.check.on {
  background: var(--accent);
  color: #fff;
}

/* —— 三种状态 —— */
.wx-card.is-running {
  background: linear-gradient(180deg, var(--run-bg), var(--run-bg-2));
  border-left-color: var(--run);
}
.wx-card.is-urgent {
  background: linear-gradient(180deg, var(--urgent-bg), var(--urgent-bg-2));
  border-left-color: var(--urgent);
}
/* 计时中又临期：底色留给绿（那是点击的即时反馈），临期用外圈玫红描边表达 */
.wx-card.ringed {
  box-shadow: 0 0 0 1px var(--urgent);
}
.wx-card.is-done {
  opacity: 0.5;
  border-left-color: transparent;
}
.wx-card.is-done .wx-card-title {
  text-decoration: line-through;
  color: var(--text-faint);
}

.wx-empty {
  flex: 1;
  display: grid;
  place-items: center;
  color: var(--text-faint);
  font-size: 10px;
  opacity: 0.5;
}

/* ---------- 浮层表单 ---------- */
.wx-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(2px);
  display: grid;
  place-items: center;
  padding: 14px;
  z-index: 20;
}
.wx-form {
  width: 100%;
  background: var(--bg-elev);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 12px;
  box-shadow: var(--shadow);
}
.wx-form-head {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--text-dim);
  margin-bottom: 9px;
}
.wx-input {
  width: 100%;
  background: var(--bg-soft);
  border: 1px solid var(--border);
  border-radius: 7px;
  padding: 6px 8px;
  font-size: 12px;
  color: var(--text);
  outline: none;
}
.wx-input:focus {
  border-color: var(--accent);
}
.wx-form-row,
.wx-form-row3 {
  display: grid;
  gap: 7px;
  margin-top: 8px;
}
.wx-form-row {
  grid-template-columns: 1fr 1fr;
}
.wx-form-row3 {
  grid-template-columns: 1.1fr 0.8fr 1fr;
}
.wx-form-row label,
.wx-form-row3 label {
  display: block;
  min-width: 0;
}
.wx-form-row span,
.wx-form-row3 span {
  display: block;
  font-size: 10px;
  color: var(--text-faint);
  margin-bottom: 3px;
}
.wx-form-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 9px;
}
.wx-pill {
  font-size: 10px;
  padding: 3px 8px;
  border-radius: 11px;
  border: 1px solid var(--border);
  color: var(--text-dim);
}
.wx-pill.on {
  border-color: var(--qc);
  color: var(--qc);
  background: color-mix(in srgb, var(--qc) 14%, transparent);
}
.wx-form-hint {
  margin-top: 8px;
  font-size: 10px;
  color: var(--warn);
  line-height: 1.5;
}
.wx-form-hint.muted {
  color: var(--text-faint);
}
.wx-form-acts {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
  margin-top: 11px;
}
.wx-btn {
  padding: 5px 13px;
  border-radius: 7px;
  font-size: 11px;
  border: 1px solid var(--border);
  color: var(--text-dim);
}
.wx-btn:hover {
  background: var(--bg-hover);
  color: var(--text);
}
.wx-btn.primary {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
  font-weight: 600;
}
.wx-btn.danger {
  margin-right: auto;
  border-color: transparent;
  color: var(--danger);
}
.wx-btn.danger:hover {
  background: rgba(255, 93, 93, 0.12);
  color: var(--danger);
}
</style>
