/**
 * Plays a short chime using the Web Audio API.
 * type: 'work' — end of focus session (two ascending tones)
 * type: 'break' — end of break (one gentle tone)
 */
export function playChime(type: 'work' | 'break') {
  try {
    const ctx = new AudioContext()

    const notes = type === 'work'
      ? [{ freq: 523.25, start: 0, duration: 0.18 },   // C5
         { freq: 659.25, start: 0.2, duration: 0.18 },  // E5
         { freq: 783.99, start: 0.4, duration: 0.35 }]  // G5
      : [{ freq: 659.25, start: 0, duration: 0.4 }]     // E5 single tone

    notes.forEach(({ freq, start, duration }) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start)

      gain.gain.setValueAtTime(0, ctx.currentTime + start)
      gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration)

      osc.start(ctx.currentTime + start)
      osc.stop(ctx.currentTime + start + duration)
    })

    // Close context after sounds finish
    setTimeout(() => ctx.close(), (notes[notes.length - 1].start + notes[notes.length - 1].duration + 0.1) * 1000)
  } catch {
    // AudioContext not available (e.g. SSR) — silently ignore
  }
}
