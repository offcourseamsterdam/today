import { useEffect, useRef } from 'react'

interface AudioLevelBarsProps {
  stream: MediaStream | null
}

const BAR_COUNT = 5
const BAR_WIDTH = 2
const BAR_GAP = 2
const MAX_HEIGHT = 14

export function AudioLevelBars({ stream }: AudioLevelBarsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const ctxRef = useRef<AudioContext | null>(null)

  useEffect(() => {
    if (!stream) return

    const audioCtx = new AudioContext()
    ctxRef.current = audioCtx
    const analyser = audioCtx.createAnalyser()
    analyser.fftSize = 64
    analyser.smoothingTimeConstant = 0.7

    const source = audioCtx.createMediaStreamSource(stream)
    source.connect(analyser)

    const dataArray = new Uint8Array(analyser.frequencyBinCount)
    const totalWidth = BAR_COUNT * BAR_WIDTH + (BAR_COUNT - 1) * BAR_GAP

    function draw() {
      animRef.current = requestAnimationFrame(draw)
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      analyser.getByteFrequencyData(dataArray)

      ctx.clearRect(0, 0, totalWidth, MAX_HEIGHT)

      // Pick spaced frequency bins for visual variety
      const step = Math.max(1, Math.floor(dataArray.length / BAR_COUNT))
      for (let i = 0; i < BAR_COUNT; i++) {
        const value = dataArray[i * step] / 255
        const minH = 2
        const barH = Math.max(minH, value * MAX_HEIGHT)
        const x = i * (BAR_WIDTH + BAR_GAP)
        const y = MAX_HEIGHT - barH

        ctx.fillStyle = '#f87171' // red-400
        ctx.beginPath()
        ctx.roundRect(x, y, BAR_WIDTH, barH, 1)
        ctx.fill()
      }
    }

    draw()

    return () => {
      cancelAnimationFrame(animRef.current)
      source.disconnect()
      audioCtx.close()
      ctxRef.current = null
    }
  }, [stream])

  const totalWidth = BAR_COUNT * BAR_WIDTH + (BAR_COUNT - 1) * BAR_GAP

  if (!stream) return null

  return (
    <canvas
      ref={canvasRef}
      width={totalWidth}
      height={MAX_HEIGHT}
      className="flex-shrink-0"
      style={{ width: totalWidth, height: MAX_HEIGHT }}
    />
  )
}
