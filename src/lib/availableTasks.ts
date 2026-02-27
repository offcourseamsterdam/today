import type { Project, Task } from '../types'

/**
 * Returns all non-done tasks from in-progress projects (+ optional orphan tasks),
 * excluding any IDs already in `excludeIds`, sorted uncomfortable-first.
 *
 * Usage:
 *   ShortTasks  → getAvailableTasks(projects, orphanTasks, shortTaskIds)
 *   PlanningMode → getAvailableTasks(projects, [], shortTaskIds)
 */
export function getAvailableTasks(
  projects: Project[],
  orphanTasks: Task[],
  excludeIds: string[],
): { task: Task; projectTitle: string }[] {
  const result: { task: Task; projectTitle: string }[] = []

  const inProgressProjects = projects.filter(p => p.status === 'in_progress')
  for (const project of inProgressProjects) {
    for (const task of project.tasks) {
      if (task.status !== 'done' && !excludeIds.includes(task.id)) {
        result.push({ task, projectTitle: project.title })
      }
    }
  }

  for (const task of orphanTasks) {
    if (task.status !== 'done' && task.status !== 'dropped' && !excludeIds.includes(task.id)) {
      result.push({ task, projectTitle: 'Standalone' })
    }
  }

  // Uncomfortable tasks first — the ones you've been avoiding often matter most
  result.sort((a, b) => {
    if (a.task.isUncomfortable && !b.task.isUncomfortable) return -1
    if (!a.task.isUncomfortable && b.task.isUncomfortable) return 1
    return 0
  })

  return result
}
