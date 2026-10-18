/* =============================================================================
 * kaixa Portfolio — Rê vào TỪNG DÒNG chữ mono: thanh sáng + gõ lại + con trỏ
 * (bốn trang Figma)
 * -----------------------------------------------------------------------------
 * Người dùng: "hover text effect chỗ này làm theo trang này" (một trang tham
 * khảo có danh sách bài hát: rê vào dòng nào thì dòng đó GÕ LẠI và hiện một ô
 * con trỏ khối sau chữ), rồi chốt thêm "tính theo DÒNG, không theo cụm, có 1
 * chút giống chỗ hover project ở hero Home" (Feature Works — thanh sáng sau
 * chữ, rời ra thì thụt về thành sóng).
 *
 *   Rê vào dòng: thanh `#ebebeb` mọc từ trái sau chữ (0.3 s), chữ chuyển màu
 *   nền, dòng gõ lại từ trái sang (mép gõ là kí tự NGẪU NHIÊN, phía sau chốt
 *   dần thành chữ thật) + ô con trỏ khối ở cuối dòng.
 *   Rời dòng: thanh ÉP ĐẦY rồi thụt về chậm (1 s) — lướt chuột qua nhiều dòng
 *   ra vệt sóng, đúng cơ chế của kx-feature-hover.js.
 *
 * - DÒNG = dòng HIỂN THỊ, không phải <p>: đoạn văn dài ngắt nhiều dòng. Sau khi
 *   font nạp xong, mỗi <p> được tách thành các <span> theo đúng chỗ trình duyệt
 *   đang ngắt dòng (đo vị trí từng từ bằng Range), mỗi span một dòng,
 *   `white-space: pre` cho khỏi ngắt lại. Đổi bề rộng cửa sổ thì dựng lại từ
 *   chữ gốc.
 * - Gõ lại chỉ ghi `nodeValue`, 1 kí tự thay đúng 1 kí tự, khoảng trắng giữ
 *   nguyên, chỗ chưa gõ là NBSP — Geist Mono đều bề ngang nên dòng không đổi
 *   bề rộng, không xô bố cục.
 * - Ô con trỏ (`::after`) và thanh sáng (`::before`) không chiếm chỗ trên dòng.
 * - Chỉ có setInterval trong lúc gõ; không vòng nào sống thường trực.
 * - Giảm chuyển động: chỉ có thanh sáng, không gõ lại.
 * File KHÔNG chứa UI setting.
 * ========================================================================== */
