import { useState, useCallback } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { useStore } from '../../store'
import { KanbanColumn } from './KanbanColumn'
import { ProjectCard } from './ProjectCard'
import { StandaloneTaskCard } from './StandaloneTaskCard'
import { SwapModal } from './SwapModal'
import { ProjectModal } from './ProjectModal'
import { AddProjectModal } from './AddProjectModal'
import { AddTaskModal } from './AddTaskModal'
import { DoneListColumn } from './DoneListColumn'
import { KANBAN_COLUMNS, type Project, type ProjectStatus } from '../../types'
import { Plus, CheckSquare } from 'lucide-react'

export function KanbanBoard() {
  const projects = useStore(s => s.projects)
  const orphanTasks = useStore(s => s.orphanTasks)
  const moveProject = useStore(s => s.moveProject)
  const reorderProjects = useStore(s => s.reorderProjects)
  const swapModalProjectId = useStore(s => s.swapModalProjectId)
  const inProgressLimit = useStore(s => s.settings.inProgressLimit)
  const getWipCount = useStore(s => s.getWipCount)
  const updateOrphanTask = useStore(s => s.updateOrphanTask)
  const deleteOrphanTask = useStore(s => s.deleteOrphanTask)
  const moveOrphanTaskToProject = useStore(s => s.moveOrphanTaskToProject)
  const contexts = useStore(s => s.settings.contexts ?? [])

  const [activeProject, setActiveProject] = useState<Project | null>(null)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showAddTaskModal, setShowAddTaskModal] = useState(false)
  const [selectedContextId, setSelectedContextId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const visibleProjects = selectedContextId
    ? projects.filter(p => p.contextIds?.includes(selectedContextId))
    : projects

  const getProjectsByStatus = useCallback(
    (status: ProjectStatus) => visibleProjects.filter(p => p.status === status),
    [visibleProjects]
  )

  function handleDragStart(event: DragStartEvent) {
    const project = projects.find(p => p.id === event.active.id)
    if (project) setActiveProject(project)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveProject(null)
    const { active, over } = event
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    if (activeId === overId) return

    // Dropped directly onto a column header/empty area
    const targetColumn = KANBAN_COLUMNS.find(col => col.id === overId)
    if (targetColumn) {
      moveProject(activeId, targetColumn.id)
      return
    }

    // Dropped onto another project card
    const draggedProject = projects.find(p => p.id === activeId)
    const overProject = projects.find(p => p.id === overId)
    if (!draggedProject || !overProject) return

    if (draggedProject.status === overProject.status) {
      // Same column — reorder within the column
      reorderProjects(activeId, overId)
    } else {
      // Different column — move to that column
      moveProject(activeId, overProject.status)
    }
  }

  function handleProjectClick(project: Project) {
    // Re-read from store to get fresh data
    const fresh = useStore.getState().projects.find(p => p.id === project.id)
    setSelectedProject(fresh || project)
  }

  // Keep selectedProject in sync with store
  const freshSelectedProject = selectedProject
    ? projects.find(p => p.id === selectedProject.id) || null
    : null

  return (
    <>
      <div className="max-w-[1400px] mx-auto">
        {/* Board divider */}
        <div className="flex items-center gap-4 mb-5">
          <div className="flex-1 h-px bg-border" />
          <span className="text-[11px] uppercase tracking-[0.08em] text-stone font-medium">
            Projects & tasks
          </span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Context filter tabs */}
        {contexts.length > 0 && (
          <div className="flex items-center gap-1 mb-5">
            <button
              onClick={() => setSelectedContextId(null)}
              className={`text-[11px] px-3 py-1.5 rounded-full transition-all duration-150
                ${selectedContextId === null
                  ? 'bg-charcoal text-canvas'
                  : 'text-stone hover:text-charcoal hover:bg-border-light'}`}
            >
              Alles
            </button>
            {contexts.map(ctx => (
              <button
                key={ctx.id}
                onClick={() => setSelectedContextId(ctx.id)}
                className={`text-[11px] px-3 py-1.5 rounded-full transition-all duration-150
                  ${selectedContextId === ctx.id
                    ? 'bg-charcoal text-canvas'
                    : 'text-stone hover:text-charcoal hover:bg-border-light'}`}
              >
                {ctx.name}
              </button>
            ))}
          </div>
        )}

        {/* Add buttons */}
        <div className="flex justify-end gap-2 mb-4">
          <button
            onClick={() => setShowAddTaskModal(true)}
            className="flex items-center gap-2 text-[13px] text-stone
              px-3 py-2 border border-border rounded-[6px] bg-card
              hover:border-stone/30 hover:bg-canvas transition-all duration-150"
          >
            <CheckSquare size={14} />
            New task
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 text-[13px] text-stone
              px-3 py-2 border border-border rounded-[6px] bg-card
              hover:border-stone/30 hover:bg-canvas transition-all duration-150"
          >
            <Plus size={14} />
            New project
          </button>
        </div>

        {/* Standalone tasks — only active (non-done, non-dropped); done ones live in DoneListColumn */}
        {orphanTasks.filter(t => t.status !== 'dropped' && t.status !== 'done').length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-[10px] uppercase tracking-[0.06em] text-stone/60 font-medium">
                Standalone tasks
              </span>
              <div className="flex-1 h-px bg-border-light" />
            </div>
            <div className="flex flex-wrap gap-2">
              {orphanTasks.filter(t => t.status !== 'dropped' && t.status !== 'done').map(task => (
                <StandaloneTaskCard
                  key={task.id}
                  task={task}
                  projects={projects}
                  onComplete={() => updateOrphanTask(task.id, {
                    status: 'done',
                    completedAt: new Date().toISOString(),
                  })}
                  onDelete={() => deleteOrphanTask(task.id)}
                  onAssignProject={(projectId) => moveOrphanTaskToProject(task.id, projectId)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Kanban columns */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-4 gap-4">
            {KANBAN_COLUMNS.map(col => {
              const isWipColumn = col.id === 'in_progress' || col.id === 'waiting'
              return (
                <KanbanColumn
                  key={col.id}
                  id={col.id}
                  title={col.title}
                  limit={isWipColumn ? inProgressLimit : null}
                  combinedCount={isWipColumn ? getWipCount() : undefined}
                  projects={getProjectsByStatus(col.id)}
                  onProjectClick={handleProjectClick}
                />
              )
            })}
            <DoneListColumn />
          </div>

          <DragOverlay>
            {activeProject && (
              <div className="rotate-2 scale-105">
                <ProjectCard project={activeProject} isDragOverlay />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Modals */}
      {swapModalProjectId && <SwapModal />}

      <ProjectModal
        project={freshSelectedProject}
        onClose={() => setSelectedProject(null)}
      />

      <AddProjectModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
      />

      <AddTaskModal
        open={showAddTaskModal}
        onClose={() => setShowAddTaskModal(false)}
      />
    </>
  )
}
