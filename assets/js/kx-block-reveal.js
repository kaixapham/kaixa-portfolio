/* =============================================================================
 * kaixa Portfolio — Thanh khối quét ngang để lộ chữ (block reveal)
 * -----------------------------------------------------------------------------
 * Các cụm chữ PP Editorial ("(Hello, Mate)" và dòng mail cuối trang) hiện ra
 * bằng một thanh đặc: thanh nở từ trái sang phủ kín chỗ chữ, rồi rút về bên
 * phải và để lộ chữ ra.
 *
 * KHÁC BẢN MẪU Ở HAI CHỖ, đều vì ràng buộc của trang này:
 *
 *   1. KHÔNG bọc lại nội dung. Bản mẫu ghi đè `innerHTML` để quấn chữ vào một
 *      <span> mới. Ở đây dòng mail là `display: flex` có `gap` giữa hai cụm và
 *      có cả thẻ <img> icon — bọc lại là khe `gap` sập và layout xê dịch. Thay
 *      vào đó chỉ chèn thêm MỘT <span> phủ tuyệt đối vào trong cụm, còn chữ thì
 *      giấu bằng `color: transparent` (cho text) và `visibility: hidden` (cho
 *      các thẻ con). Cả hai cách giấu này đều không đụng tới layout.
 *   2. Thanh nằm TRONG cụm chữ, nên nó ăn theo `mix-blend-mode: difference` mà
 *      kx-hello-mate.js đặt cho cụm đó — thanh trắng đi qua nền đen thành
 *      trắng, đi qua mặt đĩa trắng thành đen, khớp ngôn ngữ của trang.
 *
 * Hộp chữ của `.hm-disp` bị trim về cap-height nên thanh sẽ hơi thấp so với
 * cảm giác nhìn; `padY` nới nó ra cho cân.
 *
 * CÁCH DÙNG: nạp SAU kx-hello-mate.js. Chỉnh bằng CONFIG ngay bên dưới. File
 * này KHÔNG chứa UI setting — bảng tinh chỉnh ở kx-devtools.js (tab "Lộ chữ").
 * ========================================================================== */