(function () {
  'use strict'

  var CONFIG = {
    enabled: true,
    /* Đoạn nào ăn hiệu ứng. Người dùng chốt: "mọi text body cùng style áp
     * dụng text hover" — TỰ TÌM mọi <p> chữ thuần trong .kx-page có đúng kiểu
     * chữ body: font `font`, viết hoa, cỡ coMin..coMax px THIẾT KẾ. Cộng thêm
     * mọi <p> khớp `chon` (cột mono đầu trang About có sẵn từ trước). */
    tuDong: true,
    chon: '[data-n="305:4909"] p',
    font: 'Geist Mono',
    coMin: 12,
    coMax: 16,
    /* Loại: chữ do script khác ghi lại lúc chạy (thanh nav 1:463, cụm thông
     * tin của dải "02." 1:336 — tách dòng là chúng ghi vào text node đã rời
     * trang), danh sách Feature Works có hover riêng, link / nút. */
    bo: '[data-n="1:463"],[data-n="1:336"],[data-n="1:205"],[data-n="1:217"],.kx-ls,a,button',
    boChu: 'EMAIL ME||EXPLORE||LIVE SITE', // chữ nút — đã có hiệu ứng xáo của kx-pixel-hover.js
    nhipMs: 45, // ms mỗi nhịp gõ
    buoc: 1, // mép GÕ tiến bao nhiêu kí tự mỗi nhịp (tối thiểu)
    maxMs: 700, // trần thời gian gõ một dòng — dòng dài tự gõ nhiều kí tự mỗi nhịp
    tre: 3, // mép CHỐT đi sau mép gõ bấy nhiêu nhịp (vùng kí tự ngẫu nhiên)
    kiTu: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!#$%&*(){}[]<>/\\|~^.,:;-_+=?',
    // ---------------------------------------- thanh sáng (như Feature Works)
    thanh: true,
    mauThanh: '#ebebeb',
    mauChu: '#040203', // màu chữ khi thanh phủ (nền trang)
    vaoMs: 300,
    raMs: 1000,
    // ------------------------------------------------------- ô con trỏ khối
    conTro: true,
    mauConTro: '#040203', // nằm TRÊN thanh sáng nên mặc định màu nền
  }

  var S = CONFIG
  var api = (window.KX_TYPE_HOVER = { config: S, defaults: Object.freeze(Object.assign({}, CONFIG)) })
  var NBSP = ' '

  function boot() {
    if (!S.enabled) return
    var giam = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches

    var st = document.createElement('style')
    function css() {
      st.textContent = [
        '.kx-th-d{display:block;width:fit-content;position:relative;isolation:isolate;white-space:pre;',
        '  transition:color ' + S.raMs + 'ms cubic-bezier(.61,1,.88,1)}',
        // thanh sáng: lấn sang phải đúng chỗ ô con trỏ (0.75em), nhô nhẹ trên/dưới
        '.kx-th-d::before{content:"";position:absolute;inset:-.06em -.75em -.1em 0;z-index:-1;pointer-events:none;',
        '  background:var(--kx-th-thanh,#ebebeb);transform:scaleX(0);transform-origin:left center;',
        '  transition:transform ' + S.raMs + 'ms cubic-bezier(.61,1,.88,1)}',
        '.kx-th-d.co-thanh.is-on,.kx-th-d.co-thanh.is-day{color:var(--kx-th-chu,#040203)}',
        '.kx-th-d.co-thanh.is-on::before,.kx-th-d.co-thanh.is-day::before{transform:scaleX(1)}',
        '.kx-th-d.is-on{transition:color ' + S.vaoMs + 'ms cubic-bezier(.25,.46,.45,.94)}',
        '.kx-th-d.is-on::before{transition:transform ' + S.vaoMs + 'ms cubic-bezier(.25,.46,.45,.94)}',
        '.kx-th-d.is-day,.kx-th-d.is-day::before{transition:none}',
        // ô con trỏ: chiếm 0 chỗ trên dòng (rộng 0.6em, lề phải -0.75em)
        '.kx-th-d::after{content:"";display:inline-block;width:.6em;height:.78em;margin:0 -.75em 0 .15em;',
        '  vertical-align:baseline;background:var(--kx-th-ct,#040203);opacity:0}',
        '.kx-th-d.co-ct.is-on::after{opacity:1}',
        '.kx-th-d.kx-th-phai{margin-left:auto}',
        '.kx-th-d.kx-th-giua{margin-left:auto;margin-right:auto}',
        // line-height 0: hộp dòng cao 0 — nới hộp bắt chuột (không xô bố cục),
        // thanh sáng canh theo TÂM dòng thay vì theo hộp.
        // Bù TOÀN BỘ ở margin dưới (margin âm hai dòng liền nhau gộp thành
        // MỘT nên chia đôi trên/dưới thì mỗi chỗ nối dòng dư một phần) rồi
        // kéo hộp lên bằng top — chữ đứng đúng chỗ cũ.
        '.kx-th-d.kx-th-thap{padding:var(--kx-th-pad) 0;margin:0 0 calc(var(--kx-th-pad) * -2);top:calc(var(--kx-th-pad) * -1)}',
        '.kx-th-d.kx-th-thap::before{top:calc(50% - .6em);bottom:calc(50% - .56em)}',
      ].join('\n')
    }
    css()
    document.head.appendChild(st)

    var doan = [] // { p, goc, phai } — chữ gốc để dựng lại khi đổi cỡ
    var page = document.querySelector('.kx-page')
    function laBody(p) {
      if (p.childNodes.length !== 1 || p.firstChild.nodeType !== 3) return false // chỉ chữ thuần
      if (S.bo && p.closest(S.bo)) return false
      var t = p.textContent.replace(/\s+/g, ' ').trim()
      if (!t || (S.boChu && S.boChu.split('||').indexOf(t) !== -1)) return false
      var cs = getComputedStyle(p)
      if (cs.fontFamily.indexOf(S.font) === -1 || cs.textTransform !== 'uppercase') return false
      var k = page ? page.offsetWidth / 1920 : 1 // px màn mỗi px thiết kế
      var co = parseFloat(cs.fontSize) / k
      return co >= S.coMin && co <= S.coMax
    }
    function thieu(cs) {
      var fs = parseFloat(cs.fontSize)
      var lh = cs.lineHeight === 'normal' ? fs * 1.2 : parseFloat(cs.lineHeight) || 0
      var pad = (fs - lh) / 2
      return pad > 0.3 ? pad : 0
    }
    function them(p) {
      for (var i = 0; i < doan.length; i++) if (doan[i].p === p) return
      var goc = p.textContent
      if (!goc.replace(/\s|\u200b/g, '')) return // dòng trống / chỉ kí tự rộng 0
      var cs = getComputedStyle(p)
      var canh = cs.textAlign
      doan.push({
        p: p,
        goc: goc,
        canh: canh === 'right' || canh === 'end' ? 'phai' : canh === 'center' ? 'giua' : '',
        // line-height THẤP hơn cỡ chữ (Figma hay dùng, có chỗ = 0): hộp dòng
        // thấp hơn nét chữ. Nới hộp bắt chuột ĐÚNG phần thiếu — nửa hiệu cỡ
        // chữ và line-height — bằng padding + margin âm, bố cục không xê dịch.
        // Nới nhiều hơn thì vùng của dòng dưới chồng lên dòng trên: rê dòng
        // giữa lại sáng dòng dưới.
        thap: thieu(cs),
      })
    }
    function gom() {
      document.querySelectorAll(S.chon).forEach(them)
      if (S.tuDong && page) page.querySelectorAll('p').forEach(function (p) {
        if (laBody(p)) them(p)
      })
    }

    /* Tách một <p> thành các dòng HIỂN THỊ: trả chữ gốc về, đo đỉnh của từng
     * từ, gom các từ cùng đỉnh thành một dòng, rồi thay nội dung <p> bằng các
     * span (mỗi span một dòng, bỏ dấu cách ở chỗ ngắt). */
    function tach(o) {
      var p = o.p
      p.textContent = o.goc
      o.thap = thieu(getComputedStyle(p)) // cỡ chữ đổi theo bề rộng cửa sổ
      var tn = p.firstChild
      if (!tn || tn.nodeType !== 3) return
      var r = document.createRange()
      var dong = []
      var re = /\S+/g
      var m
      var dinhCu = null
      while ((m = re.exec(o.goc))) {
        r.setStart(tn, m.index)
        r.setEnd(tn, m.index + 1)
        var rc = r.getClientRects()
        var top = rc.length ? Math.round(rc[0].top) : dinhCu
        if (dinhCu === null || Math.abs(top - dinhCu) > 2) {
          dong.push({ dau: m.index, cuoi: m.index + m[0].length })
          dinhCu = top
        } else dong[dong.length - 1].cuoi = m.index + m[0].length
      }
      p.textContent = ''
      // Margin âm của dòng thấp (kx-th-thap) phải nằm TRONG <p>: <p> block
      // thường thì margin đó lọt ra ngoài (gộp margin), <p> cao thêm phần
      // padding và bị đẩy lên. flow-root giữ nó lại — <p> xếp y như cũ.
      if (o.thap && getComputedStyle(p).display === 'block') p.style.display = 'flow-root'
      dong.forEach(function (d) {
        var sp = document.createElement('span')
        sp.className = 'kx-th-d' + (o.canh ? ' kx-th-' + o.canh : '') + (o.thap ? ' kx-th-thap' : '')
        if (o.thap) sp.style.setProperty('--kx-th-pad', o.thap.toFixed(2) + 'px')
        sp.textContent = o.goc.slice(d.dau, d.cuoi)
        p.appendChild(sp)
        ganDong(sp)
      })
    }

    function ganDong(sp) {
      var tn = sp.firstChild
      var goc = tn.nodeValue
      var hen = 0
      var buoc = 1
      function ve(nhip) {
        var go = nhip * buoc
        var chot = Math.max(0, (nhip - S.tre) * buoc)
        var ra = ''
        var xong = true
        var kt = S.kiTu
        for (var j = 0; j < goc.length; j++) {
          var c = goc.charAt(j)
          if (/\s/.test(c) || j < chot) ra += c
          else if (j < go) {
            ra += kt.charAt((Math.random() * kt.length) | 0)
            xong = false
          } else {
            ra += NBSP
            xong = false
          }
        }
        tn.nodeValue = ra
        return xong
      }
      sp.addEventListener('pointerenter', function () {
        sp.style.setProperty('--kx-th-thanh', S.mauThanh)
        sp.style.setProperty('--kx-th-chu', S.mauChu)
        sp.style.setProperty('--kx-th-ct', S.mauConTro)
        sp.classList.toggle('co-thanh', !!S.thanh)
        sp.classList.toggle('co-ct', !!S.conTro)
        sp.classList.remove('is-day')
        sp.classList.add('is-on')
        if (giam) return
        var nhipToiDa = Math.max(1, Math.floor(S.maxMs / S.nhipMs) - S.tre)
        buoc = Math.max(S.buoc, Math.ceil(goc.length / nhipToiDa))
        clearInterval(hen)
        var nhip = 0
        ve(0)
        hen = setInterval(function () {
          nhip++
          if (ve(nhip)) {
            clearInterval(hen)
            hen = 0
            tn.nodeValue = goc
          }
        }, S.nhipMs)
      })
      sp.addEventListener('pointerleave', function () {
        // Ép thanh ĐẦY ngay (không transition), chốt bằng một lần đọc layout,
        // rồi thả ra cho nó thụt về chậm — lướt qua nhiều dòng ra vệt sóng.
        sp.classList.add('is-day')
        sp.classList.remove('is-on')
        void sp.offsetWidth
        sp.classList.remove('is-day')
      })
    }

    function tachHet() {
      doan.forEach(tach)
    }
    function batDau() {
      gom()
      tachHet()
    }
    var rongCu = 0
    function khiDoiCo() {
      var w = document.documentElement.clientWidth
      if (w === rongCu) return
      rongCu = w
      tachHet()
    }
    var hoan = 0
    addEventListener('resize', function () {
      clearTimeout(hoan)
      hoan = setTimeout(khiDoiCo, 150)
    })
    // Tách SAU khi font nạp xong — tách với font dự phòng là ngắt dòng sai.
    var chay = function () {
      rongCu = document.documentElement.clientWidth
      batDau()
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(chay)
    else chay()

    api.apDung = function () {
      css()
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true })
  else boot()
})()
