/* =============================================================================
 * kaixa Portfolio — Con trỏ có đuôi (ribbon trail)
 * -----------------------------------------------------------------------------
 * Một dải ruy-băng thon dần bám đuôi con trỏ, theo ý tưởng "Tailed Cursor" của
 * Inspira UI (gốc Codrops). Bản gốc dựng bằng WebGL qua thư viện OGL; ở đây vẽ
 * bằng CANVAS 2D và không phụ thuộc thư viện nào — nhìn như nhau nhưng nhẹ hơn
 * nhiều, quan trọng vì trang này đã có sẵn 2 ngữ cảnh WebGL cho vành đĩa.
 *
 * CÁCH LÀM
 * Giữ một chuỗi N điểm. Mỗi khung: điểm đầu chạy về phía con trỏ, mỗi điểm sau
 * chạy về phía điểm trước nó — kiểu "xích kéo", cho ra đường cong mượt tự nhiên
 * mà không cần mô phỏng lò xo. Dải ruy-băng là đa giác dựng từ hai đường biên
 * lệch hai bên theo pháp tuyến, bề rộng thon dần về đuôi.
 *
 * MÀU: mặc định `mono` — ruy-băng trắng, `mix-blend-mode: difference`, nên nó
 * tự đảo màu khi đi qua mặt đĩa trắng, khớp với ngôn ngữ của trang. Đổi sang
 * `rainbow` để lấy dải nhiều màu như bản Inspira.
 *
 * HIỆU NĂNG: chỉ vẽ khi đuôi còn sống. Con trỏ đứng yên đủ lâu cho đuôi co hết
 * về một điểm thì xoá canvas một lần rồi ngủ, không tốn khung nào nữa.
 *
 * CÁCH DÙNG: nhúng thẻ script là chạy. Chỉnh bằng CONFIG ngay bên dưới. File
 * này KHÔNG chứa UI setting — bảng tinh chỉnh ở kx-devtools.js (tab "Đuôi trỏ").
 * ========================================================================== */
