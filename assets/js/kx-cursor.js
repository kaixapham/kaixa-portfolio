/* =============================================================================
 * kaixa Portfolio — Con trỏ tàu alien (cả site)
 * -----------------------------------------------------------------------------
 * Thay con trỏ hệ thống bằng một hình chrome bạc dáng mũi tên chuột. 11 KIỂU
 * (`kieu`, chọn trong bảng H): tàu alien gốc + 10 dạng vẽ thêm (đĩa bay, phi cơ
 * tàng hình, vuốt sinh-cơ, pha lê, mực alien, tên lửa retro, giáp cơ giới,
 * thuỷ ngân, vệ tinh, bọ máy). Tất cả do Magnific vẽ (Seedream 5 Pro, lấy kiểu
 * tàu alien làm tham chiếu phong cách cho đồng bộ), tách nền, ghép lại quầng
 * sáng, cắt sát — `assets/img/cursor/<kiểu>.webp`. Lấy cảm hứng từ một con trỏ
 * "The Alien" người dùng gửi; KHÔNG dùng file đó (giấy phép không rõ).
 *
 * Mỗi kiểu MỘT khoá phẳng dạng chuỗi 'file|mũiX|mũiY|sángX|sángY' (phần bề
 * rộng / chiều cao ảnh) — mũi nhọn và vị trí sáng đo tự động lúc xử lý ảnh.
 * Trong các BẢNG SETTING (`nativeSel`) dùng con trỏ hệ thống — người dùng chốt,
 * kéo thanh trượt bằng con trỏ vẽ dễ lệch.
 *
 * Vì sao không dùng CSS `cursor: url()`: con trỏ hệ thống không chuyển động
 * được (đổi url theo nhịp là tính lại style cả trang mỗi lần). Nên giấu con trỏ
 * hệ thống và cho một <div> cố định chạy theo chuột bằng `transform` — chỉ
 * compositor làm việc, không đụng layout (luật cấm số 1).
 *   - động cơ sáng nhấp nháy: một lớp quầng sáng đổi `opacity` (CSS animation)
 *   - tàu nghiêng nhẹ theo hướng di chuột (`tilt`), tự về thẳng khi dừng
 *   - rê vào thứ bấm được thì phóng nhẹ (`hoverScale`), bấm thì thu (`downScale`)
 * Vòng rAF chỉ chạy khi chuột đang di hoặc tàu chưa về thẳng; không cấp phát
 * trong vòng (luật cấm số 2).
 *
 * Màn cảm ứng / không có chuột thì tự đứng im, giữ con trỏ gốc.
 * File KHÔNG chứa UI setting.
 * ========================================================================== */
