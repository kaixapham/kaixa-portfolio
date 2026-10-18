/* =============================================================================
 * kaixa Portfolio — Trình chỉnh tư thế CD 3D theo cuộn, cho từng viewport
 * -----------------------------------------------------------------------------
 * Bấm `K` trên trang Home để bật/tắt (H ở Home là bảng setting chung kx-panel.js).
 *
 * Máy CD neo vào viewport nên nó sống suốt từ đầu trang tới cuối trang; tư thế
 * của nó đi theo một DÃY MỐC: cuộn tới đâu thì ở tư thế đó, giữa hai mốc thì
 * nội suy. Bảng này để dựng cái dãy đó.
 *
 * Có BỘ GIZMO vẽ thẳng lên vật thể, kiểu tool 3D: ba chế độ
 *   G — di chuyển (mũi tên X đỏ / Y lục, hoặc kéo giữa để tự do)
 *   R — xoay      (ba vòng: Z xanh dương, Y lục, X đỏ)
 *   S — phóng     (bốn góc đổi cỡ ô vẽ, thanh phải đổi khoảng cách camera)
 * Giữ Shift khi kéo để bắt nấc (xoay 15°, dời 10px).
 *
 * Đây là file LÀM VIỆC, không phải hiệu ứng: bàn giao thì xoá đúng một thẻ
 * script `kx-cd3d-builder.js` trong `tools/figma-to-html.mjs`, y như lệ của
 * `kx-devtools.js` ở trang contact. `kx-cd3d.js` không hề biết file này tồn
 * tại — mọi trao đổi đi qua `window.KX_CD3D`.
 *
 * MỌI LUẬT CSS PHẢI CÓ TIỀN TỐ `.kx-cdb` / `.kx-cdg`. `assets/css/kx-site.css`
 * có bản reset kiểu Tailwind preflight (button nền trong suốt, viền 0) nên
 * luật trần sẽ bị nó xoá mất viền và nền — đúng cái bẫy đã vấp với `.kx-bm`.
 * ========================================================================== */
