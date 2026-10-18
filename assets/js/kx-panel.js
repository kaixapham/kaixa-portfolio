/* =============================================================================
 * kaixa Portfolio — Bảng setting của bốn trang Figma
 * -----------------------------------------------------------------------------
 * Bấm phím H để mở/đóng một bảng gồm nhiều MỤC (không còn nút trên trang —
 * người dùng chốt ẩn đi); mỗi mục là một khối thả
 * xuống (bấm tiêu đề để mở/đóng). Mục nào chỉ hiện trên trang có đúng hiệu ứng
 * đó — trang không có mục nào thì không hiện cả nút.
 *
 * Đây là file LÀM VIỆC, không phải hiệu ứng (luật số 1 của project): bàn giao
 * thì xoá đúng MỘT thẻ script `kx-panel.js` trong `tools/figma-to-html.mjs`,
 * y như lệ của `kx-devtools.js` ở trang contact. Không file hiệu ứng nào biết
 * tới file này — mọi trao đổi đi qua `window.KX_*.config`.
 *
 * THÊM MỘT MỤC MỚI: thêm một khối vào `MUC` bên dưới. Hiệu ứng chỉ cần lộ ra
 * `window.KX_TÊN = { config, defaults }` (config PHẲNG — luật số 2), và nếu có
 * khoá không tự ăn mỗi khung thì thêm hàm `apDung()`.
 *
 * NÚT "LƯU TẤT CẢ" ở chân bảng ghi mọi setting đã đổi của mọi mục vào file.
 *
 * NHỚ TẠM: chỉ nhớ những khoá KHAI trong `MUC` và chỉ khi khác mặc định. Không đi
 * vòng qua cả `defaults` như `persist()` của kx-devtools.js — chính cái đó
 * từng làm trạng thái lúc chạy bị ghi xuống rồi áp lại lúc mở trang.
 *
 * MỌI LUẬT CSS PHẢI CÓ TIỀN TỐ `.kx-pn`: kx-site.css có reset kiểu Tailwind
 * preflight (button nền trong suốt, viền 0) nên luật trần sẽ bị xoá mất viền
 * và nền — đúng cái bẫy đã vấp với `.kx-bm` và `.kx-cdb`.
 * ========================================================================== */
