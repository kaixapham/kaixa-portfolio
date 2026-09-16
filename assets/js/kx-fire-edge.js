/* =============================================================================
 * kaixa Portfolio — Lửa bám mép đĩa và mép ảnh (fire effect)
 * -----------------------------------------------------------------------------
 * Ngọn lửa liếm dọc theo MÉP của hai đĩa (vòng tròn) và mép ảnh poster (khung
 * chữ nhật). Lửa cháy liên tục, có khói và tàn lửa, mức độ chỉnh bằng slider.
 *
 * NGUỒN: cách dựng lửa bằng nhiễu fBm lấy từ CodePen ksenia-k/GRLqZVR, dùng
 * cùng một bảng màu với kx-blaze.js cho hai hiệu ứng lửa của trang ăn khớp nhau.
 *
 * ĐI THEO HÌNH, KHÔNG THEO KHUNG. Mỗi khung hình được mô tả bằng một hàm khoảng
 * cách (SDF): `d < 0` là bên trong, `d = 0` đúng ở mép, `d > 0` là bên ngoài.
 * Lửa chỉ sống trong dải `-inset ≤ d ≤ height`. Nhờ vậy lửa ôm đúng vòng tròn
 * của đĩa chứ không cháy ở bốn góc ô vuông chứa nó.
 *
 * ĐÂY LÀ CHỖ TIẾT KIỆM LỚN NHẤT: SDF rẻ (vài phép tính), fBm thì đắt. Nên
 * shader tính SDF trước, pixel nào nằm ngoài dải lửa thì TRẢ VỀ TRONG SUỐT
 * NGAY, không đụng tới fbm. Phần lớn diện tích ô vuông quanh đĩa rơi vào nhánh
 * này, nên chi phí thật chỉ bằng cái vành mỏng.
 *
 * CANVAS NẰM Ở ĐÂU: gắn thẳng vào `.hm` chứ KHÔNG gắn vào `.hm-discs`. Khối
 * `.hm-discs` có `mix-blend-mode: difference` — lửa cam đè lên vành đĩa trắng
 * qua difference sẽ ra màu xanh ngọc, không phải lửa. Canvas được đặt theo TÂM
 * của ảnh (đo bằng getBoundingClientRect nên đúng cả khi đĩa đang quay) và nới
 * ra bốn phía một khoảng `pad` để ngọn lửa có chỗ vươn ra ngoài mép.
 *
 * Lửa không cần chép góc quay của đĩa: vành lửa đối xứng qua tâm nên quay hay
 * không cũng thế, bỏ được một phép chép transform mỗi khung.
 *
 * CÁCH DÙNG: nạp SAU kx-hello-mate.js. Chỉnh bằng CONFIG ngay bên dưới. File
 * này KHÔNG chứa UI setting — bảng tinh chỉnh ở kx-devtools.js (tab "Lửa mép").
 * ========================================================================== */
