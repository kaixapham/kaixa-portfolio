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
 * về một Promise, xong dải pixel thì nó resolve.
 *
 * CHUYỂN SANG TRANG KHÁC (màn loading → Home, người dùng chốt): trang cũ
 * gọi `henMo()` (ghi cờ `kx-pt:mo` vào sessionStorage, kèm các số của lưới) rồi
 * điều hướng NGAY. Trang mới nạp file này, thấy cờ thì `mo()`: phủ một lớp
 * ĐEN màu nền (`coverColor`) rồi chạy đúng `run()` như cũ — dải pixel quét
 * ngang, lớp đen bị cắt theo bậc phía sau dải, trang mới lộ ra từng khoảng.
 *   - Bản đầu quét cả vào lẫn ra trên chính màn loading rồi mới nhảy: Home
 *     hiện ra trần trụi, không có hiệu ứng.
 *   - Bản thứ hai chia đôi: pixel phủ TRẮNG kín màn hình, sang trang rồi quét
 *     ra. Người dùng chê "sao phải quét qua một cái màn hình trắng" — dải pixel
 *     chỉ là một DẢI, không phải tấm phủ. Đừng đưa lại.
 * Khung hình ĐẦU TIÊN của trang mới phải đã bị phủ: một đoạn script nhỏ trong
 * <head> (generator) thấy cờ thì gắn `kx-pt-che` lên <html>, CSS phủ màu nền
 * bằng html::after — không thì trang lộ ra một nhịp trước khi file này kịp
 * chạy ở cuối <body>.
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

    // Mép dải thành hình MŨI TÊN (người dùng gợi ý): hàng giữa đi trước hàng
    // mép bấy nhiêu phần bề ngang màn hình. 0 = thẳng như cũ; dương = mũi tên
    // chỉ theo hướng quét ">"; âm = chữ V ngược "<". Lớp phủ cũng cắt theo
    // đúng đường gấp khúc đó.
    arrow: 0.2,

    color: '#ffffff', // màu pixel
    rainbow: false, // true = trải cầu vồng theo vị trí, bỏ qua `color`
    blend: 'normal', // mix-blend-mode của lưới; 'difference' hợp tông trang

    zIndex: 100,
    // Chuyển sang trang khác (màn loading → Home):
    coverColor: '#040203', // màu lớp phủ ở trang mới — đúng nền màn loading
    revealWait: 600, // ms — chờ ít nhất bấy nhiêu rồi mới xét chuyện mở
    // Trang mới (Home) nặng lúc vừa mở: dựng máy CD three.js (~700 ms treo),
    // biên dịch shader lần vẽ đầu (~380 ms), vẽ atlas dải ảnh (~300 ms). Quét
    // ĐÚNG lúc đó thì dải pixel giật cục (người dùng: "sao lag thế"). Nên giữ
    // LỚP ĐEN tới khi trang YÊN — máy 3D báo dựng xong (nếu có) và `quietFrames`
    // khung liền nhau không khựng (< 50 ms) — rồi mới quét. Trần chờ `waitMax`.
    quietFrames: 10,
    waitMax: 4000, // ms — quá thì cứ quét
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
.kx-pt__px{aspect-ratio:1;width:100%;opacity:0;background:${S.color};box-shadow:0 0 0 1px ${S.color}}
`
  }

  /* ------------------------------------------------------------------ lưới
   * Lưới phủ kín mà vẫn thấy trang bên dưới KẺ SỌC xuyên qua khe giữa các ô:
   * mỗi ô từng mang `will-change: opacity` nên thành một lớp compositor riêng
   * (hơn 1300 lớp), mỗi lớp khử răng cưa mép riêng và mép không khít nhau —
   * nở ô bằng scale cũng không lấp được. Bỏ will-change (ô màu trơn vẽ lại rất
   * rẻ) và lót viền bóng 1px cùng màu để lấp khe làm tròn. Đây từng là lỗi thật. */

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
        // f: 1 ở giữa bề ngang, 0 ở hai mép — dùng cho mép hình mũi tên.
        const giua = Math.min(1, ((j + 0.5) * canh) / (dung ? r.width : r.height))
        oPixel.push({ el: px, cot: i, hang: j, f: 1 - Math.abs(2 * giua - 1) })
      }
      panel.appendChild(col)
    }

    if (S.rainbow) {
      const tong = oPixel.length
      oPixel.forEach((p, k) => {
        const mau = `hsl(${Math.round((k / Math.max(1, tong - 1)) * 360)} 90% 60%)`
        p.el.style.background = mau
        p.el.style.boxShadow = `0 0 0 1px ${mau}`
      })
    }
    return { soCot, soPixel }
  }

  /* --------------------------------------------------------------- tính giờ
   * Chép đúng công thức của bản gốc, chỉ đổi từ timeline GSAP sang mốc thời
   * gian tuyệt đối để một vòng rAF tự tra. */

  function lenLich(soCot, soPixel, daiRieng) {
    const dai = Math.max(0.05, daiRieng || S.duration)
    const mo = Math.max(0.001, S.pixelFade)
    const chong = clamp(S.overlap, 0, 1)

    const batDauCat = Math.min(mo, dai * 0.5)
    const daiCat = Math.max(0.001, dai - 2 * batDauCat)
    const buoc = daiCat / soCot

    const moiPixel = (mo / soPixel) * (1 - chong) + mo * chong
    const trai = Math.max(0, mo - moiPixel)

    // Mũi tên: mép cắt của hàng có hệ số f nằm ở base + arrow·f, với base chạy
    // từ -max(arrow,0) tới 1 + max(-arrow,0). Pixel cột i bị chạm khi mép tới
    // i/soCot. arrow = 0 thì ra đúng công thức cũ: batDauCat + i·buoc.
    const mui = clamp(S.arrow || 0, -0.9, 0.9)
    const truoc = Math.max(mui, 0)
    const quang = 1 + Math.abs(mui)
    oPixel.forEach((p) => {
      const k = (p.cot / soCot - mui * p.f + truoc) / quang
      const loRa = batDauCat + k * daiCat
      const vao = Math.max(0, loRa - mo)
      const ra = Math.min(dai, loRa + buoc)
      // Lệch ngẫu nhiên trong cột — bản gốc dùng stagger `from: "random"`.
      p.vao = vao + Math.random() * trai
      p.ra = ra + Math.random() * trai
      p.dai = Math.max(0.001, moiPixel)
    })

    return { dai, batDauCat, daiCat, buoc, mui, truoc, quang }
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
          // Chỉ ghi khi đổi: ~1300 ô, ghi lại cả giá trị cũ là tính lại style vô ích.
          if (o !== p.o) {
            p.o = o
            p.el.style.opacity = o
          }
        }

        // Cắt lớp phủ theo BẬC, mỗi cột một bậc — đúng như `steps(cols, start)`
        // của bản gốc. Không dùng bậc thì mép cắt chạy mượt và lộ ra khỏi dải
        // pixel đang che nó.
        if (el) {
          const k2 = clamp((t - nhip.batDauCat) / nhip.daiCat, 0, 1)
          const kb = Math.floor(k2 * soCot) / soCot
          if (!nhip.mui) {
            const phan = kb * 100
            el.style.clipPath = dung ? `inset(${phan}% 0 0 0)` : `inset(0 0 0 ${phan}%)`
          } else {
            // Mép gấp khúc: hai mép ở `canh`, giữa ở `canh + mui`.
            const canh = (-nhip.truoc + nhip.quang * kb) * 100
            const giua = canh + nhip.mui * 100
            el.style.clipPath = dung
              ? `polygon(0 ${canh}%, 50% ${giua}%, 100% ${canh}%, 100% 100%, 0 100%)`
              : `polygon(${canh}% 0, 100% 0, 100% 100%, ${canh}% 100%, ${giua}% 50%)`
          }
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
  /* ------------------------------------------------- chuyển sang trang khác */

  const CO = 'kx-pt:mo'

  // Ghi cờ cho trang sắp tới — gọi ngay trước khi điều hướng.
  function henMo() {
    try {
      sessionStorage.setItem(CO, JSON.stringify({
        cols: S.cols, duration: S.duration, pixelFade: S.pixelFade, overlap: S.overlap,
        arrow: S.arrow, color: S.color, rainbow: S.rainbow, blend: S.blend,
        coverColor: S.coverColor, revealWait: S.revealWait,
      }))
    } catch (e) {}
  }

  // Ở trang mới: phủ lớp đen rồi cho dải pixel cắt nó đi — đúng run() cũ.
  function mo(soCu) {
    if (soCu) Object.assign(S, soCu)
    // Trên mọi thứ của trang (nav, bảng, máy CD…), chỉ dưới con trỏ.
    S.zIndex = 2147483000
    const phu = document.createElement('div')
    phu.setAttribute('aria-hidden', 'true')
    phu.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2147482999;background:' + S.coverColor
    document.body.appendChild(phu)
    // Lớp phủ thật đã nằm đó thì bỏ lớp phủ tạm của <head>.
    document.documentElement.classList.remove('kx-pt-che')
    let da = false
    const chay = () => {
      if (da) return
      da = true
      // Dấu thời gian để đo (Performance panel / PerformanceObserver).
      if (performance.mark) performance.mark('kx-pt-quet')
      requestAnimationFrame(() => run(phu).then(() => {
        phu.remove()
        if (performance.mark) performance.mark('kx-pt-xong')
      }))
    }
    // Chờ trang YÊN rồi mới quét (xem `quietFrames`). Font cũng phải xong —
    // chữ đổi font giữa lúc lộ ra là thấy rõ.
    const t0 = performance.now()
    let font = !(document.fonts && document.fonts.ready)
    if (!font) document.fonts.ready.then(() => { font = true })
    // Trang có máy CD 3D thì chờ nó dựng xong; máy đang tắt (`hien: false`) thì thôi.
    let may = !document.querySelector('script[src*="kx-cd3d.js"]')
    addEventListener('kx-cd3d-ready', () => { may = true }, { once: true })
    addEventListener('kx-cd3d-ctl', () => {
      const c = window.KX_CD3D_CTL
      if (c && c.config && !c.config.hien) may = true
    }, { once: true })
    let truoc = t0
    let yen = 0
    const doi = (now) => {
      const dt = now - truoc
      truoc = now
      yen = dt < 50 ? yen + 1 : 0 // < 50 ms: máy chạy đều 20–30 fps vẫn tính là yên
      const du = now - t0
      if (du >= S.waitMax || (du >= S.revealWait && font && may && yen >= S.quietFrames)) {
        chay()
        return
      }
      requestAnimationFrame(doi)
    }
    requestAnimationFrame(doi)
  }

  // Trang mới: có cờ thì mở. Chạy ngay lúc file nạp (cuối <body>), không chờ
  // DOMContentLoaded — lớp phủ tạm của <head> đang che, càng sớm càng tốt.
  ;(function () {
    let soCu = null
    try {
      const v = sessionStorage.getItem(CO)
      if (v) {
        sessionStorage.removeItem(CO)
        soCu = JSON.parse(v)
      }
    } catch (e) {}
    if (soCu && document.body) mo(soCu)
    else document.documentElement.classList.remove('kx-pt-che')
  })()

  window.KX_PAGE_TRANSITION = {
    config: S,
    defaults: Object.freeze({ ...CONFIG }),
    run,
    henMo,
    // Bảng H: "Chạy thử" — phủ đen rồi quét ngay trên trang đang xem.
    rungThu: () => { if (!dangChay) mo() },
    dangChay: () => dangChay,
    restyle,
  }
})()
