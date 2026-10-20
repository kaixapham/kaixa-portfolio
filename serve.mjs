// Static server cho kaixa Portfolio.
// Sets the MIME types the page needs (avif, ktx2, wasm, riv, woff2).
import { createServer } from 'node:http'
import { createReadStream, statSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { spawn, execFileSync } from 'node:child_process'
import { connect } from 'node:net'
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
  '.otf': 'font/otf',
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

// ------------------------------------------------------- mở editor CD 3D
// Nút "Mở editor 3D" trong bảng K (kx-cd3d-builder.js) POST về đây: editor
// (tools/cd-visualizer) là một dev server Vite riêng ở cổng 3114. Chưa chạy
// thì bật nó (`npm run dev`, tách khỏi serve.mjs — tắt serve không giết
// editor), chờ cổng lên rồi trả URL. Bắt header `x-kx-editor` để trang của
// TÊN MIỀN KHÁC không gọi được (header lạ = phải hỏi preflight, mà server này
// không trả lời preflight).
const EDITOR_PATH = '/__kx-editor'
const HOP_CD_PATH = '/__kx-hop-cd'
const EDITOR_DIR = 'tools/cd-visualizer'
const EDITOR_PORT = 3114
// Vite trên macOS nghe `localhost` = CHỈ IPv6 ::1 — gõ 127.0.0.1 là tưởng
// cổng đóng dù editor đang chạy. Thử cả hai.
function congMo1(port, host) {
  return new Promise((ok) => {
    const s = connect(port, host)
    s.once('connect', () => { s.destroy(); ok(true) })
    s.once('error', () => ok(false))
    s.setTimeout(400, () => { s.destroy(); ok(false) })
  })
}
async function congMo(port) {
  return (await congMo1(port, '127.0.0.1')) || (await congMo1(port, '::1'))
}
let dangBatEditor = null
async function batEditor() {
  if (await congMo(EDITOR_PORT)) return { ok: true, daChay: true }
  const dir = join(ROOT, EDITOR_DIR)
  if (!existsSync(join(dir, 'node_modules'))) {
    return { ok: false, error: 'editor chưa cài — chạy: npm install --prefix ' + EDITOR_DIR }
  }
  if (!dangBatEditor) {
    dangBatEditor = (async () => {
      const con = spawn('npm', ['run', 'dev'], { cwd: dir, detached: true, stdio: 'ignore' })
      con.unref()
      for (let i = 0; i < 60; i++) {
        await new Promise((r) => setTimeout(r, 250))
        if (await congMo(EDITOR_PORT)) return { ok: true, daChay: false }
      }
      return { ok: false, error: 'editor không lên ở cổng ' + EDITOR_PORT + ' sau 15 giây' }
    })().finally(() => { dangBatEditor = null })
  }
  return dangBatEditor
}

createServer((req, res) => {
  const reply = (code, obj) => {
    res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify(obj))
  }

  if (req.method === 'POST' && req.url.split('?')[0] === EDITOR_PATH) {
    if (req.headers['x-kx-editor'] !== '1') return reply(403, { ok: false, error: 'thiếu header' })
    batEditor().then((kq) => reply(kq.ok ? 200 : 500, { ...kq, url: 'http://localhost:' + EDITOR_PORT + '/' }))
    return
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
      // Đường dẫn TƯƠNG ĐỐI, không có dấu / đầu. Có dấu / đầu là nó neo vào gốc
      // tên miền, mà bản công khai chạy dưới thư mục con
      // (kaixapham.github.io/kaixa-portfolio/) nên ảnh 404 sạch. Đây từng là lỗi thật.
      reply(200, { ok: true, path: UPLOAD_DIR + '/' + name, bytes: size })
    })
    return
  }

  // Editor hộp CD (tools/cd-case/) ghi cấu hình xuống assets/cd3d/hop-cd.json.
  // Chỉ đúng một file, JSON hợp lệ, ≤ 200 KB — Home đọc lại file này.
  if (req.method === 'POST' && req.url.split('?')[0] === HOP_CD_PATH) {
    let body = ''
    req.on('data', (c) => {
      body += c
      if (body.length > 2e5) req.destroy()
    })
    req.on('end', () => {
      let data
      try {
        data = JSON.parse(body)
        if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('không phải object')
      } catch (e) {
        return reply(400, { ok: false, error: 'JSON hỏng' })
      }
      // Ảnh tải lên qua editor là PNG gốc (mặt đĩa từng 24 MB, 4320×5400) —
      // đưa thẳng lên site là tải nặng và GPU gánh cả trăm MB. Ảnh > 400 KB
      // tự có bản WebP cạnh dài 2048 cạnh nó, JSON trỏ sang bản đó.
      for (const k of ['anhBia', 'anhLung', 'anhDia', 'anhDan']) {
        const v = data[k]
        if (typeof v !== 'string' || !/^assets\/media\/[\w.-]+\.(png|jpe?g)$/i.test(v)) continue
        const src = join(ROOT, v)
        try {
          if (!existsSync(src) || statSync(src).size <= 4e5) continue
          const out = v.replace(/\.(png|jpe?g)$/i, '.webp')
          if (!existsSync(join(ROOT, out))) {
            const kq = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', src]).toString()
            const w = +(kq.match(/pixelWidth: (\d+)/) || [])[1]
            const h = +(kq.match(/pixelHeight: (\d+)/) || [])[1]
            const co = Math.max(w, h) <= 2048 ? [] : ['-resize', ...(w >= h ? ['2048', '0'] : ['0', '2048'])]
            execFileSync('cwebp', ['-quiet', '-q', '82', ...co, src, '-o', join(ROOT, out)])
          }
          data[k] = out
        } catch (e) {
          console.warn('hop-cd: không làm được bản WebP cho', v, e.message)
        }
      }
      const rel = 'assets/cd3d/hop-cd.json'
      try {
        mkdirSync(join(ROOT, 'assets/cd3d'), { recursive: true })
        writeFileSync(join(ROOT, rel), JSON.stringify(data, null, 2) + '\n')
      } catch (e) {
        return reply(500, { ok: false, error: 'không ghi được: ' + e.message })
      }
      reply(200, { ok: true, file: rel })
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
