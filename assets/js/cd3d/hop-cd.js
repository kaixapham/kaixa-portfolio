/* =============================================================================
 * kaixa Portfolio — HỘP CD trong suốt (jewel case) dựng bằng three.js
 * -----------------------------------------------------------------------------
 * Người dùng: "dựng được kiểu cover CD trong suốt như này không, có cả trạng
 * thái mở ra" — "chỉ làm phần vỏ đĩa thôi, sau tôi tự làm graphic áp lên đĩa".
 * Chỉnh trong editor riêng `tools/cd-case/` (người dùng: "bạn tạo 1 editor
 * mới đi"); Home sẽ dùng lại đúng module này.
 *
 * Kích thước theo MM của hộp CD chuẩn (142 × 125 × 10.4), cả nhóm thu 0.1 →
 * 1 đơn vị scene = 10 mm. Trục: X phải, Y lên, Z hướng về người xem — nắp ở
 * phía trước, đế ở sau, bản lề dọc mép TRÁI.
 *
 *   đế      tấm lưng + gờ trên/dưới + gờ gáy (mép trái)
 *   khay    tấm khay giữa (trong / đen / khói) + chốt giữ đĩa (vành + 12 răng)
 *   đĩa     vành đĩa kim loại ánh cầu vồng + vùng kẹp trong suốt + nhãn (ảnh)
 *   nắp     tấm trước + gờ trên/dưới + gờ mép phải + 2 vấu giữ bìa + 2 núm bản lề
 *   ảnh     tờ bìa (sau tấm nắp), lưng hộp (sau khay), mặt đĩa — ẩn khi chưa có ảnh
 *
 * datMo(t): nắp quay quanh bản lề 0 → `gocMo` độ (t 0..1); đĩa nhấc lên theo
 * `diaNhac`, quay `diaXoay` độ.
 * CONFIG phẳng (P) — editor đọc/ghi theo khoá. Đổi kích thước thì dựng lại hết
 * (rẻ: vài chục mesh), đổi vật liệu thì chỉ cập nhật vật liệu.
 * ========================================================================== */

export const MAC_DINH = {
  // ---- STYLE: 'tuDung' = hộp dựng bằng code; 'model' = model GLB của mfb64
  // (Sketchfab "CD Music 03", CC-BY-4.0 — PHẢI ghi công tác giả), bản cắt gọn
  // assets/cd3d/model/hop-cd-mfb64.glb: chỉ một hộp, đã bỏ mọi ảnh bìa nhúng
  // (bìa album của nghệ sĩ khác). Cùng vật liệu / ảnh / trạng thái mở.
  kieu: 'tuDung',
  gocModel: 0, // độ — tinh chỉnh góc ĐÓNG của nắp model (model gốc để nắp hé)
  // ---- kích thước (mm)
  rong: 142,
  cao: 125,
  day: 10.4, // bề dày cả hộp khi đóng
  voDay: 1.2, // bề dày thành nhựa
  bo: 1.2, // bo góc tấm
  // Khung viền ĐÚC bo tròn (trang tham khảo: mép nhựa là khung dày bo như ống,
  // bắt vệt sáng tương phản — đọc rõ khối dù trong suốt).
  vienDe: 2.4, // mm — bề ngang khung viền của đế
  vienNap: 2, // mm — bề ngang khung viền của nắp
  boMep: 0.7, // mm — độ bo tròn mép khung (bevel)
  khayRay: true, // khung ray bên trong khay + thanh giằng nối với khung ngoài
  goTam: true, // gờ tròn đồng tâm ở vùng kẹp giữa đĩa
  // Bóng đổ mềm xuống mặt nền (hộp như nằm trên bàn, nhìn từ trên)
  bong: true,
  bongDo: 0.35,
  bongLech: 6, // mm — lệch xuống-phải
  bongMem: 0.6, // 0..1 — độ nhoè
  // ---- trạng thái
  mo: 0, // 0 đóng → 1 mở hết
  gocMo: 115, // độ — nắp mở tối đa
  diaNhac: 0, // 0..1 — đĩa nhấc khỏi khay
  diaXoay: 0, // độ
  // ---- nhựa trong
  trong: 1, // transmission 0..1
  nham: 0.05, // roughness
  ior: 1.49, // polystyrene / acrylic
  khucXa: 1.6, // độ dày khúc xạ (mm)
  mauNhua: '#f2f5f6',
  mauVien: '#d4e6df', // màu ánh lên ở mép dày (attenuation)
  khoangVien: 45, // mm — ánh màu đậm dần theo độ dày đi qua
  phanChieu: 1, // độ mạnh phản chiếu môi trường của nhựa
  // Mép / gờ nhựa (thành dày) hơi đục và bắt sáng mạnh hơn mặt phẳng — ở ảnh
  // tham chiếu chúng hiện thành những đường xám sáng; để trong như mặt phẳng
  // thì hộp gần như vô hình trên nền tối.
  mepDuc: 0.5, // 0 = trong như mặt phẳng, 1 = mép đục hẳn
  // ---- khay
  khayKieu: 'trong', // trong | den | khoi
  // ---- đĩa
  hienDia: true,
  // Trong hộp, mặt nhìn thấy là mặt NHÃN (in bạc), không phải mặt gương dữ liệu.
  diaKimLoai: 0.85,
  diaNham: 0.32,
  diaCauVong: 1, // iridescence 0..1
  mauDia: '#d6dade',
  // ---- ảnh (đường dẫn tương đối gốc site — người dùng sẽ tự làm graphic;
  // tạm thời lấy ảnh CỦA KAIXA có sẵn trong portfolio, người dùng: "tự lấy ảnh
  // trong portfolio thay tạm vào")
  anhBia: 'assets/home/rectangle2851.webp', // poster THE ALBUM / VIET.DUNG
  anhLung: 'assets/media/ld/Avt.webp', // ảnh của Kaixa, gần như không màu — lưng hộp nhìn xuyên khay trong (ảnh tông hồng làm cả hộp ám hồng)
  anhDia: 'assets/img/disc-right.webp', // đĩa The Visual Chaser
  // Ảnh DÁN ngoài mặt nắp (người dùng: "thêm cả lớp ảnh dán lên vỏ đĩa — có
  // nhận ảnh png"): PNG trong suốt kiểu sticker, nằm TRÊN nhựa. Giữ tỉ lệ ảnh
  // (contain trong mặt nắp, không cắt), cỡ / chỗ / góc / độ đục chỉnh được.
  anhDan: '',
  danCo: 1, // cỡ — 1 = vừa kín mặt nắp theo tỉ lệ ảnh
  danX: 0, // lệch ngang (× bề rộng mặt nắp, −0.5…0.5)
  danY: 0, // lệch dọc (× chiều cao mặt nắp)
  danXoay: 0, // độ
  danMo: 1, // độ đục
  danBong: 0.45, // độ nhám bề mặt ảnh dán (thấp = bóng như decal)
  // NỨT VỠ mặt nắp (người dùng: "tạo thêm 2-3 preset làm cho vỏ đĩa bị nứt
  // vỡ"): vết nứt sinh theo thủ tục (canvas, hạt ngẫu nhiên cố định) — không
  // ảnh ngoài. 'khong' / 'goc' (va ở góc) / 'nhen' (mạng nhện) / 'ran' (rạn dài).
  nut: 'khong',
  nutX: 0.38, // điểm va, × bề rộng mặt nắp tính từ tâm (−0.5…0.5)
  nutY: 0.36, // điểm va, × chiều cao (dương = lên trên)
  nutDam: 0.6, // mật độ vết
  nutSang: 1, // độ sáng vết (nhựa vỡ bắt sáng thành đường trắng)
  nutHat: 1, // hạt ngẫu nhiên — đổi là ra vết khác
  // BỀ MẶT SẦN mặt trước (người dùng: "thêm preset bề mặt vỏ đĩa có pattern
  // sần … 3-4 loại", "mặt trước thôi"): normal map sinh theo thủ tục, CHỈ trên
  // mặt ngoài của nắp. 'khong' / 'cat' (sần cát) / 'kimCuong' (khía kim
  // cương) / 'gan' (gân sọc) / 'bi' (chấm nổi).
  be: 'khong',
  beCo: 2.5, // cỡ một ô vân (mm)
  beSau: 0.4, // độ nổi
  beGoc: 0, // xoay vân (độ)
  beMo: 0.4, // độ MỜ chỗ lõm — nhựa sần thật dễ thấy vì lõm mờ, nổi trong
}

