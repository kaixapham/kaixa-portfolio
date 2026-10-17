/* =============================================================================
 * kaixa Portfolio — CD deck 3D thật trên trang Home
 * -----------------------------------------------------------------------------
 * Thay cái đĩa PHẲNG (ảnh `ellipse152.webp` ở node Figma `9:3529`, do
 * `kx-spin.js` quay) bằng chiếc máy CD dựng bằng three.js — chính là project
 * `tools/cd-visualizer`, nay gộp vào repo. Module deck nằm ở `assets/js/cd3d/`
 * (bản chép của `tools/cd-visualizer/src/`), three.js nằm ở
 * `assets/js/vendor/three/`.
 *
 * ĐÂY LÀ NGOẠI LỆ DUY NHẤT của luật "không thư viện". Bốn trang kia và trang
 * contact vẫn sạch; chỉ Home nạp three. Vẫn KHÔNG có build step: trình duyệt
 * tự giải tên `three` bằng <script type="importmap"> khai trong home.html.
 *
 * HÌNH DÁNG + VẬT LIỆU + NỘI DUNG đến từ `assets/cd3d/deck.json` — file do nút
 * "Lưu sang website" của editor (`tools/cd-visualizer`) ghi ra. Editor là nơi
 * chỉnh; trang này chỉ đọc lại. Không có deck.json thì rơi về `look` bên dưới.
 *
 * Máy NEO VÀO VIEWPORT nên nó sống suốt từ đầu trang tới cuối trang. Tư thế
 * (vị trí, cỡ, góc xoay) đi theo DÃY MỐC trong `MOC` — cuộn tới đâu thì ở tư
 * thế đó, giữa hai mốc thì nội suy. Chỉnh bằng trình builder: bấm `K` trên
 * trang Home (xem `kx-cd3d-builder.js`).
 * ========================================================================== */
import * as THREE from 'three'
import { createParams, deriveLayout } from './cd3d/params.js'
import { createMaterials } from './cd3d/materials.js'
import { buildDevice, disposeTree } from './cd3d/device.js'
import { buildDisc, createDiscState, TRANSITIONS } from './cd3d/disc.js'
import { createDisplay, buildScreenMeshes, PRESETS } from './cd3d/screen.js'
import { createHud, formatTime } from './cd3d/hud.js'
import { createHologram } from './cd3d/hologram.js'
import { ENVIRONMENTS, makeEnvironmentTexture } from './cd3d/environments.js'
import { LOOKS } from './cd3d/presets.js'
import { createAudio } from './cd3d/audio.js'
import { createSfx } from './cd3d/sfx.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'

/* --------------------------------------------------------------- CONFIG --
 * PHẲNG, đúng lệ chung của project. Mọi thứ liên quan tới VỊ TRÍ thì không
 * nằm ở đây mà ở `MOC` bên dưới — nó là một DÃY mốc theo cuộn, mỗi viewport
 * một dãy, nên không phẳng được. Đây là chỗ duy nhất trong project lệch khỏi
 * luật "CONFIG phẳng", và lệch có chủ ý.
 */
const CONFIG = {
  enabled: true,
  /* Hiện máy CD 3D hay không — công tắc ở đầu bảng K trên trang Home ghi thẳng
   * vào dòng này. false = KHÔNG dựng three.js (không tốn GPU, không tải deck),
   * ảnh phẳng của Figma hiện lại như bản thiết kế. Khác `enabled`: tắt
   * `enabled` là bỏ hẳn file này, không còn công tắc nào để bật lại. */
  hien: false,
  anchor: '9:3529', // node Figma của ô đĩa phẳng — dùng để suy vị trí mặc định
  hideFlat: true, // false = để lộ cả ảnh phẳng lẫn 3D, tiện so khi chỉnh
  /* Những node PHẲNG mà máy 3D thay thế — giấu hết, không thì trang có đầy
   * ảnh chụp của chính chiếc máy nằm cạnh bản 3D.
   *
   *   9:3529    ô đĩa tròn (ellipse152.webp), do kx-spin.js quay
   *   102:3759  ảnh render 3/4 graphite (magnific-frontleft-threequarter…)
   *   98:3724   thân máy TRẮNG + đĩa (image3681 + ellipse154/155)
   *   100:3729  cùng cụm, bản nhỏ (image3682 + ellipse156/157)
   *   100:3748  cùng cụm, lặp lại ở cuối trang
   *   97:997 97:991 100:3739 100:3740 100:3746 100:3747
   *             image367.webp — khung rất HẸP (rộng 122–326 trên cao 945–1200)
   *             vì chúng cắt lấy đúng dải MẶT CẠNH của bản render
   *
   * Giấu bằng `visibility`, không phải `display`, để không đụng vào layout —
   * mọi khối quanh chúng giữ nguyên chỗ như bản thiết kế.
   *
   * NAY ẢNH ĐÃ BỊ XOÁ HẲN khỏi trang (người dùng chốt "xoá hết"): danh sách
   * `XOA` trong tools/figma-to-html.mjs chỉ sinh ra KHUNG RỖNG cho 11 node này,
   * file ảnh cũng đã gỡ khỏi repo. Danh sách ở đây chỉ còn giấu khung rỗng —
   * vô hại, giữ lại phòng khi khung nào có viền/nền. Muốn ảnh nào hiện lại thì
   * bỏ id khỏi `XOA` rồi dựng lại Home (ảnh sẽ được tải lại từ Figma). */
  giau: [
    '9:3529',
    '102:3759',
    '98:3724',
    '100:3729',
    '100:3748',
    '97:997',
    '97:991',
    '100:3739',
    '100:3740',
    '100:3746',
    '100:3747',
  ].join(','),  maxDpr: 1.75, // trần devicePixelRatio; 2 nét hơn nhưng nặng gấp rưỡi
  spin: 1, // tốc độ quay đĩa (0 = đứng yên)
  scrollSpin: 0.35, // cuộn thêm bao nhiêu vòng đĩa trên mỗi màn hình cuộn
  muot: true, // nội suy mốc bằng đường cong mềm thay vì đường thẳng
  // ------------------------------------------------------------- parallax
  // Máy nhích và ngả nhẹ theo con trỏ. Cộng THÊM lên tư thế của mốc, không
  // thay thế — nên dù đang ở mốc nào thì parallax cũng chỉ là một lớp phủ mỏng.
  parallax: true,
  parallaxDoi: 16, // px thiết kế — dời tối đa khi con trỏ ở sát mép màn hình
  parallaxXoay: 5, // độ — ngả tối đa
  parallaxMuot: 0.07, // 0..1 — mỗi khung đuổi được bấy nhiêu phần quãng còn lại
  zIndex: 20, // trên nội dung trang, dưới nav (50) và danh sách trang (51)
  // Snapshot của editor — nút "Lưu sang website" ghi ra. Đường dẫn TƯƠNG ĐỐI.
  // Để trống = bỏ qua editor, dùng `look` bên dưới.
  deck: 'assets/cd3d/deck.json',
  // Bài CHỈ CHẠY TRÊN MÁY (nhạc thương mại, .gitignore). Chỉ hỏi file này khi
  // trang mở từ localhost — trên web công khai nó không tồn tại.
  deckRieng: 'assets/cd3d/rieng/deck.json',
  // DỰ PHÒNG khi không đọc được deck.json: một bộ trọn gói của `presets.js`.
  look: 'graphite',
  sfx: true, // tiếng bấm / lắp-tháo đĩa, theo bộ tiếng chọn trong editor
  bloom: true, // false = luôn tắt bloom dù editor bật (nhẹ hơn một lượt vẽ)
  // ----------------------------------------------------- bấm được & tiếng
  tuongTac: true, // bấm nút trên máy, kéo núm vặn
  tieng: true, // phát nhạc qua chính máy, phổ nhạc chạy lên màn hình
  nhac: 'assets/media/triumph-of-light.mp3', // chỉ dùng khi deck.json không có bài nào
  // Lớp vết xước — thứ phân biệt kim loại thật với một mảng màu. Bản đồ xước
  // sinh MỘT LẦN lúc dựng (canvas 1024, trong materials.js), không đụng gì tới
  // vòng vẽ mỗi khung; tắt đi chỉ tiết kiệm ~8 MB GPU và vài chục ms lúc mở.
  wear: true,
  /* TRẦN CỨNG cạnh dài của khung vẽ, tính bằng PIXEL THẬT (chặn SAU khi đã
   * nhân devicePixelRatio) — đúng khuôn `maxPx` mà các file lửa đã dùng.
   *
   * Đo được trước khi chặn: ô vẽ 1262 css px x dpr 1.75 = 2208^2 = 4.88 TRIỆU
   * pixel mỗi khung cho đúng một vật thể. Hình học thì rẻ (65k tam giác, 73
   * lượt vẽ) nên nghẽn nằm ở fill rate — hạ số pixel là hạ thẳng vào chỗ đau.
   * 1400 vẫn còn hơn 1 pixel thật trên mỗi css px ở ô cỡ này. */
  maxPx: 1400,
  // Khung vẽ chỉ cấp phát lại khi cạnh ô vượt một nấc bấy nhiêu pixel.
  nacVe: 64,
  /* Bóng đổ: BẬT, nhưng chỉ là máy TỰ ĐỔ BÓNG LÊN CHÍNH NÓ (núm vặn hắt
   * xuống dải điều khiển, nút lún vào hốc) — đúng thứ làm khối trông có thật,
   * và đúng thứ nhìn thấy trong ảnh render tham chiếu.
   *
   * Cái bỏ đi là MẶT PHẲNG HỨNG BÓNG 90x90 của tool. Trong tool máy đứng
   * trong một phòng dựng sẵn nên nó có nghĩa; ở đây canvas TRONG SUỐT nằm đè
   * lên trang web, không có sàn nào, nên mặt đó biến thành một mảng xám lơ
   * lửng mép thẳng đơ cắt ngang chữ và ảnh của trang. */
  bongDo: true,
  bongSize: 1024, // cạnh shadow map
  // Các số môi trường dưới đây chỉ dùng khi `look` để trống.
  envPreset: 'c4d',
  envRotation: 249,
  envExposure: 0.9,
  envIntensity: 0.62,
  shadow: 0.7,
}

