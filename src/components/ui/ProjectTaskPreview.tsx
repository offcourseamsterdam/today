import { useState } from 'react'
import { X } from 'lucide-react'
import type { Project } from '../../types'
import { CATEGORY_CONFIG } from '../../types'
import { TaskCheckbox } from './TaskCheckbox'
import { useTaskToggle } from '../../hooks/useTaskToggle'

interface ProjectTaskPreviewProps {
  project: Project
  onRemove: () => void
  previewCount?: number
}

export function ProjectTaskPreview({ project, onRemove, previewCount = 2 }: ProjectTaskPreviewProps) {
  const [expanded, setExpanded] = useState(false)
  const toggleTask = useTaskToggle()
  const config = CATEGORY_CONFIG[project.category]

  const openTasks = project.tasks.filter(t => t.status !== 'done')
  const visibleTasks = expanded ? openTasks : openTasks.slice(0, previewCount)
  const hiddenCount = openTasks.length - previewCount

  return (
    <div className="py-2 group">
      {/* Project header row */}
      <div className="flex items-center gap-2 mb-1.5">
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: config.color }}
        />
        <span className="text-[13px] font-medium text-charcoal flex-1 truncate">
          {project.title}
        </span>
        <button
          onClick={onRemove}
          className="opacity-0 group-hover:opacity-60 hover:!opacity-100 text-stone transition-all"
        >
          <X size={13} />
        </button>
      </div>

      {/* Task list */}
      {openTasks.length === 0 ? (
        <div className="text-[12px] text-stone/30 pl-4 italic">No open tasks</div>
      ) : (
        <div className="pl-4 space-y-0.5">
          {visibleTasks.map(task => (
            <div key={task.id} className="flex items-center gap-2.5 py-0.5">
              <TaskCheckbox
                checked={task.status === 'done'}
                onChange={() => toggleTask(task.id)}
                size="sm"
              />
              <span className={`text-[12px] ${task.status === 'done' ? 'text-stone/40 line-through' : 'text-stone'}`}>
                {task.title}
              </span>
            </div>
          ))}

          {!expanded && hiddenCount > 0 && (
            <button
              onClick={() => setExpanded(true)}
              className="text-[11px] text-stone/40 hover:text-stone/70 transition-colors mt-0.5 pl-[26px]"
            >
              +{hiddenCount} more
            </button>
          )}
          {expanded && hiddenCount > 0 && (
            <button
              onClick={() => setExpanded(false)}
              className="text-[11px] text-stone/40 hover:text-stone/70 transition-colors mt-0.5 pl-[26px]"
            >
              Show less
            </button>
          )}
        </div>
      )}
    </div>
  )
}
