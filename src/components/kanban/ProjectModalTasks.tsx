import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { TaskCheckbox } from '../ui/TaskCheckbox'
import type { Project, Task } from '../../types'

interface ProjectModalTasksProps {
  project: Project
  categoryConfig: { color: string }
  addTask: (title: string, projectId: string) => void
  updateTask: (id: string, projectId: string, updates: Partial<Task>) => void
  deleteTask: (id: string, projectId: string) => void
  recordDayWorked: (projectId: string) => void
}

export function ProjectModalTasks({
  project,
  categoryConfig,
  addTask,
  updateTask,
  deleteTask,
  recordDayWorked,
}: ProjectModalTasksProps) {
  const [newTaskTitle, setNewTaskTitle] = useState('')

  const doneTasks = project.tasks.filter(t => t.status === 'done').length
  const totalTasks = project.tasks.length

  function handleAddTask(e: React.FormEvent) {
    e.preventDefault()
    if (!newTaskTitle.trim()) return
    addTask(newTaskTitle.trim(), project.id)
    setNewTaskTitle('')
  }

  function handleToggleTask(taskId: string) {
    const task = project.tasks.find(t => t.id === taskId)
    if (!task) return

    const newDone = task.status !== 'done'
    updateTask(taskId, project.id, {
      status: newDone ? 'done' : 'backlog',
      completedAt: newDone ? new Date().toISOString() : undefined,
    })

    // Record a day worked when completing a task
    if (newDone && project.trackProgress) {
      recordDayWorked(project.id)
    }
  }

  function handleToggleUncomfortable(taskId: string) {
    const task = project.tasks.find(t => t.id === taskId)
    if (!task) return
    updateTask(taskId, project.id, { isUncomfortable: !task.isUncomfortable })
  }

  return (
    <div className="mt-1 pt-4 border-t border-border">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] uppercase tracking-[0.08em] text-stone font-medium">
          Tasks
        </span>
        {totalTasks > 0 && (
          <span className="text-[11px] text-stone">
            {doneTasks} of {totalTasks} done
          </span>
        )}
      </div>

      {project.tasks.length === 0 && (
        <div className="text-[13px] text-stone/40 py-2 mb-2">
          Add tasks below, or use checkboxes in the editor above
        </div>
      )}

      {project.tasks.map(task => (
        <div
          key={task.id}
          className="flex items-center gap-3 py-1.5 group"
        >
          <TaskCheckbox
            checked={task.status === 'done'}
            onChange={() => handleToggleTask(task.id)}
            color={categoryConfig.color}
          />
          <span
            className={`text-[13px] flex-1
              ${task.status === 'done' ? 'text-stone line-through' : 'text-charcoal'}`}
          >
            {task.title}
          </span>
          <button
            onClick={() => handleToggleUncomfortable(task.id)}
            title={task.isUncomfortable ? 'Remove uncomfortable flag' : 'Mark as uncomfortable'}
            className={`group/pill flex-shrink-0 flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full border transition-all
              ${task.isUncomfortable
                ? 'bg-amber-50 text-amber-600 border-amber-200'
                : 'border-stone/20 text-stone/30 hover:border-stone/40 hover:text-stone/50'}`}
          >
            🔥<span className="max-w-0 overflow-hidden whitespace-nowrap transition-all duration-200 group-hover/pill:max-w-[80px]">&nbsp;uncomfortable</span>
          </button>
          <button
            onClick={() => deleteTask(task.id, project.id)}
            className="opacity-0 group-hover:opacity-60 hover:!opacity-100 text-stone hover:text-red transition-all"
          >
            <Trash2 size={13} />
          </button>
        </div>
      ))}

      {/* Add task form */}
      <form onSubmit={handleAddTask} className="mt-2 flex items-center gap-3">
        <Plus size={14} className="text-stone/30 flex-shrink-0" />
        <input
          type="text"
          value={newTaskTitle}
          onChange={e => setNewTaskTitle(e.target.value)}
          placeholder="Add a task..."
          className="flex-1 text-[13px] text-charcoal placeholder:text-stone/30
            bg-transparent border-none outline-none py-1.5"
        />
      </form>
    </div>
  )
}
