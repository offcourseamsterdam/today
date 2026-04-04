# Weekly Review Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a GTD-style weekly review page with 4 sections (Inbox, Projects, Recurring, Summary) using a vertical checklist layout with progress bar.

**Architecture:** New `review/` component folder with a page orchestrator + 4 section components. State is ephemeral (section completion tracked in local component state), but all mutations go through the real Zustand store. A `reviewStats` ref tracks counts for the summary section.

**Tech Stack:** React 19, TypeScript strict, Zustand, Tailwind CSS 4, Lucide icons, date-fns

---

### Task 1: Add `'review'` to ActiveView and navigation

**Files:**
- Modify: `src/store/types.ts`
- Modify: `src/App.tsx`

**Step 1: Update ActiveView type**

In `src/store/types.ts`, line 25, change:
```ts
export type ActiveView = 'vandaag' | 'kanban' | 'planning' | 'philosophy' | 'meetings'
```
to:
```ts
export type ActiveView = 'vandaag' | 'kanban' | 'planning' | 'philosophy' | 'meetings' | 'review'
```

**Step 2: Add nav tab in App.tsx**

Find the Meetings nav button (around line 174–182) and add after it:
```tsx
<button
  onClick={() => setActiveView('review')}
  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-[12px] font-medium tracking-[0.02em] transition-colors
    ${activeView === 'review'
      ? 'bg-charcoal text-[#FAF9F7]'
      : 'text-stone/60 hover:text-charcoal hover:bg-border-light'}`}
>
  <ClipboardCheck size={14} />
  Review
