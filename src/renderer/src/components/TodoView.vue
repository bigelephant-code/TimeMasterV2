<script setup>
import { computed, ref } from 'vue'
import Icon from './Icon.vue'
import TodoItem from './TodoItem.vue'
import { actions, state, visibleTodos } from '../store.js'
import { todayYmd } from '../lib/date.js'

const quickText = ref('')

const title = computed(() => {
  if (!state.activeListId) return '全部待办'
  return state.lists.find((l) => l.id === state.activeListId)?.name || '待办'
})

/** 逾期 / 今天 / 未来 / 无日期 / 已完成，分组比一条长列表好扫 */
const groups = computed(() => {
  const today = todayYmd()
  const buckets = {
    overdue: [],
    today: [],
    upcoming: [],
    someday: [],
    done: []
  }
  for (const t of visibleTodos.value) {
    if (t.done) buckets.done.push(t)
    else if (!t.date) buckets.someday.push(t)
    else if (t.date < today) buckets.overdue.push(t)
    else if (t.date === today) buckets.today.push(t)
    else buckets.upcoming.push(t)
  }
  return [
    { key: 'overdue', name: '已逾期', rows: buckets.overdue },
    { key: 'today', name: '今天', rows: buckets.today },
    { key: 'upcoming', name: '将来', rows: buckets.upcoming },
    { key: 'someday', name: '没定日期', rows: buckets.someday },
    { key: 'done', name: '已完成', rows: buckets.done }
  ].filter((g) => g.rows.length)
})

async function quickAdd() {
  const text = quickText.value
  quickText.value = ''
  await actions.quickAdd(text, null)
}

async function renameList() {
  const list = state.lists.find((l) => l.id === state.activeListId)
  if (!list) return
  const name = window.prompt('清单名称', list.name)
  if (name && name.trim()) await actions.renameList(list.id, name.trim())
}

async function removeList() {
  if (!state.activeListId) return
  const list = state.lists.find((l) => l.id === state.activeListId)
  if (!window.confirm(`删除清单「${list?.name}」？里面的待办会移到第一个清单。`)) return
  const res = await actions.removeList(state.activeListId)
  if (res?.ok === false) window.alert(res.reason)
  else state.activeListId = null
}
</script>

<template>
  <div class="main">
    <div class="toolbar">
      <h2>{{ title }}</h2>

      <template v-if="state.activeListId">
        <button class="tbtn" title="重命名" @click="renameList"><Icon name="settings" :size="14" /></button>
        <button class="tbtn" title="删除清单" @click="removeList"><Icon name="trash" :size="14" /></button>
      </template>

      <div style="flex: 1"></div>

      <div class="seg">
        <button
          v-for="f in [
            { id: 'all', n: '全部' },
            { id: 'active', n: '未完成' },
            { id: 'done', n: '已完成' }
          ]"
          :key="f.id"
          :class="{ active: state.filter === f.id }"
          @click="state.filter = f.id"
        >
          {{ f.n }}
        </button>
      </div>

      <button class="ghost" @click="actions.clearCompleted(state.activeListId)">清除已完成</button>
      <button class="primary" @click="actions.openEditor({})">新建</button>
    </div>

    <div class="quick" style="padding: 10px 16px; border-bottom: 1px solid var(--border-soft); display: flex; gap: 8px">
      <input
        v-model="quickText"
        style="flex: 1"
        placeholder="快速添加一条待办，回车保存"
        @keyup.enter="quickAdd"
      />
    </div>

    <div class="todo-list">
      <template v-for="g in groups" :key="g.key">
        <div class="group-title">{{ g.name }} · {{ g.rows.length }}</div>
        <TodoItem
          v-for="t in g.rows"
          :key="t.id"
          :todo="t"
          show-date
          :show-list="!state.activeListId"
        />
      </template>

      <div v-if="!groups.length" class="empty">
        还没有待办<br />在上面输入框敲一条试试
      </div>
    </div>
  </div>
</template>
