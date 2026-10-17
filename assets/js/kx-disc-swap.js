/* =============================================================================
 * kaixa Portfolio — Đĩa CD đổi mặt theo dự án (trang Works)
 * -----------------------------------------------------------------------------
 * Người dùng chốt: cuộn tới một dự án mới thì đĩa ở cột trái (`325:6130`, đứng
 * yên khi cuộn và quay theo cuộn nhờ kx-spin.js) đổi sang mặt đĩa mới.
 *
 * Mặt đĩa của mỗi dự án:
 *   - `disc1`…`disc5` khai đường dẫn ảnh (TƯƠNG ĐỐI — luật số 5) thì dùng
 *     nguyên ảnh đó, cắt tròn.
 *   - Để trống (mặc định) thì TỰ DỰNG từ ảnh bìa của chính dự án (ảnh đầu tiên
 *     của hàng `coverRow`): cắt tròn, chuyển xám cho hợp tông mặt đĩa gốc, đắp
 *     vòng nhãn giữa + lỗ tâm + vệt bóng như một đĩa CD thật.
 * Khúc đầu trang (chữ WORKS, trước dự án 01) giữ mặt đĩa gốc của Figma.
 *
 * Các mặt đĩa là những <canvas> chồng lên thẻ <img> gốc NGAY TRONG phần tử
 * đĩa — nên chúng quay cùng đĩa mà không phải đụng tới kx-spin.js (nó quay
 * phần tử bọc bằng thuộc tính `rotate`, không phải `transform`). Dựng một lần
 * lúc mở trang (và khi bảng setting đổi số), không vẽ gì mỗi khung.
 *
 * Dự án nào đang "tới": dự án cuối cùng có đỉnh đã vượt vạch `line` (phần
 * chiều cao viewport). Đỉnh dự án đo THƯA (lúc mở, lúc đổi cỡ, lúc trang nạp
 * xong) rồi mỗi lần cuộn chỉ so số — không đo layout khi cuộn.
 *
 * Bám theo `data-n` (node id Figma). File KHÔNG chứa UI setting; bảng chỉnh
 * là kx-panel.js (phím H).
 * ========================================================================== */
