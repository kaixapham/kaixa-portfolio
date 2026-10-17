import * as THREE from 'three'

/* ------------------------------------------------------------------ */
/* shape helpers                                                       */
/* ------------------------------------------------------------------ */

/**
 * Segment count for the disc cut-out and everything that meets it. The hole,
 * the bevel ring and the well wall have to be tessellated identically —
 * mismatched counts leave slivers you can see straight through.
 */
export const DISC_RIM_SEGMENTS = 192

export function roundedRectShape(w, h, r) {
  const radius = Math.max(0.001, Math.min(r, w / 2 - 0.001, h / 2 - 0.001))
  const shape = new THREE.Shape()
  const x = -w / 2
  const y = -h / 2
  shape.moveTo(x + radius, y)
  shape.lineTo(x + w - radius, y)
  shape.quadraticCurveTo(x + w, y, x + w, y + radius)
  shape.lineTo(x + w, y + h - radius)
  shape.quadraticCurveTo(x + w, y + h, x + w - radius, y + h)
  shape.lineTo(x + radius, y + h)
  shape.quadraticCurveTo(x, y + h, x, y + h - radius)
  shape.lineTo(x, y + radius)
  shape.quadraticCurveTo(x, y, x + radius, y)
  return shape
}

/**
 * Half of the shell face: rounded on one side, square where it meets the
 * parting slot. `side` is -1 for the left strip, +1 for the main face.
 */
function halfPanelShape(w, h, r, side) {
  const radius = Math.max(0.001, Math.min(r, w - 0.002, h / 2 - 0.001))
  const shape = new THREE.Shape()
  const left = -w / 2
  const right = w / 2
  const bottom = -h / 2
  const top = h / 2

  if (side < 0) {
    shape.moveTo(right, bottom)
    shape.lineTo(left + radius, bottom)
    shape.quadraticCurveTo(left, bottom, left, bottom + radius)
    shape.lineTo(left, top - radius)
    shape.quadraticCurveTo(left, top, left + radius, top)
    shape.lineTo(right, top)
  } else {
    shape.moveTo(left, top)
    shape.lineTo(right - radius, top)
    shape.quadraticCurveTo(right, top, right, top - radius)
    shape.lineTo(right, bottom + radius)
    shape.quadraticCurveTo(right, bottom, right - radius, bottom)
    shape.lineTo(left, bottom)
  }
  shape.closePath()
  return shape
}

function extrudeSlab(shape, depth, bevel) {
  const b = Math.max(0.002, Math.min(bevel, depth / 2 - 0.004))
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.01, depth - b * 2),
    bevelEnabled: true,
    bevelThickness: b,
    bevelSize: b,
    bevelSegments: 4,
    curveSegments: 32,
  })
  geo.translate(0, 0, -depth / 2 + b)
  return geo
}

function hexPath(radius, PathClass = THREE.Path) {
  const path = new PathClass()
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6
    if (i === 0) path.moveTo(Math.cos(a) * radius, Math.sin(a) * radius)
    else path.lineTo(Math.cos(a) * radius, Math.sin(a) * radius)
  }
  path.closePath()
  return path
}

/** Lathe an (radius, height) profile, then stand it up along +Z. */
function latheZ(points, segments = 128) {
  const geo = new THREE.LatheGeometry(
    points.map((p) => new THREE.Vector2(Math.max(0, p[0]), p[1])),
    segments,
  )
  geo.rotateX(Math.PI / 2) // profile height (+y) becomes depth out of the panel (+z)
  return weldNormalSeam(geo)
}

/**
 * A lathe duplicates the vertices where phi wraps, so `computeVertexNormals`
 * gives each copy only the faces on its own side and the seam shows up as a
 * hairline crease. Averaging the normals of coincident vertices removes it
 * without touching the UVs, which welding the geometry outright would break.
 */
