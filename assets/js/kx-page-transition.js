/* =============================================================================
 * kaixa Portfolio — Chuyển màn bằng lưới pixel
 * -----------------------------------------------------------------------------
 * Một dải pixel vuông quét ngang màn hình; phía sau dải đó, lớp đang phủ bị cắt
 * đi theo BẬC (mỗi cột một bậc) nên trang bên dưới lộ ra từng khoảng một. Dùng
 * lúc màn loading bàn giao cho trang contact.
 *
 * NGUỒN: boilerplate page-transition của Osmo (Barba + GSAP + Lenis). Ở đây
 * KHÔNG dùng ba thư viện đó:
 *   - Barba lo chuyện thay container khi đổi URL — trang này chỉ có một trang
 *     tĩnh, không có điều hướng nào để chặn.
 *   - Lenis lo cuộn mượt — trang này khoá cuộn (`overflow: hidden`, mọi thứ nằm
 *     gọn trong một viewport).
 *   - GSAP chỉ để chạy timeline; phần tính giờ ở dưới chép đúng công thức của
 *     họ (clipStart / stepDur / perPixelDur / spread) rồi chạy bằng một vòng
 *     requestAnimationFrame. Cả 11 module kx-*.js đều không thư viện, thêm 4
 *     thẻ script CDN cho một hiệu ứng là đi ngược cả project.
 *
 * KHÁC BẢN GỐC MỘT CHỖ: bản gốc cắt clip-path trên trang MỚI đang bay vào. Ở
 * đây không có trang mới — trang contact nằm sẵn bên dưới — nên clip-path cắt
 * NGƯỢC LẠI, tức cắt dần lớp phủ đang che nó. Nhìn ra kết quả y hệt.
 *
 * CÁCH DÙNG: gọi `KX_PAGE_TRANSITION.run(el)` với `el` là lớp cần cắt đi. Trả
 * về một Promise, xong dải pixel thì nó resolve. File này KHÔNG chứa UI setting
 * — bảng tinh chỉnh ở kx-devtools.js (tab "Chuyển màn").
 * ========================================================================== */
