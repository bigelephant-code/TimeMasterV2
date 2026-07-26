<script setup>
import { computed } from 'vue'
import Icon from './Icon.vue'
import { actions, listById, PRIORITIES } from '../store.js'
import { relativeLabel, todayYmd } from '../lib/date.js'
import { now } from '../lib/clock.js'
import {
  durationLabel,
  elapsedMsOf,
  isUrgentRinged,
  remainingLabel,
  stopwatchLabel,
  todoState
} from '../lib/todoState.js'

const props = defineProps({
  todo: { type: Object, required: true },
  showDate: { type: Boolean, default: false },
  showList: { type: Boolean, default: false },
  draggable: { type: Boolean, default: false },
  /** 显示启动/结束计时按钮 —— 四象限里开着 */
  timer: { type: Boolean, default: false }
})

const priColor = (p) => PRIORITIES.find((x) => x.id === p)?.color || 'transparent'
const overdue = (t) => !t.done && t.date && t.date < todayYmd()

const state = computed(() => todoState(props.todo, now.value))
const ringed = computed(() => isUrgentRinged(props.todo, now.value))
const watchText = computed(() => stopwatchLabel(elapsedMsOf(props.todo, now.value)))
const spentText = computed(() => durationLabel(props.todo.elapsedMs))
const leftText = computed(() => remainingLabel(props.todo, now.value))

function onDragStart(e) {
  e.dataTransfer.setData('text/todo-id', props.todo.id)
  e.dataTransfer.effectAllowed = 'move'
}
</script>

<template>
  <div
    class="todo"
    :class="[`st-${state}`, { done: todo.done, ringed }]"
    :draggable="draggable"
    @click="actions.openEditor(todo)"
    @dragstart="onDragStart"
  >
    <span v-if="todo.priority" class="pri" :style="{ background: priColor(todo.priority) }"></span>

    <button
      v-if="timer && !todo.done"
      class="runbtn"
      :class="{ on: todo.startedAt }"
      :title="todo.startedAt ? '结束计时' : '启动计时'"
      @click.stop="actions.toggleTimer(todo)"
    >
      <Icon :name="todo.startedAt ? 'stop' : 'play'" :size="10" />
    </button>

    <button class="check" :title="todo.done ? '取消完成' : '标记完成'" @click.stop="actions.toggleTodo(todo.id)">
      <Icon v-if="todo.done" name="check" :size="10" />
    </button>

    <div class="body">
      <div class="title">{{ todo.title || '(无标题)' }}</div>
      <div class="tags">
        <span v-if="showDate && todo.date" :class="{ overdue: overdue(todo) }">
          {{ relativeLabel(todo.date) }}
        </span>
        <span v-if="todo.time" style="display: inline-flex; align-items: center; gap: 3px">
          <Icon name="clock" :size="11" />{{ todo.time }}
        </span>

        <!-- 计时中跳秒表；完成后显示总耗时；停了但跑过的显示已计时长 -->
        <span v-if="state === 'running'" class="tag-run">{{ watchText }}</span>
        <span v-else-if="todo.done && spentText" class="tag-spent">用时 {{ spentText }}</span>
        <span v-else-if="spentText" class="tag-paused">已计 {{ spentText }}</span>

        <span v-if="!todo.done && leftText" class="tag-urgent">{{ leftText }}</span>

        <span
          v-if="todo.remindBefore !== null && todo.remindBefore !== undefined"
          style="display: inline-flex; align-items: center"
        >
          <Icon name="bell" :size="11" />
        </span>
        <span
          v-if="todo.repeat && todo.repeat !== 'none'"
          style="display: inline-flex; align-items: center"
        >
          <Icon name="repeat" :size="11" />
        </span>
        <span v-if="showList && listById.get(todo.listId)">
          {{ listById.get(todo.listId).name }}
        </span>
      </div>
    </div>

    <button class="del" title="删除" @click.stop="actions.removeTodo(todo.id)">
      <Icon name="trash" :size="13" />
    </button>
  </div>
</template>