function weldNormalSeam(geometry) {
  const pos = geometry.attributes.position
  const nor = geometry.attributes.normal
  if (!nor) return geometry
  const groups = new Map()

  for (let i = 0; i < pos.count; i++) {
    const key = `${pos.getX(i).toFixed(4)}|${pos.getY(i).toFixed(4)}|${pos.getZ(i).toFixed(4)}`
    const list = groups.get(key)
    if (list) list.push(i)
    else groups.set(key, [i])
  }

  for (const list of groups.values()) {
    if (list.length < 2) continue
    let x = 0
    let y = 0
    let z = 0
    for (const i of list) {
      x += nor.getX(i)
      y += nor.getY(i)
      z += nor.getZ(i)
    }
    const len = Math.hypot(x, y, z) || 1
    for (const i of list) nor.setXYZ(i, x / len, y / len, z / len)
  }
  nor.needsUpdate = true
  return geometry
}

const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/* ------------------------------------------------------------------ */
/* parts                                                               */
/* ------------------------------------------------------------------ */

/**
 * The volume knob is one solid turned part: a single lathe whose side wall is
 * milled with flutes. Building it as a ring plus a floating cap reads as two
 * loose pieces, which is not what a machined knob looks like.
 */
function knurledKnob(r, h, flutes, depth, k) {
  // machined cap, described as one profile: chamfered base, knurled wall,
  // rolled rim, a concentric groove, then the dished face
  const b = Math.max(0.01, k.rimBevel) * r * 0.3
  const base = Math.max(0, k.baseBevel) * r * 0.35

  const profile = [[0, 0]]
  if (base > 0.002) {
    profile.push([r - base, 0])
    for (let i = 1; i <= 4; i++) {
      const a = (i / 4) * (Math.PI / 2)
      profile.push([r - base + base * Math.sin(a), base - base * Math.cos(a)])
    }
  } else {
    profile.push([r, 0])
  }

  profile.push([r, h - b])
  for (let i = 1; i <= 6; i++) {
    const a = (i / 6) * (Math.PI / 2)
    profile.push([r - b + b * Math.cos(a), h - b + b * Math.sin(a)])
  }

  const rim = r - b
  const gw = k.grooveWidth * r
  const gd = k.grooveDepth * r
  let inner = rim
  if (gw > 0.004 && gd > 0.002) {
    // a shadow line here is most of what makes a knob read as turned metal
    const outer = rim - k.groovePos * r
    const floorOuter = outer - gw * 0.3
    const floorInner = outer - gw * 0.7
    inner = outer - gw
    profile.push([outer, h], [floorOuter, h - gd], [floorInner, h - gd], [inner, h])
  }

  const sink = k.dish * r
  for (let i = 1; i <= 10; i++) {
    const t = i / 10
    profile.push([inner * (1 - t), h - sink * Math.sin(t * (Math.PI / 2))])
  }

  const segments = Math.max(140, Math.round(flutes * 5.5))
  const geo = latheZ(profile, segments)

  const pos = geo.attributes.position
  const v = new THREE.Vector3()
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i)
    const rad = Math.hypot(v.x, v.y)
    if (rad < r * 0.62) continue
    // flutes stay on the straight wall and die into the rolled edge
    const mask =
      smoothstep(h * 0.02, h * 0.08, v.z) * (1 - smoothstep(h * 0.79, h * 0.9, v.z))
    if (mask <= 0.001) continue
    const theta = Math.atan2(v.y, v.x)
    const phase = ((theta / (Math.PI * 2)) * flutes) % 1
    const tri = Math.abs(((phase + 1) % 1) * 2 - 1)
    const nr = rad + (tri - 0.5) * depth * mask
    pos.setXY(i, (v.x / rad) * nr, (v.y / rad) * nr)
  }
  geo.computeVertexNormals()
  weldNormalSeam(geo)
  return geo
}

function buildKnob(materials, layout, p) {
  const group = new THREE.Group()
  const r = layout.knob.r
  const mesh = new THREE.Mesh(
    knurledKnob(r, layout.knob.depth, Math.round(p.knob.flutes), r * 0.12, p.knob),
    materials.knobBody,
  )
  mesh.castShadow = true
  group.add(mesh)

  group.position.set(layout.knob.x, layout.knob.y, layout.plate.face - 0.008)
  return group
}

