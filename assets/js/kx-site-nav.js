/* kx-site-nav.js — điều hướng giữa Home / Works / Work Detail / About / Contact.
 *
 * HTML của bốn trang sinh tự động từ Figma (tools/figma-to-html.mjs) nên
 * không có thẻ <a> nào. File này gắn link lên đúng phần tử theo node id của
 * Figma (data-n) hoặc theo chữ, rồi biến thanh nav góc dưới trái thành nav
 * thật: dính cố định, nút lưới mở danh sách trang.
 */
(function () {
  'use strict'

  var CONFIG = {
    enabled: true,
    email: 'hello@kaixa.com',          // cùng địa chỉ với trang contact
    instagram: '',                     // để trống = chữ "( ①Instagram )" không bấm được
    behance: '',
    navFixed: true,                    // thanh nav dính góc dưới trái khi cuộn
    navBottom: 24,                     // px thiết kế
    // Phần tử bấm sang trang chi tiết dự án (Works) / quay lại Works (Detail)
    // Layout Works 325:5970: năm số 01.–05. và năm nút DISCOVER MORE. Bốn dự án
    // sau là INSTANCE nên id có dạng I<instance>;<node gốc>.
    toDetail: '325:6119,I325:6652;325:6119,I325:6735;325:6119,I325:6903;325:6119,I325:6986;325:6119,325:6103,I325:6652;325:6103,I325:6735;325:6103,I325:6903;325:6103,I325:6986;325:6103',
    // Ảnh dự án ở Works cũng bấm được sang trang chi tiết (người dùng chốt).
    // Khai id NODE GỐC của bốn khung ảnh (hai hàng x hai ảnh); bản trong bốn
    // instance (I<instance>;<node gốc>) tự suy ra từ `duAn`.
    toDetailAnh: '325:6121,325:6122,325:6109,325:6110',
    duAn: '325:6652,325:6735,325:6903,325:6986',
    toWorks: '305:5173',
  }

  var PAGES = [
    { key: 'home', href: 'home.html', label: 'HOME' },
    { key: 'works', href: 'works.html', label: 'WORKS' },
    { key: 'detail', href: 'work-detail.html', label: 'LUMEN' },
    { key: 'about', href: 'about.html', label: 'ABOUT' },
    { key: 'contact', href: 'index.html', label: 'CONTACT' },
  ]

  var CSS = [
    '.kx-page .kx-nav-fixed{position:fixed!important;top:auto!important;z-index:50}',
    '.kx-menu{position:fixed;z-index:51;display:none;flex-direction:column;gap:calc(4 * var(--px));',
    '  font-family:"Geist Mono",monospace;font-weight:500;font-size:calc(14 * var(--px));letter-spacing:-0.06em;text-transform:uppercase}',
    '.kx-menu.is-open{display:flex}',
    '.kx-menu a{display:flex;gap:calc(16 * var(--px));align-items:center;height:calc(48 * var(--px));padding:0 calc(24 * var(--px));',
    '  background:#040203;border:1px solid #1f1f1f;border-radius:calc(4 * var(--px));color:#4d4d4d;text-decoration:none}',
    '.kx-menu a:hover,.kx-menu a:focus-visible,.kx-menu a[aria-current]{color:#fff;outline:none}',
  ].join('\n')

  function $(id) { return document.querySelector('[data-n="' + id + '"]') }

  function link(el, href, label) {
    if (!el || el.__kxLink) return
    el.__kxLink = true
    el.setAttribute('data-kx-link', '')
    el.setAttribute('role', 'link')
    el.setAttribute('tabindex', '0')
    if (label) el.setAttribute('aria-label', label)
    var go = function () {
      if (/^https?:/.test(href)) window.open(href, '_blank', 'noopener')
      else location.href = href
    }
    el.addEventListener('click', go)
    el.addEventListener('keydown', function (e) { if (e.key === 'Enter') go() })
  }

  function byText(text) {
    var out = []
    document.querySelectorAll('.kx-page p').forEach(function (p) {
      if (p.textContent.replace(/\s+/g, ' ').trim().indexOf(text) !== -1) out.push(p)
    })
    return out
  }

  function setupNav(page) {
    var nav = $('1:463')
    if (!nav) return
    var idx = 0
    PAGES.forEach(function (p, i) { if (p.key === page) idx = i })
    var num = $('1:472'), name = $('1:473')
    if (num) num.textContent = '[' + (idx + 1) + ']'
    if (name) name.textContent = PAGES[idx].label

    if (CONFIG.navFixed) {
      nav.classList.add('kx-nav-fixed')
      nav.style.bottom = 'calc(' + CONFIG.navBottom + ' * var(--px))'
    }
    link($('1:464'), 'home.html', 'Home')
    // Ô vuông thứ hai (1:476) vốn là ô thư, nay là nút bật/tắt sound — do
    // kx-sound.js lo. Thư vẫn gửi được qua các nút EMAIL ME trên trang.

    var menu = document.createElement('nav')
    menu.className = 'kx-menu'
    menu.setAttribute('aria-label', 'Trang')
    PAGES.forEach(function (p, i) {
      var a = document.createElement('a')
      a.href = p.href
      a.innerHTML = '<span>[' + (i + 1) + ']</span><span>' + p.label + '</span>'
      if (p.key === page) a.setAttribute('aria-current', 'page')
      menu.appendChild(a)
    })
    nav.parentNode.appendChild(menu)

    var btn = $('1:474')
    if (!btn) return
    btn.setAttribute('role', 'button')
    btn.setAttribute('tabindex', '0')
    btn.setAttribute('aria-label', 'Mở danh sách trang')
    btn.setAttribute('aria-expanded', 'false')
    btn.style.cursor = 'pointer'
    function place() {
      // Danh sách mọc LÊN từ mép trên của thanh nav, thẳng mép trái với ô logo.
      var r = nav.getBoundingClientRect()
      menu.style.left = r.left + 'px'
      menu.style.bottom = (window.innerHeight - r.top + 4) + 'px'
      menu.style.width = r.width + 'px'
    }
    function toggle(open) {
      open = open == null ? !menu.classList.contains('is-open') : open
      if (open) place()
      menu.classList.toggle('is-open', open)
      btn.setAttribute('aria-expanded', String(open))
    }
    btn.addEventListener('click', function (e) { e.stopPropagation(); toggle() })
    btn.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle() } })
    document.addEventListener('click', function (e) { if (!menu.contains(e.target)) toggle(false) })
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') toggle(false) })
    window.addEventListener('resize', function () { if (menu.classList.contains('is-open')) place() })
  }

  /* ---------------------------------------------------------- trang contact
   * index.html KHÔNG sinh từ Figma: nó không có .kx-page lẫn thuộc tính data-n,
   * thanh nav do kx-hello-mate.js dựng bằng class .hm-nav. Nên nối riêng ở đây.
   *
   * Nối bằng DELEGATION trên document, không gắn listener thẳng vào nút:
   * kx-hello-mate.js dựng lại TOÀN BỘ DOM mỗi khi đổi nhạc hay đổi cỡ, nên
   * listener gắn thẳng sẽ mất sau lần dựng lại đầu tiên. Menu cũng treo vào
   * body chứ không vào .hm, vì .hm chính là thứ bị dựng lại.
   */
  function setupContactNav() {
    var menu = document.createElement('nav')
    menu.className = 'kx-menu'
    menu.setAttribute('aria-label', 'Trang')
    PAGES.forEach(function (p, i) {
      var a = document.createElement('a')
      a.href = p.href
      a.innerHTML = '<span>[' + (i + 1) + ']</span><span>' + p.label + '</span>'
      if (p.key === 'contact') a.setAttribute('aria-current', 'page')
      menu.appendChild(a)
    })
    document.body.appendChild(menu)

    function place() {
      var nav = document.querySelector('.hm-nav')
      var hm = document.querySelector('.hm')
      if (!nav || !hm) return false
      // `--px` khai ở .kx-page của bốn trang kia, trang này không có. Suy ra từ
      // `--u` của .hm (1px thiết kế = --u / 16) rồi đặt thẳng lên menu.
      var u = parseFloat(getComputedStyle(hm).getPropertyValue('--u')) || 16
      menu.style.setProperty('--px', u / 16 + 'px')
      var r = nav.getBoundingClientRect()
      menu.style.left = r.left + 'px'
      menu.style.bottom = window.innerHeight - r.top + 4 + 'px'
      menu.style.width = r.width + 'px'
      return true
    }

    function toggle(open) {
      open = open == null ? !menu.classList.contains('is-open') : open
      if (open && !place()) return
      menu.classList.toggle('is-open', open)
      var btn = document.querySelector('.hm-nav__grid')
      if (btn) btn.setAttribute('aria-expanded', String(open))
    }

    document.addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('.hm-nav__grid')
      if (btn) {
        e.preventDefault()
        e.stopPropagation()
        btn.setAttribute('aria-label', 'Mở danh sách trang')
        toggle()
        return
      }
      // Ô logo là <span>, ô thư là <a> sẵn có href — chỉ bắt ô logo.
      var logo = e.target.closest && e.target.closest('span.hm-nav__box--sq')
      if (logo) {
        location.href = 'home.html'
        return
      }
      if (!menu.contains(e.target)) toggle(false)
    })
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') toggle(false) })
    window.addEventListener('resize', function () { if (menu.classList.contains('is-open')) place() })
  }

  function start(con) {
    if (!CONFIG.enabled) return
    var main = document.querySelector('.kx-page')
    if (!main) {
      // Trang contact: chờ kx-hello-mate.js dựng xong thanh nav rồi mới nối.
      if (document.querySelector('.hm-nav')) {
        var st0 = document.createElement('style')
        st0.textContent = CSS
        document.head.appendChild(st0)
        setupContactNav()
        return
      }
      if (con == null) con = 60
      if (con > 0) setTimeout(function () { start(con - 1) }, 40)
      return
    }
    var st = document.createElement('style')
    st.textContent = CSS
    document.head.appendChild(st)

    setupNav(main.getAttribute('data-page'))

    byText('EMAIL ME').forEach(function (p) { link(p.parentElement, 'mailto:' + CONFIG.email, 'Email ' + CONFIG.email) })
    if (CONFIG.instagram) byText('Instagram').forEach(function (p) { link(p.parentElement, CONFIG.instagram, 'Instagram') })
    if (CONFIG.behance) byText('Behance').forEach(function (p) { link(p.parentElement, CONFIG.behance, 'Behance') })
    CONFIG.toDetail.split(',').forEach(function (id) { link($(id.trim()), 'work-detail.html', 'Xem dự án') })
    // Bấm vào KHUNG ảnh, không phải thẻ <img>: canvas sóng/kính của
    // kx-wave-images.js nằm đè lên nhưng để pointer-events: none, nên cú bấm
    // vẫn rơi xuống khung.
    var duAn = CONFIG.duAn.split(',')
    CONFIG.toDetailAnh.split(',').forEach(function (g) {
      g = g.trim()
      link($(g), 'work-detail.html', 'Xem dự án')
      duAn.forEach(function (inst) { link($('I' + inst.trim() + ';' + g), 'work-detail.html', 'Xem dự án') })
    })
    CONFIG.toWorks.split(',').forEach(function (id) { link($(id.trim()), 'works.html', 'Dự án tiếp theo') })
  }

  window.KX_SITE_NAV = { CONFIG: CONFIG, start: start }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start)
  else start()
})()
