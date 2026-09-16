/* =============================================================================
 * kaixa Portfolio — Chữ xáo kí tự lúc trang vừa hiện (shuffle / scramble)
 * -----------------------------------------------------------------------------
 * Mọi cụm chữ Geist Mono (`.hm-mono`) chạy một lượt xáo kí tự khi trang mở:
 * từng kí tự nhảy loạn qua vài nhịp rồi đứng lại đúng chữ thật, kí tự sau trễ
 * hơn kí tự trước nên chữ "hiện dần" từ trái sang phải.
 *
 * KHÔNG ĐỘNG VÀO LAYOUT — đây là ràng buộc chính của trang này:
 *
 *   1. Không dựng lại DOM. Bản mẫu bọc mỗi kí tự vào một <span>; ở đây chỉ ghi
 *      thẳng `nodeValue` của các text node. Nhờ vậy giữ nguyên cấu trúc mà
 *      kx-hello-mate.js dựng ra (thẻ <i> bọc chữ số của cột chữ, các <br>…).
 *   2. Thay 1 kí tự bằng đúng 1 kí tự. Chữ Geist Mono đều bề ngang nên tổng
 *      chiều dài không đổi.
 *   3. KHOẢNG TRẮNG GIỮ NGUYÊN, không bao giờ xáo. Đây là chỗ dễ sai nhất: chữ
 *      trong cột bên phải có xuống dòng, mà xuống dòng lại phụ thuộc vị trí dấu
 *      cách. Giữ nguyên dấu cách thì độ dài từng từ không đổi, nên chỗ ngắt
 *      dòng y hệt lúc chưa chạy. Kí tự chưa tới lượt dùng NBSP (rộng bằng kí tự
 *      thường, và không bị `white-space: pre-line` nuốt mất như dấu cách).
 *
 * Nếu để layout xê dịch thì `measureFeed()` và ô tên bài chạy marquee của
 * kx-hello-mate.js sẽ đo nhầm ngay lúc đang xáo, và loop cột chữ sẽ hở.
 *
 * HIỆU NĂNG: mỗi nhịp chỉ ghi lại những text node ĐANG xáo. Node chưa tới lượt
 * ghi một lần rồi thôi; node xong xuôi trả về chuỗi gốc rồi không đụng nữa.
 *
 * CÁCH DÙNG: nạp SAU kx-hello-mate.js. Chỉnh bằng CONFIG ngay bên dưới. File
 * này KHÔNG chứa UI setting — bảng tinh chỉnh ở kx-devtools.js (tab "Xáo chữ").
 * ========================================================================== */
