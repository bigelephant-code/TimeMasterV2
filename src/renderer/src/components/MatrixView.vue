<script setup>
import { computed, ref } from 'vue'
import TodoItem from './TodoItem.vue'
import { actions, QUADRANTS, state, visibleTodos } from '../store.js'

/**
 * 艾森豪威尔四象限。
 * 象限不是独立的一份数据，就是待办上的 quadrant 字段，拖动 = 改这个字段。
 */

const dragOver = ref(0)

const bucket = (q) => computed(() => visibleTodos.value.filter((t) => !t.done && (t.quadrant || 0) === q))

const q1 = bucket(1)
const q2 = bucket(2)
const q3 = bucket(3)
const q4 = bucket(4)
const unsorted = computed(() => visibleTodos.value.filter((t) => !t.done && !t.quadrant))

const rowsOf = (id) => ({ 1: q1, 2: q2, 3: q3, 4: q4 })[id].value

function onDrop(e, quadrant) {
  e.preventDefault()
  dragOver.value = 0
  const id = e.dataTransfer.getData('text/todo-id')
  if (id) actions.updateTodo(id, { quadrant })
}
</script>

<template>
  <div class="main">
    <div class="toolbar">
      <h2>四象限</h2>
      <span style="color: var(--text-faint); font-size: 12px">拖动待办到对应象限</span>
      <div style="flex: 1"></div>
      <span v-if="unsorted.length" style="color: var(--text-dim); font-size: 12px">
        未分类 {{ unsorted.length }} 条
      </span>
      <button class="primary" @click="actions.openEditor({ quadrant: 1 })">新建</button>
    </div>

    <!-- 未分类待办的暂存区，拖出去归位 -->
    <div
      v-if="unsorted.length"
      style="
        display: flex;
        gap: 6px;
        padding: 8px 12px;
        overflow-x: auto;
        border-bottom: 1px solid var(--border-soft);
      "
    >
      <div
        v-for="t in unsorted"
        :key="t.id"
        draggable="true"
        class="chip"
        style="cursor: grab; padding: 5px 10px; font-size: 12px; flex: none"
        @dragstart="(e) => e.dataTransfer.setData('text/todo-id', t.id)"
        @click="actions.openEditor(t)"
      >
        {{ t.title }}
      </div>
    </div>

    <div class="matrix">
      <div
        v-for="q in QUADRANTS"
        :key="q.id"
        class="quad"
        :class="{ drop: dragOver === q.id }"
        @dragover.prevent="dragOver = q.id"
        @dragleave="dragOver = 0"
        @drop="(e) => onDrop(e, q.id)"
        @contextmenu.prevent="actions.openEditor({ quadrant: q.id })"
      >
        <div class="quad-head">
          <span class="dot" :style="{ background: q.color }"></span>
          <span class="name">{{ q.name }}</span>
          <span class="hint">{{ q.hint }}</span>
          <span class="n">{{ rowsOf(q.id).length }}</span>
        </div>
        <div class="quad-body">
          <TodoItem v-for="t in rowsOf(q.id)" :key="t.id" :todo="t" show-date draggable timer />
          <div v-if="!rowsOf(q.id).length" class="empty" style="padding: 16px 8px">
            把待办拖进来
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
