import { BrowserWindow, screen } from 'electron'
import { join } from 'node:path'
import { getSettings, patchSettings } from './store.js'
import { appIcon } from './icon.js'

const PRELOAD = join(__dirname, '../preload/index.js')
const isDev = !!process.env.ELECTRON_RENDERER_URL

/** @type {BrowserWindow|null} */
let mainWindow = null
/** @type {BrowserWindow|null} */
let widgetWindow = null

let quitting = false
export function setQuitting(v) {
  quitting = v
}

/** 开发时走 dev server，打包后读 out/renderer 里的静态文件 */
function loadPage(win, page) {
  if (isDev) {
    win.loadURL(`${process.env.ELECTRON_RENDERER_URL}/${page}`)
  } else {
    win.loadFile(join(__dirname, '../renderer', page))
  }
}

/** 保存窗口位置前先确认它还落在某块屏幕里，换显示器后不至于开到屏幕外 */
function clampToScreen(x, y, w, h) {
  if (x === null || y === null || x === undefined || y === undefined) return null
  const area = screen.getDisplayMatching({ x, y, width: w, height: h }).workArea
  const nx = Math.min(Math.max(x, area.x), area.x + area.width - Math.min(w, area.width))
  const ny = Math.min(Math.max(y, area.y), area.y + area.height - Math.min(h, area.height))
  return { x: Math.round(nx), y: Math.round(ny) }
}

export function createMainWindow({ startHidden = false } = {}) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show()
    mainWindow.focus()
    return mainWindow
  }

  const s = getSettings()
  const width = s.window.width || 1040
  const height = s.window.height || 700
  const pos = clampToScreen(s.window.x, s.window.y, width, height)

  mainWindow = new BrowserWindow({
    width,
    height,
    minWidth: 880,
    minHeight: 560,
    ...(pos || {}),
    show: false,
    frame: false,
    backgroundColor: s.theme === 'light' ? '#f5f6f8' : '#0e1015',
    icon: appIcon(),
    webPreferences: {
      preload: PRELOAD,
      sandbox: false,
      spellcheck: false
    }
  })

  // 开机自启时窗口要一直藏着，不能被 ready-to-show 又弹出来
  mainWindow.on('ready-to-show', () => {
    if (!startHidden) mainWindow.show()
  })

  const persistBounds = () => {
    if (!mainWindow || mainWindow.isDestroyed() || mainWindow.isMinimized()) return
    const b = mainWindow.getBounds()
    patchSettings({ window: { width: b.width, height: b.height, x: b.x, y: b.y } })
  }
  mainWindow.on('resized', persistBounds)
  mainWindow.on('moved', persistBounds)

  mainWindow.on('close', (e) => {
    // 关闭按钮默认只是收进托盘，真正退出走托盘菜单
    if (!quitting && getSettings().closeToTray) {
      e.preventDefault()
      mainWindow.hide()
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  loadPage(mainWindow, 'index.html')
  return mainWindow
}

export function createWidgetWindow() {
  if (widgetWindow && !widgetWindow.isDestroyed()) {
    widgetWindow.show()
    return widgetWindow
  }

  const s = getSettings()
  const W = Math.max(320, Number(s.widget.width) || 396)
  const H = Math.max(360, Number(s.widget.height) || 604)
  let pos = clampToScreen(s.widget.x, s.widget.y, W, H)
  if (!pos) {
    // 首次启动：贴到主屏右上角，跟原版摆放习惯一致
    const area = screen.getPrimaryDisplay().workArea
    pos = { x: area.x + area.width - W - 24, y: area.y + 24 }
  }

  widgetWindow = new BrowserWindow({
    width: W,
    height: H,
    ...pos,
    show: false,
    frame: false,
    transparent: true,
    // 四象限比原来的列表需要更多地方，让用户自己拉到合适大小
    resizable: true,
    minWidth: 320,
    minHeight: 360,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    hasShadow: false,
    alwaysOnTop: !!s.widget.alwaysOnTop,
    icon: appIcon(),
    webPreferences: {
      preload: PRELOAD,
      sandbox: false,
      spellcheck: false,
      // 小组件长期不在前台，Chromium 默认会把后台窗口的渲染和定时器降频，
      // 表现就是时钟不走、别处改了待办这边半天不刷新。常驻面板必须关掉。
      backgroundThrottling: false
    }
  })

  widgetWindow.setOpacity(Number(s.widget.opacity) || 0.92)
  widgetWindow.on('ready-to-show', () => widgetWindow.show())

  const persistWidgetBounds = () => {
    if (!widgetWindow || widgetWindow.isDestroyed()) return
    const b = widgetWindow.getBounds()
    patchSettings({ widget: { x: b.x, y: b.y, width: b.width, height: b.height } })
  }
  widgetWindow.on('moved', persistWidgetBounds)
  widgetWindow.on('resized', persistWidgetBounds)

  widgetWindow.on('closed', () => {
    widgetWindow = null
  })

  loadPage(widgetWindow, 'widget.html')
  return widgetWindow
}

export function destroyWidgetWindow() {
  if (widgetWindow && !widgetWindow.isDestroyed()) widgetWindow.destroy()
  widgetWindow = null
}

export function applyWidgetSettings() {
  if (!widgetWindow || widgetWindow.isDestroyed()) return
  const w = getSettings().widget
  widgetWindow.setAlwaysOnTop(!!w.alwaysOnTop)
  widgetWindow.setOpacity(Number(w.opacity) || 0.92)
  widgetWindow.setIgnoreMouseEvents(false)
}

export const getMainWindow = () => mainWindow
export const getWidgetWindow = () => widgetWindow

/** 任一窗口改了数据，其余窗口跟着刷新 */
export function broadcast(channel, payload) {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send(channel, payload)
  }
}
