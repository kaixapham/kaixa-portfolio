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
 * ẢNH — mỗi dự án một lớp ảnh chồng, lớp mới nhất nằm trên (z-index tăng).
 *   vào:  clip-path inset(0 0 100% 0) → inset(0); ảnh trong dời -50% → 0,
 *         phóng 1.2 → 1 — 0.5 s power1.out
 *   ra:   clip-path → inset(100% 0 0 0); ảnh trong dời → 30%, phóng → 1.2
 *         — 0.6 s sine.out
 * Rời hết thì các lớp đều đã cắt đi, lộ ảnh gốc của bản thiết kế bên dưới.
 * Ảnh có chỗ cố định giữa cụm theo bản thiết kế (không bám con trỏ).
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
    // Ảnh theo thứ tự cụm (đường dẫn TƯƠNG ĐỐI — luật số 5).
    anh: [
      'assets/works/rectangle2998.webp', // 01 Re:active
      'assets/home/image353.webp', // 02 Design Anthology — ảnh tạm
      'assets/home/rectangle2839.webp', // 03 Vietnam Exposition Center — ảnh tạm
      'assets/works/rectangle2992.webp', // 04 Lumen Studio
      'assets/works/rectangle2996.webp', // 05 Chande Bootcamp
      'assets/home/rectangle2854.webp', // 06 Petrolimex — ảnh tạm
      'assets/works/rectangle3002.webp', // 07 Niki Studio
      'assets/home/image347.webp', // 08 TMRW Studio — ảnh tạm
      'assets/home/rectangle2866.webp', // 09 Furion Eco System — ảnh tạm
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
    anhVaoMs: 500, // power1.out
    anhRaMs: 600, // sine.out
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
    var n = Math.min(cumTrai.length, duong.length)

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
      // Lớp ảnh dự án: vỏ cắt (clip-path), ảnh trong dời + phóng.
      '.kx-page .kx-fh-anh{position:absolute;inset:0;overflow:hidden;clip-path:inset(0 0 100% 0);pointer-events:none}',
      '.kx-page .kx-fh-anh img{will-change:transform}',
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
     * Cùng class với ảnh gốc nên cùng cỡ và object-fit. Tải khi con trỏ vào
     * cột lần đầu, không tải lúc mở trang. */
    var lop = []
    for (var i = 0; i < n; i++) {
      var vo = document.createElement('div')
      vo.className = 'kx-fh-anh'
      var im = document.createElement('img')
      im.className = goc.className
      im.alt = ''
      im.decoding = 'async'
      im.dataset.src = duong[i]
      vo.appendChild(im)
      hop.appendChild(vo)
      lop.push({ vo: vo, im: im, a1: null, a2: null })
    }
    var napRoi = false
    function napTruoc() {
      if (napRoi) return
      napRoi = true
      lop.forEach(function (l) { if (!l.im.src) l.im.src = l.im.dataset.src })
    }
    ;[trai, phai].forEach(function (cot) { cot.addEventListener('pointerenter', napTruoc) })

    var z = 10
    function dung(l) {
      if (l.a1) l.a1.cancel()
      if (l.a2) l.a2.cancel()
    }
    function hienAnh(i) {
      var l = lop[i]
      if (!l.im.src) l.im.src = l.im.dataset.src
      dung(l)
      l.vo.style.zIndex = String(++z)
      // Luôn mở lại từ trên xuống.
      l.a1 = l.vo.animate(
        [{ clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)' }],
        { duration: S.anhVaoMs, easing: S.vaoNhip, fill: 'forwards' }
      )
      l.a2 = l.im.animate(
        [{ transform: 'translateY(-50%) scale(1.2)' }, { transform: 'translateY(0) scale(1)' }],
        { duration: S.anhVaoMs, easing: S.vaoNhip, fill: 'forwards' }
      )
    }
    // Ra: nối tiếp từ chỗ đang dở — đọc trạng thái hiện tại TRƯỚC khi huỷ
    // animation đang chạy.
    function anAnh(i) {
      var l = lop[i]
      var cs = getComputedStyle(l.vo).clipPath
      var ts = getComputedStyle(l.im).transform
      dung(l)
      l.a1 = l.vo.animate(
        [{ clipPath: cs === 'none' ? 'inset(0% 0% 0% 0%)' : cs }, { clipPath: 'inset(100% 0% 0% 0%)' }],
        { duration: S.anhRaMs, easing: S.raNhip, fill: 'forwards' }
      )
      l.a2 = l.im.animate(
        [{ transform: ts === 'none' ? 'translateY(0) scale(1)' : ts }, { transform: 'translateY(30%) scale(1.2)' }],
        { duration: S.anhRaMs, easing: S.raNhip, fill: 'forwards' }
      )
    }

    /* ------------------------------------------------------- vào / ra */
    function vao(i) {
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
      anAnh(i)
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
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true })
  else boot()
})()
