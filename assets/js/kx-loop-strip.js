/* =============================================================================
 * kaixa Portfolio — Dải ảnh dự án nghiêng chạy vòng + hàng chữ thông tin (Home)
 * -----------------------------------------------------------------------------
 * Cụm "02." của Home trong Figma chỉ là ẢNH CHỤP màn hình một site mẫu (node
 * 1:275, 1:276, 1:288 — dải thẻ nghiêng và hàng chữ Services / Recognition đều
 * nằm sẵn trong ảnh). Người dùng chốt dựng THẬT:
 *   - Dải thẻ ảnh dự án nghiêng chéo (`tilt`), chạy vòng liên tục. Mỗi dự án
 *     đúng 4 ảnh (như trang Works). Trên đầu mỗi thẻ: tên dự án (thẻ đầu của
 *     dự án) bên trái, số thứ tự bên phải — chữ Geist Mono viết hoa như cột
 *     thông tin của trang.
 *   - CỤM THÔNG TIN bên dưới (tên "( Lumen Studio )", số "02.", cột
 *     COLLABORATION…) ĐỔI THEO DỰ ÁN: chạy hết 4 ảnh của một dự án qua điểm
 *     `infoAt` thì cụm đổi sang dự án kế. Xem mục "CỤM THÔNG TIN".
 *   - Hàng chữ trên cùng: tên, trạng thái, Services, Recognition, Profile,
 *     Email me — ĐẶT THEO LƯỚI 12 CỘT của site (lề 24, rãnh 16 — cùng số với
 *     kx-grid.js, bấm G để soi). `col*` là cột bắt đầu (1..12).
 *   - KÍNH LỎNG ở hai mép TRÁI / PHẢI viewport, đúng kiểu bản Osmo gốc (bản
 *     ngang): thẻ chạy qua mép thì bị khúc xạ. Chỉ ăn vào ẢNH và NHÃN của thẻ —
 *     nền đen xung quanh không đổi. Xem mục "KÍNH HAI MÉP".
 * Ảnh chụp gốc bị bỏ ở bước sinh trang (bảng XOA trong figma-to-html.mjs).
 *
 * Nội dung là của chính Kaixa (tên dự án ở Works, giải ở About) — KHÔNG chép
 * chữ của site mẫu.
 *
 * Chạy vòng bằng MỘT animation CSS: dải gồm hai bản sao nối nhau, trượt đúng
 * -50% rồi lặp — trình duyệt tự chạy trên compositor. Mọi số đo là PX THIẾT KẾ
 * (nhân `--px` của .kx-page), nên thời lượng một vòng = bề rộng một bản sao /
 * `speed` không phụ thuộc cỡ màn hình. Ra khỏi màn hình thì tạm dừng.
 *
 * Toạ độ dọc (`headerY`, `stripY`) là toạ độ TRANG Home (px thiết kế).
 * File KHÔNG chứa UI setting; bảng chỉnh là kx-panel.js (phím H, mục Loop Strip).
 * ========================================================================== */
