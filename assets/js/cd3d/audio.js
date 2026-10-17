import * as THREE from 'three'

const BINS = 256

/**
 * Live audio into the display.
 *
 * A browser cannot tap system-wide audio — that is a deliberate security
 * boundary, not a missing API. So there are three real routes:
 *
 *  - `mic`  getUserMedia. Works with any app on the machine because it hears
 *           the speakers. Also the only route that works on macOS for audio
 *           coming out of a native app like Spotify or Apple Music.
 *  - `tab`  getDisplayMedia with audio. A clean digital signal, but the sound
 *           has to be playing inside a browser tab that you pick when sharing.
 *           On macOS, Chrome offers tab audio only — never the whole system.
 *  - `file` A local audio file played by the page. Cleanest of all, and the
 *           only one with no permission prompt.
 *
 * Routing the system through a virtual device (BlackHole, Loopback) and then
 * picking it as the microphone gives the `mic` route a clean signal too.
 */
/** Turn the browser's terse capture errors into something actionable. */
function describe(error) {
  if (error?.name === 'NotAllowedError') {
    return 'Bị chặn quyền. Preview pane trong Claude Code không cho truy cập micro — mở http://localhost:3114 bằng Chrome rồi bấm lại.'
  }
  if (error?.name === 'NotFoundError') return 'Không tìm thấy thiết bị âm thanh nào.'
  return error?.message ?? 'Không kết nối được nguồn âm thanh.'
}

export function createAudio() {
  const freqData = new Uint8Array(BINS)
  const waveData = new Uint8Array(BINS)

  const freqTexture = dataTexture(freqData)
  const waveTexture = dataTexture(waveData)

  let context = null
  let analyser = null
  let source = null
  let stream = null
  let element = null

  const state = { source: 'off', level: 0, gain: 1.6, smoothing: 0.8, error: null }

  function dataTexture(data) {
    const texture = new THREE.DataTexture(data, BINS, 1, THREE.RedFormat)
    texture.minFilter = THREE.LinearFilter
    texture.magFilter = THREE.LinearFilter
    texture.needsUpdate = true
    return texture
  }

  function ensureContext() {
    if (!context) {
      context = new (window.AudioContext ?? window.webkitAudioContext)()
      analyser = context.createAnalyser()
      analyser.fftSize = 1024
      analyser.smoothingTimeConstant = state.smoothing
    }
    if (context.state === 'suspended') context.resume()
    return context
  }

  function disconnect() {
    source?.disconnect()
    source = null
    stream?.getTracks().forEach((track) => track.stop())
    stream = null
    if (element) {
      element.pause()
      element.remove()
      element = null
    }
    state.source = 'off'
    state.level = 0
    freqData.fill(0)
    waveData.fill(128)
    freqTexture.needsUpdate = true
    waveTexture.needsUpdate = true
  }

  async function useStream(media, label) {
    disconnect()
    ensureContext()
    stream = media
    source = context.createMediaStreamSource(media)
    source.connect(analyser)
    state.source = label
    state.error = null
  }

  return {
    freqTexture,
    waveTexture,
    state,

    async connectMic() {
      try {
        const media = await navigator.mediaDevices.getUserMedia({
          // the browser's voice processing would flatten music into mush
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
        })
        await useStream(media, 'mic')
      } catch (error) {
        state.error = describe(error)
        throw error
      }
    },

    async connectTab() {
      try {
        const media = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        })
        if (!media.getAudioTracks().length) {
          media.getTracks().forEach((t) => t.stop())
          throw new Error('Nguồn đã chọn không có audio — nhớ tick "Share tab audio"')
        }
        // the picture is irrelevant; only the audio track is kept alive
        media.getVideoTracks().forEach((track) => track.stop())
        await useStream(media, 'tab')
      } catch (error) {
        state.error = describe(error)
        throw error
      }
    },

    connectFile(file) {
      return this.connectURL(URL.createObjectURL(file))
    },

    /** Attach an audio URL without starting it — play() is the deck's job. */
    connectURL(url) {
      disconnect()
      ensureContext()
      element = document.createElement('audio')
      element.src = url
      element.loop = true
      element.crossOrigin = 'anonymous'
      element.style.display = 'none'
      document.body.appendChild(element)
      source = context.createMediaElementSource(element)
      source.connect(analyser)
      source.connect(context.destination) // so you can actually hear it
      state.source = 'file'
      state.error = null
      return element
    },

    play() {
      if (context?.state === 'suspended') context.resume()
      element?.play()
    },
    pause() {
      element?.pause()
    },
    get element() {
      return element
    },

    disconnect,

    setSmoothing(v) {
      state.smoothing = v
      if (analyser) analyser.smoothingTimeConstant = v
    },

    /** Pull one frame of spectrum and waveform into the textures. */
    update() {
      if (!analyser || state.source === 'off') return 0

      const bins = analyser.frequencyBinCount
      const raw = new Uint8Array(bins)
      analyser.getByteFrequencyData(raw)

      // music reads on a log scale; a linear FFT crams everything into the left
      let sum = 0
      for (let i = 0; i < BINS; i++) {
        const t = i / (BINS - 1)
        const index = Math.min(bins - 1, Math.round(Math.pow(t, 2.1) * (bins - 1)))
        const v = Math.min(255, raw[index] * state.gain)
        freqData[i] = v
        sum += v
      }
      freqTexture.needsUpdate = true

      const wave = new Uint8Array(bins)
      analyser.getByteTimeDomainData(wave)
      for (let i = 0; i < BINS; i++) {
        waveData[i] = wave[Math.round((i / (BINS - 1)) * (bins - 1))]
      }
      waveTexture.needsUpdate = true

      state.level = sum / BINS / 255
      return state.level
    },
  }
}