</button>
```

Add `ClipboardCheck` to the lucide import at the top of App.tsx.

**Step 3: Add route in main content**

Find the route chain (around line 245–251). Before the final else clause, add:
```tsx
) : activeView === 'review' ? (
  <Suspense fallback={null}><WeeklyReviewPage /></Suspense>
```

Add lazy import at top:
```tsx
const WeeklyReviewPage = lazy(() => import('./components/review/WeeklyReviewPage').then(m => ({ default: m.WeeklyReviewPage })))
```

**Step 4: TypeScript check + commit**
```bash
PATH=/usr/local/bin:$PATH npx tsc --noEmit
```
This will fail until WeeklyReviewPage exists — create a stub:
```tsx
// src/components/review/WeeklyReviewPage.tsx
export function WeeklyReviewPage() {
  return <div className="max-w-[900px] mx-auto px-4 sm:px-6 pb-12">Weekly Review (coming soon)</div>
}
```
Then TypeScript check and commit:
```bash
git add src/store/types.ts src/App.tsx src/components/review/WeeklyReviewPage.tsx
git commit -m "feat: add review to ActiveView, nav tab, route stub"
```

---

### Task 2: Create InboxSection component

**Files:**
- Create: `src/components/review/InboxSection.tsx`

**Step 1: Build the card-stack inbox**

```tsx
// src/components/review/InboxSection.tsx
import { useState } from 'react'
import { FolderInput, Check, Trash2 } from 'lucide-react'
import { useStore } from '../../store'
import type { Task } from '../../types'

interface InboxSectionProps {
  onStats: (processed: number, toProject: number, kept: number, deleted: number) => void
}

export function InboxSection({ onStats }: InboxSectionProps) {
  const orphanTasks = useStore(s => s.orphanTasks)
  const projects = useStore(s => s.projects)
  const deleteOrphanTask = useStore(s => s.deleteOrphanTask)
  const addTask = useStore(s => s.addTask)

  // Track which tasks have been processed (by id)
  const [processedIds, setProcessedIds] = useState<Set<string>>(new Set())
  const [showProjectPicker, setShowProjectPicker] = useState(false)
  const [stats, setStats] = useState({ processed: 0, toProject: 0, kept: 0, deleted: 0 })

  const remaining = orphanTasks.filter(t => !processedIds.has(t.id))
  const currentTask = remaining[0] as Task | undefined
  const totalCount = orphanTasks.length
  const processedCount = processedIds.size

  function markProcessed(taskId: string, action: 'project' | 'keep' | 'delete') {
    setProcessedIds(prev => new Set(prev).add(taskId))
    const newStats = {
      ...stats,
      processed: stats.processed + 1,
      toProject: stats.toProject + (action === 'project' ? 1 : 0),
      kept: stats.kept + (action === 'keep' ? 1 : 0),
      deleted: stats.deleted + (action === 'delete' ? 1 : 0),
    }
    setStats(newStats)
    onStats(newStats.processed, newStats.toProject, newStats.kept, newStats.deleted)
  }

  function handleToProject(projectId: string) {
    if (!currentTask) return
    // Add task to project, then delete orphan
    addTask(currentTask.title, projectId)
    deleteOrphanTask(currentTask.id)
    markProcessed(currentTask.id, 'project')
    setShowProjectPicker(false)
  }

  function handleKeep() {
    if (!currentTask) return
    markProcessed(currentTask.id, 'keep')
  }

  function handleDelete() {
    if (!currentTask) return
    deleteOrphanTask(currentTask.id)
    markProcessed(currentTask.id, 'delete')
  }

  // Empty / done state
  if (!currentTask) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mb-3">
          <Check size={20} className="text-green-600" />
        </div>
        <p className="text-[13px] text-stone/50">Inbox leeg</p>
        {processedCount > 0 && (
          <p className="text-[11px] text-stone/30 mt-1">{processedCount} items verwerkt</p>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center py-6">
      {/* Counter */}
      <p className="text-[11px] text-stone/30 mb-4">
        {processedCount + 1} van {totalCount}
      </p>

      {/* Card */}
      <div className="w-full max-w-[400px] bg-white border border-border rounded-[10px] px-6 py-5 shadow-sm">
        <h3 className="font-serif text-[18px] text-charcoal leading-snug">
          {currentTask.title}
        </h3>
        {currentTask.createdAt && (
          <p className="text-[11px] text-stone/30 mt-1">
            Aangemaakt {new Date(currentTask.createdAt).toLocaleDateString('nl-NL')}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-4">
        <div className="relative">
          <button
            onClick={() => setShowProjectPicker(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-[11px] font-medium
              bg-charcoal text-canvas hover:bg-charcoal/80 transition-colors"
          >
            <FolderInput size={12} />
            Naar project
          </button>
          {showProjectPicker && (
            <div className="absolute top-full left-0 mt-1 w-[220px] bg-white border border-border rounded-[8px] shadow-lg z-10 max-h-[200px] overflow-y-auto">
              {projects.map(p => (
                <button
                  key={p.id}
                  onClick={() => handleToProject(p.id)}
                  className="w-full text-left px-3 py-2 text-[12px] text-charcoal hover:bg-canvas transition-colors first:rounded-t-[8px] last:rounded-b-[8px]"
                >
                  {p.title}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={handleKeep}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-[11px] font-medium
            border border-border text-stone hover:bg-canvas transition-colors"
        >
          <Check size={12} />
          Houden
        </button>
        <button
          onClick={handleDelete}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-[11px] font-medium
            border border-border text-stone hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
        >
          <Trash2 size={12} />
          Verwijderen
        </button>
      </div>
    </div>
  )
}
```

**Step 2: TypeScript check + commit**
```bash
PATH=/usr/local/bin:$PATH npx tsc --noEmit
git add src/components/review/InboxSection.tsx
git commit -m "feat: InboxSection — card-stack orphan task processing"
```

---

### Task 3: Create ProjectReviewCard component

**Files:**
- Create: `src/components/review/ProjectReviewCard.tsx`

**Step 1: Build the expandable project card**

```tsx
// src/components/review/ProjectReviewCard.tsx
import { useState } from 'react'
import { ChevronDown, ChevronRight, Trash2, Check, ArrowRight } from 'lucide-react'
import { useStore } from '../../store'
import { getWaitingStatus } from '../../lib/utils'
import type { Project, ProjectStatus } from '../../types'

interface ProjectReviewCardProps {
  project: Project
  onTaskCompleted: () => void
  onTaskDeleted: () => void
  onProjectMoved: () => void
}

const STATUS_COLORS: Record<ProjectStatus, string> = {
  in_progress: 'bg-blue-100 text-blue-700',
  waiting: 'bg-amber-100 text-amber-700',
  backlog: 'bg-stone/10 text-stone',
  done: 'bg-green-100 text-green-700',
}

export function ProjectReviewCard({ project, onTaskCompleted, onTaskDeleted, onProjectMoved }: ProjectReviewCardProps) {
  const updateProject = useStore(s => s.updateProject)
  const moveProject = useStore(s => s.moveProject)
  const [expanded, setExpanded] = useState(false)
  const [newAction, setNewAction] = useState('')

  const openTasks = project.tasks.filter(t => t.status !== 'done' && t.status !== 'dropped')
  const totalTasks = project.tasks.length
  const waitingOn = project.waitingOn ?? []

  function handleToggleTask(taskId: string) {
    const task = project.tasks.find(t => t.id === taskId)
    if (!task) return
    const newStatus = task.status === 'done' ? 'backlog' : 'done'
    updateProject(project.id, {
      tasks: project.tasks.map(t => t.id === taskId ? { ...t, status: newStatus, completedAt: newStatus === 'done' ? new Date().toISOString() : undefined } : t),
    })
    if (newStatus === 'done') onTaskCompleted()
  }

  function handleDeleteTask(taskId: string) {
    updateProject(project.id, {
      tasks: project.tasks.filter(t => t.id !== taskId),
    })
    onTaskDeleted()
  }

  function handleResolveWaiting(index: number) {
    const updated = [...waitingOn]
    updated.splice(index, 1)
    updateProject(project.id, { waitingOn: updated })
  }

  function handleAddAction(e: React.FormEvent) {
    e.preventDefault()
    if (!newAction.trim()) return
    const newTask = {
      id: crypto.randomUUID(),
      title: newAction.trim(),
      status: 'backlog' as const,
      isRecurring: false,
      isUncomfortable: false,
      createdAt: new Date().toISOString(),
    }
    updateProject(project.id, {
      tasks: [newTask, ...project.tasks],
    })
    setNewAction('')
  }

  function handleMove(status: ProjectStatus) {
    moveProject(project.id, status)
    onProjectMoved()
    setExpanded(false)
  }

  return (
    <div className={`border border-border/60 rounded-[8px] overflow-hidden transition-colors ${expanded ? 'bg-white' : 'bg-white hover:bg-canvas/40'}`}>
      {/* Collapsed row */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        <div className="flex-shrink-0">
          {expanded
            ? <ChevronDown size={12} className="text-stone/40" />
            : <ChevronRight size={12} className="text-stone/30" />
          }
        </div>
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0 ${STATUS_COLORS[project.status]}`}>
          {project.status === 'in_progress' ? 'Active' : project.status === 'waiting' ? 'Waiting' : project.status === 'backlog' ? 'Backlog' : 'Done'}
        </span>
        <span className="text-[13px] text-charcoal truncate flex-1 min-w-0 font-medium">
          {project.title}
        </span>
        <span className="text-[11px] text-stone/30 flex-shrink-0">
          {openTasks.length}/{totalTasks}
        </span>
        {waitingOn.length > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 flex-shrink-0">
            Wacht op {waitingOn.length}
          </span>
        )}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-border/40">
          {/* Tasks */}
          {project.tasks.length > 0 && (
            <div className="mt-3">
              <div className="text-[10px] uppercase tracking-[0.08em] text-stone/35 font-medium mb-2">Taken</div>
              <div className="space-y-1">
                {project.tasks.map(task => (
                  <div key={task.id} className="flex items-center gap-2 group">
                    <button
                      onClick={() => handleToggleTask(task.id)}
                      className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors
                        ${task.status === 'done' ? 'bg-green-500 border-green-500' : 'border-stone/30 hover:border-stone/50'}`}
                    >
                      {task.status === 'done' && <Check size={10} className="text-white" />}
                    </button>
                    <span className={`text-[12px] flex-1 ${task.status === 'done' ? 'text-stone/30 line-through' : 'text-charcoal'}`}>
                      {task.title}
                    </span>
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="opacity-0 group-hover:opacity-100 text-stone/20 hover:text-red-400 transition-all"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Waiting on */}
          {waitingOn.length > 0 && (
            <div className="mt-4">
              <div className="text-[10px] uppercase tracking-[0.08em] text-stone/35 font-medium mb-2">Wacht op</div>
              <div className="space-y-1">
                {waitingOn.map((w, i) => (
                  <div key={i} className="flex items-center gap-2 text-[12px]">
                    <span className="text-amber-600">{w.person}</span>
                    <span className="text-stone/30">·</span>
                    <span className="text-stone/30">{getWaitingStatus(w.since)}</span>
                    <button
                      onClick={() => handleResolveWaiting(i)}
                      className="text-[10px] text-stone/30 hover:text-green-600 transition-colors ml-auto"
                    >
                      Opgelost
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Next action */}
          <form onSubmit={handleAddAction} className="mt-4">
            <div className="text-[10px] uppercase tracking-[0.08em] text-stone/35 font-medium mb-1.5">
              Eerste volgende actie?
            </div>
            <input
              type="text"
              value={newAction}
              onChange={e => setNewAction(e.target.value)}
              placeholder="Wat is de volgende concrete stap?"
              className={`w-full px-3 py-2 rounded-[6px] border text-[12px] outline-none transition-colors
                ${openTasks.length === 0
                  ? 'border-amber-300 bg-amber-50/50 placeholder:text-amber-400 focus:border-amber-400'
                  : 'border-border bg-canvas placeholder:text-stone/30 focus:border-stone/40'}`}
            />
          </form>

          {/* Project actions */}
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border/30">
            {project.status !== 'backlog' && (
              <button onClick={() => handleMove('backlog')} className="flex items-center gap-1 text-[10px] text-stone/40 hover:text-charcoal transition-colors">
                <ArrowRight size={10} /> Backlog
              </button>
            )}
            {project.status !== 'done' && (
              <button onClick={() => handleMove('done')} className="flex items-center gap-1 text-[10px] text-stone/40 hover:text-green-600 transition-colors">
                <Check size={10} /> Done
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
```

**Step 2: TypeScript check + commit**
```bash
PATH=/usr/local/bin:$PATH npx tsc --noEmit
git add src/components/review/ProjectReviewCard.tsx
git commit -m "feat: ProjectReviewCard — expandable project row for review"
```

---

### Task 4: Create ProjectsSection component

**Files:**
- Create: `src/components/review/ProjectsSection.tsx`

```tsx
// src/components/review/ProjectsSection.tsx
import { useStore } from '../../store'
import { ProjectReviewCard } from './ProjectReviewCard'

interface ProjectsSectionProps {
  onTaskCompleted: () => void
  onTaskDeleted: () => void
  onProjectMoved: () => void
}

const STATUS_ORDER = ['in_progress', 'waiting', 'backlog', 'done'] as const

export function ProjectsSection({ onTaskCompleted, onTaskDeleted, onProjectMoved }: ProjectsSectionProps) {
  const projects = useStore(s => s.projects)

  const grouped = STATUS_ORDER.map(status => ({
    status,
    label: status === 'in_progress' ? 'In Progress' : status === 'waiting' ? 'Waiting' : status === 'backlog' ? 'Backlog' : 'Done',
    items: projects.filter(p => p.status === status),
  })).filter(g => g.items.length > 0)

  if (projects.length === 0) {
    return (
      <p className="text-[12px] text-stone/30 italic py-8 text-center">Geen projecten</p>
    )
  }

  return (
    <div className="space-y-6">
      {grouped.map(group => (
        <div key={group.status}>
          <div className="text-[10px] uppercase tracking-[0.08em] text-stone/35 font-medium mb-2">
            {group.label} ({group.items.length})
          </div>
          <div className="space-y-2">
            {group.items.map(project => (
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
```

```bash
PATH=/usr/local/bin:$PATH npx tsc --noEmit
git add src/components/review/ProjectsSection.tsx
git commit -m "feat: ProjectsSection — grouped project list for review"
```

---

### Task 5: Create RecurringSection component

**Files:**
- Create: `src/components/review/RecurringSection.tsx`

```tsx
// src/components/review/RecurringSection.tsx
import { useState } from 'react'
import { Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import { useStore } from '../../store'
import { describeRule } from '../../lib/recurrence'
import { RecurrenceFrequencyPicker } from '../ui/RecurrenceFrequencyPicker'
import type { RecurrenceRule } from '../../types'

interface RecurringSectionProps {
  onDeactivated: () => void
}

export function RecurringSection({ onDeactivated }: RecurringSectionProps) {
  const recurringTasks = useStore(s => s.recurringTasks)
  const updateRecurringTask = useStore(s => s.updateRecurringTask)
  const deleteRecurringTask = useStore(s => s.deleteRecurringTask)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  if (recurringTasks.length === 0) {
    return (
      <p className="text-[12px] text-stone/30 italic py-8 text-center">Geen recurring tasks</p>
    )
  }

  function handleDelete(taskId: string) {
    deleteRecurringTask(taskId)
    onDeactivated()
    setConfirmDeleteId(null)
  }

  return (
    <div className="space-y-2">
      {recurringTasks.map(task => {
        const isEditing = editingId === task.id
        return (
          <div key={task.id} className="border border-border/60 rounded-[8px] bg-white overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3">
              <button
                onClick={() => setEditingId(isEditing ? null : task.id)}
                className="flex-shrink-0"
              >
                {isEditing
                  ? <ChevronDown size={12} className="text-stone/40" />
                  : <ChevronRight size={12} className="text-stone/30" />
                }
              </button>
              <span className="text-[13px] text-charcoal flex-1 min-w-0 truncate font-medium">
                {task.title}
              </span>
              {task.recurrenceRule && (
                <span className="text-[10px] text-stone/40 bg-stone/5 px-2 py-0.5 rounded-full flex-shrink-0">
                  {describeRule(task.recurrenceRule)}
                </span>
              )}
              {confirmDeleteId === task.id ? (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleDelete(task.id)}
                    className="text-[10px] text-red-500 hover:text-red-700 font-medium"
                  >
                    Bevestig
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    className="text-[10px] text-stone/30 hover:text-stone"
                  >
                    Annuleer
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDeleteId(task.id)}
                  className="text-stone/20 hover:text-red-400 transition-colors flex-shrink-0"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
            {isEditing && task.recurrenceRule && (
              <div className="px-4 pb-4 border-t border-border/30 pt-3">
                <RecurrenceFrequencyPicker
                  value={task.recurrenceRule}
                  onChange={(rule: RecurrenceRule) => updateRecurringTask(task.id, { recurrenceRule: rule })}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
```

Note: Check `RecurrenceFrequencyPicker` props — it may use a different interface (`RecurrenceFormState` + `EMPTY_RULE_STATE`). Read the component to confirm the props API before implementing. If it uses form state rather than a direct `value/onChange(RecurrenceRule)`, adapt accordingly.

```bash
PATH=/usr/local/bin:$PATH npx tsc --noEmit
git add src/components/review/RecurringSection.tsx
git commit -m "feat: RecurringSection — recurring task review list"
```

---

### Task 6: Create SummarySection component

**Files:**
- Create: `src/components/review/SummarySection.tsx`

```tsx
// src/components/review/SummarySection.tsx
import { useState } from 'react'
import { Check } from 'lucide-react'

export interface ReviewStats {
  inboxProcessed: number
  inboxToProject: number
  inboxKept: number
  inboxDeleted: number
  tasksCompleted: number
  tasksDeleted: number
  projectsMoved: number
  recurringDeactivated: number
}

interface SummarySectionProps {
  stats: ReviewStats
  onFinish: () => void
}

export function SummarySection({ stats, onFinish }: SummarySectionProps) {
  const [note, setNote] = useState('')
  const hasActivity = Object.values(stats).some(v => v > 0)

  return (
    <div className="space-y-4">
      {/* Auto-generated stats */}
      {hasActivity ? (
        <div className="bg-canvas rounded-[8px] px-4 py-3 space-y-1.5">
          {stats.inboxProcessed > 0 && (
            <p className="text-[12px] text-charcoal">
              <span className="font-medium">{stats.inboxProcessed}</span> inbox items verwerkt
              <span className="text-stone/40">
                {' '}({stats.inboxToProject > 0 ? `${stats.inboxToProject} naar project` : ''}
                {stats.inboxKept > 0 ? `${stats.inboxToProject > 0 ? ', ' : ''}${stats.inboxKept} gehouden` : ''}
                {stats.inboxDeleted > 0 ? `${stats.inboxToProject > 0 || stats.inboxKept > 0 ? ', ' : ''}${stats.inboxDeleted} verwijderd` : ''})
              </span>
            </p>
          )}
          {stats.tasksCompleted > 0 && (
            <p className="text-[12px] text-charcoal">
              <span className="font-medium">{stats.tasksCompleted}</span> taken afgevinkt
            </p>
          )}
          {stats.tasksDeleted > 0 && (
            <p className="text-[12px] text-charcoal">
              <span className="font-medium">{stats.tasksDeleted}</span> taken verwijderd
            </p>
          )}
          {stats.projectsMoved > 0 && (
            <p className="text-[12px] text-charcoal">
              <span className="font-medium">{stats.projectsMoved}</span> projecten verplaatst
            </p>
          )}
          {stats.recurringDeactivated > 0 && (
            <p className="text-[12px] text-charcoal">
              <span className="font-medium">{stats.recurringDeactivated}</span> recurring tasks verwijderd
            </p>
          )}
        </div>
      ) : (
        <p className="text-[12px] text-stone/30 italic">Geen wijzigingen gemaakt</p>
      )}

      {/* Reflection note */}
      <div>
        <div className="text-[10px] uppercase tracking-[0.08em] text-stone/35 font-medium mb-1.5">
          Reflectie (optioneel)
        </div>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Hoe voelt de week? Iets om te onthouden?"
          rows={3}
          className="w-full px-3 py-2 rounded-[6px] border border-border bg-white
            text-[12px] text-charcoal placeholder:text-stone/30
            outline-none focus:border-stone/40 transition-colors resize-none"
        />
      </div>

      {/* Finish button */}
      <button
        onClick={onFinish}
        className="flex items-center gap-1.5 px-4 py-2 rounded-[6px] text-[12px] font-medium
          bg-charcoal text-canvas hover:bg-charcoal/80 transition-colors"
      >
        <Check size={13} />
        Review afronden
      </button>
    </div>
  )
}
```

```bash
PATH=/usr/local/bin:$PATH npx tsc --noEmit
git add src/components/review/SummarySection.tsx
git commit -m "feat: SummarySection — auto-generated review stats and reflection"
```

---

### Task 7: Create WeeklyReviewPage orchestrator

**Files:**
- Modify: `src/components/review/WeeklyReviewPage.tsx` (replace stub)

This is the main page component. It renders the progress bar and 4 collapsible sections.

```tsx
// src/components/review/WeeklyReviewPage.tsx
import { useState, useRef, useCallback } from 'react'
import { ChevronDown, ChevronRight, Check, Inbox, FolderKanban, RotateCcw, Flag } from 'lucide-react'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'
import { InboxSection } from './InboxSection'
import { ProjectsSection } from './ProjectsSection'
import { RecurringSection } from './RecurringSection'
import { SummarySection, type ReviewStats } from './SummarySection'

const SECTIONS = [
  { id: 'inbox', label: 'Inbox', icon: Inbox },
  { id: 'projects', label: 'Projecten', icon: FolderKanban },
  { id: 'recurring', label: 'Recurring', icon: RotateCcw },
  { id: 'summary', label: 'Afsluiten', icon: Flag },
] as const

type SectionId = typeof SECTIONS[number]['id']

export function WeeklyReviewPage() {
  const [completedSections, setCompletedSections] = useState<Set<SectionId>>(new Set())
  const [activeSection, setActiveSection] = useState<SectionId>('inbox')
  const [finished, setFinished] = useState(false)
  const sectionRefs = useRef<Record<SectionId, HTMLDivElement | null>>({
    inbox: null, projects: null, recurring: null, summary: null,
  })

  const [stats, setStats] = useState<ReviewStats>({
    inboxProcessed: 0, inboxToProject: 0, inboxKept: 0, inboxDeleted: 0,
    tasksCompleted: 0, tasksDeleted: 0, projectsMoved: 0, recurringDeactivated: 0,
  })

  function markSectionDone(sectionId: SectionId) {
    setCompletedSections(prev => {
      const next = new Set(prev)
      next.add(sectionId)
      return next
    })
    // Auto-advance to next section
    const currentIndex = SECTIONS.findIndex(s => s.id === sectionId)
    if (currentIndex < SECTIONS.length - 1) {
      const nextId = SECTIONS[currentIndex + 1].id
      setActiveSection(nextId)
      setTimeout(() => {
        sectionRefs.current[nextId]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    }
  }

  function handleSectionToggle(sectionId: SectionId) {
    setActiveSection(activeSection === sectionId ? activeSection : sectionId)
  }

  const handleInboxStats = useCallback((processed: number, toProject: number, kept: number, deleted: number) => {
    setStats(prev => ({ ...prev, inboxProcessed: processed, inboxToProject: toProject, inboxKept: kept, inboxDeleted: deleted }))
  }, [])

  function handleFinish() {
    setCompletedSections(new Set(SECTIONS.map(s => s.id)))
    setFinished(true)
  }

  const today = format(new Date(), 'EEEE d MMMM yyyy', { locale: nl })

  return (
    <div className="max-w-[900px] mx-auto px-4 sm:px-6 pb-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-serif text-[24px] text-charcoal">Weekly Review</h1>
        <p className="text-[12px] text-stone/40 mt-1">{today}</p>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-0 mb-10">
        {SECTIONS.map((section, i) => {
          const done = completedSections.has(section.id)
          const isActive = activeSection === section.id
          const Icon = section.icon
          return (
            <div key={section.id} className="flex items-center flex-1">
              <button
                onClick={() => handleSectionToggle(section.id)}
                className={`flex items-center gap-1.5 transition-colors
                  ${done ? 'text-green-600' : isActive ? 'text-charcoal' : 'text-stone/30'}`}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-colors flex-shrink-0
                  ${done ? 'bg-green-500 border-green-500' : isActive ? 'border-charcoal' : 'border-stone/20'}`}>
                  {done
                    ? <Check size={14} className="text-white" />
                    : <Icon size={12} />
                  }
                </div>
                <span className="text-[11px] font-medium hidden sm:inline">{section.label}</span>
              </button>
              {i < SECTIONS.length - 1 && (
                <div className={`flex-1 h-[2px] mx-2 rounded transition-colors
                  ${completedSections.has(section.id) ? 'bg-green-400' : 'bg-stone/10'}`} />
              )}
            </div>
          )
        })}
      </div>

      {/* Finished toast */}
      {finished && (
        <div className="mb-8 bg-green-50 border border-green-200 rounded-[8px] px-4 py-3 text-[13px] text-green-700 flex items-center gap-2">
          <Check size={16} />
          Review afgerond! Fijne week.
        </div>
      )}

      {/* Sections */}
      <div className="space-y-4">
        {SECTIONS.map(section => {
          const isOpen = activeSection === section.id
          const isDone = completedSections.has(section.id)
          const Icon = section.icon

          return (
            <div
              key={section.id}
              ref={el => { sectionRefs.current[section.id] = el }}
              className={`border rounded-[10px] overflow-hidden transition-colors
                ${isDone ? 'border-green-200 bg-green-50/30' : 'border-border bg-white'}`}
            >
              {/* Section header */}
              <button
                onClick={() => handleSectionToggle(section.id)}
                className="w-full flex items-center gap-3 px-5 py-4 text-left"
              >
                <div className="flex-shrink-0">
                  {isOpen
                    ? <ChevronDown size={14} className="text-stone/40" />
                    : <ChevronRight size={14} className="text-stone/30" />
                  }
                </div>
                <Icon size={16} className={isDone ? 'text-green-500' : 'text-stone/40'} />
                <span className={`text-[14px] font-medium flex-1 ${isDone ? 'text-green-700' : 'text-charcoal'}`}>
                  {section.label}
                </span>
                {isDone && (
                  <span className="text-[10px] text-green-500 font-medium flex-shrink-0">Klaar</span>
                )}
              </button>

              {/* Section content */}
              {isOpen && (
                <div className="px-5 pb-5 border-t border-border/30">
                  <div className="pt-4">
                    {section.id === 'inbox' && (
                      <InboxSection onStats={handleInboxStats} />
                    )}
                    {section.id === 'projects' && (
                      <ProjectsSection
                        onTaskCompleted={() => setStats(p => ({ ...p, tasksCompleted: p.tasksCompleted + 1 }))}
                        onTaskDeleted={() => setStats(p => ({ ...p, tasksDeleted: p.tasksDeleted + 1 }))}
                        onProjectMoved={() => setStats(p => ({ ...p, projectsMoved: p.projectsMoved + 1 }))}
                      />
                    )}
                    {section.id === 'recurring' && (
                      <RecurringSection
                        onDeactivated={() => setStats(p => ({ ...p, recurringDeactivated: p.recurringDeactivated + 1 }))}
                      />
                    )}
                    {section.id === 'summary' && (
                      <SummarySection stats={stats} onFinish={handleFinish} />
                    )}
                  </div>

                  {/* Mark done button (except summary — has its own finish) */}
                  {section.id !== 'summary' && !isDone && (
                    <button
                      onClick={() => markSectionDone(section.id)}
                      className="mt-4 flex items-center gap-1.5 text-[11px] text-stone/40 hover:text-green-600 transition-colors"
                    >
                      <Check size={12} />
                      Sectie afvinken
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

```bash
PATH=/usr/local/bin:$PATH npx tsc --noEmit
git add src/components/review/WeeklyReviewPage.tsx
git commit -m "feat: WeeklyReviewPage — orchestrator with progress bar and 4 sections"
```

---

### Task 8: Deploy and verify

```bash
PATH=/usr/local/bin:$PATH npx vercel --prod
```

Verify:
- Review tab visible in navigation
- Click → WeeklyReviewPage loads with progress bar and 4 sections
- Inbox: card-stack shows orphan tasks, actions work
- Projects: grouped by status, expand/collapse, task toggle, move project
- Recurring: list with edit/delete
- Summary: auto-stats, reflection field, finish button
