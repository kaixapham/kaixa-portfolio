/* =============================================================================
 * kaixa Portfolio — Lửa (blaze)
 * -----------------------------------------------------------------------------
 * Hai kiểu, chọn bằng CONFIG.mode:
 *
 *   'page' — LỚP LỬA PHỦ TRANG. Một canvas phủ kín viewport, lửa + khói + tàn
 *            lửa bốc lên từ mép dưới. Không bóp méo nội dung bên dưới.
 *   'text' — ĐỐT MỘT CỤM CHỮ. Chữ của cụm được vẽ lại vào canvas rồi chạy shader
 *            lên chính nó: hơi nóng làm chữ méo và rung, lửa liếm từ dưới lên,
 *            ánh lửa hắt vào nét chữ.
 *
 * VÌ SAO KHÔNG DÙNG ĐƯỢC BẢN GỐC INSPIRA UI
 * Component "HTML Blaze" của họ bóp méo DOM THẬT qua API canvas đang thử nghiệm
 * của Chrome (`layoutSubtree` / `drawElement`) — kiểm tra trên máy này thì
 * `CanvasRenderingContext2D.prototype.drawElement` là `undefined`, và chính
 * trang của họ cũng dán nhãn "Experimental HTML rendering". Muốn chạy đúng thì
 * người xem phải bật cờ thử nghiệm, không giao cho khách được. Nên ở đây:
 * mode 'text' tự vẽ chữ vào canvas (chạy mọi trình duyệt), còn mode 'page' chỉ
 * làm phần lửa. Preset thứ ba — hơi nóng bốc trên vành đĩa — nằm trong
 * kx-disc-fx.js, chọn preset `blaze`.
 *
 * mode 'text' chỉ vẽ được CHỮ THUẦN. Cụm nào có thẻ <img> bên trong (như dòng
 * mail có icon) thì phần icon sẽ không hiện — chọn cụm khác.
 *
 * CÁCH DÙNG: nạp SAU kx-hello-mate.js. Chỉnh bằng CONFIG ngay bên dưới. File
 * này KHÔNG chứa UI setting — bảng tinh chỉnh ở kx-devtools.js (tab "Lửa").
 * ========================================================================== */
