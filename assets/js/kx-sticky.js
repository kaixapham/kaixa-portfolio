/* =============================================================================
 * kaixa Portfolio — Dính đỉnh rồi nhả ra
 * -----------------------------------------------------------------------------
 * Giữ một phần tử dính sát đỉnh màn hình khi cuộn, rồi NHẢ nó ra trước khi nó
 * chạm vào một khối khác — hiện dùng cho tiêu đề "①Lumen Studio" ở Work Detail,
 * nhả trước khối chữ lớn "KX. FOLIO 84VN" ở chân trang.
 *
 * VÌ SAO KHÔNG DÙNG `position: sticky`: bố cục bốn trang này sinh từ Figma và
 * mọi thứ đều `position: absolute`, mà `sticky` không ăn trên phần tử absolute.
 * Nên phải tự đổi qua lại giữa `fixed` (lúc dính) và `absolute` (lúc đã nhả).
 *
 * Phần tử tìm theo `data-n` (node id Figma), KHÔNG theo class — class sinh ra
 * tự động (`k2e`…) và đổi tên sau mỗi lần dựng lại từ Figma.
 *
 * File này KHÔNG chứa UI setting; `kx-devtools.js` chỉ nạp ở trang contact nên
 * không có tab. Chỉnh thẳng `CONFIG` dưới đây.
 * ========================================================================== */
(() => {
  'use strict'

  // CONFIG để phẳng cho khớp lệ chung của project.
  const CONFIG = {
    enabled: true,
    // Mỗi CỤM: danh sách phần tử đứng yên cùng nhau, và khối mà cả cụm phải
    // nhả ra TRƯỚC khi chạm tới. `gap` là khe tối thiểu (px thiết kế).
    //
    // Nhả THEO CỤM chứ không nhả rời từng phần tử: mỗi phần tử một mốc nhả
    // riêng thì tới đáy chúng dồn chồng lên nhau, vì mốc nào cũng tính từ cùng
    // một khối chặn. Cả cụm dịch chung một quãng nên giữ nguyên khoảng cách
    // giữa các phần tử.
    //
    // `tuDau: true` = fix ngay từ khi mở trang, giữ đúng vị trí thiết kế.
    // `tuDau: false` = cuộn tới chạm đỉnh màn hình mới bắt đầu dính.
    cum: [
      // Tiêu đề: đứng yên THẬT — fix ngay từ đầu và không bao giờ nhả.
      { nodes: ['305:5232'], tuDau: true, nha: false },
      {
        // Cột thông tin trái: cụm icon, (Vec.global), đường kẻ, ba cột 01,
        // và hai khối [ + ].
        // 305:5238 là vỏ rỗng cao 0px — ghim hai con của nó (dấu ngoặc và
        // cụm ba icon) chứ không ghim cái vỏ.
        nodes: ['305:5239', '305:5240', '305:5244', '305:5233', '305:5234', '305:5247', '305:5250'],
        tuDau: true,
        nha: false,
      },
    ],
  }

  const S = CONFIG
  const q = (id) => document.querySelector('[data-n="' + id + '"]')

  let moc = [] // mỗi cụm: { dinhY, dungTai, phan:[{el, doTop}] } — đo thưa
  let raf = 0

  // 1px thiết kế. Khai ở `.kx-page`, suy ra bằng computed style cho chắc.
  function px() {
    const p = document.querySelector('.kx-page')
    if (!p) return 1
    return parseFloat(getComputedStyle(p).getPropertyValue('--px')) || 1
  }

  /* Đo lại mốc. Phải gọi khi đổi cỡ cửa sổ — mọi toạ độ ở đây tính theo `--px`
   * nên co giãn theo bề rộng cửa sổ. Đo bằng cách tạm trả phần tử về `absolute`
   * để đọc đúng vị trí TỰ NHIÊN của nó trong trang. */
  function do_() {
    const u = px()
    moc = []
    S.cum.forEach((c) => {
      // `nha: false` = đứng yên suốt, không cần khối chặn.
      const coNha = c.nha !== false
      const stopEl = coNha ? q(c.stop) : null
      if (coNha && !stopEl) return
      const phan = []
      c.nodes.forEach((id) => {
        const el = q(id)
        if (!el) return
        // Đo vị trí TỰ NHIÊN: phải gỡ CẢ `position` lẫn `top` inline mà lần
        // trước đã đặt. Để nguyên `top` cũ thì phép đo lấy lại chính con số
        // mình vừa ghi, và mỗi lần đo lại trôi thêm một đoạn cho tới khi phần
        // tử bị đẩy ra ngoài màn hình. Đây từng là lỗi thật.
        const truocP = el.style.position
        const truocT = el.style.top
        el.style.position = 'absolute'
        el.style.top = ''
        const tren = window.scrollY + el.getBoundingClientRect().top
        const cao = el.offsetHeight
        el.style.position = truocP
        el.style.top = truocT
        phan.push({ el, tren, cao })
      })
      if (!phan.length) return

      const dinhCum = Math.min.apply(null, phan.map((x) => x.tren))
      const dayCum = Math.max.apply(null, phan.map((x) => x.tren + x.cao))
      // Không nhả thì đẩy mốc ra vô cực, nhánh "đã tới chân trang" không bao giờ chạy.
      const dungTai = coNha
        ? window.scrollY + stopEl.getBoundingClientRect().top - (dayCum - dinhCum) - (c.gap || 0) * u
        : Infinity

      moc.push({
        dinhY: c.tuDau ? 0 : dinhCum,
        dungTai,
        // Cả cụm dịch chung một quãng nên khoảng cách giữa các phần tử giữ nguyên.
        phan: phan.map((x) => ({ el: x.el, doTop: coNha ? dungTai + (x.tren - dinhCum) : 0 })),
      })
    })
    ve()
  }

  function ve() {
    raf = 0
    const y = window.scrollY
    for (let i = 0; i < moc.length; i++) {
      const m = moc[i]
      const daToiChan = y >= m.dungTai
      const dangDinh = !daToiChan && y >= m.dinhY
      for (let j = 0; j < m.phan.length; j++) {
        const p = m.phan[j]
        if (daToiChan) {
          p.el.style.position = 'absolute'
          p.el.style.top = p.doTop + 'px'
        } else if (dangDinh) {
          p.el.style.position = 'fixed'
          p.el.style.top = ''
        } else {
          p.el.style.position = 'absolute'
          p.el.style.top = ''
        }
      }
    }
  }

  const chay = () => {
    if (!raf) raf = requestAnimationFrame(ve)
  }

  function boot() {
    if (!S.enabled) return
    if (!document.querySelector('.kx-page')) return
    do_()
    if (!moc.length) return
    window.addEventListener('scroll', chay, { passive: true })
    window.addEventListener('resize', do_)
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true })
  else boot()

  window.KX_STICKY = { config: S, defaults: Object.freeze({ ...CONFIG }), do: do_ }
})()
