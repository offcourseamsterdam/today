import { useMemo, useState } from 'react'
import { useStore } from '../../store'
import type { Project, ProjectStatus } from '../../types'
import { daysSince } from '../../lib/utils'
import ProjectReviewCard from './ProjectReviewCard'

interface ProjectsSectionProps {
  onTaskCompleted: () => void
  onTaskDeleted: () => void
  onProjectMoved: () => void
}

const STATUS_ORDER: { key: ProjectStatus; label: string }[] = [
  { key: 'in_progress', label: 'In Progress' },
  { key: 'waiting', label: 'Waiting' },
  { key: 'backlog', label: 'Backlog' },
  { key: 'done', label: 'Done' },
]

export default function ProjectsSection({
  onTaskCompleted,
  onTaskDeleted,
  onProjectMoved,
}: ProjectsSectionProps) {
  const projects = useStore((s) => s.projects)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const grouped = useMemo(() => {
    const map = new Map<ProjectStatus, Project[]>()
    for (const p of projects) {
      const list = map.get(p.status)
      if (list) list.push(p)
      else map.set(p.status, [p])
    }
    return STATUS_ORDER.filter((s) => map.has(s.key)).map((s) => ({
      ...s,
      items: map.get(s.key)!
        .sort((a, b) => {
          const aDays = a.daysWorkedLog.length > 0 ? daysSince(a.daysWorkedLog[a.daysWorkedLog.length - 1]) : 999
          const bDays = b.daysWorkedLog.length > 0 ? daysSince(b.daysWorkedLog[b.daysWorkedLog.length - 1]) : 999
          return bDays - aDays  // stale first
        }),
    }))
  }, [projects])

  // Flat ordered list of all project IDs for "next" navigation
  const allProjectIds = useMemo(() => grouped.flatMap(g => g.items.map(p => p.id)), [grouped])

  function goNext(currentId: string) {
    const idx = allProjectIds.indexOf(currentId)
    const nextId = idx >= 0 && idx < allProjectIds.length - 1 ? allProjectIds[idx + 1] : null
    setExpandedId(nextId)
    if (nextId) {
      setTimeout(() => {
        document.getElementById(`project-card-${nextId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    }
  }

  if (projects.length === 0) {
    return <p className="text-[var(--color-stone)] italic text-sm">Geen projecten</p>
  }

  return (
    <div className="space-y-6">
      {grouped.map((group) => (
        <div key={group.key}>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-stone)] mb-2">
            {group.label}
            <span className="ml-1.5 text-[var(--color-stone)]/60">{group.items.length}</span>
          </h3>
          <div className="space-y-2">
            {group.items.map((project, idx) => {
              const globalIdx = allProjectIds.indexOf(project.id)
              const hasNext = globalIdx < allProjectIds.length - 1
              return (
                <div key={project.id} id={`project-card-${project.id}`}>
                  <ProjectReviewCard
                    project={project}
                    expanded={expandedId === project.id}
                    onToggle={() => setExpandedId(prev => prev === project.id ? null : project.id)}
                    onNext={hasNext ? () => goNext(project.id) : undefined}
                    onTaskCompleted={onTaskCompleted}
                    onTaskDeleted={onTaskDeleted}
                    onProjectMoved={onProjectMoved}
                  />
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
