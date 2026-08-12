import { app, Menu, Tray, nativeTheme } from 'electron'
import { flushNow, getSettings, initStore, patchSettings } from './store.js'
import { registerIpc, pushSnapshot } from './ipc.js'
import { startReminders, stopReminders } from './reminder.js'
import { trayIcon } from './icon.js'
import {
  applyWidgetSettings,
  createMainWindow,
  createWidgetWindow,
  destroyWidgetWindow,
  getMainWindow,
  setQuitting
} from './windows.js'

/** 通知在 Windows 上要有稳定的 AppUserModelID，否则标题会显示成 electron.exe */
app.setAppUserModelId('com.litecal.desktop')

/** @type {Tray|null} */
let tray = null

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const win = getMainWindow()
    if (win) {
      if (win.isMinimized()) win.restore()
      win.show()
      win.focus()
    } else {
      createMainWindow()
    }
  })

  app.whenReady().then(bootstrap)
}

function bootstrap() {
  initStore()
  registerIpc()

  const settings = getSettings()
  nativeTheme.themeSource = settings.theme === 'light' ? 'light' : 'dark'

  // 开机自启时只拉起小组件，不弹主窗口，避免开机就糊一个大窗在屏幕上
  const startedAtLogin = process.argv.includes('--startup')
  createMainWindow({ startHidden: startedAtLogin })

  if (settings.widget.enabled) createWidgetWindow()

  buildTray()
  startReminders(() => pushSnapshot())

  app.on('activate', () => createMainWindow())
}

function buildTray() {
  tray = new Tray(trayIcon())
  tray.setToolTip('轻日历')
  refreshTrayMenu()
  tray.on('click', () => {
    const win = getMainWindow() || createMainWindow()
    if (win.isVisible() && win.isFocused()) win.hide()
    else {
      win.show()
      win.focus()
    }
  })
}

function refreshTrayMenu() {
  if (!tray) return
  const s = getSettings()
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: '打开轻日历', click: () => createMainWindow() },
      {
        label: '显示桌面小组件',
        type: 'checkbox',
        checked: s.widget.enabled,
        click: (item) => {
          patchSettings({ widget: { enabled: item.checked } })
          if (item.checked) createWidgetWindow()
          else destroyWidgetWindow()
          refreshTrayMenu()
        }
      },
      {
        label: '小组件置顶',
        type: 'checkbox',
        checked: s.widget.alwaysOnTop,
        enabled: s.widget.enabled,
        click: (item) => {
          patchSettings({ widget: { alwaysOnTop: item.checked } })
          applyWidgetSettings() // 直接改属性，不重建窗口，省掉一次闪烁
          refreshTrayMenu()
        }
      },
      { type: 'separator' },
      {
        label: '开机自动启动',
        type: 'checkbox',
        checked: s.autoLaunch,
        click: (item) => {
          patchSettings({ autoLaunch: item.checked })
          if (app.isPackaged) {
            app.setLoginItemSettings({
              openAtLogin: item.checked,
              path: process.execPath,
              args: ['--startup']
            })
          }
          refreshTrayMenu()
        }
      },
      { type: 'separator' },
      {
        label: '退出',
        click: () => {
          setQuitting(true)
          app.quit()
        }
      }
    ])
  )
}

app.on('before-quit', () => {
  setQuitting(true)
  stopReminders()
  flushNow()
})

// 常驻托盘：关掉所有窗口不等于退出应用
app.on('window-all-closed', () => {
  /* 交给托盘菜单里的"退出" */
})
