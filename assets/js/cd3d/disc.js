import * as THREE from 'three'
import { DISC_RIM_SEGMENTS } from './device.js'

/** Radius bands the disc separates into, as fractions of the outer radius. */
const BANDS = [0.105, 0.337, 0.498, 0.66, 0.828, 1]

/** Re-project ring UVs so one square artwork lands flat across every band. */
function planarUV(geo, radius) {
  const pos = geo.attributes.position
  const uv = geo.attributes.uv
  for (let i = 0; i < pos.count; i++) {
    uv.setXY(i, (pos.getX(i) / radius + 1) * 0.5, (pos.getY(i) / radius + 1) * 0.5)
  }
  uv.needsUpdate = true
  return geo
}

function ringMesh(inner, outer, outerMost, thickness, materials) {
  const group = new THREE.Group()
  const segments = Math.max(96, Math.round(outer * 78))

  const front = new THREE.Mesh(
    planarUV(new THREE.RingGeometry(inner, outer, segments, 1), outerMost),
    materials.discFace,
  )
  front.position.z = thickness / 2
  front.castShadow = true
  group.add(front)

  const backGeo = planarUV(new THREE.RingGeometry(inner, outer, segments, 1), outerMost)
  backGeo.rotateY(Math.PI)
  const back = new THREE.Mesh(backGeo, materials.discBack)
  back.position.z = -thickness / 2
  group.add(back)

  const edge = (radius, material) => {
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, thickness, segments, 1, true),
      material,
    )
    mesh.rotation.x = Math.PI / 2
    return mesh
  }

  group.add(edge(outer, outer >= outerMost - 1e-4 ? materials.discEdge : materials.discBack))
  group.add(edge(inner, materials.discBack))

  return group
}

/**
 * The disc: a spinning stack of concentric bands that can slide out of the
 * deck and telescope apart along the view axis. Its own layer, seated on a
 * black bed that reaches a settable distance past the rim.
 */
