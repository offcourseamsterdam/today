import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { ProjectCard } from './ProjectCard'
import type { Project, ProjectStatus } from '../../types'

interface KanbanColumnProps {
  id: ProjectStatus
  title: string
  projects: Project[]
  limit: number | null
  combinedCount?: number  // when set, used instead of projects.length for WIP display
  onProjectClick: (project: Project) => void
}

export function KanbanColumn({ id, title, projects, limit, combinedCount, onProjectClick }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id })

  const displayCount = combinedCount !== undefined ? combinedCount : projects.length
  const atLimit = limit !== null && displayCount >= limit

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

      {/* Cards */}
      <SortableContext items={projects.map(p => p.id)} strategy={verticalListSortingStrategy}>
        {projects.map(project => (
          <ProjectCard
            key={project.id}
            project={project}
            onClick={() => onProjectClick(project)}
          />
        ))}
      </SortableContext>

      {/* Empty state */}
      {projects.length === 0 && (
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