/** Pad profile: straight wall, chamfered shoulder, then a dome, dish or flat. */
function padProfile(r, wallH, capH, bevel, face) {
  const b = Math.max(0.015, bevel) * r * 0.5
  const points = [
    [0, 0],
    [r, 0],
    [r, wallH],
  ]
  const shoulder = 6
  for (let i = 1; i <= shoulder; i++) {
    const a = (i / shoulder) * (Math.PI / 2)
    points.push([r - b + b * Math.cos(a), wallH + b * Math.sin(a)])
  }
  const rim = wallH + b
  const lift = face === 'convex' ? capH : face === 'concave' ? -capH : 0
  const steps = lift === 0 ? 2 : 10
  for (let i = 1; i <= steps; i++) {
    const t = i / steps
    points.push([(r - b) * (1 - t), rim + lift * Math.sin(t * (Math.PI / 2))])
  }
  return points
}

function buildButton(materials, layout, p, index) {
  const group = new THREE.Group()
  const r = layout.buttonR
  const wb = Math.max(0.02, p.buttons.wellBevel) * r * 0.34

  const well = new THREE.Mesh(
    latheZ(
      [
        [0, -0.01],
        [r + wb * 0.4, -0.01],
        [r + wb * 0.75, wb * 0.55],
        [r + wb * 1.25, wb * 0.72],
        [r + wb * 1.45, wb * 0.72],
      ],
      96,
    ),
    materials.buttonWell,
  )
  group.add(well)

  const pad = new THREE.Mesh(
    latheZ(padProfile(r, r * 0.14, r * 0.19, p.buttons.bevel, p.buttons.face), 128),
    materials.button,
  )
  pad.castShadow = true
  pad.name = 'pad'
  group.add(pad)

  // icon rides on the pad so it travels with the press
  let icon = null
  const iconMap = materials.getIcon(index)
  if (iconMap) {
    const size = r * 2 * p.buttons.iconScale
    const faceZ =
      r * 0.14 +
      Math.max(0.015, p.buttons.bevel) * r * 0.5 +
      (p.buttons.face === 'convex' ? r * 0.19 : 0)
    icon = new THREE.Mesh(
      new THREE.PlaneGeometry(size, size),
      materials.iconMaterial(index),
    )
    icon.position.z = faceZ + r * 0.012
    icon.renderOrder = 4
    pad.add(icon)
  }

  return { group, pad, icon }
}

/**
 * A screw is a stack of three heights: the plate surface at 0, the head face,
 * and the hex floor. Both offsets are signed, so the same builder makes a
 * proud button-head screw, a flush one, a countersunk one, and a raised hex
 * boss — no separate cases.
 */
