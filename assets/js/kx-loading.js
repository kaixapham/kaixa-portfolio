/* =============================================================================
 * kaixa Portfolio — Màn loading
 * -----------------------------------------------------------------------------
 * Dựng theo Figma *Kaixa Portfolio 2026*, node `1:1329` ("Loading 8"), khổ
 * 1920×1080 — cùng khổ thiết kế với trang contact.
 *
 * KHÔNG PHẢI MỘT LỚP PHỦ ĐEN RIÊNG. Bản thiết kế dùng lại nguyên khung của
 * trang contact — tiêu đề `(Hello, Mate)`, cột chữ chạy bên phải, ba dấu
 * `[` `]` `[INSPI]`, mấy cái chấm — rồi GIẤU phần thuộc về trang contact (hai
 * đĩa, ảnh poster giữa, cụm player, khối nav góc dưới trái, dòng mail) và THÊM
 * ba thứ của riêng màn loading:
 *
 *   1. số phần trăm khổng lồ ở góc dưới trái
 *   2. hàng nhãn `[GOOD THING]` `[TAKE TIME]` `[ INDIPENDENT ]` `[ DESIGNER ]`,
 *      nằm đúng hàng với ba dấu `[` `]` `[INSPI]` sẵn có
 *   3. hai tấm poster nhỏ, mỗi tấm thẳng cột với nhãn của nó
 *
 * Làm theo lối này thì cột chữ, tiêu đề và mấy cái dấu KHÔNG phải dựng lại —
 * chúng là chính phần tử thật của trang, nên "layout y hệt trang contact" là
 * đúng theo định nghĩa chứ không phải chép cho giống.
 *
 * ẢNH PHẢI ĐỨNG YÊN, ẢNH TRÁI NHẢY LIÊN TỤC qua danh sách ảnh nhập từ bảng tinh
 * chỉnh; nhịp nhảy chỉnh bằng `every`.
 *
 * CÁCH DÙNG: nạp SAU kx-hello-mate.js (nó cần các phần tử file kia dựng ra).
 * Chỉnh bằng CONFIG ngay bên dưới. File này KHÔNG chứa UI setting — bảng tinh
 * chỉnh ở kx-devtools.js (tab "Loading").
 * ========================================================================== */
