/* kx-spin.js — các vòng xoay có keyframe trong Figma (get_motion_context).
 *
 * Figma khai: rotate từ -π về 0 trong 2s, lặp vô hạn. Home và Works dùng
 * ease-out cho Ellipse 152 / Ellipse 143; Work Detail cho icon cuộn vải xoay
 * bằng đường cong lò xo (bảng linear() chép nguyên từ Figma).
 *
 * ĐĨA QUAY THEO CUỘN (người dùng chốt, trang Works): phần tử khai trong
 * `scrollNodes` KHÔNG quay đều nữa mà quay theo vị trí cuộn — cuộn xuống quay
 * thuận, cuộn lên quay ngược, đuổi theo có quán tính (`scrollEase`). Có thể
 * cộng thêm một vòng quay đều nhẹ khi đứng yên (`idleDeg`).
 *
 * Mỗi khung KHÔNG ghi chuỗi `rotate: …deg` (cấp phát mỗi khung — điều cấm số 2
 * của project). Thay vào đó dựng MỘT animation tuyến tính 0→360° đứng yên rồi
 * chỉ gán số vào `currentTime`: 10 ms của animation = 1 độ.
 *
 * Gắn theo data-n (node id của Figma do tools/figma-to-html.mjs ghi ra) — nên
 * dựng lại trang từ Figma thì hiệu ứng vẫn bám đúng phần tử.
 */
