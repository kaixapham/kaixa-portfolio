/* =============================================================================
 * kaixa Portfolio — Tiếng giao diện + nút bật/tắt sound (bốn trang Figma)
 * -----------------------------------------------------------------------------
 * Ô vuông thứ hai của thanh nav góc dưới trái (vốn là ô thư) thành nút SOUND:
 * icon loa có sóng = đang bật, loa có dấu x = đang tắt. Bật/tắt nhớ trong
 * localStorage nên sang trang khác vẫn giữ.
 *
 * Rê chuột vào một cụm dự án (`hover`) thì phát một tiếng DROID SWEEP — và
 * chuỗi tiếng có NHẠC TÍNH (người dùng chốt): mỗi dự án là một nốt của thang
 * ngũ cung (`scale`, nửa cung tính từ nốt gốc của preset), cụm thứ i bên trái
 * và bên phải cùng một nốt. Lướt xuống danh sách = giai điệu đi lên, lướt lên
 * = đi xuống; ngũ cung nên hai nốt bất kỳ đứng cạnh nhau vẫn thuận tai.
 * Nhạc cụ là MỘT bản tiếng ngắn tạo bằng Magnific (sfx), đổi nốt bằng
 * `playbackRate`. Đừng thêm lệch cao độ ngẫu nhiên: nó làm lạc điệu.
 *
 * PRESET = chọn nhạc cụ (`preset`). Mỗi preset ba khoá phẳng cùng tiền tố:
 * `<tên>Src` (file), `<tên>Hz` (cao độ ĐO ĐƯỢC của file), `<tên>Root` (nốt
 * của dự án đầu tiên — đặt gần cao độ tự nhiên để tiếng ít bị méo). Mọi núm
 * khác (thang, trầm bổng, ngân, sáng, vang) áp chung lên preset đang chọn.
 * Người dùng chốt HƯỚNG "DROID SWEEP" (tiếng quét synth + tiếng chíp droid,
 * theo tinh thần một ref sfx sci-fi họ gửi — tiếng do Magnific tạo mới), bỏ hết
 * các preset kiểu khác (bấm phím, alien, sci-fi, war machine, futuristic,
 * warp, robot). Sáu preset, đều là tiếng QUÉT nên không thuần một cao độ: Hz
 * là cao độ nổi trội của khung to nhất, giai điệu vẫn đúng TƯƠNG ĐỐI.
 *   droid — quét dâng, kết bằng tiếng chíp (~1130 Hz, gốc C6) — bản gốc chốt
 *   down  — quét đi xuống, chíp mềm (~650 Hz, gốc D5)
 *   glass — quét kính dâng lên, chíp đôi (~850 Hz, gốc G5)
 *   scan  — quét số có hạt bit-crush, kết bằng blip (~610 Hz, gốc D5)
 *   ping  — luồng gió dâng thành tiếng ping kim loại (~1400 Hz, gốc E6)
 *   warm  — servo quét lên thành chíp tròn ấm (~2590 Hz, gốc E6)
 * Hai preset thêm theo yêu cầu (ngoài hướng droid):
 *   switch — tiếng gạt công tắc, click gọn ~20 ms
 *   flip   — tiếng lật một tấm ảnh in (giấy phẩy + tách nhẹ)
 * Hai tiếng này là tiếng NHIỄU, không có cao độ: đặt Hz = Root để dự án đầu
 * phát đúng tốc độ gốc; các dự án sau vẫn cao dần theo thang.
 *
 * Bấm BẬT sound thì phát chuỗi "kích hoạt": ba tiếng bíp nhập mã + một tiếng
 * Enter (`henshinNotes`, bằng CHÍNH nhạc cụ bíp ở trên nên cùng chất tiếng,
 * cùng thang), rồi tiếng khoá cơ khí sập lại + luồng điện dâng
 * (`henshinSrc` — cắt ghép từ một bản Magnific, bỏ khoảng lặng ở giữa).
 * Tiếng tự tạo, không trích âm thanh gốc nào, không có giọng nói.
 *
 * Trình duyệt chỉ cho phát tiếng SAU một cú bấm / phím (rê chuột không tính).
 * Nên AudioContext dựng và mở khoá ở cú bấm đầu tiên bất kỳ trên trang; trước
 * đó rê vào dự án thì im — không có cách nào khác.
 *
 * Bắt rê bằng `pointerover` ủy quyền trên document: không phụ thuộc file hiệu
 * ứng nào, thêm chỗ có tiếng chỉ cần thêm selector vào `hover`.
 * File KHÔNG chứa UI setting.
 * ========================================================================== */
