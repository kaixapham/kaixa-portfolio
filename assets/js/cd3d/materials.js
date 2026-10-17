import * as THREE from 'three'
import {
  makeBlastNormal,
  makeBrushedNormal,
  makeButtonNormal,
  makeDiscArtwork,
  makeRoughnessDrift,
  makeWearMaps,
  normalFromImage,
  WEAR_KINDS,
} from './textures.js'

const DARKEST = new THREE.Color('#191c1f')

/**
 * Metal finishes, from real reference rather than taste. Aluminium reflects
 * near-neutral and bright (~0.9); steel is noticeably darker (~0.56). Bead
 * blasting leaves isotropic micro-roughness, brushing leaves a directional
 * grain — and only the second one wants `anisotropy`, which is what stretches
 * the specular lobe along the brush. An environment map is mandatory for all
 * of them; without one, metal renders black.
 */
export const FINISHES = {
  blasted: {
    label: 'Nhôm phun cát',
    color: '#9ea2a6',
    metalness: 0.95,
    roughness: 0.42,
    anisotropy: 0,
    clearcoat: 0.12,
    clearcoatRoughness: 0.62,
    grain: 'blast',
    normalScale: 0.28,
  },
  brushed: {
    label: 'Nhôm xước',
    color: '#a9adb1',
    metalness: 1,
    roughness: 0.3,
    anisotropy: 0.85,
    clearcoat: 0.08,
    clearcoatRoughness: 0.5,
    grain: 'brushed',
    normalScale: 0.4,
  },
  anodised: {
    label: 'Anodized',
    color: '#8e9297',
    metalness: 0.9,
    roughness: 0.52,
    anisotropy: 0.15,
    clearcoat: 0.22,
    clearcoatRoughness: 0.7,
    grain: 'blast',
    normalScale: 0.34,
  },
  steel: {
    label: 'Thép mờ',
    color: '#7c8085',
    metalness: 1,
    roughness: 0.36,
    anisotropy: 0.4,
    clearcoat: 0.06,
    clearcoatRoughness: 0.42,
    grain: 'brushed',
    normalScale: 0.3,
  },
  chrome: {
    label: 'Chrome',
    color: '#c6c9cd',
    metalness: 1,
    roughness: 0.06,
    anisotropy: 0,
    clearcoat: 0.4,
    clearcoatRoughness: 0.05,
    grain: 'blast',
    normalScale: 0.06,
  },
  plasticGloss: {
    // injection-moulded ABS: no metalness at all, a hard clearcoat over a
    // diffuse body — the look of a piano-black music player shell
    label: 'Nhựa bóng',
    color: '#b7bbc0',
    metalness: 0,
    roughness: 0.16,
    anisotropy: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    grain: 'blast',
    normalScale: 0.05,
  },
  plasticMatte: {
    // soft-touch / bead-textured plastic, the other half of every player
    label: 'Nhựa mờ',
    color: '#9aa0a6',
    metalness: 0,
    roughness: 0.62,
    anisotropy: 0,
    clearcoat: 0.22,
    clearcoatRoughness: 0.55,
    grain: 'blast',
    normalScale: 0.42,
  },
  matte: {
    label: 'Sơn nhám',
    color: '#8d9195',
    metalness: 0.08,
    roughness: 0.72,
    anisotropy: 0,
    clearcoat: 0.28,
    clearcoatRoughness: 0.6,
    grain: 'blast',
    normalScale: 0.5,
  },
}

export const FINISH_KEYS = Object.keys(FINISHES)
export { WEAR_KINDS }

/**
 * A `map` on a metal replaces its reflection colour outright, which is far too
 * strong for a surface photo. Patch the map chunk so the texture is mixed in
 * by a uniform instead — 0 leaves the alloy untouched, 1 is the raw photo.
 */
function installTextureBlend(material) {
  const uTexBlend = { value: 0 }
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTexBlend = uTexBlend
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uTexBlend;')
      .replace(
        '#include <map_fragment>',
        `#ifdef USE_MAP
           vec4 blendTexel = texture2D( map, vMapUv );
           diffuseColor *= mix( vec4( 1.0 ), blendTexel, uTexBlend );
         #endif`,
      )
  }
  material.customProgramCacheKey = () => 'texblend'
  return uTexBlend
}

