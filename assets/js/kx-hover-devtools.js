/* =============================================================================
 * kaixa Portfolio — bảng tinh chỉnh cho HAI hiệu ứng hover
 * (CHỈ DÙNG KHI LÀM VIỆC, KHÔNG GỬI KHI BÀN GIAO)
 * -----------------------------------------------------------------------------
 * Bảng này KHÔNG chứa hiệu ứng nào — nó chỉ đọc/ghi CONFIG của hai file đang
 * chạy: kx-hover-invert.js và kx-hover-caret.js. Đúng lệ của dự án: file hiệu
 * ứng tách hẳn khỏi file setting, bàn giao = xoá đúng một thẻ script.
 *
 * Đây là bảng RIÊNG của trang test, cố ý không nhét vào kx-devtools.js của
 * trang portfolio. Khi nào hai hiệu ứng được gắn vào trang thật thì thêm hai
 * mục vào mảng MODULES trong kx-devtools.js là có tab, không cần file này nữa.
 *
 * - Giá trị đã chỉnh ghi xuống localStorage nên tải lại trang vẫn còn.
 * - "MỐC GỐC" là giá trị lúc bảng vừa dựng (tức CONFIG trong file, cộng thêm
 *   phần trang tự đặt như selector). Nút trả về mặc định quay về mốc đó.
 * - Nút "Copy CONFIG" xuất đúng khối CONFIG để dán ngược vào file hiệu ứng.
 * ========================================================================== */
