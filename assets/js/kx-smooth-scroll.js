/* =============================================================================
 * kaixa Portfolio — Cuộn mượt
 * -----------------------------------------------------------------------------
 * Bắt lăn chuột rồi tự kéo vị trí cuộn về đích theo kiểu đuổi dần (lerp), thay
 * cho cú nhảy giật từng nấc của trình duyệt. Dùng cho bốn trang cao
 * (Home 12000px, Works 6975, Work Detail 7885, About 11090); trang contact khoá
 * cuộn nên file này tự đứng im ở đó.
 *
 * KHÔNG DÙNG LENIS dù boilerplate của Osmo dựa vào nó — cả project không có thư
 * viện ngoài nào, và phần việc thật ở đây chỉ là một phép nội suy mỗi khung.
 *
 * DÙNG `window.scrollTo`, KHÔNG dịch `transform` của nội dung. Dịch transform
 * cho ra cảm giác mượt hơn một chút nhưng nó tạo containing block mới, làm mọi
 * phần tử `position: fixed` bên trong — thanh nav góc dưới trái và danh sách
 * trang của `kx-site-nav.js` — dính theo nội dung mà trôi đi mất.
 *
 * File này KHÔNG chứa UI setting — bảng tinh chỉnh ở kx-devtools.js (tab
 * "Cuộn mượt").
 * ========================================================================== */