/* ------------------------------------------------------------------ MOC --
 * Máy CD NEO VÀO VIEWPORT (`position: fixed`) nên nó sống suốt từ đầu trang
 * tới cuối trang, không đóng đinh vào một khúc nào. Cuộn tới đâu thì nó ở tư
 * thế của mốc tại đó — giữa hai mốc thì nội suy.
 *
 * Mỗi mốc:
 *   at   : 0..1 — cuộn tới bao nhiêu phần trang thì mốc này đúng
 *   w    : cạnh ô vẽ, px thiết kế
 *   x,y  : góc trên-trái ô vẽ, tính theo VIEWPORT (khung 1920x1080 thiết kế).
 *          Nên x 470 / y 50 là đặt chính giữa màn hình.
 *   dist : camera lùi xa bao nhiêu — số to thì máy nhỏ lại mà ô vẽ không đổi
 *   rotX : ngả trước/sau, độ
 *   rotY : xoay quanh trục dọc, độ. **90 = nhìn từ CẠNH** (máy xoay dọc ra,
 *          chỉ còn thấy bề dày) — đúng tư thế trong ảnh thứ ba bạn gửi.
 *   rotZ : xoay trong mặt phẳng màn hình, độ
 *
 * Dãy phải xếp theo `at` TĂNG DẦN.
 *
 * Mỗi viewport một dãy riêng. Viewport nào không khai thì dùng dãy của
 * `w1920` — vì cả trang co giãn theo `--u = 100cqw / 120` nên một toạ độ
 * thiết kế rơi vào cùng chỗ ở mọi bề rộng; chỉ khi muốn ĐỔI BỐ CỤC ở khổ hẹp
 * mới cần dãy riêng.
 *
 * Trình builder (`kx-cd3d-builder.js`, bấm `K`) ghi đè xuống localStorage;
 * ở đây là dãy gốc để clone mới cũng chạy đúng.
 */
const VIEWPORTS = [
  { key: 'w1920', min: 1681, label: '1920 — desktop lớn' },
  { key: 'w1440', min: 1281, label: '1440 — laptop' },
  { key: 'w1280', min: 1025, label: '1280 — laptop nhỏ' },
  { key: 'w1024', min: 769, label: '1024 — tablet ngang' },
  { key: 'w768', min: 481, label: '768 — tablet dọc' },
  { key: 'w390', min: 0, label: '390 — điện thoại' },
]

const MOC = {
  // Dãy gốc bám theo chính các mục của trang Home (đo bằng px thiết kế rồi quy
  // ra tiến độ cuộn): hero/Awards Winner → 01. → WORKS 20-27 → 02. →
  // "Reach out…" → 03./dịch vụ → KX. FOLIO 84VN.
  // Cung chuyển: 3/4 nghiêng → chính diện → xoay dọc nhìn từ cạnh.
  w1920: [
    // y 341 "∏Awards Winner∏" — 3/4 nghiêng, to (ảnh gợi ý 1)
    { at: 0.0, w: 1050, x: 560, y: 40, dist: 25, rotX: -6, rotY: -32, rotZ: -4 },
    // y 1302 "01."
    { at: 0.12, w: 1000, x: 470, y: 60, dist: 26, rotX: -3, rotY: -16, rotZ: -2 },
    // y 2976 "WORKS 20-27"
    { at: 0.27, w: 900, x: 780, y: 120, dist: 27, rotX: 4, rotY: 28, rotZ: 3 },
    // y 3888 "02."
    { at: 0.42, w: 940, x: 220, y: 90, dist: 26, rotX: 2, rotY: -24, rotZ: -3 },
    // y 6552 "Reach out…" — CHÍNH DIỆN, to nhất (ảnh gợi ý 2)
    { at: 0.6, w: 1120, x: 400, y: 10, dist: 24, rotX: 0, rotY: 0, rotZ: 0 },
    // y 7964-8281 "①Web Design / Editorial Design / Branding / Art Direction"
    { at: 0.75, w: 980, x: 640, y: 70, dist: 26, rotX: -4, rotY: 40, rotZ: 2 },
    // y 11080-11641 "KX. FOLIO 84VN" — XOAY DỌC, nhìn từ cạnh (ảnh gợi ý 3)
    { at: 1.0, w: 900, x: -60, y: 90, dist: 27, rotX: 0, rotY: 90, rotZ: 0 },
  ],
}

