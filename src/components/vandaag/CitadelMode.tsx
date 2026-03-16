import { useState, useRef } from 'react'
import { Play, Pause, RotateCcw, ArrowLeft } from 'lucide-react'
import { useStore } from '../../store'
import { usePomodoro } from '../../hooks/usePomodoro'
import { TIER_DURATIONS } from '../../lib/calendar'
import type { PlanTier } from '../../types'

interface CitadelModeProps {
  tier: PlanTier
  taskId: string
  taskTitle: string
  projectTitle?: string
  intention?: string
  onExit: () => void
}

export function CitadelMode({ tier, taskId, taskTitle, projectTitle, intention, onExit }: CitadelModeProps) {
  const addOrphanTask = useStore(s => s.addOrphanTask)
  const logPomodoroSession = useStore(s => s.logPomodoroSession)

  const { workMinutes, breakMinutes, targetSessions } = TIER_DURATIONS[tier]

  const {
    isRunning,
    isBreak,
    sessionsCompleted,
    progress,
    minutes,
    seconds,
    toggle: handlePlayPause,
    reset: handleReset,
  } = usePomodoro({
    workMinutes,
    breakMinutes,
    autoStart: true,
    onSessionComplete: () => logPomodoroSession(taskId, tier, workMinutes),
  })

  // Scratchpad — only shown for deep/short tiers
  const [thought, setThought] = useState('')
  const [captured, setCaptured] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  function handleCapture(e: React.FormEvent) {
    e.preventDefault()
    if (!thought.trim()) return
    addOrphanTask(thought.trim())
    setCaptured(prev => [...prev, thought.trim()])
    setThought('')
    inputRef.current?.focus()
  }

  const radius = 120
  const circumference = 2 * Math.PI * radius

  // Tier-specific labels
  const sessionLabel =
    tier === 'deep'
      ? `${workMinutes} min focus · ${breakMinutes} min break`
      : tier === 'short'
        ? `1 session · ${workMinutes} min`
        : `1 session · ${workMinutes} min`

  const showScratchpad = tier === 'deep' || tier === 'short'

  return (
    <div className="fixed inset-0 z-50 bg-citadel-bg flex flex-col items-center justify-center animate-fade-in">
      {/* Return button — subtle, top left */}
      <button
        onClick={onExit}
        className="absolute top-6 left-6 flex items-center gap-2 text-[12px]
          text-citadel-text/30 hover:text-citadel-text/60 transition-colors"
      >
        <ArrowLeft size={14} />
        Return to Vandaag
      </button>

      {/* Session counter — top right */}
      <div className="absolute top-6 right-6 text-[11px] text-citadel-accent/60 uppercase tracking-wider">
        Session {sessionsCompleted + 1} / {targetSessions}
        {sessionsCompleted > 0 && (
          <span className="ml-2 opacity-60">({sessionsCompleted} done)</span>
        )}
      </div>

      {/* Heading */}
      <div className="text-center mb-12">
        {tier === 'deep' ? (
          <>
            <h1 className="font-serif text-[28px] text-citadel-text tracking-[-0.02em]">
              {projectTitle || taskTitle}
            </h1>
            {intention && (
              <p className="text-[14px] text-citadel-text/40 mt-2 italic font-serif">
                {intention}
              </p>
            )}
          </>
        ) : (
          <>
            <h1 className="font-serif text-[24px] text-citadel-text tracking-[-0.02em]">
              {taskTitle}
            </h1>
            {projectTitle && (
              <p className="text-[13px] text-citadel-text/40 mt-1.5">
                {projectTitle}
              </p>
            )}
          </>
        )}
        <p className="text-[11px] text-citadel-accent/40 uppercase tracking-[0.1em] mt-3">
          {sessionLabel}
        </p>
      </div>

      {/* Large timer circle */}
      <div className="relative w-[280px] h-[280px] mb-12">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 280 280">
          <circle
            cx="140" cy="140" r={radius}
            fill="none"
            stroke="rgba(212, 207, 197, 0.08)"
            strokeWidth="4"
          />
          <circle
            cx="140" cy="140" r={radius}
            fill="none"
            stroke={isBreak ? 'var(--color-citadel-accent)' : 'rgba(212, 207, 197, 0.5)'}
            strokeWidth="4"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress)}
            strokeLinecap="round"
            className="transition-[stroke-dashoffset] duration-1000 ease-linear"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[48px] font-light text-citadel-text tabular-nums tracking-[-0.02em]">
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </span>
          <span className="text-[11px] uppercase tracking-[0.1em] text-citadel-text/30 mt-1">
            {isBreak ? 'Break' : 'Focus'}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 mb-16">
        <button
          onClick={handlePlayPause}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all
            ${isRunning
              ? 'bg-citadel-text/10 text-citadel-text/60 hover:bg-citadel-text/15'
              : 'bg-citadel-text/15 text-citadel-text hover:bg-citadel-text/20'}`}
        >
          {isRunning ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
        </button>
        <button
          onClick={handleReset}
          className="w-12 h-12 rounded-full flex items-center justify-center
            text-citadel-text/20 hover:text-citadel-text/40 hover:bg-citadel-text/5 transition-all"
        >
          <RotateCcw size={18} />
        </button>
      </div>

      {/* Scratchpad — deep and short tiers only */}
      {showScratchpad && (
        <div className="w-full max-w-[400px] px-6">
          <form onSubmit={handleCapture} className="relative">
            <input
              ref={inputRef}
              type="text"
              value={thought}
              onChange={e => setThought(e.target.value)}
              placeholder="Intrusive thought? Capture it here and let it go..."
              className="w-full bg-citadel-text/5 border border-citadel-text/10
                rounded-[8px] px-4 py-3 text-[13px] text-citadel-text/70
                placeholder:text-citadel-text/20 outline-none
                focus:border-citadel-accent/30 transition-colors"
            />
          </form>

          {captured.length > 0 && (
            <div className="mt-3 space-y-1">
              {captured.slice(-3).map((t, i) => (
                <div key={i} className="text-[11px] text-citadel-text/20 flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-citadel-accent/30" />
                  {t}
                  <span className="text-citadel-accent/30 ml-auto">captured</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
