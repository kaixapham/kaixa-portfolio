/* =============================================================================
 * kaixa Portfolio — Section VỎ ĐĨA / PACK CD theo cuộn (kx-cd-pack.js, Home)
 * -----------------------------------------------------------------------------
 * Người dùng: "chèn thử section mới này vào giữa 2 section này" — Figma
 * 359:12278 "Animation Flow" (9 khung storyboard), chèn giữa cụm "01." và chữ
 * lớn KAIXA.DP. Generator chừa chỗ bằng một KHÚC CHÈN (`chen: 'cd-pack'`, cao
 * 460svh + 5760 px thiết kế) và đặt khung `.kx-chen[data-chen="cd-pack"]`.
 *
 * Một SÂN KHẤU dính đỉnh màn (sticky, cao 100svh) suốt khúc chèn; cuộn tới đâu
 * chuỗi chạy tới đó (bám vị trí cuộn, cuộn ngược thì chạy ngược):
 *
 *   1 LƯỚT   vỏ đĩa kín bề ngang (1920 × 1920 thiết kế) trôi lên đúng nhịp cuộn
 *            tới khi đáy vỏ chạm đáy màn          (khung 01: "scroll hết ảnh to")
 *   2 THU    vỏ thu về ô 548 giữa màn              (khung 02: "ảnh dần bé lại")
 *   3 TRỒI   pack (mặt trong) trồi lên khỏi vỏ     (khung 03)
 *   4 TÁCH   pack lên tiếp, vỏ chìm xuống và mờ đi (khung 04)
 *   5 NGHỈ   pack về giữa màn                      (khung 05)
 *   6 MỞ     pack mở như gập sách: mặt có đĩa lật ra quanh bản lề (khung 06)
 *   7 XOAY   cặp mặt xoay 90° và phóng tới kín bề ngang (khung 07–08)
 *   8 HẾT    hai mặt chồng dọc (mỗi mặt 1920) trôi lên đúng nhịp cuộn (khung 09)
 *
 * - Pha 1 và 8 dài đúng phần ảnh vượt màn (1920 − cao màn, 3840 − cao màn —
 *   theo px thiết kế), trôi 1:1 với cuộn như cuộn thường. Phần còn lại của khúc
 *   (460svh − 100svh − … = 5.6 màn) chia cho pha 2–7 theo trọng số `w*`.
 * - Dựng ở cỡ LỚN NHẤT (vỏ 1920, mỗi mặt 1920 px thiết kế) rồi thu nhỏ bằng
 *   transform — chữ Druk/Phudu và ảnh luôn nét.
 * - Chú thích trong storyboard ("Vỏ đĩa", "Mặt bên trong", "Mặt có đĩa") là ghi
 *   chú thiết kế, không vẽ lên trang.
 * - Đĩa: đĩa "The Visual Chaser" của chính Kaixa (mặt đĩa trang contact) —
 *   đĩa trong storyboard là ảnh sản phẩm bên ngoài (đĩa xem ảnh ghi "To. X"),
 *   không đưa lên site (lệ của project: không dùng ảnh của người khác).
 * - Mỗi lần cuộn chỉ tính số + ghi transform; đỉnh khúc đo THƯA (đổi cỡ, load,
 *   font). Cập nhật ngay trong `kx-cuon` của cuộn mượt.
 * File KHÔNG chứa UI setting.
 * ========================================================================== */
