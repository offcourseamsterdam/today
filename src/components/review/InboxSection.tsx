import { useState, useCallback, useEffect, useRef, useMemo, useImperativeHandle } from 'react'
import { FolderInput, Check, Trash2, CheckCircle, ChevronDown, SkipForward, Undo2 } from 'lucide-react'
import { useStore } from '../../store'
import type { Task } from '../../types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type UndoEntry =
  | { type: 'moveToProject'; taskId: string; taskSnapshot: Task; projectId: string }
  | { type: 'keep'; taskId: string }
  | { type: 'delete'; taskId: string; taskSnapshot: Task }
  | { type: 'skip'; taskId: string }

export interface InboxActions {
  skip: () => void
  keep: () => void
  delete: () => void
  undo: () => void
  toggleProjectPicker: () => void
}

interface InboxSectionProps {
  onStats: (processed: number, toProject: number, kept: number, deleted: number) => void
  onAllProcessed?: () => void
  actionsRef?: React.RefObject<InboxActions | null>
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function InboxSection({ onStats, onAllProcessed, actionsRef }: InboxSectionProps) {
  const orphanTasks = useStore(s => s.orphanTasks)
  const projects = useStore(s => s.projects)
  const deleteOrphanTask = useStore(s => s.deleteOrphanTask)
  const addTask = useStore(s => s.addTask)
  const restoreOrphanTask = useStore(s => s.restoreOrphanTask)
  const updateProject = useStore(s => s.updateProject)

  const [processedIds, setProcessedIds] = useState<Set<string>>(new Set())
  const [showProjectPicker, setShowProjectPicker] = useState(false)
  const [skippedQueue, setSkippedQueue] = useState<string[]>([])
  const [exitDirection, setExitDirection] = useState<'right' | 'left' | 'down' | null>(null)
  const pickerRef = useRef<HTMLDivElement>(null)
  const undoStack = useRef<UndoEntry[]>([])
  const [undoStackLen, setUndoStackLen] = useState(0) // triggers re-render when stack changes

  // Stats tracking
  const [toProjectCount, setToProjectCount] = useState(0)
  const [keptCount, setKeptCount] = useState(0)
  const [deletedCount, setDeletedCount] = useState(0)

  // Snapshot the initial orphan IDs so newly-added orphans don't appear mid-review
  const [initialIds] = useState(() => orphanTasks.map(t => t.id))

  // Remaining: unskipped first, then skipped at end
  const remaining = useMemo(() => {
    const unprocessed = initialIds.filter(id => !processedIds.has(id))
    const notSkipped = unprocessed.filter(id => !skippedQueue.includes(id))
    const skipped = skippedQueue.filter(id => !processedIds.has(id))
    return [...notSkipped, ...skipped]
  }, [initialIds, processedIds, skippedQueue])

  const currentId = remaining[0] ?? null
  const currentTask = currentId
    ? orphanTasks.find(t => t.id === currentId) ?? null
    : null

  const total = initialIds.length
  const processedCount = processedIds.size
  const allDone = remaining.length === 0
  const isAnimating = exitDirection !== null
  const skipCount = skippedQueue.filter(id => !processedIds.has(id)).length

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  const pushUndo = useCallback((entry: UndoEntry) => {
    undoStack.current.push(entry)
    setUndoStackLen(undoStack.current.length)
  }, [])

  const markProcessed = useCallback((id: string) => {
    setProcessedIds(prev => new Set(prev).add(id))
  }, [])

  function animateAndExecute(direction: 'right' | 'left' | 'down', action: () => void) {
    setExitDirection(direction)
    setTimeout(() => { action(); setExitDirection(null) }, 250)
  }

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  const handleMoveToProject = useCallback((projectId: string) => {
    if (!currentTask || isAnimating) return
    const snapshot = { ...currentTask }
    animateAndExecute('right', () => {
      addTask(currentTask.title, projectId)
      deleteOrphanTask(currentTask.id)
      markProcessed(currentTask.id)
      setToProjectCount(c => c + 1)
      pushUndo({ type: 'moveToProject', taskId: currentTask.id, taskSnapshot: snapshot, projectId })
    })
    setShowProjectPicker(false)
  }, [currentTask, isAnimating, addTask, deleteOrphanTask, markProcessed, pushUndo])

  const handleKeep = useCallback(() => {
    if (!currentTask || isAnimating) return
    animateAndExecute('right', () => {
      markProcessed(currentTask.id)
      setKeptCount(c => c + 1)
      pushUndo({ type: 'keep', taskId: currentTask.id })
    })
  }, [currentTask, isAnimating, markProcessed, pushUndo])

  const handleDelete = useCallback(() => {
    if (!currentTask || isAnimating) return
    const snapshot = { ...currentTask }
    animateAndExecute('left', () => {
      deleteOrphanTask(currentTask.id)
      markProcessed(currentTask.id)
      setDeletedCount(c => c + 1)
      pushUndo({ type: 'delete', taskId: currentTask.id, taskSnapshot: snapshot })
    })
  }, [currentTask, isAnimating, deleteOrphanTask, markProcessed, pushUndo])

  const handleSkip = useCallback(() => {
    if (!currentTask || isAnimating) return
    animateAndExecute('down', () => {
      setSkippedQueue(prev => [...prev.filter(id => id !== currentTask.id), currentTask.id])
      pushUndo({ type: 'skip', taskId: currentTask.id })
    })
  }, [currentTask, isAnimating, pushUndo])

  const handleUndo = useCallback(() => {
    const entry = undoStack.current.pop()
    setUndoStackLen(undoStack.current.length)
    if (!entry) return

    switch (entry.type) {
      case 'moveToProject': {
        restoreOrphanTask(entry.taskSnapshot)
        const project = projects.find(p => p.id === entry.projectId)
        if (project) {
          updateProject(entry.projectId, {
            tasks: project.tasks.filter(t => t.title !== entry.taskSnapshot.title || t.id === entry.taskSnapshot.id ? t.id !== entry.taskSnapshot.id : true),
          })
        }
        setProcessedIds(prev => {
          const next = new Set(prev)
          next.delete(entry.taskId)
          return next
        })
        setToProjectCount(c => Math.max(0, c - 1))
        break
      }
      case 'keep': {
        setProcessedIds(prev => {
          const next = new Set(prev)
          next.delete(entry.taskId)
          return next
        })
        setKeptCount(c => Math.max(0, c - 1))
        break
      }
      case 'delete': {
        restoreOrphanTask(entry.taskSnapshot)
        setProcessedIds(prev => {
          const next = new Set(prev)
          next.delete(entry.taskId)
          return next
        })
        setDeletedCount(c => Math.max(0, c - 1))
        break
      }
      case 'skip': {
        setSkippedQueue(prev => prev.filter(id => id !== entry.taskId))
        break
      }
    }
  }, [projects, restoreOrphanTask, updateProject])

  // -------------------------------------------------------------------------
  // Imperative handle for keyboard shortcuts
  // -------------------------------------------------------------------------

  useImperativeHandle(actionsRef, () => ({
    skip: handleSkip,
    keep: handleKeep,
    delete: handleDelete,
    undo: handleUndo,
    toggleProjectPicker: () => setShowProjectPicker(v => !v),
  }))

  // -------------------------------------------------------------------------
  // Effects
  // -------------------------------------------------------------------------

  // Report stats on every change
  useEffect(() => {
    onStats(processedCount, toProjectCount, keptCount, deletedCount)
  }, [processedCount, toProjectCount, keptCount, deletedCount, onStats])

  // Auto-advance when all done
  useEffect(() => {
    if (allDone && total > 0 && onAllProcessed) {
      onAllProcessed()
    }
  }, [allDone, total, onAllProcessed])

  // Close project picker on outside click
  useEffect(() => {
    if (!showProjectPicker) return
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowProjectPicker(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showProjectPicker])

  // Task was deleted externally (edge case) -- skip it via effect
  useEffect(() => {
    if (currentId && !currentTask) {
      markProcessed(currentId)
    }
  }, [currentId, currentTask, markProcessed])

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  // Empty state -- no orphan tasks at all
  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <CheckCircle className="text-green-600 mb-3" size={40} strokeWidth={1.5} />
        <p className="font-serif text-lg text-charcoal">Inbox leeg</p>
        <p className="text-sm text-stone mt-1">Geen losse taken om te verwerken.</p>
      </div>
    )
  }

