import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { join } from 'node:path'

const root = process.cwd()
const main = readFileSync(join(root, 'src', 'main', 'index.js'), 'utf8')
const preload = readFileSync(join(root, 'src', 'preload', 'index.js'), 'utf8')
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))

const matches = (text, pattern) => [...text.matchAll(pattern)].map((match) => match[1])

test('every preload request channel has a trusted main-process handler', () => {
  const requested = [...new Set(matches(preload, /ipcRenderer\.invoke\("([^"]+)"/g))].sort()
  const handled = [...new Set(matches(main, /handleTrusted\("([^"]+)"/g))].sort()
  assert.equal(requested.length, 37)
  assert.deepEqual(handled, requested)
})

test('renderer event subscriptions are emitted by the main process', () => {
  const subscribed = [...new Set(matches(preload, /ipcRenderer\.on\("([^"]+)"/g))].sort()
  const emitted = [...new Set(matches(main, /(?:broadcast|webContents\.send)\("([^"]+)"/g))].sort()
  assert.deepEqual(subscribed, ['app:navigate', 'data:changed', 'settings:changed'])
  for (const channel of subscribed) assert.ok(emitted.includes(channel), `Missing emitter: ${channel}`)
})

test('security and product identity invariants stay explicit', () => {
  assert.equal(pkg.main, './out/main/index.js')
  assert.equal(pkg.build.appId, 'com.timemaster.v2')
  for (const notice of ['LICENSE', 'THIRD_PARTY_NOTICES.md', 'LICENSES/**/*', 'PRIVACY.md']) {
    assert.ok(pkg.build.files.includes(notice), `Packaged app is missing required notice: ${notice}`)
  }
  assert.match(main, /setAppUserModelId\("com\.timemaster\.v2"\)/)
  assert.match(main, /"timemaster-v2"/)
  assert.equal((main.match(/sandbox: true/g) || []).length, 3)
  assert.equal((main.match(/contextIsolation: true/g) || []).length, 3)
  assert.equal((main.match(/nodeIntegration: false/g) || []).length, 3)
  assert.match(main, /setWindowOpenHandler\(\(\) => \(\{ action: "deny" \}\)\)/)
  assert.match(main, /Rejected IPC from an untrusted sender/)
  assert.match(main, /--timemaster-smoke-test/)
})
