/* =============================================================================
 * kaixa Portfolio — Đường sáng kính lỏng theo máy CD (Home)
 * -----------------------------------------------------------------------------
 * Người dùng chốt: "khi CD player đi qua phần ảnh này, sẽ có 1 đường sáng
 * ngang, ở đường sáng đó sẽ có hiệu ứng liquid glass áp dụng lên ảnh bên
 * dưới". Một đường sáng nằm ngang chạy theo TÂM máy CD (kx-cd3d.js); ảnh nào
 * trong `anh` (mặc định hai ảnh ngay dưới cụm "02.") bị đường đó cắt qua thì trong một DẢI quanh đường, ảnh bị bẻ như kính lỏng: phóng về
 * phía đường sáng, gợn ngang, tách đỏ/lam, ánh màu — cùng ngôn ngữ kính của
 * Works / Feature Works. Hai mép trên/dưới của dải MỜ DẦN vào ảnh gốc (người
 * dùng chốt) — không có viền cứng.
 *
 * - MỘT canvas WebGL2 cố định, rộng hết màn, cao đúng dải (+ quầng), trượt
 *   theo đường sáng bằng transform (compositor, không đụng layout). Vẽ từng
 *   ảnh trong phần giao với dải (scissor), ngoài ảnh trong suốt.
 * - Ảnh có shader Figma thì kính bẻ đúng bản ĐÃ chạy shader: kx-shader-effect.js
 *   chụp kết quả WebGPU ra ImageBitmap và phát `kx-shader-xong`. Còn lại (và
 *   khi trình duyệt không có WebGPU) dùng chính thẻ <img>.
 * - Ảnh Figma hay to hơn khung rồi bị khung xén (overflow): lấy mẫu theo hộp
 *   của <img>, nhưng chỉ vẽ trong phần giao với hộp của KHỐI CHỨA.
 * - Toạ độ ảnh trên trang đo THƯA (đổi cỡ, load, ảnh shader xong, 60 khung một
 *   lần); mỗi khung chỉ trừ scrollY (luật cấm số 1). Vòng rAF luôn sống, không
 *   có gì để vẽ thì bỏ qua, không cấp phát trong vòng (luật cấm số 2).
 * - Máy CD tắt / ngoài màn (`KX_CD3D.hinhMay.hien`) thì đường sáng tắt dần.
 * - Số đo là px THIẾT KẾ (× bề rộng trang / 1920) — co giãn cùng nội dung.
 * - Không viết dấu huyền trong khối GLSL (luật số 4).
 * File KHÔNG chứa UI setting.
 * ========================================================================== */
