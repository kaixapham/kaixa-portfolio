import * as THREE from 'three'

/* ------------------------------------------------------------------ */
/* value noise                                                         */
/* ------------------------------------------------------------------ */

function hash2(x, y) {
  let h = x * 374761393 + y * 668265263
  h = (h ^ (h >> 13)) * 1274126177
  return ((h ^ (h >> 16)) >>> 0) / 4294967295
}

function smoothstep(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

function noise2(x, y) {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const xf = x - xi
  const yf = y - yi
  const u = xf * xf * (3 - 2 * xf)
  const v = yf * yf * (3 - 2 * yf)
  const a = hash2(xi, yi)
  const b = hash2(xi + 1, yi)
  const c = hash2(xi, yi + 1)
  const d = hash2(xi + 1, yi + 1)
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}

function fbm(x, y, octaves = 5, lacunarity = 2.03, gain = 0.5) {
  let sum = 0
  let amp = 0.5
  let norm = 0
  for (let i = 0; i < octaves; i++) {
    sum += amp * noise2(x, y)
    norm += amp
    x *= lacunarity
    y *= lacunarity
    amp *= gain
  }
  return sum / norm
}

/* nearest-feature distance on a jittered grid (worley F1) */
function worley(x, y, cell) {
  const gx = Math.floor(x / cell)
  const gy = Math.floor(y / cell)
  let best = 1e9
  for (let j = -1; j <= 1; j++) {
    for (let i = -1; i <= 1; i++) {
      const cx = gx + i
      const cy = gy + j
      const px = (cx + hash2(cx, cy * 7 + 3)) * cell
      const py = (cy + hash2(cx * 5 + 11, cy)) * cell
      const dx = x - px
      const dy = y - py
      const d = Math.sqrt(dx * dx + dy * dy)
      if (d < best) best = d
    }
  }
  return best / cell
}

function makeCanvas(size, h) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = h ?? size
  return canvas
}

function finish(canvas, { srgb = false, repeat = 1, aniso = 8 } = {}) {
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(repeat, repeat)
  tex.anisotropy = aniso
  tex.needsUpdate = true
  return tex
}

/* ------------------------------------------------------------------ */
/* bead-blasted aluminium micro surface                                */
/* ------------------------------------------------------------------ */

/** Fine isotropic grain — the "mịn" of a sandblasted anodised shell. */
export function makeBlastNormal(size = 512, strength = 1.15) {
  const height = new Float32Array(size * size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // two grain scales: dense speckle plus a slower cloud
      const speck = hash2(x, y) * 0.65 + hash2(x + 991, y + 313) * 0.35
      const cloud = fbm(x * 0.055, y * 0.055, 3)
      height[y * size + x] = speck * 0.72 + cloud * 0.28
    }
  }

  // one cheap box blur so the speckle reads as bumps, not white noise
  const blurred = new Float32Array(size * size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let sum = 0
      for (let j = -1; j <= 1; j++) {
        for (let i = -1; i <= 1; i++) {
          const sx = (x + i + size) % size
          const sy = (y + j + size) % size
          sum += height[sy * size + sx]
        }
      }
      blurred[y * size + x] = sum / 9
    }
  }

  const canvas = makeCanvas(size)
  const ctx = canvas.getContext('2d')
  const img = ctx.createImageData(size, size)
  const at = (x, y) => blurred[((y + size) % size) * size + ((x + size) % size)]

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength * 6
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength * 6
      let nx = -dx
      let ny = -dy
      const nz = 1
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz)
      nx /= len
      ny /= len
      const i = (y * size + x) * 4
      img.data[i] = (nx * 0.5 + 0.5) * 255
      img.data[i + 1] = (ny * 0.5 + 0.5) * 255
      img.data[i + 2] = (nz / len + 0.5) * 255
      img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  return finish(canvas, { repeat: 1 })
}

/**
 * Directional brush grain. Bead blasting gives isotropic speckle; brushing
 * drags the abrasive one way, so the height field has to be stretched hard
 * along one axis. Pair this with MeshPhysicalMaterial.anisotropy — the normal
 * map alone gives streaks but not the elongated specular lobe.
 */
