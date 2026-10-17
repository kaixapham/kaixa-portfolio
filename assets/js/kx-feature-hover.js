/* =============================================================================
 * kaixa Portfolio — "Feature Works ©12": rê chuột vào dự án thì đổi ảnh (Home)
 * -----------------------------------------------------------------------------
 * Cụm Feature Works có cột TRÁI (số + tên dự án) và cột PHẢI (năm + dịch vụ),
 * cùng thứ tự từng cụm, ảnh ở giữa. Người dùng chốt: rê chuột vào một cụm chữ
 * — bên trái HAY bên phải — thì ảnh giữa đổi sang ảnh của dự án đó. Cụm thứ i
 * bên trái và cụm thứ i bên phải là cùng một dự án.
 *
 * Ảnh dự án nằm CHỒNG trong đúng khung ảnh gốc (cùng class sinh ra, nên cùng
 * object-fit / cỡ), hiện bằng mờ dần. Rời khỏi cả hai cột thì về ảnh gốc của
 * bản thiết kế (`veGoc`). Cụm đang rê sáng lên (`sang`), hai bên cùng sáng.
 *
 * Ảnh: dự án nào có ở trang Works thì lấy ảnh bìa ở đó; dự án chưa có ảnh
 * riêng thì tạm mượn ảnh có sẵn trên Home — thay đường dẫn trong `anh` là xong.
 * Bám theo `data-n` (node id Figma). File KHÔNG chứa UI setting.
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
    fade: 280, // ms
    veGoc: true, // rời khỏi danh sách thì về ảnh gốc; false = giữ ảnh vừa rê
    sang: '#ebebeb', // màu chữ của cụm đang rê; để trống = không đổi màu
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
    var hop = goc.parentElement // khung bọc ảnh gốc — ảnh dự án chồng vào đây

    var cumTrai = Array.prototype.slice.call(trai.children)
    var cumPhai = Array.prototype.slice.call(phai.children)
    var duong = S.anh.split(',').map(function (x) { return x.trim() })
    var n = Math.min(cumTrai.length, duong.length)

    // Ảnh dự án: cùng class với ảnh gốc nên cùng cỡ và object-fit; tải lười
    // nhưng chủ động nạp trước khi trỏ chuột tới gần cụm này.
    var lop = []
    for (var i = 0; i < n; i++) {
      var im = document.createElement('img')
      im.className = goc.className
      im.alt = ''
      im.decoding = 'async'
      im.style.opacity = '0'
      im.style.transition = 'opacity ' + S.fade + 'ms ease'
      im.dataset.src = duong[i]
      hop.appendChild(im)
      lop.push(im)
    }
    goc.style.transition = 'opacity ' + S.fade + 'ms ease'

    var napRoi = false
    function napTruoc() {
      if (napRoi) return
      napRoi = true
      lop.forEach(function (im) { if (!im.src) im.src = im.dataset.src })
    }

    var cur = -1
    function hien(i) {
      if (i === cur) return
      cur = i
      lop.forEach(function (im, j) { im.style.opacity = j === i ? '1' : '0' })
      // Ảnh gốc chỉ mờ đi khi ĐÃ có ảnh dự án đè lên — không có nhịp trống.
      goc.style.opacity = i < 0 ? '' : '0'
      if (S.sang) {
        for (var j = 0; j < n; j++) {
          var mau = j === i ? S.sang : ''
          chu[j].forEach(function (p) { p.style.color = mau })
        }
      }
    }

    // Dòng chữ của từng dự án, cả hai cột — tô màu thẳng lên <p> (màu xám gốc
    // nằm ở class của chính <p>, nên đặt lên cụm bọc ngoài thì không ăn).
    var chu = []
    for (var c = 0; c < n; c++) {
      chu.push(
        Array.prototype.slice.call((cumTrai[c] || document.createElement('i')).querySelectorAll('p')).concat(
          Array.prototype.slice.call((cumPhai[c] || document.createElement('i')).querySelectorAll('p'))
        )
      )
      chu[c].forEach(function (p) { p.style.transition = 'color ' + Math.round(S.fade * 0.6) + 'ms ease' })
    }

    function noi(cum, i) {
      if (!cum) return
      cum.addEventListener('pointerenter', function () {
        napTruoc()
        if (!lop[i].src) lop[i].src = lop[i].dataset.src
        hien(i)
      })
    }
    for (var k = 0; k < n; k++) {
      noi(cumTrai[k], k)
      noi(cumPhai[k], k)
    }

    // Về ảnh gốc khi rời khỏi CẢ hai cột — đi ngang khe giữa hai cụm thì không
    // nhấp nháy về gốc.
    var trong = 0
    ;[trai, phai].forEach(function (cot) {
      cot.addEventListener('pointerenter', function () {
        trong++
        napTruoc()
      })
      cot.addEventListener('pointerleave', function () {
        trong = Math.max(0, trong - 1)
        if (!trong && S.veGoc) hien(-1)
      })
    })
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true })
  else boot()
})()
