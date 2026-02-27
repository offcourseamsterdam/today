import { useState, useRef, useEffect } from 'react'
import { Plus, X, Check, ChevronDown, FolderOpen } from 'lucide-react'
import { useStore } from '../../store'
import type { Project, Task } from '../../types'
import { findTaskById } from '../../lib/taskLookup'
import { getAvailableTasks } from '../../lib/availableTasks'
import { useTodayPlan } from '../../hooks/useTodayPlan'
import { useTaskToggle } from '../../hooks/useTaskToggle'
import { TaskCheckbox } from '../ui/TaskCheckbox'
import { UncomfortableBadge } from '../ui/UncomfortableBadge'
import { TaskPickerList } from '../ui/TaskPickerList'

interface TaskItemProps {
  task: Task
  projectTitle?: string
  projects: Project[]
  onToggle: () => void
  onRemove: () => void
  onAssignProject: (projectId: string) => void
}

function TaskItem({ task, projectTitle, projects, onToggle, onRemove, onAssignProject }: TaskItemProps) {
  const isDone = task.status === 'done'
  const isOrphan = !task.projectId
  const [showProjectPicker, setShowProjectPicker] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showProjectPicker) return
    function handleClickOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowProjectPicker(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showProjectPicker])

  return (
    <div className="flex items-center gap-3 py-2 group relative">
      <TaskCheckbox checked={isDone} onChange={onToggle} />
      <div className="flex-1 min-w-0">
        <span className={`text-[13px] ${isDone ? 'text-stone line-through' : 'text-charcoal'}`}>
          {task.title}
        </span>
        {projectTitle && (
          <span className="text-[10px] text-stone/50 ml-2">{projectTitle}</span>
        )}
        {task.isUncomfortable && (
          <span className="ml-2"><UncomfortableBadge /></span>
        )}
      </div>

      {/* Assign to project button — only for orphan tasks */}
      {isOrphan && (
        <div ref={pickerRef} className="relative">
          <button
            onClick={() => setShowProjectPicker(v => !v)}
            title="Koppel aan project"
            className="opacity-0 group-hover:opacity-60 hover:!opacity-100 text-stone transition-all"
          >
            <FolderOpen size={13} />
          </button>

          {showProjectPicker && (
            <div className="absolute right-0 top-full mt-1 z-50 bg-card border border-border
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
                      onClick={() => { onAssignProject(p.id); setShowProjectPicker(false) }}
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
      )}

      <button
        onClick={onRemove}
        className="opacity-0 group-hover:opacity-60 hover:!opacity-100 text-stone transition-all"
      >
        <X size={13} />
      </button>
    </div>
  )
}

export function ShortTasks() {
  const projects = useStore(s => s.projects)
  const orphanTasks = useStore(s => s.orphanTasks)
  const addOrphanTask = useStore(s => s.addOrphanTask)
  const moveOrphanTaskToProject = useStore(s => s.moveOrphanTaskToProject)
  const { shortTaskIds, addShortTask, removeShortTask } = useTodayPlan()
  const toggleTask = useTaskToggle()

  const [showPicker, setShowPicker] = useState(false)
  const [quickAdd, setQuickAdd] = useState('')

  const availableTasks = getAvailableTasks(projects, orphanTasks, shortTaskIds)

  function handleQuickAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!quickAdd.trim()) return
    const id = addOrphanTask(quickAdd.trim())
    addShortTask(id)
    setQuickAdd('')
  }

  const slotsUsed = shortTaskIds.length
  const slotsFull = slotsUsed >= 3

  return (
    <div className="bg-card rounded-[10px] p-5 shadow-card border border-border/50">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Check size={14} className="text-cat-ops" />
          <span className="text-[11px] uppercase tracking-[0.08em] text-stone font-medium">
            Short three
          </span>
          <span className="text-[11px] text-stone/50">{slotsUsed}/3 tasks</span>
        </div>
      </div>

      {/* Task list */}
      <div className="min-h-[60px]">
        {shortTaskIds.map(taskId => {
          const found = findTaskById(taskId, projects, orphanTasks)
          if (!found) return null
          return (
            <TaskItem
              key={taskId}
              task={found.task}
              projectTitle={found.projectTitle}
              projects={projects}
              onToggle={() => toggleTask(taskId)}
              onRemove={() => removeShortTask(taskId)}
              onAssignProject={(projectId) => moveOrphanTaskToProject(taskId, projectId)}
            />
          )
        })}

        {slotsUsed === 0 && !showPicker && (
          <div className="text-[13px] text-stone/30 py-3 text-center italic">
            Especially the ones you've been putting off
          </div>
        )}
      </div>

      {/* Add from project tasks */}
      {!slotsFull && (
        <>
          <button
            onClick={() => setShowPicker(!showPicker)}
            className="w-full flex items-center justify-between px-3 py-2 mt-2 rounded-[6px]
              border border-dashed border-stone/15 text-[12px] text-stone/40
              hover:border-stone/25 hover:text-stone/60 transition-all"
          >
            <span>Add from projects</span>
            <ChevronDown size={12} className={`transition-transform ${showPicker ? 'rotate-180' : ''}`} />
          </button>

          {showPicker && (
            <div className="mt-2 max-h-[200px] overflow-y-auto space-y-0.5 animate-slide-up">
              <TaskPickerList
                tasks={availableTasks}
                projects={projects}
                onSelect={(id) => { addShortTask(id); if (shortTaskIds.length >= 2) setShowPicker(false) }}
              />
            </div>
          )}

          {/* Quick add orphan task */}
          <form onSubmit={handleQuickAdd} className="flex items-center gap-2 mt-2">
            <Plus size={13} className="text-stone/25 flex-shrink-0" />
            <input
              type="text"
              value={quickAdd}
              onChange={e => setQuickAdd(e.target.value)}
              placeholder="Or add a quick task..."
              className="flex-1 text-[12px] text-charcoal placeholder:text-stone/25
                bg-transparent border-none outline-none py-1"
            />
          </form>
        </>
      )}
    </div>
  )
}