(function () {
  'use strict'

  var CONFIG = {
    enabled: true,
    nut: '1:476', // ô vuông thứ hai của thanh nav (vốn là ô thư)
    icon: '1:479', // khung icon trong ô đó
    // Chỗ có tiếng khi rê vào: mỗi cụm dự án của Feature Works ©12 (Home).
    // Nốt = thứ tự của cụm trong khối cha.
    hover: '[data-n="1:205"] > div, [data-n="1:217"] > div',
    preset: 'switch', // droid | down | glass | scan | ping | warm | switch | flip
    // Đường dẫn TƯƠNG ĐỐI (luật số 5). Hz = cao độ đo được, Root = nốt gốc.
    droidSrc: 'assets/sound/droid.mp3',
    droidHz: 1130,
    droidRoot: 1046.5, // C6
    downSrc: 'assets/sound/droid-down.mp3',
    downHz: 650,
    downRoot: 587.33, // D5
    glassSrc: 'assets/sound/droid-glass.mp3',
    glassHz: 850,
    glassRoot: 783.99, // G5
    scanSrc: 'assets/sound/droid-scan.mp3',
    scanHz: 610,
    scanRoot: 587.33, // D5
    pingSrc: 'assets/sound/droid-ping.mp3',
    pingHz: 1400,
    pingRoot: 1318.5, // E6
    warmSrc: 'assets/sound/droid-warm.mp3',
    warmHz: 2590,
    warmRoot: 1318.5, // E6
    switchSrc: 'assets/sound/switch.mp3',
    switchHz: 1000, // không có cao độ — Hz = Root
    switchRoot: 1000,
    flipSrc: 'assets/sound/flip.mp3',
    flipHz: 1000, // không có cao độ — Hz = Root
    flipRoot: 1000,
    transpose: 12, // nửa cung — độ TRẦM BỔNG của cả chuỗi (-12 = xuống một quãng tám)
    scale: '0,2,4,7,9', // ngũ cung trưởng, nửa cung — hết thang thì lên quãng tám
    noteStep: 1, // mỗi dự án nhảy bao nhiêu bậc của thang (2 = cách một nốt)
    descend: false, // true = lướt xuống danh sách thì giai điệu đi XUỐNG
    volume: 0.37, // 0..1
    decayMs: 600, // độ ngân: tắt dần trong chừng này ms (0 = để bản tiếng ngân hết)
    brightness: 12000, // Hz — bộ lọc thông thấp; hạ xuống là tiếng tròn, ấm hơn
    echo: 0, // 0..1 — độ vang (tiếng dội lặp lại)
    echoMs: 180, // khoảng cách giữa hai tiếng dội
    echoFeedback: 0.35, // 0..0.9 — mỗi tiếng dội còn lại bao nhiêu
    minGapMs: 45, // hai tiếng cách nhau ít nhất — lướt rất nhanh khỏi rè
    henshin: true, // bấm BẬT sound thì phát chuỗi kích hoạt
    henshinNotes: '6,0,2,5', // bậc của thang — ba phím mã + Enter; trống = bỏ phần bíp
    henshinGapMs: 120, // nhịp giữa các phím
    henshinSrc: 'assets/sound/henshin.mp3', // sau tiếng Enter; trống = chỉ có phần bíp
    henshinVolume: 0.45,
    macDinhBat: true, // lần đầu vào site (chưa từng bấm nút)
  }

  var S = CONFIG
  var LUU = 'kx-sound:bat'
  var api = (window.KX_SOUND = { config: S, defaults: Object.freeze(Object.assign({}, CONFIG)) })

  var bat = S.macDinhBat
  try {
    var v = localStorage.getItem(LUU)
    if (v === '0' || v === '1') bat = v === '1'
  } catch (e) {}

  var ctx = null
  var gain = null // tổng → bộ lọc → loa (+ nhánh vang)
  var loc = null
  var tre = null
  var hoi = null
  var uot = null
  var tho = {} // theo đường dẫn: ArrayBuffer tải sẵn, giải mã khi đã có AudioContext
  var buf = {} // theo đường dẫn: AudioBuffer đã giải mã
  var dangTai = {}

  // Nhạc cụ của preset đang chọn; tên lạ (vd. preset cũ còn nhớ trong bảng)
  // thì về droid.
  function nhacCu() {
    var p = S[S.preset + 'Src'] ? S.preset : 'droid'
    return { src: S[p + 'Src'], hz: S[p + 'Hz'] || 1, goc: S[p + 'Root'] || 1 }
  }
  function bufNot() {
    return buf[nhacCu().src]
  }
  // Những file cần lúc này: nhạc cụ đang chọn + đuôi chuỗi kích hoạt.
  function canTai() {
    return [nhacCu().src, S.henshinSrc].filter(Boolean)
  }
  var lanTruoc = 0
  var daBoot = false
  var thang = [0]

  function docThang() {
    thang = String(S.scale).split(',').map(Number).filter(function (n) { return !isNaN(n) })
    if (!thang.length) thang = [0]
  }

  // Tải file lúc rảnh sau `load` — không chặn trang, chưa cần AudioContext.
  // Đổi preset thì apDung() gọi lại — chỉ tải file chưa có.
  function taiTruoc() {
    canTai().forEach(function (u) {
      if (dangTai[u]) return
      dangTai[u] = true
      fetch(u)
        .then(function (r) { return r.ok ? r.arrayBuffer() : null })
        .then(function (a) {
          if (!a) return
          tho[u] = a
          if (ctx) giaiMa(u)
        })
        .catch(function () { dangTai[u] = false })
    })
  }

  function giaiMa(u) {
    var a = tho[u]
    if (!a || buf[u]) return
    tho[u] = null // decodeAudioData chiếm luôn ArrayBuffer
    ctx.decodeAudioData(a, function (b) { buf[u] = b }, function () {})
  }

  function moKhoa() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext
      if (!AC) return
      ctx = new AC()
      gain = ctx.createGain()
      loc = ctx.createBiquadFilter()
      loc.type = 'lowpass'
      tre = ctx.createDelay(2)
      hoi = ctx.createGain()
      uot = ctx.createGain()
      gain.connect(loc)
      loc.connect(ctx.destination)
      loc.connect(tre)
      tre.connect(hoi)
      hoi.connect(tre) // vòng dội
      tre.connect(uot)
      uot.connect(ctx.destination)
      apDung()
      Object.keys(tho).forEach(giaiMa)
    }
    if (ctx.state === 'suspended') ctx.resume()
  }

  // Mỗi tiếng một nút gain riêng: nốt hover chen vào giữa tiếng kích hoạt
  // không được đổi âm lượng của tiếng đang vang.
  function choi(b, rate, vol, luc, tatDan) {
    var g = ctx.createGain()
    var t0 = Math.max(luc || 0, ctx.currentTime)
    g.gain.setValueAtTime(vol, t0)
    if (tatDan && S.decayMs > 0) {
      g.gain.setValueAtTime(vol, t0 + 0.005)
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + Math.max(0.01, S.decayMs / 1000))
    }
    g.connect(gain)
    var src = ctx.createBufferSource()
    src.buffer = b
    src.playbackRate.value = rate
    src.connect(g)
    src.start(luc || 0)
  }

  // Phát nốt thứ `bac` của thang (0 = nốt gốc của preset); vượt thang thì lên quãng tám.
  function phat(bac) {
    if (!bat || !ctx || ctx.state !== 'running' || !bufNot()) return
    var now = performance.now()
    if (now - lanTruoc < S.minGapMs) return
    lanTruoc = now
    choi(bufNot(), tiLe(bac), S.volume, 0, true)
  }

  // playbackRate cho bậc `bac` của thang, đã tính độ trầm bổng.
  function tiLe(bac) {
    var nc = nhacCu()
    return (nc.goc / nc.hz) * Math.pow(2, (nuaCung(bac) + S.transpose) / 12)
  }

  function nuaCung(bac) {
    bac = Math.max(0, bac | 0)
    return thang[bac % thang.length] + 12 * Math.floor(bac / thang.length)
  }

  // Lên lịch bằng đồng hồ của AudioContext (chính xác tới mẫu), không dùng
  // setTimeout — nhịp bấm phím phải đều.
  function phatHenshin() {
    if (!S.henshin || !ctx || ctx.state !== 'running') return
    var t = ctx.currentTime + 0.02
    var nhip = S.henshinGapMs / 1000
    var not = String(S.henshinNotes || '').split(',').filter(function (x) { return x.trim() !== '' })
    if (bufNot()) {
      not.forEach(function (b, i) {
        // phím Enter (cuối) nghỉ thêm nửa nhịp
        var luc = t + i * nhip + (i === not.length - 1 ? nhip * 0.5 : 0)
        choi(bufNot(), tiLe(+b), S.volume, luc, true)
      })
    }
    if (buf[S.henshinSrc]) choi(buf[S.henshinSrc], 1, S.henshinVolume, t + (not.length ? (not.length + 0.5) * nhip : 0))
  }

  // Áp các khoá không tự ăn mỗi lần phát (thang, bộ lọc, vang).
  function apDung() {
    docThang()
    if (daBoot) taiTruoc() // đổi preset: tải nhạc cụ mới (file đã có thì bỏ qua)
    if (!ctx) return
    var t = ctx.currentTime
    loc.frequency.setTargetAtTime(Math.max(200, S.brightness), t, 0.02)
    tre.delayTime.setTargetAtTime(Math.max(0.02, S.echoMs / 1000), t, 0.02)
    hoi.gain.setTargetAtTime(Math.min(0.9, Math.max(0, S.echoFeedback)), t, 0.02)
    uot.gain.setTargetAtTime(Math.min(1, Math.max(0, S.echo)), t, 0.02)
  }

  // Nghe thử: chạy một lượt 10 dự án từ trên xuống như đang lướt chuột.
  function ngheThu() {
    moKhoa()
    if (!ctx || ctx.state !== 'running' || !bufNot()) return
    var t = ctx.currentTime + 0.03
    var step = Math.max(1, S.noteStep | 0)
    for (var i = 0; i < 10; i++) {
      var bac = (S.descend ? 9 - i : i) * step
      choi(bufNot(), tiLe(bac), S.volume, t + i * 0.11, true)
    }
  }

  /* ---------------------------------------------------------------- icon
   * Nét 1px trắng, đầu tròn — cùng kiểu với bộ icon của thanh nav. */
  var LOA = '<path d="M3.5 9.5H7l4.5-3.75v12.5L7 14.5H3.5z" stroke-linejoin="round"/>'
  var SONG = '<path d="M14.75 9.25a3.75 3.75 0 0 1 0 5.5"/><path d="M17.5 6.75a7.25 7.25 0 0 1 0 10.5"/>'
  var TAT = '<path d="M15.5 9.75l4.5 4.5M20 9.75l-4.5 4.5"/>'
  function svg(on) {
    return '<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="#fff" stroke-linecap="round" aria-hidden="true" style="display:block;overflow:visible">' +
      LOA + (on ? SONG : TAT) + '</svg>'
  }

  var nut = null
  var icon = null
  function veNut() {
    if (icon) icon.innerHTML = svg(bat)
    if (nut) {
      nut.setAttribute('aria-pressed', String(bat))
      nut.setAttribute('aria-label', bat ? 'Tắt tiếng' : 'Bật tiếng')
    }
  }

  function datBat(on) {
    bat = !!on
    try { localStorage.setItem(LUU, bat ? '1' : '0') } catch (e) {}
    veNut()
    if (bat) {
      moKhoa()
      // Tiếng kích hoạt để biết đã bật. Lần bấm đầu AudioContext vừa dựng nên
      // file chưa giải mã xong — đợi một nhịp.
      setTimeout(phatHenshin, buf[S.henshinSrc] ? 0 : 200)
    }
  }

  function boot() {
    if (!S.enabled) return
    docThang()
    nut = document.querySelector('[data-n="' + S.nut + '"]')
    icon = document.querySelector('[data-n="' + S.icon + '"]')
    if (nut) {
      nut.setAttribute('role', 'button')
      nut.setAttribute('tabindex', '0')
      nut.style.cursor = 'pointer'
      nut.addEventListener('click', function () { datBat(!bat) })
      nut.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); datBat(!bat) }
      })
    }
    veNut()

    // Cú bấm / phím đầu tiên bất kỳ: mở khoá AudioContext (rê chuột không đủ).
    function moLanDau() {
      moKhoa()
      if (ctx && ctx.state !== 'suspended') {
        ;['pointerdown', 'keydown', 'touchend'].forEach(function (t) { window.removeEventListener(t, moLanDau, true) })
      }
    }
    ;['pointerdown', 'keydown', 'touchend'].forEach(function (t) { window.addEventListener(t, moLanDau, true) })

    // Rê vào cụm khác cụm vừa rồi thì phát. Đi ra khe giữa hai cụm là quên cụm cũ.
    var dangTren = null
    document.addEventListener('pointerover', function (e) {
      if (!S.hover) return
      var t = e.target && e.target.closest ? e.target.closest(S.hover) : null
      if (t === dangTren) return
      dangTren = t
      if (!t) return
      var i = Array.prototype.indexOf.call(t.parentElement.children, t)
      if (S.descend) i = t.parentElement.children.length - 1 - i
      phat(i * Math.max(1, S.noteStep | 0))
    })

    function batDauTai() {
      daBoot = true
      taiTruoc()
    }
    if (document.readyState === 'complete') setTimeout(batDauTai, 300)
    else window.addEventListener('load', function () { setTimeout(batDauTai, 300) }, { once: true })

    Object.assign(api, { phat: phat, apDung: apDung, rungThu: ngheThu, henshinThu: phatHenshin, bat: datBat, dangBat: function () { return bat } })
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true })
  else boot()
})()
