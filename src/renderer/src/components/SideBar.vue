<script setup>
import { ref } from 'vue'
import Icon from './Icon.vue'
import { actions, countOpen, state } from '../store.js'

const adding = ref(false)
const newName = ref('')
const inputEl = ref(null)

async function startAdd() {
  adding.value = true
  newName.value = ''
  await Promise.resolve()
  inputEl.value?.focus()
}

async function commitAdd() {
  const name = newName.value.trim()
  adding.value = false
  if (!name) return
  const list = await actions.createList(name)
  if (list) {
    state.activeListId = list.id
    state.view = 'todo'
  }
}

function pickList(id) {
  state.activeListId = id
  state.view = 'todo'
}

const openTotal = () => state.todos.filter((t) => !t.done).length
</script>

<template>
  <aside class="sidebar">
    <button
      class="nav-item"
      :class="{ active: state.view === 'calendar' }"
      @click="state.view = 'calendar'"
    >
      <Icon name="calendar" :size="15" />
      <span>日历</span>
    </button>

    <button
      class="nav-item"
      :class="{ active: state.view === 'todo' && !state.activeListId }"
      @click="
        () => {
          state.view = 'todo'
          state.activeListId = null
        }
      "
    >
      <Icon name="list" :size="15" />
      <span>全部待办</span>
      <span class="count">{{ openTotal() || '' }}</span>
    </button>

    <button
      class="nav-item"
      :class="{ active: state.view === 'matrix' }"
      @click="state.view = 'matrix'"
    >
      <Icon name="matrix" :size="15" />
      <span>四象限</span>
    </button>

    <div class="nav-section">
      <span>清单</span>
      <button class="add" title="新建清单" @click="startAdd">
        <Icon name="plus" :size="13" />
      </button>
    </div>

    <div class="list-scroll">
      <button
        v-for="list in state.lists"
        :key="list.id"
        class="nav-item"
        :class="{ active: state.view === 'todo' && state.activeListId === list.id }"
        @click="pickList(list.id)"
      >
        <span class="dot" :style="{ background: list.color }"></span>
        <span
          style="
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          "
          >{{ list.name }}</span
        >
        <span class="count">{{ countOpen(list.id) || '' }}</span>
      </button>

      <div v-if="adding" style="padding: 4px 6px">
        <input
          ref="inputEl"
          v-model="newName"
          placeholder="清单名称"
          style="width: 100%"
          @keyup.enter="commitAdd"
          @keyup.esc="adding = false"
          @blur="commitAdd"
        />
      </div>
    </div>
  </aside>
</template>
