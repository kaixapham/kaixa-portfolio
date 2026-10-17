/**
 * A look is a patch, not a full snapshot: it sets colour, material, lighting
 * and screen — the things that make a render read a certain way — and leaves
 * the structural geometry (ratios, sizes, positions) alone, so applying one
 * never throws away the shape you tuned.
 *
 * All five stay inside one family: bead-blasted metal from bright silver down
 * to near black, matte the way the reference render is — mid-high roughness,
 * almost no clearcoat, fine even grain. What separates them is value and
 * colour temperature, not gloss and not hue. Backgrounds are pure black across
 * the board so the only thing lighting the deck is its own rig.
 */
export const LOOKS = {
  silver: {
    label: 'Silver',
    note: 'Nhôm phun cát lạnh, rim tách khối, nền đen tuyền',
    params: {
      body: { backTone: 0.68 },
      strip: { tone: 0.76, panelTone: 0.58 },
      asset: { tone: 0.72 },
      disc: { gloss: 0.42 },
      buttons: { surface: 'matte', face: 'flat', iconColor: '#f2f2f2' },
      leds: { color: '#ffffff' },
    },
    state: {
      intensity: 0.5,
      hue: 36,
      material: {
        finish: 'blasted',
        color: '#9a9ea2',
        roughness: 0.52,
        metalness: 0.94,
        anisotropy: 0,
        rotation: 0,
        grainScale: 1.2,
        grainDensity: 1.1,
        clearcoat: 0.06,
        clearcoatRoughness: 0.7,
        screenReflection: 0.3,
        texBlend: 0, // a look starts from clean metal; raise it in the Vật liệu tab
      },
    },
    env: {
      preset: 'c4d',
      intensity: 0.62,
      rotation: 249,
      exposure: 0.9,
      shadow: 0.7,
      background: '#000000',
      rig: {
        key: { color: '#f4f8ff', intensity: 1.45 },
        fill: { color: '#c9d6e8', intensity: 0.38 },
        rim: { color: '#ffffff', intensity: 1.15 },
        hemi: { intensity: 0.16 },
      },
    },
  },

  graphite: {
    label: 'Graphite',
    note: 'Graphite ấm, bề mặt lì, một đèn key mềm — bám sát ảnh tham khảo',
    params: {
      body: { backTone: 0.78 },
      strip: { tone: 0.84, panelTone: 0.72 },
      asset: { tone: 0.96 },
      disc: { gloss: 0.24, backdropGap: 0.02 },
      buttons: { surface: 'matte', face: 'convex', iconColor: '#e6e6e6' },
      leds: { color: '#ff8a1e' },
    },
    state: {
      intensity: 0.09,
      hue: 32,
      material: {
        finish: 'blasted',
        color: '#78776f', // warm graphite
        roughness: 0.64,
        metalness: 0.88,
        anisotropy: 0,
        rotation: 0,
        grainScale: 1.35,
        grainDensity: 1.1,
        clearcoat: 0.05,
        clearcoatRoughness: 0.75,
        screenReflection: 0.1,
        texBlend: 0, // a look starts from clean metal; raise it in the Vật liệu tab
      },
    },
    env: {
      preset: 'lamps',
      intensity: 0.46,
      rotation: 208,
      exposure: 0.86,
      shadow: 0.45,
      background: '#000000',
      rig: {
        key: { color: '#fff4e4', intensity: 1.5 },
        fill: { color: '#dfe6f2', intensity: 0.32 },
        rim: { color: '#ffffff', intensity: 0.5 },
        hemi: { intensity: 0.14 },
      },
    },
  },

  titanium: {
    label: 'Titanium',
    note: 'Xám titan lạnh, xước ngang nhẹ, sáng đều',
    params: {
      body: { backTone: 0.62 },
      strip: { tone: 0.72, panelTone: 0.52 },
      asset: { tone: 0.68 },
      disc: { gloss: 0.46 },
      buttons: { surface: 'matte', face: 'flat', iconColor: '#eceff2' },
      leds: { color: '#dfe9f5' },
    },
    state: {
      intensity: 0.42,
      hue: 210,
      material: {
        finish: 'brushed',
        color: '#8d9298', // cooler and a touch darker than silver
        roughness: 0.46,
        metalness: 1,
        anisotropy: 0.55,
        rotation: 0,
        grainScale: 1.1,
        grainDensity: 1.2,
        clearcoat: 0.05,
        clearcoatRoughness: 0.6,
        screenReflection: 0.24,
        texBlend: 0, // a look starts from clean metal; raise it in the Vật liệu tab
      },
    },
    env: {
      preset: 'lamps',
      intensity: 0.6,
      rotation: 150,
      exposure: 0.9,
      shadow: 0.6,
      background: '#000000',
      rig: {
        key: { color: '#eef4ff', intensity: 1.7 },
        fill: { color: '#cfe0f5', intensity: 0.42 },
        rim: { color: '#ffffff', intensity: 0.9 },
        hemi: { intensity: 0.18 },
      },
    },
  },

  gunmetal: {
    label: 'Gunmetal',
    note: 'Thép xám tối, tương phản cao, viền sáng mảnh',
    params: {
      body: { backTone: 0.84 },
      strip: { tone: 0.9, panelTone: 0.78 },
      asset: { tone: 0.9 },
      disc: { gloss: 0.5 },
      buttons: { surface: 'matte', face: 'flat', iconColor: '#dfe3e7' },
      leds: { color: '#ffffff' },
    },
    state: {
      intensity: 0.55,
      hue: 210,
      material: {
        finish: 'steel',
        color: '#5f646a',
        roughness: 0.5,
        metalness: 1,
        anisotropy: 0.3,
        rotation: 0,
        grainScale: 1.2,
        grainDensity: 1.15,
        clearcoat: 0.05,
        clearcoatRoughness: 0.55,
        screenReflection: 0.3,
        texBlend: 0, // a look starts from clean metal; raise it in the Vật liệu tab
      },
    },
    env: {
      preset: 'c4d',
      intensity: 0.7,
      rotation: 40,
      exposure: 0.95,
      shadow: 0.8,
      background: '#000000',
      rig: {
        key: { color: '#f2f6ff', intensity: 1.5 },
        fill: { color: '#b9c8dc', intensity: 0.3 },
        rim: { color: '#ffffff', intensity: 1.6 },
        hemi: { intensity: 0.12 },
      },
    },
  },

  onyx: {
    label: 'Onyx',
    note: 'Anodized đen, gần như chỉ còn đường viền và màn hình',
    params: {
      body: { backTone: 0.94 },
      strip: { tone: 0.97, panelTone: 0.9 },
      asset: { tone: 0.96 },
      disc: { gloss: 0.58 },
      buttons: { surface: 'rubber', face: 'flat', iconColor: '#cfd4d9' },
      leds: { color: '#ffffff' },
    },
    state: {
      intensity: 0.95,
      hue: 210,
      material: {
        finish: 'anodised',
        color: '#3c4046',
        roughness: 0.56,
        metalness: 0.92,
        anisotropy: 0.12,
        rotation: 0,
        grainScale: 1.3,
        grainDensity: 1.1,
        clearcoat: 0.1,
        clearcoatRoughness: 0.68,
        screenReflection: 0.4,
        texBlend: 0, // a look starts from clean metal; raise it in the Vật liệu tab
      },
    },
    env: {
      preset: 'night',
      intensity: 1.15,
      rotation: 0,
      exposure: 1.24,
      shadow: 0.9,
      background: '#000000',
      rig: {
        key: { color: '#dbe6ff', intensity: 0.95 },
        fill: { color: '#9fb4d2', intensity: 0.24 },
        rim: { color: '#cfe0ff', intensity: 1.25 },
        hemi: { intensity: 0.18 },
      },
    },
  },
}

export const LOOK_KEYS = Object.keys(LOOKS)
