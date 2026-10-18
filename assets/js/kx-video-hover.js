/* =============================================================================
 * kaixa Portfolio — Rê vào VIDEO: pixel distort + kính lỏng (About)
 * -----------------------------------------------------------------------------
 * Người dùng: "có thêm hiệu ứng hover pixel distort kèm lens distort (cái lens
 * tham khảo cái hover ảnh project)" — "khi hover vào phần video" (video đĩa
 * badge ở đầu trang About, node 305:4870).
 *
 * Một canvas WebGL2 đè đúng lên thẻ <video>, mỗi khung nạp lại khung hình
 * video làm texture rồi vẽ lại với hai lớp méo:
 *
 *   1. PIXEL DISTORT — một lưới ô vuông (`luoi` cột). Ô nào nằm gần con trỏ
 *      bị đẩy theo HƯỚNG CHUỘT ĐI (tỉ lệ vận tốc), rồi nhả dần về chỗ cũ
 *      (`nha`). Shader lấy mẫu lưới bằng NEAREST nên hình vỡ thành từng khối
 *      pixel; khối bị đẩy xa thì tách đỏ/lam theo hướng đẩy.
 *   2. KÍNH LỎNG bám 4 MÉP — đúng công thức hover ảnh dự án ở Home
 *      (kx-feature-hover.js): hàm khoảng cách hình chữ nhật, góc vát theo cung
 *      tròn, bẻ hình sát mép, gợn dọc mép, tách đỏ/lam theo pháp tuyến, viền
 *      sáng + quầng màu, phóng nhẹ về phía con trỏ.
 *
 * - Mép kính là phần video NHÌN THẤY ĐƯỢC (giao với .kx-page): node lệch ra
 *   ngoài trang 94 px, mép thật nằm ngoài màn.
 * - Viền sáng + quầng nhân theo ĐỘ SÁNG của hình: nền video đen kịt, không thì
 *   nó vẽ ra một khung chữ nhật lơ lửng trên nền.
 * - Bắt chuột trên document theo HỘP của phần video nhìn thấy (đo thưa), không
 *   cần node nhận chuột — trên nó còn khung sticky / cột chữ.
 * - Vòng rAF chỉ chạy khi đang rê hoặc lưới / kính còn đang nhả; nghỉ thì giấu
 *   canvas, video gốc hiện lại. Không cấp phát trong vòng (luật cấm số 2):
 *   mảng lưới cấp sẵn, chỉ cấp lại khi đổi cỡ / đổi số ô.
 * - MỘT context, dựng ở lần rê đầu tiên.
 * File KHÔNG chứa UI setting. Không viết dấu huyền trong khối GLSL (luật số 4).
 * ========================================================================== */
