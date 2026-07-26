<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { actions, PRIORITIES, QUADRANTS, REMIND_OPTIONS, REPEATS, state } from '../store.js'
import { todayYmd } from '../lib/date.js'

const draft = ref(blank())
const titleEl = ref(null)

function blank() {
  return {
    id: null,
    title: '',
    note: '',
    // 默认就是今天；从日历某一格点进来的会用那一格的日期覆盖掉
    date: todayYmd(),
    time: '',
    listId: state.activeListId || state.lists[0]?.id || null,
    priority: 0,
    quadrant: 0,
    repeat: 'none',
    remindBefore: null
  }
}

// state.editing 是 {} 表示新建，带 id 表示编辑
watch(
  () => state.editing,
  (v) => {
    if (!v) return
    draft.value = { ...blank(), ...v, time: v.time || '' }
  },
  { immediate: true }
)

onMounted(() => titleEl.value?.focus())

const isEdit = computed(() => !!draft.value.id)

async function save() {
  const payload = {
    title: draft.value.title.trim(),
    note: draft.value.note,
    date: draft.value.date || null,
    time: draft.value.time || null,
    listId: draft.value.listId,
    priority: Number(draft.value.priority),
    quadrant: Number(draft.value.quadrant),
    repeat: draft.value.repeat,
    remindBefore: draft.value.remindBefore
  }
  if (!payload.title) return
  // 没给时间就提醒不了，顺手清掉，免得用户以为设了会响
  if (!payload.time) payload.remindBefore = null

  if (isEdit.value) await actions.updateTodo(draft.value.id, payload)
  else await actions.createTodo(payload)
  actions.closeEditor()
}

async function del() {
  if (!isEdit.value) return actions.closeEditor()
  await actions.removeTodo(draft.value.id)
  actions.closeEditor()
}
</script>

<template>
  <div class="mask" @click.self="actions.closeEditor()">
    <div class="dialog" @keyup.esc="actions.closeEditor()">
      <h3>{{ isEdit ? '编辑待办' : '新建待办' }}</h3>

      <div class="field">
        <label>标题</label>
        <input ref="titleEl" v-model="draft.title" placeholder="要做什么" @keyup.enter="save" />
      </div>

      <div class="field">
        <label>备注</label>
        <textarea v-model="draft.note" placeholder="补充说明（可留空）"></textarea>
      </div>

      <div class="row2">
        <div class="field">
          <label>日期</label>
          <input v-model="draft.date" type="date" />
        </div>
        <div class="field">
          <label>时间</label>
          <input v-model="draft.time" type="time" />
        </div>
      </div>

      <div class="row2">
        <div class="field">
          <label>所属清单</label>
          <select v-model="draft.listId">
            <option v-for="l in state.lists" :key="l.id" :value="l.id">{{ l.name }}</option>
          </select>
        </div>
        <div class="field">
          <label>重复</label>
          <select v-model="draft.repeat">
            <option v-for="r in REPEATS" :key="r.id" :value="r.id">{{ r.name }}</option>
          </select>
        </div>
      </div>

      <div class="field">
        <label>提醒{{ draft.time ? '' : '（先设时间才能提醒）' }}</label>
        <select v-model="draft.remindBefore" :disabled="!draft.time">
          <option v-for="o in REMIND_OPTIONS" :key="String(o.id)" :value="o.id">{{ o.name }}</option>
        </select>
      </div>

      <div class="field">
        <label>优先级</label>
        <div class="pills">
          <button
            v-for="p in PRIORITIES"
            :key="p.id"
            class="pill"
            :class="{ on: Number(draft.priority) === p.id }"
            @click="draft.priority = p.id"
          >
            <span
              v-if="p.color !== 'transparent'"
              class="dot"
              style="display: inline-block; margin-right: 5px"
              :style="{ background: p.color }"
            ></span>
            {{ p.name }}
          </button>
        </div>
      </div>

      <div class="field">
        <label>四象限</label>
        <div class="pills">
          <button
            class="pill"
            :class="{ on: Number(draft.quadrant) === 0 }"
            @click="draft.quadrant = 0"
          >
            未分类
          </button>
          <button
            v-for="q in QUADRANTS"
            :key="q.id"
            class="pill"
            :class="{ on: Number(draft.quadrant) === q.id }"
            @click="draft.quadrant = q.id"
          >
            {{ q.name }}
          </button>
        </div>
      </div>

      <div class="dialog-actions">
        <button v-if="isEdit" class="danger" @click="del">删除</button>
        <button class="ghost" @click="actions.closeEditor()">取消</button>
        <button class="primary" @click="save">保存</button>
      </div>
    </div>
  </div>
</template>
