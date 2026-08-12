import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

if (process.platform !== 'win32') {
  throw new Error('The packaged smoke test currently supports Windows only.')
}

const root = process.cwd()
const executable = join(root, 'release', 'win-unpacked', 'TimeMasterV2.exe')
if (!existsSync(executable)) {
  throw new Error('Packaged app is missing. Run npm run dist:dir first.')
}

const isolatedAppData = mkdtempSync(join(tmpdir(), 'timemaster-smoke-'))
mkdirSync(isolatedAppData, { recursive: true })
const resultFile = join(isolatedAppData, 'smoke-result.json')

try {
  const child = spawnSync(executable, ['--timemaster-smoke-test'], {
    env: { ...process.env, TIMEMASTER_SMOKE_USER_DATA: isolatedAppData, ELECTRON_ENABLE_LOGGING: '1' },
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
  console.log(`Packaged app smoke test passed (version ${result.version}, main and widget renderer/IPC verified).`)
} finally {
  const expectedPrefix = join(tmpdir(), 'timemaster-smoke-')
  if (!isolatedAppData.startsWith(expectedPrefix)) throw new Error('Refusing to clean an unexpected smoke-test path.')
  rmSync(isolatedAppData, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
}