function buildScrew(materials, layout, p) {
  const group = new THREE.Group()
  const r = layout.screwR
  const hexR = r * 0.54
  const headZ = p.screws.head * r
  const socketZ = headZ + p.screws.socket * r

  const face = new THREE.Shape()
  face.absarc(0, 0, r, 0, Math.PI * 2, false)
  face.holes.push(hexPath(hexR))
  const head = new THREE.Mesh(new THREE.ShapeGeometry(face, 48), materials.screw)
  head.position.z = headZ
  group.add(head)

  // outer wall bridging the plate surface and the head face
  if (Math.abs(headZ) > 0.002) {
    const rim = new THREE.Mesh(
      new THREE.CylinderGeometry(r, r, Math.abs(headZ), 48, 1, true),
      materials.screwWall,
    )
    rim.rotation.x = Math.PI / 2
    rim.position.z = headZ / 2
    group.add(rim)
  }

  const socketShape = new THREE.Shape()
  hexPath(hexR, THREE.Shape)
    .getPoints()
    .forEach((pt, i) => (i === 0 ? socketShape.moveTo(pt.x, pt.y) : socketShape.lineTo(pt.x, pt.y)))
  const floor = new THREE.Mesh(new THREE.ShapeGeometry(socketShape), materials.screwRecess)
  floor.position.z = socketZ
  group.add(floor)

  const drop = Math.abs(socketZ - headZ)
  if (drop > 0.002) {
    const wall = new THREE.Mesh(
      new THREE.CylinderGeometry(hexR, hexR, drop, 6, 1, true),
      materials.screwRecess,
    )
    wall.rotation.x = Math.PI / 2
    wall.rotation.y = Math.PI / 6
    wall.position.z = (headZ + socketZ) / 2
    group.add(wall)
  }

  return group
}
/** Light plate the imported PNG sits on, plus the artwork itself. */
function buildAssetBar(materials, layout) {
  const group = new THREE.Group()
  const { x, y, w, h, radius } = layout.asset

  const plate = new THREE.Mesh(
    extrudeSlab(roundedRectShape(w, h, radius), 0.1, 0.014),
    materials.assetPlate,
  )
  plate.position.set(x, y, layout.bodyFace - 0.03)
  group.add(plate)

  const map = materials.assetOverlay.map
  if (map?.image?.width) {
    const inset = Math.min(0.02, h * 0.04)
    const art = new THREE.Mesh(
      coverFrame(map, w - inset * 2, h - inset * 2, Math.max(0.01, radius - inset)),
      materials.assetOverlay,
    )
    art.position.set(x, y, layout.bodyFace + 0.028)
    art.renderOrder = 2
    group.add(art)
  }

  // glass cover over the whole bar, matching the display
  const cover = new THREE.Mesh(
    new THREE.ShapeGeometry(roundedRectShape(w - 0.02, h - 0.02, radius), 16),
    materials.assetGlass,
  )
  cover.position.set(x, y, layout.bodyFace + 0.042)
  cover.renderOrder = 4
  group.add(cover)

  return group
}

/**
 * Fit artwork to a frame the way `background-size: cover` does: the mesh is
 * the frame, and the texture is cropped to fill it. Stretching instead would
 * distort anything whose aspect does not match, which is most images.
 */
function coverFrame(map, w, h, radius) {
  const image = map.image
  const frameAspect = w / h
  const imageAspect = (image?.width || 1) / (image?.height || 1)

  map.wrapS = map.wrapT = THREE.ClampToEdgeWrapping
  if (imageAspect > frameAspect) {
    const k = frameAspect / imageAspect
    map.repeat.set(k, 1)
    map.offset.set((1 - k) / 2, 0)
  } else {
    const k = imageAspect / frameAspect
    map.repeat.set(1, k)
    map.offset.set(0, (1 - k) / 2)
  }
  map.needsUpdate = true
  return framedGeometry(w, h, radius)
}

/** Rounded-rect panel whose UVs run 0–1 across its own bounding box. */
function framedGeometry(w, h, radius) {
  const geo = new THREE.ShapeGeometry(roundedRectShape(w, h, radius), 16)
  geo.computeBoundingBox()
  const bb = geo.boundingBox
  const pos = geo.attributes.position
  const uv = geo.attributes.uv
  for (let i = 0; i < pos.count; i++) {
    uv.setXY(
      i,
      (pos.getX(i) - bb.min.x) / (bb.max.x - bb.min.x),
      (pos.getY(i) - bb.min.y) / (bb.max.y - bb.min.y),
    )
  }
  uv.needsUpdate = true
  return geo
}

/**
 * The left edge carries a label plate and the power switch. Both are built
 * flat in XY and then turned to face -X, so the same rounded-rect and lathe
 * helpers work here as on the front.
 */
