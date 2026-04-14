import { Play, Pause, Square } from 'lucide-react'
import { useStore } from '../../store'

export function MiniTimerBar() {
  const inlineTimer = useStore(s => s.inlineTimer)
  const pauseInlineTimer = useStore(s => s.pauseInlineTimer)
  const resumeInlineTimer = useStore(s => s.resumeInlineTimer)
  const stopInlineTimer = useStore(s => s.stopInlineTimer)

  if (!inlineTimer) return null

  const { secondsLeft, isRunning, isBreak, linkedItemTitle } = inlineTimer
  const minutes = Math.floor(secondsLeft / 60)
  const seconds = secondsLeft % 60
  const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

  return (
    <div className="fixed bottom-4 left-4 right-4 z-40 lg:hidden">
      <div className="bg-citadel-bg border border-citadel-text/10 rounded-xl px-4 py-2.5
        flex items-center gap-3 shadow-modal animate-slide-up">
        {/* Play/Pause */}
        <button
          onClick={() => isRunning ? pauseInlineTimer() : resumeInlineTimer()}
          className="w-8 h-8 rounded-full flex items-center justify-center
            bg-citadel-text/15 text-citadel-text hover:bg-citadel-text/20 transition-all flex-shrink-0"
        >
          {isRunning ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
        </button>

        {/* Timer + label */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[14px] text-citadel-text tabular-nums font-light">
              {timeStr}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-citadel-accent/50">
              {isBreak ? 'Break' : 'Focus'}
            </span>
          </div>
          {linkedItemTitle && (
            <p className="text-[11px] text-citadel-text/30 truncate">
              {linkedItemTitle}
            </p>
          )}
        </div>

        {/* Stop */}
        <button
          onClick={stopInlineTimer}
          className="text-citadel-text/20 hover:text-citadel-text/40 transition-colors flex-shrink-0 p-1"
        >
          <Square size={14} />
        </button>
      </div>
    </div>
  )
}