(() => {
  'use strict'

  // CONFIG để phẳng cho khớp bảng tinh chỉnh (kx-devtools.js đọc config[key]).
  const CONFIG = {
    enabled: false, // MẶC ĐỊNH TẮT — bật trong bảng để xem thử từng kiểu
    mode: 'page', // 'page' = lửa phủ trang | 'text' = đốt một cụm chữ
    textTarget: '.hm-hello', // cụm nào bị đốt khi mode = 'text'

    // ------------------------------------------------------------ chất lửa
    palette: 'fire', // 'fire' = cam đỏ | 'grey' = xám trắng, hợp tông trang
    scale: 6, // độ mịn của vân lửa — số nhỏ = ngọn to, số lớn = vân nhỏ li ti
    speed: 1, // tốc độ bốc lên
    strength: 0.03, // độ bóp méo chữ (chỉ mode 'text')
    height: 0.42, // lửa cao bao nhiêu phần của khung (0..1)
    sparks: 0.5, // lượng tàn lửa; 0 = tắt (đặt 0 là bỏ hẳn phần tính)
    smoke: 0.4, // lượng khói; 0 = tắt (đặt 0 là bỏ hẳn phần tính)
    opacity: 0.9,

    // -------------------------------------------------------- hiệu năng
    // Số tầng nhiễu chồng lên nhau. Đây là NÚM NẶNG KÝ NHẤT: mỗi tầng là 4 hàm
    // sin cho mỗi pixel. 4 tầng cho vân chi tiết nhất, 2 tầng vẫn ra lửa và rẻ
    // gấp đôi. Shader được ghép lại theo đúng số tầng nên không có vòng lặp thừa.
    octaves: 3,
    // Mode 'page': canvas chỉ cao bằng dải có lửa thay vì phủ kín viewport —
    // phần trên vốn trong suốt hoàn toàn, tô nó là phí. Đây là phần chừa thêm
    // phía trên ngọn lửa cho khói còn chỗ.
    bandPad: 0.35,

    // ---------------------------------------------------------------- khác
    padY: 0.5, // mode 'text': nới khung xuống dưới bấy nhiêu lần chiều cao chữ
    blend: 'screen', // mix-blend-mode của canvas; 'normal' để tắt
    zIndex: 30,
    maxDpr: 1, // trần tỉ lệ pixel — lửa là hiệu ứng mềm, kéo lên 2 chỉ tốn gấp 4
  }

  const S = CONFIG

  /* ==================================================================== GLSL */

  const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main(){ vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`

  // Ghép fbm sẵn theo đúng số tầng, không dùng vòng lặp — GLSL ES 1.00 bắt buộc
  // biên vòng lặp phải là hằng, mà quan trọng hơn là bỏ được hẳn phần thừa.
  function fbmSrc(oct) {
    let s = '  float v = 0.0;\n'
    let a = 0.5
    for (let i = 0; i < oct; i++) {
      s += `  v += ${a.toFixed(4)} * noise(p); p *= 2.03;\n`
      a *= 0.5
    }
    return `float fbm(vec2 p){\n${s}  return v;\n}`
  }

  // `hasSmoke` / `hasSparks` cắt hẳn phần tính khi hai thứ đó bằng 0 — rẻ hơn
  // là để nhánh chạy rồi nhân với 0.
  function fragSrc(oct, hasSmoke, hasSparks) {
    return `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform float uHasTex, uGrey;
uniform float uTime, uScale, uSpeed, uStrength, uHeight, uSparks, uSmoke, uOpacity;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
${fbmSrc(oct)}

void main(){
  vec2 uv = vUv;
  float t = uTime * uSpeed;

  // uv.y = 0 là ĐÁY khung (WebGL lật trục y), nên lửa mạnh ở đáy rồi tắt dần lên
  float h    = clamp(uv.y / max(uHeight, 0.001), 0.0, 2.5);
  float body = pow(clamp(1.0 - h, 0.0, 1.0), 1.6);

  // Vân trôi NGƯỢC trục y nên lửa luôn bốc lên, không bao giờ chảy xuống.
  // Chỉ gọi fbm MỘT lần cho ngọn lửa (bản cũ gọi hai lần chỉ để thêm chi tiết —
  // tang so tang nhieu cho ket qua tuong duong ma re hon).
  vec2 fp = vec2(uv.x * uScale, uv.y * uScale * 0.6 - t * 1.6);
  float n = fbm(fp);
  float flame = clamp(n * 1.75 - (1.0 - body) * 1.3, 0.0, 1.0);

  vec3 col;
  if (uGrey > 0.5) {
    // Xám: cùng một trường lửa, chỉ đổi bảng màu sang thang xám.
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
  // khói: ở trên ngọn lửa
  float sm = fbm(vec2(uv.x * uScale * 0.7, uv.y * uScale * 0.45 - t * 0.9));
  float smokeMask = smoothstep(0.25, 0.95, h) * (1.0 - smoothstep(1.3, 2.1, h)) * uSmoke;
  col += (uGrey > 0.5 ? vec3(0.30) : vec3(0.28, 0.26, 0.25)) * sm * smokeMask;
  a = max(a, sm * smokeMask * 0.7);`
    : ''
}
${
  hasSparks
    ? `
  // tàn lửa: chỉ vài ô trong lưới được sáng
  vec2 sg = vec2(uv.x * 60.0, uv.y * 30.0 + t * 3.0);
  float sp = 0.0;
  if (hash(floor(sg)) > 0.985) {
    sp = smoothstep(0.32, 0.0, length(fract(sg) - 0.5)) * clamp(1.0 - h, 0.0, 1.0);
  }
  col += (uGrey > 0.5 ? vec3(0.85) : vec3(1.0, 0.72, 0.35)) * sp * uSparks * 2.0;
  a = max(a, sp * uSparks);`
    : ''
}
  a = clamp(a, 0.0, 1.0) * uOpacity;

  if (uHasTex > 0.5) {
    // Hơi nóng làm chữ méo: đẩy ngang theo vân, và luôn đẩy LÊN.
    float heat = (n - 0.5) * body;
    vec2 duv = uv + vec2(heat * uStrength * 0.6, -abs(heat) * uStrength);
    vec4 src = texture2D(uTex, duv);
    // canvas dùng alpha nhân sẵn
    gl_FragColor = vec4(src.rgb * src.a + col * a, clamp(src.a + a, 0.0, 1.0));
    return;
  }
  gl_FragColor = vec4(col * a, a);
}`
  }

  /* =================================================================== WebGL */

  let cvs = null
  let gl = null
  let prog = null
  let u = {}
  let tex = null
  let raf = 0
  let t0 = 0
  let target = null // cụm bị đốt ở mode 'text'
  let band = 1 // mode 'page': canvas chỉ cao bằng ngần này phần viewport

  let shaderKey = ''

  function build() {
    // Shader phụ thuộc số tầng nhiễu và việc có khói / tàn lửa hay không, nên
    // đổi mấy thứ đó là phải ghép và biên dịch lại.
    const oct = Math.max(1, Math.min(5, Math.round(S.octaves)))
    const hasSmoke = S.smoke > 0.001
    const hasSparks = S.sparks > 0.001
    const key = oct + '|' + hasSmoke + '|' + hasSparks
    if (cvs && shaderKey === key) return true

    if (!cvs) {
      cvs = document.createElement('canvas')
      cvs.setAttribute('aria-hidden', 'true')
      gl = cvs.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false })
    }
    if (!gl) {
      console.warn('[blaze] máy không dùng được WebGL')
      return false
    }
    if (prog) gl.deleteProgram(prog)

    const sh = (ty, src) => {
      const s = gl.createShader(ty)
      gl.shaderSource(s, src)
      gl.compileShader(s)
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.warn('[blaze] shader lỗi:', gl.getShaderInfoLog(s))
        return null
      }
      return s
    }
    const vs = sh(gl.VERTEX_SHADER, VERT)
    const fs = sh(gl.FRAGMENT_SHADER, fragSrc(oct, hasSmoke, hasSparks))
    if (!vs || !fs) return false
    prog = gl.createProgram()
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.warn('[blaze] link lỗi:', gl.getProgramInfoLog(prog))
      return false
    }
    gl.useProgram(prog)
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(prog, 'aPos')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    ;['uTex','uHasTex','uGrey','uTime','uScale','uSpeed','uStrength','uHeight','uSparks','uSmoke','uOpacity']
      .forEach((n) => (u[n] = gl.getUniformLocation(prog, n)))
    gl.clearColor(0, 0, 0, 0)
    shaderKey = key
    return true
  }

  /* ============================================================ vẽ chữ ra ảnh */

  // Vẽ chữ của cụm vào một canvas 2D để làm texture. Đây là chỗ thay cho API
  // `drawElement` thử nghiệm của Chrome mà bản gốc dựa vào.
  function textTexture(el, w, h, padBottom) {
    const c = document.createElement('canvas')
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    c.width = Math.max(2, Math.round(w * dpr))
    c.height = Math.max(2, Math.round(h * dpr))
    const x = c.getContext('2d')
    x.scale(dpr, dpr)
    const cs = getComputedStyle(el)
    x.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
    x.fillStyle = cs.color
    x.textBaseline = 'alphabetic'
    if ('letterSpacing' in x) x.letterSpacing = cs.letterSpacing
    const size = parseFloat(cs.fontSize) || 16
    // chữ nằm ở phần trên, chừa `padBottom` phía dưới cho lửa liếm lên
    x.fillText(el.textContent.trim(), 1, h - padBottom - size * 0.22)
    return c
  }

  function upload(src) {
    if (!tex) tex = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  }

  /* =================================================================== dựng */

  function layout() {
    const dpr = Math.min(window.devicePixelRatio || 1, Math.max(1, S.maxDpr))
    let w
    let h

    if (S.mode === 'text') {
      band = 1
      const el = document.querySelector(S.textTarget)
      if (!el) return false
      if (target && target !== el) restoreTarget()
      target = el
      const r = el.getBoundingClientRect()
      const pad = r.height * Math.max(0, S.padY)
      w = r.width + 4
      h = r.height + pad
      cvs.style.cssText =
        `position:fixed;left:${r.left - 2}px;top:${r.top}px;width:${w}px;height:${h}px;` +
        `pointer-events:none;z-index:${S.zIndex};mix-blend-mode:${S.blend};`
      upload(textTexture(el, w, h, pad))
      el.style.visibility = 'hidden'
      el.setAttribute('data-blaze-hidden', '')
    } else {
      restoreTarget()
      // Canvas chỉ cao bằng DẢI CÓ LỬA chứ không phủ kín viewport: phần trên
      // vốn trong suốt hoàn toàn, tô nó là phí sạch. Đây là khoản tiết kiệm lớn
      // nhất của mode 'page'.
      band = Math.min(1, Math.max(0.02, S.height + Math.max(0, S.bandPad)))
      w = innerWidth
      h = Math.round(innerHeight * band)
      cvs.style.cssText =
        `position:fixed;left:0;bottom:0;width:100%;height:${h}px;` +
        `pointer-events:none;z-index:${S.zIndex};mix-blend-mode:${S.blend};`
    }

    cvs.width = Math.max(2, Math.round(w * dpr))
    cvs.height = Math.max(2, Math.round(h * dpr))
    gl.viewport(0, 0, cvs.width, cvs.height)
    return true
  }

  function restoreTarget() {
    document.querySelectorAll('[data-blaze-hidden]').forEach((e) => {
      e.style.visibility = ''
      e.removeAttribute('data-blaze-hidden')
    })
    target = null
  }

  function frame(now) {
    raf = requestAnimationFrame(frame)
    if (!t0) t0 = now
    gl.useProgram(prog)
    gl.clear(gl.COLOR_BUFFER_BIT)
    const hasTex = S.mode === 'text' && tex ? 1 : 0
    if (hasTex) {
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, tex)
      gl.uniform1i(u.uTex, 0)
    }
    gl.uniform1f(u.uHasTex, hasTex)
    gl.uniform1f(u.uGrey, S.palette === 'grey' ? 1 : 0)
    gl.uniform1f(u.uTime, (now - t0) / 1000)
    gl.uniform1f(u.uScale, Math.max(0.2, S.scale))
    gl.uniform1f(u.uSpeed, S.speed)
    gl.uniform1f(u.uStrength, S.strength)
    // Canvas chỉ là một dải, nên chiều cao ngọn lửa phải quy về tỉ lệ của DẢI đó
    gl.uniform1f(u.uHeight, S.height / band)
    gl.uniform1f(u.uSparks, S.sparks)
    gl.uniform1f(u.uSmoke, S.smoke)
    gl.uniform1f(u.uOpacity, S.opacity)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }

  function start() {
    if (!cvs && !build()) return
    if (!cvs.isConnected) document.body.appendChild(cvs)
    if (!layout()) return
    if (!raf) raf = requestAnimationFrame(frame)
  }

  function stop() {
    if (raf) cancelAnimationFrame(raf)
    raf = 0
    t0 = 0
    if (cvs) cvs.remove()
    restoreTarget()
  }

  /* ------------------------------------------------------------- vòng quét */

  let sig = ''
  function sweep() {
    // `octaves` và việc có khói / tàn lửa hay không quyết định mã shader;
    // `height` và `bandPad` quyết định canvas cao bao nhiêu. Đổi cái nào trong
    // số đó thì phải dựng lại, còn các núm khác đọc thẳng ở mỗi khung.
    const s = [
      S.enabled, S.mode, S.textTarget, S.blend, S.zIndex, S.maxDpr, S.padY,
      Math.round(S.octaves), S.smoke > 0.001, S.sparks > 0.001, S.height, S.bandPad,
    ].join('|')
    if (s === sig) return
    sig = s
    stop()
    if (S.enabled) start()
  }

  window.addEventListener('resize', () => {
    if (S.enabled && cvs && cvs.isConnected) layout()
  })

  function boot() {
    setInterval(sweep, 300)
    sweep()
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true })
  else boot()

  // Chỉ để bảng tinh chỉnh (kx-devtools.js) đọc/ghi lúc chạy.
  window.KX_BLAZE = {
    config: S,
    defaults: Object.freeze({ ...CONFIG }),
    start,
    stop,
    relayout: layout,
  }
})()
