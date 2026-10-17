/* =============================================================================
 * kaixa Portfolio — Ảnh dự án dạng SÓNG khi cuộn (trang Works)
 * -----------------------------------------------------------------------------
 * Mượn shader của "Wavy Accordion" (Osmo): mép ảnh CONG như sóng theo vận tốc
 * và kéo lệch một phần ảnh đi cùng.
 *
 * KHÔNG có phần accordion (ảnh này to ra, ảnh kia bé lại) — người dùng chốt bỏ.
 * Ảnh giữ ĐÚNG khung Figma. Thứ còn lại là sóng, và lực của nó là VẬN TỐC
 * CUỘN: cuộn là chuyển động dọc, nên mép TRÊN và mép DƯỚI của từng ảnh cong
 * lên/xuống như tấm vải bị kéo, phần ảnh sát mép bị kéo theo. Mép dưới lò xo
 * mềm hơn nên trễ một nhịp — tấm ảnh co giãn chứ không chỉ dời nguyên khối.
 * Dừng cuộn thì nảy một nhịp rồi lắng phẳng.
 *
 * KHÔNG three.js: bản gốc nạp three từ CDN, mà project này chỉ cho trang Home
 * nạp three (vendor sẵn). Shader chỉ cần một tam giác phủ khung — WebGL2 thuần.
 *
 * Mỗi HÀNG 2 ảnh dùng chung một canvas; hai ảnh trong hàng không cao bằng nhau
 * (547/456, 560/456) nên shader tính chiều cao riêng từng ảnh, neo đỉnh như
 * `items-start` của Figma. Canvas cao hơn hàng `pad` px mỗi đầu để mép có chỗ
 * phồng ra ngoài khung. Điểm neo dọc của ảnh lấy từ chính thẻ <img> (hai ảnh
 * Figma cắt neo-đỉnh, không neo-giữa).
 *
 * Kính lỏng bẻ CẢ dải dự án (chữ, số, đường kẻ, icon), không riêng ảnh — chữ
 * đi qua hai dải canvas cố định ở mép viewport, xem mục "DẢI KÍNH CHỮ".
 *
 * Bám theo `data-n` (node id Figma) — class sinh tự động đổi tên mỗi lần dựng.
 * File KHÔNG chứa UI setting; bảng chỉnh là kx-panel.js (phím H).
 * ========================================================================== */
