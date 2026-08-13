import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import { fileURLToPath } from 'node:url'

const r = (p) => fileURLToPath(new URL(p, import.meta.url))

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: r('src/main/index.js'),
          'task-time': r('src/main/task-time.js'),
          'todo-rollovers': r('src/main/todo-rollovers.js'),
          'todo-completions': r('src/main/todo-completions.js'),
          'expense-categories': r('src/main/expense-categories.js'),
          'remote-reminders': r('src/main/remote-reminders.js')
        }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: { input: { index: r('src/preload/index.js') } }
    }
  },
  renderer: {
    root: r('src/renderer'),
    build: {
      rollupOptions: {
        input: {
          index: r('src/renderer/index.html'),
          widget: r('src/renderer/widget.html')
        }
      }
    }
  }
})