(function () {
  'use strict'

  var CONFIG = {
    enabled: true,
    chon: '[data-n="305:4870"]', // khối chứa <video>
    maxPx: 1600, // trần cạnh dài khung vẽ (px thật)
    // ------------------------------------------------------ pixel distort
    pixel: true,
    luoi: 28, // số ô theo chiều ngang
    banKinh: 0.2, // bán kính ảnh hưởng, phần cạnh ngắn của khung
    luc: 0.9, // ô bị đẩy bao nhiêu lần quãng chuột vừa đi
    nha: 0.9, // 0..1 — phần độ lệch giữ lại mỗi khung 60fps (lớn = nhả chậm)
    toiDa: 80, // px — trần độ lệch của một ô
    tachPx: 0.12, // tách đỏ/lam theo hướng đẩy, phần độ lệch của ô
    // ------------------------------------------------------- kính lỏng
    kinh: true,
    lensBand: 0.16,
    lensBend: 22,
    lensZoom: 0.04,
    lensDisp: 4,
    lensWave: 0.08,
    lensRim: 0.8,
    lensColor: '#009dff',
    lensMuot: 0.2,
    lensVao: 0.12,
  }

  var S = CONFIG
  var api = (window.KX_VIDEO_HOVER = { config: S, defaults: Object.freeze(Object.assign({}, CONFIG)) })

  var VERT = '#version 300 es\nin vec2 p;\nvoid main(){ gl_Position = vec4(p, 0.0, 1.0); }'
  var FRAG = [
    '#version 300 es',
    'precision highp float;',
    'uniform sampler2D uT;', // khung hình video
    'uniform sampler2D uG;', // lưới độ lệch (px css), NEAREST
    'uniform vec2 uRes, uImg, uM;', // khung (px css), cỡ video, tâm kính
    'uniform vec4 uBox;', // phần nhìn thấy: x0, y0, x1, y1 (px css trong khung)
    'uniform float uDpr, uBand, uBend, uZoom, uDisp, uWave, uRim, uStr, uTime, uTach;',
    'uniform vec3 uCol;',
    'out vec4 o;',
    'vec3 anh(vec2 p){',
    '  vec2 uv = p / uRes;',
    '  float fa = uRes.x / uRes.y;',
    '  float ia = uImg.x / uImg.y;',
    '  if (ia > fa) uv.x = 0.5 + (uv.x - 0.5) * fa / ia;',
    '  else uv.y = 0.5 + (uv.y - 0.5) * ia / fa;',
    '  return texture(uT, clamp(uv, 0.0, 1.0)).rgb;',
    '}',
    'void main(){',
    '  vec2 p = vec2(gl_FragCoord.x, uRes.y * uDpr - gl_FragCoord.y) / uDpr;',
    '  vec2 off = texture(uG, clamp(p / uRes, 0.0, 1.0)).rg;',
    '  vec2 q = p - off;', // pixel distort: cả khối lấy mẫu lệch đi
    '  vec2 tc = off * uTach;',
    '  vec3 col = vec3(anh(q - tc).r, anh(q).g, anh(q + tc).b);',
    '  if (uStr > 0.001) {',
    '    vec2 c = (uBox.xy + uBox.zw) * 0.5;',
    '    vec2 hh = (uBox.zw - uBox.xy) * 0.5;',
    '    vec2 rel = q - c;',
    '    vec2 sg = vec2(rel.x < 0.0 ? -1.0 : 1.0, rel.y < 0.0 ? -1.0 : 1.0);',
    '    vec2 ad = abs(rel);',
    '    float band = clamp(uBand * min(hh.x, hh.y) * 2.0, 1.0, min(hh.x, hh.y) * 0.95);',
    '    float e = min(hh.x - ad.x, hh.y - ad.y);',
    '    vec2 q2 = ad - (hh - band);',
    '    float eR = band - length(max(q2, 0.0));',
    '    vec2 g;',
    '    if (q2.x > 0.0 && q2.y > 0.0) g = normalize(q2) * sg;',
    '    else if (q2.x > q2.y) g = vec2(sg.x, 0.0);',
    '    else g = vec2(0.0, sg.y);',
    '    vec2 tn = vec2(-g.y, g.x);',
    '    float t = clamp(1.0 - eR / band, 0.0, 1.0);',
    '    float w = t * t * (3.0 - 2.0 * t);',
    '    float gon = sin(dot(q, tn) * 6.2832 / band + uTime * 1.2);',
    '    vec2 sv = q - g * uBend * w * uStr + tn * gon * uWave * band * w * w * uStr;',
    '    sv = uM + (sv - uM) * (1.0 - uZoom * uStr);',
    '    float dsp = uDisp * w * uStr;',
    '    vec3 k = vec3(anh(sv - g * dsp - tc).r, anh(sv).g, anh(sv + g * dsp + tc).b);',
    // Ánh sáng nhân theo độ sáng của hình: nền đen không có viền lơ lửng.
    '    float sang = smoothstep(0.04, 0.3, dot(k, vec3(0.299, 0.587, 0.114)));',
    '    float gan = 0.55 + 0.45 * exp(-length(p - uM) / (min(hh.x, hh.y)));',
    '    float rim = exp(-pow((e - 1.5) / 1.2, 2.0)) * uRim * gan;',
    '    float aura = exp(-max(e, 0.0) / (band * 0.35)) * 0.35 * uRim * gan;',
    '    k += (vec3(rim) + uCol * aura) * sang;',
    '    col = mix(col, k, uStr);',
    '  }',
    '  o = vec4(col, 1.0);',
    '}',
  ].join('\n')

  function boot() {
    if (!S.enabled) return
    var hop = document.querySelector(S.chon)
    var vid = hop && hop.querySelector('video')
    if (!hop || !vid) return
    if (window.matchMedia && !matchMedia('(hover: hover)').matches) return
    var page = hop.closest('.kx-page')

    // ------------------------------------------------ hộp nhìn thấy (đo thưa)
    var hx0 = 0
    var hy0 = 0
    var hx1 = 0
    var hy1 = 0 // phần nhìn thấy, toạ độ TRANG (px css)
    var nx = 0
    var ny = 0 // góc trên-trái của node, toạ độ trang
    var W = 1
    var H = 1 // cỡ node (= cỡ canvas, px css)
    var doLuc = 0
    function doHop() {
      var b = hop.getBoundingClientRect()
      var sx = window.scrollX
      var sy = window.scrollY
      var x0 = b.left
      var y0 = b.top
      var x1 = b.right
      var y1 = b.bottom
      if (page) {
        var pb = page.getBoundingClientRect()
        x0 = Math.max(x0, pb.left)
        x1 = Math.min(x1, pb.right)
        y0 = Math.max(y0, pb.top)
      }
      hx0 = x0 + sx
      hy0 = y0 + sy
      hx1 = x1 + sx
      hy1 = y1 + sy
      nx = b.left + sx
      ny = b.top + sy
      W = Math.max(1, hop.offsetWidth)
      H = Math.max(1, hop.offsetHeight)
      doLuc = performance.now()
    }

    // --------------------------------------------------------------- WebGL
    var cv = null
    var gl = null
    var U = {}
    var texV = null
    var texG = null
    var dpr = 1
    var cot = 0
    var hang = 0
    var luoi = null // Float32Array cot*hang*2 — độ lệch px css
    function dung() {
      cv = document.createElement('canvas')
      cv.setAttribute('aria-hidden', 'true')
      cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none;z-index:1;visibility:hidden'
      gl = cv.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false })
      if (!gl) {
        cv = null
        return false
      }
      function sh(t, src) {
        var x = gl.createShader(t)
        gl.shaderSource(x, src)
        gl.compileShader(x)
        if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) {
          console.warn('kx-video-hover:', gl.getShaderInfoLog(x))
          return null
        }
        return x
      }
      var vs = sh(gl.VERTEX_SHADER, VERT)
      var fs = sh(gl.FRAGMENT_SHADER, FRAG)
      if (!vs || !fs) return false
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
      ;['uT', 'uG', 'uRes', 'uImg', 'uM', 'uBox', 'uDpr', 'uBand', 'uBend', 'uZoom', 'uDisp', 'uWave', 'uRim', 'uStr', 'uTime', 'uTach', 'uCol'].forEach(function (n) {
        U[n] = gl.getUniformLocation(prog, n)
      })
      gl.uniform1i(U.uT, 0)
      gl.uniform1i(U.uG, 1)
      texV = gl.createTexture()
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, texV)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      texG = gl.createTexture()
      gl.activeTexture(gl.TEXTURE1)
      gl.bindTexture(gl.TEXTURE_2D, texG)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.activeTexture(gl.TEXTURE0)
      hop.appendChild(cv)
      return true
    }

    function coKhung() {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      var k = Math.min(dpr, S.maxPx / Math.max(W, H))
      cv.width = Math.max(1, Math.round(W * k))
      cv.height = Math.max(1, Math.round(H * k))
      dpr = cv.width / W
      gl.viewport(0, 0, cv.width, cv.height)
      var c = Math.max(4, Math.round(S.luoi))
      var h = Math.max(4, Math.round((c * H) / W))
      if (c !== cot || h !== hang) {
        cot = c
        hang = h
        luoi = new Float32Array(cot * hang * 2)
      }
    }

    // ------------------------------------------------------------ trạng thái
    var trong = false
    var str = 0 // độ hiện của kính 0..1
    var mx = 0
    var my = 0 // tâm kính (px css trong khung, đuổi theo con trỏ)
    var tx = 0
    var ty = 0 // con trỏ trong khung
    var px = 0
    var py = 0 // con trỏ khung trước — lấy vận tốc
    var coTruoc = false
    var conLech = false
    var raf = 0
    var last = 0
    var mau = [0, 0.6, 1]
    var mauCu = ''
    function docMau() {
      if (S.lensColor === mauCu) return
      mauCu = S.lensColor
      var v = parseInt(String(S.lensColor).replace('#', ''), 16)
      if (!isNaN(v)) mau = [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255]
    }

    function capLuoi(f) {
      // Đẩy các ô gần con trỏ theo quãng chuột vừa đi, rồi nhả cả lưới.
      var dx = coTruoc ? tx - px : 0
      var dy = coTruoc ? ty - py : 0
      px = tx
      py = ty
      coTruoc = trong
      var giu = Math.pow(S.nha, f)
      var r = Math.max(1, S.banKinh * Math.min(W, H))
      var cw = W / cot
      var ch = H / hang
      var day = S.pixel && trong && (dx !== 0 || dy !== 0)
      var max = S.toiDa
      var con = false
      for (var j = 0; j < hang; j++) {
        var cy = (j + 0.5) * ch
        for (var i = 0; i < cot; i++) {
          var o = (j * cot + i) * 2
          var ox = luoi[o] * giu
          var oy = luoi[o + 1] * giu
          if (day) {
            var ex = (i + 0.5) * cw - tx
            var ey = cy - ty
            var d = Math.sqrt(ex * ex + ey * ey)
            if (d < r) {
              var w = 1 - d / r
              w *= w
              ox += dx * S.luc * w
              oy += dy * S.luc * w
              var l = Math.sqrt(ox * ox + oy * oy)
              if (l > max) {
                ox *= max / l
                oy *= max / l
              }
            }
          }
          if (ox * ox + oy * oy < 0.01) ox = oy = 0
          else con = true
          luoi[o] = ox
          luoi[o + 1] = oy
        }
      }
      conLech = con
      gl.activeTexture(gl.TEXTURE1)
      gl.bindTexture(gl.TEXTURE_2D, texG)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG32F, cot, hang, 0, gl.RG, gl.FLOAT, luoi)
      gl.activeTexture(gl.TEXTURE0)
    }

    function khung(now) {
      raf = 0
      var dt = Math.min((now - last) / 1000, 1 / 20) || 1 / 60
      last = now
      var f = dt * 60
      var km = 1 - Math.pow(1 - S.lensMuot, f)
      mx += (tx - mx) * km
      my += (ty - my) * km
      var ks = 1 - Math.pow(1 - S.lensVao, f)
      str += ((trong && S.kinh ? 1 : 0) - str) * ks
      capLuoi(f)
      if (!trong && str < 0.002 && !conLech) {
        str = 0
        cv.style.visibility = 'hidden'
        return
      }
      if (vid.readyState >= 2) {
        gl.bindTexture(gl.TEXTURE_2D, texV)
        try {
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, vid)
        } catch (e) {}
      }
      docMau()
      gl.uniform2f(U.uRes, W, H)
      gl.uniform2f(U.uImg, vid.videoWidth || W, vid.videoHeight || H)
      gl.uniform2f(U.uM, mx, my)
      gl.uniform4f(U.uBox, hx0 - nx, hy0 - ny, hx1 - nx, hy1 - ny)
      gl.uniform1f(U.uDpr, dpr)
      gl.uniform1f(U.uBand, S.lensBand)
      gl.uniform1f(U.uBend, S.lensBend)
      gl.uniform1f(U.uZoom, S.lensZoom)
      gl.uniform1f(U.uDisp, S.lensDisp)
      gl.uniform1f(U.uWave, S.lensWave)
      gl.uniform1f(U.uRim, S.lensRim)
      gl.uniform1f(U.uStr, str)
      gl.uniform1f(U.uTime, now / 1000)
      gl.uniform1f(U.uTach, S.tachPx)
      gl.uniform3f(U.uCol, mau[0], mau[1], mau[2])
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      cv.style.visibility = 'visible'
      raf = requestAnimationFrame(khung)
    }
    function chay() {
      if (raf) return
      last = performance.now()
      raf = requestAnimationFrame(khung)
    }

    function vao() {
      if (!cv && !dung()) return
      coKhung()
      trong = true
      coTruoc = false
      mx = tx
      my = ty
      chay()
    }

    document.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') return
      if (performance.now() - doLuc > 500) doHop()
      var x = e.clientX + window.scrollX
      var y = e.clientY + window.scrollY
      var o = x >= hx0 && x <= hx1 && y >= hy0 && y <= hy1
      // Cột chữ mono có hover riêng — đè lên mép video thì nhường nó.
      if (o && e.target && e.target.closest && e.target.closest('.kx-th-d,a,button')) o = false
      tx = x - nx
      ty = y - ny
      if (o && !trong) vao()
      else if (!o && trong) trong = false
    }, { passive: true })
    document.addEventListener('pointerleave', function () {
      trong = false
    })
    addEventListener('resize', function () {
      doLuc = 0
      if (cv) {
        doHop()
        coKhung()
      }
    })
    doHop()

    api.apDung = function () {
      if (cv) coKhung()
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true })
  else boot()
})()
