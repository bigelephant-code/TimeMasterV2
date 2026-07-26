import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { drawIcon } from '../src/main/icon-draw.mjs'

// electron-builder 要磁盘上的 icon.png（会自己转成 .ico），打包前生成一份
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'build', 'icon.png')

mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, drawIcon(256))
console.log(`图标已生成：${out}`)
