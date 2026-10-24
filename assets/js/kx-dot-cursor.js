/* =============================================================================
 * kaixa Portfolio — Con trỏ LƯỚI CHẤM: vệt sáng theo chuột trên một lưới ô
 * -----------------------------------------------------------------------------
 * Người dùng: "thử hiệu ứng cursor giống trang này nhưng tông gray scale,
 * custom được dạng shape và nhiều setting khác" (một trang tham khảo: cả cửa sổ
 * là một lưới ô vô hình; quanh con trỏ các ô bừng lên thành chấm rồi vòng tròn,
 * để lại vệt mờ dần phía sau).
 *
 * - Lưới ô đều, bước `buoc` px THIẾT KẾ (× bề rộng cửa sổ / 1920). Mỗi ô giữ
 *   một NĂNG LƯỢNG 0..1: chuột đi qua thì bơm vào các ô trong `banKinh` (giảm
 *   dần ra rìa, đi nhanh thì bơm theo cả đoạn đường để vệt không đứt quãng),
 *   mỗi khung năng lượng tắt dần theo `tat`.
 * - Năng lượng → HÌNH qua ba mức: dưới `muc2` vẽ `hinh1`, tới `muc3` vẽ
 *   `hinh2`, trên nữa vẽ `hinh3`. Hình: cham (chấm đặc), vong (vòng tròn rỗng),
 *   vuong (ô đặc), khung (ô rỗng), thoi (hình thoi), cong (dấu +), nhan (dấu ×),
 *   gach (gạch ngang). Cỡ to dần theo năng lượng (`coMin` → `coMax`).
 * - Tông XÁM: màu nội suy `mauToi` → `mauSang` theo năng lượng, mỗi ô lệch
 *   sáng tối ngẫu nhiên một chút (`bienMau`) và có ngưỡng riêng (`loang`) — vệt
 *   loang lổ như bản tham khảo chứ không phải một hình tròn trơn.
 * - Bấm chuột: một đợt sóng vòng lan ra (`song*`).
 * - Một canvas 2D cố định phủ cửa sổ, `pointer-events: none`, đặt TRÊN nội
 *   dung (body có nền riêng nên tầng âm bị che) và trộn `screen`: chấm xám chỉ
 *   làm sáng nền tối. Máy CD (z 20), dải "02." (21/22) vẫn nằm trên chấm.
 * - Không cấp phát trong vòng (luật cấm số 2): năng lượng, ngẫu nhiên, thùng
 *   vẽ đều là mảng cấp sẵn, chỉ cấp lại khi đổi cỡ cửa sổ / đổi bước lưới.
 *   Vẽ GOM THEO THÙNG (hình × nấc màu) — mỗi thùng một lần fill/stroke.
 *   Không còn ô nào sáng và chuột đứng yên thì vòng rAF dừng hẳn.
 * - Màn cảm ứng, giảm chuyển động: không chạy. Con trỏ hệ thống giữ nguyên.
 * File KHÔNG chứa UI setting.
 * ========================================================================== */
