import { existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'

const electronDirectory = join(process.cwd(), 'node_modules', 'electron')
const executable = process.platform === 'win32'
  ? join(electronDirectory, 'dist', 'electron.exe')
  : join(electronDirectory, 'dist', 'electron')

if (existsSync(executable)) {
  console.log(`Electron runtime is ready: ${executable}`)
  process.exit(0)
}

const installer = join(electronDirectory, 'install.js')
if (!existsSync(installer)) {
  console.error('Electron dependency is missing. Run npm ci first.')
  process.exit(1)
}

console.log('Electron runtime is missing; downloading the pinned Electron version...')
const result = spawnSync(process.execPath, [installer], {
  cwd: process.cwd(),
  env: process.env,
  stdio: 'inherit'
})

if (result.error || result.status !== 0 || !existsSync(executable)) {
  console.error('Electron runtime installation failed.')
  process.exit(result.status || 1)
}

console.log(`Electron runtime installed: ${executable}`)
