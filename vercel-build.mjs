// Bản Vercel: chép site vào dist/ và BỎ NHẠC (giữ tiếng UI trong assets/sound/).
// GitHub Pages vẫn chạy thẳng từ gốc repo, không qua file này.
import { cpSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const goc = process.cwd()
const ra = join(goc, 'dist')
const BO = new Set(['dist', '.git', '.vercel', 'node_modules', 'serve.mjs', 'vercel.json', 'vercel-build.mjs', 'README.md'])

mkdirSync(ra, { recursive: true })
for (const ten of readdirSync(goc)) {
  if (BO.has(ten)) continue
  cpSync(join(goc, ten), join(ra, ten), {
    recursive: true,
    filter(src) {
      const r = relative(goc, src)
      return !(/\.(mp3|m4a|flac|wav)$/i.test(r) && !r.startsWith('assets' + sep + 'sound' + sep))
    },
  })
}

function sua(file, tu, sang) {
  const p = join(ra, file)
  const s = readFileSync(p, 'utf8')
  if (!tu.test(s)) throw new Error('Không thấy chỗ cần sửa trong ' + file)
  writeFileSync(p, s.replace(tu, sang))
}
sua('assets/js/kx-hello-mate.js', /audioSrc: '[^']*'/, "audioSrc: ''")
sua('assets/js/kx-cd3d.js', /^(\s*)nhac: '[^']*'/m, "$1nhac: ''")

const pd = join(ra, 'assets/cd3d/deck.json')
const deck = JSON.parse(readFileSync(pd, 'utf8'))
for (const t of deck.tracks || []) t.audio = ''
writeFileSync(pd, JSON.stringify(deck))
console.log('dist/ xong, đã bỏ nhạc')
