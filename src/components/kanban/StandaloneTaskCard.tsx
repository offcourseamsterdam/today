import { useState, useRef, useEffect } from 'react'
import { FolderOpen } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Task, Project } from '../../types'
import { WaitingBadge } from '../ui/WaitingBadge'

interface StandaloneTaskCardProps {
  task: Task
  projects: Project[]
  onComplete: () => void
  onDelete: () => void
  onAssignProject: (projectId: string) => void
  onOpenNotes?: () => void
  isDragOverlay?: boolean
}

export function StandaloneTaskCard({
  task,
  projects,
  onComplete,
  onDelete,
  onAssignProject,
  onOpenNotes,
  isDragOverlay = false,
}: StandaloneTaskCardProps) {
  const [showPicker, setShowPicker] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: isDragOverlay,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  useEffect(() => {
    if (!showPicker) return
    function handleClickOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showPicker])

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`flex items-start gap-2.5 px-3.5 py-2.5 rounded-[8px] bg-card
        border border-border/50 shadow-card group transition-all hover:border-stone/20
        hover:shadow-card-hover relative mb-2 cursor-grab active:cursor-grabbing
        ${isDragging ? 'opacity-0 pointer-events-none' : ''}`}
    >
      <button
        onPointerDown={e => e.stopPropagation()}
        onClick={onComplete}
        className="w-[16px] h-[16px] rounded border-[1.5px] flex-shrink-0
          flex items-center justify-center transition-all duration-150
          border-stone/25 hover:border-stone/50"
      />
      <div className="flex-1 min-w-0">
        <span
          className={`text-[13px] text-charcoal ${onOpenNotes ? 'cursor-pointer hover:text-stone transition-colors' : ''}`}
          onPointerDown={e => e.stopPropagation()}
          onClick={onOpenNotes}
        >
          {task.title}
        </span>
        {task.waitingOn && task.waitingOn.length > 0 && (
          <div className="mt-1 flex flex-col gap-0.5">
            {task.waitingOn.map((entry, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span className="text-[11px] text-stone truncate">{entry.person}</span>
                <WaitingBadge since={entry.since} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assign to project */}
      <div ref={pickerRef} className="relative">
        <button
          onPointerDown={e => e.stopPropagation()}
          onClick={() => setShowPicker(v => !v)}
          title="Koppel aan project"
          className="opacity-0 group-hover:opacity-40 hover:!opacity-100 text-stone transition-all"
        >
          <FolderOpen size={12} />
        </button>
        {showPicker && (
          <div className="absolute left-0 bottom-full mb-1 z-50 bg-card border border-border
            rounded-[8px] shadow-lg min-w-[160px] max-w-[220px] py-1 animate-slide-up">
            <div className="px-3 py-1.5 text-[10px] uppercase tracking-[0.08em] text-stone/40 font-medium border-b border-border/50">
              Koppel aan project
            </div>
            {projects.length === 0 ? (
              <div className="px-3 py-2 text-[12px] text-stone/40 italic">Geen projecten</div>
            ) : (
              <div className="max-h-[180px] overflow-y-auto">
                {projects.map(p => (
                  <button
                    key={p.id}
                    onPointerDown={e => e.stopPropagation()}
                    onClick={() => { onAssignProject(p.id); setShowPicker(false) }}
                    className="w-full text-left px-3 py-2 text-[12px] text-charcoal
                      hover:bg-canvas transition-colors truncate"
                  >
                    {p.title}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <button
        onPointerDown={e => e.stopPropagation()}
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-40 hover:!opacity-100 text-stone ml-1 transition-all"
      >
        <svg width="11" height="11" viewBox="0 0 10 10" fill="none">
          <path d="M2 2L8 8M8 2L2 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>
    </div>
  )
}
