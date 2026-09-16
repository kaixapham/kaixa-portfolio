/* =============================================================================
 * kaixa Portfolio — Đốt cháy ảnh (burning animation)
 * -----------------------------------------------------------------------------
 * Ảnh poster ở giữa và HAI ĐĨA bị đốt: một đường lửa quét qua mặt ảnh, phía sau
 * nó là vệt than xám rồi thủng hẳn, phía trước còn nguyên. Chạy xong thì ảnh
 * hiện lại (mode 'once') — hoặc mất luôn (mode 'away'), hoặc lặp (mode 'loop').
 *
 * NGUỒN
 * Bản gốc CodePen "Image burn effect with mix-blend-mode and background-position"
 * (jcoulterdesign/YbBoNb) chồng 4 lớp SPRITE STRIP dựng sẵn từ After Effects
 * (burnStrip / burnlineStrip / ashInnerStrip / ashOuterStrip), mỗi strip là 50
 * khung 770×430 ghép ngang rồi chạy bằng `steps()` + `background-position`.
 * KHÔNG dùng lại được ở đây vì: (1) strip nằm trên S3 của họ, (2) nó khoá cứng
 * một khổ 770×430 nên không đắp vừa ảnh poster (177×250) lẫn hai đĩa TRÒN 1200px,
 * (3) đổi tốc độ / hướng đốt là phải dựng lại strip trong AE.
 *
 * Nên phần đốt ở đây tính bằng SHADER: trường nhiễu fBm dựng theo cách của
 * CodePen ksenia-k/GRLqZVR ("burning paper"), một pixel cháy khi tiến độ vượt
 * quá giá trị nhiễu tại chỗ đó. Đổi lại được: chạy mọi khổ, mọi hình (vuông hay
 * tròn), chỉnh tốc độ / hướng / bề rộng vệt than bằng slider.
 *
 * CÁCH ĐẮP LÊN ẢNH — mượn đúng lối của kx-disc-fx.js: chèn một <canvas> ngay
 * trước thẻ <img>, cho nó CÙNG class nên ăn cùng CSS (vị trí, cỡ, và cả
 * `mix-blend-mode: difference` của .hm-discs), rồi mỗi khung chép lại
 * `transform` của <img> — đĩa vẫn quay y như cũ. Thẻ <img> gốc (và canvas của
 * kx-disc-fx.js nếu đang bật) được giấu trong lúc đốt, xong thì trả lại nguyên
 * trạng. File này KHÔNG sửa gì trong kx-hello-mate.js và kx-disc-fx.js.
 *
 * Vân cháy được QUAY NGƯỢC đúng góc đĩa trước khi tính, nên đường lửa quét theo
 * hướng của MÀN HÌNH chứ không dính vào đĩa mà quay theo.
 *
 * CHẠY LÚC NÀO: mặc định `playOnFire` = true, tức là bật "Fire Effect" trong
 * bảng tinh chỉnh thì màn đốt chạy trước, xong mới tới lửa bám mép. Muốn xem
 * lại thì tắt / bật lại ô "Bật đốt" — mỗi lần bật là đốt lại từ đầu.
 *
 * CÁCH DÙNG: nạp SAU kx-hello-mate.js. Chỉnh bằng CONFIG ngay bên dưới. File
 * này KHÔNG chứa UI setting — bảng tinh chỉnh ở kx-devtools.js (tab "Đốt ảnh").
 * ========================================================================== */