;(function () {
  'use strict'

  // File LÀM VIỆC: chỉ chạy trên máy (localhost). Bản live (Vercel, GitHub
  // Pages) không có bảng, không có phím tắt — người dùng chốt. Thêm ?live vào
  // URL để xem thử như bản live ngay trên máy.
  if (!/^(localhost|127\.0\.0\.1|\[::1\]|.+\.localhost)$/.test(location.hostname) || /[?&]live\b/.test(location.search)) return

  /* ------------------------------------------------------------------ MỤC
   * type: 'range' (mặc định) | 'toggle' | 'color' | 'chon' (danh sách chọn,
   * `chon: [[giá trị, nhãn], …]`, giá trị là chuỗi). `nhom` là dòng tiêu đề nhỏ chia cụm.
   * `don` là đơn vị hiện cạnh số. */
  var MUC = [
    {
      id: 'works-image',
      file: 'assets/js/kx-wave-images.js', // nút Lưu ghi thẳng vào CONFIG của file này
      ten: 'Works Image Effect',
      mota: 'Ảnh dự án gợn sóng khi cuộn — chỉ cong theo phương dọc.',
      api: 'KX_WAVE_IMAGES',
      rung: true, // có nút "Rung thử"
      truong: [
        { key: 'wave', nhan: 'Bật sóng', type: 'toggle' },
        { key: 'bendPerImage', nhan: 'Cong theo từng ảnh', type: 'toggle', goiY: 'tắt = cong chung một vòng cung cả hàng' },
        { nhom: 'Độ cong' },
        { key: 'bend', nhan: 'Độ cong theo cuộn', min: 0, max: 1.5, step: 0.01, goiY: 'px cong trên mỗi px cuộn/khung' },
        { key: 'maxBow', nhan: 'Cong tối đa', min: 0, max: 160, step: 1, don: 'px', goiY: 'trần — chặn cú nhảy cuộn xa' },
        { nhom: 'Lò xo' },
        { key: 'bendStiffness', nhan: 'Độ cứng', min: 20, max: 900, step: 5, goiY: 'cao = bám theo cuộn sát hơn' },
        { key: 'bendDamping', nhan: 'Độ hãm', min: 2, max: 90, step: 1, goiY: 'thấp = nảy nhiều nhịp hơn' },
        { key: 'lagBottom', nhan: 'Mép dưới mềm', min: 0.1, max: 1, step: 0.01, goiY: '1 = cùng nhịp mép trên' },
        { nhom: 'Kéo ảnh theo mép' },
        { key: 'drag', nhan: 'Lực kéo', min: 0, max: 1.5, step: 0.01, goiY: '0 = chỉ cong viền, ảnh đứng yên' },
        { key: 'dragReach', nhan: 'Vùng bị kéo', min: 10, max: 400, step: 5, don: 'px' },
      ],
    },
    {
      id: 'works-disc',
      file: 'assets/js/kx-spin.js', // nút Lưu ghi thẳng vào CONFIG của file này
      ten: 'Works Disc',
      mota: 'Đĩa ở cột trái quay theo cuộn — xuống quay thuận, lên quay ngược.',
      api: 'KX_SPIN',
      trang: 'works', // KX_SPIN có trên cả bốn trang; mục này chỉ có nghĩa ở Works
      truong: [
        { key: 'scrollSpin', nhan: 'Quay theo cuộn', type: 'toggle', goiY: 'tắt = quay đều như Figma' },
        { key: 'scrollDeg', nhan: 'Độ quay mỗi px cuộn', min: 0, max: 2, step: 0.01, don: '°', goiY: '0.3 ≈ một vòng mỗi 1200 px' },
        { key: 'scrollEase', nhan: 'Độ bám', min: 0.01, max: 1, step: 0.01, goiY: '1 = bám cứng, nhỏ = trôi có đà' },
        { key: 'scrollReverse', nhan: 'Đảo chiều', type: 'toggle' },
        { key: 'idleDeg', nhan: 'Quay đều khi đứng yên', min: 0, max: 180, step: 1, don: '°/s', goiY: '0 = chỉ quay khi cuộn' },
        { nhom: 'Quán tính' },
        { key: 'spinMomentum', nhan: 'Lực trớn', min: 0, max: 2, step: 0.01, goiY: 'đĩa trôi thêm bấy nhiêu lần góc của nhát cuộn; 0 = không trớn' },
        { key: 'spinFriction', nhan: 'Độ trôi', min: 0.8, max: 0.995, step: 0.001, goiY: 'cao = thôi cuộn rồi còn quay lâu' },
      ],
    },
    {
      id: 'disc-visual',
      file: 'assets/js/kx-disc-swap.js',
      ten: 'Disc Visual',
      mota: 'Đĩa ở cột trái đổi mặt khi cuộn tới dự án mới. Ô ảnh để trống thì tự dựng từ ảnh bìa dự án.',
      api: 'KX_DISC_SWAP',
      truong: [
        { key: 'enabled', nhan: 'Đổi mặt theo dự án', type: 'toggle', goiY: 'tắt = luôn là mặt đĩa gốc' },
        { key: 'line', nhan: 'Vạch đổi đĩa', min: 0, max: 1, step: 0.01, goiY: 'phần chiều cao viewport; 0.5 = giữa màn hình' },
        { key: 'fade', nhan: 'Thời gian chuyển', min: 0, max: 2000, step: 10, don: 'ms' },
        { key: 'pop', nhan: 'Phóng khi đổi', min: 0, max: 0.4, step: 0.01, goiY: '0 = chỉ mờ dần' },
        { nhom: 'Mặt đĩa tự dựng' },
        { key: 'gray', nhan: 'Chuyển xám', type: 'toggle' },
        { key: 'contrast', nhan: 'Tương phản', min: 0.5, max: 2, step: 0.01 },
        { key: 'hub', nhan: 'Vòng nhãn giữa', min: 0, max: 0.6, step: 0.01 },
        { key: 'hole', nhan: 'Lỗ tâm', min: 0, max: 0.3, step: 0.005 },
        { key: 'sheen', nhan: 'Vệt bóng', min: 0, max: 1, step: 0.01 },
      ],
    },
    {
      id: 'loop-strip',
      file: 'assets/js/kx-loop-strip.js',
      ten: 'Loop Strip',
      mota: 'Dải ảnh dự án nghiêng chạy vòng ở cụm "02." (kính lỏng hai mép, cụm thông tin đổi theo dự án) + hàng chữ theo lưới. Số là px thiết kế (khung 1920).',
      api: 'KX_LOOP_STRIP',
      trang: 'home',
      truong: [
        { nhom: 'Thẻ ảnh' },
        { key: 'cardW', nhan: 'Rộng thẻ', min: 150, max: 1000, step: 1, don: 'px' },
        { key: 'cardH', nhan: 'Cao thẻ', min: 100, max: 800, step: 1, don: 'px' },
        { key: 'gap', nhan: 'Khoảng cách giữa ảnh', min: 0, max: 300, step: 1, don: 'px' },
        { nhom: 'Nhãn trên ảnh' },
        { key: 'labelSize', nhan: 'Cỡ chữ nhãn', min: 8, max: 60, step: 1, don: 'px' },
        { key: 'labelGap', nhan: 'Khe nhãn – ảnh', min: 0, max: 60, step: 1, don: 'px' },
        { nhom: 'Dải' },
        { key: 'tilt', nhan: 'Độ nghiêng', min: -45, max: 45, step: 0.5, don: '°', goiY: 'âm = dâng lên về bên phải' },
        { key: 'stripY', nhan: 'Vị trí dọc (tâm dải)', min: 3300, max: 4400, step: 1, don: 'px', goiY: 'toạ độ trang Home' },
        { key: 'speed', nhan: 'Tốc độ chạy', min: 1, max: 400, step: 1, don: 'px/s' },
        { key: 'reverse', nhan: 'Chạy sang phải', type: 'toggle' },
        { nhom: 'Hàng chữ' },
        { key: 'headerY', nhan: 'Vị trí dọc', min: 3200, max: 3500, step: 1, don: 'px' },
        { key: 'textSize', nhan: 'Cỡ chữ', min: 8, max: 40, step: 1, don: 'px' },
        { nhom: 'Cụm thông tin' },
        { key: 'info', nhan: 'Đổi theo dự án', type: 'toggle', goiY: 'chạy hết 4 ảnh của dự án thì tên, số, cột thông tin đổi' },
        { key: 'infoAt', nhan: 'Điểm đọc dự án', min: 0, max: 1, step: 0.01, goiY: 'phần bề rộng viewport; 0.5 = giữa' },
        { key: 'infoAnim', nhan: 'Chữ chuyển động khi đổi', type: 'toggle', goiY: 'số lật · tên nhô lên · cột mono xáo chữ; tắt = mờ ra/vào' },
        { key: 'infoNumMs', nhan: 'Số lớn lật', min: 150, max: 1500, step: 10, don: 'ms' },
        { key: 'infoNameMs', nhan: 'Tên nhô lên', min: 150, max: 1500, step: 10, don: 'ms' },
        { key: 'infoStagger', nhan: 'Lệch nhịp giữa các chữ', min: 0, max: 150, step: 1, don: 'ms' },
        { key: 'infoScrambleMs', nhan: 'Cột mono xáo chữ', min: 100, max: 1500, step: 10, don: 'ms' },
        { key: 'infoFade', nhan: 'Thời gian mờ (khi tắt chuyển động)', min: 0, max: 1000, step: 10, don: 'ms' },
      ],
    },
    {
      id: 'type-hover',
      file: 'assets/js/kx-type-hover.js',
      ten: 'Text Hover',
      mota: 'Cột chữ mono đầu trang About, TỪNG DÒNG: rê vào thì thanh sáng mọc sau chữ (như Feature Works ở Home), dòng gõ lại (mép ngẫu nhiên, chốt dần) + ô con trỏ; rời ra thanh thụt về thành sóng.',
      api: 'KX_TYPE_HOVER',
      trang: 'about',
      truong: [
        { nhom: 'Gõ lại' },
        { key: 'nhipMs', nhan: 'Nhịp gõ', min: 10, max: 150, step: 5, don: 'ms' },
        { key: 'buoc', nhan: 'Kí tự mỗi nhịp', min: 1, max: 6, step: 1 },
        { key: 'maxMs', nhan: 'Trần thời gian một dòng', min: 200, max: 4000, step: 50, don: 'ms', goiY: 'dòng dài tự gõ nhanh hơn' },
        { key: 'tre', nhan: 'Vùng kí tự ngẫu nhiên', min: 0, max: 12, step: 1, don: 'nhịp' },
        { nhom: 'Thanh sáng' },
        { key: 'thanh', nhan: 'Thanh sáng', type: 'toggle' },
        { key: 'mauThanh', nhan: 'Màu thanh', type: 'color' },
        { key: 'mauChu', nhan: 'Màu chữ trên thanh', type: 'color' },
        { key: 'vaoMs', nhan: 'Mọc', min: 50, max: 1500, step: 10, don: 'ms' },
        { key: 'raMs', nhan: 'Thụt về (sóng)', min: 100, max: 3000, step: 50, don: 'ms' },
        { nhom: 'Con trỏ' },
        { key: 'conTro', nhan: 'Ô con trỏ', type: 'toggle' },
        { key: 'mauConTro', nhan: 'Màu con trỏ', type: 'color' },
      ],
    },
    {
      id: 'video-hover',
      ten: 'Video Hover',
      mota: 'Video đĩa đầu trang About: rê vào thì từng khối pixel bị đẩy theo hướng chuột rồi nhả dần, cộng kính lỏng bám 4 mép (như hover ảnh dự án ở Home).',
      api: 'KX_VIDEO_HOVER',
      file: 'assets/js/kx-video-hover.js',
      trang: 'about',
      truong: [
        { nhom: 'Pixel distort' },
        { key: 'pixel', nhan: 'Pixel distort', type: 'toggle' },
        { key: 'luoi', nhan: 'Số ô ngang', min: 6, max: 80, step: 1, goiY: 'ít ô = khối to' },
        { key: 'banKinh', nhan: 'Bán kính ảnh hưởng', min: 0.05, max: 0.6, step: 0.01 },
        { key: 'luc', nhan: 'Lực đẩy', min: 0, max: 3, step: 0.05 },
        { key: 'nha', nhan: 'Nhả chậm', min: 0.5, max: 0.99, step: 0.01, goiY: 'lớn = khối trôi về lâu hơn' },
        { key: 'toiDa', nhan: 'Lệch tối đa', min: 5, max: 200, step: 1, don: 'px' },
        { key: 'tachPx', nhan: 'Tách màu theo hướng đẩy', min: 0, max: 0.5, step: 0.01 },
        { nhom: 'Kính lỏng' },
        { key: 'kinh', nhan: 'Kính lỏng', type: 'toggle' },
        { key: 'lensBand', nhan: 'Độ sâu dải kính', min: 0.04, max: 0.4, step: 0.01 },
        { key: 'lensBend', nhan: 'Bẻ hình sát mép', min: 0, max: 80, step: 1, don: 'px' },
        { key: 'lensZoom', nhan: 'Phóng về con trỏ', min: 0, max: 0.2, step: 0.005 },
        { key: 'lensDisp', nhan: 'Tách đỏ/lam', min: 0, max: 20, step: 0.5, don: 'px' },
        { key: 'lensWave', nhan: 'Gợn dọc mép', min: 0, max: 0.4, step: 0.01 },
        { key: 'lensRim', nhan: 'Viền sáng', min: 0, max: 2, step: 0.05 },
        { key: 'lensColor', nhan: 'Màu quầng', type: 'color' },
        { key: 'lensMuot', nhan: 'Đuổi con trỏ', min: 0.02, max: 1, step: 0.01 },
        { key: 'lensVao', nhan: 'Tốc độ hiện/tắt', min: 0.02, max: 1, step: 0.01 },
      ],
    },
    {
      id: 'line-reveal',
      file: 'assets/js/kx-line-reveal.js',
      ten: 'Text Reveal',
      mota: 'Đoạn "Passionate about…" ở About: thanh màu mọc từ trái phủ từng dòng, chữ hiện, thanh thu về phía phải. Trên nhanh dưới chậm.',
      api: 'KX_LINE_REVEAL',
      trang: 'about',
      rung: true,
      nutThu: 'Chạy thử',
      truong: [
        { key: 'kieu', nhan: 'Cơ chế màu', type: 'chon', chon: [['lop', 'Lớp nối đuôi (3 thanh chồng)'], ['dong', 'Xen kẽ theo dòng']] },
        { key: 'mau1', nhan: 'Màu 1 (trắng)', type: 'color' },
        { key: 'mau2', nhan: 'Màu 2 (xám)', type: 'color' },
        { key: 'mau3', nhan: 'Màu 3 (xám đậm)', type: 'color' },
        { key: 'lechLop', nhan: 'Lệch giữa các lớp', min: 0, max: 400, step: 10, don: 'ms', goiY: 'chỉ cơ chế lớp nối đuôi' },
        { nhom: 'Nhịp' },
        { key: 'vaoMs', nhan: 'Mọc', min: 100, max: 2000, step: 10, don: 'ms' },
        { key: 'raMs', nhan: 'Thu', min: 100, max: 2000, step: 10, don: 'ms' },
        { key: 'nghiMs', nhan: 'Nghỉ giữa hai pha', min: 0, max: 1000, step: 10, don: 'ms' },
        { key: 'tre', nhan: 'Lệch giữa các dòng', min: 0, max: 300, step: 5, don: 'ms' },
        { key: 'cham', nhan: 'Trên nhanh dưới chậm', min: 0, max: 1, step: 0.01, goiY: 'mỗi dòng dưới lâu thêm bấy nhiêu phần' },
        { key: 'tuDuoi', nhan: 'Dòng dưới đi trước', type: 'toggle' },
        { key: 'dem', nhan: 'Lấn ra ngoài nét chữ', min: 0, max: 20, step: 1, don: 'px' },
      ],
    },
    {
      id: 'cd-glass',
      file: 'assets/js/kx-cd-glass.js',
      ten: 'CD Glass Line',
      mota: 'Đường sáng ngang chạy theo tâm máy CD 3D — ảnh dither bên dưới bị bẻ như kính lỏng trong dải quanh đường.',
      api: 'KX_CD_GLASS',
      trang: 'home',
      truong: [
        { key: 'enabled', nhan: 'Bật', type: 'toggle' },
        { key: 'viTri', nhan: 'Vị trí trên máy', min: 0, max: 1, step: 0.01, goiY: '0 = đỉnh máy, 1 = đáy' },
        { nhom: 'Dải kính' },
        { key: 'band', nhan: 'Nửa bề dày dải', min: 10, max: 300, step: 1, don: 'px' },
        { key: 'zoom', nhan: 'Độ phóng', min: 0, max: 0.9, step: 0.01 },
        { key: 'song', nhan: 'Gợn ngang', min: 0, max: 40, step: 0.5, don: 'px' },
        { key: 'tanSo', nhan: 'Mật độ gợn', min: 0, max: 0.1, step: 0.001 },
        { key: 'tocDo', nhan: 'Gợn trôi', min: 0, max: 5, step: 0.05 },
        { key: 'tachMau', nhan: 'Tách màu', min: 0, max: 30, step: 0.5, don: 'px' },
        { key: 'vien', nhan: 'Ánh màu', min: 0, max: 3, step: 0.01, goiY: 'đậm ở đường sáng, nhạt dần ra mép' },
        { key: 'mauVien', nhan: 'Màu ánh', type: 'color' },
        { nhom: 'Đường sáng' },
        { key: 'mau', nhan: 'Màu', type: 'color' },
        { key: 'loi', nhan: 'Độ sáng lõi', min: 0, max: 3, step: 0.01 },
        { key: 'loiDay', nhan: 'Bề dày lõi', min: 0.3, max: 10, step: 0.1, don: 'px' },
        { key: 'quang', nhan: 'Quầng', min: 0, max: 2, step: 0.01 },
        { key: 'quangRong', nhan: 'Quầng lan', min: 2, max: 120, step: 1, don: 'px' },
      ],
    },
    {
      id: 'home-glass',
      file: 'assets/js/kx-loop-strip.js',
      ten: 'Liquid Glass',
      mota: 'Kính lỏng ở hai mép trái / phải viewport cho dải ảnh chạy vòng (cụm "02.") — chỉ khúc xạ ảnh và nhãn của thẻ.',
      api: 'KX_LOOP_STRIP',
      trang: 'home',
      truong: [
        { key: 'lens', nhan: 'Bật kính', type: 'toggle' },
        { nhom: 'Hình dải kính' },
        { key: 'lensBand', nhan: 'Độ sâu kính', min: 0.02, max: 0.3, step: 0.005, goiY: 'phần bề rộng viewport' },
        { key: 'lensSoft', nhan: 'Độ vát', min: 0, max: 4, step: 0.05, goiY: 'cao = cong tròn, lan sâu hơn' },
        { key: 'lensCurve', nhan: 'Độ cong viền', min: 0, max: 1, step: 0.01 },
        { key: 'lensSpan', nhan: 'Chiều cao elip', min: 0.5, max: 3, step: 0.05 },
        { nhom: 'Khúc xạ' },
        { key: 'lensZoom', nhan: 'Độ phóng', min: 0, max: 2, step: 0.01 },
        { key: 'lensSplay', nhan: 'Tẽ dọc', min: 0, max: 4, step: 0.05 },
        { key: 'lensDispersion', nhan: 'Tách màu', min: 0, max: 40, step: 0.5, don: 'px' },
        { key: 'lensRimWave', nhan: 'Gợn viền', min: 0, max: 1, step: 0.01 },
        { key: 'lensWaveSpeed', nhan: 'Gợn trôi', min: 0, max: 3, step: 0.05 },
        { key: 'lensSamples', nhan: 'Số mẫu tách màu', min: 2, max: 16, step: 1 },
        { nhom: 'Ánh sáng' },
        { key: 'lensColor', nhan: 'Màu vòng', type: 'color' },
        { key: 'lensGlow', nhan: 'Độ sáng', min: 0, max: 17, step: 0.1 },
        { key: 'lensRing', nhan: 'Vòng màu', min: 0, max: 2, step: 0.01 },
        { key: 'lensRimLine', nhan: 'Viền trắng', min: 0, max: 2, step: 0.01 },
        { key: 'lensNova', nhan: 'Quầng trắng', min: 0, max: 1, step: 0.01 },
      ],
    },
    {
      id: 'liquid-glass',
      file: 'assets/js/kx-wave-images.js', // nút Lưu ghi thẳng vào CONFIG của file này
      ten: 'Liquid Glass',
      mota: 'Hai dải kính ở mép trên và mép dưới viewport — khúc xạ cả dải dự án: ảnh, chữ, số, đường kẻ.',
      api: 'KX_WAVE_IMAGES',
      truong: [
        { key: 'glass', nhan: 'Bật kính', type: 'toggle' },
        { key: 'glassText', nhan: 'Bẻ cả dải (chữ, số, đường kẻ)', type: 'toggle', goiY: 'tắt = kính chỉ bẻ ảnh' },
        { key: 'glassTop', nhan: 'Dải mép trên', type: 'toggle' },
        { key: 'glassBottom', nhan: 'Dải mép dưới', type: 'toggle' },
        { nhom: 'Hình dải kính' },
        { key: 'glassBand', nhan: 'Độ sâu dải', min: 0.03, max: 0.5, step: 0.01, goiY: 'phần chiều cao viewport, đo ở giữa' },
        { key: 'glassIntro', nhan: 'Bật dần khi cuộn', min: 0, max: 1500, step: 10, don: 'px', goiY: 'màn đầu không có kính; cuộn bấy nhiêu px thì kính đủ độ sâu. 0 = có ngay' },
        { key: 'glassSoft', nhan: 'Độ vát', min: 0, max: 4, step: 0.05, goiY: '0 = gập cục ở viền; cao = góc chìa ra vát tròn, lan sâu hơn' },
        { key: 'glassCurve', nhan: 'Độ cong viền', min: 0, max: 1, step: 0.01, goiY: '0 = thẳng, 1 = nửa elip' },
        { key: 'glassSpan', nhan: 'Bề ngang elip', min: 0.5, max: 3, step: 0.05, goiY: '>1 thì hai góc vẫn còn kính' },
        { nhom: 'Khúc xạ' },
        { key: 'glassZoom', nhan: 'Độ phóng', min: 0, max: 2, step: 0.01 },
        { key: 'glassSplay', nhan: 'Tẽ ngang hai bên', min: 0, max: 4, step: 0.05, goiY: '0 = chỉ kéo dọc; cao = hai ảnh tẽ mạnh sang hai bên' },
        { key: 'glassSpill', nhan: 'Tràn khỏi khung', min: 0, max: 400, step: 5, don: 'px', goiY: 'kính kéo ảnh tràn ra ngoài khung bao xa' },
        { key: 'glassDispersion', nhan: 'Tách màu', min: 0, max: 40, step: 0.5, don: 'px' },
        { key: 'glassRimWave', nhan: 'Gợn viền', min: 0, max: 1, step: 0.01 },
        { key: 'glassWaveSpeed', nhan: 'Gợn trôi', min: 0, max: 3, step: 0.05, goiY: '0 = đứng yên' },
        { key: 'glassSamples', nhan: 'Số mẫu tách màu', min: 2, max: 16, step: 1, goiY: 'cao = mượt hơn, nặng hơn' },
        { nhom: 'Ánh sáng' },
        { key: 'glassColor', nhan: 'Màu vòng', type: 'color' },
        { key: 'glassGlow', nhan: 'Độ sáng', min: 0, max: 17, step: 0.1 },
        { key: 'glassRing', nhan: 'Vòng màu', min: 0, max: 2, step: 0.01, goiY: '0 = bỏ vòng' },
        { key: 'glassRingRadius', nhan: 'Vị trí vòng', min: 0.1, max: 0.49, step: 0.005, goiY: '0.49 = sát viền kính' },
        { key: 'glassRingWidth', nhan: 'Độ dày vòng', min: 0.003, max: 0.06, step: 0.001 },
        { key: 'glassRimLine', nhan: 'Viền trắng', min: 0, max: 2, step: 0.01 },
        { key: 'glassNova', nhan: 'Quầng trắng', min: 0, max: 1, step: 0.01, goiY: 'sát mép viewport' },
        { key: 'glassShimmer', nhan: 'Vòng lấp lánh', type: 'toggle' },
      ],
    },
    {
      id: 'page-transition',
      file: 'assets/js/kx-page-transition.js',
      ten: 'Loading Transition',
      mota: 'Dải pixel quét ngang lúc màn loading chuyển sang trang — lớp đen bị cắt theo bậc phía sau dải. "Chạy thử" quét ngay trên trang này. Màn loading thật lấy số trong FILE — bấm "Lưu tất cả" thì lượt loading sau mới theo.',
      api: 'KX_PAGE_TRANSITION',
      rung: true,
      nutThu: 'Chạy thử',
      truong: [
        { nhom: 'Hình dải' },
        { key: 'arrow', nhan: 'Mũi tên', min: -0.6, max: 0.6, step: 0.01, goiY: '0 = thẳng; dương = mũi tên chỉ theo hướng quét; âm = chữ V ngược' },
        { key: 'cols', nhan: 'Số cột pixel', min: 8, max: 120, step: 1 },
        { key: 'overlap', nhan: 'Độ chồng trong cột', min: 0, max: 1, step: 0.01, goiY: 'thấp = pixel trong cột lấm tấm lệch nhau hơn' },
        { nhom: 'Nhịp' },
        { key: 'duration', nhan: 'Thời gian quét', min: 0.4, max: 5, step: 0.05, don: 's' },
        { key: 'pixelFade', nhan: 'Pixel mờ vào / ra', min: 0.02, max: 1, step: 0.01, don: 's' },
        { key: 'revealWait', nhan: 'Chờ font tối đa', min: 0, max: 2000, step: 50, don: 'ms' },
        { nhom: 'Màu' },
        { key: 'color', nhan: 'Màu pixel', type: 'color' },
        { key: 'rainbow', nhan: 'Cầu vồng', type: 'toggle' },
        { key: 'blend', nhan: 'Hoà trộn', type: 'chon', chon: [['normal', 'Bình thường'], ['difference', 'Difference'], ['exclusion', 'Exclusion'], ['screen', 'Screen']] },
        { key: 'coverColor', nhan: 'Màu lớp phủ', type: 'color', goiY: 'nền màn loading' },
      ],
    },
    {
      id: 'pixel-hover',
      file: 'assets/js/kx-pixel-hover.js',
      ten: 'Button Hover',
      mota: 'Rê vào nút EMAIL ME / EXPLORE / LIVE SITE: lưới pixel quét phủ kín nút (như màn chuyển sau loading), chữ chuyển đen và xáo kí tự như chữ màn loading. Rời chuột thì quét đi.',
      api: 'KX_PIXEL_HOVER',
      truong: [
        { key: 'o', nhan: 'Cỡ ô pixel', min: 3, max: 24, step: 1, don: 'px' },
        { key: 'vaoMs', nhan: 'Quét vào', min: 80, max: 1500, step: 10, don: 'ms' },
        { key: 'raMs', nhan: 'Quét đi', min: 80, max: 1500, step: 10, don: 'ms' },
        { key: 'moMs', nhan: 'Một ô mờ vào/ra', min: 10, max: 400, step: 5, don: 'ms' },
        { key: 'lech', nhan: 'Lấm tấm trong cột', min: 0, max: 1, step: 0.01, goiY: '0 = quét thành cột thẳng; cao = lấm tấm hơn' },
        { key: 'color', nhan: 'Màu pixel', type: 'color' },
        { key: 'chuMau', nhan: 'Màu chữ khi hover', type: 'color' },
        { key: 'blend', nhan: 'Hoà trộn', type: 'chon', chon: [['normal', 'Bình thường (chữ đổi màu)'], ['difference', 'Difference (chữ tự đảo)'], ['exclusion', 'Exclusion']] },
        { key: 'xao', nhan: 'Xáo chữ khi rê', type: 'toggle' },
        { key: 'xaoNhipMs', nhan: 'Nhịp xáo', min: 10, max: 120, step: 5, don: 'ms' },
        { key: 'xaoSoNhip', nhan: 'Số nhịp mỗi kí tự', min: 1, max: 30, step: 1 },
        { key: 'xaoTre', nhan: 'Trễ giữa kí tự', min: 0, max: 6, step: 0.5, don: 'nhịp' },
      ],
    },
    {
      id: 'cursor',
      file: 'assets/js/kx-cursor.js',
      ten: 'Cursor',
      mota: 'Con trỏ chrome dáng mũi tên — 11 kiểu do Magnific vẽ. Trong bảng setting vẫn là con trỏ hệ thống.',
      api: 'KX_CURSOR',
      truong: [
        { key: 'hien', nhan: 'Bật cursor', type: 'toggle', goiY: 'tắt = con trỏ hệ thống' },
        { key: 'kieu', nhan: 'Kiểu', type: 'chon', chon: [
          ['alien', 'Tàu alien'],
          ['ufo', 'Đĩa bay'],
          ['jet', 'Phi cơ tàng hình'],
          ['claw', 'Vuốt sinh-cơ'],
          ['crystal', 'Pha lê'],
          ['squid', 'Mực alien'],
          ['rocket', 'Tên lửa retro'],
          ['mecha', 'Giáp cơ giới'],
          ['mercury', 'Thuỷ ngân'],
          ['probe', 'Vệ tinh'],
          ['beetle', 'Bọ máy'],
        ] },
        { key: 'size', nhan: 'Cỡ', min: 20, max: 72, step: 1, don: 'px' },
        { nhom: 'Chuyển động' },
        { key: 'tilt', nhan: 'Nghiêng theo hướng di', min: 0, max: 30, step: 1, don: '°' },
        { key: 'tiltEase', nhan: 'Độ bám nghiêng', min: 0.02, max: 0.6, step: 0.01 },
        { key: 'hoverScale', nhan: 'Phóng khi rê vào link', min: 0.8, max: 1.6, step: 0.01 },
        { key: 'downScale', nhan: 'Thu khi bấm', min: 0.6, max: 1.1, step: 0.01 },
        { nhom: 'Ánh sáng' },
        { key: 'glow', nhan: 'Sáng nhấp nháy', type: 'toggle' },
        { key: 'glowMs', nhan: 'Nhịp sáng', min: 200, max: 3000, step: 50, don: 'ms' },
      ],
    },
    {
      id: 'sound',
      file: 'assets/js/kx-sound.js',
      ten: 'Sound',
      mota: 'Tiếng bấm phím khi rê vào dự án — mỗi dự án một nốt, lướt qua là thành giai điệu. Cần bấm một lần trên trang thì trình duyệt mới cho phát.',
      api: 'KX_SOUND',
      rung: true,
      nutThu: 'Nghe thử', // gọi A.rungThu(): chạy một lượt 10 dự án
      truong: [
        { nhom: 'Nhạc cụ' },
        { key: 'preset', nhan: 'Preset', type: 'chon', chon: [
          ['droid', 'Droid sweep'],
          ['down', 'Droid down'],
          ['glass', 'Droid glass'],
          ['scan', 'Droid scan'],
          ['ping', 'Droid ping'],
          ['warm', 'Droid warm'],
          ['switch', 'Công tắc'],
          ['flip', 'Lật ảnh'],
        ], goiY: 'mọi núm bên dưới áp chung lên preset đang chọn' },
        { nhom: 'Giai điệu' },
        { key: 'transpose', nhan: 'Trầm / bổng', min: -24, max: 12, step: 1, don: 'cung½', goiY: 'nửa cung; -12 = xuống một quãng tám' },
        { key: 'scale', nhan: 'Thang âm', type: 'chon', chon: [
          ['0,2,4,7,9', 'Ngũ cung trưởng'],
          ['0,3,5,7,10', 'Ngũ cung thứ'],
          ['0,2,4,5,7,9,11', 'Trưởng'],
          ['0,2,3,5,7,8,10', 'Thứ tự nhiên'],
          ['0,1,5,7,8', 'Nhật (In)'],
          ['0,4,7', 'Hợp âm trưởng'],
          ['0,3,7', 'Hợp âm thứ'],
          ['0,2,4,6,8,10', 'Toàn cung (mơ hồ)'],
        ] },
        { key: 'noteStep', nhan: 'Bước nốt mỗi dự án', min: 1, max: 4, step: 1, goiY: '2 = nhảy cách một nốt, giai điệu rộng hơn' },
        { key: 'descend', nhan: 'Lướt xuống = đi xuống', type: 'toggle' },
        { nhom: 'Âm sắc' },
        { key: 'volume', nhan: 'Âm lượng', min: 0, max: 1, step: 0.01 },
        { key: 'decayMs', nhan: 'Độ ngân', min: 0, max: 600, step: 10, don: 'ms', goiY: '0 = ngân hết bản tiếng; thấp = gõ khô, gọn' },
        { key: 'brightness', nhan: 'Độ sáng', min: 400, max: 16000, step: 50, don: 'Hz', goiY: 'thấp = tròn, ấm; cao = sắc, trong' },
        { key: 'echo', nhan: 'Độ vang', min: 0, max: 1, step: 0.01 },
        { key: 'echoMs', nhan: 'Nhịp vang', min: 40, max: 800, step: 10, don: 'ms' },
        { key: 'echoFeedback', nhan: 'Số lần dội', min: 0, max: 0.9, step: 0.01, goiY: 'cao = dội lâu hơn' },
        { key: 'minGapMs', nhan: 'Khoảng cách tối thiểu', min: 0, max: 200, step: 5, don: 'ms', goiY: 'lướt rất nhanh thì bỏ bớt tiếng cho khỏi rè' },
        { nhom: 'Lúc bật sound' },
        { key: 'henshin', nhan: 'Chuỗi kích hoạt', type: 'toggle', goiY: 'ba phím mã + Enter + khoá sập & điện dâng' },
        { key: 'henshinVolume', nhan: 'Âm lượng kích hoạt', min: 0, max: 1, step: 0.01 },
        { key: 'henshinGapMs', nhan: 'Nhịp bấm mã', min: 50, max: 300, step: 5, don: 'ms' },
      ],
    },
  ]

  var LUU = 'kx-panel:v1'

  var CSS = [
    '.kx-pn-btn{position:fixed;right:16px;bottom:16px;z-index:9998;width:40px;height:40px;',
    '  display:grid;place-items:center;background:#0b0b0c;border:1px solid #2a2a2c;border-radius:6px;',
    '  color:#bdbdc2;cursor:pointer;padding:0}',
    '.kx-pn-btn:hover{color:#fff;border-color:#3d3d41}',
    '.kx-pn-btn[aria-expanded="true"]{background:#fff;color:#0b0b0c;border-color:#fff}',
    '.kx-pn-btn svg{width:18px;height:18px;display:block}',
    '.kx-pn{position:fixed;right:16px;bottom:16px;z-index:9999;width:312px;max-height:calc(100vh - 32px);',
    '  display:flex;flex-direction:column;overflow:hidden;background:#0b0b0c;border:1px solid #2a2a2c;border-radius:8px;',
    '  font-family:"Geist Mono",ui-monospace,monospace;font-size:11px;line-height:1.4;color:#e8e8e8;',
    '  box-shadow:0 12px 40px rgba(0,0,0,.6);-webkit-font-smoothing:antialiased}',
    '.kx-pn[hidden]{display:none}',
    // Thân bảng là vùng cuộn RIÊNG: đầu (tiêu đề) và chân (nút Lưu) đứng yên.
    // overscroll-behavior: cuộn tới đáy bảng không kéo theo cả trang.
    '.kx-pn .kx-pn__cuon{flex:1 1 auto;min-height:0;overflow-y:auto;overscroll-behavior:contain}',
    '.kx-pn .kx-pn__chan{flex:none;padding:10px 12px 12px;border-top:1px solid #1d1d1f;background:#0b0b0c}',
    '.kx-pn .kx-pn__chan .kx-pn__luu{margin-top:0}',
    '.kx-pn .kx-pn__chan .kx-pn__bao{margin-top:6px;min-height:0}',
    '.kx-pn .kx-pn__dau{flex:none;display:flex;align-items:center;justify-content:space-between;padding:12px 12px 10px;',
    '  border-bottom:1px solid #1d1d1f;text-transform:uppercase;letter-spacing:.04em;color:#8e8e94}',
    '.kx-pn .kx-pn__dau b{color:#fff;font-weight:500}',
    '.kx-pn .kx-pn__x{background:none;border:0;color:#6f6f73;cursor:pointer;font:inherit;padding:2px 4px}',
    '.kx-pn .kx-pn__x:hover{color:#fff}',
    '.kx-pn .kx-pn__muc{border-bottom:1px solid #1d1d1f}',
    '.kx-pn .kx-pn__muc:last-child{border-bottom:0}',
    '.kx-pn .kx-pn__tieude{display:flex;align-items:center;gap:8px;width:100%;padding:11px 12px;',
    '  background:none;border:0;color:#e8e8e8;font:inherit;text-align:left;cursor:pointer}',
    '.kx-pn .kx-pn__tieude:hover{background:#121214}',
    '.kx-pn .kx-pn__tieude span{flex:1;text-transform:uppercase;letter-spacing:.03em;font-weight:500}',
    '.kx-pn .kx-pn__tieude i{font-style:normal;color:#6f6f73;transition:transform .2s ease}',
    '.kx-pn .kx-pn__tieude[aria-expanded="true"] i{transform:rotate(90deg);color:#fff}',
    '.kx-pn .kx-pn__doi{width:6px;height:6px;border-radius:50%;background:#4a7dff;flex:none}',
    '.kx-pn .kx-pn__than{padding:0 12px 12px}',
    '.kx-pn .kx-pn__than[hidden]{display:none}',
    '.kx-pn .kx-pn__mota{margin:0 0 10px;color:#6f6f73;font-size:10px}',
    '.kx-pn .kx-pn__nhom{margin:12px 0 6px;color:#6f6f73;font-size:10px;text-transform:uppercase;letter-spacing:.06em}',
    '.kx-pn .kx-pn__truong{margin-bottom:9px}',
    '.kx-pn .kx-pn__hang{display:flex;align-items:center;gap:6px;margin-bottom:4px}',
    '.kx-pn .kx-pn__hang label{flex:1;color:#bdbdc2}',
    '.kx-pn .kx-pn__hang label.is-doi{color:#fff}',
    '.kx-pn .kx-pn__hang label.is-doi::after{content:" \\2022";color:#4a7dff}',
    '.kx-pn .kx-pn__so{width:64px;font:inherit;color:#fff;background:#151517;border:1px solid #2a2a2c;',
    '  border-radius:4px;padding:3px 6px;text-align:right}',
    '.kx-pn .kx-pn__so:focus{outline:none;border-color:#4a7dff}',
    '.kx-pn .kx-pn__don{color:#6f6f73;min-width:14px}',
    '.kx-pn .kx-pn__chon{font:inherit;color:#fff;background:#151517;border:1px solid #2a2a2c;border-radius:4px;padding:3px 6px;max-width:150px}',
    '.kx-pn .kx-pn__chon:focus{outline:none;border-color:#4a7dff}',
    '.kx-pn .kx-pn__mau{width:22px;height:20px;padding:0;border:1px solid #2a2a2c;border-radius:4px;',
    '  background:none;cursor:pointer}',
    '.kx-pn .kx-pn__mau::-webkit-color-swatch-wrapper{padding:2px}',
    '.kx-pn .kx-pn__mau::-webkit-color-swatch{border:0;border-radius:2px}',
    '.kx-pn .kx-pn__goiy{margin:2px 0 0;color:#55555a;font-size:10px}',
    '.kx-pn input[type=range]{-webkit-appearance:none;appearance:none;width:100%;height:16px;margin:0;',
    '  background:transparent;cursor:pointer}',
    '.kx-pn input[type=range]::-webkit-slider-runnable-track{height:1px;background:#3a3a3e}',
    '.kx-pn input[type=range]::-moz-range-track{height:1px;background:#3a3a3e}',
    '.kx-pn input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:11px;height:11px;margin-top:-5px;',
    '  border-radius:50%;background:#fff;border:0}',
    '.kx-pn input[type=range]::-moz-range-thumb{width:11px;height:11px;border-radius:50%;background:#fff;border:0}',
    '.kx-pn .kx-pn__cong{position:relative;width:30px;height:16px;flex:none;border-radius:8px;background:#2a2a2c;',
    '  border:0;padding:0;cursor:pointer;transition:background .15s ease}',
    '.kx-pn .kx-pn__cong::after{content:"";position:absolute;left:2px;top:2px;width:12px;height:12px;border-radius:50%;',
    '  background:#8e8e94;transition:transform .15s ease,background .15s ease}',
    '.kx-pn .kx-pn__cong[aria-checked="true"]{background:#fff}',
    '.kx-pn .kx-pn__cong[aria-checked="true"]::after{transform:translateX(14px);background:#0b0b0c}',
    '.kx-pn .kx-pn__luu{display:block;width:100%;margin-top:14px;padding:8px;font:inherit;font-weight:500;',
    '  text-transform:uppercase;letter-spacing:.04em;color:#0b0b0c;background:#fff;border:1px solid #fff;',
    '  border-radius:4px;cursor:pointer}',
    '.kx-pn .kx-pn__luu:hover{background:#e8e8e8}',
    '.kx-pn .kx-pn__luu:disabled{opacity:.5;cursor:default}',
    '.kx-pn .kx-pn__nut{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;margin-top:4px}',
    '.kx-pn .kx-pn__nut button{font:inherit;color:#bdbdc2;background:#151517;border:1px solid #2a2a2c;',
    '  border-radius:4px;padding:6px 4px;cursor:pointer}',
    '.kx-pn .kx-pn__nut button:hover{color:#fff;border-color:#3d3d41}',
    '.kx-pn .kx-pn__bao{min-height:14px;margin:8px 0 0;color:#6f6f73;font-size:10px}',
    '.kx-pn .kx-pn__canh{margin:0 0 10px;padding:6px 8px;border:1px solid #3a2f1a;border-radius:4px;',
    '  color:#d8a24a;font-size:10px}',
  ].join('\n')

  /* ------------------------------------------------------------ lưu trữ
   * localStorage có thể ném lỗi (cửa sổ riêng tư, chặn dữ liệu trang) — bọc
   * hết, không lưu được thì bảng vẫn chạy, chỉ là không nhớ. */
  function docLuu() {
    try {
      var o = JSON.parse(localStorage.getItem(LUU) || '{}')
      return o && typeof o === 'object' ? o : {}
    } catch (e) {
      return {}
    }
  }
  function ghiLuu(o) {
    try {
      localStorage.setItem(LUU, JSON.stringify(o))
    } catch (e) {}
  }
  var kho = docLuu()
  kho.gt = kho.gt || {} // giá trị đã đổi, theo mục
  kho.mo = kho.mo || {} // mục nào đang mở

  function la(x) {
    return x && x.key
  }

  /* Áp giá trị đã lưu vào config. Chạy NGAY lúc file này được nạp — hiệu ứng
   * lộ `config` từ lúc chính nó được nạp (trước boot), nên giá trị đã lưu có
   * hiệu lực trước khung hình đầu. Chỉ áp khoá có khai trong MUC. */
  /* Khoá được chuyển sang mục khác (vd. kính của Loop Strip tách thành mục
   * Liquid Glass ở Home): số đã nhớ dưới mục cũ đi theo sang mục mới có khai
   * khoá đó và cùng `api` — không thì số chỉnh dở bị bỏ quên. */
  function chuyenKhoaCu() {
    var doi = false
    Object.keys(kho.gt).forEach(function (id) {
      var cu = MUC.filter(function (m) { return m.id === id })[0]
      var luu = kho.gt[id]
      Object.keys(luu).forEach(function (key) {
        if (cu && cu.truong.some(function (t) { return t.key === key })) return
        var moi = MUC.filter(function (m) {
          return (!cu || m.api === cu.api) && m.truong.some(function (t) { return t.key === key })
        })[0]
        if (!moi) return
        kho.gt[moi.id] = kho.gt[moi.id] || {}
        if (!(key in kho.gt[moi.id])) kho.gt[moi.id][key] = luu[key]
        delete luu[key]
        doi = true
      })
    })
    if (doi) ghiLuu(kho)
  }
  chuyenKhoaCu()

  function apGiaTriLuu() {
    MUC.forEach(function (m) {
      var A = window[m.api]
      var luu = kho.gt[m.id]
      if (!A || !A.config || !luu) return
      m.truong.filter(la).forEach(function (t) {
        if (Object.prototype.hasOwnProperty.call(luu, t.key)) A.config[t.key] = luu[t.key]
      })
    })
  }
  apGiaTriLuu()

  /* ------------------------------------------------------------ dựng */

  function el(tag, cls, chu) {
    var e = document.createElement(tag)
    if (cls) e.className = cls
    if (chu != null) e.textContent = chu
    return e
  }

  function soThapPhan(step) {
    var s = String(step)
    var i = s.indexOf('.')
    return i < 0 ? 0 : s.length - i - 1
  }

  var bang = null
  var nutMo = null

  function dungMuc(m, A) {
    var goc = el('div', 'kx-pn__muc')
    var tieude = el('button', 'kx-pn__tieude')
    tieude.type = 'button'
    var mo = !!kho.mo[m.id]
    tieude.setAttribute('aria-expanded', String(mo))
    tieude.appendChild(el('i', null, '›'))
    tieude.appendChild(el('span', null, m.ten))
    var chamDoi = el('b', 'kx-pn__doi')
    tieude.appendChild(chamDoi)
    goc.appendChild(tieude)

    var than = el('div', 'kx-pn__than')
    than.hidden = !mo
    goc.appendChild(than)
    tieude.addEventListener('click', function () {
      mo = !mo
      than.hidden = !mo
      tieude.setAttribute('aria-expanded', String(mo))
      kho.mo[m.id] = mo
      ghiLuu(kho)
    })

    if (m.mota) than.appendChild(el('p', 'kx-pn__mota', m.mota))
    if (A.giamChuyenDong) {
      than.appendChild(
        el('p', 'kx-pn__canh', 'Máy đang bật "giảm chuyển động" — hiệu ứng không chạy, chỉnh ở đây chưa thấy gì.')
      )
    }

    var cfg = A.config
    // Bản SAO của mặc định: lưu vào file xong thì file mang số mới, nên "mặc
    // định" của bảng phải đổi theo — mà A.defaults là object đã đóng băng.
    var def = Object.assign({}, A.defaults || {})
    var ve = [] // hàm vẽ lại từng trường từ cfg

    function laDoi(t) {
      return cfg[t.key] !== def[t.key]
    }

    function capNhatCham() {
      chamDoi.style.display = m.truong.filter(la).some(laDoi) ? '' : 'none'
    }

    function dat(t, v) {
      cfg[t.key] = v
      var luu = (kho.gt[m.id] = kho.gt[m.id] || {})
      if (v === def[t.key]) delete luu[t.key]
      else luu[t.key] = v
      ghiLuu(kho)
      if (typeof A.apDung === 'function') A.apDung()
      capNhatCham()
      capNhatTong()
    }

    m.truong.forEach(function (t) {
      if (t.nhom) {
        than.appendChild(el('p', 'kx-pn__nhom', t.nhom))
        return
      }
      var o = el('div', 'kx-pn__truong')
      var hang = el('div', 'kx-pn__hang')
      var nhan = el('label', null, t.nhan)
      hang.appendChild(nhan)
      o.appendChild(hang)

      if (t.type === 'chon') {
        // Danh sách chọn: giá trị là CHUỖI ghi thẳng vào config.
        var chon = document.createElement('select')
        chon.className = 'kx-pn__chon'
        chon.setAttribute('aria-label', t.nhan)
        t.chon.forEach(function (c) {
          var op = document.createElement('option')
          op.value = c[0]
          op.textContent = c[1]
          chon.appendChild(op)
        })
        hang.appendChild(chon)
        // Giá trị đã nhớ không còn trong danh sách (vd. preset đã bị bỏ) → về
        // mặc định, không để ô chọn trống.
        var coTrong = t.chon.some(function (c) { return c[0] === cfg[t.key] })
        if (!coTrong) dat(t, def[t.key])
        chon.addEventListener('change', function () {
          dat(t, chon.value)
          nhan.classList.toggle('is-doi', laDoi(t))
        })
        var veChon = function () {
          chon.value = cfg[t.key]
          nhan.classList.toggle('is-doi', laDoi(t))
        }
        ve.push(veChon)
        veChon()
        if (t.goiY) o.appendChild(el('p', 'kx-pn__goiy', t.goiY))
        than.appendChild(o)
        return
      }
      if (t.type === 'color') {
        var mau = document.createElement('input')
        mau.type = 'color'
        mau.className = 'kx-pn__mau'
        mau.setAttribute('aria-label', t.nhan)
        var maChu = el('input', 'kx-pn__so')
        maChu.type = 'text'
        maChu.spellcheck = false
        hang.appendChild(mau)
        hang.appendChild(maChu)
        mau.addEventListener('input', function () {
          maChu.value = mau.value
          dat(t, mau.value)
          nhan.classList.toggle('is-doi', laDoi(t))
        })
        maChu.addEventListener('change', function () {
          var v = maChu.value.trim()
          if (!/^#?[0-9a-f]{6}$/i.test(v)) return
          if (v[0] !== '#') v = '#' + v
          mau.value = v
          dat(t, v)
          nhan.classList.toggle('is-doi', laDoi(t))
        })
        var veMau = function () {
          mau.value = cfg[t.key]
          maChu.value = cfg[t.key]
          nhan.classList.toggle('is-doi', laDoi(t))
        }
        ve.push(veMau)
        veMau()
        than.appendChild(o)
        return
      }
      if (t.type === 'toggle') {
        var cong = el('button', 'kx-pn__cong')
        cong.type = 'button'
        cong.setAttribute('role', 'switch')
        cong.setAttribute('aria-label', t.nhan)
        cong.addEventListener('click', function () {
          dat(t, !cfg[t.key])
          veTruong()
        })
        hang.appendChild(cong)
        var veTruong = function () {
          cong.setAttribute('aria-checked', String(!!cfg[t.key]))
          nhan.classList.toggle('is-doi', laDoi(t))
        }
        ve.push(veTruong)
        veTruong()
      } else {
        var thap = soThapPhan(t.step)
        var so = el('input', 'kx-pn__so')
        so.type = 'number'
        so.min = t.min
        so.max = t.max
        so.step = t.step
        hang.appendChild(so)
        hang.appendChild(el('span', 'kx-pn__don', t.don || ''))
        var keo = document.createElement('input')
        keo.type = 'range'
        keo.min = t.min
        keo.max = t.max
        keo.step = t.step
        keo.setAttribute('aria-label', t.nhan)
        o.appendChild(keo)
        if (t.goiY) o.appendChild(el('p', 'kx-pn__goiy', t.goiY))

        var lay = function (raw) {
          var v = parseFloat(raw)
          if (isNaN(v)) return null
          // Ô số cho gõ vượt khoảng của thanh kéo — chỉ chặn số âm ở trường
          // KHÔNG cho âm. Trường có min âm (độ nghiêng của Loop Strip, mặc
          // định -12°) mà chặn thì vừa chạm thanh kéo là nhảy về 0.
          return +(t.min < 0 ? v : Math.max(0, v)).toFixed(thap)
        }
        keo.addEventListener('input', function () {
          var v = lay(keo.value)
          if (v == null) return
          so.value = v
          dat(t, v)
          nhan.classList.toggle('is-doi', laDoi(t))
        })
        so.addEventListener('input', function () {
          var v = lay(so.value)
          if (v == null) return
          keo.value = v
          dat(t, v)
          nhan.classList.toggle('is-doi', laDoi(t))
        })
        var veSo = function () {
          var v = cfg[t.key]
          so.value = v
          keo.value = v
          nhan.classList.toggle('is-doi', laDoi(t))
        }
        ve.push(veSo)
        veSo()
      }
      than.appendChild(o)
    })

    // ----- nút cuối mục
    var nut = el('div', 'kx-pn__nut')
    var bao = el('p', 'kx-pn__bao')
    var hen = 0
    function nhay(chu) {
      bao.textContent = chu
      clearTimeout(hen)
      hen = setTimeout(function () {
        bao.textContent = ''
      }, 2200)
    }

    var bRung = el('button', null, m.nutThu || 'Rung thử')
    bRung.type = 'button'
    bRung.title = m.nutThu ? 'Chạy thử một lượt' : 'Đá một nhịp sóng để xem, khỏi phải cuộn'
    bRung.disabled = !m.rung || typeof A.rungThu !== 'function'
    bRung.addEventListener('click', function () {
      A.rungThu()
    })

    var bVe = el('button', null, 'Mặc định')
    bVe.type = 'button'
    bVe.addEventListener('click', function () {
      m.truong.filter(la).forEach(function (t) {
        cfg[t.key] = def[t.key]
      })
      delete kho.gt[m.id]
      ghiLuu(kho)
      if (typeof A.apDung === 'function') A.apDung()
      ve.forEach(function (f) { f() })
      capNhatCham()
      capNhatTong()
      nhay('Đã trả mục này về mặc định.')
    })

    var bChep = el('button', null, 'Chép CONFIG')
    bChep.type = 'button'
    bChep.title = 'Chép các dòng đã đổi, dán đè vào CONFIG ở đầu file hiệu ứng'
    bChep.addEventListener('click', function () {
      var dong = m.truong
        .filter(la)
        .filter(laDoi)
        .map(function (t) {
          return '    ' + t.key + ': ' + JSON.stringify(cfg[t.key]) + ','
        })
      if (!dong.length) {
        nhay('Chưa đổi gì so với file.')
        return
      }
      var chu = dong.join('\n')
      var xong = function () {
        nhay('Đã chép ' + dong.length + ' dòng — dán vào CONFIG.')
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(chu).then(xong, function () {
          chepTay(chu)
          xong()
        })
      } else {
        chepTay(chu)
        xong()
      }
    })

    nut.appendChild(bRung)
    nut.appendChild(bVe)
    nut.appendChild(bChep)
    than.appendChild(nut)
    than.appendChild(bao)
    capNhatCham()
    cacMuc.push({ m: m, A: A, cfg: cfg, def: def, ve: ve, laDoi: laDoi, capNhatCham: capNhatCham })
    return goc
  }

  /* ------------------------------------------------------------ LƯU TỔNG
   * MỘT nút cho cả bảng (người dùng chốt): ghi MỌI setting đã đổi của MỌI mục
   * vào CONFIG của file hiệu ứng tương ứng, qua endpoint /__kx-save của
   * serve.mjs (chỉ nghe 127.0.0.1, chỉ cho ghi assets/js/kx-*.js, giữ nguyên
   * comment). Hai mục chung một file (Works Image Effect + Liquid Glass cùng
   * là kx-wave-images.js) được gom thành MỘT lần ghi. Mở trang bằng server
   * khác (hay trên site công khai) thì không có endpoint — báo rõ, giá trị vẫn
   * được nhớ trên trình duyệt này. */
  var cacMuc = []
  var bLuuTong = null
  var baoTong = null
  var henTong = 0

  function demDoi() {
    var n = 0
    cacMuc.forEach(function (r) {
      if (r.m.file) n += r.m.truong.filter(la).filter(r.laDoi).length
    })
    return n
  }

  function capNhatTong() {
    if (!bLuuTong || bLuuTong.dataset.dang) return
    var n = demDoi()
    bLuuTong.textContent = n ? 'Lưu tất cả · ' + n + ' thay đổi' : 'Đã lưu hết'
    bLuuTong.disabled = !n
  }

  function nhayTong(chu) {
    baoTong.textContent = chu
    clearTimeout(henTong)
    henTong = setTimeout(function () { baoTong.textContent = '' }, 4000)
  }

  function luuTong() {
    var theoFile = {}
    cacMuc.forEach(function (r) {
      if (!r.m.file) return
      var doi = r.m.truong.filter(la).filter(r.laDoi)
      if (!doi.length) return
      var g = (theoFile[r.m.file] = theoFile[r.m.file] || { values: {}, muc: [] })
      doi.forEach(function (t) { g.values[t.key] = r.cfg[t.key] })
      g.muc.push(r)
    })
    var files = Object.keys(theoFile)
    if (!files.length) {
      nhayTong('Chưa đổi gì so với file.')
      return
    }
    bLuuTong.dataset.dang = '1'
    bLuuTong.disabled = true
    bLuuTong.textContent = 'Đang lưu…'
    var ok = []
    var loi = []
    // Ghi LẦN LƯỢT từng file — không cần song song, và báo lỗi rõ từng file.
    files
      .reduce(function (truoc, f) {
        return truoc.then(function () {
          return fetch('/__kx-save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ file: f, values: theoFile[f].values }),
          })
            .then(function (r) {
              return r.json().catch(function () { return { ok: false, error: 'HTTP ' + r.status } })
            })
            .then(function (kq) {
              if (!kq.ok) throw new Error(kq.error || 'không rõ lỗi')
              // File giờ đã mang số mới: đó là mặc định mới, xoá phần nhớ tạm.
              theoFile[f].muc.forEach(function (r) {
                r.m.truong.filter(la).forEach(function (t) { r.def[t.key] = r.cfg[t.key] })
                delete kho.gt[r.m.id]
                r.ve.forEach(function (fn) { fn() })
                r.capNhatCham()
              })
              ghiLuu(kho)
              ok.push(kq.daGhi + ' → ' + f.split('/').pop())
            })
            .catch(function (err) {
              loi.push(f.split('/').pop() + ': ' + err.message)
            })
        })
      }, Promise.resolve())
      .then(function () {
        delete bLuuTong.dataset.dang
        capNhatTong()
        if (!loi.length) nhayTong('Đã lưu ' + ok.join(', ') + '.')
        else nhayTong('Không lưu được ' + loi.join('; ') + '. Chỉ lưu được khi mở trang bằng serve.mjs trên máy; giá trị vẫn được nhớ trên trình duyệt này.' + (ok.length ? ' Đã lưu: ' + ok.join(', ') + '.' : ''))
      })
  }

  // Trình duyệt không cho clipboard (trang không an toàn, bị chặn) thì chép
  // bằng cách cũ qua một ô chữ tạm.
  function chepTay(chu) {
    var t = document.createElement('textarea')
    t.value = chu
    t.style.cssText = 'position:fixed;left:-9999px;top:0'
    document.body.appendChild(t)
    t.select()
    try {
      document.execCommand('copy')
    } catch (e) {}
    t.remove()
  }

  function batTat(mo) {
    mo = mo == null ? bang.hidden : mo
    bang.hidden = !mo
    nutMo.setAttribute('aria-expanded', String(mo))
    kho.bang = mo
    ghiLuu(kho)
  }

  function dung() {
    var trang = (document.querySelector('.kx-page') || { dataset: {} }).dataset.page
    var co = MUC.filter(function (m) {
      var A = window[m.api]
      if (!A || !A.config) return false
      return !m.trang || m.trang === trang
    })
    if (!co.length) return // trang không có mục nào: phím H không làm gì

    var st = document.createElement('style')
    st.textContent = CSS
    document.head.appendChild(st)

    nutMo = el('button', 'kx-pn-btn')
    nutMo.type = 'button'
    nutMo.setAttribute('aria-label', 'Mở bảng setting')
    nutMo.setAttribute('aria-expanded', 'false')
    nutMo.innerHTML =
      '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true">' +
      '<path d="M2 5h8M14 5h2M2 13h3M9 13h7"/><circle cx="12" cy="5" r="2"/><circle cx="7" cy="13" r="2"/></svg>'

    bang = el('div', 'kx-pn')
    bang.setAttribute('role', 'dialog')
    bang.setAttribute('aria-label', 'Bảng setting')
    var dau = el('div', 'kx-pn__dau')
    var tit = el('span')
    tit.innerHTML = '<b>Settings</b> · ' + co.length + ' mục'
    dau.appendChild(tit)
    var x = el('button', 'kx-pn__x', '×')
    x.type = 'button'
    x.setAttribute('aria-label', 'Đóng bảng setting')
    x.addEventListener('click', function () {
      batTat(false)
    })
    dau.appendChild(x)
    bang.appendChild(dau)

    var cuon = el('div', 'kx-pn__cuon')
    // Dấu cho kx-smooth-scroll.js: lăn chuột trong đây thì để bảng tự cuộn.
    cuon.setAttribute('data-kx-cuon-rieng', '')
    co.forEach(function (m) {
      cuon.appendChild(dungMuc(m, window[m.api]))
    })
    bang.appendChild(cuon)

    var chan = el('div', 'kx-pn__chan')
    bLuuTong = el('button', 'kx-pn__luu')
    bLuuTong.type = 'button'
    bLuuTong.title = 'Ghi mọi setting đã đổi vào CONFIG của file hiệu ứng tương ứng'
    bLuuTong.addEventListener('click', luuTong)
    baoTong = el('p', 'kx-pn__bao')
    chan.appendChild(bLuuTong)
    chan.appendChild(baoTong)
    bang.appendChild(chan)
    capNhatTong()

    document.body.appendChild(bang)
    /* KHÔNG gắn nút lên trang — người dùng chốt ẩn đi, bấm H mới gọi ra. Vẫn
     * giữ phần tử nút trong bộ nhớ để batTat() ghi aria-expanded như cũ.
     * Home: trình chỉnh CD (kx-cd3d-builder.js) đã dời sang phím K (người dùng
     * chốt) để H ở mọi trang đều là bảng setting chung này. */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !bang.hidden) {
        batTat(false)
        return
      }
      if (e.key !== 'h' && e.key !== 'H') return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      // Đang gõ trong ô nhập thì H là chữ H, không phải phím tắt.
      var t = e.target
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      e.preventDefault()
      batTat()
    })
    batTat(!!kho.bang)
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', dung, { once: true })
  else dung()
})()