(function () {
  'use strict'

  var CONFIG = {
    enabled: true,
    // Hàng ảnh của dự án 01 (node gốc) và bốn instance dự án 02–05. Id hàng
    // trong instance có dạng I<instance>;<node gốc>.
    rows: '325:6120,325:6108',
    instances: '325:6652,325:6735,325:6903,325:6986',
    // Khối có CHỮ đi qua kính, ngoài bốn instance: đầu trang (chữ WORKS) và dự
    // án 001. Phần tử position: fixed bên trong (đĩa, cột trái) bị bỏ qua.
    blocks: '325:6628,325:6651',

    // ---------------------------------------------------------------- SÓNG
    wave: true, // tắt = mép thẳng, ảnh đứng yên (kính vẫn chạy nếu bật)
    // false (mặc định) = cong CHUNG cả hàng: mép hai ảnh nối thành MỘT vòng cung
    // trải hết bề rộng hàng, như một tấm vải có khe. true = mỗi ảnh võng riêng
    // theo bề rộng của nó (kiểu ban đầu).
    bendPerImage: false,
    // Mép cong bao nhiêu px trên mỗi px cuộn/khung. Cuộn mượt của trang đi tới
    // ~70 px/khung ở nhát mạnh, nên hệ số phải nhỏ.
    bend: 1.5,
    maxBow: 114, // px css — trần độ cong, chặn cú nhảy cuộn xa (bấm link neo)
    bendStiffness: 300, // lò xo mép TRÊN
    bendDamping: 34, // thấp = rung lâu hơn trước khi lắng
    lagBottom: 0.55, // mép DƯỚI cứng bằng bấy nhiêu phần mép trên → trễ nhịp
    drag: 0.78, // bao nhiêu phần ảnh bị mép kéo theo
    dragReach: 110, // px css — vùng ảnh bị kéo, tắt dần ra xa mép

    /* ---------------------------------------------------------- KÍNH LỎNG
     * Thấu kính "liquid glass" (Osmo) đặt thành hai DẢI ở mép trên và mép dưới
     * VIEWPORT. Ảnh khúc xạ ngay trong shader vẽ ảnh; chữ / số / đường kẻ
     * khúc xạ ở hai dải canvas cố định riêng (xem "DẢI KÍNH CHỮ" ở dưới). Số
     * mặc định chép từ bản gốc; đơn vị khoảng cách đổi sang px css. */
    glass: true,
    // true = kính bẻ CẢ dải dự án (chữ, số, đường kẻ, icon) như bản gốc;
    // false = chỉ bẻ ảnh, chữ đi qua kính nguyên vẹn.
    glassText: true,
    glassTop: true, // dải kính mép trên
    glassBottom: true, // dải kính mép dưới
    glassBand: 0.03, // dải sâu bằng bấy nhiêu phần chiều cao viewport (ở giữa)
    // Độ VÁT: lực kính bắt đầu từ sâu hơn viền kính bấy nhiêu lần độ sâu dải.
    // 0 = lực dồn hết trong dải nên góc ảnh gập một cục; cao = góc chìa ra
    // được trải dài, vát tròn. Viền sáng vẫn nằm ở chỗ cũ.
    glassSoft: 3.05,
    // px cuộn để kính mọc đủ độ sâu. Màn đầu (chưa cuộn) không có kính; 0 = kính
    // có sẵn ngay từ đầu trang.
    glassIntro: 220,
    glassCurve: 1, // 0 = mép kính thẳng, 1 = nửa elip (giữa sâu, hai bên nông)
    glassSpan: 2.75, // bề ngang elip so với viewport; >1 thì hai góc vẫn còn kính
    // Độ phóng của kính; 0 = phẳng. Lực bằng 0 ở chỗ bắt đầu (xem glassSoft) và
    // mạnh dần tới MÉP viewport — ảnh vào kính liền mạch rồi càng sát mép càng
    // chìa dài ra (người dùng chốt, cả dải trên lẫn dải dưới).
    glassZoom: 1,
    // Ảnh tẽ NGANG ra hai bên bao nhiêu, tính trên độ phóng — toả ra từ trục
    // giữa hàng: ảnh trái chìa sang trái, ảnh phải sang phải, góc ngoài sát mép
    // viewport kéo xa nhất. 0 = chỉ kéo giãn về phía mép, không tẽ.
    glassSplay: 1,
    // px css — kính được kéo ẢNH tràn ra ngoài khung của nó bao xa. Canvas nhô ra
    // bấy nhiêu ở CẢ bốn phía: không có chỗ thì viền ảnh bị cắt thẳng ở mép hàng
    // dù shader đã bẻ cong nó (góc dưới-trái ảnh trái, dưới-phải ảnh phải).
    glassSpill: 300,
    glassDispersion: 30.5, // px — tách đỏ/lam ở sát viền
    glassRimWave: 1, // viền kính gợn ngang bao nhiêu
    glassWaveSpeed: 0.35, // gợn trôi nhanh bao nhiêu; 0 = đứng yên
    glassSamples: 10, // số mẫu tách màu (2..16) — núm hiệu năng
    glassColor: '#009dff', // vòng sáng và quầng của nó
    glassGlow: 1.7, // độ sáng vòng, viền, tâm (0..17)
    glassRing: 0.53, // vòng màu; 0 = bỏ
    glassRingRadius: 0.49, // 0.1 sát mép viewport, 0.49 sát viền kính
    glassRingWidth: 0.025, // cao = mềm và rộng hơn
    glassRimLine: 0.82, // đường viền trắng; 0 = bỏ
    glassNova: 0.1, // quầng trắng ở mép viewport (0..1)
    glassShimmer: true, // vòng sáng lấp lánh

    textureDetail: 1.25, // độ nét texture so với cỡ vẽ
    maxTex: 1024, // TRẦN cạnh texture (px thật) — xem mục bộ nhớ GPU trong CLAUDE.md
    textMax: 2048, // TRẦN cạnh texture chữ của mỗi khối (px thật) — chữ cần nét hơn ảnh
    maxDpr: 2,
    // TRẦN cạnh khung vẽ (px thật, sau khi nhân dpr). Nâng từ 1600 khi canvas
    // phải nhô ra để kính kéo ảnh tràn khung: canvas to thêm 2 x glassSpill mà
    // trần giữ nguyên thì độ nét ảnh tụt từ ~1.5 xuống 1.21 px thật mỗi px — ảnh
    // mờ rõ trên màn Retina. 2048 x ~1400 ≈ 11 MB mỗi hàng.
    maxPx: 2048,
    preload: '60%', // dựng GL sớm khi hàng còn cách màn hình bấy nhiêu
    maxLive: 5, // tối đa bấy nhiêu context WebGL sống cùng lúc (hàng thừa thì hiện ảnh tĩnh)
  }

  var S = CONFIG

  /* API lộ ra NGAY khi file chạy, trước cả boot: kx-panel.js nạp sau file này
   * và áp giá trị đã lưu vào `config` từ lúc đó — tức TRƯỚC khung hình đầu,
   * nên không có cú chớp "hiện mặc định rồi mới đổi". Phần còn lại gắn vào
   * trong boot(). */
  var api = (window.KX_WAVE_IMAGES = {
    config: S,
    defaults: Object.freeze(Object.assign({}, CONFIG)),
  })

  /* ------------------------------------------------------------- shader
   * Toạ độ tính bằng PX CSS của ô vẽ (gốc trên-trái). KHÔNG viết dấu huyền
   * trong hai khối này — chúng là template literal (luật số 4 của project). */
  var VERT = '#version 300 es\nin vec2 p;\nvoid main(){ gl_Position = vec4(p, 0.0, 1.0); }'

  var FRAG = [
    '#version 300 es',
    'precision highp float;',
    'uniform sampler2D uMap0, uMap1, uMap2, uMap3;',
    'uniform vec2 uSize[4];', // cỡ gốc của ảnh (chỉ lấy tỉ lệ)
    'uniform float uX0[4];', // mép trái từng ảnh (px trong hàng)
    'uniform float uX1[4];', // mép phải
    'uniform float uH[4];', // chiều cao từng ảnh
    'uniform float uAnchorY[4];', // neo dọc: 0 = đỉnh, 0.5 = giữa
    'uniform int uCount;',
    'uniform vec2 uRes;',
    'uniform float uDpr, uPad, uPadX, uRowW, uBowT, uBowB, uDrag, uDragReach, uPerImage;',
    // --- kính
    'uniform float uGlass, uTopOn, uBotOn;',
    'uniform vec2 uView;', // viewport, px css
    'uniform vec2 uRowView;', // góc trên-trái của HÀNG trong viewport
    'uniform float uBand, uSoft, uCurve, uSpan, uZoom, uSplay, uDisp, uRimWave, uWaveT, uTime;',
    'uniform float uGlow, uNova, uRing, uRingR, uRingW, uRimLine, uShimmer;',
    'uniform vec3 uRingCol;',
    'uniform int uSamples;',
    'out vec4 o;',
    'vec3 samp(int i, vec2 uv, vec2 gx, vec2 gy){',
    '  uv = clamp(uv, 0.0, 1.0);',
    '  if (i == 0) return textureGrad(uMap0, uv, gx, gy).rgb;',
    '  if (i == 1) return textureGrad(uMap1, uv, gx, gy).rgb;',
    '  if (i == 2) return textureGrad(uMap2, uv, gx, gy).rgb;',
    '  return textureGrad(uMap3, uv, gx, gy).rgb;',
    '}',
    // Màu + độ phủ của ẢNH tại một điểm p (toạ độ hàng, y = 0 ở đỉnh hàng),
    // đã gồm sóng. Kính gọi hàm này ở điểm đã bị bẻ để lấy mẫu khúc xạ.
    'vec4 anh(vec2 p){',
    '  int i = 0;',
    '  for (int k = 1; k < 4; k++) {',
    '    if (k >= uCount) break;',
    '    if (p.x >= 0.5 * (uX1[k - 1] + uX0[k])) i = k;',
    '  }',
    '  float x0 = uX0[i];',
    '  float x1 = uX1[i];',
    '  float h = uH[i];',
    // Mép phồng theo hình sin ngang bề rộng ảnh — CHỈ dời theo phương dọc.
    // Cong CHUNG cả hàng: hình sin trải từ mép trái tới mép phải của HÀNG.
    // Cong từng ảnh: hình sin trải trong bề rộng của riêng ảnh đó.
    '  float bx = uPerImage > 0.5 ? (p.x - x0) / max(x1 - x0, 1.0) : p.x / max(uRowW, 1.0);',
    '  float bulge = sin(clamp(bx, 0.0, 1.0) * 3.14159265);',
    '  float top = uBowT * bulge;',
    '  float bot = h + uBowB * bulge;',
    '  float pull = uBowT * exp(-abs(p.y - top) / uDragReach) + uBowB * exp(-abs(p.y - bot) / uDragReach);',
    '  float y = p.y - pull * bulge * uDrag;',
    '  vec2 sz = uSize[i];',
    '  float sc = max((x1 - x0) / sz.x, h / sz.y);',
    '  vec2 img = sz * sc;',
    '  float ix = (p.x - x0) + 0.5 * (img.x - (x1 - x0));',
    '  float iy = y + (img.y - h) * uAnchorY[i];',
    '  vec2 pp = 1.0 / img;',
    '  vec3 col = samp(i, vec2(ix, iy) / img, vec2(pp.x / uDpr, 0.0), vec2(0.0, pp.y / uDpr));',
    '  float sd = max(max(x0 - p.x, p.x - x1), max(top - p.y, p.y - bot));',
    '  return vec4(col, clamp(0.5 - sd * uDpr, 0.0, 1.0));',
    '}',
    'void main(){',
    // p: toạ độ HÀNG (0,0 ở góc trên-trái hàng); canvas nhô ra uPadX / uPad mỗi phía.
    '  vec2 p = vec2(gl_FragCoord.x, uRes.y * uDpr - gl_FragCoord.y) / uDpr - vec2(uPadX, uPad);',
    '  vec4 base = anh(p);',
    '  vec4 outc = vec4(base.rgb * base.a, base.a);', // premultiplied
    '  if (uGlass > 0.5) {',
    '    vec2 v = uRowView + p;', // điểm này trong VIEWPORT
    // Tâm thấu kính: GIỮA HÀNG, nằm đúng mép viewport (nửa kia khuất ngoài màn).
    // Tâm là một ĐIỂM nên lực phóng toả ra mọi hướng — hai ảnh tẽ ra hai bên.
    '    float cx = uRowView.x + 0.5 * uRowW;',
    '    float D = uBand * uView.y;', // độ sâu dải ở chính giữa
    '    float hx = max(0.5 * uView.x * uSpan, 1.0);', // bán trục ngang của elip
    '    float best = 1e9;',
    '    vec2 c = vec2(cx, 0.0);',
    '    vec2 e = vec2(0.0);',
    '    if (uTopOn > 0.5) {',
    '      vec2 et = vec2((v.x - cx) / hx, v.y / max(D, 1.0));',
    // uCurve trộn giữa dải phẳng (chỉ tính độ sâu) và elip trọn (khoảng cách elip).
    '      float n = mix(abs(et.y), length(et), uCurve);',
    '      if (n < best) { best = n; c = vec2(cx, 0.0); e = et; }',
    '    }',
    '    if (uBotOn > 0.5) {',
    '      vec2 eb = vec2((v.x - cx) / hx, (v.y - uView.y) / max(D, 1.0));',
    '      float n = mix(abs(eb.y), length(eb), uCurve);',
    '      if (n < best) { best = n; c = vec2(cx, uView.y); e = eb; }',
    '    }',
    // R: lực kính lan tới đâu, tính theo độ sâu dải (1 = đúng viền kính). Viền
    // sáng vẫn ở nd = 1; uSoft > 0 cho lực bắt đầu từ SÂU hơn viền đó nên chỗ
    // ảnh bắt đầu cong được trải dài ra — góc vát tròn thay vì gập một cục.
    '    float R = 1.0 + uSoft;',
    '    if (D > 1.0 && best < R) {',
    '      float nd = best;', // 0 ở tâm (mép viewport), 1 ở viền kính — y bản gốc
    // t: 0 ở chỗ lực bắt đầu (nd = R), 1 ở MÉP viewport. Lực tăng dần VỀ PHÍA
    // MÉP (người dùng chốt) — bằng 0 và phẳng (đạo hàm 0) ở chỗ bắt đầu nên ảnh
    // đi vào kính liền mạch, càng sát mép càng bị kéo chìa ra.
    '      float t = 1.0 - nd / R;',
    '      float w = t * t;',
    '      float P = uZoom * 0.30 * w;',
    '      float vao = c.y < 0.5 ? 1.0 : -1.0;', // hướng vào trong màn hình
    '      float rimS = smoothstep(0.3, 1.0, t);',
    '      float ang = atan(e.y, e.x) + uTime * uWaveT;',
    '      float fw = sin(ang * 2.0) * 0.55 + sin(ang) * 0.25;',
    // Gợn viền chạy theo phương TIẾP TUYẾN của elip (vuông góc hướng toả).
    '      vec2 tn = normalize(vec2(-e.y * hx, e.x * D) + 1e-6);',
    '      vec2 rimOff = tn * fw * rimS * D * uRimWave;',
    // Ngang: lấy mẫu gần trục giữa hàng hơn → ảnh toả ra hai bên, ảnh trái chìa
    // sang trái, ảnh phải sang phải, mạnh nhất ở mép viewport. Dọc: lấy mẫu
    // lùi vào trong → ảnh bị kéo giãn về phía mép. Trần 0.45 giữ phép ánh xạ
    // đơn điệu (đạo hàm < 1) — vượt là ảnh gập ngược lại.
    '      vec2 sv = vec2(cx + (v.x - cx) * (1.0 - P * uSplay), v.y + vao * D * min(uZoom * 0.30, 0.45) * w) + rimOff;',
    '      vec2 bp = sv - uRowView;', // về toạ độ hàng
    '      vec2 rd = normalize(v - sv + 1e-6);', // tách màu theo hướng bị kéo
    '      float dsp = uDisp * smoothstep(0.1, 1.0, t);',
    '      int N = clamp(uSamples, 2, 16);',
    '      vec3 col = vec3(0.0);',
    '      vec3 wsum = vec3(0.0);',
    '      float aa = 0.0;',
    '      float asum = 0.0;',
    '      for (int s = 0; s < 16; s++) {',
    '        if (s >= N) break;',
    '        float t = float(s) / float(N - 1);',
    '        vec4 sm = anh(bp + rd * dsp * (t - 0.5));',
    '        vec3 w = vec3(exp(-pow(t / 0.38, 2.0)), exp(-pow((t - 0.5) / 0.38, 2.0)), exp(-pow((t - 1.0) / 0.38, 2.0)));',
    '        col += sm.rgb * sm.a * w;',
    '        wsum += w;',
    '        aa += sm.a * w.g;',
    '        asum += w.g;',
    '      }',
    '      col /= max(wsum, vec3(0.001));',
    '      float ga = aa / max(asum, 0.001);',
    '      col *= mix(0.91, 1.0, smoothstep(0.0, 0.38, nd));',
    // Ánh sáng — CHỈ cộng lên phần có ảnh (nhân ga), đúng "chỉ áp dụng vào ảnh".
    '      float r2 = nd * nd * 0.25;',
    '      float gs = max(12.0 * uGlow * 0.003, 0.004);',
    '      float nova = (exp(-r2 / gs) + exp(-r2 / (gs * 7.0)) * 0.18) * uNova * (uGlow / 17.0) * 1.15;',
    '      float dC = nd * 0.5;',
    '      float tR = clamp(uRingR, 0.1, 0.49);',
    '      float rW = max(uRingW, 0.003);',
    '      float ring = exp(-pow((dC - tR) / rW, 2.0)) * uRing * (uGlow / 17.0) * 1.8;',
    '      if (uShimmer > 0.5) ring *= sin(ang * 12.0 + uTime * 3.5) * 0.12 + 0.88;',
    '      float aura = exp(-pow((dC - tR) / (rW * 6.0), 2.0)) * 0.28 * uRing * (uGlow / 17.0);',
    '      float rim = exp(-pow((dC - 0.488) / 0.003, 2.0)) * uRimLine;',
    '      vec3 light = vec3(nova + rim) + uRingCol * (ring + aura);',
    '      vec4 g = vec4(col + light * smoothstep(1.0, 0.93, nd) * ga, ga);',
    // Lực về 0 liền mạch ở nd = R nên ảnh bẻ trùng ảnh gốc ở đó — chỉ cần một
    // dải rất mỏng để khử răng cưa. Ánh sáng thì vẫn chỉ trong viền kính.
    '      outc = mix(outc, g, smoothstep(R, R - 0.03, nd));',
    '    }',
    '  }',
    '  o = outc;',
    '}',
  ].join('\n')

  /* ------------------------------------------------------------- tiện ích */

  var live = 0 // số context đang sống
  var rows = []
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)')

  // Lò xo DÙNG CHUNG cho mọi hàng: lực là vận tốc cuộn của cả trang, hàng nào
  // cũng nhận cùng một lực — tách riêng từng hàng chỉ tốn thêm mà ra y hệt.
  var song = { vS: 0, bowT: 0, vT: 0, bowB: 0, vB: 0 }

  // Canvas nhô ra ngoài hàng: dọc đủ chỗ cho sóng phồng VÀ cho kính kéo ảnh tràn
  // ra; ngang chỉ cần cho kính (sóng chỉ cong theo phương dọc).
  function pad() {
    return Math.max(S.maxBow + 4, S.glass ? S.glassSpill : 0)
  }
  function padX() {
    return S.glass ? S.glassSpill : 0
  }

  function q(id) {
    return document.querySelector('[data-n="' + id + '"]')
  }

  function biendich(gl, type, src) {
    var sh = gl.createShader(type)
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.warn('kx-wave-images:', gl.getShaderInfoLog(sh))
      return null
    }
    return sh
  }

  function choAnh(img) {
    if (img.complete && img.naturalWidth) return Promise.resolve(img)
    return new Promise(function (ok) {
      img.addEventListener('load', function () { ok(img) }, { once: true })
      img.addEventListener('error', function () { ok(null) }, { once: true })
    })
  }

  /* ------------------------------------------------------------- đo
   * Đo THƯA: lúc khởi động, lúc đổi cỡ cửa sổ và khi trang nạp xong. Vòng mỗi
   * khung không đụng tới layout — getBoundingClientRect() mỗi khung là điều
   * cấm số 1 của project. Canvas nằm TRONG hàng nên tự trôi theo trang, vòng
   * vẽ không cần biết vị trí của hàng trên màn hình. */
  function doHang(r) {
    var b = r.el.getBoundingClientRect()
    r.w = b.width
    r.h = b.height
    // Cho kính: vị trí hàng trong TRANG (mỗi khung chỉ trừ scrollY, không đo lại)
    // và mép trái trong viewport (trang không cuộn ngang nên mép trái cố định).
    r.pageTop = b.top + window.scrollY
    r.left = b.left
    r.items.forEach(function (it, i) {
      var wb = it.wrap.getBoundingClientRect()
      var ib = it.img.getBoundingClientRect()
      it.x0 = wb.left - b.left
      it.x1 = wb.right - b.left
      it.h = wb.height
      // Neo dọc lấy từ CHÍNH thẻ <img>: ảnh object-cover có hộp trùng khung nên
      // neo giữa; ảnh Figma cắt kiểu "cao 114.95%, top -0.06%" thì hộp ảnh tràn
      // khung và lệch về đỉnh.
      var du = ib.height - wb.height
      it.anchorY = du > 0.5 ? Math.min(1, Math.max(0, (wb.top - ib.top) / du)) : 0.5
      r.aX0[i] = it.x0
      r.aX1[i] = it.x1
      r.aH[i] = it.h
      r.aAnchor[i] = it.anchorY
    })
    if (r.gl) {
      dungKhung(r)
      r.can = true
    }
  }

  // Cỡ viewport cho kính. clientWidth chứ không innerWidth: innerWidth tính cả
  // thanh cuộn nên tâm elip lệch sang phải nửa thanh cuộn.
  var vw = 1
  var vh = 1
  var tamX = 0 // tâm kính theo phương ngang (px viewport) — dải chữ dùng chung với ảnh
  var coCu = ''

  function doTatCa() {
    vw = document.documentElement.clientWidth || window.innerWidth
    vh = window.innerHeight
    rows.forEach(doHang)
    // Mọi hàng cùng một cột nên cùng một tâm; dải chữ lấy đúng tâm đó để kính
    // bẻ chữ và kính bẻ ảnh là MỘT thấu kính.
    tamX = rows.length ? rows[0].left + rows[0].w / 2 : vw / 2
    doBang()
    // Đổi cỡ thì layout đổi: chữ phải vẽ lại. Bảng setting cũng gọi hàm này
    // sau mỗi lần kéo thanh trượt — lúc đó cỡ không đổi, không vẽ lại.
    var co = vw + 'x' + vh
    if (co !== coCu) {
      if (coCu) veLaiChu()
      coCu = co
    }
  }

  /* Tỉ lệ pixel: dpr, chặn trần `maxPx` cho cạnh dài (giống các file lửa). */
  function dungKhung(r) {
    var H = r.h + 2 * pad()
    var Wc = r.w + 2 * padX()
    var ratio = Math.min(window.devicePixelRatio || 1, S.maxDpr, S.maxPx / Math.max(1, Wc, H))
    r.ratio = ratio
    r.canvas.style.top = -pad() + 'px'
    r.canvas.style.height = H + 'px'
    r.canvas.style.left = -padX() + 'px'
    r.canvas.style.width = Wc + 'px'
    r.canvas.width = Math.max(1, Math.round(Wc * ratio))
    r.canvas.height = Math.max(1, Math.round(H * ratio))
    r.gl.viewport(0, 0, r.canvas.width, r.canvas.height)
  }

  /* ------------------------------------------------------------- GL sống / chết */

  // Bộ vẽ chỉ cần sống khi còn ít nhất một trong hai hiệu ứng.
  function canVe() {
    return S.enabled && (S.wave || S.glass)
  }

  function dung(r) {
    if (!canVe() || r.gl || r.dangDung || live >= S.maxLive) return
    r.dangDung = true
    var canvas = document.createElement('canvas')
    canvas.setAttribute('aria-hidden', 'true')
    // z-index 2: nằm TRÊN dải kính chữ (z 1) — trong kính ảnh vẫn đè lên chữ
    // như ngoài kính. Trang không có stacking context trung gian nào nên hai
    // số này so trực tiếp với nhau; cột trái cố định (z 40) vẫn ở trên cùng.
    canvas.style.cssText = 'position:absolute;pointer-events:none;display:block;z-index:2'
    var gl = canvas.getContext('webgl2', { alpha: true, antialias: false, depth: false, stencil: false, premultipliedAlpha: true })
    if (!gl) {
      r.dangDung = false
      r.hong = true // không có WebGL2 thì để nguyên ảnh tĩnh
      return
    }
    var vs = biendich(gl, gl.VERTEX_SHADER, VERT)
    var fs = biendich(gl, gl.FRAGMENT_SHADER, FRAG)
    if (!vs || !fs) {
      r.dangDung = false
      r.hong = true
      return
    }
    var prog = gl.createProgram()
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.bindAttribLocation(prog, 0, 'p')
    gl.linkProgram(prog)
    gl.useProgram(prog)
    var buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

    var U = {}
    ;['uMap0', 'uMap1', 'uMap2', 'uMap3', 'uSize', 'uX0', 'uX1', 'uH', 'uAnchorY', 'uCount', 'uRes', 'uDpr', 'uPad', 'uPadX', 'uRowW', 'uBowT', 'uBowB', 'uDrag', 'uDragReach', 'uPerImage', 'uGlass', 'uTopOn', 'uBotOn', 'uView', 'uRowView', 'uBand', 'uSoft', 'uCurve', 'uSpan', 'uZoom', 'uSplay', 'uDisp', 'uRimWave', 'uWaveT', 'uTime', 'uGlow', 'uNova', 'uRing', 'uRingR', 'uRingW', 'uRimLine', 'uShimmer', 'uRingCol', 'uSamples'].forEach(function (n) {
      U[n] = gl.getUniformLocation(prog, n)
    })
    for (var t = 0; t < 4; t++) gl.uniform1i(U['uMap' + t], t)

    r.canvas = canvas
    r.gl = gl
    r.prog = prog
    r.buf = buf
    r.U = U
    r.tex = []
    live++
    r.el.appendChild(canvas)
    dungKhung(r)

    // Ảnh đã nạp sẵn trong trang (cùng origin) nên dùng lại thẳng thẻ <img>,
    // chỉ thu nhỏ về cỡ cần vẽ rồi mới đưa lên GPU.
    Promise.all(r.items.map(function (it) { return choAnh(it.img) })).then(function (ds) {
      if (r.gl !== gl) return // đã bị thu hồi trong lúc chờ
      if (ds.some(function (x) { return !x })) {
        huy(r)
        r.hong = true
        return
      }
      r.items.forEach(function (it, i) {
        r.tex[i] = taoTex(gl, it, r, i)
        r.aSize[i * 2] = it.nw
        r.aSize[i * 2 + 1] = it.nh
      })
      r.dangDung = false
      r.can = true
      r.choAn = true // vẽ xong khung đầu mới giấu ảnh thật
    })
  }

  function taoTex(gl, it, r, unit) {
    var img = it.img
    var nw = img.naturalWidth
    var nh = img.naturalHeight
    // Ảnh giữ đúng khung Figma nên texture chỉ cần nét bằng khung đó.
    var sc = Math.max((it.x1 - it.x0) / nw, it.h / nh) * r.ratio * S.textureDetail
    sc = Math.min(sc, 1, S.maxTex / Math.max(nw, nh))
    var src = img
    if (sc < 1) {
      src = document.createElement('canvas')
      src.width = Math.max(1, Math.round(nw * sc))
      src.height = Math.max(1, Math.round(nh * sc))
      src.getContext('2d').drawImage(img, 0, 0, src.width, src.height)
    }
    var tex = gl.createTexture()
    gl.activeTexture(gl.TEXTURE0 + unit)
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false) // dòng 0 = đỉnh ảnh, khớp toạ độ shader
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src)
    gl.generateMipmap(gl.TEXTURE_2D)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    it.nw = nw
    it.nh = nh
    return tex
  }

  /* Thu hồi: HIỆN LẠI ảnh thật trước, rồi mới gỡ canvas — không thì chớp một
   * khung trống. Bắt buộc loseContext(): gỡ canvas khỏi DOM không trả context
   * về ngay, nó nằm chờ bộ dọn rác (bài học context WebGL trong CLAUDE.md). */
  function huy(r) {
    if (!r.gl) return
    r.items.forEach(function (it) { it.img.style.opacity = '' })
    var gl = r.gl
    ;(r.tex || []).forEach(function (t) { if (t) gl.deleteTexture(t) })
    gl.deleteBuffer(r.buf)
    gl.deleteProgram(r.prog)
    var ext = gl.getExtension('WEBGL_lose_context')
    if (ext) ext.loseContext()
    if (r.canvas && r.canvas.parentNode) r.canvas.parentNode.removeChild(r.canvas)
    r.gl = r.canvas = r.prog = r.buf = r.U = null
    r.tex = []
    r.dangDung = false
    r.choAn = false
    live = Math.max(0, live - 1)
  }

  /* ------------------------------------------------------------- vật lý
   * Lực = vận tốc cuộn (px mỗi khung 60fps), làm mượt nhẹ. Cuộn xuống thì nội
   * dung đi lên, phần giữa mép bị "níu lại" nên phồng XUỐNG (y dương). */
  function buoc(dt, sy, syCu) {
    var v = (sy - syCu) / dt / 60
    song.vS += (v - song.vS) * 0.35
    var dich = S.wave ? Math.max(-S.maxBow, Math.min(S.maxBow, song.vS * S.bend)) : 0
    var k = S.bendStiffness
    var c = S.bendDamping
    var kB = k * S.lagBottom
    var cB = c * Math.sqrt(S.lagBottom) // giữ tỉ số tắt dần như mép trên
    song.vT += (k * (dich - song.bowT) - c * song.vT) * dt
    song.bowT += song.vT * dt
    song.vB += (kB * (dich - song.bowB) - cB * song.vB) * dt
    song.bowB += song.vB * dt
    return Math.abs(song.bowT) + Math.abs(song.bowB) + Math.abs(song.vT) + Math.abs(song.vB) + Math.abs(song.vS)
  }

  function ve(r) {
    var gl = r.gl
    var U = r.U
    gl.uniform2fv(U.uSize, r.aSize)
    gl.uniform1fv(U.uX0, r.aX0)
    gl.uniform1fv(U.uX1, r.aX1)
    gl.uniform1fv(U.uH, r.aH)
    gl.uniform1fv(U.uAnchorY, r.aAnchor)
    gl.uniform1i(U.uCount, r.items.length)
    gl.uniform2f(U.uRes, r.w + 2 * padX(), r.h + 2 * pad())
    gl.uniform1f(U.uPadX, padX())
    gl.uniform1f(U.uRowW, r.w)
    gl.uniform1f(U.uDpr, r.ratio)
    gl.uniform1f(U.uPad, pad())
    gl.uniform1f(U.uBowT, song.bowT)
    gl.uniform1f(U.uBowB, song.bowB)
    gl.uniform1f(U.uDrag, S.drag)
    gl.uniform1f(U.uDragReach, S.dragReach)
    gl.uniform1f(U.uPerImage, S.bendPerImage ? 1 : 0)
    // ---- kính
    gl.uniform1f(U.uGlass, S.glass ? 1 : 0)
    if (S.glass) {
      mauVong()
      gl.uniform1f(U.uTopOn, S.glassTop ? 1 : 0)
      gl.uniform1f(U.uBotOn, S.glassBottom ? 1 : 0)
      gl.uniform2f(U.uView, vw, vh)
      gl.uniform2f(U.uRowView, r.left, r.pageTop - window.scrollY)
      gl.uniform1f(U.uBand, S.glassBand * kinhMo())
      gl.uniform1f(U.uSoft, Math.max(0, +S.glassSoft || 0))
      gl.uniform1f(U.uCurve, S.glassCurve)
      gl.uniform1f(U.uSpan, S.glassSpan)
      gl.uniform1f(U.uZoom, S.glassZoom)
      gl.uniform1f(U.uSplay, S.glassSplay)
      gl.uniform1f(U.uDisp, S.glassDispersion)
      gl.uniform1f(U.uRimWave, S.glassRimWave)
      gl.uniform1f(U.uWaveT, S.glassWaveSpeed)
      gl.uniform1f(U.uTime, gioNay)
      gl.uniform1f(U.uGlow, S.glassGlow)
      gl.uniform1f(U.uNova, S.glassNova)
      gl.uniform1f(U.uRing, S.glassRing)
      gl.uniform1f(U.uRingR, S.glassRingRadius)
      gl.uniform1f(U.uRingW, S.glassRingWidth)
      gl.uniform1f(U.uRimLine, S.glassRimLine)
      gl.uniform1f(U.uShimmer, S.glassShimmer ? 1 : 0)
      gl.uniform3f(U.uRingCol, mauRGB[0], mauRGB[1], mauRGB[2])
      gl.uniform1i(U.uSamples, S.glassSamples | 0)
    }
    for (var t = 0; t < r.items.length; t++) {
      gl.activeTexture(gl.TEXTURE0 + t)
      gl.bindTexture(gl.TEXTURE_2D, r.tex[t])
    }
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }

  /* ------------------------------------------------------------- vòng
   * LUÔN SỐNG, không có việc thì bỏ qua chứ không dừng vòng — đúng bài học
   * "vòng vẽ chết hẳn khi tab bị ẩn" đã ghi trong CLAUDE.md. */
  var last = 0
  var syCu = 0
  var dangYen = false // đã vẽ khung phẳng cuối cùng chưa
  var gioNay = 0 // giây — cho gợn viền và vòng lấp lánh của kính
  var khungDem = 0
  var cuonKhung = -9 // khung gần nhất cuộn mượt đã phát kx-cuon

  // Màu vòng kính đổi từ chuỗi hex sang số MỘT LẦN mỗi khi chuỗi đổi — không
  // cắt chuỗi mỗi khung (luật cấm số 2).
  var mauChuoi = ''
  var mauRGB = [0, 0.6, 1]
  function mauVong() {
    if (S.glassColor === mauChuoi) return
    mauChuoi = S.glassColor
    var h = String(mauChuoi).replace('#', '')
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
    var n = parseInt(h, 16)
    if (isNaN(n)) return
    mauRGB = [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
  }

  /* Màn đầu (chưa cuộn) KHÔNG có kính — người dùng chốt. Kính mọc dần từ mép
   * vào theo quãng cuộn đầu tiên `glassIntro` px: nhân thẳng vào độ sâu dải,
   * nên ở 0 thì dải sâu 0 và shader bỏ qua hẳn (nhánh D <= 1), không tốn gì.
   * Cuộn về đầu trang thì kính thu về. Chỉ đọc scrollY, không đo layout. */
  function kinhMo() {
    var n = +S.glassIntro || 0
    if (n <= 0) return 1
    var t = window.scrollY / n
    if (t <= 0) return 0
    if (t >= 1) return 1
    return t * t * (3 - 2 * t)
  }

  /* Hàng có chạm dải kính không — tính từ số đã đo + scrollY, không đo layout.
   * Tính cả phần canvas nhô ra (pad) vì mép sóng có thể phồng vào dải kính. */
  function trongKinh(r) {
    if (!S.glass) return false
    var top = r.pageTop - window.scrollY - pad()
    var bot = top + r.h + 2 * pad()
    var sau = S.glassBand * kinhMo() * vh * (1 + Math.max(0, +S.glassSoft || 0))
    return (S.glassTop && top < sau) || (S.glassBottom && bot > vh - sau)
  }

  function veHang(r, nghi, chiKinh) {
    if (!r.gl || r.dangDung || !r.tex.length) return
    var k = trongKinh(r)
    // Hàng vừa RA khỏi dải kính vẫn phải vẽ thêm một khung để xoá vệt kính cũ.
    var vuaRa = r.kinhCu && !k
    r.kinhCu = k
    if (chiKinh && !k && !vuaRa) return
    if (!k && !vuaRa && nghi && dangYen && !r.can) return
    r.can = false
    ve(r)
    if (r.choAn) {
      r.choAn = false
      r.items[0].img.style.opacity = '0'
      for (var j = 1; j < r.items.length; j++) r.items[j].img.style.opacity = '0'
    }
  }

  function khung(now) {
    requestAnimationFrame(khung)
    khungDem++
    var dt = Math.min((now - last) / 1000, 1 / 30) || 1 / 60
    last = now
    gioNay = now / 1000
    var sy = window.scrollY
    var dong = buoc(dt, sy, syCu)
    syCu = sy
    var nghi = dong < 0.01
    if (nghi && song.bowT !== 0) {
      // Lắng hẳn: chốt về 0 cho mép thẳng tắp, vẽ thêm đúng một khung.
      song.bowT = song.bowB = song.vT = song.vB = song.vS = 0
    }
    // Cuộn mượt đang chạy (khung trước nó vừa phát kx-cuon) thì nó sẽ còn
    // phát lần nữa SAU vòng này, với scrollY mới — để nó vẽ, khỏi vẽ hai lần
    // mà lần đầu lại lệch một nhịp.
    var deChoCuon = cuonKhung >= khungDem - 1
    for (var i = 0; i < rows.length; i++) {
      if (deChoCuon) continue
      veHang(rows[i], nghi, false)
    }
    if (!deChoCuon) veBang()
    dangYen = nghi
  }

  /* Cuộn mượt vừa ghi vị trí mới (đồng bộ, cùng khung) → vẽ lại NGAY những
   * hàng phụ thuộc vị trí trên màn hình (trong dải kính) và hàng đang sóng. */
  function luocCuon() {
    cuonKhung = khungDem
    var dangSong = Math.abs(song.bowT) + Math.abs(song.bowB) > 0.01
    for (var i = 0; i < rows.length; i++) veHang(rows[i], !dangSong, !dangSong)
    veBang()
  }

  /* =========================================================== DẢI KÍNH CHỮ
   * Người dùng chốt: kính bẻ CẢ dải dự án — chữ, số "01.", đường kẻ, icon —
   * chứ không riêng ảnh, đúng như bản gốc của Osmo (nó vẽ cả cảnh vào render
   * target rồi mới khúc xạ). WebGL không đọc được DOM, nên:
   *
   * 1. veChu(): chép mọi thứ KHÔNG phải ảnh hàng của một khối dự án sang một
   *    canvas 2D — chữ theo từng từ (vị trí lấy từ Range nên căn lề, ngắt dòng,
   *    letter-spacing đúng như trang), gạch chân, icon SVG, đường kẻ (kể cả
   *    đường xoay 90°), ô có nền, viền nút. Chạy MỘT LẦN khi khối tới gần và
   *    khi đổi cỡ — không bao giờ trong vòng mỗi khung.
   * 2. Hai dải canvas CỐ ĐỊNH sát mép trên / dưới viewport, cao đúng bằng độ
   *    sâu kính, z-index 1. Trong vùng kính chúng tô ĐẶC màu nền (che chữ DOM
   *    bên dưới) rồi vẽ chữ đã khúc xạ. Ngoài kính trong suốt — chữ vẫn là DOM
   *    thật: nét, chọn được, bấm được.
   * 3. Ảnh vẫn do canvas từng hàng vẽ (z-index 2, nằm trên dải chữ), cùng một
   *    phép tính thấu kính — nên trong kính ảnh vẫn đè lên chữ như ngoài kính.
   *
   * Vì sao không một canvas phủ cả khối: thử rồi. Khối dự án to gần một màn
   * hình, trần maxPx ép độ nét xuống ~1.1 px thật mỗi px — ảnh ngoài kính mờ
   * hẳn so với canvas từng hàng (~1.5), và tốn GPU gấp đôi. Dải kính chỉ cao
   * ~6% viewport nên vẽ đủ dpr mà gần như không tốn gì.
   *
   * MỘT context cho cả hai dải: vẽ vào một canvas WebGL không gắn vào trang
   * (nửa trên = dải trên, nửa dưới = dải dưới) rồi drawImage sang hai canvas
   * 2D hiển thị — hai context riêng thì mỗi texture chữ phải nạp hai lần. */

  var SLOT = 4 // số khối giữ texture chữ cùng lúc

  var FRAG_CHU = [
    '#version 300 es',
    'precision highp float;',
    'uniform sampler2D uT0, uT1, uT2, uT3;',
    'uniform vec4 uTR[4];', // vùng texture của từng khối, toạ độ TRANG: x, y, w, h (w = 0 là trống)
    'uniform vec2 uView;',
    'uniform float uScroll, uBh, uDpr, uResY, uTopOn, uBotOn;',
    'uniform vec3 uBg;',
    'uniform float uLensX, uBand, uSoft, uCurve, uSpan, uZoom, uSplay, uDisp, uRimWave, uWaveT, uTime;',
    'uniform float uGlow, uNova, uRing, uRingR, uRingW, uRimLine, uShimmer;',
    'uniform vec3 uRingCol;',
    'uniform int uSamples;',
    'out vec4 o;',
    'vec4 tex(int k, vec2 uv){',
    '  if (k == 0) return texture(uT0, uv);',
    '  if (k == 1) return texture(uT1, uv);',
    '  if (k == 2) return texture(uT2, uv);',
    '  return texture(uT3, uv);',
    '}',
    // Chữ tại một điểm viewport (premultiplied) — tìm khối chứa điểm đó.
    'vec4 chu(vec2 v){',
    '  vec2 pg = vec2(v.x, v.y + uScroll);',
    '  for (int k = 0; k < 4; k++) {',
    '    vec4 R = uTR[k];',
    '    if (R.z <= 0.0) continue;',
    '    vec2 uv = (pg - R.xy) / R.zw;',
    '    if (uv.x >= 0.0 && uv.y >= 0.0 && uv.x <= 1.0 && uv.y <= 1.0) return tex(k, uv);',
    '  }',
    '  return vec4(0.0);',
    '}',
    'void main(){',
    '  float py = (uResY - gl_FragCoord.y) / uDpr;', // px css từ đỉnh canvas
    '  bool tren = py < uBh;',
    '  if ((tren && uTopOn < 0.5) || (!tren && uBotOn < 0.5)) { o = vec4(0.0); return; }',
    // Nửa trên là dải mép trên (y viewport = py); nửa dưới là dải mép dưới.
    '  vec2 v = vec2(gl_FragCoord.x / uDpr, tren ? py : uView.y - (2.0 * uBh - py));',
    // Cùng một phép tính thấu kính với shader vẽ ảnh — xem chú thích ở đó.
    '  float cx = uLensX;',
    '  float D = uBand * uView.y;',
    '  float hx = max(0.5 * uView.x * uSpan, 1.0);',
    '  vec2 c = vec2(cx, tren ? 0.0 : uView.y);',
    '  vec2 e = vec2((v.x - cx) / hx, (v.y - c.y) / max(D, 1.0));',
    '  float nd = mix(abs(e.y), length(e), uCurve);',
    '  float R = 1.0 + uSoft;',
    '  if (D <= 1.0 || nd >= R) { o = vec4(0.0); return; }',
    '  float t = 1.0 - nd / R;',
    '  float w = t * t;',
    '  float P = uZoom * 0.30 * w;',
    '  float vao = tren ? 1.0 : -1.0;',
    '  float rimS = smoothstep(0.3, 1.0, t);',
    '  float ang = atan(e.y, e.x) + uTime * uWaveT;',
    '  float fw = sin(ang * 2.0) * 0.55 + sin(ang) * 0.25;',
    '  vec2 tn = normalize(vec2(-e.y * hx, e.x * D) + 1e-6);',
    '  vec2 rimOff = tn * fw * rimS * D * uRimWave;',
    '  vec2 sv = vec2(cx + (v.x - cx) * (1.0 - P * uSplay), v.y + vao * D * min(uZoom * 0.30, 0.45) * w) + rimOff;',
    '  vec2 rd = normalize(v - sv + 1e-6);',
    '  float dsp = uDisp * smoothstep(0.1, 1.0, t);',
    '  int N = clamp(uSamples, 2, 16);',
    '  vec3 col = vec3(0.0);',
    '  vec3 wsum = vec3(0.0);',
    '  float aa = 0.0;',
    '  float asum = 0.0;',
    '  for (int s = 0; s < 16; s++) {',
    '    if (s >= N) break;',
    '    float t = float(s) / float(N - 1);',
    '    vec4 sm = chu(sv + rd * dsp * (t - 0.5));',
    '    vec3 w = vec3(exp(-pow(t / 0.38, 2.0)), exp(-pow((t - 0.5) / 0.38, 2.0)), exp(-pow((t - 1.0) / 0.38, 2.0)));',
    '    col += sm.rgb * w;',
    '    wsum += w;',
    '    aa += sm.a * w.g;',
    '    asum += w.g;',
    '  }',
    '  col /= max(wsum, vec3(0.001));',
    '  float ga = aa / max(asum, 0.001);',
    '  col *= mix(0.91, 1.0, smoothstep(0.0, 0.38, nd));',
    // Ánh sáng chỉ cộng lên nét chữ (nhân ga) — y như phần ảnh.
    '  float r2 = nd * nd * 0.25;',
    '  float gs = max(12.0 * uGlow * 0.003, 0.004);',
    '  float nova = (exp(-r2 / gs) + exp(-r2 / (gs * 7.0)) * 0.18) * uNova * (uGlow / 17.0) * 1.15;',
    '  float dC = nd * 0.5;',
    '  float tR = clamp(uRingR, 0.1, 0.49);',
    '  float rW = max(uRingW, 0.003);',
    '  float ring = exp(-pow((dC - tR) / rW, 2.0)) * uRing * (uGlow / 17.0) * 1.8;',
    '  if (uShimmer > 0.5) ring *= sin(ang * 12.0 + uTime * 3.5) * 0.12 + 0.88;',
    '  float aura = exp(-pow((dC - tR) / (rW * 6.0), 2.0)) * 0.28 * uRing * (uGlow / 17.0);',
    '  float rim = exp(-pow((dC - 0.488) / 0.003, 2.0)) * uRimLine;',
    '  vec3 light = vec3(nova + rim) + uRingCol * (ring + aura);',
    '  vec4 g = vec4(col + light * smoothstep(1.0, 0.93, nd) * ga, ga);',
    // Phủ ĐẶC màu nền: che chữ DOM nằm dưới, không thì chữ thật và chữ đã khúc
    // xạ hiện chồng lên nhau.
    '  g += vec4(uBg, 1.0) * (1.0 - g.a);',
    '  o = g * smoothstep(R, R - 0.03, nd);', // lực đã về 0 ở R — chỉ khử răng cưa
    '}',
  ].join('\n')

  var khoi = [] // khối dự án có chữ đi qua kính
  var bang = null // { gl, off, prog, buf, U, tren, duoi, ctxT, ctxB, bh, W, ratio, slot[] }
  var nen = [4 / 255, 2 / 255, 3 / 255]

  /* Màu nền trang cho phần phủ đặc — đọc một lần lúc boot. */
  function docNen() {
    var m = String(getComputedStyle(document.body).backgroundColor).match(/[\d.]+/g)
    if (m && m.length >= 3 && !(m.length > 3 && +m[3] === 0)) nen = [m[0] / 255, m[1] / 255, m[2] / 255]
  }

  var coLetter = (function () {
    try {
      return 'letterSpacing' in document.createElement('canvas').getContext('2d')
    } catch (e) {
      return false
    }
  })()

  function gocXoay(s) {
    var a = 0
    if (s.rotate && s.rotate !== 'none') a += parseFloat(s.rotate) * Math.PI / 180
    if (s.transform && s.transform !== 'none') {
      var m = s.transform.match(/-?[\d.e]+/g)
      if (m && m.length >= 4) a += Math.atan2(+m[1], +m[0])
    }
    return a
  }

  function bienChu(t, tt) {
    if (tt === 'uppercase') return t.toUpperCase()
    if (tt === 'lowercase') return t.toLowerCase()
    if (tt === 'capitalize') return t.replace(/(^|\s)(\S)/g, function (x, a, b) { return a + b.toUpperCase() })
    return t
  }

  function fontCua(s) {
    return s.fontStyle + ' ' + s.fontWeight + ' ' + s.fontSize + ' ' + s.fontFamily
  }

  /* Gom lệnh vẽ của một khối, toạ độ px css tính từ góc trên-trái khối.
   * Bỏ qua: ảnh của hàng (canvas hàng vẽ riêng, có sóng), mọi <canvas>, và mọi
   * phần tử position: fixed (đĩa, cột trái — chúng không trôi qua kính).
   * mix-blend-mode: difference của chữ bỏ qua được: trên nền gần đen,
   * difference cho ra đúng màu chữ. */
  function gomLenh(k) {
    var b = k.el.getBoundingClientRect()
    var lenh = []
    var rg = document.createRange()

    function them(o, x, y, w, h) {
      o.x = x - b.left
      o.y = y - b.top
      o.w = w
      o.h = h
      lenh.push(o)
    }

    function chu(node, s, op) {
      var t = node.nodeValue
      if (!t || !/\S/.test(t)) return
      var font = fontCua(s)
      var ls = parseFloat(s.letterSpacing) || 0
      var re = /\S+/g
      var m
      while ((m = re.exec(t))) {
        var tu = m[0].replace(/[​‌‍﻿]/g, '')
        if (!tu) continue
        rg.setStart(node, m.index)
        rg.setEnd(node, m.index + m[0].length)
        var rs = rg.getClientRects()
        if (!rs.length) continue
        them({ k: 'chu', s: bienChu(tu, s.textTransform), font: font, mau: s.color, ls: ls, op: op }, rs[0].left, rs[0].top, rs[0].width, rs[0].height)
      }
    }

    function di(el, op, xoay) {
      if (k.boQua.has(el) || el.tagName === 'CANVAS') return
      var s = getComputedStyle(el)
      if (s.position === 'fixed' || s.display === 'none') return
      op *= parseFloat(s.opacity)
      if (op < 0.004) return
      xoay += gocXoay(s)
      var hien = s.visibility !== 'hidden'
      var hb = null
      if (hien && s.backgroundColor !== 'transparent' && !/rgba\(.*,\s*0\)$/.test(s.backgroundColor)) {
        hb = el.getBoundingClientRect()
        them({ k: 'nen', mau: s.backgroundColor, op: op }, hb.left, hb.top, hb.width, hb.height)
      }
      var bw = [parseFloat(s.borderTopWidth) || 0, parseFloat(s.borderRightWidth) || 0, parseFloat(s.borderBottomWidth) || 0, parseFloat(s.borderLeftWidth) || 0]
      if (hien && (bw[0] || bw[1] || bw[2] || bw[3])) {
        hb = hb || el.getBoundingClientRect()
        them({ k: 'vien', bw: bw, mau: [s.borderTopColor, s.borderRightColor, s.borderBottomColor, s.borderLeftColor], op: op }, hb.left, hb.top, hb.width, hb.height)
      }
      if (el.tagName === 'IMG') {
        if (hien && el.naturalWidth) {
          var ib = el.getBoundingClientRect()
          them({ k: 'anh', img: el, op: op, xoay: xoay }, ib.left, ib.top, ib.width, ib.height)
        }
        return
      }
      if (el.tagName === 'VIDEO') return
      for (var n = el.firstChild; n; n = n.nextSibling) {
        if (n.nodeType === 1) di(n, op, xoay)
        else if (n.nodeType === 3 && hien) chu(n, s, op)
      }
      // Gạch chân: theo từng hộp dòng của chính phần tử.
      if (hien && /underline/.test(s.textDecorationLine) && /\S/.test(el.textContent)) {
        var rs = el.getClientRects()
        for (var i = 0; i < rs.length; i++) {
          them({ k: 'gach', font: fontCua(s), mau: s.textDecorationColor || s.color, op: op, fs: parseFloat(s.fontSize), off: s.textUnderlineOffset, day: s.textDecorationThickness }, rs[i].left, rs[i].top, rs[i].width, rs[i].height)
        }
      }
    }

    di(k.el, 1, 0)
    return lenh
  }

  // Chân chữ trong hộp: hộp của Range là vùng nội dung của font (ascent +
  // descent) đặt giữa dòng, nên căn giữa phần đó vào hộp là ra chân chữ.
  function chanChu(ctx, o) {
    var mt = ctx.measureText('Hg')
    var asc = mt.fontBoundingBoxAscent
    var desc = mt.fontBoundingBoxDescent
    if (!(asc > 0)) {
      asc = o.h * 0.8
      desc = o.h * 0.2
    }
    return o.y + (o.h - (asc + desc)) / 2 + asc
  }

  function veChu(k) {
    var lenh = gomLenh(k)
    if (!lenh.length) return null
    var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
    lenh.forEach(function (o) {
      x0 = Math.min(x0, o.x)
      y0 = Math.min(y0, o.y)
      x1 = Math.max(x1, o.x + o.w)
      y1 = Math.max(y1, o.y + o.h)
    })
    x0 = Math.floor(x0) - 2
    y0 = Math.floor(y0) - 2
    x1 = Math.ceil(x1) + 2
    y1 = Math.ceil(y1) + 2
    var w = x1 - x0
    var h = y1 - y0
    var sc = Math.min(window.devicePixelRatio || 1, S.maxDpr, S.textMax / Math.max(w, h))
    var cv = document.createElement('canvas')
    cv.width = Math.max(1, Math.round(w * sc))
    cv.height = Math.max(1, Math.round(h * sc))
    var ctx = cv.getContext('2d')
    ctx.setTransform(sc, 0, 0, sc, -x0 * sc, -y0 * sc)
    ctx.textBaseline = 'alphabetic'
    ctx.textAlign = 'left'
    lenh.forEach(function (o) {
      ctx.globalAlpha = o.op
      if (o.k === 'nen') {
        ctx.fillStyle = o.mau
        ctx.fillRect(o.x, o.y, o.w, o.h)
      } else if (o.k === 'vien') {
        var bw = o.bw
        if (bw[0]) { ctx.fillStyle = o.mau[0]; ctx.fillRect(o.x, o.y, o.w, bw[0]) }
        if (bw[2]) { ctx.fillStyle = o.mau[2]; ctx.fillRect(o.x, o.y + o.h - bw[2], o.w, bw[2]) }
        if (bw[3]) { ctx.fillStyle = o.mau[3]; ctx.fillRect(o.x, o.y, bw[3], o.h) }
        if (bw[1]) { ctx.fillStyle = o.mau[1]; ctx.fillRect(o.x + o.w - bw[1], o.y, bw[1], o.h) }
      } else if (o.k === 'anh') {
        // Hộp bao của phần tử đã xoay là hộp NẰM NGANG; xoay 90° thì đổi rộng /
        // cao rồi vẽ quanh tâm hộp.
        var dung = Math.abs(Math.sin(o.xoay)) > 0.5
        var iw = dung ? o.h : o.w
        var ih = dung ? o.w : o.h
        ctx.save()
        ctx.translate(o.x + o.w / 2, o.y + o.h / 2)
        if (o.xoay) ctx.rotate(o.xoay)
        try { ctx.drawImage(o.img, -iw / 2, -ih / 2, iw, ih) } catch (e) {}
        ctx.restore()
      } else if (o.k === 'chu') {
        ctx.font = o.font
        ctx.fillStyle = o.mau
        var y = chanChu(ctx, o)
        if (coLetter) {
          ctx.letterSpacing = o.ls + 'px'
          ctx.fillText(o.s, o.x, y)
          ctx.letterSpacing = '0px'
        } else {
          // Trình duyệt chưa có ctx.letterSpacing: đặt từng kí tự.
          var x = o.x
          for (var i = 0; i < o.s.length; i++) {
            ctx.fillText(o.s[i], x, y)
            x += ctx.measureText(o.s[i]).width + o.ls
          }
        }
      } else if (o.k === 'gach') {
        ctx.font = o.font
        var yb = chanChu(ctx, o)
        var off = parseFloat(o.off)
        if (isNaN(off)) off = o.fs * 0.09
        var day = parseFloat(o.day)
        if (isNaN(day)) day = Math.max(1, o.fs * 0.03)
        ctx.fillStyle = o.mau
        ctx.fillRect(o.x, yb + off, o.w, day)
      }
    })
    ctx.globalAlpha = 1
    // Toạ độ TRANG để shader tra theo scrollY, không phải đo lại mỗi khung.
    var b = k.el.getBoundingClientRect()
    return { canvas: cv, x: b.left + x0, y: b.top + window.scrollY + y0, w: w, h: h }
  }

  /* --- context của hai dải --- */

  function canChu() {
    return S.enabled && S.glass && S.glassText && khoi.length > 0
  }

  function taoBang() {
    if (bang || !canChu()) return
    var off = document.createElement('canvas')
    var gl = off.getContext('webgl2', { alpha: true, antialias: false, depth: false, stencil: false, premultipliedAlpha: true })
    if (!gl) return
    var vs = biendich(gl, gl.VERTEX_SHADER, VERT)
    var fs = biendich(gl, gl.FRAGMENT_SHADER, FRAG_CHU)
    if (!vs || !fs) return
    var prog = gl.createProgram()
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.bindAttribLocation(prog, 0, 'p')
    gl.linkProgram(prog)
    gl.useProgram(prog)
    var buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
    var U = {}
    ;['uT0', 'uT1', 'uT2', 'uT3', 'uTR', 'uView', 'uScroll', 'uBh', 'uDpr', 'uResY', 'uTopOn', 'uBotOn', 'uBg', 'uLensX', 'uBand', 'uSoft', 'uCurve', 'uSpan', 'uZoom', 'uSplay', 'uDisp', 'uRimWave', 'uWaveT', 'uTime', 'uGlow', 'uNova', 'uRing', 'uRingR', 'uRingW', 'uRimLine', 'uShimmer', 'uRingCol', 'uSamples'].forEach(function (n) {
      U[n] = gl.getUniformLocation(prog, n)
    })
    for (var t = 0; t < SLOT; t++) gl.uniform1i(U['uT' + t], t)

    function dai(viTri) {
      var c = document.createElement('canvas')
      c.setAttribute('aria-hidden', 'true')
      c.style.cssText = 'position:fixed;left:0;' + viTri + ':0;pointer-events:none;display:block;z-index:1'
      document.body.appendChild(c)
      return c
    }
    var tren = dai('top')
    var duoi = dai('bottom')
    bang = {
      gl: gl, off: off, prog: prog, buf: buf, U: U,
      tren: tren, duoi: duoi,
      ctxT: tren.getContext('2d'), ctxB: duoi.getContext('2d'),
      slot: [], tr: new Float32Array(SLOT * 4), bh: 0, W: 0, ratio: 1,
    }
    for (var i = 0; i < SLOT; i++) bang.slot.push(null)
    doBang()
    khoi.forEach(function (k) { if (k.gan) napKhoi(k) })
  }

  function boBang() {
    if (!bang) return
    var gl = bang.gl
    bang.slot.forEach(function (s) { if (s) gl.deleteTexture(s.tex) })
    khoi.forEach(function (k) { k.slot = -1 })
    gl.deleteBuffer(bang.buf)
    gl.deleteProgram(bang.prog)
    var ext = gl.getExtension('WEBGL_lose_context')
    if (ext) ext.loseContext()
    bang.tren.remove()
    bang.duoi.remove()
    bang = null
  }

  // Cỡ hai dải: cao đúng bằng độ sâu kính (đo ở giữa), rộng đúng viewport.
  function doBang() {
    if (!bang) return
    // Cao tới tận chỗ lực bắt đầu (độ sâu x (1 + glassSoft)), không chỉ tới viền.
    var bh = Math.ceil(S.glassBand * vh * (1 + Math.max(0, +S.glassSoft || 0))) + 2
    var ratio = Math.min(window.devicePixelRatio || 1, S.maxDpr)
    if (bh === bang.bh && vw === bang.W && ratio === bang.ratio) return
    bang.bh = bh
    bang.W = vw
    bang.ratio = ratio
    var Wp = Math.max(1, Math.round(vw * ratio))
    var Hp = Math.max(1, Math.round(bh * ratio))
    bang.off.width = Wp
    bang.off.height = Hp * 2
    ;[bang.tren, bang.duoi].forEach(function (c) {
      c.width = Wp
      c.height = Hp
      c.style.width = vw + 'px'
      c.style.height = bh + 'px'
    })
    bang.Wp = Wp
    bang.Hp = Hp
    bang.gl.viewport(0, 0, Wp, Hp * 2)
    bang.can = true
  }

  /* Nạp texture chữ của một khối vào một ô trống. Chờ font: vẽ trước khi
   * font về là ra chữ font dự phòng. */
  function napKhoi(k) {
    if (!bang || k.slot >= 0 || k.dangNap) return
    k.dangNap = true
    var cho = Array.prototype.map.call(k.el.querySelectorAll('img'), choAnh)
    Promise.all([Promise.all(cho), document.fonts ? document.fonts.ready : null]).then(function () {
      k.dangNap = false
      if (!bang || !k.gan || k.slot >= 0) return
      var o = bang.slot.indexOf(null)
      if (o < 0) return // hết ô — khối này đi qua kính không khúc xạ chữ
      var v = veChu(k)
      if (!v) return
      var gl = bang.gl
      var tex = gl.createTexture()
      gl.activeTexture(gl.TEXTURE0 + o)
      gl.bindTexture(gl.TEXTURE_2D, tex)
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
      // Premultiply lúc nạp: lọc tuyến tính không loang viền tối quanh nét chữ.
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, v.canvas)
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)
      // Không mipmap: chữ vẽ đúng cỡ hiển thị, kính phóng chứ không thu.
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      bang.slot[o] = { tex: tex, k: k }
      k.slot = o
      bang.tr[o * 4] = v.x
      bang.tr[o * 4 + 1] = v.y
      bang.tr[o * 4 + 2] = v.w
      bang.tr[o * 4 + 3] = v.h
      bang.can = true
    })
  }

  function thaKhoi(k) {
    if (!bang || k.slot < 0) return
    bang.gl.deleteTexture(bang.slot[k.slot].tex)
    bang.slot[k.slot] = null
    bang.tr[k.slot * 4 + 2] = 0 // w = 0: ô trống
    k.slot = -1
    bang.can = true
    // Ô vừa trống: khối đang chờ (hết ô lúc tới gần) thì nạp nốt.
    khoi.forEach(function (x) { if (x.gan && x.slot < 0) napKhoi(x) })
  }

  // Đổi cỡ: layout đổi thì chữ phải vẽ lại từ đầu.
  function veLaiChu() {
    if (!bang) return
    khoi.forEach(function (k) { thaKhoi(k) })
    khoi.forEach(function (k) { if (k.gan) napKhoi(k) })
  }

  var trongDai = false // có khối nào đang nằm trong ô không — dải trống thì xoá một lần rồi thôi

  function veBang() {
    if (!bang) return
    var co = false
    for (var i = 0; i < SLOT; i++) if (bang.slot[i]) co = true
    if (!co) {
      if (trongDai) {
        bang.ctxT.clearRect(0, 0, bang.Wp, bang.Hp)
        bang.ctxB.clearRect(0, 0, bang.Wp, bang.Hp)
      }
      trongDai = false
      return
    }
    trongDai = true
    var gl = bang.gl
    var U = bang.U
    mauVong()
    gl.uniform4fv(U.uTR, bang.tr)
    gl.uniform2f(U.uView, vw, vh)
    gl.uniform1f(U.uScroll, window.scrollY)
    gl.uniform1f(U.uBh, bang.bh)
    gl.uniform1f(U.uDpr, bang.Hp / bang.bh)
    gl.uniform1f(U.uResY, bang.Hp * 2)
    gl.uniform1f(U.uTopOn, S.glassTop ? 1 : 0)
    gl.uniform1f(U.uBotOn, S.glassBottom ? 1 : 0)
    gl.uniform3f(U.uBg, nen[0], nen[1], nen[2])
    gl.uniform1f(U.uLensX, tamX)
    gl.uniform1f(U.uBand, S.glassBand * kinhMo())
    gl.uniform1f(U.uSoft, Math.max(0, +S.glassSoft || 0))
    gl.uniform1f(U.uCurve, S.glassCurve)
    gl.uniform1f(U.uSpan, S.glassSpan)
    gl.uniform1f(U.uZoom, S.glassZoom)
    gl.uniform1f(U.uSplay, S.glassSplay)
    gl.uniform1f(U.uDisp, S.glassDispersion)
    gl.uniform1f(U.uRimWave, S.glassRimWave)
    gl.uniform1f(U.uWaveT, S.glassWaveSpeed)
    gl.uniform1f(U.uTime, gioNay)
    gl.uniform1f(U.uGlow, S.glassGlow)
    gl.uniform1f(U.uNova, S.glassNova)
    gl.uniform1f(U.uRing, S.glassRing)
    gl.uniform1f(U.uRingR, S.glassRingRadius)
    gl.uniform1f(U.uRingW, S.glassRingWidth)
    gl.uniform1f(U.uRimLine, S.glassRimLine)
    gl.uniform1f(U.uShimmer, S.glassShimmer ? 1 : 0)
    gl.uniform3f(U.uRingCol, mauRGB[0], mauRGB[1], mauRGB[2])
    gl.uniform1i(U.uSamples, S.glassSamples | 0)
    for (var t = 0; t < SLOT; t++) {
      gl.activeTexture(gl.TEXTURE0 + t)
      gl.bindTexture(gl.TEXTURE_2D, bang.slot[t] ? bang.slot[t].tex : null)
    }
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
    // Chép sang hai dải NGAY trong cùng tác vụ — bộ đệm vẽ WebGL chỉ còn
    // nguyên tới lúc trình duyệt trình bày khung, nên không cần
    // preserveDrawingBuffer.
    bang.ctxT.clearRect(0, 0, bang.Wp, bang.Hp)
    bang.ctxB.clearRect(0, 0, bang.Wp, bang.Hp)
    if (S.glassTop) bang.ctxT.drawImage(bang.off, 0, 0, bang.Wp, bang.Hp, 0, 0, bang.Wp, bang.Hp)
    if (S.glassBottom) bang.ctxB.drawImage(bang.off, 0, bang.Hp, bang.Wp, bang.Hp, 0, 0, bang.Wp, bang.Hp)
    bang.can = false
  }

  /* ------------------------------------------------------------- vào */

  function boot() {
    // KHÔNG return khi `enabled` false: bảng setting bật lại được lúc đang chạy,
    // nên vẫn phải dựng danh sách hàng và theo dõi hàng nào đang ở gần.
    if (!document.querySelector('.kx-page')) return
    if (reduce.matches) {
      api.giamChuyenDong = true // người chọn giảm chuyển động: để nguyên ảnh tĩnh
      return
    }

    var goc = S.rows.split(',').map(function (x) { return x.trim() })
    var ids = goc.slice()
    S.instances.split(',').forEach(function (inst) {
      goc.forEach(function (g) { ids.push('I' + inst.trim() + ';' + g) })
    })
    ids.forEach(function (id) {
      var el = q(id)
      if (!el) return
      var items = []
      for (var c = 0; c < el.children.length; c++) {
        var w = el.children[c]
        if (w.tagName !== 'DIV') continue
        var img = w.querySelector('img')
        if (img) items.push({ wrap: w, img: img })
      }
      if (items.length < 1 || items.length > 4) return
      rows.push({
        el: el,
        items: items,
        tex: [],
        // Mảng uniform cấp SẴN — cấp phát trong vòng mỗi khung là điều cấm số 2.
        aSize: new Float32Array(8),
        aX0: new Float32Array(4),
        aX1: new Float32Array(4),
        aH: new Float32Array(4),
        aAnchor: new Float32Array(4),
      })
    })
    if (!rows.length) return

    // Khối có chữ đi qua kính. Ảnh của hàng nằm trong khối thì bỏ khỏi bản vẽ
    // chữ — canvas hàng đã vẽ chúng, có sóng.
    docNen()
    S.blocks.split(',').concat(S.instances.split(',')).forEach(function (id) {
      var el = q(id.trim())
      if (!el) return
      var boQua = new Set()
      rows.forEach(function (r) {
        if (el.contains(r.el)) r.items.forEach(function (it) { boQua.add(it.img) })
      })
      khoi.push({ el: el, boQua: boQua, slot: -1, gan: false, dangNap: false })
    })
    doTatCa()
    taoBang()
    var ioChu = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var k = khoi.find(function (x) { return x.el === e.target })
        if (!k) return
        k.gan = e.isIntersecting
        if (k.gan) napKhoi(k)
        else thaKhoi(k)
      })
    }, { rootMargin: '50% 0px' })
    khoi.forEach(function (k) { ioChu.observe(k.el) })

    // Dựng GL khi hàng tới gần, thu hồi khi đã xa — chỉ vài hàng sống cùng lúc.
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var r = rows.find(function (x) { return x.el === e.target })
        if (!r || r.hong) return
        r.gan = e.isIntersecting // nhớ lại để bật lại sống thì biết dựng hàng nào
        if (e.isIntersecting) dung(r)
        else huy(r)
      })
    }, { rootMargin: S.preload + ' 0px' })
    rows.forEach(function (r) { io.observe(r.el) })

    var hen = 0
    addEventListener('resize', function () {
      clearTimeout(hen)
      hen = setTimeout(doTatCa, 120)
    })
    addEventListener('load', doTatCa)

    addEventListener('kx-cuon', luocCuon)

    syCu = window.scrollY
    requestAnimationFrame(function (t) {
      last = t
      requestAnimationFrame(khung)
    })

    var daBat = canVe()
    Object.assign(api, {
      rows: rows,
      khoi: khoi,
      song: song,
      doLai: doTatCa,
      /* Bảng setting gọi sau MỖI lần đổi giá trị. Đa số khoá được vòng vẽ đọc
       * thẳng mỗi khung nên tự ăn; chỉ hai thứ cần làm tay:
       *   - bật/tắt: tắt là THU HỒI hẳn context (trả GPU), bật là dựng lại
       *     những hàng đang ở gần — IntersectionObserver không bắn lại nên
       *     phải nhớ cờ `gan`.
       *   - maxBow: quyết định canvas nhô ra bao nhiêu, phải đo lại. */
      apDung: function () {
        if (canVe() !== daBat) {
          daBat = canVe()
          rows.forEach(function (r) {
            if (r.hong) return
            if (daBat && r.gan) dung(r)
            else if (!daBat) huy(r)
          })
          song.bowT = song.bowB = song.vT = song.vB = song.vS = 0
        }
        if (canChu()) taoBang()
        else boBang()
        doTatCa()
        rows.forEach(function (r) { r.can = true }) // vẽ lại ngay với số mới
      },
      // Đá một xung vận tốc giả để xem sóng mà không phải cuộn.
      rungThu: function (manh) {
        song.vS = manh || 40
      },
    })
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true })
  else boot()
})()