(function () {
  'use strict'

  var CONFIG = {
    enabled: true,
    duration: 2,            // giây một vòng
    fromTurn: -0.5,         // -π rad = nửa vòng
    // Phần tử motion.div ở Home / Works (Ellipse 152, Ellipse 143)
    easeDisc: 'ease-out',
    // Icon cuộn vải ở Work Detail (305:5242) — spring của Figma
    easeSpring: 'linear(0, 0.0985, 0.342, 0.6483, 0.9442, 1.1767, 1.3179, 1.364, 1.3302, 1.2427, 1.1314, 1.0233, 0.9377, 0.8853, 0.8675, 0.8791, 0.9105, 0.9509, 0.9904, 1.0219, 1.0414, 1.0482, 1.0443, 1.033, 1.0183, 1.0039, 0.9923, 0.9851, 0.9825, 0.9838, 0.9878, 0.9932, 0.9984, 1.0027, 1.0054, 1.0064, 1.0059, 1.0045, 1.0025, 1.0006, 0.9991, 0.9981, 0.9977, 0.9978, 0.9983, 0.9991, 0.9998, 1.0003, 1.0007, 1.0008, 1.0008)',
    springNodes: '305:5242',

    // ----------------------------------------------------- quay theo cuộn
    scrollNodes: '325:6130', // đĩa ở cột trái trang Works
    scrollSpin: true, // tắt = đĩa quay đều như Figma
    scrollDeg: 0.03, // độ quay trên mỗi px cuộn — 0.3 ≈ một vòng mỗi 1200 px
    scrollEase: 1, // 0..1 mỗi khung đuổi được bấy nhiêu phần; 1 = bám cứng, nhỏ = trôi có đà
    scrollReverse: false, // true = cuộn xuống thì quay ngược chiều kim đồng hồ
    idleDeg: 8, // độ/giây quay đều thêm cả khi đứng yên; 0 = chỉ quay khi cuộn
    // QUÁN TÍNH (người dùng chốt, "cho real hơn"): mỗi nhát cuộn đẩy thêm cho
    // đĩa một lực quay; thôi cuộn thì đĩa còn trôi thêm một chút rồi mới dừng
    // hẳn, như đĩa thật có trớn. Tổng góc trôi thêm ≈ spinMomentum lần góc của
    // chính nhát cuộn đó. 0 = không có trớn.
    spinMomentum: 0.35,
    spinFriction: 0.884, // phần vận tốc còn lại sau mỗi khung 60fps; cao = trôi lâu
  }

  function spin(el, ease) {
    if (!el || el.__kxSpin) return
    el.__kxSpin = el.animate(
      [{ rotate: CONFIG.fromTurn + 'turn', easing: ease }, { rotate: '0turn' }],
      { duration: CONFIG.duration * 1000, iterations: Infinity }
    )
  }

  /* ----------------------------------------------------- quay theo cuộn */

  var dia = [] // { el, anim }
  var goc = 0 // góc đang hiện (độ, không chặn về 0..360 — để đuổi không bị vòng ngược)
  var gocTu = 0 // phần quay đều + phần trôi theo quán tính, cộng dồn
  var vDa = 0 // độ/giây — vận tốc trôi theo quán tính
  var syTruoc = 0
  var last = 0

  function laDiaCuon(el) {
    var id = el.getAttribute('data-n')
    if (!id) return false
    return CONFIG.scrollNodes.split(',').some(function (x) { return x.trim() === id })
  }

  function batDiaCuon(el) {
    if (el.__kxSpin) el.__kxSpin.cancel()
    var a = el.animate([{ rotate: '0deg' }, { rotate: '360deg' }], {
      duration: 3600, // 10 ms = 1 độ
      iterations: Infinity,
      easing: 'linear',
      fill: 'both',
    })
    a.pause()
    el.__kxSpin = a
    dia.push({ el: el, anim: a })
  }

  // Ghi góc hiện tại ra animation — gọi cả khi góc không đổi mà vừa đặt lại.
  function ghiGoc() {
    var t = ((goc % 360) + 360) % 360 * 10
    for (var i = 0; i < dia.length; i++) dia[i].anim.currentTime = t
  }

  function dich() {
    var huong = CONFIG.scrollReverse ? -1 : 1
    return huong * window.scrollY * CONFIG.scrollDeg + gocTu
  }

  /* Vòng LUÔN SỐNG, không có việc thì bỏ qua — đúng bài học "vòng vẽ chết hẳn
   * khi tab bị ẩn" trong CLAUDE.md. */
  function khung(now) {
    requestAnimationFrame(khung)
    var dt = Math.min((now - last) / 1000, 1 / 20) || 1 / 60
    last = now
    if (!dia.length) return
    if (!CONFIG.scrollSpin) return
    if (CONFIG.idleDeg) gocTu += CONFIG.idleDeg * dt
    // Quán tính: nhát cuộn khung này góp một xung vận tốc, cỡ sao cho tổng quãng
    // trôi (chuỗi hình học v·f^n) ≈ spinMomentum × góc của chính nhát cuộn.
    var sy = window.scrollY
    var ds = sy - syTruoc
    syTruoc = sy
    var f = Math.min(0.995, Math.max(0, CONFIG.spinFriction))
    if (CONFIG.spinMomentum > 0) {
      var huong = CONFIG.scrollReverse ? -1 : 1
      vDa += huong * ds * CONFIG.scrollDeg * CONFIG.spinMomentum * (1 - f) * 60
    }
    if (vDa) {
      gocTu += vDa * dt
      vDa *= Math.pow(f, dt * 60)
      if (Math.abs(vDa) < 0.01) vDa = 0
    }
    var d = dich()
    var e = Math.min(1, Math.max(0.01, CONFIG.scrollEase))
    // Chuẩn hoá theo 60fps để máy 120Hz không quay nhanh gấp đôi.
    var k = 1 - Math.pow(1 - e, dt * 60)
    var moi = goc + (d - goc) * k
    if (Math.abs(moi - goc) < 0.001) return
    goc = moi
    ghiGoc()
  }

  /* Bảng setting gọi sau mỗi lần đổi giá trị: bật/tắt chế độ cuộn phải đổi
   * hẳn kiểu animation của đĩa. */
  function apDung() {
    dia.forEach(function (d) {
      vDa = 0
      if (CONFIG.scrollSpin) {
        if (d.quayDeu) {
          d.quayDeu.cancel()
          d.quayDeu = null
          d.anim.play()
          d.anim.pause()
        }
      } else if (!d.quayDeu) {
        d.anim.pause()
        d.anim.currentTime = 0
        d.quayDeu = d.el.animate(
          [{ rotate: CONFIG.fromTurn + 'turn', easing: CONFIG.easeDisc }, { rotate: '0turn' }],
          { duration: CONFIG.duration * 1000, iterations: Infinity }
        )
      }
    })
    if (CONFIG.scrollSpin) {
      goc = dich() // khỏi quay vù một vòng dài khi vừa bật lại
      ghiGoc()
    }
  }

  function start() {
    if (!CONFIG.enabled) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    document.querySelectorAll('[data-kx-motion]').forEach(function (el) {
      if (laDiaCuon(el)) batDiaCuon(el)
      else spin(el, CONFIG.easeDisc)
    })
    CONFIG.springNodes.split(',').forEach(function (id) {
      spin(document.querySelector('[data-n="' + id.trim() + '"]'), CONFIG.easeSpring)
    })
    if (dia.length) {
      syTruoc = window.scrollY // không coi vị trí khôi phục lúc vào trang là một nhát cuộn
      goc = dich() // vào trang giữa chừng thì đĩa đứng đúng góc, không quay đuổi từ 0
      apDung()
      requestAnimationFrame(function (t) {
        last = t
        requestAnimationFrame(khung)
      })
    }
  }

  // `config` + `defaults` cho bảng setting (kx-panel.js); `CONFIG` giữ cho cũ.
  window.KX_SPIN = {
    CONFIG: CONFIG,
    config: CONFIG,
    defaults: Object.freeze(Object.assign({}, CONFIG)),
    start: start,
    apDung: apDung,
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start)
  else start()
})()
