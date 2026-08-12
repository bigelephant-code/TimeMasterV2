import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

for (const page of ['index.html', 'widget.html']) {
  const path = join(process.cwd(), 'out', 'renderer', page)
  const before = readFileSync(path, 'utf8')
  const after = before.replace(/(^|[\s;])ws:(?=[\s;"'])/g, '$1')
  if (after === before && /connect-src[^;"']*\bws:/.test(before)) {
    throw new Error(`Unable to remove websocket access from ${page}.`)
  }
  writeFileSync(path, after)
}

console.log('Production renderer CSP hardened: websocket connections removed.')