export function makeBrushedNormal(size = 512, strength = 1, stretch = 46) {
  const height = new Float32Array(size * size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // long thin streaks across U, plus a slow waviness so it is not a comb
      const streak = fbm(x / stretch, y * 1.35, 4)
      const fine = hash2(Math.floor(x / 3), y) * 0.5 + hash2(x, y) * 0.5
      const wave = fbm(x * 0.01, y * 0.06, 3)
      height[y * size + x] = streak * 0.5 + fine * 0.22 + wave * 0.28
    }
  }

  const canvas = makeCanvas(size)
  const ctx = canvas.getContext('2d')
  const img = ctx.createImageData(size, size)
  const at = (x, y) => height[((y + size) % size) * size + ((x + size) % size)]

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // sample wider across the streaks than along them
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength * 2.2
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength * 9
      let nx = -dx
      let ny = -dy
      const len = Math.sqrt(nx * nx + ny * ny + 1)
      const i = (y * size + x) * 4
      img.data[i] = ((nx / len) * 0.5 + 0.5) * 255
      img.data[i + 1] = ((ny / len) * 0.5 + 0.5) * 255
      img.data[i + 2] = (1 / len) * 0.5 * 255 + 127
      img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  return finish(canvas)
}

/**
 * Turn an imported photo into a tangent-space normal map by reading its
 * luminance as height. This is what makes an uploaded surface photo actually
 * catch light instead of sitting on the metal as a flat decal.
 */