(() => {
  'use strict'

  // CONFIG để phẳng cho khớp bảng tinh chỉnh (kx-devtools.js đọc config[key]).
  const CONFIG = {
    enabled: true,

    // ------------------------------------------------------------ hình dáng
    points: 66, // số đốt của đuôi — dài hơn thì mượt hơn nhưng tốn hơn
    headW: 5, // bề rộng ở đầu (px)
    taper: 2.2, // độ thon về đuôi: 1 = thon đều, >1 = phình đầu tóp đuôi nhanh
    ease: 0.19, // độ bám: điểm đầu chạy về con trỏ nhanh cỡ nào (0..1)
    chain: 0.41, // mỗi đốt sau bám đốt trước cỡ nào (0..1) — nhỏ = đuôi lê dài
    minStep: 0.35, // px — dịch ít hơn mức này coi như đứng yên

    // ---------------------------------------------------------------- màu
    colorMode: 'mono', // 'mono' = trắng + difference (hợp trang) | 'rainbow'
    color: '#ffffff', // dùng khi colorMode = 'mono'
    opacity: 1,
    blend: 'difference', // mix-blend-mode của canvas; 'normal' để tắt
    hue: 200, // 'rainbow': màu bắt đầu
    hueSpan: 140, // 'rainbow': quét bao nhiêu độ dọc theo đuôi
    hueDrift: 12, // 'rainbow': độ/giây trôi màu theo thời gian

    // -------------------------------------------------------------- đầu trỏ
    dot: 5, // bán kính chấm ở đầu; 0 = không vẽ
    hideNative: false, // true = giấu con trỏ thật của hệ điều hành

    // ---------------------------------------------------------------- khác
    maxDpr: 1.5, // trần tỉ lệ pixel; hạ xuống 1 nếu máy yếu
    zIndex: 2147483000,
  }

  const S = CONFIG
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)

  /* ================================================================== dựng */

  const cvs = document.createElement('canvas')
  cvs.setAttribute('aria-hidden', 'true')
  const g = cvs.getContext('2d')
  let W = 0
  let H = 0
  let dpr = 1

  function style() {
    cvs.style.cssText =
      'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;' +
      'z-index:' + S.zIndex + ';mix-blend-mode:' + S.blend + ';'
    document.documentElement.style.cursor = S.hideNative ? 'none' : ''
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, Math.max(1, S.maxDpr))
    W = Math.round(innerWidth * dpr)
    H = Math.round(innerHeight * dpr)
    if (cvs.width !== W || cvs.height !== H) {
      cvs.width = W
      cvs.height = H
    }
    g.setTransform(dpr, 0, 0, dpr, 0, 0) // vẽ bằng toạ độ CSS cho gọn đầu
  }

  /* ================================================================= chuỗi */

  const pts = [] // [{x, y}] — pts[0] là đầu
  const pointer = { x: 0, y: 0, has: false }
  let raf = 0
  let last = 0
  let clock = 0

  function reset(x, y) {
    pts.length = 0
    const n = Math.max(2, Math.round(S.points))
    for (let i = 0; i < n; i++) pts.push({ x, y })
  }

  function step() {
    const n = Math.max(2, Math.round(S.points))
    while (pts.length < n) pts.push({ ...pts[pts.length - 1] })
    while (pts.length > n) pts.pop()

    // đầu chạy về con trỏ
    const e = clamp(S.ease, 0.01, 1)
    pts[0].x += (pointer.x - pts[0].x) * e
    pts[0].y += (pointer.y - pts[0].y) * e

    // mỗi đốt sau bám đốt trước — xích kéo
    const c = clamp(S.chain, 0.01, 1)
    let moved = Math.hypot(pointer.x - pts[0].x, pointer.y - pts[0].y)
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i]
      const q = pts[i - 1]
      const dx = q.x - p.x
      const dy = q.y - p.y
      p.x += dx * c
      p.y += dy * c
      const m = Math.abs(dx) + Math.abs(dy)
      if (m > moved) moved = m
    }
    return moved
  }

  /* ================================================================== vẽ */

  function ribbon() {
    const n = pts.length
    if (n < 3) return

    // Hai đường biên: lệch sang hai bên theo pháp tuyến của hướng đi, bề rộng
    // thon dần về đuôi. Vẽ thành từng đoạn để mỗi đoạn tô được một màu riêng
    // (cần cho chế độ rainbow), thay vì một đa giác đơn sắc.
    const taper = Math.max(0.05, S.taper)
    const hw = (i) => (S.headW / 2) * Math.pow(1 - i / (n - 1), taper)

    const drift = S.colorMode === 'rainbow' ? clock * S.hueDrift : 0

    for (let i = 0; i < n - 2; i++) {
      const p0 = pts[i]
      const p1 = pts[i + 1]
      let dx = p1.x - p0.x
      let dy = p1.y - p0.y
      const len = Math.hypot(dx, dy)
      if (len < 0.0001) continue
      dx /= len
      dy /= len
      const w0 = hw(i)
      const w1 = hw(i + 1)

      g.beginPath()
      g.moveTo(p0.x - dy * w0, p0.y + dx * w0)
      g.lineTo(p1.x - dy * w1, p1.y + dx * w1)
      g.lineTo(p1.x + dy * w1, p1.y - dx * w1)
      g.lineTo(p0.x + dy * w0, p0.y - dx * w0)
      g.closePath()

      if (S.colorMode === 'rainbow') {
        const h = S.hue + (i / (n - 1)) * S.hueSpan + drift
        g.fillStyle = 'hsl(' + (((h % 360) + 360) % 360) + ' 95% 62%)'
      } else {
        g.fillStyle = S.color
      }
      g.fill()
    }

    if (S.dot > 0) {
      g.beginPath()
      g.arc(pts[0].x, pts[0].y, S.dot, 0, Math.PI * 2)
      g.fillStyle = S.colorMode === 'rainbow' ? 'hsl(' + ((((S.hue + drift) % 360) + 360) % 360) + ' 95% 70%)' : S.color
      g.fill()
    }
  }

  function draw() {
    g.clearRect(0, 0, innerWidth, innerHeight)
    g.globalAlpha = clamp(S.opacity, 0, 1)
    ribbon()
    g.globalAlpha = 1
  }

  /* ================================================================= vòng lặp */

  function tick(now) {
    if (!last) last = now
    let dt = (now - last) / 1000
    last = now
    if (dt > 0.1) dt = 0.1
    clock += dt

    if (!S.enabled || !pointer.has) {
      g.clearRect(0, 0, innerWidth, innerHeight)
      raf = 0
      return
    }

    const moved = step()
    draw()

    // Đuôi đã co hết về con trỏ thì xoá một lần rồi ngủ — chuột đứng yên là
    // không tốn khung nào nữa.
    if (moved < S.minStep) {
      g.clearRect(0, 0, innerWidth, innerHeight)
      raf = 0
      return
    }
    raf = requestAnimationFrame(tick)
  }

  function wake() {
    if (raf || !S.enabled) return
    last = 0
    raf = requestAnimationFrame(tick)
  }

  /* ================================================================== gắn */

  window.addEventListener(
    'pointermove',
    (ev) => {
      pointer.x = ev.clientX
      pointer.y = ev.clientY
      if (!pointer.has) {
        pointer.has = true
        reset(ev.clientX, ev.clientY)
      }
      wake()
    },
    { passive: true }
  )
  window.addEventListener('pointerleave', () => {
    pointer.has = false
    wake()
  })
  window.addEventListener('resize', resize)

  // Bảng tinh chỉnh ghi thẳng vào CONFIG rồi thôi. Phần lớn khoá được đọc lại
  // ngay ở khung sau, riêng mấy khoá dưới đây phải chạy lại style()/resize().
  let sig = ''
  function sweep() {
    const s = S.blend + '|' + S.zIndex + '|' + (S.hideNative ? 1 : 0) + '|' + S.maxDpr + '|' + (S.enabled ? 1 : 0)
    if (s === sig) return
    sig = s
    style()
    resize()
    if (S.enabled) wake()
    else g.clearRect(0, 0, innerWidth, innerHeight)
  }

  function boot() {
    document.body.appendChild(cvs)
    style()
    resize()
    reset(innerWidth / 2, innerHeight / 2)
    setInterval(sweep, 300)
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true })
  else boot()

  // Chỉ để bảng tinh chỉnh (kx-devtools.js) đọc/ghi lúc chạy.
  window.KX_TAIL_CURSOR = {
    config: S,
    defaults: Object.freeze({ ...CONFIG }),
    canvas: cvs,
    points: pts,
    restyle: () => {
      style()
      resize()
      wake()
    },
  }
})()
