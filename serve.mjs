// Static server cho kaixa Portfolio.
// Sets the MIME types the page needs (avif, ktx2, wasm, riv, woff2).
import { createServer } from 'node:http'
import { createReadStream, statSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { basename, extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('.', import.meta.url))
const PORT = Number(process.env.PORT || process.argv[2] || 3118)

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.avif': 'image/avif',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.ktx2': 'image/ktx2',
  '.wasm': 'application/wasm',
  '.riv': 'application/octet-stream',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.m4v': 'video/x-m4v',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.opus': 'audio/ogg',
  '.flac': 'audio/flac',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
}


// ---------------------------------------------------------------- lưu CONFIG
// Bảng tinh chỉnh (kx-devtools.js) POST về đây để ghi giá trị vừa chỉnh thẳng
// vào khối CONFIG của file hiệu ứng, GIỮ NGUYÊN mọi comment.
// Đây là công cụ LÚC LÀM VIỆC: server chỉ nghe 127.0.0.1, và chỉ cho ghi đúng
// các file assets/js/kx-*.js. Bàn giao thì phần này vô hại vì bên nhận không chạy serve.mjs.
const SAVE_PATH = '/__kx-save'
const UPLOAD_PATH = '/__kx-upload'
// Thư mục nhận file tải lên từ bảng tinh chỉnh.
const UPLOAD_DIR = 'assets/media'
// Chỉ nhận đúng các đuôi trang có thể phát/hiển thị được.
const UPLOAD_EXT = /\.(jpg|jpeg|png|webp|avif|svg|mp4|webm|mov|m4v|mp3|m4a|aac|wav|ogg|opus|flac)$/i
const SAVE_ALLOW = /^assets\/js\/kx-[a-z0-9-]+\.js$/

function jsValue(v) {
  if (typeof v !== 'string') return String(v)
  return "'" + v.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'"
}

// Thay đúng phần giá trị của một key, chừa lại dấu phẩy và comment cuối dòng.
// Giá trị có thể là chuỗi CHỨA dấu phẩy (vd hoverTargets: 'a, button, ...') nên
// phải bắt trọn chuỗi trước, không được cắt ở dấu phẩy đầu tiên gặp được.
function patchKey(src, key, value) {
  const re = new RegExp(
    '^([ \\t]*' + key + ':[ \\t]*)' +
      "('(?:[^'\\\\]|\\\\.)*'|\"(?:[^\"\\\\]|\\\\.)*\"|[^,\\n]*?)" +
      '([ \\t]*,.*)$',
    'm'
  )
  if (!re.test(src)) return null
  return src.replace(re, (_m, head, _old, tail) => head + jsValue(value) + tail)
}

createServer((req, res) => {
  const reply = (code, obj) => {
    res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify(obj))
  }

  if (req.method === 'POST' && req.url.split('?')[0] === UPLOAD_PATH) {
    // Nhận thẳng nhị phân, tên file để ở header — tránh phồng 33% như base64.
    const raw = String(req.headers['x-kx-filename'] || '')
    const name = basename(decodeURIComponent(raw)).replace(/[^A-Za-z0-9._-]/g, '-')
    if (!name || !UPLOAD_EXT.test(name)) return reply(400, { ok: false, error: 'đuôi file không nhận: ' + name })
    const dir = join(ROOT, UPLOAD_DIR)
    const abs = join(dir, name)
    if (!abs.startsWith(dir)) return reply(400, { ok: false, error: 'đường dẫn ra ngoài dự án' })
    const chunks = []
    let size = 0
    req.on('data', (c) => {
      size += c.length
      if (size > 200e6) return req.destroy()
      chunks.push(c)
    })
    req.on('end', () => {
      try {
        mkdirSync(dir, { recursive: true })
        writeFileSync(abs, Buffer.concat(chunks))
      } catch (e) {
        return reply(500, { ok: false, error: 'không ghi được: ' + e.message })
      }
      reply(200, { ok: true, path: '/' + UPLOAD_DIR + '/' + name, bytes: size })
    })
    return
  }

  if (req.method === 'POST' && req.url.split('?')[0] === SAVE_PATH) {
    let body = ''
    req.on('data', (c) => {
      body += c
      if (body.length > 1e6) req.destroy()
    })
    req.on('end', () => {
      let payload
      try {
        payload = JSON.parse(body)
      } catch {
        return reply(400, { ok: false, error: 'JSON hỏng' })
      }
      const rel = String(payload.file || '').replace(/^\/+/, '')
      if (!SAVE_ALLOW.test(rel)) return reply(400, { ok: false, error: 'file không được phép: ' + rel })
      const abs = join(ROOT, rel)
      if (!abs.startsWith(ROOT)) return reply(400, { ok: false, error: 'đường dẫn ra ngoài dự án' })
      let src
      try {
        src = readFileSync(abs, 'utf8')
      } catch {
        return reply(404, { ok: false, error: 'không đọc được ' + rel })
      }
      const daGhi = []
      const boQua = []
      for (const [k, v] of Object.entries(payload.values || {})) {
        const next = patchKey(src, k, v)
        if (next === null) boQua.push(k)
        else {
          src = next
          daGhi.push(k)
        }
      }
      try {
        writeFileSync(abs, src)
      } catch (e) {
        return reply(500, { ok: false, error: 'không ghi được: ' + e.message })
      }
      reply(200, { ok: true, file: rel, daGhi: daGhi.length, boQua })
    })
    return
  }

  const url = decodeURIComponent(new URL(req.url, 'http://x').pathname)
  let rel = normalize(url).replace(/^(\.\.[/\\])+/, '')
  if (rel === '/' || rel.endsWith('/')) rel += 'index.html'

  // URL sạch như trên site thật: /about -> about.html, /policy/x -> policy/x.html
  const candidates = extname(rel)
    ? [rel]
    : [rel, rel + '.html', rel.replace(/\/$/, '') + '/index.html']

  let file = null
  let stat = null
  for (const c of candidates) {
    const p = join(ROOT, c)
    try {
      const st = statSync(p)
      if (st.isFile()) {
        file = p
        stat = st
        break
      }
    } catch {}
  }
  if (!file) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
    return res.end('404 ' + rel)
  }

  const head = {
    'Content-Type': MIME[extname(file).toLowerCase()] || 'application/octet-stream',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Accept-Ranges': 'bytes',
  }

  // Nhạc và video cần Range thì mới tua được. Không có thì trình duyệt phải tải
  // trọn file mới phát, và thanh tua đứng im.
  const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '')
  if (m) {
    let start = m[1] === '' ? null : Number(m[1])
    let end = m[2] === '' ? null : Number(m[2])
    if (start === null) {
      start = Math.max(0, stat.size - (end || 0)) // dạng bytes=-N: N byte cuối
      end = stat.size - 1
    } else if (end === null || end >= stat.size) {
      end = stat.size - 1
    }
    if (!(start < stat.size) || start > end) {
      res.writeHead(416, { ...head, 'Content-Range': `bytes */${stat.size}` })
      return res.end()
    }
    res.writeHead(206, {
      ...head,
      'Content-Range': `bytes ${start}-${end}/${stat.size}`,
      'Content-Length': end - start + 1,
    })
    return createReadStream(file, { start, end }).pipe(res)
  }

  res.writeHead(200, { ...head, 'Content-Length': stat.size })
  createReadStream(file).pipe(res)
}).listen(PORT, '127.0.0.1', () => {
  console.log(`kaixa Portfolio -> http://localhost:${PORT}`)
})
