import * as THREE from 'three'

/**
 * A lighting environment is one complete look: the HDR the metal reflects, the
 * backdrop behind the deck, the three studio lights, exposure and how heavy
 * the contact shadows read. Changing only the env map and leaving the lights
 * alone never convinces — these looks differ mostly in contrast ratio and in
 * how hard the key is.
 *
 * `sky` is the ambient gradient of the equirect; `boxes` are the soft sources
 * placed on it in (u, v) with a radial falloff. Values are linear and may go
 * far above 1 — that headroom is what gives brushed metal its highlights.
 */
export const ENVIRONMENTS = {
  studio: {
    label: 'Studio',
    sky: { top: 0.62, horizon: 0.45, bottom: 0.14, tint: [1, 1.005, 1.02] },
    boxes: [
      { u: 0.18, v: 0.2, su: 0.13, sv: 0.15, i: 5 },
      { u: 0.68, v: 0.26, su: 0.09, sv: 0.11, i: 3.2 },
      { u: 0.46, v: 0.62, su: 0.2, sv: 0.1, i: 1.1 },
      { u: 0.92, v: 0.44, su: 0.05, sv: 0.3, i: 2.4 },
      { u: 0.45, v: 0.42, su: 0.34, sv: 0.26, i: 1.05 },
    ],
    background: [
      [0, '#ffffff'],
      [0.55, '#f3f4f6'],
      [1, '#e2e4e8'],
    ],
    lights: {
      key: { color: '#ffffff', intensity: 1.35, position: [-7, 9, 12] },
      fill: { color: '#dde6ff', intensity: 0.4, position: [10, 1.5, 8] },
      rim: { color: '#ffffff', intensity: 0.45, position: [-5, -7, -9] },
      hemi: { sky: 0xffffff, ground: 0xb5bac1, intensity: 0.3 },
    },
    exposure: 0.94,
    shadow: 0.1,
    shadowRadius: 5,
    envRotation: -0.35,
  },

  day: {
    label: 'Ban ngày',
    // open overcast sky: bright dome, soft everywhere, strong ground bounce
    sky: { top: 2.1, horizon: 1.25, bottom: 0.42, tint: [0.95, 0.99, 1.1] },
    boxes: [
      { u: 0.2, v: 0.13, su: 0.22, sv: 0.2, i: 3.4, tint: [1.08, 1.02, 0.92] },
      { u: 0.72, v: 0.3, su: 0.26, sv: 0.22, i: 1.5, tint: [0.9, 0.97, 1.15] },
      { u: 0.5, v: 0.78, su: 0.4, sv: 0.16, i: 1.2, tint: [1.06, 1.02, 0.94] },
    ],
    background: [
      [0, '#f7fbff'],
      [0.5, '#e9f1fb'],
      [1, '#cddff1'],
    ],
    lights: {
      key: { color: '#fff2df', intensity: 2.2, position: [-8, 11, 10] },
      fill: { color: '#bfd8ff', intensity: 0.95, position: [11, 2.5, 7] },
      rim: { color: '#ffffff', intensity: 0.6, position: [-4, -6, -10] },
      hemi: { sky: 0xdcecff, ground: 0xc4b7a4, intensity: 0.75 },
    },
    exposure: 0.82,
    shadow: 0.16,
    shadowRadius: 7,
    envRotation: -0.45,
  },

  sun: {
    label: 'Mặt trời',
    // one hard source: tiny bright disc, deep blue sky, crisp shadows
    sky: { top: 1.35, horizon: 0.8, bottom: 0.26, tint: [0.86, 0.94, 1.16] },
    boxes: [
      { u: 0.21, v: 0.14, su: 0.022, sv: 0.026, i: 78, tint: [1.18, 1.02, 0.76] },
      { u: 0.21, v: 0.14, su: 0.14, sv: 0.13, i: 2.2, tint: [1.12, 1.03, 0.9] },
      { u: 0.66, v: 0.34, su: 0.3, sv: 0.26, i: 0.7, tint: [0.85, 0.94, 1.2] },
      { u: 0.5, v: 0.8, su: 0.4, sv: 0.16, i: 0.9, tint: [1.1, 1.02, 0.88] },
    ],
    background: [
      [0, '#fff8ee'],
      [0.5, '#f6ebdc'],
      [1, '#dfd0bd'],
    ],
    lights: {
      key: { color: '#fff0d2', intensity: 4.4, position: [-9, 8, 9] },
      fill: { color: '#a8c8ff', intensity: 0.45, position: [11, 1, 6] },
      rim: { color: '#fff6e6', intensity: 0.85, position: [-3, -6, -10] },
      hemi: { sky: 0xbcd8ff, ground: 0xcbb495, intensity: 0.4 },
    },
    exposure: 0.72,
    shadow: 0.3,
    shadowRadius: 1.6, // hard-edged, the giveaway of direct sun
    envRotation: -0.5,
  },

  lamps: {
    label: 'Đèn studio',
    // classic three-point rig on a grey seamless
    sky: { top: 0.58, horizon: 0.42, bottom: 0.15, tint: [1, 1, 1.01] },
    boxes: [
      { u: 0.16, v: 0.24, su: 0.2, sv: 0.25, i: 4.2 }, // key softbox
      { u: 0.66, v: 0.32, su: 0.15, sv: 0.18, i: 2.8 }, // fill softbox
      { u: 0.88, v: 0.5, su: 0.07, sv: 0.34, i: 2.8 }, // rim strip
      { u: 0.5, v: 0.72, su: 0.3, sv: 0.12, i: 1.1 },
    ],
    background: [
      [0, '#dfe1e4'],
      [0.55, '#c8cbcf'],
      [1, '#a9adb2'],
    ],
    lights: {
      key: { color: '#fffaf2', intensity: 2.2, position: [-8, 7, 11] },
      fill: { color: '#f2f6ff', intensity: 0.8, position: [10, 2, 8] },
      rim: { color: '#ffffff', intensity: 1.3, position: [-4, -5, -10] },
      hemi: { sky: 0xf2f4f8, ground: 0x9ba0a6, intensity: 0.35 },
    },
    exposure: 0.9,
    shadow: 0.18,
    shadowRadius: 4,
    envRotation: -0.3,
  },

  c4d: {
    label: 'Cinema 4D',
    // the product-render rig: dark surround, two tall soft panels, hot kicker
    sky: { top: 0.42, horizon: 0.28, bottom: 0.08, tint: [0.97, 0.99, 1.06] },
    boxes: [
      { u: 0.14, v: 0.42, su: 0.1, sv: 0.44, i: 4.4 }, // tall key panel
      { u: 0.62, v: 0.44, su: 0.075, sv: 0.36, i: 3.4 }, // tall fill panel
      { u: 0.4, v: 0.08, su: 0.3, sv: 0.08, i: 2.6 }, // ceiling strip
      { u: 0.86, v: 0.3, su: 0.06, sv: 0.14, i: 3.8, tint: [1.02, 1.02, 1.06] }, // kicker
    ],
    background: [
      [0, '#6b7076'],
      [0.5, '#42464c'],
      [1, '#22252a'],
    ],
    lights: {
      key: { color: '#f4f8ff', intensity: 1.7, position: [-8, 6, 12] },
      fill: { color: '#c9d6e8', intensity: 0.5, position: [11, 1, 7] },
      rim: { color: '#ffffff', intensity: 1.8, position: [-6, -4, -10] },
      hemi: { sky: 0x8f99a6, ground: 0x1d2024, intensity: 0.22 },
    },
    exposure: 1.02,
    shadow: 0.24,
    shadowRadius: 3,
    envRotation: -0.28,
  },

  night: {
    label: 'Đêm tối',
    // almost no ambient: a cool practical, a small warm one, and the display
    sky: { top: 0.05, horizon: 0.032, bottom: 0.013, tint: [0.82, 0.9, 1.2] },
    boxes: [
      { u: 0.16, v: 0.24, su: 0.07, sv: 0.09, i: 5.2, tint: [0.7, 0.84, 1.3] },
      { u: 0.78, v: 0.36, su: 0.04, sv: 0.06, i: 1.4, tint: [1.06, 0.98, 0.9] },
      { u: 0.5, v: 0.68, su: 0.24, sv: 0.1, i: 0.3, tint: [0.78, 0.87, 1.14] },
      { u: 0.44, v: 0.44, su: 0.3, sv: 0.24, i: 0.14, tint: [0.86, 0.92, 1.14] },
    ],
    background: [
      [0, '#191c21'],
      [0.5, '#111418'],
      [1, '#07080a'],
    ],
    lights: {
      key: { color: '#c4d8ff', intensity: 0.66, position: [-7, 8, 11] },
      fill: { color: '#9fb4d2', intensity: 0.24, position: [10, -1, 6] },
      rim: { color: '#a6c6ff', intensity: 0.8, position: [-5, -6, -9] },
      hemi: { sky: 0x38414f, ground: 0x0a0c10, intensity: 0.2 },
    },
    exposure: 1.28,
    shadow: 0.04,
    shadowRadius: 6,
    envRotation: -0.3,
  },
}