const LUU = 'kx-cd3d:moc'

/* Dãy đã lưu từ builder, nếu có. */
function docLuu() {
  try {
    const raw = localStorage.getItem(LUU)
    if (!raw) return {}
    const o = JSON.parse(raw)
    return o && typeof o === 'object' ? o : {}
  } catch (e) {
    return {}
  }
}

/* Dãy mốc đang dùng cho một viewport: bản lưu > dãy gốc của nó > dãy w1920. */
function dayMoc(key) {
  const luu = docLuu()[key]
  if (Array.isArray(luu) && luu.length) return luu.map((m) => ({ ...m }))
  const goc = MOC[key] || MOC.w1920
  return goc.map((m) => ({ ...m }))
}

function chonVp(beRong) {
  return VIEWPORTS.find((p) => beRong >= p.min) || VIEWPORTS[VIEWPORTS.length - 1]
}

const KHOA = ['w', 'x', 'y', 'dist', 'rotX', 'rotY', 'rotZ']
const muotHoa = (k) => k * k * (3 - 2 * k) // smoothstep

/* Tư thế tại một tiến độ cuộn: tìm hai mốc kẹp quanh nó rồi nội suy. */
function tuThe(day, p) {
  if (!day.length) return null
  if (p <= day[0].at) return { ...day[0] }
  const cuoi = day[day.length - 1]
  if (p >= cuoi.at) return { ...cuoi }
  let i = 0
  while (i < day.length - 1 && day[i + 1].at < p) i++
  const a = day[i]
  const b = day[i + 1]
  const khoang = Math.max(1e-6, b.at - a.at)
  let k = (p - a.at) / khoang
  if (CONFIG.muot) k = muotHoa(k)
  const ra = {}
  for (const kh of KHOA) {
    const va = a[kh] == null ? 0 : a[kh]
    const vb = b[kh] == null ? va : b[kh]
    ra[kh] = va + (vb - va) * k
  }
  return ra
}

/* Cuộn được bao nhiêu phần trang, 0..1. */
function tienDo() {
  const tran = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
  return Math.min(1, Math.max(0, window.scrollY / tran))
}

/* 1px thiết kế. KHÔNG đọc `--px` bằng getPropertyValue — nó trả nguyên chuỗi
 * calc() chứ không phải số đã tính (xem CLAUDE.md). Bản thiết kế rộng 1920 nên
 * suy thẳng từ bề rộng thật của `.kx-page`. */
function tyLe(page) {
  return page.getBoundingClientRect().width / 1920
}

/* ===================================================================== vào */

const S = CONFIG
let api = null

