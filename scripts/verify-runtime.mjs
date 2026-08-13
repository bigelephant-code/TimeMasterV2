import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))

const walk = (directory) => readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const absolute = join(directory, entry.name)
  return entry.isDirectory() ? walk(absolute) : [absolute]
})

const required = [
  'runtime/main/index.js',
  'runtime/preload/index.js',
  'runtime/renderer/index.html',
  'runtime/renderer/widget.html'
]

for (const relative of required) {
  const absolute = resolve(root, relative)
  if (!absolute.startsWith(root) || !existsSync(absolute)) {
    throw new Error(`缺少运行时文件：${relative}`)
  }
}

for (const absolute of walk(join(root, 'runtime')).filter((file) => file.endsWith('.js'))) {
  const rendererAsset = absolute.includes(join('runtime', 'renderer', 'assets'))
  const result = rendererAsset
    ? spawnSync(process.execPath, ['--check', '--input-type=module'], {
        input: readFileSync(absolute),
        encoding: 'utf8'
      })
    : spawnSync(process.execPath, ['--check', absolute], { encoding: 'utf8' })
  if (result.status !== 0) {
    process.stderr.write(result.stderr)
    throw new Error(`JavaScript 语法检查失败：${absolute.slice(root.length + 1)}`)
  }
}

for (const htmlName of ['index.html', 'widget.html']) {
  const htmlPath = join(root, 'runtime', 'renderer', htmlName)
  const html = readFileSync(htmlPath, 'utf8')
  const references = [...html.matchAll(/(?:src|href)="\.\/([^"?#]+)["?#]/g)].map((m) => m[1])
  for (const relative of references) {
    const absolute = resolve(dirname(htmlPath), relative)
    if (!absolute.startsWith(join(root, 'runtime', 'renderer')) || !existsSync(absolute)) {
      throw new Error(`${htmlName} 引用了不存在的资源：${relative}`)
    }
  }
}

if (pkg.name !== 'timemaster-v2' || pkg.build?.appId !== 'com.timemaster.v2') {
  throw new Error('内部产品身份被意外修改，可能导致安装或用户数据冲突。')
}

const manifest = readFileSync(join(root, 'docs', 'runtime-0.1.3.sha256'), 'utf8')
  .trim()
  .split(/\r?\n/)
  .filter((line) => line && !line.startsWith('#'))

for (const line of manifest) {
  const match = line.match(/^([a-f0-9]{64})  (.+)$/)
  if (!match) throw new Error(`运行时哈希清单格式错误：${line}`)
  const [, expected, relative] = match
  const absolute = resolve(root, 'runtime', relative)
  const actual = createHash('sha256').update(readFileSync(absolute)).digest('hex')
  if (actual !== expected) {
    throw new Error(`恢复运行时与 0.1.3 安装包不一致：${relative}`)
  }
}

console.log(`TimeMaster V2 0.1.3 参考运行时检查通过（${manifest.length} 个恢复文件）。`)
