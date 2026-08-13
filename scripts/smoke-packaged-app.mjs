import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { isAbsolute, join, resolve } from 'node:path'
import { tmpdir } from 'node:os'

if (process.platform !== 'win32') {
  throw new Error('The packaged smoke test currently supports Windows only.')
}

const root = process.cwd()
const expectedVersion = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version
const executable = join(root, 'release', 'win-unpacked', 'TimeMaster.exe')
if (!existsSync(executable)) {
  throw new Error('Packaged app is missing. Run npm run dist:dir first.')
}

const isolatedAppData = mkdtempSync(join(tmpdir(), 'timemaster-smoke-'))
mkdirSync(isolatedAppData, { recursive: true })
const resultFile = join(isolatedAppData, 'smoke-result.json')
const captureValue = process.argv.find((arg) => arg.startsWith('--capture-dir='))?.slice('--capture-dir='.length)
const captureDir = captureValue ? resolve(root, captureValue) : null
if (captureDir && !isAbsolute(captureDir)) throw new Error('Visual smoke capture directory must resolve to an absolute path.')
if (captureDir) mkdirSync(captureDir, { recursive: true })

try {
  const child = spawnSync(executable, ['--timemaster-smoke-test'], {
    env: {
      ...process.env,
      TIMEMASTER_SMOKE_USER_DATA: isolatedAppData,
      ...(captureDir ? { TIMEMASTER_SMOKE_CAPTURE_DIR: captureDir } : {}),
      ELECTRON_ENABLE_LOGGING: '1'
    },
    encoding: 'utf8',
    timeout: 30_000,
    windowsHide: true
  })
  if (child.error) throw child.error
  const result = existsSync(resultFile) ? JSON.parse(readFileSync(resultFile, 'utf8')) : null
  if (child.status !== 0) {
    throw new Error(`Packaged app exited with status ${child.status}. Result: ${JSON.stringify(result)}. ${child.stderr || ''}`.trim())
  }
  if (!result) throw new Error('Packaged app did not write its smoke-test result.')
  if (!result.ok) throw new Error(`Packaged smoke test failed: ${JSON.stringify(result)}`)
  if (result.version !== expectedVersion) {
    throw new Error(`Packaged app version mismatch: expected ${expectedVersion}, received ${result.version}.`)
  }
  if (captureDir) {
    for (const name of ['calendar.png', 'calendar-compact.png', 'calendar-month-rollovers.png', 'calendar-month-completions.png', 'calendar-rollover-history.png', 'todos.png', 'matrix.png', 'settings.png', 'expense-overview.png', 'expense-categories.png', 'expense-compact.png', 'expense-audit.png', 'widget-focus-active.png', 'widget-entry.png', 'widget-ledger.png']) {
      const imagePath = join(captureDir, name)
      if (!existsSync(imagePath) || statSync(imagePath).size < 1_000) {
        throw new Error(`Visual smoke capture is missing or empty: ${name}`)
      }
    }
  }
  console.log(`Packaged app smoke test passed (version ${result.version}, main and widget renderer/IPC verified).`)
} finally {
  const expectedPrefix = join(tmpdir(), 'timemaster-smoke-')
  if (!isolatedAppData.startsWith(expectedPrefix)) throw new Error('Refusing to clean an unexpected smoke-test path.')
  rmSync(isolatedAppData, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
}
