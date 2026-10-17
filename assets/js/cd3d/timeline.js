/**
 * A camera route: an ordered list of views, each with a hold and a travel time.
 *
 * The model is deliberately time-based rather than frame-based, and it exposes
 * a single \`sample(t)\` — so the same route can be driven by a clock (play), by
 * a slider (scrub), or by scroll position. That last one is the point: a web
 * scroll interaction is exactly "map scroll offset to a normalised time".
 */
export function createTimeline(defaults = []) {
  const state = {
    steps: defaults.map((s) => ({ view: s.view, hold: s.hold ?? 0.6, travel: s.travel ?? 1.2 })),
    playing: false,
    loop: true,
    speed: 1,
    scroll: false, // Lenis drives the route instead of the clock
    smooth: 0.09, // Lenis lerp
    pages: 5, // scroll length, in viewport heights
    t: 0,
  }

  /** Flatten the steps into hold/move segments, once per query. */
  function segments() {
    const segs = []
    const steps = state.steps
    if (!steps.length) return segs
    steps.forEach((step, i) => {
      if (step.hold > 0) segs.push({ kind: 'hold', to: step.view, dur: step.hold })
      const next = steps[i + 1] ?? (state.loop ? steps[0] : null)
      if (next && step.travel > 0) {
        segs.push({ kind: 'move', from: step.view, to: next.view, dur: step.travel })
      }
    })
    return segs
  }

  function duration() {
    return segments().reduce((sum, seg) => sum + seg.dur, 0)
  }

  /** Where the camera should be at time `t`, as a blend of two views. */
  function sample(t) {
    const segs = segments()
    if (!segs.length) return null
    const total = segs.reduce((sum, seg) => sum + seg.dur, 0)
    if (total <= 0) return { from: segs[0].to, to: segs[0].to, k: 0 }

    let time = state.loop ? ((t % total) + total) % total : Math.min(Math.max(t, 0), total)
    for (const seg of segs) {
      if (time <= seg.dur) {
        if (seg.kind === 'hold') return { from: seg.to, to: seg.to, k: 0 }
        return { from: seg.from, to: seg.to, k: seg.dur > 0 ? time / seg.dur : 1 }
      }
      time -= seg.dur
    }
    const last = segs[segs.length - 1]
    return { from: last.to, to: last.to, k: 1 }
  }

  return {
    state,
    duration,
    sample,
    advance(dt) {
      if (!state.playing) return
      const total = duration()
      if (total <= 0) return
      state.t += dt * state.speed
      if (state.loop) state.t = ((state.t % total) + total) % total
      else if (state.t >= total) {
        state.t = total
        state.playing = false
      }
    },
    /** 0–1 across the whole route, which is what scroll maps onto. */
    get progress() {
      const total = duration()
      return total > 0 ? state.t / total : 0
    },
    set progress(v) {
      state.t = Math.min(Math.max(v, 0), 1) * duration()
    },
    add(view) {
      state.steps.push({ view, hold: 0.6, travel: 1.2 })
    },
    remove(index) {
      state.steps.splice(index, 1)
    },
    move(index, delta) {
      const to = index + delta
      if (to < 0 || to >= state.steps.length) return
      const [step] = state.steps.splice(index, 1)
      state.steps.splice(to, 0, step)
    },
  }
}
