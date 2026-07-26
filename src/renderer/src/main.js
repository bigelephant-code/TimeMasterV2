import { createApp } from 'vue'
import App from './App.vue'
import { initStore } from './store.js'
import './styles.css'

initStore()
  .catch((err) => {
    // 数据没读上来也要把界面挂起来，否则用户只看到一片黑
    console.error('[litecal] 初始化失败', err)
  })
  .finally(() => {
    createApp(App).mount('#app')
  })
