import * as THREE from 'three'

/**
 * Holographic sticker sheen for the side tag.
 *
 * A hologram is a diffraction grating: fine parallel ridges split light so the
 * colour you see depends on the angle you see it from. So this cannot be a
 * texture — the hue has to be computed per pixel from the view direction, or
 * it reads as a printed rainbow rather than foil that moves as you orbit.
 */
const VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vViewPos;
  varying vec3 vNormalView;
  void main() {
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vViewPos = mv.xyz;
    vNormalView = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * mv;
  }
`

const FRAG = /* glsl */ `
  precision highp float;

  uniform float uIntensity;
  uniform float uScale;   // ridges across the sticker
  uniform float uAngle;   // grating direction, degrees
  uniform float uSheen;   // how much the edges flare
  uniform float uTime;
  uniform float uSpeed;

  varying vec2 vUv;
  varying vec3 vViewPos;
  varying vec3 vNormalView;

  vec3 spectrum(float t) {
    return 0.5 + 0.5 * cos(6.28318 * (vec3(0.0, 0.33, 0.67) + t));
  }

  void main() {
    vec3 view = normalize(-vViewPos);
    vec3 normal = normalize(vNormalView);
    float ndv = clamp(dot(normal, view), 0.0, 1.0);

    float a = radians(uAngle);
    vec2 dir = vec2(cos(a), sin(a));
    float grating = dot(vUv - 0.5, dir) * uScale;

    // the two together are what make it move: ridge position and view angle
    float shift = grating * 0.15 + (1.0 - ndv) * 2.6 + uTime * uSpeed;
    vec3 col = spectrum(fract(shift));

    float ridges = 0.5 + 0.5 * cos(grating * 6.28318);
    float flare = pow(1.0 - ndv, 2.2) * uSheen;
    float amount = uIntensity * (0.3 + 0.7 * ridges) * (0.45 + flare);

    gl_FragColor = vec4(col * amount, 1.0);
  }
`

export function createHologram() {
  const uniforms = {
    uIntensity: { value: 0.5 },
    uScale: { value: 26 },
    uAngle: { value: 24 },
    uSheen: { value: 1.1 },
    uTime: { value: 0 },
    uSpeed: { value: 0.12 },
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

  return {
    material,
    uniforms,
    update(time) {
      uniforms.uTime.value = time
    },
    apply(cfg) {
      uniforms.uIntensity.value = cfg.intensity
      uniforms.uScale.value = cfg.scale
      uniforms.uAngle.value = cfg.angle
      uniforms.uSheen.value = cfg.sheen
      uniforms.uSpeed.value = cfg.speed
    },
  }
}
