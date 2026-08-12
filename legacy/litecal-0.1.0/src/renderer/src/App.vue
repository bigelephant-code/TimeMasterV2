<script setup>
import { onMounted, onUnmounted } from 'vue'
import TitleBar from './components/TitleBar.vue'
import SideBar from './components/SideBar.vue'
import CalendarView from './components/CalendarView.vue'
import TodoView from './components/TodoView.vue'
import MatrixView from './components/MatrixView.vue'
import TodoEditor from './components/TodoEditor.vue'
import SettingsDialog from './components/SettingsDialog.vue'
import { actions, state } from './store.js'
import { addDays, addMonths, todayYmd } from './lib/date.js'

const VIEWS = { calendar: CalendarView, todo: TodoView, matrix: MatrixView }

function onKey(e) {
  // 输入框里按键不算快捷键
  const tag = e.target?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

  if (e.key === 'Escape') {
    if (state.editing) actions.closeEditor()
    else if (state.settingsOpen) state.settingsOpen = false
    return
  }
  if (state.editing || state.settingsOpen) return

  switch (e.key) {
    case 't':
    case 'T':
      state.cursor = todayYmd()
      state.selected = todayYmd()
      break
    case 'n':
    case 'N':
      actions.openEditor({ date: state.selected })
      break
    case 'ArrowLeft':
      state.cursor = state.calendarMode === 'month' ? addMonths(state.cursor, -1) : addDays(state.cursor, -1)
      break
    case 'ArrowRight':
      state.cursor = state.calendarMode === 'month' ? addMonths(state.cursor, 1) : addDays(state.cursor, 1)
      break
    case '1':
      state.view = 'calendar'
      break
    case '2':
      state.view = 'todo'
      break
    case '3':
      state.view = 'matrix'
      break
  }
}

onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="app">
    <TitleBar />
    <div class="shell">
      <SideBar />
      <component :is="VIEWS[state.view]" />
    </div>

    <TodoEditor v-if="state.editing" />
    <SettingsDialog v-if="state.settingsOpen" />
  </div>
</template>