(function () {
  'use strict'

  var CONFIG = {
    enabled: true,
    disc: '325:6130', // phần tử đĩa ở cột trái (đang quay theo cuộn)
    // Dự án 01 (node gốc) rồi bốn instance 02–05, đúng thứ tự trên trang.
    projects: '325:6651,325:6652,325:6735,325:6903,325:6986',
    coverRow: '325:6120', // hàng lấy ảnh bìa (ảnh đầu tiên của hàng)
    // Mặt đĩa riêng của từng dự án; để trống = tự dựng từ ảnh bìa. Năm mặt
    // dưới đây thiết kế bằng Magnific (ảnh 1536px nền đen), đã cắt sát đĩa,
    // đục trong suốt nền và lỗ tâm, nén WebP 800px.
    disc1: 'assets/works/disc/disc-01.webp',
    disc2: 'assets/works/disc/disc-02.webp',
    disc3: 'assets/works/disc/disc-03.webp',
    disc4: 'assets/works/disc/disc-04.webp',
    disc5: 'assets/works/disc/disc-05.webp',
    gray: true, // chuyển xám cho hợp tông đĩa gốc; tắt = giữ màu ảnh
    contrast: 1.15, // độ tương phản của ảnh trên mặt đĩa
    hub: 0.3, // bán kính vùng nhãn giữa, phần bán kính đĩa
    hole: 0.085, // bán kính lỗ tâm, phần bán kính đĩa
    sheen: 0.18, // độ đậm vệt bóng xoè quanh tâm; 0 = bỏ
    line: 0.5, // vạch đổi đĩa: phần chiều cao viewport tính từ đỉnh
    fade: 520, // ms — mặt mới hiện dần
    pop: 0.06, // mặt mới phóng từ (1 - pop) lên 1; 0 = chỉ mờ dần
    maxPx: 800, // trần cạnh canvas mặt đĩa (px thật)
  }

  var S = CONFIG
  var api = (window.KX_DISC_SWAP = {
    config: S,
    defaults: Object.freeze(Object.assign({}, CONFIG)),
  })

  var dia = null // phần tử đĩa
  var goc = null // thẻ <img> mặt đĩa gốc
  var lop = [] // canvas mặt đĩa từng dự án (cùng thứ tự với `khoi`)
  var khoi = [] // { el, top (px trang), anh: src ảnh bìa }
  var cur = -2 // mặt đang hiện: -1 = mặt gốc, 0..n-1 = dự án
  var z = 1
  var hen = 0

  function q(id) {
    return document.querySelector('[data-n="' + id + '"]')
  }

  function napAnh(src) {
    return new Promise(function (ok) {
      if (!src) return ok(null)
      var im = new Image()
      im.decoding = 'async'
      im.onload = function () { ok(im) }
      im.onerror = function () { ok(null) }
      im.src = src
    })
  }

  /* ------------------------------------------------------------- vẽ mặt đĩa */

  function phuTron(ctx, im, n) {
    // Ảnh phủ kín hình tròn kiểu object-fit: cover, lấy giữa.
    var sc = Math.max(n / im.naturalWidth, n / im.naturalHeight)
    var w = im.naturalWidth * sc
    var h = im.naturalHeight * sc
    ctx.drawImage(im, (n - w) / 2, (n - h) / 2, w, h)
  }

  // Xám + tương phản bằng tay: ctx.filter chưa có ở mọi trình duyệt (Safari cũ).
  function xam(ctx, n) {
    var d = ctx.getImageData(0, 0, n, n)
    var p = d.data
    var k = S.contrast
    for (var i = 0; i < p.length; i += 4) {
      var y = 0.2126 * p[i] + 0.7152 * p[i + 1] + 0.0722 * p[i + 2]
      if (S.gray) {
        y = (y - 128) * k + 128
        p[i] = p[i + 1] = p[i + 2] = y < 0 ? 0 : y > 255 ? 255 : y
      } else {
        for (var c = 0; c < 3; c++) {
          var v = (p[i + c] - 128) * k + 128
          p[i + c] = v < 0 ? 0 : v > 255 ? 255 : v
        }
      }
    }
    ctx.putImageData(d, 0, 0)
  }

  function veMat(cv, im, tuDung) {
    var n = cv.width
    var r = n / 2
    var ctx = cv.getContext('2d')
    ctx.clearRect(0, 0, n, n)
    if (!im) return
    ctx.save()
    ctx.beginPath()
    ctx.arc(r, r, r - 0.5, 0, Math.PI * 2)
    ctx.clip()
    phuTron(ctx, im, n)
    ctx.restore()
    if (!tuDung) return // ảnh mặt đĩa người dùng khai: dùng nguyên, chỉ cắt tròn

    if (S.gray || S.contrast !== 1) xam(ctx, n)

    // Vệt bóng xoè quanh tâm — ánh cầu vồng mờ của mặt đĩa, ở đây để xám.
    if (S.sheen > 0 && ctx.createConicGradient) {
      var g = ctx.createConicGradient(0, r, r)
      for (var i = 0; i <= 8; i++) g.addColorStop(i / 8, i % 2 ? 'rgba(255,255,255,0)' : 'rgba(255,255,255,1)')
      ctx.save()
      ctx.globalAlpha = S.sheen
      ctx.globalCompositeOperation = 'soft-light'
      ctx.beginPath()
      ctx.arc(r, r, r - 0.5, 0, Math.PI * 2)
      ctx.fillStyle = g
      ctx.fill()
      ctx.restore()
    }

    // Vòng nhãn giữa: nhựa trong ngả xám như mặt đĩa gốc, có hai đường gờ.
    var hub = r * S.hub
    ctx.beginPath()
    ctx.arc(r, r, hub, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(214,214,214,0.9)'
    ctx.fill()
    ctx.lineWidth = Math.max(1, n / 400)
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(r, r, hub * 0.62, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(0,0,0,0.14)'
    ctx.stroke()
    // Mép ngoài sáng nhẹ.
    ctx.beginPath()
    ctx.arc(r, r, r - ctx.lineWidth, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(255,255,255,0.28)'
    ctx.stroke()
    // Lỗ tâm: đục thủng hẳn (trong suốt), không tô màu nền.
    ctx.save()
    ctx.globalCompositeOperation = 'destination-out'
    ctx.beginPath()
    ctx.arc(r, r, r * S.hole, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  function canhCanvas() {
    var b = dia.getBoundingClientRect()
    // Đĩa đang xoay nên hộp bao to hơn đĩa tới √2 — lấy cỡ bố cục, không lấy hộp bao.
    var w = dia.offsetWidth || b.width
    return Math.max(64, Math.min(S.maxPx, Math.round(w * (window.devicePixelRatio || 1))))
  }

  function dungMat() {
    var n = canhCanvas()
    return Promise.all(
      khoi.map(function (k, i) {
        var rieng = S['disc' + (i + 1)]
        return napAnh(rieng || k.anh).then(function (im) {
          var cv = lop[i]
          cv.width = cv.height = n
          veMat(cv, im, !rieng)
        })
      })
    )
  }

  /* ------------------------------------------------------------- đổi mặt */

  function lopCua(i) {
    return i < 0 ? goc : lop[i]
  }

  function hien(i) {
    if (i === cur) return
    var truoc = cur
    cur = i
    var moi = lopCua(i)
    if (!moi) return
    var cu = lopCua(truoc)
    var tat = function (el) {
      if (!el || el === moi) return
      el.style.opacity = '0'
    }
    moi.style.transition = 'none'
    moi.style.opacity = '0'
    moi.style.transform = 'scale(' + (1 - S.pop) + ')'
    moi.style.zIndex = String(++z)
    // Ép trình duyệt chốt trạng thái đầu rồi mới bật transition.
    void moi.offsetWidth
    moi.style.transition = 'opacity ' + S.fade + 'ms ease, transform ' + S.fade + 'ms cubic-bezier(.2,.8,.2,1)'
    moi.style.opacity = '1'
    moi.style.transform = 'scale(1)'
    // Mặt cũ nằm dưới, đợi mặt mới hiện hẳn rồi mới tắt — không có nhịp trống.
    clearTimeout(hen)
    hen = setTimeout(function () {
      tat(cu)
      lop.forEach(tat)
      if (cur >= 0) tat(goc)
    }, S.fade + 40)
  }

  // Mỗi lần cuộn chỉ so số với đỉnh dự án đã đo sẵn.
  function chon() {
    if (!S.enabled) return hien(-1)
    var vach = window.scrollY + window.innerHeight * S.line
    var i = -1
    for (var k = 0; k < khoi.length; k++) if (khoi[k].top <= vach) i = k
    hien(i)
  }

  function doDinh() {
    var sy = window.scrollY
    khoi.forEach(function (k) {
      k.top = k.el.getBoundingClientRect().top + sy
    })
    chon()
  }

  /* ------------------------------------------------------------- vào */

  function boot() {
    if (!document.querySelector('.kx-page')) return
    dia = q(S.disc)
    if (!dia) return
    goc = dia.querySelector('img')
    if (!goc) return

    S.projects.split(',').forEach(function (id) {
      var el = q(id.trim())
      if (!el) return
      var hang = el.querySelector('[data-n="' + S.coverRow + '"]') || el.querySelector('[data-n$=";' + S.coverRow + '"]')
      var im = hang && hang.querySelector('img')
      khoi.push({ el: el, top: Infinity, anh: im ? im.currentSrc || im.src : '' })
    })
    if (!khoi.length) return

    khoi.forEach(function () {
      var cv = document.createElement('canvas')
      cv.setAttribute('aria-hidden', 'true')
      // Cùng hộp với thẻ <img> gốc; quay theo phần tử đĩa như nó.
      cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none;opacity:0'
      dia.appendChild(cv)
      lop.push(cv)
    })
    goc.style.position = goc.style.position || ''

    dungMat().then(doDinh)

    addEventListener('scroll', chon, { passive: true })
    addEventListener('kx-cuon', chon)
    var hen2 = 0
    addEventListener('resize', function () {
      clearTimeout(hen2)
      hen2 = setTimeout(function () {
        dungMat()
        doDinh()
      }, 150)
    })
    addEventListener('load', doDinh)

    Object.assign(api, {
      chon: chon,
      // Bảng setting gọi sau mỗi lần đổi số: vẽ lại mặt đĩa, chọn lại mặt.
      apDung: function () {
        dungMat().then(function () {
          var i = cur
          cur = -2
          hien(S.enabled ? i : -1)
          chon()
        })
      },
    })
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true })
  else boot()
})()
