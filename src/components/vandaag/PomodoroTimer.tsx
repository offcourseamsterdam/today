import { Play, Pause, RotateCcw } from 'lucide-react'
import { useStore } from '../../store'
import { usePomodoro } from '../../hooks/usePomodoro'
import { TIER_DURATIONS } from '../../lib/calendar'
import type { PlanTier } from '../../types'

interface PomodoroTimerProps {
  onStartFocus?: () => void
  tier?: PlanTier
}

export function PomodoroTimer({ onStartFocus, tier }: PomodoroTimerProps) {
  const settings = useStore(s => s.settings)
  const activeTier = tier ?? 'deep'
  const workMinutes = activeTier === 'deep'
    ? settings.pomodoroMinutes
    : TIER_DURATIONS[activeTier].workMinutes
  const breakMinutes = activeTier === 'deep'
    ? settings.breakMinutes
    : TIER_DURATIONS[activeTier].breakMinutes
  const targetSessions = TIER_DURATIONS[activeTier].targetSessions

  const {
    isRunning,
    isBreak,
    sessionsCompleted,
    progress,
    minutes,
    seconds,
    toggle,
    reset,
  } = usePomodoro({ workMinutes, breakMinutes })

  function handlePlayPause() {
    if (!isRunning && !isBreak && onStartFocus) {
      onStartFocus()
    }
    toggle()
  }

  return (
    <div className="flex items-center gap-4">
      {/* Timer circle */}
      <div className="relative w-16 h-16">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
          <circle
            cx="32" cy="32" r="28"
            fill="none"
            stroke="var(--color-border-light)"
            strokeWidth="3"
          />
          <circle
            cx="32" cy="32" r="28"
            fill="none"
            stroke={isBreak ? 'var(--color-citadel-accent)' : 'var(--color-cat-marketing)'}
            strokeWidth="3"
            strokeDasharray={`${2 * Math.PI * 28}`}
            strokeDashoffset={`${2 * Math.PI * 28 * (1 - progress)}`}
            strokeLinecap="round"
            className="transition-[stroke-dashoffset] duration-1000 ease-linear"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[15px] font-medium text-charcoal tabular-nums">
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <button
            onClick={handlePlayPause}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all
              ${isRunning
                ? 'bg-stone/10 text-stone hover:bg-stone/20'
                : 'bg-charcoal text-canvas hover:bg-charcoal/90'}`}
          >
            {isRunning ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
          </button>
          <button
            onClick={reset}
            className="w-8 h-8 rounded-full flex items-center justify-center
              text-stone/40 hover:text-stone hover:bg-stone/10 transition-all"
          >
            <RotateCcw size={14} />
          </button>
        </div>
        <div className="text-[10px] uppercase tracking-wider text-stone/60">
          {isBreak ? 'Break' : `Session ${sessionsCompleted + 1} / ${targetSessions}`}
          {sessionsCompleted > 0 && !isBreak && (
            <span className="text-green ml-1">({sessionsCompleted} done)</span>
          )}
        </div>
      </div>
    </div>
  )
}
