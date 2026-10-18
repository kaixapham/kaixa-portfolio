/* =============================================================================
 * kaixa Portfolio — Chữ hiện ra sau thanh trắng, từng dòng (About)
 * -----------------------------------------------------------------------------
 * Người dùng: "mảng trắng ở trang about này là ý tưởng về effect text hiện
 * ra". Trong Figma, đoạn "Passionate about aesthetic…" (305:4884) có sáu hình
 * chữ nhật trắng (305:5140–5145) — một KHUNG HÌNH GIỮA CHỪNG của hiệu ứng: mỗi
 * dòng một thanh trắng neo ở đầu dòng, mép phải lùi dần qua trái theo bậc
 * (dòng dưới lộ nhiều hơn dòng trên). Sáu node đó bị giấu ở generator
 * (OVERRIDES); file này dựng thanh thật theo TỪNG DÒNG THẬT của chữ.
 *
 *   Pha 1 — thanh trắng MỌC TỪ TRÁI phủ kín dòng (chữ đang ẩn).
 *   Pha 2 — chữ hiện, thanh THU VỀ PHÍA PHẢI (mép trái chạy sang phải): chữ
 *   lộ ra từ trái sang (người dùng chốt "xuất hiện từ trái rồi thu về từ bên
 *   phải"; bản đầu rút thanh về đầu dòng — bị đổi).
 *   TRÊN NHANH DƯỚI CHẬM (người dùng chốt): dòng dưới kéo dài thêm `cham`
 *   mỗi dòng, cộng nhịp lệch nhỏ `tre` — khung hình Figma chính là pha 1:
 *   dòng trên dài, dòng dưới ngắn dần thành bậc thang.
 *
 * - Dòng đo bằng Range.getClientRects() trên text node (mỗi dòng một hộp),
 *   bỏ khoảng trắng đầu đoạn (dòng đầu thụt bằng dấu cách để chừa chỗ nhãn
 *   "( ①My Ikigai )") — nên đúng ở mọi cỡ màn, không bám toạ độ cứng của
 *   Figma. Đo lại khi đổi cỡ (chỉ khi chưa chạy / đã chạy xong).
 * - Chạy MỘT lần khi đoạn lọt `nguong` vào màn (IntersectionObserver).
 * - `prefers-reduced-motion` thì hiện chữ ngay, không thanh.
 * - Web Animations, không vòng rAF.
 * File KHÔNG chứa UI setting.
 * ========================================================================== */