(function () {
  'use strict'

  var CONFIG = {
    enabled: true, // false = bỏ hẳn file (đọc một lần lúc mở trang)
    // Bật/tắt LÚC ĐANG CHẠY (người dùng chốt "cursor có cơ chế tắt bật"):
    // false = giấu tàu, trả con trỏ hệ thống; bật lại là hiện ngay, không cần
    // tải lại trang. Công tắc ở mục Cursor của bảng H.
    hien: true,
    kieu: 'jet', // alien | ufo | jet | claw | crystal | squid | rocket | mecha | mercury | probe | beetle
    // 'file|mũiX|mũiY|sángX|sángY' — đường dẫn TƯƠNG ĐỐI (luật số 5)
    alien: 'assets/img/cursor/alien.webp|0.023|0.029|0.84|0.85',
    ufo: 'assets/img/cursor/ufo.webp|0.038|0.03|0.83|0.6',
    jet: 'assets/img/cursor/jet.webp|0.03|0.024|0.58|0.51',
    claw: 'assets/img/cursor/claw.webp|0.028|0.022|0.64|0.58',
    crystal: 'assets/img/cursor/crystal.webp|0.022|0.022|0.37|0.59',
    squid: 'assets/img/cursor/squid.webp|0.055|0.055|0.35|0.31',
    rocket: 'assets/img/cursor/rocket.webp|0.02|0.024|0.66|0.61',
    mecha: 'assets/img/cursor/mecha.webp|0.02|0.025|0.53|0.43',
    mercury: 'assets/img/cursor/mercury.webp|0.03|0.03|0.26|0.25',
    probe: 'assets/img/cursor/probe.webp|0.12|0.032|0.57|0.52',
    beetle: 'assets/img/cursor/beetle.webp|0.138|0.021|0.54|0.43',
    size: 26, // px CSS thật (không theo px thiết kế — con trỏ giữ cỡ cố định)
    tilt: 14, // độ — nghiêng tối đa theo hướng di chuột (0 = không nghiêng)
    tiltEase: 0.18, // 0..1 mỗi khung 60fps — nghiêng / về thẳng nhanh cỡ nào
    hoverScale: 1.18, // rê vào link, nút
    downScale: 0.86, // lúc nhấn chuột
    glow: true, // động cơ sáng nhấp nháy
    glowMs: 1100, // một nhịp sáng-tối
    // ĐUÔI tàu — chỗ đuôi ruy-băng của kx-tail-cursor.js bám vào (người dùng:
    // "đầu dot của ruy băng sẽ ở phần đuôi của custom cursor"). Tự tìm từ ảnh:
    // cụm điểm đặc xa mũi nhất dọc trục mũi → thân. `duoiLui` đẩy thêm ra sau
    // (px CSS, âm = lùi vào thân).
    duoiLui: 0,
    scaleEase: 0.25, // 0..1 mỗi khung 60fps — phóng / thu khi rê nút, nhấn chuột
    // Thứ được coi là "bấm được"
    hoverSel: 'a,button,[role="button"],[role="link"],[data-kx-link],input,select,label,summary',
    // Vùng dùng con trỏ HỆ THỐNG: bảng H, nút mở bảng, bảng CD (K), devtools contact.
    nativeSel: '.kx-pn,.kx-pn-btn,.kx-cdb,.dasdev-panel,.dasdev-btn',
  }

  var S = CONFIG
  var api = (window.KX_CURSOR = { config: S, defaults: Object.freeze(Object.assign({}, CONFIG)) })

  function boot() {
    if (!S.enabled) return
    if (!window.matchMedia || !matchMedia('(hover: hover) and (pointer: fine)').matches) return

    var st = document.createElement('style')
    st.textContent = [
      'html.kx-cur, html.kx-cur *{cursor:none!important}',
      // Trong bảng setting: trả con trỏ hệ thống (độ ưu tiên cao hơn luật trên).
      'html.kx-cur .kx-cur-native, html.kx-cur .kx-cur-native *{cursor:default!important}',
      'html.kx-cur .kx-cur-native :is(a,button,select,label,summary,[role=button],[role=switch],input[type=range],input[type=color],input[type=checkbox]){cursor:pointer!important}',
      'html.kx-cur .kx-cur-native :is(input[type=text],input[type=number],textarea){cursor:text!important}',
      '.kx-cur-ship.is-an{opacity:0!important}',
      '.kx-cur-ship{position:fixed;left:0;top:0;z-index:2147483647;pointer-events:none;',
      '  will-change:transform;opacity:0;transition:opacity .15s}',
      '.kx-cur-ship.is-on{opacity:1}',
      // KHÔNG transition: góc và tỉ lệ làm mượt bằng JS để duoi() tính đúng chỗ
      // đang VẼ — transition CSS làm hình trễ hơn số, chấm đuôi trượt khỏi tàu.
      '.kx-cur-ship__inner{position:absolute;inset:0}',
      '.kx-cur-ship__img{position:absolute;inset:0;width:100%;height:100%;display:block;user-select:none}',
      '.kx-cur-ship__glow{position:absolute;width:60%;height:60%;margin:-30% 0 0 -30%;border-radius:50%;',
      '  background:radial-gradient(circle,rgba(235,245,255,.95) 0,rgba(200,225,255,.45) 30%,rgba(200,225,255,0) 70%);',
      '  mix-blend-mode:screen;animation:kx-cur-glow var(--kx-cur-glow,1100ms) ease-in-out infinite alternate}',
      '@keyframes kx-cur-glow{from{opacity:.25}to{opacity:.95}}',
    ].join('\n')
    document.head.appendChild(st)

    var tau = document.createElement('div')
    tau.className = 'kx-cur-ship'
    tau.setAttribute('aria-hidden', 'true')
    var trong = document.createElement('div')
    trong.className = 'kx-cur-ship__inner'
    var img = document.createElement('img')
    img.className = 'kx-cur-ship__img'
    img.alt = ''
    img.draggable = false
    var sang = document.createElement('div')
    sang.className = 'kx-cur-ship__glow'
    trong.appendChild(img)
    trong.appendChild(sang)
    tau.appendChild(trong)
    document.body.appendChild(tau)

    var hot = [0, 0]
    var duoiF = [0.85, 0.85] // điểm đuôi (phần khung ảnh), tìm lại mỗi lần ảnh nạp
    function timDuoi() {
      // Quét điểm đặc của ảnh tàu: trục = mũi → trọng tâm; đuôi = trung bình các
      // điểm có hình chiếu lên trục nằm trong 4% cuối. Một lần mỗi ảnh.
      try {
        var w = img.naturalWidth
        var h = img.naturalHeight
        if (!w || !h) return
        var c = document.createElement('canvas')
        c.width = w
        c.height = h
        var g = c.getContext('2d', { willReadFrequently: true })
        g.drawImage(img, 0, 0)
        var d = g.getImageData(0, 0, w, h).data
        var nx = hot[0] * w
        var ny = hot[1] * h
        var sx = 0
        var sy = 0
        var n = 0
        var i, xx, yy
        for (yy = 0; yy < h; yy++) for (xx = 0; xx < w; xx++) if (d[(yy * w + xx) * 4 + 3] > 110) { sx += xx; sy += yy; n++ }
        if (!n) return
        var ux = sx / n - nx
        var uy = sy / n - ny
        var ul = Math.sqrt(ux * ux + uy * uy) || 1
        ux /= ul
        uy /= ul
        var max = -1e9
        for (yy = 0; yy < h; yy++) for (xx = 0; xx < w; xx++) {
          if (d[(yy * w + xx) * 4 + 3] <= 110) continue
          var pr = (xx - nx) * ux + (yy - ny) * uy
          if (pr > max) max = pr
        }
        var nguong = max - 0.04 * Math.max(w, h)
        var tx = 0
        var ty = 0
        var m = 0
        for (yy = 0; yy < h; yy++) for (xx = 0; xx < w; xx++) {
          i = (yy * w + xx) * 4 + 3
          if (d[i] <= 110) continue
          if ((xx - nx) * ux + (yy - ny) * uy >= nguong) { tx += xx; ty += yy; m++ }
        }
        if (m) {
          duoiF[0] = (tx / m + 0.5) / w
          duoiF[1] = (ty / m + 0.5) / h
        }
      } catch (e) {}
    }
    var x = -100
    var y = -100
    function apDung() {
      var p = String(S[S.kieu] || S.alien).split('|')
      if (img.getAttribute('src') !== p[0]) img.src = p[0]
      hot[0] = +p[1] || 0
      hot[1] = +p[2] || 0
      tau.style.width = tau.style.height = S.size + 'px'
      // Xoay / phóng quanh MŨI NHỌN để điểm bấm không xê dịch.
      trong.style.transformOrigin = hot[0] * 100 + '% ' + hot[1] * 100 + '%'
      sang.style.left = (+p[3] || 0.5) * 100 + '%'
      sang.style.top = (+p[4] || 0.5) * 100 + '%'
      // đặt lại vị trí ngay (đổi kiểu thì mũi nhọn đổi chỗ)
      tau.style.transform = 'translate3d(' + (x - S.size * hot[0]) + 'px,' + (y - S.size * hot[1]) + 'px,0)'
      sang.style.display = S.glow ? '' : 'none'
      tau.style.setProperty('--kx-cur-glow', S.glowMs + 'ms')
    }
    apDung()
    // Chỉ giấu con trỏ hệ thống khi ảnh đã nạp — lỗi ảnh thì còn con trỏ gốc.
    // Đang tắt (`hien: false`) thì giữ con trỏ hệ thống và giấu tàu.
    var anhXong = false
    function datHien() {
      var bat = !!S.hien && anhXong
      document.documentElement.classList.toggle('kx-cur', bat)
      tau.style.display = S.hien ? '' : 'none'
    }
    img.addEventListener('load', function () {
      anhXong = true
      timDuoi() // đổi kiểu tàu là nạp ảnh mới → tìm lại đuôi
      datHien()
    })
    if (img.complete && img.naturalWidth) {
      anhXong = true
      timDuoi()
    }
    datHien()

    var xTruoc = -100
    var goc = 0 // độ nghiêng hiện tại
    var dich = 0 // độ nghiêng muốn tới
    var raf = 0
    var tren = false // đang trên thứ bấm được
    var nhan = false
    var tl = 1 // tỉ lệ đang vẽ (đuổi theo tlDich)
    function tlDich() {
      return nhan ? S.downScale : tren ? S.hoverScale : 1
    }

    function veTrong() {
      trong.style.transform = 'rotate(' + goc.toFixed(2) + 'deg) scale(' + tl.toFixed(4) + ')'
    }

    var last = 0
    function khung(now) {
      raf = 0
      var f = Math.min((now - last) / 16.67, 3) || 1
      last = now
      var hx = S.size * hot[0]
      var hy = S.size * hot[1]
      tau.style.transform = 'translate3d(' + (x - hx) + 'px,' + (y - hy) + 'px,0)'
      // Nghiêng theo vận tốc ngang, rồi tự tắt dần về 0.
      dich += (0 - dich) * (1 - Math.pow(1 - 0.12, f))
      goc += (dich - goc) * (1 - Math.pow(1 - S.tiltEase, f))
      var td = tlDich()
      tl += (td - tl) * (1 - Math.pow(1 - S.scaleEase, f))
      if (Math.abs(td - tl) < 0.001) tl = td
      veTrong()
      if (Math.abs(goc) > 0.05 || Math.abs(dich) > 0.05 || tl !== td) raf = requestAnimationFrame(khung)
    }
    function chay() {
      if (!raf) {
        last = performance.now()
        raf = requestAnimationFrame(khung)
      }
    }

    document.addEventListener('pointermove', function (e) {
      if (e.pointerType && e.pointerType !== 'mouse') return
      x = e.clientX
      y = e.clientY
      var vx = x - xTruoc
      xTruoc = x
      if (S.tilt) dich = Math.max(-S.tilt, Math.min(S.tilt, dich + vx * 0.35))
      tau.classList.add('is-on')
      chay()
    }, { passive: true })

    var trongBang = false
    document.addEventListener('pointerover', function (e) {
      // Vào bảng setting: giấu tàu, đánh dấu bảng để CSS trả con trỏ hệ thống.
      var bang = e.target && e.target.closest ? e.target.closest(S.nativeSel) : null
      if (bang && !bang.classList.contains('kx-cur-native')) bang.classList.add('kx-cur-native')
      if (!!bang !== trongBang) {
        trongBang = !!bang
        tau.classList.toggle('is-an', trongBang)
      }
      var t = e.target && e.target.closest ? e.target.closest(S.hoverSel) : null
      if (!!t !== tren) {
        tren = !!t
        chay()
      }
    })
    document.addEventListener('pointerdown', function () { nhan = true; chay() })
    document.addEventListener('pointerup', function () { nhan = false; chay() })
    // Chuột ra khỏi cửa sổ thì giấu tàu, vào lại thì hiện ở chỗ mới.
    document.addEventListener('mouseout', function (e) {
      if (!e.relatedTarget) tau.classList.remove('is-on')
    })
    window.addEventListener('blur', function () { tau.classList.remove('is-on') })

    Object.assign(api, {
      /* Toạ độ ĐUÔI tàu trên màn (px CSS) ghi vào `o` — không cấp phát, gọi
       * được mỗi khung. Trả false khi tàu không hiện (tắt, chưa nạp ảnh, chuột
       * ra ngoài, đang trong bảng setting) — nơi gọi tự quay về con trỏ. */
      duoi: function (o) {
        if (!S.hien || !anhXong || !tau.classList.contains('is-on') || trongBang) return false
        var lx = (duoiF[0] - hot[0]) * S.size
        var ly = (duoiF[1] - hot[1]) * S.size
        var ll = Math.sqrt(lx * lx + ly * ly)
        if (ll > 0 && S.duoiLui) {
          lx += (lx / ll) * S.duoiLui
          ly += (ly / ll) * S.duoiLui
        }
        var a = (goc * Math.PI) / 180
        var ca = Math.cos(a) * tl
        var sa = Math.sin(a) * tl
        o.x = x + lx * ca - ly * sa
        o.y = y + lx * sa + ly * ca
        return true
      },
      apDung: function () {
        apDung()
        datHien()
      },
      // Bật/tắt từ chỗ khác (vd. console): KX_CURSOR.bat(false)
      bat: function (on) {
        S.hien = on == null ? !S.hien : !!on
        datHien()
        return S.hien
      },
    })
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true })
  else boot()
})()
