/* kx-shader-effect.js — chạy các shader WebGPU mà Figma gắn vào ảnh.
 *
 * tools/figma-to-html.mjs đổi mỗi <ShaderEffect> của Figma thành một phần tử
 * mang data-kx-shader='[{effect, params}, …]'. File này tìm <img> bên trong,
 * vẽ ảnh vào texture, cho chạy lần lượt từng shader (đầu ra cái trước là đầu
 * vào cái sau), cái cuối vẽ thẳng lên <canvas> đặt chồng đúng chỗ <img>.
 *
 * Module shader ở assets/js/shaders/ là CHÉP NGUYÊN VĂN từ Figma: mỗi file có
 * setup(device, frame) và render(device, frame), frame = { input, output,
 * inputPadding, outputPadding, params, state }.
 *
 * - Runtime gốc của Figma dùng HTML-in-Canvas để chụp DOM làm đầu vào. Ở đây
 *   đầu vào luôn chỉ là một tấm ảnh nên không cần API thử nghiệm đó: ảnh được
 *   vẽ vào canvas 2D theo đúng object-fit / object-position của <img>.
 * - Không có WebGPU (Safari cũ, Firefox) thì không làm gì: <img> gốc vẫn hiện.
 * - <img> giấu bằng opacity, không đụng layout.
 * - Shader của Figma đều tĩnh (manifest.isAnimated = false) nên chỉ vẽ một
 *   lần khi phần tử lần đầu lọt vào màn hình, và vẽ lại khi đổi cỡ cửa sổ.
 */
import * as dither from './shaders/dither.js'
import * as gooeyMerge from './shaders/gooey-merge.js'
import * as colorAdjust from './shaders/color-adjust.js'

const CONFIG = {
  enabled: true,
  maxPx: 2048,        // trần cạnh dài của khung vẽ, tính bằng pixel thật
  maxDpr: 2,
  rootMargin: '600px',
}

// Tên module trong Figma → module đã chép
const EFFECTS = {
  CodeComponentId_55a4ca852373c81b69803326c5af7aa5f1af580b_412: dither,
  CodeComponentId_21735e902a05a5a6705d9b6bed9b4f68c5073d58_408: gooeyMerge,
  CodeComponentId_dd018d6f50bd3341bd526cc999faf775abd74611_413: colorAdjust,
}

let devicePromise = null
function getDevice() {
  if (!devicePromise) {
    devicePromise = (async () => {
      const adapter = await navigator.gpu.requestAdapter()
      if (!adapter) throw new Error('Không có GPU adapter')
      return adapter.requestDevice()
    })()
  }
  return devicePromise
}

// Vẽ <img> vào canvas 2D đúng như trình duyệt đang hiển thị nó.
function rasterize(img, w, h) {
  const cs = getComputedStyle(img)
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  const g = c.getContext('2d')
  const iw = img.naturalWidth, ih = img.naturalHeight
  let dw = w, dh = h
  if (cs.objectFit === 'cover' || cs.objectFit === 'contain') {
    const s = (cs.objectFit === 'cover' ? Math.max : Math.min)(w / iw, h / ih)
    dw = iw * s; dh = ih * s
  }
  const pos = cs.objectPosition.split(' ')
  const frac = (v, free) => (v.endsWith('%') ? parseFloat(v) / 100 * free : parseFloat(v) || 0)
  g.drawImage(img, frac(pos[0] || '50%', w - dw), frac(pos[1] || '50%', h - dh), dw, dh)
  return c
}

function sizeOf(img) {
  // offsetWidth không tính transform: ảnh nằm trong khung xoay vẫn ra đúng cỡ.
  const dpr = Math.min(window.devicePixelRatio || 1, CONFIG.maxDpr)
  let w = img.offsetWidth * dpr, h = img.offsetHeight * dpr
  const k = Math.min(1, CONFIG.maxPx / Math.max(w, h))
  return [Math.max(1, Math.round(w * k)), Math.max(1, Math.round(h * k))]
}

async function mount(host) {
  const img = host.querySelector('img')
  if (!img || host.__kxShader) return
  host.__kxShader = true
  const list = JSON.parse(host.dataset.kxShader).filter((s) => EFFECTS[s.effect])
  if (!list.length) return
  if (!img.complete) await img.decode().catch(() => {})
  if (!img.naturalWidth) return

  const device = await getDevice()
  const canvas = document.createElement('canvas')
  canvas.className = img.className
  canvas.setAttribute('aria-hidden', 'true')
  const ctx = canvas.getContext('webgpu')
  const format = navigator.gpu.getPreferredCanvasFormat()
  ctx.configure({ device, format, alphaMode: 'premultiplied' })

  // Mỗi shader một frame riêng, state giữ qua các lần vẽ lại.
  const frames = list.map((s) => ({ mod: EFFECTS[s.effect], params: s.params, state: {}, ready: false }))
  let textures = []

  function draw() {
    const [w, h] = sizeOf(img)
    canvas.width = w; canvas.height = h
    textures.forEach((t) => t.destroy())
    const input = device.createTexture({
      size: [w, h], format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
    })
    device.queue.copyExternalImageToTexture({ source: rasterize(img, w, h) }, { texture: input }, [w, h])
    textures = [input]
    let src = input
    frames.forEach((f, i) => {
      const last = i === frames.length - 1
      const out = last ? ctx.getCurrentTexture() : device.createTexture({
        size: [w, h], format: 'rgba8unorm',
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC | GPUTextureUsage.STORAGE_BINDING,
      })
      if (!last) textures.push(out)
      const frame = { input: src, output: out, inputPadding: 0, outputPadding: 0, params: f.params, state: f.state }
      if (!f.ready) { f.mod.setup(device, frame); f.ready = true }
      f.mod.render(device, frame)
      src = out
    })
    /* Chụp KẾT QUẢ ra ImageBitmap ngay trong tác vụ này (texture hiện tại
     * của canvas WebGPU chỉ đọc được trước khi trình duyệt trình chiếu nó),
     * rồi phát `kx-shader-xong` — hiệu ứng khác (kx-cd-glass.js: kính lỏng
     * theo máy CD) dùng làm texture, nên kính bẻ đúng ảnh ĐÃ dither. */
    createImageBitmap(canvas)
      .then((bm) => {
        if (host.__kxAnh) host.__kxAnh.close()
        host.__kxAnh = bm
        window.dispatchEvent(new CustomEvent('kx-shader-xong', { detail: host }))
      })
      .catch(() => {})
  }

  draw()
  img.after(canvas)
  img.style.opacity = '0'

  let t = 0
  window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(draw, 200) })
}

function start() {
  if (!CONFIG.enabled || !('gpu' in navigator)) return
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue
      io.unobserve(e.target)
      mount(e.target).catch((err) => console.warn('[kx-shader-effect]', err))
    }
  }, { rootMargin: CONFIG.rootMargin })
  document.querySelectorAll('[data-kx-shader]').forEach((el) => io.observe(el))
}

window.KX_SHADER_EFFECT = { CONFIG, start }
start()