export function normalFromImage(image, size = 512, strength = 1) {
  const src = makeCanvas(size)
  const sctx = src.getContext('2d')
  sctx.drawImage(image, 0, 0, size, size)
  const pixels = sctx.getImageData(0, 0, size, size).data

  const height = new Float32Array(size * size)
  for (let i = 0; i < size * size; i++) {
    const o = i * 4
    height[i] = (pixels[o] * 0.299 + pixels[o + 1] * 0.587 + pixels[o + 2] * 0.114) / 255
  }

  const canvas = makeCanvas(size)
  const ctx = canvas.getContext('2d')
  const img = ctx.createImageData(size, size)
  const at = (x, y) => height[((y + size) % size) * size + ((x + size) % size)]

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength * 8
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength * 8
      const len = Math.sqrt(dx * dx + dy * dy + 1)
      const o = (y * size + x) * 4
      img.data[o] = ((-dx / len) * 0.5 + 0.5) * 255
      img.data[o + 1] = ((-dy / len) * 0.5 + 0.5) * 255
      img.data[o + 2] = (1 / len) * 0.5 * 255 + 127
      img.data[o + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  return finish(canvas)
}

/** Low-frequency roughness drift so highlights breathe across the shell. */
export function makeRoughnessDrift(size = 256, low = 0.82, high = 1.06) {
  const canvas = makeCanvas(size)
  const ctx = canvas.getContext('2d')
  const img = ctx.createImageData(size, size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // two bands: a slow drift plus a finer mottle. Real blasted metal never
      // has a perfectly even roughness, and that breakup is most of what makes
      // a matte highlight read as a surface instead of a flat grey fill.
      const slow = fbm(x * 0.012, y * 0.012, 4)
      const fine = fbm(x * 0.09 + 31, y * 0.09 - 17, 3)
      const n = slow * 0.72 + fine * 0.28
      const v = Math.min(1, low + (high - low) * n)
      const i = (y * size + x) * 4
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v * 255
      img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  return finish(canvas)
}

/* ------------------------------------------------------------------ */
/* wear layer: brushing, scratches, gouges                             */
/* ------------------------------------------------------------------ */

/** Small seeded PRNG so a given seed always redraws the same wear. */
function rng(seed) {
  let a = seed >>> 0
  return () => {
    a += 0x6d2b79f5
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const WEAR_KINDS = {
  none: { label: 'Không' },
  brushed: {
    label: 'Xước chải',
    count: 5200,
    length: [0.45, 1.1],
    width: [0.4, 1.4],
    spread: 0.035, // radians around the brush direction
    bite: 0.1, // how far it cuts into the height field
    rough: -0.22, // negative = the scratch polishes, so it reads shinier
  },
  scratched: {
    label: 'Xước dăm',
    count: 900,
    length: [0.04, 0.4],
    width: [0.5, 2.1],
    spread: 0.55,
    bite: 0.32,
    rough: -0.34,
  },
  worn: {
    label: 'Trầy mòn',
    count: 1700,
    length: [0.008, 0.11],
    width: [0.7, 3.0],
    spread: Math.PI,
    bite: 0.46,
    rough: 0.3, // gouges tear the surface open, so they go rougher
  },
}

/**
 * Draw a wear layer and derive both a normal map and a roughness map from it.
 *
 * Roughness is the half that matters. A scratch reads as a scratch because it
 * catches light differently from the metal around it, not because it is a
 * different colour — driving only the normal map gives plastic-looking grooves.
 */
export function makeWearMaps(kind, size = 1024, opts = {}) {
  const spec = WEAR_KINDS[kind]
  const { density = 1, depth = 1, angle = 0, contrast = 1, seed = 7 } = opts

  const heightCanvas = makeCanvas(size)
  const ctx = heightCanvas.getContext('2d')
  ctx.fillStyle = '#808080'
  ctx.fillRect(0, 0, size, size)
  ctx.lineCap = 'round'

  if (spec && kind !== 'none') {
    const random = rng(seed)
    const count = Math.round(spec.count * density)
    const base = (angle * Math.PI) / 180

    for (let i = 0; i < count; i++) {
      const theta = base + (random() - 0.5) * 2 * spec.spread
      const len = (spec.length[0] + random() * (spec.length[1] - spec.length[0])) * size
      const x = random() * size
      const y = random() * size
      const cut = spec.bite * depth * (0.35 + random() * 0.65)
      // a scratch is a groove with a lip: one dark stroke, one light beside it
      const shade = Math.round(128 - cut * 110)
      const light = Math.round(128 + cut * 70)
      const w = spec.width[0] + random() * (spec.width[1] - spec.width[0])

      const dx = Math.cos(theta) * len
      const dy = Math.sin(theta) * len
      const nx = -Math.sin(theta) * w * 0.8
      const ny = Math.cos(theta) * w * 0.8

      ctx.strokeStyle = `rgb(${light},${light},${light})`
      ctx.lineWidth = w * 0.7
      ctx.beginPath()
      ctx.moveTo(x + nx, y + ny)
      ctx.lineTo(x + dx + nx, y + dy + ny)
      ctx.stroke()

      ctx.strokeStyle = `rgb(${shade},${shade},${shade})`
      ctx.lineWidth = w
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + dx, y + dy)
      ctx.stroke()
    }
  }

  const pixels = ctx.getImageData(0, 0, size, size).data
  const height = new Float32Array(size * size)
  for (let i = 0; i < size * size; i++) height[i] = pixels[i * 4] / 255

  const at = (x, y) => height[((y + size) % size) * size + ((x + size) % size)]

  const normalCanvas = makeCanvas(size)
  const nctx = normalCanvas.getContext('2d')
  const nimg = nctx.createImageData(size, size)

  const roughCanvas = makeCanvas(size)
  const rctx = roughCanvas.getContext('2d')
  const rimg = rctx.createImageData(size, size)

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * 9 * depth
      const dy = (at(x, y + 1) - at(x, y - 1)) * 9 * depth
      const len = Math.sqrt(dx * dx + dy * dy + 1)
      const i = (y * size + x) * 4
      nimg.data[i] = ((-dx / len) * 0.5 + 0.5) * 255
      nimg.data[i + 1] = ((-dy / len) * 0.5 + 0.5) * 255
      nimg.data[i + 2] = (1 / len) * 0.5 * 255 + 127
      nimg.data[i + 3] = 255

      // slow drift so the matte areas breathe, then the wear on top of it
      const drift = fbm(x * 0.011, y * 0.011, 4) * 0.24 + 0.82
      const mark = (height[y * size + x] - 0.5) * 2 // -1 groove, +1 lip
      const r = drift + Math.abs(mark) * (spec?.rough ?? 0) * contrast
      const c = Math.round(Math.min(1, Math.max(0, r)) * 255)
      rimg.data[i] = rimg.data[i + 1] = rimg.data[i + 2] = c
      rimg.data[i + 3] = 255
    }
  }

  nctx.putImageData(nimg, 0, 0)
  rctx.putImageData(rimg, 0, 0)

  return { normal: finish(normalCanvas), roughness: finish(roughCanvas) }
}

/** Soft rubberised dome for the push buttons. */
export function makeButtonNormal(size = 256) {
  const canvas = makeCanvas(size)
  const ctx = canvas.getContext('2d')
  const img = ctx.createImageData(size, size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n = fbm(x * 0.22, y * 0.22, 3)
      const m = fbm(x * 0.9 + 40, y * 0.9 + 90, 2)
      const h = n * 0.6 + m * 0.4
      const dx = (fbm((x + 1) * 0.22, y * 0.22, 3) - fbm((x - 1) * 0.22, y * 0.22, 3)) * 3
      const dy = (fbm(x * 0.22, (y + 1) * 0.22, 3) - fbm(x * 0.22, (y - 1) * 0.22, 3)) * 3
      let nx = -dx
      let ny = -dy
      const len = Math.sqrt(nx * nx + ny * ny + 1)
      const i = (y * size + x) * 4
      img.data[i] = (nx / len * 0.5 + 0.5) * 255
      img.data[i + 1] = (ny / len * 0.5 + 0.5) * 255
      img.data[i + 2] = (1 / len * 0.5 + 0.5) * 255
      img.data[i + 3] = 255 * (0.5 + h * 0.5)
    }
  }
  ctx.putImageData(img, 0, 0)
  return finish(canvas)
}

