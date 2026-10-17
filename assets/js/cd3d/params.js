/**
 * Every dimension of the deck lives here. Nothing in the build code invents a
 * number: it either comes from `createParams()` or is derived in
 * `deriveLayout()`. That is what lets the form tab rebuild the whole machine.
 *
 * Unit convention: 1 unit = 100 px of the reference mock-up, so a "32px" note
 * in the spec is 0.32 here.
 */

export const BODY_RATIOS = { '1:1': 1, '3:4': 3 / 4, '6:4': 6 / 4 }

export function createParams() {
  return {
    body: {
      ratio: '3:4', // sets the width against a fixed base height
      heightScale: 0.9, // stretches or squashes the body vertically only
      radius: 0.35, // corner rounding
      bevel: 0.015, // soft chamfer on the front and back edges
      depth: 0.9,
      edgeSplit: 0.78, // where the side band splits, front share of the depth
      groove: 0.03, // parting line between the two side bands
      backTone: 0.68, // 0 = same as the shell, 1 = much darker rear band
    },
    strip: {
      // the darker section of the shell itself, running the full height
      widthRatio: 0.24, // of the body width
      tone: 0.76, // darker, heavier finish than the rest of the machine
      slot: 0.056, // width of the shallow slot parting it from the body
      slotDepth: 0.06,
      panelInset: 0.16, // inner plate pulled in from the strip edge
      panelExtrude: 0.05, // and standing slightly proud
      panelTone: 0.58,
    },
    content: {
      pad: 0.15, // margin around the disc / graphic / screen column
      gap: 0.11,
    },
    disc: {
      radiusScale: 1,
      backdropGap: 0.02, // black bed reaching past the disc rim
      recessDepth: 0.19, // how deep that bed is sunk into the shell
      thickness: 1.34, // multiplier on the disc's own thickness
      gloss: 0.42, // 0..1, how hard the disc face catches light
      rimBevel: 0.02, // soft chamfer where the recess meets the shell
      transition: 'lift', // how the disc swaps when the track changes
      transitionSpeed: 1, // multiplier on the preset's duration
    },
    asset: {
      height: 0.16, // graphic strip, fraction of the body height
      tone: 0.72, // its own darkness against the shell alloy
    },
    screen: {
      height: 0.166,
      // the four corner readouts drawn over the display
      hud: {
        show: true,
        nowPlaying: 'PLAYING: TRIUMPH OF LIGHT',
        time: '3:27',
        album: 'ALBUM: KAIXA',
        track: '01',
        padding: 0.05, // of the display height
        fontSize: 0.1, // of the display height
        tracking: -0.02, // em
        color: '#cfd6dd',
        autoTime: true,
      },
    },
    buttons: {
      radiusRatio: 0.27, // of the inner plate width
      count: 3, // evenly spaced group
      groupStart: 0.3, // first button centre, fraction down the plate
      spacing: 0.11, // even gap between them
      bottomInset: 0.11, // the odd button, measured from the plate bottom
      face: 'flat', // convex | concave | flat
      bevel: 0.17,
      wellBevel: 0.02,
      surface: 'matte', // matte | gloss | rubber
      iconScale: 0.33, // of the button diameter
      iconGlow: 'press', // press | always | off
      iconColor: '#595959',
      iconIntensity: 1.75,
      // what each button does, top to bottom; the odd one at the bottom is last
      actions: ['transport', 'preset', 'next', 'split'],
    },
    knob: {
      radiusRatio: 0.42, // of the inner plate width
      depthRatio: 0.72, // of the knob radius
      flutes: 54,
      position: 0.14, // fraction down the plate
      dish: 0.11, // how far the top face is hollowed
      rimBevel: 0.35, // rolled edge between the wall and the face
      baseBevel: 0.1, // chamfer where the knob meets the plate
      grooveWidth: 0.08, // concentric channel cut into the top face
      grooveDepth: 0.05,
      groovePos: 0.08, // distance in from the rim
    },
    screws: {
      padRatio: 0.15, // corner padding, of the inner plate width
      radiusRatio: 0.09,
      head: 0.08, // head face height off the plate: < 0 sunk, > 0 proud
      socket: -0.24, // hex floor relative to the head: < 0 a hole, > 0 a boss
    },
    // the left edge of the machine carries a label and the power switch
    side: {
      tag: {
        show: true,
        width: 0.62, // of the body depth
        height: 0.23, // of the body height
        position: 0.18, // fraction down from the top
        depthOffset: 0.11, // across the edge: -0.5 is the back, +0.5 the front
        radius: 0.05,
        extrude: 0.025,
        holo: {
          show: false,
          intensity: 0.5,
          scale: 26, // ridges across the sticker
          angle: 24, // grating direction
          sheen: 1.1, // how hard the edges flare
          speed: 0.12,
        },
      },
      power: {
        show: true,
        width: 0.59, // of the body depth
        height: 0.14, // of the body height
        radius: 0.08, // corner rounding of the pad
        position: 0.88, // fraction down from the top
        depthOffset: 0.11, // across the edge, same convention as the tag
        raise: 0.05, // how far the flat face stands off the edge
        bevel: 0.022, // softness of that edge
        gap: 0.014, // groove width around the pad
        wellDepth: 0.014, // how deep the groove sits
        iconScale: 0.42,
        iconAngle: 90, // the icon lies across the edge
      },
    },
    leds: {
      count: 3,
      spacing: 0.17, // between centres, of the plate width
      size: 0.035,
      position: 0.81, // fraction down the plate
      color: '#ffffff',
    },
  }
}