export function buildDisc(materials, layout, state) {
  const R = layout.disc.r
  const thickness = layout.disc.thickness
  const bodyFace = layout.bodyFace

  const root = new THREE.Group()
  const restZ = bodyFace - layout.disc.recess + thickness * 0.5 + R * 0.02
  root.position.set(layout.disc.x, layout.disc.y, restZ)

  const spinner = new THREE.Group()
  root.add(spinner)

  const rings = []
  for (let i = 0; i < BANDS.length - 1; i++) {
    const ring = ringMesh(BANDS[i] * R, BANDS[i + 1] * R, R, thickness, materials)
    spinner.add(ring)
    rings.push(ring)
  }

  // the disc drops into a real well: a wall sunk through the shell face and a
  // black floor at the bottom of it
  const depth = layout.disc.recess
  const seat = new THREE.Group()
  seat.position.set(layout.disc.x, layout.disc.y, bodyFace)

  // soft chamfer where the shell rolls down into the recess: the extrude's own
  // bevel is shared with the body outline, so the rim needs its own ring
  const bevel = layout.disc.rimBevel
  if (bevel > 0.002) {
    const steps = 10
    const profile = []
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * (Math.PI / 2)
      // quarter round from the hole edge, down at -bevel, up to the shell face
      profile.push(
        new THREE.Vector2(
          layout.disc.backdrop + bevel * Math.sin(a),
          -bevel + bevel * (1 - Math.cos(a)),
        ),
      )
    }
    const rimGeo = new THREE.LatheGeometry(profile, DISC_RIM_SEGMENTS)
    rimGeo.rotateX(Math.PI / 2)
    const rim = new THREE.Mesh(rimGeo, materials.shell)
    seat.add(rim)
  }

  // slightly inside the shell's cut-out: two coincident cylinders z-fight
  const wallR = layout.disc.backdrop - 0.006
  const wallH = depth + 0.02
  const wall = new THREE.Mesh(
    new THREE.CylinderGeometry(wallR, wallR, wallH, DISC_RIM_SEGMENTS, 1, true),
    materials.discBedWall,
  )
  wall.rotation.x = Math.PI / 2
  wall.position.z = 0.01 - wallH / 2
  seat.add(wall)

  const bed = new THREE.Mesh(new THREE.CircleGeometry(wallR + 0.004, DISC_RIM_SEGMENTS), materials.discBed)
  bed.position.z = -depth
  bed.receiveShadow = true
  seat.add(bed)

  const spindle = new THREE.Mesh(
    new THREE.CylinderGeometry(R * 0.082, R * 0.097, R * 0.05, 48),
    materials.knobTop,
  )
  spindle.rotation.x = Math.PI / 2
  spindle.position.z = -depth + R * 0.025
  seat.add(spindle)

  function update(dt) {
    // --- track change ---
    const tr = state.transition
    if (tr.t < 1) {
      tr.t = tr.duration > 0 ? Math.min(1, tr.t + dt / tr.duration) : 1
      if (!tr.swapped && tr.t >= 0.5) {
        tr.swapped = true
        tr.onSwap?.()
      }
    }
    const bell = tr.t < 1 ? Math.sin(tr.t * Math.PI) : 0

    if (state.spinning) state.angle -= dt * state.speed * 2.4
    spinner.rotation.z = state.angle

    const k = 1 - Math.pow(0.0025, dt) // framerate-independent approach
    state.eject += (state.ejectTarget - state.eject) * k
    state.split += (state.splitTarget - state.split) * k

    const e = state.eject
    root.position.z = restZ + e * R * 0.73
    root.position.y = layout.disc.y + e * R * 0.09
    root.rotation.x = -e * 0.22
    root.rotation.y = e * 0.16
    root.scale.setScalar(1)

    // the transition rides on top of whatever eject is doing
    if (bell > 0) {
      const kind = tr.kind
      if (kind === 'lift') {
        root.position.z += bell * R * 0.85
        root.position.y += bell * R * 0.12
        root.rotation.x -= bell * 0.3
      } else if (kind === 'flip') {
        root.rotation.y += tr.t * Math.PI * 2
        root.position.z += bell * R * 0.35
      } else if (kind === 'shrink') {
        root.scale.setScalar(1 - bell * 0.88)
        root.position.z += bell * R * 0.2
      }
    }

    // telescope forward only — nothing sinks back into the deck
    const s = Math.min(1, state.split + (tr.kind === 'telescope' ? bell : 0))
    const last = rings.length - 1
    for (let i = 0; i < rings.length; i++) {
      const step = last - i
      rings[i].position.z = s * step * R * 0.185
      rings[i].rotation.z = s * step * 0.22
      const scale = 1 + s * step * 0.016
      rings[i].scale.set(scale, scale, 1)
    }
  }

  return {
    root,
    seat,
    spinner,
    rings,
    update,
    /** Run a swap: the artwork changes at the midpoint of the move. */
    play(kind, duration, onSwap) {
      if (!kind || kind === 'cut' || duration <= 0) {
        onSwap?.()
        state.transition = { kind: 'cut', t: 1, duration: 0, swapped: true, onSwap: null }
        return
      }
      state.transition = { kind, t: 0, duration, swapped: false, onSwap }
    },
  }
}

export const TRANSITIONS = {
  cut: { label: 'Cắt thẳng', duration: 0 },
  lift: { label: 'Nhảy lên', duration: 0.95 },
  flip: { label: 'Lật đĩa', duration: 1.05 },
  shrink: { label: 'Thu nhỏ', duration: 0.8 },
  telescope: { label: 'Tách vành', duration: 1.15 },
}

export function createDiscState() {
  return {
    // a track change runs through here; the swap fires at the halfway point
    transition: { kind: 'lift', t: 1, duration: 0.95, swapped: true, onSwap: null },
    spinning: true,
    speed: 1,
    angle: 0,
    eject: 0,
    ejectTarget: 0,
    split: 0,
    splitTarget: 0,
  }
}
