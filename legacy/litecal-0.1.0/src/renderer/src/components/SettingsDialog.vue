<script setup>
import { onMounted, ref } from 'vue'
import { actions, REMIND_OPTIONS, state } from '../store.js'

const info = ref(null)
onMounted(async () => {
  info.value = await window.api.app.info()
})

const s = () => state.settings || {}
const patch = (p) => actions.patchSettings(p)
const patchWidget = (p) => actions.patchSettings({ widget: p })
// Vue 模板里访问不到 window，得从 setup 里透出来
const openDataDir = () => window.api.app.openDataDir()
</script>

<template>
  <div class="mask" @click.self="state.settingsOpen = false">
    <div class="dialog">
      <h3>设置</h3>

      <div class="switch">
        <div>
          <div class="k">深色主题</div>
          <div class="d">跟随不了系统，手动切</div>
        </div>
        <button
          class="toggle"
          :class="{ on: s().theme !== 'light' }"
          @click="patch({ theme: s().theme === 'light' ? 'dark' : 'light' })"
        ></button>
      </div>

      <div class="switch">
        <div>
          <div class="k">一周从周一开始</div>
          <div class="d">关掉则从周日开始</div>
        </div>
        <button
          class="toggle"
          :class="{ on: s().weekStart === 1 }"
          @click="patch({ weekStart: s().weekStart === 1 ? 0 : 1 })"
        ></button>
      </div>

      <div class="switch">
        <div>
          <div class="k">关闭时收进托盘</div>
          <div class="d">关掉则点关闭就真的退出</div>
        </div>
        <button
          class="toggle"
          :class="{ on: s().closeToTray }"
          @click="patch({ closeToTray: !s().closeToTray })"
        ></button>
      </div>

      <div class="switch">
        <div>
          <div class="k">开机自动启动</div>
          <div class="d">打包安装后才生效，开机只拉起小组件</div>
        </div>
        <button
          class="toggle"
          :class="{ on: s().autoLaunch }"
          @click="patch({ autoLaunch: !s().autoLaunch })"
        ></button>
      </div>

      <h3 style="margin-top: 18px">桌面小组件</h3>

      <div class="switch">
        <div>
          <div class="k">显示小组件</div>
          <div class="d">桌面上那块常驻面板</div>
        </div>
        <button
          class="toggle"
          :class="{ on: s().widget?.enabled }"
          @click="patchWidget({ enabled: !s().widget?.enabled })"
        ></button>
      </div>

      <div class="switch">
        <div>
          <div class="k">始终置顶</div>
          <div class="d">关掉后会被其它窗口盖住</div>
        </div>
        <button
          class="toggle"
          :class="{ on: s().widget?.alwaysOnTop }"
          @click="patchWidget({ alwaysOnTop: !s().widget?.alwaysOnTop })"
        ></button>
      </div>

      <div class="switch">
        <div>
          <div class="k">锁定位置</div>
          <div class="d">锁上就拖不动了，防误碰</div>
        </div>
        <button
          class="toggle"
          :class="{ on: s().widget?.locked }"
          @click="patchWidget({ locked: !s().widget?.locked })"
        ></button>
      </div>

      <div class="field" style="margin-top: 12px">
        <label>不透明度 {{ Math.round((s().widget?.opacity ?? 0.92) * 100) }}%</label>
        <input
          type="range"
          min="0.4"
          max="1"
          step="0.02"
          :value="s().widget?.opacity ?? 0.92"
          style="width: 100%"
          @input="(e) => patchWidget({ opacity: Number(e.target.value) })"
        />
      </div>

      <h3 style="margin-top: 18px">提醒</h3>
      <div class="field">
        <label>新建待办的默认提醒</label>
        <select
          :value="String(s().defaultRemindBefore)"
          @change="(e) => patch({ defaultRemindBefore: e.target.value === 'null' ? null : Number(e.target.value) })"
        >
          <option v-for="o in REMIND_OPTIONS" :key="String(o.id)" :value="String(o.id)">
            {{ o.name }}
          </option>
        </select>
      </div>

      <h3 style="margin-top: 18px">关于</h3>
      <div v-if="info" style="font-size: 11px; color: var(--text-faint); line-height: 1.9">
        轻日历 v{{ info.version }}<br />
        Electron {{ info.electron }} · Chromium {{ info.chrome }} · Node {{ info.node }}<br />
        数据目录：{{ info.dataDir }}
      </div>

      <div class="dialog-actions">
        <button class="ghost" style="margin-right: auto" @click="openDataDir">
          打开数据目录
        </button>
        <button class="primary" @click="state.settingsOpen = false">完成</button>
      </div>
    </div>
  </div>
</template>
