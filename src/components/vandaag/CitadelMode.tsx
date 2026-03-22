import { useState, useRef } from 'react'
import { Play, Pause, RotateCcw, ArrowLeft, NotebookPen, X } from 'lucide-react'
import { useStore } from '../../store'
import type { Project } from '../../types'
import { ProjectEditor } from '../editor/ProjectEditor'

interface CitadelModeProps {
  onExit: () => void        // hide overlay, timer continues
  onEndSession: () => void  // fully stop and clear session
}

export function CitadelMode({ onExit, onEndSession }: CitadelModeProps) {
  const focusSession = useStore(s => s.focusSession)!
  const pauseFocusSession = useStore(s => s.pauseFocusSession)
  const resumeFocusSession = useStore(s => s.resumeFocusSession)
  const resetFocusSession = useStore(s => s.resetFocusSession)
  const projects = useStore(s => s.projects)
  const updateProject = useStore(s => s.updateProject)
  const addOrphanTask = useStore(s => s.addOrphanTask)

  const { tier, taskTitle, projectTitle, intention, projectId,
          workMinutes, breakMinutes, targetSessions, isRunning, isBreak,
          sessionsCompleted, secondsLeft } = focusSession

  const project: Project | undefined = projectId
    ? projects.find(p => p.id === projectId)
    : undefined

  const totalSeconds = isBreak ? breakMinutes * 60 : workMinutes * 60
  const progress = totalSeconds > 0 ? 1 - secondsLeft / totalSeconds : 0
  const minutes = Math.floor(secondsLeft / 60)
  const seconds = secondsLeft % 60

  const [notesOpen, setNotesOpen] = useState(false)

  function handlePlayPause() {
    if (isRunning) {
      pauseFocusSession()
    } else {
      resumeFocusSession()
    }
  }

  function handleReset() {
    resetFocusSession()
  }

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
          text-citadel-text/30 hover:text-citadel-text/60 transition-colors
          min-h-[44px] px-2"
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
        <button
          onClick={onEndSession}
          className="text-[11px] text-citadel-text/20 hover:text-citadel-text/40
            transition-colors px-3 py-2"
        >
          End session
        </button>
      </div>

      {/* Scratchpad — deep and short tiers only */}
      {showScratchpad && (
        <div className="w-full max-w-[520px] px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <form onSubmit={handleCapture} className="relative flex-1">
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

            {project && (
              <button
                onClick={() => setNotesOpen(o => !o)}
                className={`flex items-center gap-1.5 px-3 py-[11px] rounded-[8px] border text-[12px] transition-all whitespace-nowrap
                  ${notesOpen
                    ? 'border-citadel-text/20 bg-citadel-text/10 text-citadel-text/70'
                    : 'border-citadel-text/10 text-citadel-text/30 hover:text-citadel-text/60 hover:border-citadel-text/20'
                  }`}
              >
                <NotebookPen size={14} />
                <span>Notes</span>
              </button>
            )}
          </div>

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

      {/* Notes bottom sheet */}
      {project && (
        <div
          className={`fixed bottom-0 left-0 right-0 z-10 bg-[#1C1A17] border-t border-citadel-text/10
            transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]
            ${notesOpen ? 'translate-y-0' : 'translate-y-full'}`}
          style={{ height: '55vh' }}
        >
          {/* Sheet header */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-citadel-text/10">
            <span className="text-[11px] uppercase tracking-[0.08em] text-citadel-text/40 font-medium">
              Project Notes
            </span>
            <button
              onClick={() => setNotesOpen(false)}
              className="text-citadel-text/30 hover:text-citadel-text/60 transition-colors p-1"
            >
              <X size={16} />
            </button>
          </div>

          {/* Editor — only mount when open */}
          <div className="h-[calc(55vh-44px)] overflow-y-auto">
            {notesOpen && (
              <ProjectEditor
                key={project.id}
                initialContent={project.bodyContent}
                onChange={content => updateProject(project.id, { bodyContent: content })}
                theme="dark"
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
