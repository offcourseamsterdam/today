import { useMemo, useState, useRef } from 'react'
import { Plus } from 'lucide-react'
import { useStore } from '../../store'
import type { Category, Project, ProjectStatus } from '../../types'
import { daysSince } from '../../lib/utils'
import ProjectReviewCard from './ProjectReviewCard'

const CATEGORIES: { key: Category; label: string }[] = [
  { key: 'product', label: 'Product' },
  { key: 'marketing', label: 'Marketing' },
  { key: 'ops', label: 'Ops' },
  { key: 'admin', label: 'Admin' },
  { key: 'finance', label: 'Finance' },
  { key: 'personal', label: 'Personal' },
]

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

const BACKLOG_SECTIONS: { key: 'soon' | 'not_yet' | 'someday' | '_unset'; label: string }[] = [
  { key: 'soon', label: 'Soon' },
  { key: 'not_yet', label: 'Not yet' },
  { key: 'someday', label: 'Someday' },
  { key: '_unset', label: 'Backlog' },
]

function sortByStale(items: Project[]) {
  return [...items].sort((a, b) => {
    const aDays = a.daysWorkedLog.length > 0 ? daysSince(a.daysWorkedLog[a.daysWorkedLog.length - 1]) : 999
    const bDays = b.daysWorkedLog.length > 0 ? daysSince(b.daysWorkedLog[b.daysWorkedLog.length - 1]) : 999
    return bDays - aDays
  })
}

export default function ProjectsSection({
  onTaskCompleted,
  onTaskDeleted,
  onProjectMoved,
}: ProjectsSectionProps) {
  const projects = useStore((s) => s.projects)
  const addProject = useStore((s) => s.addProject)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [newCategory, setNewCategory] = useState<Category>('product')
  const [showAddForm, setShowAddForm] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)

  const grouped = useMemo(() => {
    const map = new Map<ProjectStatus, Project[]>()
    for (const p of projects) {
      const list = map.get(p.status)
      if (list) list.push(p)
      else map.set(p.status, [p])
    }
    return STATUS_ORDER.filter((s) => map.has(s.key)).map((s) => ({
      ...s,
      items: sortByStale(map.get(s.key)!),
    }))
  }, [projects])

  // For backlog: split into sub-groups
  const backlogGroup = grouped.find(g => g.key === 'backlog')
  const backlogSubGroups = useMemo(() => {
    if (!backlogGroup) return []
    return BACKLOG_SECTIONS
      .map(sec => ({
        ...sec,
        items: backlogGroup.items.filter(p =>
          sec.key === '_unset' ? !p.backlogSection : p.backlogSection === sec.key
        ),
      }))
      .filter(sec => sec.items.length > 0)
  }, [backlogGroup])

  // Flat ordered list of all project IDs for "next" navigation
  const allProjectIds = useMemo(() => {
    const ids: string[] = []
    for (const group of grouped) {
      if (group.key === 'backlog') {
        for (const sub of backlogSubGroups) ids.push(...sub.items.map(p => p.id))
      } else {
        ids.push(...group.items.map(p => p.id))
      }
    }
    return ids
  }, [grouped, backlogSubGroups])

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

  function renderCard(project: Project) {
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
  }

  function handleAddProject(e: React.FormEvent) {
    e.preventDefault()
    const title = newTitle.trim()
    if (!title) return
    addProject(title, newCategory)
    setNewTitle('')
    setShowAddForm(false)
  }

  if (projects.length === 0 && !showAddForm) {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <p className="text-[var(--color-stone)] italic text-sm">Geen projecten</p>
        <button onClick={() => { setShowAddForm(true); setTimeout(() => titleRef.current?.focus(), 50) }}
          className="inline-flex items-center gap-1.5 text-[12px] text-stone hover:text-charcoal transition-colors">
          <Plus size={14} /> Nieuw project
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {grouped.map((group) => {
        if (group.key === 'backlog') {
          return (
            <div key="backlog">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-stone)] mb-3">
                Backlog
                <span className="ml-1.5 text-[var(--color-stone)]/60">{group.items.length}</span>
              </h3>
              <div className="space-y-4">
                {backlogSubGroups.map(sub => (
                  <div key={sub.key}>
                    <p className="text-[11px] uppercase tracking-wider text-stone/40 font-medium mb-2 px-0.5">
                      {sub.label}
                    </p>
                    <div className="space-y-2">
                      {sub.items.map(renderCard)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        }
        return (
          <div key={group.key}>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-stone)] mb-2">
              {group.label}
              <span className="ml-1.5 text-[var(--color-stone)]/60">{group.items.length}</span>
            </h3>
            <div className="space-y-2">
              {group.items.map(renderCard)}
            </div>
          </div>
        )
      })}

      {/* Add new project */}
      <div className="pt-2">
        {showAddForm ? (
          <form onSubmit={handleAddProject} className="flex flex-col gap-2">
            <input
              ref={titleRef}
              type="text"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => e.key === 'Escape' && setShowAddForm(false)}
              placeholder="Projectnaam..."
              className="text-[13px] px-3 py-2 rounded-md border border-border outline-none focus:border-stone/40 transition-colors bg-white"
              autoFocus
            />
            <div className="flex items-center gap-2 flex-wrap">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setNewCategory(cat.key)}
                  className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                    newCategory === cat.key
                      ? 'border-charcoal bg-charcoal text-white'
                      : 'border-border text-stone hover:border-stone/40'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
              <button
                type="submit"
                className="ml-auto text-[12px] px-3 py-1.5 rounded-md border border-green-200 text-green-700 hover:bg-green-50 transition-colors"
              >
                Toevoegen
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="text-[12px] px-3 py-1.5 rounded-md border border-border text-stone hover:bg-canvas transition-colors"
              >
                Annuleren
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => { setShowAddForm(true); setTimeout(() => titleRef.current?.focus(), 50) }}
            className="inline-flex items-center gap-1.5 text-[12px] text-stone/50 hover:text-charcoal transition-colors"
          >
            <Plus size={14} /> Nieuw project
          </button>
        )}
      </div>
    </div>
  )
}
