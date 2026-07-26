import { ref } from 'vue'

/**
 * 全窗口共用的一个秒级时钟。
 * 计时中的待办要跳表、临期判断也要随时间推进，如果每个待办组件各起一个
 * setInterval，列表一长就是几十个定时器。这里只留一个，大家读同一个 ref。
 */
export const now = ref(Date.now())

setInterval(() => {
  now.value = Date.now()
}, 1000)
