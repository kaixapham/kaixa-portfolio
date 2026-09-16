/* =============================================================================
 * kaixa Portfolio — Hiệu ứng bóp méo vành đĩa khi rê chuột
 * -----------------------------------------------------------------------------
 * Đưa con trỏ vào PHẦN VÀNH CÓ HOẠ TIẾT của đĩa (không tính vòng nhãn trắng ở
 * giữa) thì chỗ đó bị bóp méo theo con trỏ. Có 7 preset để chọn — xem PRESETS.
 *
 * CÁCH LÀM
 * Ảnh đĩa được vẽ lại bằng WebGL: mỗi đĩa có một <canvas> nằm ngay dưới thẻ
 * <img> gốc, còn <img> để `opacity: 0` — nó vẫn nằm đó để nhận chuột và giữ
 * nguyên mọi thứ kx-hello-mate.js đang gắn vào (bấm để play/pause, transform
 * xoay theo nhạc). Mỗi khung hình canvas chép lại `transform` của <img>, nên
 * đĩa vẫn quay y như cũ mà file này KHÔNG phải sửa gì trong kx-hello-mate.js.
 *
 * VÙNG ĂN HIỆU ỨNG là một hình vành khăn: `innerR` (mép ngoài vòng nhãn trắng)
 * đến `outerR` (mép đĩa), tính theo tỉ lệ so với bán kính đĩa. Ngoài vành đó
 * pixel được lấy nguyên xi, nên vòng nhãn và nền quanh đĩa không hề bị đụng.
 *
 * TOẠ ĐỘ CHUỘT được quay ngược lại đúng bằng góc đĩa đang quay trước khi đưa
 * vào shader. Nhờ vậy thấu kính đứng yên dưới con trỏ trên màn hình, còn hoạ
 * tiết thì vẫn trôi bên dưới nó — không bị "dính" vào đĩa mà quay theo.
 *
 * HIỆU NĂNG: chỉ vẽ lại khi đang có hiệu ứng (`amount > 0`) hoặc khi vừa đổi
 * cỡ / vừa nạp ảnh. Lúc không rê chuột thì canvas đứng im, phần quay do CSS lo,
 * nên không tốn GPU.
 *
 * CÁCH DÙNG: nạp sau kx-hello-mate.js là chạy. Chỉnh bằng CONFIG ngay bên
 * dưới. File này KHÔNG chứa UI setting — bảng tinh chỉnh nằm ở kx-devtools.js
 * (tab "Vành đĩa").
 * ========================================================================== */