(function () {
  'use strict'

  var CONFIG = {
    enabled: true,
    truoc: '1:288', // chèn TRƯỚC node này — để chữ "02." (sau nó) nằm đè lên dải

    // ---------------------------------------------------------- dải ảnh
    // Dự án cách nhau bằng |, mỗi dự án "Tên=ảnh,ảnh,ảnh,ảnh" (ảnh trong
    // assets/works/) — đúng 4 ảnh của dự án đó ở trang Works, theo thứ tự.
    du_an:
      'Lumen Studio=rectangle2992.webp,rectangle2993.webp,rectangle2994.webp,rectangle2995.webp' +
      '|Chande Bootcamp=rectangle2996.webp,rectangle2993.webp,rectangle2997.png,rectangle2995.webp' +
      '|Re:active=rectangle2998.webp,rectangle2999.webp,rectangle3000.webp,rectangle3001.webp' +
      '|Niki Studio=rectangle3002.webp,rectangle2993.webp,rectangle3003.png,rectangle3004.webp' +
      '|150Posters=rectangle3005.png,rectangle3006.webp,rectangle3007.png,rectangle3008.webp',
    thuMuc: 'assets/works/', // đường dẫn TƯƠNG ĐỐI (luật số 5)
    stripY: 3744, // tâm dải theo phương dọc
    tilt: -12.5, // độ nghiêng (âm = dâng lên về bên phải)
    cardW: 476,
    cardH: 476,
    gap: 8, // khe giữa hai thẻ
    labelGap: 4, // khe giữa nhãn và thẻ
    labelSize: 14,
    // Nhãn dùng đúng chữ của cột thông tin (COLLABORATION / BRANDING SYSTEM):
    // Geist Mono 500 viết hoa, khít -0.06em, xám #4d4d4d.
    labelColor: '#4d4d4d',
    speed: 57, // px thiết kế mỗi giây
    reverse: false, // true = chạy sang phải
    link: 'work-detail.html', // bấm thẻ thì sang đâu; để trống = không bấm được

    // ------------------------------------------------------- cụm thông tin
    info: true, // false = cụm thông tin đứng yên như bản thiết kế
    infoAt: 0.5, // điểm đọc dự án trên dải: phần bề rộng viewport (0.5 = giữa)
    infoFade: 220, // ms — mờ ra rồi mờ vào khi đổi dự án
    infoName: '1:341', // "( Lumen Studio )"
    infoIcons: '1:342', // ba icon theo sau tên
    infoNum: '1:289', // "02."
    infoCol1: '1:337', // cột COLLABORATION — dòng cuối là tên dự án
    infoCol2: '1:338', // cột dịch vụ
    infoCol3: '1:339', // cột năm
    // Cột dịch vụ và năm: Works để giống hệt nhau ở cả 5 dự án (chữ giữ chỗ của
    // Figma) — khai theo dự án ở đây, cách nhau bằng ||, dòng cách nhau bằng |.
    infoServices: 'BRANDING SYSTEM|WEB DESIGN|ART DIRECTION||BRANDING SYSTEM|WEB DESIGN|ART DIRECTION||BRANDING SYSTEM|WEB DESIGN|ART DIRECTION||BRANDING SYSTEM|WEB DESIGN|ART DIRECTION||BRANDING SYSTEM|WEB DESIGN|ART DIRECTION',
    infoYear: '2026||2026||2026||2026||2026',

    // ------------------------------------------------- kính hai mép trái/phải
    lens: true,
    lensBand: 0.02, // độ sâu kính, phần bề rộng viewport (đo ở giữa chiều cao)
    lensSoft: 1.5, // lực bắt đầu sâu hơn viền kính bấy nhiêu lần — cao = vát tròn
    lensCurve: 0.85, // 0 = viền kính thẳng, 1 = nửa elip
    lensSpan: 1.3, // chiều cao elip so với viewport
    lensZoom: 1, // độ phóng; 0 = phẳng
    lensSplay: 1, // thẻ tẽ DỌC ra trên/dưới bao nhiêu
    lensDispersion: 14, // px — tách đỏ/lam
    lensRimWave: 0.4, // viền gợn
    lensWaveSpeed: 0.5,
    lensSamples: 8, // 2..16 — núm hiệu năng
    lensColor: '#009dff',
    lensGlow: 0,
    lensRing: 0,
    lensRimLine: 0,
    lensNova: 0.05,
    lensMaxPx: 3072, // trần cạnh canvas kính (px thật)
    lensMaxTex: 3072, // trần cạnh texture chứa các thẻ (px thật)

    // --------------------------------------------------------- hàng chữ
    headerY: 3297,
    textSize: 16,
    lineHeight: 1.15,
    indent: 14, // dòng con của Services / Recognition thụt vào
    name: 'Kaixa (Dung Pham)',
    colName: 1,
    status: 'Available for collaboration',
    colStatus: 3,
    servicesTitle: 'Services',
    services: 'Brand Identity|Web Design & Art Direction|Editorial & Typography',
    colServices: 5,
    recognitionTitle: 'Recognition',
    recognition: 'Site of the Day|FWA of the Day|CSS Design Awards|Muzli Picks|Behance Features',
    colRecognition: 8,
    profile: 'Profile',
    profileHref: 'about.html',
    colProfile: 11,
    email: 'Email me', // địa chỉ lấy từ kx-site-nav.js (CONFIG.email)
    // Lưới — giữ khớp kx-grid.js.
    gridCount: 12,
    gridMargin: 24,
    gridGutter: 16,
  }

  var S = CONFIG
  // Lộ `config` NGAY khi file chạy: kx-panel.js (nạp sau) áp số đã lưu trước boot.
  var api = (window.KX_LOOP_STRIP = { config: S, defaults: Object.freeze(Object.assign({}, CONFIG)) })

  /* Màn đầu Home cao ĐÚNG MỘT viewport (generator: `hero` 1080) — mọi thứ dưới
   * nó dời theo 100svh. stripY / headerY vẫn khai bằng toạ độ trang của bản
   * thiết kế; quy sang CSS bằng hàm này. */
  var HERO = 1080
  function yTrang(y) {
    return y >= HERO ? 'calc(100svh + ' + (y - HERO) + ' * var(--px))' : px(y)
  }

  var W0 = 3400 // bề rộng khung xoay (px thiết kế) — đủ phủ góc màn hình khi nghiêng
  var LABEL_FONT = '"Geist Mono", ui-monospace, monospace'

  function px(n) {
    return 'calc(' + n + ' * var(--px))'
  }

  function q(id) {
    return document.querySelector('[data-n="' + id + '"]')
  }

  function el(tag, cls, chu) {
    var e = document.createElement(tag)
    if (cls) e.className = cls
    if (chu != null) e.textContent = chu
    return e
  }

  // Cao của một thẻ (nhãn + khe + ảnh) và cao vùng dải sau khi nghiêng.
  function caoThe() {
    return S.labelSize + S.labelGap + S.cardH
  }
  function caoVung() {
    var r = (S.tilt * Math.PI) / 180
    return Math.ceil(W0 * Math.abs(Math.sin(r)) + caoThe() * Math.abs(Math.cos(r)) + 40)
  }

  function css() {
    var H = caoVung()
    var mask = 'linear-gradient(to right,transparent var(--kx-ls-l),#000 var(--kx-ls-l),#000 calc(100% - var(--kx-ls-l)),transparent calc(100% - var(--kx-ls-l)))'
    return [
      // .kx-ls cao đúng vùng dải (không còn cao 0) để mask-image của kính ăn đúng.
      '.kx-page .kx-ls{position:absolute;left:0;width:100%;top:' + yTrang(S.stripY - H / 2) + ';height:' + px(H) + ';pointer-events:none}',
      '.kx-page .kx-ls.is-kinh{-webkit-mask-image:' + mask + ';mask-image:' + mask + '}',
      '.kx-page .kx-ls__xoay{position:absolute;left:50%;top:50%;width:' + px(W0) + ';',
      '  transform:translate(-50%,-50%) rotate(' + S.tilt + 'deg)}',
      '.kx-page .kx-ls__ray{display:flex;width:max-content;will-change:transform;',
      '  animation:kx-ls-chay var(--kx-ls-dur) linear infinite' + (S.reverse ? ' reverse' : '') + '}',
      '.kx-page .kx-ls__the{flex:none;width:' + px(S.cardW) + ';margin-right:' + px(S.gap) + ';',
      '  display:block;text-decoration:none;pointer-events:auto}',
      '.kx-page .kx-ls__nhan{display:flex;justify-content:space-between;align-items:baseline;',
      '  height:' + px(S.labelSize) + ';margin-bottom:' + px(S.labelGap) + ';font-family:' + LABEL_FONT + ';font-weight:500;',
      '  font-size:' + px(S.labelSize) + ';line-height:1;letter-spacing:-0.06em;text-transform:uppercase;',
      '  color:' + S.labelColor + ';white-space:nowrap}',
      '.kx-page .kx-ls__anh{display:block;width:100%;height:' + px(S.cardH) + ';object-fit:cover;background:#111}',
      '.kx-page .kx-ls-kinh{position:absolute;left:0;width:100%;pointer-events:none;display:block}',
      '@keyframes kx-ls-chay{from{transform:translateX(0)}to{transform:translateX(-50%)}}',
      '.kx-page .kx-ls-dau{position:absolute;left:0;width:100%;display:grid;',
      '  grid-template-columns:repeat(' + S.gridCount + ',minmax(0,1fr));column-gap:' + px(S.gridGutter) + ';',
      '  padding:0 ' + px(S.gridMargin) + ';box-sizing:border-box;align-items:start;',
      '  font-family:Haffer,Roobert,sans-serif;font-weight:400;font-size:' + px(S.textSize) + ';',
      '  line-height:' + S.lineHeight + ';color:#ebebeb}',
      '.kx-page .kx-ls-dau > *{margin:0;white-space:nowrap}',
      '.kx-page .kx-ls-dau ul{list-style:none;margin:0;padding:0 0 0 ' + px(S.indent) + '}',
      '.kx-page .kx-ls-dau a{color:inherit;text-decoration:none}',
      '.kx-page .kx-ls-dau a:hover{text-decoration:underline}',
      '.kx-page .kx-ls-dau .kx-ls-dau__cuoi{justify-self:end;text-align:right}',
      '.kx-page .kx-ls-o{display:inline-block}',
    ].join('\n')
  }

  function cot(e, c, span) {
    e.style.gridColumn = c + ' / span ' + (span || 1)
    return e
  }

  function khoiDanhSach(tieuDe, chuoi) {
    var o = el('div')
    o.appendChild(el('div', null, tieuDe))
    var ul = el('ul')
    chuoi.split('|').forEach(function (t) {
      if (t.trim()) ul.appendChild(el('li', null, t.trim()))
    })
    o.appendChild(ul)
    return o
  }

  function dungDau() {
    var d = el('div', 'kx-ls-dau')
    d.style.top = yTrang(S.headerY)
    // Khối cuối mỗi cụm trải tới trước cụm kế tiếp, để chữ dài không bị cắt.
    d.appendChild(cot(el('div', null, S.name), S.colName, S.colStatus - S.colName))
    d.appendChild(cot(el('div', null, S.status), S.colStatus, S.colServices - S.colStatus))
    d.appendChild(cot(khoiDanhSach(S.servicesTitle, S.services), S.colServices, S.colRecognition - S.colServices))
    d.appendChild(cot(khoiDanhSach(S.recognitionTitle, S.recognition), S.colRecognition, S.colProfile - S.colRecognition))
    var p = el('a', null, S.profile)
    p.href = S.profileHref
    d.appendChild(cot(p, S.colProfile, 1))
    var thu = (window.KX_SITE_NAV && window.KX_SITE_NAV.CONFIG && window.KX_SITE_NAV.CONFIG.email) || ''
    var m = el(thu ? 'a' : 'span', 'kx-ls-dau__cuoi', S.email)
    if (thu) m.href = 'mailto:' + thu
    d.appendChild(cot(m, S.gridCount, 1))
    return d
  }

  // Danh sách thẻ + danh sách dự án (thẻ nào thuộc dự án nào).
  function dungThe() {
    var list = []
    var duAn = []
    S.du_an.split('|').forEach(function (cum) {
      var i = cum.indexOf('=')
      if (i < 0) return
      var ten = cum.slice(0, i).trim()
      var p = duAn.length
      duAn.push({ ten: ten, tu: list.length })
      cum
        .slice(i + 1)
        .split(',')
        .forEach(function (f, j) {
          if (f.trim()) list.push({ ten: j === 0 ? ten : '', so: j + 1, src: S.thuMuc + f.trim(), alt: ten, duAn: p })
        })
    })
    return { list: list, duAn: duAn }
  }

  function theEl(t, banSao) {
    var a = el(S.link ? 'a' : 'div', 'kx-ls__the')
    if (S.link) a.href = S.link
    if (banSao) {
      // Bản sao chỉ để nối vòng: trình đọc màn hình và phím Tab bỏ qua.
      a.setAttribute('aria-hidden', 'true')
      a.tabIndex = -1
    }
    var nhan = el('div', 'kx-ls__nhan')
    nhan.appendChild(el('span', null, t.ten))
    nhan.appendChild(el('span', null, String(t.so)))
    a.appendChild(nhan)
    var im = el('img', 'kx-ls__anh')
    im.alt = banSao ? '' : t.alt
    im.decoding = 'async'
    im.loading = 'lazy'
    im.src = t.src
    a.appendChild(im)
    return a
  }

  /* ========================================================== CỤM THÔNG TIN
   * Đổi tên, số, cột thông tin theo dự án đang chạy qua điểm `infoAt`. Đo
   * layout chỉ lúc ĐỔI dự án (vài giây một lần), không phải mỗi khung.
   *
   * Tên và ba icon: trong Figma icon nằm ở toạ độ CỐ ĐỊNH, cách tên bằng một
   * chuỗi dấu cách — đổi sang tên dài hơn là icon đè lên chữ. Nên lần đầu đo
   * khe "tên → icon" và "icon → )" của bản gốc, rồi dựng lại dòng thành
   * "( TÊN" + một ô trống đúng bằng (khe + icon + khe) + ")", và mỗi lần đổi
   * tên thì đặt icon vào đúng ô trống đó. */
  function dungThongTin(page, duAn) {
    var pTen = q(S.infoName)
    var icon = q(S.infoIcons)
    var so = q(S.infoNum)
    var c1 = q(S.infoCol1)
    var c2 = q(S.infoCol2)
    var c3 = q(S.infoCol3)
    if (!pTen || !so) return null
    var nhom = [pTen, icon, so, c1, c2, c3].filter(Boolean)
    var dv = S.infoServices.split('||')
    var nam = S.infoYear.split('||')
    var o = null // ô trống giữ chỗ cho icon
    var cur = -1
    var hen = 0

    function k() {
      return page.getBoundingClientRect().width / 1920
    }

    function chuanBiTen() {
      if (o || !icon) return
      var t = pTen.firstChild
      if (!t || t.nodeType !== 3) return
      var s = t.nodeValue
      var dong = s.lastIndexOf(')')
      var ten = s.replace(/^\(\s*/, '').replace(/\s*\)\s*$/, '')
      var rg = document.createRange()
      var dau = s.indexOf(ten)
      rg.setStart(t, dau)
      rg.setEnd(t, dau + ten.length)
      var cuoiTen = rg.getBoundingClientRect().right
      rg.setStart(t, dong)
      rg.setEnd(t, dong + 1)
      var moNgoac = rg.getBoundingClientRect().left
      var ib = icon.getBoundingClientRect()
      var kk = k()
      // Khe trước icon, bề rộng icon, khe sau icon — px thiết kế.
      o = {
        rong: (moNgoac - cuoiTen) / kk,
        khe: (ib.left - cuoiTen) / kk,
        o: el('span', 'kx-ls-o'),
      }
      o.o.style.width = px(o.rong)
      pTen.textContent = ''
      pTen.appendChild(document.createTextNode(''))
      pTen.appendChild(o.o)
      pTen.appendChild(document.createTextNode(')'))
    }

    function datTen(ten) {
      chuanBiTen()
      if (!o) {
        pTen.textContent = '( ' + ten + ' )'
        return
      }
      pTen.firstChild.nodeValue = '( ' + ten
      if (!icon) return
      // Đặt icon vào ô trống: toạ độ theo khung chứa của icon, quy ra px thiết kế.
      var cha = icon.offsetParent || icon.parentElement
      var ob = o.o.getBoundingClientRect()
      var cb = cha.getBoundingClientRect()
      icon.style.left = px((ob.left - cb.left) / k() + o.khe)
    }

    function datCot(c, dong) {
      if (!c) return
      var ps = c.querySelectorAll('p')
      // Hai dòng đầu là "01" và một dòng trống — giữ; phần còn lại là nội dung.
      var giu = 2
      for (var i = ps.length - 1; i >= giu; i--) ps[i].remove()
      dong.forEach(function (d, i) {
        var p = el('p', i === dong.length - 1 ? 'ke' : 'kd', d)
        // Lấy lại đúng class sinh ra của dòng thường / dòng cuối như bản gốc.
        p.className = i === dong.length - 1 ? c.__lopCuoi : c.__lopThuong
        c.appendChild(p)
      })
    }
    ;[c1, c2, c3].forEach(function (c) {
      if (!c) return
      var ps = c.querySelectorAll('p')
      c.__lopThuong = ps[0] ? ps[0].className : ''
      c.__lopCuoi = ps.length ? ps[ps.length - 1].className : ''
    })

    function apDuAn(i) {
      var d = duAn[i]
      datTen(d.ten)
      so.textContent = (i + 1 < 10 ? '0' : '') + (i + 1) + '.'
      datCot(c1, ['COLLABORATION', d.ten.toUpperCase()])
      datCot(c2, (dv[i] || dv[0] || '').split('|').filter(Boolean))
      datCot(c3, [(nam[i] || nam[0] || '').trim()])
    }

    function doi(i) {
      if (i === cur || i < 0 || i >= duAn.length) return
      var dau = cur < 0
      cur = i
      if (dau || !S.infoFade) {
        apDuAn(i)
        return
      }
      nhom.forEach(function (e) {
        e.style.transition = 'opacity ' + S.infoFade + 'ms ease'
        e.style.opacity = '0'
      })
      clearTimeout(hen)
      hen = setTimeout(function () {
        apDuAn(cur)
        nhom.forEach(function (e) { e.style.opacity = '' })
      }, S.infoFade)
    }

    return {
      doi: doi,
      // Đổi cỡ cửa sổ: icon đặt theo px thiết kế nên tự co theo; chỉ cần đặt lại.
      datLai: function () {
        if (cur >= 0) apDuAn(cur)
      },
    }
  }

  /* =========================================================== KÍNH HAI MÉP
   * WebGL không đọc được DOM, nên:
   *   1. ATLAS: mỗi thẻ (nhãn + ảnh) được vẽ MỘT LẦN bằng canvas 2D vào một
   *      texture lưới ô — đúng cỡ, đúng font, đúng ảnh cover như DOM.
   *   2. Một canvas WebGL phủ vùng dải, nằm ngay sau dải trong DOM (chữ "02." và
   *      hàng chữ vẽ sau nên vẫn đè lên). Nó CHỈ vẽ trong hai dải mép rộng
   *      L = lensBand x (1 + lensSoft) x bề rộng viewport; giữa để trống.
   *   3. DOM của dải bị che ĐÚNG hai dải mép đó bằng mask-image — ở giữa vẫn là
   *      ảnh thật, nét, bấm được.
   *   4. Vị trí thẻ: tính lại từ CHÍNH animation CSS đang chạy (currentTime) —
   *      canvas và DOM không bao giờ lệch nhau. Lực kính bằng 0 ở mép trong
   *      dải, nên chỗ giao giữa DOM và canvas không thấy đường nối.
   * Ánh sáng (vòng, viền, quầng) nhân với độ phủ của thẻ → chỉ ăn vào ảnh và
   * nhãn, nền đen không có gì. Toạ độ trong shader: px css của viewport, px
   * thiết kế của dải. Không viết dấu huyền trong khối GLSL (luật số 4). */
  var VERT = '#version 300 es\nin vec2 p;\nvoid main(){ gl_Position = vec4(p, 0.0, 1.0); }'
  var FRAG = [
    '#version 300 es',
    'precision highp float;',
    'uniform sampler2D uAtlas;',
    'uniform vec2 uAtlasSize;', // px
    'uniform vec2 uCell;', // ô thẻ: cardW, cao thẻ (px thiết kế)
    'uniform float uS, uCols, uN, uPad;', // px atlas / px thiết kế, số cột atlas, số thẻ, đệm ô (px atlas)
    'uniform float uCardW, uP, uW0, uOff;', // P = cardW + gap; uOff = dải đã trượt bao xa (px thiết kế)
    'uniform vec2 uC, uRot;', // tâm dải (px thiết kế trang), cos/sin độ nghiêng
    'uniform float uK, uScroll, uTop, uDpr, uResY;', // px css / px thiết kế; scrollY; đỉnh canvas (px css trang)
    'uniform vec2 uView;',
    'uniform float uBand, uSoft, uCurve, uSpan, uZoom, uSplay, uDisp, uRimWave, uWaveT, uTime;',
    'uniform float uGlow, uNova, uRing, uRimLine;',
    'uniform vec3 uRingCol;',
    'uniform int uSamples;',
    'out vec4 o;',
    // Dải thẻ tại một điểm viewport (premultiplied).
    'vec4 dai(vec2 v){',
    '  vec2 d = vec2(v.x, v.y + uScroll) / uK - uC;',
    '  vec2 l = vec2(uRot.x * d.x + uRot.y * d.y, -uRot.y * d.x + uRot.x * d.y);', // quay ngược độ nghiêng
    '  float ly = l.y + 0.5 * uCell.y;',
    '  if (ly < -1.0 || ly > uCell.y + 1.0) return vec4(0.0);',
    '  float m = l.x + 0.5 * uW0 + uOff;',
    '  float i = floor(m / uP);',
    '  float w = m - i * uP;',
    '  if (w > uCardW + 1.0) return vec4(0.0);',
    '  float idx = mod(i, uN);',
    '  float cx = mod(idx, uCols);',
    '  float cy = floor(idx / uCols);',
    '  vec2 org = vec2(cx, cy) * (uCell * uS + uPad) + uPad;',
    '  vec2 q = clamp(vec2(w, ly), vec2(0.0), uCell);',
    '  vec4 c = texture(uAtlas, (org + q * uS) / uAtlasSize);',
    // Khử răng cưa mép thẻ nghiêng: độ phủ theo khoảng cách tới mép ô (px thật).
    '  float e = min(min(w, uCardW - w), min(ly, uCell.y - ly)) * uK * uDpr;',
    '  return c * clamp(e + 0.5, 0.0, 1.0);',
    '}',
    'void main(){',
    '  vec2 v = vec2(gl_FragCoord.x / uDpr, (uResY - gl_FragCoord.y) / uDpr + uTop - uScroll);',
    '  float D = uBand * uView.x;',
    '  float R = 1.0 + uSoft;',
    '  float L = D * R;',
    '  bool trai = v.x < L;',
    '  if (!trai && v.x <= uView.x - L) { o = vec4(0.0); return; }', // giữa: DOM thật lo
    '  float edge = trai ? 0.0 : uView.x;',
    '  float cy = 0.5 * uView.y;',
    '  float hy = max(0.5 * uView.y * uSpan, 1.0);',
    '  vec2 e = vec2((v.x - edge) / max(D, 1.0), (v.y - cy) / hy);',
    '  float nd = mix(abs(e.x), length(e), uCurve);',
    '  if (D <= 1.0 || nd >= R) { o = dai(v); return; }', // trong dải mép nhưng ngoài kính: vẽ phẳng
    // t: 0 ở chỗ lực bắt đầu, 1 ở mép viewport — mạnh dần về mép, vát mềm ở trong.
    '  float t = 1.0 - nd / R;',
    '  float wg = t * t;',
    '  float P = uZoom * 0.30 * wg;',
    '  float vao = trai ? 1.0 : -1.0;',
    '  float rimS = smoothstep(0.3, 1.0, t);',
    '  float ang = atan(e.y, e.x) + uTime * uWaveT;',
    '  float fw = sin(ang * 2.0) * 0.55 + sin(ang) * 0.25;',
    '  vec2 tn = normalize(vec2(-e.y * D, e.x * hy) + 1e-6);',
    '  vec2 rimOff = tn * fw * rimS * D * uRimWave;',
    // Ngang: lấy mẫu lùi vào trong → thẻ giãn về phía mép. Dọc: lấy mẫu gần
    // giữa màn hình hơn → thẻ tẽ ra trên/dưới. Trần 0.45 giữ ánh xạ đơn điệu.
    '  vec2 sv = vec2(v.x + vao * D * min(uZoom * 0.30, 0.45) * wg, cy + (v.y - cy) * (1.0 - P * uSplay)) + rimOff;',
    '  vec2 rd = normalize(v - sv + 1e-6);',
    '  float dsp = uDisp * smoothstep(0.1, 1.0, t);',
    '  int N = clamp(uSamples, 2, 16);',
    '  vec3 col = vec3(0.0);',
    '  vec3 wsum = vec3(0.0);',
    '  float aa = 0.0;',
    '  float asum = 0.0;',
    '  for (int s = 0; s < 16; s++) {',
    '    if (s >= N) break;',
    '    float tt = float(s) / float(N - 1);',
    '    vec4 sm = dai(sv + rd * dsp * (tt - 0.5));',
    '    vec3 w = vec3(exp(-pow(tt / 0.38, 2.0)), exp(-pow((tt - 0.5) / 0.38, 2.0)), exp(-pow((tt - 1.0) / 0.38, 2.0)));',
    '    col += sm.rgb * w;',
    '    wsum += w;',
    '    aa += sm.a * w.g;',
    '    asum += w.g;',
    '  }',
    '  col /= max(wsum, vec3(0.001));',
    '  float ga = aa / max(asum, 0.001);',
    '  float r2 = nd * nd * 0.25;',
    '  float gs = max(12.0 * uGlow * 0.003, 0.004);',
    '  float nova = (exp(-r2 / gs) + exp(-r2 / (gs * 7.0)) * 0.18) * uNova * (uGlow / 17.0) * 1.15;',
    '  float dC = nd * 0.5;',
    '  float ring = exp(-pow((dC - 0.49) / 0.01, 2.0)) * uRing * (uGlow / 17.0) * 1.8;',
    '  float aura = exp(-pow((dC - 0.49) / 0.06, 2.0)) * 0.28 * uRing * (uGlow / 17.0);',
    '  float rim = exp(-pow((dC - 0.488) / 0.003, 2.0)) * uRimLine;',
    '  vec3 light = (vec3(nova + rim) + uRingCol * (ring + aura)) * smoothstep(1.0, 0.93, nd);',
    '  o = vec4(col + light * ga, ga);',
    '}',
  ].join('\n')

  function bienDich(gl, type, src) {
    var sh = gl.createShader(type)
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.warn('kx-loop-strip:', gl.getShaderInfoLog(sh))
      return null
    }
    return sh
  }

  function napAnh(src) {
    return new Promise(function (ok) {
      var im = new Image()
      im.decoding = 'async'
      im.onload = function () { ok(im) }
      im.onerror = function () { ok(null) }
      im.src = src
    })
  }

  function rgb(hex) {
    var h = String(hex).replace('#', '')
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
    var n = parseInt(h, 16) || 0
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
  }

  function dungKinh(page, dai, list) {
    var cv = el('canvas', 'kx-ls-kinh')
    cv.setAttribute('aria-hidden', 'true')
    var gl = cv.getContext('webgl2', { alpha: true, antialias: false, depth: false, stencil: false, premultipliedAlpha: true })
    if (!gl) return null
    var vs = bienDich(gl, gl.VERTEX_SHADER, VERT)
    var fs = bienDich(gl, gl.FRAGMENT_SHADER, FRAG)
    if (!vs || !fs) return null
    var prog = gl.createProgram()
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.bindAttribLocation(prog, 0, 'p')
    gl.linkProgram(prog)
    gl.useProgram(prog)
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
    var U = {}
    ;['uAtlas', 'uAtlasSize', 'uCell', 'uS', 'uCols', 'uN', 'uPad', 'uCardW', 'uP', 'uW0', 'uOff', 'uC', 'uRot', 'uK', 'uScroll', 'uTop', 'uDpr', 'uResY', 'uView', 'uBand', 'uSoft', 'uCurve', 'uSpan', 'uZoom', 'uSplay', 'uDisp', 'uRimWave', 'uWaveT', 'uTime', 'uGlow', 'uNova', 'uRing', 'uRimLine', 'uRingCol', 'uSamples'].forEach(function (n) {
      U[n] = gl.getUniformLocation(prog, n)
    })
    gl.uniform1i(U.uAtlas, 0)
    dai.insertAdjacentElement('afterend', cv)

    var K = { tex: null, san: false, khoaAtlas: '', k: 1, vw: 1, vh: 1, top: 0, ratio: 1 }
    var PAD = 4
    var cols = 1
    var s = 1
    var aw = 1
    var ah = 1

    // Đo THƯA: lúc dựng, đổi cỡ, đổi số trong bảng. Không đo layout mỗi khung.
    function doLai() {
      K.vw = document.documentElement.clientWidth || innerWidth
      K.vh = innerHeight
      var cssW = page.getBoundingClientRect().width
      K.k = cssW / 1920
      var H = caoVung()
      var cssH = H * K.k
      K.ratio = Math.min(window.devicePixelRatio || 1, 2, S.lensMaxPx / Math.max(1, cssW, cssH))
      cv.style.top = yTrang(S.stripY - H / 2)
      cv.style.height = px(H)
      // Đỉnh canvas trong trang (px css) — ĐO, không suy từ stripY: màn đầu
      // cao theo viewport nên toạ độ thật lệch bản thiết kế 100svh - 1080.
      // Đo khối dải (luôn hiện), không đo canvas — canvas để display:none tới
      // khi atlas xong thì hộp của nó bằng 0.
      K.top = dai.getBoundingClientRect().top - page.getBoundingClientRect().top
      K.tamY = K.top / K.k + H / 2 // tâm dải, px thiết kế theo layout thật
      cv.width = Math.max(1, Math.round(cssW * K.ratio))
      cv.height = Math.max(1, Math.round(cssH * K.ratio))
      gl.viewport(0, 0, cv.width, cv.height)
      // Mép trong của dải kính (px css) — DOM bị che đúng tới đây.
      dai.style.setProperty('--kx-ls-l', (S.lensBand * (1 + Math.max(0, S.lensSoft)) * K.vw).toFixed(2) + 'px')
      var khoa = [S.cardW, S.cardH, S.labelSize, S.labelGap, S.labelColor, K.k.toFixed(3), K.ratio.toFixed(3)].join('|')
      if (khoa !== K.khoaAtlas) {
        K.khoaAtlas = khoa
        dungAtlas()
      }
    }

    /* Vẽ mọi thẻ vào một texture lưới ô, mỗi ô = nhãn + khe + ảnh, đúng như
     * DOM. Ảnh nạp lại bằng new Image() (thẻ DOM để loading=lazy nên có thể
     * chưa về). Phải chờ font Geist Mono, không thì nhãn ra font dự phòng. */
    var lanDung = 0
    function dungAtlas() {
      var lan = ++lanDung
      var cw = S.cardW
      var ch = caoThe()
      var n = list.length
      cols = Math.max(1, Math.ceil(Math.sqrt((n * ch) / cw)))
      var rows = Math.ceil(n / cols)
      s = Math.min(K.k * K.ratio, (S.lensMaxTex - PAD * (cols + 1)) / (cols * cw), (S.lensMaxTex - PAD * (rows + 1)) / (rows * ch))
      aw = Math.ceil(cols * cw * s + PAD * (cols + 1))
      ah = Math.ceil(rows * ch * s + PAD * (rows + 1))
      var font = '500 ' + S.labelSize * s + 'px ' + LABEL_FONT
      var cho = document.fonts ? document.fonts.load('500 ' + S.labelSize + 'px "Geist Mono"') : Promise.resolve()
      Promise.all([cho].concat(list.map(function (t) { return napAnh(t.src) }))).then(function (kq) {
        if (lan !== lanDung) return
        var c2 = document.createElement('canvas')
        c2.width = aw
        c2.height = ah
        var x = c2.getContext('2d')
        list.forEach(function (t, i) {
          var ox = (i % cols) * (cw * s + PAD) + PAD
          var oy = Math.floor(i / cols) * (ch * s + PAD) + PAD
          // Nhãn: hàng cao labelSize, chữ đặt theo baseline như flex baseline.
          x.font = font
          x.fillStyle = S.labelColor
          x.textBaseline = 'alphabetic'
          if ('letterSpacing' in x) x.letterSpacing = -0.06 * S.labelSize * s + 'px'
          var mt = x.measureText('H')
          var asc = mt.fontBoundingBoxAscent || S.labelSize * s * 0.8
          var desc = mt.fontBoundingBoxDescent || S.labelSize * s * 0.2
          var base = oy + (S.labelSize * s - (asc + desc)) / 2 + asc
          x.textAlign = 'left'
          if (t.ten) x.fillText(t.ten.toUpperCase(), ox, base)
          x.textAlign = 'right'
          x.fillText(String(t.so), ox + cw * s, base)
          // Ảnh: object-fit cover vào khung cardW x cardH.
          var iy = oy + (S.labelSize + S.labelGap) * s
          var iw = cw * s
          var ih = S.cardH * s
          x.fillStyle = '#111'
          x.fillRect(ox, iy, iw, ih)
          var im = kq[i + 1]
          if (im) {
            var sc = Math.max(iw / im.naturalWidth, ih / im.naturalHeight)
            var dw = im.naturalWidth * sc
            var dh = im.naturalHeight * sc
            x.save()
            x.beginPath()
            x.rect(ox, iy, iw, ih)
            x.clip()
            x.drawImage(im, ox + (iw - dw) / 2, iy + (ih - dh) / 2, dw, dh)
            x.restore()
          }
        })
        if (K.tex) gl.deleteTexture(K.tex)
        K.tex = gl.createTexture()
        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, K.tex)
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c2)
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
        K.san = true
        hienKinh()
      })
    }

    // Chỉ che DOM khi canvas đã sẵn sàng — không thì hai mép trống trơn.
    function hienKinh() {
      var on = S.lens && K.san
      dai.classList.toggle('is-kinh', on)
      cv.style.display = on ? '' : 'none'
    }

    var mau = [0, 0.6, 1]
    var mauChuoi = ''
    function ve(now, off) {
      if (!S.lens || !K.san) return
      if (S.lensColor !== mauChuoi) {
        mauChuoi = S.lensColor
        mau = rgb(mauChuoi)
      }
      var r = (S.tilt * Math.PI) / 180
      var U2 = U
      gl.uniform2f(U2.uAtlasSize, aw, ah)
      gl.uniform2f(U2.uCell, S.cardW, caoThe())
      gl.uniform1f(U2.uS, s)
      gl.uniform1f(U2.uCols, cols)
      gl.uniform1f(U2.uN, list.length)
      gl.uniform1f(U2.uPad, PAD)
      gl.uniform1f(U2.uCardW, S.cardW)
      gl.uniform1f(U2.uP, S.cardW + S.gap)
      gl.uniform1f(U2.uW0, W0)
      gl.uniform1f(U2.uOff, off)
      gl.uniform2f(U2.uC, 960, K.tamY)
      gl.uniform2f(U2.uRot, Math.cos(r), Math.sin(r))
      gl.uniform1f(U2.uK, K.k)
      gl.uniform1f(U2.uScroll, window.scrollY)
      gl.uniform1f(U2.uTop, K.top)
      gl.uniform1f(U2.uDpr, K.ratio)
      gl.uniform1f(U2.uResY, cv.height)
      gl.uniform2f(U2.uView, K.vw, K.vh)
      gl.uniform1f(U2.uBand, S.lensBand)
      gl.uniform1f(U2.uSoft, Math.max(0, S.lensSoft))
      gl.uniform1f(U2.uCurve, S.lensCurve)
      gl.uniform1f(U2.uSpan, S.lensSpan)
      gl.uniform1f(U2.uZoom, S.lensZoom)
      gl.uniform1f(U2.uSplay, S.lensSplay)
      gl.uniform1f(U2.uDisp, S.lensDispersion)
      gl.uniform1f(U2.uRimWave, S.lensRimWave)
      gl.uniform1f(U2.uWaveT, S.lensWaveSpeed)
      gl.uniform1f(U2.uTime, now / 1000)
      gl.uniform1f(U2.uGlow, S.lensGlow)
      gl.uniform1f(U2.uNova, S.lensNova)
      gl.uniform1f(U2.uRing, S.lensRing)
      gl.uniform1f(U2.uRimLine, S.lensRimLine)
      gl.uniform3f(U2.uRingCol, mau[0], mau[1], mau[2])
      gl.uniform1i(U2.uSamples, S.lensSamples | 0)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, K.tex)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }

    doLai()
    hienKinh()
    return { ve: ve, doLai: doLai, hienKinh: hienKinh }
  }

  function boot() {
    if (!S.enabled) return
    var page = document.querySelector('.kx-page')
    if (!page || page.dataset.page !== 'home') return
    var st = document.createElement('style')
    st.textContent = css()
    document.head.appendChild(st)

    var the = dungThe()
    var list = the.list
    if (!list.length) return
    var dai = el('div', 'kx-ls')
    var xoay = el('div', 'kx-ls__xoay')
    var ray = el('div', 'kx-ls__ray')
    // Một bản sao rộng bấy nhiêu px thiết kế → một vòng mất bấy nhiêu giây.
    function rong() {
      return list.length * (S.cardW + S.gap)
    }
    function thoiLuong() {
      ray.style.setProperty('--kx-ls-dur', Math.max(1, rong() / Math.max(1, S.speed)) + 's')
    }
    thoiLuong()
    list.forEach(function (t) { ray.appendChild(theEl(t, false)) })
    list.forEach(function (t) { ray.appendChild(theEl(t, true)) })
    xoay.appendChild(ray)
    dai.appendChild(xoay)

    var dau = dungDau()
    var neo = q(S.truoc)
    // Toạ độ tính theo .kx-page: chèn thẳng vào .kx-page, đứng TRƯỚC khối chứa
    // node neo để những gì vẽ sau nó (chữ "02.") đè lên dải.
    var truoc = neo
    while (truoc && truoc.parentElement !== page) truoc = truoc.parentElement
    page.insertBefore(dai, truoc || page.firstChild)
    page.insertBefore(dau, truoc || page.firstChild)

    var kinh = dungKinh(page, dai, list)
    var tt = S.info ? dungThongTin(page, the.duAn) : null
    var trongTam = true

    /* Dải đã trượt bao xa (px thiết kế), đọc từ CHÍNH animation CSS — canvas
     * kính và cụm thông tin không bao giờ lệch với DOM. */
    var anim = null
    function daTruot() {
      if (!anim) anim = ray.getAnimations ? ray.getAnimations()[0] : null
      if (!anim) return 0
      var w = rong()
      var dur = Math.max(1, w / Math.max(1, S.speed)) * 1000
      var ct = Number(anim.currentTime) || 0
      var f = (((ct % dur) + dur) % dur) / dur
      if (S.reverse) f = 1 - f
      return f * w
    }

    // Dự án của thẻ đang nằm ở điểm `infoAt` (theo trục dải).
    function duAnTai(off) {
      var r = (S.tilt * Math.PI) / 180
      var lx = ((S.infoAt - 0.5) * 1920) / Math.cos(r)
      var m = lx + W0 / 2 + off
      var P = S.cardW + S.gap
      var i = Math.floor(m / P)
      var n = list.length
      return list[((i % n) + n) % n].duAn
    }

    /* Bảng setting gọi sau mỗi lần đổi số: dựng lại khối CSS (cỡ thẻ, khe,
     * độ nghiêng… đều nằm trong đó), thời lượng một vòng, hàng chữ, và cho
     * kính đo lại (atlas chỉ dựng lại khi cỡ thẻ / nhãn thật sự đổi). */
    api.apDung = function () {
      st.textContent = css()
      thoiLuong()
      anim = null // khối CSS mới = animation CSS mới
      var moi = dungDau()
      dau.parentNode.replaceChild(moi, dau)
      dau = moi
      if (kinh) {
        kinh.doLai()
        kinh.hienKinh()
      }
    }

    // Ngoài màn hình thì dừng animation và thôi vẽ.
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(
        function (es) {
          trongTam = es[0].isIntersecting
          ray.style.animationPlayState = trongTam ? 'running' : 'paused'
        },
        { rootMargin: '200px 0px' }
      ).observe(dai)
    }

    var hen = 0
    addEventListener('resize', function () {
      clearTimeout(hen)
      hen = setTimeout(function () {
        if (kinh) kinh.doLai()
        if (tt) tt.datLai()
      }, 150)
    })
    if (kinh) addEventListener('load', kinh.doLai)
    if (tt) tt.doi(duAnTai(0))

    // Vòng LUÔN SỐNG, ngoài tầm nhìn thì bỏ qua (bài học trong CLAUDE.md).
    // Không cấp phát trong vòng: chỉ đọc số và gán uniform.
    function khung(now) {
      requestAnimationFrame(khung)
      if (!trongTam) return
      var off = daTruot()
      if (kinh) kinh.ve(now, off)
      if (tt && S.info) tt.doi(duAnTai(off))
    }
    requestAnimationFrame(khung)
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true })
  else boot()
})()
