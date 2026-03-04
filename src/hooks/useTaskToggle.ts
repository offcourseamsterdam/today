import { useCallback } from 'react'
import { useStore } from '../store'
import { findTaskById } from '../lib/taskLookup'

/**
 * Returns a stable `toggleTask(taskId)` callback that handles the
 * find-then-dispatch pattern shared by ShortTasks, MaintenanceTier, and PomodoroTimer:
 * locate the task (project task, orphan, or recurring), then toggle its done state.
 *
 * @param onProjectDone - optional callback fired when a project task is toggled to done,
 *   receiving the projectId. Used to trigger the "update your notes" toast in the Vandaag view.
 */
export function useTaskToggle(onProjectDone?: (projectId: string) => void) {
  const projects = useStore(s => s.projects)
  const orphanTasks = useStore(s => s.orphanTasks)
  const recurringTasks = useStore(s => s.recurringTasks)
  const updateTask = useStore(s => s.updateTask)
  const updateOrphanTask = useStore(s => s.updateOrphanTask)

  return useCallback(
    (taskId: string) => {
      const found = findTaskById(taskId, projects, orphanTasks, recurringTasks)
      if (!found) return
      const newDone = found.task.status !== 'done'
      const updates = {
        status: newDone ? ('done' as const) : ('backlog' as const),
        completedAt: newDone ? new Date().toISOString() : undefined,
      }
      if (found.task.projectId) {
        updateTask(taskId, found.task.projectId, updates)
        if (newDone) onProjectDone?.(found.task.projectId)
      } else {
        updateOrphanTask(taskId, updates)
      }
    },
    [projects, orphanTasks, recurringTasks, updateTask, updateOrphanTask, onProjectDone],
  )
}
