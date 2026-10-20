/* =============================================================================
 * kaixa Portfolio — Cụm "01." ở Home là một TẤM NGHIÊNG trượt lên PHỦ màn đầu
 * (kx-rise.js) — hai preset: phẳng / nghiêng
 * -----------------------------------------------------------------------------
 * Người dùng: "cụm này trồi lên chứ không phải là scroll cơ bản nữa, có setting
 * tắt bật về lại như cũ", rồi gửi ảnh phác: màn đầu ĐỨNG YÊN; cụm "01." (nhãn
 * About + đoạn "Kaixa (Dung Pham)…", số "01.", đường kẻ, THE-VISUAL-CHASER…)
 * nằm trên một tấm nền xám đậm trượt từ dưới lên, lúc đầu NGHIÊNG (mép trái
 * nhô cao, mép phải hạ thấp ~8°) rồi xoay về thẳng khi phủ kín màn đầu. Máy CD
 * (fixed, z 20) và thanh nav (fixed, z 50) vẫn nằm trên tấm.
 *
 * (Bản đầu cho từng khối trồi lệch nhịp — người dùng chê "không phải trồi
 * kiểu đó". Đã bỏ hẳn.)
 *
 * - TẤM là một LỚP BỌC `.kx-rise-khoi` phủ đúng khung .kx-page (left/top 0,
 *   rộng/cao 100%) — các khối của cụm được CHUYỂN vào đó: khung chứa cùng cỡ
 *   với trang nên toạ độ (kể cả %, 100svh) không đổi, bộ chọn `.kx-page .kN`
 *   vẫn khớp. Nền xám `.kx-rise-tam` là con đầu tiên của lớp bọc. Xoay LỚP
 *   BỌC là nền + chữ + ảnh xoay chung như một tấm.
 * - Góc = `goc` × (1 − e(p)), p = quãng cuộn / (chiều cao màn đầu × `xong`),
 *   e = p^`cong` (giữ nghiêng lâu, về thẳng dồn ở cuối). Tâm xoay ở mép TRÊN của tấm, ngang `tamX` phần bề
 *   rộng (0 = mép trái). Nền tấm rộng hơn trang (`rongThem`) để xoay rồi không
 *   hở góc; phần thừa bị .kx-page cắt.
 * - GHIM màn đầu: mọi khối cấp trên cùng có đỉnh trong màn đầu (trừ fixed)
 *   dịch `translate` xuống đúng quãng đã cuộn × `ghim`; cuộn quá màn đầu thì
 *   giấu hẳn.
 * - Lớp thanh của kx-line-reveal.js (`.kx-lr[data-kx-theo]`) cũng chuyển vào
 *   lớp bọc. Hiệu ứng nào ĐO vị trí chữ trong lớp bọc (line-reveal, type-hover)
 *   tạm gỡ góc xoay của tổ tiên mang `data-kx-bien` trong lúc đo.
 * - Đồng bộ cuộn: cập nhật NGAY trong `kx-cuon` của cuộn mượt; cuộn kiểu khác
 *   qua `scroll`. Không cấp phát trong lúc cuộn.
 * - `bat: false` = trả các khối về chỗ cũ trong DOM, gỡ tấm, gỡ ghim.
 * File KHÔNG chứa UI setting.
 * ========================================================================== */
