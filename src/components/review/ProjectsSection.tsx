import { useMemo } from 'react'
import { useStore } from '../../store'
import type { Project, ProjectStatus } from '../../types'
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

  const grouped = useMemo(() => {
    const map = new Map<ProjectStatus, Project[]>()
    for (const p of projects) {
      const list = map.get(p.status)
      if (list) list.push(p)
      else map.set(p.status, [p])
    }
    return STATUS_ORDER.filter((s) => map.has(s.key)).map((s) => ({
      ...s,
      projects: map.get(s.key)!,
    }))
  }, [projects])

  if (projects.length === 0) {
    return <p className="text-[var(--color-stone)] italic text-sm">Geen projecten</p>
  }

  return (
    <div className="space-y-6">
      {grouped.map((group) => (
        <div key={group.key}>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-stone)] mb-2">
            {group.label}
            <span className="ml-1.5 text-[var(--color-stone)]/60">{group.projects.length}</span>
          </h3>
          <div className="space-y-2">
            {group.projects.map((project) => (
              <ProjectReviewCard
                key={project.id}
                project={project}
                onTaskCompleted={onTaskCompleted}
                onTaskDeleted={onTaskDeleted}
                onProjectMoved={onProjectMoved}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
