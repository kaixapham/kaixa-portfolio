import * as THREE from 'three'
import { roundedRectShape } from './device.js'

export const PRESETS = ['Spectrum', 'Waveform', 'Ripple', 'Grid', 'Pulse']

const INSET = 0.11

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const FRAG = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform float uPresetA;
  uniform float uPresetB;
  uniform float uMix;
  uniform float uIntensity;
  uniform vec3  uColor;
  uniform vec2  uSize;
  uniform sampler2D uFreq;   // 256x1 log-spaced spectrum
  uniform sampler2D uWave;   // 256x1 time domain, 0.5 = silence
  uniform float uAudio;      // 0 = generative, 1 = driven by the signal
  uniform float uLevel;
  varying vec2 vUv;

  float hash(float n) { return fract(sin(n) * 43758.5453123); }

  float hash2(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash2(i);
    float b = hash2(i + vec2(1.0, 0.0));
    float c = hash2(i + vec2(0.0, 1.0));
    float d = hash2(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  /* ---------------- fields ---------------- */

  float spectrum(vec2 uv, float t) {
    float bands = 52.0;
    float band = floor(uv.x * bands);
    float live = texture2D(uFreq, vec2((band + 0.5) / bands, 0.5)).r;
    float seed = hash(band * 1.37);
    float slow = 0.5 + 0.5 * sin(t * (0.7 + seed * 1.9) + seed * 12.0);
    float fast = 0.5 + 0.5 * sin(t * (3.1 + seed * 4.0) + band * 0.6);
    float tilt = mix(1.0, 0.42, uv.x);
    float synthetic = (slow * 0.62 + fast * 0.38) * tilt * 0.92 + 0.06;
    float h = mix(synthetic, live * 0.95 + 0.04, uAudio);
    float body = smoothstep(0.02, 0.0, uv.y - h) * 0.62;
    float cap = smoothstep(0.045, 0.0, abs(uv.y - h)) * 1.4;
    float peak = smoothstep(0.02, 0.0, abs(uv.y - (h * 0.35 + 0.6 + 0.28 * sin(t * 0.6 + seed * 9.0)))) * 0.5;
    float gutter = smoothstep(0.06, 0.22, abs(fract(uv.x * bands) - 0.5) * 2.0);
    return (body + cap + peak) * mix(0.25, 1.0, 1.0 - gutter);
  }

  float waveform(vec2 uv, float t) {
    float v = 0.0;
    float live = (texture2D(uWave, vec2(uv.x, 0.5)).r - 0.5) * 2.0;
    for (float i = 0.0; i < 3.0; i += 1.0) {
      float ph = t * (1.6 + i * 0.55) + i * 2.1;
      float synthetic = 0.5
        + 0.20 * sin(uv.x * 9.0 + ph) * sin(uv.x * 2.3 - ph * 0.4)
        + 0.07 * sin(uv.x * 33.0 - ph * 2.4)
        + 0.04 * (vnoise(vec2(uv.x * 14.0, t * 0.9 + i)) - 0.5);
      float traced = 0.5 + live * (0.42 - i * 0.1);
      float y = mix(synthetic, traced, uAudio);
      float line = smoothstep(0.075, 0.0, abs(uv.y - y));
      v = max(v, line * (1.0 - i * 0.3));
    }
    return v;
  }

  float ripple(vec2 uv, float t) {
    vec2 q = (uv - vec2(0.5)) * vec2(uSize.x / uSize.y, 1.0) * 2.0;
    float r = length(q);
    float a = atan(q.y, q.x);
    float wobble = 0.14 * sin(a * 6.0 + t * 1.3);
    float rings = 0.5 + 0.5 * sin((r + wobble) * 15.0 - t * 3.4);
    rings = pow(rings, 3.0);
    float pulse = mix(0.6 + 0.4 * sin(t * 1.1), 0.25 + uLevel * 2.6, uAudio);
    return rings * exp(-r * 0.85) * pulse * 1.5;
  }

  float grid(vec2 uv, float t) {
    const float horizonY = 0.66;
    float below = horizonY - uv.y;
    float horizon = smoothstep(0.045, 0.0, abs(uv.y - horizonY)) * 0.95;
    if (below <= 0.0) return horizon;

    // one ground plane running to a horizon, not a mirrored bowtie
    float depth = 0.42 / below;
    float x = (uv.x - 0.5) * depth * 6.0;
    float z = depth * 2.2 + t * 2.2;
    float gx = abs(fract(x) - 0.5) * 2.0;
    float gz = abs(fract(z) - 0.5) * 2.0;
    float lines = max(smoothstep(0.17, 0.0, gx), smoothstep(0.13, 0.0, gz));
    float fade = smoothstep(0.0, 0.1, below) * smoothstep(0.68, 0.22, below);
    float drive = mix(1.0, 0.5 + uLevel * 2.2, uAudio);
    return (lines * fade * 1.7 + horizon) * drive;
  }

  float pulseMeter(vec2 uv, float t) {
    float rows = 4.0;
    float row = floor(uv.y * rows);
    float ry = fract(uv.y * rows);
    float seed = hash(row * 5.11);
    float synthetic = 0.5 + 0.5 * sin(t * (1.1 + seed * 2.2) + seed * 8.0);
    float live = texture2D(uFreq, vec2((row + 0.5) / rows, 0.5)).r;
    float level = pow(mix(synthetic, live, uAudio), 0.7);
    float seg = floor(uv.x * 34.0) / 34.0;
    float lit = step(seg, level);
    float head = smoothstep(0.05, 0.0, abs(seg - level)) * 1.2;
    float bar = smoothstep(0.12, 0.30, ry) * smoothstep(0.88, 0.70, ry);
    return (lit * 0.5 + head) * bar;
  }

  float field(float id, vec2 uv, float t) {
    if (id < 0.5) return spectrum(uv, t);
    if (id < 1.5) return waveform(uv, t);
    if (id < 2.5) return ripple(uv, t);
    if (id < 3.5) return grid(uv, t);
    return pulseMeter(uv, t);
  }

  void main() {
    vec2 uv = vUv;

    // dot-matrix sampling grid
    vec2 cells = vec2(132.0, 34.0);
    vec2 g = uv * cells;
    vec2 cellUv = (floor(g) + 0.5) / cells;
    vec2 f = fract(g) - 0.5;
    float dotMask = 1.0 - smoothstep(0.20, 0.40, length(f));

    float t = uTime;
    float a = field(uPresetA, cellUv, t);
    float b = field(uPresetB, cellUv, t);
    float v = mix(a, b, uMix);

    v = clamp(v, 0.0, 1.6);

    // panel edge falloff + faint idle grid so the display never reads dead
    vec2 e = abs(uv - 0.5) * 2.0;
    float border = (1.0 - smoothstep(0.90, 1.0, max(e.x, e.y)));
    float idle = 0.035;

    float lum = (v * uIntensity + idle) * dotMask * border;

    // subtle refresh flicker and horizontal scan
    lum *= 0.94 + 0.06 * sin(t * 31.0 + uv.y * 90.0);

    vec3 col = uColor * lum;
    col += uColor * pow(lum, 2.2) * 0.55;      // bloom-ish core
    col += vec3(0.02, 0.024, 0.03) * border;   // glass ambience

    gl_FragColor = vec4(col, 1.0);
  }
`

/**
 * The display lives across rebuilds: its uniforms hold the running preset,
 * colour and intensity, so reshaping the deck never resets what is on screen.
 */
export function createDisplay() {
  const uniforms = {
    uTime: { value: 0 },
    uPresetA: { value: 0 },
    uPresetB: { value: 0 },
    uMix: { value: 0 },
    uIntensity: { value: 0.85 },
    uColor: { value: new THREE.Color('#ff9a3c') },
    uSize: { value: new THREE.Vector2(1, 1) },
    uFreq: { value: null },
    uWave: { value: null },
    uAudio: { value: 0 },
    uLevel: { value: 0 },
  }

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  })

  const state = { preset: 0, next: 0, mix: 0 }

  /** Crossfade from whatever is on screen to `index`. */
  function setPreset(index) {
    const target = ((index % PRESETS.length) + PRESETS.length) % PRESETS.length
    if (target === state.next) return
    state.preset = state.mix > 0 ? state.next : state.preset
    state.next = target
    state.mix = 0
    uniforms.uPresetA.value = state.preset
    uniforms.uPresetB.value = state.next
    uniforms.uMix.value = 0
  }

  function update(dt, time) {
    uniforms.uTime.value = time
    if (state.next !== state.preset) {
      state.mix = Math.min(1, state.mix + dt * 2.4)
      uniforms.uMix.value = state.mix
      if (state.mix >= 1) {
        state.preset = state.next
        state.mix = 0
        uniforms.uPresetA.value = state.preset
        uniforms.uPresetB.value = state.preset
        uniforms.uMix.value = 0
      }
    }
  }

  return { uniforms, material, state, setPreset, update }
}

/** Geometry for the current layout: the emissive panel and its glass. */
export function buildScreenMeshes(display, materials, layout, hud) {
  const { x, y, w, h, radius } = layout.screen
  const inset = Math.min(INSET, h * 0.12)
  const pw = w - inset * 2
  const ph = h - inset * 2
  display.uniforms.uSize.value.set(pw, ph)

  const panel = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph, 1, 1), display.material)
  panel.position.set(x, y, layout.bodyFace + 0.016)
  panel.renderOrder = 2

  const glass = new THREE.Mesh(
    new THREE.ShapeGeometry(roundedRectShape(w - 0.04, h - 0.04, radius), 16),
    materials.glass,
  )
  glass.position.set(x, y, layout.bodyFace + 0.028)
  glass.renderOrder = 4

  // the corner readouts sit between the dot matrix and the glass
  const readout = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), hud.material)
  readout.position.set(x, y, layout.bodyFace + 0.022)
  readout.renderOrder = 3

  return { panel, glass, readout }
}
