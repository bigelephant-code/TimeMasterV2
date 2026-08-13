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
  'out/preload/index.js',
  'out/renderer/index.html',
  'out/renderer/widget.html'
]

for (const relative of required) {
  if (!existsSync(join(root, relative))) throw new Error(`Build output is missing: ${relative}`)
}

for (const relative of ['out/main/index.js', 'out/main/task-time.js', 'out/main/todo-rollovers.js', 'out/main/todo-completions.js', 'out/main/expense-categories.js', 'out/preload/index.js']) {
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

for (const page of ['index.html', 'widget.html']) {
  const html = readFileSync(join(root, 'out', 'renderer', page), 'utf8')
  if (/connect-src[^;]*\bws:/.test(html)) {
    throw new Error(`${page} allows websocket connections in the production CSP.`)
  }
}

const rendererFiles = readdirSync(join(root, 'out', 'renderer'), { recursive: true })
console.log(`Source build verified (${rendererFiles.length} renderer entries).`)
