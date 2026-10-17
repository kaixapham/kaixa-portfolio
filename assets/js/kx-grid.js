/* =============================================================================
 * kaixa Portfolio — Lưới cột của website (bấm G để xem)
 * -----------------------------------------------------------------------------
 * Phủ lưới cột lên viewport đúng như "Layout grid" của Figma: 12 cột kiểu
 * Stretch, lề 24, rãnh 16, đỏ 10% (người dùng khai). Số tính bằng PX THIẾT KẾ
 * (khung 1920) nên lưới co giãn y như trang: 1 px thiết kế = 100cqw / 1920 —
 * cùng gốc với `--u = 100cqw / 120` của `.kx-page` (body là container nên
 * `cqw` ở đây tính theo đúng bề rộng body, không tính thanh cuộn).
 *
 * File LÀM VIỆC, không phải hiệu ứng: bàn giao thì xoá đúng MỘT thẻ script
 * `kx-grid.js` trong tools/figma-to-html.mjs. Bật/tắt nhớ trong localStorage
 * cho tiện khi đang căn chỉnh.
 *
 * Ở Home, khi bảng chỉnh CD (kx-cd3d-builder.js) đang MỞ thì G là phím "Dời"
 * của gizmo — lúc đó file này nhường phím.
 * ========================================================================== */
(function () {
  'use strict'

  var CONFIG = {
    enabled: true,
    phim: 'g',
    count: 12, // số cột
    color: '#ff0000',
    alpha: 0.1, // độ đậm màu cột (0..1)
    margin: 24, // px thiết kế — lề hai bên
    gutter: 16, // px thiết kế — rãnh giữa hai cột
    // Kiểu Stretch của Figma: cột giãn lấp đầy khoảng giữa hai lề.
  }

  var S = CONFIG
  var LUU = 'kx-grid:mo'
  var api = (window.KX_GRID = { config: S, defaults: Object.freeze(Object.assign({}, CONFIG)) })
  var luoi = null

  function rgba() {
    var h = String(S.color).replace('#', '')
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
    var n = parseInt(h, 16) || 0
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + S.alpha + ')'
  }

  function ve() {
    if (!luoi) return
    var px = 'calc(100cqw / 1920)'
    luoi.style.cssText =
      'position:fixed;inset:0;z-index:9990;pointer-events:none;display:grid;' +
      'grid-template-columns:repeat(' + Math.max(1, S.count | 0) + ',1fr);' +
      'column-gap:calc(' + S.gutter + ' * ' + px + ');' +
      'padding:0 calc(' + S.margin + ' * ' + px + ');box-sizing:border-box' +
      (luoi.dataset.mo === '1' ? '' : ';display:none')
    var mau = rgba()
    while (luoi.children.length < S.count) luoi.appendChild(document.createElement('div'))
    while (luoi.children.length > S.count) luoi.removeChild(luoi.lastChild)
    for (var i = 0; i < luoi.children.length; i++) luoi.children[i].style.background = mau
  }

  function bat(mo) {
    if (!luoi) return
    mo = mo == null ? luoi.dataset.mo !== '1' : mo
    luoi.dataset.mo = mo ? '1' : '0'
    ve()
    try {
      localStorage.setItem(LUU, mo ? '1' : '0')
    } catch (e) {}
  }

  function boot() {
    if (!S.enabled) return
    luoi = document.createElement('div')
    luoi.className = 'kx-grid'
    luoi.setAttribute('aria-hidden', 'true')
    document.body.appendChild(luoi)
    var mo = false
    try {
      mo = localStorage.getItem(LUU) === '1'
    } catch (e) {}
    bat(mo)

    document.addEventListener('keydown', function (e) {
      if (e.key.toLowerCase() !== S.phim) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      var t = e.target
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      // Bảng chỉnh CD đang mở: G thuộc về gizmo của nó.
      var cdb = document.querySelector('.kx-cdb')
      if (cdb && !cdb.hidden) return
      bat()
    })

    Object.assign(api, { bat: bat, apDung: ve })
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true })
  else boot()
})()