(function () {
  'use strict'

  var CONFIG = {
    enabled: true,
    // phím bật/tắt bảng — K (người dùng chốt): H ở Home nhường cho bảng setting
    // chung kx-panel.js (mục Loop Strip).
    phim: 'k',
    moSan: false, // true = vào trang là bảng đã mở
    nhayXoay: 0.45, // độ xoay trên mỗi px kéo (vòng X và Y)
    nacXoay: 15, // giữ Shift: bắt nấc bấy nhiêu độ
    nacDoi: 10, // giữ Shift: bắt nấc bấy nhiêu px thiết kế
    // KHỐI = MỘT MÀN (người dùng chốt): mỗi mục 'selector|nhãn' là một khối nội
    // dung phải nằm trọn trong một màn — màn bắt đầu cách đỉnh khối `manLe`
    // px thiết kế. Các màn khác vẫn chia đều theo cao cửa sổ quanh các neo này.
    //   .kx-ls-dau = hàng chữ đầu cụm "02." (dải ảnh nghiêng + số lớn + hàng
    //   thông tin dưới) — cả cụm cao ~940 px thiết kế, lọt một màn.
    manNeo: '.kx-ls-dau|02.',
    manLe: 24,
  }

  // Các ô số của một mốc. `nhan` là chữ hiện trên bảng.
  var O = [
    { key: 'at', nhan: 'Cuộn tới (0–1)', buoc: 0.01, min: 0, max: 1 },
    { key: 'w', nhan: 'Cạnh ô vẽ', buoc: 10, min: 200, max: 2000 },
    { key: 'x', nhan: 'Trái (x)', buoc: 5, min: -1200, max: 2400 },
    { key: 'y', nhan: 'Trên (y)', buoc: 5, min: -1200, max: 1600 },
    { key: 'dist', nhan: 'Camera lùi', buoc: 0.5, min: 6, max: 90 },
    { key: 'rotX', nhan: 'Ngả trước/sau', buoc: 1, min: -180, max: 180 },
    { key: 'rotY', nhan: 'Xoay dọc (90=cạnh)', buoc: 1, min: -180, max: 180 },
    { key: 'rotZ', nhan: 'Nghiêng trong mặt phẳng', buoc: 1, min: -180, max: 180 },
  ]

  var MAU = { x: '#ff5b5b', y: '#5bff8f', z: '#5b9bff' }

  var CSS = [
    '.kx-cdb{position:fixed;right:16px;top:16px;z-index:9999;width:282px;',
    '  background:#0b0b0c;border:1px solid #2a2a2c;border-radius:8px;padding:12px;',
    '  font-family:"Geist Mono",ui-monospace,monospace;font-size:11px;color:#e8e8e8;',
    '  box-shadow:0 10px 40px rgba(0,0,0,.6);user-select:none;max-height:94vh;overflow:auto}',
    '.kx-cdb[hidden]{display:none}',
    '.kx-cdb h4{margin:0 0 2px;font-size:11px;font-weight:500;letter-spacing:.02em;text-transform:uppercase}',
    '.kx-cdb .kx-cdb__hint{margin:0 0 9px;color:#6f6f73;font-size:10px;line-height:1.45}',
    '.kx-cdb__vps,.kx-cdb__modes{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;margin-bottom:9px}',
    '.kx-cdb__goc{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin-bottom:9px}',
    '.kx-cdb__goc button{padding:5px 2px;font-size:10px}',
    '.kx-cdb__moc{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:9px}',
    '.kx-cdb__moc button{min-width:30px;position:relative}',
    // Màn đã có mốc: chấm nhỏ góc trên phải. Màn đang đứng: viền xanh (is-now).
    '.kx-cdb__moc button.co-moc::after{content:"";position:absolute;top:3px;right:3px;width:4px;height:4px;border-radius:50%;background:#4a7dff}',
    '.kx-cdb__moc button.is-on.co-moc::after{background:#0b0b0c}',
    '.kx-cdb .kx-cdb__moc-ten{width:100%;margin:0 0 2px;color:#6f6f73;font-size:10px}',
    // Đường kẻ chia MÀN trên trang — xanh neon, chỉ hiện khi bảng mở.
    '.kx-cdb-man{position:absolute;left:0;top:0;width:100%;pointer-events:none;z-index:2147482000}',
    '.kx-cdb-man[hidden]{display:none}',
    '.kx-cdb-man__ke{position:absolute;left:0;right:0;height:0;border-top:1px solid #39ff14;',
    '  box-shadow:0 0 6px 1px rgba(57,255,20,.75),0 0 18px 2px rgba(57,255,20,.35)}',
    '.kx-cdb-man__so{position:absolute;left:8px;top:4px;padding:2px 6px;border-radius:3px;',
    '  font:500 11px/1.2 "Geist Mono",ui-monospace,monospace;letter-spacing:.04em;color:#0b0b0c;background:#39ff14;',
    '  box-shadow:0 0 10px rgba(57,255,20,.8)}',
    '.kx-cdb button{font:inherit;color:#bdbdc2;background:#151517;border:1px solid #2a2a2c;',
    '  border-radius:4px;padding:5px 4px;cursor:pointer;line-height:1.1;text-align:center}',
    '.kx-cdb button:hover{color:#fff;border-color:#3d3d41}',
    '.kx-cdb button.is-on{background:#fff;color:#0b0b0c;border-color:#fff}',
    '.kx-cdb .kx-cdb__cong{margin-bottom:9px}',
    '.kx-cdb .kx-cdb__cong button{width:100%;padding:7px 6px;text-align:left;text-transform:uppercase;letter-spacing:.03em}',
    '.kx-cdb .kx-cdb__cong .kx-cdb__note{margin-top:4px}',
    '.kx-cdb button.is-now{box-shadow:inset 0 0 0 1px #4a7dff}',
    '.kx-cdb__row{display:flex;align-items:center;gap:6px;margin-bottom:5px}',
    '.kx-cdb__row label{flex:1;color:#8e8e94}',
    '.kx-cdb__row input{width:78px;font:inherit;color:#fff;background:#151517;',
    '  border:1px solid #2a2a2c;border-radius:4px;padding:4px 6px;text-align:right}',
    '.kx-cdb__row input:focus{outline:none;border-color:#4a7dff}',
    '.kx-cdb__acts{display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-top:9px}',
    '.kx-cdb__acts button{padding:6px 4px}',
    '.kx-cdb__note{margin:8px 0 0;color:#6f6f73;font-size:10px;line-height:1.45}',
    '.kx-cdb__note b{color:#9a9aa0;font-weight:500}',
    '.kx-cdb__out{width:100%;height:84px;margin-top:8px;font:inherit;font-size:10px;',
    '  color:#9a9aa0;background:#151517;border:1px solid #2a2a2c;border-radius:4px;',
    '  padding:6px;resize:vertical}',
    /* ------------------------------------------------------------- gizmo */
    '.kx-cdg{position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none}',
    '.kx-cdg [data-tay]{pointer-events:auto;cursor:grab}',
    '.kx-cdg [data-tay]:active{cursor:grabbing}',
    '.kx-cdg .kx-cdg__vong{fill:none;stroke-width:1.6;pointer-events:stroke;opacity:.75}',
    '.kx-cdg .kx-cdg__vong[data-tay]{stroke-width:1.6}',
    '.kx-cdg .kx-cdg__bat{fill:none;stroke:transparent;stroke-width:5;pointer-events:stroke}',
    '.kx-cdg .kx-cdg__vong:hover,.kx-cdg .kx-cdg__vong.is-keo{opacity:1;stroke-width:2.6}',
    '.kx-cdg .kx-cdg__goc{fill:#0b0b0c;stroke:#fff;stroke-width:1.4}',
    '.kx-cdg .kx-cdg__goc:hover{fill:#fff}',
    '.kx-cdg .kx-cdg__than{stroke-width:1.6}',
    '.kx-cdg .kx-cdg__giua{fill:rgba(255,255,255,.14);stroke:#fff;stroke-width:1.2}',
    '.kx-cdg .kx-cdg__giua:hover{fill:rgba(255,255,255,.3)}',
    '.kx-cdg text{font-family:"Geist Mono",monospace;font-size:4px;fill:#fff;opacity:.8}',
    '.kx-cdg .kx-cdg__khung{fill:none;stroke:rgba(255,255,255,.22);stroke-width:1;',
    '  stroke-dasharray:3 3}',
  ].join('\n')

  var cd = null // window.KX_CD3D
  var bang = null
  var vpDangSua = null // key viewport đang chỉnh
  var day = [] // dãy mốc đang dựng (bản nháp)
  var iMoc = 0 // mốc đang chỉnh
  var oInput = {}
  var nutVp = {}
  var nutCheDo = {}
  var hangMoc = null
  var note = null
  var bao = null
  var oOut = null
  var svg = null
  var cheDo = 'move' // 'move' | 'rotate' | 'scale'

  function el(tag, cls, chu) {
    var e = document.createElement(tag)
    if (cls) e.className = cls
    if (chu != null) e.textContent = chu
    return e
  }

  function svgEl(tag, attrs) {
    var e = document.createElementNS('http://www.w3.org/2000/svg', tag)
    for (var k in attrs) e.setAttribute(k, attrs[k])
    return e
  }

  function kep(v, o) {
    return Math.min(o.max, Math.max(o.min, v))
  }

  var oTheo = {}
  O.forEach(function (o) {
    oTheo[o.key] = o
  })

  /* ------------------------------------------------- preset góc nhìn
   * Chép đúng dock "Góc nhìn" của tool. Nhưng tool XOAY CAMERA quanh máy, còn
   * ở đây camera đứng yên trên trục +Z và ta xoay CHÍNH CHIẾC MÁY. Quy đổi:
   *
   *   d = |vị trí camera|                        -> dist
   *   θ = atan2(P.x, P.z)   (phương vị)          -> rotY = -θ
   *   φ = asin(P.y / d)     (góc nâng)           -> rotX = +φ
   *
   * Kiểm lại dấu: camera dời sang +X thì thấy sườn PHẢI của máy; với camera
   * đứng yên, xoay máy quanh Y một góc -90° sẽ đưa mặt +X của nó về phía +Z,
   * tức về phía người xem — khớp. Tương tự camera lên cao (+Y) thì thấy mặt
   * TRÊN, và xoay máy quanh X một góc dương cũng đưa mặt +Y về phía +Z.
   *
   * `Cận` là trường hợp KHÔNG quy đổi được: ở tool nó ngắm lệch vào cụm núm
   * (camera và target đều dời), còn camera ở đây luôn ngắm vào tâm. Nên nó chỉ
   * là "chính diện, lại gần" — đánh dấu ~ cho khỏi tưởng là chép y nguyên.
   */
  var GOC = [
    { ten: 'Chính diện', P: [0, 0, 2.72], theo: 'span' },
    { ten: 'Góc 3/4', P: [-1.3, 0.45, 2.34], theo: 'span' },
    { ten: 'Cận ~', P: [0, 0, 1.35], theo: 'span' },
    { ten: 'Nằm', P: [-0.72, 0.509, 1.81], theo: 'W', ngaThem: -90 },
    { ten: 'Trái', P: [-2.55, 0, 0.001], theo: 'H' },
    { ten: 'Phải', P: [2.55, 0, 0.001], theo: 'H' },
    { ten: 'Trên', P: [0, 2.3, 0.001], theo: 'W' },
    { ten: 'Dưới', P: [0, -2.3, 0.001], theo: 'W' },
  ]

  var coMay = null // {W, H, span} đo một lần từ chính khối máy

  function doMay() {
    if (coMay) return coMay
    var T = cd.THREE
    var dev = cd.built && cd.built.deck && cd.built.deck.device
    if (!dev) return null
    // Đo khi máy ở góc 0 — hộp bao của vật ĐÃ XOAY thì to hơn thân thật.
    var gx = dev.rotation.x, gy = dev.rotation.y, gz = dev.rotation.z
    dev.rotation.set(0, 0, 0)
    dev.updateMatrixWorld(true)
    var h = new T.Box3().setFromObject(dev)
    var c = h.getSize(new T.Vector3())
    dev.rotation.set(gx, gy, gz)
    dev.updateMatrixWorld(true)
    coMay = { W: c.x, H: c.y, span: Math.max(c.x, c.y) }
    return coMay
  }

  function datGoc(g) {
    var m = day[iMoc]
    var k = doMay()
    if (!m || !k) return
    var don = k[g.theo]
    var P = [g.P[0] * don, g.P[1] * don, g.P[2] * don]
    var d = Math.sqrt(P[0] * P[0] + P[1] * P[1] + P[2] * P[2])
    var theta = (Math.atan2(P[0], P[2]) * 180) / Math.PI
    var phi = (Math.asin(P[1] / (d || 1)) * 180) / Math.PI
    m.rotY = Math.round(-theta)
    m.rotX = Math.round(phi + (g.ngaThem || 0))
    m.rotZ = 0
    m.dist = Math.round(d * 10) / 10
    apNgay()
    veLaiO()
    nhay(g.ten + ' → rotX ' + m.rotX + '°, rotY ' + m.rotY + '°, lùi ' + m.dist)
  }

  function vpHienTai() {
    return cd.chonVp(window.innerWidth).key
  }

  /* px thiết kế → px màn hình. Đo lúc bắt đầu kéo rồi giữ nguyên suốt cú kéo,
   * không đo mỗi lần pointermove. */
  function tyLe() {
    return cd.page.getBoundingClientRect().width / 1920
  }

  /* -------------------------------------------------------------- vẽ lại */

  function veLaiVp() {
    var now = vpHienTai()
    Object.keys(nutVp).forEach(function (k) {
      nutVp[k].classList.toggle('is-on', k === vpDangSua)
      nutVp[k].classList.toggle('is-now', k === now)
    })
  }

  function veLaiCheDo() {
    Object.keys(nutCheDo).forEach(function (k) {
      nutCheDo[k].classList.toggle('is-on', k === cheDo)
    })
    if (svg) veGizmo()
  }

  /* ------------------------------------------------- MÀN 1…N (người dùng chốt)
   * Trang Home chia thành từng MÀN cao đúng một viewport, đánh số từ 1 tới
   * footer. Bấm số nào: trang nhảy tới màn đó, mốc của màn đó được chọn (chưa
   * có thì sinh ra ngay với tư thế ĐANG NỘI SUY ở đó — nên không có cú nhảy
   * nào), máy hiện đúng tư thế ở đó để chỉnh. Bản cũ bắt tự cuộn rồi bấm
   * "+ Mốc ở đây", số trên nút là thứ tự mốc chứ không phải vị trí — khó hiểu.
   * Màn k bắt đầu ở (k−1)·cao cửa sổ; màn cuối luôn là ĐÁY trang (footer). Mốc
   * thuộc màn gần nó nhất, trong phạm vi nửa màn. */
  var banMan = null // đệm — đo lại lúc mở bảng, đổi cỡ, chọn màn; KHÔNG mỗi lần cuộn
  function cacMan(doLai) {
    if (banMan && !doLai) return banMan
    var vh = window.innerHeight
    var tran = Math.max(1, document.documentElement.scrollHeight - vh)
    var k = tyLe()
    // Neo: đỉnh khối trong trang, trừ lề — đo một lần ở đây.
    var neo = []
    String(CONFIG.manNeo || '').split(',').forEach(function (muc) {
      var p = muc.split('|')
      var e = p[0] && document.querySelector(p[0].trim())
      if (!e) return
      var y = Math.round(e.getBoundingClientRect().top + window.scrollY - (CONFIG.manLe || 0) * k)
      if (y > 0 && y < tran) neo.push({ y: y, ten: (p[1] || '').trim() })
    })
    neo.sort(function (a, b) {
      return a.y - b.y
    })
    // Chia đều theo cao cửa sổ; tới gần một neo (còn dưới nửa màn) thì nhường
    // chỗ cho neo, rồi chia tiếp từ hết màn neo trở đi.
    var ra = []
    var cur = 0
    neo.forEach(function (n) {
      while (cur + vh * 0.5 <= n.y) {
        ra.push({ y: cur })
        cur += vh
      }
      ra.push({ y: n.y, ten: n.ten })
      cur = n.y + vh
    })
    while (cur < tran - vh * 0.25) {
      ra.push({ y: cur })
      cur += vh
    }
    ra.push({ y: tran, cuoi: true })
    banMan = ra.map(function (m) {
      return { y: m.y, ten: m.ten || '', cuoi: !!m.cuoi, at: +(m.y / tran).toFixed(3), nua: vh / 2 / tran }
    })
    return banMan
  }

  /* Đường kẻ chia màn (người dùng chốt: xanh neon khi bật edit). Một lớp
   * `position: absolute` treo vào <body>, cao bằng cả trang, mỗi màn một đường
   * ở đúng `y` của màn kèm nhãn số — trùng số trên hàng nút. Dựng lại khi mở
   * bảng và khi đổi cỡ cửa sổ; không vẽ gì mỗi khung. */
  var lopMan = null
  function veDuongMan() {
    if (!lopMan) {
      lopMan = el('div', 'kx-cdb-man')
      lopMan.setAttribute('aria-hidden', 'true')
      document.body.appendChild(lopMan)
    }
    lopMan.textContent = ''
    lopMan.style.height = document.documentElement.scrollHeight + 'px'
    var ds = cacMan(true)
    ds.forEach(function (man, k) {
      var ke = el('div', 'kx-cdb-man__ke')
      ke.style.top = man.y + 'px'
      ke.appendChild(el('span', 'kx-cdb-man__so', 'MÀN ' + (k + 1) + (man.ten ? ' · ' + man.ten : '') + (man.cuoi ? ' · FOOTER' : '')))
      lopMan.appendChild(ke)
    })
  }

  // Mốc (chỉ số trong `day`) của màn thứ k, hoặc -1. Mỗi mốc thuộc ĐÚNG MỘT
  // màn — màn gần nó nhất (màn cuối = footer có thể chỉ cách màn trước nửa
  // màn hình; xét "trong nửa màn" thôi thì một mốc ở đáy bị tính cho cả hai).
  function mocCuaMan(ds, k) {
    var tot = -1
    var lech = Infinity
    day.forEach(function (m, i) {
      var gan = 0
      for (var j = 1; j < ds.length; j++) {
        if (Math.abs(ds[j].at - m.at) < Math.abs(ds[gan].at - m.at)) gan = j
      }
      if (gan !== k) return
      var d = Math.abs(m.at - ds[k].at)
      if (d <= ds[k].nua && d < lech) {
        lech = d
        tot = i
      }
    })
    return tot
  }

  // Màn đang đứng (theo vị trí cuộn thật).
  function manHienTai(ds) {
    var y = window.scrollY
    var k = 0
    ds.forEach(function (m, i) {
      if (Math.abs(m.y - y) < Math.abs(ds[k].y - y)) k = i
    })
    return k
  }

  function veLaiHangMoc() {
    hangMoc.textContent = ''
    hangMoc.appendChild(el('p', 'kx-cdb__moc-ten', 'Màn (1 = đầu trang, cuối = footer) — chấm xanh = có mốc'))
    var ds = cacMan(true)
    var now = manHienTai(ds)
    var mocChon = day[iMoc]
    ds.forEach(function (man, k) {
      var i = mocCuaMan(ds, k)
      var b = el('button', null, String(k + 1))
      b.type = 'button'
      b.title = 'Màn ' + (k + 1) + (man.ten ? ' (' + man.ten + ')' : '') + ' — cuộn ' + man.at + (i >= 0 ? ' (có mốc ở ' + day[i].at + ')' : ' (chưa có mốc)')
      b.classList.toggle('co-moc', i >= 0)
      b.classList.toggle('is-on', i >= 0 && day[i] === mocChon)
      b.classList.toggle('is-now', k === now)
      b.addEventListener('click', function () {
        chonMan(k)
      })
      hangMoc.appendChild(b)
    })
    var xoa = el('button', null, '− Xoá mốc')
    xoa.type = 'button'
    xoa.title = 'Xoá mốc đang chọn — máy về nội suy giữa hai mốc kề bên'
    xoa.style.flex = '1'
    xoa.addEventListener('click', xoaMoc)
    hangMoc.appendChild(xoa)
  }

  // Nhảy thẳng (không trôi) rồi báo kx-smooth-scroll.js đồng bộ đích NGAY —
  // không thì vòng lerp của nó (đang chạy dở sau một nhát lăn) kéo trang ngược
  // về chỗ cũ.
  function cuonToi(y) {
    window.scrollTo(0, y)
    if (window.KX_SMOOTH_SCROLL && window.KX_SMOOTH_SCROLL.dongBo) window.KX_SMOOTH_SCROLL.dongBo()
  }

  function chonMan(k) {
    var ds = cacMan()
    var man = ds[k]
    if (!man) return
    cuonToi(man.y)
    var i = mocCuaMan(ds, k)
    if (i >= 0) {
      chonMoc(i)
      nhay('Màn ' + (k + 1) + ' — mốc ở ' + day[i].at)
      return
    }
    // Chưa có mốc: sinh ra với tư thế đang nội suy ở đúng chỗ này.
    var tw = cd.tuTheTai(day, man.at)
    var m = Object.assign({}, tw, { at: man.at })
    day.push(m)
    day.sort(function (a, b) {
      return a.at - b.at
    })
    chonMoc(day.indexOf(m))
    nhay('Màn ' + (k + 1) + ' — tạo mốc mới ở ' + man.at + ' (chỉnh rồi bấm Lưu)')
  }

  function veLaiO() {
    var m = day[iMoc]
    if (!m) return
    O.forEach(function (o) {
      if (document.activeElement !== oInput[o.key]) {
        var v = m[o.key]
        oInput[o.key].value = v == null ? 0 : Math.round(v * 1000) / 1000
      }
    })
  }

  function veLaiNote() {
    var now = vpHienTai()
    var lech = now !== vpDangSua
    var m = day[iMoc]
    note.innerHTML =
      '<b>Cửa sổ:</b> ' +
      window.innerWidth +
      'px → ' +
      now +
      '<br><b>Cuộn hiện tại:</b> ' +
      cd.tienDo().toFixed(3) +
      ' — màn ' + (manHienTai(cacMan()) + 1) +
      (m ? '<br><b>Đang chỉnh mốc ở:</b> ' + m.at : '') +
      '<br><b>Gizmo:</b> G di chuyển · R xoay · S phóng · Shift bắt nấc' +
      (lech
        ? '<br><b style="color:#d8a24a">Đang chỉnh ' +
          vpDangSua +
          '</b>, không phải viewport hiện tại.'
        : '')
  }

  /* ------------------------------------------------------------- thao tác */

  /* Áp mốc đang chỉnh lên trang để xem ngay (ép tư thế, không theo cuộn nữa). */
  function apNgay() {
    var m = day[iMoc]
    if (!m) return
    cd.deTay(Object.assign({}, m))
    cd.datDay(day)
  }

  /* Gõ số trong bảng → vào mốc. */
  function tuO() {
    var m = day[iMoc]
    if (!m) return
    O.forEach(function (o) {
      var v = parseFloat(oInput[o.key].value)
      if (!isNaN(v)) m[o.key] = kep(v, o)
    })
    apNgay()
    veLaiNote()
  }

  /* Gizmo → vào mốc. */
  function dat(key, giaTri) {
    var m = day[iMoc]
    if (!m) return
    m[key] = kep(giaTri, oTheo[key])
    apNgay()
    veLaiO()
  }

  function chonMoc(i) {
    iMoc = Math.min(day.length - 1, Math.max(0, i))
    veLaiHangMoc()
    veLaiO()
    apNgay()
    veLaiNote()
  }

  function xoaMoc() {
    if (day.length <= 2) {
      nhay('Phải còn ít nhất 2 mốc')
      return
    }
    day.splice(iMoc, 1)
    iMoc = Math.max(0, iMoc - 1)
    veLaiHangMoc()
    veLaiO()
    apNgay()
    veLaiNote()
    nhay('Đã xoá mốc')
  }

  function luu() {
    cd.luu(vpDangSua, day)
    xuatJson()
    nhay('Đã lưu ' + vpDangSua + ' (' + day.length + ' mốc)')
  }

  function ve() {
    cd.xoaLuu(vpDangSua)
    day = cd.dayMoc(vpDangSua)
    iMoc = 0
    veLaiHangMoc()
    veLaiO()
    apNgay()
    xuatJson()
    nhay('Đã trả ' + vpDangSua + ' về mặc định')
  }

  function xuatJson() {
    // In ra đúng dạng một mục của MOC trong kx-cd3d.js, chép thẳng vào file là
    // bản clone mới cũng chạy đúng dãy này.
    var luuTat = cd.docLuu()
    var ra = []
    cd.viewports.forEach(function (v) {
      var d = luuTat[v.key]
      if (!d || !d.length) return
      ra.push(
        '  ' +
          v.key +
          ': [\n' +
          d
            .map(function (m) {
              return (
                '    { at: ' + m.at + ', w: ' + Math.round(m.w) + ', x: ' + Math.round(m.x) +
                ', y: ' + Math.round(m.y) + ', dist: ' + (Math.round(m.dist * 10) / 10) +
                ', rotX: ' + Math.round(m.rotX) + ', rotY: ' + Math.round(m.rotY) +
                ', rotZ: ' + Math.round(m.rotZ) + ' },'
              )
            })
            .join('\n') +
          '\n  ],'
      )
    })
    oOut.value = ra.length ? 'const MOC = {\n' + ra.join('\n') + '\n}' : '(chưa lưu dãy nào)'
  }

  function nhay(chu) {
    bao.textContent = chu
    clearTimeout(nhay._t)
    nhay._t = setTimeout(function () {
      bao.textContent = ''
    }, 1800)
  }

  /* ===================================================== GIZMO trên vật thể
   * Vẽ bằng SVG đặt chồng đúng lên ô vẽ. Ô vẽ LUÔN VUÔNG nên viewBox
   * `0 0 100 100` không méo, vòng tròn vẫn tròn.
   *
   * Vì sao KHÔNG dùng `TransformControls` của three: nó dịch/xoay một vật thể
   * trong KHÔNG GIAN 3D, trong khi ở đây "vị trí" lại là vị trí CSS của ô vẽ
   * trên trang (x/y px thiết kế) và "cỡ" là cạnh ô vẽ. Gắn TransformControls
   * vào vẫn chạy nhưng nó sẽ chỉnh một bộ số khác hẳn bộ mà `MOC` lưu — lệch
   * mô hình, rồi phải viết cầu nối hai chiều. Vẽ thẳng cái cần chỉnh thì khớp
   * một-một và không thêm file addon nào.
   */

  var vong = null // ba vòng xoay 3D đang vẽ

  /* Toạ độ của một điểm thế giới, quy về hệ 0..100 của viewBox. */
  function chieu(v) {
    var p = v.project(cd.camera)
    return { x: (p.x * 0.5 + 0.5) * 100, y: (-p.y * 0.5 + 0.5) * 100 }
  }

  /* Chiếu lại ba vòng theo tư thế HIỆN TẠI của máy. Gọi mỗi khung lúc bảng mở
   * ở chế độ xoay — 3 vòng x 48 điểm, rẻ hơn nhiều so với một lần layout. */
  function capNhatVong() {
    if (!vong || cheDo !== 'rotate') return
    var T = cd.THREE
    var dev = cd.built && cd.built.deck && cd.built.deck.device
    var k = doMay()
    if (!dev || !k) return
    var R = k.span * 0.62
    var N = 48
    ;['rotX', 'rotY', 'rotZ'].forEach(function (truc) {
      var v = vong[truc]
      var ds = []
      for (var i = 0; i <= N; i++) {
        var t = (i / N) * Math.PI * 2
        var c = Math.cos(t) * R
        var s2 = Math.sin(t) * R
        // Vòng của trục nào thì nằm trong mặt phẳng vuông góc với trục đó.
        var p =
          truc === 'rotX'
            ? new T.Vector3(0, c, s2)
            : truc === 'rotY'
              ? new T.Vector3(c, 0, s2)
              : new T.Vector3(c, s2, 0)
        p.applyMatrix4(dev.matrixWorld)
        ds.push(chieu(p))
      }
      v.diem = ds
      var str = ds
        .map(function (d) {
          return d.x.toFixed(2) + ',' + d.y.toFixed(2)
        })
        .join(' ')
      v.net.setAttribute('points', str)
      v.bat.setAttribute('points', str)
      // Nhãn đặt ở điểm xa tâm nhất, cho khỏi chồng lên nhau.
      var xa = ds[0]
      var d2 = -1
      ds.forEach(function (d) {
        var q = (d.x - 50) * (d.x - 50) + (d.y - 50) * (d.y - 50)
        if (q > d2) {
          d2 = q
          xa = d
        }
      })
      v.chu.setAttribute('x', xa.x.toFixed(1))
      v.chu.setAttribute('y', xa.y.toFixed(1))
    })
  }

  function veGizmo() {
    svg.textContent = ''
    // khung ô vẽ, để thấy biên
    svg.appendChild(svgEl('rect', { class: 'kx-cdg__khung', x: 0.5, y: 0.5, width: 99, height: 99 }))

    if (cheDo === 'move') {
      // ô giữa: kéo tự do
      svg.appendChild(
        gan(svgEl('rect', { class: 'kx-cdg__giua', x: 42, y: 42, width: 16, height: 16, rx: 2 }), 'tuDo')
      )
      // mũi tên X (đỏ) và Y (lục)
      svg.appendChild(gan(svgEl('line', { class: 'kx-cdg__than', x1: 58, y1: 50, x2: 88, y2: 50, stroke: MAU.x }), 'x'))
      svg.appendChild(gan(svgEl('polygon', { points: '88,46 96,50 88,54', fill: MAU.x }), 'x'))
      svg.appendChild(gan(svgEl('line', { class: 'kx-cdg__than', x1: 50, y1: 58, x2: 50, y2: 88, stroke: MAU.y }), 'y'))
      svg.appendChild(gan(svgEl('polygon', { points: '46,88 50,96 54,88', fill: MAU.y }), 'y'))
      nhan(90, 44, 'X', MAU.x)
      nhan(53, 95, 'Y', MAU.y)
    } else if (cheDo === 'rotate') {
      /* Ba vòng là VÒNG TRÒN 3D THẬT, chiếu qua camera mỗi khung nên chúng
       * nghiêng theo đúng hướng của máy — giống gizmo xoay của tool 3D.
       *
       * Bản đầu vẽ ba ellipse SVG cố định trong không gian màn hình. Máy xoay
       * thì vòng đứng im, thành ra vòng chỉ SAI trục và kéo chỉ còn là đoán.
       * Đây từng là lỗi thật. */
      vong = {}
      ;[['rotX', MAU.x], ['rotY', MAU.y], ['rotZ', MAU.z]].forEach(function (p) {
        var net = svgEl('polyline', { class: 'kx-cdg__vong', stroke: p[1], points: '' })
        var bat = svgEl('polyline', { class: 'kx-cdg__bat', points: '' })
        bat.setAttribute('data-tay', p[0])
        bat.__net = net
        svg.appendChild(net)
        svg.appendChild(bat)
        var chu = svgEl('text', { fill: p[1], 'text-anchor': 'middle' })
        chu.textContent = p[0].slice(-1)
        svg.appendChild(chu)
        vong[p[0]] = { net: net, bat: bat, chu: chu, diem: [] }
      })
      capNhatVong()
    } else {
      // bốn góc: đổi cạnh ô vẽ
      ;[[12, 12], [88, 12], [12, 88], [88, 88]].forEach(function (p) {
        svg.appendChild(
          gan(svgEl('rect', { class: 'kx-cdg__goc', x: p[0] - 3, y: p[1] - 3, width: 6, height: 6, rx: 1 }), 'w')
        )
      })
      svg.appendChild(svgEl('rect', { class: 'kx-cdg__khung', x: 12, y: 12, width: 76, height: 76 }))
      // thanh phải: khoảng cách camera
      svg.appendChild(svgEl('line', { class: 'kx-cdg__than', x1: 96, y1: 28, x2: 96, y2: 72, stroke: MAU.z, opacity: 0.5 }))
      svg.appendChild(
        gan(svgEl('rect', { class: 'kx-cdg__goc', x: 93, y: 47, width: 6, height: 6, rx: 1 }), 'dist')
      )
      nhan(50, 8, 'CỠ Ô VẼ', '#fff')
      nhan(96, 24, 'CAM', MAU.z)
    }
  }

  function nhan(x, y, chu, mau) {
    var t = svgEl('text', { x: x, y: y, fill: mau, 'text-anchor': 'middle' })
    t.textContent = chu
    svg.appendChild(t)
  }

  function gan(e, truc) {
    e.setAttribute('data-tay', truc)
    return e
  }

  /* Vòng xoay: một nét MẢNH để nhìn, cộng một nét TRONG SUỐT DÀY chồng lên để
   * bắt chuột. Không có nét dày thì phải rê trúng đúng 1.6px, gần như không
   * bấm được. */
  function them(net, truc, bat) {
    svg.appendChild(net)
    bat.setAttribute('data-tay', truc)
    bat.__net = net
    svg.appendChild(bat)
  }

  /* Kéo một vòng = xoay máy quanh ĐÚNG trục của vòng đó (trục của chính máy,
   * vì vòng vẽ theo matrixWorld của máy), rồi đổi ngược ra ba góc Euler để
   * lưu. Bản đầu cộng thẳng vào MỘT góc Euler — mà Euler 'XYZ' ở rotY = ±90°
   * thì trục X và Z trùng nhau (khoá gimbal): kéo vòng đỏ hay vòng xanh dương
   * xoay y hệt nhau, đúng tư thế "nhìn cạnh" người dùng hay chỉnh. Đây từng
   * là lỗi thật.
   * Một hướng có HAI bộ Euler tương đương (x, y, z) và (x+180, 180−y, z+180):
   * chọn bộ gần góc lúc bắt đầu kéo nhất, không thì máy lật vòng khi nội suy
   * giữa hai mốc. */
  function xoayQuanhTruc(tay, goc, dau) {
    var T = cd.THREE
    var d2r = Math.PI / 180
    var q = new T.Quaternion().setFromEuler(new T.Euler(dau.rotX * d2r, dau.rotY * d2r, dau.rotZ * d2r, 'XYZ'))
    var truc = tay === 'rotX' ? new T.Vector3(1, 0, 0) : tay === 'rotY' ? new T.Vector3(0, 1, 0) : new T.Vector3(0, 0, 1)
    // Vòng Y vẽ theo chiều X→Z — NGƯỢC chiều dương quanh Y (bàn tay phải:
    // Z→X). Vòng X (Y→Z) và vòng Z (X→Y) thì cùng chiều dương. Đảo dấu vòng Y
    // để kéo dọc vòng nào thì máy cũng trôi theo tay.
    if (tay === 'rotY') goc = -goc
    q.multiply(new T.Quaternion().setFromAxisAngle(truc, goc * d2r))
    var e = new T.Euler().setFromQuaternion(q, 'XYZ')
    var vong = function (v) {
      v = ((v + 180) % 360 + 360) % 360 - 180
      return v === -180 ? 180 : v
    }
    var a = [e.x / d2r, e.y / d2r, e.z / d2r].map(vong)
    var b = [vong(a[0] + 180), vong(180 - a[1]), vong(a[2] + 180)]
    var goc0 = [dau.rotX, dau.rotY, dau.rotZ]
    var lech = function (v) {
      var t = 0
      for (var i = 0; i < 3; i++) t += Math.abs(vong(v[i] - goc0[i]))
      return t
    }
    var tot = lech(a) <= lech(b) ? a : b
    // Giữ liền mạch với góc cũ (không nhảy 359 → -1) khi còn trong ±180.
    tot = tot.map(function (v, i) {
      var g = goc0[i] + vong(v - goc0[i])
      return Math.abs(g) <= 180 ? g : v
    })
    var m = day[iMoc]
    if (!m) return
    m.rotX = Math.round(tot[0] * 10) / 10
    m.rotY = Math.round(tot[1] * 10) / 10
    m.rotZ = Math.round(tot[2] * 10) / 10
    apNgay()
    veLaiO()
  }

  function batGizmo() {
    var keo = null

    svg.addEventListener('pointerdown', function (e) {
      var tay = e.target.getAttribute && e.target.getAttribute('data-tay')
      if (!tay) return
      var m = day[iMoc]
      if (!m) return
      var r = cd.boc.getBoundingClientRect()
      keo = {
        tay: tay,
        mx: e.clientX,
        my: e.clientY,
        u: tyLe(),
        cx: r.left + r.width / 2,
        cy: r.top + r.height / 2,
        dau: Object.assign({}, m),
        net: e.target.__net || null,
      }
      keo.goc0 = Math.atan2(e.clientY - keo.cy, e.clientX - keo.cx)
      keo.r0 = Math.hypot(e.clientX - keo.cx, e.clientY - keo.cy)

      /* Vòng xoay: tìm điểm trên vòng gần con trỏ nhất rồi lấy TIẾP TUYẾN ở
       * đó. Kéo dọc theo tiếp tuyến mới là "đẩy vòng đi", đúng cảm giác của
       * gizmo thật — và nó đúng ở mọi tư thế, kể cả khi vòng đang gần như
       * nhìn nghiêng. Lấy góc quanh tâm thì ở tư thế nghiêng sẽ nhảy loạn. */
      if (vong && vong[tay] && vong[tay].diem.length) {
        var ds = vong[tay].diem
        // con trỏ quy về hệ 0..100 của viewBox
        var cx100 = ((e.clientX - r.left) / r.width) * 100
        var cy100 = ((e.clientY - r.top) / r.height) * 100
        var iGan = 0
        var tot = Infinity
        for (var i = 0; i < ds.length; i++) {
          var q = (ds[i].x - cx100) * (ds[i].x - cx100) + (ds[i].y - cy100) * (ds[i].y - cy100)
          if (q < tot) {
            tot = q
            iGan = i
          }
        }
        var a = ds[(iGan - 1 + ds.length) % ds.length]
        var b = ds[(iGan + 1) % ds.length]
        var tx = b.x - a.x
        var ty = b.y - a.y
        var dai = Math.hypot(tx, ty) || 1
        // bán kính của vòng TRÊN MÀN HÌNH, để quy quãng kéo ra radian
        var tong = 0
        for (var j = 0; j < ds.length; j++) {
          tong += Math.hypot(ds[j].x - 50, ds[j].y - 50)
        }
        keo.tiep = { x: tx / dai, y: ty / dai }
        keo.banKinh100 = Math.max(4, tong / ds.length)
      }
      if (keo.net) keo.net.classList.add('is-keo')
      svg.setPointerCapture(e.pointerId)
      e.preventDefault()
      e.stopPropagation()
    })

    svg.addEventListener('pointermove', function (e) {
      if (!keo) return
      var dx = (e.clientX - keo.mx) / keo.u // px thiết kế
      var dy = (e.clientY - keo.my) / keo.u
      var nac = e.shiftKey
      var batNac = function (v, b) {
        return nac ? Math.round(v / b) * b : v
      }

      if (keo.tay === 'tuDo') {
        dat('x', batNac(keo.dau.x + dx, CONFIG.nacDoi))
        dat('y', batNac(keo.dau.y + dy, CONFIG.nacDoi))
      } else if (keo.tay === 'x') {
        dat('x', batNac(keo.dau.x + dx, CONFIG.nacDoi))
      } else if (keo.tay === 'y') {
        dat('y', batNac(keo.dau.y + dy, CONFIG.nacDoi))
      } else if (keo.tay === 'rotX' || keo.tay === 'rotY' || keo.tay === 'rotZ') {
        /* Chiếu quãng kéo lên tiếp tuyến của vòng, rồi chia cho bán kính của
         * vòng trên màn hình: đi hết một cung bằng bán kính = 1 radian. */
        var r2 = cd.boc.getBoundingClientRect()
        var kx = ((e.clientX - keo.mx) / r2.width) * 100
        var ky = ((e.clientY - keo.my) / r2.height) * 100
        var goc
        if (keo.tiep) {
          var doc = kx * keo.tiep.x + ky * keo.tiep.y
          goc = (doc / keo.banKinh100) * (180 / Math.PI)
        } else {
          // không bắt được vòng thì lùi về góc quanh tâm
          var g = Math.atan2(e.clientY - keo.cy, e.clientX - keo.cx)
          goc = ((g - keo.goc0) * 180) / Math.PI
        }
        xoayQuanhTruc(keo.tay, batNac(goc, CONFIG.nacXoay), keo.dau)
      } else if (keo.tay === 'w') {
        // phóng theo TỈ LỆ khoảng cách tới tâm, nên kéo góc nào cũng đúng chiều
        var r1 = Math.hypot(e.clientX - keo.cx, e.clientY - keo.cy)
        var ti = r1 / Math.max(1, keo.r0)
        dat('w', batNac(Math.round(keo.dau.w * ti), CONFIG.nacDoi))
      } else if (keo.tay === 'dist') {
        dat('dist', Math.round((keo.dau.dist + dy * 0.05) * 10) / 10)
      }
      veLaiNote()
    })

    function thaRa(e) {
      if (!keo) return
      if (keo.net) keo.net.classList.remove('is-keo')
      keo = null
      try {
        svg.releasePointerCapture(e.pointerId)
      } catch (err) {}
    }
    svg.addEventListener('pointerup', thaRa)
    svg.addEventListener('pointercancel', thaRa)

    // Kéo vào chỗ trống của ô vẽ (ngoài gizmo) = dời tự do, như tool 3D.
    var keoThan = null
    cd.boc.addEventListener('pointerdown', function (e) {
      if (bang.hidden) return
      if (e.target !== cd.boc && e.target.tagName !== 'CANVAS') return
      var m = day[iMoc]
      if (!m) return
      keoThan = { mx: e.clientX, my: e.clientY, x: m.x, y: m.y, u: tyLe() }
      cd.boc.setPointerCapture(e.pointerId)
      e.preventDefault()
    })
    cd.boc.addEventListener('pointermove', function (e) {
      if (!keoThan) return
      var b = e.shiftKey
        ? function (v) {
            return Math.round(v / CONFIG.nacDoi) * CONFIG.nacDoi
          }
        : function (v) {
            return v
          }
      dat('x', b(keoThan.x + (e.clientX - keoThan.mx) / keoThan.u))
      dat('y', b(keoThan.y + (e.clientY - keoThan.my) / keoThan.u))
    })
    function thaThan(e) {
      if (!keoThan) return
      keoThan = null
      try {
        cd.boc.releasePointerCapture(e.pointerId)
      } catch (err) {}
    }
    cd.boc.addEventListener('pointerup', thaThan)
    cd.boc.addEventListener('pointercancel', thaThan)
  }

  /* --------------------------------------------------------------- bảng */

  var daGanCss = false
  function ganCss() {
    if (daGanCss) return
    daGanCss = true
    var st = document.createElement('style')
    st.textContent = CSS
    document.head.appendChild(st)
  }

  /* ------------------------------------------------- công tắc máy CD 3D
   * Ghi thẳng vào CONFIG.hien của kx-cd3d.js qua /__kx-save của serve.mjs (y
   * như nút Lưu của kx-panel.js) — công tắc là một SETTING của trang, không
   * phải trạng thái tạm. Mở bằng server khác thì vẫn bật/tắt được cho lượt
   * xem đó, chỉ là không ghi xuống file. */
  var nutCong = []
  function veCong() {
    var ctl = window.KX_CD3D_CTL
    var on = !!(ctl && ctl.config.hien)
    nutCong.forEach(function (b) {
      b.textContent = 'Máy CD 3D · ' + (on ? 'Bật' : 'Tắt')
      b.classList.toggle('is-on', on)
    })
  }
  function hangCongTac() {
    var wrap = el('div', 'kx-cdb__cong')
    var b = el('button')
    b.type = 'button'
    b.title = 'Bật/tắt máy CD 3D — ghi vào CONFIG.hien của kx-cd3d.js'
    var tb = el('p', 'kx-cdb__note')
    b.addEventListener('click', function () {
      doiCong(tb)
    })
    nutCong.push(b)
    wrap.appendChild(b)
    wrap.appendChild(tb)
    veCong()
    return wrap
  }
  function doiCong(tb) {
    var ctl = window.KX_CD3D_CTL
    if (!ctl) return
    var on = !ctl.config.hien
    tb.textContent = on && !ctl.daDung ? 'Đang dựng máy…' : ''
    ctl
      .bat(on)
      .then(function () {
        veCong()
        return fetch('/__kx-save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ file: 'assets/js/kx-cd3d.js', values: { hien: on } }),
        })
      })
      .then(function (r) {
        return r.json().catch(function () { return { ok: false, error: 'HTTP ' + r.status } })
      })
      .then(function (kq) {
        if (!kq.ok) throw new Error(kq.error || 'không rõ lỗi')
        tb.textContent = 'Đã ' + (on ? 'bật' : 'tắt') + ' — ghi hien: ' + on + ' vào kx-cd3d.js.'
      })
      .catch(function (err) {
        tb.textContent = 'Đã ' + (on ? 'bật' : 'tắt') + ' cho lượt xem này, chưa ghi được vào file (' + err.message + '). Chỉ ghi được khi mở trang bằng serve.mjs.'
      })
  }

  /* Bảng NHỎ: máy đang tắt (`hien: false`) thì kx-cd3d.js không dựng gì, bảng
   * đủ (cần window.KX_CD3D) không có gì để chỉnh — chỉ hiện công tắc. Bật lên
   * thì máy dựng xong, `boot()` dựng bảng đủ và bảng nhỏ nhường chỗ. */
  var nho = null
  function dungNho() {
    if (nho || bang || !CONFIG.enabled) return
    ganCss()
    nho = el('div', 'kx-cdb')
    nho.hidden = !CONFIG.moSan
    nho.appendChild(el('h4', null, 'CD 3D'))
    nho.appendChild(el('p', 'kx-cdb__hint', 'Máy CD 3D đang tắt — trang đang hiện ảnh phẳng của Figma. Bật lên để chỉnh tư thế theo cuộn. K để đóng.'))
    nho.appendChild(hangCongTac())
    document.body.appendChild(nho)
    document.addEventListener('keydown', phimNho)
  }
  function phimNho(e) {
    if (!nho) return
    var t = e.target
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
    if (e.metaKey || e.ctrlKey || e.altKey) return
    if (e.key.toLowerCase() !== CONFIG.phim) return
    e.preventDefault()
    nho.hidden = !nho.hidden
  }
  addEventListener('kx-cd3d-ctl', function () {
    var ctl = window.KX_CD3D_CTL
    if (ctl && !ctl.config.hien && !window.KX_CD3D) dungNho()
  })

  function dungBang() {
    ganCss()

    bang = el('div', 'kx-cdb')
    bang.hidden = !CONFIG.moSan
    bang.appendChild(el('h4', null, 'CD 3D — tư thế theo cuộn'))
    bang.appendChild(
      el(
        'p',
        'kx-cdb__hint',
        'Bấm số MÀN → trang nhảy tới đó → chỉnh bằng gizmo ngay trên máy → Lưu. K để đóng.'
      )
    )
    bang.appendChild(hangCongTac())

    var vps = el('div', 'kx-cdb__vps')
    cd.viewports.forEach(function (p) {
      var b = el('button', null, p.key.replace('w', ''))
      b.type = 'button'
      b.title = p.label
      b.addEventListener('click', function () {
        chonVp(p.key)
      })
      nutVp[p.key] = b
      vps.appendChild(b)
    })
    bang.appendChild(vps)

    var modes = el('div', 'kx-cdb__modes')
    ;[['move', 'Dời (G)'], ['rotate', 'Xoay (R)'], ['scale', 'Phóng (S)']].forEach(function (p) {
      var b = el('button', null, p[1])
      b.type = 'button'
      b.addEventListener('click', function () {
        cheDo = p[0]
        veLaiCheDo()
      })
      nutCheDo[p[0]] = b
      modes.appendChild(b)
    })
    bang.appendChild(modes)

    var hangGoc = el('div', 'kx-cdb__goc')
    GOC.forEach(function (g) {
      var b = el('button', null, g.ten)
      b.type = 'button'
      b.title = 'Đặt mốc đang chọn về góc "' + g.ten + '" của tool'
      b.addEventListener('click', function () {
        datGoc(g)
      })
      hangGoc.appendChild(b)
    })
    bang.appendChild(hangGoc)

    hangMoc = el('div', 'kx-cdb__moc')
    bang.appendChild(hangMoc)

    O.forEach(function (o) {
      var row = el('div', 'kx-cdb__row')
      row.appendChild(el('label', null, o.nhan))
      var inp = document.createElement('input')
      inp.type = 'number'
      inp.step = o.buoc
      inp.min = o.min
      inp.max = o.max
      inp.addEventListener('input', tuO)
      oInput[o.key] = inp
      row.appendChild(inp)
      bang.appendChild(row)
    })

    var acts = el('div', 'kx-cdb__acts')
    var bLuu = el('button', null, 'Lưu')
    bLuu.type = 'button'
    bLuu.addEventListener('click', luu)
    var bVe = el('button', null, 'Về mặc định')
    bVe.type = 'button'
    bVe.addEventListener('click', ve)
    acts.appendChild(bLuu)
    acts.appendChild(bVe)
    bang.appendChild(acts)

    note = el('p', 'kx-cdb__note')
    bang.appendChild(note)
    bao = el('p', 'kx-cdb__note')
    bang.appendChild(bao)

    oOut = document.createElement('textarea')
    oOut.className = 'kx-cdb__out'
    oOut.readOnly = true
    oOut.title = 'Chép khối này đè vào MOC trong assets/js/kx-cd3d.js'
    bang.appendChild(oOut)

    document.body.appendChild(bang)

    // SVG gizmo nằm TRONG ô vẽ, chồng lên canvas.
    svg = svgEl('svg', { class: 'kx-cdg', viewBox: '0 0 100 100' })
    svg.style.display = 'none'
    cd.boc.appendChild(svg)
    batGizmo()
  }

  function chonVp(key) {
    vpDangSua = key
    day = cd.dayMoc(key)
    iMoc = 0
    veLaiVp()
    veLaiHangMoc()
    veLaiO()
    apNgay()
    veLaiNote()
  }

  var rafVong = 0
  function chayCapNhat() {
    rafVong = 0
    if (bang.hidden) return
    capNhatVong()
    rafVong = requestAnimationFrame(chayCapNhat)
  }

  function bat(mo) {
    mo = mo == null ? bang.hidden : mo
    bang.hidden = !mo
    // Bảng mở thì ô vẽ mới ăn chuột để kéo được; đóng lại trả về `none` ngay,
    // không thì nó che mất mọi thứ nằm dưới trên trang thật.
    cd.boc.style.pointerEvents = mo ? 'auto' : 'none'
    cd.boc.style.cursor = mo ? 'move' : ''
    svg.style.display = mo ? 'block' : 'none'
    // Khoá lớp bấm-nút của kx-cd3d.js lại trong lúc chỉnh: không thì kéo gizmo
    // một cái là trúng luôn nút Play, và nó cũng liên tục gạt pointerEvents
    // về 'none' ngay dưới tay đang kéo.
    cd.boc.dataset.kxKhoa = mo ? '1' : '0'
    if (mo) veDuongMan()
    if (lopMan) lopMan.hidden = !mo
    if (mo) {
      chonVp(vpDangSua || vpHienTai())
      veLaiCheDo()
      xuatJson()
      if (!rafVong) rafVong = requestAnimationFrame(chayCapNhat)
    } else {
      // Đóng bảng thì thôi ép tư thế, trả máy về chạy theo cuộn.
      cd.deTay(null)
    }
  }

  function boot() {
    if (!CONFIG.enabled) return
    cd = window.KX_CD3D
    if (!cd) return
    vpDangSua = vpHienTai()
    dungBang()
    // Vừa bật máy từ bảng nhỏ: bảng nhỏ nhường chỗ cho bảng đủ, giữ trạng thái mở.
    var tuNho = false
    if (nho) {
      tuNho = !nho.hidden
      document.removeEventListener('keydown', phimNho)
      nho.remove()
      nho = null
      nutCong = nutCong.filter(function (b) { return b.isConnected })
    }
    if (CONFIG.moSan || tuNho) bat(true)

    document.addEventListener('keydown', function (e) {
      // Đang gõ trong ô nhập thì chữ là chữ, không phải phím tắt.
      var t = e.target
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      var k = e.key.toLowerCase()
      if (k === CONFIG.phim) {
        e.preventDefault()
        bat()
        return
      }
      if (bang.hidden) return
      if (k === 'g' || k === 'r' || k === 's') {
        e.preventDefault()
        cheDo = k === 'g' ? 'move' : k === 'r' ? 'rotate' : 'scale'
        veLaiCheDo()
      }
    })

    addEventListener(
      'scroll',
      function () {
        if (bang.hidden) return
        veLaiNote()
        // chỉ đổi viền "màn đang đứng", không dựng lại cả hàng
        var ds = cacMan()
        var now = manHienTai(ds)
        var nut = hangMoc.querySelectorAll('button')
        for (var k = 0; k < ds.length; k++) if (nut[k]) nut[k].classList.toggle('is-now', k === now)
      },
      { passive: true }
    )

    addEventListener('resize', function () {
      if (!bang.hidden) {
        veLaiVp()
        veLaiHangMoc() // cao cửa sổ đổi → số màn đổi
        veDuongMan()
        veLaiNote()
      }
    })

    window.KX_CD3D_BUILDER = { config: CONFIG, bat: bat, chonVp: chonVp }
  }

  // Chờ kx-cd3d.js dựng xong rồi mới nối — nó là module nên chạy sau file này.
  if (window.KX_CD3D) boot()
  else addEventListener('kx-cd3d-ready', boot, { once: true })
})()
