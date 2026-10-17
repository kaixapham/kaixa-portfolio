/* =============================================================================
 * kaixa Portfolio — Chữ mọc dần + ô vuông con trỏ chạy theo, khi rê chuột
 * -----------------------------------------------------------------------------
 * Rê chuột vào một DÒNG thì chữ trong ô RÚT LẠI CÒN MỘT KÍ TỰ rồi mọc dần từng
 * kí tự cho tới khi về đúng nội dung ban đầu, và một ô vuông trắng nhấp nháy
 * bám ngay sau kí tự cuối đang hiện, trượt sang phải theo chữ. Đúng kiểu dòng
 * lệnh đang gõ trên màn hình terminal.
 *
 * MƯỢT THÌ PHẢI DỰNG SẴN — cùng lối với kx-hover-invert.js:
 *   1. `prep()` đo sẵn mọi ô khớp `rows` một lượt lúc font xong: chỗ đứng của
 *      kí tự đầu, bề rộng một kí tự, chiều cao chữ hoa, đường chân chữ. Ô vuông
 *      cũng dựng sẵn luôn, nằm im ở opacity 0. Lúc rê chuột KHÔNG đo, KHÔNG tạo
 *      thẻ, KHÔNG xoá thẻ — rê nhanh cỡ nào cũng không giật.
 *   2. MỘT vòng `requestAnimationFrame` lo tất: tiến độ gõ, chỗ đứng ô vuông,
 *      độ mờ. Bản cũ dùng chuỗi `setTimeout` cho từng kí tự nên nhịp trôi dần
 *      và đá nhau khi đổi dòng liên tục.
 *   3. Ô vuông dịch bằng `transform: translate3d()` chứ không đổi `left`, và
 *      TRƯỢT tới chỗ mới theo `chase` chứ không nhảy cóc từng kí tự.
 *   Vòng lặp chỉ sống khi còn ô đang chạy; xong thì dừng hẳn.
 *
 * Ô VUÔNG LÀ VUÔNG THẬT, CAO ĐÚNG BẰNG CHỮ HOA:
 *   Cạnh ô lấy bằng chiều cao chữ hoa đo bằng canvas
 *   (`measureText('H').actualBoundingBoxAscent`) chứ không lấy hộp của Range —
 *   hộp Range là hộp EM của font, cao hơn chữ hoa nhiều nên ô đặt theo nó vừa
 *   lệch khỏi dòng vừa không còn vuông. Đáy ô đặt đúng trên ĐƯỜNG CHÂN CHỮ.
 *   Đây từng là lỗi thật.
 *
 * KHÔNG ĐỤNG VÀO LAYOUT:
 *   - Ô vuông `position: absolute` nên không chiếm chỗ. Chèn khối inline vào
 *     cuối dòng thì dòng dài thêm, gặp dòng đã chạm mép là nó rơi xuống hàng
 *     dưới — cả cụm nhảy một nhịp ngay dưới con trỏ.
 *   - Kí tự CHƯA MỌC thay bằng NBSP chứ không xoá, nên chuỗi luôn dài y như cũ:
 *     chỗ ngắt dòng không đổi, cột bên cạnh không xê dịch. Khoảng trắng thật thì
 *     giữ nguyên tuyệt đối. Đây là luật của kx-shuffle-text.js.
 *   - Geist Mono đều bề ngang nên chỗ đứng của ô tính bằng phép nhân (mép trái
 *     + số kí tự × bề rộng một kí tự), không phải đo lại mỗi bước gõ.
 *
 * Nhấp nháy để CSS lo: ô vuông là hai lớp lồng nhau — lớp ngoài cho JS chỉnh
 * chỗ đứng với độ mờ, lớp trong chạy keyframes. Hai bên không giành nhau
 * `opacity`.
 *
 * CÁCH DÙNG: nạp SAU kx-hello-mate.js. Chỉnh bằng CONFIG ngay bên dưới. File
 * này KHÔNG chứa UI setting — bảng tinh chỉnh nằm ở file riêng.
 * ========================================================================== */