(function () {
  'use strict'

  var CONFIG = {
    enabled: true,
    bat: true, // công tắc lúc đang chạy (khác `enabled` = bỏ hẳn file)
    // ------------------------------------------------------------- lưới
    buoc: 12, // px thiết kế giữa hai tâm ô
    banKinh: 100, // px thiết kế — bán kính bơm năng lượng quanh con trỏ
    luc: 1.11, // năng lượng bơm mỗi lần (ô ngay dưới con trỏ)
    theoTocDo: 1, // 0..1 — phần năng lượng phụ thuộc tốc độ chuột (0 = đứng yên cũng sáng)
    tat: 0.93, // 0..1 — phần năng lượng giữ lại mỗi khung 60fps (lớn = vệt dài)
    loang: 0.8, // 0..1 — độ loang lổ: mỗi ô một ngưỡng ngẫu nhiên
    // ------------------------------------------------------------- hình
    hinh1: 'gach',
    hinh2: 'gach',
    hinh3: 'gach',
    muc2: 0.24, // năng lượng từ đây trở lên vẽ hinh2
    muc3: 0.62, // từ đây trở lên vẽ hinh3
    coMin: 0.8, // px thiết kế — cỡ (bán kính) ở năng lượng thấp
    coMax: 4, // px thiết kế — cỡ ở năng lượng cao
    net: 0.7, // px thiết kế — nét của hình rỗng (vong, khung, cong, nhan, gach)
    // ------------------------------------------------------------- màu
    mauToi: '#141414',
    mauSang: '#ffffff',
    bienMau: 0.4, // 0..1 — mỗi ô lệch sáng/tối ngẫu nhiên
    nacMau: 8, // số nấc màu (nhiều = mượt hơn, nhiều lần vẽ hơn)
    doDuc: 1, // độ đục chung
    // ------------------------------------------------------------- nền
    nen: 0, // 0..1 — độ hiện của lưới chấm NGHỈ phủ cả màn (0 = không có)
    // ------------------------------------------------------------- bấm
    song: true, // bấm chuột thì một vòng sóng lan ra
    songTocDo: 900, // px thiết kế mỗi giây
    songDay: 40, // px thiết kế — độ dày vòng sóng
    songTam: 870, // px thiết kế — sóng tắt ở bán kính này
    songLuc: 0.7,
    // ------------------------------------------------------------- tầng
    zIndex: 1,
    blend: 'screen', // screen | normal | difference | lighten
    maxDpr: 2,
  }

  var S = CONFIG
  var api = (window.KX_DOT_CURSOR = { config: S, defaults: Object.freeze(Object.assign({}, CONFIG)) })

  var HINH = ['cham', 'vong', 'vuong', 'khung', 'thoi', 'cong', 'nhan', 'gach']
  var RONG = { vong: 1, khung: 1, cong: 1, nhan: 1, gach: 1 } // vẽ bằng nét

  function boot() {
    if (!S.enabled) return
    if (window.matchMedia && (!matchMedia('(hover: hover)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches)) return

    var cv = document.createElement('canvas')
    cv.className = 'kx-dc'
    cv.setAttribute('aria-hidden', 'true')
    var ctx = cv.getContext('2d')
    document.body.appendChild(cv)
    /* Nghỉ (hết chấm, chuột đứng yên) thì GIẤU canvas: lớp phủ kín màn mang
     * mix-blend-mode vẫn bắt trình duyệt hoà trộn lại cả màn mỗi khung khi thứ
     * bên dưới đổi (cuộn, cảnh 3D) — kể cả khi nó trong suốt hoàn toàn. Đo trên
     * Chrome màn Retina: cùng lớp ruy-băng, chiếm phần lớn số khung chậm lúc
     * cuộn qua section CD (người dùng: "xem bằng chrome là lag"). */
    var nghi = true
    function datLop() {
      cv.style.cssText =
        'position:fixed;left:0;top:0;width:100vw;height:100vh;pointer-events:none;' +
        'z-index:' + S.zIndex + ';mix-blend-mode:' + S.blend + ';display:' + (S.bat ? 'block' : 'none') +
        ';visibility:' + (nghi ? 'hidden' : 'visible')
    }
    datLop()

    // ------------------------------------------------------------ lưới
    var W = 0
    var H = 0
    var dpr = 1
    var k = 1 // px màn mỗi px thiết kế
    var b = 18 // bước lưới px màn
    var cot = 0
    var hang = 0
    var n = 0
    var nl = null // Float32Array năng lượng
    var ng = null // Float32Array ngưỡng / hệ số loang của từng ô (0..1)
    var sm = null // Float32Array lệch màu của từng ô (-1..1)
    var thung = [] // mỗi thùng: Int32Array chỉ số ô
    var dem = null // Int32Array số ô trong mỗi thùng
    var soThung = 0
    var mau = [] // chuỗi màu của từng nấc
    var hinhMuc = ['cham', 'cham', 'vong'] // hình của ba mức — cập nhật lúc dựng, không tạo mỗi khung

    function hex(h) {
      var v = parseInt(String(h).replace('#', ''), 16)
      return isNaN(v) ? [128, 128, 128] : [(v >> 16) & 255, (v >> 8) & 255, v & 255]
    }
    function dungMau() {
      var a = hex(S.mauToi)
      var c = hex(S.mauSang)
      var L = Math.max(2, Math.round(S.nacMau))
      mau = []
      for (var i = 0; i < L; i++) {
        var t = i / (L - 1)
        mau.push('rgb(' + Math.round(a[0] + (c[0] - a[0]) * t) + ',' + Math.round(a[1] + (c[1] - a[1]) * t) + ',' + Math.round(a[2] + (c[2] - a[2]) * t) + ')')
      }
    }
    function dung() {
      W = innerWidth
      H = innerHeight
      dpr = Math.min(window.devicePixelRatio || 1, S.maxDpr)
      cv.width = Math.round(W * dpr)
      cv.height = Math.round(H * dpr)
      k = W / 1920
      b = Math.max(4, S.buoc * k)
      var c = Math.ceil(W / b) + 1
      var h = Math.ceil(H / b) + 1
      if (c !== cot || h !== hang) {
        cot = c
        hang = h
        n = cot * hang
        nl = new Float32Array(n)
        ng = new Float32Array(n)
        sm = new Float32Array(n)
        for (var i = 0; i < n; i++) {
          ng[i] = Math.random()
          sm[i] = Math.random() * 2 - 1
        }
      }
      dungMau()
      hinhMuc[0] = HINH.indexOf(S.hinh1) >= 0 ? S.hinh1 : 'cham'
      hinhMuc[1] = HINH.indexOf(S.hinh2) >= 0 ? S.hinh2 : 'cham'
      hinhMuc[2] = HINH.indexOf(S.hinh3) >= 0 ? S.hinh3 : 'vong'
      soThung = 3 * mau.length
      if (thung.length !== soThung || (thung[0] && thung[0].length !== n)) {
        thung = []
        for (var t = 0; t < soThung; t++) thung.push(new Int32Array(n))
        dem = new Int32Array(soThung)
      }
    }
    dung()

    // ------------------------------------------------------------ chuột
    var mx = -1e4
    var my = -1e4
    var px = -1e4
    var py = -1e4
    var coChuot = false
    var dangDi = false
    var raf = 0
    var last = 0
    // Sóng bấm: tối đa 6 vòng cùng lúc, mảng cấp sẵn.
    var SX = new Float32Array(6)
    var SY = new Float32Array(6)
    var ST = new Float32Array(6) // thời điểm bắt đầu (s), < 0 = trống
    for (var s0 = 0; s0 < 6; s0++) ST[s0] = -1
    var sTiep = 0

    function bom(x, y, a) {
      // Bơm năng lượng a quanh (x, y) px màn — chỉ duyệt các ô trong hình vuông bao.
      var r = S.banKinh * k
      if (r < 1) return
      var c0 = Math.max(0, Math.floor((x - r) / b))
      var c1 = Math.min(cot - 1, Math.ceil((x + r) / b))
      var h0 = Math.max(0, Math.floor((y - r) / b))
      var h1 = Math.min(hang - 1, Math.ceil((y + r) / b))
      var r2 = r * r
      for (var j = h0; j <= h1; j++) {
        var dy = j * b - y
        for (var i = c0; i <= c1; i++) {
          var dx = i * b - x
          var d2 = dx * dx + dy * dy
          if (d2 >= r2) continue
          var f = 1 - Math.sqrt(d2) / r
          f = f * f * (3 - 2 * f)
          var id = j * cot + i
          var v = nl[id] + a * f
          nl[id] = v > 1 ? 1 : v
        }
      }
    }

    function khung(now) {
      raf = 0
      var dt = Math.min((now - last) / 1000, 1 / 20) || 1 / 60
      last = now
      var f = dt * 60
      var t = now / 1000

      // Bơm theo đoạn đường chuột vừa đi — đi nhanh vệt không đứt quãng.
      if (coChuot && S.bat) {
        var dx = mx - px
        var dy = my - py
        var dd = Math.sqrt(dx * dx + dy * dy)
        var toc = Math.min(1, dd / (40 * k * f + 1e-3))
        var a = S.luc * (1 - S.theoTocDo + S.theoTocDo * toc)
        if (px < -1e3) dd = 0
        var buocBom = Math.max(1, Math.ceil(dd / (b * 1.5)))
        if (a > 0.002) {
          for (var s = 1; s <= buocBom; s++) bom(px + (dx * s) / buocBom, py + (dy * s) / buocBom, a / Math.sqrt(buocBom))
        }
        px = mx
        py = my
      }
      // Sóng bấm
      var coSong = false
      if (S.song) {
        for (var w = 0; w < 6; w++) {
          if (ST[w] < 0) continue
          var R = (t - ST[w]) * S.songTocDo * k
          var Rmax = S.songTam * k
          if (R > Rmax) {
            ST[w] = -1
            continue
          }
          coSong = true
          var day = S.songDay * k
          var luc = S.songLuc * (1 - R / Rmax)
          var cx = SX[w]
          var cy = SY[w]
          var rr = R + day
          var c0 = Math.max(0, Math.floor((cx - rr) / b))
          var c1 = Math.min(cot - 1, Math.ceil((cx + rr) / b))
          var h0 = Math.max(0, Math.floor((cy - rr) / b))
          var h1 = Math.min(hang - 1, Math.ceil((cy + rr) / b))
          for (var j = h0; j <= h1; j++) {
            for (var i = c0; i <= c1; i++) {
              var ex = i * b - cx
              var ey = j * b - cy
              var lech = Math.abs(Math.sqrt(ex * ex + ey * ey) - R)
              if (lech >= day) continue
              var id = j * cot + i
              var v = nl[id] + luc * (1 - lech / day) * 0.5
              nl[id] = v > 1 ? 1 : v
            }
          }
        }
      }

      // Tắt dần + chia thùng.
      var giu = Math.pow(S.tat, f)
      var L = mau.length
      var m2 = S.muc2
      var m3 = S.muc3
      var lg = S.loang
      var bm = S.bienMau
      var nen = S.nen
      var con = false
      for (var q = 0; q < soThung; q++) dem[q] = 0
      for (var id2 = 0; id2 < n; id2++) {
        var e = nl[id2]
        if (e > 0) {
          e *= giu
          if (e < 0.004) e = 0
          else con = true
          nl[id2] = e
        }
        // Năng lượng hiệu dụng: mỗi ô một ngưỡng riêng → vệt loang lổ.
        var ev = e > 0 ? e * (1 - lg + lg * ng[id2] * 1.6) : 0
        if (ev > 1) ev = 1
        if (ev < 0.03) {
          if (nen <= 0) continue
          ev = nen * 0.3 // lưới nghỉ: chấm nhỏ, tối
        }
        var muc = ev >= m3 ? 2 : ev >= m2 ? 1 : 0
        var sang = ev + sm[id2] * bm * 0.5
        var nac = Math.round((sang < 0 ? 0 : sang > 1 ? 1 : sang) * (L - 1))
        var th = muc * L + nac
        thung[th][dem[th]++] = id2
      }

      // Vẽ: gom theo thùng.
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, W, H)
      ctx.globalAlpha = S.doDuc
      ctx.lineWidth = Math.max(0.5, S.net * k)
      for (var m = 0; m < 3; m++) {
        var hn = hinhMuc[m]
        var rong = RONG[hn] === 1
        for (var nc = 0; nc < L; nc++) {
          var tt = m * L + nc
          var sl = dem[tt]
          if (!sl) continue
          var arr = thung[tt]
          ctx.beginPath()
          for (var z = 0; z < sl; z++) {
            var o = arr[z]
            var gx = (o % cot) * b
            var gy = ((o / cot) | 0) * b
            var ee = nl[o]
            if (ee <= 0) ee = 0
            var r = (S.coMin + (S.coMax - S.coMin) * (ee > 1 ? 1 : ee)) * k
            ve(hn, gx, gy, r)
          }
          if (rong) {
            ctx.strokeStyle = mau[nc]
            ctx.stroke()
          } else {
            ctx.fillStyle = mau[nc]
            ctx.fill()
          }
        }
      }
      ctx.globalAlpha = 1

      if (!con && !coSong && !dangDi && nen <= 0) {
        nghi = true // nghỉ hẳn — giấu lớp hoà trộn
        cv.style.visibility = 'hidden'
        return
      }
      dangDi = false
      raf = requestAnimationFrame(khung)
    }

    function ve(hn, x, y, r) {
      if (hn === 'cham' || hn === 'vong') {
        ctx.moveTo(x + r, y)
        ctx.arc(x, y, r, 0, 6.2832)
      } else if (hn === 'vuong' || hn === 'khung') {
        ctx.rect(x - r, y - r, r * 2, r * 2)
      } else if (hn === 'thoi') {
        ctx.moveTo(x, y - r)
        ctx.lineTo(x + r, y)
        ctx.lineTo(x, y + r)
        ctx.lineTo(x - r, y)
        ctx.closePath()
      } else if (hn === 'cong') {
        ctx.moveTo(x - r, y)
        ctx.lineTo(x + r, y)
        ctx.moveTo(x, y - r)
        ctx.lineTo(x, y + r)
      } else if (hn === 'nhan') {
        var d = r * 0.7071
        ctx.moveTo(x - d, y - d)
        ctx.lineTo(x + d, y + d)
        ctx.moveTo(x + d, y - d)
        ctx.lineTo(x - d, y + d)
      } else if (hn === 'gach') {
        ctx.moveTo(x - r, y)
        ctx.lineTo(x + r, y)
      }
    }

    function chay() {
      if (nghi) {
        nghi = false
        cv.style.visibility = 'visible'
      }
      if (raf) return
      last = performance.now()
      raf = requestAnimationFrame(khung)
    }

    addEventListener(
      'pointermove',
      function (e) {
        if (e.pointerType === 'touch') return
        mx = e.clientX
        my = e.clientY
        if (!coChuot) {
          px = mx
          py = my
        }
        coChuot = true
        dangDi = true
        if (S.bat) chay()
      },
      { passive: true }
    )
    document.addEventListener('pointerleave', function () {
      coChuot = false
      px = py = -1e4
    })
    addEventListener(
      'pointerdown',
      function (e) {
        if (!S.bat || !S.song || e.pointerType === 'touch') return
        SX[sTiep] = e.clientX
        SY[sTiep] = e.clientY
        ST[sTiep] = performance.now() / 1000
        sTiep = (sTiep + 1) % 6
        chay()
      },
      { passive: true }
    )
    var hoan = 0
    addEventListener('resize', function () {
      clearTimeout(hoan)
      hoan = setTimeout(function () {
        dung()
        chay()
      }, 120)
    })

    // Đổi số trong bảng: dựng lại lưới / màu / tầng.
    api.apDung = function () {
      datLop()
      dung()
      if (S.bat) chay()
    }
    api.rungThu = function () {
      // Một vòng sóng giữa màn để xem khỏi phải bấm.
      SX[sTiep] = W / 2
      SY[sTiep] = H / 2
      ST[sTiep] = performance.now() / 1000
      sTiep = (sTiep + 1) % 6
      chay()
    }
    if (S.nen > 0) chay()
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true })
  else boot()
})()