(() => {
  'use strict'

  const KEY = 'kx-hover-devtools'

  // Khai báo field. Thêm núm mới thì thêm một dòng ở đây.
  const MODULES = [
    {
      id: 'invert',
      ten: 'Đảo màu',
      file: 'assets/js/kx-hover-invert.js',
      api: () => window.KX_HOVER_INVERT,
      nhom: [
        {
          ten: 'Bắt chuột',
          fields: [
            { k: 'enabled', nhan: 'Bật hiệu ứng', type: 'bool' },
            { k: 'rows', nhan: 'Dòng bắt chuột', type: 'text' },
            { k: 'cells', nhan: 'Ô trong dòng (trống = cả dòng)', type: 'text' },
            { k: 'only', nhan: 'Chỉ ô đang trỏ mới sáng', type: 'bool' },
          ],
        },
        {
          ten: 'Màu và cỡ',
          fields: [
            { k: 'color', nhan: 'Màu thanh', type: 'color' },
            {
              k: 'blend',
              nhan: 'Cách hoà màu',
              type: 'enum',
              options: [
                ['difference', 'Difference — chữ tự đảo đen'],
                ['normal', 'Thường — thanh nằm dưới chữ'],
              ],
            },
            { k: 'colorText', nhan: 'Màu chữ (chỉ khi hoà màu Thường)', type: 'color' },
            { k: 'padX', nhan: 'Nới ngang', type: 'range', min: 0, max: 20, step: 0.5, dv: 'px' },
            { k: 'padTop', nhan: 'Nới trên', type: 'range', min: -4, max: 16, step: 0.5, dv: 'px' },
            { k: 'padBottom', nhan: 'Nới dưới', type: 'range', min: -4, max: 16, step: 0.5, dv: 'px' },
          ],
        },
        {
          ten: 'Quét vào và vệt đuôi',
          fields: [
            {
              k: 'dir',
              nhan: 'Thanh mọc ra từ',
              type: 'enum',
              options: [
                ['left', 'Trái sang phải'],
                ['right', 'Phải sang trái'],
                ['center', 'Giữa ra hai bên'],
              ],
            },
            { k: 'inMs', nhan: 'Quét đầy dòng mất (site gốc ~55)', type: 'range', min: 16, max: 1200, step: 5, dv: 'ms' },
            { k: 'outMs', nhan: 'Rút về mất (site gốc ~215)', type: 'range', min: 60, max: 3000, step: 5, dv: 'ms' },
            { k: 'noSelect', nhan: 'Khoá bôi đen chữ trên dòng', type: 'bool' },
            { k: 'hold', nhan: 'Sáng luôn sau khi rời chuột', type: 'bool' },
            { k: 'maxBars', nhan: 'Trần số thanh một ô', type: 'range', min: 1, max: 200, step: 1 },
            { k: 'maxCells', nhan: 'Trần số ô dựng sẵn cả trang', type: 'range', min: 20, max: 2000, step: 20 },
          ],
        },
      ],
    },
    {
      id: 'caret',
      ten: 'Ô vuông',
      file: 'assets/js/kx-hover-caret.js',
      api: () => window.KX_HOVER_CARET,
      nhom: [
        {
          ten: 'Bắt chuột',
          fields: [
            { k: 'enabled', nhan: 'Bật hiệu ứng', type: 'bool' },
            { k: 'rows', nhan: 'Dòng bắt chuột', type: 'text' },
            { k: 'cells', nhan: 'Ô trong dòng (trống = cả dòng)', type: 'text' },
          ],
        },
        {
          ten: 'Ô vuông',
          fields: [
            { k: 'color', nhan: 'Màu ô', type: 'color' },
            { k: 'size', nhan: 'Cạnh ô (0 = bằng chiều cao chữ hoa)', type: 'range', min: 0, max: 40, step: 0.5, dv: 'px' },
            { k: 'gap', nhan: 'Khe trước ô', type: 'range', min: 0, max: 40, step: 0.5, dv: 'px' },
            { k: 'dy', nhan: 'Dịch dọc', type: 'range', min: -20, max: 20, step: 0.5, dv: 'px' },
            {
              k: 'blend',
              nhan: 'Cách hoà màu',
              type: 'enum',
              options: [
                ['normal', 'Thường'],
                ['difference', 'Difference — đảo màu nền dưới'],
              ],
            },
          ],
        },
        {
          ten: 'Hiện, tắt, trượt',
          fields: [
            { k: 'fadeInMs', nhan: 'Hiện ra mất', type: 'range', min: 16, max: 800, step: 5, dv: 'ms' },
            { k: 'fadeOutMs', nhan: 'Tắt đi mất', type: 'range', min: 16, max: 2000, step: 5, dv: 'ms' },
            { k: 'chase', nhan: 'Ô trượt theo chữ (1 = nhảy dứt khoát)', type: 'range', min: 0.02, max: 1, step: 0.02 },
            { k: 'blink', nhan: 'Cho ô nhấp nháy', type: 'bool' },
            { k: 'blinkMs', nhan: 'Chu kì nhấp nháy', type: 'range', min: 100, max: 2000, step: 20, dv: 'ms' },
          ],
        },
        {
          ten: 'Chữ mọc dần',
          fields: [
            { k: 'reveal', nhan: 'Cho chữ mọc dần', type: 'bool' },
            { k: 'startChars', nhan: 'Hover xong còn lại mấy kí tự', type: 'range', min: 0, max: 20, step: 1 },
            { k: 'stepMs', nhan: 'Mỗi kí tự mọc mất', type: 'range', min: 8, max: 200, step: 1, dv: 'ms' },
            { k: 'charsPerStep', nhan: 'Mỗi nhịp mọc mấy kí tự', type: 'range', min: 1, max: 8, step: 1 },
            { k: 'noise', nhan: 'Số kí tự nhảy loạn ở đầu mút', type: 'range', min: 0, max: 12, step: 1 },
            { k: 'symbols', nhan: 'Bộ kí tự nhảy loạn', type: 'text' },
            { k: 'maxChars', nhan: 'Trần số kí tự một ô', type: 'range', min: 20, max: 2000, step: 20 },
            { k: 'maxCells', nhan: 'Trần số ô dựng sẵn cả trang', type: 'range', min: 20, max: 2000, step: 20 },
            { k: 'noSelect', nhan: 'Khoá bôi đen chữ trên dòng', type: 'bool' },
          ],
        },
      ],
    },
  ]

  /* ==================================================================== nhớ */

  const base = {} // mốc gốc: giá trị lúc bảng vừa dựng

  function doc() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || '{}')
    } catch (e) {
      return {}
    }
  }
  function ghi(o) {
    try {
      localStorage.setItem(KEY, JSON.stringify(o))
    } catch (e) {}
  }
  function luu(modId, k, v) {
    const o = doc()
    if (!o[modId]) o[modId] = {}
    if (JSON.stringify(v) === JSON.stringify(base[modId][k])) delete o[modId][k]
    else o[modId][k] = v
    ghi(o)
  }

  /* ===================================================================== CSS */

  function ensureCss() {
    if (document.getElementById('kxd-css')) return
    const st = document.createElement('style')
    st.id = 'kxd-css'
    st.textContent = [
      '.kxd{position:fixed;right:0;top:0;bottom:0;width:330px;z-index:2147483000;',
      'background:#0b0b0b;border-left:1px solid #242424;color:#b8b8b8;',
      'font:11px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;display:flex;flex-direction:column}',
      '.kxd[hidden]{display:none}',
      '.kxd *{box-sizing:border-box}',
      '.kxd__top{display:flex;gap:4px;padding:8px;border-bottom:1px solid #242424;flex:none}',
      '.kxd__tab{flex:1;padding:6px 8px;border:1px solid #242424;background:#111;color:#8a8a8a;cursor:pointer;border-radius:2px}',
      '.kxd__tab.on{background:#fff;color:#000;border-color:#fff}',
      '.kxd__body{flex:1;overflow:auto;padding:8px 10px 60px}',
      '.kxd__grp{margin:14px 0 6px;color:#fff;letter-spacing:.06em;text-transform:uppercase;font-size:10px}',
      '.kxd__grp:first-child{margin-top:4px}',
      '.kxd__f{padding:5px 0;border-bottom:1px solid #161616}',
      '.kxd__lb{display:flex;align-items:center;gap:6px;justify-content:space-between;margin-bottom:3px}',
      '.kxd__nm{color:#8a8a8a}',
      '.kxd__f.moi .kxd__nm{color:#fff}',
      '.kxd__f.moi .kxd__nm:before{content:"* "}',
      '.kxd__rs{border:0;background:none;color:#4a4a4a;cursor:pointer;padding:0 2px;font:inherit}',
      '.kxd__rs:hover{color:#fff}',
      '.kxd__ctl{display:flex;align-items:center;gap:6px}',
      '.kxd input[type=range]{flex:1;accent-color:#fff;height:16px}',
      '.kxd input[type=number],.kxd input[type=text],.kxd select{background:#141414;border:1px solid #2a2a2a;color:#e8e8e8;',
      'font:inherit;padding:3px 5px;border-radius:2px;width:100%}',
      '.kxd input[type=number]{width:62px;flex:none;text-align:right}',
      '.kxd input[type=color]{background:#141414;border:1px solid #2a2a2a;width:34px;height:22px;padding:1px;flex:none}',
      '.kxd input[type=checkbox]{accent-color:#fff;width:14px;height:14px}',
      '.kxd__bot{position:absolute;left:0;right:0;bottom:0;display:flex;gap:6px;padding:8px;',
      'background:#0b0b0b;border-top:1px solid #242424}',
      '.kxd__btn{flex:1;padding:7px;border:1px solid #2a2a2a;background:#141414;color:#d8d8d8;cursor:pointer;border-radius:2px;font:inherit}',
      '.kxd__btn:hover{border-color:#fff;color:#fff}',
      '.kxd-open{position:fixed;right:12px;bottom:12px;z-index:2147483000;width:34px;height:34px;',
      'border:1px solid #2a2a2a;background:#111;color:#d8d8d8;cursor:pointer;border-radius:2px;font:14px/1 ui-monospace,Menlo,monospace}',
      '.kxd-open:hover{border-color:#fff;color:#fff}',
    ].join('')
    document.head.appendChild(st)
  }

  /* ================================================================== dựng UI */

  let panel = null
  let dangMo = 'invert'

  function veField(mod, f, cfg) {
    const wrap = document.createElement('div')
    wrap.className = 'kxd__f'

    const lb = document.createElement('div')
    lb.className = 'kxd__lb'
    const nm = document.createElement('span')
    nm.className = 'kxd__nm'
    nm.textContent = f.nhan
    const rs = document.createElement('button')
    rs.className = 'kxd__rs'
    rs.type = 'button'
    rs.title = 'Trả về mốc gốc'
    rs.textContent = '↺'
    lb.appendChild(nm)
    lb.appendChild(rs)
    wrap.appendChild(lb)

    const ctl = document.createElement('div')
    ctl.className = 'kxd__ctl'
    wrap.appendChild(ctl)

    let doc1 = null // ô nhập chính
    let doc2 = null // ô số đi kèm slider

    const danhDau = () => {
      const khac = JSON.stringify(cfg[f.k]) !== JSON.stringify(base[mod.id][f.k])
      wrap.classList.toggle('moi', khac)
    }
    const dat = (v, tuUI) => {
      cfg[f.k] = v
      luu(mod.id, f.k, v)
      danhDau()
      if (!tuUI) doDay()
    }

    if (f.type === 'bool') {
      doc1 = document.createElement('input')
      doc1.type = 'checkbox'
      doc1.addEventListener('change', () => dat(doc1.checked, true))
      ctl.appendChild(doc1)
    } else if (f.type === 'range') {
      doc1 = document.createElement('input')
      doc1.type = 'range'
      doc1.min = f.min
      doc1.max = f.max
      doc1.step = f.step
      doc2 = document.createElement('input')
      doc2.type = 'number'
      doc2.step = f.step
      doc1.addEventListener('input', () => {
        doc2.value = doc1.value
        dat(parseFloat(doc1.value), true)
      })
      doc2.addEventListener('change', () => {
        doc1.value = doc2.value
        dat(parseFloat(doc2.value), true)
      })
      ctl.appendChild(doc1)
      ctl.appendChild(doc2)
      if (f.dv) {
        const dv = document.createElement('span')
        dv.textContent = f.dv
        dv.style.color = '#4a4a4a'
        ctl.appendChild(dv)
      }
    } else if (f.type === 'enum') {
      doc1 = document.createElement('select')
      f.options.forEach((o) => {
        const op = document.createElement('option')
        op.value = o[0]
        op.textContent = o[1]
        doc1.appendChild(op)
      })
      doc1.addEventListener('change', () => dat(doc1.value, true))
      ctl.appendChild(doc1)
    } else if (f.type === 'color') {
      doc1 = document.createElement('input')
      doc1.type = 'color'
      doc2 = document.createElement('input')
      doc2.type = 'text'
      doc1.addEventListener('input', () => {
        doc2.value = doc1.value
        dat(doc1.value, true)
      })
      doc2.addEventListener('change', () => {
        doc1.value = doc2.value
        dat(doc2.value, true)
      })
      ctl.appendChild(doc1)
      ctl.appendChild(doc2)
    } else {
      doc1 = document.createElement('input')
      doc1.type = 'text'
      doc1.addEventListener('change', () => dat(doc1.value, true))
      ctl.appendChild(doc1)
    }

    function doDay() {
      const v = cfg[f.k]
      if (f.type === 'bool') doc1.checked = !!v
      else if (f.type === 'range') {
        doc1.value = v
        doc2.value = v
      } else if (f.type === 'color') {
        doc1.value = /^#[0-9a-f]{6}$/i.test(String(v)) ? v : '#ffffff'
        doc2.value = v
      } else doc1.value = v == null ? '' : v
      danhDau()
    }

    rs.addEventListener('click', () => dat(base[mod.id][f.k], false))
    doDay()
    return wrap
  }

  function veMod(mod) {
    const api = mod.api()
    const box = document.createElement('div')
    if (!api) {
      box.textContent = 'Chưa nạp ' + mod.file
      return box
    }
    mod.nhom.forEach((g) => {
      const h = document.createElement('div')
      h.className = 'kxd__grp'
      h.textContent = g.ten
      box.appendChild(h)
      g.fields.forEach((f) => box.appendChild(veField(mod, f, api.config)))
    })
    return box
  }

  function xuatConfig(mod) {
    const api = mod.api()
    if (!api) return ''
    const keys = Object.keys(api.defaults)
    const dong = keys.map((k) => {
      const v = api.config[k]
      const s = typeof v === 'string' ? "'" + v.replace(/'/g, "\\'") + "'" : String(v)
      return '    ' + k + ': ' + s + ','
    })
    return '  // ' + mod.file + '\n  const CONFIG = {\n' + dong.join('\n') + '\n  }'
  }

  function dung() {
    ensureCss()

    const nut = document.createElement('button')
    nut.className = 'kxd-open'
    nut.type = 'button'
    nut.title = 'Bảng tinh chỉnh hai hiệu ứng hover'
    nut.textContent = '⚙'
    document.body.appendChild(nut)

    panel = document.createElement('div')
    panel.className = 'kxd'
    panel.hidden = true

    const top = document.createElement('div')
    top.className = 'kxd__top'
    const body = document.createElement('div')
    body.className = 'kxd__body'
    const bot = document.createElement('div')
    bot.className = 'kxd__bot'

    MODULES.forEach((m) => {
      const t = document.createElement('button')
      t.className = 'kxd__tab'
      t.type = 'button'
      t.textContent = m.ten
      t.addEventListener('click', () => {
        dangMo = m.id
        ve()
      })
      t.dataset.id = m.id
      top.appendChild(t)
    })

    const bCopy = document.createElement('button')
    bCopy.className = 'kxd__btn'
    bCopy.type = 'button'
    bCopy.textContent = 'Copy CONFIG'
    bCopy.addEventListener('click', () => {
      const mod = MODULES.find((m) => m.id === dangMo)
      const s = xuatConfig(mod)
      const xong = () => {
        bCopy.textContent = 'Đã copy'
        setTimeout(() => (bCopy.textContent = 'Copy CONFIG'), 1200)
      }
      if (navigator.clipboard) navigator.clipboard.writeText(s).then(xong, () => console.log(s))
      else console.log(s)
    })

    const bReset = document.createElement('button')
    bReset.className = 'kxd__btn'
    bReset.type = 'button'
    bReset.textContent = 'Trả về mốc gốc'
    bReset.addEventListener('click', () => {
      const mod = MODULES.find((m) => m.id === dangMo)
      const api = mod.api()
      if (!api) return
      Object.keys(base[mod.id]).forEach((k) => {
        api.config[k] = base[mod.id][k]
      })
      const o = doc()
      delete o[mod.id]
      ghi(o)
      ve()
    })

    bot.appendChild(bCopy)
    bot.appendChild(bReset)
    panel.appendChild(top)
    panel.appendChild(body)
    panel.appendChild(bot)
    document.body.appendChild(panel)

    function ve() {
      Array.from(top.children).forEach((t) => t.classList.toggle('on', t.dataset.id === dangMo))
      body.textContent = ''
      body.appendChild(veMod(MODULES.find((m) => m.id === dangMo)))
    }

    nut.addEventListener('click', () => {
      panel.hidden = !panel.hidden
      if (!panel.hidden) ve()
    })
    ve()
  }

  /* ================================================================ khởi động */

  function boot() {
    // Chụp MỐC GỐC trước khi áp giá trị đã lưu — mốc này là CONFIG trong file
    // cộng phần trang tự đặt (selector của trang test).
    MODULES.forEach((m) => {
      const api = m.api()
      base[m.id] = api ? { ...api.config } : {}
    })

    const o = doc()
    MODULES.forEach((m) => {
      const api = m.api()
      if (!api || !o[m.id]) return
      Object.keys(o[m.id]).forEach((k) => {
        if (k in api.config) api.config[k] = o[m.id][k]
      })
    })

    dung()
  }

  // Chờ hai file hiệu ứng có mặt rồi mới chụp mốc gốc.
  function cho(lan) {
    if (window.KX_HOVER_INVERT && window.KX_HOVER_CARET) return boot()
    if (lan <= 0) return boot()
    setTimeout(() => cho(lan - 1), 60)
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => cho(40), { once: true })
  } else {
    cho(40)
  }
})()
