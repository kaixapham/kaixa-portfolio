/* =============================================================================
 * kaixa Portfolio — "Feature Works ©12": rê chuột vào dự án (Home)
 * -----------------------------------------------------------------------------
 * Cụm Feature Works có cột TRÁI (số + tên dự án) và cột PHẢI (năm + dịch vụ),
 * cùng thứ tự từng cụm, ảnh ở giữa. Cụm thứ i bên trái và cụm thứ i bên phải
 * là cùng một dự án — rê vào bên nào cũng như nhau.
 *
 * THANH SAU CHỮ — mỗi DÒNG chữ có ::before scaleX 0 → 1; dòng cột trái giãn
 * từ mép trái, cột phải từ mép phải.
 *   vào:  giãn tới 1 trong 0.3 s (power1.out), chữ đổi màu cùng nhịp.
 *   ra:   ÉP VỀ ĐẦY rồi mới thụt về 0 trong 1 s (sine.out). Nhờ vậy lướt chuột
 *         qua nhiều cụm là mỗi cụm sáng trọn rồi tắt dần lệch nhịp nhau: thành
 *         SÓNG nối đuôi con trỏ.
 *
 * ẢNH — mỗi dự án một lớp ảnh chồng trong khung ảnh gốc, MỌC TỪ GÓC DƯỚI-TRÁI
 * với cạnh vuông (clip-path inset: cạnh trên + cạnh phải chạy ra) khi vào, co
 * về góc đó khi rời; lớp mới nhất nằm trên. Rời hết thì lộ ảnh gốc của bản thiết kế bên dưới.
 * Ảnh có chỗ cố định giữa cụm theo bản thiết kế (không bám con trỏ).
 * Đã thử kiểu mở / cắt bằng clip-path (ảnh mở từ trên xuống, rời thì cắt
 * dần) — người dùng chốt BỎ: chuyển cụm nhanh là khung ảnh loang lổ hai ba
 * ảnh cùng lúc, làm hỏng cảm giác của thanh chữ.
 *
 * Nền trang đen nên thanh SÁNG, chữ chuyển tối. Chạy bằng CSS transition +
 * Web Animations, không thư viện. Bám theo `data-n`. File KHÔNG chứa UI
 * setting.
 * ========================================================================== */