function dung(deck) {
  /* HAI CHẾ ĐỘ.
   *   - Trang Home: có `.kx-page`. Máy neo viewport, tư thế bám dãy mốc theo
   *     cuộn, và không nuốt chuột của chữ nằm dưới.
   *   - Trang playground: có `[data-kx-cd3d]`. Máy lấp đầy đúng ô đó, đứng
   *     yên, ăn chuột thoải mái vì chẳng có gì nằm dưới.
   * Cùng một module, khác đúng mấy chỗ này. */
  const san = document.querySelector('[data-kx-cd3d]')
  const page = document.querySelector('.kx-page')
  if (!page && !san) return null
  const sanChoi = !!san && !page
  // Quy đổi px thiết kế: Home đo `.kx-page`, playground đo <body> (cả hai đều
  // rộng đúng 120 lần `--u`, tức 1920 px thiết kế).
  const moc = page || document.body
  const neo = page ? document.querySelector('[data-n="' + S.anchor + '"]') : null

  /* ---------------------------------------------------------- ô vẽ */
  /* NEO VÀO VIEWPORT, và treo vào <body> chứ KHÔNG vào `.kx-page`: nằm trong
   * một phần tử có transform thì `fixed` bám theo phần tử đó chứ không bám
   * viewport nữa. `kx-smooth-scroll.js` dùng `window.scrollTo` chứ không dịch
   * transform, nên ở đây `fixed` an toàn (xem ghi chú trong file đó). */
  const boc = document.createElement('div')
  boc.className = 'kx-cd3d'
  if (sanChoi) {
    boc.style.cssText = 'position:absolute;inset:0;pointer-events:none'
    san.style.position = 'relative'
    san.appendChild(boc)
  } else {
    boc.style.cssText =
      'position:fixed;pointer-events:none;z-index:' + S.zIndex + ';will-change:transform'
    document.body.appendChild(boc)
  }

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true, // nền trong suốt — máy đứng trên nền đen sẵn của trang
    powerPreference: 'high-performance',
  })
  // Tỉ lệ pixel đặt trong `apTuThe()` vì nó phụ thuộc cạnh ô vẽ (xem `maxPx`).
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.shadowMap.enabled = S.bongDo
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.domElement.style.cssText = 'width:100%;height:100%;display:block'
  boc.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  scene.background = null // KHÔNG đặt màu: để lộ nền trang phía sau
  const camera = new THREE.PerspectiveCamera(30, 1, 0.6, 160)

  /* ---------------------------------------------------------- đèn */
  const key = new THREE.DirectionalLight(0xffffff, 1.35)
  key.castShadow = S.bongDo
  key.shadow.mapSize.set(S.bongSize, S.bongSize) // 2048 như tool thì quá nặng cho một trang web
  key.shadow.camera.near = 1
  key.shadow.camera.far = 60
  key.shadow.bias = -0.0006
  key.shadow.normalBias = 0.02
  scene.add(key)
  const fill = new THREE.DirectionalLight(0xdde6ff, 0.4)
  scene.add(fill)
  const rim = new THREE.DirectionalLight(0xffffff, 0.45)
  scene.add(rim)
  const hemi = new THREE.HemisphereLight(0xffffff, 0xb5bac1, 0.3)
  scene.add(hemi)

  const shadowMat = new THREE.ShadowMaterial({ opacity: 0.1 })
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), shadowMat)
  floor.rotation.x = -Math.PI / 2
  floor.receiveShadow = true
  /* KHÔNG thêm mặt hứng bóng vào cảnh. Giữ lại đối tượng vì `apDungMoiTruong`
   * và `dungMay` có chạm vào nó, nhưng nó không bao giờ được vẽ: trên một
   * canvas trong suốt đè lên trang web thì không có sàn nào để hứng, và mặt
   * 90x90 này chính là mảng xám lơ lửng cắt ngang chữ. Bóng ở đây chỉ là máy
   * tự đổ lên chính nó. */

  const pmrem = new THREE.PMREMGenerator(renderer)
  pmrem.compileEquirectangularShader()
  let envRT = null

  /* Môi trường + dàn đèn. Tách thành object `env` đúng hình dạng mà `LOOKS`
   * dùng, để một look đè lên được mà không phải dịch tên trường. */
  const env = {
    preset: S.envPreset,
    intensity: S.envIntensity,
    rotation: S.envRotation,
    exposure: S.envExposure,
    shadow: S.shadow,
    rig: {
      key: { color: '#ffffff', intensity: 1.35 },
      fill: { color: '#dde6ff', intensity: 0.4 },
      rim: { color: '#ffffff', intensity: 0.45 },
      hemi: { intensity: 0.3 },
    },
    // hai khối này có sẵn để deck.json gộp vào được (`gop` bỏ qua khoá lạ)
    bloom: { on: false, strength: 0.04, radius: 0.27, threshold: 0.8 },
    sfx: {
      on: true,
      volume: 0.15,
      kit: 'daft',
      pitch: 0.4,
      length: 3,
      bright: 1.6,
      drive: 0.38,
      mech: 0.55,
      ring: 180,
      crackle: 0.87,
      res: 16,
      formant: 0.8,
    },
  }

  function apDungMoiTruong() {
    const preset = ENVIRONMENTS[env.preset] ?? ENVIRONMENTS.studio
    envRT?.dispose()
    const nguon = makeEnvironmentTexture(env.preset, 512)
    envRT = pmrem.fromEquirectangular(nguon)
    nguon.dispose()
    scene.environment = envRT.texture
    const goc = preset.envRotation + (env.rotation * Math.PI) / 180
    scene.environmentRotation.set(0, goc, 0)

    const L = preset.lights
    key.position.set(...L.key.position)
    key.shadow.radius = preset.shadowRadius
    fill.position.set(...L.fill.position)
    rim.position.set(...L.rim.position)
    hemi.color.set(L.hemi.sky)
    hemi.groundColor.set(L.hemi.ground)

    // Dàn đèn lấy từ `env.rig` (look khai riêng), không phải từ preset — đúng
    // như `applyRig()` của tool.
    key.color.set(env.rig.key.color)
    key.intensity = env.rig.key.intensity
    fill.color.set(env.rig.fill.color)
    fill.intensity = env.rig.fill.intensity
    rim.color.set(env.rig.rim.color)
    rim.intensity = env.rig.rim.intensity
    hemi.intensity = env.rig.hemi.intensity

    renderer.toneMappingExposure = preset.exposure * env.exposure
    shadowMat.opacity = preset.shadow * env.shadow
    materials.setEnvIntensity(env.intensity)
  }

  /* ------------------------------------------------- vật liệu & ánh sáng
   * `state.material` là đúng khối mà tab "Vật liệu" của tool điều khiển. Giữ
   * nguyên hình dạng đó để `LOOKS` gộp vào được mà không phải dịch gì. */
  const state = {
    look: '',
    knob: 0.258, // 0..1 → tốc độ đĩa 0..3×, đúng như núm trong editor
    presetIndex: 0,
    intensity: 0.5,
    hue: 36,
    material: {
      finish: 'blasted',
      color: '#ffffff',
      roughness: 0.42,
      metalness: 0.95,
      anisotropy: 0,
      rotation: 0,
      grainScale: 1,
      grainDensity: 1,
      clearcoat: 0.12,
      clearcoatRoughness: 0.62,
      texture: {
        shell: { blend: 0.18, relief: 0.02, scale: 0.41 },
        knob: { blend: 0.65, relief: 0.23, scale: 2.39 },
        button: { blend: 0.87, relief: 3.32, scale: 10.21 },
      },
      screenReflection: 0.94,
      wear: {
        kind: 'brushed',
        density: 1.11,
        depth: 0.44,
        angle: 0,
        contrast: 3,
        scale: 1.55,
        seed: 77574, // cố định, nên vết xước y hệt nhau mỗi lần mở trang
      },
    },
  }

  /* Gộp giá trị của look lên mặc định — y hệt `mergeInto` của tool: không bao
   * giờ cho một số vô hướng thay thế cả một khối object. */
  function gop(nen, va) {
    if (!va || typeof va !== 'object') return nen
    for (const k of Object.keys(va)) {
      const v = va[k]
      if (Array.isArray(v)) nen[k] = v.slice()
      else if (v && typeof v === 'object' && nen[k] && typeof nen[k] === 'object') gop(nen[k], v)
      else if (k in nen) {
        if (!(nen[k] && typeof nen[k] === 'object')) nen[k] = v
      }
    }
    return nen
  }

  /* ---------------------------------------------------------- máy */
  const materials = createMaterials()
  const display = createDisplay()
  const hud = createHud()
  const hologram = createHologram()
  const discState = createDiscState()
  const params = createParams()
  let layout = deriveLayout(params)
  let built = null

  function dungMay() {
    layout = deriveLayout(params)
    materials.setStripTone(params.strip.tone)
    materials.setPlateTone(params.strip.panelTone)
    materials.setAssetTone(params.asset.tone)
    materials.setDiscGloss(0.62 - params.disc.gloss * 0.56)
    materials.setLedColor(params.leds.color)
    materials.setIconColor(params.buttons.iconColor)
    materials.setIconIntensity(params.buttons.iconIntensity)
    materials.setBackTone(params.body.backTone)
    materials.setButtonSurface(params.buttons.surface)

    if (built) {
      scene.remove(built.deck.device)
      disposeTree(built.deck.device)
    }
    hologram.apply(params.side.tag.holo)
    const deck = buildDevice(materials, layout, params, hologram)
    const disc = buildDisc(materials, layout, discState)
    deck.device.add(disc.seat, disc.root)
    const screen = buildScreenMeshes(display, materials, layout, hud)
    deck.device.add(screen.panel, screen.glass, screen.readout)
    hud.draw(layout.screen.w / layout.screen.h, params.screen.hud)
    hud.setColor(params.screen.hud.color)
    scene.add(deck.device)
    built = { deck, disc }
    deck.knob.rotation.z = -knob * Math.PI * 4
    // Danh sách vật bấm được, dựng lại mỗi lần dựng máy.
    pickRoots = deck.interactive.map((e) => e.object)
    entryOf = new Map(deck.interactive.map((e) => [e.object, e]))
    hovered = null
    floor.position.y = -layout.H / 2 - 1.6
    /* Khung chiếu của đèn key phải ÔM VỪA khối máy. Mặc định của
     * DirectionalLight là ô vuông -5..5, mà máy rộng hơn thế — để nguyên thì
     * bóng bị cắt cụt ngay giữa thân. */
    if (S.bongDo) {
      const sp = Math.max(layout.W, layout.H) * 0.85
      key.shadow.camera.left = -sp
      key.shadow.camera.right = sp
      key.shadow.camera.top = sp
      key.shadow.camera.bottom = -sp
      key.shadow.camera.updateProjectionMatrix()
    }
  }

  /* Đẩy `state.material` lên mọi bề mặt — đúng thứ tự của `applyMaterial()`
   * trong tool. Chạy MỘT LẦN lúc dựng, không đụng gì tới vòng vẽ mỗi khung. */
  function apDungVatLieu() {
    const m = state.material
    materials.setFinish(m.finish)
    materials.setMetalColor(m.color)
    materials.setRoughness(m.roughness)
    materials.setMetalness(m.metalness)
    materials.setAnisotropy(m.anisotropy)
    materials.setAnisotropyRotation(m.rotation)
    materials.setGrainScale(m.grainScale)
    materials.setGrainDensity(m.grainDensity)
    materials.setClearcoat(m.clearcoat)
    materials.setClearcoatRoughness(m.clearcoatRoughness)
    for (const ten of Object.keys(m.texture)) {
      const t = m.texture[ten]
      materials.setTextureBlend(ten, t.blend)
      materials.setTextureRelief(ten, t.relief)
      materials.setTextureScale(ten, t.scale)
    }
    materials.setGlassReflection(m.screenReflection)
    // Bản đồ vết xước sinh bằng canvas 1024 — một lần, lúc dựng.
    if (S.wear) materials.setWear(m.wear)
  }

  /* Một "look" của tool = ba khối params / state / env gộp lên mặc định. */
  function apDungLook() {
    const look = LOOKS[S.look]
    if (!look) return
    gop(params, look.params)
    gop(state, look.state)
    gop(env, look.env)
  }

  /* ---------------------------------------------------------- parallax
   * Đích là vị trí con trỏ quy về -1..1 so với tâm màn hình; mỗi khung đuổi
   * dần tới đích (lerp) nên thả chuột ra là nó trôi về chứ không giật.
   *
   * Dời bằng `transform: translate3d`, KHÔNG đụng `left/top`: transform chạy
   * trên lớp ghép ảnh, không ép tính lại layout — mà đây là việc làm mỗi khung
   * trên một trang đang cuộn. `left/top` vẫn dành cho tư thế của mốc.
   */
  const px = { dichX: 0, dichY: 0, x: 0, y: 0 }
  const giamChuyenDong = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (S.parallax && !giamChuyenDong) {
    addEventListener(
      'pointermove',
      (ev) => {
        px.dichX = (ev.clientX / innerWidth) * 2 - 1
        px.dichY = (ev.clientY / innerHeight) * 2 - 1
      },
      { passive: true }
    )
    // Chuột rời cửa sổ thì trả máy về tư thế gốc, không để nó treo lệch một bên.
    addEventListener('pointerleave', () => {
      px.dichX = 0
      px.dichY = 0
    })
  }

  /* ====================================================== bấm được & tiếng
   * Chiếu tia từ con trỏ vào cảnh để biết đang chạm vào nút nào. Toạ độ chuẩn
   * hoá phải tính theo HỘP CỦA Ô VẼ, không theo `innerWidth/innerHeight` như
   * trong tool — ở đó canvas phủ kín cửa sổ, ở đây nó chỉ là một ô trên trang.
   */
  const raycaster = new THREE.Raycaster()
  const diem = new THREE.Vector2()
  let pickRoots = []
  let entryOf = new Map()
  let hovered = null
  let knobKeo = null

  const audio = S.tieng ? createAudio() : null
  const sfx = S.sfx ? createSfx() : null
  let dangPhat = false
  let daNoiNhac = false
  let powered = true // editor luôn khởi động ở trạng thái bật
  let hudSeconds = 0
  let knob = state.knob
  let presetIndex = 0
  const keu = (ten) => {
    if (sfx && env.sfx.on) sfx.play(ten)
  }

  function chamVao(ev) {
    const r = boc.getBoundingClientRect()
    if (!r.width || !r.height) return null
    diem.x = ((ev.clientX - r.left) / r.width) * 2 - 1
    diem.y = -((ev.clientY - r.top) / r.height) * 2 + 1
    if (Math.abs(diem.x) > 1 || Math.abs(diem.y) > 1) return null
    raycaster.setFromCamera(diem, camera)
    const hits = raycaster.intersectObjects(pickRoots, true)
    if (!hits.length) return null
    for (let n = hits[0].object; n; n = n.parent) {
      const e = entryOf.get(n)
      if (e) return e
    }
    return null
  }

  /* ---------------------------------------------------------- playlist
   * Đúng cơ chế CMS của editor: mỗi bài mang ảnh đĩa, banner, tên, album, số
   * thứ tự, thời lượng. Bài lấy từ deck.json (công khai) + rieng/deck.json
   * (chỉ trên máy), xếp lại theo thứ tự `i` trong editor. */
  const bai = deck && deck.tracks && deck.tracks.length
    ? deck.tracks
    : [{ title: 'TRIUMPH OF LIGHT', album: 'KAIXA', number: '01', duration: '3:27', audio: S.nhac }]
  const album = (deck && deck.album) || { total: '' }
  let baiNay = Math.max(0, bai.findIndex((b) => deck && b.i === deck.current))

  const giay = (txt) =>
    String(txt || '').split(':').map((n) => Number(n) || 0).reduce((a, n) => a * 60 + n, 0)
  function tongThoiLuong() {
    if (String(album.total || '').trim()) return String(album.total).trim()
    const t = bai.reduce((a, b) => a + giay(b.duration), 0)
    const h = Math.floor(t / 3600)
    const m = Math.floor((t % 3600) / 60)
    const sg = String(Math.floor(t % 60)).padStart(2, '0')
    return h ? h + ':' + String(m).padStart(2, '0') + ':' + sg : m + ':' + sg
  }

  /* Màn hình nói gì tuỳ máy đang chạy hay không — y hệt `refreshReadout()`
   * của editor: dừng thì dòng trên báo TỔNG thời lượng album. */
  function ghiManHinh() {
    const b = bai[baiNay]
    const h = params.screen.hud
    h.show = powered
    if (b && powered) {
      h.nowPlaying = dangPhat ? 'PLAYING: ' + b.title : 'TOTAL: ' + tongThoiLuong()
      h.time = dangPhat ? formatTime(hudSeconds) : b.duration
      h.album = 'ALBUM: ' + b.album
      h.track = b.number
    }
    hud.draw(layout.screen.w / layout.screen.h, h)
    hud.setColor(h.color)
  }

  /* Ảnh nền của máy (từ deck.assets) — bài nào không mang ảnh riêng thì dùng. */
  const anhGoc = { disc: null, graphic: null }
  const napAnh = (url) =>
    new Promise((ok) => {
      if (!url) return ok(null)
      new THREE.TextureLoader().load(
        url,
        (t) => {
          t.colorSpace = THREE.SRGBColorSpace
          t.anisotropy = 16
          ok(t)
        },
        undefined,
        () => ok(null)
      )
    })
  const napIcon = (url) =>
    new Promise((ok) => {
      if (!url) return ok(null)
      const im = new Image()
      im.onload = () => {
        // icon đã được editor "làm phẳng" (alpha → RGB), dùng thẳng làm alphaMap
        const t = new THREE.Texture(im)
        t.colorSpace = THREE.NoColorSpace
        t.anisotropy = 8
        t.needsUpdate = true
        ok(t)
      }
      im.onerror = () => ok(null)
      im.src = url
    })
  async function anhCuaBai(b) {
    if (b.disc && b.discTex === undefined) b.discTex = await napAnh(b.disc)
    if (b.banner && b.bannerTex === undefined) b.bannerTex = await napAnh(b.banner)
    return { disc: b.discTex || anhGoc.disc, banner: b.bannerTex || anhGoc.graphic }
  }

  /* AudioContext chỉ mở khoá được trong handler của một cú click — y hệt ràng
   * buộc ở trang contact. Nên nối nhạc LẦN ĐẦU ngay trong lúc bấm, không nối
   * sẵn lúc dựng trang; đổi bài trước đó thì chỉ đổi chữ trên màn hình. */
  function noiNhac() {
    if (!audio) return
    const url = bai[baiNay] && bai[baiNay].audio
    daNoiNhac = true
    try {
      if (url) audio.connectURL(url)
      else audio.disconnect()
    } catch (e) {
      daNoiNhac = false
    }
  }

  function datNguon(on) {
    powered = on
    keu(on ? 'powerOn' : 'powerOff')
    materials.setPowerLit(on)
    if (!on && dangPhat) datPhat(false)
    ghiManHinh()
  }

  function datPhat(on) {
    if (on && !powered) datNguon(true) // bấm play lúc máy tắt thì máy bật lên
    dangPhat = on
    keu(on ? 'play' : 'stop')
    discState.spinning = on
    if (audio) {
      if (!daNoiNhac) noiNhac()
      if (on) audio.play()
      else audio.pause()
    }
    ghiManHinh()
  }

  async function doiBai(buoc) {
    if (bai.length < 2) {
      // một bài thì "bài kế" = tua về đầu
      if (audio && audio.element) audio.element.currentTime = 0
      hudSeconds = 0
      return
    }
    baiNay = (((baiNay + buoc) % bai.length) + bai.length) % bai.length
    const b = bai[baiNay]
    const anh = await anhCuaBai(b)
    const doi = () => {
      if (anh.disc) materials.setDiscLabel(anh.disc)
      if (anh.banner) materials.setAssetGraphic(anh.banner)
      hudSeconds = 0
      if (daNoiNhac) noiNhac()
      dungMay()
      ghiManHinh()
      if (dangPhat && audio) audio.play()
    }
    const kieu = params.disc.transition
    const goc = (TRANSITIONS[kieu] && TRANSITIONS[kieu].duration) || 0
    if (built && goc) built.disc.play(kieu, goc / Math.max(0.2, params.disc.transitionSpeed), doi)
    else doi()
  }

  const viec = {
    transport() {
      datPhat(!dangPhat)
    },
    preset() {
      presetIndex = (presetIndex + 1) % PRESETS.length
      display.setPreset(presetIndex)
    },
    next() {
      keu('next')
      doiBai(1)
    },
    prev() {
      keu('next')
      doiBai(-1)
    },
    split() {
      discState.splitTarget = discState.splitTarget > 0.5 ? 0 : 1
      keu(discState.splitTarget > 0.5 ? 'split' : 'close')
    },
    eject() {
      discState.ejectTarget = discState.ejectTarget > 0.5 ? 0 : 1
      keu(discState.ejectTarget > 0.5 ? 'eject' : 'load')
    },
    power() {
      datNguon(!powered)
    },
  }

  function bam(e) {
    if (!e) return
    e.press = 1
    keu('press')
    if (e.id === 'power') {
      viec.power()
      return
    }
    const ten = params.buttons.actions[e.index] || 'preset'
    ;(viec[ten] || viec.preset)()
  }

  if (S.tuongTac) {
    /* Ô vẽ để `pointer-events: none`, chỉ bật lên `auto` khi con trỏ THỰC SỰ
     * đang nằm trên máy. Để `auto` suốt thì cả vùng vuông quanh máy nuốt mất
     * chuột của chữ nằm dưới — mà trên trang Home máy đè lên đúng phần chữ. */
    addEventListener(
      'pointermove',
      (ev) => {
        if (boc.dataset.kxKhoa === '1') return // builder đang mở, nó tự quản
        const e = chamVao(ev)
        hovered = e
        boc.style.pointerEvents = e ? 'auto' : 'none'
        boc.style.cursor = e ? 'pointer' : ''
      },
      { passive: true }
    )

    boc.addEventListener('pointerdown', (ev) => {
      if (boc.dataset.kxKhoa === '1') return
      const e = chamVao(ev)
      if (!e) return
      ev.preventDefault()
      if (e.id === 'knob') {
        knobKeo = { y: ev.clientY, dau: knob }
        return
      }
      bam(e)
    })

    addEventListener('pointermove', (ev) => {
      if (!knobKeo) return
      knob = Math.min(1, Math.max(0, knobKeo.dau + (knobKeo.y - ev.clientY) / 300))
      if (built) built.deck.knob.rotation.z = -knob * Math.PI * 4
    })
    addEventListener('pointerup', () => {
      knobKeo = null
    })
  }

  /* Thứ tự y hệt khởi động của editor: deck.json (hoặc look dự phòng) gộp lên
   * mặc định → vật liệu → môi trường → dựng máy. Ảnh nạp song song rồi dựng
   * lại ĐÚNG MỘT lần khi đủ, không dựng lại theo từng ảnh. */
  if (deck) {
    gop(params, deck.params)
    gop(state, deck.state)
    gop(env, deck.env)
  } else {
    apDungLook()
  }
  knob = state.knob
  presetIndex = ((state.presetIndex % PRESETS.length) + PRESETS.length) % PRESETS.length
  apDungVatLieu()
  apDungMoiTruong()
  materials.setPowerLit(powered)
  if (sfx) sfx.apply({ ...env.sfx, enabled: env.sfx.on })
  dungMay()
  ghiManHinh()
  if (audio) {
    // Hai texture này do audio.update() ghi mỗi khung; gán một lần là đủ.
    display.uniforms.uFreq.value = audio.freqTexture
    display.uniforms.uWave.value = audio.waveTexture
  }
  display.setPreset(presetIndex)
  display.uniforms.uIntensity.value = state.intensity
  display.uniforms.uColor.value.setHSL(state.hue / 360, 0.85, 0.6)

  const A = (deck && deck.assets) || {}
  const mat = A.surface || {}
  Promise.all([
    napAnh(A.disc),
    napAnh(A.graphic),
    napAnh(A.tag),
    napIcon(A.power),
    Promise.all(materials.TEXTURE_CHANNELS.map((ch) => napAnh(mat[ch]))),
    Promise.all((A.icons || []).map(napIcon)),
    bai[baiNay] ? anhCuaBai(bai[baiNay]) : Promise.resolve({}),
  ]).then(([disc, graphic, tag, power, surfaces, icons, rieng]) => {
    anhGoc.disc = disc
    anhGoc.graphic = graphic
    const nhan = (rieng && rieng.disc) || disc
    const banner = (rieng && rieng.banner) || graphic
    if (nhan) materials.setDiscLabel(nhan)
    if (banner) materials.setAssetGraphic(banner)
    if (tag) materials.setTagGraphic(tag)
    if (power) materials.setPowerIcon(power)
    materials.TEXTURE_CHANNELS.forEach((ch, i) => {
      if (surfaces[i]) materials.setSurfaceTexture(ch, surfaces[i])
    })
    icons.forEach((t, i) => {
      if (t) materials.setIcon(i, t)
    })
    apDungVatLieu() // độ hoà / độ nổi của texture sống trong state, không trong ảnh
    dungMay()
  })

  /* Bloom — đúng chuỗi của editor (RenderPass → UnrealBloom → OutputPass),
   * chỉ dựng khi editor BẬT nó. Tắt thì vẽ thẳng như cũ, không tốn lượt nào. */
  let composer = null
  let bloomPass = null
  if (S.bloom && env.bloom && env.bloom.on) {
    composer = new EffectComposer(renderer)
    composer.setPixelRatio(renderer.getPixelRatio())
    composer.addPass(new RenderPass(scene, camera))
    bloomPass = new UnrealBloomPass(new THREE.Vector2(256, 256), env.bloom.strength, env.bloom.radius, env.bloom.threshold)
    composer.addPass(bloomPass)
    composer.addPass(new OutputPass())
  }


  /* ------------------------------------------------- đặt ô vẽ lên trang */
  let vpKey = chonVp(innerWidth).key
  let day = dayMoc(vpKey)
  let deTay = null // builder đang ép một tư thế cố định để xem
  let tuTheNay = null
  let canhCu = -1
  let nacCu = -1

  /* Áp một tư thế lên ô vẽ và camera. Chỉ đụng tới DOM khi cạnh thật sự đổi —
   * ghi `width`/`height` mỗi khung là ép trình duyệt tính lại layout, đúng
   * điều cấm trong vòng lặp mỗi khung của project này. */
  /* Tỷ lệ px-thiết-kế → px-màn-hình. ĐO THƯA, không đo mỗi khung:
   * `getBoundingClientRect()` ép trình duyệt tính lại layout ngay tại chỗ, mà
   * đây là vòng chạy mỗi khung trên một trang đang cuộn — đúng điều cấm số 1
   * của project (xem CLAUDE.md). Chỉ đổi khi cửa sổ đổi cỡ, nên đo lại lúc
   * resize và 30 khung một lần cho chắc. */
  let uCache = tyLe(moc)
  let demKhung = 0

  function doLaiTyLe() {
    uCache = tyLe(moc)
  }

  function apTuThe(t) {
    if (!t) return
    tuTheNay = t
    const u = uCache
    // Playground: ô vẽ lấp đầy khung chứa, chỉ `dist` và góc xoay là của mốc.
    const canh = sanChoi
      ? Math.round(san.getBoundingClientRect().width)
      : Math.round(t.w * u)
    /* Cỡ HIỂN THỊ đổi mượt mỗi khung, còn KHUNG VẼ chỉ cấp phát lại theo NẤC.
     *
     * `t.w` nội suy liên tục giữa hai mốc (1050 -> 1000 -> 900...) nên mỗi
     * khung `canh` lệch một hai pixel. Gọi `renderer.setSize()` theo nó là
     * CẤP PHÁT LẠI TOÀN BỘ KHUNG VẼ GPU MỖI KHUNG — đo được 36 fps khi cuộn.
     * Canvas vốn khai `width:100%;height:100%` nên cỡ hiển thị và cỡ bộ đệm
     * tách rời nhau: để trình duyệt kéo giãn bộ đệm cho vừa ô là đủ, mắt
     * không thấy khác, mà hết hẳn cấp phát mỗi khung. */
    if (canh !== canhCu) {
      canhCu = canh
      boc.style.width = canh + 'px'
      boc.style.height = canh + 'px'
    }
    const nac = Math.max(1, Math.round(canh / S.nacVe))
    if (nac !== nacCu) {
      nacCu = nac
      const canhVe = nac * S.nacVe
      // Trần pixel: ô to tới đâu thì khung vẽ cũng không vượt `maxPx`.
      renderer.setPixelRatio(Math.min(devicePixelRatio, S.maxDpr, S.maxPx / Math.max(1, canhVe)))
      renderer.setSize(canhVe, canhVe, false)
      if (composer) composer.setSize(canhVe, canhVe)
      camera.aspect = 1
      camera.updateProjectionMatrix()
    }
    if (!sanChoi) {
      boc.style.left = Math.round(t.x * u) + 'px'
      boc.style.top = Math.round(t.y * u) + 'px'
    }
    camera.position.set(0, 0, t.dist)
    camera.lookAt(0, 0, 0)
    camera.updateProjectionMatrix()
  }

  function doLaiBo() {
    doLaiTyLe()
    vpKey = chonVp(innerWidth).key
    day = dayMoc(vpKey)
    canhCu = -1
    nacCu = -1
    apTuThe(deTay || tuThe(day, tienDo()))
  }

  // Playground: một tư thế đứng yên, hơi chếch cho thấy khối.
  const tuTheSan = { at: 0, w: 1000, x: 0, y: 0, dist: 24, rotX: -4, rotY: -18, rotZ: 0 }

  doLaiBo()
  if (S.hideFlat) {
    S.giau.split(',').forEach((id) => {
      const el = document.querySelector('[data-n="' + id.trim() + '"]')
      if (el) el.style.visibility = 'hidden'
    })
  }
  if (sanChoi) {
    // Chẳng có gì nằm dưới nên cứ ăn chuột thẳng, khỏi bật/tắt theo con trỏ.
    boc.style.pointerEvents = 'auto'
    addEventListener('resize', () => {
      canhCu = -1
    nacCu = -1
      apTuThe(tuTheSan)
    })
  }

  /* ------------------------------------------------------- vòng vẽ */
  const clock = new THREE.Clock()
  let raf = 0
  let trongTam = true
  // Công tắc hiện/ẩn lúc đang chạy: ẩn thì bỏ phần vẽ (như ra khỏi màn hình),
  // giấu ô vẽ, trả ảnh phẳng về và dừng nhạc nếu đang phát.
  let tat = false
  function datHien(on) {
    tat = !on
    boc.style.display = on ? '' : 'none'
    if (!sanChoi && S.hideFlat) {
      S.giau.split(',').forEach((id) => {
        const el = document.querySelector('[data-n="' + id.trim() + '"]')
        if (el) el.style.visibility = on ? 'hidden' : ''
      })
    }
    if (!on && dangPhat) datPhat(false)
  }

  /* Vòng vẽ LUÔN SỐNG; ra khỏi màn hình thì bỏ phần vẽ chứ không dừng vòng.
   *
   * Bản đầu dừng hẳn vòng rồi nhờ IntersectionObserver gọi lại, và nó CHẾT
   * HẲN trong một trường hợp thật: lúc tab bị ẩn, `requestAnimationFrame`
   * không chạy nên `raf` còn giữ một id treo; observer báo "vào tầm nhìn" thì
   * `chay()` thấy `raf` khác 0 nên không làm gì, tới khi id treo kia chạy thì
   * cờ lại đang là ngoài-tầm-nhìn nên vòng kết thúc. Từ đó không còn sự kiện
   * nào để khởi động lại. Một callback rỗng mỗi khung gần như không tốn gì,
   * đổi lại không còn cả lớp lỗi khởi-động-lại. Đây từng là lỗi thật. */
  function khung() {
    raf = requestAnimationFrame(khung)
    const dt = Math.min(clock.getDelta(), 0.05)
    if (!trongTam || tat) return
    const t = clock.elapsedTime
    const { deck, disc } = built

    // Cuộn trang thì đĩa quay thêm — nối vào chính vòng quay sẵn có, không
    // dựng cơ chế riêng.
    const cuon = (scrollY / Math.max(1, innerHeight)) * S.scrollSpin
    if ((demKhung = (demKhung + 1) % 30) === 0) doLaiTyLe()
    const tw = deTay || (sanChoi ? tuTheSan : tuThe(day, tienDo()))
    apTuThe(tw)
    const d2r = Math.PI / 180

    /* Parallax cộng THÊM lên tư thế của mốc. Builder mở thì tắt hẳn: lúc đó
     * đang kéo gizmo, mà gizmo đo bằng `getBoundingClientRect()` của ô vẽ —
     * ô vẽ tự trôi dưới tay thì số đo sai và kéo thành giật. */
    const chinh = S.parallax && !giamChuyenDong && boc.dataset.kxKhoa !== '1'
    const m = chinh ? Math.min(1, Math.max(0.01, S.parallaxMuot)) : 0.12
    px.x += ((chinh ? px.dichX : 0) - px.x) * m
    px.y += ((chinh ? px.dichY : 0) - px.y) * m
    const u2 = uCache
    boc.style.transform =
      'translate3d(' +
      (px.x * S.parallaxDoi * u2).toFixed(2) +
      'px,' +
      (px.y * S.parallaxDoi * u2).toFixed(2) +
      'px,0)'

    deck.device.rotation.x = (tw.rotX + px.y * S.parallaxXoay) * d2r
    deck.device.rotation.y = (tw.rotY + px.x * S.parallaxXoay) * d2r
    deck.device.rotation.z = tw.rotZ * d2r
    discState.speed = knob * 3 * S.spin // núm trong editor: 0..1 → 0..3×
    // Nút nhún xuống rồi nảy về; `press` tắt dần theo hàm mũ.
    if (S.tuongTac) {
      const bt = deck.buttons
      for (let i = 0; i < bt.length; i++) {
        const e = bt[i]
        e.press *= Math.pow(0.0009, dt)
        const nang = hovered === e && !knobKeo ? layout.buttonR * 0.03 : 0
        e.pad.position.z = nang - e.press * layout.buttonR * 0.13
      }
      deck.leds[0].material = discState.spinning ? materials.ledOn : materials.ledOff
      deck.leds[1].material = discState.ejectTarget > 0.5 ? materials.ledOn : materials.ledOff
      deck.leds[2].material = discState.splitTarget > 0.5 ? materials.ledOn : materials.ledOff
    }

    // Icon sáng khi bấm (hoặc luôn sáng / tắt hẳn — chọn trong editor).
    const kieuSang = params.buttons.iconGlow
    for (const e of deck.buttons) {
      if (!e.icon) continue
      materials.setIconLevel(e.index, kieuSang === 'always' ? 1 : kieuSang === 'off' ? 0 : e.press)
    }

    // Đồng hồ trên màn hình chỉ vẽ lại khi sang giây mới.
    if (params.screen.hud.autoTime && dangPhat) {
      const truoc = Math.floor(hudSeconds)
      hudSeconds += dt
      if (Math.floor(hudSeconds) !== truoc) ghiManHinh()
    }

    // Mức âm đẩy vào shader màn hình.
    const u0 = display.uniforms
    const muc = dangPhat && audio ? audio.update() : 0
    const song = dangPhat && audio && audio.state.source !== 'off' ? 1 : 0
    const muon = !powered ? 0 : dangPhat ? state.intensity : 0.02
    u0.uIntensity.value += (muon - u0.uIntensity.value) * Math.min(1, dt * 5)
    u0.uAudio.value += (song - u0.uAudio.value) * Math.min(1, dt * 4)
    u0.uLevel.value += (muc - u0.uLevel.value) * Math.min(1, dt * 12)

    disc.update(dt)
    disc.root.rotation.z -= cuon * Math.PI * 2 * 0.001
    display.update(dt, t)
    hologram.update(t)
    if (composer) composer.render()
    else renderer.render(scene, camera)
  }

  // Observer chỉ GẠT CỜ, không đụng tới vòng vẽ.
  if (S.pauseOffscreen && 'IntersectionObserver' in window) {
    new IntersectionObserver(
      (rows) => {
        trongTam = rows[0].isIntersecting
      },
      { rootMargin: '200px' }
    ).observe(boc)
  }
  raf = requestAnimationFrame(khung)

  addEventListener('resize', doLaiBo)

  return {
    config: S,
    viewports: VIEWPORTS,
    MOC,
    boc,
    page,
    THREE,
    scene,
    camera,
    renderer,
    get vpKey() {
      return vpKey
    },
    get day() {
      return day
    },
    get tuThe() {
      return tuTheNay
    },
    chonVp,
    dayMoc,
    // Mặt bằng gỡ rối, giống cách tool phơi `built`/`state` ra globalThis.
    get built() {
      return built
    },
    get dangPhat() {
      return dangPhat
    },
    get powered() {
      return powered
    },
    get bai() {
      return bai
    },
    get baiNay() {
      return baiNay
    },
    deck,
    params,
    state,
    env,
    viec,
    docLuu,
    tienDo,
    doLaiBo,
    datHien,
    get hien() {
      return !tat
    },
    // builder gọi: ép một tư thế cố định để xem, null = trả về theo cuộn
    deTay(t) {
      deTay = t
      if (!t) doLaiBo()
    },
    // builder gọi: thay cả dãy đang chạy (chưa ghi xuống localStorage)
    datDay(d) {
      day = d.map((m) => ({ ...m })).sort((a, b) => a.at - b.at)
    },
    luu(key, d) {
      const all = docLuu()
      all[key] = d.map((m) => ({ ...m })).sort((a, b) => a.at - b.at)
      try {
        localStorage.setItem(LUU, JSON.stringify(all))
      } catch (e) {}
    },
    xoaLuu(key) {
      const all = docLuu()
      delete all[key]
      try {
        localStorage.setItem(LUU, JSON.stringify(all))
      } catch (e) {}
      doLaiBo()
    },
  }
}

