/* =============================================================================
 * kaixa Portfolio — Trang "(Hello, Mate)"
 * -----------------------------------------------------------------------------
 * Dựng lại bản thiết kế Figma thành một trang chạy được:
 *
 *   1. NHẠC: nhập file từ máy (bấm nhãn "[ + IMPORT ]", bấm tên bài, kéo–thả
 *      file vào trang, hoặc bấm PLAY khi chưa có bài) rồi phát. Đường tín hiệu
 *      Web Audio: <audio> -> MediaElementSource -> Analyser -> Gain -> loa.
 *   2. SOUND BAR: cột sóng vẽ bằng canvas, mỗi cột là một chồng ô vuông rời như
 *      ảnh mẫu; số liệu lấy từ AnalyserNode, chia dải theo thang log.
 *   3. HAI ĐĨA XOAY: chỉ xoay khi nhạc chạy, có quán tính lên/xuống tốc như mâm
 *      đĩa thật (mặc định 33⅓ vòng/phút).
 *   4. CỘT CHỮ BÊN PHẢI: chạy loop liên tục từ trên xuống, nối đuôi không hở.
 *
 * BỐ CỤC — bản thiết kế khổ 1920×1080, luôn nằm gọn trong một viewport. Mọi số
 * đo là px của bản thiết kế, quy ra chiều dài trang theo đúng thang Osmo của
 * site (px ÷ 16 = số lần đơn vị gốc), còn đơn vị gốc lấy theo cạnh chật hơn:
 *     --u = min(100vw/120, 100svh/67.5)
 * 120 = 1920/16 và 67.5 = 1080/16, nên ở khổ 1920×1080 thì --u = 16px, khớp
 * `--size-font` của site; màn hẹp/thấp hơn thì cả trang thu nhỏ đều như
 * object-fit: contain, không bao giờ tràn.
 *
 * KHÔNG dùng `em` cho toạ độ: `em` bám theo font-size của chính phần tử, mà
 * trang này có chỗ đặt 14px, chỗ 35px — toạ độ sẽ co giãn lung tung. `--u` là
 * một chiều dài tuyệt đối khai báo một lần ở .hm nên mọi nơi cùng một thang.
 *
 * MIX-BLEND: cụm 2 đĩa và cụm chữ hiển thị ("(Hello, Mate)", dòng mail) dùng
 * mix-blend-mode: difference y như Figma — chữ trắng nằm trên đĩa trắng thì tự
 * đảo thành đen.
 *
 * CÁCH DÙNG: nhúng thẻ script này vào trang là chạy. Chỉnh bằng CONFIG ngay bên
 * dưới. File này KHÔNG chứa UI setting — bảng tinh chỉnh nằm ở kx-devtools.js
 * (tab "Hello Mate"), bàn giao thì xoá đúng thẻ script của file đó.
 * ========================================================================== */
