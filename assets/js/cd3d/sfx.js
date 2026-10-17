/**
 * Interface sounds, synthesised rather than sampled.
 *
 * Everything is built from four generators — a pitch-bent oscillator voice,
 * swept bandpassed noise for mechanisms, sparse high-passed impulses for
 * static, and a formant pair for vocoder colour — plus a shared output chain
 * of drive → resonant lowpass.
 *
 * A kit is a set of values over that same synthesis, never a different set of
 * samples. That is what keeps every sound in a kit related to the others: move
 * the pitch and all ten shift together instead of drifting apart.
 *
 * The dimensions that are not simple multipliers, and why they exist:
 *   ring     ring-modulates the voice against a low oscillator — the beating
 *            buzz of mains hum and arcing, not just a second tone stacked on.
 *   crackle  sparse high-passed impulses. Sparse is the point: solid noise
 *            reads as hiss, gaps read as electrical contact chatter.
 *   res      resonance on the output filter — the squelch in a synth zap.
 *   formant  two parallel bandpass peaks at vowel frequencies, which is how a
 *            talkbox or vocoder gets its robot-voice quality.
 */
export const SFX_KITS = {
  y2k: {
    label: 'Y2K',
    pitch: 1,
    length: 1,
    bright: 1,
    drive: 0.15,
    mech: 1,
    ring: 0,
    crackle: 0,
    res: 0.7,
    formant: 0,
    wave: 'triangle',
    accent: 'square',
  },
  electric: {
    label: 'Điện',
    pitch: 1.05,
    length: 0.9,
    bright: 1.15,
    drive: 0.55,
    mech: 0.7,
    ring: 78, // mains-ish buzz
    crackle: 0.55,
    res: 8.5,
    formant: 0,
    wave: 'sawtooth',
    accent: 'square',
  },
  laser: {
    label: 'Tia điện',
    pitch: 1.5,
    length: 0.7,
    bright: 1.4,
    drive: 0.35,
    mech: 0.3,
    ring: 26,
    crackle: 0.3,
    res: 12,
    formant: 0,
    wave: 'sawtooth',
    accent: 'sawtooth',
  },
  daft: {
    label: 'Daft Punk',
    // French house: saw through a resonant filter, talkbox formants on top,
    // driven hard enough to bite
    pitch: 0.92,
    length: 1.25,
    bright: 0.82,
    drive: 0.62,
    mech: 0.55,
    ring: 0,
    crackle: 0.12,
    res: 9.5,
    formant: 0.8,
    wave: 'sawtooth',
    accent: 'square',
  },
  minimal: {
    label: 'Tối giản',
    pitch: 1.12,
    length: 0.72,
    bright: 0.66,
    drive: 0,
    mech: 0.35,
    ring: 0,
    crackle: 0,
    res: 0.7,
    formant: 0,
    wave: 'sine',
    accent: 'triangle',
  },
  mech: {
    label: 'Cơ khí',
    pitch: 0.78,
    length: 1.4,
    bright: 0.78,
    drive: 0.28,
    mech: 1.9,
    ring: 0,
    crackle: 0.2,
    res: 1.4,
    formant: 0,
    wave: 'triangle',
    accent: 'sine',
  },
  arcade: {
    label: 'Arcade',
    pitch: 1.38,
    length: 0.82,
    bright: 1.3,
    drive: 0.45,
    mech: 0.45,
    ring: 0,
    crackle: 0,
    res: 2,
    formant: 0,
    wave: 'square',
    accent: 'square',
  },
  ambient: {
    label: 'Ambient',
    pitch: 0.92,
    length: 2.3,
    bright: 0.58,
    drive: 0,
    mech: 0.5,
    ring: 0,
    crackle: 0,
    res: 0.7,
    formant: 0.25,
    wave: 'sine',
    accent: 'triangle',
  },
}

export const SFX_KIT_KEYS = Object.keys(SFX_KITS)

/** Fields a kit seeds into the live state. */
export const SFX_FIELDS = [
  'pitch',
  'length',
  'bright',
  'drive',
  'mech',
  'ring',
  'crackle',
  'res',
  'formant',
]

function driveCurve(amount) {
  const n = 1024
  const curve = new Float32Array(n)
  const k = amount * 24
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1
    curve[i] = k > 0 ? Math.tanh(x * (1 + k)) / Math.tanh(1 + k) : x
  }
  return curve
}