(() => {
  'use strict'

  // CONFIG để phẳng cho khớp bảng tinh chỉnh (kx-devtools.js đọc config[key]).
  const CONFIG = {
    enabled: true, // vào trang là chạy màn loading

    // ------------------------------------------------------------- nhịp chạy
    duration: 7.6, // giây — đếm từ 0 tới 100%
    fadeOut: 0.7, // giây — màn loading tan dần, lộ trang contact
    holdIfSlow: true, // ảnh chưa nạp xong thì nán lại chờ (tối đa `waitMax`)
    waitMax: 6, // giây — trần chờ, quá thì cứ tan
    ease: 1.6, // >1 = chạy nhanh lúc đầu rồi chậm dần ở cuối; 1 = đều

    // ------------------------------------------------ ảnh trái nhảy liên tục
    every: 0.13, // giây — bao lâu nhảy một ảnh
    fade: 0, // giây — mờ chồng giữa hai ảnh; 0 = nhảy cắt
    shuffle: false, // true = nhảy lung tung thay vì theo thứ tự khai
    // Khai thêm `shot9` … là chạy, hàm quét tới shot16.
    shot1: '/assets/media/08---Mu-i.png',
    shot2: '/assets/media/07---Ngu--a--hehe.png',
    shot3: '/assets/media/06-woman-02-111.png',
    shot4: '/assets/media/234261.png',
    shot5: '/assets/media/05---Thi-n-Poster.png',
    shot6: '/assets/media/10---Ga-.png',
    shot7: '/assets/media/06--Ra--n-Poster.png',
    shot8: '/assets/media/001---TV-XU-A.png',

    still: '/assets/media/Avt.png', // ảnh phải, đứng yên

    // -------------------------------------------------- số phần trăm góc dưới
    pct: true,
    // Cỡ chữ tính theo CHIỀU CAO CHỮ HOA, không phải cỡ font: BT Danta có
    // sCapHeight/unitsPerEm = 1600/2000 = 0.8, mà bản thiết kế cho chữ hoa cao
    // 250px, nên 250 / 0.8 = 312.5.
    // Cỡ chữ tính theo CHIỀU CAO CHỮ HOA: BT Danta có sCapHeight/unitsPerEm =
    // 1600/2000 = 0.8, bản thiết kế cho chữ hoa cao 250px → 250 / 0.8 = 312.5.
    pctSize: 312, // px thiết kế — cỡ chữ
    // Chặn cứng không cho số đè lên hàng nhãn ở trên. Kéo `pctSize` to tới đâu
    // thì cỡ thật cũng bị ghìm lại sao cho đỉnh chữ hoa còn cách đáy nhãn đúng
    // `pctClear`. Tắt đi thì tự chịu trách nhiệm.
    pctClamp: true,
    pctClear: 6, // px thiết kế — khe tối thiểu từ đỉnh số lên đáy hàng nhãn
    pctX: 0, // px thiết kế — lệch ngang so với lề trang
    pctBottom: 18, // px thiết kế — mép dưới cách đáy viewport
    pctSuffix: '%',
    // BT Danta — font của bản thiết kế, nhúng trong assets/fonts (xem @font-face
    // ở css()). Ba nét: 500 / 700 / 800.
    pctFamily: '\'BT Danta\',\'Helvetica Neue\',Helvetica,Arial,sans-serif',
    pctWeight: 700,
    pctTrack: -0.04, // em — giãn chữ

    // ------------------------------------------------------------ hàng nhãn
    // `rowY` tính như `.hm-marks` của trang contact (cách đáy, CỘNG lề trang),
    // nên để nguyên là bốn nhãn thẳng hàng với `[` `]` `[INSPI]` sẵn có.
    rowY: 250,
    labelGood: '[GOOD THING]',
    labelTime: '[TAKE TIME]',
    labelL: '[ INDIPENDENT ]',
    labelR: '[ DESIGNER ]',
    goodX: 0, // px thiết kế, tính từ lề trái
    timeX: 163,

    // ------------------------------------------------------------ hai poster
    // NEO LỀ PHẢI, không neo lề trái. Trong bản thiết kế hai tấm này nằm sát
    // ngay bên trái cột chữ; cột chữ vốn neo phải, nên neo trái là ở màn rộng
    // hơn 1920 chúng trôi ra xa khỏi cột chữ. Nhãn nằm trong cùng một cột dọc
    // với ảnh nên tự thẳng mép trái với ảnh, không phải căn tay.
    shotR: 582, // px thiết kế từ lề phải — mép PHẢI của ảnh TRÁI
    stillR: 389, // px thiết kế từ lề phải — mép PHẢI của ảnh PHẢI
    imgW: 177, // px thiết kế
    imgH: 254,
    imgBottom: 24, // px thiết kế — mép dưới ảnh cách đáy viewport
    labelGap: 5, // px thiết kế — đáy nhãn xuống mép trên ảnh
    fit: 'cover', // 'cover' = phủ kín khung | 'contain' = lọt trong khung

    // ------------------------------------- giấu gì của trang contact lúc loading
    // Lớp phủ đục đã che hết phần contact rồi, nên ở đây chỉ còn phải giấu thanh
    // quét của kx-block-reveal.js — nó treo ở position:fixed NGOÀI .hm với
    // z-index 40 nên không lớp phủ nào che nổi.
    hide: '.brv-bar--over,.brv-base--over',
    zIndex: 8, // dưới lớp phủ kéo-thả (9), trên mọi thứ còn lại
  }

  const S = CONFIG
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)
  const u = (n) => `calc(var(--u) * ${n / 16})`
  // Đúng lệ của trang: mọi thứ neo vào lề viewport, `--pad` khai ở `.hm`.
  const pad = (n) => `calc(var(--pad) + ${u(n)})`

  /* ------------------------------------------------------------ cỡ số phần trăm
   * BT Danta: sCapHeight / unitsPerEm = 1600 / 2000. Vì `.kx-ld__pct` dùng
   * `text-box-trim` nên HỘP CHỮ CAO ĐÚNG BẰNG CHỮ HOA — suy ra chiều cao thật
   * từ cỡ font chỉ là một phép nhân, không phải đoán.
   *
   * Đáy hàng nhãn cách đáy viewport `padding + rowY`. Số phần trăm ngồi ở
   * `pctBottom`, cao `pctSize × 0.8`. Cho hai thứ đó không chạm nhau là xong.
   * Trước đây không có chỗ chặn này nên kéo cỡ chữ lên là số trèo đè lên nhãn
   * `[GOOD THING]` / `[TAKE TIME]`. Đây từng là lỗi thật. */

  const CAP = 0.8

  function coSo() {
    if (!S.pctClamp) return S.pctSize
    const c = (window.KX_HELLO_MATE && window.KX_HELLO_MATE.config) || {}
    const dayNhan = (c.padding == null ? 24 : c.padding) + S.rowY
    const choPhep = dayNhan - S.pctBottom - Math.max(0, S.pctClear)
    return Math.min(S.pctSize, Math.max(8, choPhep / CAP))
  }

  /* ---------------------------------------------------------- danh sách ảnh */

  function shots() {
    const ds = []
    for (let i = 1; i <= 16; i++) if (S['shot' + i]) ds.push(S['shot' + i])
    return ds
  }

  /* ------------------------------------------------------------------- CSS */

  let styleEl = null

  function css() {
    const c = (window.KX_HELLO_MATE && window.KX_HELLO_MATE.config) || {}
    const dim = c.colorDim || '#4d4d4d'
    const white = c.colorWhite || '#fff'
    const box = c.colorBox || 'rgba(255,255,255,.12)'
    return `
/* BT Danta — chỉ màn loading dùng, nên khai ngay ở đây chứ không nhét vào
   stylesheet của kx-hello-mate.js. Dùng font-display:block chứ không phải swap:
   số phần trăm to gần nửa màn hình, đảo font giữa chừng là thấy rõ mồn một. */
@font-face{font-family:'BT Danta';src:url('assets/fonts/BTDanta-500.woff2') format('woff2');font-weight:500;font-style:normal;font-display:block}
@font-face{font-family:'BT Danta';src:url('assets/fonts/BTDanta-700.woff2') format('woff2');font-weight:700;font-style:normal;font-display:block}
@font-face{font-family:'BT Danta';src:url('assets/fonts/BTDanta-800.woff2') format('woff2');font-weight:800;font-style:normal;font-display:block}

/* Lớp phủ ĐỤC, không trong suốt. Nhờ vậy cắt dần nó đi là trang contact lộ ra
   từng khoảng một — đó là cách màn chuyển pixel làm việc. Trước đây nó trong
   suốt và phải giấu từng phần tử contact bằng visibility, mà visibility thì
   không cắt dần theo chiều ngang được. */
.hm .kx-ld{position:absolute;inset:0;z-index:${S.zIndex};pointer-events:none;
  background:${S.bg || c.colorBg || '#040203'};
  opacity:1;transition:opacity var(--kx-ld-out,.7s) ease}
.hm .kx-ld[data-out='true']{opacity:0}
/* Tiêu đề, cột chữ, ba dấu và mấy cái chấm có mặt ở CẢ HAI màn, cùng một chỗ —
   nâng lên trên lớp phủ để chúng không bị nó che, và cũng để chúng không bị
   cuốn theo lúc quét. */
html[data-kx-ld='on'] :is(.hm-hello,.hm-feed,.hm-marks,.hm-dot){z-index:${S.zIndex + 1}}
/* Giấu phần thuộc về trang contact. Dùng visibility để KHÔNG đụng vào layout —
   cột chữ và mấy cái dấu vẫn phải nằm đúng chỗ của chúng.
   Cờ đặt trên <html> chứ không phải trên .hm: kx-block-reveal.js treo thanh quét
   của ảnh poster ở position:fixed NGOÀI .hm, nên cờ đặt trong .hm không với
   tới nó và thanh trắng đó vẫn hiện giữa màn loading. */
html[data-kx-ld='on'] :is(${S.hide}){visibility:hidden}

/* Hàng nhãn: cùng mốc bottom với .hm-marks nên thẳng hàng với [ ] [INSPI]. */
.hm .kx-ld__lb{position:absolute;bottom:${pad(S.rowY)};line-height:${32 / 14};
  color:${dim};white-space:nowrap}
.hm .kx-ld__lb--good{left:${pad(S.goodX)}}
.hm .kx-ld__lb--time{left:${pad(S.timeX)}}

/* Hai cột: nhãn nằm trên, ảnh nằm dưới, cùng một mạch dọc nên nhãn tự thẳng
   mép trái với ảnh. Cột neo LỀ PHẢI để luôn bám sát cột chữ. */
.hm .kx-ld__col{position:absolute;bottom:${u(S.imgBottom)};
  display:flex;flex-direction:column;align-items:flex-start;gap:${u(S.labelGap)}}
.hm .kx-ld__col--l{right:${pad(S.shotR)}}
.hm .kx-ld__col--r{right:${pad(S.stillR)}}
.hm .kx-ld__col .kx-ld__lb{position:static;bottom:auto;left:auto}
.hm .kx-ld__box{position:relative;
  width:${u(S.imgW)};height:${u(S.imgH)};overflow:hidden}
.hm .kx-ld__box img{position:absolute;inset:0;width:100%;height:100%;
  object-fit:${S.fit};display:block}
.hm .kx-ld__box img.is-under{opacity:0}
.hm .kx-ld__box img.is-fade{transition:opacity var(--kx-ld-fade,0s) linear}
/* Khung trống lúc chưa nhập ảnh — để còn thấy bố cục mà căn. */
.hm .kx-ld__box[data-empty='true']{border:1px solid ${box}}

/* Số phần trăm. Hộp chữ phải CẮT ĐÚNG chiều cao chữ hoa, không thì phần thừa
   phía trên (BT Danta có ascender 2250/2000 em, cao hơn chữ hoa nhiều) đội hộp
   lên và đè vào hàng nhãn [GOOD THING] / [TAKE TIME] ở trên. Đây từng là lỗi
   thật. text-box-trim làm đúng việc đó; trình duyệt chưa hỗ trợ thì line-height
   bằng đúng tỉ lệ chữ hoa (0.8) cho ra kết quả lệch không đáng kể. */
.hm .kx-ld__pct{position:absolute;left:${pad(S.pctX)};bottom:${u(S.pctBottom)};
  font-family:${S.pctFamily};font-weight:${S.pctWeight};
  font-size:${u(coSo())};line-height:.8;letter-spacing:${S.pctTrack}em;
  color:${white};white-space:nowrap}
@supports (text-box-trim:trim-both){
  .hm .kx-ld__pct{text-box-trim:trim-both;text-box-edge:cap alphabetic;line-height:1}
}
`
  }

  function restyle() {
    if (!styleEl) {
      styleEl = document.createElement('style')
      styleEl.setAttribute('data-kx-loading', '')
      document.head.appendChild(styleEl)
    }
    styleEl.textContent = css()
  }

  /* ------------------------------------------------------------------ dựng */

  let root = null
  let hm = null
  let boxL = null
  let boxR = null
  let imgA = null // hai lớp ảnh của ô bên trái
  let imgB = null
  let pctEl = null
  let raf = 0
  let t0 = 0
  let nhayTimer = 0
  let idx = 0
  let pctCu = -1
  let anhCu = '' // chữ ký danh sách ảnh, để bắt lúc bảng tinh chỉnh áp đường dẫn
  let khung = 0
  let xong = false
  let hen = []

  const sau = (fn, giay) => hen.push(setTimeout(fn, Math.max(0, giay) * 1000))

  function nhan(cls, chu) {
    const p = document.createElement('p')
    p.className = 'kx-ld__lb kx-ld__lb--' + cls + ' hm-mono'
    p.textContent = chu
    return p
  }

  function build() {
    hm = document.querySelector('.hm')
    if (!hm) return false

    root = document.createElement('div')
    root.className = 'kx-ld'
    root.setAttribute('aria-hidden', 'true')
    root.style.setProperty('--kx-ld-out', Math.max(0, S.fadeOut) + 's')

    root.appendChild(nhan('good', S.labelGood))
    root.appendChild(nhan('time', S.labelTime))

    const colL = document.createElement('div')
    colL.className = 'kx-ld__col kx-ld__col--l'
    colL.appendChild(nhan('l', S.labelL))
    boxL = document.createElement('div')
    boxL.className = 'kx-ld__box'
    imgB = document.createElement('img')
    imgA = document.createElement('img')
    imgB.alt = ''
    imgA.alt = ''
    imgB.className = 'is-under'
    boxL.appendChild(imgB)
    boxL.appendChild(imgA)
    colL.appendChild(boxL)

    const colR = document.createElement('div')
    colR.className = 'kx-ld__col kx-ld__col--r'
    colR.appendChild(nhan('r', S.labelR))
    boxR = document.createElement('div')
    boxR.className = 'kx-ld__box'
    const imR = document.createElement('img')
    imR.alt = ''
    boxR.appendChild(imR)
    colR.appendChild(boxR)

    root.appendChild(colL)
    root.appendChild(colR)

    if (S.pct) {
      pctEl = document.createElement('p')
      pctEl.className = 'kx-ld__pct'
      pctEl.textContent = '0' + S.pctSuffix
      root.appendChild(pctEl)
    }

    hm.appendChild(root)
    document.documentElement.setAttribute('data-kx-ld', 'on')
    return true
  }

  /* ------------------------------------------------------------------ ảnh */

  // Chữ ký của bộ ảnh đang khai. Bảng tinh chỉnh áp giá trị đã lưu DẦN trong
  // khoảng 2.4 giây đầu, mà màn loading dựng ngay lúc DOMContentLoaded — nên
  // lúc dựng ba ô ảnh thường vẫn còn trống và khung hiện ra rỗng. Soi chữ ký
  // này theo nhịp thưa để bắt lấy đường dẫn về muộn. Đây từng là lỗi thật.
  function chuKyAnh() {
    return S.still + '|' + shots().join('|')
  }

  function datAnh() {
    const ds = shots()
    anhCu = chuKyAnh()
    const imR = boxR && boxR.querySelector('img')
    if (imR) {
      if (S.still) {
        imR.src = S.still
        boxR.removeAttribute('data-empty')
      } else {
        imR.removeAttribute('src')
        boxR.setAttribute('data-empty', 'true')
      }
    }
    if (boxL) {
      if (ds.length) {
        idx = 0
        imgA.src = ds[0]
        boxL.removeAttribute('data-empty')
      } else {
        imgA.removeAttribute('src')
        imgB.removeAttribute('src')
        boxL.setAttribute('data-empty', 'true')
      }
    }
    // Nạp trước cả loạt, không thì mỗi lần nhảy lại chớp một khung trống.
    ds.forEach((src) => {
      const p = new Image()
      p.src = src
    })
  }

  function nhay() {
    const ds = shots()
    if (ds.length < 2 || !imgA) return
    idx = S.shuffle
      ? (idx + 1 + Math.floor(Math.random() * (ds.length - 1))) % ds.length
      : (idx + 1) % ds.length
    const src = ds[idx]
    if (Math.max(0, S.fade) <= 0.001) {
      imgA.classList.remove('is-fade')
      imgA.src = src
      return
    }
    // Mờ chồng: lớp dưới nhận ảnh mới, lớp trên mờ đi rồi hai lớp đổi vai.
    imgB.src = src
    imgB.classList.remove('is-under')
    imgA.classList.add('is-fade')
    imgA.style.setProperty('--kx-ld-fade', S.fade + 's')
    imgA.style.opacity = '0'
    const A = imgA
    const B = imgB
    sau(() => {
      A.style.opacity = ''
      A.classList.remove('is-fade')
      A.classList.add('is-under')
      imgA = B
      imgB = A
    }, S.fade)
  }

  /* ------------------------------------------------------------- phần trăm */

  function anhXong() {
    if (!root) return true
    const ims = root.querySelectorAll('img')
    for (let i = 0; i < ims.length; i++) {
      if (ims[i].getAttribute('src') && !ims[i].complete) return false
    }
    return true
  }

  function tick(now) {
    raf = requestAnimationFrame(tick)
    if (!t0) t0 = now
    khung++
    if (khung % 10 === 0 && chuKyAnh() !== anhCu) datAnh()
    const giay = (now - t0) / 1000
    const dur = Math.max(0.1, S.duration)
    let k = clamp(giay / dur, 0, 1)
    // Chạy nhanh lúc đầu rồi chậm dần — đúng cảm giác của một thanh loading thật.
    k = Math.pow(k, 1 / Math.max(0.2, S.ease))

    // Chưa nạp xong ảnh thì giữ lại ở 99%, đừng nhảy lên 100 rồi mới đứng chờ.
    const cho = S.holdIfSlow && !anhXong() && giay < Math.max(0, S.waitMax)
    if (cho) k = Math.min(k, 0.99)

    if (pctEl) {
      const n = Math.round(k * 100)
      if (n !== pctCu) {
        pctCu = n
        pctEl.textContent = n + S.pctSuffix
      }
    }
    if (k >= 1 && !cho) tan()
  }

  /* ------------------------------------------------------------- bật / tắt */

  function start() {
    stop()
    restyle()
    if (!build()) return
    datAnh()
    t0 = 0
    pctCu = -1
    khung = 0
    xong = false
    raf = requestAnimationFrame(tick)
    nhayTimer = setInterval(nhay, Math.max(0.05, S.every) * 1000)
  }

  function tan() {
    if (!root || xong) return
    xong = true
    cancelAnimationFrame(raf)
    raf = 0
    clearInterval(nhayTimer)
    nhayTimer = 0
    const bao = () => {
      // Báo cho kx-burning-open.js: màn mở đầu chỉ chạy SAU khi loading tan,
      // không thì nó đốt xong xuôi trong lúc lớp phủ còn che.
      document.documentElement.removeAttribute('data-kx-ld')
      window.dispatchEvent(new CustomEvent('kx-loading-done'))
      if (root) root.remove()
      root = null
    }

    // Có màn chuyển pixel thì để nó cắt lớp phủ đi; cờ `data-kx-ld` phải GIỮ
    // tới hết màn quét, vì nó đang nâng tiêu đề / cột chữ / mấy cái dấu lên
    // trên lớp phủ. Không có thì mờ dần như cũ.
    const pt = window.KX_PAGE_TRANSITION
    if (pt && pt.config.enabled) {
      pt.run(root).then(bao)
      return
    }
    root.setAttribute('data-out', 'true')
    sau(bao, Math.max(0, S.fadeOut) + 0.05)
  }

  function stop() {
    hen.forEach(clearTimeout)
    hen = []
    cancelAnimationFrame(raf)
    raf = 0
    clearInterval(nhayTimer)
    nhayTimer = 0
    t0 = 0
    pctCu = -1
    khung = 0
    anhCu = ''
    xong = false
    if (root) root.remove()
    root = null
    document.documentElement.removeAttribute('data-kx-ld')
  }

  /* --------------------------------------------------------------- vào đời */

  function boot(con) {
    if (!S.enabled) return
    if (document.querySelector('.hm')) {
      start()
      return
    }
    if (con > 0) setTimeout(() => boot(con - 1), 40)
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => boot(60), { once: true })
  } else boot(60)

  window.addEventListener('resize', restyle)

  // Chỉ để bảng tinh chỉnh (kx-devtools.js) đọc/ghi lúc chạy.
  window.KX_LOADING = {
    config: S,
    defaults: Object.freeze({ ...CONFIG }),
    dangHien: () => !!root && !xong,
    restyle,
    // Chạy lại để xem thử, không cần tải lại trang.
    replay: () => {
      stop()
      boot(60)
    },
    skip: tan,
  }
})()