const MM = 0.1 // mm → đơn vị scene

// Mẫu GLB nạp MỘT lần cho mọi hộp (theo url).
const MAU = {}
function napMau(GLTFLoader, url) {
  if (!MAU[url]) MAU[url] = new GLTFLoader().loadAsync(url).then((g) => g.scene)
  return MAU[url]
}

/* opts: { GLTFLoader, modelUrl, onDoi } — GLTFLoader cần cho style 'model'
 * (three/addons/loaders/GLTFLoader.js); onDoi() gọi khi model nạp xong để nơi
 * dùng vẽ lại. */
export function taoHopCD(THREE, dau = {}, opts = {}) {
  const P = Object.assign({}, MAC_DINH, dau)
  const modelUrl = opts.modelUrl || 'assets/cd3d/model/hop-cd-mfb64.glb'
  const nhom = new THREE.Group()
  nhom.name = 'hop-cd'
  nhom.scale.setScalar(MM)

  // ------------------------------------------------------------ vật liệu
  const VL = {
    nhua: new THREE.MeshPhysicalMaterial({ metalness: 0, clearcoat: 1, clearcoatRoughness: 0.03, specularIntensity: 1 }),
    // Mặt NGOÀI nắp: chép y `nhua` mỗi lần cập nhật, cộng normal map vân sần.
    nhuaTruoc: new THREE.MeshPhysicalMaterial(),
    mep: new THREE.MeshPhysicalMaterial({ metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05, specularIntensity: 1 }),
    khay: new THREE.MeshPhysicalMaterial({ metalness: 0, clearcoat: 0.6 }),
    dia: new THREE.MeshPhysicalMaterial({ clearcoat: 1, clearcoatRoughness: 0.08, iridescenceIOR: 1.6, iridescenceThicknessRange: [160, 820] }),
    kep: new THREE.MeshPhysicalMaterial({ metalness: 0, roughness: 0.12, transmission: 1, ior: 1.58, thickness: 1.2, color: 0xf4f6f7 }),
    nhan: new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0 }),
    // Tờ bìa: ảnh CHỈ ở mặt trước — mở nắp ra nhìn từ phía sau mà dùng
    // DoubleSide là thấy ảnh bìa soi gương (chữ ngược). Mặt sau = trang trong.
    bia: new THREE.MeshStandardMaterial({ roughness: 0.7, metalness: 0, side: THREE.FrontSide }),
    biaSau: new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0, color: 0xdcdcdc }),
    biaModel: new THREE.MeshStandardMaterial({ roughness: 0.7, metalness: 0, side: THREE.DoubleSide }),
    lung: new THREE.MeshStandardMaterial({ roughness: 0.7, metalness: 0, side: THREE.DoubleSide }),
    bong: new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, depthWrite: false }),
    // Ảnh dán: trong suốt theo alpha của PNG, không ghi depth (nằm sát mặt
    // nhựa, ghi depth là z-fighting), lệch polygon về phía người xem.
    dan: new THREE.MeshStandardMaterial({ metalness: 0, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    // Vết nứt: đường trắng trong suốt + tự sáng nhẹ (trên nền tối vẫn đọc ra),
    // nằm DƯỚI ảnh dán (vết ở trong nhựa, ảnh dán ở trên mặt).
    nut: new THREE.MeshStandardMaterial({ metalness: 0, roughness: 0.2, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1, emissive: 0xffffff }),
  }
  // Bóng: chữ nhật bo góc nhoè (canvas), vẽ lại khi đổi độ nhoè
  let bongMemCu = -1
  function veBong() {
    if (bongMemCu === P.bongMem) return
    bongMemCu = P.bongMem
    const c = document.createElement('canvas')
    c.width = c.height = 256
    const g = c.getContext('2d')
    const m = Math.max(0.05, Math.min(1, P.bongMem))
    // Mặt nạ đọc từ KÊNH MÀU (không phải alpha của canvas): nền phải ĐEN đặc,
    // khối trắng nhoè. Để nền trong suốt thì RGB trắng khắp nơi → cả tấm đặc.
    g.fillStyle = '#000'
    g.fillRect(0, 0, 256, 256)
    g.filter = 'blur(' + Math.round(6 + 34 * m) + 'px)'
    g.fillStyle = '#fff'
    const pad = 256 * (1 - 1 / 1.5) / 2
    g.beginPath()
    if (g.roundRect) g.roundRect(pad, pad, 256 - pad * 2, 256 - pad * 2, 8)
    else g.rect(pad, pad, 256 - pad * 2, 256 - pad * 2)
    g.fill()
    if (VL.bong.alphaMap) VL.bong.alphaMap.dispose()
    VL.bong.alphaMap = new THREE.CanvasTexture(c)
    VL.bong.needsUpdate = true
  }
  const loader = new THREE.TextureLoader()
  const anh = { bia: null, lung: null, dia: null, dan: null } // { url, tex }

  /* Độ dày khúc xạ của three.js NHÂN với độ phóng của vật. Hộp tự dựng ở
   * × 0.1 (mm → đơn vị cảnh), model GLB ở × 100 (m → mm × 0.1) — gấp 1000
   * lần, nên với model phải chia lại, không thì nắp nhựa thành thấu kính dày
   * cả mét: tờ bìa sau nó bị đẩy lệch, phóng to, nhuốm xanh (người dùng:
   * "sao không thấy bìa bên ngoài mà lại phản chiếu gương"). */
  const heDay = () => (P.kieu === 'model' && opts.GLTFLoader ? 0.001 : 1)

  // ---- BỀ MẶT SẦN ----------------------------------------------------
  /* Normal map LẶP (tile 512², mép khớp nhau) từ một trường độ cao h(u,v) ∈
   * [0,1] của từng kiểu vân; pháp tuyến = −gradient (sai phân trung tâm, có
   * quấn mép). Hộp tự dựng và model đều có UV tính bằng MM trên mặt trước
   * (xem `tachMatTruoc`), nên `repeat = 1 / beCo` là ô vân đúng beCo mm. Gán
   * cả `clearcoatNormalMap` — lớp clearcoat phẳng sẽ phản chiếu che mất vân. */
  const beTex = {}
  function taoBe(kieu) {
    if (beTex[kieu]) return beTex[kieu]
    const N = 512
    const H = new Float32Array(N * N)
    let a = 2166136261 >>> 0
    const R = () => {
      a = (a + 0x6d2b79f5) | 0
      let t = Math.imul(a ^ (a >>> 15), 1 | a)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
    // nhiễu giá trị LẶP chu kỳ g ô
    const nhieu = (g) => {
      const o = new Float32Array(g * g)
      for (let i = 0; i < o.length; i++) o[i] = R()
      return (u, v) => {
        const x = u * g
        const y = v * g
        const x0 = Math.floor(x)
        const y0 = Math.floor(y)
        const fx = x - x0
        const fy = y - y0
        const sx = fx * fx * (3 - 2 * fx)
        const sy = fy * fy * (3 - 2 * fy)
        const q = (i, j) => o[(((j % g) + g) % g) * g + (((i % g) + g) % g)]
        const t = q(x0, y0) + (q(x0 + 1, y0) - q(x0, y0)) * sx
        const b = q(x0, y0 + 1) + (q(x0 + 1, y0 + 1) - q(x0, y0 + 1)) * sx
        return t + (b - t) * sy
      }
    }
    const fr = (x) => x - Math.floor(x)
    let h
    if (kieu === 'cat') {
      const n1 = nhieu(24)
      const n2 = nhieu(48)
      const n3 = nhieu(96)
      h = (u, v) => n1(u, v) * 0.5 + n2(u, v) * 0.3 + n3(u, v) * 0.2
    } else if (kieu === 'kimCuong') {
      // hai chóp kim cương mỗi ô — khía chéo như tay cầm dụng cụ
      h = (u, v) => 1 - (Math.abs(fr(u + v) - 0.5) + Math.abs(fr(u - v) - 0.5))
    } else if (kieu === 'gan') {
      // hai gân sọc dọc mỗi ô, đỉnh bo tròn, rãnh hẹp
      h = (u) => Math.pow(0.5 + 0.5 * Math.cos(fr(u * 2) * Math.PI * 2), 0.6)
    } else {
      // chấm nổi: lưới so le (2 hàng / ô) — mỗi chấm là một chỏm cầu
      const cham = [[0.25, 0.25], [0.75, 0.25], [0, 0.75], [0.5, 0.75], [1, 0.75], [0.25, 1.25], [0.75, 1.25], [0.25, -0.75 + 1], [0, -0.25], [0.5, -0.25], [1, -0.25]]
      const r = 0.2
      h = (u, v) => {
        let m = 0
        for (const c of cham) {
          const d2 = (u - c[0]) * (u - c[0]) + (v - c[1]) * (v - c[1])
          if (d2 < r * r) m = Math.max(m, Math.sqrt(r * r - d2) / r)
        }
        return m
      }
    }
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) H[j * N + i] = h(i / N, 1 - j / N)
    const c = document.createElement('canvas')
    c.width = c.height = N
    const g = c.getContext('2d')
    const im = g.createImageData(N, N)
    const k = 10 // độ dốc gốc — `beSau` (normalScale) nhân thêm
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        const hx = H[j * N + ((i + 1) % N)] - H[j * N + ((i - 1 + N) % N)]
        const hy = H[((j - 1 + N) % N) * N + i] - H[((j + 1) % N) * N + i] // hàng trên = v lớn hơn
        let nx = -hx * k
        let ny = -hy * k
        const l = Math.hypot(nx, ny, 1)
        const o = (j * N + i) * 4
        im.data[o] = ((nx / l) * 0.5 + 0.5) * 255
        im.data[o + 1] = ((ny / l) * 0.5 + 0.5) * 255
        im.data[o + 2] = ((1 / l) * 0.5 + 0.5) * 255
        im.data[o + 3] = 255
      }
    }
    g.putImageData(im, 0, 0)
    // Bản đồ nhám (kênh G): lõm = mờ (1), đỉnh = trong (0.12) — qua lớp nhựa
    // nhìn thấy vân vì phần lõm làm nhoè ảnh phía sau.
    const c2 = document.createElement('canvas')
    c2.width = c2.height = N
    const g2 = c2.getContext('2d')
    const im2 = g2.createImageData(N, N)
    let hMin = 1e9
    let hMax = -1e9
    for (let i = 0; i < H.length; i++) {
      if (H[i] < hMin) hMin = H[i]
      if (H[i] > hMax) hMax = H[i]
    }
    for (let i = 0; i < H.length; i++) {
      const t = (H[i] - hMin) / Math.max(1e-6, hMax - hMin)
      const v = Math.round((0.12 + 0.88 * (1 - t)) * 255)
      im2.data[i * 4] = im2.data[i * 4 + 1] = im2.data[i * 4 + 2] = v
      im2.data[i * 4 + 3] = 255
    }
    g2.putImageData(im2, 0, 0)
    const lam = (cv) => {
      const t = new THREE.CanvasTexture(cv)
      t.colorSpace = THREE.NoColorSpace
      t.wrapS = t.wrapT = THREE.RepeatWrapping
      t.anisotropy = 8
      return t
    }
    beTex[kieu] = { n: lam(c), r: lam(c2) }
    return beTex[kieu]
  }
  function datBe() {
    const m = VL.nhuaTruoc
    m.copy(VL.nhua)
    const co = P.be && P.be !== 'khong'
    if (co) {
      const t = taoBe(P.be)
      const lap = 1 / Math.max(0.2, P.beCo)
      for (const x of [t.n, t.r]) {
        x.repeat.set(lap, lap)
        x.rotation = THREE.MathUtils.degToRad(P.beGoc)
      }
      m.normalMap = t.n
      m.normalScale.set(P.beSau, P.beSau)
      m.clearcoatNormalMap = t.n
      m.clearcoatNormalScale.set(P.beSau, P.beSau)
      if (P.beMo > 0) {
        m.roughnessMap = t.r
        m.roughness = Math.min(1, Math.max(P.nham, P.beMo))
      } else m.roughnessMap = null
    } else {
      m.normalMap = null
      m.clearcoatNormalMap = null
      m.roughnessMap = null
    }
    m.needsUpdate = true
  }
  /* Tách các tam giác của MẶT NGOÀI (pháp tuyến ≈ trục `truc` dương, sau phép
   * biến đổi M) thành nhóm vật liệu 0, phần còn lại nhóm 1 — gán mesh
   * material = [nhuaTruoc, nhua] là vân chỉ nằm trên mặt trước. `uvMm` ghi
   * UV phẳng theo MM (model: UV gốc là bản trải không rõ bố cục). */
  function tachMatTruoc(geo, M, truc, uvMm) {
    const pos = geo.attributes.position
    const nor = geo.attributes.normal
    if (!geo.index) {
      const id = new Uint32Array(pos.count)
      for (let i = 0; i < id.length; i++) id[i] = i
      geo.setIndex(new THREE.BufferAttribute(id, 1))
    }
    const idx = geo.index.array
    const nm = new THREE.Matrix3().getNormalMatrix(M)
    const v = new THREE.Vector3()
    const truoc = []
    const con = []
    for (let f = 0; f < idx.length; f += 3) {
      let s = 0
      for (let k = 0; k < 3; k++) {
        v.fromBufferAttribute(nor, idx[f + k]).applyMatrix3(nm).normalize()
        s += truc === 'y' ? v.y : v.z
      }
      ;(s / 3 > 0.9 ? truoc : con).push(idx[f], idx[f + 1], idx[f + 2])
    }
    const moi = truoc.concat(con)
    geo.setIndex(moi)
    geo.clearGroups()
    geo.addGroup(0, truoc.length, 0)
    geo.addGroup(truoc.length, con.length, 1)
    if (uvMm) {
      const uv = new Float32Array(pos.count * 2)
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i).applyMatrix4(M)
        uv[i * 2] = v.x * 1000
        uv[i * 2 + 1] = -v.z * 1000
      }
      geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
    }
  }

  function capNhatVatLieu() {
    const hd = heDay()
    const n = VL.nhua
    n.color.set(P.mauNhua)
    n.transmission = P.trong
    n.roughness = P.nham
    n.ior = P.ior
    n.thickness = P.khucXa * hd
    n.attenuationColor.set(P.mauVien)
    n.attenuationDistance = Math.max(1, P.khoangVien)
    n.envMapIntensity = P.phanChieu
    n.needsUpdate = true
    datBe()

    const m = VL.mep
    const du = Math.max(0, Math.min(1, P.mepDuc))
    m.color.set(P.mauNhua)
    m.transmission = P.trong * (1 - 0.6 * du)
    m.roughness = Math.min(1, P.nham + 0.35 * du)
    m.ior = P.ior
    m.thickness = P.khucXa * 2.5 * hd
    m.attenuationColor.set(P.mauVien)
    m.attenuationDistance = Math.max(1, P.khoangVien * 0.5)
    m.envMapIntensity = P.phanChieu * (1 + 0.8 * du)
    m.needsUpdate = true

    const k = VL.khay
    if (P.khayKieu === 'den') {
      k.color.set('#0c0c0d')
      k.transmission = 0
      k.roughness = 0.32
    } else if (P.khayKieu === 'khoi') {
      k.color.set('#5a5d60')
      k.transmission = 0.85
      k.roughness = 0.12
      k.thickness = 2 * hd
      k.ior = 1.49
    } else {
      k.color.set(P.mauNhua)
      k.transmission = P.trong
      k.roughness = Math.min(1, P.nham + 0.04)
      k.thickness = 2 * hd
      k.ior = P.ior
    }
    k.envMapIntensity = P.phanChieu
    k.needsUpdate = true

    veBong()
    VL.bong.opacity = P.bongDo

    const d = VL.dia
    d.color.set(P.mauDia)
    d.metalness = P.diaKimLoai
    d.roughness = P.diaNham
    d.iridescence = P.diaCauVong
    d.needsUpdate = true
  }

  // ------------------------------------------------------------ hình
  function hinhBo(w, h, r) {
    const s = new THREE.Shape()
    const x = -w / 2
    const y = -h / 2
    r = Math.min(r, w / 2, h / 2)
    s.moveTo(x + r, y)
    s.lineTo(x + w - r, y)
    s.quadraticCurveTo(x + w, y, x + w, y + r)
    s.lineTo(x + w, y + h - r)
    s.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    s.lineTo(x + r, y + h)
    s.quadraticCurveTo(x, y + h, x, y + h - r)
    s.lineTo(x, y + r)
    s.quadraticCurveTo(x, y, x + r, y)
    return s
  }
  // Tấm bo góc dày `d`, tâm ở giữa bề dày (vát nhẹ cho mép bắt sáng).
  function tam(w, h, d, r, vl) {
    const vat = Math.min(0.35, d * 0.3)
    const g = new THREE.ExtrudeGeometry(hinhBo(w - vat * 2, h - vat * 2, Math.max(0.1, r - vat)), {
      depth: Math.max(0.01, d - vat * 2), bevelEnabled: true, bevelThickness: vat, bevelSize: vat, bevelSegments: 2, curveSegments: 6,
    })
    g.translate(0, 0, -(d - vat * 2) / 2)
    return new THREE.Mesh(g, vl)
  }
  // Khung viền: hình chữ nhật bo góc khoét lõi, đùn dày `d`, mép bo `bm`.
  function khungVien(w, h, r, be, d, bm, vl) {
    bm = Math.max(0.05, Math.min(bm, be * 0.45, d * 0.45))
    const ngoai = hinhBo(w - bm * 2, h - bm * 2, Math.max(0.1, r - bm))
    const lo = hinhBo(w - be * 2 + bm * 2, h - be * 2 + bm * 2, Math.max(0.1, r - be + bm))
    const path = new THREE.Path(lo.getPoints(24).reverse())
    ngoai.holes.push(path)
    const g = new THREE.ExtrudeGeometry(ngoai, {
      depth: Math.max(0.01, d - bm * 2), bevelEnabled: true, bevelThickness: bm, bevelSize: bm, bevelSegments: 3, curveSegments: 8,
    })
    g.translate(0, 0, -(d - bm * 2) / 2)
    return new THREE.Mesh(g, vl)
  }
  function khoi(w, h, d, vl) {
    return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), vl)
  }
  function vanh(rNgoai, rTrong, d, vl, seg = 96) {
    const s = new THREE.Shape()
    s.absarc(0, 0, rNgoai, 0, Math.PI * 2, false)
    const lo = new THREE.Path()
    lo.absarc(0, 0, rTrong, 0, Math.PI * 2, true)
    s.holes.push(lo)
    const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false, curveSegments: seg })
    g.translate(0, 0, -d / 2)
    return new THREE.Mesh(g, vl)
  }

  let nap = null // nhóm nắp (gốc ở bản lề)
  let diaNhom = null
  let mBia = null
  let mLung = null
  let mNhan = null
  let mBong = null
  /* Ảnh dán: `danGoc` = tâm mặt ngoài nắp (gắn vào nắp, mặt phẳng XY của
   * nó trùng mặt nắp), `mDan` = tấm 1×1 con của nó — cỡ / lệch / xoay đặt
   * bằng scale / position / rotation.z theo `danO` (cỡ mặt nắp). */
  let mDan = null
  let mNut = null // vết nứt: tấm phủ kín mặt nắp, cùng gốc với ảnh dán
  const danO = { w: 1, h: 1 }
  function dungDan(cha, x, y, z, rx, w, h) {
    const goc = new THREE.Group()
    goc.position.set(x, y, z)
    goc.rotation.x = rx
    mNut = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), VL.nut)
    mNut.scale.set(w, h, 1)
    mNut.renderOrder = 1
    goc.add(mNut)
    mDan = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), VL.dan)
    mDan.renderOrder = 2
    goc.add(mDan)
    cha.add(goc)
    danO.w = w
    danO.h = h
    return goc
  }
  let laModel = false
  let napGoc0 = 0 // model: góc quay đóng nắp (rad, quanh trục z của khung model)
  let diaY0 = 0 // model: độ cao đĩa (m, khung model)

  /* ---- STYLE MODEL ----------------------------------------------------
   * Model nằm PHẲNG (Y lên, đơn vị mét), nắp `top` hé ~30° quanh bản lề mép
   * trái (trục Z). Dựng trong khung đó, rồi cả khung quay +90° quanh X (Y →
   * Z: mặt nắp hướng về người xem, bản lề thành trục dọc như hộp tự dựng) và
   * phóng 1000 (m → mm; nhóm ngoài × 0.1). */
  let luotModel = 0
  function dungModel() {
    const luot = ++luotModel
    laModel = true
    napMau(opts.GLTFLoader, modelUrl).then((goc) => {
      if (luot !== luotModel || P.kieu !== 'model') return
      const khung = new THREE.Group()
      const ban = goc.clone(true)
      khung.add(ban)
      khung.updateMatrixWorld(true)
      const theo = {}
      ban.traverse((o) => {
        if (!o.isMesh) return
        const ten = o.material && o.material.name
        theo[o.parent.name] = o.parent
        if (ten === 'Plastic_transparent') o.material = VL.nhua
        else if (ten === 'plastic_black') o.material = VL.khay
        else if (ten === 'CD_surface') o.material = VL.dia
        else if (/^cover_cd/.test(ten)) {
          o.material = VL.nhan
          mNhan = o
        } else if (/^cover_front/.test(ten)) {
          o.material = VL.biaModel // model: một tấm, giữ hai mặt như bản gốc
          mBia = o
        } else if (/^cover_back/.test(ten)) {
          o.material = VL.lung
          mLung = o
        }
      })
      const tim = (re) => Object.keys(theo).filter((k) => re.test(k)).map((k) => theo[k])
      const vo = tim(/^outer_case/)[0]
      const nap1 = tim(/^top/)[0]
      const bia = tim(/^cover_front/)[0]
      const cd = tim(/^cd/)[0]
      const hVo = new THREE.Box3().setFromObject(vo)
      const hNap = new THREE.Box3().setFromObject(nap1)
      // Bản lề: mép trái của vỏ, ngang nửa bề dày đế. Góc đang hé tính từ góc
      // xa nhất của nắp so với bản lề.
      const hx = hVo.min.x
      const hy = hVo.max.y * 0.5
      napGoc0 = -Math.atan2(hNap.max.y - hy, hNap.max.x - hx)
      nap = new THREE.Group()
      nap.position.set(hx, hy, 0)
      khung.add(nap)
      nap.updateMatrixWorld(true)
      nap.attach(nap1)
      if (bia) nap.attach(bia)
      // Ảnh dán: đo mặt ngoài nắp lúc ĐÓNG (trong khung model, Y = hướng nhìn
      // vào sau khi bọc quay +90° quanh X), đặt tấm nằm ngang ngay trên mặt
      // đó rồi gắn vào nắp — nắp mở thì ảnh dán đi theo.
      nap.rotation.z = napGoc0
      nap.updateMatrixWorld(true)
      const hDong = new THREE.Box3().setFromObject(nap1)
      const danGoc = dungDan(khung, (hDong.min.x + hDong.max.x) / 2, hDong.max.y + 0.00005, (hDong.min.z + hDong.max.z) / 2, -Math.PI / 2, hDong.max.x - hDong.min.x, hDong.max.z - hDong.min.z)
      danGoc.updateMatrixWorld(true)
      nap.attach(danGoc)
      // Mặt ngoài nắp → vật liệu có vân sần (đo lúc nắp ĐÓNG, trong khung model)
      const khungNgh = new THREE.Matrix4().copy(khung.matrixWorld).invert()
      nap1.traverse((o) => {
        if (!o.isMesh || o.material !== VL.nhua) return
        o.geometry = o.geometry.clone() // hình khối của bản nhân là CHUNG với mẫu
        o.userData.rieng = true
        tachMatTruoc(o.geometry, new THREE.Matrix4().multiplyMatrices(khungNgh, o.matrixWorld), 'y', true)
        o.material = [VL.nhuaTruoc, VL.nhua]
      })
      nap.rotation.z = 0
      if (cd) {
        const hCd = new THREE.Box3().setFromObject(cd)
        const c = hCd.getCenter(new THREE.Vector3())
        diaNhom = new THREE.Group()
        diaNhom.position.copy(c)
        diaY0 = c.y
        khung.add(diaNhom)
        diaNhom.updateMatrixWorld(true)
        diaNhom.attach(cd)
      }
      // Canh giữa theo vỏ, quay sang hệ của hộp tự dựng, đổi m → mm.
      const tam = hVo.getCenter(new THREE.Vector3())
      khung.position.set(-tam.x, -tam.y, -tam.z)
      const boc = new THREE.Group()
      boc.userData.mau = true
      boc.rotation.x = Math.PI / 2
      boc.scale.setScalar(1000)
      boc.add(khung)
      nhom.add(boc)
      // Bóng đổ sau lưng hộp
      if (P.bong) {
        const W = (hVo.max.x - hVo.min.x) * 1000
        const H = (hVo.max.z - hVo.min.z) * 1000
        mBong = new THREE.Mesh(new THREE.PlaneGeometry(W * 1.5, H * 1.5), VL.bong)
        mBong.position.set(P.bongLech, -P.bongLech, -((hVo.max.y - hVo.min.y) * 1000) / 2 - 0.6)
        mBong.userData.bong = true // bóng: không tính vào kích thước hộp
        nhom.add(mBong)
      }
      apAnh()
      datTrangThai()
      if (opts.onDoi) opts.onDoi()
    })
  }

  function huyCon(o) {
    o.traverse((c) => {
      if (c.geometry) c.geometry.dispose()
    })
  }

  function dung() {
    while (nhom.children.length) {
      const c = nhom.children[0]
      // Model nhân bản từ mẫu dùng CHUNG hình khối với mẫu đã nạp — giải
      // phóng là hỏng mẫu cho lần dựng sau.
      if (!c.userData.mau) huyCon(c)
      else c.traverse((o) => o.userData.rieng && o.geometry && o.geometry.dispose())
      nhom.remove(c)
    }
    nap = diaNhom = mBia = mLung = mNhan = mBong = mDan = mNut = null
    laModel = false
    if (P.kieu === 'model') {
      if (opts.GLTFLoader) return dungModel()
      console.warn('kx hop-cd: thiếu GLTFLoader — dùng hộp tự dựng')
    }
    const W = P.rong
    const H = P.cao
    const D = P.day
    const t = P.voDay
    const r = P.bo
    const zSau = -D / 2 // mặt sau hộp
    const zTruoc = D / 2 // mặt trước hộp (nắp đóng)

    // ---- ĐẾ
    const de = new THREE.Group()
    de.name = 'de'
    const lung = tam(W, H, t, r, VL.nhua)
    lung.position.z = zSau + t / 2
    de.add(lung)
    const goCao = D * 0.55
    const khungDe = khungVien(W, H, r + 0.6, P.vienDe, goCao, P.boMep, VL.mep)
    khungDe.position.z = zSau + goCao / 2
    de.add(khungDe)
    nhom.add(de)

    // ---- LƯNG HỘP (ảnh) — nằm giữa tấm lưng và khay, nhìn xuyên nhựa
    mLung = new THREE.Mesh(new THREE.PlaneGeometry(W - 6, H - 5), VL.lung)
    mLung.position.set(1, 0, zSau + t + 0.15)
    nhom.add(mLung)

    // ---- KHAY + CHỐT GIỮ ĐĨA
    const khay = new THREE.Group()
    khay.name = 'khay'
    const zKhay = zSau + t + 1.6
    const tamKhay = tam(W - 7, H - 4.5, 1.4, 1.5, VL.khay)
    tamKhay.position.set(1.5, 0, zKhay)
    khay.add(tamKhay)
    if (P.khayRay) {
      // Khung ray trong khay + thanh giằng nối với khung ngoài (góc + giữa cạnh)
      const lx = 1.5
      const rw = W - 7 - 8
      const rh = H - 4.5 - 8
      const ray = khungVien(rw, rh, 3, 1.6, 2.4, Math.min(0.5, P.boMep), VL.mep)
      ray.position.set(lx, 0, zKhay + 0.7 + 1.2)
      khay.add(ray)
      const ngX = W / 2 - P.vienDe
      const ngY = H / 2 - P.vienDe
      const trX = rw / 2
      const trY = rh / 2
      const giang = (x0, y0, x1, y1) => {
        const dx = x1 - x0
        const dy = y1 - y0
        const l = Math.hypot(dx, dy)
        const b = khoi(l, 1.4, 1.6, VL.mep)
        b.position.set((x0 + x1) / 2, (y0 + y1) / 2, zKhay + 1.6)
        b.rotation.z = Math.atan2(dy, dx)
        khay.add(b)
      }
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) giang(sx * ngX, sy * ngY, lx + sx * (trX - 2), sy * (trY - 2)) // góc
      for (const sy of [-1, 1]) giang(lx, sy * ngY, lx, sy * trY) // giữa cạnh trên/dưới
      giang(W / 2 - P.vienDe, 0, lx + trX, 0) // giữa cạnh phải
    }
    const cxDia = 1.5 + (W - 7) / 2 - 62.5 // tâm đĩa lệch về mép phải như hộp thật
    const nen = vanh(12, 3, 1.2, VL.khay)
    nen.position.set(cxDia, 0, zKhay + 1.3)
    khay.add(nen)
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2
      const rang = khoi(2.4, 1.1, 3.2, VL.khay)
      rang.position.set(cxDia + Math.cos(a) * 7.1, Math.sin(a) * 7.1, zKhay + 2.9)
      rang.rotation.z = a
      khay.add(rang)
    }
    nhom.add(khay)

    // ---- ĐĨA (đường kính 120, lỗ 15; vùng kẹp trong 15–33 trong suốt)
    diaNhom = new THREE.Group()
    diaNhom.name = 'dia'
    const zDia = zKhay + 2.6
    diaNhom.position.set(cxDia, 0, zDia)
    const vDia = vanh(60, 16.5, 1.2, VL.dia, 128)
    diaNhom.add(vDia)
    const vKep = vanh(16.5, 7.5, 1.2, VL.kep, 64)
    diaNhom.add(vKep)
    if (P.goTam) {
      for (const rr of [9.5, 12, 14.6]) {
        const go = new THREE.Mesh(new THREE.TorusGeometry(rr, 0.32, 8, 96), VL.kep)
        go.position.z = 0.62
        diaNhom.add(go)
      }
    }
    // Nhãn mặt đĩa: chỉ hiện khi có ảnh (người dùng tự làm graphic).
    const gN = new THREE.RingGeometry(16.5, 59.6, 128, 1)
    // UV vòng theo toạ độ phẳng → ảnh vuông phủ cả mặt đĩa
    const uv = gN.attributes.uv
    const pos = gN.attributes.position
    for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / 120 + 0.5, pos.getY(i) / 120 + 0.5)
    mNhan = new THREE.Mesh(gN, VL.nhan)
    mNhan.position.z = 0.62
    diaNhom.add(mNhan)
    diaNhom.visible = P.hienDia
    nhom.add(diaNhom)

    // ---- NẮP — gốc nhóm ở bản lề (mép trái, gần mặt trước)
    nap = new THREE.Group()
    nap.name = 'nap'
    const bx = -W / 2 + 1.2
    const bz = zTruoc - 2.2
    nap.position.set(bx, 0, bz)
    const truoc = tam(W, H - 1, t, r, VL.nhua)
    tachMatTruoc(truoc.geometry, new THREE.Matrix4(), 'z', false) // UV của ExtrudeGeometry đã là mm (x, y)
    truoc.material = [VL.nhuaTruoc, VL.nhua]
    truoc.position.set(W / 2 - 1.2, 0, zTruoc - t / 2 - bz)
    nap.add(truoc)
    const goNap = D * 0.45
    const khungNap = khungVien(W, H - 1, r + 0.4, P.vienNap, goNap, P.boMep, VL.mep)
    khungNap.position.set(W / 2 - 1.2, 0, zTruoc - t - goNap / 2 - bz + 0.2)
    nap.add(khungNap)
    for (const s of [-1, 1]) {
      const vau = khoi(9, 3.2, 0.9, VL.mep) // vấu giữ tờ bìa
      vau.position.set(W - 1.2 - 8, s * (H / 2 - 9), zTruoc - t - 0.9 - bz)
      nap.add(vau)
      const num = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 7, 20), VL.mep) // núm bản lề
      num.position.set(0, s * (H / 2 - 5), 0)
      nap.add(num)
    }
    // Tờ bìa: 120 × 120, sát sau tấm nắp, giữa hai vấu
    mBia = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), VL.bia)
    mBia.position.set(W - 1.2 - 2 - 60, 0, zTruoc - t - 0.35 - bz)
    const biaSau = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), VL.biaSau) // trang trong
    biaSau.rotation.y = Math.PI
    biaSau.position.z = -0.05
    mBia.add(biaSau)
    nap.add(mBia)
    dungDan(nap, W / 2 - 1.2, 0, zTruoc + 0.03 - bz, 0, W, H - 1) // ảnh dán: sát mặt NGOÀI tấm nắp
    nhom.add(nap)

    // ---- BÓNG ĐỔ mềm xuống mặt nền (sau lưng hộp)
    if (P.bong) {
      mBong = new THREE.Mesh(new THREE.PlaneGeometry(W * 1.5, H * 1.5), VL.bong)
      mBong.position.set(P.bongLech, -P.bongLech, zSau - 0.6)
      mBong.userData.bong = true // bóng: không tính vào kích thước hộp
        nhom.add(mBong)
    } else mBong = null

    apAnh()
    datTrangThai()
  }

  /* Ảnh người dùng tải lên có tỉ lệ bất kỳ (bìa 1350×1092, lưng 4:3…) mà ô
   * thì cố định — gán thẳng là ảnh bị KÉO GIÃN (người dùng: "ảnh đang bị kéo
   * dãn à"). Cắt kiểu cover: giữ tỉ lệ, cắt đều phần thừa quanh tâm. Tỉ lệ ô
   * (rộng / cao) theo style: tự dựng — bìa 120×120, lưng (W−6)×(H−5), đĩa
   * vành tròn; model — bìa vuông, lưng phủ cả hai mép gáy (UV 0..1 trải
   * 0.139 m / 0.922 trên 0.12 m ≈ 1.256), đĩa vuông. */
  function tiLeO(k) {
    if (k === 'lung') return laModel ? 1.256 : (P.rong - 6) / (P.cao - 5)
    return 1
  }
  function catCover(tex, k) {
    const img = tex.image
    const iw = img && (img.naturalWidth || img.width)
    const ih = img && (img.naturalHeight || img.height)
    tex.repeat.set(1, 1)
    tex.offset.set(0, 0)
    if (!iw || !ih) return
    const ia = iw / ih
    const oa = tiLeO(k)
    if (ia > oa) {
      tex.repeat.x = oa / ia
      tex.offset.x = (1 - tex.repeat.x) / 2
    } else if (ia < oa) {
      tex.repeat.y = ia / oa
      tex.offset.y = (1 - tex.repeat.y) / 2
    }
  }

  function apAnh() {
    const gan = (k, mesh, vl) => {
      const a = anh[k]
      if (a && a.tex) catCover(a.tex, k)
      if (mesh) mesh.visible = laModel || !!(a && a.tex)
      if (!(a && a.tex) && vl.map) {
        vl.map = null
        vl.needsUpdate = true
      }
      if (a && a.tex && vl.map !== a.tex) {
        vl.map = a.tex
        vl.needsUpdate = true
      }
    }
    gan('bia', mBia, laModel ? VL.biaModel : VL.bia)
    gan('lung', mLung, VL.lung)
    gan('dia', mNhan, VL.nhan)
    const d = anh.dan
    if (VL.dan.map !== (d ? d.tex : null)) {
      VL.dan.map = d ? d.tex : null
      VL.dan.needsUpdate = true
    }
    datDan()
    datNut()
  }

  // ---- NỨT VỠ -------------------------------------------------------
  /* Vẽ vết nứt vào canvas (khung = mặt nắp). Ba kiểu:
   *  goc  — va ở một góc: ít tia toả vào trong, vùng vỡ vụn lớn quanh điểm va
   *  nhen — va giữa mặt: nhiều tia toả đều + các vòng nứt nối tia (mạng nhện)
   *  ran  — vài đường rạn dài chạy ngang qua mặt, rẽ nhánh, không có điểm va
   * Mỗi đường vẽ hai nét: quầng rộng mờ + lõi sáng, cộng một nét lệch xanh
   * nhạt (ánh khúc xạ ở mép vỡ). Một số "mảnh" giữa hai tia tô mờ cho có mặt
   * vỡ lệch sáng. Hạt ngẫu nhiên cố định nên cùng số là cùng vết. */
  let nutKhoa = ''
  function veNut(kieu, tl) {
    const cw = 2048
    const ch = Math.max(64, Math.round(cw / tl))
    const c = document.createElement('canvas')
    c.width = cw
    c.height = ch
    const g = c.getContext('2d')
    let a = (Math.round(P.nutHat) * 9973 + 7) >>> 0
    const R = () => {
      a = (a + 0x6d2b79f5) | 0
      let t = Math.imul(a ^ (a >>> 15), 1 | a)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
    const dam = Math.max(0, Math.min(1.5, P.nutDam))
    const ax = (0.5 + P.nutX) * cw
    const ay = (0.5 - P.nutY) * ch
    const duong = [] // { pts, cap }
    const ngoai = (x, y) => x < -20 || y < -20 || x > cw + 20 || y > ch + 20
    const tia = (x, y, goc, dai, buoc, ganh, cap) => {
      const pts = [[x, y]]
      let l = 0
      while (l < dai) {
        const b = buoc * (0.6 + R() * 0.8)
        goc += (R() - 0.5) * ganh
        x += Math.cos(goc) * b
        y += Math.sin(goc) * b
        l += b
        pts.push([x, y])
        if (ngoai(x, y)) break
        if (cap < 2 && R() < 0.045 * (0.5 + dam)) tia(x, y, goc + (R() < 0.5 ? -1 : 1) * (0.35 + R() * 0.6), (dai - l) * (0.25 + R() * 0.4), buoc * 0.8, ganh * 1.2, cap + 1)
      }
      duong.push({ pts, cap })
      return pts
    }
    // điểm trên tia ở khoảng cách r tính từ điểm va
    const taiR = (pts, r) => {
      for (let i = 1; i < pts.length; i++) {
        if (Math.hypot(pts[i][0] - ax, pts[i][1] - ay) >= r) return pts[i]
      }
      return null
    }
    const noi = (p, q, cap) => {
      const pts = [p]
      const n = 2 + Math.floor(R() * 2)
      for (let i = 1; i < n; i++) {
        const t = i / n
        pts.push([p[0] + (q[0] - p[0]) * t + (R() - 0.5) * 14, p[1] + (q[1] - p[1]) * t + (R() - 0.5) * 14])
      }
      pts.push(q)
      duong.push({ pts, cap })
    }
    const manh = [] // tam giác mặt vỡ
    if (kieu === 'nhen' || kieu === 'goc') {
      const laGoc = kieu === 'goc'
      const n = laGoc ? 7 + Math.round(5 * dam) : 12 + Math.round(9 * dam)
      const huong = Math.atan2(ch / 2 - ay, cw / 2 - ax) // vào giữa mặt
      const quat = laGoc ? 2.4 : Math.PI * 2
      const dai = Math.hypot(cw, ch) * (laGoc ? 0.75 : 0.55)
      const tias = []
      for (let i = 0; i < n; i++) {
        const goc = laGoc ? huong - quat / 2 + (quat * (i + 0.5)) / n + (R() - 0.5) * 0.25 : (Math.PI * 2 * i) / n + (R() - 0.5) * 0.3
        tias.push(tia(ax, ay, goc, dai * (0.45 + R() * 0.55), 34, 0.32, 0))
      }
      const vong = laGoc ? 2 + Math.round(dam) : 3 + Math.round(3 * dam)
      const rMax = Math.min(cw, ch) * (laGoc ? 0.42 : 0.4)
      for (let k = 0; k < vong; k++) {
        const r = (rMax * (k + 1)) / (vong + 0.5) * (0.85 + R() * 0.3)
        for (let i = 0; i < tias.length - (laGoc ? 1 : 0); i++) {
          const j = (i + 1) % tias.length
          if (R() > 0.72 - 0.1 * k / vong) continue
          const p = taiR(tias[i], r)
          const q = taiR(tias[j], r * (0.9 + R() * 0.2))
          if (p && q) {
            noi(p, q, 1)
            if (R() < 0.35) manh.push([[ax, ay], p, q])
          }
        }
      }
      // vùng vỡ vụn quanh điểm va
      const vun = (laGoc ? 0.07 : 0.035) * Math.min(cw, ch)
      for (let i = 0; i < 26 + 30 * dam; i++) {
        const goc = R() * Math.PI * 2
        const r = R() * vun
        tia(ax + Math.cos(goc) * r, ay + Math.sin(goc) * r, R() * Math.PI * 2, vun * (0.3 + R() * 0.6), 8, 0.9, 2)
      }
      g.fillStyle = 'rgba(255,255,255,' + 0.16 * P.nutSang + ')'
      g.beginPath()
      g.arc(ax, ay, vun * 0.45, 0, Math.PI * 2)
      g.fill()
    } else if (kieu === 'ran') {
      const n = 2 + Math.round(3 * dam)
      for (let i = 0; i < n; i++) {
        const canh = Math.floor(R() * 4)
        let x = canh === 0 ? 0 : canh === 1 ? cw : R() * cw
        let y = canh === 2 ? 0 : canh === 3 ? ch : R() * ch
        const goc = Math.atan2(ch * (0.3 + R() * 0.4) - y, cw * (0.3 + R() * 0.4) - x)
        tia(x, y, goc, Math.hypot(cw, ch) * (0.6 + R() * 0.5), 40, 0.16, 0)
      }
    }
    // mặt vỡ lệch sáng
    for (const t of manh) {
      g.fillStyle = 'rgba(255,255,255,' + (0.03 + R() * 0.07) * P.nutSang + ')'
      g.beginPath()
      g.moveTo(t[0][0], t[0][1])
      g.lineTo(t[1][0], t[1][1])
      g.lineTo(t[2][0], t[2][1])
      g.closePath()
      g.fill()
    }
    g.lineJoin = 'round'
    g.lineCap = 'round'
    const net = (pts, rong, mau, dx, dy) => {
      g.strokeStyle = mau
      g.lineWidth = rong
      g.beginPath()
      g.moveTo(pts[0][0] + dx, pts[0][1] + dy)
      for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0] + dx, pts[i][1] + dy)
      g.stroke()
    }
    const sg = Math.max(0, P.nutSang)
    for (const d of duong) {
      const k = d.cap === 0 ? 1 : d.cap === 1 ? 0.7 : 0.45
      net(d.pts, 9 * k, 'rgba(255,255,255,' + 0.07 * sg + ')', 0, 0)
      net(d.pts, 2.2 * k, 'rgba(190,215,255,' + 0.35 * sg + ')', 1.5, 1.2)
      net(d.pts, 1.6 * k, 'rgba(255,255,255,' + Math.min(1, 0.85 * sg) + ')', 0, 0)
    }
    return c
  }
  function datNut() {
    if (!mNut) return
    const co = P.nut && P.nut !== 'khong'
    mNut.visible = !!co
    if (!co) return
    mNut.scale.set(danO.w, danO.h, 1)
    const tl = danO.w / danO.h
    const khoa = [P.nut, P.nutX, P.nutY, P.nutDam, P.nutSang, P.nutHat, tl.toFixed(3)].join('|')
    if (khoa === nutKhoa && VL.nut.map) return
    nutKhoa = khoa
    const tex = new THREE.CanvasTexture(veNut(P.nut, tl))
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 8
    if (VL.nut.map) VL.nut.map.dispose()
    VL.nut.map = tex
    VL.nut.emissiveMap = tex
    VL.nut.emissiveIntensity = 0.35
    VL.nut.needsUpdate = true
  }

  // Cỡ / chỗ / góc / độ đục của ảnh dán — CONTAIN trong mặt nắp (sticker,
  // không cắt), giữ đúng tỉ lệ ảnh.
  function datDan() {
    if (!mDan) return
    const d = anh.dan
    const img = d && d.tex && d.tex.image
    const iw = img && (img.naturalWidth || img.width)
    const ih = img && (img.naturalHeight || img.height)
    mDan.visible = !!(iw && ih) && P.danMo > 0
    if (!mDan.visible) return
    const ia = iw / ih
    let w = danO.w
    let h = danO.w / ia
    if (h > danO.h) {
      h = danO.h
      w = danO.h * ia
    }
    const co = Math.max(0.01, P.danCo)
    mDan.scale.set(w * co, h * co, 1)
    mDan.position.set(P.danX * danO.w, P.danY * danO.h, 0)
    mDan.rotation.z = -THREE.MathUtils.degToRad(P.danXoay)
    VL.dan.opacity = Math.max(0, Math.min(1, P.danMo))
    VL.dan.roughness = P.danBong
  }

  /* Ảnh tải lên có thể rất to (mặt đĩa 3840×5174 ≈ 100 MB trên GPU cả
   * mipmap) — thu về cạnh dài MAX_TEX trước khi đưa lên GPU. */
  const MAX_TEX = 2048
  function thuNho(tex) {
    const img = tex.image
    const iw = img && (img.naturalWidth || img.width)
    const ih = img && (img.naturalHeight || img.height)
    if (!iw || !ih || Math.max(iw, ih) <= MAX_TEX) return
    const t = MAX_TEX / Math.max(iw, ih)
    const c = document.createElement('canvas')
    c.width = Math.round(iw * t)
    c.height = Math.round(ih * t)
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
    tex.image = c
  }

  function napAnh(k, url) {
    const cu = anh[k]
    if (cu && cu.url === url) return Promise.resolve()
    if (cu && cu.tex) cu.tex.dispose()
    anh[k] = null
    if (!url) {
      apAnh()
      return Promise.resolve()
    }
    return new Promise((ok) => {
      loader.load(
        url,
        (tex) => {
          thuNho(tex)
          tex.colorSpace = THREE.SRGBColorSpace
          tex.anisotropy = 8
          anh[k] = { url, tex }
          apAnh()
          ok()
        },
        undefined,
        () => ok()
      )
    })
  }

  function datTrangThai() {
    if (laModel) {
      const rad = THREE.MathUtils.degToRad
      if (nap) nap.rotation.z = napGoc0 + rad(P.gocModel) + rad(P.gocMo) * Math.max(0, Math.min(1, P.mo))
      if (diaNhom) {
        diaNhom.visible = P.hienDia
        diaNhom.position.y = diaY0 + Math.max(0, Math.min(1, P.diaNhac)) * (P.day + 30) / 1000
        diaNhom.rotation.y = -rad(P.diaXoay)
      }
      return
    }
    if (nap) nap.rotation.y = -THREE.MathUtils.degToRad(P.gocMo) * Math.max(0, Math.min(1, P.mo))
    if (diaNhom) {
      diaNhom.visible = P.hienDia
      const n = Math.max(0, Math.min(1, P.diaNhac))
      diaNhom.position.z = -P.day / 2 + P.voDay + 1.6 + 2.6 + n * (P.day + 30)
      diaNhom.rotation.z = THREE.MathUtils.degToRad(P.diaXoay)
    }
  }

  const KHOA_HINH = ['kieu', 'rong', 'cao', 'day', 'voDay', 'bo', 'vienDe', 'vienNap', 'boMep', 'khayRay', 'goTam', 'bong', 'bongLech']
  let hinhCu = KHOA_HINH.map((k) => P[k]).join('|')

  capNhatVatLieu()
  dung()

  return {
    nhom,
    P,
    // Áp lại toàn bộ tham số (kích thước đổi thì dựng lại hình).
    apDung(moi = {}) {
      Object.assign(P, moi)
      const h = KHOA_HINH.map((k) => P[k]).join('|')
      capNhatVatLieu()
      if (h !== hinhCu) {
        hinhCu = h
        dung()
      } else datTrangThai()
      datDan()
      datNut()
      return Promise.all([napAnh('bia', P.anhBia), napAnh('lung', P.anhLung), napAnh('dia', P.anhDia), napAnh('dan', P.anhDan)])
    },
    datMo(t) {
      P.mo = t
      datTrangThai()
    },
    // Chỉ tư thế (mo, gocMo, diaNhac, diaXoay, hienDia) — không đụng vật liệu,
    // dùng được mỗi khung khi chạy hoạt cảnh / bám cuộn.
    trangThai(moi = {}) {
      Object.assign(P, moi)
      datTrangThai()
    },
    huy() {
      huyCon(nhom)
      for (const v of Object.values(VL)) v.dispose()
      for (const a of Object.values(anh)) if (a && a.tex) a.tex.dispose()
    },
  }
}

