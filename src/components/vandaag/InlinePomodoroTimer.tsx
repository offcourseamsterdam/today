import { useState, useRef } from 'react'
import { Play, Pause, SkipForward, RotateCcw, Square, NotebookPen, X } from 'lucide-react'
import { useStore } from '../../store'
import { useVandaagDark } from './VandaagDarkContext'
import { INLINE_DURATIONS } from '../../store/inlineTimerSlice'
import { ProjectEditor } from '../editor/ProjectEditor'
import type { InlineTimerMode } from '../../types'

export function InlinePomodoroTimer() {
  const inlineTimer = useStore(s => s.inlineTimer)
  const startInlineTimer = useStore(s => s.startInlineTimer)
  const stopInlineTimer = useStore(s => s.stopInlineTimer)
  const pauseInlineTimer = useStore(s => s.pauseInlineTimer)
  const resumeInlineTimer = useStore(s => s.resumeInlineTimer)
  const resetInlineTimer = useStore(s => s.resetInlineTimer)
  const skipInlineTimerPhase = useStore(s => s.skipInlineTimerPhase)
  const setInlineTimerMode = useStore(s => s.setInlineTimerMode)
  const addOrphanTask = useStore(s => s.addOrphanTask)
  const projects = useStore(s => s.projects)
  const updateProject = useStore(s => s.updateProject)
  const dark = useVandaagDark()

  const [selectedMode, setSelectedMode] = useState<InlineTimerMode>('short')
  const [thought, setThought] = useState('')
  const [captured, setCaptured] = useState<string[]>([])
  const [notesOpen, setNotesOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const isActive = !!inlineTimer
  const isRunning = inlineTimer?.isRunning ?? false
  const isBreak = inlineTimer?.isBreak ?? false

  const project = inlineTimer?.linkedProjectId
    ? projects.find(p => p.id === inlineTimer.linkedProjectId)
    : undefined

  // Timer display
  const totalSeconds = isActive
    ? (isBreak ? inlineTimer!.breakMinutes * 60 : inlineTimer!.workMinutes * 60)
    : INLINE_DURATIONS[selectedMode].workMinutes * 60
  const secondsLeft = inlineTimer?.secondsLeft ?? totalSeconds
  const progress = totalSeconds > 0 ? 1 - secondsLeft / totalSeconds : 0
  const minutes = Math.floor(secondsLeft / 60)
  const seconds = secondsLeft % 60

  const radius = 80
  const circumference = 2 * Math.PI * radius

  function handlePlayPause() {
    if (!isActive) {
      // Start a new timer (unlinked — linked starts happen from task cards)
      startInlineTimer(selectedMode)
    } else if (isRunning) {
      pauseInlineTimer()
    } else {
      resumeInlineTimer()
    }
  }

  function handleModeSwitch(mode: InlineTimerMode) {
    setSelectedMode(mode)
    if (isActive && !isRunning) {
      setInlineTimerMode(mode)
    }
  }

  function handleCapture(e: React.FormEvent) {
    e.preventDefault()
    if (!thought.trim()) return
    addOrphanTask(thought.trim())
    setCaptured(prev => [...prev, thought.trim()])
    setThought('')
    inputRef.current?.focus()
  }

  return (
    <div className={`rounded-xl transition-colors duration-500 ${
      dark
        ? 'bg-citadel-text/5 border border-citadel-text/10'
        : 'bg-card border border-border/50 shadow-card'
    }`}>
      <div className="p-5">
        {/* Mode selector */}
        <div className="flex items-center gap-1.5 mb-5">
          {(['short', 'long'] as InlineTimerMode[]).map(mode => {
            const dur = INLINE_DURATIONS[mode]
            const isSelected = isActive ? inlineTimer!.mode === mode : selectedMode === mode
            return (
              <button
                key={mode}
                onClick={() => handleModeSwitch(mode)}
                disabled={isRunning}
                className={`flex-1 text-[11px] py-1.5 rounded-[6px] transition-all uppercase tracking-[0.06em]
                  ${isSelected
                    ? dark
                      ? 'bg-citadel-accent/20 text-citadel-accent'
                      : 'bg-charcoal text-canvas'
                    : dark
                      ? 'text-citadel-text/30 hover:text-citadel-text/50'
                      : 'text-stone/40 hover:text-stone/70'
                  }
                  ${isRunning ? 'cursor-default' : 'cursor-pointer'}`}
              >
                {mode === 'short' ? `${dur.workMinutes}/${dur.breakMinutes}` : `${dur.workMinutes}/${dur.breakMinutes}`}
              </button>
            )
          })}
        </div>

        {/* Linked item display */}
        {inlineTimer?.linkedItemTitle && (
          <div className="text-center mb-4">
            <p className={`text-[13px] font-medium ${dark ? 'text-citadel-text' : 'text-charcoal'}`}>
              {inlineTimer.linkedItemTitle}
            </p>
            {inlineTimer.linkedProjectTitle && inlineTimer.linkedProjectTitle !== inlineTimer.linkedItemTitle && (
              <p className={`text-[11px] mt-0.5 ${dark ? 'text-citadel-text/40' : 'text-stone/50'}`}>
                {inlineTimer.linkedProjectTitle}
              </p>
            )}
          </div>
        )}

        {/* Timer circle */}
        <div className="relative w-[180px] h-[180px] mx-auto mb-5">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
            <circle
              cx="100" cy="100" r={radius}
              fill="none"
              stroke={dark ? 'rgba(212, 207, 197, 0.06)' : 'rgba(0,0,0,0.04)'}
              strokeWidth="3"
            />
            <circle
              cx="100" cy="100" r={radius}
              fill="none"
              stroke={isBreak ? 'var(--color-citadel-accent)' : dark ? 'rgba(212, 207, 197, 0.45)' : 'var(--color-charcoal)'}
              strokeWidth="3"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progress)}
              strokeLinecap="round"
              className="transition-[stroke-dashoffset] duration-1000 ease-linear"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-[36px] font-light tabular-nums tracking-[-0.02em] ${
              dark ? 'text-citadel-text' : 'text-charcoal'
            }`}>
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
            <span className={`text-[10px] uppercase tracking-[0.1em] mt-0.5 ${
              dark ? 'text-citadel-text/25' : 'text-stone/30'
            }`}>
              {isBreak ? 'Break' : 'Focus'}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <button
            onClick={handlePlayPause}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all
              ${dark
                ? isRunning
                  ? 'bg-citadel-text/10 text-citadel-text/60 hover:bg-citadel-text/15'
                  : 'bg-citadel-text/15 text-citadel-text hover:bg-citadel-text/20'
                : isRunning
                  ? 'bg-stone/10 text-stone/60 hover:bg-stone/15'
                  : 'bg-charcoal text-canvas hover:opacity-90'
              }`}
          >
            {isRunning ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
          </button>

          {isActive && (
            <>
              <button
                onClick={skipInlineTimerPhase}
                title={isBreak ? 'Skip break' : 'Skip to break'}
                className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors
                  ${dark ? 'text-citadel-text/20 hover:text-citadel-text/40' : 'text-stone/25 hover:text-stone/50'}`}
              >
                <SkipForward size={13} />
              </button>
              <button
                onClick={resetInlineTimer}
                className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors
                  ${dark ? 'text-citadel-text/20 hover:text-citadel-text/40' : 'text-stone/25 hover:text-stone/50'}`}
              >
                <RotateCcw size={13} />
              </button>
              <button
                onClick={() => { stopInlineTimer(); setCaptured([]) }}
                className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors
                  ${dark ? 'text-citadel-text/20 hover:text-citadel-text/40' : 'text-stone/25 hover:text-stone/50'}`}
              >
                <Square size={12} />
              </button>
            </>
          )}
        </div>

        {/* Session counter */}
        {isActive && (inlineTimer?.sessionsCompleted ?? 0) > 0 && (
          <p className={`text-center text-[10px] uppercase tracking-[0.08em] mb-4 ${
            dark ? 'text-citadel-accent/50' : 'text-stone/35'
          }`}>
            {inlineTimer!.sessionsCompleted} session{inlineTimer!.sessionsCompleted !== 1 ? 's' : ''} completed
          </p>
        )}

        {/* Scratchpad */}
        {isActive && (
          <div className="mt-3">
            <div className="flex items-center gap-2">
              <form onSubmit={handleCapture} className="flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={thought}
                  onChange={e => setThought(e.target.value)}
                  placeholder="Capture a thought..."
                  className={`w-full rounded-[6px] px-3 py-2 text-[12px] outline-none transition-colors
                    ${dark
                      ? 'bg-citadel-text/5 border border-citadel-text/10 text-citadel-text/70 placeholder:text-citadel-text/20 focus:border-citadel-accent/30'
                      : 'bg-border-light/40 border border-border/50 text-charcoal placeholder:text-stone/30 focus:border-stone/30'
                    }`}
                />
              </form>
              {project && (
                <button
                  onClick={() => setNotesOpen(o => !o)}
                  className={`p-2 rounded-[6px] border text-[11px] transition-all
                    ${dark
                      ? notesOpen
                        ? 'border-citadel-text/20 bg-citadel-text/10 text-citadel-text/70'
                        : 'border-citadel-text/10 text-citadel-text/25 hover:text-citadel-text/50'
                      : notesOpen
                        ? 'border-stone/20 bg-stone/10 text-stone/70'
                        : 'border-border/50 text-stone/30 hover:text-stone/60'
                    }`}
                >
                  <NotebookPen size={13} />
                </button>
              )}
            </div>

            {captured.length > 0 && (
              <div className="mt-2 space-y-1">
                {captured.slice(-3).map((t, i) => (
                  <div key={i} className={`text-[10px] flex items-center gap-2 ${dark ? 'text-citadel-text/20' : 'text-stone/30'}`}>
                    <span className={`w-1 h-1 rounded-full ${dark ? 'bg-citadel-accent/30' : 'bg-stone/20'}`} />
                    {t}
                    <span className={`ml-auto ${dark ? 'text-citadel-accent/30' : 'text-stone/20'}`}>captured</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Notes panel */}
      {project && notesOpen && (
        <div className={`border-t ${dark ? 'border-citadel-text/10' : 'border-border/50'}`}>
          <div className="flex items-center justify-between px-4 py-2">
            <span className={`text-[10px] uppercase tracking-[0.08em] font-medium ${dark ? 'text-citadel-text/40' : 'text-stone/40'}`}>
              Notes
            </span>
            <button
              onClick={() => setNotesOpen(false)}
              className={`p-1 ${dark ? 'text-citadel-text/30 hover:text-citadel-text/60' : 'text-stone/30 hover:text-stone/60'} transition-colors`}
            >
              <X size={14} />
            </button>
          </div>
          <div className="h-[200px] overflow-y-auto">
            <ProjectEditor
              key={project.id}
              initialContent={project.bodyContent}
              onChange={content => updateProject(project.id, { bodyContent: content })}
              theme={dark ? 'dark' : 'light'}
            />
          </div>
        </div>
      )}
    </div>
  )
}