(function () {
  'use strict'

  var CONFIG = {
    enabled: true,
    nen: '#101010', // nền sân khấu (khung storyboard)
    mauVo: '#d5d5d5', // vỏ đĩa
    mauTrong: '#939393', // mặt bên trong của pack
    mauDia: '#525252', // mặt có đĩa
    anhAlbum: 'assets/home/rectangle2851.webp',
    anhDia: 'assets/img/disc-right.webp',
    // Trọng số độ dài các pha 2–7 (chia phần cuộn còn lại theo tỉ lệ này)
    wThu: 1,
    wTroi: 0.8,
    wTach: 1,
    wNghi: 0.6,
    wMo: 1,
    wXoay: 1.2,
    troiLen: 251, // px thiết kế — pack nhô khỏi vỏ ở pha 3 (khung 03: 251)
    voLo: 0.62, // 3D: phần hộp lộ khỏi miệng ống vỏ ở cuối pha trồi (× cao hộp)
    voKhe: 0.06, // 3D: khe giữa hộp và lòng ống vỏ (đơn vị hộp, 1 = 10 mm)
    voDay: 0.05, // 3D: bề dày giấy ống vỏ (đơn vị hộp)
    // Ánh sáng trên vỏ (người dùng: "cảm giác cái vỏ chưa có ánh sáng tác động
    // vào"): giấy nhám tuyệt đối + đèn song song = mặt phẳng sáng đều như ảnh
    // dán. Đèn spot mềm chếch trên-trái cho vùng sáng loang, giấy hơi bóng bắt
    // vệt sáng môi trường, vân giấy mịn.
    voDen: 6, // cường độ đèn spot (0 = tắt)
    voMoiTruong: 0.2, // ánh sáng môi trường trên giấy vỏ — thấp để vùng sáng loang của spot đọc ra
    voPhanXa: 0.78, // độ sáng nền của giấy (× màu) — đèn chính song song rọi ĐỀU, hạ nền thì spot mới tạo được chênh
    voNham: 0.48, // độ nhám giấy vỏ (thấp = bóng hơn)
    voVan: 0.5, // độ nổi vân giấy (0 = phẳng)
    // px thiết kế — khoảng cách camera khi mặt có đĩa lật ra. MỘT phối cảnh
    // chung đặt trên cả pack, tâm nhìn ở bản lề (người dùng: "mở phải đúng không
    // gian 3D chứ"); ngắn hơn bề rộng mặt (1920) là mặt phình méo tràn khung.
    phoiCanh: 5000,
    xoayDia: 0.04, // độ quay của đĩa mỗi px cuộn (0 = đứng yên)
    // ---- HỘP CD 3D THẬT (người dùng: "nó có đồng bộ cd case sang website
    // đâu"): '3d' = dựng hộp từ editor tools/cd-case (assets/js/cd3d/hop-cd.js
    // + cấu hình đã lưu `cauHinh`); 'phang' = các khối phẳng demo. Khối phẳng
    // cũng là phương án dự phòng khi không có WebGL.
    kieuSan: '3d',
    cauHinh: 'assets/cd3d/hop-cd.json',
    fov: 20, // độ — camera hẹp cho phối cảnh nhẹ (nắp lật về phía người xem)
    // Section luôn NỀN TỐI của site (người dùng: "background vẫn là background
    // tối") — chỉ lấy vật liệu / ảnh từ editor, không lấy màu nền, studio tối.
    studio3D: 'toi',
    gocMoSan: 180, // độ — hộp mở PHẲNG hẳn (người dùng: "mở ra hết cỡ để phẳng")
    maxDpr: 1.5,
  }

  var S = CONFIG
  var api = (window.KX_CD_PACK = { config: S, defaults: Object.freeze(Object.assign({}, CONFIG)) })

  var CSS = [
    '.kx-cp-san{position:sticky;top:0;left:0;width:100%;height:100svh;overflow:hidden}',
    '.kx-cp-san *{box-sizing:border-box}',
    '.kx-cp-vo,.kx-cp-mo{position:absolute;left:0;top:0;transform-origin:50% 50%;will-change:transform}',
    '.kx-cp-vo{width:calc(1920 * var(--px));height:calc(1920 * var(--px));z-index:2}',
    '.kx-cp-the{position:absolute;left:calc(438.15 * var(--px));top:calc(226.24 * var(--px));width:calc(1044.087 * var(--px));height:calc(1468.029 * var(--px))}',
    '.kx-cp-the img{position:absolute;left:0;top:0;width:100%;height:calc(1047.591 * var(--px));object-fit:cover;display:block}',
    '.kx-cp-thanh{position:absolute;left:0;top:calc(1047.59 * var(--px));width:100%;height:calc(420.438 * var(--px));background:#313131}',
    '.kx-cp-chu{position:absolute;margin:0;font-family:"Druk XCond",sans-serif;font-weight:900;font-size:calc(167.784 * var(--px));line-height:calc(223.712 * var(--px));color:#dedad9;text-transform:uppercase;white-space:nowrap;text-box-trim:trim-both;text-box-edge:cap alphabetic}',
    '.kx-cp-ngoac{position:absolute;left:calc(553.58 * var(--px));top:calc(1271.83 * var(--px));width:calc(238.248 * var(--px));height:calc(196.204 * var(--px));overflow:hidden;font-family:"Phudu",sans-serif;font-weight:300;font-size:calc(167.784 * var(--px));line-height:calc(223.712 * var(--px));color:#b0aeab;text-transform:uppercase;white-space:nowrap}',
    '.kx-cp-ngoac span{position:absolute;top:0}',
    '.kx-cp-cham{position:absolute;top:calc(1432.99 * var(--px));width:calc(21.022 * var(--px));height:calc(21.022 * var(--px));border-radius:50%;background:#b0aeab;opacity:.18}',
    '.kx-cp-mo{width:calc(3840 * var(--px));height:calc(1920 * var(--px));z-index:1;transform-style:preserve-3d}',
    '.kx-cp-mat{position:absolute;top:0;width:calc(1920 * var(--px));height:calc(1920 * var(--px))}',
    // Tấm lật: hai mặt — TRƯỚC (có đĩa) và SAU (màu mặt trong, lúc đóng úp lên mặt trong).
    '.kx-cp-mat--dia{left:calc(1920 * var(--px));transform-origin:0 50%;transform-style:preserve-3d}',
    '.kx-cp-mat--dia>.kx-cp-mat{left:0;backface-visibility:hidden;-webkit-backface-visibility:hidden}',
    '.kx-cp-mat--dia>.kx-cp-sau{transform:rotateY(180deg)}',
    '.kx-cp-dia{position:absolute;left:calc(199.7 * var(--px));top:calc(196.2 * var(--px));width:calc(1527.6 * var(--px));height:calc(1527.6 * var(--px));will-change:transform}',
    '.kx-cp-dia img{width:100%;height:100%;display:block}',
    '.kx-cp-lo{position:absolute;left:calc(819.85 * var(--px));top:calc(819.85 * var(--px));width:calc(280.3 * var(--px));height:calc(280.3 * var(--px));border-radius:50%;background:#101010}',
  ].join('\n')

  function boot() {
    if (!S.enabled) return
    var page = document.querySelector('.kx-page')
    var khuc = page && page.querySelector('.kx-chen[data-chen="cd-pack"]')
    if (!khuc) return

    var st = document.createElement('style')
    st.textContent = CSS
    document.head.appendChild(st)

    function el(tag, cls, cha) {
      var e = document.createElement(tag)
      if (cls) e.className = cls
      if (cha) cha.appendChild(e)
      return e
    }
    function chu(cha, text, left, top) {
      var p = el('p', 'kx-cp-chu', cha)
      p.textContent = text
      p.style.left = 'calc(' + left + ' * var(--px))'
      p.style.top = 'calc(' + top + ' * var(--px))'
      return p
    }

    var san = el('div', 'kx-cp-san', khuc)
    san.style.background = S.nen

    // ---- Vỏ đĩa (khung 01): ô vuông + thẻ poster album
    var vo = el('div', 'kx-cp-vo', san)
    vo.style.background = S.mauVo
    var the = el('div', 'kx-cp-the', vo)
    var img = el('img', null, the)
    img.alt = 'The Album — Viet.Dung, by Visual Chaser'
    img.decoding = 'async'
    img.src = S.anhAlbum
    el('div', 'kx-cp-thanh', the)
    chu(the, 'THE ALBUM', 17.52, 1065.11)
    chu(the, 'VIET.DUNG', 742.78, 1065.11)
    chu(the, 'BY VISUAL CHASER', 17.52, 1194.07)
    chu(the, '2026', 17.52, 1326.53)
    var ngoac = el('div', 'kx-cp-ngoac', the)
    var n1 = el('span', null, ngoac)
    n1.textContent = ')'
    n1.style.left = 'calc(192.7 * var(--px))'
    var n2 = el('span', null, ngoac)
    n2.textContent = '('
    n2.style.left = '0'
    var c1 = el('div', 'kx-cp-cham', the)
    c1.style.left = 'calc(1009.05 * var(--px))'
    var c2 = el('div', 'kx-cp-cham', the)
    c2.style.left = 'calc(511.54 * var(--px))'
    chu(vo, '1995', 1040.77, 1554.12)

    // ---- Pack: mặt trong (trái) + mặt có đĩa (phải, bản lề ở mép trái)
    var mo = el('div', 'kx-cp-mo', san)
    var matTrong = el('div', 'kx-cp-mat', mo)
    matTrong.style.background = S.mauTrong
    matTrong.style.left = '0'
    var matDia = el('div', 'kx-cp-mat kx-cp-mat--dia', mo)
    var truoc = el('div', 'kx-cp-mat', matDia) // mặt có đĩa
    truoc.style.background = S.mauDia
    var sau = el('div', 'kx-cp-mat kx-cp-sau', matDia) // lưng tấm lật
    sau.style.background = S.mauTrong
    var dia = el('div', 'kx-cp-dia', truoc)
    var imgDia = el('img', null, dia)
    imgDia.alt = ''
    imgDia.decoding = 'async'
    imgDia.src = S.anhDia
    el('div', 'kx-cp-lo', truoc)

    // ---------------------------------------------------------- đo thưa
    var top0 = 0 // đỉnh khúc, px trang
    var H = 1 // chiều cao khúc, px
    var W = 1 // bề rộng trang, px
    var V = 1 // chiều cao màn (sân khấu), px
    var k = 1 // px màn mỗi px thiết kế
    function doThua() {
      var b = khuc.getBoundingClientRect()
      top0 = b.top + scrollY
      H = b.height
      W = page.getBoundingClientRect().width
      V = san.offsetHeight || innerHeight
      k = W / 1920
    }

    function muot(t) {
      return t * t * (3 - 2 * t)
    }
    function lerp(a, b, t) {
      return a + (b - a) * t
    }

    // ------------------------------------------------------------- vẽ
    var voCu = ''
    var moCu = ''
    var matCu = ''
    var diaCu = ''
    function ve() {
      if (ba) return ve3D()
      var s = scrollY - top0
      var chay = H - V // quãng sân khấu dính
      if (s < 0) s = 0
      if (s > chay) s = chay
      var B = 1920 * k // cạnh vỏ / mỗi mặt ở cỡ dựng
      var A = 548 * k // cạnh ô vuông ở giữa (khung 02–06)
      var d1 = Math.max(0, B - V)
      var d8 = Math.max(0, 2 * B - V)
      var w = [S.wThu, S.wTroi, S.wTach, S.wNghi, S.wMo, S.wXoay]
      var tong = 0
      for (var i = 0; i < 6; i++) tong += Math.max(0, w[i])
      var R = Math.max(1, chay - d1 - d8)

      // Mặc định: trạng thái cuối mỗi đại lượng, ghi đè theo pha.
      var voS = A / B // tỉ lệ vỏ
      var voX = W / 2
      var voY = V / 2
      var voOp = 1
      var troi = 0 // 0..1 pha 3
      var tach = 0 // 0..1 pha 4
      var ve5 = 0 // 0..1 pha 5
      var moRa = 0 // 0..1 pha 6
      var xoay = 0 // 0..1 pha 7
      var het = 0 // 0..1 pha 8 (px đã trôi)
      var hienPack = false

      var con = s
      if (con <= d1 && d1 > 0) {
        // 1 LƯỚT: vỏ kín bề ngang, đỉnh từ 0 lên V − B
        voS = 1
        voY = B / 2 - con
      } else {
        con -= d1
        var pha = 0
        var t = 0
        for (pha = 0; pha < 6; pha++) {
          var dai = (R * Math.max(0, w[pha])) / (tong || 1)
          if (con <= dai || pha === 5) {
            t = dai > 0 ? Math.min(1, con / dai) : 1
            break
          }
          con -= dai
        }
        if (pha === 5 && con > (R * Math.max(0, w[5])) / (tong || 1)) {
          // 8 HẾT
          het = Math.min(d8, con - (R * Math.max(0, w[5])) / (tong || 1))
          xoay = 1
          pha = 7
        }
        var e = muot(t)
        if (pha === 0) {
          // 2 THU: vỏ B → A, tâm từ (V − B/2) về giữa màn
          voS = lerp(1, A / B, e)
          voY = lerp(d1 > 0 ? V - B / 2 : B / 2, V / 2, e)
        } else {
          hienPack = true
          if (pha >= 1) troi = pha === 1 ? e : 1
          if (pha >= 2) tach = pha === 2 ? e : 1
          if (pha >= 3) ve5 = pha === 3 ? e : 1
          if (pha >= 4) moRa = pha === 4 ? e : 1
          if (pha >= 5 && pha !== 7) xoay = pha === 5 ? e : 1
        }
      }

      // ---- Vỏ
      var tl = troiLenPx()
      if (hienPack) {
        // Pha 3: cặp vỏ + pack lệch nhau `troiLen`, cả cụm canh giữa màn.
        voY = V / 2 + (tl / 2) * troi
        // Pha 4: vỏ chìm xuống quá đáy màn và mờ đi.
        voY = lerp(voY, V + A / 2 + 40 * k, muot(tach))
        voOp = 1 - tach
      }
      var vT = 'translate(' + (voX - B / 2).toFixed(2) + 'px,' + (voY - B / 2).toFixed(2) + 'px) scale(' + voS.toFixed(5) + ')'
      if (vT !== voCu) {
        voCu = vT
        vo.style.transform = vT
      }
      vo.style.opacity = voOp < 1 ? String(voOp) : ''
      vo.style.visibility = voOp <= 0.001 ? 'hidden' : ''

      // ---- Pack (cặp mặt). Tâm MẶT TRONG (ix, iy) khi chưa xoay.
      mo.style.visibility = hienPack ? '' : 'hidden'
      if (!hienPack) return
      var iy = V / 2 - (tl / 2) * troi // pha 3: nhô lên nửa quãng (cụm canh giữa)
      iy = lerp(iy, V * 0.38, muot(tach)) // pha 4: lên tiếp (khung 04: tâm 410/1080)
      iy = lerp(iy, V / 2, ve5) // pha 5: về giữa
      var ix = lerp(W / 2, W / 2 - 222 * k, moRa) // pha 6: mặt trong dời trái (khung 06)
      var sg = A / B
      var gx = ix + A / 2 // tâm cặp mặt = mép phải mặt trong (bản lề)
      var gy = iy
      var g = 0
      if (xoay > 0) {
        // Pha 7: xoay 0 → 90°, phóng tới mỗi mặt kín bề ngang, tâm về (W/2, B)
        // — đỉnh cặp mặt chạm đỉnh màn (khung 09).
        var ex = muot(Math.min(1, xoay))
        g = 90 * ex
        sg = lerp(A / B, 1, ex)
        gx = lerp(gx, W / 2, ex)
        gy = lerp(gy, B, ex)
      }
      if (het > 0) gy = B - het // pha 8: trôi 1:1 với cuộn
      var mT = 'translate(' + (gx - B).toFixed(2) + 'px,' + (gy - B / 2).toFixed(2) + 'px) rotate(' + g.toFixed(3) + 'deg) scale(' + sg.toFixed(5) + ')'
      if (mT !== moCu) {
        moCu = mT
        mo.style.transform = mT
      }
      // Mặt có đĩa: gập úp lên mặt trong (−180°, lưng màu mặt trong nằm trên)
      // → mở phẳng (0°). Phối cảnh là của CẢ pack (thuộc tính `perspective` của
      // khối, tâm ở bản lề) — không phải perspective() riêng của tấm lật.
      var a = -180 * (1 - muot(moRa))
      var pc = (S.phoiCanh * k).toFixed(0) + 'px'
      if (mo.style.perspective !== pc) mo.style.perspective = pc
      var dT = 'translateZ(' + (a < -0.5 ? 1 : 0) + 'px) rotateY(' + a.toFixed(2) + 'deg)'
      if (dT !== matCu) {
        matCu = dT
        matDia.style.transform = dT
      }
      var r = S.xoayDia ? 'rotate(' + ((s * S.xoayDia) % 360).toFixed(2) + 'deg)' : ''
      if (r !== diaCu) {
        diaCu = r
        dia.style.transform = r
      }
    }
    function troiLenPx() {
      return S.troiLen * k
    }

    /* ================================================================ 3D
     * Hộp CD thật (cùng module + cấu hình với editor tools/cd-case). Dựng khi
     * section sắp tới (IntersectionObserver), chỉ vẽ khi nằm trong màn.
     *   1 LƯỚT   hộp đóng kín bề ngang, trôi 1:1 với cuộn
     *   2 THU    thu về ô 548 giữa màn, nghiêng `yawXem`/`pitchXem` cho thấy khối
     *   3 MỞ     nắp mở (mo 0 → 1, góc theo editor)
     *   4 ĐĨA RA đĩa nhấc ra `diaRa`
     *   5 NGHỈ   đứng yên (đĩa quay theo cuộn)
     *   6 VỀ     đĩa về, hộp quay lại chính diện (nắp vẫn mở)
     *   7 XOAY   xoay 90° + phóng: hộp mở kín bề ngang, đỉnh chạm đỉnh màn
     *   8 HẾT    trôi 1:1 tới hết khúc
     * Pha 2–7 dùng chung trọng số w* với bản phẳng. */
    var ba = null
    var dangDung3D = false
    var denVo = null // đèn spot của vỏ — bảng H chỉnh trực tiếp
    var vlVo = [] // vật liệu giấy của vỏ
    function bat3D() {
      if (ba || dangDung3D || S.kieuSan !== '3d') return
      dangDung3D = true
      Promise.all([
        import('three'),
        import('three/addons/loaders/GLTFLoader.js'),
        import('./cd3d/hop-cd.js'),
        fetch(S.cauHinh, { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : {} }).catch(function () { return {} }),
      ])
        .then(function (kq) {
          var THREE = kq[0]
          var M = kq[2]
          var cfg = kq[3] || {}
          var cv = document.createElement('canvas')
          cv.className = 'kx-cp-3d'
          cv.setAttribute('aria-hidden', 'true')
          cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block'
          san.appendChild(cv)
          // Model hộp CD là CC-BY 4.0 (mfb64, Sketchfab) — site công khai phải ghi công.
          if (cfg.kieu === 'model') {
            var ghi = document.createElement('a')
            ghi.href = 'https://sketchfab.com/3d-models/cd-music-03-0a7696bb33134cacb5a39eeb0420a738'
            ghi.target = '_blank'
            ghi.rel = 'noopener'
            ghi.textContent = 'CD CASE MODEL — MFB64 / CC BY 4.0'
            ghi.style.cssText = 'position:absolute;right:calc(24 * var(--px));bottom:calc(24 * var(--px));z-index:2;font:500 calc(10 * var(--px))/1 "Geist Mono",monospace;letter-spacing:-0.04em;color:#4d4d4d;text-decoration:none'
            san.appendChild(ghi)
          }
          var renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: 'high-performance' })
          renderer.setPixelRatio(Math.min(devicePixelRatio || 1, S.maxDpr))
          renderer.outputColorSpace = THREE.SRGBColorSpace
          renderer.toneMapping = THREE.ACESFilmicToneMapping
          renderer.toneMappingExposure = cfg.phoiSang != null ? cfg.phoiSang : 1
          var scene = new THREE.Scene()
          scene.background = new THREE.Color(S.nen)
          san.style.background = S.nen
          scene.environment = M.moiTruongStudio(THREE, renderer, cfg.denMoiTruong != null ? cfg.denMoiTruong : 1, S.studio3D)
          var den = new THREE.DirectionalLight(0xffffff, cfg.denChinh != null ? cfg.denChinh : 1.2)
          den.position.set(6, 10, 14)
          scene.add(den)
          // Đèn spot mềm chếch trên-trái: vùng sáng loang trên mặt vỏ (và hộp).
          // Vị trí đặt lại mỗi khung trong ve3D — đi theo vỏ / hộp.
          var spot = new THREE.SpotLight(0xffffff, S.voDen, 0, 0.24, 1, 0)
          scene.add(spot)
          scene.add(spot.target)
          denVo = spot
          var cam = new THREE.PerspectiveCamera(S.fov, 1, 1, 2000)
          cam.position.set(0, 0, 400)
          var goc = new THREE.Group()
          scene.add(goc)
          var P = Object.assign({}, M.MAC_DINH, cfg, { mo: 0, diaNhac: 0, diaXoay: 0, gocMo: S.gocMoSan, bong: false })
          var hop = M.taoHopCD(THREE, P, {
            GLTFLoader: kq[1].GLTFLoader,
            onDoi: function () {
              doHop()
              veLai()
            },
          })
          goc.add(hop.nhom)
          hop.apDung({}).then(function () {
            veLai()
          })
          ba = { THREE: THREE, renderer: renderer, scene: scene, cam: cam, goc: goc, hop: hop, P: P, cv: cv, dong: null, mo: null, u: 1, W: 0, V: 0, e: new THREE.Euler(), v: new THREE.Vector3(), voBoc: null }
          vo.style.display = 'none'
          mo.style.display = 'none'
          coKhung3D()
          doHop()
          dungVoBoc()
          veLai()
        })
        .catch(function (e) {
          console.warn('kx-cd-pack 3D:', e)
          dangDung3D = false
        })
    }
    /* VỎ BỌC giấy (storyboard: "Vỏ đĩa") — hộp CD (pack) nằm TRONG, trồi ra
     * khỏi miệng trên. Mặt trước vẽ đúng thiết kế khung 01 (nền xám, thẻ poster
     * album, chữ Druk / Phudu) lên canvas; cùng cỡ mặt với hộp đóng. */
    function dungVoBoc() {
      if (!ba || !ba.dong || ba.voBoc) return
      var T = ba.THREE
      var anh = new Image()
      anh.decoding = 'async'
      anh.src = S.anhAlbum
      var cho = [anh.decode().catch(function () {})]
      if (document.fonts && document.fonts.load) {
        cho.push(document.fonts.load('900 100px "Druk XCond"').catch(function () {}))
        cho.push(document.fonts.load('300 100px "Phudu"').catch(function () {}))
      }
      Promise.all(cho).then(function () {
        if (!ba || ba.voBoc) return
        var w = ba.dong.w
        var h = ba.dong.h
        var cw = 2048
        var ch = Math.round((cw * h) / w)
        var c = document.createElement('canvas')
        c.width = cw
        c.height = ch
        var g = c.getContext('2d')
        g.fillStyle = S.mauVo
        g.fillRect(0, 0, cw, ch)
        var t = ch / 1920 // khung 01 là ô 1920 vuông — canh theo chiều cao, giữa ngang
        var ox = (cw - 1920 * t) / 2
        var X = function (x) { return ox + x * t }
        var Y = function (y) { return y * t }
        var cx0 = 438.15
        var cy0 = 226.24
        if (anh.naturalWidth) g.drawImage(anh, X(cx0), Y(cy0), 1044.088 * t, 1047.591 * t)
        g.fillStyle = '#313131'
        g.fillRect(X(cx0), Y(cy0 + 1047.59), 1044.088 * t, 420.438 * t)
        g.font = '900 ' + 167.784 * t + 'px "Druk XCond", sans-serif'
        var hoa = g.measureText('H').actualBoundingBoxAscent || 167.784 * t * 0.72
        g.fillStyle = '#dedad9'
        g.textBaseline = 'alphabetic'
        var chu = function (txt, x, y) { g.fillText(txt, X(x), Y(y) + hoa) }
        chu('THE ALBUM', cx0 + 17.52, cy0 + 1065.11)
        chu('VIET.DUNG', cx0 + 742.78, cy0 + 1065.11)
        chu('BY VISUAL CHASER', cx0 + 17.52, cy0 + 1194.07)
        chu('2026', cx0 + 17.52, cy0 + 1326.53)
        chu('1995', 1040.77, 1554.12)
        g.save()
        g.beginPath()
        g.rect(X(cx0 + 553.58), Y(cy0 + 1271.83), 238.248 * t, 196.204 * t)
        g.clip()
        g.font = '300 ' + 167.784 * t + 'px "Phudu", sans-serif'
        g.fillStyle = '#b0aeab'
        g.textBaseline = 'middle'
        g.fillText('(', X(cx0 + 553.58), Y(cy0 + 1271.83 + 111.86))
        g.fillText(')', X(cx0 + 553.58 + 192.7), Y(cy0 + 1271.83 + 111.86))
        g.restore()
        g.fillStyle = 'rgba(176,174,171,.18)'
        ;[511.54, 1009.05].forEach(function (x) {
          g.beginPath()
          g.arc(X(cx0 + x + 10.511), Y(cy0 + 1432.99 + 10.511), 10.511 * t, 0, Math.PI * 2)
          g.fill()
        })
        var tex = new T.CanvasTexture(c)
        tex.colorSpace = T.SRGBColorSpace
        tex.anisotropy = 8
        /* VỎ BỌC THẬT (người dùng: "cái vỏ là vỏ thật bao bên ngoài, chứ không
         * phải opacity kiểu này"): ống giấy ĐỤC hở miệng trên — mặt trước, mặt
         * sau, hai hông, đáy — lòng trong vừa khít hộp đóng (+ khe `voKhe`).
         * Hộp nằm TRONG ống; ống tụt xuống là hộp lộ ra từ miệng trên. Bản cũ
         * là một tấm phẳng cắt ngang hộp rồi mờ dần — nhìn xuyên thấy hộp. */
        // Vân giấy: nhiễu mịn LẶP 256² làm bump map.
        var cv = document.createElement('canvas')
        cv.width = cv.height = 256
        var gv = cv.getContext('2d')
        var dv = gv.createImageData(256, 256)
        for (var i = 0; i < dv.data.length; i += 4) {
          var nv = 110 + Math.random() * 60
          dv.data[i] = dv.data[i + 1] = dv.data[i + 2] = nv
          dv.data[i + 3] = 255
        }
        gv.putImageData(dv, 0, 0)
        var van = new T.CanvasTexture(cv)
        van.wrapS = van.wrapT = T.RepeatWrapping
        van.repeat.set(24, 24)
        var giay = function (o) {
          return new T.MeshPhysicalMaterial(Object.assign({ color: 0xcfcfcf, roughness: S.voNham, metalness: 0, clearcoat: 0.25, clearcoatRoughness: 0.4, bumpMap: van, bumpScale: S.voVan, envMapIntensity: S.voMoiTruong }, o))
        }
        var khe = S.voKhe
        var vd = S.voDay
        var iw = w + 2 * khe
        var ih = h + khe
        var id = ba.dong.d + 2 * khe
        var ow = iw + 2 * vd
        var oh = ih + vd
        var od = id + 2 * vd
        var nen = function (hex) { return new T.Color(hex).multiplyScalar(S.voPhanXa) }
        var vlCanh = giay({ color: nen(0xcfcfcf) })
        var vlTruoc = giay({ color: nen(0xffffff), map: tex })
        var vlSau = giay({ color: nen(0xd5d5d5) })
        vlVo = [vlCanh, vlTruoc, vlSau]
        var m = new T.Group()
        var tam = function (gw, gh, gd, x, y, z, vl) {
          var t = new T.Mesh(new T.BoxGeometry(gw, gh, gd), vl)
          t.position.set(x, y, z)
          m.add(t)
        }
        // Gốc ống = tâm hộp đóng; miệng ống ngang mép trên hộp, đáy dày thêm vd.
        var yG = -khe / 2 - vd / 2 // tâm theo chiều cao của ống (lệch xuống vì có đáy)
        tam(ow, oh, vd, 0, yG, id / 2 + vd / 2, [vlCanh, vlCanh, vlCanh, vlCanh, vlTruoc, vlCanh])
        tam(ow, oh, vd, 0, yG, -id / 2 - vd / 2, [vlCanh, vlCanh, vlCanh, vlCanh, vlCanh, vlSau])
        tam(vd, oh, id, -iw / 2 - vd / 2, yG, 0, vlCanh)
        tam(vd, oh, id, iw / 2 + vd / 2, yG, 0, vlCanh)
        tam(iw, vd, id, 0, -h / 2 - khe - vd / 2, 0, vlCanh)
        m.userData.cao = oh
        m.userData.yG = yG
        ba.scene.add(m)
        ba.voBoc = m
        veLai()
      })
    }
    // Hộp đóng / mở đo MỘT lần (không tính tấm bóng) — đơn vị nội bộ của hộp.
    function doHop() {
      if (!ba) return
      var T = ba.THREE
      var giu = { mo: ba.P.mo, diaNhac: ba.P.diaNhac }
      ba.goc.position.set(0, 0, 0)
      ba.goc.rotation.set(0, 0, 0)
      ba.goc.scale.setScalar(1)
      var hop1 = function () {
        ba.goc.updateMatrixWorld(true)
        var b = new T.Box3()
        ba.hop.nhom.traverse(function (o) {
          if (o.isMesh && !o.userData.bong && o.visible) b.expandByObject(o)
        })
        var c = b.getCenter(new T.Vector3())
        return { w: Math.max(0.01, b.max.x - b.min.x), h: Math.max(0.01, b.max.y - b.min.y), d: Math.max(0.01, b.max.z - b.min.z), cx: c.x, cy: c.y, cz: c.z }
      }
      ba.hop.trangThai({ mo: 0, diaNhac: 0 })
      ba.dong = hop1()
      ba.hop.trangThai({ mo: 1, diaNhac: 0 })
      ba.mo = hop1()
      ba.hop.trangThai(giu)
    }
    function coKhung3D() {
      if (!ba) return
      ba.W = W
      ba.V = V
      ba.renderer.setSize(W, V, false)
      ba.cam.aspect = W / Math.max(1, V)
      ba.cam.updateProjectionMatrix()
      ba.u = (2 * ba.cam.position.z * Math.tan((S.fov * Math.PI) / 360)) / Math.max(1, V) // đơn vị thế giới / px
    }
    /* Chuỗi pha (đúng storyboard — người dùng: "không giống demo mô tả
     * animation", "không cần đĩa bay ra"):
     *   1 LƯỚT  vỏ bọc kín bề ngang trôi 1:1 · 2 THU về ô 548 giữa màn
     *   3 TRỒI  hộp CD trồi khỏi miệng vỏ bọc · 4 TÁCH vỏ chìm xuống + mờ
     *   5 NGHỈ  hộp về giữa · 6 MỞ hộp mở PHẲNG 180°, cặp mặt canh GIỮA màn
     *   7 XOAY  xoay 90° + phóng kín bề ngang · 8 HẾT trôi 1:1 tới hết khúc
     * Nhìn CHÍNH DIỆN suốt (không nghiêng); hộp đóng/mở đo một lần (doHop). */
    function ve3D() {
      if (!ba.dong) return
      var s = scrollY - top0
      var chay = H - V
      if (s < -V || s > chay + V) return // ngoài màn: bỏ vẽ
      if (s < 0) s = 0
      if (s > chay) s = chay
      /* Cuộn mượt gọi ve() trong `kx-cuon` rồi sự kiện `scroll` lại hẹn thêm
       * một lượt ở khung sau — cùng một vị trí. Mỗi lượt là HAI lần vẽ cả
       * cảnh (nhựa trong suốt vẽ thêm một lượt khúc xạ) ở cỡ kín màn: đó là
       * chỗ cuộn "lag và giật". Vị trí không đổi thì bỏ qua. */
      if (!ba.ban && s === ba.sCu) return
      ba.sCu = s
      ba.ban = false
      var u = ba.u
      var dong = ba.dong
      var moH = ba.mo
      var hCa = (dong.h / dong.w) * W // cao hộp (vỏ) khi rộng kín màn
      var d1 = Math.max(0, hCa - V)
      var hMo = (moH.w / moH.h) * W // cặp mặt mở, xoay 90°, rộng kín màn → cao
      var d8 = Math.max(0, hMo - V)
      var w = [S.wThu, S.wTroi, S.wTach, S.wNghi, S.wMo, S.wXoay]
      var tong = 0
      for (var i = 0; i < 6; i++) tong += Math.max(0, w[i])
      var R = Math.max(1, chay - d1 - d8)
      var A = 548 * k
      var rong = A // px — bề rộng hộp ĐÓNG trên màn
      var px = W / 2
      var pyVo = V / 2
      var pyHop = V / 2
      var roll = 0
      var moNap = 0
      var neo = 0 // 0 = neo tâm hộp đóng, 1 = neo tâm cặp mặt đang mở
      var voHet = false // vỏ đã tụt khỏi màn — giấu hẳn
      var con = s
      if (con <= d1 && d1 > 0) {
        rong = W
        pyVo = pyHop = hCa / 2 - con
      } else {
        con -= d1
        var pha = 0
        var t = 1
        for (pha = 0; pha < 6; pha++) {
          var dai = (R * Math.max(0, w[pha])) / (tong || 1)
          if (con <= dai) {
            t = dai > 0 ? con / dai : 1
            break
          }
          con -= dai
        }
        var e = muot(Math.min(1, t))
        var het = pha >= 6 ? Math.min(d8, con) : 0
        if (pha === 0) {
          rong = lerp(W, A, e)
          pyVo = pyHop = lerp(d1 > 0 ? V - hCa / 2 : hCa / 2, V / 2, e)
        } else {
          /* Hộp ĐỨNG YÊN giữa màn; chỉ ống vỏ tụt xuống — hộp lộ ra từ miệng
           * trên, tức "trồi lên" so với vỏ mà không bao giờ hạ xuống lại
           * (người dùng: "không có đoạn CD đã trồi lên còn hạ xuống"). */
          var hVo = (dong.h / dong.w) * A // cao hộp trên màn
          var troi = pha === 1 ? e : 1
          var tach = pha === 2 ? e : pha > 2 ? 1 : 0
          pyVo = V / 2 + hVo * S.voLo * troi
          pyVo = lerp(pyVo, V + hVo * 0.6 + 40 * k, tach) // ra khỏi đáy màn
          pyHop = V / 2
          // Từ pha nghỉ trở đi vỏ đã ra khỏi màn. Phải GIẤU HẲN: vỏ phóng theo
          // cùng `sc` với hộp, tới pha xoay + phóng kín ngang nó to ra và lòi
          // ngược lên từ đáy màn (người dùng: "sao lại lòi ra cái ảnh này").
          voHet = pha >= 3
          if (pha >= 4) {
            var em = pha === 4 ? e : 1
            moNap = em
            neo = em // canh giữa màn theo cả cặp mặt đang mở
          }
          if (pha >= 5) {
            var ex = pha === 5 ? e : 1
            roll = -90 * ex
            rong = lerp(A, (W / moH.h) * dong.w, ex)
            pyHop = lerp(V / 2, hMo / 2, ex)
            if (pha >= 6) pyHop = hMo / 2 - het
          }
        }
      }
      var sc = (rong * u) / dong.w
      ba.hop.trangThai({ mo: moNap, diaNhac: 0, diaXoay: S.xoayDia ? s * S.xoayDia : 0 })
      var g = ba.goc
      ba.e.set(0, 0, (roll * Math.PI) / 180, 'XYZ')
      g.rotation.copy(ba.e)
      g.scale.setScalar(sc)
      var ax = lerp(dong.cx, moH.cx, neo)
      var ay = lerp(dong.cy, moH.cy, neo)
      ba.v.set(ax * sc, ay * sc, 0).applyEuler(ba.e)
      g.position.set((px - W / 2) * u - ba.v.x, -(pyHop - V / 2) * u - ba.v.y, -ba.v.z)
      var vb = ba.voBoc
      if (vb) {
        // Ra khỏi màn là giấu; gốc ống trùng tâm hộp đóng (cả z — hộp nằm trong ống).
        vb.visible = !voHet && pyVo - (vb.userData.cao * sc) / u / 2 < V
        if (vb.visible) {
          vb.scale.setScalar(sc)
          vb.position.set((px - W / 2) * u, -(pyVo - V / 2) * u, dong.cz * sc)
        }
      }
      /* Đèn spot ĐI THEO chủ thể (vỏ khi còn trên màn, sau đó là hộp): chếch
       * trên-trái, cách chủ thể ~2.8 lần bề rộng của nó, nón hẹp (bán kính
       * ~0.7 bề rộng) nhắm vào phần trên-trái — dải chuyển sáng của penumbra
       * trải đúng trên mặt vỏ ở mọi cỡ, góc dưới-phải tối dần. Đặt cố định
       * trong cảnh thì nón rộng hơn cả màn, vỏ chỉ nằm trong một lát sáng đều. */
      if (denVo) {
        var coVo = vb && vb.visible
        var cxw = (px - W / 2) * u
        var cyw = -((coVo ? pyVo : pyHop) - V / 2) * u
        var ww = rong * u
        denVo.target.position.set(cxw - 0.18 * ww, cyw + 0.2 * ww, 0) // tâm vùng sáng: trên-trái mặt vỏ
        denVo.position.set(cxw - 0.9 * ww, cyw + 1.1 * ww, 2.4 * ww)
        denVo.target.updateMatrixWorld()
      }
      ba.renderer.render(ba.scene, ba.cam)
    }
    if (S.kieuSan === '3d' && 'IntersectionObserver' in window) {
      var io3 = new IntersectionObserver(
        function (rows) {
          if (rows[0].isIntersecting) {
            bat3D()
            io3.disconnect()
          }
        },
        { rootMargin: '150% 0px' }
      )
      io3.observe(khuc)
    }

    var raf = 0
    function hen() {
      if (raf) return
      raf = requestAnimationFrame(function () {
        raf = 0
        ve()
      })
    }
    // Vẽ lại dù vị trí cuộn không đổi (đổi cỡ, nạp xong ảnh / model / vỏ).
    function veLai() {
      if (ba) ba.ban = true
      ve()
    }
    function lamLai() {
      doThua()
      coKhung3D()
      veLai()
    }
    lamLai()
    addEventListener('kx-cuon', ve)
    addEventListener('scroll', hen, { passive: true })
    addEventListener('resize', lamLai)
    addEventListener('load', lamLai)
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(lamLai)

    api.apDung = function () {
      san.style.background = S.nen
      vo.style.background = S.mauVo
      matTrong.style.background = S.mauTrong
      truoc.style.background = S.mauDia
      sau.style.background = S.mauTrong
      if (img.getAttribute('src') !== S.anhAlbum) img.src = S.anhAlbum
      if (imgDia.getAttribute('src') !== S.anhDia) imgDia.src = S.anhDia
      voCu = moCu = matCu = diaCu = ''
      if (denVo) denVo.intensity = S.voDen
      for (var i = 0; i < vlVo.length; i++) {
        vlVo[i].roughness = S.voNham
        vlVo[i].bumpScale = S.voVan
        vlVo[i].envMapIntensity = S.voMoiTruong
      }
      lamLai()
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true })
  else boot()
})()