/* Môi trường studio tự dựng (không cần HDRI), kiểu chụp sản phẩm: mặt hộp
 * quay về camera nên nó phản chiếu vùng PHÍA TRƯỚC — đèn chính phải ở đó
 * (bản đầu để softbox lệch, nhựa và đĩa phản chiếu toàn bóng tối). Cường độ
 * vượt 1 (HDR, PMREM lưu half-float) để đĩa kim loại bắt sáng. */
export function moiTruongStudio(THREE, renderer, doSang = 1, kieu = 'toi') {
  const sc = new THREE.Scene()
  const sang = kieu === 'sang'
  // Kiểu SÁNG (nền trắng như trang tham khảo): phòng sáng + các dải ĐEN tương
  // phản — nhựa trong trên nền sáng chỉ đọc được khối nhờ vệt tối/sáng xen kẽ.
  sc.background = new THREE.Color(sang ? 0xd9d9da : 0x0d0d0e)
  const s = Math.max(0, doSang)
  const tamSang = (w, h, x, y, z, manh) => {
    const c = new THREE.Color(1, 1, 1).multiplyScalar(manh * s)
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide }))
    m.position.set(x, y, z)
    m.lookAt(0, 0, 0)
    sc.add(m)
  }
  const tamToi = (w, h, x, y, z) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: 0x050505, side: THREE.DoubleSide }))
    m.position.set(x, y, z)
    m.lookAt(0, 0, 0)
    sc.add(m)
  }
  if (sang) {
    tamSang(70, 46, 0, 0, 24, 0.9)
    tamSang(30, 12, 0, 12, 16, 2.6)
    tamToi(5, 34, -14, 0, 16) // dải tối trái — vệt tối dọc mép
    tamToi(5, 34, 15, 0, 15) // dải tối phải
    tamToi(40, 4, 0, -12, 15) // dải tối dưới
    tamSang(30, 3, 0, 6, -16, 1.4)
    tamSang(70, 46, 0, 0, -26, 0.75) // phía SAU — xem lưng hộp / mặt ngoài nắp khi mở
  } else {
    tamSang(70, 46, 0, 0, 24, 0.55) // vùng sáng lớn trải cả phía trước — mặt phẳng (nhựa, đĩa) soi vào đây
    tamSang(34, 16, 0, 11, 16, 2.4) // softbox chính: trước, trên
    tamSang(7, 30, -18, 1, 11, 1.6) // dải trái trước
    tamSang(7, 30, 18, -1, 9, 0.9) // dải phải trước
    tamSang(30, 3, 0, 6, -16, 1.2) // dải viền sau, trên — bắt mép nhựa
    tamSang(3, 24, -17, 0, -10, 0.8) // dải viền sau, trái
    tamSang(44, 44, 0, -16, 0, 0.12) // phản sáng sàn
    /* Phía SAU: hộp mở 180° là mặt ngoài của nắp (tờ bìa thật) quay ra sau,
     * xoay ra sau xem thì chỉ còn hai dải viền — bìa và lưng tối om (người
     * dùng: "sao bên này tối om?"). Một vùng sáng lớn + softbox sau, xa hơn
     * hai dải viền nên không che chúng. */
    tamSang(70, 46, 0, 0, -26, 0.45)
    tamSang(34, 16, 0, 11, -20, 1.6)
  }
  const pm = new THREE.PMREMGenerator(renderer)
  const env = pm.fromScene(sc, 0.025).texture
  pm.dispose()
  sc.traverse((o) => {
    if (o.geometry) o.geometry.dispose()
    if (o.material) o.material.dispose()
  })
  return env
}
