import { deflateSync } from 'node:zlib'

/**
 * 纯 Node 的 PNG 绘制，不依赖 Electron。
 * 主进程用它喂 nativeImage，打包脚本用它写出 build/icon.png，两边同一份图形。
 * 这样仓库里不用放任何二进制资源。
 */

const CRC_TABLE = (() => {
  const table = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  return table
})()

function crc32(buf) {
  let c = -1
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}

function chunk(type, body) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(body.length, 0)
  const typed = Buffer.concat([Buffer.from(type, 'ascii'), body])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(typed), 0)
  return Buffer.concat([len, typed, crc])
}

function encodePng(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // 位深
  ihdr[9] = 6 // RGBA
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  // 每行前面补一个 filter 字节（0 = None）
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ])
}

/** 画一个日历方块：圆角底 + 顶栏 + 两个挂环 + 中间日期格子（高亮一格当"今天"） */
export function drawIcon(size = 256) {
  const buf = Buffer.alloc(size * size * 4) // 默认全透明
  const px = (x, y, [r, g, b, a = 255]) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return
    const i = (y * size + x) * 4
    // 图形按层自下而上覆盖，不需要真正的 alpha 混合
    buf[i] = r
    buf[i + 1] = g
    buf[i + 2] = b
    buf[i + 3] = a
  }
  const rect = (x0, y0, w, h, color, radius = 0) => {
    for (let y = y0; y < y0 + h; y++) {
      for (let x = x0; x < x0 + w; x++) {
        if (radius > 0) {
          const dx = Math.min(x - x0, x0 + w - 1 - x)
          const dy = Math.min(y - y0, y0 + h - 1 - y)
          if (dx < radius && dy < radius) {
            const ex = radius - dx
            const ey = radius - dy
            if (ex * ex + ey * ey > radius * radius) continue
          }
        }
        px(x, y, color)
      }
    }
  }

  const u = size / 32 // 按 32 格设计再等比放大
  const s = (n) => Math.round(n * u)

  const blue = [76, 141, 255, 255]
  const deep = [43, 99, 200, 255]
  const white = [255, 255, 255, 255]
  const faint = [255, 255, 255, 120]

  rect(s(3), s(5), s(26), s(24), blue, s(4)) // 本体
  rect(s(3), s(5), s(26), s(8), deep, s(4)) // 顶栏
  rect(s(3), s(11), s(26), s(2), deep) // 顶栏下缘补方角
  rect(s(9), s(2), s(3), s(6), white, s(1)) // 左挂环
  rect(s(20), s(2), s(3), s(6), white, s(1)) // 右挂环

  const cw = s(4)
  const ch = s(3)
  const gap = s(1.6)
  const startX = s(6)
  const startY = s(15)
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 4; col++) {
      const isToday = row === 1 && col === 2
      rect(
        startX + col * (cw + gap),
        startY + row * (ch + gap),
        cw,
        ch,
        isToday ? white : faint,
        s(0.8)
      )
    }
  }

  return encodePng(size, size, buf)
}
