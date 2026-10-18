/* =============================================================================
 * kaixa Portfolio — Hover nút bằng lưới pixel (bốn trang Figma)
 * -----------------------------------------------------------------------------
 * Người dùng chốt: nút có trạng thái hover, "kiểu hover lấy theo cái effect sau
 * khi loading xong" — tức lưới pixel của kx-page-transition.js, thu nhỏ vào
 * trong khung nút:
 *   - rê vào: ô pixel quét từ trái sang, mờ vào lệch nhịp, phủ kín nút;
 *   - rời:    ô pixel quét đi theo cùng chiều, nút về như cũ.
 * Lớp pixel trộn `difference` nên chữ + icon tự đảo màu (nền sáng, chữ tối)
 * mà không phải sửa màu từng phần tử.
 *
 * Lưới dựng MỘT LẦN cho mỗi nút (lần rê đầu), mốc giờ của từng ô tính sẵn;
 * mỗi lần rê chỉ chạy Web Animations trên các ô có sẵn — không cấp phát gì
 * thêm. Rê ra giữa chừng thì quét đi TỪ ĐỘ PHỦ hiện tại, không giật.
 *
 * Nút = khối cha của chữ "EMAIL ME" (`chu`), cộng các selector ở `them`. Bám
 * chữ chứ không bám class: class sinh tự động, đổi tên mỗi lần dựng lại.
 * File KHÔNG chứa UI setting.
 * ========================================================================== */
(function () {
  'use strict'

  var CONFIG = {
    enabled: true,
    chu: 'EMAIL ME', // nút = khối cha của dòng chữ này (cách nhau bằng ||)
    them: '', // selector thêm, cách nhau bằng dấu phẩy
    o: 8, // px thiết kế — cạnh một ô pixel
    vaoMs: 380, // quét vào hết nút
    raMs: 380, // quét đi hết nút
    moMs: 90, // một ô mờ vào / mờ ra
    lech: 0.35, // 0..1 — ô trong cùng cột lệch nhau ngẫu nhiên bao nhiêu
    color: '#ffffff',
    blend: 'difference', // difference = chữ tự đảo màu
  }

  var S = CONFIG
  var api = (window.KX_PIXEL_HOVER = { config: S, defaults: Object.freeze(Object.assign({}, CONFIG)) })

  var daCss = false
  function ganCss() {
    if (daCss) return
    daCss = true
    var st = document.createElement('style')
    st.textContent = [
      '.kx-ph{position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:5}',
      '.kx-ph__o{position:absolute;opacity:0}',
    ].join('\n')
    document.head.appendChild(st)
  }

  function cacNut() {
    var ra = []
    String(S.chu || '').split('||').forEach(function (chu) {
      chu = chu.trim()
      if (!chu) return
      document.querySelectorAll('.kx-page p').forEach(function (p) {
        if (p.textContent.replace(/\s+/g, ' ').trim() === chu && p.parentElement) ra.push(p.parentElement)
      })
    })
    if (S.them) document.querySelectorAll(S.them).forEach(function (e) { ra.push(e) })
    return ra.filter(function (e, i) { return ra.indexOf(e) === i })
  }

  // Dựng lưới trong nút: ô vuông `o` px thiết kế, mỗi ô có mốc vào (0..1).
  function dungLuoi(nut) {
    var r = nut.getBoundingClientRect()
    var page = document.querySelector('.kx-page')
    var u = page ? page.getBoundingClientRect().width / 1920 : 1
    var canh = Math.max(4, S.o * u)
    var cot = Math.max(1, Math.ceil(r.width / canh))
    var hang = Math.max(1, Math.ceil(r.height / canh))
    var lop = document.createElement('div')
    lop.className = 'kx-ph'
    lop.setAttribute('aria-hidden', 'true')
    lop.style.mixBlendMode = S.blend
    var ds = []
    for (var i = 0; i < cot; i++) {
      for (var j = 0; j < hang; j++) {
        var o = document.createElement('div')
        o.className = 'kx-ph__o'
        // +0.5px phủ khe làm tròn giữa hai ô (như kx-page-transition).
        o.style.cssText = 'left:' + (i * 100) / cot + '%;top:' + (j * 100) / hang + '%;width:calc(' + 100 / cot + '% + .5px);height:calc(' + 100 / hang + '% + .5px);background:' + S.color
        lop.appendChild(o)
        // mốc: theo cột (quét trái → phải) + lệch ngẫu nhiên trong cột
        ds.push({ el: o, moc: (i + Math.random() * S.lech * 2) / (cot + S.lech * 2) })
      }
    }
    if (getComputedStyle(nut).position === 'static') nut.style.position = 'relative'
    nut.appendChild(lop)
    return { lop: lop, o: ds, ky: S.o + '|' + S.color + '|' + S.blend + '|' + Math.round(r.width) }
  }

  function chay(nut, vao) {
    var g = nut.__kxPh
    var r = nut.getBoundingClientRect()
    var ky = S.o + '|' + S.color + '|' + S.blend + '|' + Math.round(r.width)
    if (!g || g.ky !== ky) {
      if (g) g.lop.remove()
      g = nut.__kxPh = dungLuoi(nut)
    }
    var tong = vao ? S.vaoMs : S.raMs
    g.o.forEach(function (p) {
      // Độ phủ THẬT lúc này (kể cả đang chạy dở) — rê ra/vào giữa chừng thì đi
      // tiếp từ đó, không nhảy.
      var hien = +getComputedStyle(p.el).opacity
      p.el.getAnimations().forEach(function (a) { a.cancel() })
      var dich = vao ? 1 : 0
      if (hien === dich) {
        p.el.style.opacity = dich
        return
      }
      p.el.style.opacity = dich
      p.el.animate([{ opacity: hien }, { opacity: dich }], {
        duration: S.moMs,
        delay: p.moc * Math.max(0, tong - S.moMs),
        easing: 'linear',
        fill: 'backwards',
      })
    })
  }

  function boot() {
    if (!S.enabled) return
    if (window.matchMedia && !matchMedia('(hover: hover)').matches) return
    ganCss()
    cacNut().forEach(function (nut) {
      if (nut.__kxPhGan) return
      nut.__kxPhGan = true
      nut.addEventListener('pointerenter', function () { chay(nut, true) })
      nut.addEventListener('pointerleave', function () { chay(nut, false) })
      nut.addEventListener('focusin', function () { chay(nut, true) })
      nut.addEventListener('focusout', function () { chay(nut, false) })
    })
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true })
  else boot()

  // Đổi số trong bảng thì lưới tự dựng lại ở lần rê sau (khoá `ky` đổi).
  api.apDung = function () {}
})()