export function createSfx() {
  let ctx = null
  let master = null
  let shaper = null
  let tone = null

  const state = { enabled: true, volume: 0.35, kit: 'y2k', ...SFX_KITS.y2k }
  const kit = () => SFX_KITS[state.kit] ?? SFX_KITS.y2k

  function ensure() {
    if (!ctx) {
      ctx = new (window.AudioContext ?? window.webkitAudioContext)()
      master = ctx.createGain()
      shaper = ctx.createWaveShaper()
      tone = ctx.createBiquadFilter()
      tone.type = 'lowpass'
      master.connect(shaper).connect(tone).connect(ctx.destination)
      applyChain()
    }
    if (ctx.state === 'suspended') ctx.resume()
    return ctx
  }

  function applyChain() {
    if (!master) return
    master.gain.value = state.volume
    shaper.curve = driveCurve(state.drive)
    tone.frequency.value = 1400 + state.bright * 15000
    tone.Q.value = Math.max(0.001, state.res)
  }

  const L = () => state.length

  /** Two vowel peaks in parallel with the dry voice: talkbox colour. */
  function formantChain(t0, dur) {
    const mix = ctx.createGain()
    const dry = ctx.createGain()
    dry.gain.value = 1 - state.formant * 0.6
    dry.connect(master)

    const peaks = [
      { f: 620, to: 780, gain: 0.9 },
      { f: 1180, to: 1620, gain: 0.6 },
    ]
    for (const peak of peaks) {
      const bp = ctx.createBiquadFilter()
      bp.type = 'bandpass'
      bp.Q.value = 9
      bp.frequency.setValueAtTime(peak.f, t0)
      bp.frequency.linearRampToValueAtTime(peak.to, t0 + dur)
      const g = ctx.createGain()
      g.gain.value = state.formant * peak.gain
      mix.connect(bp).connect(g).connect(master)
    }
    mix.connect(dry)
    return mix
  }

  /** One plucked voice with a pitch bend. */
  function blip({ from, to, dur = 0.09, type, gain = 0.5, delay = 0 }) {
    const t0 = ctx.currentTime + delay * L()
    const d = dur * L()
    const osc = ctx.createOscillator()
    const env = ctx.createGain()
    osc.type = type ?? kit().wave
    osc.frequency.setValueAtTime(from * state.pitch, t0)
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, to * state.pitch), t0 + d)
    env.gain.setValueAtTime(0, t0)
    env.gain.linearRampToValueAtTime(gain, t0 + 0.004)
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + d)

    let sink = state.formant > 0.01 ? formantChain(t0, d) : master

    if (state.ring > 0.5) {
      const ring = ctx.createGain()
      const depthValue = Math.min(0.9, state.ring / 200)
      ring.gain.value = 1 - depthValue
      const mod = ctx.createOscillator()
      mod.type = 'sine'
      mod.frequency.value = state.ring
      const depth = ctx.createGain()
      depth.gain.value = depthValue
      mod.connect(depth).connect(ring.gain)
      mod.start(t0)
      mod.stop(t0 + d + 0.02)
      osc.connect(env).connect(ring).connect(sink)
    } else {
      osc.connect(env).connect(sink)
    }

    osc.start(t0)
    osc.stop(t0 + d + 0.02)
  }

  /** Bandpassed noise swept in pitch: motors, mechanisms, air. */
  function whirr({ from, to, dur = 0.35, q = 6, gain = 0.4, delay = 0 }) {
    const level = gain * state.mech
    if (level < 0.005) return
    const t0 = ctx.currentTime + delay * L()
    const d = dur * L()
    const frames = Math.ceil(ctx.sampleRate * d)
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1

    const src = ctx.createBufferSource()
    src.buffer = buffer
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.Q.value = q
    filter.frequency.setValueAtTime(from * state.pitch, t0)
    filter.frequency.exponentialRampToValueAtTime(Math.max(40, to * state.pitch), t0 + d)

    const env = ctx.createGain()
    env.gain.setValueAtTime(0, t0)
    env.gain.linearRampToValueAtTime(level, t0 + d * 0.18)
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + d)

    src.connect(filter).connect(env).connect(master)
    src.start(t0)
    src.stop(t0 + d + 0.02)
  }

  /** Sparse high-passed impulses: static, arcing, contact chatter. */
  function crackle({ dur = 0.09, gain = 0.3, delay = 0, density = 0.5 }) {
    const level = gain * state.crackle
    if (level < 0.004) return
    const t0 = ctx.currentTime + delay * L()
    const d = dur * L()
    const frames = Math.ceil(ctx.sampleRate * d)
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < frames; i++) {
      data[i] = Math.random() < density * 0.3 ? Math.random() * 2 - 1 : 0
    }

    const src = ctx.createBufferSource()
    src.buffer = buffer
    const hp = ctx.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = 2200
    const env = ctx.createGain()
    env.gain.setValueAtTime(level, t0)
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + d)
    src.connect(hp).connect(env).connect(master)
    src.start(t0)
    src.stop(t0 + d + 0.02)
  }

  const VOICES = {
    press() {
      blip({ from: 1750, to: 900, dur: 0.055, type: kit().accent, gain: 0.22 })
      blip({ from: 2620, to: 1400, dur: 0.045, gain: 0.12 })
      whirr({ from: 5200, to: 2400, dur: 0.045, q: 3, gain: 0.1 })
      crackle({ dur: 0.05, gain: 0.26, density: 0.7 })
    },
    play() {
      blip({ from: 660, to: 990, dur: 0.13, gain: 0.26 })
      blip({ from: 990, to: 1480, dur: 0.16, gain: 0.2, delay: 0.07 })
    },
    stop() {
      blip({ from: 980, to: 520, dur: 0.16, gain: 0.24 })
    },
    next() {
      crackle({ dur: 0.04, gain: 0.2, density: 0.5 })
      blip({ from: 1320, to: 1320, dur: 0.06, type: kit().accent, gain: 0.18 })
      blip({ from: 1980, to: 1980, dur: 0.08, gain: 0.16, delay: 0.055 })
    },
    powerOn() {
      crackle({ dur: 0.22, gain: 0.3, density: 0.35 })
      whirr({ from: 220, to: 3400, dur: 0.42, q: 2.5, gain: 0.16 })
      blip({ from: 320, to: 880, dur: 0.3, gain: 0.2, delay: 0.05 })
      blip({ from: 640, to: 1760, dur: 0.34, gain: 0.14, delay: 0.12 })
    },
    powerOff() {
      crackle({ dur: 0.12, gain: 0.34, density: 0.6 })
      whirr({ from: 2600, to: 180, dur: 0.4, q: 2.5, gain: 0.16 })
      blip({ from: 880, to: 180, dur: 0.36, gain: 0.2 })
    },
    eject() {
      whirr({ from: 480, to: 1500, dur: 0.5, q: 5, gain: 0.3 })
      blip({ from: 180, to: 140, dur: 0.34, type: 'sine', gain: 0.18 })
      blip({ from: 1600, to: 1180, dur: 0.07, type: kit().accent, gain: 0.1, delay: 0.44 })
    },
    load() {
      whirr({ from: 1500, to: 420, dur: 0.46, q: 5, gain: 0.3 })
      blip({ from: 150, to: 190, dur: 0.32, type: 'sine', gain: 0.2, delay: 0.1 })
      whirr({ from: 260, to: 90, dur: 0.1, q: 1.5, gain: 0.34, delay: 0.42 })
    },
    split() {
      const steps = [880, 1174, 1568, 2093]
      steps.forEach((f, i) => blip({ from: f, to: f * 1.01, dur: 0.13, gain: 0.14, delay: i * 0.05 }))
    },
    close() {
      const steps = [2093, 1568, 1174, 880]
      steps.forEach((f, i) => blip({ from: f, to: f * 0.99, dur: 0.11, gain: 0.12, delay: i * 0.045 }))
    },
  }

  return {
    state,
    play(name) {
      if (!state.enabled) return
      const voice = VOICES[name]
      if (!voice) return
      ensure()
      applyChain()
      voice()
    },
    apply(cfg) {
      Object.assign(state, cfg)
      applyChain()
    },
    setKit(name) {
      const k = SFX_KITS[name] ?? SFX_KITS.y2k
      state.kit = name
      for (const field of SFX_FIELDS) state[field] = k[field]
      applyChain()
      return k
    },
    get names() {
      return Object.keys(VOICES)
    },
  }
}