(() => {
  'use strict'

  // CONFIG để phẳng cho khớp bảng tinh chỉnh (kx-devtools.js đọc config[key]).
  const CONFIG = {
    enabled: true,
    lerp: 0.11, // 0..1 — mỗi khung đi được bấy nhiêu phần quãng còn lại. Nhỏ = trôi dài
    wheel: 1, // hệ số nhân quãng lăn chuột
    maxStep: 160, // px — trần cho MỘT nấc lăn, chặn chuột/bàn di nhảy cả màn hình
    stopAt: 0.4, // px — gần đích hơn ngần này thì dừng hẳn, khỏi rung ở chữ số lẻ
    touch: false, // true = bắt cả vuốt chạm; mặc định để nguyên cuộn của hệ điều hành
  }

  const S = CONFIG
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)

  let dich = 0 // vị trí muốn tới
  let nay = 0 // vị trí đang ở
  let raf = 0
  /* Phân biệt cuộn DO MÌNH với cuộn do người dùng bằng cách nhớ vị trí vừa ghi,
   * KHÔNG dùng cờ bật/tắt quanh `window.scrollTo`. Sự kiện `scroll` bắn BẤT
   * ĐỒNG BỘ — tới lúc nó chạy thì cờ đã trả về false, handler tưởng người dùng
   * vừa cuộn nên đồng bộ lại đích và huỷ vòng lặp; kết quả là lăn 5 nấc (600px)
   * mà trang chỉ nhích được 66px rồi đứng. Đây từng là lỗi thật. */
  let daGhi = -1

  const tran = () =>
    Math.max(0, document.documentElement.scrollHeight - window.innerHeight)

  // Trang có cuộn được không. Trang contact khoá cuộn (overflow: hidden, mọi thứ
  // nằm gọn trong một viewport) nên ở đó hàm này luôn trả về false và file này
  // không đụng vào gì cả.
  const cuonDuoc = () => tran() > 1

  /* Sự kiện `kx-cuon` phát ĐỒNG BỘ ngay sau mỗi lần ghi vị trí cuộn. Hiệu ứng
   * nào bám VIEWPORT (dải kính của kx-wave-images.js, đĩa quay theo cuộn) nghe
   * nó để vẽ lại TRONG CÙNG khung hình. Không có nó thì thứ tự callback
   * requestAnimationFrame quyết định ai chạy trước: vòng vẽ của hiệu ứng chạy
   * trước file này là đọc `scrollY` cũ một nhịp, và thứ bám viewport rung theo
   * tốc độ cuộn (tới ~70 px mỗi khung ở nhát mạnh).
   * Dùng lại MỘT đối tượng Event — cấp phát mỗi khung là điều cấm số 2. Phát lại
   * một Event đã phát xong là hợp lệ (cờ dispatch đã tắt). */
  var SU_KIEN = new Event('kx-cuon')

  function ghi() {
    daGhi = Math.round(nay)
    window.scrollTo(0, nay)
    window.dispatchEvent(SU_KIEN)
  }

  function khung() {
    raf = 0
    const con = dich - nay
    if (Math.abs(con) < Math.max(0.05, S.stopAt)) {
      nay = dich
      ghi()
      return
    }
    nay += con * clamp(S.lerp, 0.01, 1)
    ghi()
    raf = requestAnimationFrame(khung)
  }

  const chay = () => {
    if (!raf) raf = requestAnimationFrame(khung)
  }

  // Quãng của một sự kiện lăn, quy về PIXEL. Chuột nấc thường báo theo DÒNG và
  // một số chuột báo theo TRANG — không quy đổi thì lăn một nấc đi được 3px.
  function quang(ev) {
    let d = ev.deltaY
    if (ev.deltaMode === 1) d *= 16 // dòng
    else if (ev.deltaMode === 2) d *= window.innerHeight // trang
    return clamp(d * S.wheel, -Math.abs(S.maxStep), Math.abs(S.maxStep))
  }

  function rieng(t) {
    return !!(t && t.closest && t.closest('[data-kx-cuon-rieng]'))
  }

  function onWheel(ev) {
    if (!S.enabled || !cuonDuoc()) return
    if (ev.ctrlKey) return // phóng to/thu nhỏ của trình duyệt
    // Trong một khối cuộn riêng (bảng setting, danh sách trang…) thì để trình
    // duyệt tự cuộn khối đó — preventDefault ở đây là khối đó không bao giờ
    // cuộn được. Khối tự đánh dấu bằng data-kx-cuon-rieng.
    if (rieng(ev.target)) return
    ev.preventDefault()
    dich = clamp(dich + quang(ev), 0, tran())
    chay()
  }

  // Người dùng tự cuộn bằng bàn phím, thanh cuộn hay nhảy tới #neo: đồng bộ lại
  // đích, không thì khung kế tiếp sẽ giật ngược về chỗ cũ.
  function onScroll() {
    // Lệch 1px so với chỗ mình vừa ghi thì coi như cuộn của chính mình.
    if (Math.abs(window.scrollY - daGhi) <= 1) return
    nay = window.scrollY
    dich = nay
    if (raf) {
      cancelAnimationFrame(raf)
      raf = 0
    }
  }

  function dongBo() {
    nay = window.scrollY
    dich = nay
    daGhi = Math.round(nay)
  }

  /* ------------------------------------------------------------------- vào */

  function boot() {
    // Người chọn giảm chuyển động thì để nguyên cuộn của hệ điều hành.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (!S.enabled || !cuonDuoc()) return
    dongBo()
    // `passive: false` bắt buộc — không có nó thì `preventDefault()` bị bỏ qua
    // và trang cuộn hai lần: một lần của trình duyệt, một lần của mình.
    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', dongBo)
    if (S.touch) {
      let y0 = 0
      window.addEventListener('touchstart', (e) => (y0 = e.touches[0].clientY), { passive: true })
      window.addEventListener(
        'touchmove',
        (e) => {
          if (rieng(e.target)) return
          const y = e.touches[0].clientY
          dich = clamp(dich + (y0 - y) * S.wheel, 0, tran())
          y0 = y
          e.preventDefault()
          chay()
        },
        { passive: false }
      )
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true })
  else boot()

  // Chỉ để bảng tinh chỉnh (kx-devtools.js) đọc/ghi lúc chạy.
  window.KX_SMOOTH_SCROLL = {
    config: S,
    defaults: Object.freeze({ ...CONFIG }),
    dongBo,
    // Cuộn tới một vị trí hoặc một phần tử, vẫn mượt.
    toi: (y) => {
      if (typeof y !== 'number') {
        const el = typeof y === 'string' ? document.querySelector(y) : y
        if (!el) return
        y = window.scrollY + el.getBoundingClientRect().top
      }
      dich = clamp(y, 0, tran())
      chay()
    },
  }
})()