const BUTTON_SURFACES = {
  matte: { metalness: 0.16, roughness: 0.5, clearcoat: 0.7, clearcoatRoughness: 0.22 },
  gloss: { metalness: 0.32, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.05 },
  rubber: { metalness: 0.04, roughness: 0.78, clearcoat: 0.14, clearcoatRoughness: 0.75 },
}

/**
 * One shared library of surfaces. Everything metal is bead-blasted aluminium:
 * full metalness, mid roughness, a very fine normal grain and a slow roughness
 * drift so the highlight never reads as a flat plastic blob.
 */
export function createMaterials() {
  const blast = makeBlastNormal(512, 1.1)
  const brushedGrain = makeBrushedNormal(512, 1)
  const drift = makeRoughnessDrift(256)
  const buttonGrain = makeButtonNormal(256)
  const artwork = makeDiscArtwork(1024, 9)

  const tiled = (texture, x, y) => {
    const copy = texture.clone()
    copy.repeat.set(x, y)
    copy.needsUpdate = true
    return copy
  }

  const SHELL_BASE = new THREE.Color(FINISHES.blasted.color)
  const grainSets = new Map()
  const grainFor = (mat, x, y) => {
    grainSets.set(mat, {
      blast: tiled(blast, x, y),
      brushed: tiled(brushedGrain, x, y),
      base: [x, y],
    })
    return grainSets.get(mat).blast
  }

  const shellGrain = tiled(blast, 9, 11)
  const stripGrain = tiled(blast, 4, 15) // heavier, tighter grain on the dark strip
  const knobGrain = tiled(blast, 6, 2)
  const shellDrift = tiled(drift, 1.4, 1.8)

  const metal = (color, roughness, opts = {}) =>
    new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(color),
      metalness: 0.95,
      roughness,
      envMapIntensity: 0.62,
      ...opts,
    })

  const shell = metal('#9ea2a6', 0.42, {
    normalMap: shellGrain,
    normalScale: new THREE.Vector2(0.28, 0.28),
    roughnessMap: shellDrift,
    clearcoat: 0.12,
    clearcoatRoughness: 0.62,
  })

  // rear half of the side wall: same alloy, darker anodising
  const shellBack = shell.clone()
  shellBack.color = new THREE.Color('#6c7074')

  // the strip section: part of the same shell, darker and more textured
  const stripBand = metal('#4a4e52', 0.54, {
    normalMap: stripGrain,
    normalScale: new THREE.Vector2(0.46, 0.46),
    roughnessMap: drift,
    clearcoat: 0.08,
    clearcoatRoughness: 0.72,
  })

  // the inner plate the controls sit on
  const plate = metal('#5e6266', 0.5, {
    normalMap: tiled(blast, 3, 13),
    normalScale: new THREE.Vector2(0.34, 0.34),
    roughnessMap: drift,
  })

  const knobBody = metal('#a2a6aa', 0.36, {
    normalMap: knobGrain,
    normalScale: new THREE.Vector2(0.24, 0.24),
    roughnessMap: drift,
  })

  const knobTop = metal('#989ca0', 0.44, { envMapIntensity: 0.52 })

  // soft-touch anodised buttons
  const button = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#1b1e21'),
    normalMap: buttonGrain,
    normalScale: new THREE.Vector2(0.05, 0.05),
    envMapIntensity: 0.4,
    ...BUTTON_SURFACES.matte,
  })

  const buttonWell = metal('#2c2f33', 0.62, { normalMap: stripGrain, envMapIntensity: 0.4 })
  const screw = metal('#7e8286', 0.34)
  // both screw walls are seen from inside when sunk and outside when proud
  const screwWall = metal('#7e8286', 0.34)
  screwWall.side = THREE.DoubleSide

  const screwRecess = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#15171a'),
    metalness: 0.45,
    roughness: 0.85,
    envMapIntensity: 0.35,
    side: THREE.DoubleSide,
  })

  // deep shadow inside the parting slot and the screen recess
  const slot = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#111316'),
    metalness: 0.2,
    roughness: 0.8,
    envMapIntensity: 0.25,
  })

  const screenWell = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#08090c'),
    metalness: 0.1,
    roughness: 0.45,
  })

  // the recessed black bed the disc drops into
  const discBed = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#0a0b0d'),
    metalness: 0.25,
    roughness: 0.38,
    clearcoat: 0.4,
    clearcoatRoughness: 0.3,
    envMapIntensity: 0.7,
  })
  const discBedWall = discBed.clone()
  discBedWall.side = THREE.DoubleSide
  discBedWall.roughness = 0.55

  // light plate under the imported graphic, and the graphic itself
  const assetPlate = metal('#c9ccd0', 0.46, { normalMap: shellGrain, envMapIntensity: 0.5 })

  // side-edge label plate, plus the artwork someone drops onto it
  const tagPlate = metal('#8d9195', 0.5, { normalMap: stripGrain, envMapIntensity: 0.5 })
  const tagOverlay = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: null,
    transparent: true,
    roughness: 0.55,
    metalness: 0,
    envMapIntensity: 0.4,
  })

  // the power switch takes its colour from the edge it sits on
  const powerPad = metal('#4a4e52', 0.55, { normalMap: stripGrain, envMapIntensity: 0.45 })
  const powerIcon = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#c8ccd0'),
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  })
  const assetOverlay = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: null,
    transparent: true,
    roughness: 0.62,
    metalness: 0,
    envMapIntensity: 0.4,
  })

  // black display glass sitting over the emissive shader plane
  const glass = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#05060a'),
    metalness: 0,
    roughness: 0.06,
    transparent: true,
    opacity: 0.2,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
    envMapIntensity: 1.1,
  })

  // the graphic bar gets the same glass, kept clearer so the artwork reads
  const assetGlass = glass.clone()
  assetGlass.color = new THREE.Color('#0a0c10')

  const discFace = new THREE.MeshPhysicalMaterial({
    map: artwork.map,
    roughnessMap: artwork.roughnessMap,
    color: new THREE.Color('#ffffff'),
    metalness: 0.62,
    roughness: 0.24,
    iridescence: 0.14,
    iridescenceIOR: 1.4,
    iridescenceThicknessRange: [180, 520],
    envMapIntensity: 0.85,
    side: THREE.FrontSide,
  })

  const discBack = metal('#c6c9cd', 0.16, {
    metalness: 1,
    iridescence: 0.5,
    iridescenceThicknessRange: [220, 640],
    side: THREE.BackSide,
  })

  const discEdge = metal('#0e0f12', 0.3)

  const ledOn = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#ff8a1e'),
    toneMapped: false,
  })
  const ledOff = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#5a5e62'),
    metalness: 0.3,
    roughness: 0.5,
  })

  // materials whose roughness the UI slider drives, with their offsets
  const roughnessRig = [
    [shell, 0],
    [shellBack, 0.05],
    [stripBand, 0.12],
    [plate, 0.08],
    [knobBody, -0.06],
    [knobTop, -0.02],
    [buttonWell, 0.2],
    [assetPlate, 0.04],
    [tagPlate, 0.06],
    [powerPad, 0.14],
    [screw, -0.08],
    [screwWall, -0.08],
  ]

  const envRig = [
    shell,
    shellBack,
    stripBand,
    plate,
    knobBody,
    knobTop,
    button,
    buttonWell,
    screw,
    screwWall,
    screwRecess,
    slot,
    screenWell,
    discBed,
    discBedWall,
    assetPlate,
    assetOverlay,
    tagPlate,
    tagOverlay,
    powerPad,
    powerIcon,
    discFace,
    discBack,
    discEdge,
  ].map((mat) => [mat, mat.envMapIntensity ?? 1])

  // every surface that should follow the chosen metal finish
  const metalFamily = [shell, shellBack, stripBand, plate, knobBody, knobTop, assetPlate, screw]
  grainFor(shell, 9, 11)
  grainFor(shellBack, 9, 11)
  grainFor(stripBand, 4, 15)
  grainFor(plate, 3, 13)
  grainFor(knobBody, 6, 2)
  grainFor(knobTop, 6, 2)
  grainFor(assetPlate, 9, 11)
  grainFor(screw, 4, 4)

  // three independent texture channels: the shell, the volume knob and the
  // push buttons each take their own import, blend, relief and scale
  const CHANNELS = {
    shell: [shell, shellBack, stripBand, plate, assetPlate, screw],
    knob: [knobBody, knobTop],
    button: [button, buttonWell],
  }
  const channelOf = new Map()
  for (const [name, mats] of Object.entries(CHANNELS)) {
    for (const mat of mats) channelOf.set(mat, name)
  }

  const blendUniforms = new Map(
    Object.values(CHANNELS)
      .flat()
      .map((m) => [m, installTextureBlend(m)]),
  )

  const surfaces = {
    shell: { map: null, normal: null, blend: 0.55, relief: 1, scale: 1 },
    knob: { map: null, normal: null, blend: 0.55, relief: 1, scale: 1 },
    button: { map: null, normal: null, blend: 0.55, relief: 1, scale: 1 },
  }
  const channelState = (name) => surfaces[name] ?? surfaces.shell

  // one material per button: an alpha-masked icon that lights up on press
  const ICON_UNLIT = new THREE.Color('#71767c')
  const iconState = { color: new THREE.Color('#ffb066'), intensity: 2.4, levels: [] }
  const iconMaterials = []
  const iconMaterial = (index) => {
    if (!iconMaterials[index]) {
      iconMaterials[index] = new THREE.MeshBasicMaterial({
        color: ICON_UNLIT.clone(),
        transparent: true,
        depthWrite: false,
        toneMapped: false,
      })
    }
    return iconMaterials[index]
  }
  const paintIcon = (index) => {
    const mat = iconMaterials[index]
    if (!mat) return
    const level = iconState.levels[index] ?? 0
    mat.color.copy(ICON_UNLIT).lerp(iconState.color, level)
    mat.color.multiplyScalar(1 + (iconState.intensity - 1) * level * 0.6)
  }

  // wear layer: shared by every metal surface, drives normal *and* roughness
  const wear = {
    kind: 'none',
    density: 1,
    depth: 1,
    angle: 0,
    contrast: 1,
    seed: 7,
    normal: null,
    roughness: null,
    scale: 1,
  }

  const rebuildWear = () => {
    wear.normal?.dispose()
    wear.roughness?.dispose()
    if (wear.kind === 'none') {
      wear.normal = null
      wear.roughness = null
      return
    }
    const maps = makeWearMaps(wear.kind, 1024, wear)
    wear.normal = maps.normal
    wear.roughness = maps.roughness
    for (const tex of [wear.normal, wear.roughness]) {
      tex.repeat.set(wear.scale, wear.scale)
      tex.needsUpdate = true
    }
  }

  const finishState = {
    name: 'blasted',
    anisotropy: FINISHES.blasted.anisotropy,
    rotation: 0,
    grainScale: 1,
    grainDensity: 1,
    clearcoat: FINISHES.blasted.clearcoat,
    metalness: FINISHES.blasted.metalness,
  }
  const toneState = { strip: 0.66, plate: 0.44, back: 0.6, asset: 0.18 }
  const WHITE = new THREE.Color('#ffffff')

  const applyTones = () => {
    stripBand.color.copy(SHELL_BASE).lerp(DARKEST, toneState.strip)
    plate.color.copy(SHELL_BASE).lerp(DARKEST, toneState.plate)
    shellBack.color.copy(SHELL_BASE).lerp(DARKEST, toneState.back * 0.8)
    assetPlate.color.copy(SHELL_BASE).lerp(WHITE, 0.45).lerp(DARKEST, toneState.asset)
    // both side pieces track the strip they sit on
    tagPlate.color.copy(SHELL_BASE).lerp(DARKEST, toneState.strip * 0.78)
    powerPad.color.copy(SHELL_BASE).lerp(DARKEST, Math.min(1, toneState.strip * 1.06))
  }

  const applyGrain = () => {
    const kind = FINISHES[finishState.name].grain
    const scale = FINISHES[finishState.name].normalScale * finishState.grainScale

    for (const mat of channelOf.keys()) {
      const ch = surfaces[channelOf.get(mat)]

      if (ch.normal) {
        // an imported surface owns the relief; everything else steps aside
        mat.normalMap = ch.normal
        mat.normalScale.set(ch.relief, ch.relief)
      } else if (wear.normal) {
        // the wear layer carries its own depth: tying it to the finish's grain
        // scale made deep gouges read as faint smudges
        const w = 0.85 * wear.depth
        mat.normalMap = wear.normal
        mat.normalScale.set(w, w)
      } else {
        const set = grainSets.get(mat)
        if (set) {
          const map = set[kind]
          map.repeat.set(
            set.base[0] * finishState.grainDensity,
            set.base[1] * finishState.grainDensity,
          )
          map.needsUpdate = true
          mat.normalMap = map
          mat.normalScale.set(scale, scale)
        } else if (mat === button) {
          mat.normalMap = buttonGrain
          mat.normalScale.set(0.05, 0.05)
        }
      }

      // wear owns roughness whenever it is on: that is what sells a scratch
      if (wear.roughness && metalFamily.includes(mat)) mat.roughnessMap = wear.roughness
      else if (metalFamily.includes(mat)) mat.roughnessMap = defaultRoughnessMap.get(mat) ?? null

      mat.map = ch.map
      blendUniforms.get(mat).value = ch.map ? ch.blend : 0
      mat.needsUpdate = true
    }
  }

  const defaultRoughnessMap = new Map(metalFamily.map((m) => [m, m.roughnessMap]))

  const applySurfaceScale = (name) => {
    const ch = channelState(name)
    for (const tex of [ch.map, ch.normal]) {
      if (!tex) continue
      tex.repeat.set(ch.scale, ch.scale)
      tex.needsUpdate = true
    }
  }

  return {
    shell,
    shellBack,
    stripBand,
    plate,
    knobBody,
    knobTop,
    button,
    buttonWell,
    screw,
    screwRecess,
    slot,
    screenWell,
    discBed,
    discBedWall,
    assetPlate,
    assetOverlay,
    tagPlate,
    tagOverlay,
    powerPad,
    powerIcon,
    glass,
    assetGlass,
    discFace,
    discBack,
    discEdge,
    ledOn,
    ledOff,

    /** Scales every surface's reflection strength off its own baseline. */
    setEnvIntensity(mult) {
      for (const [mat, base] of envRig) mat.envMapIntensity = base * mult
    },
    FINISHES,
    /** Swap the whole machine onto a different metal finish. */
    setFinish(name) {
      const finish = FINISHES[name] ?? FINISHES.blasted
      finishState.name = name
      finishState.anisotropy = finish.anisotropy
      finishState.clearcoat = finish.clearcoat
      finishState.metalness = finish.metalness
      SHELL_BASE.set(finish.color)
      shell.color.copy(SHELL_BASE)
      knobBody.color.copy(SHELL_BASE)
      knobTop.color.copy(SHELL_BASE).lerp(DARKEST, 0.1)
      screw.color.copy(SHELL_BASE).lerp(DARKEST, 0.14)
      for (const mat of metalFamily) {
        mat.metalness = finish.metalness
        mat.anisotropy = finish.anisotropy
        mat.clearcoat = finish.clearcoat
        mat.clearcoatRoughness = finish.clearcoatRoughness
      }
      applyTones()
      applyGrain()
      return finish
    },
    setMetalColor(hex) {
      SHELL_BASE.set(hex)
      shell.color.copy(SHELL_BASE)
      knobBody.color.copy(SHELL_BASE)
      knobTop.color.copy(SHELL_BASE).lerp(DARKEST, 0.1)
      screw.color.copy(SHELL_BASE).lerp(DARKEST, 0.14)
      applyTones()
    },
    setMetalness(v) {
      finishState.metalness = v
      for (const mat of metalFamily) mat.metalness = v
    },
    /** Stretches the specular lobe along the brush direction. */
    setAnisotropy(v) {
      finishState.anisotropy = v
      for (const mat of metalFamily) mat.anisotropy = v
    },
    setAnisotropyRotation(deg) {
      finishState.rotation = deg
      const rad = (deg * Math.PI) / 180
      for (const mat of metalFamily) mat.anisotropyRotation = rad
    },
    setGrainScale(v) {
      finishState.grainScale = v
      applyGrain()
    },
    setGrainDensity(v) {
      finishState.grainDensity = v
      applyGrain()
    },
    setClearcoat(v) {
      finishState.clearcoat = v
      for (const mat of metalFamily) mat.clearcoat = v
    },
    setClearcoatRoughness(v) {
      for (const mat of metalFamily) mat.clearcoatRoughness = v
    },
    iconMaterial,
    getIcon: (index) => iconMaterials[index]?.alphaMap ?? null,
    /** Icons are driven by their alpha, so any colour of SVG or PNG works. */
    setIcon(index, texture) {
      const mat = iconMaterial(index)
      mat.alphaMap?.dispose()
      mat.alphaMap = texture
      mat.needsUpdate = true
      paintIcon(index)
    },
    clearIcons() {
      iconMaterials.forEach((mat) => {
        mat.alphaMap?.dispose()
        mat.alphaMap = null
        mat.needsUpdate = true
      })
    },
    setIconLevel(index, level) {
      iconState.levels[index] = level
      paintIcon(index)
    },
    setIconColor(hex) {
      iconState.color.set(hex)
      iconMaterials.forEach((_, i) => paintIcon(i))
    },
    setIconIntensity(v) {
      iconState.intensity = v
      iconMaterials.forEach((_, i) => paintIcon(i))
    },
    /** How hard the display glass mirrors the room. */
    setGlassReflection(v) {
      // clearcoat is what sheets the softbox across the panel, so it has to
      // come down with the rest or the display never reads black
      glass.envMapIntensity = 1.4 * v
      glass.roughness = 0.05 + (1 - v) * 0.3
      glass.opacity = 0.28 + v * 0.5
      glass.clearcoat = 0.1 + v * 0.9
      glass.clearcoatRoughness = 0.03 + (1 - v) * 0.35

      // same sheet of glass over the graphic, but far less tint: there is
      // artwork underneath that has to stay legible
      assetGlass.envMapIntensity = 1.5 * v
      assetGlass.roughness = 0.04 + (1 - v) * 0.26
      assetGlass.opacity = 0.06 + v * 0.2
      assetGlass.clearcoat = 0.15 + v * 0.85
      assetGlass.clearcoatRoughness = 0.02 + (1 - v) * 0.3
    },
    setLedColor(hex) {
      ledOn.color.set(hex)
    },
    /** The graphic strip's own darkness against the shell alloy. */
    setTagGraphic(texture) {
      tagOverlay.map = texture
      tagOverlay.needsUpdate = true
    },
    setPowerIcon(texture) {
      powerIcon.alphaMap?.dispose()
      powerIcon.alphaMap = texture
      powerIcon.needsUpdate = true
    },
    setPowerLit(on) {
      powerIcon.color.set(on ? '#9ae8b8' : '#6f747a')
    },
    setAssetTone(t) {
      toneState.asset = Math.min(1, Math.max(0, t))
      applyTones()
    },
    setDiscGloss(roughness) {
      discFace.roughness = roughness
      discBack.roughness = Math.max(0.02, roughness * 0.65)
    },
    WEAR_KINDS,
    getWearState: () => ({ ...wear, normal: undefined, roughness: undefined }),
    /** Regenerate the scratch layer and push it onto every metal surface. */
    setWear(patch) {
      Object.assign(wear, patch)
      rebuildWear()
      applyGrain()
    },
    getFinishState: () => ({ ...finishState }),
    TEXTURE_CHANNELS: Object.keys(CHANNELS),
    getSurfaceState: (name = 'shell') => ({ ...channelState(name) }),

    /** Drop an imported photo onto one channel as colour plus relief. */
    setSurfaceTexture(name, texture) {
      const ch = channelState(name)
      ch.map?.dispose()
      ch.normal?.dispose()
      if (!texture) {
        ch.map = null
        ch.normal = null
        applyGrain()
        return
      }
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping
      texture.colorSpace = THREE.SRGBColorSpace
      texture.anisotropy = 8
      ch.map = texture
      ch.normal = normalFromImage(texture.image, 512, 1)
      applySurfaceScale(name)
      applyGrain()
    },
    setTextureBlend(name, v) {
      const ch = channelState(name)
      ch.blend = v
      for (const mat of CHANNELS[name] ?? CHANNELS.shell) {
        blendUniforms.get(mat).value = ch.map ? v : 0
      }
    },
    setTextureRelief(name, v) {
      const ch = channelState(name)
      ch.relief = v
      if (!ch.normal) return
      for (const mat of CHANNELS[name] ?? CHANNELS.shell) mat.normalScale.set(v, v)
    },
    setTextureScale(name, v) {
      channelState(name).scale = v
      applySurfaceScale(name)
    },
    setRoughness(value) {
      for (const [mat, offset] of roughnessRig) {
        mat.roughness = Math.min(1, Math.max(0.02, value + offset))
      }
    },
    /** 0 = same alloy as the shell, 1 = near black. */
    setStripTone(t) {
      toneState.strip = Math.min(1, Math.max(0, t))
      applyTones()
    },
    setPlateTone(t) {
      toneState.plate = Math.min(1, Math.max(0, t))
      applyTones()
    },
    setBackTone(t) {
      toneState.back = Math.min(1, Math.max(0, t))
      applyTones()
    },
    setButtonSurface(name) {
      Object.assign(button, BUTTON_SURFACES[name] ?? BUTTON_SURFACES.matte)
      button.needsUpdate = true
    },
    /** Swap the printed label for an imported image; null restores the pour. */
    setDiscLabel(texture) {
      discFace.map = texture ?? artwork.map
      discFace.needsUpdate = true
    },
    setAssetGraphic(texture) {
      assetOverlay.map = texture
      assetOverlay.needsUpdate = true
    },
  }
}
