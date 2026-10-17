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
 * ẢNH — mỗi dự án một lớp ảnh chồng trong khung ảnh gốc, MỜ DẦN vào / ra;
 * lớp mới nhất nằm trên. Rời hết thì lộ ảnh gốc của bản thiết kế bên dưới.
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
    anhMs: 280, // ms — ảnh dự án mờ dần vào / ra
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
      // Lớp ảnh dự án: mờ dần vào / ra.
      '.kx-page .kx-fh-anh{position:absolute;inset:0;overflow:hidden;opacity:0;pointer-events:none;transition:opacity ' + S.anhMs + 'ms ease}',
      '.kx-page .kx-fh-anh.is-on{opacity:1}',
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
      lop.push({ vo: vo, im: im })
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

    var z = 10
    function hienAnh(i) {
      var l = lop[i]
      if (!l) return
      if (!l.im.src) l.im.src = l.im.dataset.src
      l.vo.style.zIndex = String(++z) // lớp mới nhất nằm trên
      l.vo.classList.add('is-on')
    }
    function anAnh(i) {
      var l = lop[i]
      if (!l) return
      l.vo.classList.remove('is-on')
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
