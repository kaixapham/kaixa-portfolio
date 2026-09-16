/* =============================================================================
 * kaixa Portfolio — Burning open (màn mở đầu, đốt NGƯỢC)
 * -----------------------------------------------------------------------------
 * Vào trang là đã ở sẵn chế độ burning: hai đĩa và ảnh giữa đang là bộ ảnh
 * burning, lửa đang cháy. Rồi ngay trong lúc chữ chạy hiệu ứng (xáo kí tự, thanh
 * khối quét), màn đốt chạy NGƯỢC — đốt từ bộ ảnh burning về bộ ảnh mặc định —
 * và lửa lụi dần. Hết màn là trang đứng ở trạng thái mặc định, không còn lửa.
 *
 * CÁCH LÀM: không cần shader mới. `kx-burn-image.js` vốn đốt từ ảnh ĐANG HIỆN
 * sang ảnh khai trong `newDiscLeft` / `newDiscRight` / `newPoster`. Nên file này
 * chỉ cần đảo hai đầu lại:
 *
 *   1. cất đường dẫn bộ ảnh MẶC ĐỊNH mà kx-hello-mate.js vừa dựng ra
 *   2. đặt bộ ảnh BURNING lên trang ngay (đã nạp sẵn trước, không chớp khung trống)
 *   3. trỏ ba ô "ảnh mới" về bộ MẶC ĐỊNH rồi cho đốt
 *   4. xong thì trả ba ô đó về bộ burning, để bấm nút BURNING MODE sau này vẫn
 *      chạy xuôi như thường
 *
 * Bước 4 phải kèm `KX_BURN_IMAGE.forget()`: sau màn mở đầu thì "ảnh gốc" của
 * trang là bộ MẶC ĐỊNH, không thì bấm nút rồi tắt lại sẽ nhảy về bộ burning.
 *
 * CHƯA KHAI ẢNH BURNING THÌ KHÔNG CÓ MÀN MỞ ĐẦU. Không có bộ ảnh thứ hai thì
 * chẳng có gì để đốt ngược về — file tự đứng im, trang mở ra như bình thường.
 *
 * CÁCH DÙNG: nạp SAU kx-burning-mode.js. Chỉnh bằng CONFIG ngay bên dưới. File
 * này KHÔNG chứa UI setting — bảng tinh chỉnh ở kx-devtools.js (tab
 * "Burning Open").
 * ========================================================================== */
