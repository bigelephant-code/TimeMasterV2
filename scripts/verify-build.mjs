import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'

const root = process.cwd()
const required = [
  'out/main/index.js',
  'out/main/task-time.js',
  'out/main/todo-rollovers.js',
  'out/main/todo-completions.js',
  'out/main/expense-categories.js',
  'out/main/remote-reminders.js',
  'out/main/gateway-direct-send.js',
  'out/main/ai-step-todos.js',
  'out/main/local-task-api.js',
  'out/main/ai-task-coach.js',
  'out/preload/index.js',
  'out/renderer/index.html',
  'out/renderer/widget.html'
]

for (const relative of required) {
  if (!existsSync(join(root, relative))) throw new Error(`Build output is missing: ${relative}`)
}

for (const relative of ['out/main/index.js', 'out/main/task-time.js', 'out/main/todo-rollovers.js', 'out/main/todo-completions.js', 'out/main/expense-categories.js', 'out/main/remote-reminders.js', 'out/main/ai-task-coach.js', 'out/preload/index.js']) {
  const result = spawnSync(process.execPath, ['--check', join(root, relative)], { encoding: 'utf8' })
  if (result.status !== 0) throw new Error(result.stderr || `Syntax check failed: ${relative}`)
}

const builtMain = readFileSync(join(root, 'out', 'main', 'index.js'), 'utf8')
if (!/require\(["']\.\/task-time\.js["']\)/.test(builtMain)) {
  throw new Error('Built main process does not reference the emitted task-time module.')
}
if (!/require\(["']\.\/todo-rollovers\.js["']\)/.test(builtMain)) {
  throw new Error('Built main process does not reference the emitted todo-rollover module.')
}
if (!/require\(["']\.\/todo-completions\.js["']\)/.test(builtMain)) {
  throw new Error('Built main process does not reference the emitted todo-completion module.')
}
if (!/require\(["']\.\/expense-categories\.js["']\)/.test(builtMain)) {
  throw new Error('Built main process does not reference the emitted expense-category module.')
}
if (!/require\(["']\.\/remote-reminders\.js["']\)/.test(builtMain)) {
  throw new Error('Built main process does not reference the emitted remote-reminder module.')
}
if (!/require\(["']\.\/gateway-direct-send\.js["']\)/.test(builtMain)) {
  throw new Error('Built main process does not reference the emitted gateway direct-send module.')
}
if (!/require\(["']\.\/ai-task-coach\.js["']\)/.test(builtMain)) {
  throw new Error('Built main process does not reference the emitted AI task-coach module.')
}

// 主进程模块都是独立的 rollup input，模块之间的相对 require 会原样保留。
// 新增源文件却忘记加进 electron.vite.config 的 input 表时，产物里会留下一个
// 指向从未生成的文件的 require，应用启动即崩，而单元测试直接 require 源码，
// 完全看不到这个问题。这里逐个解析，确保没有悬空引用。
for (const directory of ['main', 'preload']) {
  const base = join(root, 'out', directory)
  for (const file of readdirSync(base).filter((name) => name.endsWith('.js'))) {
    const source = readFileSync(join(base, file), 'utf8')
    for (const match of source.matchAll(/require\(["'](\.[^"']*)["']\)/g)) {
      const target = join(base, match[1])
      if (!existsSync(target)) {
        throw new Error(`out/${directory}/${file} requires ${match[1]}, which the build never emitted.`)
      }
    }
  }
}

for (const page of ['index.html', 'widget.html']) {
  const html = readFileSync(join(root, 'out', 'renderer', page), 'utf8')
  if (/connect-src[^;]*\bws:/.test(html)) {
    throw new Error(`${page} allows websocket connections in the production CSP.`)
  }
}

const rendererFiles = readdirSync(join(root, 'out', 'renderer'), { recursive: true })
console.log(`Source build verified (${rendererFiles.length} renderer entries).`)
