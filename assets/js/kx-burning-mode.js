/* =============================================================================
 * kaixa Portfolio — Burning mode (một nút, bật cả ba cơ chế lửa)
 * -----------------------------------------------------------------------------
 * TRANG MẶC ĐỊNH KHÔNG CÓ LỬA. Ba file lửa đều để `enabled: false`, chỉ khi bấm
 * nút này mới cháy — bấm lần nữa là tắt sạch, trang trở về đúng như lúc mở.
 *
 * Ba cơ chế được châm theo thứ tự, không bật cùng một lúc:
 *
 *   0s            kx-burn-image.js — đốt ảnh poster và hai đĩa (màn chuyển)
 *   +edgeDelay    kx-fire-edge.js  — lửa liếm dọc mép đĩa và mép ảnh
 *   +pageDelay    kx-blaze.js      — lớp lửa phủ mép dưới trang
 *
 * (Cơ chế thứ tư — hơi nóng bốc trên vành đĩa, preset `blaze` của kx-disc-fx.js
 * — mặc định KHÔNG bật; đặt `useDiscHeat: true` nếu muốn.)
 *
 * File này KHÔNG chứa hiệu ứng nào. Nó chỉ dựng cái nút và gạt `enabled` của ba
 * file kia, nên tắt nó đi thì ba hiệu ứng vẫn chạy độc lập như cũ, và ngược lại.
 *
 * VÌ SAO KHÔNG GỌI THẲNG start() CỦA TỪNG FILE: mỗi file có vòng quét 300ms tự
 * bắt lấy thay đổi của `enabled`. Gạt cờ rồi để nó tự bắt thì thứ tự khởi động
 * luôn giống nhau, còn gọi tay start() sẽ chạy trước vòng quét rồi bị chính
 * vòng quét đó dựng lại lần nữa.
 *
 * CÁCH DÙNG: nạp SAU ba file lửa. Chỉnh bằng CONFIG ngay bên dưới. File này
 * KHÔNG chứa UI setting — bảng tinh chỉnh ở kx-devtools.js (tab "Burning Mode").
 * ========================================================================== */