(() => {
  'use strict'

  // CONFIG để phẳng cho khớp bảng tinh chỉnh (kx-devtools.js đọc config[key]).
  const CONFIG = {
    enabled: true,

    // Cụm nào ăn hiệu ứng. `.hm-mono` là toàn bộ chữ Geist Mono của trang.
    // Chữ PP Editorial ("(Hello, Mate)", dòng mail) cố ý KHÔNG nằm trong này.
    targets: '.hm-mono',
    // Nhánh nào nằm trong đây thì bỏ qua. Mặc định loại khung PLAY/MUTE ra vì
    // nó đã ăn hiệu ứng thanh khối của kx-block-reveal.js — hai hiệu ứng chồng
    // lên cùng một chỗ chữ thì nhìn rối.
    skip: '.hm-p__ctrl',
    includeFeed: true, // cột chữ chạy loop bên phải — rất nhiều dòng, xem ghi chú

    // ------------------------------------------------------------ nhịp chạy
    startDelay: 80, // ms — chờ font nạp xong rồi mới chạy cho khỏi nháy
    frameMs: 30, // ms mỗi nhịp đổi kí tự
    scrambleFrames: 15, // mỗi kí tự nhảy bao nhiêu nhịp rồi đứng lại
    charStagger: 2, // nhịp trễ giữa hai kí tự liền nhau, TRONG một dòng

    // MỖI DÒNG LÀ MỘT HIỆU ỨNG RIÊNG, mặc định cùng vào cuộc một lúc, nên tổng
    // thời gian chỉ bằng thời gian của MỘT dòng chứ không phải cộng dồn cả trang.
    spread: 0, // ms — đặt > 0 nếu muốn rải dần các dòng từ trên xuống
    jitter: 90, // ms — xê dịch ngẫu nhiên mỗi dòng, cho khỏi đều tăm tắp
    // Trần cho phần trễ giữa các kí tự trong MỘT dòng. Dòng dài (như "TOBEY
    // (SPIDER MAN) MAGUIRE") nếu cứ 2 nhịp một kí tự thì riêng nó mất 2 giây;
    // chạm trần thì các kí tự tự khít lại để dòng nào cũng xong trong tầm nhau.
    lineCap: 18, // nhịp

    // ------------------------------------------------------------- kiểu chữ
    blank: true, // kí tự chưa tới lượt để trống; false = xáo ngay từ đầu
    symbols: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()',

    // ---------------------------------------------------------------- khác
    runOnce: true, // false = chạy lại mỗi lần gọi KX_SHUFFLE_TEXT.play()
    maxChars: 6000, // trần tổng số kí tự, chặn cho khỏi ôm quá nhiều
  }

  const S = CONFIG
  const NBSP = ' '

  /* ================================================================== gom chữ */

  // Một "mục" = một text node + chuỗi gốc của nó + mốc nhịp bắt đầu.
  let items = []
  let timer = 0
  let frame = 0
  let running = false
  let played = false

  function collect() {
    const out = []
    let total = 0

    const blocks = Array.from(document.querySelectorAll(S.targets))
    if (!blocks.length) return out

    // Xếp theo vị trí trên màn hình để chữ hiện dần từ trên xuống, chứ không
    // theo thứ tự DOM (thứ tự DOM của trang này không đi từ trên xuống).
    const feedEl = document.querySelector('.hm-feed')
    const ranked = blocks
      .filter((el) => {
        if (!S.includeFeed && feedEl && (el === feedEl || feedEl.contains(el) || el.contains(feedEl))) return false
        return true
      })
      .map((el) => ({ el, top: el.getBoundingClientRect().top }))
      .sort((a, b) => a.top - b.top)

    // Gom từng text node kèm vị trí của DÒNG chứa nó.
    for (let bi = 0; bi < ranked.length; bi++) {
      const walk = document.createTreeWalker(ranked[bi].el, NodeFilter.SHOW_TEXT)
      let n
      while ((n = walk.nextNode())) {
        const text = n.nodeValue
        if (!text || !text.trim()) continue // node chỉ có khoảng trắng thì bỏ qua
        if (S.skip && n.parentElement && n.parentElement.closest(S.skip)) continue
        if (total + text.length > S.maxChars) {
          bi = ranked.length // đủ trần thì dừng hẳn
          break
        }
        total += text.length
        const host = n.parentElement || ranked[bi].el
        out.push({ node: n, text, top: host.getBoundingClientRect().top, start: 0, state: '' })
      }
    }

    // Mỗi dòng là một hiệu ứng riêng: `spread` = 0 thì tất cả cùng vào cuộc,
    // nên tổng thời gian chỉ bằng thời gian của một dòng. `jitter` thêm chút
    // xê dịch ngẫu nhiên cho khỏi đều tăm tắp.
    out.sort((a, b) => a.top - b.top)
    const fm = Math.max(1, S.frameMs)
    const spreadFrames = Math.max(0, S.spread) / fm
    const jitterFrames = Math.max(0, S.jitter) / fm
    const lastRank = Math.max(1, out.length - 1)
    out.forEach((it, i) => {
      it.start = Math.round((i / lastRank) * spreadFrames + Math.random() * jitterFrames)
      // Trễ giữa các kí tự khít lại nếu dòng quá dài, để dòng dài dòng ngắn
      // xong trong tầm nhau thay vì dòng dài lê thê.
      const span = Math.max(1, it.text.length - 1)
      it.cs = Math.min(S.charStagger, Math.max(0, S.lineCap) / span)
    })
    return out
  }

  /* =================================================================== chạy */

  function pick() {
    return S.symbols.charAt((Math.random() * S.symbols.length) | 0) || '?'
  }

  // Dựng chuỗi cho một mục ở nhịp hiện tại. Khoảng trắng luôn giữ nguyên —
  // xem phần đầu file, đây là thứ giữ cho chỗ ngắt dòng không đổi.
  function render(it) {
    const src = it.text
    let s = ''
    for (let i = 0; i < src.length; i++) {
      const c = src[i]
      if (c === ' ' || c === '\n' || c === '\t' || c === '\r' || c === NBSP) {
        s += c
        continue
      }
      const st = it.start + i * it.cs
      if (frame < st) s += S.blank ? NBSP : pick()
      else if (frame < st + S.scrambleFrames) s += pick()
      else s += c
    }
    return s
  }

  function doneAt(it) {
    // nhịp mà kí tự cuối cùng của dòng này đứng lại
    return it.start + (it.text.length - 1) * it.cs + S.scrambleFrames
  }

  function tick() {
    let anyLeft = false

    for (let k = 0; k < items.length; k++) {
      const it = items[k]
      if (it.state === 'done') continue

      const end = doneAt(it)
      if (frame >= end) {
        // xong hẳn: trả lại đúng chuỗi gốc rồi không đụng vào nữa
        if (it.node.nodeValue !== it.text) it.node.nodeValue = it.text
        it.state = 'done'
        continue
      }

      anyLeft = true
      if (frame < it.start) {
        // chưa tới lượt: ghi một lần rồi thôi cho khỏi tốn
        if (it.state !== 'pending') {
          it.node.nodeValue = render(it)
          it.state = 'pending'
        }
        continue
      }
      it.node.nodeValue = render(it)
      it.state = 'run'
    }

    frame++
    if (anyLeft) {
      timer = setTimeout(tick, Math.max(8, S.frameMs))
    } else {
      running = false
      timer = 0
      played = true
      // Giục kx-hello-mate.js đo lại cột chữ và ô tên bài cho chắc — nó nghe
      // sự kiện resize để làm việc đó.
      window.dispatchEvent(new Event('resize'))
    }
  }

  function stop() {
    if (timer) clearTimeout(timer)
    timer = 0
    running = false
    items.forEach((it) => {
      if (it.node.isConnected && it.node.nodeValue !== it.text) it.node.nodeValue = it.text
    })
  }

  function play() {
    if (!S.enabled) return
    stop()
    items = collect()
    if (!items.length) return
    frame = 0
    running = true
    tick()
  }

  /* ================================================================== khởi động */

  function boot() {
    if (!S.enabled) return
    // Chờ font xong rồi mới chạy: chữ Geist Mono đều bề ngang, còn font dự phòng
    // thì không, chạy sớm sẽ thấy chữ giật một nhịp lúc font vào.
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
  window.KX_SHUFFLE_TEXT = {
    config: S,
    defaults: Object.freeze({ ...CONFIG }),
    play,
    stop,
    get running() {
      return running
    },
  }
})()