/* ------------------------------------------------------------------ */
/* CD artwork — kaleidoscopic fluid-acrylic pour                       */
/* ------------------------------------------------------------------ */

const LABEL_INNER = 0.335 // white hub, fraction of outer radius
const LABEL_RIM = 0.968 // black outer band starts here

/**
 * Poured acrylic sampled in (angle, radius) space: the cells stretch into
 * radial petals the way paint does when it is spun on a disc.
 */
function pourField(theta, r) {
  const ax = theta * 3.1 * (0.5 + r * 1.1)
  const ay = r * 3.6

  // domain warp for the poured-paint drift
  const wx = fbm(ax * 0.8 + 11.2, ay * 0.8 - 4.7, 4)
  const wy = fbm(ax * 0.8 - 8.3, ay * 0.8 + 19.1, 4)
  const qx = ax + (wx - 0.5) * 1.55
  const qy = ay + (wy - 0.5) * 1.55

  // two scales of ridged noise: big lobes, then the cell walls inside them
  const lobes = 1 - Math.abs(fbm(qx * 0.46, qy * 0.46, 4) * 2 - 1)
  const base = fbm(qx * 0.92, qy * 0.92, 5)
  const ridged = 1 - Math.abs(base * 2 - 1)

  const body = smoothstep(0.2, 0.56, ridged)
  const wall = 1 - smoothstep(0.0, 0.034, Math.abs(ridged - 0.45))
  const lobeWall = 1 - smoothstep(0.0, 0.05, Math.abs(lobes - 0.5))

  // outlined bubbles, densest through the middle band of the disc
  const bubbleBand = smoothstep(0.2, 0.36, r) * (1 - smoothstep(0.7, 1.0, r))
  const w = worley(qx * 1.15 + 5, qy * 1.15 + 5, 0.22)
  const outline = 1 - smoothstep(0.0, 0.1, Math.abs(w - 0.44))

  // broad tonal drift plus a soft radial striation
  const tone = fbm(qx * 0.5 + 3.3, qy * 0.5 - 6.1, 4)
  const streak = fbm(ax * 1.7 - 2.0, ay * 4.2 + 8.0, 3)

  let v = 0.86 + tone * 0.2
  v *= 0.88 + body * 0.18
  v *= 0.955 + streak * 0.09
  // keep the outer half articulated instead of washing out to blank white
  const reach = 0.72 + r * 0.6
  v -= wall * 0.5 * reach
  v -= lobeWall * 0.3 * reach
  v -= outline * bubbleBand * 0.46
  return Math.min(1, Math.max(0, v))
}

/**
 * Grayscale acrylic-pour label with radial symmetry, CD grooves,
 * printed hub and a black outer band. Returns { map, roughnessMap }.
 */
