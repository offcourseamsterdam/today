import { useState, useCallback, useEffect, useRef } from 'react'
import { FolderInput, Check, Trash2, CheckCircle, ChevronDown } from 'lucide-react'
import { useStore } from '../../store'

interface InboxSectionProps {
  onStats: (processed: number, toProject: number, kept: number, deleted: number) => void
}

export default function InboxSection({ onStats }: InboxSectionProps) {
  const orphanTasks = useStore(s => s.orphanTasks)
  const projects = useStore(s => s.projects)
  const deleteOrphanTask = useStore(s => s.deleteOrphanTask)
  const addTask = useStore(s => s.addTask)

  const [processedIds, setProcessedIds] = useState<Set<string>>(new Set())
  const [showProjectPicker, setShowProjectPicker] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  // Stats tracking
  const [toProjectCount, setToProjectCount] = useState(0)
  const [keptCount, setKeptCount] = useState(0)
  const [deletedCount, setDeletedCount] = useState(0)

  // Snapshot the initial orphan IDs so newly-added orphans don't appear mid-review
  const [initialIds] = useState(() => orphanTasks.map(t => t.id))

  const remaining = initialIds.filter(id => !processedIds.has(id))
  const currentId = remaining[0] ?? null
  const currentTask = currentId
    ? orphanTasks.find(t => t.id === currentId) ?? null
    : null

  const total = initialIds.length
  const processedCount = processedIds.size
  const allDone = remaining.length === 0

  // Report stats on every change
  useEffect(() => {
    onStats(processedCount, toProjectCount, keptCount, deletedCount)
  }, [processedCount, toProjectCount, keptCount, deletedCount, onStats])

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

  const markProcessed = useCallback((id: string) => {
    setProcessedIds(prev => new Set(prev).add(id))
  }, [])

  const handleMoveToProject = useCallback((projectId: string) => {
    if (!currentTask) return
    addTask(currentTask.title, projectId)
    deleteOrphanTask(currentTask.id)
    markProcessed(currentTask.id)
    setToProjectCount(c => c + 1)
    setShowProjectPicker(false)
  }, [currentTask, addTask, deleteOrphanTask, markProcessed])

  const handleKeep = useCallback(() => {
    if (!currentTask) return
    markProcessed(currentTask.id)
    setKeptCount(c => c + 1)
  }, [currentTask, markProcessed])

  const handleDelete = useCallback(() => {
    if (!currentTask) return
    deleteOrphanTask(currentTask.id)
    markProcessed(currentTask.id)
    setDeletedCount(c => c + 1)
  }, [currentTask, deleteOrphanTask, markProcessed])

  // Empty state — no orphan tasks at all
  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <CheckCircle className="text-green-600 mb-3" size={40} strokeWidth={1.5} />
        <p className="font-[Fraunces] text-lg text-[#2A2724]">Inbox leeg</p>
        <p className="text-sm text-[#7A746A] mt-1">Geen losse taken om te verwerken.</p>
      </div>
    )
  }

  // All processed
  if (allDone) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <CheckCircle className="text-green-600 mb-3" size={40} strokeWidth={1.5} />
        <p className="font-[Fraunces] text-lg text-[#2A2724]">Inbox leeg</p>
        <p className="text-sm text-[#7A746A] mt-1">
          {toProjectCount > 0 && `${toProjectCount} naar project`}
          {toProjectCount > 0 && keptCount > 0 && ', '}
          {keptCount > 0 && `${keptCount} behouden`}
          {(toProjectCount > 0 || keptCount > 0) && deletedCount > 0 && ', '}
          {deletedCount > 0 && `${deletedCount} verwijderd`}
        </p>
      </div>
    )
  }

  // Task was deleted externally (edge case) — skip it
  if (!currentTask) {
    markProcessed(currentId!)
    return null
  }

  return (
    <div className="flex flex-col items-center gap-5 py-6">
      {/* Counter */}
      <p className="text-xs font-medium tracking-wide uppercase text-[#7A746A]">
        {processedCount + 1} van {total}
      </p>

      {/* Card */}
      <div className="w-full max-w-md bg-white border border-[#E8E4DD] rounded-[10px] px-6 py-5 shadow-sm">
        <h3 className="font-[Fraunces] text-lg text-[#2A2724] leading-snug">
          {currentTask.title}
        </h3>
        {currentTask.createdAt && (
          <p className="text-xs text-[#7A746A] mt-1.5">
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
            onClick={() => setShowProjectPicker(prev => !prev)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-lg
                       border border-[#E8E4DD] bg-white text-[#2A2724]
                       hover:bg-[#F0EEEB] transition-colors cursor-pointer"
          >
            <FolderInput size={15} />
            Naar project
            <ChevronDown size={13} className={`transition-transform ${showProjectPicker ? 'rotate-180' : ''}`} />
          </button>

          {showProjectPicker && (
            <div className="absolute top-full left-0 mt-1.5 w-64 max-h-60 overflow-y-auto
                            bg-white border border-[#E8E4DD] rounded-lg shadow-lg z-20">
              {projects.length === 0 ? (
                <p className="px-3 py-2.5 text-sm text-[#7A746A]">Geen projecten</p>
              ) : (
                projects
                  .filter(p => p.status !== 'done')
                  .sort((a, b) => a.title.localeCompare(b.title))
                  .map(p => (
                    <button
                      key={p.id}
                      onClick={() => handleMoveToProject(p.id)}
                      className="w-full text-left px-3 py-2 text-sm text-[#2A2724]
                                 hover:bg-[#FAF9F7] transition-colors cursor-pointer"
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
          onClick={handleKeep}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-lg
                     border border-[#E8E4DD] bg-white text-[#2A2724]
                     hover:bg-[#F0EEEB] transition-colors cursor-pointer"
        >
          <Check size={15} />
          Houden
        </button>

        {/* Verwijderen */}
        <button
          onClick={handleDelete}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-lg
                     border border-red-200 bg-white text-red-600
                     hover:bg-red-50 transition-colors cursor-pointer"
        >
          <Trash2 size={15} />
          Verwijderen
        </button>
      </div>
    </div>
  )
}