(() => {
  'use strict'

  // CONFIG để phẳng cho khớp bảng tinh chỉnh (kx-devtools.js đọc config[key]).
  const CONFIG = {
    enabled: true,
    target: '.hm-disc', // thẻ <img> nào được nâng cấp thành canvas

    // Preset — xem bảng PRESETS bên dưới để biết từng cái làm gì
    preset: 'swirl',

    // ------------------------------------------------------------ vùng vành
    // Tỉ lệ so với BÁN KÍNH đĩa. innerR phải trùm hết vòng nhãn trắng ở giữa.
    innerR: 0.34,
    outerR: 0.995,
    edgeSoft: 0.02, // mềm hai mép vành, 0 = cắt gắt

    // ------------------------------------------------------- vùng ảnh hưởng
    radius: 0.22, // bán kính quầng quanh con trỏ (tỉ lệ bán kính đĩa)
    strength: 0.5, // độ bóp méo — biên độ = strength × radius, xem shader
    softness: 0.55, // 0 = tắt đột ngột ở mép quầng, 1 = tơi rất mềm
    speed: 0.25, // nhịp của các preset có chuyển động
    chroma: 0, // tán sắc: tách R/B ở mép, 0 = tắt
    follow: 0.1, // độ trễ khi bám con trỏ; 1 = bám tức thì
    fadeIn: 0.18, // giây — hiện ra khi chuột vào vành
    fadeOut: 0.45, // giây — tắt dần khi chuột ra

    // ---------------------------------------------------------------- khác
    onlyWhenPlaying: true, // true = chỉ ăn hiệu ứng khi nhạc đang chạy
    // Trần cỡ canvas — cũng chính là ĐỘ NÉT của mặt đĩa.
    // Ảnh nguồn là PNG 1200px, nên 1200 là mức vừa đủ: canvas nét đúng bằng thẻ
    // <img> gốc, không hơn không kém. Đặt thấp hơn là mặt đĩa bị mờ vì phải
    // phóng to lên (768 phóng 3.8 lần ở màn Retina — thấy rõ).
    // Code tự chặn không cho vượt quá cỡ ảnh nguồn, kéo cao hơn 1200 chỉ tốn
    // thêm chứ không nét thêm. Máy yếu thì hạ, nhưng biết là đánh đổi độ nét.
    maxSize: 1200, // px
    debugRing: false, // true = tô sáng vành để căn innerR/outerR
  }

  /* Bảng preset — `id` là giá trị của CONFIG.preset */
  const PRESETS = [
    ['lens', 'Thấu kính chất lỏng (giọt nước bám con trỏ)'],
    ['ripple', 'Vòng sóng lan ra từ con trỏ'],
    ['swirl', 'Xoáy quanh con trỏ'],
    ['melt', 'Kéo nhoè theo hướng chuột chạy'],
    ['liquid', 'Nhiễu chảy kiểu chất lỏng'],
    ['bulge', 'Phồng lên / lõm xuống'],
    ['shatter', 'Vỡ thành ô vuông lệch nhau'],
    ['blaze', 'Hơi nóng bốc lên (lửa)'],
  ]
  const S = CONFIG
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)

  /* ====================================================================== GLSL */

  const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main(){
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`

  // Shader được GHÉP RIÊNG cho từng preset thay vì nhét cả 7 vào một chuỗi
  // if/else. Nhờ vậy bản chạy thật không còn nhánh nào, và hàm nhiễu / hàm băm
  // chỉ có mặt khi preset thật sự cần — preset 'swirl' chẳng hạn biên dịch ra
  // một shader chỉ vài chục lệnh.
  const FRAG_HEAD = `
precision highp float;
varying vec2 vUv;

uniform sampler2D uTex;
uniform vec2  uMouse;      // toạ độ con trỏ trong hệ của đĩa (uv 0..1, đã quay ngược)
uniform vec2  uVel;        // vận tốc con trỏ
uniform float uTime;
uniform float uAmount;     // 0..1 — mức hiện của hiệu ứng
uniform float uInnerR;     // vành khăn
uniform float uOuterR;
uniform float uEdgeSoft;
uniform float uRadius;     // quầng quanh con trỏ
uniform float uStrength;
uniform float uSoftness;
uniform float uSpeed;
uniform float uChroma;
uniform float uDebugRing;
`

  const SRC_HASH = `
float hash(vec2 p){
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}
`
  const SRC_NOISE = `
// nhiễu giá trị, nội suy mượt
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
`

  const MAIN_OPEN = `
void main(){
  vec2 uv = vUv;

  // --- vành khăn: 0 ngoài vành, 1 trong vành ---
  float r = length(uv - 0.5) * 2.0;                  // 0 ở tâm, 1 ở mép đĩa
  float ring = smoothstep(uInnerR, uInnerR + uEdgeSoft, r)
             * (1.0 - smoothstep(uOuterR - uEdgeSoft, uOuterR, r));

  // --- quầng quanh con trỏ ---
  vec2  toM = uv - uMouse;
  float d   = length(toM);
  float t   = clamp(d / max(uRadius, 0.0001), 0.0, 1.0);
  // uSoftness kéo dài đuôi tắt dần
  float fall = pow(1.0 - t, mix(3.0, 0.7, clamp(uSoftness, 0.0, 1.0)));

  float infl = fall * ring * uAmount;

  // THOÁT SỚM. Ngoài quầng (t >= 1) hay ngoài vành thì infl = 0, và mọi preset
  // đều cho off = 0 — pixel đó chỉ là ảnh gốc. Chặn ở đây để khỏi chạy hết phần
  // toán phía dưới cho phần lớn mặt đĩa.
  if (infl <= 0.0 && uDebugRing < 0.5) {
    vec4 src = texture2D(uTex, uv);
    gl_FragColor = vec4(src.rgb * src.a, src.a);
    return;
  }

  vec2  dir = d > 0.0001 ? toM / d : vec2(0.0);
  float tm  = uTime * uSpeed;
  vec2  off = vec2(0.0);

  // Mọi biên độ dịch UV đều nhân với uRadius: độ méo tỉ lệ với CỠ QUẦNG chứ
  // không phải cỡ đĩa. Nhờ vậy uStrength có cùng ý nghĩa ở mọi preset, và thu
  // nhỏ quầng thì độ méo tự nhỏ theo thay vì loang ra cả mặt đĩa.
  float amp = uStrength * uRadius;
`

  // Mỗi preset chỉ việc tính ra `off`
  const SRC_PRESET = {
    // Thấu kính: mặt cầu khúc xạ — giữa gần như phẳng, cong mạnh nhất sát viền,
    // rồi tắt hẳn ở đúng mép quầng cho khỏi lộ đường cắt.
    lens: `
  float lens = 1.0 - sqrt(max(0.0, 1.0 - t * t));
  float rim  = 1.0 - smoothstep(0.75, 1.0, t);
  float wob  = noise(uv * 6.0 + tm * 0.35) - 0.5;   // gợn cho ra chất chất lỏng
  off = -dir * lens * rim * (1.0 + wob * 0.35) * amp * ring * uAmount;
`,
    ripple: `
  float wave = sin(d * 55.0 - tm * 4.0);
  off = dir * wave * 0.5 * amp * infl;
`,
    // Xoáy: đây là GÓC quay chứ không phải chiều dài, nên dùng thẳng uStrength
    // chứ không nhân amp. Phép quay viết thẳng ra cho khỏi gọi hàm.
    swirl: `
  float a = infl * uStrength * 2.2;
  float ca_ = cos(a), sa_ = sin(a);
  off = vec2(ca_ * toM.x - sa_ * toM.y, sa_ * toM.x + ca_ * toM.y) - toM;
`,
    melt: `
  off = -uVel * uStrength * 2.5 * infl;
`,
    liquid: `
  float n1 = noise(uv * 7.0 + vec2(tm * 0.5, 0.0));
  float n2 = noise(uv * 7.0 + vec2(0.0, tm * 0.5) + 31.4);
  off = (vec2(n1, n2) - 0.5) * 1.4 * amp * infl;
`,
    bulge: `
  off = -dir * 0.9 * amp * infl;
`,
    shatter: `
  vec2 id_  = floor(uv * 26.0);
  vec2 jit_ = vec2(hash(id_), hash(id_ + 7.7)) - 0.5;
  off = jit_ * 1.2 * amp * infl;
`,
    // Hơi nóng bốc lên: nhiễu trôi NGƯỢC chiều trục y nên vân xô lên trên, và
    // luôn đẩy theo chiều âm của y để không bao giờ thấy hoạ tiết chảy xuống.
    blaze: `
  float h1 = noise(vec2(uv.x * 13.0, uv.y * 6.0 - tm * 1.7));
  float h2 = noise(vec2(uv.x * 29.0 + 5.3, uv.y * 12.0 - tm * 2.9));
  float heat = (h1 * 0.65 + h2 * 0.35) - 0.5;
  off = vec2(heat * 0.9, -abs(heat) * 1.7) * amp * infl;
`,
  }

  // Tán sắc tốn 3 lần lấy mẫu texture. Chroma = 0 thì ghép bản một lần lấy mẫu.
  const TAIL_CHROMA = `
  float caA = uChroma * 0.25 * length(off);
  vec4 cr = texture2D(uTex, uv + off + dir * caA);
  vec4 cg = texture2D(uTex, uv + off);
  vec4 cb = texture2D(uTex, uv + off - dir * caA);
  vec4 col = vec4(cr.r, cg.g, cb.b, max(cg.a, max(cr.a, cb.a)));
`
  const TAIL_PLAIN = `
  vec4 col = texture2D(uTex, uv + off);
`
  const MAIN_CLOSE = `
  if (uDebugRing > 0.5) col.rgb = mix(col.rgb, vec3(1.0, 0.2, 0.1), ring * 0.35);
  gl_FragColor = vec4(col.rgb * col.a, col.a);   // canvas dùng alpha nhân sẵn
}`

  const NEEDS_NOISE = { lens: 1, liquid: 1, blaze: 1 }
  const NEEDS_HASH = { lens: 1, liquid: 1, shatter: 1, blaze: 1 }

  function buildFrag(preset, useChroma) {
    const p = SRC_PRESET[preset] ? preset : 'lens'
    return (
      FRAG_HEAD +
      (NEEDS_HASH[p] ? SRC_HASH : '') +
      (NEEDS_NOISE[p] ? SRC_NOISE : '') +
      MAIN_OPEN +
      SRC_PRESET[p] +
      (useChroma ? TAIL_CHROMA : TAIL_PLAIN) +
      MAIN_CLOSE
    )
  }

  /* ================================================================== WebGL */

  function makeGL(canvas) {
    // preserveDrawingBuffer: giữ lại nội dung khung trước để mỗi khung chỉ phải
    // vẽ lại đúng ô quanh con trỏ (xem scissor trong draw()), phần còn lại của
    // mặt đĩa nằm im chứ không phải tô lại 1100×1100 pixel mỗi khung.
    const opts = { alpha: true, premultipliedAlpha: true, antialias: false, preserveDrawingBuffer: true, depth: false, stencil: false }
    const gl = canvas.getContext('webgl', opts) || canvas.getContext('experimental-webgl', opts)
    if (!gl) return null
    return { gl, canvas }
  }

  // Biên dịch shader cho preset đang chọn. Gọi lại khi đổi preset hoặc khi bật/
  // tắt tán sắc, vì hai thứ đó quyết định mã nguồn được ghép ra.
  function compile(d) {
    const gl = d.gl
    const preset = SRC_PRESET[S.preset] ? S.preset : 'lens'
    const useChroma = S.chroma > 0.001
    const key = preset + '|' + useChroma
    if (d.shaderKey === key) return true
    if (d.prog) gl.deleteProgram(d.prog)

    const sh = (type, src) => {
      const s = gl.createShader(type)
      gl.shaderSource(s, src)
      gl.compileShader(s)
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.warn('[disc-fx] shader lỗi:', gl.getShaderInfoLog(s))
        return null
      }
      return s
    }
    const vs = sh(gl.VERTEX_SHADER, VERT)
    const fs = sh(gl.FRAGMENT_SHADER, buildFrag(preset, useChroma))
    if (!vs || !fs) return false

    const prog = gl.createProgram()
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.linkProgram(prog)
    gl.deleteShader(vs)
    gl.deleteShader(fs)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.warn('[disc-fx] link lỗi:', gl.getProgramInfoLog(prog))
      return false
    }
    gl.useProgram(prog)

    if (!d.buf) {
      d.buf = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, d.buf)
      // một tam giác phủ kín màn hình, rẻ hơn hai tam giác của hình chữ nhật
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    } else {
      gl.bindBuffer(gl.ARRAY_BUFFER, d.buf)
    }
    const loc = gl.getAttribLocation(prog, 'aPos')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

    const u = {}
    ;[
      'uTex','uMouse','uVel','uTime','uAmount','uInnerR','uOuterR','uEdgeSoft',
      'uRadius','uStrength','uSoftness','uSpeed','uChroma','uDebugRing',
    ].forEach((n) => (u[n] = gl.getUniformLocation(prog, n)))

    d.prog = prog
    d.u = u
    d.shaderKey = key
    d.dirty = true
    return true
  }

  function makeTexture(gl, img) {
    const tex = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
    // CLAMP để khi bóp méo lấy ra ngoài mép thì không bị cuộn vòng sang bên kia
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    return tex
  }

  /* =================================================================== đĩa */

  // Mỗi đĩa: <img> gốc (trong suốt, vẫn nhận chuột) + <canvas> vẽ thay nó.
  const discs = []
  let raf = 0
  let last = 0
  let clock = 0
  let frame = 0
  let lastSig = ''
  const pointer = { x: 0, y: 0, has: false }

  function upgrade(img) {
    const cvs = document.createElement('canvas')
    cvs.className = img.className + ' hm-disc-fx'
    cvs.setAttribute('aria-hidden', 'true')
    const ctx = makeGL(cvs)
    if (!ctx) return null

    img.parentNode.insertBefore(cvs, img)
    // <img> ở lại để nhận chuột và giữ mọi listener kx-hello-mate.js đã gắn.
    img.style.opacity = '0'

    const d = {
      img,
      cvs,
      gl: ctx.gl,
      prog: null,
      u: null,
      buf: null,
      shaderKey: '',
      tex: null,
      size: 0,
      rect: null, // hộp bao của <img>, đo lại theo nhịp chứ không mỗi khung
      amount: 0, // 0..1 mức hiện của hiệu ứng
      mx: 0.5,
      my: 0.5, // vị trí thấu kính trong hệ đĩa (đã làm mượt)
      vx: 0,
      vy: 0,
      inside: false,
      dirty: true,
      box: [0, 0, 0, 0],      // mảng nháp cho ô khung này
      prevBox: [0, 0, 0, 0],  // ô đã vẽ ở khung trước, để khung này còn xoá mà trả lại
      hasPrev: false,
      lastTransform: '',
    }
    if (!compile(d)) {
      cvs.remove()
      img.style.opacity = ''
      return null
    }
    d.gl.clearColor(0, 0, 0, 0)

    const load = () => {
      d.tex = makeTexture(d.gl, img)
      d.dirty = true
    }
    if (img.complete && img.naturalWidth) load()
    else img.addEventListener('load', load, { once: true })

    discs.push(d)
    return d
  }

  // Góc đĩa đang quay, đọc thẳng từ transform mà kx-hello-mate.js vừa ghi.
  function angleOf(el) {
    // Đọc bằng indexOf + parseFloat chứ không dùng regex: đĩa quay thì chuỗi
    // transform đổi mỗi khung, mà mỗi lần exec() lại sinh ra một mảng kết quả —
    // 120 mảng rác mỗi giây cho hai đĩa.
    const s = el.style.transform
    if (!s) return 0
    const i = s.indexOf('rotate(')
    if (i < 0) return 0
    return (parseFloat(s.slice(i + 7)) * Math.PI) / 180 || 0
  }

  // Đo lại hộp bao của đĩa. Chỉ gọi khi đổi cỡ cửa sổ hoặc theo nhịp thưa —
  // getBoundingClientRect() ép trình duyệt tính lại layout, gọi mỗi khung là phí.
  function measure(d) {
    const r = d.img.getBoundingClientRect()
    if (r.width) d.rect = r
    return d.rect
  }

  function resize(d) {
    const r = d.rect
    if (!r || !r.width) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    // Chặn ở cỡ ảnh nguồn: texture chỉ có ngần ấy chi tiết, vẽ canvas to hơn
    // không nét thêm được pixel nào mà tốn thêm thật.
    const src = d.img.naturalWidth || S.maxSize
    const cap = Math.min(Math.round(S.maxSize), src)
    const n = Math.max(2, Math.min(Math.round(r.width * dpr), cap))
    if (n === d.size) return
    d.size = n
    d.cvs.width = n
    d.cvs.height = n
    d.gl.viewport(0, 0, n, n)
    d.gl.clearColor(0, 0, 0, 0)
    d.dirty = true // đổi cỡ là buffer bị xoá sạch, phải vẽ lại toàn bộ
    d.hasPrev = false
  }

  // Ô chữ nhật (toạ độ pixel của canvas, gốc ở GÓC DƯỚI TRÁI như gl.scissor)
  // bao trọn vùng con trỏ có thể tác động tới ở khung này.
  // Ghi vào mảng có sẵn của từng đĩa thay vì trả về mảng mới — hàm này chạy mỗi
  // khung cho mỗi đĩa, tạo mảng mới là 120 mảng rác mỗi giây.
  function inflBox(d, out) {
    const s = d.size
    const rad = (S.radius + 0.06) * s // chừa thêm cho tán sắc và gợn nhiễu
    out[0] = Math.floor(d.mx * s - rad)
    out[1] = Math.floor(d.my * s - rad)
    out[2] = Math.ceil(d.mx * s + rad)
    out[3] = Math.ceil(d.my * s + rad)
    return out
  }

  function draw(d, full) {
    const gl = d.gl
    const u = d.u
    if (!d.tex || !u) return
    gl.useProgram(d.prog)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, d.tex)
    gl.uniform1i(u.uTex, 0)
    gl.uniform2f(u.uMouse, d.mx, d.my)
    gl.uniform2f(u.uVel, d.vx, d.vy)
    gl.uniform1f(u.uTime, clock)
    gl.uniform1f(u.uAmount, d.amount)
    gl.uniform1f(u.uInnerR, S.innerR)
    gl.uniform1f(u.uOuterR, S.outerR)
    gl.uniform1f(u.uEdgeSoft, Math.max(0.0005, S.edgeSoft))
    gl.uniform1f(u.uRadius, S.radius)
    gl.uniform1f(u.uStrength, S.strength)
    gl.uniform1f(u.uSoftness, S.softness)
    gl.uniform1f(u.uSpeed, S.speed)
    gl.uniform1f(u.uChroma, S.chroma)
    gl.uniform1f(u.uDebugRing, S.debugRing ? 1 : 0)

    const box = inflBox(d, d.box)

    if (full || !d.hasPrev) {
      gl.disable(gl.SCISSOR_TEST)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    } else {
      // Chỉ tô lại phần HỢP của ô khung trước và ô khung này: ô cũ để trả nó về
      // ảnh gốc, ô mới để vẽ chỗ méo mới. Ngoài hai ô đó nội dung khung trước
      // vẫn đúng nguyên (nhờ preserveDrawingBuffer) nên khỏi đụng tới.
      const p = d.prevBox
      const s = d.size
      const x0 = clamp(Math.min(box[0], p[0]), 0, s)
      const y0 = clamp(Math.min(box[1], p[1]), 0, s)
      const x1 = clamp(Math.max(box[2], p[2]), 0, s)
      const y1 = clamp(Math.max(box[3], p[3]), 0, s)
      if (x1 <= x0 || y1 <= y0) {
        keepBox(d, box)
        return
      }
      gl.enable(gl.SCISSOR_TEST)
      gl.scissor(x0, y0, x1 - x0, y1 - y0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      gl.disable(gl.SCISSOR_TEST)
    }
    keepBox(d, box)
  }

  // CHÉP giá trị chứ không gán tham chiếu: `box` chính là mảng nháp d.box, gán
  // thẳng thì khung sau tính ô mới sẽ ghi đè luôn cả ô cũ, và phần cần trả về
  // ảnh gốc sẽ bị bỏ sót — đọng vệt méo phía sau con trỏ.
  function keepBox(d, box) {
    const p = d.prevBox
    p[0] = box[0]
    p[1] = box[1]
    p[2] = box[2]
    p[3] = box[3]
    d.hasPrev = true
  }

  function playing() {
    const A = window.KX_HELLO_MATE
    return !!(A && A.player && A.player.el && !A.player.el.paused)
  }

  function tick(now) {
    raf = requestAnimationFrame(tick)
    if (!last) last = now
    let dt = (now - last) / 1000
    last = now
    if (dt > 0.1) dt = 0.1
    clock += dt

    const allow = S.enabled && (!S.onlyWhenPlaying || playing())

    // Đổi preset hay bật/tắt tán sắc thì phải ghép lại shader; đổi thông số của
    // vành thì cả mặt đĩa đổi theo nên phải vẽ lại toàn bộ một lần.
    frame++
    // Chuỗi chữ ký này chỉ dùng để bắt lúc người dùng đổi thiết lập, mà thiết
    // lập thì không tự đổi giữa hai khung — dựng nó mỗi khung là 60 chuỗi rác
    // mỗi giây, không cần thiết.
    let sigChanged = false
    if (frame % 15 === 0) {
      const sig = S.preset + '|' + (S.chroma > 0.001) + '|' + S.innerR + '|' + S.outerR + '|' + S.edgeSoft + '|' + (S.debugRing ? 1 : 0)
      sigChanged = sig !== lastSig
      if (sigChanged) lastSig = sig
    }

    // Đo lại layout theo nhịp thưa thay vì mỗi khung
    const remeasure = sigChanged || frame % 20 === 0

    discs.forEach((d) => {
      if (sigChanged) compile(d)
      if (remeasure || !d.rect) measure(d)
      resize(d)

      // đĩa quay bằng CSS — canvas chỉ việc chép lại transform của <img>
      const tr = d.img.style.transform
      if (tr !== d.lastTransform) {
        d.lastTransform = tr
        d.cvs.style.transform = tr
      }

      const r = d.rect
      let inside = false
      let tx = d.mx
      let ty = d.my

      if (allow && pointer.has && r.width) {
        const cxp = r.left + r.width / 2
        const cyp = r.top + r.height / 2
        // về hệ của đĩa: quay ngược đúng góc đĩa đang quay, nhờ vậy thấu kính
        // đứng yên dưới con trỏ còn hoạ tiết thì trôi bên dưới
        const a = -angleOf(d.img)
        const dx = pointer.x - cxp
        const dy = pointer.y - cyp
        const lx = dx * Math.cos(a) - dy * Math.sin(a)
        const ly = dx * Math.sin(a) + dy * Math.cos(a)
        const rad = r.width / 2
        const dist = Math.hypot(dx, dy) / rad // hệ quy chiếu nào cũng như nhau
        inside = dist >= S.innerR && dist <= S.outerR
        tx = 0.5 + lx / r.width
        ty = 0.5 - ly / r.height // WebGL lật trục y
      }

      d.inside = inside
      const target = inside ? 1 : 0
      const tau = (inside ? S.fadeIn : S.fadeOut) / 3
      const k = tau > 0 ? 1 - Math.exp(-dt / tau) : 1
      const prevAmount = d.amount
      d.amount += (target - d.amount) * k
      if (Math.abs(d.amount - target) < 0.001) d.amount = target

      // bám con trỏ có độ trễ; nhảy thẳng khi vừa vào để khỏi bị quét ngang
      const f = prevAmount <= 0.001 && inside ? 1 : clamp(S.follow, 0.01, 1)
      const nx = d.mx + (tx - d.mx) * f
      const ny = d.my + (ty - d.my) * f
      d.vx = (nx - d.mx) / Math.max(dt, 0.001) * 0.02
      d.vy = (ny - d.my) / Math.max(dt, 0.001) * 0.02
      d.mx = nx
      d.my = ny

      // Chỉ vẽ khi thật sự cần. `wasMoving` để lúc hiệu ứng vừa tắt hẳn còn kịp
      // vẽ thêm một khung sạch, không thì canvas đọng lại hình méo cuối cùng.
      const moving = d.amount > 0.001
      const wasMoving = prevAmount > 0.001
      if (moving || wasMoving || d.dirty) {
        draw(d, d.dirty)
        d.dirty = false
      }
    })
  }

  /* ================================================================== dựng */

  let sweepTimer = 0

  // Tắt là phải tắt HẲN: gỡ canvas khỏi DOM, trả <img> về hiện lại, dừng vòng
  // lặp. Bản cũ chỉ chặn phần bám chuột nên canvas vẫn nằm đó, vẫn bị trộn
  // mix-blend-mode: difference mỗi khung khi đĩa quay, và vẫn đo layout đều đặn
  // — tắt trong bảng gần như không giảm được gì.
  // Trả HẲN một đĩa về: xoá texture / chương trình / buffer rồi gọi loseContext.
  // Gỡ canvas khỏi DOM KHÔNG trả context WebGL về — nó nằm chờ bộ dọn bộ nhớ,
  // mà mỗi context ở đây kéo theo khung vẽ 1200² CÓ preserveDrawingBuffer cộng
  // một texture 1200². Dựng lại vài lượt là hết bộ nhớ GPU và trình duyệt giết
  // cả tab. Đây từng là lỗi thật.
  function releaseDisc(d) {
    try {
      if (d.tex) d.gl.deleteTexture(d.tex)
      if (d.prog) d.gl.deleteProgram(d.prog)
      if (d.buf) d.gl.deleteBuffer(d.buf)
      const ext = d.gl.getExtension('WEBGL_lose_context')
      if (ext) ext.loseContext()
    } catch (e) {
      /* context có thể đã mất từ trước — không có gì để dọn nữa */
    }
    d.cvs.remove()
  }

  function teardown() {
    cancelAnimationFrame(raf)
    raf = 0
    last = 0
    discs.forEach(releaseDisc)
    discs.length = 0
    document.querySelectorAll(S.target).forEach((img) => {
      if (img.dataset.discFx) {
        delete img.dataset.discFx
        img.style.opacity = ''
      }
    })
  }

  function sweep() {
    if (!S.enabled) {
      if (discs.length || raf) teardown()
      return
    }
    document.querySelectorAll(S.target).forEach((img) => {
      if (img.tagName !== 'IMG' || img.dataset.discFx) return
      img.dataset.discFx = '1'
      if (!upgrade(img)) img.style.opacity = '' // WebGL hỏng thì trả ảnh về như cũ
    })
    if (!raf && discs.length) raf = requestAnimationFrame(tick)
  }

  function restyle() {
    discs.forEach((d) => {
      d.rect = null // ép đo lại layout
      d.dirty = true // và vẽ lại toàn bộ mặt đĩa
      d.hasPrev = false
    })
  }

  window.addEventListener(
    'pointermove',
    (ev) => {
      pointer.x = ev.clientX
      pointer.y = ev.clientY
      pointer.has = true
    },
    { passive: true }
  )
  window.addEventListener('pointerleave', () => (pointer.has = false), { passive: true })
  window.addEventListener('resize', restyle)

  if (S.enabled) {
    const boot = () => {
      sweep() // sweep() tự khởi động vòng lặp, và tự dừng khi bị tắt
      sweepTimer = setInterval(sweep, 500) // trang dựng lại thì bắt lại đĩa mới
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true })
    else boot()
  }

  /* Đổi `src` của thẻ <img> xong thì gọi hàm này, ĐỪNG gọi rebuild(): ở đây chỉ
   * cần nạp lại texture, còn context / chương trình / buffer giữ nguyên. Gọi
   * rebuild() là dựng lại toàn bộ context cho cả hai đĩa, và làm thế mỗi lần
   * bật / tắt burning mode thì bộ nhớ GPU cứ thế phình ra tới lúc sập tab. */
  function refreshTextures() {
    discs.forEach((d) => {
      const load = () => {
        if (d.tex) d.gl.deleteTexture(d.tex)
        d.tex = makeTexture(d.gl, d.img)
        d.size = 0 // ép resize() tính lại: ảnh mới có thể khác cỡ ảnh cũ
        d.rect = null
        d.dirty = true
        d.hasPrev = false
      }
      if (d.img.complete && d.img.naturalWidth) load()
      else d.img.addEventListener('load', load, { once: true })
    })
  }

  // Chỉ để bảng tinh chỉnh (kx-devtools.js) đọc/ghi lúc chạy.
  window.KX_DISC_FX = {
    config: S,
    defaults: Object.freeze({ ...CONFIG }),
    presets: PRESETS,
    discs,
    restyle,
    refreshTextures,
    rebuild: () => {
      discs.forEach(releaseDisc)
      discs.length = 0
      document.querySelectorAll(S.target).forEach((i) => {
        delete i.dataset.discFx
        i.style.opacity = ''
      })
      sweep()
    },
  }
})()
