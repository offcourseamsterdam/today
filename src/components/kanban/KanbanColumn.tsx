import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { ProjectCard } from './ProjectCard'
import { StandaloneTaskCard } from './StandaloneTaskCard'
import type { Project, ProjectStatus, Task } from '../../types'

interface KanbanColumnProps {
  id: ProjectStatus
  title: string
  projects: Project[]
  orphanTasks: Task[]
  limit: number | null
  combinedCount?: number
  onProjectClick: (project: Project) => void
  onOrphanComplete: (taskId: string) => void
  onOrphanDelete: (taskId: string) => void
  onOrphanAssignProject: (taskId: string, projectId: string) => void
  onOrphanOpenNotes: (task: Task) => void
  allProjects: Project[]
  dragPreview?: { activeId: string; afterItemId: string | null }
}

export function KanbanColumn({
  id, title, projects, orphanTasks, limit, combinedCount, onProjectClick,
  onOrphanComplete, onOrphanDelete, onOrphanAssignProject, onOrphanOpenNotes, allProjects,
  dragPreview,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id })

  const displayCount = combinedCount !== undefined ? combinedCount : projects.length
  const atLimit = limit !== null && displayCount >= limit

  const allIds = [...orphanTasks.map(t => t.id), ...projects.map(p => p.id)]

  // Build sortable items with drag preview insertion
  const sortableIds = dragPreview
    ? (() => {
        const base = allIds.filter(id => id !== dragPreview.activeId)
        if (!dragPreview.afterItemId) return [...base, dragPreview.activeId]
        const idx = base.indexOf(dragPreview.afterItemId)
        return idx >= 0
          ? [...base.slice(0, idx + 1), dragPreview.activeId, ...base.slice(idx + 1)]
          : [...base, dragPreview.activeId]
      })()
    : allIds

  return (
    <div
      ref={setNodeRef}
      className={`bg-border-light/60 rounded-[10px] p-4 min-h-[300px] transition-colors duration-150
        ${isOver ? 'bg-border-light' : ''}`}
    >
      {/* Column header */}
      <div className="flex justify-between items-center mb-4 pb-3 border-b border-border">
        <span className="text-[13px] font-semibold text-stone tracking-[0.01em]">{title}</span>
        <span
          className={`text-[11px] px-2 py-0.5 rounded-full
            ${atLimit
              ? 'bg-[var(--color-status-amber-bg)] text-[var(--color-status-amber-text)]'
              : 'bg-border text-stone'}`}
        >
          {limit ? `${displayCount} / ${limit}` : projects.length}
        </span>
      </div>

      <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
        {/* Orphan tasks at top */}
        {orphanTasks.map(task => (
          <StandaloneTaskCard
            key={task.id}
            task={task}
            projects={allProjects}
            onComplete={() => onOrphanComplete(task.id)}
            onDelete={() => onOrphanDelete(task.id)}
            onAssignProject={projectId => onOrphanAssignProject(task.id, projectId)}
            onOpenNotes={() => onOrphanOpenNotes(task)}
          />
        ))}

        {orphanTasks.length > 0 && projects.length > 0 && (
          <div className="h-px bg-border/40 mb-2" />
        )}

        {projects.map(project => (
          <ProjectCard
            key={project.id}
            project={project}
            onClick={() => onProjectClick(project)}
          />
        ))}

        {/* Ghost placeholder for incoming drag */}
        {dragPreview && projects.length === 0 && orphanTasks.length === 0 && (
          <div className="mb-3 rounded-[8px] border-2 border-dashed border-border h-20 opacity-60" />
        )}
      </SortableContext>

      {projects.length === 0 && orphanTasks.length === 0 && (
        <div className="text-center text-stone/40 text-[13px] py-8">
          {id === 'backlog' && 'Drop projects here'}
          {id === 'in_progress' && 'Drag projects to start'}
          {id === 'waiting' && 'Nothing waiting'}
          {id === 'done' && 'Nothing completed yet'}
        </div>
      )}
    </div>
  )
}
