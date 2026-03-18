import React from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { ProjectCard } from './ProjectCard'
import { StandaloneTaskCard } from './StandaloneTaskCard'
import type { Project, ProjectStatus, Task } from '../../types'

function DropGhost({ height }: { height: number }) {
  return (
    <div
      className="mb-3 rounded-[8px] border-2 border-dashed border-stone/30 transition-all duration-150"
      style={{ height }}
    />
  )
}

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
  dragPreview?: { activeId: string; afterItemId: string | null; height: number }
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

  // Ghost insertion index within the projects array (for cross-column drop preview)
  const ghostIndex = dragPreview
    ? (() => {
        if (!dragPreview.afterItemId) return projects.length
        const idx = projects.findIndex(p => p.id === dragPreview.afterItemId)
        return idx >= 0 ? idx + 1 : projects.length
      })()
    : null

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

      <SortableContext items={allIds} strategy={verticalListSortingStrategy}>
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

        {/* Projects with ghost placeholder inserted at ghostIndex */}
        {ghostIndex !== null
          ? projects.map((project, i) => (
              <React.Fragment key={project.id}>
                {i === ghostIndex && <DropGhost height={dragPreview!.height} />}
                <ProjectCard
                  project={project}
                  onClick={() => onProjectClick(project)}
                />
              </React.Fragment>
            ))
          : projects.map(project => (
              <ProjectCard
                key={project.id}
                project={project}
                onClick={() => onProjectClick(project)}
              />
            ))
        }
        {/* Ghost at end when index is past last project */}
        {ghostIndex !== null && ghostIndex >= projects.length && <DropGhost height={dragPreview!.height} />}
      </SortableContext>

      {projects.length === 0 && orphanTasks.length === 0 && !dragPreview && (
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
