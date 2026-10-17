import * as THREE from 'three'

/**
 * The four corner readouts on the display. They are drawn into a canvas rather
 * than built from geometry: text stays crisp at any camera distance, and the
 * whole thing is one transparent plane sitting over the dot-matrix shader.
 *
 * The canvas is drawn in white and tinted by the material, so changing the
 * colour costs nothing — only the strings, size, padding and tracking force a
 * redraw.
 */
export function createHud() {
  const canvas = document.createElement('canvas')
  canvas.width = 2048
  canvas.height = 512

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 16

  const material = new THREE.MeshBasicMaterial({
    map: texture,
    color: new THREE.Color('#cfd6dd'),
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  })

  function draw(aspect, hud) {
    const width = 2048
    const height = Math.max(64, Math.round(width / Math.max(0.2, aspect)))
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width
      canvas.height = height
    }

    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, width, height)
    if (!hud.show) {
      texture.needsUpdate = true
      return
    }

    const pad = hud.padding * height
    const size = hud.fontSize * height
    ctx.font = `600 ${size}px ui-monospace, "SF Mono", "Roboto Mono", Menlo, monospace`
    ctx.fillStyle = '#ffffff'
    // letterSpacing is the only way to track canvas text without hand-kerning
    try {
      ctx.letterSpacing = `${hud.tracking}em`
    } catch {
      // older engines simply render untracked
    }

    const rows = [
      { text: hud.nowPlaying, x: pad, y: pad, align: 'left', baseline: 'top' },
      { text: hud.time, x: width - pad, y: pad, align: 'right', baseline: 'top' },
      { text: hud.album, x: pad, y: height - pad, align: 'left', baseline: 'alphabetic' },
      {
        text: hud.track,
        x: width - pad,
        y: height - pad,
        align: 'right',
        baseline: 'alphabetic',
      },
    ]

    for (const row of rows) {
      if (!row.text) continue
      ctx.textAlign = row.align
      ctx.textBaseline = row.baseline
      ctx.fillText(row.text, row.x, row.y)
    }

    texture.needsUpdate = true
  }

  return { material, texture, draw, setColor: (hex) => material.color.set(hex) }
}

/** Seconds as m:ss, the way a deck shows elapsed time. */
export function formatTime(seconds) {
  const total = Math.max(0, Math.floor(seconds))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