(() => {
  'use strict'

  // CONFIG để phẳng cho khớp bảng tinh chỉnh (kx-devtools.js đọc config[key]).
  const CONFIG = {
    enabled: true, // dựng cái nút (KHÔNG phải "bật lửa" — lửa do người bấm)
    active: false, // TRẠNG THÁI ĐẦU: chưa cháy gì cả
    label: 'BURNING MODE',
    labelOn: 'BURNING MODE',

    // ------------------------------------------------------------- chỗ đứng
    // 'player' = NGAY DƯỚI cụm PLAY/MUTE, rộng đúng bằng cụm đó (đúng bản thiết
    //            kế). Toạ độ suy ra từ chính vị trí khung PLAY/MUTE, nên kéo
    //            `playerY` / `ruleY` / `ctrlGapRule` trong tab Hello Mate thì
    //            nút đi theo, không phải căn lại.
    // 'nav'    = xếp thêm một ô vào thanh nav góc dưới trái
    // 'free'   = tự do, neo theo `anchor` + `x` / `y` (px thiết kế)
    mount: 'player',
    gapCtrl: 0, // px thiết kế — khe từ đáy khung PLAY/MUTE xuống nút.
    //             0 = hai khung DÍNH NHAU, viền dưới của khung PLAY/MUTE cũng
    //             chính là viền trên của nút (nút bị kéo lên 1px cho trùng nét).
    anchor: 'bottom-left', // 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right'
    x: 24,
    y: 108,
    width: 0, // 0 = tự co theo chữ (kiểu 'nav' / 'free')
    height: 0, // px thiết kế; 0 = LẤY ĐÚNG chiều cao khung PLAY/MUTE (ctrlH)

    // -------------------------------------------------- cơ chế nào được châm
    useBurn: true, // kx-burn-image.js — đốt ảnh
    useEdge: true, // kx-fire-edge.js  — lửa mép
    usePage: true, // kx-blaze.js      — lửa phủ trang
    useDiscHeat: false, // kx-disc-fx.js preset 'blaze' — hơi nóng trên vành

    // ------------------------------------------------------------ nhịp châm
    edgeDelay: 1.6, // giây — lửa mép bén sau khi màn đốt đã chạy được một lúc
    pageDelay: 2.4, // giây — lửa phủ trang bốc lên sau cùng
    autoOff: 0, // giây — tự tắt sau bấy nhiêu; 0 = cháy tới khi bấm lại

    // ---------------------------------------------------------------- khác
    hotkey: 'A', // phím tắt, ví dụ 'b'; để trống = tắt
    zIndex: 5,

    // GIỮ ĐÚNG GIAO ƯỚC "mở trang là không có lửa". Bảng tinh chỉnh lưu lại mọi
    // giá trị khác mặc định — kể cả `enabled: true` của ba file lửa — rồi
    // `applyStored()` áp lại DẦN trong khoảng 2.4 giây đầu. Nên đặt về false
    // đúng một lần lúc khởi động là không ăn thua: nó bật lại ngay sau đó. Đây
    // là khoảng thời gian dập lại, tính từ lúc mở trang.
    resetOnLoad: true,
    resetFor: 3.5, // giây
  }

  const S = CONFIG

  /* ĐANG CHÁY HAY KHÔNG nằm ở đây chứ KHÔNG nằm trong CONFIG. Bảng tinh chỉnh
   * lưu trạng thái bằng cách duyệt qua `defaults` — không phải qua danh sách
   * field — nên bất cứ khoá nào có trong CONFIG cũng bị ghi xuống localStorage
   * rồi áp ngược lại trong 2.4 giây đầu sau khi mở trang. Để `active` trong đó
   * thì bấm nút xong nó tự tắt lại, hoặc tệ hơn là trang tự cháy sẵn lúc mở.
   * Đây từng là lỗi thật. */
  let active = false

  /* ------------------------------------------------------------------ màu
   * Lấy đúng bảng màu của trang thay vì khai lại, để nút không lệch tông khi
   * ai đó đổi màu trong tab "Hello Mate". */
  function palette() {
    const c = (window.KX_HELLO_MATE && window.KX_HELLO_MATE.config) || {}
    return {
      bg: c.colorBg || '#040203',
      dim: c.colorDim || '#8a8a8a',
      white: c.colorWhite || '#fff',
      line: c.colorHairline || c.colorBox || 'rgba(255,255,255,.28)',
      box: c.colorBox || c.colorHairline || 'rgba(255,255,255,.28)',
    }
  }

  /* ------------------------------------------------------------------- CSS */

  let styleEl = null

  function css() {
    const P = palette()
    const u = (n) => `calc(var(--u) * ${n / 16})`
    return `
/* MỌI luật ở đây phải có tiền tố .hm — kx-hello-mate.js có một luật gột sạch
   nút của trang (\`.hm button{background:none;border:0;padding:0;color:inherit}\`)
   và nó specific hơn .kx-bm một bậc, nên .kx-bm trần sẽ bị xoá mất viền, nền và
   màu chữ. Đây từng là lỗi thật: nút hiện ra thành chữ trơ, không có khung. */
.hm .kx-bm{
  position:relative;background:${P.bg};border:1px solid ${P.box};border-radius:${u(4)};
  height:${u(btnH())};${S.width ? `width:${u(S.width)};` : ''}
  display:flex;align-items:center;justify-content:center;gap:${u(12)};padding:0 ${u(20)};
  color:${P.white};cursor:pointer;white-space:nowrap;
  transition:color .2s,border-color .2s,background .2s;
}
.hm .kx-bm:hover{background:rgba(255,255,255,.06)}
/* Đang cháy: viền và chữ ăn màu lửa, chấm bên trái đập nhẹ. */
.hm .kx-bm[aria-pressed='true']{color:#ffb072;border-color:#ff6a1e;background:rgba(255,106,30,.08)}
.hm .kx-bm__dot{width:${u(8)};height:${u(8)};flex:none;background:currentColor;border-radius:50%;opacity:.55}
.hm .kx-bm[aria-pressed='true'] .kx-bm__dot{opacity:1;background:#ff6a1e;animation:kx-bm-pulse 1.1s ease-in-out infinite}
@keyframes kx-bm-pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(.6);opacity:.45}}
@media (prefers-reduced-motion:reduce){.hm .kx-bm[aria-pressed='true'] .kx-bm__dot{animation:none}}
/* Kiểu 'nav': ăn đúng kiểu ô sẵn có trong thanh nav (viền mảnh hơn). */
.hm .kx-bm--nav{border-color:${P.line};justify-content:flex-start}
.hm .kx-bm--nav:hover{border-color:${P.white}}
/* Kiểu 'free': tự neo vào một góc viewport. */
.hm .kx-bm--free{position:absolute;z-index:${S.zIndex}}
/* Kiểu 'player': nối tiếp khung PLAY/MUTE — bỏ bo góc, dùng ĐÚNG viền của khung
   đó để hai ô đọc ra là một cụm chứ không phải hai thứ rời nhau. */
.hm .kx-bm--player{position:absolute;z-index:${S.zIndex};border-radius:0;padding:0;
  border-color:${P.box};gap:${u(10)}}
.hm .kx-bm--player .kx-bm__dot{display:none}
`
  }

  function restyle() {
    if (!styleEl) {
      styleEl = document.createElement('style')
      styleEl.setAttribute('data-kx-burning-mode', '')
      document.head.appendChild(styleEl)
    }
    styleEl.textContent = css()
  }

  /* ------------------------------------------------------------------- nút */

  let btn = null
  let timer = 0

  // Đáy khung PLAY/MUTE, tính bằng px thiết kế TRONG hệ toạ độ của .hm-player.
  // Suy ra từ CONFIG của kx-hello-mate.js đúng như chính file đó dựng CSS
  // (`rule = ruleY - 24`, `ctrlTop = rule + ctrlGapRule`, khung cao 56) — đọc
  // từ config thay vì đo layout thì không phải chạm vào DOM chút nào.
  function ctrlBottom() {
    const c = (window.KX_HELLO_MATE && window.KX_HELLO_MATE.config) || null
    if (!c) return 0
    return c.ruleY - 24 + c.ctrlGapRule + ctrlH()
  }

  // Chiều cao khung PLAY/MUTE. Nút cao đúng bằng nó nên hai khung xếp lên nhau
  // thành một cụm cân, kéo `ctrlH` trong tab Hello Mate là cả hai đi theo.
  function ctrlH() {
    const c = (window.KX_HELLO_MATE && window.KX_HELLO_MATE.config) || null
    return (c && c.ctrlH) || 40
  }

  function btnH() {
    return S.height > 0 ? S.height : ctrlH()
  }

  function build() {
    const root = document.querySelector('.hm')
    if (!root) return false
    const nav = root.querySelector('.hm-nav')
    const player = root.querySelector('.hm-player')
    let host = root
    if (S.mount === 'player' && player) host = player
    else if (S.mount === 'nav' && nav) host = nav

    if (!btn) {
      btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'kx-bm'
      btn.setAttribute('aria-pressed', 'false')
      btn.innerHTML = '<span class="kx-bm__dot"></span><span class="kx-bm__t"></span>'
      btn.addEventListener('click', toggle)
    }
    // px thiết kế → bội số của --u, đúng lệ của cả trang (xem CLAUDE.md).
    const u = (n) => `calc(var(--u) * ${n / 16})`
    btn.classList.toggle('kx-bm--player', host === player)
    btn.classList.toggle('kx-bm--nav', host === nav)
    btn.classList.toggle('kx-bm--free', host === root)
    if (host === player) {
      // Rộng đúng bằng cụm player (220 px thiết kế) và nằm ngay dưới PLAY/MUTE.
      // Kéo lên 1px: viền dưới của khung PLAY/MUTE và viền trên của nút chồng
      // đúng lên nhau thành MỘT nét, không thành hai nét sát nhau dày gấp đôi.
      const gap = Math.max(0, S.gapCtrl)
      btn.style.cssText =
        `left:0;top:calc(${u(ctrlBottom() + gap)} - 1px);width:${u(220)};height:${u(btnH())}`
    } else if (host === root) {
      btn.style.cssText = ''
      const a = S.anchor
      btn.style.top = a.startsWith('top') ? u(S.y) : ''
      btn.style.bottom = a.startsWith('bottom') ? u(S.y) : ''
      btn.style.left = a.endsWith('left') ? u(S.x) : ''
      btn.style.right = a.endsWith('right') ? u(S.x) : ''
    } else {
      btn.style.cssText = ''
    }
    if (btn.parentElement !== host) host.appendChild(btn)
    paint()
    return true
  }

  // Vòng quét gọi hàm này 300ms một lần, nên chỉ ghi vào DOM khi thật sự đổi.
  function paint() {
    if (!btn) return
    const on = active ? 'true' : 'false'
    if (btn.getAttribute('aria-pressed') !== on) btn.setAttribute('aria-pressed', on)
    const t = btn.querySelector('.kx-bm__t')
    const label = active ? S.labelOn : S.label
    if (t.textContent !== label) t.textContent = label
  }

  /* --------------------------------------------------------- châm lửa / dập */

  const cfgOf = (api) => (api && api.config) || null
  let discPresetBefore = ''

  function ignite() {
    const burn = cfgOf(window.KX_BURN_IMAGE)
    const edge = cfgOf(window.KX_FIRE_EDGE)
    const page = cfgOf(window.KX_BLAZE)
    const disc = cfgOf(window.KX_DISC_FX)

    // Đốt ảnh trước. Vòng quét của chính file đó bắt lấy cờ và chạy màn đốt.
    if (S.useBurn && burn) burn.enabled = true

    // Lửa mép bén sau — `startDelay` là của chính nó nên nhịp vào vẫn mượt kể
    // cả khi vòng quét bắt cờ trễ vài chục mili giây.
    if (S.useEdge && edge) {
      edge.startDelay = Math.max(0, S.edgeDelay)
      edge.enabled = true
    }

    if (S.usePage && page) {
      clearTimeout(timer)
      timer = setTimeout(() => {
        if (active) page.enabled = true
      }, Math.max(0, S.pageDelay) * 1000)
    }

    if (S.useDiscHeat && disc) {
      discPresetBefore = disc.preset
      disc.preset = 'blaze'
    }

    if (S.autoOff > 0) setTimeout(() => active && toggle(), S.autoOff * 1000)
  }

  function extinguish() {
    clearTimeout(timer)
    const burn = cfgOf(window.KX_BURN_IMAGE)
    const edge = cfgOf(window.KX_FIRE_EDGE)
    const page = cfgOf(window.KX_BLAZE)
    const disc = cfgOf(window.KX_DISC_FX)
    if (burn) burn.enabled = false
    // Trả ngay bộ ảnh gốc chứ không đợi vòng quét 300ms của file kia: tắt
    // burning mode là đĩa phải về đúng mặt đĩa cũ ngay lúc bấm.
    if (window.KX_BURN_IMAGE) window.KX_BURN_IMAGE.revert()
    if (edge) edge.enabled = false
    if (page) page.enabled = false
    if (disc && discPresetBefore && disc.preset === 'blaze') {
      disc.preset = discPresetBefore
      discPresetBefore = ''
    }
  }

  function toggle() {
    active = !active
    paint()
    if (active) ignite()
    else extinguish()
  }

  /* ------------------------------------------------------------- vòng quét */

  let sig = ''

  const bootAt = performance.now()

  // Dập lại lửa mà bảng tinh chỉnh vừa áp từ lần chỉnh trước. Không đụng vào
  // lúc màn mở đầu đang chạy — nó tự lo phần lửa theo nhịp riêng.
  function giuGiaoUoc() {
    if (!S.resetOnLoad || active) return
    if ((performance.now() - bootAt) / 1000 > Math.max(0, S.resetFor)) return
    const mo = window.KX_BURNING_OPEN
    if (mo && mo.dangChay && mo.dangChay()) return
    const burn = cfgOf(window.KX_BURN_IMAGE)
    const edge = cfgOf(window.KX_FIRE_EDGE)
    const page = cfgOf(window.KX_BLAZE)
    if (burn && burn.enabled) {
      burn.enabled = false
      window.KX_BURN_IMAGE.stop()
    }
    if (edge && edge.enabled) {
      edge.enabled = false
      // Gọi thẳng stop() chứ không chờ vòng quét của nó: hạ cờ không thôi thì
      // canvas đã dựng vẫn nằm đó lụi dần gần một giây, thành ra loé lửa ở đầu
      // trang. Hai vòng quét cùng nhịp 300ms nên vẫn có kẽ hở cho nó kịp dựng.
      window.KX_FIRE_EDGE.stop()
    }
    if (page && page.enabled) {
      page.enabled = false
      window.KX_BLAZE.stop()
    }
  }

  function sweep() {
    giuGiaoUoc()
    if (!S.enabled) {
      if (btn) {
        btn.remove()
        btn = null
      }
      if (active) {
        active = false
        extinguish()
      }
      return
    }
    const s = [
      S.mount, S.anchor, S.x, S.y, S.width, S.height, S.zIndex, S.label, S.labelOn,
      S.gapCtrl, ctrlH(), S.mount === 'player' ? ctrlBottom() : 0,
    ].join('|')
    if (s !== sig) {
      sig = s
      restyle()
      build()
    } else if (!btn || !btn.isConnected) {
      build()
    }
    paint()
  }

  window.addEventListener('keydown', (ev) => {
    if (!S.hotkey || !S.enabled) return
    if (ev.metaKey || ev.ctrlKey || ev.altKey) return
    const t = ev.target
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
    if (ev.key.toLowerCase() === String(S.hotkey).toLowerCase()) toggle()
  })

  function boot() {
    restyle()
    // Chốt chặn phải chạy NHANH HƠN cả applyStored() của bảng (60ms một nhịp)
    // lẫn vòng quét của hai file lửa (300ms). Cùng nhịp 300ms thì chúng đua
    // nhau: bảng bật lên, file lửa kịp dựng canvas, rồi mới bị dập — thành ra
    // loé một cái ở đầu trang. Vòng nhanh này tự tắt khi hết cửa sổ.
    giuGiaoUoc()
    if (S.resetOnLoad) {
      const nhanh = setInterval(giuGiaoUoc, 40)
      setTimeout(() => clearInterval(nhanh), Math.max(0, S.resetFor) * 1000 + 200)
    }
    setInterval(sweep, 300)
    sweep()
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true })
  else boot()

  // Chỉ để bảng tinh chỉnh (kx-devtools.js) đọc/ghi lúc chạy.
  window.KX_BURNING_MODE = {
    config: S,
    defaults: Object.freeze({ ...CONFIG }),
    toggle,
    isActive: () => active,
    // CHỈ đổi hiển thị của nút, không châm cũng không dập lửa. Màn mở đầu
    // (kx-burning-open.js) tự lo phần lửa theo nhịp riêng của nó, nên nó cần
    // đúng cái này chứ không phải ignite() / extinguish().
    showActive: (v) => {
      active = !!v
      paint()
    },
    ignite: () => {
      if (!active) toggle()
    },
    extinguish: () => {
      if (active) toggle()
    },
    restyle,
  }
})()
