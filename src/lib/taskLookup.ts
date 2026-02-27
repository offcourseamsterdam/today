import type { Project, Task } from '../types'

/**
 * Unified task lookup — searches projects, orphan tasks, and recurring tasks
 * in that order. Returns `{ task, projectTitle? }` or null if not found.
 * Pass `[]` for any collection you don't need to search.
 */
export function findTaskById(
  taskId: string,
  projects: Project[],
  orphanTasks: Task[],
  recurringTasks: Task[] = [],
): { task: Task; projectTitle?: string } | null {
  for (const project of projects) {
    const task = project.tasks.find(t => t.id === taskId)
    if (task) return { task, projectTitle: project.title }
  }
  const orphan = orphanTasks.find(t => t.id === taskId)
  if (orphan) return { task: orphan }
  const recurring = recurringTasks.find(t => t.id === taskId)
  if (recurring) return { task: recurring }
  return null
}