(function () {
  'use strict'

  var CONFIG = {
    enabled: true,
    trai: '1:205', // cột trái — mỗi con là một cụm dự án
    phai: '1:217', // cột phải — cùng thứ tự với cột trái
    khung: '1:240', // khung ảnh giữa
    // Ảnh theo thứ tự cụm (đường dẫn TƯƠNG ĐỐI — luật số 5), mỗi dự án MỘT ẢNH
    // KHÁC NHAU. Dự án chưa có ảnh riêng đang dùng TẠM ảnh khác của chính Kaixa
    // trong kho Works (người dùng sẽ thay bằng work thật). Để trống = rê vào chỉ
    // sáng thanh, ảnh giữa giữ ảnh gốc.
    // KHÔNG mượn ảnh poster / editorial khác trên Home làm ảnh tạm: đó là ảnh
    // THAM KHẢO của tác giả khác trong file Figma (vd. image347.webp có chữ ký
    // "© jaemin lee") — gắn vào dự án của Kaixa là sai, mà site công khai.
    anh: [
      'assets/works/rectangle2998.webp', // 01 Re:active
      'assets/works/rectangle2999.webp', // 02 Design Anthology — TẠM
      'assets/works/rectangle3004.webp', // 03 Vietnam Exposition Center — TẠM
      'assets/works/rectangle2992.webp', // 04 Lumen Studio
      'assets/works/rectangle2996.webp', // 05 Chande Bootcamp
      'assets/works/rectangle3000.webp', // 06 Petrolimex — TẠM
      'assets/works/rectangle3002.webp', // 07 Niki Studio
      'assets/works/rectangle3006.webp', // 08 TMRW Studio — TẠM
      'assets/works/rectangle2994.webp', // 09 Furion Eco System — TẠM
      'assets/works/rectangle3005.png', // 10 Poster Collection (150Posters)
    ].join(','),

    // ---------------------------------------------------- thanh sau chữ
    thanhMau: '#ebebeb',
    chuMau: '#040203', // màu chữ khi thanh phủ (nền trang)
    thanhTren: -0.1, // em — thanh nhô lên trên hộp dòng (line-height 0.84)
    thanhDuoi: -0.14, // em — nhô xuống dưới
    vaoMs: 300,
    vaoNhip: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)', // power1.out
    raMs: 1000,
    raNhip: 'cubic-bezier(0.61, 1, 0.88, 1)', // sine.out

    // ---------------------------------------------------------------- ảnh
    // Ảnh dự án MỌC TỪ GÓC DƯỚI-TRÁI, CẠNH VUÔNG (người dùng chốt): một hình
    // chữ nhật neo ở góc đó, cạnh trên và cạnh phải chạy ra phủ khung. Không
    // bao giờ co về — ảnh mới mọc đè lên ảnh cũ.
    anhVaoMs: 700,
    anhVaoNhip: 'cubic-bezier(0.22, 1, 0.36, 1)',
    anhPhong: 1.08, // ảnh trong thu từ cỡ này về 1 khi mọc
    // --------------------------------------- thấu kính khi chuột TRONG ẢNH
    // Chỉ chạy khi con trỏ ở trong khung ảnh — rê chữ không kích hoạt.
    lens: true,
    // Kính bám 4 MÉP khung ảnh, không phải vòng tròn theo con trỏ.
    lensBand: 0.18, // độ sâu dải kính tính từ mép, phần cạnh ngắn của khung
    lensBend: 20, // px — hình sát mép bị bẻ vào trong bao nhiêu
    lensZoom: 0.04, // phóng nhẹ cả tấm về phía con trỏ
    lensDisp: 4, // px — tách đỏ/lam sát mép
    lensWave: 0.08, // gợn dọc theo mép (phần độ sâu dải)
    lensRim: 0.8, // viền sáng + quầng
    lensColor: '#009dff',
    lensMuot: 0.2, // 0..1 — thấu kính đuổi theo con trỏ mỗi khung 60fps
    lensVao: 0.12, // 0..1 — tốc độ hiện / tắt thấu kính mỗi khung
  }

  var S = CONFIG
  window.KX_FEATURE_HOVER = { config: S, defaults: Object.freeze(Object.assign({}, CONFIG)) }

  function q(id) {
    return document.querySelector('[data-n="' + id + '"]')
  }

  function boot() {
    if (!S.enabled) return
    var trai = q(S.trai)
    var phai = q(S.phai)
    var khung = q(S.khung)
    if (!trai || !phai || !khung) return
    var goc = khung.querySelector('img')
    if (!goc) return
    var hop = goc.parentElement // khung bọc ảnh gốc — các lớp ảnh dự án chồng vào đây

    var cumTrai = Array.prototype.slice.call(trai.children)
    var cumPhai = Array.prototype.slice.call(phai.children)
    var duong = S.anh.split(',').map(function (x) { return x.trim() })
    var n = Math.min(cumTrai.length, cumPhai.length, duong.length)

    /* ------------------------------------------------------- CSS thanh
     * ::before của từng <p> (z-index -1 trong isolation riêng → sau chữ, trên
     * nền). Trạng thái thường: transition RA (1 s sine.out). Bật (.is-on):
     * transition VÀO (0.3 s power1.out). .is-day: ép về đầy NGAY (không
     * transition) — dùng một nhịp trước khi thả ra. */
    var VAO = S.vaoMs + 'ms ' + S.vaoNhip
    var RA = S.raMs + 'ms ' + S.raNhip
    var st = document.createElement('style')
    st.textContent = [
      // Rộng VỪA CHỮ (mặc định <p> rộng hết cột); cột phải đẩy
      // sang mép phải bằng margin-left:auto để giữ căn phải.
      '.kx-page p.kx-fh{position:relative;isolation:isolate;width:fit-content;transition:color ' + RA + '}',
      '.kx-page p.kx-fh.is-phai{margin-left:auto}',
      '.kx-page p.kx-fh::before{content:"";position:absolute;inset:' + S.thanhTren + 'em 0 ' + S.thanhDuoi + 'em;z-index:-1;',
      '  background:' + S.thanhMau + ';transform:scaleX(0);transform-origin:left center;transition:transform ' + RA + ';pointer-events:none}',
      '.kx-page p.kx-fh.is-phai::before{transform-origin:right center}',
      '.kx-page p.kx-fh.is-on,.kx-page p.kx-fh.is-day{color:' + S.chuMau + '}',
      '.kx-page p.kx-fh.is-on::before,.kx-page p.kx-fh.is-day::before{transform:scaleX(1)}',
      '.kx-page p.kx-fh.is-on{transition:color ' + VAO + '}',
      '.kx-page p.kx-fh.is-on::before{transition:transform ' + VAO + '}',
      '.kx-page p.kx-fh.is-day,.kx-page p.kx-fh.is-day::before{transition:none}',
      // Lớp ảnh dự án: hình chữ nhật neo góc dưới-trái — inset(trên phải dưới
      // trái) = (100% 100% 0 0) là co hết về góc, (0 0 0 0) là phủ khung.
      // Trạng thái nghỉ là ẨN; mọi chuyển động chạy bằng Web Animations.
      '.kx-page .kx-fh-anh{position:absolute;inset:0;overflow:hidden;pointer-events:none;clip-path:inset(100% 100% 0% 0%)}',
      '.kx-page .kx-fh-anh img{transform:scale(' + S.anhPhong + ');transform-origin:0% 100%}',
    ].join('\n')
    document.head.appendChild(st)

    // Dòng chữ của từng dự án, cả hai cột.
    var chu = []
    for (var c = 0; c < n; c++) {
      var a = Array.prototype.slice.call((cumTrai[c] || document.createElement('i')).querySelectorAll('p'))
      var b = Array.prototype.slice.call((cumPhai[c] || document.createElement('i')).querySelectorAll('p'))
      a.forEach(function (p) { p.classList.add('kx-fh') })
      b.forEach(function (p) { p.classList.add('kx-fh', 'is-phai') })
      chu.push(a.concat(b))
    }

    /* ------------------------------------------------------- lớp ảnh
     * Cùng class với ảnh gốc nên cùng cỡ và object-fit. Nạp sau khi trang tải
     * xong (lúc rảnh), không chặn lúc mở trang. */
    var lop = []
    for (var i = 0; i < n; i++) {
      if (!duong[i]) {
        lop.push(null) // chưa có ảnh riêng — giữ ảnh gốc
        continue
      }
      var vo = document.createElement('div')
      vo.className = 'kx-fh-anh'
      var im = document.createElement('img')
      im.className = goc.className
      im.alt = ''
      im.decoding = 'async'
      im.dataset.src = duong[i]
      vo.appendChild(im)
      hop.appendChild(vo)
      lop.push({ vo: vo, im: im, a: null, b: null, day: false })
    }
    var napRoi = false
    function napTruoc() {
      if (napRoi) return
      napRoi = true
      lop.forEach(function (l) { if (l && !l.im.src) l.im.src = l.im.dataset.src })
    }
    ;[trai, phai].forEach(function (cot) { cot.addEventListener('pointerenter', napTruoc) })
    // Nạp sẵn lúc trình duyệt rảnh sau khi trang tải xong — chờ tới lần rê đầu
    // mới nạp thì lớp ảnh mở ra TRỐNG rồi ảnh bật lên giữa chừng, trông như lỗi.
    var ranh = window.requestIdleCallback || function (f) { return setTimeout(f, 300) }
    if (document.readyState === 'complete') ranh(napTruoc)
    else addEventListener('load', function () { ranh(napTruoc) }, { once: true })

    /* ------------------------------------------------------- ảnh
     * Cơ chế người dùng chốt:
     *   - Rê vào dự án: ảnh MỌC TỪ GÓC DƯỚI-TRÁI và CHẠY HẾT tới khi phủ đầy,
     *     kể cả khi con trỏ đã rời giữa chừng.
     *   - Rê sang dự án khác (kể cả khi ảnh trước đang mọc dở): ảnh trước GIỮ
     *     NGUYÊN, KHÔNG co về (người dùng chốt) — ảnh dự án mới mọc từ góc đè
     *     lên. Lớp nào phủ đầy xong thì dọn mọi lớp bên dưới (đã bị che kín).
     *   - Rời danh sách: ảnh ĐỨNG YÊN, không co về (người dùng chốt) — ảnh chỉ
     *     đổi khi rê sang dự án khác. Nhờ vậy đưa con trỏ từ chữ vào khung ảnh
     *     thì thấu kính luôn bẻ đúng ảnh dự án vừa rê. */
    var AN = 'inset(100% 100% 0% 0%)'
    var HIEN = 'inset(0% 0% 0% 0%)'
    var z = 10
    var dinh = -1 // lớp đang trên cùng (đang mọc hoặc đã phủ)

    function huy(l) {
      if (l.a) l.a.cancel()
      if (l.b) l.b.cancel()
      l.a = l.b = null
    }
    function datAn(l) {
      huy(l) // huỷ animation là về trạng thái nghỉ của CSS = ẩn
      l.day = false
    }
    function hienAnh(i) {
      var l = lop[i]
      if (!l || i === dinh) return // đang mọc / đã phủ trên cùng: để nó chạy tiếp
      if (!l.im.src) l.im.src = l.im.dataset.src
      dinh = i
      huy(l)
      l.day = false
      l.vo.style.zIndex = String(++z)
      var o = { duration: S.anhVaoMs, easing: S.anhVaoNhip, fill: 'forwards' }
      l.a = l.vo.animate([{ clipPath: AN }, { clipPath: HIEN }], o)
      l.b = l.im.animate([{ transform: 'scale(' + S.anhPhong + ')' }, { transform: 'scale(1)' }], o)
      var a = l.a
      a.onfinish = function () {
        if (l.a !== a) return
        l.day = true
        // Phủ đầy rồi: dọn mọi lớp bên dưới (đã bị che kín, ẩn đi không thấy).
        if (dinh === i) lop.forEach(function (x, j) { if (x && j !== i) datAn(x) })
      }
    }
    /* ------------------------------------------------------- vào / ra */
    function vao(i) {
      if (kinh) kinh.tatNgay()
      chu[i].forEach(function (p) {
        p.classList.remove('is-day')
        p.classList.add('is-on')
      })
      hienAnh(i)
    }
    function ra(i) {
      var ps = chu[i]
      // Ép đầy ngay (không transition) rồi mới thả cho transition RA chạy.
      ps.forEach(function (p) {
        p.classList.remove('is-on')
        p.classList.add('is-day')
      })
      void ps[0].offsetWidth // chốt trạng thái đầy trước khi thả
      ps.forEach(function (p) { p.classList.remove('is-day') })
    }

    function noi(cum, i) {
      if (!cum) return
      cum.addEventListener('pointerenter', function () { vao(i) })
      cum.addEventListener('pointerleave', function () { ra(i) })
    }
    for (var k = 0; k < n; k++) {
      noi(cumTrai[k], k)
      noi(cumPhai[k], k)
    }

    /* ------------------------------------------------------- khung ảnh */
    var kinh = null
    hop.addEventListener('pointerenter', function (e) {
      if (!S.lens) return
      if (!kinh) kinh = dungKinh(hop)
      if (kinh) kinh.vao(e, anhDangHien())
    })
    hop.addEventListener('pointermove', function (e) {
      if (kinh) kinh.di(e)
    })
    hop.addEventListener('pointerleave', function () {
      if (kinh) kinh.ra()
    })
    // Ảnh đang trên cùng (đang mọc hoặc đã phủ), không có thì ảnh gốc.
    function anhDangHien() {
      var l = dinh >= 0 ? lop[dinh] : null
      return l && l.im.naturalWidth ? l.im : goc
    }
  }

  /* ============================================================ THẤU KÍNH
   * Canvas WebGL2 phủ đúng khung ảnh, chỉ dựng khi con trỏ vào khung lần
   * đầu. Vẽ lại CHÍNH ảnh đang hiện (object-fit: cover, giữa) nên lúc kính
   * chưa hiện thì canvas trùng khít ảnh — bật canvas lên không có cú chớp.
   *
   * Kính KHÔNG phải vòng tròn theo con trỏ (người dùng chốt): cả tấm ảnh là
   * một phiến kính, bám theo đúng 4 MÉP của khung. Mô tả mép bằng hàm khoảng
   * cách hình chữ nhật, góc vát theo cung tròn — càng sát mép, hình bên dưới càng
   * bị bẻ, gợn dọc theo mép và tách đỏ/lam theo pháp tuyến; viền sáng + quầng
   * màu chạy quanh cả 4 cạnh. Con trỏ chỉ phóng nhẹ hình về phía nó và làm
   * viền gần nó sáng hơn — như nghiêng tấm kính.
   * Vòng vẽ chỉ chạy khi kính đang hiện hoặc đang tắt dần. Không viết dấu
   * huyền trong khối GLSL (luật số 4). */
  var VERT = '#version 300 es\nin vec2 p;\nvoid main(){ gl_Position = vec4(p, 0.0, 1.0); }'
  var FRAG = [
    '#version 300 es',
    'precision highp float;',
    'uniform sampler2D uT;',
    'uniform vec2 uRes, uImg, uM;', // khung (px css), cỡ gốc ảnh, con trỏ (px css)
    'uniform float uDpr, uBand, uBend, uZoom, uDisp, uWave, uRim, uStr, uTime;',
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
    '  vec3 col = anh(p);',
    '  if (uStr > 0.001) {',
    '    vec2 c = uRes * 0.5;',
    '    vec2 rel = p - c;',
    '    vec2 sg = vec2(rel.x < 0.0 ? -1.0 : 1.0, rel.y < 0.0 ? -1.0 : 1.0);',
    '    vec2 ad = abs(rel);',
    '    float band = clamp(uBand * min(uRes.x, uRes.y), 1.0, min(c.x, c.y) * 0.95);',
    '    float e = min(c.x - ad.x, c.y - ad.y);', // khoảng cách vào trong tính từ mép VUÔNG (cho viền sáng)
    // Độ sâu kính ở góc đi theo cung tròn bán kính = dải kính: sát góc vát
    // tròn, không có nếp gập chéo nơi hai cạnh gặp nhau.
    '    vec2 q2 = ad - (c - band);',
    '    float eR = band - length(max(q2, 0.0));',
    '    vec2 g;', // pháp tuyến hướng ra mép, xoay đều quanh góc
    '    if (q2.x > 0.0 && q2.y > 0.0) g = normalize(q2) * sg;',
    '    else if (q2.x > q2.y) g = vec2(sg.x, 0.0);',
    '    else g = vec2(0.0, sg.y);',
    '    vec2 tn = vec2(-g.y, g.x);',
    '    float t = clamp(1.0 - eR / band, 0.0, 1.0);',
    '    float w = t * t * (3.0 - 2.0 * t);', // vát mềm, không gập cục
    '    float gon = sin(dot(p, tn) * 6.2832 / band + uTime * 1.2);',
    '    vec2 sv = p - g * uBend * w * uStr + tn * gon * uWave * band * w * w * uStr;',
    '    sv = uM + (sv - uM) * (1.0 - uZoom * uStr);', // phóng nhẹ về phía con trỏ
    '    float dsp = uDisp * w * uStr;',
    '    vec3 k = vec3(anh(sv - g * dsp).r, anh(sv).g, anh(sv + g * dsp).b);',
    '    float gan = 0.55 + 0.45 * exp(-length(p - uM) / (min(uRes.x, uRes.y) * 0.5));', // viền gần con trỏ sáng hơn
    '    float rim = exp(-pow((e - 1.5) / 1.2, 2.0)) * uRim * gan;',
    '    float aura = exp(-e / (band * 0.35)) * 0.35 * uRim * gan;',
    '    k += vec3(rim) + uCol * aura;',
    '    col = mix(col, k, uStr);',
    '  }',
    '  o = vec4(col, 1.0);',
    '}',
  ].join('\n')

  function dungKinh(hop) {
    var cv = document.createElement('canvas')
    cv.setAttribute('aria-hidden', 'true')
    cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none;z-index:2147483000;visibility:hidden'
    var gl = cv.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false })
    if (!gl) return null
    function sh(t, src) {
      var x = gl.createShader(t)
      gl.shaderSource(x, src)
      gl.compileShader(x)
      if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) {
        console.warn('kx-feature-hover:', gl.getShaderInfoLog(x))
        return null
      }
      return x
    }
    var vs = sh(gl.VERTEX_SHADER, VERT)
    var fs = sh(gl.FRAGMENT_SHADER, FRAG)
    if (!vs || !fs) return null
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
    ;['uT', 'uRes', 'uImg', 'uM', 'uDpr', 'uBand', 'uBend', 'uZoom', 'uDisp', 'uWave', 'uRim', 'uStr', 'uTime', 'uCol'].forEach(function (n) {
      U[n] = gl.getUniformLocation(prog, n)
    })
    gl.uniform1i(U.uT, 0)
    var tex = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    hop.appendChild(cv)

    var anhNay = null
    var W = 1
    var H = 1
    var dpr = 1
    var trongKhung = false
    var str = 0 // độ hiện của thấu kính 0..1
    var mx = 0
    var my = 0 // tâm thấu kính (đuổi theo con trỏ)
    var tx = 0
    var ty = 0 // con trỏ
    var raf = 0
    var last = 0
    var mau = [0, 0.6, 1]
    ;(function () {
      var h = String(S.lensColor).replace('#', '')
      var v = parseInt(h, 16)
      if (!isNaN(v)) mau = [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255]
    })()

    // Đo khung lúc VÀO (không đo mỗi khung — luật cấm số 1).
    function doKhung() {
      var b = hop.getBoundingClientRect()
      W = Math.max(1, b.width)
      H = Math.max(1, b.height)
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      cv.width = Math.round(W * dpr)
      cv.height = Math.round(H * dpr)
      gl.viewport(0, 0, cv.width, cv.height)
      return b
    }

    function napAnh(im) {
      if (im === anhNay) return
      anhNay = im
      gl.bindTexture(gl.TEXTURE_2D, tex)
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
      try {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, im)
      } catch (e) {}
    }

    function ve(now) {
      gl.uniform2f(U.uRes, W, H)
      gl.uniform2f(U.uImg, anhNay.naturalWidth || 1, anhNay.naturalHeight || 1)
      gl.uniform2f(U.uM, mx, my)
      gl.uniform1f(U.uDpr, dpr)
      gl.uniform1f(U.uBand, S.lensBand)
      gl.uniform1f(U.uBend, S.lensBend)
      gl.uniform1f(U.uZoom, S.lensZoom)
      gl.uniform1f(U.uDisp, S.lensDisp)
      gl.uniform1f(U.uWave, S.lensWave)
      gl.uniform1f(U.uRim, S.lensRim)
      gl.uniform1f(U.uStr, str)
      gl.uniform1f(U.uTime, now / 1000)
      gl.uniform3f(U.uCol, mau[0], mau[1], mau[2])
      gl.drawArrays(gl.TRIANGLES, 0, 3)
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
      str += ((trongKhung ? 1 : 0) - str) * ks
      if (!trongKhung && str < 0.002) {
        // Tắt hẳn: giấu canvas, lộ lại các lớp ảnh DOM.
        str = 0
        cv.style.visibility = 'hidden'
        return
      }
      ve(now)
      raf = requestAnimationFrame(khung)
    }
    function chay() {
      if (!raf) {
        last = performance.now()
        raf = requestAnimationFrame(khung)
      }
    }

    return {
      vao: function (e, im) {
        var b = doKhung()
        napAnh(im)
        tx = e.clientX - b.left
        ty = e.clientY - b.top
        if (str < 0.002) {
          mx = tx
          my = ty
        }
        trongKhung = true
        cv.style.visibility = 'visible'
        chay()
      },
      di: function (e) {
        // Đo hộp theo SỰ KIỆN di chuột (không phải mỗi khung): canvas không làm
        // bẩn layout nên phép đo rẻ, và đúng cả khi trang vừa cuộn.
        var b = hop.getBoundingClientRect()
        tx = e.clientX - b.left
        ty = e.clientY - b.top
      },
      ra: function () {
        trongKhung = false
        chay()
      },
      // Sang cụm chữ khác: tắt NGAY, để ảnh mới mờ vào không bị canvas che.
      tatNgay: function () {
        trongKhung = false
        str = 0
        if (raf) cancelAnimationFrame(raf)
        raf = 0
        cv.style.visibility = 'hidden'
      },
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true })
  else boot()
})()
