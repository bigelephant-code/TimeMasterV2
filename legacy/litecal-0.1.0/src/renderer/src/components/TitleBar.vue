<script setup>
import Icon from './Icon.vue'
import { actions, state } from '../store.js'

const api = window.api

const toggleTheme = () =>
  actions.patchSettings({ theme: state.settings?.theme === 'light' ? 'dark' : 'light' })

const toggleWidget = () =>
  actions.patchSettings({ widget: { enabled: !state.settings?.widget?.enabled } })
</script>

<template>
  <div class="titlebar">
    <div class="brand">
      <Icon name="calendar" :size="15" />
      <span>轻日历</span>
    </div>

    <div class="spacer"></div>

    <div class="tools">
      <button
        class="tbtn"
        :title="state.settings?.widget?.enabled ? '隐藏桌面小组件' : '显示桌面小组件'"
        :style="state.settings?.widget?.enabled ? 'color:var(--accent)' : ''"
        @click="toggleWidget"
      >
        <Icon name="widget" />
      </button>
      <button class="tbtn" title="切换主题" @click="toggleTheme">
        <Icon :name="state.settings?.theme === 'light' ? 'moon' : 'sun'" />
      </button>
      <button class="tbtn" title="设置" @click="state.settingsOpen = true">
        <Icon name="settings" />
      </button>
    </div>

    <div class="tools" style="margin-left: 6px">
      <button class="wbtn" title="最小化" @click="api.win.minimize()">
        <Icon name="min" :size="14" />
      </button>
      <button class="wbtn" title="最大化" @click="api.win.toggleMaximize()">
        <Icon name="max" :size="12" />
      </button>
      <button class="wbtn close" title="关闭" @click="api.win.close()">
        <Icon name="x" :size="14" />
      </button>
    </div>
  </div>
</template>