(function () {
  'use strict'

  var CONFIG = {
    enabled: true,
    // Khối chứa ảnh bị kính bẻ (selector, cách nhau dấu phẩy) — CHỈ section
    // ngay dưới cụm "02." (người dùng chốt): nền section (1:459, ảnh nền là ảnh
    // ĐẦU TIÊN trong nó), cô gái (1:461), poster xanh (1:460). Vẽ theo thứ tự
    // tài liệu: nền trước, hai ảnh đè lên — đường sáng liền một mạch ngang
    // section. Ảnh nào có shader Figma (data-kx-shader) thì kính bẻ đúng bản
    // đã chạy shader.
    anh: '[data-n="1:459"],[data-n="1:461"],[data-n="1:460"]',
    viTri: 0.5, // đường sáng nằm ở đâu theo chiều cao máy: 0 = đỉnh, 1 = đáy
    band: 70, // px thiết kế — nửa bề dày dải kính quanh đường sáng
    zoom: 0.35, // phóng hình về phía đường sáng (0 = không phóng)
    song: 6, // px thiết kế — gợn ngang
    tanSo: 0.02, // gợn mỗi px thiết kế
    tocDo: 1.2, // gợn trôi
    tachMau: 5, // px thiết kế — tách đỏ/lam theo phương dọc
    vien: 0.8, // ánh màu trong dải kính (đậm ở đường sáng, nhạt dần ra mép)
    mauVien: '#009dff', // màu ánh trong dải
    loi: 1, // độ sáng lõi đường sáng
    loiDay: 1.2, // px thiết kế — bề dày lõi
    quang: 0.45, // quầng quanh đường sáng
    quangRong: 26, // px thiết kế — quầng lan bao xa
    mau: '#e8f4ff', // màu đường sáng
    vao: 0.12, // 0..1 mỗi khung 60fps — hiện / tắt dần
    maxDpr: 2,
    zIndex: 19, // dưới máy CD (20), trên nội dung trang
  }

  var S = CONFIG
  var api = (window.KX_CD_GLASS = { config: S, defaults: Object.freeze(Object.assign({}, CONFIG)) })

  var VERT = '#version 300 es\nin vec2 p;\nvoid main(){ gl_Position = vec4(p, 0.0, 1.0); }'
  var FRAG = [
    '#version 300 es',
    'precision highp float;',
    'uniform sampler2D uT;',
    'uniform vec2 uRes, uImg;', // canvas (px css), cỡ gốc ảnh
    'uniform vec4 uRect;', // ảnh trong hệ toạ độ canvas: x, y, rộng, cao
    'uniform float uDpr, uLine, uBand, uZoom, uWave, uFreq, uTime, uDisp, uRim;',
    'uniform float uCore, uCoreW, uGlow, uGlowW, uStr;',
    'uniform vec3 uCol, uAura;',
    'out vec4 o;',
    'vec3 anh(vec2 s){',
    '  vec2 uv = (s - uRect.xy) / uRect.zw;',
    '  float fa = uRect.z / uRect.w;',
    '  float ia = uImg.x / uImg.y;',
    '  if (ia > fa) uv.x = 0.5 + (uv.x - 0.5) * fa / ia;',
    '  else uv.y = 0.5 + (uv.y - 0.5) * ia / fa;',
    '  return texture(uT, clamp(uv, 0.0, 1.0)).rgb;',
    '}',
    'void main(){',
    '  vec2 p = vec2(gl_FragCoord.x, uRes.y * uDpr - gl_FragCoord.y) / uDpr;',
    '  float dy = p.y - uLine;',
    '  float d = abs(dy) / uBand;',
    '  vec3 col = vec3(0.0);',
    '  float aB = 0.0;',
    '  if (d < 1.0) {',
    '    float t = 1.0 - d;',
    '    float w = t * t * (3.0 - 2.0 * t);', // mạnh ở giữa, 0 ở mép dải: không gãy
    '    float sy = uLine + dy * (1.0 - uZoom * w);',
    // gợn ngang tắt dần ở hai mép trái/phải của ảnh — không kéo pixel ngoài ảnh vào
    '    float le = clamp(min(p.x - uRect.x, uRect.x + uRect.z - p.x) / max(uWave * 4.0, 1.0), 0.0, 1.0);',
    '    float sx = p.x + sin(p.y * uFreq * 6.2832 + uTime) * uWave * w * le;',
    '    float dsp = uDisp * w * sign(dy);',
    '    col = vec3(anh(vec2(sx, sy + dsp)).r, anh(vec2(sx, sy)).g, anh(vec2(sx, sy - dsp)).b);',
    // HAI MÉP TRÊN / DƯỚI MỜ DẦN (người dùng chốt): không viền cứng; lớp
    // kính trộn dần vào ảnh gốc theo w (1 ở đường sáng, 0 ở mép dải), ánh
    // màu cũng đậm ở giữa, nhạt dần ra mép.
    '    col += uAura * w * 0.22 * uRim;',
    '    aB = w;',
    '  }',
    '  float core = exp(-pow(dy / uCoreW, 2.0)) * uCore;',
    '  float glow = exp(-abs(dy) / uGlowW) * uGlow;',
    '  float aL = clamp(core + glow, 0.0, 1.0);',
    '  vec3 rgb = col * aB + uCol * (core + glow);',
    '  float a = max(aB, aL);',
    '  o = vec4(rgb, a) * uStr;', // khung vẽ premultiplied
    '}',
  ].join('\n')

  function mau3(hex) {
    var v = parseInt(String(hex).replace('#', ''), 16)
    if (isNaN(v)) return [1, 1, 1]
    return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255]
  }

  function boot() {
    if (!S.enabled) return
    var page = document.querySelector('.kx-page')
    if (!page) return

    var cv = document.createElement('canvas')
    cv.setAttribute('aria-hidden', 'true')
    cv.className = 'kx-cdg-line'
    cv.style.cssText =
      'position:fixed;left:0;top:0;pointer-events:none;visibility:hidden;will-change:transform;z-index:' + S.zIndex
    var gl = cv.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false })
    if (!gl) return
    function sh(t, src) {
      var x = gl.createShader(t)
      gl.shaderSource(x, src)
      gl.compileShader(x)
      if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) {
        console.warn('kx-cd-glass:', gl.getShaderInfoLog(x))
        return null
      }
      return x
    }
    var vs = sh(gl.VERTEX_SHADER, VERT)
    var fs = sh(gl.FRAGMENT_SHADER, FRAG)
    if (!vs || !fs) return
    var prog = gl.createProgram()
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.bindAttribLocation(prog, 0, 'p')
    gl.linkProgram(prog)
    gl.useProgram(prog)
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
    var U = {}
    ;[
      'uT', 'uRes', 'uImg', 'uRect', 'uDpr', 'uLine', 'uBand', 'uZoom', 'uWave', 'uFreq', 'uTime', 'uDisp',
      'uRim', 'uCore', 'uCoreW', 'uGlow', 'uGlowW', 'uStr', 'uCol', 'uAura',
    ].forEach(function (n) {
      U[n] = gl.getUniformLocation(prog, n)
    })
    gl.uniform1i(U.uT, 0)
    gl.enable(gl.SCISSOR_TEST)
    document.body.appendChild(cv)

    /* ------------------------------------------------------------ ảnh */
    var ds = [] // { host, img, tex, w, h (cỡ gốc), top, left, rong, cao (px trang) }
    function nap(o) {
      var src = o.host.__kxAnh || (o.img && o.img.complete && o.img.naturalWidth ? o.img : null)
      if (!src || src === o.src) return
      o.src = src
      if (!o.tex) {
        o.tex = gl.createTexture()
        gl.bindTexture(gl.TEXTURE_2D, o.tex)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      } else gl.bindTexture(gl.TEXTURE_2D, o.tex)
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
      try {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src)
      } catch (e) {
        o.src = null
        return
      }
      // Bitmap của shader đã cắt sẵn theo khung ảnh; <img> thì cắt cover trong shader.
      o.w = src === o.img ? o.img.naturalWidth : src.width
      o.h = src === o.img ? o.img.naturalHeight : src.height
    }
    function gom() {
      ds = []
      document.querySelectorAll(S.anh).forEach(function (host) {
        var img = host.tagName === 'IMG' ? host : host.querySelector('img')
        if (img) {
          ds.push({ host: host, img: img, tex: null, src: null, w: 1, h: 1, top: 0, left: 0, rong: 0, cao: 0,
            kTop: 0, kLeft: 0, kRong: 0, kCao: 0 })
        }
      })
    }
    var u = 1
    function doLai() {
      u = page.getBoundingClientRect().width / 1920
      for (var i = 0; i < ds.length; i++) {
        var o = ds[i]
        var r = o.img.getBoundingClientRect()
        o.left = r.left
        o.top = r.top + window.scrollY
        o.rong = r.width
        o.cao = r.height
        // Khung xén = giao của ảnh với khối chứa.
        var k = o.host.getBoundingClientRect()
        o.kLeft = Math.max(r.left, k.left)
        o.kTop = Math.max(r.top, k.top) + window.scrollY
        o.kRong = Math.max(0, Math.min(r.right, k.right) - o.kLeft)
        o.kCao = Math.max(0, Math.min(r.bottom, k.bottom) + window.scrollY - o.kTop)
        nap(o)
      }
    }
    gom()
    doLai()
    addEventListener('resize', doLai)
    addEventListener('load', doLai)
    addEventListener('kx-shader-xong', function (e) {
      for (var i = 0; i < ds.length; i++) if (ds[i].host === e.detail) nap(ds[i])
    })

    /* ------------------------------------------------------- khung vẽ */
    var W = 0
    var H = 0
    var dpr = 1
    function coKhung() {
      var w = document.documentElement.clientWidth
      var h = Math.ceil(2 * (S.band + S.quangRong * 2) * u)
      var d = Math.min(window.devicePixelRatio || 1, S.maxDpr)
      if (w === W && h === H && d === dpr) return
      W = w
      H = h
      dpr = d
      cv.width = Math.round(W * dpr)
      cv.height = Math.round(H * dpr)
      cv.style.width = W + 'px'
      cv.style.height = H + 'px'
      gl.viewport(0, 0, cv.width, cv.height)
    }

    var str = 0
    var yLine = 0 // giữ chỗ đường sáng cuối cùng — tắt dần tại chỗ, không nhảy
    var an = true
    var yCu = NaN
    var dem = 0
    var last = performance.now()
    var mL = [1, 1, 1]
    var mA = [0, 0.6, 1]
    var mauCu = ''

    function khung(now) {
      requestAnimationFrame(khung)
      var f = Math.min((now - last) / 16.67, 3) || 1
      last = now
      if ((dem = (dem + 1) % 60) === 0) doLai()
      var cd = window.KX_CD3D
      var h = cd && cd.hinhMay
      var trung = false
      if (S.enabled && h && h.hien) {
        yLine = h.y0 + (h.y1 - h.y0) * S.viTri
        var nua = S.band * u
        var sy = window.scrollY
        for (var i = 0; i < ds.length; i++) {
          var o = ds[i]
          var t = o.kTop - sy
          if (o.tex && yLine + nua > t && yLine - nua < t + o.kCao) {
            trung = true
            break
          }
        }
      }
      str += ((trung ? 1 : 0) - str) * (1 - Math.pow(1 - S.vao, f))
      if (str < 0.003 && !trung) {
        str = 0
        if (!an) {
          an = true
          cv.style.visibility = 'hidden'
        }
        return
      }
      if (an) {
        an = false
        cv.style.visibility = 'visible'
      }
      coKhung()
      var top = Math.round((yLine - H / 2) * 2) / 2
      if (top !== yCu) {
        yCu = top
        cv.style.transform = 'translate3d(0,' + top + 'px,0)'
      }
      var mk = S.mau + S.mauVien
      if (mk !== mauCu) {
        mauCu = mk
        mL = mau3(S.mau)
        mA = mau3(S.mauVien)
      }

      gl.disable(gl.SCISSOR_TEST)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.enable(gl.SCISSOR_TEST)
      gl.uniform2f(U.uRes, W, H)
      gl.uniform1f(U.uDpr, dpr)
      gl.uniform1f(U.uLine, H / 2)
      gl.uniform1f(U.uBand, Math.max(1, S.band * u))
      gl.uniform1f(U.uZoom, S.zoom)
      gl.uniform1f(U.uWave, S.song * u)
      gl.uniform1f(U.uFreq, S.tanSo / Math.max(0.01, u))
      gl.uniform1f(U.uTime, (now / 1000) * S.tocDo)
      gl.uniform1f(U.uDisp, S.tachMau * u)
      gl.uniform1f(U.uRim, S.vien)
      gl.uniform1f(U.uCore, S.loi)
      gl.uniform1f(U.uCoreW, Math.max(0.3, S.loiDay * u))
      gl.uniform1f(U.uGlow, S.quang)
      gl.uniform1f(U.uGlowW, Math.max(0.5, S.quangRong * u))
      gl.uniform1f(U.uStr, str)
      gl.uniform3f(U.uCol, mL[0], mL[1], mL[2])
      gl.uniform3f(U.uAura, mA[0], mA[1], mA[2])
      var sy2 = window.scrollY
      for (var j = 0; j < ds.length; j++) {
        var a = ds[j]
        if (!a.tex) continue
        var y = a.top - sy2 - top // đỉnh ảnh trong hệ toạ độ canvas
        var ky = a.kTop - sy2 - top // đỉnh khung xén
        // Scissor: phần khung xén giao với canvas (toạ độ WebGL tính từ đáy).
        var x0 = Math.max(0, a.kLeft)
        var x1 = Math.min(W, a.kLeft + a.kRong)
        var y0 = Math.max(0, ky)
        var y1 = Math.min(H, ky + a.kCao)
        if (x1 <= x0 || y1 <= y0) continue
        gl.scissor(
          Math.floor(x0 * dpr),
          Math.floor((H - y1) * dpr),
          Math.ceil((x1 - x0) * dpr),
          Math.ceil((y1 - y0) * dpr)
        )
        gl.bindTexture(gl.TEXTURE_2D, a.tex)
        gl.uniform4f(U.uRect, a.left, y, a.rong, a.cao)
        gl.uniform2f(U.uImg, a.w, a.h)
        gl.drawArrays(gl.TRIANGLES, 0, 3)
      }
    }
    requestAnimationFrame(khung)

    // Bảng H đổi số: cỡ khung tính lại ngay khung sau; gom lại ảnh nếu đổi selector.
    var anhCu = S.anh
    api.apDung = function () {
      W = 0
      if (S.anh !== anhCu) {
        anhCu = S.anh
        ds.forEach(function (o) {
          if (o.tex) gl.deleteTexture(o.tex)
        })
        gom()
      }
      doLai()
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true })
  else boot()
})()
