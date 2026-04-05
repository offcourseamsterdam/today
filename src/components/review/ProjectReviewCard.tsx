import { useState } from 'react'
import { ChevronRight, ChevronDown, Clock, Trash2, CheckCircle2, GripVertical, Plus } from 'lucide-react'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Project, ProjectStatus, Task } from '../../types'
import { useStore } from '../../store'
import { daysSince, getWaitingLabel, getWaitingStatus } from '../../lib/utils'

interface ProjectReviewCardProps {
  project: Project
  onTaskCompleted: () => void
  onTaskDeleted: () => void
  onProjectMoved: () => void
}

const STATUS_BADGE: Record<ProjectStatus, string> = {
  in_progress: 'bg-blue-100 text-blue-700',
  waiting: 'bg-amber-100 text-amber-700',
  backlog: 'bg-stone-100 text-stone-600',
  done: 'bg-green-100 text-green-700',
}

const STATUS_LABEL: Record<ProjectStatus, string> = {
  in_progress: 'In Progress',
  waiting: 'Waiting',
  backlog: 'Backlog',
  done: 'Done',
}

function SortableTaskRow({
  task,
  onToggle,
  onDelete,
}: {
  task: Task
  onToggle: () => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 group py-1">
      <button {...attributes} {...listeners} className="shrink-0 cursor-grab text-stone/20 hover:text-stone/40 touch-none">
        <GripVertical size={14} />
      </button>
      <button onClick={onToggle} className="shrink-0">
        <CheckCircle2
          size={18}
          className={task.status === 'done' ? 'text-green-500' : 'text-border hover:text-green-400 transition-colors'}
          fill={task.status === 'done' ? 'currentColor' : 'none'}
        />
      </button>
      <span className={`text-[13px] flex-1 ${task.status === 'done' ? 'line-through text-stone' : 'text-charcoal'}`}>
        {task.title}
      </span>
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 text-stone hover:text-red-500 transition-all"
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}

export default function ProjectReviewCard({
  project,
  onTaskCompleted,
  onTaskDeleted,
  onProjectMoved,
}: ProjectReviewCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [newTask, setNewTask] = useState('')
  const updateProject = useStore(s => s.updateProject)
  const moveProject = useStore(s => s.moveProject)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const openTasks = project.tasks.filter(t => t.status !== 'done' && t.status !== 'dropped')
  const hasWaiting = (project.waitingOn?.length ?? 0) > 0

  function toggleTask(taskId: string) {
    const task = project.tasks.find(t => t.id === taskId)
    if (!task) return
    const newStatus = task.status === 'done' ? 'backlog' : 'done'
    updateProject(project.id, {
      tasks: project.tasks.map(t =>
        t.id === taskId
          ? { ...t, status: newStatus, completedAt: newStatus === 'done' ? new Date().toISOString() : undefined }
          : t,
      ),
    })
    if (newStatus === 'done') onTaskCompleted()
  }

  function deleteTask(taskId: string) {
    updateProject(project.id, { tasks: project.tasks.filter(t => t.id !== taskId) })
    onTaskDeleted()
  }

  function handleAddTask(e: React.FormEvent) {
    e.preventDefault()
    if (!newTask.trim()) return
    updateProject(project.id, {
      tasks: [
        { id: crypto.randomUUID(), title: newTask.trim(), status: 'backlog' as const, isRecurring: false, isUncomfortable: false, createdAt: new Date().toISOString() },
        ...project.tasks,
      ],
    })
    setNewTask('')
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = project.tasks.findIndex(t => t.id === active.id)
    const newIndex = project.tasks.findIndex(t => t.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    updateProject(project.id, { tasks: arrayMove(project.tasks, oldIndex, newIndex) })
  }

  function resolveWaiting(person: string) {
    updateProject(project.id, {
      waitingOn: (project.waitingOn ?? []).filter(w => w.person !== person),
    })
  }

  function handleMove(newStatus: ProjectStatus) {
    moveProject(project.id, newStatus)
    onProjectMoved()
  }

  return (
    <div className="border border-border rounded-lg bg-white">
      <button
        onClick={() => setExpanded(prev => !prev)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-canvas transition-colors rounded-lg"
      >
        {expanded
          ? <ChevronDown size={16} className="text-stone shrink-0" />
          : <ChevronRight size={16} className="text-stone shrink-0" />
        }
        <span className={`text-[11px] font-medium uppercase tracking-wide px-2 py-0.5 rounded ${STATUS_BADGE[project.status]}`}>
          {STATUS_LABEL[project.status]}
        </span>
        <span className="text-[14px] font-medium text-charcoal truncate">
          {project.title}
        </span>
        <span className="ml-auto flex items-center gap-2 shrink-0">
          {hasWaiting && <Clock size={14} className="text-amber-500" />}
          <span className="text-[12px] text-stone">{openTasks.length} open</span>
        </span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-1 space-y-4 border-t border-border-light">
          {/* Add task at top */}
          <form onSubmit={handleAddTask} className="flex items-center gap-2 mt-2">
            <Plus size={14} className="text-stone/30 shrink-0" />
            <input
              type="text"
              value={newTask}
              onChange={e => setNewTask(e.target.value)}
              placeholder={openTasks.length === 0 ? 'Wat is de eerstvolgende stap?' : 'Taak toevoegen...'}
              className={`flex-1 text-[13px] px-2 py-1.5 rounded-md border border-border outline-none focus:border-stone/40 transition-colors ${
                openTasks.length === 0 ? 'bg-amber-50 border-amber-200' : 'bg-white'
              }`}
            />
          </form>

          {/* Sortable tasks */}
          {project.tasks.length > 0 && (
            <div>
              <h4 className="text-[11px] font-medium uppercase tracking-wide text-stone mb-2">
                Taken
              </h4>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={project.tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                  {project.tasks.map(task => (
                    <SortableTaskRow
                      key={task.id}
                      task={task}
                      onToggle={() => toggleTask(task.id)}
                      onDelete={() => deleteTask(task.id)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </div>
          )}

          {/* Waiting-on list */}
          {hasWaiting && (
            <div className="space-y-1">
              <h4 className="text-[11px] font-medium uppercase tracking-wide text-stone mb-2">
                Wachten op
              </h4>
              {project.waitingOn!.map(w => {
                const days = daysSince(w.since)
                const status = getWaitingStatus(days)
                return (
                  <div key={w.person} className="flex items-center gap-2 py-1">
                    <span className="text-[13px] text-charcoal">{w.person}</span>
                    <span className={`text-[11px] ${status === 'red' ? 'text-red-600' : status === 'amber' ? 'text-amber-600' : 'text-stone'}`}>
                      {getWaitingLabel(days)}
                    </span>
                    <button
                      onClick={() => resolveWaiting(w.person)}
                      className="ml-auto text-[12px] text-green-600 hover:text-green-700 font-medium transition-colors"
                    >
                      Opgelost
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {/* Move buttons */}
          <div className="flex gap-2">
            {project.status !== 'backlog' && (
              <button
                onClick={() => handleMove('backlog')}
                className="text-[12px] px-3 py-1.5 rounded-md border border-border text-stone hover:bg-canvas transition-colors"
              >
                &rarr; Backlog
              </button>
            )}
            {project.status !== 'done' && (
              <button
                onClick={() => handleMove('done')}
                className="text-[12px] px-3 py-1.5 rounded-md border border-green-200 text-green-700 hover:bg-green-50 transition-colors"
              >
                &rarr; Done
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