/* deck.json + (chỉ trên localhost) rieng/deck.json. Hỏng hay thiếu thì trả
 * null và máy rơi về `look` — trang không bao giờ chết vì một file JSON. */
async function napDeck() {
  if (!S.deck) return null
  const docJson = async (url) => {
    try {
      const r = await fetch(url, { cache: 'no-cache' })
      return r.ok ? await r.json() : null
    } catch (e) {
      return null
    }
  }
  const deck = await docJson(S.deck)
  if (!deck) return null
  deck.tracks = Array.isArray(deck.tracks) ? deck.tracks : []
  const mayNha = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)
  if (S.deckRieng && mayNha) {
    const rieng = await docJson(S.deckRieng)
    if (rieng && Array.isArray(rieng.tracks)) deck.tracks = deck.tracks.concat(rieng.tracks)
  }
  deck.tracks.sort((a, b) => (a.i || 0) - (b.i || 0))
  return deck
}

/* Dựng máy đúng MỘT lần, kể cả khi bị gọi chồng (bật công tắc liên tục). */
let dangDung = null
function dungMay() {
  if (api) return Promise.resolve(api)
  if (!dangDung) {
    dangDung = napDeck().then((deck) => {
      api = dung(deck)
      window.KX_CD3D = api
      if (api) dispatchEvent(new CustomEvent('kx-cd3d-ready'))
      return api
    })
  }
  return dangDung
}

/* Công tắc lộ ra NGAY khi module chạy, kể cả lúc `hien: false` và máy chưa dựng
 * — bảng K (kx-cd3d-builder.js) cần nó để bật máy lên. Tắt sau khi đã dựng chỉ
 * giấu + dừng vẽ chứ không gỡ scene: dựng lại three.js mỗi lần bật là chậm và
 * dễ rò context; bộ nhớ GPU được trả lúc rời trang. */
window.KX_CD3D_CTL = {
  config: S,
  get daDung() {
    return !!api
  },
  async bat(on) {
    S.hien = !!on
    if (on) {
      const a = await dungMay()
      if (a) a.datHien(true)
    } else if (api) {
      api.datHien(false)
    }
  },
}

async function boot() {
  if (!S.enabled) return
  dispatchEvent(new CustomEvent('kx-cd3d-ctl'))
  if (S.hien) await dungMay()
}

if (document.readyState === 'loading') addEventListener('DOMContentLoaded', boot, { once: true })
else boot()