(function () {
  'use strict'

  var CONFIG = {
    enabled: true,
    bat: true, // false = cuộn thường như cũ
    // PRESET (người dùng: "là thêm 1 preset mới á", rồi "2 preset, một là thấy
    // góc cạnh bên trái, 2 là thấy góc cạnh bên phải"):
    //   'canhTrai' — trồi lên nghiêng, bên TRÁI cao, thấy cạnh trái của tấm
    //   'canhPhai' — bản soi gương: bên PHẢI cao, thấy cạnh phải
    //   'phang'    — tấm phẳng trượt lên phủ màn đầu
    // ('nghieng' cũ = 'canhTrai'.) Hai bản nghiêng dùng chung goc / truotX /
    // xong / cong — bản phải chỉ lật dấu.
    kieu: 'canhPhai',
    // Các khối của cụm (nằm TRÊN tấm, xoay cùng tấm)
    nodes: '1:244,1:245,1:242,1:3315,1:195,1:203,76:4226,1:183,76:4219,1:269',
    mauNen: '#141414', // nền của tấm
    duoiThem: 140, // px thiết kế — tấm kéo dài quá đáy khối thấp nhất của cụm
    ghim: 1, // 1 = màn đầu đứng yên khi tấm trượt lên; 0 = trôi như thường
    goc: 9, // độ — tấm nghiêng bấy nhiêu lúc mới trồi (dương = mép phải thấp)
    xong: 1, // tấm về thẳng khi đã cuộn bấy nhiêu lần chiều cao màn đầu
    // Góc = goc × (1 − p^cong): cong lớn = GIỮ nghiêng lâu, về thẳng dồn ở cuối
    // (ảnh phác: tấm lên tới nửa màn vẫn nghiêng ~8°). 1 = xoay đều.
    cong: 3,
    // Lệch ngang lúc đầu (px thiết kế), về 0 cùng nhịp góc. DƯƠNG để MÉP TRÁI
    // của tấm hiện rõ trong màn (người dùng: "vẫn phải thấy cạnh của section
    // 2") — tấm là một tấm thẻ có cạnh, không phải mảng tràn ra ngoài.
    truotX: 160,
    tamX: 0.5, // tâm xoay theo bề ngang (0 = mép trái, 0.5 = giữa, 1 = mép phải)
    rongThem: 0.25, // nền tấm tràn thêm sang PHẢI bấy nhiêu lần bề rộng trang (xoay không hở góc); mép trái = mép trang
    zTam: 5,
  }

  var S = CONFIG
  var api = (window.KX_RISE = { config: S, defaults: Object.freeze(Object.assign({}, CONFIG)) })

  function boot() {
    if (!S.enabled) return
    var page = document.querySelector('.kx-page')
    if (!page) return

    var khoi = document.createElement('div')
    khoi.className = 'kx-rise-khoi'
    khoi.setAttribute('data-kx-bien', '')
    var tam = document.createElement('div')
    tam.className = 'kx-rise-tam'
    tam.setAttribute('aria-hidden', 'true')
    khoi.appendChild(tam)

    var cum = [] // { el, cha, sau } — chỗ cũ trong DOM để trả về khi tắt
    var hero = [] // { el, ty, an }
    var heroH = 0
    var trong = false // các khối đang nằm trong lớp bọc
    var k = 1 // px màn mỗi px thiết kế (đo thưa)
    var rongTrang = 1 // bề rộng trang, px (đo thưa)
    var gocCu = NaN
    var vungTu = 0 // vùng của tấm (px trang) — ô nav đổi nền theo (kx-site-nav.js)
    var vungDen = 0
    ;(window.KX_NAV_NEN = window.KX_NAV_NEN || []).push(function () {
      return S.bat && vungDen > vungTu ? [vungTu, vungDen, S.mauNen] : null
    })

    function lamKhoi() {
      traVe()
      cum.length = 0
      String(S.nodes).split(',').forEach(function (id) {
        var el = page.querySelector('[data-n="' + id.trim() + '"]')
        if (el) cum.push({ el: el, cha: null, sau: null, pe: '' })
      })
    }
    function chuyenVao() {
      if (!khoi.parentNode) page.appendChild(khoi)
      for (var i = 0; i < cum.length; i++) {
        var c = cum[i]
        if (c.el.parentNode !== khoi) {
          c.pe = getComputedStyle(c.el).pointerEvents // trước khi vào lớp bọc không ăn chuột
          c.cha = c.el.parentNode
          c.sau = c.el.nextSibling
          khoi.appendChild(c.el)
        }
        // Lớp thanh chữ hiện ra của khối này (nếu có) đi cùng.
        var lr = page.querySelector('.kx-lr[data-kx-theo="' + c.el.dataset.n + '"]')
        if (lr && lr.parentNode !== khoi) khoi.appendChild(lr)
      }
      trong = true
    }
    function traVe() {
      if (!trong) return
      for (var i = cum.length - 1; i >= 0; i--) {
        var c = cum[i]
        if (c.cha) c.cha.insertBefore(c.el, c.sau && c.sau.parentNode === c.cha ? c.sau : null)
        c.el.style.pointerEvents = ''
        var lr = khoi.querySelector('.kx-lr[data-kx-theo="' + c.el.dataset.n + '"]')
        if (lr) page.appendChild(lr)
      }
      trong = false
    }

    // Đo THƯA: khối màn đầu, khung tấm. Đo ở tư thế THẲNG, chưa ghim.
    function doThua() {
      for (var i = 0; i < hero.length; i++) {
        hero[i].el.style.translate = ''
        hero[i].el.style.visibility = ''
        hero[i].el.style.zIndex = ''
      }
      hero.length = 0
      if (!S.bat) {
        traVe()
        if (khoi.parentNode) khoi.parentNode.removeChild(khoi)
        return
      }
      chuyenVao()
      khoi.style.transform = 'none'
      gocCu = NaN
      var pr = page.getBoundingClientRect()
      k = pr.width / 1920 || 1
      heroH = innerHeight // màn đầu Home cao đúng 100svh
      ;(function quet(el) {
        for (var c = el.firstElementChild; c; c = c.nextElementSibling) {
          if (c === khoi) continue
          var cs = getComputedStyle(c)
          if (cs.display === 'contents') {
            quet(c)
            continue
          }
          if (!c.dataset.n || cs.position === 'fixed') continue
          var b = c.getBoundingClientRect()
          if (b.top - pr.top < heroH - 1 && b.height > 0) {
            // Khối màn đầu tạo lớp chồng riêng ở z 0: lớp con mang z-index cao
            // (canvas thấu kính, lớp ảnh mọc của Feature Works) bị nhốt DƯỚI tấm
            // — không thì ảnh Feature Works nhảy lên trên tấm.
            if (cs.position !== 'static' && cs.zIndex === 'auto') c.style.zIndex = '0'
            hero.push({ el: c, ty: NaN, an: false })
          }
        }
      })(page)
      var day = heroH
      for (var j = 0; j < cum.length; j++) {
        var d = cum[j].el.getBoundingClientRect().bottom - pr.top
        if (d > day) day = d
      }
      day += S.duoiThem * k
      vungTu = pr.top + scrollY + heroH
      vungDen = pr.top + scrollY + day
      var W = pr.width
      rongTrang = W
      var phai = S.kieu === 'canhPhai'
      khoi.style.cssText =
        'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:' + S.zTam + ';' +
        'transform-origin:' + (S.tamX * W).toFixed(1) + 'px ' + heroH + 'px'
      tam.style.cssText =
        // Nền tràn về phía KHÔNG cần thấy cạnh (xoay không hở góc); cạnh cần
        // thấy trùng đúng mép trang.
        'position:absolute;left:' + (phai ? -S.rongThem * 100 : 0) + '%;width:' + (100 + S.rongThem * 100) + '%;' +
        'top:' + heroH + 'px;height:' + Math.max(0, day - heroH) + 'px;background:' + S.mauNen
      // Lớp bọc không ăn chuột; khối bên trong giữ đúng giá trị vốn có.
      for (var q = 0; q < cum.length; q++) cum[q].el.style.pointerEvents = cum[q].pe || 'auto'
    }

    function capNhat() {
      var s = scrollY
      var bat = S.bat
      var ty = bat ? Math.min(Math.max(s, 0), heroH) * S.ghim : 0
      var an = bat && s >= heroH
      for (var i = 0; i < hero.length; i++) {
        var h = hero[i]
        if (!(Math.abs(ty - h.ty) <= 0.05)) {
          h.ty = ty
          h.el.style.translate = ty < 0.01 ? '' : '0 ' + ty.toFixed(2) + 'px'
        }
        if (an !== h.an) {
          h.an = an
          h.el.style.visibility = an ? 'hidden' : ''
        }
      }
      if (!bat) return
      var p = s / Math.max(1, heroH * Math.max(0.05, S.xong))
      p = p < 0 ? 0 : p > 1 ? 1 : p
      var huong = S.kieu === 'canhPhai' ? -1 : S.kieu === 'canhTrai' || S.kieu === 'nghieng' ? 1 : 0
      var con = huong ? 1 - Math.pow(p, Math.max(0.2, S.cong)) : 0 // 1 lúc đầu → 0 lúc xong
      var g = S.goc * con * huong
      if (Math.abs(g - gocCu) > 0.005 || isNaN(gocCu)) {
        gocCu = g
        var tx = S.truotX * k * con * huong
        // Màn đầu KHÔNG được thấy tấm (người dùng: "ở viewport đầu thì không
        // thấy cạnh của section 2, scroll thì mới xuất hiện"): xoay làm một đầu
        // mép trên nhô cao hơn đáy màn đầu đúng (khoảng tâm xoay → góc cạnh) ×
        // sin|góc| — đẩy tấm xuống bấy nhiêu. Phần đẩy giảm cùng góc nên cuộn
        // tới đâu góc tấm lộ ra tới đó.
        var canh = huong > 0 ? S.tamX : 1 - S.tamX
        var dy = canh * rongTrang * Math.abs(Math.sin((g * Math.PI) / 180)) + 2 * con
        khoi.style.transform = con < 0.0005 ? 'none' : 'translate(' + tx.toFixed(2) + 'px,' + dy.toFixed(2) + 'px) rotate(' + g.toFixed(3) + 'deg)'
        khoi.style.willChange = p < 1 ? 'transform' : ''
      }
    }

    var raf = 0
    function hen() {
      if (raf) return
      raf = requestAnimationFrame(function () {
        raf = 0
        capNhat()
      })
    }
    function lamLai() {
      doThua()
      capNhat()
    }

    lamKhoi()
    lamLai()
    addEventListener('kx-cuon', capNhat) // cuộn mượt: đồng bộ ngay sau scrollTo
    addEventListener('scroll', hen, { passive: true })
    addEventListener('resize', lamLai)
    addEventListener('load', lamLai)
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(lamLai)
    // Lớp thanh của kx-line-reveal.js dựng sau — bắt lấy để chuyển vào lớp bọc.
    addEventListener('kx-lr-dung', function () {
      if (trong) chuyenVao()
    })

    api.apDung = function () {
      lamKhoi()
      lamLai()
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true })
  else boot()
})()
