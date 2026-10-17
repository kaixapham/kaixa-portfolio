/* =============================================================================
 * kaixa Portfolio — Đảo màu khi rê chuột, có VỆT ĐUÔI đọng lại
 * -----------------------------------------------------------------------------
 * Rê chuột vào một DÒNG thì mỗi ô trong dòng bị một thanh trắng quét ngang từ
 * mép trái ra, chữ dưới thanh ĐẢO MÀU — nền trắng chữ đen, như bôi đen chữ
 * trong terminal.
 *
 * CÁI LÀM NÊN HIỆU ỨNG LÀ LÚC RỜI: thanh KHÔNG tắt theo dòng, nó rút về mép
 * trái chậm hơn lúc quét vào. Rê dọc nhanh qua một bảng thì mỗi dòng vừa đi
 * qua còn đọng một đoạn, dòng chạm sau cùng dài nhất, dòng cũ nhất chỉ còn một
 * mẩu — cả bảng thành một vệt bậc thang chạy theo con trỏ.
 *
 * MUỐN MƯỢT THÌ PHẢI DỰNG SẴN. Đo hộp chữ rồi tạo thẻ NGAY LÚC CHUỘT VÀO là
 * giật: rê nhanh qua mười dòng thành mười lần ép trình duyệt tính lại layout,
 * đúng lúc đang chạy hiệu ứng. Ở đây mọi ô khớp `rows` được đo và dựng thanh
 * sẵn một lượt lúc font xong (`prep()`), thanh nằm im ở scaleX(0). Lúc rê chuột
 * KHÔNG đo gì, KHÔNG tạo gì, KHÔNG xoá gì — chỉ đổi một con số mốc. Đây từng
 * là lỗi thật.
 *
 * CÁCH NÓ ĐẢO MÀU — không đụng vào màu chữ:
 *   Thanh là khối trắng mang `mix-blend-mode: difference`, đúng cách mà
 *   `.hm-discs` và `.hm-mail` đang dùng. Trắng trừ nền tối ra trắng, trắng trừ
 *   chữ trắng ra đen — chữ TỰ đen đi dưới thanh. Nhờ vậy thanh rút nửa chừng
 *   vẫn đúng: phần còn thanh thì đen, phần hở ra thì trắng lại.
 *
 * HAI ĐIỀU CẤM TRONG VÒNG LẶP MỖI KHUNG (lệ chung của trang này):
 *   1. Không `getBoundingClientRect()` mỗi khung. Hộp của chữ đo đúng một lần
 *      lúc chuột vào.
 *   2. Không cấp phát trong vòng lặp. Mỗi ô giữ sẵn một bản ghi; mỗi khung chỉ
 *      ghi `transform: scaleX()`, không tạo mảng hay chuỗi nào khác.
 *   Vòng lặp chỉ sống khi còn ô đang sáng; vệt đuôi tan hết thì dừng hẳn.
 *
 * KHÔNG ĐỤNG VÀO LAYOUT: thanh là phần tử `position: absolute` trong ô nên
 * không chiếm chỗ; bề rộng đo bằng `Range.getClientRects()` của CHỮ (mỗi dòng
 * một hộp) chứ không lấy hộp của ô — ô `<p>` rộng 129px thiết kế mà chữ chỉ
 * chiếm một nửa thì lấy hộp sẽ thừa ra một mảng trắng.
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
    rows: '.hm-social__list p, .hm-awards p',
    cells: '',
    only: false, // true = chỉ ô đang trỏ sáng; false = cả dòng cùng sáng

    // ------------------------------------------------------------------ màu
    color: '#ffffff',
    blend: 'difference', // 'difference' = chữ tự đảo đen | 'normal' = dùng colorText
    colorText: '#040203', // chỉ có tác dụng khi blend = 'normal'

    // ------------------------------------------------ nới thanh ra khỏi chữ
    // Đơn vị là PX THIẾT KẾ (khổ 1920×1080), quy đổi qua --u như mọi chỗ khác.
    padX: 2,
    padTop: 1,
    padBottom: 1,

    // --------------------------------------------------- quét vào và rút ra
    dir: 'left', // 'left' | 'right' | 'center' — thanh mọc ra từ phía nào
    // Nhịp đo từ băng quay màn hình site gốc (30 khung/giây): highlight đầy
    // trong ĐÚNG MỘT KHUNG rồi rút hết trong khoảng sáu khung —
    //   87 · 54 · 38 · 25 · 16 · 8 · 5
    // nên vào phải gần như tức thì, ra khoảng 240ms. Để vào chậm là rê nhanh
    // thấy trễ tay; để ra dài quá thì vệt chồng đống chứ không thành bậc thang.
    //
    // `outMs` giải ngược từ chính ba điểm đo trên: 3×66/ln(87/38) = 241,
    // 3×99/ln(87/25) = 238, 3×132/ln(87/16) = 234 — chốt 235.
    inMs: 55,
    outMs: 235,

    // ---------------------------------------------------------------- khác
    // Khoá bôi đen trên những dòng hiệu ứng bắt: chữ ở đây bị ghi đè liên tục
    // và có NBSP đệm, bôi đen vào là lộ hết. Kèm luôn `cursor: default` cho
    // khỏi hiện con trỏ chữ I lúc rê ngang chữ.
    noSelect: true,
    hold: false, // true = sáng luôn sau khi rời chuột (để soi lúc căn chỉnh)
    maxBars: 60, // trần số thanh cho MỘT ô (khối chữ nhiều dòng)
    maxCells: 400 // trần số ô dựng sẵn cho cả trang
  }

  const S = CONFIG

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
  const CSS_ID = 'kx-hover-invert-css'
  function ensureCss() {
    if (document.getElementById(CSS_ID)) return
    const st = document.createElement('style')
    st.id = CSS_ID
    st.textContent = [
      '.kx-hi-bar{position:absolute;pointer-events:none;z-index:2;will-change:transform}',
      '.kx-hi-bar--under{z-index:-1}',
      '.kx-nosel{-webkit-user-select:none;user-select:none;cursor:default}',
    ].join('\n')
    document.head.appendChild(st)
  }

  /* ================================================================== đo chữ */

  // Một hộp cho MỖI DÒNG chữ trong ô, ôm sát chữ thật.
  function lineBoxes(cell) {
    const host = cell.getBoundingClientRect()
    const range = document.createRange()
    try {
      range.selectNodeContents(cell)
    } catch (e) {
      return []
    }
    const rects = Array.from(range.getClientRects()).filter((r) => r.width > 0.5 && r.height > 0.5)
    range.detach && range.detach()
    if (!rects.length) return []

    // Gộp các hộp nằm CÙNG MỘT DÒNG (mỗi thẻ con là một hộp riêng) lại làm một.
    const lines = []
    rects.forEach((r) => {
      const hit = lines.find((l) => Math.abs(l.top - r.top) < r.height * 0.6)
      if (hit) {
        hit.left = Math.min(hit.left, r.left)
        hit.right = Math.max(hit.right, r.right)
        hit.top = Math.min(hit.top, r.top)
        hit.bottom = Math.max(hit.bottom, r.bottom)
      } else {
        lines.push({ left: r.left, right: r.right, top: r.top, bottom: r.bottom })
      }
    })

    // CHIỀU CAO LẤY THEO line-height, KHÔNG lấy theo hộp của Range. Hộp của
    // Range là hộp EM của font, mà Geist Mono thừa trên dưới khá dày: dòng cao
    // 13px thì hộp Range ra 19.5px, thanh dày hơn chữ gần rưỡi.
    const cs = getComputedStyle(cell)
    const lhRaw = parseFloat(cs.lineHeight)
    const px = u(S.padX)
    const pt = u(S.padTop)
    const pb = u(S.padBottom)
    return lines.slice(0, Math.max(1, S.maxBars)).map((l) => {
      const lh = lhRaw > 0 ? lhRaw : l.bottom - l.top
      const cy = (l.top + l.bottom) / 2
      return {
        x: l.left - host.left - px,
        y: cy - lh / 2 - host.top - pt,
        w: l.right - l.left + px * 2,
        h: lh + pt + pb,
      }
    })
  }

  /* ============================================== dựng sẵn, rồi chỉ đổi mốc */

  const recs = new Map() // cell -> bản ghi DỰNG SẴN, sống suốt đời trang
  let raf = 0
  let last = 0
  let hovered = null

  function origin(dir) {
    if (dir === 'right') return 'right center'
    if (dir === 'center') return 'center center'
    return 'left center'
  }

  function cellsOf(row) {
    if (!S.cells) return [row]
    const found = Array.from(row.querySelectorAll(S.cells))
    return found.length ? found : [row]
  }

  function huy() {
    recs.forEach((rec, cell) => {
      rec.bars.forEach((b) => b.remove())
      cell.classList.remove('kx-nosel')
      rec.row.classList.remove('kx-nosel')
      if (rec.under) {
        cell.style.color = ''
        cell.style.transition = ''
      }
    })
    recs.clear()
    hovered = null
  }

  // Đo và dựng thanh cho MỌI ô khớp selector, một lượt. Đây là toàn bộ phần
  // việc nặng của file này; sau bước này, rê chuột không còn đo hay tạo gì nữa.
  function prep() {
    huy()
    if (!S.rows) return
    const canBlend = !window.CSS || !CSS.supports || CSS.supports('mix-blend-mode', 'difference')
    const under = S.blend === 'normal' || !canBlend
    const rows = Array.from(document.querySelectorAll(S.rows))
    let dem = 0

    for (let r = 0; r < rows.length; r++) {
      const row = rows[r]
      const cells = cellsOf(row)
      for (let c = 0; c < cells.length; c++) {
        const cell = cells[c]
        if (recs.has(cell) || dem >= S.maxCells) continue
        const boxes = lineBoxes(cell)
        if (!boxes.length) continue
        if (getComputedStyle(cell).position === 'static') cell.style.position = 'relative'

        const bars = []
        for (let b = 0; b < boxes.length; b++) {
          const box = boxes[b]
          const bar = document.createElement('span')
          bar.className = 'kx-hi-bar' + (under ? ' kx-hi-bar--under' : '')
          bar.style.left = box.x + 'px'
          bar.style.top = box.y + 'px'
          bar.style.width = box.w + 'px'
          bar.style.height = box.h + 'px'
          bar.style.background = S.color
          if (!under) bar.style.mixBlendMode = S.blend
          bar.style.transformOrigin = origin(S.dir)
          bar.style.transform = 'scaleX(0)'
          cell.appendChild(bar)
          bars.push(bar)
        }
        if (under) cell.style.transition = 'color 120ms linear'
        if (S.noSelect) {
          cell.classList.add('kx-nosel')
          row.classList.add('kx-nosel')
        }
        recs.set(cell, { bars, row, under, open: false, tung: false, p: 0, v: -1 })
        dem++
      }
    }
  }

  function tick(now) {
    raf = 0
    const dt = last ? Math.min(64, now - last) : 16.7
    last = now

    // Đổi thời gian ra hệ số bám: sau đúng chừng ấy ms thì đi được ~95% quãng.
    const kIn = 1 - Math.exp((-3 * dt) / Math.max(16, S.inMs))
    const kOut = 1 - Math.exp((-3 * dt) / Math.max(16, S.outMs))
    let alive = false

    recs.forEach((rec) => {
      const t = rec.open || (S.hold && rec.tung) ? 1 : 0
      if (t === 0 && rec.p <= 0.0006) return // ô đang nằm im, bỏ qua cho rẻ

      rec.p += (t - rec.p) * (t > rec.p ? kIn : kOut)
      if (t === 0 && rec.p < 0.004) rec.p = 0
      const v = rec.p < 0 ? 0 : rec.p > 1 ? 1 : rec.p

      // Chỉ ghi khi thật sự đổi — đỡ cho trình duyệt một đống việc vô ích.
      if (Math.abs(v - rec.v) > 0.0015 || (v === 0 && rec.v !== 0)) {
        const str = 'scaleX(' + v.toFixed(4) + ')'
        for (let i = 0; i < rec.bars.length; i++) rec.bars[i].style.transform = str
        rec.v = v
      }
      if (rec.p > 0.0006) alive = true
    })

    if (alive) raf = requestAnimationFrame(tick)
    else last = 0
  }

  function start() {
    if (!raf) raf = requestAnimationFrame(tick)
  }

  /* ============================================================== bắt sự kiện */

  // Rê chuột chỉ làm đúng một việc: gạt cờ `open`. Không đo, không tạo thẻ,
  // không xoá thẻ — nên rê nhanh cỡ nào cũng không giật.
  function onMove(e) {
    if (!S.enabled) return
    const el = e.target instanceof Element ? e.target : null
    const row = el && S.rows ? el.closest(S.rows) : null
    if (row === hovered) return
    hovered = row

    recs.forEach((rec, cell) => {
      const on = !!row && rec.row === row && (!S.only || cell === el || cell.contains(el))
      if (on === rec.open) return
      rec.open = on
      if (on) rec.tung = true
      if (rec.under) cell.style.color = on ? S.colorText : ''
    })
    start()
  }

  function buong() {
    hovered = null
    recs.forEach((rec, cell) => {
      if (!rec.open) return
      rec.open = false
      if (rec.under) cell.style.color = ''
    })
    start()
  }

  /* ================================================================ khởi động */

  function boot() {
    ensureCss()
    readUnit()

    // Chờ font xong rồi mới đo: Geist Mono và font dự phòng rộng khác nhau,
    // đo sớm thì thanh lệch hẳn so với chữ.
    const go = () => {
      readUnit()
      prep()
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => setTimeout(go, 30))
    else setTimeout(go, 60)

    document.addEventListener('mousemove', onMove, { passive: true, capture: true })
    document.addEventListener('mouseleave', buong)

    let hen = 0
    window.addEventListener('resize', () => {
      clearTimeout(hen)
      hen = setTimeout(go, 150) // đo lại một lần sau khi kéo xong, không đo suốt lúc kéo
    })

    // Đổi selector / cách hoà màu / hướng quét trong bảng tinh chỉnh thì dựng lại.
    // CHỮ KÝ LẤY NGAY LÚC NÀY, đừng để rỗng — để rỗng thì nhịp quét đầu tiên
    // nào cũng thấy "khác" và dựng lại giữa lúc đang sáng. Đây từng là lỗi thật.
    const stamp = () => [S.enabled, S.rows, S.cells, S.blend, S.dir, S.padX, S.padTop, S.padBottom, S.color, S.noSelect].join('|')
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
  window.KX_HOVER_INVERT = {
    config: S,
    defaults: Object.freeze({ ...CONFIG }),
    refresh: prep, // đổi nội dung chữ trong trang thì gọi cái này để đo lại
    clear: huy,
  }
})()