(function () {
  'use strict'

  var CONFIG = {
    enabled: true,
    doan: '305:4884', // node Figma của đoạn chữ (cách nhau dấu phẩy)
    /* BA MÀU (người dùng chốt "dải shape chia ra 3 màu: trắng, xám, xám
     * đậm", hai cơ chế):
     *   'lop'  — LỚP NỐI ĐUÔI: mỗi dòng 3 thanh chồng nhau, mọc lần lượt
     *            mau1 → mau2 → mau3 (lệch `lechLop`); thu thì lớp trên cùng
     *            thu trước, lộ dần lớp dưới, cuối cùng mới lộ chữ.
     *   'dong' — XEN KẼ THEO DÒNG: mỗi dòng một thanh, màu đổi lần lượt
     *            mau1 / mau2 / mau3 theo dòng. */
    kieu: 'lop',
    mau1: '#ffffff', // trắng (màu của bản Figma)
    mau2: '#9a9a9a', // xám
    mau3: '#4d4d4d', // xám đậm
    lechLop: 110, // ms — lớp sau mọc / thu chậm hơn lớp trước bấy nhiêu
    dem: 2, // px — thanh lấn thêm ra ngoài hộp nét chữ mỗi phía
    lanTren: 2, // px — thanh được lấn lên trên đỉnh hộp đoạn văn tối đa bấy nhiêu
    vaoMs: 520, // pha 1: thanh mọc phủ dòng
    raMs: 680, // pha 2: thanh rút về đầu dòng
    nghiMs: 60, // nghỉ giữa hai pha
    tre: 40, // ms lệch nhịp giữa hai dòng liền nhau
    // TRÊN NHANH DƯỚI CHẬM (người dùng chốt): dòng thứ i (tính từ dòng chạy
    // trước) kéo dài thêm i × cham — cả pha mọc lẫn pha thu.
    cham: 0.22,
    tuDuoi: false, // true = dòng dưới đi trước
    nhip: 'cubic-bezier(0.77, 0, 0.18, 1)',
    nguong: 0.35, // phần đoạn chữ lọt vào màn thì chạy
    lap: false, // true = ra khỏi màn rồi vào lại thì chạy lại
  }

  var S = CONFIG
  var api = (window.KX_LINE_REVEAL = { config: S, defaults: Object.freeze(Object.assign({}, CONFIG)) })

  function boot() {
    if (!S.enabled) return
    var page = document.querySelector('.kx-page')
    if (!page) return
    var giam = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches

    var st = document.createElement('style')
    st.textContent = [
      '.kx-page .kx-lr{position:absolute;left:0;top:0;width:0;height:0;pointer-events:none;z-index:2}',
      '.kx-page .kx-lr__t{position:absolute;transform-origin:0 50%;transform:scaleX(0)}',
      '.kx-page .kx-lr__t.is-ra{transform-origin:100% 50%}',
      '.kx-page .kx-lr-an{opacity:0}',
    ].join('\n')
    document.head.appendChild(st)

    S.doan.split(',').forEach(function (id) {
      var p = page.querySelector('[data-n="' + id.trim() + '"]')
      if (p) mot(p)
    })

    function mot(p) {
      var lop = document.createElement('div')
      lop.className = 'kx-lr'
      lop.setAttribute('aria-hidden', 'true')
      page.appendChild(lop)
      var thanh = []
      var dangChay = false
      var daChay = false

      // Hộp từng dòng của chữ, toạ độ trong .kx-page.
      function doDong() {
        var tn = null
        var w = document.createTreeWalker(p, NodeFilter.SHOW_TEXT)
        for (var n = w.nextNode(); n; n = w.nextNode()) {
          if (n.nodeValue.trim()) {
            tn = n
            break
          }
        }
        if (!tn) return []
        var v = tn.nodeValue
        var dau = v.search(/\S/)
        var cuoi = v.length - (v.length - v.trimEnd().length)
        var r = document.createRange()
        r.setStart(tn, dau)
        r.setEnd(tn, cuoi)
        var pr = page.getBoundingClientRect()
        // Gộp các mảnh cùng một dòng (cùng tâm dọc) thành một hộp.
        var ds = []
        ;[].slice.call(r.getClientRects()).forEach(function (q) {
          if (q.width < 1) return
          var cy = q.top + q.height / 2
          var d = ds.length && Math.abs(ds[ds.length - 1].cy - cy) < q.height / 2 ? ds[ds.length - 1] : null
          if (d) {
            d.l = Math.min(d.l, q.left)
            d.r = Math.max(d.r, q.right)
            d.t = Math.min(d.t, q.top)
            d.b = Math.max(d.b, q.bottom)
          } else ds.push({ l: q.left, r: q.right, cy: cy, t: q.top, b: q.bottom })
        })
        /* Cao thanh = HỘP NÉT CHỮ (ascent + descent của font) chứ không phải
         * line-height: line-height 0.9 thấp hơn nét chữ, chân g / y / p thò ra
         * dưới thanh (người dùng: "shape phải che được cả chân các kí tự").
         * Hai dòng liền nhau chồng lên nhau một chút — đúng ý. */
        var dem = S.dem
        // KHÔNG vượt lên trên ĐỈNH hộp đoạn văn: phần ascent của font cao hơn
        // chữ hoa nhiều, thanh dòng đầu lấn lên và đè đường kẻ ngăn phía trên
        // (người dùng: "wave effect đang bị cắt vào đường line"). Hộp đoạn văn
        // đã được text-box-trim cắt đúng mép chữ hoa.
        var dinh = p.getBoundingClientRect().top - pr.top - S.lanTren
        return ds.map(function (d) {
          var y = Math.max(d.t - pr.top - dem, dinh)
          var day = d.b - pr.top + dem
          return { x: d.l - pr.left - dem, y: y, w: d.r - d.l + 2 * dem, h: day - y }
        })
      }

      // Mỗi dòng một MẢNG lớp: 'lop' = 3 thanh chồng (mau1 dưới cùng), 'dong'
      // = 1 thanh màu theo thứ tự dòng.
      function dung() {
        lop.textContent = ''
        var mau = [S.mau1, S.mau2, S.mau3]
        thanh = doDong().map(function (d, i) {
          var ds = S.kieu === 'lop' ? mau : [mau[i % 3]]
          return ds.map(function (m) {
            var t = document.createElement('div')
            t.className = 'kx-lr__t'
            t.style.cssText =
              'left:' + d.x + 'px;top:' + d.y + 'px;width:' + d.w + 'px;height:' + d.h + 'px;background:' + m
            lop.appendChild(t)
            return t
          })
        })
      }

      function chay() {
        if (dangChay) return
        dangChay = true
        dung()
        var n = thanh.length
        p.classList.add('kx-lr-an')
        var xong = 0
        // Thời lượng từng dòng: trên nhanh, dưới chậm.
        var dai = function (goc, thu) {
          return goc * (1 + S.cham * thu)
        }
        // Lớp j của một dòng lệch thêm j × lechLop ở cả hai pha.
        var soLop = n ? thanh[0].length : 0
        var lech = function (j) {
          return j * S.lechLop
        }
        // Lúc MỌI dòng, mọi lớp phủ xong — pha 2 chỉ bắt đầu sau mốc này.
        var tAll = 0
        for (var k = 0; k < n; k++) {
          tAll = Math.max(tAll, k * S.tre + lech(soLop - 1) + dai(S.vaoMs, k))
        }
        var tong = n * soLop
        var hien = false
        thanh.forEach(function (lops, i) {
          var thu = S.tuDuoi ? n - 1 - i : i
          var tre = thu * S.tre
          var d1 = dai(S.vaoMs, thu)
          lops.forEach(function (t, j) {
            var bd = tre + lech(j) // lúc lớp này bắt đầu mọc
            var a = t.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], {
              duration: d1,
              delay: bd,
              easing: S.nhip,
              fill: 'forwards',
            })
            a.onfinish = function () {
              t.classList.add('is-ra') // pha 2 neo mép PHẢI: thanh thu về bên phải
              // Pha 2: sau khi mọi thứ phủ xong + nghỉ + nhịp lệch của dòng;
              // lớp TRÊN CÙNG (j lớn) thu trước, lớp dưới cùng thu sau cùng.
              var bd2 = tAll + S.nghiMs + tre + lech(soLop - 1 - j)
              var b = t.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], {
                duration: dai(S.raMs, thu),
                delay: bd2 - (bd + d1),
                easing: S.nhip,
                fill: 'forwards',
              })
              b.onfinish = function () {
                if (++xong === tong) {
                  dangChay = false
                  daChay = true
                }
              }
            }
          })
        })
        // Chữ hiện đúng lúc mọi dòng đã bị che kín (trước khi lớp nào thu).
        setTimeout(function () {
          if (!hien) {
            hien = true
            p.classList.remove('kx-lr-an')
          }
        }, tAll + 16)
        if (!n) {
          p.classList.remove('kx-lr-an')
          dangChay = false
          daChay = true
        }
      }

      function tatHet() {
        lop.textContent = ''
        thanh = []
        p.classList.remove('kx-lr-an')
      }

      if (giam) return
      // Chưa chạy thì giấu chữ, để thanh mọc lên trên chỗ trống.
      p.classList.add('kx-lr-an')
      var io = new IntersectionObserver(
        function (rows) {
          var r = rows[0]
          if (r.isIntersecting && r.intersectionRatio >= S.nguong) {
            if (!daChay) chay()
          } else if (!r.isIntersecting && S.lap && daChay && !dangChay) {
            daChay = false
            tatHet()
            p.classList.add('kx-lr-an')
          }
        },
        { threshold: [0, S.nguong] }
      )
      io.observe(p)
      addEventListener('resize', function () {
        if (!dangChay && daChay) tatHet()
      })
      api.rungThu = function () {
        api.chayLai()
      }
      api.chayLai = function () {
        tatHet()
        daChay = false
        dangChay = false
        chay()
      }
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true })
  else boot()
  api.apDung = function () {}
})()