export function makeDiscArtwork(size = 1024, sectors = 9) {
  const canvas = makeCanvas(size)
  const ctx = canvas.getContext('2d')
  const rough = makeCanvas(size)
  const rctx = rough.getContext('2d')

  const img = ctx.createImageData(size, size)
  const rimg = rctx.createImageData(size, size)
  const half = size / 2
  const sector = (Math.PI * 2) / sectors

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x - half) / half
      const dy = (y - half) / half
      const r = Math.sqrt(dx * dx + dy * dy)
      const i = (y * size + x) * 4

      if (r > 1.0) {
        img.data[i] = img.data[i + 1] = img.data[i + 2] = 10
        img.data[i + 3] = 255
        rimg.data[i] = rimg.data[i + 1] = rimg.data[i + 2] = 160
        rimg.data[i + 3] = 255
        continue
      }

      // kaleidoscope fold
      let theta = Math.atan2(dy, dx)
      let t = ((theta % sector) + sector) % sector
      if (t > sector * 0.5) t = sector - t

      let v = pourField(t, r)

      // fine pressed grooves across the whole face
      const grooves = 0.5 + 0.5 * Math.sin(r * 1180)
      v *= 0.955 + grooves * 0.045

      // black outer band
      const rim = smoothstep(LABEL_RIM, LABEL_RIM + 0.006, r)
      v = v * (1 - rim) + 0.035 * rim

      // white printed hub
      const hub = 1 - smoothstep(LABEL_INNER - 0.006, LABEL_INNER, r)
      v = v * (1 - hub) + (0.93 + grooves * 0.05) * hub

      const c = Math.round(Math.min(1, Math.max(0, v)) * 255)
      img.data[i] = img.data[i + 1] = img.data[i + 2] = c
      img.data[i + 3] = 255

      // grooves drive the roughness so the sheen sweeps as it turns
      const rv = 0.30 + grooves * 0.16 + (1 - v) * 0.34 + rim * 0.30
      const rc = Math.round(Math.min(1, rv) * 255)
      rimg.data[i] = rimg.data[i + 1] = rimg.data[i + 2] = rc
      rimg.data[i + 3] = 255
    }
  }

  ctx.putImageData(img, 0, 0)
  rctx.putImageData(rimg, 0, 0)

  drawHubPrint(ctx, size)

  return {
    map: finish(canvas, { srgb: true, aniso: 16 }),
    roughnessMap: finish(rough, { aniso: 16 }),
  }
}

function arcText(ctx, text, radius, centerAngle, size, spread, flip = false) {
  ctx.save()
  ctx.font = `600 ${size}px "Helvetica Neue", Arial, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const chars = [...text]
  const step = spread / Math.max(1, chars.length - 1)
  let angle = centerAngle - spread / 2
  for (const ch of chars) {
    ctx.save()
    ctx.rotate(angle)
    ctx.translate(0, flip ? radius : -radius)
    if (flip) ctx.rotate(Math.PI)
    ctx.fillText(ch, 0, 0)
    ctx.restore()
    angle += step
  }
  ctx.restore()
}

function drawHubPrint(ctx, size) {
  const half = size / 2
  ctx.save()
  ctx.translate(half, half)

  // hairline circles on the printed hub
  ctx.strokeStyle = 'rgba(24, 24, 28, 0.35)'
  ctx.lineWidth = size * 0.0014
  for (const f of [0.132, 0.315, 0.33]) {
    ctx.beginPath()
    ctx.arc(0, 0, half * f, 0, Math.PI * 2)
    ctx.stroke()
  }

  ctx.fillStyle = 'rgba(22, 22, 26, 0.78)'
  arcText(ctx, 'THE VISUAL ALBUM', half * 0.245, 0, size * 0.0165, 1.28)
  arcText(ctx, 'WATER · ACRYLIC', half * 0.245, Math.PI, size * 0.0165, 1.28, true)

  ctx.font = `600 ${size * 0.0155}px "Helvetica Neue", Arial, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('2005', -half * 0.235, 0)
  ctx.fillText('2025', half * 0.235, 0)

  // centre hole
  ctx.fillStyle = '#0d0d10'
  ctx.beginPath()
  ctx.arc(0, 0, half * 0.108, 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()
}
