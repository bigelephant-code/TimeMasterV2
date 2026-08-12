import { createApp } from 'vue'
import Widget from './Widget.vue'
import { initStore } from './store.js'
import './styles.css'

initStore()
  .catch((err) => console.error('[litecal:widget] 初始化失败', err))
  .finally(() => {
    createApp(Widget).mount('#app')
  })
