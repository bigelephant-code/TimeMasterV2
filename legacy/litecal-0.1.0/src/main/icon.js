import { nativeImage } from 'electron'
import { drawIcon } from './icon-draw.mjs'

let cached = null

/** 窗口图标；Electron 会自行按 DPI 缩放 */
export function appIcon() {
  if (!cached) cached = nativeImage.createFromBuffer(drawIcon(256))
  return cached
}

export function trayIcon() {
  return appIcon().resize({ width: 20, height: 20 })
}