(() => {
  'use strict'

  // CONFIG để phẳng (không lồng object) cho khớp bảng tinh chỉnh: kx-devtools.js
  // đọc/ghi theo config[key] và so với defaults[key] để biết cái nào đã đổi.
  const CONFIG = {
    enabled: true,

    // Chỗ gắn. Có phần tử khớp selector thì gắn vào đó, không thì tự tạo trong
    // <body>. Để '' là luôn tự tạo.
    mount: '[data-hello-mate]',
    imgBase: 'assets/img/',

    // ------------------------------------------------------------- khung hình
    fitMode: 'contain', // 'contain' = cỡ chữ/khối theo cạnh chật | 'site' = theo --size-font
    designW: 1920,
    designH: 1080,
    minUnit: 5, // px — không thu nhỏ quá mức này
    maxUnit: 24.5, // px — không phóng to quá mức này
    // Lề: mọi cụm giao diện đều dán vào 4 cạnh của VIEWPORT, cách đúng ngần này
    // (px thiết kế). Chỉ hai cái đĩa và ảnh poster là không dính lề — chúng giữ
    // bố cục canh giữa của bản thiết kế.
    padding: 24,
    // Figma trim hộp chữ về cap-height còn CSS dùng line-height đầy đủ. Trình
    // duyệt mới có text-box-trim làm đúng việc đó; máy cũ thì bù bằng số này.
    capTrim: 0.78,

    // ------------------------------------------------------------------- nhạc
    // Danh sách bài cài sẵn, PHÁT THEO ĐÚNG THỨ TỰ khai ở đây; `defaultTracks()`
    // quét từ `audioSrc` tới `audioSrc8`, ô nào trống thì bỏ qua. Hai bài trở
    // lên thì hết bài tự nhảy sang bài kế (và phím `n` chuyển bài); đúng MỘT bài
    // thì `audioLoop` cho nó lặp lại. Để trống HẾT là trang chờ người dùng nhập
    // file từ máy. Người dùng nhập bài khác thì danh sách này bị thay, không mất
    // file trên đĩa.
    audioSrc: 'assets/media/triumph-of-light.mp3',
    audioTitle: 'TRIUMPH OF LIGHT',
    audioSrc2: '',
    audioTitle2: '',
    audioSrc3: '',
    audioTitle3: '',
    audioSrc4: '',
    audioTitle4: '',
    // Ô tên bài: mép trái 986, mép phải 1070 — thẳng với mép phải của đường kẻ
    // và khung PLAY/MUTE, nên tên dài mấy cũng không tràn ra ngoài lề.
    titleX: 986,
    titleW: 84,
    titleGap: 28, // khe giữa hai lượt chữ khi chạy marquee (px thiết kế)
    titleSpeed: 24, // px thiết kế / giây — kiểu chữ chạy của máy nghe nhạc cũ
    volume: 0.9,
    audioLoop: true, // lặp lại khi chỉ có một bài
    // Bộ lọc của hộp chọn file. `audio/*` không thôi là KHÔNG ĐỦ: macOS dịch nó
    // thành một danh sách UTI rồi làm mờ mọi file nó không map được — file trên
    // iCloud chưa tải về, file thiếu metadata, hay đơn giản là nó không nhận ra
    // kiểu — nên có những bài mp3 hoàn toàn bình thường mà không bấm chọn được.
    // Kê thêm đuôi file là hộp chọn nhận theo đuôi, không phải đoán kiểu nữa.
    // Để TRỐNG = bỏ hẳn bộ lọc, hiện mọi file; `loadTracks()` vẫn tự lọc lại
    // trong JS nên chọn nhầm cũng không sao.
    audioAccept: 'audio/*,.mp3,.m4a,.aac,.wav,.flac,.ogg,.oga,.opus,.webm,.aiff,.aif',
    autoplay: false, // trình duyệt vẫn chặn cho tới khi có thao tác chuột

    // ------------------------------------------------ cụm player & sound bar
    // Cả cụm xếp quanh ĐƯỜNG KẺ làm mốc: sound bar mọc LÊN từ đường kẻ, còn ô
    // vuông hai đầu và khung PLAY/MUTE treo BÊN DƯỚI nó. Nên kéo chiều cao sound
    // bar thì đáy cột vẫn dính đường kẻ, chỉ cao thêm lên phía trên.
    playerY: 16, // y thiết kế của mép trên cụm (dòng [ PLAYING ] và tên bài)
    ruleY: 117, // y thiết kế của đường kẻ — mốc cho cả cụm
    specGapRule: 4, // khe từ ĐÁY sound bar xuống đường kẻ
    sqGapRule: 4, // ô vuông hai đầu cách đường kẻ
    ctrlGapRule: 30, // khung PLAY/MUTE cách đường kẻ
    ctrlH: 40, // chiều cao khung PLAY/MUTE — nút BURNING MODE bám theo số này
    specX: 850,
    specW: 218,
    specH: 38,
    specBars: 61, // số cột
    specGap: 4, // khe giữa hai cột
    specSegH: 1.3, // cao mỗi ô vuông trong cột
    specSegGap: 1.3, // khe giữa hai ô
    specMinHz: 40, // dải tần trải trên bề ngang, thang log
    specMaxHz: 14000,
    specFloorDb: -80, // dB ứng với cột thấp nhất
    specCeilDb: -22, // dB ứng với cột cao nhất
    specTilt: 0.55, // bù độ dốc phổ, kéo dải cao lên cho cân
    specSmoothing: 0.78, // AnalyserNode.smoothingTimeConstant
    specFall: 6, // tốc độ rơi của cột (tỉ lệ chiều cao / giây)
    specPeak: true, // có ô đỉnh giữ lại phía trên không
    specPeakHold: 0.5, // giây — giữ đỉnh trước khi rơi
    specPeakFall: 1.1, // tốc độ rơi của đỉnh
    specIdle: 0.1, // biên độ nhấp nhô khi đang dừng; 0 = đứng im
    specIdleSpeed: 0.55,

    // -------------------------------------------------------------------- đĩa
    // Hai đĩa luôn đối xứng qua tâm trang và KHÔNG BAO GIỜ chạm nhau: tâm của
    // chúng suy ra từ đường kính + khe hở, nên phóng to đĩa là chúng nở ra hai
    // bên trái/phải chứ không lấn vào nhau.
    discSize: 1056, // đường kính (px thiết kế)
    discGap: 6, // khe hở giữa hai đĩa; đặt 0 = chạm nhau đúng như bản Figma
    discY: 540.5, // tâm theo trục dọc, dùng chung
    discBadgeW: 106, // vòng nhãn giữa đĩa trái
    discBadgeH: 107,
    discBadgeDX: 1.5, // vòng nhãn lệch ngang so với TÂM đĩa trái
    discRpm: 3, // vòng/phút khi chạy hết tốc
    discSpinUp: 1.5, // giây — thời gian lên tốc
    discSpinDown: 2.8, // giây — thời gian tuột tốc
    discReverse: false, // true = xoay ngược chiều kim đồng hồ
    discClickToPlay: true, // bấm vào đĩa = play/pause

    // ------------------------------------------------------- cột chữ bên phải
    feedRight: 91, // cột cách lề phải thêm ngần này (px thiết kế)
    feedW: 97,
    feedGap: 8, // khe giữa hai mục
    feedSpeed: 22, // px thiết kế / giây
    feedDir: 'down', // 'down' | 'up'
    feedFade: 24, // px thiết kế — độ mờ dần ở hai đầu cột

    // ------------------------------------------------------------------- màu
    colorBg: '#040203',
    colorDim: '#4d4d4d', // chữ phụ
    colorWhite: '#ffffff',
    colorDisplay: '#ebebeb', // chữ PP Editorial
    colorHairline: '#1f1f1f', // viền các ô nav
    colorBox: 'rgba(255,255,255,0.12)', // viền ô play/mute
  }

  /* ------------------------------------------------------------------ nội dung
   * Sửa chữ nghĩa ở đây, không phải lần trong markup.
   * Mỗi mục của FEED là một khối; xuống dòng bằng '\n'.
   * Mặc định mọi chữ số được thu nhỏ nâng lên (giống feature 'numr' của Figma);
   * mục nào muốn giữ số cỡ thường thì viết dạng { t: '…', numr: false }.
   * -------------------------------------------------------------------------- */
  const DATA = {
    hello: '(Hello, Mate)',
    note: 'Enjoy the Vietnam vibe\nand\n\nthink about the project we will collaborate on in\nthe future',
    social: ['LINKEDIN', 'BEHANCE', 'DRIBBBLE'],
    awards: ['AWWWARDS', 'MUZLI', 'INSTAGRAM'],
    nav: { index: '[1]', label: 'HOME' },
    mail: { word: '(Mail', close: ')', address: '(hello@kaixa.com)', href: 'mailto:hello@kaixa.com' },
    marks: { open: '[', close: ']', tag: '[INSPI]' },
    player: {
      playing: '[ PLAYING ]',
      paused: '[ PAUSED  ]',
      empty: '[ + IMPORT ]', // chưa có bài — bấm vào là mở hộp chọn file
      error: '[ ERROR   ]',
      play: 'PLAY',
      pause: 'PAUSE',
      mute: 'MUTE',
      unmute: 'SOUND',
      drop: 'THẢ FILE NHẠC VÀO ĐÂY',
    },
    feed: [
      'Pause and Reflect',
      'Slow Down',
      'Breathe Deeply',
      'Enjoy the Moment',
      'Take a Break',
      'Step Back',
      'Rest a While',
      'Unwind Now',
      'Catch Your Breath',
      'Slow Your Pace',
      'VISUAL\nCHASER',
      'DONG DA\nHANOI',
      '21.09.1995',
      'INSIGHTS',
      'CR7 Goat Ronaldo',
      'aespa\nSM Town',
      'TMRW. STUDIO',
      'ATTACK ON TITAN\n(進撃の巨人)',
      'TOBEY (SPIDER MAN) MAGUIRE',
      'Take It Easy',
      'EMINEM\nSOLIDER TOY',
      'HURT SO GOOD',
      'LINKIN PARK\nNUMB',
      'ARRIVAL TO THE EARTH\nTRANSFORMERS',
      'LUMEN STUDIO',
      'CAM ON THAY\nNGUYEN NGOC\nQUAN 360',
      'MINGG PATREON VN',
      'FINE ART',
      'Take a Breather',
      'DESIGN 101\nWORKSHOP',
      'KABUTO 26\nPOSTERS',
      'PAIN NAGATO\n/ NARUTO /',
      'MANCHESTER\nUNITED',
      'TYPOGRAPHY\nEDITORIAL',
      'AESPA\nNEXT LEVEL',
      'EVANGELIOn\n1995',
      'TRUNGKING EXPRESS 1994',
      { t: 'MCK - 99%\nHNDCMM', numr: false },
      'MURAKAMI\nBOOKS',
      'KEIGO HASHIMI',
      'AWWWARDS\nJURY 2025',
      'Ease Into Calm',
      'Ease Into Calm',
      'Ease Into Calm',
      'Ease Into Calm',
      'Pause and Reset',
    ],
  }

  /* ====================================================================== hạ tầng */

  const S = CONFIG
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)
  const esc = (s) =>
    String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

  // px bản thiết kế -> chiều dài trên trang (xem đầu file: vì sao không dùng em)
  const e = (px) => (px === 0 ? '0' : `calc(var(--u) * ${+(px / 16).toFixed(6)})`)

  // Figma bật font-feature 'numr' cho cột chữ: chữ số nhỏ lại và nâng lên.
  // Geist Mono không chắc có feature đó nên làm tay cho chắc kết quả.
  const numr = (s) => esc(s).replace(/\d+(?:[.,]\d+)*/g, (m) => '<i>' + m + '</i>')

  const style = document.createElement('style')
  style.dataset.kxHelloMate = ''
  document.head.appendChild(style)

  /* ========================================================================= CSS */

  function css() {
    // Đơn vị gốc: cạnh chật hơn của viewport quyết định, kẹp trong [min, max].
    // Nó chỉ quyết định CỠ của chữ và khối; còn VỊ TRÍ thì neo vào cạnh viewport.
    const unit =
      S.fitMode === 'site'
        ? 'var(--size-font, 16px)'
        : `clamp(${S.minUnit}px, min(100vw / ${S.designW / 16}, 100svh / ${S.designH / 16}), ${S.maxUnit}px)`

    // Lề viewport + một đoạn dôi ra (px thiết kế)
    const p = (extra) => (extra ? `calc(var(--pad) + ${+(extra / 16).toFixed(6)} * var(--u))` : 'var(--pad)')
    // Toạ độ tính từ TÂM trang — dùng cho hai cái đĩa và ảnh poster, những thứ
    // giữ nguyên bố cục canh giữa của bản thiết kế thay vì dán vào lề.
    const cx = (x) => `calc(50% + ${+((x - S.designW / 2) / 16).toFixed(6)} * var(--u))`
    const cy = (y) => `calc(50% + ${+((y - S.designH / 2) / 16).toFixed(6)} * var(--u))`

    // Hai đĩa: tâm suy ra từ đường kính + khe hở, đối xứng qua tâm trang. Phóng
    // to đĩa thì chúng nở ra hai bên, khe giữa giữ nguyên nên không bao giờ chạm.
    const half = Math.max(0, S.discSize) / 2
    const gap = Math.max(0, S.discGap) / 2
    const discL = S.designW / 2 - gap - half
    const discR = S.designW / 2 + gap + half

    // Cụm player xếp quanh đường kẻ. Toạ độ dưới đây tính theo mép trên của cụm.
    // Khoảng cách đường kẻ so với mép trên là hằng số (lấy mốc y=24 của bản
    // thiết kế), nên `playerY` dịch CẢ CỤM còn `ruleY` chỉ đổi chỗ đường kẻ so
    // với dòng tên bài — hai núm không giẫm chân nhau.
    const rule = S.ruleY - 24
    const specTop = rule - S.specGapRule - S.specH // sound bar mọc lên từ đường kẻ
    const ctrlTop = rule + S.ctrlGapRule
    const playerH = ctrlTop + S.ctrlH

    return `
/* ------------------------------------------------------------------- fonts */
@font-face{font-family:'Geist Mono HM';src:url('assets/fonts/GeistMono-500-latin.woff2') format('woff2');font-weight:500;font-style:normal;font-display:swap;unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}
@font-face{font-family:'Geist Mono HM';src:url('assets/fonts/GeistMono-500-vietnamese.woff2') format('woff2');font-weight:500;font-style:normal;font-display:swap;unicode-range:U+0102-0103,U+0110-0111,U+0128-0129,U+0168-0169,U+01A0-01A1,U+01AF-01B0,U+0300-0301,U+0303-0304,U+0308-0309,U+0323,U+0329,U+1EA0-1EF9,U+20AB}
@font-face{font-family:'PP Editorial New HM';src:url('assets/fonts/PPEditorialNew-Thin.woff2') format('woff2'),url('assets/fonts/PPEditorialNew-Thin.woff') format('woff');font-weight:200;font-style:normal;font-display:swap}

/* ------------------------------------------------------------------- khung */
html[data-hm]{background:${S.colorBg}}
html[data-hm],html[data-hm] body{margin:0;padding:0;height:100%;overflow:hidden}
.hm-stage{position:fixed;inset:0;background:${S.colorBg};overflow:hidden}
.hm{
  position:absolute;inset:0;isolation:isolate;
  --u:${unit};
  --pad:${e(S.padding)};
  font-size:var(--u);
  background:${S.colorBg};color:${S.colorDim};
  font-family:'Geist Mono HM',ui-monospace,'SFMono-Regular',Menlo,monospace;
  font-weight:500;
  -webkit-font-smoothing:antialiased;
}
.hm *{box-sizing:border-box;margin:0}
.hm button{font:inherit;color:inherit;background:none;border:0;padding:0;cursor:pointer;-webkit-tap-highlight-color:transparent}
.hm a{color:inherit;text-decoration:none}
.hm img{display:block}

/* Chữ phụ dùng chung: Geist Mono 14px, giãn chữ -0.84px, viết hoa */
.hm-mono{font-size:${e(14)};letter-spacing:-.06em;text-transform:uppercase;line-height:.9}
.hm-mono i{font-style:normal;font-size:.72em;letter-spacing:0;vertical-align:.3em}

/* Chữ hiển thị PP Editorial New */
.hm-disp{
  font-family:'PP Editorial New HM',ui-serif,Georgia,'Times New Roman',serif;
  font-weight:200;font-size:${e(35.169)};line-height:.8775;letter-spacing:-.04em;
  color:${S.colorDisplay};white-space:nowrap;
}
@supports (text-box-trim:trim-both){.hm-disp{text-box-trim:trim-both;text-box-edge:cap alphabetic}}
@supports not (text-box-trim:trim-both){.hm-disp{margin-block:${-(1 - S.capTrim) / 2}em}}

/* ----------------------------------------------------------- đĩa & poster
 * Hai thứ duy nhất KHÔNG dán vào lề: giữ nguyên bố cục canh giữa của thiết kế,
 * nên toạ độ tính từ tâm trang chứ không phải từ cạnh. */
.hm-discs{position:absolute;inset:0;mix-blend-mode:difference;z-index:1}
.hm-disc,.hm-badge{position:absolute;top:${cy(S.discY)};transform-origin:50% 50%;will-change:transform}
.hm-disc{width:${e(S.discSize)};height:${e(S.discSize)};cursor:${S.discClickToPlay ? 'pointer' : 'default'}}
.hm-disc--l{left:${cx(discL)}}
.hm-disc--r{left:${cx(discR)}}
.hm-badge{left:${cx(discL + S.discBadgeDX)};width:${e(S.discBadgeW)};height:${e(S.discBadgeH)};pointer-events:none}
.hm-poster{position:absolute;left:50%;top:${cy(741)};width:${e(177.88)};height:${e(250.761)};transform:translateX(-50%);z-index:2;object-fit:cover}

/* --------------------------------------------------------- cụm trái, trên */
.hm-hello{position:absolute;left:${p(0)};top:${p(0)};z-index:3;mix-blend-mode:difference}
.hm-note{position:absolute;left:${p(0)};top:${p(52)};width:${e(129)};z-index:2;display:flex;flex-direction:column;gap:${e(8)}}
.hm-note__plus,.hm-social__plus{line-height:${32 / 14}}
.hm-note__body{white-space:pre-line}

/* --------------------------------------------------------- cụm trái, dưới
 * Xếp chồng từ dưới lên nên chiều cao chữ có xê dịch cũng không đội mép dưới. */
.hm-blc{position:absolute;left:${p(0)};bottom:${p(0)};z-index:3;display:flex;flex-direction:column;align-items:flex-start}
.hm-social,.hm-awards{width:${e(129)};display:flex;flex-direction:column}
.hm-social{gap:${e(8)};margin-bottom:${e(33.2)}}
.hm-awards{gap:${e(4)};margin-bottom:${e(25.2)}}
.hm-social__list{display:flex;flex-direction:column;gap:${e(4)}}

/* ------------------------------------------------------- thanh điều hướng */
.hm-nav{display:flex;align-items:center;gap:${e(4)}}
.hm-nav__box{background:${S.colorBg};border:1px solid ${S.colorHairline};border-radius:${e(4)};height:${e(60)};display:flex;align-items:center;justify-content:center}
.hm-nav__box--sq{width:${e(60)};flex:none}
.hm-nav__box--main{width:${e(253)};padding:${e(6)} ${e(6)} ${e(6)} ${e(24)};justify-content:space-between}
.hm-nav__logo{width:${e(28)};height:${e(28)}}
.hm-nav__mail{width:${e(24)};height:${e(24)}}
.hm-nav__label{display:flex;align-items:center;gap:${e(16)};color:${S.colorWhite}}
.hm-nav__grid{width:${e(48)};height:${e(48)};flex:none;background:${S.colorWhite};border-radius:${e(4)};display:grid;place-items:center}
.hm-nav__grid img{width:${e(16)};height:${e(16)}}

/* ----------------------------------------------------------------- player
 * Cả cụm là một khối rộng 220 (px thiết kế) dán vào mép trên, canh giữa ngang.
 * Con bên trong đặt theo toạ độ tương đối với khối, gốc là (850, 24) của thiết
 * kế — nên đổi lề hay đổi khổ màn thì cả cụm đi liền một mạch. */
.hm-player{position:absolute;left:50%;top:${p(S.playerY - 24)};width:${e(220)};height:${e(playerH)};margin-left:${e(-110)};z-index:3}
.hm-p__state,.hm-p__title{position:absolute;top:0;line-height:.84;cursor:pointer;transition:color .2s}
.hm-p__state{left:0}
/* Ô tên bài là một khung cắt cứng: chữ dài hơn thì chạy chứ không tràn ra lề. */
.hm-p__title{left:${e(S.titleX - 850)};width:${e(S.titleW)};overflow:hidden;text-align:left;display:block}
.hm-p__tt{display:flex;white-space:nowrap;will-change:transform}
.hm-p__tw{flex:none}
.hm-p__tw + .hm-p__tw{padding-left:${e(S.titleGap)}}
.hm-p__state:hover,.hm-p__title:hover{color:${S.colorWhite}}
.hm-spec{position:absolute;left:${e(S.specX - 850)};top:${e(specTop)};width:${e(S.specW)};height:${e(S.specH)}}
.hm-p__rule{position:absolute;left:0;top:${e(rule)};width:${e(220)};height:1px;background:${S.colorDim};opacity:.55}
.hm-p__sq{position:absolute;width:${e(6)};height:${e(6)};background:${S.colorDim};top:${e(rule + S.sqGapRule)}}
.hm-p__sq--a{left:0}
.hm-p__sq--b{left:${e(214)}}
.hm-p__ctrl{position:absolute;left:0;top:${e(ctrlTop)};width:${e(220)};height:${e(S.ctrlH)};border:1px solid ${S.colorBox};display:flex}
.hm-p__btn{flex:1 1 50%;display:flex;align-items:center;justify-content:center;gap:${e(8)};color:${S.colorWhite};transition:background .18s,color .18s}
.hm-p__btn:hover{background:rgba(255,255,255,.06)}
.hm-p__btn + .hm-p__btn{border-left:1px solid ${S.colorBox}}
.hm-p__btn img{width:${e(16)};height:${e(16)}}
.hm-p__btn[data-off='true']{color:${S.colorDim}}
.hm-p__btn[data-off='true'] img{opacity:.45}
.hm-drop{position:absolute;inset:0;display:grid;place-items:center;background:rgba(4,2,3,.86);opacity:0;transition:opacity .18s;pointer-events:none;z-index:9}
.hm-drop[data-on='true']{opacity:1}
.hm-drop span{border:1px dashed ${S.colorBox};padding:${e(24)} ${e(40)};color:${S.colorWhite}}

/* --------------------------------------------------------- cột chữ bên phải
 * Cả cụm bên phải neo theo mép PHẢI của viewport, giữ đúng khoảng cách của
 * thiết kế so với nhau: [INSPI] sát lề, rồi "]", rồi cột chữ, rồi "[". */
.hm-feed{position:absolute;right:${p(S.feedRight)};top:0;width:${e(S.feedW)};height:100%;overflow:hidden;z-index:2;
  -webkit-mask-image:linear-gradient(180deg,transparent 0,#000 ${e(S.feedFade)},#000 calc(100% - ${e(S.feedFade)}),transparent 100%);
  mask-image:linear-gradient(180deg,transparent 0,#000 ${e(S.feedFade)},#000 calc(100% - ${e(S.feedFade)}),transparent 100%)}
.hm-feed__track{position:absolute;left:0;top:0;width:100%;will-change:transform}
.hm-feed__list{display:flex;flex-direction:column;gap:${e(S.feedGap)};padding-bottom:${e(S.feedGap)}}
.hm-feed__i{line-height:.84}
.hm-marks{position:absolute;bottom:${p(250)};line-height:${32 / 14};z-index:4}
.hm-marks--open{right:${p(S.feedRight + S.feedW + 16)}}
.hm-marks--close{right:${p(S.feedRight - 17)}}
.hm-marks--tag{right:${p(0)}}
.hm-dot{position:absolute;right:${p(0)};width:${e(6)};height:${e(6)};background:${S.colorDim};z-index:4}
.hm-dot--a{top:${p(0)}}
.hm-dot--b{bottom:${p(0)}}

/* ------------------------------------------------------------ dòng mail cuối */
.hm-mail{position:absolute;left:50%;bottom:${p(0)};transform:translateX(-50%);z-index:3;mix-blend-mode:difference;display:flex;align-items:center;gap:${e(4)}}
.hm-mail__icons{display:flex;align-items:center;margin:0 ${e(6)}}
.hm-mail__icons img{width:${e(31)};height:${e(32)}}
.hm-mail__word{display:flex;align-items:center}

.hm-file{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}
`
  }

  /* ==================================================================== markup */

  function markup() {
    const I = S.imgBase
    const P = DATA.player
    const M = DATA.mail
    const K = DATA.marks

    const feedList = DATA.feed
      .map((it) => {
        const t = typeof it === 'string' ? it : it.t
        const useNumr = typeof it === 'string' ? true : it.numr !== false
        const body = (useNumr ? numr(t) : esc(t)).split('\n').join('<br>')
        return `<div class="hm-feed__i">${body}</div>`
      })
      .join('')
    const list = `<div class="hm-feed__list">${feedList}</div>`

    return `
<div class="hm-discs">
  <img class="hm-disc hm-disc--l" src="${I}disc-left.png" alt="" draggable="false">
  <img class="hm-disc hm-disc--r" src="${I}disc-right.png" alt="" draggable="false">
  <img class="hm-badge" src="${I}disc-badge.png" alt="" draggable="false">
</div>

<h1 class="hm-hello hm-disp">${esc(DATA.hello)}</h1>

<div class="hm-note hm-mono">
  <p class="hm-note__plus">[ + ]</p>
  <p class="hm-note__body">${esc(DATA.note)}</p>
</div>

<div class="hm-blc hm-mono">
  <div class="hm-social">
    <p class="hm-social__plus">[ + ]</p>
    <div class="hm-social__list">${DATA.social.map((x) => `<p>${esc(x)}</p>`).join('')}</div>
  </div>

  <div class="hm-awards">${DATA.awards.map((x) => `<p>${esc(x)}</p>`).join('')}</div>

  <nav class="hm-nav" aria-label="Chính">
    <span class="hm-nav__box hm-nav__box--sq"><img class="hm-nav__logo" src="${I}logo-kaixa.svg" alt="kaixa"></span>
    <span class="hm-nav__box hm-nav__box--main">
      <span class="hm-nav__label"><span>${esc(DATA.nav.index)}</span><span>${esc(DATA.nav.label)}</span></span>
      <button class="hm-nav__grid" type="button" aria-label="Danh mục"><img src="${I}ico-grid.svg" alt=""></button>
    </span>
    <a class="hm-nav__box hm-nav__box--sq" href="${esc(M.href)}" aria-label="Gửi mail"><img class="hm-nav__mail" src="${I}ico-mail.svg" alt=""></a>
  </nav>
</div>

<img class="hm-poster" src="${I}poster.jpg" alt="Ares Beats In Every Frame" draggable="false">

<div class="hm-player hm-mono">
  <button class="hm-p__state" type="button" data-hm-state title="Chọn file nhạc từ máy">${esc(P.empty)}</button>
  <button class="hm-p__title" type="button" data-hm-pick title="Chọn file nhạc từ máy"><span class="hm-p__tt" data-hm-tt><span class="hm-p__tw">${esc(S.audioTitle)}</span></span></button>
  <canvas class="hm-spec" data-hm-spec></canvas>
  <div class="hm-p__rule"></div>
  <div class="hm-p__sq hm-p__sq--a"></div>
  <div class="hm-p__sq hm-p__sq--b"></div>
  <div class="hm-p__ctrl">
    <button class="hm-p__btn" type="button" data-hm-play aria-pressed="false">
      <img src="${I}ico-play.svg" alt=""><span>${esc(P.play)}</span>
    </button>
    <button class="hm-p__btn" type="button" data-hm-mute aria-pressed="false">
      <img src="${I}ico-mute.svg" alt=""><span>${esc(P.mute)}</span>
    </button>
  </div>
</div>
<div class="hm-drop" data-hm-drop><span>${esc(P.drop)}</span></div>

<div class="hm-feed" data-hm-feed>
  <div class="hm-feed__track hm-mono" data-hm-track>${list}${list}</div>
</div>
<p class="hm-marks hm-marks--open hm-mono">${esc(K.open)}</p>
<p class="hm-marks hm-marks--close hm-mono">${esc(K.close)}</p>
<p class="hm-marks hm-marks--tag hm-mono">${esc(K.tag)}</p>
<div class="hm-dot hm-dot--a"></div>
<div class="hm-dot hm-dot--b"></div>

<a class="hm-mail hm-disp" href="${esc(M.href)}">
  <span class="hm-mail__word">${esc(M.word)}<span class="hm-mail__icons"><img src="${I}ico-coffee.svg" alt=""><img src="${I}ico-textile.svg" alt=""><img src="${I}ico-cap.svg" alt=""></span>${esc(M.close)}</span>
  <span>${esc(M.address)}</span>
</a>

<input class="hm-file" type="file"${S.audioAccept ? ` accept="${esc(S.audioAccept)}"` : ''} multiple data-hm-file>
`
  }

  /* ================================================================ âm thanh */

  const player = {
    el: null, // <audio>
    ctx: null,
    analyser: null,
    gain: null,
    node: null,
    bins: null,
    playlist: [],
    index: -1,
    muted: false,
    ready: false, // đã nối được graph chưa
    wired: false,
  }

  // AudioContext chỉ được mở khoá sau một thao tác của người dùng, nên gọi hàm
  // này trong handler của click chứ không phải lúc trang vừa tải.
  function ensureGraph() {
    if (player.ready) {
      if (player.ctx.state === 'suspended') player.ctx.resume()
      return true
    }
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC || !player.el) return false
    try {
      player.ctx = new AC()
      player.analyser = player.ctx.createAnalyser()
      player.analyser.fftSize = 2048
      player.analyser.smoothingTimeConstant = clamp(S.specSmoothing, 0, 0.95)
      player.gain = player.ctx.createGain()
      player.gain.gain.value = player.muted ? 0 : 1
      player.node = player.ctx.createMediaElementSource(player.el)
      player.node.connect(player.analyser)
      player.analyser.connect(player.gain)
      player.gain.connect(player.ctx.destination)
      player.bins = new Float32Array(player.analyser.frequencyBinCount)
      player.ready = true
      if (player.ctx.state === 'suspended') player.ctx.resume()
      return true
    } catch (err) {
      // Không nối được thì trang vẫn phát nhạc, chỉ là sound bar chạy chế độ chờ.
      console.warn('[hello-mate] Web Audio không dùng được:', err)
      player.ready = false
      return false
    }
  }

  const titleFromName = (name) =>
    String(name)
      .replace(/\.[a-z0-9]+$/i, '')
      .replace(/[_-]+/g, ' ')
      .trim()
      .toUpperCase()

  function loadTracks(files) {
    const list = Array.from(files).filter(
      (f) => (f.type && f.type.startsWith('audio/')) || /\.(mp3|wav|ogg|m4a|aac|flac|opus|webm)$/i.test(f.name)
    )
    if (!list.length) return false
    player.playlist.forEach((t) => t.url.startsWith('blob:') && URL.revokeObjectURL(t.url))
    player.playlist = list.map((f) => ({ url: URL.createObjectURL(f), title: titleFromName(f.name) }))
    player.index = -1
    playIndex(0)
    return true
  }

  // Hai bài cài sẵn trong CONFIG, dựng thành đúng cái danh sách mà người dùng
  // nhập file cũng dùng. Nhờ vậy nhảy bài / phím `n` / hết bài tự sang bài kế
  // chạy y hệt nhau, không phải viết nhánh riêng cho bài mặc định.
  function defaultTracks() {
    const ds = []
    // Quét `audioSrc`, `audioSrc2` … `audioSrc8` theo đúng thứ tự. Khai thêm
    // một cặp trong CONFIG là có thêm bài, không phải sửa gì ở đây.
    for (let i = 1; i <= 8; i++) {
      const hau = i === 1 ? '' : String(i)
      const url = S['audioSrc' + hau]
      if (url) ds.push({ url, title: S['audioTitle' + hau] || '' })
    }
    return ds
  }

  function playIndex(i) {
    const t = player.playlist[i]
    if (!t) return
    player.index = i
    player.el.src = t.url
    // Nhiều bài thì hết bài nhảy sang bài kế, một bài thì lặp lại.
    player.el.loop = S.audioLoop && player.playlist.length < 2
    setTitle(t.title)
    ensureGraph()
    player.el.play().catch(() => {})
  }

  function nextTrack() {
    if (player.playlist.length < 2) return false
    playIndex((player.index + 1) % player.playlist.length)
    return true
  }

  /* =================================================================== sound bar */

  const spec = { cvs: null, ctx: null, level: null, peakV: null, peakT: null, map: null, cssW: 0 }

  // ĐỪNG gọi hàm này mỗi khung. getBoundingClientRect() ép trình duyệt tính lại
  // layout ngay tại chỗ; gọi 60 lần/giây trên trang này (đang có cột chữ chạy,
  // hai đĩa quay) là đủ để thấy đĩa khựng từng nhịp. Chỉ gọi khi đổi cỡ cửa sổ
  // và theo nhịp thưa trong tick().
  function specResize() {
    const c = spec.cvs
    if (!c) return
    const r = c.getBoundingClientRect()
    if (!r.width || !r.height) return
    spec.cssW = r.width
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const w = Math.round(r.width * dpr)
    const h = Math.round(r.height * dpr)
    if (c.width !== w || c.height !== h) {
      c.width = w
      c.height = h
    }
    // Vẽ bằng toạ độ px của bản thiết kế cho khỏi phải quy đổi ở mọi chỗ.
    spec.ctx.setTransform(w / S.specW, 0, 0, h / S.specH, 0, 0)
  }

  function buildMap() {
    if (!player.ready) return
    const nyq = player.ctx.sampleRate / 2
    const nBin = player.analyser.frequencyBinCount
    const n = Math.max(1, Math.round(S.specBars))
    const map = []
    for (let i = 0; i < n; i++) {
      const f0 = S.specMinHz * Math.pow(S.specMaxHz / S.specMinHz, i / n)
      const f1 = S.specMinHz * Math.pow(S.specMaxHz / S.specMinHz, (i + 1) / n)
      const b0 = clamp(Math.floor((f0 / nyq) * nBin), 0, nBin - 1)
      const b1 = clamp(Math.max(Math.ceil((f1 / nyq) * nBin), b0 + 1), 1, nBin)
      map.push([b0, b1])
    }
    spec.map = map
  }

  function specTargets(t, n) {
    // Dùng lại một mảng đã cấp phát sẵn. Bản cũ tạo mảng mới mỗi khung — 60 mảng
    // rác mỗi giây, đủ để bộ dọn bộ nhớ thỉnh thoảng chạy và làm đĩa khựng.
    if (!spec.target || spec.target.length !== n) spec.target = new Float32Array(n)
    const out = spec.target
    out.fill(0)
    const live = player.ready && player.el && !player.el.paused

    if (live) {
      if (!spec.map || spec.map.length !== n) buildMap()
      if (!spec.map) return out
      player.analyser.getFloatFrequencyData(player.bins)
      const span = S.specCeilDb - S.specFloorDb || 1
      for (let i = 0; i < n; i++) {
        const seg = spec.map[i]
        let peak = -Infinity
        for (let b = seg[0]; b < seg[1]; b++) if (player.bins[b] > peak) peak = player.bins[b]
        if (!isFinite(peak)) peak = S.specFloorDb
        // Phổ nhạc dốc xuống ở dải cao, bù lại cho các cột bên phải không lép.
        out[i] = clamp((peak - S.specFloorDb) / span + (S.specTilt * i) / n, 0, 1)
      }
      return out
    }

    // Chế độ chờ: sóng nhỏ lăn tăn cho trang khỏi chết cứng.
    const amp = S.specIdle
    if (amp <= 0) return out
    const sp = S.specIdleSpeed
    for (let i = 0; i < n; i++) {
      const x = i / n
      const w =
        Math.sin(t * sp * 1.7 + x * 7.3) * 0.5 +
        Math.sin(t * sp * 1.1 + x * 3.1 + 1.7) * 0.3 +
        Math.sin(t * sp * 2.6 + x * 11.7 + 4.2) * 0.2
      out[i] = clamp(amp * (0.55 + 0.45 * w) * (0.35 + 0.65 * Math.sin(Math.PI * x)), 0, 1)
    }
    return out
  }

  function specDraw(dt, t) {
    const g = spec.ctx
    if (!g) return
    // KHÔNG đo lại layout ở đây — xem ghi chú ở specResize(). tick() gọi nó theo
    // nhịp thưa, còn onResize() gọi ngay khi cần.
    const n = Math.max(1, Math.round(S.specBars))
    if (!spec.level || spec.level.length !== n) {
      spec.level = new Float32Array(n)
      spec.peakV = new Float32Array(n)
      spec.peakT = new Float32Array(n)
      spec.map = null
    }

    const target = specTargets(t, n)
    const fall = S.specFall * dt
    for (let i = 0; i < n; i++) {
      // Lên thì bám ngay, xuống thì rơi từ từ — đúng kiểu kim đồng hồ VU.
      if (target[i] >= spec.level[i]) spec.level[i] = target[i]
      else spec.level[i] = Math.max(target[i], spec.level[i] - fall)

      if (spec.level[i] >= spec.peakV[i]) {
        spec.peakV[i] = spec.level[i]
        spec.peakT[i] = t
      } else if (t - spec.peakT[i] > S.specPeakHold) {
        spec.peakV[i] = Math.max(spec.level[i], spec.peakV[i] - S.specPeakFall * dt)
      }
    }

    const cell = S.specSegH + S.specSegGap
    const nSeg = Math.max(1, Math.floor((S.specH + S.specSegGap) / cell))
    const barW = Math.max(0.4, (S.specW - S.specGap * (n - 1)) / n)

    g.clearRect(0, 0, S.specW, S.specH)
    g.fillStyle = S.colorWhite
    for (let i = 0; i < n; i++) {
      const x = i * (barW + S.specGap)
      const lit = Math.round(spec.level[i] * nSeg)
      for (let s = 0; s < lit; s++) g.fillRect(x, S.specH - (s + 1) * cell + S.specSegGap, barW, S.specSegH)
      if (S.specPeak) {
        const ps = Math.round(spec.peakV[i] * nSeg)
        if (ps > lit && ps <= nSeg) g.fillRect(x, S.specH - ps * cell + S.specSegGap, barW, S.specSegH)
      }
    }
  }

  /* ====================================================================== dựng */

  let root = null
  let raf = 0
  let last = 0
  let clock = 0
  let spin = 0 // độ
  let spinRate = 0 // 0..1 — phần trăm tốc độ đang đạt
  let tickFrame = 0
  let lastDeg = null // góc đã ghi vào transform lần gần nhất
  let feedY = 0
  let feedH = 0
  let els = null
  let globalsWired = false

  // Tên bài chạy ngang kiểu máy nghe nhạc cũ: chỉ chạy khi chữ dài hơn ô, và
  // chạy bằng cách nhân đôi chữ rồi dịch đúng một chu kỳ nên nối vòng không hở.
  const marq = { on: false, step: 0, x: 0 }

  function setTitle(txt) {
    if (!els || !els.tt) return
    els.tt.firstElementChild.textContent = txt || S.audioTitle
    measureTitle()
  }

  function measureTitle() {
    if (!els || !els.tt) return
    marq.on = false
    marq.x = 0
    marq.step = 0
    els.tt.style.transform = ''
    while (els.tt.children.length > 1) els.tt.lastElementChild.remove()

    const first = els.tt.firstElementChild
    if (!first) return
    const w = first.getBoundingClientRect().width
    const win = els.title.clientWidth
    if (w <= win + 0.5) return // vừa ô thì đứng yên

    els.tt.appendChild(first.cloneNode(true))
    // Bản sao có padding-left = titleGap, nên khoảng cách giữa hai điểm bắt đầu
    // chính là một chu kỳ. Đo thay vì tính để khỏi lệch khi đổi cỡ chữ.
    marq.step =
      els.tt.children[1].getBoundingClientRect().left - els.tt.children[0].getBoundingClientRect().left
    marq.on = marq.step > 1
  }

  function setPlayUI(playing) {
    if (!els) return
    const P = DATA.player
    const has = !!(player.el && player.el.src)
    els.playIcon.src = S.imgBase + (playing ? 'ico-pause.svg' : 'ico-play.svg')
    els.playLabel.textContent = playing ? P.pause : P.play
    els.play.setAttribute('aria-pressed', String(playing))
    els.state.textContent = !has ? P.empty : playing ? P.playing : P.paused
  }

  function setMuteUI() {
    if (!els) return
    const m = player.muted
    els.muteIcon.src = S.imgBase + (m ? 'ico-volume.svg' : 'ico-mute.svg')
    els.muteLabel.textContent = m ? DATA.player.unmute : DATA.player.mute
    els.mute.setAttribute('aria-pressed', String(m))
    els.mute.dataset.off = String(m)
  }

  function toggleMute() {
    player.muted = !player.muted
    if (player.gain) player.gain.gain.value = player.muted ? 0 : 1
    else if (player.el) player.el.muted = player.muted
    setMuteUI()
  }

  function togglePlay() {
    if (!player.el) return
    if (!player.el.src) {
      els.file.click() // chưa có bài thì mở hộp chọn file luôn
      return
    }
    ensureGraph()
    if (player.el.paused) player.el.play().catch(() => {})
    else player.el.pause()
  }

  function measureFeed() {
    if (!els || !els.track) return
    const one = els.track.firstElementChild
    if (!one) return
    // Track chứa đúng hai bản danh sách nối đuôi; chiều cao một bản là chu kỳ.
    feedH = one.getBoundingClientRect().height
  }

  function tick(now) {
    raf = requestAnimationFrame(tick)
    if (!last) last = now
    let dt = (now - last) / 1000
    last = now
    if (dt > 0.1) dt = 0.1 // tab vừa quay lại thì đừng nhảy cóc
    clock += dt

    // Đo lại layout theo nhịp thưa (~2 lần/giây) thay vì mỗi khung.
    tickFrame++
    if (tickFrame % 30 === 0) specResize()

    // --- đĩa: lên/xuống tốc có quán tính ---
    const want = player.el && !player.el.paused ? 1 : 0
    const tau = (want > spinRate ? S.discSpinUp : S.discSpinDown) / 3
    spinRate += (want - spinRate) * (tau > 0 ? 1 - Math.exp(-dt / tau) : 1)
    if (Math.abs(spinRate - want) < 0.0005) spinRate = want
    spin = (spin + (S.discReverse ? -1 : 1) * S.discRpm * 6 * spinRate * dt) % 360
    // Chỉ ghi lại transform khi góc thật sự đổi. Lúc nhạc dừng, đĩa đứng yên mà
    // bản cũ vẫn dựng 4 chuỗi và ghi 3 lần vào style ở MỖI khung — vừa tạo rác
    // vừa bắt trình duyệt kiểm tra lại style của ba phần tử lớn.
    const deg = Math.round(spin * 100) / 100
    if (deg !== lastDeg) {
      lastDeg = deg
      const rot = 'rotate(' + deg + 'deg)'
      els.discL.style.transform = 'translate(-50%,-50%) ' + rot
      els.discR.style.transform = 'translate(-50%,-50%) ' + rot
      els.badge.style.transform = 'translate(-50%,-50%) scaleY(-1) ' + rot
    }

    const scale = spec.cssW ? spec.cssW / S.specW : 1 // px thiết kế -> px màn hình

    // --- tên bài chạy ngang khi dài hơn ô ---
    if (marq.on) {
      marq.x -= S.titleSpeed * scale * dt
      if (marq.x <= -marq.step) marq.x += marq.step
      els.tt.style.transform = `translateX(${marq.x}px)`
    }

    // --- cột chữ: chạy loop, dịch đúng một bản danh sách rồi lặp lại ---
    if (!feedH) measureFeed()
    if (feedH > 0) {
      const dir = S.feedDir === 'up' ? -1 : 1
      feedY += dir * S.feedSpeed * scale * dt
      if (feedY >= 0) feedY -= feedH
      if (feedY <= -feedH) feedY += feedH
      els.track.style.transform = `translate3d(0,${feedY}px,0)`
    }

    specDraw(dt, clock)
  }

  function onResize() {
    specResize()
    measureTitle()
    feedH = 0
  }

  function wire() {
    els.play.addEventListener('click', togglePlay)
    els.mute.addEventListener('click', toggleMute)
    els.title.addEventListener('click', () => els.file.click())
    els.state.addEventListener('click', () => els.file.click())

    if (S.discClickToPlay) {
      els.discL.addEventListener('click', togglePlay)
      els.discR.addEventListener('click', togglePlay)
    }

    els.file.addEventListener('change', () => {
      if (els.file.files && els.file.files.length) loadTracks(els.file.files)
      els.file.value = ''
    })

    // Kéo–thả file nhạc vào bất cứ đâu trên trang.
    let dragDepth = 0
    const showDrop = (on) => {
      if (els) els.drop.dataset.on = String(on)
    }
    root.addEventListener('dragenter', (ev) => {
      ev.preventDefault()
      dragDepth++
      showDrop(true)
    })
    root.addEventListener('dragover', (ev) => ev.preventDefault())
    root.addEventListener('dragleave', () => {
      dragDepth = Math.max(0, dragDepth - 1)
      if (!dragDepth) showDrop(false)
    })
    root.addEventListener('drop', (ev) => {
      ev.preventDefault()
      dragDepth = 0
      showDrop(false)
      if (ev.dataTransfer && ev.dataTransfer.files) loadTracks(ev.dataTransfer.files)
    })

    // <audio>, document và window sống lâu hơn giao diện (rebuild không dựng
    // lại chúng), nên chỉ gắn listener một lần cho khỏi cộng dồn.
    if (!player.wired) {
      player.wired = true
      player.el.addEventListener('play', () => setPlayUI(true))
      player.el.addEventListener('pause', () => setPlayUI(false))
      player.el.addEventListener('ended', () => {
        if (!nextTrack()) setPlayUI(false)
      })
      player.el.addEventListener('error', () => {
        if (player.el.src && els) els.state.textContent = DATA.player.error
      })
    }
    if (!globalsWired) {
      globalsWired = true
      // Phím tắt: cách = play/pause, M = tắt/bật tiếng, N = bài kế.
      document.addEventListener('keydown', (ev) => {
        if (!els) return
        if (ev.target && ev.target.closest && ev.target.closest('input,textarea,select,[contenteditable]')) return
        if (ev.code === 'Space') {
          ev.preventDefault()
          togglePlay()
        } else if (ev.key === 'm' || ev.key === 'M') toggleMute()
        else if (ev.key === 'n' || ev.key === 'N') nextTrack()
      })
      window.addEventListener('resize', onResize)
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(onResize)
    }
  }

  function mount() {
    const host = S.mount ? document.querySelector(S.mount) : null
    const stage = document.createElement('div')
    stage.className = 'hm-stage'
    root = document.createElement('div')
    root.className = 'hm'
    root.innerHTML = markup()
    stage.appendChild(root)
    ;(host || document.body).appendChild(stage)
    document.documentElement.setAttribute('data-hm', '')

    els = {
      stage,
      discL: root.querySelector('.hm-disc--l'),
      discR: root.querySelector('.hm-disc--r'),
      badge: root.querySelector('.hm-badge'),
      track: root.querySelector('[data-hm-track]'),
      state: root.querySelector('[data-hm-state]'),
      title: root.querySelector('[data-hm-pick]'),
      tt: root.querySelector('[data-hm-tt]'),
      play: root.querySelector('[data-hm-play]'),
      mute: root.querySelector('[data-hm-mute]'),
      file: root.querySelector('[data-hm-file]'),
      drop: root.querySelector('[data-hm-drop]'),
    }
    els.playIcon = els.play.querySelector('img')
    els.playLabel = els.play.querySelector('span')
    els.muteIcon = els.mute.querySelector('img')
    els.muteLabel = els.mute.querySelector('span')

    spec.cvs = root.querySelector('[data-hm-spec]')
    spec.ctx = spec.cvs.getContext('2d')

    // Dựng lại giao diện thì giữ nguyên <audio> và cả graph Web Audio đang nối
    // vào nó — createMediaElementSource chỉ gọi được một lần cho mỗi phần tử.
    const fresh = !player.el
    if (fresh) {
      player.el = new Audio()
      player.el.preload = 'auto'
      player.el.crossOrigin = 'anonymous'
      // Nạp danh sách chứ không gán thẳng src: có hai bài thì hết bài này tự
      // sang bài kia. KHÔNG gọi playIndex() ở đây — hàm đó phát luôn, mà lúc
      // trang vừa dựng thì trình duyệt còn chưa cho phát.
      player.playlist = defaultTracks()
      if (player.playlist.length) {
        player.index = 0
        player.el.src = player.playlist[0].url
      }
    }
    player.el.loop = S.audioLoop && player.playlist.length < 2
    player.el.volume = clamp(S.volume, 0, 1)

    wire()
    const cur = player.playlist[player.index]
    setTitle(cur ? cur.title : S.audioTitle)
    setPlayUI(!!player.el.src && !player.el.paused)
    setMuteUI()
    specResize()
    measureFeed()
    if (fresh && S.audioSrc && S.autoplay) player.el.play().catch(() => {})
    if (!raf) raf = requestAnimationFrame(tick)
  }

  function unmount() {
    cancelAnimationFrame(raf)
    raf = 0
    last = 0
    if (els && els.stage) els.stage.remove()
    root = null
    els = null
    document.documentElement.removeAttribute('data-hm')
  }

  function rebuild() {
    unmount()
    style.textContent = css()
    mount()
  }

  /* --------------------------------------------------------------- vòng quét
   * Bảng tinh chỉnh (kx-devtools.js) ghi thẳng vào CONFIG rồi thôi, không gọi
   * hàm nào cả — nên phải tự soi xem có gì đổi để áp lại.
   * -------------------------------------------------------------------------- */

  // Những key đổi thì phải viết lại CSS
  const CSS_KEYS = [
    'fitMode','designW','designH','minUnit','maxUnit','capTrim','padding',
    'titleX','titleW','titleGap',
    'playerY','ruleY','specGapRule','sqGapRule','ctrlGapRule',
    'specX','specW','specH','feedRight','feedW','feedGap','feedFade',
    'discSize','discGap','discY','discBadgeW','discBadgeH','discBadgeDX','discClickToPlay',
    'colorBg','colorDim','colorWhite','colorDisplay','colorHairline','colorBox',
  ]
  // Những key đổi thì phải dựng lại cả cây DOM
  const DOM_KEYS = ['mount', 'imgBase']

  let sigCss = ''
  let sigDom = ''
  const sig = (keys) => keys.map((k) => k + '=' + S[k]).join('|')

  function sweep() {
    if (!S.enabled) {
      if (root) unmount()
      return
    }
    if (!root) {
      style.textContent = css()
      mount()
      sigCss = sig(CSS_KEYS)
      sigDom = sig(DOM_KEYS)
      return
    }

    const d = sig(DOM_KEYS)
    if (d !== sigDom) {
      sigDom = d
      sigCss = sig(CSS_KEYS)
      rebuild()
      return
    }
    const c = sig(CSS_KEYS)
    if (c !== sigCss) {
      sigCss = c
      style.textContent = css()
      onResize()
    }

    // Các giá trị áp được thẳng lúc chạy, không cần dựng lại gì
    if (player.el) {
      const v = clamp(S.volume, 0, 1)
      if (Math.abs(player.el.volume - v) > 0.001) player.el.volume = v
      const lp = S.audioLoop && player.playlist.length < 2
      if (player.el.loop !== lp) player.el.loop = lp
    }
    if (player.analyser) {
      const sm = clamp(S.specSmoothing, 0, 0.95)
      if (Math.abs(player.analyser.smoothingTimeConstant - sm) > 0.001) player.analyser.smoothingTimeConstant = sm
    }
    // Đổi số cột hoặc dải tần thì bảng chia bin không còn đúng nữa
    if (spec.map && (spec.map.length !== Math.round(S.specBars) || spec.mapMin !== S.specMinHz || spec.mapMax !== S.specMaxHz)) {
      spec.map = null
    }
    spec.mapMin = S.specMinHz
    spec.mapMax = S.specMaxHz
  }

  if (S.enabled) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', sweep, { once: true })
    else sweep()
    setInterval(sweep, 300)
  }

  // Chỉ để bảng tinh chỉnh (kx-devtools.js) đọc/ghi lúc chạy. Bản production
  // không cần dùng tới, xoá dòng này cũng không ảnh hưởng trang.
  window.KX_HELLO_MATE = {
    config: S,
    defaults: Object.freeze({ ...CONFIG }),
    data: DATA,
    player,
    rebuild,
    sweep,
  }
})()