export const ENVIRONMENT_KEYS = Object.keys(ENVIRONMENTS)

/** Float equirect for `name`, ready for PMREMGenerator.fromEquirectangular. */
export function makeEnvironmentTexture(name, width = 512) {
  const preset = ENVIRONMENTS[name] ?? ENVIRONMENTS.studio
  const height = width / 2
  const data = new Float32Array(width * height * 4)
  const { top, horizon, bottom } = preset.sky
  const tint = preset.sky.tint ?? [1, 1, 1]

  for (let y = 0; y < height; y++) {
    const v = y / (height - 1)
    // bright dome above the horizon, darker floor below it
    const base =
      v < 0.5 ? top + (horizon - top) * (v * 2) : horizon + (bottom - horizon) * ((v - 0.5) * 2)

    for (let x = 0; x < width; x++) {
      const u = x / (width - 1)
      const ambient = Math.max(0.004, base)
      let r = ambient * tint[0]
      let g = ambient * tint[1]
      let b = ambient * tint[2]

      for (const box of preset.boxes) {
        let du = Math.abs(u - box.u)
        du = Math.min(du, 1 - du) / box.su
        const dv = Math.abs(v - box.v) / box.sv
        const e = box.i * Math.exp(-(du * du + dv * dv) * 1.6)
        const bt = box.tint ?? [1, 1, 1]
        r += e * bt[0]
        g += e * bt[1]
        b += e * bt[2]
      }

      const i = (y * width + x) * 4
      data[i] = r
      data[i + 1] = g
      data[i + 2] = b
      data[i + 3] = 1
    }
  }

  const tex = new THREE.DataTexture(data, width, height, THREE.RGBAFormat, THREE.FloatType)
  tex.mapping = THREE.EquirectangularReflectionMapping
  tex.colorSpace = THREE.NoColorSpace
  tex.needsUpdate = true
  return tex
}

/** Vertical gradient backdrop matching the environment. */
export function makeBackdropTexture(name) {
  const preset = ENVIRONMENTS[name] ?? ENVIRONMENTS.studio
  const canvas = document.createElement('canvas')
  canvas.width = 2
  canvas.height = 512
  const ctx = canvas.getContext('2d')
  const gradient = ctx.createLinearGradient(0, 0, 0, 512)
  for (const [stop, color] of preset.background) gradient.addColorStop(stop, color)
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 2, 512)

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}