(() => {
  'use strict'

  // CONFIG để phẳng cho khớp bảng tinh chỉnh (kx-devtools.js đọc config[key]).
  const CONFIG = {
    enabled: true, // MẶC ĐỊNH TẮT. Tắt rồi bật lại = đốt lại từ đầu.
    targets: 'both', // 'discs' = hai đĩa | 'poster' = ảnh giữa | 'both' = cả hai
    discTarget: '.hm-disc',
    posterTarget: '.hm-poster',
    playOnFire: true, // bật Fire Effect thì tự đốt một lượt trước

    // ------------------------------------------------------------- nhịp chạy
    mode: 'once', // 'once' = đốt rồi hiện lại | 'away' = cháy mất luôn | 'loop'
    duration: 2.35, // giây — đốt từ nguyên vẹn tới cháy hết
    hold: 0.7, // giây — giữ lúc đã cháy hết
    restore: 1.2, // giây — ảnh hiện lại (mode 'once' và 'loop')
    gap: 0.9, // giây — nghỉ giữa hai lượt (mode 'loop')
    stagger: 0.15, // giây — vật sau bắt đầu trễ hơn vật trước bấy nhiêu
    delay: 0, // giây — trễ chung trước khi bắt đầu

    // ------------------------------------------------------- đổi sang ảnh mới
    // Cháy xong thì LỘ RA bộ ảnh mới nằm sẵn bên dưới, không phải hiện lại ảnh
    // cũ. Ô nào để trống thì vật đó cư xử theo `mode` như thường.
    swap: true,
    newDiscLeft: '', // ảnh mặt đĩa TRÁI mới
    newDiscRight: '', // ảnh mặt đĩa PHẢI mới
    newPoster: '', // ảnh profile mới (thay poster giữa)

    // ---------------------------------------------------------- chất vết cháy
    from: 'bottom', // mép nào cháy trước: 'bottom' | 'top' | 'edge' | 'center'
    dir: 0.55, // 0 = cháy loang ngẫu nhiên khắp mặt | 1 = quét đúng một hướng
    scale: 3.2, // độ mịn của vân cháy — nhỏ = mảng to, lớn = răng cưa li ti
    charW: 0.1, // bề rộng vệt than phía trước đường lửa
    lineW: 0.028, // bề dày đường lửa
    glow: 1.5, // độ sáng đường lửa
    ember: 0.55, // than còn đỏ âm ỉ phía sau đường lửa
    ash: 0.45, // tàn tro bay lên từ chỗ đã cháy; 0 = cắt hẳn khỏi shader
    palette: 'fire', // 'fire' = cam đỏ | 'grey' = xám trắng | 'white' = lửa trắng

    // ---------------------------------------------------------------- khác
    octaves: 3, // số tầng nhiễu — núm nặng ký nhất, xem kx-blaze.js
    maxTex: 1024, // trần cỡ texture. Ảnh người dùng tải lên có thể là 2048px —
    //               mỗi ảnh 2048² nằm trên GPU là 16 MB, mà mỗi vật giữ HAI ảnh
    //               (cũ và mới) nên phải hạ xuống. 1024 vẫn nét hơn cỡ đĩa hiển thị.
    maxDpr: 1, // trần tỉ lệ pixel của canvas đốt
    // TRẦN CỨNG cạnh dài của khung vẽ, tính bằng pixel thật. Đĩa 1444px ở dpr
    // 1.5 ra khung vẽ 2166² = 19 MB MỘT canvas; ba canvas cộng với ba cái của
    // lửa mép là đủ để trình duyệt giết cả tab vì hết bộ nhớ GPU.
    maxPx: 1400,
    zIndex: 0, // 0 = để nguyên z-index thừa kế từ class của ảnh
  }

  const S = CONFIG
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)

  /* ------------------------------------------------------- trần context WebGL
   * Xem chú thích cùng tên trong kx-fire-edge.js. Hai file dùng chung một sổ
   * đếm (`window.__kxGLLive`) vì chúng cùng sống một lúc lúc bấm BURNING MODE.
   * `depth` / `stencil` tắt: chỉ vẽ một tam giác phủ màn hình, không đụng tới. */

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

  function getGL(cvs) {
    if ((window.__kxGLLive || 0) >= GL_BUDGET) {
      console.warn('[burn] đã chạm trần context WebGL, bỏ qua vật này')
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

  // Ghép fbm sẵn theo đúng số tầng, không dùng vòng lặp — bỏ hẳn phần thừa.
  function fbmSrc(oct) {
    let s = '  float v = 0.0;\n'
    let a = 0.5
    for (let i = 0; i < oct; i++) {
      s += `  v += ${a.toFixed(4)} * noise(p); p *= 2.03;\n`
      a *= 0.5
    }
    return `float fbm(vec2 p){\n${s}  return v;\n}`
  }

  // Hướng đốt. Trả về 0 ở chỗ cháy TRƯỚC, 1 ở chỗ cháy SAU.
  // `sc` là toạ độ MÀN HÌNH (đã quay ngược góc đĩa), `c` là toạ độ của chính ảnh.
  const GRAD = {
    bottom: 'sc.y + 0.5',
    top: '0.5 - sc.y',
    edge: '1.0 - min(length(c) * 2.0, 1.0)',
    center: 'min(length(c) * 2.0, 1.0)',
  }

  function fragSrc(oct, from, hasAsh) {
    return `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTex, uTexB;
uniform float uHasB;
uniform float uP, uScale, uDir, uCharW, uLineW, uGlow, uEmber, uAsh;
uniform float uPal, uCos, uSin, uTime;

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
  vec4 src = texture2D(uTex, uv);
  // Ảnh MỚI nằm sẵn bên dưới: chỗ nào ảnh cũ cháy thủng thì nó lộ ra.
  vec4 nxt = uHasB > 0.5 ? texture2D(uTexB, uv) : vec4(0.0);

  // Toạ độ màn hình: quay NGƯỢC đúng góc đĩa đang quay. Nhờ vậy đường lửa quét
  // theo hướng của màn hình, còn hoạ tiết đĩa vẫn trôi bên dưới nó.
  vec2 c  = uv - 0.5;
  vec2 sc = vec2(c.x * uCos + c.y * uSin, -c.x * uSin + c.y * uCos);

  // Trường cháy: trộn vân fBm với hướng đốt. Một pixel cháy khi tiến độ vượt
  // qua giá trị của trường tại chỗ đó (cách của ksenia-k/GRLqZVR).
  float n = fbm(sc * uScale + 7.3);
  float field = mix(n, ${GRAD[from] || GRAD.bottom}, uDir);

  // Nới hai đầu để p = 0 chắc chắn còn nguyên và p = 1 chắc chắn cháy sạch.
  float t = uP * (1.0 + 2.0 * uCharW) - uCharW;

  float burned = smoothstep(field - 0.004, field, t);
  float charr  = smoothstep(field - uCharW, field, t) * (1.0 - burned);
  float line   = smoothstep(field - uLineW, field - 0.45 * uLineW, t)
               * (1.0 - smoothstep(field - 0.45 * uLineW, field, t));

  // uPal: 0 = lửa cam đỏ | 1 = xám trắng | 2 = LỬA TRẮNG (ngả xanh cho ra cảm
  // giác cháy rất nóng, và nổi được trên mặt đĩa vốn đã trắng).
  vec3 warm = uPal > 1.5 ? vec3(0.74, 0.85, 1.00) : (uPal > 0.5 ? vec3(0.72) : vec3(1.00, 0.34, 0.05));
  vec3 hot  = uPal > 1.5 ? vec3(1.00, 1.00, 1.00) : (uPal > 0.5 ? vec3(1.00) : vec3(1.00, 0.93, 0.74));

  // Than: KHÔNG hạ về đen kịt. Hai cái đĩa được vẽ qua mix-blend-mode difference
  // trên nền #040203, nên màu càng gần đen thì càng trùng với nền — vệt than sẽ
  // trông y hệt chỗ đã thủng và mất luôn cảm giác cháy. Giữ lại một mức xám ấm
  // đủ để đọc ra là "than", không phải "lỗ".
  vec3 col = mix(src.rgb, src.rgb * 0.13 + vec3(0.085, 0.062, 0.050), charr * 0.94);

  // Ghép hai lớp theo đúng phần diện tích mỗi lớp còn chiếm: ảnh cũ giữ phần
  // chưa cháy, ảnh mới nhận phần đã cháy. Cộng thẳng rồi chia lại cho tổng độ
  // đục, không thì chỗ giao nhau bị tối đi một vệt.
  float aOld = src.a * (1.0 - burned);
  float aNew = nxt.a * burned * uHasB;
  float alpha = clamp(aOld + aNew, 0.0, 1.0);
  col = (col * aOld + nxt.rgb * aNew) / max(aOld + aNew, 0.0001);

  // Rìa than còn đỏ âm ỉ.
  float embN = 0.45 + 0.55 * noise(sc * 26.0 + vec2(0.0, -uTime * 0.6));
  col += warm * uEmber * pow(charr, 2.2) * embN;

  // Đường lửa — chỗ sáng nhất, rung theo thời gian. Cộng SAU khi đã ghép hai
  // lớp, không thì phép chia ở trên làm nhạt mất đường lửa.
  float flick = 0.72 + 0.28 * noise(sc * 34.0 + vec2(0.0, -uTime * 3.2));
  float L = line * flick;
  col += (warm * 1.7 + hot * L) * L * uGlow;
  alpha = max(alpha, L * min(uGlow, 1.0));
${
  hasAsh
    ? `
  // Tàn tro: vài ô trong lưới được sáng, chỉ nổi lên ở phần ĐÃ cháy.
  vec2 ag = vec2(sc.x * 46.0, sc.y * 26.0 + uTime * 2.1);
  float sp = 0.0;
  if (hash(floor(ag)) > 0.984) {
    sp = smoothstep(0.34, 0.0, length(fract(ag) - 0.5));
  }
  sp *= burned * (1.0 - smoothstep(0.75, 1.0, uP));
  col += mix(warm, hot, 0.35) * sp * uAsh * 2.0;
  alpha = max(alpha, sp * uAsh);`
    : ''
}
  alpha = clamp(alpha, 0.0, 1.0);
  gl_FragColor = vec4(col * alpha, alpha);
}`
  }

  /* =================================================================== dựng */

  const items = []
  let raf = 0
  let clock = 0
  let last = 0
  let frame = 0
  let sweepTimer = 0
  let wasEnabled = false
  let shaderKey = ''
  let srcKey = ''

  // Ảnh mới của một vật. Trống = vật đó không đổi ảnh, cư xử theo `mode`.
  function newSrcFor(img) {
    if (!S.swap) return ''
    if (img.matches('.hm-disc--l')) return S.newDiscLeft || ''
    if (img.matches('.hm-disc--r')) return S.newDiscRight || ''
    if (img.matches(S.posterTarget)) return S.newPoster || ''
    return ''
  }

  function selector() {
    const a = []
    if (S.targets !== 'poster') a.push(S.discTarget)
    if (S.targets !== 'discs') a.push(S.posterTarget)
    return a.join(',')
  }

  // Ảnh nguồn thu về trong trần maxTex rồi mới nạp — đĩa là PNG 1200px, để
  // nguyên cũng được, nhưng máy yếu hạ xuống là nhẹ hẳn.
  function makeTexture(gl, img) {
    const cap = Math.max(64, Math.round(S.maxTex))
    const w = img.naturalWidth || img.width
    const h = img.naturalHeight || img.height
    if (!w || !h) return null
    const tex = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
    let src = img
    if (Math.max(w, h) > cap) {
      const k = cap / Math.max(w, h)
      const c = document.createElement('canvas')
      c.width = Math.max(1, Math.round(w * k))
      c.height = Math.max(1, Math.round(h * k))
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
      src = c
    }
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src)
    // Ảnh không phải luỹ thừa của 2 nên bắt buộc CLAMP_TO_EDGE + LINEAR.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    return tex
  }

  function compile(d) {
    const gl = d.gl
    const oct = clamp(Math.round(S.octaves), 1, 5)
    const from = GRAD[S.from] ? S.from : 'bottom'
    const hasAsh = S.ash > 0.001
    const key = oct + '|' + from + '|' + hasAsh
    if (d.prog && d.key === key) return true

    const sh = (ty, src) => {
      const s = gl.createShader(ty)
      gl.shaderSource(s, src)
      gl.compileShader(s)
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.warn('[burn] shader lỗi:', gl.getShaderInfoLog(s))
        return null
      }
      return s
    }
    const vs = sh(gl.VERTEX_SHADER, VERT)
    const fs = sh(gl.FRAGMENT_SHADER, fragSrc(oct, from, hasAsh))
    if (!vs || !fs) return false
    if (d.prog) gl.deleteProgram(d.prog)
    const p = gl.createProgram()
    gl.attachShader(p, vs)
    gl.attachShader(p, fs)
    gl.linkProgram(p)
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      console.warn('[burn] link lỗi:', gl.getProgramInfoLog(p))
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
    ;['uTex','uTexB','uHasB','uP','uScale','uDir','uCharW','uLineW','uGlow','uEmber','uAsh','uPal','uCos','uSin','uTime']
      .forEach((n) => (d.u[n] = gl.getUniformLocation(p, n)))
    gl.clearColor(0, 0, 0, 0)
    return true
  }

  function upgrade(img) {
    const cvs = document.createElement('canvas')
    // Cùng class = ăn cùng CSS: vị trí, cỡ, và cả mix-blend-mode của .hm-discs.
    cvs.className = img.className + ' kx-burn'
    cvs.setAttribute('aria-hidden', 'true')
    cvs.style.pointerEvents = 'none'
    if (S.zIndex) cvs.style.zIndex = String(S.zIndex)
    const gl = getGL(cvs)
    if (!gl) return null

    // PHẢI tìm canvas của kx-disc-fx.js TRƯỚC khi chèn canvas của mình vào —
    // chèn xong thì previousElementSibling của <img> là canvas của chính mình.
    const prev = img.previousElementSibling
    const fx = prev && prev.classList && prev.classList.contains('hm-disc-fx') ? prev : null

    const d = {
      img, cvs, fx, gl,
      dead: false, released: false, prog: null, key: '', buf: null, u: null,
      tex: null, // ảnh đang hiện
      texB: null, // ảnh mới, lộ ra sau vệt cháy
      newSrc: newSrcFor(img),
      // Ảnh mới TRÙNG ảnh đang hiện: đường lửa vẫn quệt qua nhưng ảnh không hề
      // đổi. Dùng chung một texture, không nạp thêm cái thứ hai cho tốn.
      sameSrc: false,
      lastTransform: '',
    }
    if (!compile(d)) return null
    // Context có thể bị trình duyệt thu hồi bất cứ lúc nào (xem release()).
    cvs.addEventListener('webglcontextlost', (ev) => {
      ev.preventDefault()
      d.dead = true
      if (!d.released) {
        d.released = true
        glCount(-1)
      }
    })

    hide(img, true) // opacity — <img> phải còn nhận được chuột
    hide(fx, false)
    img.parentNode.insertBefore(cvs, img)

    const load = () => {
      d.tex = makeTexture(d.gl, img)
    }
    if (img.complete && img.naturalWidth) load()
    else img.addEventListener('load', load, { once: true })

    // Ảnh mới nạp song song. Chưa kịp nạp xong thì `uHasB` vẫn là 0 và vật đó
    // cháy thủng ra nền như thường — không bao giờ chớp một khung trống.
    if (d.newSrc && d.newSrc === img.getAttribute('src')) {
      d.sameSrc = true
    } else if (d.newSrc) {
      const im = new Image()
      im.decoding = 'async'
      im.onload = () => {
        if (!d.dead) d.texB = makeTexture(d.gl, im)
      }
      im.onerror = () => console.warn('[burn] không nạp được ảnh mới:', d.newSrc)
      im.src = d.newSrc
    }

    items.push(d)
    return d
  }

  /* --------------------------------------------------- giấu / trả lại ảnh gốc
   * Ảnh gốc phải biến mất trong lúc đốt, và nếu kx-disc-fx.js đang bật thì
   * canvas CỦA NÓ mới là cái đang hiện mặt đĩa — phải giấu luôn, không thì đĩa
   * nguyên vẹn vẫn nằm chồng bên dưới. Giá trị inline cũ được cất lại trong
   * dataset để trả về đúng như trước (kx-disc-fx.js đặt img.style.opacity = 0). */

  /* THẺ <img> PHẢI GIẤU BẰNG `opacity`, KHÔNG PHẢI `visibility`.
   * `visibility: hidden` cắt luôn cả chuột: trong suốt mấy giây đốt thì bấm vào
   * đĩa không còn play/pause được nữa, và đó đúng là mấy giây đầu tiên người xem
   * chạm vào trang. Thẻ <img> ở lại để nhận chuột là cả kx-disc-fx.js cũng dựa
   * vào (nó cũng dùng opacity, đúng vì lý do này). Đây từng là lỗi thật.
   *
   * Canvas của kx-disc-fx.js thì ngược lại: nó KHÔNG mang listener nào, và nó
   * nằm dưới thẻ <img> nên có giấu bằng `visibility` cũng không chắn chuột. */

  function hide(el, dungOpacity) {
    if (!el || el.dataset.kxBurnHid) return
    const dac = dungOpacity ? 'opacity' : 'visibility'
    el.dataset.kxBurnHid = dac + '|' + (el.style[dac] || '')
    el.style[dac] = dungOpacity ? '0' : 'hidden'
  }

  function show(el) {
    if (!el || !el.dataset.kxBurnHid) return
    const i = el.dataset.kxBurnHid.indexOf('|')
    el.style[el.dataset.kxBurnHid.slice(0, i)] = el.dataset.kxBurnHid.slice(i + 1)
    delete el.dataset.kxBurnHid
  }

  function restoreAll() {
    document.querySelectorAll('[data-kx-burn-hid]').forEach(show)
  }

  /* --------------------------------------------------------- trả context về
   * MỖI CANVAS ĐỐT LÀ MỘT CONTEXT WEBGL, và trình duyệt chỉ cho sống một số
   * lượng nhất định trên cùng một trang — vượt trần thì nó THU HỒI CÁI CŨ NHẤT,
   * mà cái cũ nhất ở trang này chính là context vẽ mặt đĩa của kx-disc-fx.js.
   * Gỡ canvas khỏi DOM KHÔNG trả context về ngay: nó nằm chờ bộ dọn bộ nhớ. Mà
   * file này dựng lại 3 context MỖI LẦN đốt lại, nên đốt vài lượt là bỏ lại cả
   * chục context chết và một bên đĩa biến mất. Phải gọi loseContext() để trả về
   * ngay tại chỗ. Đây từng là lỗi thật. */

  function release(d) {
    try {
      if (d.tex) d.gl.deleteTexture(d.tex)
      if (d.texB) d.gl.deleteTexture(d.texB)
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

  /* ------------------------------------------------------- chốt sang ảnh mới
   * Canvas GIỮ NGUYÊN cho tới khi ảnh mới nạp xong: ở khung cuối nó đã vẽ đúng
   * ảnh mới rồi (p = 1 nên toàn bộ diện tích là lớp mới), nên bỏ canvas trước
   * lúc <img> sẵn sàng là chớp một khung trống.
   *
   * kx-disc-fx.js nạp texture mặt đĩa MỘT LẦN lúc ảnh load xong, nên đổi `src`
   * không thôi thì nó vẫn vẽ mặt đĩa cũ. Phải gọi rebuild() của nó — gom một
   * lần cho cả hai đĩa thay vì gọi hai lần. */

  let discRebuild = 0

  // Ảnh GỐC của những thẻ <img> đã bị đổi. Đổi `src` là thay đổi thật trên DOM
  // và nó KHÔNG tự mất đi khi tắt hiệu ứng — không cất lại chỗ này thì tắt
  // burning mode xong đĩa vẫn đứng ở bộ ảnh mới. Đây từng là lỗi thật.
  const swapped = new Map()

  function afterDiscSwap() {
    const fx = window.KX_DISC_FX
    if (!fx) return
    // PHẢI là refreshTextures(), KHÔNG phải rebuild(). rebuild() dựng lại context
    // WebGL cho cả hai đĩa; gọi nó mỗi lần bật/tắt burning mode là bộ nhớ GPU cứ
    // thế phình ra cho tới lúc trình duyệt giết cả tab. Ở đây chỉ cần nạp lại
    // texture từ thẻ <img> vừa đổi src. Đây từng là lỗi thật.
    clearTimeout(discRebuild)
    discRebuild = setTimeout(() => (fx.refreshTextures || fx.rebuild)(), 60)
  }

  function commitSwap(d) {
    const isDisc = d.img.matches(S.discTarget)
    if (!swapped.has(d.img)) swapped.set(d.img, d.img.getAttribute('src'))
    const finish = () => {
      show(d.img)
      show(d.fx)
      release(d)
      if (isDisc) afterDiscSwap()
    }
    d.img.addEventListener('load', finish, { once: true })
    d.img.addEventListener('error', finish, { once: true })
    d.img.src = d.newSrc
    // Ảnh đã nằm sẵn trong bộ nhớ đệm thì `load` có thể không bắn nữa.
    if (d.img.complete && d.img.naturalWidth) finish()
  }

  /* Trả mọi ảnh đã đổi về đúng ảnh gốc. Gọi khi TẮT hiệu ứng — không gọi trong
   * stop(), vì stop() còn chạy ở cuối mỗi lượt đốt bình thường và như thế thì
   * bộ ảnh mới vừa hiện ra đã bị lật lại ngay. */
  function revert() {
    if (!swapped.size) return
    let hadDisc = false
    swapped.forEach((src, img) => {
      if (!img.isConnected || src == null) return
      if (img.matches(S.discTarget)) hadDisc = true
      img.src = src
    })
    swapped.clear()
    if (hadDisc) afterDiscSwap()
  }

  /* ------------------------------------------------------------------ nhịp */

  // Tiến độ của một vật tại thời điểm `lt` (giây, đã trừ phần trễ của nó).
  // Trả về -1 khi lượt đốt đã xong hẳn và phải trả ảnh về.
  function progressAt(lt, swapping) {
    if (lt <= 0) return 0
    const dur = Math.max(0.05, S.duration)
    if (lt < dur) return lt / dur
    const t1 = dur + Math.max(0, S.hold)
    if (lt < t1) return 1
    // Vật có ảnh mới thì cháy xong là CHỐT luôn, không hiện lại ảnh cũ.
    if (swapping) return -1
    if (S.mode === 'away') return 1
    const res = Math.max(0.05, S.restore)
    if (lt < t1 + res) return 1 - (lt - t1) / res
    if (S.mode === 'loop') return 0
    return -1
  }

  function cycleLen() {
    return (
      Math.max(0.05, S.duration) +
      Math.max(0, S.hold) +
      Math.max(0.05, S.restore) +
      Math.max(0, S.gap)
    )
  }

  // Góc đĩa đang quay, đọc thẳng từ transform mà kx-hello-mate.js vừa ghi.
  // Dùng indexOf + parseFloat chứ không regex — mỗi exec() sinh một mảng, mà
  // hàm này chạy MỖI KHUNG cho mỗi đĩa (xem "hai điều cấm" trong CLAUDE.md).
  function angleOf(el) {
    const s = el.style.transform
    if (!s) return 0
    const i = s.indexOf('rotate(')
    if (i < 0) return 0
    return (parseFloat(s.slice(i + 7)) || 0) * (Math.PI / 180)
  }

  function resize(d) {
    const w = d.img.offsetWidth
    const h = d.img.offsetHeight
    if (!w || !h) return
    const dpr = Math.min(window.devicePixelRatio || 1, Math.max(0.5, S.maxDpr))
    // Trần cứng: màn to hay đĩa to tới đâu, khung vẽ cũng không vượt maxPx.
    const cap = Math.max(64, Math.round(S.maxPx))
    const k = Math.min(1, cap / Math.max(w * dpr, h * dpr))
    const cw = Math.max(2, Math.round(w * dpr * k))
    const ch = Math.max(2, Math.round(h * dpr * k))
    if (d.cvs.width === cw && d.cvs.height === ch) return
    d.cvs.width = cw
    d.cvs.height = ch
    d.gl.viewport(0, 0, cw, ch)
  }

  function tick(now) {
    raf = requestAnimationFrame(tick)
    if (!last) last = now
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now
    clock += dt
    frame++

    // Đo layout THƯA (30 khung một lần) chứ không mỗi khung — trang lúc nào
    // cũng có cột chữ chạy và hai đĩa quay, đo mỗi khung là ép tính lại layout.
    const remeasure = frame % 30 === 1

    let alive = false
    for (let i = 0; i < items.length; i++) {
      const d = items[i]
      if (d.dead) {
        // Context mất giữa chừng: trả ảnh về ngay chứ đừng để nó ẩn mãi.
        show(d.img)
        show(d.fx)
        release(d)
        items.splice(i, 1)
        i--
        continue
      }
      if (remeasure) resize(d)
      if (!d.tex) {
        alive = true
        continue
      }

      const swapping = !!(d.newSrc && (d.texB || d.sameSrc))
      let lt = clock - Math.max(0, S.delay) - i * Math.max(0, S.stagger)
      if (S.mode === 'loop' && !swapping && lt > 0) lt = lt % cycleLen()
      const p = progressAt(lt, swapping)
      if (p < 0) {
        // Vật này đốt xong.
        items.splice(i, 1)
        i--
        if (swapping) commitSwap(d)
        else {
          // Trả ảnh (và canvas của kx-disc-fx.js) về, trả luôn context WebGL
          // chứ không để canvas chết nằm chờ bộ dọn bộ nhớ.
          show(d.img)
          show(d.fx)
          release(d)
        }
        continue
      }
      alive = true

      const gl = d.gl
      const u = d.u
      gl.useProgram(d.prog)
      gl.bindBuffer(gl.ARRAY_BUFFER, d.buf)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, d.tex)
      gl.uniform1i(u.uTex, 0)
      gl.activeTexture(gl.TEXTURE1)
      gl.bindTexture(gl.TEXTURE_2D, d.texB || d.tex)
      gl.uniform1i(u.uTexB, 1)
      gl.uniform1f(u.uHasB, d.texB || d.sameSrc ? 1 : 0)
      const a = angleOf(d.img)
      gl.uniform1f(u.uCos, Math.cos(a))
      gl.uniform1f(u.uSin, Math.sin(a))
      gl.uniform1f(u.uP, p)
      gl.uniform1f(u.uScale, Math.max(0.2, S.scale))
      gl.uniform1f(u.uDir, clamp(S.dir, 0, 1))
      gl.uniform1f(u.uCharW, Math.max(0.002, S.charW))
      gl.uniform1f(u.uLineW, Math.max(0.002, S.lineW))
      gl.uniform1f(u.uGlow, S.glow)
      gl.uniform1f(u.uEmber, S.ember)
      gl.uniform1f(u.uAsh, S.ash)
      gl.uniform1f(u.uPal, S.palette === 'white' ? 2 : S.palette === 'grey' ? 1 : 0)
      gl.uniform1f(u.uTime, clock)
      gl.drawArrays(gl.TRIANGLES, 0, 3)

      // Chép transform của <img> để đĩa vẫn quay đúng như cũ.
      const tr = d.img.style.transform
      if (tr !== d.lastTransform) {
        d.lastTransform = tr
        d.cvs.style.transform = tr
      }
    }

    if (!alive) stop()
  }

  /* ------------------------------------------------------------- bật / tắt */

  function start() {
    // Đánh dấu ngay: nếu không, vòng quét thấy enabled vừa bật lên sẽ gọi
    // start() thêm lần nữa và màn đốt chạy lại từ đầu ngay giữa chừng.
    wasEnabled = S.enabled
    stop()
    const sel = selector()
    if (!sel) return
    document.querySelectorAll(sel).forEach((img) => {
      if (img.tagName === 'IMG') upgrade(img)
    })
    items.forEach(resize)
    if (items.length) {
      clock = 0
      last = 0
      frame = 0
      raf = requestAnimationFrame(tick)
    }
  }

  function stop() {
    if (raf) cancelAnimationFrame(raf)
    raf = 0
    last = 0
    items.forEach(release)
    items.length = 0
    restoreAll()
  }

  const replay = () => {
    if (S.enabled) start()
  }

  /* ------------------------------------------------------------- vòng quét */

  function sweep() {
    // Tắt rồi bật lại = đốt lại từ đầu. Bảng tinh chỉnh không có nút bấm, nên
    // chính ô "Bật đốt" đóng luôn vai nút chạy lại.
    if (S.enabled && !wasEnabled) {
      wasEnabled = true
      start()
      return
    }
    if (!S.enabled && wasEnabled) {
      wasEnabled = false
      stop()
      revert() // tắt là trả luôn ảnh gốc, không để đĩa đứng ở bộ ảnh mới
      return
    }
    // Đổi shader (số tầng nhiễu / hướng đốt / tàn tro) thì biên dịch lại tại chỗ.
    const key = clamp(Math.round(S.octaves), 1, 5) + '|' + S.from + '|' + (S.ash > 0.001)
    if (key !== shaderKey) {
      shaderKey = key
      items.forEach(compile)
    }
    // Đổi bộ ảnh mới trong bảng thì phải nạp lại texture, không sửa nóng được.
    const imgKey = [S.swap, S.newDiscLeft, S.newDiscRight, S.newPoster].join('|')
    if (imgKey !== srcKey) {
      srcKey = imgKey
      if (items.length) start()
    }
  }

  // Bật Fire Effect thì đốt một lượt trước rồi lửa mới bám mép.
  window.addEventListener('kx-fire-on', () => {
    if (S.playOnFire && S.enabled) start()
  })

  window.addEventListener('resize', () => items.forEach(resize))

  function boot() {
    sweepTimer = setInterval(sweep, 300)
    sweep()
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true })
  else boot()

  // Chỉ để bảng tinh chỉnh (kx-devtools.js) đọc/ghi lúc chạy.
  window.KX_BURN_IMAGE = {
    config: S,
    defaults: Object.freeze({ ...CONFIG }),
    items,
    start,
    stop,
    replay,
    revert,
    // Quên mọi lượt đổi đã chốt mà KHÔNG trả ảnh về. Màn mở đầu dùng hàm này:
    // nó đốt từ bộ ảnh burning về bộ mặc định, nên sau đó "ảnh gốc" phải là bộ
    // MẶC ĐỊNH — không thì bấm nút rồi tắt lại sẽ nhảy về bộ burning.
    forget: () => swapped.clear(),
  }
})()
