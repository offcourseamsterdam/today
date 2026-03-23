import { extractBlockNoteText } from './extractText'
import type { Meeting, Project } from '../types'

/**
 * Build a context string for GPT-4o from a meeting's linked project.
 * Includes project metadata, tasks, waiting-on, body notes, and
 * summaries from previous meetings linked to the same project.
 */
export function assembleMeetingContext(
  meeting: Meeting,
  projects: Project[],
  allMeetings: Meeting[],
): string | undefined {
  if (!meeting.projectId) return undefined

  const project = projects.find(p => p.id === meeting.projectId)
  if (!project) return undefined

  const lines: string[] = []
  lines.push(`Project: ${project.title} (${project.category}, ${project.status})`)

  const openTasks = project.tasks.filter(t => t.status !== 'done' && t.status !== 'dropped')
  if (openTasks.length > 0) {
    lines.push(`Open tasks: ${openTasks.map(t => t.title).join(', ')}`)
  }

  const doneTasks = project.tasks.filter(t => t.status === 'done')
  if (doneTasks.length > 0) {
    lines.push(`Completed tasks: ${doneTasks.map(t => t.title).join(', ')}`)
  }

  if (project.waitingOn && project.waitingOn.length > 0) {
    lines.push(`Waiting on: ${project.waitingOn.map(w => w.person).join(', ')}`)
  }

  const bodyNotes = extractBlockNoteText(project.bodyContent)
  if (bodyNotes) lines.push(`Project notes:\n${bodyNotes}`)

  // Include summaries from previous meetings linked to this project
  const previousMeetings = allMeetings
    .filter(m => m.projectId === meeting.projectId && m.id !== meeting.id && m.meetingNotes)
    .sort((a, b) => b.meetingNotes!.generatedAt.localeCompare(a.meetingNotes!.generatedAt))
    .slice(0, 5)

  if (previousMeetings.length > 0) {
    lines.push(`\nPrevious meeting notes (most recent first):`)
    for (const prev of previousMeetings) {
      const n = prev.meetingNotes!
      const date = n.generatedAt.slice(0, 10)
      lines.push(`\n[${date}] ${prev.title}`)
      lines.push(`Summary: ${n.summary}`)
      if (n.actionItems.length > 0) {
        lines.push(`Action items: ${n.actionItems.map(a => a.description + (a.assignee ? ` (${a.assignee})` : '')).join('; ')}`)
      }
      if ((n.openQuestions?.length ?? 0) > 0) {
        lines.push(`Open questions: ${n.openQuestions.join('; ')}`)
      }
    }
  }

  return lines.join('\n')
}
