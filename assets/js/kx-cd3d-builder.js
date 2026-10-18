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
    // Chỉnh TẠI CHỖ: có mốc trong chừng này px (css) quanh vị trí cuộn thì sửa
    // mốc đó, không thì sinh mốc mới ngay tại vị trí cuộn.
    ganMoc: 40,
    canLe: 24, // px thiết kế — lề khi căn Trái/Phải/Trên/Dưới (đúng lề lưới)
    // LƯỚI + HÍT LƯỚI (người dùng chốt): 12 cột cùng số với kx-grid.js (lề 24,
    // rãnh 16 px thiết kế, co theo bề rộng) + 12 hàng đều theo chiều cao cửa sổ.
    luoi: true, // hiện lưới khi mở bảng
    hut: true, // kéo máy thì mép/tâm hình máy hít vào đường lưới gần nhất
    hutPx: 10, // px màn — trong khoảng này thì hít
    luoiLe: 24,
    luoiRanh: 16,
  }

  // Các ô số của một mốc. `nhan` là chữ hiện trên bảng.
  var O = [
    // Mốc NEO vào phần tử trang (xem MOC trong kx-cd3d.js): `ny` quyết định
    // mốc nằm ở vị trí cuộn nào — tâm phần tử neo lệch giữa màn bấy nhiêu.
    { key: 'ny', nhan: 'Neo lệch giữa màn', buoc: 5, min: -4000, max: 4000 },
    { key: 'w', nhan: 'Cạnh ô vẽ', buoc: 10, min: 200, max: 2400 },
    { key: 'x', nhan: 'Trái (từ mép trang)', buoc: 5, min: -1600, max: 3000 },
    { key: 'y', nhan: 'Trên (từ tâm neo)', buoc: 5, min: -3000, max: 3000 },
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
    '.kx-cdb .kx-cdb__rong{width:100%;margin-bottom:9px;padding:6px 4px}',
    '.kx-cdb-luoi{position:fixed;inset:0;pointer-events:none;z-index:2147481000}',
    '.kx-cdb-luoi[hidden]{display:none}',
    '.kx-cdb-luoi__cot{position:absolute;top:0;bottom:0;background:rgba(57,255,20,.05);',
    '  border-left:1px solid rgba(57,255,20,.28);border-right:1px solid rgba(57,255,20,.28)}',
    '.kx-cdb-luoi__hang{position:absolute;left:0;right:0;height:0;border-top:1px dashed rgba(57,255,20,.32)}',
    '.kx-cdb__hai{display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-bottom:9px}',
    '.kx-cdb-bao{position:fixed;left:50%;bottom:24px;z-index:2147483100;transform:translate(-50%,8px);',
    '  max-width:min(640px,90vw);padding:8px 12px;border:1px solid #2a2a2c;border-radius:6px;background:#0b0b0c;',
    '  font:400 11px/1.45 "Geist Mono",ui-monospace,monospace;color:#e8e8e8;pointer-events:none;opacity:0;',
    '  transition:opacity .2s ease,transform .2s ease;box-shadow:0 10px 30px rgba(0,0,0,.6)}',
    '.kx-cdb-bao.is-on{opacity:1;transform:translate(-50%,0)}',
    '.kx-cdb button.is-chua{background:#4a7dff;border-color:#4a7dff;color:#fff}',
    '.kx-cdb__man{display:grid;grid-template-columns:52px repeat(4,1fr);gap:4px;margin-bottom:4px;align-items:center}',
    '.kx-cdb__man span{color:#8e8e94;font-size:10px}',
    '.kx-cdb__man button{padding:5px 2px;font-size:10px}',
    // Chọn phần tử trên trang: khung xanh bám phần tử dưới con trỏ + nhãn góc / neo.
    'html.kx-cdb-dang-chon, html.kx-cdb-dang-chon *{cursor:crosshair!important}',
    '.kx-cdb-chon{position:fixed;z-index:2147483000;pointer-events:none;outline:1px solid #39ff14;',
    '  box-shadow:0 0 0 1px rgba(57,255,20,.35),0 0 14px rgba(57,255,20,.4)}',
    '.kx-cdb-chon[hidden]{display:none}',
    '.kx-cdb-chon::after{content:attr(data-goc);position:absolute;left:0;top:-18px;padding:1px 5px;',
    '  font:500 10px/1.3 "Geist Mono",monospace;color:#0b0b0c;background:#39ff14;white-space:nowrap}',
    '.kx-cdb__lat{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;margin-bottom:9px}',
    '.kx-cdb__lat button{padding:5px 2px;font-size:10px}',
    '.kx-cdb__lat button:last-child{grid-column:1 / -1}',
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
    '.kx-cdb .kx-cdb__cong .kx-cdb__editor{margin-top:4px}',
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
  // (không còn "mốc đang chọn" — mốc được sửa là mốc TẠI vị trí cuộn)
  var oInput = {}
  var nutVp = {}
  var nutCheDo = {}
  var hangMoc = null
  var note = null
  var bao = null
  var oOut = null
  var svg = null
  var cheDo = 'move' // 'move' | 'rotate' | 'scale'
  var oGoc = null // ô "Nghiêng trên màn"
  var nutLuu = null
  // Bản nháp khác bản đã lưu: nút Lưu sáng xanh + chữ "chưa lưu", không thì
  // tải lại trang là mất mà không hay.
  function datChua(chua) {
    if (!nutLuu) return
    nutLuu.classList.toggle('is-chua', !!chua)
    nutLuu.textContent = chua ? 'Lưu · chưa lưu' : 'Lưu'
  }

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
    // Hộp bao trong hệ toạ độ CỦA MÁY — để căn: chiếu 8 góc qua camera ra
    // đúng hình máy trên màn hình ở mọi góc xoay.
    var loc = h.clone().applyMatrix4(dev.matrixWorld.clone().invert())
    dev.rotation.set(gx, gy, gz)
    dev.updateMatrixWorld(true)
    coMay = { W: c.x, H: c.y, span: Math.max(c.x, c.y), loc: loc }
    return coMay
  }

  /* Hình chữ nhật của CHÍNH CHIẾC MÁY trên màn hình (px css), không phải ô vẽ
   * vuông bao quanh — ô vẽ có nhiều khoảng trống nên căn theo ô thì máy trông
   * vẫn lệch. */
  function hcnMay() {
    var T = cd.THREE
    var k = doMay()
    var dev = cd.built && cd.built.deck && cd.built.deck.device
    if (!k || !dev) return null
    dev.updateMatrixWorld(true)
    var r = cd.boc.getBoundingClientRect()
    var a = k.loc.min
    var b = k.loc.max
    var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
    for (var i = 0; i < 8; i++) {
      var p = new T.Vector3(i & 1 ? b.x : a.x, i & 2 ? b.y : a.y, i & 4 ? b.z : a.z)
      p.applyMatrix4(dev.matrixWorld)
      var q = chieu(p) // 0..100 trong ô vẽ
      var sx = r.left + (q.x / 100) * r.width
      var sy = r.top + (q.y / 100) * r.height
      if (sx < x0) x0 = sx
      if (sx > x1) x1 = sx
      if (sy < y0) y0 = sy
      if (sy > y1) y1 = sy
    }
    return { x0: x0, y0: y0, x1: x1, y1: y1 }
  }

  /* Lật nhanh: xoay `goc` độ quanh trục của máy. xoayQuanhTruc() đảo dấu vòng
   * Y (cho khớp chiều kéo trên vòng) — nút thì muốn đúng chiều dương thật nên
   * đảo lại trước khi gọi. */
  function lat(tay, goc) {
    var m = mocDeSua()
    if (!m) return
    xoayQuanhTruc(tay, tay === 'rotY' ? -goc : goc, Object.assign({}, m))
    nhay('Lật ' + tay.slice(-1) + ' ' + goc + '° → X ' + m.rotX + '°, Y ' + m.rotY + '°, Z ' + m.rotZ + '°')
  }

  /* ĐỒNG BỘ CỠ (người dùng: "1 nút 3D player ở mọi scene đồng bộ về size"):
   * lấy cỡ ĐANG THẤY ở vị trí cuộn này (`w` cạnh ô vẽ + `dist` camera lùi — hai
   * số quyết định máy to cỡ nào) chép sang MỌI mốc của viewport đang sửa. Đổi
   * `w` thì ô vẽ to/nhỏ từ góc trên-trái, nên bù x/y nửa phần chênh để TÂM máy
   * ở từng mốc đứng nguyên chỗ. Chưa ghi xuống — bấm Lưu mới giữ. */
  function dongBoCo() {
    var goc = tuTheNay()
    if (!goc) return
    var w = Math.round(goc.w)
    var dist = Math.round(goc.dist * 10) / 10
    var doi = 0
    day.forEach(function (m) {
      if (Math.round(m.w) === w && m.dist === dist) return
      var bu = (m.w - w) / 2
      m.x = kep(Math.round(m.x + bu), oTheo.x)
      m.y = kep(Math.round(m.y + bu), oTheo.y)
      m.w = w
      m.dist = dist
      doi++
    })
    if (!doi) {
      nhay('Cả ' + day.length + ' mốc đã cùng cỡ (cạnh ' + w + ', lùi ' + dist + ') — đổi cỡ ở mốc này trước rồi bấm lại')
      return
    }
    apNgay()
    veLaiO()
    nhay('Đồng bộ cỡ ' + doi + '/' + day.length + ' mốc → cạnh ' + w + ', lùi ' + dist + ' — bấm Lưu để giữ')
  }

  /* CĂN (người dùng: "thêm align giữa cho vật thể, đỡ phải kéo tay"): dời
   * x / y của mốc TẠI CHỖ sao cho hình máy trên màn hình nằm giữa / sát lề
   * (`canLe` px thiết kế, đúng lề lưới 24). Quy px màn hình về px thiết kế. */
  function can(kieu) {
    var h = hcnMay()
    if (!h) return
    var m = mocDeSua()
    if (!m) return
    var Q = q()
    var vw = document.documentElement.clientWidth
    var vh = window.innerHeight
    var leX = (CONFIG.canLe || 0) * Q.ux
    var leY = (CONFIG.canLe || 0) * Q.uy
    var dx = 0
    var dy = 0
    if (kieu === 'giuaNgang' || kieu === 'giua') dx = vw / 2 - (h.x0 + h.x1) / 2
    if (kieu === 'giuaDoc' || kieu === 'giua') dy = vh / 2 - (h.y0 + h.y1) / 2
    if (kieu === 'trai') dx = leX - h.x0
    if (kieu === 'phai') dx = vw - leX - h.x1
    if (kieu === 'tren') dy = leY - h.y0
    if (kieu === 'duoi') dy = vh - leY - h.y1
    if (dx) m.x = kep(Math.round(m.x + dx / Q.ux), oTheo.x)
    if (dy) m.y = kep(Math.round(m.y + dy / Q.uy), oTheo.y)
    apNgay()
    veLaiO()
    veLaiNote()
    nhay('Căn ' + ({ giuaNgang: 'giữa ngang', giuaDoc: 'giữa dọc', giua: 'giữa màn', trai: 'trái', phai: 'phải', tren: 'trên', duoi: 'dưới' })[kieu] + ' → x ' + m.x + ', y ' + m.y)
  }

  function datGoc(g) {
    var k = doMay()
    var m = k && mocDeSua()
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

  /* px thiết kế → px màn: { ux ngang, uy dọc, s cỡ máy } — lấy từ kx-cd3d.js
   * (đặt máy theo % rộng / % cao, xem `phanTram`). Đo lúc bắt đầu kéo rồi giữ
   * nguyên suốt cú kéo. */
  function q() {
    if (cd.quy) return cd.quy()
    var u = cd.page.getBoundingClientRect().width / 1920
    return { ux: u, uy: u, s: u }
  }
  function tyLe() {
    return q().ux
  }

  /* ----------------------------------------------- LƯỚI 12 + HÍT LƯỚI
   * Đích hít: mép trái, mép phải, giữa của 12 cột + giữa màn (ngang); 13 đường
   * chia 12 hàng đều theo chiều cao (dọc — gồm cả mép trên/dưới và giữa màn).
   * Cùng các số đó vẽ thành lớp lưới cố định trên màn khi bảng mở. */
  function dichLuoi() {
    var Q = q()
    var vw = document.documentElement.clientWidth
    var vh = window.innerHeight
    var le = CONFIG.luoiLe * Q.ux
    var ranh = CONFIG.luoiRanh * Q.ux
    var cot = (vw - 2 * le - 11 * ranh) / 12
    var cots = []
    var xs = [vw / 2]
    for (var i = 0; i < 12; i++) {
      var a = le + i * (cot + ranh)
      cots.push([a, cot])
      xs.push(a, a + cot, a + cot / 2)
    }
    var ys = []
    for (var k = 0; k <= 12; k++) ys.push((k * vh) / 12)
    return { xs: xs, ys: ys, cots: cots }
  }

  // Dời (dx, dy) px màn của hình máy `h0` (lúc bắt đầu kéo) → dời đã hít lưới.
  function hut(h0, dx, dy, chiX, chiY) {
    if (!CONFIG.hut || !h0) return [dx, dy]
    var d = dichLuoi()
    var nguong = CONFIG.hutPx
    function gan(vals, dich) {
      var tot = null
      vals.forEach(function (v) {
        dich.forEach(function (t) {
          var k = t - v
          if (Math.abs(k) <= nguong && (tot === null || Math.abs(k) < Math.abs(tot))) tot = k
        })
      })
      return tot
    }
    if (!chiY) {
      var bx = gan([h0.x0 + dx, (h0.x0 + h0.x1) / 2 + dx, h0.x1 + dx], d.xs)
      if (bx !== null) dx += bx
    }
    if (!chiX) {
      var by = gan([h0.y0 + dy, (h0.y0 + h0.y1) / 2 + dy, h0.y1 + dy], d.ys)
      if (by !== null) dy += by
    }
    return [dx, dy]
  }

  var lopLuoi = null
  function veLuoi() {
    if (!lopLuoi) {
      lopLuoi = el('div', 'kx-cdb-luoi')
      lopLuoi.setAttribute('aria-hidden', 'true')
      document.body.appendChild(lopLuoi)
    }
    lopLuoi.textContent = ''
    lopLuoi.hidden = !bang || bang.hidden || !CONFIG.luoi
    if (lopLuoi.hidden) return
    var d = dichLuoi()
    d.cots.forEach(function (c) {
      var o = el('div', 'kx-cdb-luoi__cot')
      o.style.left = c[0] + 'px'
      o.style.width = c[1] + 'px'
      lopLuoi.appendChild(o)
    })
    d.ys.forEach(function (y) {
      var h = el('div', 'kx-cdb-luoi__hang')
      h.style.top = Math.round(y) + 'px'
      lopLuoi.appendChild(h)
    })
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

  /* --------------------------------------- CUỘN THẬT, CHỈNH TẠI CHỖ (chốt)
   * Mở bảng thì trang vẫn cuộn như thật, máy chạy theo dãy mốc y như ngoài
   * site. Cuộn tới đâu chỉnh tới đó: kéo gizmo / gõ số / bấm góc mẫu là sửa MỐC
   * TẠI CHỖ — có mốc trong `ganMoc` px quanh vị trí cuộn thì sửa mốc đó, chưa có
   * thì sinh mốc mới ngay tại đây với tư thế ĐANG NỘI SUY (không có cú nhảy).
   * Đã bỏ (người dùng chê "khó hiểu", "bị rối"): ép một tư thế cố định khi bảng
   * mở; hàng "màn 1…N" bấm để nhảy + rê để xem trước; neo khối = một màn. */
  function tran() {
    return Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
  }

  // Mốc ở ngay vị trí cuộn hiện tại (trong `ganMoc` px), hoặc -1. Vị trí
  // cuộn của mốc TÍNH theo neo ở cỡ màn hiện tại (`cd.cuonMoc`).
  function mocTaiDay() {
    var sy = window.scrollY
    var tot = -1
    var lech = Infinity
    day.forEach(function (m, i) {
      var d = Math.abs(cd.cuonMoc(m) - sy)
      if (d <= (CONFIG.ganMoc || 0) && d < lech) {
        lech = d
        tot = i
      }
    })
    return tot
  }

  // Tư thế đang hiện ở vị trí cuộn này.
  function tuTheNay() {
    var i = mocTaiDay()
    return i >= 0 ? day[i] : cd.tuTheTai(null, window.scrollY)
  }

  function xepDay() {
    day.forEach(function (m) {
      cd.cuonMoc(m)
    })
    day.sort(function (a, b) {
      return a._s - b._s
    })
  }

  // Mốc để sửa: có sẵn tại chỗ thì dùng, chưa có thì sinh ra ngay tại đây
  // (neo vào phần tử gần tâm máy nhất, hoặc `neo` truyền vào).
  function mocDeSua(neo) {
    var i = mocTaiDay()
    if (i < 0) {
      var m = cd.taoMoc(neo)
      if (!m) {
        nhay('Không tìm được phần tử nào để neo ở đây')
        return null
      }
      day.push(m)
      xepDay()
      i = day.indexOf(m)
      apNgay()
      veLaiMoc()
      veDuongMoc()
      nhay('Tạo mốc mới, neo vào ' + m.neo + ' — nhớ bấm Lưu')
    }
    return day[i]
  }

  // Nhảy thẳng (không trôi) rồi báo kx-smooth-scroll.js đồng bộ đích NGAY —
  // không thì vòng lerp của nó (đang chạy dở) kéo trang ngược về chỗ cũ.
  function cuonToi(y) {
    window.scrollTo(0, y)
    if (window.KX_SMOOTH_SCROLL && window.KX_SMOOTH_SCROLL.dongBo) window.KX_SMOOTH_SCROLL.dongBo()
  }

  /* Hàng CHIP mốc: mỗi mốc một chip (vị trí cuộn 0..1). Bấm chip = cuộn tới
   * mốc đó (chỉ BẤM mới cuộn — rê chuột không làm gì). Chip sáng = mốc đang ở
   * đúng chỗ cuộn hiện tại. */
  function veLaiMoc() {
    hangMoc.textContent = ''
    hangMoc.appendChild(el('p', 'kx-cdb__moc-ten', 'Mốc (bấm để cuộn tới) — cuộn tới đâu chỉnh tới đó'))
    var here = mocTaiDay()
    day.forEach(function (m, i) {
      var b = el('button', null, (cd.cuonMoc(m) / tran()).toFixed(2))
      b.type = 'button'
      b.title = 'Cuộn tới mốc neo vào ' + m.neo
      b.classList.toggle('is-on', i === here)
      b.addEventListener('click', function () {
        cuonToi(Math.round(cd.cuonMoc(m)))
      })
      hangMoc.appendChild(b)
    })
    var xoa = el('button', null, '− Xoá mốc tại đây')
    xoa.type = 'button'
    xoa.title = 'Xoá mốc ở đúng vị trí cuộn hiện tại'
    xoa.style.flex = '1'
    xoa.addEventListener('click', xoaMoc)
    hangMoc.appendChild(xoa)
  }

  // Chỉ đổi chip sáng — gọi mỗi lần cuộn, không dựng lại hàng.
  function sangChip() {
    var here = mocTaiDay()
    var nut = hangMoc.querySelectorAll('button')
    for (var i = 0; i < day.length; i++) if (nut[i]) nut[i].classList.toggle('is-on', i === here)
  }

  /* Đường kẻ xanh neon ở vị trí của từng MỐC trên trang (nhãn "MỐC 0.42").
   * Lớp `position: absolute` treo vào <body>, cao bằng cả trang. Dựng lại khi
   * mở bảng, thêm/xoá mốc, đổi cỡ — không vẽ gì mỗi khung. */
  var lopMoc = null
  function veDuongMoc() {
    if (!lopMoc) {
      lopMoc = el('div', 'kx-cdb-man')
      lopMoc.setAttribute('aria-hidden', 'true')
      document.body.appendChild(lopMoc)
    }
    lopMoc.textContent = ''
    lopMoc.style.height = document.documentElement.scrollHeight + 'px'
    var t = tran()
    day.forEach(function (m) {
      var ke = el('div', 'kx-cdb-man__ke')
      var sy = cd.cuonMoc(m)
      ke.style.top = Math.round(sy) + 'px'
      ke.appendChild(el('span', 'kx-cdb-man__so', 'MỐC ' + (sy / t).toFixed(2) + ' · neo ' + m.neo))
      lopMoc.appendChild(ke)
    })
  }

  function veLaiO() {
    var m = tuTheNay()
    if (!m) return
    if (oGoc && document.activeElement !== oGoc) oGoc.value = gocManHinh(m).toFixed(1)
    var co = mocTaiDay() >= 0
    O.forEach(function (o) {
      if (document.activeElement !== oInput[o.key]) {
        var v = m[o.key]
        oInput[o.key].value = v == null ? '' : Math.round(v * 1000) / 1000
      }
    })
  }

  function veLaiNote() {
    var co = mocTaiDay() >= 0
    note.innerHTML =
      '<b>Cửa sổ:</b> ' +
      window.innerWidth +
      '×' +
      window.innerHeight +
      ' — một dãy mốc chung cho mọi cỡ màn' +
      '<br><b>Cuộn hiện tại:</b> ' +
      cd.tienDo().toFixed(3) +
      (co
        ? ' — <b>có mốc tại đây</b>, neo <b>' + tuTheNay().neo + '</b> (' + tenNeo(tuTheNay().neo) + ')'
        : ' — chưa có mốc, chỉnh là tạo mốc mới') +
      '<br><b>Nghiêng trên màn:</b> ' + gocManHinh().toFixed(1) + '°' +
      '<br><b>Gizmo:</b> G di chuyển · R xoay · S phóng · Shift bắt nấc'
  }

  /* ------------------------------------------------------------- thao tác */

  /* Đẩy dãy đang sửa sang máy — máy vẫn chạy theo cuộn, KHÔNG ép tư thế. */
  function apNgay() {
    datChua(true)
    cd.datDay(day)
  }

  /* Gõ số trong bảng → vào mốc tại chỗ. */
  function tuO() {
    var m = mocDeSua()
    if (!m) return
    var nyCu = m.ny
    var wCu = m.w
    var xCu = m.x
    var yCu = m.y
    O.forEach(function (o) {
      var v = parseFloat(oInput[o.key].value)
      if (!isNaN(v)) m[o.key] = kep(v, o)
    })
    // Gõ cạnh ô vẽ mà không gõ x/y: phóng quanh TÂM (máy đặt theo tâm).
    if (m.w !== wCu && m.x === xCu && m.y === yCu) {
      m.x = kep(Math.round(m.x - (m.w - wCu) / 2), oTheo.x)
      m.y = kep(Math.round(m.y - (m.w - wCu) / 2), oTheo.y)
    }
    if (m.ny !== nyCu) {
      // dời mốc sang vị trí cuộn khác: xếp lại, vẽ lại dấu
      xepDay()
      veLaiMoc()
      veDuongMoc()
    }
    apNgay()
    veLaiNote()
  }

  /* Gizmo → vào mốc tại chỗ. */
  function dat(key, giaTri) {
    var m = mocDeSua()
    if (!m) return
    m[key] = kep(giaTri, oTheo[key])
    apNgay()
    veLaiO()
  }

  /* GIỮ TƯ THẾ (người dùng: "vật thể ở đoạn này xoay dọc … xuống viewport
   * dưới vẫn giữ nguyên, không xê dịch"). Giữa hai mốc máy luôn nội suy sang
   * mốc sau, nên muốn nó đứng nguyên thì phải có một mốc TRÙNG tư thế ở cuối
   * đoạn — tự gõ cho khớp rất khó. Hai nút chép tư thế của MỐC TRƯỚC sang vị
   * trí đang cuộn (có mốc ở đây thì ghi đè, chưa có thì tạo):
   *   'man'   — đứng yên TRÊN MÀN: giữ x, cỡ, góc và chỗ trên màn (ny + y bằng
   *             mốc trước — tâm neo + y ra cùng một toạ độ màn ở mọi cỡ màn).
   *             Trang trôi qua bên dưới, máy đứng im.
   *   'trang' — trôi THEO TRANG: neo vào CÙNG phần tử với cùng y, nên máy dính
   *             vào chữ / ảnh và cuộn đi cùng (kx-cd3d.js nội suy tuyến tính
   *             đoạn hai mốc cùng neo cùng y). */
  function giuTuThe(kieu) {
    var sy = window.scrollY
    var truoc = null
    xepDay()
    day.forEach(function (m) {
      if (m._s < sy - (CONFIG.ganMoc || 0)) truoc = m
    })
    if (!truoc) {
      nhay('Phía trên chưa có mốc nào để giữ tư thế')
      return
    }
    var i = mocTaiDay()
    var m = i >= 0 ? day[i] : mocDeSua(kieu === 'trang' ? truoc.neo : null)
    if (!m) return
    if (kieu === 'trang' && m.neo !== truoc.neo && !cd.doiNeo(m, truoc.neo)) {
      nhay('Không đo được phần tử neo ' + truoc.neo)
      return
    }
    m.x = truoc.x
    m.w = truoc.w
    m.dist = truoc.dist
    m.rotX = truoc.rotX
    m.rotY = truoc.rotY
    m.rotZ = truoc.rotZ
    m.y = kieu === 'trang' ? truoc.y : Math.round(((truoc.ny || 0) + truoc.y - (m.ny || 0)) * 10) / 10
    xepDay()
    apNgay()
    veLaiMoc()
    veDuongMoc()
    veLaiO()
    veLaiNote()
    nhay(kieu === 'trang'
      ? 'Từ mốc trước tới đây máy trôi THEO TRANG (neo ' + truoc.neo + ') — nhớ Lưu'
      : 'Từ mốc trước tới đây máy ĐỨNG YÊN trên màn — nhớ Lưu')
  }

  function xoaMoc() {
    var i = mocTaiDay()
    if (i < 0) {
      nhay('Chỗ này chưa có mốc nào để xoá')
      return
    }
    if (day.length <= 2) {
      nhay('Phải còn ít nhất 2 mốc')
      return
    }
    day.splice(i, 1)
    apNgay()
    veLaiMoc()
    veDuongMoc()
    veLaiO()
    veLaiNote()
    nhay('Đã xoá mốc — chỗ này giờ nội suy giữa hai mốc kề bên')
  }

  function luu() {
    cd.luu('chung', day)
    datChua(false)
    xuatJson()
    nhay('Đã lưu ' + day.length + ' mốc — dùng chung cho mọi cỡ màn')
  }

  function ve() {
    cd.xoaLuu('chung')
    day = cd.dayNeo()
    apNgay()
    datChua(false)
    veLaiMoc()
    veDuongMoc()
    veLaiO()
    xuatJson()
    nhay('Đã trả dãy mốc về mặc định')
  }

  function xuatJson() {
    // In ra đúng dạng MOC trong kx-cd3d.js — chép thẳng vào file là bản clone
    // mới cũng chạy đúng dãy này.
    var d = cd.docLuu().chung
    if (!d || !d.length) {
      oOut.value = '(chưa lưu dãy nào)'
      return
    }
    var r1 = function (v) {
      return Math.round((v || 0) * 10) / 10
    }
    oOut.value =
      'const MOC = {\n  chung: [\n' +
      d
        .map(function (m) {
          return (
            "    { neo: '" + m.neo + "', ny: " + r1(m.ny) + ', w: ' + Math.round(m.w) + ', x: ' + Math.round(m.x) +
            ', y: ' + Math.round(m.y) + ', dist: ' + r1(m.dist) + ', rotX: ' + r1(m.rotX) +
            ', rotY: ' + r1(m.rotY) + ', rotZ: ' + r1(m.rotZ) + ' },'
          )
        })
        .join('\n') +
      '\n  ],\n}'
  }

  function nhayLau(chu) {
    clearTimeout(nhay._t)
    bao.textContent = chu
    bao.classList.add('is-on')
  }

  function nhay(chu) {
    bao.textContent = chu
    bao.classList.add('is-on')
    clearTimeout(nhay._t)
    nhay._t = setTimeout(function () {
      bao.classList.remove('is-on')
    }, 3200)
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
    var cam = cd.camera
    var p = v.project(cam)
    var x = p.x * 0.5 + 0.5
    var y = -p.y * 0.5 + 0.5
    // Camera chỉ vẽ một phần khung (setViewOffset — canvas tự nở theo máy):
    // đổi toạ độ của phần đó ra toạ độ của cả ô vuông.
    var vw = cam.view
    if (vw && vw.enabled) {
      x = (vw.offsetX + x * vw.width) / vw.fullWidth
      y = (vw.offsetY + y * vw.height) / vw.fullHeight
    }
    return { x: x * 100, y: y * 100 }
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
    ganQuat(q, dau)
  }

  /* Ghi một HƯỚNG (quaternion) vào mốc tại chỗ dưới dạng Euler 'XYZ'. Một
   * hướng có HAI bộ Euler tương đương (x, y, z) và (x+180, 180−y, z+180): chọn
   * bộ gần góc `dau` nhất, không thì máy lật vòng khi nội suy giữa hai mốc. */
  function ganQuat(q, dau) {
    var T = cd.THREE
    var d2r = Math.PI / 180
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
    var m = mocDeSua()
    if (!m) return
    m.rotX = Math.round(tot[0] * 10) / 10
    m.rotY = Math.round(tot[1] * 10) / 10
    m.rotZ = Math.round(tot[2] * 10) / 10
    apNgay()
    veLaiO()
    veLaiNote()
  }

  /* ======================================== XOAY THEO MÀN HÌNH + KHỚP GÓC
   * Người dùng: "chỉnh kĩ từng chỗ … CD player xoay sang trái xong nghiêng
   * theo đúng góc nghiêng của các ảnh". Ba góc rotX/Y/Z là góc quanh trục CỦA
   * MÁY — đã xoay sang trái rồi thì "rotZ" không còn là nghiêng trên màn nữa,
   * chỉnh bằng số rất khó trúng. Nên thêm xoay quanh trục CỦA MÀN HÌNH: camera
   * nhìn dọc trục Z thế giới vào tâm máy, nên
   *   quay trái/phải = quanh Y thế giới, ngả lên/xuống = quanh X thế giới,
   *   nghiêng trên màn = quanh Z thế giới (máy xoay đúng trong mặt phẳng màn).
   * Nhân quaternion của trục thế giới vào BÊN TRÁI hướng hiện tại. */
  function xoayManHinh(truc, goc) {
    var m = mocDeSua()
    if (!m) return
    var T = cd.THREE
    var d2r = Math.PI / 180
    var dau = Object.assign({}, m)
    var q = new T.Quaternion().setFromEuler(new T.Euler(m.rotX * d2r, m.rotY * d2r, m.rotZ * d2r, 'XYZ'))
    var v = truc === 'x' ? new T.Vector3(1, 0, 0) : truc === 'y' ? new T.Vector3(0, 1, 0) : new T.Vector3(0, 0, 1)
    q.premultiply(new T.Quaternion().setFromAxisAngle(v, goc * d2r))
    ganQuat(q, dau)
  }

  // Đưa góc của một ĐƯỜNG (không có chiều) về (−90, 90].
  function goc90(a) {
    a = ((a % 180) + 180) % 180
    return a > 90 ? a - 180 : a
  }

  /* Góc nghiêng TRÊN MÀN của cạnh ngang máy (trục X của máy), độ, chiều kim
   * đồng hồ dương — cùng quy ước với CSS rotate. Máy nằm ở gốc toạ độ, camera
   * nhìn thẳng vào gốc, nên hướng chiếu của một vectơ chính là (vx, vy) — phép
   * chia phối cảnh chia cả hai như nhau, góc không đổi. Máy xoay gần cạnh
   * (trục X gần như chĩa vào camera) thì lấy trục Y của máy, trừ 90°. */
  function gocManHinh(t) {
    t = t || tuTheNay()
    if (!t) return 0
    var T = cd.THREE
    var d2r = Math.PI / 180
    var q = new T.Quaternion().setFromEuler(new T.Euler(t.rotX * d2r, t.rotY * d2r, t.rotZ * d2r, 'XYZ'))
    var vx = new T.Vector3(1, 0, 0).applyQuaternion(q)
    if (Math.hypot(vx.x, vx.y) > 0.25) return goc90(Math.atan2(-vx.y, vx.x) / d2r)
    var vy = new T.Vector3(0, 1, 0).applyQuaternion(q)
    return goc90(Math.atan2(-vy.y, vy.x) / d2r + 90)
  }

  // Xoay trong mặt phẳng màn cho cạnh ngang máy nghiêng đúng `dich` độ.
  function datGocManHinh(dich) {
    var m = mocDeSua()
    if (!m) return
    var lech = goc90(dich - gocManHinh(m))
    // +θ quanh Z thế giới = NGƯỢC kim đồng hồ trên màn → đảo dấu.
    xoayManHinh('z', -lech)
    nhay('Nghiêng trên màn → ' + gocManHinh(m).toFixed(1) + '°')
  }

  /* Góc nghiêng thật của một phần tử trên màn: cộng dồn góc xoay của nó và
   * mọi khối cha (cả `transform` lẫn thuộc tính `rotate` riêng). Dải ảnh "02."
   * nghiêng bằng `rotate(-12.5deg)` trên khối bọc — đọc ra đúng −12.5. */
  function gocPhanTu(el) {
    var tong = 0
    for (var e = el; e && e.nodeType === 1; e = e.parentElement) {
      var cs = getComputedStyle(e)
      if (cs.transform && cs.transform !== 'none') {
        var mt = new DOMMatrix(cs.transform)
        tong += (Math.atan2(mt.b, mt.a) * 180) / Math.PI
      }
      if (cs.rotate && cs.rotate !== 'none') {
        var r = cs.rotate.trim().split(/\s+/)
        var deg = r[r.length - 1]
        // chỉ lấy xoay quanh Z (dạng "12deg" hoặc "z 12deg")
        if (r.length === 1 || r[0] === 'z') tong += parseFloat(deg) * (/rad$/.test(deg) ? 180 / Math.PI : /turn$/.test(deg) ? 360 : 1)
      }
    }
    return goc90(tong)
  }

  function tenNeo(neo) {
    var e = cd.timNeo(neo)
    if (!e) return 'không thấy'
    var t = (e.textContent || '').replace(/\s+/g, ' ').trim()
    return t ? (t.length > 22 ? t.slice(0, 22) + '…' : t) : e.tagName.toLowerCase()
  }

  /* Neo cho một phần tử bấm trúng: node Figma (`data-n`) gần nhất, hoặc —
   * với khối do hiệu ứng dựng như dải ảnh — class `kx-…` DUY NHẤT trên trang.
   * Bỏ khối cao hơn 1.5 màn (neo cả khúc thì kém chính xác). */
  function neoCho(el) {
    var tran = window.innerHeight * 1.5
    for (var e = el; e && e !== document.body; e = e.parentElement) {
      if (e.classList && e.classList.contains('kx-page')) break
      var h = e.getBoundingClientRect().height
      if (h > tran) continue
      if (e.hasAttribute('data-n')) return e.getAttribute('data-n')
      if (e.id) return '#' + e.id
      var cls = [].slice.call(e.classList || []).filter(function (c) {
        return /^kx-[a-z0-9-]+$/.test(c) && document.querySelectorAll('.' + c).length === 1
      })
      if (cls.length) return '.' + cls[0]
    }
    return null
  }

  /* CHỌN PHẦN TỬ TRÊN TRANG: bấm nút rồi bấm vào chữ / ảnh trên trang.
   *   'neo' — neo mốc tại chỗ vào phần tử đó (máy đứng nguyên chỗ)
   *   'goc' — nghiêng máy trên màn đúng góc của phần tử đó
   * Bắt sự kiện ở pha capture và chặn lại, nên bấm vào link không chuyển trang.
   * Esc để huỷ. */
  var chon = null
  var khungChon = null
  function batChon(kieu) {
    chon = kieu
    if (!khungChon) {
      khungChon = el('div', 'kx-cdb-chon')
      document.body.appendChild(khungChon)
    }
    khungChon.hidden = true
    document.documentElement.classList.add('kx-cdb-dang-chon')
    cd.boc.style.pointerEvents = 'none'
    nhayLau(kieu === 'neo' ? 'Bấm vào phần tử làm NEO cho mốc này (Esc huỷ)' : 'Bấm vào ảnh / phần tử để lấy GÓC NGHIÊNG (Esc huỷ)')
  }
  function tatChon() {
    chon = null
    if (khungChon) khungChon.hidden = true
    document.documentElement.classList.remove('kx-cdb-dang-chon')
    if (!bang.hidden) cd.boc.style.pointerEvents = 'auto'
  }
  function trungPhanTu(x, y) {
    var ds = document.elementsFromPoint(x, y)
    for (var i = 0; i < ds.length; i++) {
      var e = ds[i]
      if (bang.contains(e) || cd.boc.contains(e) || e === khungChon) continue
      if (e.closest('.kx-cdb-man, .kx-cdb-luoi, .kx-cdb-chon')) continue
      if (e === document.documentElement || e === document.body) continue
      return e
    }
    return null
  }
  function ganChon() {
    document.addEventListener('pointermove', function (e) {
      if (!chon) return
      var t = trungPhanTu(e.clientX, e.clientY)
      if (!t) {
        khungChon.hidden = true
        return
      }
      var r = t.getBoundingClientRect()
      khungChon.hidden = false
      khungChon.style.cssText = 'left:' + r.left + 'px;top:' + r.top + 'px;width:' + r.width + 'px;height:' + r.height + 'px'
      khungChon.setAttribute('data-goc', chon === 'goc' ? gocPhanTu(t).toFixed(1) + '°' : neoCho(t) || '—')
    }, true)
    var chan = function (e) {
      if (!chon) return
      if (bang.contains(e.target)) return
      e.preventDefault()
      e.stopPropagation()
      e.stopImmediatePropagation()
    }
    document.addEventListener('pointerdown', function (e) {
      if (!chon || bang.contains(e.target)) return
      chan(e)
      var t = trungPhanTu(e.clientX, e.clientY)
      var kieu = chon
      tatChon()
      if (!t) return
      if (kieu === 'goc') {
        var g = gocPhanTu(t)
        datGocManHinh(g)
        nhay('Khớp góc phần tử: ' + g.toFixed(1) + '° → máy nghiêng ' + gocManHinh().toFixed(1) + '°')
      } else {
        var neo = neoCho(t)
        if (!neo) {
          nhay('Phần tử này không làm neo được')
          return
        }
        var i = mocTaiDay()
        if (i < 0) mocDeSua(neo)
        else cd.doiNeo(day[i], neo)
        xepDay()
        apNgay()
        veLaiMoc()
        veDuongMoc()
        veLaiO()
        veLaiNote()
        nhay('Mốc này giờ neo vào ' + neo + ' (' + tenNeo(neo) + ')')
      }
    }, true)
    document.addEventListener('click', chan, true)
    document.addEventListener('keydown', function (e) {
      if (chon && e.key === 'Escape') {
        tatChon()
        nhay('Đã huỷ chọn')
      }
    }, true)
  }

  function batGizmo() {
    var keo = null

    svg.addEventListener('pointerdown', function (e) {
      var tay = e.target.getAttribute && e.target.getAttribute('data-tay')
      if (!tay) return
      var m = mocDeSua() // bắt đầu kéo = sửa (hoặc tạo) mốc TẠI vị trí cuộn này
      if (!m) return
      var r = cd.boc.getBoundingClientRect()
      keo = {
        tay: tay,
        mx: e.clientX,
        my: e.clientY,
        q: q(),
        h0: hcnMay(), // hình máy lúc bắt đầu kéo — để hít lưới
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
          // KHÔNG đặt tên `q`: `var` bị đẩy lên đầu hàm, che mất hàm q() quy
          // đổi px — `q: q()` ở trên thành gọi undefined và MỌI cú kéo gizmo
          // (phóng, dời, xoay) văng lỗi ngay lúc nhấn. Đây từng là lỗi thật.
          var kc = (ds[i].x - cx100) * (ds[i].x - cx100) + (ds[i].y - cy100) * (ds[i].y - cy100)
          if (kc < tot) {
            tot = kc
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
      var pdx = e.clientX - keo.mx // px màn
      var pdy = e.clientY - keo.my
      var dx = pdx / keo.q.ux // px thiết kế
      var dy = pdy / keo.q.uy
      var nac = e.shiftKey
      var batNac = function (v, b) {
        return nac ? Math.round(v / b) * b : v
      }
      // Dời có hít lưới (Shift = bắt nấc thay cho hít).
      var doiHut = function (chiX, chiY) {
        if (nac) return [dx, dy]
        var h = hut(keo.h0, pdx, pdy, chiX, chiY)
        return [h[0] / keo.q.ux, h[1] / keo.q.uy]
      }

      if (keo.tay === 'tuDo') {
        var d2 = doiHut(false, false)
        dat('x', batNac(keo.dau.x + d2[0], CONFIG.nacDoi))
        dat('y', batNac(keo.dau.y + d2[1], CONFIG.nacDoi))
      } else if (keo.tay === 'x') {
        dat('x', batNac(keo.dau.x + doiHut(true, false)[0], CONFIG.nacDoi))
      } else if (keo.tay === 'y') {
        dat('y', batNac(keo.dau.y + doiHut(false, true)[1], CONFIG.nacDoi))
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
        var w2 = batNac(Math.round(keo.dau.w * ti), CONFIG.nacDoi)
        // Phóng quanh TÂM máy: máy đặt theo tâm (x + w/2), nên bù x/y nửa phần đổi.
        dat('x', Math.round(keo.dau.x - (w2 - keo.dau.w) / 2))
        dat('y', Math.round(keo.dau.y - (w2 - keo.dau.w) / 2))
        dat('w', w2)
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
      var m = mocDeSua()
      if (!m) return
      keoThan = { mx: e.clientX, my: e.clientY, x: m.x, y: m.y, q: q(), h0: hcnMay() }
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
      var pd = e.shiftKey
        ? [e.clientX - keoThan.mx, e.clientY - keoThan.my]
        : hut(keoThan.h0, e.clientX - keoThan.mx, e.clientY - keoThan.my)
      dat('x', b(keoThan.x + pd[0] / keoThan.q.ux))
      dat('y', b(keoThan.y + pd[1] / keoThan.q.uy))
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
    // Mở EDITOR 3D (tools/cd-visualizer) — nơi chỉnh chính chiếc máy: vật
    // liệu, đĩa, màn hình, nhạc… rồi "Lưu sang website".
    var bEd = el('button', 'kx-cdb__editor', '🛠 Mở editor 3D (máy CD)')
    bEd.type = 'button'
    bEd.title = 'Mở trình chỉnh máy CD (tools/cd-visualizer, cổng 3114) ở tab mới — chưa chạy thì serve.mjs tự bật'
    bEd.addEventListener('click', function () {
      moEditor(tb)
    })
    wrap.appendChild(bEd)
    wrap.appendChild(tb)
    veCong()
    return wrap
  }

  /* Bấm nút: mở tab TRỐNG ngay trong cú bấm (sau một lần await trình duyệt
   * coi là popup và chặn), hỏi serve.mjs bật editor nếu chưa chạy, rồi trỏ
   * tab đó tới editor. Mở bằng server khác (không có endpoint) thì thử thẳng
   * localhost:3114 — editor đang chạy sẵn thì vẫn vào được. */
  var EDITOR_URL = 'http://localhost:3114/'
  function moEditor(tb) {
    var tab = window.open('', '_blank')
    var bao2 = function (chu) {
      tb.textContent = chu
    }
    bao2('Đang mở editor 3D…')
    fetch('/__kx-editor', { method: 'POST', headers: { 'x-kx-editor': '1' } })
      .then(function (r) {
        return r.json().catch(function () {
          return { ok: false, khongCo: true }
        })
      })
      .catch(function () {
        return { ok: false, khongCo: true }
      })
      .then(function (kq) {
        if (kq.ok || kq.khongCo) {
          var url = kq.url || EDITOR_URL
          if (tab) tab.location.href = url
          else window.open(url, '_blank')
          bao2(kq.khongCo
            ? 'Server này không tự bật được editor — nếu tab mới trống, chạy: cd tools/cd-visualizer && npm run dev'
            : kq.daChay ? 'Editor 3D đang chạy — đã mở ở tab mới' : 'Đã bật editor 3D (cổng 3114) và mở ở tab mới')
        } else {
          if (tab) tab.close()
          bao2('Không mở được editor: ' + (kq.error || 'lỗi không rõ'))
        }
      })
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
        'Cuộn trang như thật — tới đâu chỉnh tới đó (gizmo / gõ số). Chỗ chưa có mốc thì tự tạo. Xong bấm Lưu. K để đóng.'
      )
    )
    bang.appendChild(hangCongTac())

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

    // CĂN theo hình máy thật trên màn hình
    var hangCan = el('div', 'kx-cdb__goc')
    ;[
      // Tên có mũi tên: hàng góc nhìn ở trên cũng có "Trái/Phải/Trên/Dưới".
      ['trai', '⇤ Trái'], ['giuaNgang', 'Giữa ↔'], ['phai', 'Phải ⇥'], ['giua', '⊕ Giữa màn'],
      ['tren', '⤒ Trên'], ['giuaDoc', 'Giữa ↕'], ['duoi', '⤓ Dưới'],
    ].forEach(function (p) {
      var b = el('button', null, p[1])
      b.type = 'button'
      b.title = 'Căn máy (hình nhìn thấy, không phải ô vẽ) — sửa mốc tại chỗ'
      b.addEventListener('click', function () {
        can(p[0])
      })
      hangCan.appendChild(b)
    })
    bang.appendChild(el('p', 'kx-cdb__moc-ten', 'Căn máy theo màn hình (lề ' + CONFIG.canLe + ' px thiết kế)'))
    bang.appendChild(hangCan)
    // Lưới 12 + hít lưới — bật/tắt tại chỗ, không ghi xuống file.
    var hangLuoi = el('div', 'kx-cdb__hai')
    var bLuoi = el('button', null, '')
    var bHut = el('button', null, '')
    bLuoi.type = 'button'
    bHut.type = 'button'
    var veNutLuoi = function () {
      bLuoi.textContent = '▦ Lưới 12 · ' + (CONFIG.luoi ? 'Hiện' : 'Ẩn')
      bHut.textContent = '⌖ Hít lưới · ' + (CONFIG.hut ? 'Bật' : 'Tắt')
      bLuoi.classList.toggle('is-on', !!CONFIG.luoi)
      bHut.classList.toggle('is-on', !!CONFIG.hut)
    }
    bLuoi.title = '12 cột (lề 24, rãnh 16 — như lưới G) + 12 hàng đều theo chiều cao'
    bHut.title = 'Kéo máy thì mép/tâm hình máy hít vào đường lưới gần nhất. Giữ Shift = bắt nấc thay cho hít.'
    bLuoi.addEventListener('click', function () {
      CONFIG.luoi = !CONFIG.luoi
      veNutLuoi()
      veLuoi()
    })
    bHut.addEventListener('click', function () {
      CONFIG.hut = !CONFIG.hut
      veNutLuoi()
    })
    veNutLuoi()
    hangLuoi.appendChild(bLuoi)
    hangLuoi.appendChild(bHut)
    bang.appendChild(hangLuoi)

    var bCo = el('button', 'kx-cdb__rong', '⇔ Đồng bộ cỡ cho mọi mốc')
    bCo.type = 'button'
    bCo.title = 'Lấy cỡ máy đang thấy ở đây (cạnh ô vẽ + camera lùi) chép sang mọi mốc của viewport này; tâm máy ở từng mốc giữ nguyên'
    bCo.addEventListener('click', dongBoCo)
    bang.appendChild(bCo)

    // LẬT NHANH 90° / 180° quanh trục CỦA MÁY (người dùng: "thêm các nút lật
    // 90, 180 độ") — cùng cách tính với vòng gizmo nên không dính khoá gimbal.
    var hangLat = el('div', 'kx-cdb__lat')
    ;[
      ['rotX', -90, 'X −90'], ['rotX', 90, 'X +90'], ['rotX', 180, 'X 180'],
      ['rotY', -90, 'Y −90'], ['rotY', 90, 'Y +90'], ['rotY', 180, 'Y 180'],
      ['rotZ', -90, 'Z −90'], ['rotZ', 90, 'Z +90'], ['rotZ', 180, 'Z 180'],
    ].forEach(function (p) {
      var b = el('button', null, p[2])
      b.type = 'button'
      b.title = 'Xoay máy ' + p[1] + '° quanh trục ' + p[0].slice(-1) + ' của chính nó — sửa mốc tại chỗ'
      b.addEventListener('click', function () {
        lat(p[0], p[1])
      })
      hangLat.appendChild(b)
    })
    var b0 = el('button', null, 'Về 0°')
    b0.type = 'button'
    b0.title = 'Trả cả ba góc xoay về 0'
    b0.addEventListener('click', function () {
      var m = mocDeSua()
      if (!m) return
      m.rotX = 0
      m.rotY = 0
      m.rotZ = 0
      apNgay()
      veLaiO()
      nhay('Góc xoay về 0°')
    })
    hangLat.appendChild(b0)
    bang.appendChild(el('p', 'kx-cdb__moc-ten', 'Lật nhanh (quanh trục của máy)'))
    bang.appendChild(hangLat)

    // XOAY THEO MÀN HÌNH — trục của màn, không phải của máy.
    bang.appendChild(el('p', 'kx-cdb__moc-ten', 'Xoay theo màn hình (độ) — Shift: ×5'))
    ;[
      ['Quay', 'y', [['◀ 5', -5], ['◀ 1', -1], ['1 ▶', 1], ['5 ▶', 5]], 'Quay mặt máy sang trái / phải'],
      ['Ngả', 'x', [['▲ 5', -5], ['▲ 1', -1], ['▼ 1', 1], ['▼ 5', 5]], 'Ngả mặt máy lên / xuống'],
      ['Nghiêng', 'z', [['⟲ 5', 5], ['⟲ 1', 1], ['⟳ 1', -1], ['⟳ 5', -5]], 'Nghiêng trong mặt phẳng màn hình'],
    ].forEach(function (h) {
      var hang = el('div', 'kx-cdb__man')
      hang.appendChild(el('span', null, h[0]))
      h[2].forEach(function (n) {
        var b = el('button', null, n[0])
        b.type = 'button'
        b.title = h[3] + ' — sửa mốc tại chỗ'
        b.addEventListener('click', function (e) {
          xoayManHinh(h[1], n[1] * (e.shiftKey ? 5 : 1))
        })
        hang.appendChild(b)
      })
      bang.appendChild(hang)
    })
    var hangGoc2 = el('div', 'kx-cdb__row')
    hangGoc2.appendChild(el('label', null, 'Nghiêng trên màn (°)'))
    oGoc = document.createElement('input')
    oGoc.type = 'number'
    oGoc.step = 0.5
    oGoc.title = 'Góc của cạnh ngang máy trên màn hình, chiều kim đồng hồ dương (như CSS rotate). Gõ số = máy xoay tới đúng góc đó.'
    oGoc.addEventListener('change', function () {
      var v = parseFloat(oGoc.value)
      if (!isNaN(v)) datGocManHinh(v)
    })
    hangGoc2.appendChild(oGoc)
    bang.appendChild(hangGoc2)
    var hangChon = el('div', 'kx-cdb__hai')
    var bKhop = el('button', null, '🎯 Khớp góc phần tử')
    bKhop.type = 'button'
    bKhop.title = 'Bấm nút rồi bấm vào một ảnh / chữ trên trang: máy nghiêng trên màn đúng góc của nó'
    bKhop.addEventListener('click', function () {
      batChon('goc')
    })
    var bNeo = el('button', null, '📌 Neo vào phần tử')
    bNeo.type = 'button'
    bNeo.title = 'Bấm nút rồi bấm vào phần tử trên trang: mốc tại chỗ bám theo phần tử đó ở mọi cỡ màn (máy đứng nguyên chỗ)'
    bNeo.addEventListener('click', function () {
      batChon('neo')
    })
    hangChon.appendChild(bKhop)
    hangChon.appendChild(bNeo)
    bang.appendChild(hangChon)

    hangMoc = el('div', 'kx-cdb__moc')
    bang.appendChild(hangMoc)

    // GIỮ TƯ THẾ từ mốc trước tới vị trí đang cuộn.
    var hangGiu = el('div', 'kx-cdb__hai')
    var bGiuMan = el('button', null, '⏸ Đứng yên trên màn tới đây')
    bGiuMan.type = 'button'
    bGiuMan.title = 'Chép tư thế + chỗ trên màn của MỐC TRƯỚC sang đây: cả đoạn máy đứng im, trang trôi qua bên dưới'
    bGiuMan.addEventListener('click', function () {
      giuTuThe('man')
    })
    var bGiuTrang = el('button', null, '↕ Trôi theo trang tới đây')
    bGiuTrang.type = 'button'
    bGiuTrang.title = 'Chép tư thế của MỐC TRƯỚC sang đây, neo cùng phần tử: cả đoạn máy dính vào nội dung, cuộn đi cùng chữ'
    bGiuTrang.addEventListener('click', function () {
      giuTuThe('trang')
    })
    hangGiu.appendChild(bGiuMan)
    hangGiu.appendChild(bGiuTrang)
    bang.appendChild(el('p', 'kx-cdb__moc-ten', 'Giữ nguyên tư thế mốc trước (cuộn tới chỗ muốn hết đoạn giữ rồi bấm)'))
    bang.appendChild(hangGiu)

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
    nutLuu = bLuu
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
    /* Thông báo NỔI giữa đáy màn, không nằm trong bảng: bảng dài và cuộn
     * riêng nên dòng báo ở cuối bảng khuất mất — người dùng bấm "Đồng bộ cỡ"
     * không thấy phản hồi nào, tưởng nút hỏng. */
    bao = el('div', 'kx-cdb-bao')
    bao.setAttribute('role', 'status')
    document.body.appendChild(bao)

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

  // Nạp dãy đang chạy làm bản nháp (mốc kiểu cũ đã được quy sang neo).
  function chonVp() {
    vpDangSua = 'chung'
    day = cd.dayNeo()
    apNgay()
    datChua(false) // vừa nạp từ bản đã lưu
    veLaiMoc()
    veDuongMoc()
    veLaiO()
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
    if (mo) {
      // Máy chạy THEO CUỘN như ngoài site — không ép tư thế nào cả.
      cd.deTay(null)
      chonVp()
      if (lopMoc) lopMoc.hidden = false
      veLuoi()
      veLaiCheDo()
      xuatJson()
      if (!rafVong) rafVong = requestAnimationFrame(chayCapNhat)
    } else {
      if (lopMoc) lopMoc.hidden = true
      if (lopLuoi) lopLuoi.hidden = true
      cd.deTay(null)
    }
  }

  function boot() {
    if (!CONFIG.enabled) return
    cd = window.KX_CD3D
    if (!cd) return
    vpDangSua = 'chung'
    dungBang()
    ganChon()
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
        // Cuộn tới đâu, ô số hiện tư thế ở đó; chip sáng nếu đang đứng trên mốc.
        veLaiO()
        veLaiNote()
        sangChip()
      },
      { passive: true }
    )

    addEventListener('resize', function () {
      if (!bang.hidden) {
        veDuongMoc() // cao trang đổi → vị trí dấu mốc đổi
        veLuoi()
        veLaiNote()
      }
    })

    // Lộ ra để gỡ rối / đo: hình máy, đường lưới, xoay theo màn, góc phần tử.
    window.KX_CD3D_BUILDER = { config: CONFIG, bat: bat, chonVp: chonVp, hcnMay: hcnMay, dichLuoi: dichLuoi, hut: hut, giuTuThe: giuTuThe, xoayManHinh: xoayManHinh, gocManHinh: gocManHinh, gocPhanTu: gocPhanTu, datGocManHinh: datGocManHinh, neoCho: neoCho, batChon: batChon, get day() { return day } }
  }

  // Chờ kx-cd3d.js dựng xong rồi mới nối — nó là module nên chạy sau file này.
  if (window.KX_CD3D) boot()
  else addEventListener('kx-cd3d-ready', boot, { once: true })
})()