(() => {
  'use strict'

  // CONFIG để phẳng cho khớp bảng tinh chỉnh (kx-devtools.js đọc config[key]).
  const CONFIG = {
    enabled: true,

    cols: 48, // số cột pixel theo chiều quét
    duration: 2.2, // giây — cả dải quét hết màn hình
    pixelFade: 0.2, // giây — một pixel mờ vào (và mờ ra) mất bấy nhiêu
    overlap: 0.3, // 0..1 — pixel trong cùng một cột sáng chồng lên nhau bao nhiêu

    color: '#ffffff', // màu pixel
    rainbow: false, // true = trải cầu vồng theo vị trí, bỏ qua `color`
    blend: 'normal', // mix-blend-mode của lưới; 'difference' hợp tông trang

    zIndex: 100,
  }

  const S = CONFIG
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)

  /* ------------------------------------------------------------------- CSS */

  let styleEl = null

  function restyle() {
    if (!styleEl) {
      styleEl = document.createElement('style')
      styleEl.setAttribute('data-kx-page-transition', '')
      document.head.appendChild(styleEl)
    }
    styleEl.textContent = `
.kx-pt{position:fixed;inset:0;z-index:${S.zIndex};pointer-events:none;overflow:clip;
  mix-blend-mode:${S.blend}}
.kx-pt__panel{position:absolute;inset:0;display:flex;width:100%;height:100%}
.kx-pt__col{display:flex;flex:1 1 auto;justify-content:center}
.kx-pt__px{aspect-ratio:1;width:100%;opacity:0;background:${S.color};will-change:opacity}
`
  }

  /* ------------------------------------------------------------------ lưới */

  let wrap = null
  let panel = null
  let oPixel = [] // mỗi pixel: { el, vao, ra, dai } — tính một lần, không tính lại mỗi khung

  // Dựng lưới cho đúng khổ màn hiện tại. `dung` = quét dọc (màn cao hơn rộng).
  function luoi(dung) {
    wrap = document.createElement('div')
    wrap.className = 'kx-pt'
    wrap.setAttribute('aria-hidden', 'true')
    panel = document.createElement('div')
    panel.className = 'kx-pt__panel'
    panel.style.flexDirection = dung ? 'column' : 'row'
    wrap.appendChild(panel)
    document.body.appendChild(wrap)

    const soCot = Math.max(1, Math.round(S.cols))
    const r = panel.getBoundingClientRect()
    // Pixel VUÔNG: cạnh bằng bề dày một cột, nên số pixel mỗi cột suy ra từ
    // cạnh còn lại. Đây là chỗ quyết định lưới trông có vuông vức hay không.
    const canh = (dung ? r.height : r.width) / soCot
    const soPixel = Math.max(1, Math.ceil((dung ? r.width : r.height) / canh))

    oPixel = []
    for (let i = 0; i < soCot; i++) {
      const col = document.createElement('div')
      col.className = 'kx-pt__col'
      col.style.flexDirection = dung ? 'row' : 'column'
      for (let j = 0; j < soPixel; j++) {
        const px = document.createElement('div')
        px.className = 'kx-pt__px'
        col.appendChild(px)
        oPixel.push({ el: px, cot: i, hang: j })
      }
      panel.appendChild(col)
    }

    if (S.rainbow) {
      const tong = oPixel.length
      oPixel.forEach((p, k) => {
        p.el.style.background = `hsl(${Math.round((k / Math.max(1, tong - 1)) * 360)} 90% 60%)`
      })
    }
    return { soCot, soPixel }
  }

  /* --------------------------------------------------------------- tính giờ
   * Chép đúng công thức của bản gốc, chỉ đổi từ timeline GSAP sang mốc thời
   * gian tuyệt đối để một vòng rAF tự tra. */

  function lenLich(soCot, soPixel) {
    const dai = Math.max(0.05, S.duration)
    const mo = Math.max(0.001, S.pixelFade)
    const chong = clamp(S.overlap, 0, 1)

    const batDauCat = Math.min(mo, dai * 0.5)
    const daiCat = Math.max(0.001, dai - 2 * batDauCat)
    const buoc = daiCat / soCot

    const moiPixel = (mo / soPixel) * (1 - chong) + mo * chong
    const trai = Math.max(0, mo - moiPixel)

    oPixel.forEach((p) => {
      const loRa = batDauCat + p.cot * buoc
      const vao = Math.max(0, loRa - mo)
      const ra = Math.min(dai, loRa + buoc)
      // Lệch ngẫu nhiên trong cột — bản gốc dùng stagger `from: "random"`.
      p.vao = vao + Math.random() * trai
      p.ra = ra + Math.random() * trai
      p.dai = Math.max(0.001, moiPixel)
    })

    return { dai, batDauCat, daiCat, buoc }
  }

  /* ------------------------------------------------------------------ chạy */

  let dangChay = false

  function run(lopCanCat) {
    if (dangChay) return Promise.resolve()
    if (!S.enabled) return Promise.resolve()
    dangChay = true
    restyle()

    const dung = window.innerHeight > window.innerWidth
    const { soCot, soPixel } = luoi(dung)
    const nhip = lenLich(soCot, soPixel)

    // Người dùng chọn giảm chuyển động thì cắt phựt, không quét.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      don()
      return Promise.resolve()
    }

    const el = lopCanCat || null
    if (el) el.style.willChange = 'clip-path'

    return new Promise((xong) => {
      const t0 = performance.now()
      const buocCuoi = nhip.dai + nhip.dai / soCot // chừa cho cột cuối tắt hẳn

      const khung = (now) => {
        const t = (now - t0) / 1000

        for (let k = 0; k < oPixel.length; k++) {
          const p = oPixel[k]
          let o = 0
          if (t >= p.vao && t < p.ra) o = clamp((t - p.vao) / p.dai, 0, 1)
          else if (t >= p.ra) o = 1 - clamp((t - p.ra) / p.dai, 0, 1)
          p.el.style.opacity = o
        }

        // Cắt lớp phủ theo BẬC, mỗi cột một bậc — đúng như `steps(cols, start)`
        // của bản gốc. Không dùng bậc thì mép cắt chạy mượt và lộ ra khỏi dải
        // pixel đang che nó.
        if (el) {
          const k2 = clamp((t - nhip.batDauCat) / nhip.daiCat, 0, 1)
          const phan = (Math.floor(k2 * soCot) / soCot) * 100
          el.style.clipPath = dung ? `inset(${phan}% 0 0 0)` : `inset(0 0 0 ${phan}%)`
        }

        if (t < buocCuoi) {
          requestAnimationFrame(khung)
          return
        }
        if (el) {
          el.style.clipPath = ''
          el.style.willChange = ''
        }
        don()
        xong()
      }
      requestAnimationFrame(khung)
    })
  }

  function don() {
    if (wrap) wrap.remove()
    wrap = null
    panel = null
    oPixel = []
    dangChay = false
  }

  // Chỉ để bảng tinh chỉnh (kx-devtools.js) đọc/ghi lúc chạy.
  window.KX_PAGE_TRANSITION = {
    config: S,
    defaults: Object.freeze({ ...CONFIG }),
    run,
    dangChay: () => dangChay,
    restyle,
  }
})()