(() => {
  'use strict'

  // CONFIG để phẳng cho khớp bảng tinh chỉnh (kx-devtools.js đọc config[key]).
  const CONFIG = {
    enabled: true, // MẶC ĐỊNH TẮT
    targets: 'both', // 'discs' = hai đĩa | 'poster' = ảnh giữa | 'both' = cả hai
    discTarget: '.hm-disc',
    posterTarget: '.hm-poster',
    root: '.hm', // canvas gắn vào đây, KHÔNG gắn vào .hm-discs (xem đầu file)

    // ---------------------------------------------------- MỨC ĐỘ LỬA (núm chính)
    intensity: 1.15, // đậm / nhạt của cả ngọn lửa
    height: 0.03, // ngọn cao bao nhiêu, tính theo cạnh ngắn của ảnh
    inset: 0.005, // lửa ăn vào PHÍA TRONG mép bấy nhiêu
    rise: 0.06, // 0 = lửa toả đều quanh mép | 1 = cao vống ở mép trên, thấp ở đáy
    speed: 0.65, // tốc độ bốc lên
    scale: 7, // độ mịn của vân lửa — nhỏ = ngọn to, lớn = vân li ti
    palette: 'fire', // 'fire' = cam đỏ | 'grey' = xám trắng (hợp tông trang)
    opacity: 1,
    smoke: 1.9, // khói phía trên ngọn; 0 = cắt hẳn khỏi shader
    sparks: 0.35, // tàn lửa bay lên; 0 = cắt hẳn khỏi shader

    // ---------------------------------------------------------------- nhịp vào
    fadeIn: 0.35, // giây — lửa bén dần lên khi bật
    fadeOut: 0.9, // giây — lửa lụi dần khi tắt; 0 = cắt phựt một nhát
    startDelay: 1.6, // giây — trễ trước khi bén lửa (để chờ màn đốt chạy xong)

    // ------------------------------------------------------------- hiệu năng
    octaves: 3, // số tầng nhiễu — núm nặng ký nhất, xem kx-blaze.js
    pad: 0.3, // canvas nới ra ngoài ảnh bấy nhiêu lần cạnh ngắn
    maxDpr: 1.15, // trần tỉ lệ pixel — lửa là hiệu ứng mềm, kéo lên 2 chỉ tốn gấp 4
    // TRẦN CỨNG cạnh dài của khung vẽ, tính bằng pixel thật. Đây là cái chặn
    // trang khỏi ngốn hết bộ nhớ GPU: đĩa 1084px + pad 0.3 ra khung vẽ 1734px
    // = 12 MB một canvas, ba cái là 36 MB chỉ để vẽ một vành lửa mỏng. Lửa là
    // hiệu ứng mềm nên hạ xuống 900 gần như không thấy khác.
    maxPx: 900,

    // ---------------------------------------------------------------- khác
    blend: 'screen', // mix-blend-mode của canvas; 'normal' để tắt
    zIndex: 6, // trên hai đĩa (1) và ảnh poster (2), dưới lớp phủ kéo-thả (9)
    debugEdge: false, // true = tô dải lửa bằng màu phẳng để căn height / inset
  }

  const S = CONFIG
  const TAG = 'fire-edge'
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)

  /* ------------------------------------------------------- trần context WebGL
   * Trang này đã có sẵn context của kx-disc-fx.js (2) và kx-blaze.js (1). Trình
   * duyệt chỉ cho khoảng 16 context sống, nhưng chết vì HẾT BỘ NHỚ đến trước
   * chết vì đếm: mỗi context còn kéo theo một khung vẽ to bằng cả cái đĩa. Nên
   * mọi file lửa dùng chung một sổ đếm, quá trần thì bỏ qua chứ không dựng thêm
   * rồi để trình duyệt giết cả tab. Đây từng là lỗi thật (tab trắng, mặt mếu).
   *
   * `depth` và `stencil` phải TẮT: WebGL mặc định cấp cả hai, mà ở đây chỉ vẽ
   * đúng một tam giác phủ màn hình nên không đụng tới chúng — bật là tốn thêm
   * bộ nhớ mỗi context mà không được gì. */

  const GL_BUDGET = 8
  const GL_OPTS = {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: 'low-power',
  }

  function glCount(delta) {
    const w = window
    w.__kxGLLive = Math.max(0, (w.__kxGLLive || 0) + delta)
    return w.__kxGLLive
  }

  // Xin một context, có kiểm tra trần. Trả null nếu không cấp được.
  function getGL(cvs) {
    if ((window.__kxGLLive || 0) >= GL_BUDGET) {
      console.warn('[' + TAG + '] đã chạm trần context WebGL, bỏ qua vật này')
      return null
    }
    const gl = cvs.getContext('webgl', GL_OPTS)
    if (gl) glCount(1)
    return gl
  }


  /* ==================================================================== GLSL */

  const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main(){ vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`

  function fbmSrc(oct) {
    let s = '  float v = 0.0;\n'
    let a = 0.5
    for (let i = 0; i < oct; i++) {
      s += `  v += ${a.toFixed(4)} * noise(p); p *= 2.03;\n`
      a *= 0.5
    }
    return `float fbm(vec2 p){\n${s}  return v;\n}`
  }

  // Hàm khoảng cách của hình. Đơn vị là PIXEL CSS, gốc ở tâm canvas.
  const SDF = {
    circle: 'float sdShape(vec2 p){ return length(p) - uR; }',
    rect: `float sdShape(vec2 p){
  vec2 q = abs(p) - uHalf;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
}`,
  }

  function fragSrc(oct, shape, hasSmoke, hasSparks) {
    return `
precision highp float;
varying vec2 vUv;
uniform vec2 uSize, uHalf;
uniform float uR, uNorm;
uniform float uTime, uScale, uSpeed, uHeight, uInset, uIntensity, uRise;
uniform float uSmoke, uSparks, uOpacity, uGrey, uDebug;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
${fbmSrc(oct)}
${SDF[shape] || SDF.circle}

void main(){
  // Toạ độ pixel, gốc ở tâm, trục y hướng LÊN.
  vec2 p = (vUv - 0.5) * uSize;
  float d = sdShape(p);

  // Pháp tuyến hướng ra ngoài, lấy bằng sai phân — SDF rẻ nên 4 lần gọi thêm
  // vẫn rẻ hơn nhiều so với một lần fbm.
  float e = max(1.0, uNorm * 0.01);
  vec2 n = vec2(sdShape(p + vec2(e, 0.0)) - sdShape(p - vec2(e, 0.0)),
                sdShape(p + vec2(0.0, e)) - sdShape(p - vec2(0.0, e)));
  n = length(n) > 1e-5 ? normalize(n) : vec2(0.0, 1.0);

  // Mép nào NGỬA LÊN thì ngọn cao hơn — lửa bao giờ cũng bốc lên.
  float up = clamp(n.y, 0.0, 1.0);
  float H  = uHeight * mix(1.0, 0.25 + 1.75 * up, uRise);

  // CẮT SỚM: ngoài dải lửa thì trả về trong suốt NGAY, không đụng tới fbm.
  // Phần lớn diện tích canvas rơi vào đây.
  if (d < -uInset || d > H) { gl_FragColor = vec4(0.0); return; }

  float band = clamp(1.0 - (d + uInset) / max(H + uInset, 0.001), 0.0, 1.0);

  if (uDebug > 0.5) {
    gl_FragColor = vec4(vec3(0.1, 0.5, 0.9) * band, band * 0.7);
    return;
  }

  float body = pow(band, 1.5);
  float t = uTime * uSpeed;

  // Vân trôi NGƯỢC trục y nên lửa luôn bốc lên, không bao giờ chảy xuống.
  vec2 q = p / uNorm;
  float nz = fbm(vec2(q.x * uScale, q.y * uScale * 0.6 - t * 1.6));
  float flame = clamp(nz * 1.75 - (1.0 - body) * 1.3, 0.0, 1.0) * uIntensity;

  vec3 col;
  if (uGrey > 0.5) {
    col  = vec3(0.42) * smoothstep(0.02, 0.45, flame);
    col += vec3(0.33) * smoothstep(0.30, 0.75, flame);
    col += vec3(0.25) * smoothstep(0.62, 1.00, flame);
  } else {
    col  = vec3(1.00, 0.28, 0.05) * smoothstep(0.02, 0.45, flame);
    col += vec3(1.00, 0.65, 0.15) * smoothstep(0.30, 0.75, flame);
    col += vec3(1.00, 0.95, 0.80) * smoothstep(0.62, 1.00, flame);
  }

  float a = flame;
${
  hasSmoke
    ? `
  // khói: ở phần trên của dải, nơi ngọn đã tàn
  float sm = fbm(vec2(q.x * uScale * 0.7, q.y * uScale * 0.45 - t * 0.9));
  float smokeMask = smoothstep(0.55, 0.05, band) * band * 2.0 * uSmoke;
  col += (uGrey > 0.5 ? vec3(0.30) : vec3(0.28, 0.26, 0.25)) * sm * smokeMask;
  a = max(a, sm * smokeMask * 0.7);`
    : ''
}
${
  hasSparks
    ? `
  // tàn lửa: chỉ vài ô trong lưới được sáng
  vec2 sg = vec2(q.x * 55.0, q.y * 55.0 + t * 3.0);
  float sp = 0.0;
  if (hash(floor(sg)) > 0.985) {
    sp = smoothstep(0.32, 0.0, length(fract(sg) - 0.5)) * band;
  }
  col += (uGrey > 0.5 ? vec3(0.85) : vec3(1.0, 0.72, 0.35)) * sp * uSparks * 2.0;
  a = max(a, sp * uSparks);`
    : ''
}
  a = clamp(a, 0.0, 1.0) * uOpacity;
  gl_FragColor = vec4(col * a, a);
}`
  }

  /* =================================================================== dựng */

  const items = []
  let raf = 0
  let clock = 0
  let last = 0
  let frame = 0
  let lastSig = ''
  let wasEnabled = false
  let fading = false
  let fadeT0 = 0

  function selector() {
    const a = []
    if (S.targets !== 'poster') a.push(S.discTarget)
    if (S.targets !== 'discs') a.push(S.posterTarget)
    return a.join(',')
  }

  function shapeOf(img) {
    return img.matches(S.discTarget) ? 'circle' : 'rect'
  }

  function compile(d) {
    const gl = d.gl
    const oct = clamp(Math.round(S.octaves), 1, 5)
    const hasSmoke = S.smoke > 0.001
    const hasSparks = S.sparks > 0.001
    const key = oct + '|' + d.shape + '|' + hasSmoke + '|' + hasSparks
    if (d.prog && d.key === key) return true

    const sh = (ty, src) => {
      const s = gl.createShader(ty)
      gl.shaderSource(s, src)
      gl.compileShader(s)
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.warn('[fire-edge] shader lỗi:', gl.getShaderInfoLog(s))
        return null
      }
      return s
    }
    const vs = sh(gl.VERTEX_SHADER, VERT)
    const fs = sh(gl.FRAGMENT_SHADER, fragSrc(oct, d.shape, hasSmoke, hasSparks))
    if (!vs || !fs) return false
    if (d.prog) gl.deleteProgram(d.prog)
    const p = gl.createProgram()
    gl.attachShader(p, vs)
    gl.attachShader(p, fs)
    gl.linkProgram(p)
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      console.warn('[fire-edge] link lỗi:', gl.getProgramInfoLog(p))
      return false
    }
    d.prog = p
    d.key = key
    gl.useProgram(p)
    if (!d.buf) {
      d.buf = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, d.buf)
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, d.buf)
    const loc = gl.getAttribLocation(p, 'aPos')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    d.u = {}
    ;['uSize','uHalf','uR','uNorm','uTime','uScale','uSpeed','uHeight','uInset',
      'uIntensity','uRise','uSmoke','uSparks','uOpacity','uGrey','uDebug']
      .forEach((n) => (d.u[n] = gl.getUniformLocation(p, n)))
    gl.clearColor(0, 0, 0, 0)
    return true
  }

  function upgrade(img, root) {
    const cvs = document.createElement('canvas')
    cvs.className = 'kx-fire-edge'
    cvs.setAttribute('aria-hidden', 'true')
    const gl = getGL(cvs)
    if (!gl) return null
    const d = {
      img,
      cvs,
      gl,
      dead: false,
      released: false,
      shape: shapeOf(img),
      prog: null,
      key: '',
      buf: null,
      u: null,
      w: 0, // cỡ CSS của ảnh
      h: 0,
      cw: 0, // cỡ CSS của canvas (đã nới pad)
      ch: 0,
      norm: 1,
    }
    if (!compile(d)) return null
    // Context có thể bị trình duyệt thu hồi bất cứ lúc nào (xem release()).
    // Chặn hành vi mặc định rồi đánh dấu chết, đừng vẽ tiếp vào context đã mất.
    cvs.addEventListener('webglcontextlost', (ev) => {
      ev.preventDefault()
      d.dead = true
      if (!d.released) {
        d.released = true
        glCount(-1)
      }
    })
    root.appendChild(cvs)
    items.push(d)
    return d
  }

  /* --------------------------------------------------------- trả context về
   * MỖI CANVAS LÀ MỘT CONTEXT WEBGL, và trình duyệt chỉ cho sống một số lượng
   * nhất định trên cùng một trang — vượt trần thì nó THU HỒI CÁI CŨ NHẤT, mà
   * cái cũ nhất ở trang này chính là context vẽ mặt đĩa của kx-disc-fx.js.
   * Gỡ canvas khỏi DOM KHÔNG trả context về ngay: nó nằm chờ bộ dọn bộ nhớ.
   * Nên bật / tắt trong bảng vài lượt là bỏ lại cả chục context chết và một
   * bên đĩa biến mất. Phải gọi loseContext() để trả về ngay tại chỗ.
   * Đây từng là lỗi thật. */

  function release(d) {
    try {
      if (d.prog) d.gl.deleteProgram(d.prog)
      if (d.buf) d.gl.deleteBuffer(d.buf)
      const ext = d.gl.getExtension('WEBGL_lose_context')
      if (ext) ext.loseContext()
    } catch (e) {
      /* context có thể đã mất từ trước — không có gì để dọn nữa */
    }
    if (!d.released) {
      d.released = true
      glCount(-1)
    }
    d.cvs.remove()
  }

  /* --------------------------------------------------------------- đo & đặt
   * Tâm lấy từ getBoundingClientRect: đĩa đang quay thì hộp bao phình ra nhưng
   * TÂM vẫn đúng chỗ cũ. Cỡ lấy từ offsetWidth/offsetHeight — đó là cỡ layout,
   * không dính transform. Hàm này CHỈ chạy khi đổi cỡ cửa sổ và 30 khung một
   * lần, không bao giờ chạy mỗi khung (xem "hai điều cấm" trong CLAUDE.md). */

  function place(d, rootRect) {
    const w = d.img.offsetWidth
    const h = d.img.offsetHeight
    if (!w || !h) return
    const r = d.img.getBoundingClientRect()
    const cx = r.left + r.width / 2 - rootRect.left
    const cy = r.top + r.height / 2 - rootRect.top
    const norm = Math.min(w, h)
    const pad = Math.max(0, S.pad) * norm
    const cw = w + pad * 2
    const ch = h + pad * 2

    if (d.w !== w || d.h !== h || d.cw !== cw || d.ch !== ch) {
      d.w = w
      d.h = h
      d.cw = cw
      d.ch = ch
      d.norm = norm
      const dpr = Math.min(window.devicePixelRatio || 1, Math.max(0.5, S.maxDpr))
      // Trần cứng: màn to hay đĩa to tới đâu, khung vẽ cũng không vượt maxPx.
      const cap = Math.max(64, Math.round(S.maxPx))
      const k = Math.min(1, cap / Math.max(cw * dpr, ch * dpr))
      d.cvs.width = Math.max(2, Math.round(cw * dpr * k))
      d.cvs.height = Math.max(2, Math.round(ch * dpr * k))
      d.gl.viewport(0, 0, d.cvs.width, d.cvs.height)
    }
    d.cvs.style.cssText =
      `position:absolute;left:${cx}px;top:${cy}px;width:${cw}px;height:${ch}px;` +
      `transform:translate(-50%,-50%);pointer-events:none;` +
      `z-index:${S.zIndex};mix-blend-mode:${S.blend};`
  }

  function placeAll() {
    const root = document.querySelector(S.root)
    if (!root || !items.length) return
    const rr = root.getBoundingClientRect()
    for (let i = 0; i < items.length; i++) place(items[i], rr)
  }

  /* ------------------------------------------------------------------ khung */

  function tick(now) {
    raf = requestAnimationFrame(tick)
    if (!last) last = now
    clock += Math.min(0.05, (now - last) / 1000)
    last = now
    frame++
    if (frame % 30 === 1) placeAll()

    // Bén lửa dần lên chứ không hiện phựt một cái.
    const wait = Math.max(0, S.startDelay)
    const fade = Math.max(0.001, S.fadeIn)
    const grow = clamp((clock - wait) / fade, 0, 1)

    // Lụi dần khi tắt. Hết cữ là dừng hẳn — dừng ở ĐÂY chứ không ở sweep(), vì
    // chỉ vòng vẽ mới biết đã lụi tới đâu.
    let out = 1
    if (fading) {
      out = 1 - clamp((clock - fadeT0) / Math.max(0.001, S.fadeOut), 0, 1)
      if (out <= 0) {
        stop()
        return
      }
    }
    const mucDo = grow * out

    for (let i = 0; i < items.length; i++) {
      const d = items[i]
      if (!d.w || d.dead) continue
      const gl = d.gl
      const u = d.u
      gl.useProgram(d.prog)
      gl.bindBuffer(gl.ARRAY_BUFFER, d.buf)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.uniform2f(u.uSize, d.cw, d.ch)
      gl.uniform2f(u.uHalf, d.w / 2, d.h / 2)
      gl.uniform1f(u.uR, Math.min(d.w, d.h) / 2)
      gl.uniform1f(u.uNorm, d.norm)
      gl.uniform1f(u.uTime, clock)
      gl.uniform1f(u.uScale, Math.max(0.2, S.scale))
      gl.uniform1f(u.uSpeed, S.speed)
      gl.uniform1f(u.uHeight, Math.max(0.001, S.height) * d.norm * (0.35 + 0.65 * mucDo))
      gl.uniform1f(u.uInset, Math.max(0, S.inset) * d.norm)
      gl.uniform1f(u.uIntensity, Math.max(0, S.intensity) * mucDo)
      gl.uniform1f(u.uRise, clamp(S.rise, 0, 1))
      gl.uniform1f(u.uSmoke, S.smoke)
      gl.uniform1f(u.uSparks, S.sparks)
      gl.uniform1f(u.uOpacity, S.opacity)
      gl.uniform1f(u.uGrey, S.palette === 'grey' ? 1 : 0)
      gl.uniform1f(u.uDebug, S.debugEdge ? 1 : 0)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }
  }

  /* ------------------------------------------------------------- bật / tắt */

  function start() {
    stop()
    const root = document.querySelector(S.root)
    const sel = selector()
    if (!root || !sel) return
    document.querySelectorAll(sel).forEach((img) => {
      if (img.tagName === 'IMG') upgrade(img, root)
    })
    if (!items.length) return
    fading = false
    clock = 0
    last = 0
    frame = 0
    placeAll()
    raf = requestAnimationFrame(tick)
  }

  function stop() {
    if (raf) cancelAnimationFrame(raf)
    raf = 0
    last = 0
    items.forEach(release)
    items.length = 0
  }

  /* ------------------------------------------------------------- vòng quét */

  // Những thứ quyết định mã shader hoặc bố cục canvas. Các núm còn lại đọc
  // thẳng ở mỗi khung nên đổi là thấy ngay, không cần dựng lại.
  // `enabled` KHÔNG nằm trong đây: tắt phải còn kịp lụi dần, mà chữ ký đổi là
  // stop() ngay lập tức.
  function sigNow() {
    return [
      S.targets, S.discTarget, S.posterTarget, S.root, S.blend, S.zIndex,
      S.pad, S.maxDpr, S.maxPx, Math.round(S.octaves), S.smoke > 0.001, S.sparks > 0.001,
    ].join('|')
  }

  function sweep() {
    if (S.enabled && !wasEnabled) {
      wasEnabled = true
      lastSig = sigNow()
      stop()
      start()
      // Báo cho kx-burn-image.js đốt một lượt trước khi lửa bén vào mép.
      window.dispatchEvent(new CustomEvent('kx-fire-on'))
      return
    }
    if (!S.enabled && wasEnabled) {
      wasEnabled = false
      lastSig = sigNow()
      if (items.length && S.fadeOut > 0.001) {
        fading = true
        fadeT0 = clock
      } else stop()
      return
    }
    if (!S.enabled) return
    const s = sigNow()
    if (s === lastSig) return
    lastSig = s
    stop()
    start()
  }

  window.addEventListener('resize', placeAll)

  function boot() {
    setInterval(sweep, 300)
    sweep()
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true })
  else boot()

  // Chỉ để bảng tinh chỉnh (kx-devtools.js) đọc/ghi lúc chạy.
  window.KX_FIRE_EDGE = {
    config: S,
    defaults: Object.freeze({ ...CONFIG }),
    items,
    start,
    stop,
    relayout: placeAll,
  }
})()