(() => {
  'use strict'

  // CONFIG để phẳng cho khớp bảng tinh chỉnh (bảng đọc config[key]).
  const CONFIG = {
    enabled: true,

    // ------------------------------------------------------------- bắt chuột
    rows: '.hm-awards p',
    cells: '',

    // ------------------------------------------------------------- ô vuông
    color: '#ffffff',
    size: 0, // 0 = cạnh ô tự bằng chiều cao chữ hoa (luôn vuông). > 0 = ép, px thiết kế.
    gap: 3, // khe giữa kí tự cuối và ô, px thiết kế
    dy: 0, // dịch dọc thêm, số dương là xuống, px thiết kế
    blend: 'normal', // 'normal' | 'difference'

    // --------------------------------------------------- hiện, tắt, trượt
    // Cùng nhịp với kx-hover-invert.js: vào gọn, ra thong thả.
    fadeInMs: 55,
    fadeOutMs: 235,
    chase: 0.34, // ô vuông trượt tới chỗ mới nhanh cỡ nào (1 = nhảy dứt khoát)

    // ------------------------------------------------------------ nhấp nháy
    blink: true,
    blinkMs: 520, // một chu kì tắt rồi bật

    // --------------------------------------------------------- chữ mọc dần
    reveal: true,
    startChars: 1, // hover xong còn lại mấy kí tự
    stepMs: 26, // ms cho mỗi kí tự mọc thêm
    charsPerStep: 1,
    noise: 2, // mấy kí tự ở đầu mút nhảy loạn trước khi đứng (0 = mọc trơn)
    symbols: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*/+=-',

    // ---------------------------------------------------------------- khác
    // Khoá bôi đen trên những dòng hiệu ứng bắt. Ở đây bắt buộc hơn cả bên kia:
    // chữ chưa mọc đang là NBSP, bôi đen vào là copy ra một chuỗi rỗng toang
    // hoác. Kèm `cursor: default` cho khỏi hiện con trỏ chữ I.
    noSelect: true,
    maxChars: 400, // trần số kí tự một ô
    maxCells: 400, // trần số ô dựng sẵn cho cả trang
  }

  const S = CONFIG
  const NBSP = ' '

  /* ============================================================== đơn vị --u */

  let unitPx = 16
  function readUnit() {
    const hm = document.querySelector('.hm')
    if (!hm) return
    const v = parseFloat(getComputedStyle(hm).fontSize)
    if (v > 0) unitPx = v
  }
  const u = (px) => (px / 16) * unitPx

  /* ===================================================================== CSS */

  // ĐỪNG viết dấu huyền ngược trong khối này — cả file là template literal.
  const CSS_ID = 'kx-hover-caret-css'
  function ensureCss() {
    if (document.getElementById(CSS_ID)) return
    const st = document.createElement('style')
    st.id = CSS_ID
    st.textContent = [
      '.kx-hc-sq{position:absolute;left:0;pointer-events:none;z-index:2;opacity:0;will-change:transform,opacity}',
      '.kx-hc-bl{display:block;width:100%;height:100%}',
      '@keyframes kx-hc-blink{0%,49%{opacity:1}50%,100%{opacity:0}}',
      '.kx-nosel{-webkit-user-select:none;user-select:none;cursor:default}',
    ].join('\n')
    document.head.appendChild(st)
  }

  /* ========================================================= đo font một lần */

  const fontCache = new Map()
  let ctx2d = null
  function metrics(fontStr) {
    if (fontCache.has(fontStr)) return fontCache.get(fontStr)
    if (!ctx2d) ctx2d = document.createElement('canvas').getContext('2d')
    ctx2d.font = fontStr
    const m = ctx2d.measureText('H')
    const size = parseFloat(fontStr) || 14
    const out = {
      cap: m.actualBoundingBoxAscent > 0 ? m.actualBoundingBoxAscent : size * 0.72,
      asc: m.fontBoundingBoxAscent > 0 ? m.fontBoundingBoxAscent : size * 0.95,
    }
    fontCache.set(fontStr, out)
    return out
  }

  /* ============================================== đo một ô (chỉ lúc dựng sẵn) */

  function scan(cell) {
    const nodes = []
    let total = 0
    const walk = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT)
    let n
    while ((n = walk.nextNode())) {
      const text = n.nodeValue
      if (!text || !text.trim()) continue
      if (total + text.length > S.maxChars) break
      nodes.push({ node: n, text, from: total })
      total += text.length
    }
    if (!nodes.length) return null

    const first = nodes[0]
    const r = document.createRange()
    r.setStart(first.node, 0)
    r.setEnd(first.node, 1)
    const rects = Array.from(r.getClientRects())
    r.detach && r.detach()
    if (!rects.length) return null
    const box = rects[0]
    const host = cell.getBoundingClientRect()

    const cs = getComputedStyle(cell)
    const fm = metrics(cs.font || cs.fontSize + ' ' + cs.fontFamily)
    const side = S.size > 0 ? u(S.size) : fm.cap

    // Kí tự CUỐI CÙNG có nghĩa (bỏ khoảng trắng đuôi) — ô vuông không bao giờ
    // đứng sau một dấu cách lửng lơ.
    let lastReal = 0
    nodes.forEach((it) => {
      for (let i = 0; i < it.text.length; i++) {
        const c = it.text[i]
        if (c !== ' ' && c !== '\n' && c !== '\t' && c !== '\r' && c !== NBSP) lastReal = it.from + i + 1
      }
    })

    return {
      nodes,
      total,
      lastReal,
      charW: box.width,
      x0: box.left - host.left,
      top: box.top - host.top + fm.asc - side + u(S.dy), // đáy ô trùng đường chân chữ
      side,
    }
  }

  /* ============================================== dựng sẵn, rồi chỉ đổi mốc */

  const recs = new Map()
  let raf = 0
  let last = 0
  let hovered = null

  function cellsOf(row) {
    if (!S.cells) return [row]
    const found = Array.from(row.querySelectorAll(S.cells))
    return found.length ? found : [row]
  }

  function restore(rec) {
    for (let i = 0; i < rec.nodes.length; i++) {
      const it = rec.nodes[i]
      if (it.node.nodeValue !== it.text) it.node.nodeValue = it.text
    }
  }

  function huy() {
    recs.forEach((rec, cell) => {
      restore(rec)
      rec.sq.remove()
      cell.classList.remove('kx-nosel')
      if (rec.row) rec.row.classList.remove('kx-nosel')
    })
    recs.clear()
    hovered = null
  }

  function prep() {
    huy()
    if (!S.rows) return
    const rows = Array.from(document.querySelectorAll(S.rows))
    let dem = 0

    for (let r = 0; r < rows.length; r++) {
      const row = rows[r]
      const cells = cellsOf(row)
      for (let c = 0; c < cells.length; c++) {
        const cell = cells[c]
        if (recs.has(cell) || dem >= S.maxCells) continue
        const rec = scan(cell)
        if (!rec) continue
        if (getComputedStyle(cell).position === 'static') cell.style.position = 'relative'

        const sq = document.createElement('span')
        sq.className = 'kx-hc-sq'
        sq.style.top = rec.top + 'px'
        sq.style.width = rec.side + 'px'
        sq.style.height = rec.side + 'px'
        if (S.blend !== 'normal') sq.style.mixBlendMode = S.blend

        const bl = document.createElement('i')
        bl.className = 'kx-hc-bl'
        bl.style.background = S.color
        if (S.blink) bl.style.animation = 'kx-hc-blink ' + Math.max(60, S.blinkMs) + 'ms steps(1,end) infinite'
        sq.appendChild(bl)
        cell.appendChild(sq)

        if (S.noSelect) {
          cell.classList.add('kx-nosel')
          row.classList.add('kx-nosel')
        }
        rec.row = row
        rec.sq = sq
        rec.open = false
        rec.o = 0 // độ mờ hiện tại
        rec.ow = -1 // độ mờ đã ghi
        rec.x = rec.x0 + u(S.gap) // chỗ đứng hiện tại của ô vuông
        rec.xw = -1 // chỗ đứng đã ghi
        rec.shown = -1 // số kí tự đang hiện
        rec.t0 = 0 // mốc bắt đầu gõ
        recs.set(cell, rec)
        dem++
      }
    }
  }

  /* =================================================================== vẽ */

  function pick() {
    return S.symbols.charAt((Math.random() * S.symbols.length) | 0) || '?'
  }

  // Ghi chuỗi ở bước `shown`: kí tự đã mọc là chữ thật, mấy kí tự ở đầu mút
  // nhảy loạn, phần chưa tới lượt để NBSP cho khỏi đổi độ dài.
  function paint(rec, shown) {
    const noise = Math.max(0, S.noise)
    for (let k = 0; k < rec.nodes.length; k++) {
      const it = rec.nodes[k]
      const src = it.text
      let s = ''
      for (let i = 0; i < src.length; i++) {
        const c = src[i]
        if (c === ' ' || c === '\n' || c === '\t' || c === '\r' || c === NBSP) {
          s += c
          continue
        }
        const gi = it.from + i
        if (gi < shown - noise) s += c
        else if (gi < shown) s += pick()
        else s += NBSP
      }
      if (it.node.nodeValue !== s) it.node.nodeValue = s
    }
  }

  function tick(now) {
    raf = 0
    const dt = last ? Math.min(64, now - last) : 16.7
    last = now

    const kIn = 1 - Math.exp((-3 * dt) / Math.max(16, S.fadeInMs))
    const kOut = 1 - Math.exp((-3 * dt) / Math.max(16, S.fadeOutMs))
    const kChase = 1 - Math.pow(1 - Math.min(0.99, Math.max(0.02, S.chase)), dt / 16.7)
    const gap = u(S.gap)
    const noise = Math.max(0, S.noise)
    let alive = false

    recs.forEach((rec) => {
      const t = rec.open ? 1 : 0
      if (t === 0 && rec.o <= 0.0015 && rec.shown < 0) return // nằm im, bỏ qua cho rẻ

      // ---- chữ mọc dần, tính theo ĐỒNG HỒ THẬT nên nhịp không trôi
      if (rec.open && S.reveal) {
        const het = rec.total + noise
        const buoc = Math.max(1, S.charsPerStep)
        const can = Math.min(het, Math.max(0, S.startChars) + Math.floor((now - rec.t0) / Math.max(8, S.stepMs)) * buoc)
        if (can !== rec.shown) {
          rec.shown = can
          if (can >= het) restore(rec)
          else paint(rec, can)
        } else if (can < het && noise > 0) {
          paint(rec, can) // mấy kí tự đầu mút vẫn nhảy trong lúc chờ bước kế
        }
      }

      // ---- ô vuông trượt tới sau kí tự cuối đang hiện
      const at = rec.open && S.reveal && rec.shown >= 0 ? Math.min(rec.shown, rec.lastReal) : rec.lastReal
      const xT = rec.x0 + at * rec.charW + gap
      rec.x += (xT - rec.x) * kChase

      rec.o += (t - rec.o) * (t > rec.o ? kIn : kOut)
      if (t === 0 && rec.o < 0.006) {
        rec.o = 0
        if (rec.shown >= 0) {
          restore(rec) // rời chuột là chữ về nguyên vẹn
          rec.shown = -1
          rec.x = rec.x0 + rec.lastReal * rec.charW + gap // đặt lại cho lượt sau
        }
      }

      if (Math.abs(rec.x - rec.xw) > 0.05) {
        rec.sq.style.transform = 'translate3d(' + rec.x.toFixed(2) + 'px,0,0)'
        rec.xw = rec.x
      }
      if (Math.abs(rec.o - rec.ow) > 0.004 || (rec.o === 0 && rec.ow !== 0)) {
        rec.sq.style.opacity = rec.o.toFixed(3)
        rec.ow = rec.o
      }
      if (rec.o > 0.0015 || rec.shown >= 0) alive = true
    })

    if (alive) raf = requestAnimationFrame(tick)
    else last = 0
  }

  function start() {
    if (!raf) raf = requestAnimationFrame(tick)
  }

  /* ============================================================== bắt sự kiện */

  // Rê chuột chỉ gạt cờ và đặt mốc giờ. Không đo, không tạo thẻ, không xoá thẻ.
  function onMove(e) {
    if (!S.enabled) return
    const el = e.target instanceof Element ? e.target : null
    const row = el && S.rows ? el.closest(S.rows) : null
    if (row === hovered) return
    hovered = row

    // Màn mở trang của kx-shuffle-text.js đang chạy thì đừng đụng vào chữ.
    const banChu = !!(window.KX_SHUFFLE_TEXT && window.KX_SHUFFLE_TEXT.running)

    recs.forEach((rec) => {
      const on = !!row && rec.row === row
      if (on === rec.open) return
      rec.open = on
      if (on) {
        rec.t0 = performance.now()
        if (banChu) rec.shown = rec.total + Math.max(0, S.noise)
      }
    })
    start()
  }

  function buong() {
    hovered = null
    recs.forEach((rec) => {
      rec.open = false
    })
    start()
  }

  /* ================================================================ khởi động */

  function boot() {
    ensureCss()
    readUnit()

    // Chờ font xong rồi mới đo: Geist Mono và font dự phòng rộng khác nhau, đo
    // sớm thì bề rộng kí tự sai và ô vuông đứng lệch.
    const go = () => {
      readUnit()
      fontCache.clear()
      prep()
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => setTimeout(go, 30))
    else setTimeout(go, 60)

    document.addEventListener('mousemove', onMove, { passive: true, capture: true })
    document.addEventListener('mouseleave', buong)

    let hen = 0
    window.addEventListener('resize', () => {
      clearTimeout(hen)
      hen = setTimeout(go, 150) // đo lại một lần sau khi kéo xong
    })

    // CHỮ KÝ LẤY NGAY LÚC NÀY, đừng để rỗng — để rỗng thì nhịp quét đầu tiên
    // nào cũng thấy "khác" và dựng lại giữa lúc đang chạy. Đây từng là lỗi thật.
    const stamp = () => [S.enabled, S.rows, S.cells, S.blend, S.blink, S.blinkMs, S.size, S.dy, S.color, S.noSelect].join('|')
    let sig = stamp()
    setInterval(() => {
      const now = stamp()
      if (now === sig) return
      sig = now
      prep()
    }, 400)
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true })
  } else {
    boot()
  }

  // Chỉ để bảng tinh chỉnh đọc/ghi lúc chạy.
  window.KX_HOVER_CARET = {
    config: S,
    defaults: Object.freeze({ ...CONFIG }),
    refresh: prep, // đổi nội dung chữ trong trang thì gọi cái này để đo lại
    clear: huy,
  }
})()
