import { CATEGORY_CONFIG } from '../../types'
import type { Task, Project } from '../../types'

interface TaskPickerListProps {
  tasks: { task: Task; projectTitle: string }[]
  projects: Project[]
  onSelect: (taskId: string) => void
  emptyText?: string
}

export function TaskPickerList({
  tasks,
  projects,
  onSelect,
  emptyText = 'No available tasks. Add tasks to your In Progress projects.',
}: TaskPickerListProps) {
  if (tasks.length === 0) {
    return (
      <div className="text-[12px] text-stone/40 py-3 text-center">
        {emptyText}
      </div>
    )
  }

  return (
    <>
      {tasks.map(({ task, projectTitle }) => {
        const project = projects.find(p => p.id === task.projectId)
        const catConfig = project ? CATEGORY_CONFIG[project.category] : null
        return (
          <button
            key={task.id}
            onClick={() => onSelect(task.id)}
            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-[4px]
              text-left hover:bg-canvas transition-colors"
          >
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: catConfig?.color || 'var(--color-stone)' }}
            />
            <span className="text-[12px] text-charcoal flex-1 truncate">{task.title}</span>
            <span className="text-[10px] text-stone/40 flex-shrink-0">{projectTitle}</span>
            {task.isUncomfortable && (
              <span className="text-[8px] text-status-amber-text">!</span>
            )}
          </button>
        )
      })}
    </>
  )
}
