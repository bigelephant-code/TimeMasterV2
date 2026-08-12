import { contextBridge, ipcRenderer } from 'electron'

/**
 * 渲染层唯一的对外通道。开了 contextIsolation，渲染进程拿不到 Node，
 * 想加能力必须在这里显式列出来。
 */
const api = {
  data: {
    snapshot: () => ipcRenderer.invoke('data:snapshot'),
    onChanged: (cb) => {
      const handler = (_e, payload) => cb(payload)
      ipcRenderer.on('data:changed', handler)
      return () => ipcRenderer.off('data:changed', handler)
    }
  },

  lists: {
    create: (name) => ipcRenderer.invoke('list:create', name),
    update: (id, patch) => ipcRenderer.invoke('list:update', id, patch),
    remove: (id) => ipcRenderer.invoke('list:remove', id)
  },

  todos: {
    create: (input) => ipcRenderer.invoke('todo:create', input),
    update: (id, patch) => ipcRenderer.invoke('todo:update', id, patch),
    toggle: (id) => ipcRenderer.invoke('todo:toggle', id),
    start: (id) => ipcRenderer.invoke('todo:start', id),
    stop: (id) => ipcRenderer.invoke('todo:stop', id),
    remove: (id) => ipcRenderer.invoke('todo:remove', id),
    clearCompleted: (listId) => ipcRenderer.invoke('todo:clearCompleted', listId)
  },

  goals: {
    create: (input) => ipcRenderer.invoke('goal:create', input),
    update: (id, patch) => ipcRenderer.invoke('goal:update', id, patch),
    addProgress: (id, delta) => ipcRenderer.invoke('goal:addProgress', id, delta),
    remove: (id) => ipcRenderer.invoke('goal:remove', id)
  },

  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    patch: (patch) => ipcRenderer.invoke('settings:patch', patch),
    onChanged: (cb) => {
      const handler = (_e, payload) => cb(payload)
      ipcRenderer.on('settings:changed', handler)
      return () => ipcRenderer.off('settings:changed', handler)
    }
  },

  win: {
    minimize: () => ipcRenderer.invoke('win:minimize'),
    toggleMaximize: () => ipcRenderer.invoke('win:toggleMaximize'),
    close: () => ipcRenderer.invoke('win:close'),
    isMaximized: () => ipcRenderer.invoke('win:isMaximized')
  },

  widget: {
    hide: () => ipcRenderer.invoke('widget:hide'),
    openMain: () => ipcRenderer.invoke('widget:openMain')
  },

  app: {
    info: () => ipcRenderer.invoke('app:info'),
    openDataDir: () => ipcRenderer.invoke('app:openDataDir'),
    flush: () => ipcRenderer.invoke('app:flush')
  }
}

contextBridge.exposeInMainWorld('api', api)