function buildSideControls(materials, layout, p, hologram) {
  const group = new THREE.Group()
  const sideX = -layout.W / 2
  const depth = layout.depth
  const controls = []

  if (p.side.tag.show) {
    const cfg = p.side.tag
    const tw = depth * cfg.width
    const th = layout.H * cfg.height
    const y = layout.H / 2 - layout.H * cfg.position

    const plate = new THREE.Mesh(
      extrudeSlab(roundedRectShape(tw, th, cfg.radius), cfg.extrude * 2, 0.008),
      materials.tagPlate,
    )
    const tz = depth * cfg.depthOffset
    plate.rotation.y = -Math.PI / 2
    plate.position.set(sideX, y, tz)
    group.add(plate)

    if (materials.tagOverlay.map) {
      const inset = Math.min(0.012, tw * 0.03)
      const art = new THREE.Mesh(
        coverFrame(
          materials.tagOverlay.map,
          tw - inset * 2,
          th - inset * 2,
          Math.max(0.005, cfg.radius - inset),
        ),
        materials.tagOverlay,
      )
      art.rotation.y = -Math.PI / 2
      art.position.set(sideX - cfg.extrude - 0.004, y, tz)
      art.renderOrder = 2
      group.add(art)
    }

    if (p.side.tag.holo.show && hologram) {
      const inset = Math.min(0.012, tw * 0.03)
      const foil = new THREE.Mesh(
        framedGeometry(tw - inset * 2, th - inset * 2, Math.max(0.005, cfg.radius - inset)),
        hologram.material,
      )
      foil.rotation.y = -Math.PI / 2
      foil.position.set(sideX - cfg.extrude - 0.008, y, tz)
      foil.renderOrder = 3
      group.add(foil)
    }
  }

  if (p.side.power.show) {
    const cfg = p.side.power
    const w = depth * cfg.width
    const h = layout.H * cfg.height
    const y = layout.H / 2 - layout.H * cfg.position

    // built flat and turned to face -X, same as the tag
    const pivot = new THREE.Group()
    pivot.rotation.y = -Math.PI / 2
    pivot.position.set(sideX, y, depth * cfg.depthOffset)
    group.add(pivot)

    // recessed outline that reads as the groove around the switch
    const wellDepth = 0.05
    const well = new THREE.Mesh(
      extrudeSlab(
        roundedRectShape(w + cfg.gap * 2, h + cfg.gap * 2, cfg.radius + cfg.gap),
        wellDepth,
        0.006,
      ),
      materials.buttonWell,
    )
    well.position.z = -cfg.wellDepth - wellDepth / 2
    pivot.add(well)

    const padDepth = 0.06
    const pad = new THREE.Mesh(
      extrudeSlab(roundedRectShape(w, h, cfg.radius), padDepth, Math.max(0.002, cfg.bevel)),
      materials.powerPad,
    )
    pad.position.z = cfg.raise - padDepth / 2
    pad.castShadow = true
    pivot.add(pad)

    if (materials.powerIcon.alphaMap) {
      const size = Math.min(w, h) * cfg.iconScale
      const icon = new THREE.Mesh(new THREE.PlaneGeometry(size, size), materials.powerIcon)
      icon.position.z = cfg.raise + 0.004
      icon.rotation.z = (cfg.iconAngle * Math.PI) / 180
      icon.renderOrder = 4
      pivot.add(icon)
    }

    controls.push({ kind: 'button', id: 'power', index: -1, object: pivot, pad, press: 0 })
  }

  return { group, controls }
}

function buildScreenWell(materials, layout) {
  const { w, h, radius } = layout.screen
  const mesh = new THREE.Mesh(
    extrudeSlab(roundedRectShape(w, h, radius), 0.16, 0.012),
    materials.screenWell,
  )
  mesh.position.set(layout.screen.x, layout.screen.y, layout.bodyFace - 0.07)
  mesh.receiveShadow = true
  return mesh
}

/* ------------------------------------------------------------------ */
/* assembly                                                            */
/* ------------------------------------------------------------------ */

