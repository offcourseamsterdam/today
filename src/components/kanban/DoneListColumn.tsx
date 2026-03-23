import { useMemo, useCallback } from 'react'
import { X } from 'lucide-react'
import { useStore } from '../../store'
import { CATEGORY_CONFIG, type Category, type Task, type Project } from '../../types'
import { daysSince } from '../../lib/utils'

// ─── Types ───────────────────────────────────────────────────────────────────

type DoneEntry =
  | {
      kind: 'task'
      task: Task
      projectTitle?: string
      projectCategory?: Category
      projectCoverImageUrl?: string
      projectCoverImagePosition?: { x: number; y: number }
      isOrphan: boolean
    }
  | { kind: 'project'; project: Project }

type DateGroup = 'today' | 'yesterday' | 'this_week' | 'earlier'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function entryTimestamp(entry: DoneEntry): string {
  return entry.kind === 'task'
    ? (entry.task.completedAt ?? entry.task.createdAt)
    : entry.project.updatedAt
}

function getGroup(entry: DoneEntry): DateGroup {
  const days = daysSince(entryTimestamp(entry))
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days <= 7) return 'this_week'
  return 'earlier'
}

const GROUP_LABELS: Record<DateGroup, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  this_week: 'This week',
  earlier: 'Earlier',
}

const GROUP_ORDER: DateGroup[] = ['today', 'yesterday', 'this_week', 'earlier']

// ─── Column ───────────────────────────────────────────────────────────────────