(() => {
  'use strict'

  // CONFIG để phẳng cho khớp bảng tinh chỉnh (kx-devtools.js đọc config[key]).
  const CONFIG = {
    enabled: true, // vào trang là chạy màn mở đầu

    // ------------------------------------------------------------ nhịp chạy
    delay: 0.35, // giây — để chữ kịp vào hiệu ứng rồi mới châm đốt
    fireOut: 0.9, // giây — lửa lụi dần ở cuối
    fireOutLead: 0.4, // giây — bắt đầu lụi TRƯỚC khi đốt xong bấy nhiêu

    // --------------------------------------------------------- ảnh có đổi không
    // false = CHỈ QUỆT QUA. Hai đầu của màn đốt là CÙNG một ảnh nên mặt đĩa và
    //         ảnh giữa luôn là bộ MẶC ĐỊNH; chỉ có vệt than và đường lửa chạy
    //         ngang qua rồi thôi.
    // true  = đốt ngược thật: vào trang ở bộ ảnh burning rồi cháy về bộ mặc định.
    changeImage: false,

    // Bảng màu riêng của màn mở đầu. Nó ĐÈ lên `palette` của kx-burn-image.js
    // trong lúc chạy rồi trả lại nguyên trạng khi kết màn.
    palette: 'white', // 'white' = lửa trắng | 'fire' = cam đỏ | 'grey' = xám trắng

    // ------------------------------------------------- lửa nào cháy lúc mở đầu
    useEdge: false, // lửa liếm mép đĩa và mép ảnh
    usePage: false, // lớp lửa phủ mép dưới trang

    // ---------------------------------------------------------------- khác
    // Bảng tinh chỉnh áp giá trị đã lưu dần trong khoảng 2.4 giây đầu, nên ba ô
    // ảnh burning có thể chưa có mặt ngay lúc trang vừa dựng. Đây là hạn chờ.
    wait: 3, // giây — chờ ảnh burning xuất hiện trong CONFIG
    preload: 4, // giây — hạn nạp bộ ảnh burning; quá thì bỏ màn mở đầu
  }

  const S = CONFIG

  // Ba vật, và tên ô CONFIG chứa ảnh burning của từng vật trong kx-burn-image.js
  const VAT = [
    ['img.hm-disc--l', 'newDiscLeft'],
    ['img.hm-disc--r', 'newDiscRight'],
    ['img.hm-poster', 'newPoster'],
  ]

  let daChay = false
  let dangChay = false
  let truoc = {} // giá trị của kx-burn-image.js trước khi màn mở đầu đè lên
  const hen = []
  const sau = (fn, giay) => hen.push(setTimeout(fn, Math.max(0, giay) * 1000))

  const cfg = (ten) => (window[ten] && window[ten].config) || null

  /* --------------------------------------------------------------- gom việc */

  function gomViec() {
    const burn = cfg('KX_BURN_IMAGE')
    if (!burn) return null
    const viec = []
    VAT.forEach(([sel, khoa]) => {
      const img = document.querySelector(sel)
      const macDinh = img && img.getAttribute('src')
      if (!img || !macDinh) return
      if (S.changeImage) {
        // Bỏ qua vật nào chưa khai ảnh burning, hoặc đã đứng sẵn ở ảnh đó.
        const lua = burn.swap ? burn[khoa] : ''
        if (!lua || lua === macDinh) return
        viec.push({ img, khoa, macDinh, lua, doi: true })
      } else {
        // Chỉ quệt qua: hai đầu là CÙNG một ảnh nên ảnh không hề đổi.
        viec.push({ img, khoa, macDinh, lua: macDinh, doi: false })
      }
    })
    return viec.length ? viec : null
  }

  // Nạp trước bộ ảnh burning. KHÔNG đặt lên trang trước khi nạp xong: thẻ <img>
  // đang chờ tải sẽ hiện ra trống, mà đây đúng là khung hình đầu tiên người xem
  // nhìn thấy.
  function napTruoc(viec, xong) {
    let con = viec.length
    let da = false
    const mot = () => {
      if (da) return
      if (--con <= 0) {
        da = true
        xong(true)
      }
    }
    const qua = setTimeout(() => {
      if (da) return
      da = true
      console.warn('[burning-open] nạp ảnh burning quá lâu, bỏ màn mở đầu')
      xong(false)
    }, Math.max(0.2, S.preload) * 1000)
    hen.push(qua)
    viec.forEach((v) => {
      const im = new Image()
      im.onload = mot
      im.onerror = mot
      im.src = v.lua
    })
  }

  /* ------------------------------------------------------------------ chạy */

  function chay(viec) {
    const burnApi = window.KX_BURN_IMAGE
    const burn = cfg('KX_BURN_IMAGE')
    const edge = cfg('KX_FIRE_EDGE')
    const page = cfg('KX_BLAZE')
    const nut = window.KX_BURNING_MODE
    dangChay = true

    // Cất lại mọi thứ sẽ bị đè, để kết màn trả về nguyên trạng.
    truoc = { palette: burn.palette, swap: burn.swap }
    viec.forEach((v) => (truoc[v.khoa] = burn[v.khoa]))

    // 1. Bộ ảnh burning lên trang ngay, trước khung hình đầu tiên. Chỉ làm khi
    //    màn mở đầu thật sự đổi ảnh — kiểu "quệt qua" thì ảnh giữ nguyên.
    const coDoi = viec.some((v) => v.doi)
    if (coDoi) {
      viec.forEach((v) => v.doi && (v.img.src = v.lua))
      // kx-disc-fx.js nạp texture mặt đĩa đúng một lần lúc ảnh load xong, nên
      // đổi src không thôi thì nó vẫn vẽ mặt đĩa cũ.
      const fx = window.KX_DISC_FX
      if (fx && fx.refreshTextures) sau(() => fx.refreshTextures(), 0)
    }

    // 2. Lửa. Hai ô này KHẲNG ĐỊNH trạng thái chứ không chỉ bật: bảng tinh chỉnh
    //    có thể đã lưu `enabled: true` của hai file lửa từ lần chỉnh trước và
    //    áp lại lúc mở trang, nên bỏ chọn ở đây mà chỉ "không bật" thì lửa vẫn
    //    hiện. Đây từng là lỗi thật.
    if (edge) {
      edge.startDelay = 0
      edge.enabled = !!S.useEdge
    }
    if (page) page.enabled = !!S.usePage
    if (nut && nut.showActive) nut.showActive(true)

    // 3. Đốt NGƯỢC: ba ô "ảnh mới" trỏ về bộ mặc định.
    sau(() => {
      // `swap` phải bật thì kx-burn-image.js mới đọc ba ô ảnh này.
      burn.swap = true
      burn.palette = S.palette
      viec.forEach((v) => (burn[v.khoa] = v.macDinh))
      burn.enabled = true
      burnApi.replay()

      // Màn đốt dài bao lâu thì tính đúng theo nhịp của kx-burn-image.js.
      const dai =
        Math.max(0, burn.delay) +
        Math.max(0, burn.stagger) * (viec.length - 1) +
        Math.max(0.05, burn.duration) +
        Math.max(0, burn.hold)

      // Lửa lụi TRƯỚC khi đốt xong một chút, để hai thứ kết thúc cùng lúc.
      sau(() => {
        if (edge) {
          edge.fadeOut = S.fireOut
          edge.enabled = false
        }
        if (page) luiBlaze(page, S.fireOut)
      }, Math.max(0, dai - S.fireOutLead))

      sau(() => ket(viec, burn, burnApi, nut), dai + 0.25)
    }, S.delay)
  }

  // kx-blaze.js không có nhịp tắt dần, nhưng nó đọc `opacity` ở MỖI KHUNG nên
  // hạ dần giá trị đó là lụi được. Trả lại giá trị cũ khi xong, không thì lần
  // sau bật lửa phủ trang sẽ ra mờ tịt.
  let blazeRaf = 0
  function luiBlaze(page, giay) {
    const goc = page.opacity
    const t0 = performance.now()
    cancelAnimationFrame(blazeRaf)
    const buoc = (now) => {
      const k = Math.min(1, (now - t0) / (Math.max(0.05, giay) * 1000))
      page.opacity = goc * (1 - k)
      if (k < 1) blazeRaf = requestAnimationFrame(buoc)
      else {
        page.enabled = false
        page.opacity = goc
        blazeRaf = 0
      }
    }
    blazeRaf = requestAnimationFrame(buoc)
  }

  function ket(viec, burn, burnApi, nut) {
    // Trả mọi thứ đã đè về đúng như trước màn mở đầu, để nút BURNING MODE sau
    // này chạy xuôi bình thường với bảng màu và bộ ảnh của người dùng.
    Object.keys(truoc).forEach((k) => (burn[k] = truoc[k]))
    // Và quên lượt đổi vừa rồi: từ giờ "ảnh gốc" của trang là bộ MẶC ĐỊNH.
    if (burnApi.forget) burnApi.forget()
    burn.enabled = false
    // Kết màn là TẮT HẲN, kể cả khi nãy giờ không bật cái nào.
    const edge = cfg('KX_FIRE_EDGE')
    const page = cfg('KX_BLAZE')
    if (edge) edge.enabled = false
    if (page) page.enabled = false
    if (nut && nut.showActive) nut.showActive(false)
    dangChay = false
  }

  /* ------------------------------------------------------------------- vào */

  function doi(con) {
    if (daChay || !S.enabled) return
    const viec = gomViec()
    if (viec) {
      daChay = true
      if (viec.some((v) => v.doi)) napTruoc(viec, (ok) => ok && chay(viec))
      else chay(viec)
      return
    }
    // Chưa thấy ảnh burning — bảng tinh chỉnh còn đang áp giá trị đã lưu.
    if (con > 0) hen.push(setTimeout(() => doi(con - 1), 80))
  }

  /* Màn mở đầu chỉ được chạy SAU khi màn loading tan. Chạy sớm hơn thì nó đốt
   * xong xuôi ở dưới lớp phủ mà chẳng ai thấy. `kx-loading.js` phát sự kiện
   * `kx-loading-done` lúc bắt đầu tan; không có file đó (hoặc màn loading đang
   * tắt) thì chạy ngay như cũ. */
  function boot() {
    const ld = window.KX_LOADING
    const batDau = () => doi(Math.round((Math.max(0, S.wait) * 1000) / 80))
    if (ld && ld.config.enabled && ld.dangHien && ld.dangHien()) {
      window.addEventListener('kx-loading-done', batDau, { once: true })
      return
    }
    batDau()
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true })
  else boot()

  // Chỉ để bảng tinh chỉnh (kx-devtools.js) đọc/ghi lúc chạy.
  window.KX_BURNING_OPEN = {
    config: S,
    defaults: Object.freeze({ ...CONFIG }),
    dangChay: () => dangChay,
    // Chạy lại màn mở đầu để xem thử, không cần tải lại trang.
    replay: () => {
      hen.forEach(clearTimeout)
      hen.length = 0
      daChay = false
      doi(Math.round((Math.max(0, S.wait) * 1000) / 80))
    },
  }
})()
