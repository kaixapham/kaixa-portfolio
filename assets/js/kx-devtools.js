/* =============================================================================
 * kaixa Portfolio — bảng tinh chỉnh (CHỈ DÙNG KHI LÀM VIỆC, KHÔNG GỬI KHI BÀN GIAO)
 * -----------------------------------------------------------------------------
 * File này chỉ dựng cái nút vuông ở góc dưới phải và bảng slider để chỉnh các
 * hiệu ứng đang chạy trên trang. Nó KHÔNG chứa hiệu ứng nào cả — mọi hiệu ứng
 * nằm trong các file riêng (kx-hello-mate.js, kx-disc-fx.js, ...).
 *
 * Khi bàn giao cho dev Webflow: chỉ cần XOÁ thẻ <script> nạp file này. Trang sẽ
 * chạy y nguyên với các giá trị đang ghi trong CONFIG của từng file hiệu ứng.
 * Nút "Copy code" trong bảng sẽ xuất đúng khối CONFIG để dán vào file hiệu ứng.
 * ========================================================================== */
(() => {
  'use strict'

  // Trang studio đặt window.KX_DEVTOOLS_STORE trước khi nạp file này để tinh
  // chỉnh trên một bộ nhớ riêng, không đụng vào giá trị đang chạy ở site chính.
  const STORE_KEY = window.KX_DEVTOOLS_STORE || 'kx-devtools'

  // Khai báo module cần tinh chỉnh. Thêm hiệu ứng mới thì thêm một mục ở đây.
  // Ba khổ màn để chia setting. Suy ra từ TÊN KEY chứ không phải khai tay:
  // cả dự án đã theo lệ mb* = điện thoại, tb* = máy tính bảng, nên gắn tay lại
  // cho vài trăm field vừa mất công vừa dễ sót. Field nào lệ không bắt được thì
  // khai `bp: 'mb' | 'tb' | 'dt'` ngay trên field đó là đè lên phép suy.
  const KHUC = [
    { id: 'dt', ten: 'Desktop', ghi: '> 991px' },
    { id: 'tb', ten: 'Máy tính bảng', ghi: '≤ 991px' },
    { id: 'mb', ten: 'Điện thoại', ghi: '≤ 600px' },
  ]
  function khucCua(field) {
    if (field.bp) return field.bp
    const k = String(field.k || '')
    if (/^mb([A-Z0-9]|$)/.test(k) || /Mobile/.test(k)) return 'mb'
    if (/^tb([A-Z0-9]|$)/.test(k) || /Tablet/.test(k)) return 'tb'
    return 'dt'
  }

  const MODULES = [
    {
      id: 'helloMate',
      tab: 'Hello Mate',
      title: 'Trang (Hello, Mate) — nhạc, đĩa quay, sound bar',
      file: 'assets/js/kx-hello-mate.js',
      api: () => window.KX_HELLO_MATE,
      groups: [
        {
          name: 'Nhạc',
          fields: [
            { k: 'audioSrc', label: 'Bài 1 (để trống = tự nhập)', type: 'file' },
            { k: 'audioTitle', label: 'Tên bài 1', type: 'text' },
            { k: 'audioSrc2', label: 'Bài 2 (để trống = chỉ một bài)', type: 'file' },
            { k: 'audioTitle2', label: 'Tên bài 2', type: 'text', when: (s) => !!s.audioSrc2 },
            { k: 'audioSrc3', label: 'Bài 3', type: 'file', when: (s) => !!s.audioSrc2 },
            { k: 'audioTitle3', label: 'Tên bài 3', type: 'text', when: (s) => !!s.audioSrc3 },
            { k: 'audioSrc4', label: 'Bài 4', type: 'file', when: (s) => !!s.audioSrc3 },
            { k: 'audioTitle4', label: 'Tên bài 4', type: 'text', when: (s) => !!s.audioSrc4 },
            { k: 'volume', label: 'Âm lượng', type: 'range', min: 0, max: 1, step: 0.01 },
            { k: 'audioLoop', label: 'Lặp lại khi chỉ có một bài', type: 'bool' },
            { k: 'audioAccept', label: 'Bộ lọc hộp chọn file (để trống = hiện mọi file)', type: 'text' },
            { k: 'autoplay', label: 'Tự phát khi mở trang', type: 'bool' },
          ],
        },
        {
          name: 'Ô tên bài (chạy ngang)',
          fields: [
            { k: 'titleX', label: 'Mép trái ô tên', type: 'range', min: 850, max: 1040, step: 1 },
            { k: 'titleW', label: 'Bề rộng ô tên', type: 'range', min: 40, max: 220, step: 1 },
            { k: 'titleSpeed', label: 'Tốc độ chữ chạy', type: 'range', min: 0, max: 120, step: 1, unit: '/s' },
            { k: 'titleGap', label: 'Khe giữa hai lượt chữ', type: 'range', min: 8, max: 120, step: 1 },
          ],
        },
        {
          name: 'Đĩa quay',
          fields: [
            { k: 'discRpm', label: 'Tốc độ quay', type: 'range', min: 0, max: 120, step: 0.5, unit: ' vòng/phút' },
            { k: 'discSpinUp', label: 'Thời gian lên tốc', type: 'range', min: 0, max: 8, step: 0.1, unit: 's' },
            { k: 'discSpinDown', label: 'Thời gian tuột tốc', type: 'range', min: 0, max: 8, step: 0.1, unit: 's' },
            { k: 'discReverse', label: 'Quay ngược chiều kim đồng hồ', type: 'bool' },
            { k: 'discClickToPlay', label: 'Bấm vào đĩa = play/pause', type: 'bool' },
            // Tâm hai đĩa suy ra từ hai số này, đối xứng qua tâm trang — nên
            // phóng to là chúng nở ra hai bên chứ không bao giờ chạm nhau.
            { k: 'discSize', label: 'Đường kính đĩa', type: 'range', min: 300, max: 1600, step: 1 },
            { k: 'discGap', label: 'Khe hở giữa hai đĩa', type: 'range', min: 0, max: 400, step: 1 },
            { k: 'discY', label: 'Tâm đĩa (dọc)', type: 'range', min: 200, max: 900, step: 0.5 },
            { k: 'discBadgeDX', label: 'Vòng nhãn lệch ngang', type: 'range', min: -40, max: 40, step: 0.5 },
            { k: 'discBadgeW', label: 'Vòng nhãn — rộng', type: 'range', min: 0, max: 300, step: 1 },
            { k: 'discBadgeH', label: 'Vòng nhãn — cao', type: 'range', min: 0, max: 300, step: 1 },
          ],
        },
        {
          name: 'Sound bar — hình dạng',
          fields: [
            { k: 'specBars', label: 'Số cột', type: 'range', min: 8, max: 96, step: 1 },
            { k: 'specGap', label: 'Khe giữa hai cột', type: 'range', min: 0, max: 12, step: 0.1 },
            { k: 'specSegH', label: 'Cao mỗi ô vuông', type: 'range', min: 0.5, max: 12, step: 0.1 },
            { k: 'specSegGap', label: 'Khe giữa hai ô', type: 'range', min: 0, max: 10, step: 0.1 },
            { k: 'specPeak', label: 'Có ô đỉnh giữ lại', type: 'bool' },
            { k: 'specPeakHold', label: 'Giữ đỉnh', type: 'range', min: 0, max: 3, step: 0.05, unit: 's', when: (s) => s.specPeak },
            { k: 'specPeakFall', label: 'Đỉnh rơi nhanh', type: 'range', min: 0.1, max: 6, step: 0.05, when: (s) => s.specPeak },
            { k: 'specX', label: 'Vị trí ngang', type: 'range', min: 700, max: 1100, step: 1 },
            { k: 'specW', label: 'Bề rộng', type: 'range', min: 60, max: 600, step: 1 },
            { k: 'specH', label: 'Chiều cao (mọc lên từ đường kẻ)', type: 'range', min: 10, max: 260, step: 1 },
          ],
        },
        {
          // Cả cụm lấy ĐƯỜNG KẺ làm mốc: sound bar mọc lên từ đó, ô vuông và
          // khung PLAY/MUTE treo bên dưới. Kéo "Cả cụm lên/xuống" là đi liền mạch.
          name: 'Cụm player — xê dịch & giãn cách',
          fields: [
            { k: 'playerY', label: 'Cả cụm lên/xuống', type: 'range', min: -40, max: 400, step: 1 },
            { k: 'ruleY', label: 'Đường kẻ (mốc của cụm)', type: 'range', min: 40, max: 500, step: 1 },
            { k: 'specGapRule', label: 'Đáy sound bar → đường kẻ', type: 'range', min: 0, max: 80, step: 1 },
            { k: 'sqGapRule', label: 'Đường kẻ → ô vuông hai đầu', type: 'range', min: -20, max: 80, step: 1 },
            { k: 'ctrlGapRule', label: 'Đường kẻ → khung PLAY/MUTE', type: 'range', min: 0, max: 160, step: 1 },
            { k: 'ctrlH', label: 'Chiều cao khung PLAY/MUTE (nút BURNING MODE bám theo)', type: 'range', min: 20, max: 96, step: 1 },
          ],
        },
        {
          name: 'Sound bar — bám nhạc',
          fields: [
            { k: 'specFloorDb', label: 'Ngưỡng im lặng', type: 'range', min: -120, max: -40, step: 1, unit: ' dB' },
            { k: 'specCeilDb', label: 'Ngưỡng kịch trần', type: 'range', min: -60, max: 0, step: 1, unit: ' dB' },
            { k: 'specTilt', label: 'Bù dải cao', type: 'range', min: 0, max: 1.5, step: 0.05 },
            { k: 'specMinHz', label: 'Tần số thấp nhất', type: 'range', min: 20, max: 400, step: 5, unit: ' Hz' },
            { k: 'specMaxHz', label: 'Tần số cao nhất', type: 'range', min: 2000, max: 20000, step: 100, unit: ' Hz' },
            { k: 'specSmoothing', label: 'Làm mượt tín hiệu', type: 'range', min: 0, max: 0.95, step: 0.01 },
            { k: 'specFall', label: 'Tốc độ cột rơi', type: 'range', min: 0.5, max: 20, step: 0.1 },
            { k: 'specIdle', label: 'Nhấp nhô khi dừng nhạc', type: 'range', min: 0, max: 0.6, step: 0.01 },
            { k: 'specIdleSpeed', label: 'Tốc độ lúc dừng', type: 'range', min: 0, max: 3, step: 0.05, when: (s) => s.specIdle > 0 },
          ],
        },
        {
          name: 'Cột chữ bên phải',
          fields: [
            { k: 'feedSpeed', label: 'Tốc độ chạy', type: 'range', min: 0, max: 160, step: 1, unit: '/s' },
            {
              k: 'feedDir',
              label: 'Hướng chạy',
              type: 'enum',
              options: [
                ['down', 'Từ trên xuống'],
                ['up', 'Từ dưới lên'],
              ],
            },
            { k: 'feedRight', label: 'Cách lề phải thêm', type: 'range', min: 0, max: 300, step: 1 },
            { k: 'feedW', label: 'Bề rộng cột', type: 'range', min: 60, max: 260, step: 1 },
            { k: 'feedGap', label: 'Khe giữa hai mục', type: 'range', min: 0, max: 40, step: 1 },
            { k: 'feedFade', label: 'Mờ dần hai đầu', type: 'range', min: 0, max: 200, step: 2 },
          ],
        },
        {
          name: 'Khung & lề',
          fields: [
            { k: 'enabled', label: 'Bật trang', type: 'bool' },
            { k: 'padding', label: 'Lề quanh viewport', type: 'range', min: 0, max: 120, step: 1 },
            { k: 'minUnit', label: 'Đơn vị gốc — nhỏ nhất', type: 'range', min: 3, max: 16, step: 0.5, unit: 'px' },
            { k: 'maxUnit', label: 'Đơn vị gốc — lớn nhất', type: 'range', min: 10, max: 48, step: 0.5, unit: 'px' },
            { k: 'capTrim', label: 'Bù cap-height chữ hiển thị', type: 'range', min: 0.5, max: 1, step: 0.01 },
          ],
        },
        {
          name: 'Màu',
          fields: [
            { k: 'colorBg', label: 'Nền', type: 'text' },
            { k: 'colorDim', label: 'Chữ phụ', type: 'text' },
            { k: 'colorWhite', label: 'Chữ chính / sound bar', type: 'text' },
            { k: 'colorDisplay', label: 'Chữ PP Editorial', type: 'text' },
            { k: 'colorHairline', label: 'Viền ô nav', type: 'text' },
            { k: 'colorBox', label: 'Viền ô play/mute', type: 'text' },
          ],
        },
      ],
    },
    {
      id: 'blaze',
      tab: 'Lửa',
      title: 'Lửa — phủ trang hoặc đốt một cụm chữ',
      file: 'assets/js/kx-blaze.js',
      api: () => window.KX_BLAZE,
      groups: [
        {
          name: 'Kiểu',
          fields: [
            { k: 'enabled', label: 'Bật lửa', type: 'bool' },
            {
              k: 'mode',
              label: 'Kiểu lửa',
              type: 'enum',
              options: [
                ['page', 'Lớp lửa phủ trang'],
                ['text', 'Đốt một cụm chữ'],
              ],
            },
            { k: 'textTarget', label: 'Cụm bị đốt', type: 'text', when: (s) => s.mode === 'text' },
            { k: 'padY', label: 'Nới khung xuống dưới', type: 'range', min: 0, max: 3, step: 0.05, when: (s) => s.mode === 'text' },
            { k: 'strength', label: 'Độ méo của chữ', type: 'range', min: 0, max: 0.3, step: 0.005, when: (s) => s.mode === 'text' },
          ],
        },
        {
          name: 'Chất lửa',
          fields: [
            {
              k: 'palette',
              label: 'Bảng màu',
              type: 'enum',
              options: [
                ['fire', 'Lửa cam đỏ'],
                ['grey', 'Xám trắng (hợp tông trang)'],
              ],
            },
            { k: 'scale', label: 'Độ mịn của vân', type: 'range', min: 0.5, max: 30, step: 0.5 },
            { k: 'speed', label: 'Tốc độ bốc lên', type: 'range', min: 0, max: 4, step: 0.05 },
            { k: 'height', label: 'Lửa cao', type: 'range', min: 0.05, max: 1.5, step: 0.01 },
            { k: 'sparks', label: 'Tàn lửa', type: 'range', min: 0, max: 2, step: 0.05 },
            { k: 'smoke', label: 'Khói', type: 'range', min: 0, max: 2, step: 0.05 },
            { k: 'opacity', label: 'Độ đục', type: 'range', min: 0, max: 1, step: 0.02 },
            {
              k: 'blend',
              label: 'Kiểu hoà màu',
              type: 'enum',
              options: [
                ['screen', 'Screen (sáng chồng)'],
                ['normal', 'Bình thường'],
                ['lighten', 'Lighten'],
                ['plus-lighter', 'Plus lighter'],
              ],
            },
          ],
        },
        {
          // Ba núm nặng ký nhất về hiệu năng của lửa.
          name: 'Hiệu năng',
          fields: [
            { k: 'octaves', label: 'Số tầng nhiễu', type: 'range', min: 1, max: 5, step: 1 },
            { k: 'bandPad', label: 'Chừa thêm cho khói', type: 'range', min: 0, max: 1, step: 0.05, when: (s) => s.mode === 'page' },
            { k: 'maxDpr', label: 'Trần tỉ lệ pixel', type: 'range', min: 0.5, max: 3, step: 0.05 },
          ],
        },
      ],
    },
    {
      id: 'pageTransition',
      tab: 'Chuyển màn',
      title: 'Lưới pixel quét ngang lúc màn loading bàn giao cho trang contact',
      file: 'assets/js/kx-page-transition.js',
      api: () => window.KX_PAGE_TRANSITION,
      groups: [
        {
          name: 'Dải quét',
          fields: [
            { k: 'enabled', label: 'Bật màn chuyển (tắt = mờ dần như cũ)', type: 'bool' },
            { k: 'cols', label: 'Số cột pixel', type: 'range', min: 2, max: 48, step: 1 },
            { k: 'duration', label: 'Quét hết màn trong', type: 'range', min: 0.2, max: 4, step: 0.05, unit: 's' },
            { k: 'pixelFade', label: 'Một pixel mờ vào / mờ ra trong', type: 'range', min: 0.02, max: 1, step: 0.01, unit: 's' },
            { k: 'overlap', label: 'Pixel cùng cột sáng chồng nhau', type: 'range', min: 0, max: 1, step: 0.02 },
          ],
        },
        {
          name: 'Màu',
          fields: [
            { k: 'color', label: 'Màu pixel', type: 'text', when: (s) => !s.rainbow },
            { k: 'rainbow', label: 'Trải cầu vồng', type: 'bool' },
            {
              k: 'blend',
              label: 'Kiểu hoà màu',
              type: 'enum',
              options: [
                ['normal', 'Bình thường'],
                ['difference', 'Difference (hợp tông trang)'],
                ['screen', 'Screen'],
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'loading',
      tab: 'Loading',
      title: 'Màn loading — Figma node 1:1329, dùng lại khung trang contact',
      file: 'assets/js/kx-loading.js',
      api: () => window.KX_LOADING,
      groups: [
        {
          name: 'Nhịp chạy',
          fields: [
            { k: 'enabled', label: 'Vào trang là chạy màn loading', type: 'bool' },
            { k: 'duration', label: 'Đếm từ 0 tới 100% trong', type: 'range', min: 0.2, max: 15, step: 0.1, unit: 's' },
            { k: 'ease', label: 'Nhanh đầu chậm cuối (1 = đều)', type: 'range', min: 0.5, max: 4, step: 0.05 },
            { k: 'fadeOut', label: 'Tan dần trong', type: 'range', min: 0, max: 3, step: 0.05, unit: 's' },
            { k: 'holdIfSlow', label: 'Giữ ở 99% tới khi ảnh nạp xong', type: 'bool' },
            { k: 'waitMax', label: 'Trần chờ', type: 'range', min: 0, max: 20, step: 0.5, unit: 's', when: (s) => s.holdIfSlow },
          ],
        },
        {
          // Đây là chỗ chỉnh THỜI GIAN ẢNH NHẢY.
          name: 'Ảnh trái — nhảy liên tục',
          fields: [
            { k: 'every', label: 'Bao lâu nhảy một ảnh', type: 'range', min: 0.05, max: 3, step: 0.01, unit: 's' },
            { k: 'fade', label: 'Mờ chồng (0 = nhảy cắt)', type: 'range', min: 0, max: 1.5, step: 0.01, unit: 's' },
            { k: 'shuffle', label: 'Nhảy lung tung thay vì theo thứ tự', type: 'bool' },
            { k: 'shot1', label: 'Ảnh 1', type: 'file' },
            { k: 'shot2', label: 'Ảnh 2', type: 'file' },
            { k: 'shot3', label: 'Ảnh 3', type: 'file', when: (s) => !!s.shot2 },
            { k: 'shot4', label: 'Ảnh 4', type: 'file', when: (s) => !!s.shot3 },
            { k: 'shot5', label: 'Ảnh 5', type: 'file', when: (s) => !!s.shot4 },
            { k: 'shot6', label: 'Ảnh 6', type: 'file', when: (s) => !!s.shot5 },
            { k: 'shot7', label: 'Ảnh 7', type: 'file', when: (s) => !!s.shot6 },
            { k: 'shot8', label: 'Ảnh 8', type: 'file', when: (s) => !!s.shot7 },
          ],
        },
        {
          name: 'Ảnh phải — đứng yên',
          fields: [{ k: 'still', label: 'Ảnh', type: 'file' }],
        },
        {
          name: 'Số phần trăm',
          fields: [
            { k: 'pct', label: 'Có số phần trăm', type: 'bool' },
            { k: 'pctSize', label: 'Cỡ chữ (bị ghìm lại nếu chạm hàng nhãn)', type: 'range', min: 40, max: 600, step: 1, when: (s) => s.pct },
            { k: 'pctClamp', label: 'Không cho số đè lên hàng nhãn', type: 'bool', when: (s) => s.pct },
            { k: 'pctClear', label: 'Khe tối thiểu tới hàng nhãn', type: 'range', min: 0, max: 80, step: 1, when: (s) => s.pct && s.pctClamp },
            { k: 'pctX', label: 'Lệch ngang so với lề', type: 'range', min: -100, max: 400, step: 1, when: (s) => s.pct },
            { k: 'pctBottom', label: 'Cách đáy viewport', type: 'range', min: -60, max: 300, step: 1, when: (s) => s.pct },
            { k: 'pctTrack', label: 'Giãn chữ', type: 'range', min: -0.12, max: 0.06, step: 0.005, unit: 'em', when: (s) => s.pct },
            { k: 'pctWeight', label: 'Độ đậm', type: 'range', min: 100, max: 900, step: 100, when: (s) => s.pct },
            { k: 'pctSuffix', label: 'Đuôi', type: 'text', when: (s) => s.pct },
            { k: 'pctFamily', label: 'Font (thiết kế dùng font chưa nhúng)', type: 'text', when: (s) => s.pct },
          ],
        },
        {
          name: 'Hàng nhãn',
          fields: [
            { k: 'rowY', label: 'Cách đáy (thẳng hàng với [ ] [INSPI])', type: 'range', min: 0, max: 600, step: 1 },
            { k: 'labelGood', label: 'Nhãn 1', type: 'text' },
            { k: 'goodX', label: 'Nhãn 1 — cách lề trái', type: 'range', min: 0, max: 1800, step: 1 },
            { k: 'labelTime', label: 'Nhãn 2', type: 'text' },
            { k: 'timeX', label: 'Nhãn 2 — cách lề trái', type: 'range', min: 0, max: 1800, step: 1 },
            { k: 'labelL', label: 'Nhãn ảnh trái', type: 'text' },
            { k: 'labelR', label: 'Nhãn ảnh phải', type: 'text' },
          ],
        },
        {
          name: 'Hai poster',
          fields: [
            { k: 'shotR', label: 'Ảnh trái — cách lề PHẢI', type: 'range', min: 0, max: 1800, step: 1 },
            { k: 'stillR', label: 'Ảnh phải — cách lề PHẢI', type: 'range', min: 0, max: 1800, step: 1 },
            { k: 'labelGap', label: 'Nhãn → mép trên ảnh', type: 'range', min: 0, max: 80, step: 1 },
            { k: 'imgW', label: 'Bề rộng mỗi ảnh', type: 'range', min: 40, max: 600, step: 1 },
            { k: 'imgH', label: 'Chiều cao mỗi ảnh', type: 'range', min: 40, max: 800, step: 1 },
            { k: 'imgBottom', label: 'Cách đáy viewport', type: 'range', min: 0, max: 300, step: 1 },
            {
              k: 'fit',
              label: 'Ảnh lấp khung kiểu',
              type: 'enum',
              options: [
                ['cover', 'Phủ kín (cắt bớt)'],
                ['contain', 'Lọt trong khung'],
              ],
            },
          ],
        },
        {
          name: 'Giấu gì của trang contact',
          fields: [{ k: 'hide', label: 'Bộ chọn CSS', type: 'text' }],
        },
      ],
    },
    {
      id: 'burningOpen',
      tab: 'Burning Open',
      title: 'Màn mở đầu — vào trang đang cháy rồi đốt ngược về bộ ảnh mặc định',
      file: 'assets/js/kx-burning-open.js',
      api: () => window.KX_BURNING_OPEN,
      groups: [
        {
          // Chưa khai ảnh burning ở tab Burning Animation thì màn mở đầu không
          // chạy — không có bộ ảnh thứ hai thì chẳng có gì để đốt ngược về.
          name: 'Chạy',
          fields: [
            { k: 'enabled', label: 'Vào trang là chạy màn mở đầu', type: 'bool' },
            { k: 'delay', label: 'Chờ chữ vào hiệu ứng rồi mới châm đốt', type: 'range', min: 0, max: 4, step: 0.05, unit: 's' },
            { k: 'changeImage', label: 'Đổi ảnh (tắt = chỉ quệt qua, ảnh giữ nguyên)', type: 'bool' },
            {
              k: 'palette',
              label: 'Bảng màu của màn mở đầu',
              type: 'enum',
              options: [
                ['white', 'Lửa trắng'],
                ['fire', 'Lửa cam đỏ'],
                ['grey', 'Xám trắng'],
              ],
            },
          ],
        },
        {
          name: 'Lửa lúc mở đầu',
          fields: [
            { k: 'useEdge', label: 'Lửa mép đĩa và mép ảnh', type: 'bool' },
            { k: 'usePage', label: 'Lửa phủ mép dưới trang', type: 'bool' },
            { k: 'fireOut', label: 'Lửa lụi dần trong', type: 'range', min: 0.05, max: 4, step: 0.05, unit: 's' },
            { k: 'fireOutLead', label: 'Bắt đầu lụi trước khi đốt xong', type: 'range', min: 0, max: 3, step: 0.05, unit: 's' },
          ],
        },
        {
          name: 'Hạn chờ',
          fields: [
            { k: 'wait', label: 'Chờ ảnh burning xuất hiện trong CONFIG', type: 'range', min: 0, max: 8, step: 0.1, unit: 's' },
            { k: 'preload', label: 'Hạn nạp bộ ảnh burning', type: 'range', min: 0.5, max: 15, step: 0.5, unit: 's' },
          ],
        },
      ],
    },
    {
      id: 'burningMode',
      tab: 'Burning Mode',
      title: 'Nút BURNING MODE — một nút châm cả ba cơ chế lửa',
      file: 'assets/js/kx-burning-mode.js',
      api: () => window.KX_BURNING_MODE,
      groups: [
        {
          name: 'Nút',
          fields: [
            // `active` KHÔNG có mặt ở đây: nó là trạng thái lúc chạy, không phải
            // setting. Cho vào bảng thì persist() sẽ ghi nó xuống localStorage và
            // applyStored() áp lại lúc mở trang — nghĩa là trang tự cháy sẵn.
            { k: 'enabled', label: 'Dựng nút trên trang', type: 'bool' },
            { k: 'label', label: 'Chữ trên nút', type: 'text' },
            { k: 'labelOn', label: 'Chữ khi đang cháy', type: 'text' },
            { k: 'hotkey', label: 'Phím tắt (để trống = tắt)', type: 'text' },
            { k: 'resetOnLoad', label: 'Mở trang là dập hết lửa (giữ đúng giao ước)', type: 'bool' },
            { k: 'resetFor', label: 'Dập trong bao lâu sau khi mở trang', type: 'range', min: 0, max: 8, step: 0.1, unit: 's', when: (s) => s.resetOnLoad },
          ],
        },
        {
          name: 'Chỗ đứng',
          fields: [
            {
              k: 'mount',
              label: 'Đặt ở đâu',
              type: 'enum',
              options: [
                ['player', 'Ngay dưới cụm PLAY / MUTE'],
                ['nav', 'Thêm một ô vào thanh nav'],
                ['free', 'Tự do, neo vào một góc'],
              ],
            },
            { k: 'gapCtrl', label: 'Khe từ khung PLAY/MUTE xuống nút', type: 'range', min: 0, max: 80, step: 1, when: (s) => s.mount === 'player' },
            {
              k: 'anchor',
              label: 'Neo vào góc',
              type: 'enum',
              when: (s) => s.mount === 'free',
              options: [
                ['bottom-left', 'Dưới trái'],
                ['bottom-right', 'Dưới phải'],
                ['top-left', 'Trên trái'],
                ['top-right', 'Trên phải'],
              ],
            },
            { k: 'x', label: 'Cách lề ngang', type: 'range', min: 0, max: 400, step: 1, when: (s) => s.mount === 'free' },
            { k: 'y', label: 'Cách lề dọc', type: 'range', min: 0, max: 400, step: 1, when: (s) => s.mount === 'free' },
            { k: 'width', label: 'Bề rộng (0 = co theo chữ)', type: 'range', min: 0, max: 400, step: 1 },
            { k: 'height', label: 'Chiều cao', type: 'range', min: 24, max: 120, step: 1 },
          ],
        },
        {
          name: 'Châm cơ chế nào',
          fields: [
            { k: 'useBurn', label: 'Đốt ảnh (Burning Animation)', type: 'bool' },
            { k: 'useEdge', label: 'Lửa mép (Fire Effect)', type: 'bool' },
            { k: 'usePage', label: 'Lửa phủ trang (Lửa)', type: 'bool' },
            { k: 'useDiscHeat', label: 'Hơi nóng trên vành đĩa (Vành đĩa → preset lửa)', type: 'bool' },
          ],
        },
        {
          name: 'Nhịp châm',
          fields: [
            { k: 'edgeDelay', label: 'Lửa mép bén sau', type: 'range', min: 0, max: 8, step: 0.05, unit: 's' },
            { k: 'pageDelay', label: 'Lửa phủ trang bốc sau', type: 'range', min: 0, max: 10, step: 0.05, unit: 's' },
            { k: 'autoOff', label: 'Tự tắt sau (0 = không tắt)', type: 'range', min: 0, max: 60, step: 0.5, unit: 's' },
          ],
        },
      ],
    },
    {
      id: 'burnImage',
      tab: 'Burning Animation',
      title: 'Đốt cháy ảnh poster và hai đĩa — hiệu ứng chuyển',
      file: 'assets/js/kx-burn-image.js',
      api: () => window.KX_BURN_IMAGE,
      groups: [
        {
          // Bảng không có nút bấm, nên chính ô "Bật đốt" đóng vai nút chạy lại:
          // tắt rồi bật là đốt lại từ đầu.
          name: 'Chạy',
          fields: [
            { k: 'enabled', label: 'Bật đốt (tắt rồi bật = đốt lại)', type: 'bool' },
            { k: 'playOnFire', label: 'Tự đốt khi bật Fire Effect', type: 'bool' },
            {
              k: 'targets',
              label: 'Đốt cái gì',
              type: 'enum',
              options: [
                ['both', 'Cả ảnh giữa và hai đĩa'],
                ['discs', 'Chỉ hai đĩa'],
                ['poster', 'Chỉ ảnh giữa'],
              ],
            },
            {
              k: 'mode',
              label: 'Cháy xong thì sao',
              type: 'enum',
              options: [
                ['once', 'Hiện lại như cũ'],
                ['away', 'Mất luôn'],
                ['loop', 'Lặp lại mãi'],
              ],
            },
          ],
        },
        {
          name: 'Nhịp',
          fields: [
            { k: 'delay', label: 'Trễ trước khi cháy', type: 'range', min: 0, max: 3, step: 0.05, unit: 's' },
            { k: 'duration', label: 'Cháy hết trong', type: 'range', min: 0.2, max: 8, step: 0.05, unit: 's' },
            { k: 'hold', label: 'Giữ lúc đã cháy hết', type: 'range', min: 0, max: 3, step: 0.05, unit: 's' },
            { k: 'restore', label: 'Hiện lại trong', type: 'range', min: 0.1, max: 6, step: 0.05, unit: 's', when: (s) => s.mode !== 'away' },
            { k: 'gap', label: 'Nghỉ giữa hai lượt', type: 'range', min: 0, max: 6, step: 0.05, unit: 's', when: (s) => s.mode === 'loop' },
            { k: 'stagger', label: 'Vật sau trễ hơn vật trước', type: 'range', min: 0, max: 2, step: 0.02, unit: 's' },
          ],
        },
        {
          // Ảnh mới nằm SẴN bên dưới và lộ ra theo vệt cháy, nên lúc cháy xong
          // là đã đứng ở bộ ảnh mới, không có bước chuyển thứ hai.
          name: 'Đổi sang ảnh mới',
          fields: [
            { k: 'swap', label: 'Cháy xong thì đổi sang ảnh mới', type: 'bool' },
            { k: 'newDiscLeft', label: 'Mặt đĩa TRÁI mới', type: 'file', when: (s) => s.swap },
            { k: 'newDiscRight', label: 'Mặt đĩa PHẢI mới', type: 'file', when: (s) => s.swap },
            { k: 'newPoster', label: 'Ảnh profile mới (thay poster giữa)', type: 'file', when: (s) => s.swap },
          ],
        },
        {
          name: 'Vết cháy',
          fields: [
            {
              k: 'from',
              label: 'Cháy từ đâu',
              type: 'enum',
              options: [
                ['bottom', 'Từ đáy lên'],
                ['top', 'Từ đỉnh xuống'],
                ['edge', 'Từ mép vào tâm'],
                ['center', 'Từ tâm ra mép'],
              ],
            },
            { k: 'dir', label: 'Bám hướng (0 = loang lung tung)', type: 'range', min: 0, max: 1, step: 0.01 },
            { k: 'scale', label: 'Độ mịn của vân cháy', type: 'range', min: 0.5, max: 12, step: 0.1 },
            { k: 'charW', label: 'Bề rộng vệt than', type: 'range', min: 0.005, max: 0.4, step: 0.005 },
            { k: 'lineW', label: 'Bề dày đường lửa', type: 'range', min: 0.002, max: 0.15, step: 0.002 },
            { k: 'glow', label: 'Độ sáng đường lửa', type: 'range', min: 0, max: 4, step: 0.05 },
            { k: 'ember', label: 'Than còn đỏ âm ỉ', type: 'range', min: 0, max: 2, step: 0.05 },
            { k: 'ash', label: 'Tàn tro bay lên', type: 'range', min: 0, max: 2, step: 0.05 },
            {
              k: 'palette',
              label: 'Bảng màu',
              type: 'enum',
              options: [
                ['fire', 'Lửa cam đỏ'],
                ['grey', 'Xám trắng (hợp tông trang)'],
                ['white', 'Lửa trắng'],
              ],
            },
          ],
        },
        {
          name: 'Hiệu năng',
          fields: [
            { k: 'octaves', label: 'Số tầng nhiễu', type: 'range', min: 1, max: 5, step: 1 },
            { k: 'maxTex', label: 'Trần cỡ ảnh nguồn', type: 'range', min: 256, max: 2048, step: 32, unit: 'px' },
            { k: 'maxPx', label: 'Trần cỡ khung vẽ (chặn hết bộ nhớ GPU)', type: 'range', min: 400, max: 2400, step: 20, unit: 'px' },
            { k: 'maxDpr', label: 'Trần tỉ lệ pixel', type: 'range', min: 0.5, max: 3, step: 0.05 },
          ],
        },
      ],
    },
    {
      id: 'fireEdge',
      tab: 'Fire Effect',
      title: 'Lửa liếm dọc mép hai đĩa và mép ảnh poster',
      file: 'assets/js/kx-fire-edge.js',
      api: () => window.KX_FIRE_EDGE,
      // Chỉ để ngắm lúc căn dải lửa, đừng đẩy lên bản thật.
      devOnly: ['debugEdge'],
      groups: [
        {
          name: 'Bật',
          fields: [
            { k: 'enabled', label: 'Bật lửa', type: 'bool' },
            {
              k: 'targets',
              label: 'Cháy ở đâu',
              type: 'enum',
              options: [
                ['both', 'Mép ảnh giữa và mép hai đĩa'],
                ['discs', 'Chỉ mép hai đĩa'],
                ['poster', 'Chỉ mép ảnh giữa'],
              ],
            },
            { k: 'startDelay', label: 'Chờ màn đốt xong rồi mới bén', type: 'range', min: 0, max: 6, step: 0.05, unit: 's' },
            { k: 'fadeIn', label: 'Bén lửa dần trong', type: 'range', min: 0.05, max: 4, step: 0.05, unit: 's' },
            { k: 'fadeOut', label: 'Lụi dần khi tắt (0 = cắt phựt)', type: 'range', min: 0, max: 4, step: 0.05, unit: 's' },
          ],
        },
        {
          // Đây là chỗ chỉnh MỨC ĐỘ LỬA.
          name: 'Mức độ lửa',
          fields: [
            { k: 'intensity', label: 'Đậm / nhạt', type: 'range', min: 0, max: 3, step: 0.05 },
            { k: 'height', label: 'Ngọn cao', type: 'range', min: 0.01, max: 0.6, step: 0.005 },
            { k: 'inset', label: 'Ăn vào trong mép', type: 'range', min: 0, max: 0.3, step: 0.005 },
            { k: 'rise', label: 'Vống lên ở mép trên', type: 'range', min: 0, max: 1, step: 0.02 },
            { k: 'speed', label: 'Tốc độ bốc lên', type: 'range', min: 0, max: 4, step: 0.05 },
            { k: 'scale', label: 'Độ mịn của vân', type: 'range', min: 0.5, max: 30, step: 0.5 },
            { k: 'smoke', label: 'Khói', type: 'range', min: 0, max: 2, step: 0.05 },
            { k: 'sparks', label: 'Tàn lửa', type: 'range', min: 0, max: 2, step: 0.05 },
            { k: 'opacity', label: 'Độ đục', type: 'range', min: 0, max: 1, step: 0.02 },
            {
              k: 'palette',
              label: 'Bảng màu',
              type: 'enum',
              options: [
                ['fire', 'Lửa cam đỏ'],
                ['grey', 'Xám trắng (hợp tông trang)'],
              ],
            },
            {
              k: 'blend',
              label: 'Kiểu hoà màu',
              type: 'enum',
              options: [
                ['screen', 'Screen (sáng chồng)'],
                ['normal', 'Bình thường'],
                ['lighten', 'Lighten'],
                ['plus-lighter', 'Plus lighter'],
              ],
            },
          ],
        },
        {
          name: 'Hiệu năng',
          fields: [
            { k: 'octaves', label: 'Số tầng nhiễu', type: 'range', min: 1, max: 5, step: 1 },
            { k: 'pad', label: 'Chừa chỗ cho ngọn vươn ra', type: 'range', min: 0.05, max: 0.8, step: 0.01 },
            { k: 'maxPx', label: 'Trần cỡ khung vẽ (chặn hết bộ nhớ GPU)', type: 'range', min: 300, max: 2000, step: 20, unit: 'px' },
            { k: 'maxDpr', label: 'Trần tỉ lệ pixel', type: 'range', min: 0.5, max: 3, step: 0.05 },
            { k: 'debugEdge', label: 'Tô dải lửa để căn', type: 'bool' },
          ],
        },
      ],
    },
    {
      id: 'blockReveal',
      tab: 'Lộ chữ',
      title: 'Thanh khối quét ngang để lộ chữ PP Editorial',
      file: 'assets/js/kx-block-reveal.js',
      api: () => window.KX_BLOCK_REVEAL,
      groups: [
        {
          name: 'Nhịp chạy',
          fields: [
            { k: 'enabled', label: 'Bật hiệu ứng', type: 'bool' },
            { k: 'inMs', label: 'Thanh nở ra', type: 'range', min: 60, max: 2000, step: 20, unit: 'ms' },
            { k: 'holdMs', label: 'Giữ thanh phủ kín', type: 'range', min: 0, max: 1200, step: 10, unit: 'ms' },
            { k: 'outMs', label: 'Thanh rút đi', type: 'range', min: 60, max: 2000, step: 20, unit: 'ms' },
            { k: 'stagger', label: 'Trễ giữa các cụm', type: 'range', min: 0, max: 1200, step: 10, unit: 'ms' },
            { k: 'startDelay', label: 'Chờ trước khi chạy', type: 'range', min: 0, max: 2000, step: 20, unit: 'ms' },
          ],
        },
        {
          name: 'Hình dáng',
          fields: [
            { k: 'color', label: 'Màu thanh', type: 'text' },
            {
              // Khung lót hiện ngay từ đầu cho chỗ đó khỏi trống trong lúc chờ
              // thanh trắng quét tới.
              k: 'baseStyle',
              label: 'Khung lót ban đầu',
              type: 'enum',
              options: [
                ['line', 'Viền mảnh rỗng ruột (như ô player)'],
                ['fill', 'Mảng đặc'],
                ['none', 'Không lót'],
              ],
            },
            { k: 'baseLine', label: 'Màu viền khung lót', type: 'text', when: (s) => s.baseStyle === 'line' },
            { k: 'baseFill', label: 'Màu mảng lót', type: 'text', when: (s) => s.baseStyle === 'fill' },
            { k: 'baseTargets', label: 'Cụm nào có khung lót', type: 'text', when: (s) => s.baseStyle !== 'none' },
            { k: 'padX', label: 'Nới hai bên', type: 'range', min: -0.3, max: 1, step: 0.01, unit: 'em' },
            { k: 'padY', label: 'Nới trên dưới', type: 'range', min: -0.3, max: 1, step: 0.01, unit: 'em' },
            { k: 'easing', label: 'Đường cong tốc độ', type: 'text' },
            { k: 'runOnce', label: 'Chỉ chạy một lần khi mở trang', type: 'bool' },
          ],
        },
      ],
    },
    {
      id: 'shuffleText',
      tab: 'Xáo chữ',
      title: 'Chữ Geist xáo kí tự lúc trang vừa hiện',
      file: 'assets/js/kx-shuffle-text.js',
      api: () => window.KX_SHUFFLE_TEXT,
      groups: [
        {
          name: 'Nhịp chạy',
          fields: [
            { k: 'enabled', label: 'Bật hiệu ứng', type: 'bool' },
            { k: 'frameMs', label: 'Nhịp đổi kí tự', type: 'range', min: 8, max: 120, step: 1, unit: 'ms' },
            { k: 'scrambleFrames', label: 'Số nhịp mỗi kí tự nhảy', type: 'range', min: 1, max: 60, step: 1 },
            { k: 'charStagger', label: 'Trễ giữa hai kí tự', type: 'range', min: 0, max: 10, step: 1, unit: ' nhịp' },
            { k: 'lineCap', label: 'Trần trễ trong một dòng', type: 'range', min: 0, max: 80, step: 1, unit: ' nhịp' },
            { k: 'spread', label: 'Rải dần các dòng (0 = cùng lúc)', type: 'range', min: 0, max: 4000, step: 50, unit: 'ms' },
            { k: 'jitter', label: 'Xê dịch ngẫu nhiên mỗi dòng', type: 'range', min: 0, max: 1000, step: 10, unit: 'ms' },
            { k: 'startDelay', label: 'Chờ trước khi chạy', type: 'range', min: 0, max: 2000, step: 20, unit: 'ms' },
          ],
        },
        {
          name: 'Kiểu chữ',
          fields: [
            { k: 'blank', label: 'Kí tự chưa tới lượt để trống', type: 'bool' },
            { k: 'symbols', label: 'Bộ kí tự dùng để xáo', type: 'text' },
            { k: 'includeFeed', label: 'Chạy cả cột chữ bên phải', type: 'bool' },
            { k: 'maxChars', label: 'Trần số kí tự', type: 'range', min: 200, max: 20000, step: 100 },
            { k: 'runOnce', label: 'Chỉ chạy một lần khi mở trang', type: 'bool' },
          ],
        },
      ],
    },
    {
      id: 'tailCursor',
      tab: 'Đuôi trỏ',
      title: 'Con trỏ có đuôi ruy-băng',
      file: 'assets/js/kx-tail-cursor.js',
      api: () => window.KX_TAIL_CURSOR,
      groups: [
        {
          name: 'Hình dáng',
          fields: [
            { k: 'enabled', label: 'Bật đuôi trỏ', type: 'bool' },
            { k: 'points', label: 'Số đốt của đuôi', type: 'range', min: 3, max: 80, step: 1 },
            { k: 'headW', label: 'Bề rộng ở đầu', type: 'range', min: 1, max: 60, step: 0.5, unit: 'px' },
            { k: 'taper', label: 'Độ thon về đuôi', type: 'range', min: 0.2, max: 6, step: 0.05 },
            { k: 'dot', label: 'Chấm ở đầu (0 = tắt)', type: 'range', min: 0, max: 20, step: 0.5, unit: 'px' },
          ],
        },
        {
          name: 'Chuyển động',
          fields: [
            { k: 'ease', label: 'Đầu bám con trỏ', type: 'range', min: 0.02, max: 1, step: 0.01 },
            { k: 'chain', label: 'Đốt sau bám đốt trước', type: 'range', min: 0.02, max: 1, step: 0.01 },
            { k: 'minStep', label: 'Ngưỡng coi như đứng yên', type: 'range', min: 0.05, max: 3, step: 0.05, unit: 'px' },
          ],
        },
        {
          name: 'Màu',
          fields: [
            {
              k: 'colorMode',
              label: 'Kiểu màu',
              type: 'enum',
              options: [
                ['mono', 'Một màu (hợp trang)'],
                ['rainbow', 'Nhiều màu như bản Inspira'],
              ],
            },
            { k: 'color', label: 'Màu ruy-băng', type: 'text', when: (s) => s.colorMode === 'mono' },
            { k: 'hue', label: 'Màu bắt đầu', type: 'range', min: 0, max: 360, step: 1, unit: '°', when: (s) => s.colorMode === 'rainbow' },
            { k: 'hueSpan', label: 'Quét màu dọc đuôi', type: 'range', min: 0, max: 360, step: 5, unit: '°', when: (s) => s.colorMode === 'rainbow' },
            { k: 'hueDrift', label: 'Trôi màu theo thời gian', type: 'range', min: 0, max: 180, step: 1, unit: '°/s', when: (s) => s.colorMode === 'rainbow' },
            { k: 'opacity', label: 'Độ đục', type: 'range', min: 0, max: 1, step: 0.02 },
            {
              k: 'blend',
              label: 'Kiểu hoà màu',
              type: 'enum',
              options: [
                ['difference', 'Difference (tự đảo trên nền trắng)'],
                ['normal', 'Bình thường'],
                ['screen', 'Screen'],
                ['exclusion', 'Exclusion'],
              ],
            },
          ],
        },
        {
          name: 'Khác',
          fields: [
            { k: 'hideNative', label: 'Giấu con trỏ thật', type: 'bool' },
            { k: 'maxDpr', label: 'Trần tỉ lệ pixel', type: 'range', min: 1, max: 3, step: 0.1 },
          ],
        },
      ],
    },
    {
      id: 'discFx',
      tab: 'Vành đĩa',
      title: 'Bóp méo vành đĩa khi rê chuột (WebGL)',
      file: 'assets/js/kx-disc-fx.js',
      api: () => window.KX_DISC_FX,
      // Chỉ để ngắm lúc căn vành, đừng đẩy lên bản thật.
      devOnly: ['debugRing'],
      groups: [
        {
          name: 'Preset',
          fields: [
            { k: 'enabled', label: 'Bật hiệu ứng', type: 'bool' },
            {
              k: 'preset',
              label: 'Kiểu bóp méo',
              type: 'enum',
              options: [
                ['lens', 'Thấu kính chất lỏng'],
                ['ripple', 'Vòng sóng lan ra'],
                ['swirl', 'Xoáy quanh con trỏ'],
                ['melt', 'Kéo nhoè theo hướng chuột'],
                ['liquid', 'Nhiễu chảy'],
                ['bulge', 'Phồng / lõm'],
                ['shatter', 'Vỡ ô vuông'],
                ['blaze', 'Hơi nóng bốc lên (lửa)'],
              ],
            },
            { k: 'onlyWhenPlaying', label: 'Chỉ ăn khi nhạc đang chạy', type: 'bool' },
          ],
        },
        {
          // Vành khăn ăn hiệu ứng. Bật "Tô sáng vành" để nhìn thấy mà căn.
          name: 'Vùng vành (chừa vòng nhãn trắng)',
          fields: [
            { k: 'innerR', label: 'Mép trong (hết vòng nhãn)', type: 'range', min: 0, max: 0.95, step: 0.005 },
            { k: 'outerR', label: 'Mép ngoài', type: 'range', min: 0.2, max: 1, step: 0.005 },
            { k: 'edgeSoft', label: 'Mềm hai mép vành', type: 'range', min: 0, max: 0.2, step: 0.005 },
            { k: 'debugRing', label: 'Tô sáng vành để căn', type: 'bool' },
          ],
        },
        {
          name: 'Độ mạnh & quầng',
          fields: [
            { k: 'radius', label: 'Bán kính quầng quanh con trỏ', type: 'range', min: 0.02, max: 1, step: 0.01 },
            { k: 'strength', label: 'Độ bóp méo', type: 'range', min: 0, max: 2, step: 0.02 },
            { k: 'softness', label: 'Tơi ở mép quầng', type: 'range', min: 0, max: 1, step: 0.02 },
            { k: 'chroma', label: 'Tán sắc viền', type: 'range', min: 0, max: 2, step: 0.02 },
            { k: 'speed', label: 'Nhịp chuyển động', type: 'range', min: 0, max: 4, step: 0.05 },
          ],
        },
        {
          name: 'Bám chuột',
          fields: [
            { k: 'follow', label: 'Bám con trỏ (1 = tức thì)', type: 'range', min: 0.02, max: 1, step: 0.01 },
            { k: 'fadeIn', label: 'Hiện ra khi vào vành', type: 'range', min: 0, max: 2, step: 0.02, unit: 's' },
            { k: 'fadeOut', label: 'Tắt dần khi ra khỏi vành', type: 'range', min: 0, max: 3, step: 0.02, unit: 's' },
            { k: 'maxSize', label: 'Trần cỡ canvas', type: 'range', min: 256, max: 2048, step: 32, unit: 'px' },
          ],
        },
      ],
    },
  ]


  // 4 vật trang trí của móc chìa khoá 3D: mỗi vật một tab riêng, có ẩn/hiện.

  /* ------------------------------------------------------------------- lưu trữ */

  function readStore() {
    try {
      return JSON.parse(localStorage.getItem(STORE_KEY)) || {}
    } catch {
      return {}
    }
  }

  const store = readStore()

  function persist(mod) {
    const api = mod.api()
    const diff = {}
    Object.keys(api.defaults).forEach((k) => {
      if (api.config[k] !== api.defaults[k]) diff[k] = api.config[k]
    })
    if (Object.keys(diff).length) store[mod.id] = diff
    else delete store[mod.id]
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(store))
    } catch {}
  }

  /* ------------------------------------------------------------------------ CSS */

  const style = document.createElement('style')
  style.textContent = `
    .dasdev-btn {
      position: fixed; right: 20px; bottom: 20px; z-index: 2147483646;
      width: 42px; height: 42px; display: grid; place-items: center;
      background: #0d0d0d; color: #ffe94d; border: 1px solid #2a2a2a; border-radius: 4px;
      cursor: pointer; padding: 0; box-shadow: 0 8px 24px rgba(0,0,0,.35);
      transition: transform .18s cubic-bezier(.7,0,.3,1), background .18s;
    }
    .dasdev-btn:hover { background: #1a1a1a; transform: translateY(-2px); }
    .dasdev-btn[aria-expanded='true'] { background: #ffe94d; color: #0d0d0d; }
    .dasdev-btn svg { width: 20px; height: 20px; display: block; }

    .dasdev-panel {
      position: fixed; right: 20px; bottom: 72px; z-index: 2147483647;
      width: 306px; max-height: calc(100vh - 104px);
      display: flex; flex-direction: column;
      background: #101010; color: #f2f2f2; border: 1px solid #2a2a2a; border-radius: 6px;
      font: 500 11px/1.4 ui-sans-serif, system-ui, -apple-system, sans-serif;
      box-shadow: 0 20px 56px rgba(0,0,0,.55);
      -webkit-font-smoothing: antialiased;
      transform-origin: 100% 100%;
      animation: dasdev-in .18s cubic-bezier(.2,.8,.2,1);
    }
    /* Màn thật hẹp hoặc thấp (kéo hẹp cửa sổ để thử responsive): panel co lại
       cho còn thấy trang mà sửa, nhưng VẪN dính góc dưới phải chứ không phủ
       kín. Đo theo khổ màn THẬT (vw/vh), không phải khổ đang giả lập. */
    @media (max-width: 700px), (max-height: 760px) {
      .dasdev-panel {
        right: 12px;
        bottom: 58px;
        width: min(300px, calc(100vw - 24px));
        /* max() chứ không phải min(): màn càng thấp thì 55vh càng nhỏ, nhưng
           không được nhỏ hơn 320px, dưới mức đó bảng không còn dùng được. */
        max-height: max(320px, 55vh);
      }
    }

    @keyframes dasdev-in { from { opacity: 0; transform: translateY(8px) scale(.98) } }
    .dasdev-panel[hidden] { display: none; }
    .dasdev-panel * { box-sizing: border-box; }

    .dasdev-head {
      display: flex; align-items: baseline; justify-content: space-between; gap: 8px;
      padding: 11px 13px; border-bottom: 1px solid #232323; flex: none;
    }
    .dasdev-head strong { font-size: 10px; letter-spacing: .1em; text-transform: uppercase; color: #ffe94d; }
    .dasdev-headr { display: flex; align-items: center; gap: 8px; }
    .dasdev-tach {
      appearance: none; background: #1b1b1b; border: 1px solid #333; border-radius: 4px;
      color: #c9c9c9; font: inherit; font-size: 9px; letter-spacing: .04em; padding: 3px 7px; cursor: pointer;
    }
    .dasdev-tach:hover { border-color: #4a4a4a; color: #fff; }

    /* Khi đã tách ra cửa sổ riêng: panel chiếm trọn cửa sổ đó, bỏ hết phần
       trang trí của một hộp nổi (bo góc, đổ bóng, vị trí cố định). */
    .dasdev-panel.is-rieng {
      position: static; width: auto; max-height: none; height: 100vh;
      border: 0; border-radius: 0; box-shadow: none; animation: none;
    }
    .dasdev-head em { font-style: normal; color: #5f5f5f; font-size: 10px; }

    .dasdev-warn {
      flex: none; margin: 0; padding: 8px 13px; background: #2a2408; color: #ffe94d;
      border-bottom: 1px solid #3a3210; font-size: 10px; line-height: 1.45;
    }
    .dasdev-warn[hidden] { display: none; }
    /* Dropdown chọn module. Trước đây là hàng tab ngang, nhưng thêm module là
       tràn ngang panel. Tự dựng listbox chứ không dùng <select>: popup của
       <select> do hệ điều hành vẽ, không theo được nền tối của panel. */
    .dasdev-tabs {
      flex: none; display: flex; gap: 6px; padding: 8px 13px; border-bottom: 1px solid #232323;
    }
    /* Mỗi dropdown tự làm mốc định vị cho popup của chính nó, nên hai cái nằm
       cạnh nhau mà popup vẫn rơi đúng dưới nút của nó. */
    .dasdev-dd { position: relative; min-width: 0; }
    .dasdev-dd.is-mod { flex: 1 1 auto; }
    .dasdev-dd.is-khuc { flex: 0 0 38%; }
    .dasdev-dd .dasdev-tablist { left: 0; right: 0; top: calc(100% + 4px); }
    .dasdev-dd .dasdev-tabsel span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .dasdev-tabsel {
      appearance: none; width: 100%; display: flex; align-items: center; justify-content: space-between;
      gap: 8px; background: #1b1b1b; border: 1px solid #333; border-radius: 6px;
      color: #ffe94d; font: inherit; font-size: 11px; padding: 7px 10px; cursor: pointer; text-align: left;
    }
    .dasdev-tabsel:hover { border-color: #4a4a4a; }
    .dasdev-tabsel::after { content: '▾'; color: #7d7d7d; font-size: 10px; }
    .dasdev-tablist {
      position: absolute; left: 13px; right: 13px; top: calc(100% - 4px); z-index: 30;
      /* 50vh để danh sách không bao giờ dài quá màn — panel ở khổ nhỏ chỉ cao
         438px, danh sách 260px cứng là tràn qua cả hàng nút dưới đáy. */
      max-height: min(260px, 50vh); overflow-y: auto;
      /* Lenis nuốt hết wheel/touch của trang, nên danh sách có overflow: auto mà
         vẫn không cuộn được. data-lenis-prevent (trong markup) bảo nó buông ra;
         hai dòng dưới để cú vuốt trên điện thoại không lan ra cuộn trang. */
      touch-action: pan-y; overscroll-behavior: contain;
      background: #1b1b1b; border: 1px solid #3a3a3a;
      border-radius: 6px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5); padding: 4px;
    }
    .dasdev-tablist[hidden] { display: none; }
    .dasdev-tablist button {
      appearance: none; display: block; width: 100%; text-align: left; background: none; border: 0;
      border-radius: 4px; color: #c9c9c9; font: inherit; font-size: 11px; padding: 6px 8px; cursor: pointer;
    }
    .dasdev-tablist button:hover { background: #2a2a2a; }
    .dasdev-tablist button[aria-selected='true'] { color: #ffe94d; background: #2f2a10; }

    /* Chọn khổ màn để ngắm — dùng chung cho cả panel, không thuộc module nào. */
    .dasdev-bp { flex: none; padding: 8px 13px; border-bottom: 1px solid #232323; }
    .dasdev-bp-head {
      display: flex; align-items: baseline; justify-content: space-between; gap: 8px; margin-bottom: 5px;
    }
    .dasdev-bp-head b { color: #9a9a9a; font-size: 10px; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; }
    .dasdev-bp-now { color: #6a6a6a; font-size: 10px; }
    .dasdev-bp-row { display: flex; flex-wrap: wrap; gap: 4px; }
    .dasdev-bp-row button {
      appearance: none; background: #1b1b1b; border: 1px solid #333; border-radius: 4px;
      color: #9a9a9a; font: inherit; font-size: 10px; padding: 4px 7px; cursor: pointer;
    }
    .dasdev-bp-row button:hover { border-color: #4a4a4a; color: #c9c9c9; }
    .dasdev-bp-row button[aria-pressed='true'] { color: #ffe94d; border-color: #6d5f14; background: #2f2a10; }
    .dasdev-body {
      overflow: auto;
      padding: 4px 13px 8px;
      flex: 1 1 auto;
      /* Cuộn bằng ngón trên máy tính bảng / điện thoại. touch-action: pan-y nói
         với trình duyệt rằng cử chỉ dọc ở đây là cuộn nội dung, còn
         overscroll-behavior: contain chặn không cho cú vuốt lan ra trang. */
      touch-action: pan-y;
      overscroll-behavior: contain;
      -webkit-overflow-scrolling: touch;
    }
    .dasdev-mod[hidden] { display: none; }
    .dasdev-pick {
      appearance: none; background: #1b1b1b; border: 1px solid #333; border-radius: 4px;
      color: #c9c9c9; font: inherit; font-size: 10px; padding: 4px 8px; margin-top: 4px; cursor: pointer;
    }
    .dasdev-pick:hover { border-color: #4a4a4a; }
    .dasdev-row input[type=text] {
      width: 100%; background: #1b1b1b; color: #fff; border: 1px solid #303030;
      border-radius: 4px; padding: 4px 6px; font: inherit;
    }

    .dasdev-mod { padding: 9px 0 4px; }
    .dasdev-mod + .dasdev-mod { border-top: 1px solid #202020; }
    .dasdev-mod > h5 { margin: 0 0 2px; font-size: 11px; color: #fff; }
    .dasdev-mod > p { margin: 0 0 9px; font-size: 10px; color: #5f5f5f; font-family: ui-monospace, monospace; }

    /* Phân khúc theo khổ màn. Nằm giữa "mục lớn" (module) và "nhóm" (chủ đề):
       một module có thể có cả ba khúc, mỗi khúc lại có các nhóm chủ đề cũ. */
    .dasdev-bpsec { margin: 10px 0 2px; border-left: 2px solid #2a2a2a; padding-left: 9px; }
    .dasdev-bpsec > .dasdev-bpsec-ten {
      display: flex; align-items: center; gap: 6px;
      margin: 0 0 2px; font-size: 9px; letter-spacing: .11em; text-transform: uppercase;
      color: #ffe94d; font-weight: 700;
    }
    .dasdev-bpsec > .dasdev-bpsec-ten span {
      color: #5f5f5f; font-weight: 500; letter-spacing: 0; text-transform: none;
      font-family: ui-monospace, monospace;
    }
    .dasdev-bpsec .dasdev-grp > h6 { margin-top: 7px; }

    .dasdev-grp > h6 {
      margin: 10px 0 7px; font-size: 9px; letter-spacing: .11em; text-transform: uppercase;
      color: #6d6d6d; font-weight: 600;
    }
    .dasdev-row { margin-bottom: 9px; }
    .dasdev-row > label { display: flex; justify-content: space-between; gap: 8px; color: #9d9d9d; margin-bottom: 4px; }
    .dasdev-row > label b { color: #fff; font-weight: 600; font-variant-numeric: tabular-nums; }
    .dasdev-row input[type=range] { width: 100%; height: 15px; margin: 0; accent-color: #ffe94d; display: block; }
    .dasdev-row select {
      width: 100%; background: #1b1b1b; color: #fff; border: 1px solid #303030;
      border-radius: 4px; padding: 4px 6px; font: inherit;
    }
    .dasdev-check { display: flex; align-items: center; gap: 7px; color: #e2e2e2; cursor: pointer; }
    .dasdev-check input { accent-color: #ffe94d; margin: 0; }

    .dasdev-foot { display: flex; gap: 6px; padding: 10px 13px; border-top: 1px solid #232323; flex: none; }
    .dasdev-foot button {
      flex: 1; background: #1e1e1e; color: #e8e8e8; border: 1px solid #333;
      border-radius: 4px; padding: 7px 4px; font: inherit; cursor: pointer;
    }
    .dasdev-foot button:hover { background: #292929; }
    .dasdev-foot button.is-primary { background: #ffe94d; border-color: #ffe94d; color: #111; font-weight: 700; }
    .dasdev-foot button.is-primary:hover { background: #ffef77; }

    /* ĐỒNG BỘ VỚI BẢNG H CỦA BỐN TRANG FIGMA (kx-panel.js), người dùng chốt:
       không có nút nổi trên trang — bấm H mở/đóng (Shift+L vẫn chạy), Esc
       đóng; cùng nền, viền, chữ Geist Mono, nhấn TRẮNG thay cho vàng, thanh
       trượt mảnh, công tắc như bên kia. Viết thành lớp đè ở cuối để không phải
       sửa từng luật cũ. */
    .dasdev-btn { display: none !important; }
    .dasdev-panel {
      right: 16px; bottom: 16px; width: 312px; max-height: calc(100vh - 32px);
      background: #0b0b0c; color: #e8e8e8; border: 1px solid #2a2a2c; border-radius: 8px;
      font: 400 11px/1.4 "Geist Mono", ui-monospace, monospace;
      box-shadow: 0 12px 40px rgba(0,0,0,.6); animation: none;
    }
    @media (max-width: 700px), (max-height: 760px) {
      .dasdev-panel { right: 12px; bottom: 12px; }
    }
    .dasdev-head { align-items: center; padding: 12px 12px 10px; border-bottom-color: #1d1d1f; }
    .dasdev-head strong { font-size: 11px; font-weight: 500; letter-spacing: .04em; color: #fff; }
    .dasdev-head em { color: #6f6f73; font-size: 10px; text-transform: uppercase; letter-spacing: .04em; }
    .dasdev-tach, .dasdev-pick, .dasdev-bp-row button {
      background: #151517; border-color: #2a2a2c; border-radius: 4px; color: #bdbdc2;
    }
    .dasdev-tach:hover, .dasdev-pick:hover, .dasdev-bp-row button:hover { border-color: #3d3d41; color: #fff; }
    .dasdev-bp-row button[aria-pressed='true'] { color: #0b0b0c; background: #fff; border-color: #fff; }
    .dasdev-warn { background: transparent; color: #d8a24a; border-bottom-color: #3a2f1a; }
    .dasdev-tabs, .dasdev-bp { padding: 8px 12px; border-bottom-color: #1d1d1f; }
    .dasdev-tabsel {
      background: #151517; border-color: #2a2a2c; border-radius: 4px; color: #fff;
      text-transform: uppercase; letter-spacing: .03em; font-weight: 500;
    }
    .dasdev-tabsel:hover { border-color: #3d3d41; }
    .dasdev-tabsel::after { content: '›'; color: #6f6f73; transform: rotate(90deg); }
    .dasdev-tablist { background: #0b0b0c; border-color: #2a2a2c; border-radius: 4px; box-shadow: 0 12px 40px rgba(0,0,0,.6); }
    .dasdev-tablist button { color: #bdbdc2; }
    .dasdev-tablist button:hover { background: #121214; color: #fff; }
    .dasdev-tablist button[aria-selected='true'] { color: #0b0b0c; background: #fff; }
    .dasdev-bp-head b, .dasdev-grp > h6 { color: #6f6f73; font-weight: 400; font-size: 10px; letter-spacing: .06em; }
    .dasdev-bp-now { color: #55555a; }
    .dasdev-body { padding: 4px 12px 8px; }
    .dasdev-mod + .dasdev-mod { border-top-color: #1d1d1f; }
    .dasdev-mod > h5 { font-size: 11px; font-weight: 500; text-transform: uppercase; letter-spacing: .03em; color: #fff; }
    .dasdev-mod > p { color: #55555a; font-family: inherit; }
    .dasdev-bpsec { border-left-color: #2a2a2c; }
    .dasdev-bpsec > .dasdev-bpsec-ten { color: #fff; font-weight: 500; }
    .dasdev-bpsec > .dasdev-bpsec-ten span { color: #6f6f73; font-family: inherit; }
    .dasdev-row > label { color: #bdbdc2; }
    .dasdev-row > label b { color: #fff; font-weight: 400; }
    .dasdev-row select, .dasdev-row input[type=text] {
      background: #151517; border-color: #2a2a2c; color: #fff;
    }
    .dasdev-row select:focus, .dasdev-row input[type=text]:focus { outline: none; border-color: #4a7dff; }
    .dasdev-row input[type=range] {
      -webkit-appearance: none; appearance: none; height: 16px; background: transparent; cursor: pointer;
    }
    .dasdev-row input[type=range]::-webkit-slider-runnable-track { height: 1px; background: #3a3a3e; }
    .dasdev-row input[type=range]::-moz-range-track { height: 1px; background: #3a3a3e; }
    .dasdev-row input[type=range]::-webkit-slider-thumb {
      -webkit-appearance: none; width: 11px; height: 11px; margin-top: -5px; border-radius: 50%; background: #fff; border: 0;
    }
    .dasdev-row input[type=range]::-moz-range-thumb { width: 11px; height: 11px; border-radius: 50%; background: #fff; border: 0; }
    .dasdev-check { color: #bdbdc2; }
    .dasdev-check input {
      -webkit-appearance: none; appearance: none; position: relative; flex: none; width: 30px; height: 16px;
      border-radius: 8px; background: #2a2a2c; cursor: pointer; transition: background .15s ease;
    }
    .dasdev-check input::after {
      content: ''; position: absolute; left: 2px; top: 2px; width: 12px; height: 12px; border-radius: 50%;
      background: #8e8e94; transition: transform .15s ease, background .15s ease;
    }
    .dasdev-check input:checked { background: #fff; }
    .dasdev-check input:checked::after { transform: translateX(14px); background: #0b0b0c; }
    .dasdev-foot { padding: 10px 12px 12px; border-top-color: #1d1d1f; }
    .dasdev-foot button {
      background: #151517; color: #bdbdc2; border-color: #2a2a2c; text-transform: uppercase; letter-spacing: .04em;
    }
    .dasdev-foot button:hover { background: #151517; color: #fff; border-color: #3d3d41; }
    .dasdev-foot button.is-primary { background: #fff; border-color: #fff; color: #0b0b0c; font-weight: 500; }
    .dasdev-foot button.is-primary:hover { background: #e8e8e8; }
  `
  document.head.appendChild(style)

  // Trong vùng bảng tinh chỉnh thì để con trỏ mặc định của hệ điều hành, cho dễ
  // kéo slider. Ghi vào một thuộc tính runtime nằm ngoài CONFIG của các file hiệu ứng
  // nên không bao giờ lọt vào bản production khi Copy code.
  const NATIVE_ZONE = '.dasdev-panel, .dasdev-btn'
  ;(function claimNativeZone(tries) {
    if (window.KX_CURSOR) {
      const cur = window.KX_CURSOR.nativeOnExtra || ''
      if (!cur.includes(NATIVE_ZONE)) {
        window.KX_CURSOR.nativeOnExtra = cur ? cur + ', ' + NATIVE_ZONE : NATIVE_ZONE
      }
      return
    }
    if (tries > 0) setTimeout(() => claimNativeZone(tries - 1), 60)
  })(40)

  /* ----------------------------------------------------------------------- nút */

  const btn = document.createElement('button')
  btn.type = 'button'
  btn.className = 'dasdev-btn'
  btn.setAttribute('aria-expanded', 'false')
  btn.setAttribute('aria-label', 'Bảng tinh chỉnh hiệu ứng')
  btn.title = 'Tinh chỉnh hiệu ứng (H)'
  btn.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 7h10M18 7h2M4 12h3M11 12h9M4 17h8M16 17h4" stroke="currentColor" stroke-width="2" stroke-linecap="square"/>
      <circle cx="16" cy="7" r="2.1" fill="currentColor"/>
      <circle cx="9" cy="12" r="2.1" fill="currentColor"/>
      <circle cx="14" cy="17" r="2.1" fill="currentColor"/>
    </svg>`
  document.body.appendChild(btn)

  /* --------------------------------------------------------------------- bảng */

  let panel = null
  // Cửa sổ riêng của bảng (nếu đã tách). Sinh ra để thoát khỏi viewport của
  // trang: khi đang xem ở khung giả lập điện thoại, panel là position: fixed
  // nên bị kẹp trong đúng 375px đó, che mất cái đang sửa. Một cửa sổ khác của
  // trình duyệt thì không bị kẹp — kéo nó ra chỗ trống cạnh khung là xong.
  let cuaSoRieng = null
  let rows = []
  let boxes = []
  let activeTab = store.__tab || (MODULES[0] && MODULES[0].tab)
  // Khổ màn đang lọc trong bảng: 'all' | 'dt' | 'tb' | 'mb'. Đây là bộ LỌC của
  // bảng, không dính gì tới "Khổ màn ngắm thử" ở trên (cái đó zoom trang thật).
  let activeKhuc = store.__khuc || 'all'

  /* ------------------------------------------------------ preview breakpoint */

  // Ngắm bố cục ở các khổ màn phổ biến mà không phải đổi kích thước cửa sổ thật.
  // 0 = dùng đúng khổ màn đang có.
  const BREAKPOINTS = [
    { w: 0, label: 'Khổ màn thật' },
    { w: 1440, label: '1440 × 900 · Laptop' },
    { w: 1680, label: '1680 × 1050 · Desktop' },
    { w: 1920, label: '1920 × 1080 · Desktop' },
    { w: 2560, label: '2560 × 1440 · Desktop' },
  ]

  // Cách làm: đặt `zoom` lên <html>. Khác với `transform: scale`, `zoom` đổi
  // luôn kích thước viewport TÍNH THEO CSS px, nên `100vw` thành đúng bề ngang
  // muốn giả lập — thang Osmo của site (clamp(1440px,100vw,1920px)/120) và các
  // đơn vị cqw vì thế cũng chạy đúng như ở màn thật. `position: fixed` vẫn neo
  // đúng, thứ mà transform sẽ phá.
  // Panel tinh chỉnh phải zoom ngược lại để không bị phóng/thu theo.
  let bpWidth = Number(store.__bp) || 0

  function applyBreakpoint(w) {
    bpWidth = Number(w) || 0
    store.__bp = bpWidth
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(store))
    } catch {}

    const root = document.documentElement
    const z = bpWidth > 0 ? window.innerWidth / bpWidth : 0
    if (z > 0) root.style.zoom = String(z)
    else root.style.removeProperty('zoom')
    // Chỉ bù zoom khi panel còn nằm trong trang; ở cửa sổ riêng nó không dính
    // zoom của <html> trang chính nên bù vào là méo.
    if (panel && panel.ownerDocument === document) panel.style.zoom = z > 0 ? String(1 / z) : ''

    // `--size-font` (thang Osmo) khai inline trong HTML trên chính <html>, mà
    // `zoom` đặt lên <html> KHÔNG làm `100vw` của chính nó tính lại — nó vẫn bám
    // bề ngang cửa sổ thật. Phải tự tính lại theo đúng công thức của site:
    //     clamp(1440px, 100vw, 1920px) / 120
    if (bpWidth > 0) {
      root.style.setProperty('--size-font', `${Math.min(Math.max(bpWidth, 1440), 1920) / 120}px`)
    } else {
      root.style.removeProperty('--size-font')
    }

    // Lenis + ScrollTrigger đã đo sẵn kích thước cũ, phải cho đo lại.
    try {
      window.ScrollTrigger && window.ScrollTrigger.refresh()
    } catch {}
    updateBpLabel()
  }

  function updateBpLabel() {
    if (!panel) return
    const out = panel.querySelector('.dasdev-bp-now')
    if (!out) return
    const z = bpWidth > 0 ? window.innerWidth / bpWidth : 1
    const w = Math.round(window.innerWidth / z)
    const h = Math.round(window.innerHeight / z)
    // In ra khổ THẬT đang giả lập: chiều cao suy từ cửa sổ hiện tại chứ không
    // phải con số 900/1050/1080 trong danh sách, nói dối thì vô ích.
    out.textContent = bpWidth > 0 ? `đang giả lập ${w} × ${h}` : `${w} × ${h}`
  }

  window.addEventListener('resize', () => {
    if (bpWidth > 0) applyBreakpoint(bpWidth)
    else updateBpLabel()
  })

  function selectTab(tab) {
    activeTab = tab
    store.__tab = tab
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(store))
    } catch {}
    boxes.forEach(({ mod, box }) => {
      box.hidden = mod.tab !== tab
    })
    if (panel) {
      panel.querySelectorAll('.dasdev-tablist button').forEach((b) => {
        b.setAttribute('aria-selected', String(b.dataset.tab === tab))
      })
      const label = panel.querySelector('.dasdev-tabsel span')
      if (label) label.textContent = tab || ''
      panel.querySelector('.dasdev-body').scrollTop = 0
    }
  }

  // Cho một khung con cuộn được bằng cú lăn chuột.
  //
  // Lenis nghe wheel ở tầm window với passive: false rồi preventDefault() sạch,
  // nên mọi khung có overflow: auto bên trong trang đều đứng im — kể cả khi đã
  // gắn data-lenis-prevent (bản Lenis của site này không đọc thuộc tính đó).
  // Nên tự cuộn lấy rồi CHẶN sự kiện lan lên window: Lenis không thấy cú lăn
  // này thì không có gì để nuốt. Vẫn giữ data-lenis-prevent trong markup cho
  // trường hợp site nâng Lenis lên bản có hỗ trợ.
  function choCuon(el) {
    if (!el || el.dataset.dasdevCuon) return
    el.dataset.dasdevCuon = '1'
    el.addEventListener(
      'wheel',
      (e) => {
        if (el.scrollHeight <= el.clientHeight) return
        el.scrollTop += e.deltaY
        e.preventDefault()
        e.stopPropagation()
      },
      { passive: false }
    )
  }

  function selectKhuc(id) {
    activeKhuc = id
    store.__khuc = id
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(store))
    } catch {}
    if (panel) {
      panel.querySelectorAll('.dasdev-dd.is-khuc .dasdev-tablist button').forEach((b) => {
        b.setAttribute('aria-selected', String(b.dataset.khuc === id))
      })
      const label = panel.querySelector('.dasdev-dd.is-khuc .dasdev-tabsel span')
      const kh = KHUC.find((k) => k.id === id)
      if (label) label.textContent = kh ? kh.ten : 'Mọi khổ màn'
    }
    sync()
  }

  function fmt(field, v) {
    const dec = field.step < 0.1 ? 2 : field.step < 1 ? 2 : 0
    return Number(v).toFixed(dec) + (field.unit || '')
  }

  function jsValue(v) {
    return typeof v === 'string' ? `'${v}'` : String(v)
  }

  // Giá trị sẽ ghi ra: key devOnly luôn xuất về mặc định, để không đẩy trạng thái
  // ngắm thử lên file thật.
  function configValues(mod) {
    const api = mod.api()
    const devOnly = mod.devOnly || []
    const out = {}
    Object.keys(api.defaults).forEach((k) => {
      out[k] = devOnly.includes(k) ? api.defaults[k] : api.config[k]
    })
    return out
  }

  function configSnippet(mod) {
    const vals = configValues(mod)
    const lines = Object.keys(vals).map((k) => `  ${k}: ${jsValue(vals[k])},`)
    return `// dán thay cho khối CONFIG trong ${mod.file}\nconst CONFIG = {\n${lines.join('\n')}\n}`
  }

  function buildPanel() {
    const el = document.createElement('div')
    el.className = 'dasdev-panel'
    el.innerHTML = `
      <div class="dasdev-head">
        <strong>Settings</strong>
        <span class="dasdev-headr">
          <button type="button" class="dasdev-tach" data-act="tach" title="Tách ra cửa sổ riêng">Tách cửa sổ</button>
          <em>H · Esc</em>
        </span>
      </div>
      <div class="dasdev-warn" hidden>Đang giữ logo ở một góc cố định — bỏ tick
        “Giữ ở một góc cố định” để chạy lại theo scroll.</div>
      <!-- Khổ màn đứng TRÊN dropdown module: nó áp cho toàn trang, còn dropdown
           chỉ chọn module đang chỉnh -> cấp cao hơn thì nằm trên. -->
      <div class="dasdev-bp">
        <div class="dasdev-bp-head"><b>Khổ màn ngắm thử</b><span class="dasdev-bp-now"></span></div>
        <div class="dasdev-bp-row"></div>
      </div>
      <div class="dasdev-tabs">
        <div class="dasdev-dd is-mod">
          <button type="button" class="dasdev-tabsel" aria-haspopup="listbox" aria-expanded="false"><span></span></button>
          <div class="dasdev-tablist" role="listbox" hidden data-lenis-prevent></div>
        </div>
        <div class="dasdev-dd is-khuc">
          <button type="button" class="dasdev-tabsel" aria-haspopup="listbox" aria-expanded="false"><span></span></button>
          <div class="dasdev-tablist" role="listbox" hidden data-lenis-prevent></div>
        </div>
      </div>
      <div class="dasdev-body" data-lenis-prevent></div>
      <div class="dasdev-foot">
        <button type="button" data-act="reset">Mặc định</button>
        <button type="button" data-act="save">Lưu vào file</button>
        <button type="button" class="is-primary" data-act="copy">Copy code</button>
      </div>`

    const body = el.querySelector('.dasdev-body')
    const bpRow = el.querySelector('.dasdev-bp-row')
    BREAKPOINTS.forEach(({ w, label }) => {
      const b = document.createElement('button')
      b.type = 'button'
      b.dataset.bp = String(w)
      b.textContent = w > 0 ? String(w) : 'Thật'
      b.title = label
      b.onclick = () => {
        applyBreakpoint(w)
        bpRow.querySelectorAll('button').forEach((x) => {
          x.setAttribute('aria-pressed', String(Number(x.dataset.bp) === bpWidth))
        })
      }
      bpRow.appendChild(b)
    })

    const tabSel = el.querySelector('.dasdev-dd.is-mod .dasdev-tabsel')
    const tabList = el.querySelector('.dasdev-dd.is-mod .dasdev-tablist')
    const khucSel = el.querySelector('.dasdev-dd.is-khuc .dasdev-tabsel')
    const khucList = el.querySelector('.dasdev-dd.is-khuc .dasdev-tablist')
    choCuon(body)
    choCuon(tabList)
    choCuon(khucList)

    const closeTabs = () => {
      tabList.hidden = true
      khucList.hidden = true
      tabSel.setAttribute('aria-expanded', 'false')
      khucSel.setAttribute('aria-expanded', 'false')
    }
    // Mở cái này thì đóng cái kia — hai popup chồng nhau thì bấm trúng cái nào
    // cũng khó nói.
    const moDrop = (sel, list, kia) => (e) => {
      e.stopPropagation()
      const open = list.hidden
      kia.hidden = true
      list.hidden = !open
      sel.setAttribute('aria-expanded', String(open))
    }
    tabSel.onclick = moDrop(tabSel, tabList, khucList)
    khucSel.onclick = moDrop(khucSel, khucList, tabList)

    // Dropdown khổ màn: danh sách cố định, không suy từ module nào.
    ;[{ id: 'all', ten: 'Mọi khổ màn' }, ...KHUC].forEach((kh) => {
      const b = document.createElement('button')
      b.type = 'button'
      b.setAttribute('role', 'option')
      b.dataset.khuc = kh.id
      b.textContent = kh.ten + (kh.ghi ? '  ' + kh.ghi : '')
      b.onclick = () => {
        selectKhuc(kh.id)
        closeTabs()
      }
      khucList.appendChild(b)
    })
    // Bấm ra ngoài hoặc Esc thì đóng. Dùng capture để không bị các handler khác
    // của trang nuốt mất sự kiện.
    document.addEventListener('pointerdown', (e) => {
      if ((!tabList.hidden || !khucList.hidden) && !el.querySelector('.dasdev-tabs').contains(e.target)) closeTabs()
    }, true)
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && (!tabList.hidden || !khucList.hidden)) closeTabs()
    }, true)
    rows = []
    boxes = []

    MODULES.forEach((mod) => {
      const api = mod.api()
      if (!api) return

      const box = document.createElement('div')
      box.className = 'dasdev-mod'
      const h = document.createElement('h5')
      h.textContent = mod.title
      const p = document.createElement('p')
      p.textContent = mod.file
      box.append(h, p)

      // Chia field theo khổ màn trước, giữ nguyên thứ tự nhóm chủ đề bên trong.
      // Module nào chỉ có một khúc thì KHÔNG dựng tiêu đề khúc — thêm một dòng
      // "Desktop" vào những bảng vốn chẳng có gì để so sánh chỉ tổ rối mắt.
      const khuc = KHUC.map((kh) => ({
        kh,
        nhom: mod.groups
          .map((group) => ({ group, fields: group.fields.filter((f) => khucCua(f) === kh.id) }))
          .filter((o) => o.fields.length),
      })).filter((o) => o.nhom.length)

      const phanKhuc = []
      khuc.forEach(({ kh, nhom }) => {
        let dat = box
        if (khuc.length > 1) {
          dat = document.createElement('div')
          dat.className = 'dasdev-bpsec'
          const ten = document.createElement('h6')
          ten.className = 'dasdev-bpsec-ten'
          ten.appendChild(document.createTextNode(kh.ten))
          const ghi = document.createElement('span')
          ghi.textContent = (mod.khucGhi && mod.khucGhi[kh.id]) || kh.ghi
          ten.appendChild(ghi)
          dat.appendChild(ten)
          box.appendChild(dat)
        }
        nhom.forEach(({ group, fields }) => phanKhuc.push({ dat, group, fields }))
      })

      phanKhuc.forEach(({ dat, group, fields }) => {
        const wrap = document.createElement('div')
        wrap.className = 'dasdev-grp'
        const title = document.createElement('h6')
        title.textContent = group.name
        wrap.appendChild(title)

        fields.forEach((field) => {
          const row = document.createElement('div')
          row.className = 'dasdev-row'
          let input
          let value = null

          if (field.type === 'bool') {
            const label = document.createElement('label')
            label.className = 'dasdev-check'
            input = document.createElement('input')
            input.type = 'checkbox'
            label.append(input, document.createTextNode(field.label))
            row.appendChild(label)
          } else {
            const label = document.createElement('label')
            label.textContent = field.label
            value = document.createElement('b')
            label.appendChild(value)
            row.appendChild(label)

            if (field.type === 'text') {
              input = document.createElement('input')
              input.type = 'text'
            } else if (field.type === 'file') {
              // Ô đường dẫn + nút tải file lên. File được ghi vào assets/media/
              // qua serve.mjs, rồi đường dẫn trả về ghi thẳng vào CONFIG.
              input = document.createElement('input')
              input.type = 'text'
              input.placeholder = 'để trống = không dùng ô này'
              const pick = document.createElement('button')
              pick.type = 'button'
              pick.className = 'dasdev-pick'
              pick.textContent = 'Tải lên…'
              const file = document.createElement('input')
              file.type = 'file'
              file.accept = 'image/*,video/*'
              file.hidden = true
              pick.onclick = () => file.click()
              file.onchange = async () => {
                const f = file.files && file.files[0]
                if (!f) return
                pick.textContent = 'Đang tải…'
                try {
                  const r = await fetch('/__kx-upload', {
                    method: 'POST',
                    headers: { 'x-kx-filename': encodeURIComponent(f.name) },
                    body: f,
                  })
                  const j = await r.json()
                  if (!j.ok) throw new Error(j.error || 'lỗi không rõ')
                  input.value = j.path
                  input.dispatchEvent(new Event('input', { bubbles: true }))

                  // GHI THẲNG ĐƯỜNG DẪN VÀO FILE ngay, không chờ bấm "Lưu vào
                  // file". File ảnh đã nằm an toàn trong assets/media/, nhưng
                  // nếu đường dẫn chỉ nằm trong localStorage thì xoá bộ nhớ
                  // trình duyệt hoặc đổi máy là mất trắng công upload.
                  const rs = await fetch('/__kx-save', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ file: mod.file, values: { [field.k]: j.path } }),
                  })
                  const js = await rs.json()
                  if (!js.ok) throw new Error(js.error || 'ghi vào file thất bại')
                  pick.textContent = (js.boQua || []).length ? 'Xong (chưa ghi file)' : 'Đã lưu'
                } catch (e) {
                  pick.textContent = 'Lỗi'
                  console.error('[kx-devtools] upload thất bại:', e)
                }
                file.value = ''
                setTimeout(() => (pick.textContent = 'Tải lên…'), 1800)
              }
              // GÁN GIÁ TRỊ BAN ĐẦU ngay tại đây. Nhánh này `return` sớm ở cuối
              // nên không chạy tới đoạn gán dùng chung của các loại trường khác
              // — thiếu dòng này thì ô luôn hiện rỗng dù CONFIG có đường dẫn,
              // nhìn như ảnh đã upload bị mất sạch.
              input.value = mod.api().config[field.k] || ''
              row.append(input, pick, file)
              // Đẩy ĐỦ bộ như nhánh thường. Thiếu `row` thì sync() vấp ngay ở
              // row.style.display -> ném lỗi mỗi lần mở bảng hoặc kéo bất kỳ
              // núm nào, và mọi hàng phía sau không được cập nhật.
              // Và phải gắn vào `wrap` (khung của nhóm) chứ không phải `body`
              // (thân cả bảng), không thì hàng upload rơi xuống cuối bảng, tách
              // khỏi nhóm của nó.
              rows.push({ mod, group, field, row, input, value, groupEl: wrap })
              wrap.appendChild(row)
              input.addEventListener('input', () => {
                mod.api().config[field.k] = input.value
                persist(mod)
                sync()
              })
              return
            } else if (field.type === 'enum') {
              input = document.createElement('select')
              field.options.forEach(([v, text]) => {
                const opt = document.createElement('option')
                opt.value = String(v)
                opt.textContent = text
                input.appendChild(opt)
              })
            } else {
              input = document.createElement('input')
              input.type = 'range'
              input.min = field.min
              input.max = field.max
              input.step = field.step
            }
            row.appendChild(input)
          }

          input.addEventListener('input', () => {
            const cfg = mod.api().config
            if (field.type === 'bool') cfg[field.k] = input.checked
            else if (field.type === 'text') cfg[field.k] = input.value
            else if (field.type === 'enum') {
              const match = field.options.find(([v]) => String(v) === input.value)
              cfg[field.k] = match ? match[0] : input.value
            } else cfg[field.k] = parseFloat(input.value)
            persist(mod)
            sync()
          })

          wrap.appendChild(row)
          rows.push({ mod, group, field, row, input, value, groupEl: wrap, khucEl: dat === box ? null : dat })
        })

        dat.appendChild(wrap)
      })

      body.appendChild(box)
      boxes.push({ mod, box })
    })

    // một mục dropdown cho mỗi module
    boxes.forEach(({ mod }) => {
      const b = document.createElement('button')
      b.type = 'button'
      b.setAttribute('role', 'option')
      b.dataset.tab = mod.tab
      b.textContent = mod.tab
      b.onclick = () => {
        selectTab(mod.tab)
        closeTabs()
      }
      tabList.appendChild(b)
    })
    if (!boxes.some(({ mod }) => mod.tab === activeTab)) {
      activeTab = boxes[0] && boxes[0].mod.tab
    }

    el.querySelector('[data-act=reset]').onclick = () => {
      MODULES.filter((mod) => mod.tab === activeTab).forEach((mod) => {
        const api = mod.api()
        if (!api) return
        Object.assign(api.config, api.defaults)
        persist(mod)
      })
      sync()
    }

    // Ghi thẳng giá trị đang chỉnh vào file hiệu ứng, qua endpoint của serve.mjs.
    // serve.mjs chỉ vá phần GIÁ TRỊ của từng key nên comment trong file giữ nguyên.
    const saveBtn = el.querySelector('[data-act=save]')
    saveBtn.onclick = async () => {
      const mods = MODULES.filter((m) => m.api() && m.tab === activeTab)
      if (!mods.length) return
      saveBtn.textContent = 'Đang lưu…'
      try {
        const ket = []
        for (const mod of mods) {
          const r = await fetch('/__kx-save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ file: mod.file, values: configValues(mod) }),
          })
          const j = await r.json()
          if (!j.ok) throw new Error(j.error || 'lỗi không rõ')
          ket.push(j)
        }
        const boQua = ket.flatMap((k) => k.boQua || [])
        saveBtn.textContent = boQua.length ? `Lưu xong, sót ${boQua.length}` : 'Đã lưu'
        if (boQua.length) console.warn('[kx-devtools] không tìm thấy key trong file:', boQua)
      } catch (e) {
        saveBtn.textContent = 'Lưu lỗi'
        console.error('[kx-devtools] lưu thất bại:', e)
      }
      setTimeout(() => (saveBtn.textContent = 'Lưu vào file'), 2000)
    }

    el.querySelector('[data-act=tach]').onclick = () => {
      if (cuaSoRieng && !cuaSoRieng.closed) cuaSoRieng.close()
      else tachCuaSo()
    }

    const copyBtn = el.querySelector('[data-act=copy]')
    copyBtn.onclick = async () => {
      const text = MODULES.filter((m) => m.api() && m.tab === activeTab)
        .map(configSnippet)
        .join('\n\n')
      try {
        await navigator.clipboard.writeText(text)
        copyBtn.textContent = 'Đã copy'
      } catch {
        console.log(text)
        copyBtn.textContent = 'Xem console'
      }
      setTimeout(() => (copyBtn.textContent = 'Copy code'), 1500)
    }

    document.body.appendChild(el)
    panel = el
    selectTab(activeTab)
    selectKhuc(activeKhuc)
    // Khôi phục khổ màn đã chọn từ lần trước.
    bpRow.querySelectorAll('button').forEach((x) => {
      x.setAttribute('aria-pressed', String(Number(x.dataset.bp) === bpWidth))
    })
    applyBreakpoint(bpWidth)
    return el
  }

  function sync() {
    rows.forEach(({ mod, field, row, input, value }) => {
      const cfg = mod.api().config
      const hopKhuc = activeKhuc === 'all' || khucCua(field) === activeKhuc
      row.style.display = !hopKhuc || (field.when && !field.when(cfg)) ? 'none' : ''
      if (field.type === 'bool') input.checked = !!cfg[field.k]
      else if (field.type === 'text' || field.type === 'file') {
        if (document.activeElement !== input) input.value = cfg[field.k] == null ? '' : cfg[field.k]
        value.textContent = ''
      } else if (field.type === 'enum') input.value = String(cfg[field.k])
      else {
        input.value = cfg[field.k]
        value.textContent = fmt(field, cfg[field.k])
      }
    })
    // ẩn cả nhóm nếu mọi field trong nhóm đều bị ẩn
    const groups = new Map()
    rows.forEach(({ groupEl, row }) => {
      const shown = groups.get(groupEl) || false
      groups.set(groupEl, shown || row.style.display !== 'none')
    })
    groups.forEach((shown, groupEl) => {
      groupEl.style.display = shown ? '' : 'none'
    })

    // và ẩn cả phân khúc khi mọi nhóm trong khúc đều ẩn
    const khucs = new Map()
    rows.forEach(({ khucEl, row }) => {
      if (!khucEl) return
      khucs.set(khucEl, (khucs.get(khucEl) || false) || row.style.display !== 'none')
    })
    khucs.forEach((shown, khucEl) => {
      khucEl.style.display = shown ? '' : 'none'
    })

    const warn = panel && panel.querySelector('.dasdev-warn')
    if (warn) {
      const logo = MODULES.find((m) => m.id === 'logo3d')
      warn.hidden = !(activeTab === 'Logo' && logo && logo.api() && logo.api().config.preview)
    }
  }

  // Đưa panel trở lại trang chính. Gọi cả khi người dùng đóng cửa sổ riêng.
  function ganLai() {
    if (!panel) return
    if (panel.ownerDocument !== document) document.body.appendChild(document.adoptNode(panel))
    panel.classList.remove('is-rieng')
    cuaSoRieng = null
    const nut = panel.querySelector('[data-act=tach]')
    if (nut) nut.textContent = 'Tách cửa sổ'
    sync()
  }

  function tachCuaSo() {
    if (cuaSoRieng && !cuaSoRieng.closed) {
      cuaSoRieng.focus()
      return
    }
    if (!panel) panel = buildPanel()
    const w = window.open('', 'kx-devtools', 'width=380,height=900,menubar=no,toolbar=no,location=no')
    if (!w) {
      // Báo ngay trên nút: người dùng bấm rồi mà không thấy gì xảy ra thì tưởng
      // tính năng hỏng, chứ ít ai mở console ra đọc.
      console.warn('[kx-devtools] trình duyệt chặn cửa sổ mới — cho phép popup cho localhost rồi bấm lại.')
      const nut = panel.querySelector('[data-act=tach]')
      if (nut) {
        nut.textContent = 'Bị chặn popup'
        setTimeout(() => (nut.textContent = 'Tách cửa sổ'), 2500)
      }
      return
    }
    cuaSoRieng = w
    const d = w.document
    d.title = 'kaixa — tinh chỉnh'
    d.body.style.cssText = 'margin:0;background:#101010'
    // CSS của bảng nằm trong <style> của trang chính, cửa sổ mới không thấy —
    // chép nguyên văn sang, một bản là đủ vì hai bên dùng chung chuỗi đó.
    const st = d.createElement('style')
    st.textContent = style.textContent
    d.head.appendChild(st)

    d.body.appendChild(d.adoptNode(panel))
    panel.classList.add('is-rieng')
    panel.hidden = false
    panel.style.removeProperty('zoom')
    const nut = panel.querySelector('[data-act=tach]')
    if (nut) nut.textContent = 'Gắn lại'

    // Bấm ra ngoài trong CHÍNH cửa sổ đó thì đóng dropdown; handler cũ gắn trên
    // document của trang chính nên không nghe được sự kiện bên này.
    d.addEventListener('pointerdown', (e) => {
      const tabs = panel.querySelector('.dasdev-tabs')
      if (tabs && !tabs.contains(e.target)) {
        panel.querySelectorAll('.dasdev-tablist').forEach((l) => (l.hidden = true))
        panel.querySelectorAll('.dasdev-tabsel').forEach((b) => b.setAttribute('aria-expanded', 'false'))
      }
    }, true)
    w.addEventListener('beforeunload', ganLai)
    // Trang chính đóng thì đóng luôn cửa sổ con, không để nó mồ côi.
    window.addEventListener('beforeunload', () => w.close())
    sync()
  }

  function open() {
    if (!panel) panel = buildPanel()
    if (cuaSoRieng && !cuaSoRieng.closed) {
      cuaSoRieng.focus()
      sync()
      return
    }
    panel.hidden = false
    btn.setAttribute('aria-expanded', 'true')
    sync()
  }
  function close() {
    // Đang tách thì panel nằm ở cửa sổ khác: ẩn nó đi là mất tiêu bảng mà cửa
    // sổ vẫn mở, nhìn như hỏng. Đóng cửa sổ mới đúng là "đóng".
    if (cuaSoRieng && !cuaSoRieng.closed) {
      cuaSoRieng.close()
      return
    }
    if (panel) panel.hidden = true
    btn.setAttribute('aria-expanded', 'false')
  }
  function toggle() {
    if (btn.getAttribute('aria-expanded') === 'true') close()
    else open()
  }

  btn.addEventListener('click', toggle)
  window.addEventListener('keydown', (e) => {
    const tag = (e.target.tagName || '').toLowerCase()
    if (tag === 'input' || tag === 'textarea' || e.target.isContentEditable) return
    if (e.key === 'Escape') close()
    // H mở/đóng — cùng phím với bảng của bốn trang Figma (kx-panel.js).
    else if (!e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey && (e.key === 'h' || e.key === 'H')) {
      e.preventDefault()
      toggle()
    } else if (e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey && e.code === 'KeyL') {
      e.preventDefault()
      toggle()
    }
  })

  // Áp lại các giá trị đã lưu từ lần chỉnh trước, ngay khi module có mặt.
  ;(function applyStored(tries) {
    let pending = false
    MODULES.forEach((mod) => {
      const api = mod.api()
      if (!api) {
        pending = true
        return
      }
      if (store[mod.id]) Object.assign(api.config, store[mod.id])
    })
    if (pending && tries > 0) setTimeout(() => applyStored(tries - 1), 60)
    else if (panel && !panel.hidden) sync()
  })(40)

  window.KX_DEVTOOLS = { open, close, toggle, tach: tachCuaSo, ganLai, snippet: () => MODULES.filter((m) => m.api()).map(configSnippet).join('\n\n') }
})()
