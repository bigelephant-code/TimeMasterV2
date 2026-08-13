"use strict";
const electron = require("electron");
const api = {
  data: {
    snapshot: () => electron.ipcRenderer.invoke("data:snapshot"),
    onChanged: (cb) => {
      const handler = (_e, payload) => cb(payload);
      electron.ipcRenderer.on("data:changed", handler);
      return () => electron.ipcRenderer.off("data:changed", handler);
    }
  },
  lists: {
    create: (name) => electron.ipcRenderer.invoke("list:create", name),
    update: (id, patch) => electron.ipcRenderer.invoke("list:update", id, patch),
    remove: (id) => electron.ipcRenderer.invoke("list:remove", id)
  },
  todos: {
    create: (input) => electron.ipcRenderer.invoke("todo:create", input),
    update: (id, patch) => electron.ipcRenderer.invoke("todo:update", id, patch),
    toggle: (id) => electron.ipcRenderer.invoke("todo:toggle", id),
    start: (id) => electron.ipcRenderer.invoke("todo:start", id),
    stop: (id) => electron.ipcRenderer.invoke("todo:stop", id),
    remove: (id) => electron.ipcRenderer.invoke("todo:remove", id),
    clearCompleted: (listId) => electron.ipcRenderer.invoke("todo:clearCompleted", listId)
  },
  goals: {
    create: (input) => electron.ipcRenderer.invoke("goal:create", input),
    update: (id, patch) => electron.ipcRenderer.invoke("goal:update", id, patch),
    addProgress: (id, delta) => electron.ipcRenderer.invoke("goal:addProgress", id, delta),
    remove: (id) => electron.ipcRenderer.invoke("goal:remove", id)
  },
  expenses: {
    add: (input) => electron.ipcRenderer.invoke("expense:add", input),
    update: (id, patch) => electron.ipcRenderer.invoke("expense:update", id, patch),
    remove: (id) => electron.ipcRenderer.invoke("expense:remove", id),
    clearDay: (goalId, date) => electron.ipcRenderer.invoke("expense:clearDay", goalId, date),
    exportExcel: (input) => electron.ipcRenderer.invoke("expense:exportExcel", input),
    categories: {
      add: (goalId, input) => electron.ipcRenderer.invoke("expenseCategory:add", goalId, input),
      rename: (goalId, categoryId, name) => electron.ipcRenderer.invoke("expenseCategory:rename", goalId, categoryId, name),
      archive: (goalId, categoryId) => electron.ipcRenderer.invoke("expenseCategory:archive", goalId, categoryId),
      restore: (goalId, categoryId) => electron.ipcRenderer.invoke("expenseCategory:restore", goalId, categoryId)
    }
  },
  focus: {
    setDuration: (minutes) => electron.ipcRenderer.invoke("focus:setDuration", minutes),
    start: (minutes) => electron.ipcRenderer.invoke("focus:start", minutes),
    pause: () => electron.ipcRenderer.invoke("focus:pause"),
    resume: () => electron.ipcRenderer.invoke("focus:resume"),
    finish: () => electron.ipcRenderer.invoke("focus:finish"),
    cancel: () => electron.ipcRenderer.invoke("focus:cancel")
  },
  settings: {
    get: () => electron.ipcRenderer.invoke("settings:get"),
    patch: (patch) => electron.ipcRenderer.invoke("settings:patch", patch),
    onChanged: (cb) => {
      const handler = (_e, payload) => cb(payload);
      electron.ipcRenderer.on("settings:changed", handler);
      return () => electron.ipcRenderer.off("settings:changed", handler);
    }
  },
  remoteReminder: {
    getConfig: () => electron.ipcRenderer.invoke("remoteReminder:getConfig"),
    saveConfig: (input) => electron.ipcRenderer.invoke("remoteReminder:saveConfig", input),
    probe: () => electron.ipcRenderer.invoke("remoteReminder:probe"),
    test: () => electron.ipcRenderer.invoke("remoteReminder:test")
  },
  aiCoach: {
    getConfig: () => electron.ipcRenderer.invoke("aiCoach:getConfig"),
    saveConfig: (input) => electron.ipcRenderer.invoke("aiCoach:saveConfig", input),
    probe: () => electron.ipcRenderer.invoke("aiCoach:probe"),
    planTask: (todoId) => electron.ipcRenderer.invoke("aiCoach:planTask", todoId),
    planDay: (date) => electron.ipcRenderer.invoke("aiCoach:planDay", date),
    applyDayPlan: (planId) => electron.ipcRenderer.invoke("aiCoach:applyDayPlan", planId),
    undoDayPlan: (planId) => electron.ipcRenderer.invoke("aiCoach:undoDayPlan", planId),
    toggleStep: (todoId, stepId) => electron.ipcRenderer.invoke("aiCoach:toggleStep", todoId, stepId),
    openLink: (url) => electron.ipcRenderer.invoke("aiCoach:openLink", url)
  },
  win: {
    minimize: () => electron.ipcRenderer.invoke("win:minimize"),
    toggleMaximize: () => electron.ipcRenderer.invoke("win:toggleMaximize"),
    close: () => electron.ipcRenderer.invoke("win:close"),
    isMaximized: () => electron.ipcRenderer.invoke("win:isMaximized")
  },
  widget: {
    hide: () => electron.ipcRenderer.invoke("widget:hide"),
    openMain: (target) => electron.ipcRenderer.invoke("widget:openMain", target)
  },
  app: {
    onNavigate: (cb) => {
      const handler = (_e, payload) => cb(payload);
      electron.ipcRenderer.on("app:navigate", handler);
      return () => electron.ipcRenderer.off("app:navigate", handler);
    },
    info: () => electron.ipcRenderer.invoke("app:info"),
    openDataDir: () => electron.ipcRenderer.invoke("app:openDataDir"),
    flush: () => electron.ipcRenderer.invoke("app:flush")
  }
};
electron.contextBridge.exposeInMainWorld("api", api);
