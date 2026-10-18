/* =============================================================================
 * kaixa Portfolio — Tiếng giao diện + nút bật/tắt sound (bốn trang Figma)
 * -----------------------------------------------------------------------------
 * Ô vuông thứ hai của thanh nav góc dưới trái (vốn là ô thư) thành nút SOUND:
 * icon loa có sóng = đang bật, loa có dấu x = đang tắt. Bật/tắt nhớ trong
 * localStorage nên sang trang khác vẫn giữ.
 *
 * Rê chuột vào một cụm dự án (`hover`) thì phát một tiếng BẤM PHÍM điện thoại
 * gập — và chuỗi tiếng có NHẠC TÍNH (người dùng chốt): mỗi dự án là một nốt
 * của thang ngũ cung (`scale`, nửa cung tính từ `rootHz`), cụm thứ i bên trái
 * và bên phải cùng một nốt. Lướt xuống danh sách = giai điệu đi lên, lướt lên
 * = đi xuống; ngũ cung nên hai nốt bất kỳ đứng cạnh nhau vẫn thuận tai.
 * Nhạc cụ là MỘT bản tiếng bíp tạo bằng Magnific (sfx) — gần như thuần một cao
 * độ (đo ~1220 Hz, `noteHz`) — đổi nốt bằng `playbackRate`. Đừng thêm lệch cao
 * độ ngẫu nhiên: nó làm lạc điệu.
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
    // Đường dẫn TƯƠNG ĐỐI (luật số 5).
    noteSrc: 'assets/sound/phim.mp3',
    noteHz: 1220, // cao độ đo được của bản tiếng
    rootHz: 587.33, // nốt của dự án đầu tiên (D5)
    transpose: 0, // nửa cung — độ TRẦM BỔNG của cả chuỗi (-12 = xuống một quãng tám)
    scale: '0,2,4,7,9', // ngũ cung trưởng, nửa cung — hết thang thì lên quãng tám
    noteStep: 1, // mỗi dự án nhảy bao nhiêu bậc của thang (2 = cách một nốt)
    descend: false, // true = lướt xuống danh sách thì giai điệu đi XUỐNG
    volume: 0.35, // 0..1
    decayMs: 0, // độ ngân: tắt dần trong chừng này ms (0 = để bản tiếng ngân hết)
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
  var TEN = ['note', 'henshin']
  var tho = {} // ArrayBuffer tải sẵn, giải mã khi đã có AudioContext
  var buf = {}
  var lanTruoc = 0
  var thang = [0]

  function docThang() {
    thang = String(S.scale).split(',').map(Number).filter(function (n) { return !isNaN(n) })
    if (!thang.length) thang = [0]
  }

  // Tải file lúc rảnh sau `load` — không chặn trang, chưa cần AudioContext.
  function taiTruoc() {
    TEN.forEach(function (k) {
      var u = S[k + 'Src']
      if (!u) return
      fetch(u)
        .then(function (r) { return r.ok ? r.arrayBuffer() : null })
        .then(function (a) {
          if (!a) return
          tho[k] = a
          if (ctx) giaiMa(k)
        })
        .catch(function () {})
    })
  }

  function giaiMa(k) {
    var a = tho[k]
    if (!a || buf[k]) return
    tho[k] = null // decodeAudioData chiếm luôn ArrayBuffer
    ctx.decodeAudioData(a, function (b) { buf[k] = b }, function () {})
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
      TEN.forEach(giaiMa)
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

  // Phát nốt thứ `bac` của thang (0 = rootHz); vượt thang thì lên quãng tám.
  function phat(bac) {
    if (!bat || !ctx || ctx.state !== 'running' || !buf.note) return
    var now = performance.now()
    if (now - lanTruoc < S.minGapMs) return
    lanTruoc = now
    choi(buf.note, tiLe(bac), S.volume, 0, true)
  }

  // playbackRate cho bậc `bac` của thang, đã tính độ trầm bổng.
  function tiLe(bac) {
    return (S.rootHz / S.noteHz) * Math.pow(2, (nuaCung(bac) + S.transpose) / 12)
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
    if (buf.note) {
      not.forEach(function (b, i) {
        // phím Enter (cuối) nghỉ thêm nửa nhịp
        var luc = t + i * nhip + (i === not.length - 1 ? nhip * 0.5 : 0)
        choi(buf.note, tiLe(+b), S.volume, luc, true)
      })
    }
    if (buf.henshin) choi(buf.henshin, 1, S.henshinVolume, t + (not.length ? (not.length + 0.5) * nhip : 0))
  }

  // Áp các khoá không tự ăn mỗi lần phát (thang, bộ lọc, vang).
  function apDung() {
    docThang()
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
    if (!ctx || ctx.state !== 'running' || !buf.note) return
    var t = ctx.currentTime + 0.03
    var step = Math.max(1, S.noteStep | 0)
    for (var i = 0; i < 10; i++) {
      var bac = (S.descend ? 9 - i : i) * step
      choi(buf.note, tiLe(bac), S.volume, t + i * 0.11, true)
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
      setTimeout(phatHenshin, buf.henshin ? 0 : 200)
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

    if (document.readyState === 'complete') setTimeout(taiTruoc, 300)
    else window.addEventListener('load', function () { setTimeout(taiTruoc, 300) }, { once: true })

    Object.assign(api, { phat: phat, apDung: apDung, rungThu: ngheThu, henshinThu: phatHenshin, bat: datBat, dangBat: function () { return bat } })
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true })
  else boot()
})()