(() => {
  'use strict'

  // CONFIG để phẳng cho khớp bảng tinh chỉnh (kx-devtools.js đọc config[key]).
  const CONFIG = {
    enabled: true,

    // Cụm nào ăn hiệu ứng. `.hm-disp` là chữ PP Editorial, `.hm-poster` là ảnh
    // ở giữa trang — cố ý không đụng tới chữ Geist Mono, cụm đó do
    // kx-shuffle-text.js lo.
    // `.hm-p__ctrl` (khung PLAY/MUTE) cố ý bị kx-shuffle-text.js loại ra qua
    // khoá `skip` của nó, để hai hiệu ứng không chồng lên cùng một chỗ chữ.
    targets: '.hm-disp, .hm-poster, .hm-p__ctrl',
    overlayZ: 40, // z-index của thanh phủ ngoài (dùng cho <img>)

    // ------------------------------------------------------------ nhịp chạy
    startDelay: 80, // ms — chờ font xong rồi mới chạy
    stagger: 140, // ms — trễ giữa các cụm, tính từ trên xuống
    inMs: 500, // thanh nở từ trái sang phải
    holdMs: 90, // giữ thanh phủ kín trước khi rút
    outMs: 500, // thanh rút về bên phải, để lộ chữ
    easing: 'cubic-bezier(.86,0,.07,1)',

    // ------------------------------------------------------------- hình dáng
    color: '#ffffff',
    // Khung lót, hiện NGAY từ đầu để chỗ đó không bị trống trong lúc chờ thanh
    // trắng quét tới. Là một khung VIỀN MẢNH rỗng ruột, đúng kiểu ô PLAY/MUTE —
    // ô đó vốn đã sẵn viền riêng khi ruột bị giấu, nên chỉ ảnh cần lót thêm.
    baseTargets: '.hm-poster',
    baseStyle: 'line', // 'line' = khung viền rỗng ruột | 'fill' = mảng đặc
    baseLine: 'rgba(255,255,255,0.12)', // màu viền khi baseStyle = 'line'
    baseFill: '#2a2a2a', // màu mảng khi baseStyle = 'fill'
    padX: 0.06, // em — nới thanh ra hai bên
    padY: 0.16, // em — nới thanh lên xuống (hộp chữ bị trim về cap-height)

    runOnce: true,
  }

  const S = CONFIG
  const style = document.createElement('style')
  style.dataset.kxBlockReveal = ''
  document.head.appendChild(style)

  function css() {
    return `
.brv-hide{color:transparent!important}
.brv-hide > *:not(.brv-bar){visibility:hidden}
.brv-bar{
  background:${S.color};
  transform:scaleX(0);transform-origin:left center;
  pointer-events:none;
  will-change:transform;
}
/* Thanh nằm TRONG cụm chữ — bám theo hộp của cụm. */
.brv-bar:not(.brv-bar--over){
  position:absolute;
  left:${-S.padX}em;right:${-S.padX}em;top:${-S.padY}em;bottom:${-S.padY}em;
}
/* Thanh phủ NGOÀI — dùng cho <img> vì thẻ ảnh không chứa được con.
   Toạ độ do JS chép từ hộp của ảnh, nên không đặt inset ở đây. */
.brv-bar--over{position:fixed;z-index:${S.overlayZ}}

/* Khung lót: hiện ngay từ đầu cho chỗ đó khỏi trống, nằm DƯỚI thanh trắng. */
.brv-base{
  pointer-events:none;
  ${
    S.baseStyle === 'fill'
      ? `background:${S.baseFill};`
      : `background:transparent;border:1px solid ${S.baseLine};`
  }
}
.brv-base:not(.brv-base--over){
  position:absolute;
  left:${-S.padX}em;right:${-S.padX}em;top:${-S.padY}em;bottom:${-S.padY}em;
}
.brv-base--over{position:fixed;z-index:${S.overlayZ - 1}}`
  }

  /* =================================================================== chạy */

  let played = false
  const timers = []
  const after = (ms, fn) => timers.push(setTimeout(fn, ms))

  function clear() {
    timers.forEach(clearTimeout)
    timers.length = 0
    document.querySelectorAll('.brv-bar, .brv-base').forEach((b) => b.remove())
    document.querySelectorAll('.brv-hide').forEach((e) => e.classList.remove('brv-hide'))
    // trả lại các thẻ đã bị giấu bằng visibility (chế độ phủ ngoài)
    document.querySelectorAll('[data-brv-hidden]').forEach((e) => {
      e.style.visibility = ''
      e.removeAttribute('data-brv-hidden')
    })
  }

  // Thẻ rỗng (img, video, canvas…) không chứa được thẻ con, nên thanh phải nằm
  // ngoài và phủ lên đúng hộp của nó.
  const OVERLAY_TAGS = { IMG: 1, VIDEO: 1, CANVAS: 1, SVG: 1, IFRAME: 1, INPUT: 1 }
  const needsOverlay = (el) => !!OVERLAY_TAGS[el.tagName]

  function play() {
    if (!S.enabled) return
    clear()

    const els = Array.from(document.querySelectorAll(S.targets))
      .map((el) => ({ el, top: el.getBoundingClientRect().top }))
      .sort((a, b) => a.top - b.top)
    if (!els.length) return

    els.forEach(({ el }, i) => {
      const bar = document.createElement('span')
      bar.setAttribute('aria-hidden', 'true')
      const over = needsOverlay(el)
      const wantBase = S.baseStyle !== 'none' && S.baseTargets && el.matches(S.baseTargets)
      let base = null
      if (wantBase) {
        base = document.createElement('span')
        base.className = 'brv-base' + (over ? ' brv-base--over' : '')
        base.setAttribute('aria-hidden', 'true')
      }

      if (over) {
        // Thanh phủ ngoài: chép đúng hộp của ảnh. Hiệu ứng chỉ kéo dài hơn một
        // giây và trang không cuộn, nên chụp hộp một lần là đủ chính xác.
        const r = el.getBoundingClientRect()
        bar.className = 'brv-bar brv-bar--over'
        bar.style.left = r.left + 'px'
        bar.style.top = r.top + 'px'
        bar.style.width = r.width + 'px'
        bar.style.height = r.height + 'px'
        if (base) {
          base.style.left = r.left + 'px'
          base.style.top = r.top + 'px'
          base.style.width = r.width + 'px'
          base.style.height = r.height + 'px'
          document.body.appendChild(base)
        }
        document.body.appendChild(bar)
        // visibility không đụng tới layout, khác hẳn display:none
        el.style.visibility = 'hidden'
        el.setAttribute('data-brv-hidden', '')
      } else {
        // Cụm phải là mốc định vị cho thanh. Trang này cả hai cụm chữ đều đã
        // position:absolute rồi, nhưng cứ chắc chắn cho trường hợp khác.
        if (getComputedStyle(el).position === 'static') el.style.position = 'relative'
        bar.className = 'brv-bar'
        if (base) el.appendChild(base) // lót trước, thanh trắng chèn sau nên nằm trên
        el.appendChild(bar)
        el.classList.add('brv-hide')
      }

      const t0 = i * S.stagger
      // nở từ trái
      after(t0, () => {
        bar.style.transition = `transform ${S.inMs}ms ${S.easing}`
        bar.style.transformOrigin = 'left center'
        bar.style.transform = 'scaleX(1)'
      })
      // chữ (hoặc ảnh) hiện ra ngay khi thanh còn phủ kín, rồi thanh rút về phải
      after(t0 + S.inMs + S.holdMs, () => {
        // Gỡ khung lót đúng lúc nội dung hiện ra, không thì nó che mất.
        if (base) base.remove()
        if (over) {
          el.style.visibility = ''
          el.removeAttribute('data-brv-hidden')
        } else {
          el.classList.remove('brv-hide')
        }
        bar.style.transition = `transform ${S.outMs}ms ${S.easing}`
        bar.style.transformOrigin = 'right center'
        bar.style.transform = 'scaleX(0)'
      })
      // dọn thanh đi cho DOM sạch
      after(t0 + S.inMs + S.holdMs + S.outMs + 60, () => bar.remove())
    })

    played = true
  }

  /* =============================================================== khởi động */

  function boot() {
    style.textContent = css()
    if (!S.enabled) return
    const go = () => setTimeout(() => { if (!played || !S.runOnce) play() }, Math.max(0, S.startDelay))
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(go)
    else go()
  }

  // Trang do kx-hello-mate.js dựng ra sau khi DOM sẵn sàng, nên chờ nó có mặt.
  function waitForPage(tries) {
    if (document.querySelector(S.targets)) return boot()
    if (tries <= 0) return
    setTimeout(() => waitForPage(tries - 1), 100)
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => waitForPage(40), { once: true })
  } else {
    waitForPage(40)
  }

  // Chỉ để bảng tinh chỉnh (kx-devtools.js) đọc/ghi lúc chạy.
  window.KX_BLOCK_REVEAL = {
    config: S,
    defaults: Object.freeze({ ...CONFIG }),
    play,
    stop: clear,
    restyle: () => {
      style.textContent = css()
    },
  }
})()
