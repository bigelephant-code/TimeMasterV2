import { app, ipcMain, nativeTheme, shell } from 'electron'
import { flushNow, getSettings, patchSettings, repo } from './store.js'
import {
  applyWidgetSettings,
  broadcast,
  createWidgetWindow,
  destroyWidgetWindow,
  getMainWindow,
  getWidgetWindow
} from './windows.js'

/** 数据变了就把整份快照推给所有窗口 —— 数据量小，全量同步最省心 */
export function pushSnapshot() {
  broadcast('data:changed', repo.snapshot())
}

function pushSettings() {
  broadcast('settings:changed', getSettings())
}

function setAutoLaunch(enabled) {
  // 打包前 app.getPath('exe') 指向 electron.exe，开发时设了没意义，跳过
  if (!app.isPackaged) return
  app.setLoginItemSettings({
    openAtLogin: !!enabled,
    path: process.execPath,
    args: ['--startup']
  })
}

export function registerIpc() {
  /* ---------- 读取 ---------- */
  ipcMain.handle('data:snapshot', () => repo.snapshot())
  ipcMain.handle('settings:get', () => getSettings())

  /* ---------- 清单 ---------- */
  ipcMain.handle('list:create', (_e, name) => {
    const r = repo.createList(name)
    pushSnapshot()
    return r
  })
  ipcMain.handle('list:update', (_e, id, patch) => {
    const r = repo.updateList(id, patch)
    pushSnapshot()
    return r
  })
  ipcMain.handle('list:remove', (_e, id) => {
    const r = repo.removeList(id)
    pushSnapshot()
    return r
  })

  /* ---------- 待办 ---------- */
  ipcMain.handle('todo:create', (_e, input) => {
    const r = repo.createTodo(input)
    pushSnapshot()
    return r
  })
  ipcMain.handle('todo:update', (_e, id, patch) => {
    const r = repo.updateTodo(id, patch)
    pushSnapshot()
    return r
  })
  ipcMain.handle('todo:toggle', (_e, id) => {
    const r = repo.toggleTodo(id)
    pushSnapshot()
    return r
  })
  ipcMain.handle('todo:start', (_e, id) => {
    const r = repo.startTodo(id)
    pushSnapshot()
    return r
  })
  ipcMain.handle('todo:stop', (_e, id) => {
    const r = repo.stopTodo(id)
    pushSnapshot()
    return r
  })
  ipcMain.handle('todo:remove', (_e, id) => {
    const r = repo.removeTodo(id)
    pushSnapshot()
    return r
  })
  ipcMain.handle('todo:clearCompleted', (_e, listId) => {
    const r = repo.clearCompleted(listId)
    pushSnapshot()
    return r
  })

  /* ---------- 长期目标 ---------- */
  ipcMain.handle('goal:create', (_e, input) => {
    const r = repo.createGoal(input)
    pushSnapshot()
    return r
  })
  ipcMain.handle('goal:update', (_e, id, patch) => {
    const r = repo.updateGoal(id, patch)
    pushSnapshot()
    return r
  })
  ipcMain.handle('goal:addProgress', (_e, id, delta) => {
    const r = repo.addGoalProgress(id, delta)
    pushSnapshot()
    return r
  })
  ipcMain.handle('goal:remove', (_e, id) => {
    const r = repo.removeGoal(id)
    pushSnapshot()
    return r
  })

  /* ---------- 设置 ---------- */
  ipcMain.handle('settings:patch', (_e, patch) => {
    const before = getSettings()
    const wasEnabled = before.widget.enabled
    const wasAutoLaunch = before.autoLaunch

    const next = patchSettings(patch || {})

    // 让原生控件（滚动条、系统对话框）跟着主题走
    if (patch?.theme) nativeTheme.themeSource = next.theme === 'light' ? 'light' : 'dark'

    if (patch?.widget) {
      if (next.widget.enabled && !wasEnabled) createWidgetWindow()
      else if (!next.widget.enabled && wasEnabled) destroyWidgetWindow()
      else applyWidgetSettings()
    }
    if (patch?.autoLaunch !== undefined && patch.autoLaunch !== wasAutoLaunch) {
      setAutoLaunch(next.autoLaunch)
    }

    pushSettings()
    return next
  })

  /* ---------- 窗口控制 ---------- */
  ipcMain.handle('win:minimize', (e) => {
    const win = windowOf(e)
    win?.minimize()
  })
  ipcMain.handle('win:toggleMaximize', (e) => {
    const win = windowOf(e)
    if (!win) return
    if (win.isMaximized()) win.unmaximize()
    else win.maximize()
  })
  ipcMain.handle('win:close', (e) => {
    const win = windowOf(e)
    win?.close()
  })
  ipcMain.handle('win:isMaximized', (e) => !!windowOf(e)?.isMaximized())

  /* ---------- 小组件 ---------- */
  ipcMain.handle('widget:hide', () => {
    patchSettings({ widget: { enabled: false } })
    destroyWidgetWindow()
    pushSettings()
  })
  ipcMain.handle('widget:openMain', () => {
    const win = getMainWindow()
    if (win) {
      win.show()
      win.focus()
    }
  })

  /* ---------- 杂项 ---------- */
  ipcMain.handle('app:info', () => ({
    version: app.getVersion(),
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
    dataDir: app.getPath('userData')
  }))
  ipcMain.handle('app:openDataDir', () => shell.openPath(app.getPath('userData')))
  ipcMain.handle('app:flush', () => flushNow())
}

function windowOf(event) {
  const wc = event.sender
  const all = [getMainWindow(), getWidgetWindow()].filter(Boolean)
  return all.find((w) => !w.isDestroyed() && w.webContents.id === wc.id) || null
}
