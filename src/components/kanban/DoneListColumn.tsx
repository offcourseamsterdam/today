import { useMemo } from 'react'
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

type DateGroup = 'vandaag' | 'gisteren' | 'deze_week' | 'eerder'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function entryTimestamp(entry: DoneEntry): string {
  return entry.kind === 'task'
    ? (entry.task.completedAt ?? entry.task.createdAt)
    : entry.project.updatedAt
}

function getGroup(entry: DoneEntry): DateGroup {
  const days = daysSince(entryTimestamp(entry))
  if (days === 0) return 'vandaag'
  if (days === 1) return 'gisteren'
  if (days <= 7) return 'deze_week'
  return 'eerder'
}

const GROUP_LABELS: Record<DateGroup, string> = {
  vandaag: 'Vandaag',
  gisteren: 'Gisteren',
  deze_week: 'Deze week',
  eerder: 'Eerder',
}

const GROUP_ORDER: DateGroup[] = ['vandaag', 'gisteren', 'deze_week', 'eerder']

// ─── Column ───────────────────────────────────────────────────────────────────

export function DoneListColumn() {
  const projects = useStore(s => s.projects)
  const orphanTasks = useStore(s => s.orphanTasks)
  const updateTask = useStore(s => s.updateTask)
  const updateOrphanTask = useStore(s => s.updateOrphanTask)
  const updateProject = useStore(s => s.updateProject)

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
      </div>

      {/* Entries */}
      {totalCount === 0 ? (
        <div className="py-12 text-center">
          <p className="text-[13px] text-stone/30 font-serif italic">
            Nog niets afgerond.
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
        title="Zet terug"
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
  const taskCount = project.tasks.length
  const objPos = project.coverImagePosition
    ? `${project.coverImagePosition.x}% ${project.coverImagePosition.y}%`
    : '50% 30%'

  return (
    <div
      className="bg-card rounded-[8px] border border-border/50 group
        transition-all hover:border-stone/20 overflow-hidden mt-1.5"
    >
      {/* Cover image */}
      {project.coverImageUrl ? (
        <div className="relative h-[80px] overflow-hidden">
          <img
            src={project.coverImageUrl}
            alt=""
            className="w-full h-full object-cover opacity-70"
            style={{ objectPosition: objPos }}
          />
          {/* Subtle darkening gradient at bottom for text legibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          {/* Restore button pinned top-right */}
          <button
            onClick={onRestore}
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100
              text-[10px] text-white/70 hover:text-white bg-black/30 hover:bg-black/50
              rounded px-1.5 py-0.5 transition-all whitespace-nowrap backdrop-blur-sm"
            title="Zet terug naar In Progress"
          >
            ↩
          </button>
        </div>
      ) : (
        /* No cover: category color strip */
        <div
          className="h-[6px]"
          style={{ background: categoryConfig.color }}
        />
      )}

      {/* Card body */}
      <div className="flex items-center gap-3 px-3 py-2.5">
        {!project.coverImageUrl && (
          <div
            className="w-[3px] h-7 rounded-full flex-shrink-0"
            style={{ background: categoryConfig.color }}
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-medium text-stone/60 leading-snug truncate">
            {project.title}
          </div>
          <div className="text-[10px] text-stone/35 mt-0.5">
            project afgerond{taskCount > 0 ? ` · ${taskCount} taken` : ''}
          </div>
        </div>
        {/* Restore button when no cover (no overlay available) */}
        {!project.coverImageUrl && (
          <button
            onClick={onRestore}
            className="opacity-0 group-hover:opacity-100 text-[10px] text-stone/40
              hover:text-charcoal transition-all flex-shrink-0 whitespace-nowrap"
            title="Zet terug naar In Progress"
          >
            ↩
          </button>
        )}
      </div>
    </div>
  )
}