  // All processed
  if (allDone) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <CheckCircle className="text-green-600 mb-3" size={40} strokeWidth={1.5} />
        <p className="font-serif text-lg text-charcoal">Inbox leeg</p>
        <p className="text-sm text-stone mt-1">
          {toProjectCount > 0 && `${toProjectCount} naar project`}
          {toProjectCount > 0 && keptCount > 0 && ', '}
          {keptCount > 0 && `${keptCount} behouden`}
          {(toProjectCount > 0 || keptCount > 0) && deletedCount > 0 && ', '}
          {deletedCount > 0 && `${deletedCount} verwijderd`}
        </p>
      </div>
    )
  }

  // Waiting for effect to process externally-deleted task
  if (!currentTask) return null

  // Card exit animation classes
  const cardAnimationClass =
    exitDirection === 'right' ? 'translate-x-8 opacity-0' :
    exitDirection === 'left' ? '-translate-x-8 opacity-0' :
    exitDirection === 'down' ? 'translate-y-4 opacity-0' :
    ''

  return (
    <div className="flex flex-col items-center gap-5 py-6">
      {/* Counter */}
      <div className="flex items-center gap-2">
        <p className="text-xs font-medium tracking-wide uppercase text-stone">
          {processedCount + 1} van {total}
        </p>
        {skipCount > 0 && (
          <span className="text-xs text-stone/50">({skipCount} overgeslagen)</span>
        )}
        {undoStackLen > 0 && (
          <button
            onClick={handleUndo}
            className="inline-flex items-center gap-1 text-xs text-stone/40 hover:text-charcoal transition-colors cursor-pointer"
          >
            <Undo2 size={13} />
          </button>
        )}
      </div>

      {/* Card */}
      <div
        className={`w-full max-w-md bg-white border border-border rounded-[10px] px-6 py-5 shadow-sm
                     transition-all duration-250 ease-out ${cardAnimationClass}`}
      >
        <h3 className="font-serif text-lg text-charcoal leading-snug">
          {currentTask.title}
        </h3>
        {currentTask.createdAt && (
          <p className="text-xs text-stone mt-1.5">
            Aangemaakt {new Date(currentTask.createdAt).toLocaleDateString('nl-NL', {
              day: 'numeric', month: 'short', year: 'numeric',
            })}
          </p>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2.5 relative">
        {/* Naar project */}
        <div className="relative" ref={pickerRef}>
          <button
            disabled={isAnimating}
            onClick={() => setShowProjectPicker(prev => !prev)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-lg
                       border border-border bg-white text-charcoal
                       hover:bg-border-light transition-colors cursor-pointer
                       disabled:opacity-40 disabled:pointer-events-none"
          >
            <FolderInput size={15} />
            Naar project
            <ChevronDown size={13} className={`transition-transform ${showProjectPicker ? 'rotate-180' : ''}`} />
          </button>

          {showProjectPicker && (
            <div className="absolute top-full left-0 mt-1.5 w-64 max-h-60 overflow-y-auto
                            bg-white border border-border rounded-lg shadow-lg z-20">
              {projects.length === 0 ? (
                <p className="px-3 py-2.5 text-sm text-stone">Geen projecten</p>
              ) : (
                projects
                  .filter(p => p.status !== 'done')
                  .sort((a, b) => a.title.localeCompare(b.title))
                  .map(p => (
                    <button
                      key={p.id}
                      onClick={() => handleMoveToProject(p.id)}
                      className="w-full text-left px-3 py-2 text-sm text-charcoal
                                 hover:bg-canvas transition-colors cursor-pointer"
                    >
                      {p.title}
                    </button>
                  ))
              )}
            </div>
          )}
        </div>

        {/* Houden */}
        <button
          disabled={isAnimating}
          onClick={handleKeep}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-lg
                     border border-border bg-white text-charcoal
                     hover:bg-border-light transition-colors cursor-pointer
                     disabled:opacity-40 disabled:pointer-events-none"
        >
          <Check size={15} />
          Houden
        </button>

        {/* Overslaan */}
        <button
          disabled={isAnimating}
          onClick={handleSkip}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-lg
                     border border-border bg-white text-charcoal
                     hover:bg-border-light transition-colors cursor-pointer
                     disabled:opacity-40 disabled:pointer-events-none"
        >
          <SkipForward size={15} />
          Overslaan
        </button>

        {/* Verwijderen */}
        <button
          disabled={isAnimating}
          onClick={handleDelete}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-lg
                     border border-red-200 bg-white text-red-600
                     hover:bg-red-50 transition-colors cursor-pointer
                     disabled:opacity-40 disabled:pointer-events-none"
        >
          <Trash2 size={15} />
          Verwijderen
        </button>
      </div>

      {/* Keyboard hint bar */}
      <div className="flex items-center justify-center gap-3 mt-4 text-[10px] text-stone/30">
        <span><kbd className="bg-stone/5 px-1.5 py-0.5 rounded font-mono text-stone/50">P</kbd> Project</span>
        <span>·</span>
        <span><kbd className="bg-stone/5 px-1.5 py-0.5 rounded font-mono text-stone/50">H</kbd> Houden</span>
        <span>·</span>
        <span><kbd className="bg-stone/5 px-1.5 py-0.5 rounded font-mono text-stone/50">D</kbd> Verwijderen</span>
        <span>·</span>
        <span><kbd className="bg-stone/5 px-1.5 py-0.5 rounded font-mono text-stone/50">S</kbd> Overslaan</span>
        <span>·</span>
        <span><kbd className="bg-stone/5 px-1.5 py-0.5 rounded font-mono text-stone/50">Z</kbd> Undo</span>
      </div>
    </div>
  )
}