export function buildDevice(materials, layout, p, hologram) {
  const device = new THREE.Group()
  const interactive = []
  const { W, H } = layout

  /* --- shell face: dark strip, parting slot, main panel with the disc well --- */
  const stripFace = new THREE.Mesh(
    extrudeSlab(
      halfPanelShape(layout.stripPanel.w, H, p.body.radius, -1),
      layout.frontDepth,
      p.body.bevel,
    ),
    materials.stripBand,
  )
  stripFace.position.set(layout.stripPanel.x, 0, layout.bodyFace - layout.frontDepth / 2)
  stripFace.castShadow = true
  stripFace.receiveShadow = true
  device.add(stripFace)

  const mainShape = halfPanelShape(layout.mainPanel.w, H, p.body.radius, 1)
  // the cut-out opens wider so the bevel ring can fill the chamfer
  const wellR = layout.disc.backdrop + layout.disc.rimBevel
  // explicit points, not absarc: an arc would be divided by curveSegments,
  // which is far too coarse for a circle this size
  const hole = new THREE.Path()
  const hx = layout.disc.x - layout.mainPanel.x
  for (let i = 0; i <= DISC_RIM_SEGMENTS; i++) {
    const a = -(i / DISC_RIM_SEGMENTS) * Math.PI * 2 // clockwise, opposite the outline
    const px = hx + Math.cos(a) * wellR
    const py = layout.disc.y + Math.sin(a) * wellR
    if (i === 0) hole.moveTo(px, py)
    else hole.lineTo(px, py)
  }
  mainShape.holes.push(hole)

  const mainFace = new THREE.Mesh(
    extrudeSlab(mainShape, layout.frontDepth, p.body.bevel),
    materials.shell,
  )
  mainFace.position.set(layout.mainPanel.x, 0, layout.bodyFace - layout.frontDepth / 2)
  mainFace.castShadow = true
  mainFace.receiveShadow = true
  device.add(mainFace)

  const back = new THREE.Mesh(
    extrudeSlab(roundedRectShape(W, H, p.body.radius), layout.backDepth, p.body.bevel),
    materials.shellBack,
  )
  back.position.z = -layout.bodyFace + layout.backDepth / 2
  back.castShadow = true
  back.receiveShadow = true
  device.add(back)

  // shallow slot parting the strip from the rest of the shell
  const slotFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(layout.slot * 1.5, H - p.body.radius * 0.9),
    materials.slot,
  )
  slotFloor.renderOrder = -1
  slotFloor.position.set(layout.seamX, 0, layout.bodyFace - layout.slotDepth)
  device.add(slotFloor)

  /* --- inner plate carrying every control --- */
  const plate = new THREE.Mesh(
    extrudeSlab(
      roundedRectShape(layout.plate.w, layout.plate.h, layout.plate.radius),
      layout.plate.extrude * 2 + 0.22,
      Math.min(p.body.bevel, layout.plate.extrude * 0.9),
    ),
    materials.plate,
  )
  plate.position.set(
    layout.plate.x,
    0,
    layout.plate.face - (layout.plate.extrude * 2 + 0.22) / 2,
  )
  plate.castShadow = true
  plate.receiveShadow = true
  device.add(plate)

  const knob = buildKnob(materials, layout, p)
  device.add(knob)
  interactive.push({ kind: 'knob', object: knob })

  const buttons = []
  for (const [index, spec] of layout.buttons.entries()) {
    const { group, pad, icon } = buildButton(materials, layout, p, index)
    group.position.set(spec.x, spec.y, layout.plate.face - 0.005)
    device.add(group)
    const entry = { kind: 'button', id: spec.id, index, object: group, pad, icon, press: 0 }
    buttons.push(entry)
    interactive.push(entry)
  }

  const leds = layout.leds.xs.map((x, i) => {
    const mesh = new THREE.Mesh(
      new THREE.CircleGeometry(layout.leds.r, 24),
      i === 0 ? materials.ledOn : materials.ledOff,
    )
    mesh.position.set(x, layout.leds.y, layout.plate.face + 0.004)
    device.add(mesh)
    return mesh
  })

  for (const spec of layout.screws) {
    const screw = buildScrew(materials, layout, p)
    screw.position.set(spec.x, spec.y, layout.plate.face - 0.008)
    device.add(screw)
  }

  const side = buildSideControls(materials, layout, p, hologram)
  device.add(side.group)
  for (const control of side.controls) {
    buttons.push(control)
    interactive.push(control)
  }

  device.add(buildAssetBar(materials, layout))
  device.add(buildScreenWell(materials, layout))

  return { device, buttons, knob, leds, interactive }
}

/** Free every geometry under a rebuilt group; materials are shared and kept. */
export function disposeTree(root) {
  root.traverse((node) => {
    if (node.geometry) node.geometry.dispose()
  })
}