export function DoneListColumn() {
  const projects = useStore(s => s.projects)
  const orphanTasks = useStore(s => s.orphanTasks)
  const updateTask = useStore(s => s.updateTask)
  const updateOrphanTask = useStore(s => s.updateOrphanTask)
  const updateProject = useStore(s => s.updateProject)
  const doneReflection = useStore(s => s.doneReflection)
  const doneReflectionLoading = useStore(s => s.doneReflectionLoading)
  const setDoneReflection = useStore(s => s.setDoneReflection)
  const setDoneReflectionLoading = useStore(s => s.setDoneReflectionLoading)
  const clearDoneReflection = useStore(s => s.clearDoneReflection)

  const entries = useMemo<DoneEntry[]>(() => {
    const result: DoneEntry[] = []

    // Done tasks from projects
    for (const project of projects) {
      for (const task of project.tasks) {
        if (task.status === 'done') {
          result.push({
            kind: 'task',
            task,
            projectTitle: project.title,
            projectCategory: project.category,
            projectCoverImageUrl: project.coverImageUrl,
            projectCoverImagePosition: project.coverImagePosition,
            isOrphan: false,
          })
        }
      }
    }

    // Done orphan tasks
    for (const task of orphanTasks) {
      if (task.status === 'done') {
        result.push({ kind: 'task', task, isOrphan: true })
      }
    }

    // Done projects
    for (const project of projects) {
      if (project.status === 'done') {
        result.push({ kind: 'project', project })
      }
    }

    // Sort newest first
    result.sort((a, b) => {
      const da = new Date(entryTimestamp(a)).getTime()
      const db = new Date(entryTimestamp(b)).getTime()
      return db - da
    })

    return result
  }, [projects, orphanTasks])

  const grouped = useMemo(() => {
    const map = new Map<DateGroup, DoneEntry[]>()
    for (const entry of entries) {
      const group = getGroup(entry)
      if (!map.has(group)) map.set(group, [])
      map.get(group)!.push(entry)
    }
    return map
  }, [entries])

  const totalCount = entries.length

  const handleReflect = useCallback(async () => {
    if (doneReflectionLoading || totalCount === 0) return
    setDoneReflectionLoading(true)

    const todayEntries = grouped.get('today') ?? []
    const weekEntries = [
      ...(grouped.get('yesterday') ?? []),
      ...(grouped.get('this_week') ?? []),
    ]

    const doneToday = todayEntries.map(e =>
      e.kind === 'task' ? e.task.title : e.project.title
    )

    const doneThisWeek = weekEntries.map(e => {
      if (e.kind === 'project') {
        return { title: e.project.title, category: e.project.category, daysWorked: e.project.daysWorked }
      }
      return { title: e.task.title, project: e.projectTitle }
    })

    const uncomfortableTasksDone = entries.filter(
      e => e.kind === 'task' && e.task.isUncomfortable
    ).length

    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay())
    const weekStartStr = weekStart.toISOString().slice(0, 10)
    const totalDaysWorkedThisWeek = new Set(
      projects.flatMap(p => (p.daysWorkedLog ?? []).filter(d => d >= weekStartStr))
    ).size

    try {
      const resp = await fetch('/api/done-reflection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doneToday, doneThisWeek, uncomfortableTasksDone, totalDaysWorkedThisWeek }),
      })

      if (!resp.ok) throw new Error('Failed')
      const data = await resp.json()
      setDoneReflection({
        text: data.reflection,
        headline: data.headline,
        generatedAt: new Date().toISOString(),
      })
    } catch {
      setDoneReflectionLoading(false)
    }
  }, [entries, grouped, projects, totalCount, doneReflectionLoading, setDoneReflection, setDoneReflectionLoading])

  return (
    <div className="flex flex-col min-h-0">
      {/* Column header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[11px] uppercase tracking-[0.08em] text-stone font-medium">
          Done
        </span>
        {totalCount > 0 && (
          <span className="text-[10px] text-stone/40">{totalCount}</span>
        )}
        {totalCount > 0 && (
          <button
            onClick={handleReflect}
            disabled={doneReflectionLoading}
            className="ml-auto text-[10px] text-stone/40 hover:text-charcoal transition-colors disabled:opacity-40"
          >
            {doneReflectionLoading ? (
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 border border-stone/30 border-t-stone/60 rounded-full animate-spin" />
              </span>
            ) : (
              'Reflect'
            )}
          </button>
        )}
      </div>

      {/* Reflection card */}
      {doneReflection && (
        <div className="mb-4 p-3.5 rounded-[8px] bg-amber-50/50 border border-amber-100/60 relative">
          <button
            onClick={clearDoneReflection}
            className="absolute top-2 right-2 text-stone/30 hover:text-stone/60 transition-colors"
          >
            <X size={12} />
          </button>
          <p className="font-serif text-[14px] text-charcoal/80 italic leading-snug mb-2 pr-4">
            {doneReflection.headline}
          </p>
          <p className="text-[12px] text-charcoal/60 leading-relaxed">
            {doneReflection.text}
          </p>
        </div>
      )}

      {/* Entries */}
      {totalCount === 0 ? (
        <div className="py-12 text-center">
          <p className="text-[13px] text-stone/30 font-serif italic">
            Nothing completed yet.
          </p>
        </div>
      ) : (
        <div>
          {GROUP_ORDER.map(groupKey => {
            const groupEntries = grouped.get(groupKey)
            if (!groupEntries || groupEntries.length === 0) return null

            return (
              <div key={groupKey}>
                {/* Date group header */}
                <div className="flex items-center gap-2 mb-2 mt-4 first:mt-0">
                  <span className="text-[9px] uppercase tracking-[0.12em] text-stone/30">
                    {GROUP_LABELS[groupKey]}
                  </span>
                  <div className="flex-1 h-px bg-border/60" />
                </div>

                <div className="space-y-1">
                  {groupEntries.map(entry => {
                    if (entry.kind === 'task') {
                      return (
                        <TaskEntry
                          key={entry.task.id}
                          entry={entry}
                          onRestore={() => {
                            if (entry.isOrphan) {
                              updateOrphanTask(entry.task.id, {
                                status: 'backlog',
                                completedAt: undefined,
                              })
                            } else {
                              updateTask(entry.task.id, entry.task.projectId, {
                                status: 'backlog',
                                completedAt: undefined,
                              })
                            }
                          }}
                        />
                      )
                    }

                    return (
                      <ProjectEntry
                        key={entry.project.id}
                        entry={entry}
                        onRestore={() =>
                          updateProject(entry.project.id, { status: 'in_progress' })
                        }
                      />
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Task entry ───────────────────────────────────────────────────────────────

interface TaskEntryProps {
  entry: Extract<DoneEntry, { kind: 'task' }>
  onRestore: () => void
}

function TaskEntry({ entry, onRestore }: TaskEntryProps) {
  const { task, projectTitle, projectCategory, projectCoverImageUrl, projectCoverImagePosition } = entry
  const categoryConfig = projectCategory ? CATEGORY_CONFIG[projectCategory] : null
  const objPos = projectCoverImagePosition
    ? `${projectCoverImagePosition.x}% ${projectCoverImagePosition.y}%`
    : '50% 50%'

  return (
    <div className="flex items-center gap-2.5 py-1 group">
      {/* Artwork thumbnail or dot */}
      {projectCoverImageUrl ? (
        <div className="w-8 h-8 rounded-[4px] overflow-hidden flex-shrink-0 opacity-60">
          <img
            src={projectCoverImageUrl}
            alt=""
            className="w-full h-full object-cover"
            style={{ objectPosition: objPos }}
          />
        </div>
      ) : (
        <div
          className="w-[14px] h-[14px] rounded-full border flex-shrink-0"
          style={{
            borderColor: categoryConfig ? `${categoryConfig.color}50` : 'var(--color-border)',
          }}
        />
      )}

      <div className="flex-1 min-w-0">
        <div className="text-[12px] text-stone/50 leading-snug">{task.title}</div>
        {projectTitle && (
          <div className="text-[10px] text-stone/30 mt-0.5 truncate">{projectTitle}</div>
        )}
      </div>

      <button
        onClick={onRestore}
        className="opacity-0 group-hover:opacity-100 text-[10px] text-stone/40
          hover:text-charcoal transition-all flex-shrink-0 ml-1 whitespace-nowrap"
        title="Restore"
      >
        ↩
      </button>
    </div>
  )
}

// ─── Project entry ────────────────────────────────────────────────────────────

interface ProjectEntryProps {
  entry: Extract<DoneEntry, { kind: 'project' }>
  onRestore: () => void
}

function ProjectEntry({ entry, onRestore }: ProjectEntryProps) {
  const { project } = entry
  const categoryConfig = CATEGORY_CONFIG[project.category]

  return (
    <div className="flex items-center gap-2.5 py-1 group">
      <div
        className="w-[14px] h-[14px] rounded-full flex-shrink-0"
        style={{ background: `${categoryConfig.color}30`, border: `1.5px solid ${categoryConfig.color}` }}
      />
      <div className="flex-1 min-w-0">
        <div className="text-[12px] text-stone/50 leading-snug truncate">{project.title}</div>
        <div className="text-[10px] text-stone/30 mt-0.5">project completed</div>
      </div>
      <button
        onClick={onRestore}
        className="opacity-0 group-hover:opacity-100 text-[10px] text-stone/40
          hover:text-charcoal transition-all flex-shrink-0 ml-1 whitespace-nowrap"
        title="Restore to In Progress"
      >
        ↩
      </button>
    </div>
  )
}