/** Base height the ratio is measured against. */
export const BASE_HEIGHT = 9.6

export function deriveLayout(p) {
  // width comes from the ratio; height then stretches independently, so the
  // slider shortens the machine instead of scaling the whole thing
  const W = BASE_HEIGHT * (BODY_RATIOS[p.body.ratio] ?? 0.75)
  const H = BASE_HEIGHT * p.body.heightScale
  const D = p.body.depth
  const bodyFace = D / 2

  const frontDepth = D * p.body.edgeSplit
  const backDepth = D - frontDepth

  /* --- the shell splits into a dark strip and the main face --- */
  const stripW = Math.min(W * p.strip.widthRatio, W * 0.6)
  const slot = Math.max(0.006, p.strip.slot)
  const seamX = -W / 2 + stripW
  const stripPanelW = stripW - slot / 2
  const mainW = W - stripW - slot / 2

  /* --- inner plate carrying the controls --- */
  const inset = Math.min(p.strip.panelInset, stripW / 2 - 0.06, H / 2 - 0.06)
  const plateW = stripW - inset * 2
  const plateH = H - inset * 2
  const plateX = -W / 2 + stripW / 2
  const plateTop = H / 2 - inset
  const plateBottom = -H / 2 + inset
  const plateRadius = Math.min(
    Math.max(0.04, p.body.radius - inset * 0.55),
    plateW / 2 - 0.01,
    plateH / 2 - 0.01,
  )
  const plateFace = bodyFace + p.strip.panelExtrude
  const down = (t) => plateTop - plateH * t

  /* --- the disc / graphic / screen column --- */
  const pad = p.content.pad
  const gap = p.content.gap
  const areaL = seamX + slot / 2 + pad
  const areaR = W / 2 - pad
  const areaW = Math.max(0.6, areaR - areaL)
  const areaCx = (areaL + areaR) / 2

  const screenH = H * p.screen.height
  const screenY = -H / 2 + pad + screenH / 2
  const assetH = H * p.asset.height
  const assetY = screenY + screenH / 2 + gap + assetH / 2

  const zoneTop = H / 2 - pad
  const zoneBottom = assetY + assetH / 2 + gap
  const discR =
    Math.min(areaW / 2, Math.max(0.4, (zoneTop - zoneBottom) / 2)) * p.disc.radiusScale
  const discY = zoneTop - discR // spec: the disc is anchored to the top of the machine

  /* --- controls down the plate --- */
  const count = Math.max(1, Math.round(p.buttons.count))
  const groupIds = ['transport', 'preset', 'eject']
  const buttons = []
  for (let i = 0; i < count; i++) {
    buttons.push({
      x: plateX,
      y: down(p.buttons.groupStart + i * p.buttons.spacing),
      id: groupIds[i] ?? `aux${i}`,
    })
  }
  buttons.push({
    x: plateX,
    y: plateBottom + plateH * p.buttons.bottomInset,
    id: 'split',
  })

  const screwPad = plateW * p.screws.padRatio
  const screws = [-1, 1].flatMap((sx) =>
    [1, -1].map((sy) => ({
      x: plateX + sx * (plateW / 2 - screwPad),
      y: sy * (plateH / 2 - screwPad),
    })),
  )

  return {
    W,
    H,
    depth: D,
    bodyFace,
    frontDepth,
    backDepth,
    seamX,
    slot,
    slotDepth: p.strip.slotDepth,
    stripPanel: { w: stripPanelW, x: -W / 2 + stripPanelW / 2 },
    mainPanel: { w: mainW, x: W / 2 - mainW / 2 },
    plate: {
      w: plateW,
      h: plateH,
      x: plateX,
      radius: plateRadius,
      face: plateFace,
      top: plateTop,
      bottom: plateBottom,
      extrude: p.strip.panelExtrude,
    },
    knob: {
      x: plateX,
      y: down(p.knob.position),
      r: plateW * p.knob.radiusRatio,
      depth: plateW * p.knob.radiusRatio * p.knob.depthRatio,
    },
    buttons,
    buttonR: plateW * p.buttons.radiusRatio,
    leds: {
      // the cluster is centred on the button column, not tucked to one side
      y: down(p.leds.position),
      xs: (() => {
        const n = Math.max(1, Math.round(p.leds.count))
        return Array.from(
          { length: n },
          (_, i) => plateX + (i - (n - 1) / 2) * plateW * p.leds.spacing,
        )
      })(),
      r: plateW * p.leds.size,
    },
    screwR: plateW * p.screws.radiusRatio,
    screws,
    disc: {
      x: areaCx,
      y: discY,
      r: discR,
      backdrop: discR + p.disc.backdropGap,
      recess: Math.min(p.disc.recessDepth, frontDepth * 0.82),
      thickness: discR * 0.0105 * p.disc.thickness,
      rimBevel: Math.min(p.disc.rimBevel, p.disc.recessDepth * 0.85),
    },
    asset: { x: areaCx, y: assetY, w: areaW, h: assetH, radius: Math.min(0.22, assetH * 0.28) },
    screen: {
      x: areaCx,
      y: screenY,
      w: areaW,
      h: screenH,
      radius: Math.min(p.body.radius * 0.5, screenH * 0.3),
    },
  }
}
