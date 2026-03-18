# Recurring Tasks Drawer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the "New recurring task" FAB add-only modal with a "Recurring tasks" right-side drawer that lists, edits, deletes, and adds recurring tasks.

**Architecture:** Create a new `RecurringTasksDrawer` component (modeled on `MeetingsDrawer`) that holds all recurring task management logic. Wire it into `App.tsx` replacing the old `AddRecurringTaskModal`. Update `SmartFab` label and prop name. Delete the two now-redundant files.

**Tech Stack:** React 19 + TypeScript, Zustand store, Tailwind CSS 4, Lucide icons, `RecurrenceFrequencyPicker` (existing shared component)

---

### Task 1: Create `RecurringTasksDrawer` component

**Files:**
- Create: `src/components/ui/RecurringTasksDrawer.tsx`

Drawer follows the exact same pattern as `MeetingsDrawer` — fixed right panel, `open` + `onClose` props, slide animation.

**Step 1: Create the file with full implementation**

```tsx
import { useState } from 'react'
import { X, Plus, RotateCcw, Pencil, Trash2 } from 'lucide-react'
import { useStore } from '../../store'
import type { Task } from '../../types'
import { describeRule, buildRule, getMostRecentOccurrenceDate } from '../../lib/recurrence'
import {
  RecurrenceFrequencyPicker,
  type RecurrenceFormState,
  EMPTY_RULE_STATE,
} from './RecurrenceFrequencyPicker'

interface RecurringTasksDrawerProps {
  open: boolean
  onClose: () => void
}

function isFormValid(title: string, form: RecurrenceFormState): boolean {
  if (!title.trim()) return false
  if (form.freq === 'custom' && form.customDays.length === 0) return false
  if (form.freq === 'annual_dates' && form.annualDates.length === 0) return false
  return true
}

function isMissed(task: Task): boolean {
  const mostRecent = task.recurrenceRule
    ? getMostRecentOccurrenceDate(task.recurrenceRule, new Date())
    : null
  return mostRecent !== null && (task.lastCompletedDate ?? '') < mostRecent
}

function useRecurringForm() {
  const [title, setTitle] = useState('')
  const [form, setForm] = useState<RecurrenceFormState>(EMPTY_RULE_STATE)
  const [projectId, setProjectId] = useState<string | undefined>(undefined)

  function patch(p: Partial<RecurrenceFormState>) {
    setForm(prev => ({ ...prev, ...p }))
  }

  function reset() {
    setTitle('')
    setForm(EMPTY_RULE_STATE)
    setProjectId(undefined)
  }

  return { title, setTitle, form, patch, projectId, setProjectId, reset }
}

export function RecurringTasksDrawer({ open, onClose }: RecurringTasksDrawerProps) {
  const recurringTasks = useStore(s => s.recurringTasks)
  const addRecurringTask = useStore(s => s.addRecurringTask)
  const updateRecurringTask = useStore(s => s.updateRecurringTask)
  const deleteRecurringTask = useStore(s => s.deleteRecurringTask)
  const projects = useStore(s => s.projects)

  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const addRec = useRecurringForm()
  const editRec = useRecurringForm()

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!isFormValid(addRec.title, addRec.form)) return
    addRecurringTask(addRec.title.trim(), buildRule(addRec.form), addRec.projectId)
    addRec.reset()
    setShowAddForm(false)
  }

  function startEdit(task: Task) {
    const rule = task.recurrenceRule!
    setEditingId(task.id)
    editRec.setTitle(task.title)
    editRec.setProjectId(task.projectId)
    editRec.patch({
      freq: rule.frequency,
      weeklyDay: rule.customDays?.[0] ?? 1,
      monthlyDate: rule.monthlyDate ?? 1,
      monthlyWeek: rule.monthlyWeekday?.week ?? 1,
      monthlyDay: rule.monthlyWeekday?.day ?? 1,
      customDays: rule.customDays ?? [],
      annualDates: rule.annualDates ?? [],
    })
  }

  function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!isFormValid(editRec.title, editRec.form) || !editingId) return
    updateRecurringTask(editingId, {
      title: editRec.title.trim(),
      recurrenceRule: buildRule(editRec.form),
      projectId: editRec.projectId,
    })
    setEditingId(null)
    editRec.reset()
  }

  function cancelEdit() {
    setEditingId(null)
    editRec.reset()
  }

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-charcoal/20"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-[380px] bg-canvas border-l border-border
          shadow-2xl z-50 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]
          flex flex-col
          ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
          <div className="flex items-center gap-2">
            <RotateCcw size={14} className="text-stone/50" />
            <span className="text-[13px] font-medium text-charcoal">Recurring tasks</span>
            {recurringTasks.length > 0 && (
              <span className="text-[11px] text-stone/40">{recurringTasks.length}</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-stone hover:text-charcoal transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Task list — scrollable */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {recurringTasks.length === 0 && !showAddForm && (
            <p className="text-[12px] text-stone/30 italic py-2">No recurring tasks yet</p>
          )}

          <div className="space-y-0.5">
            {recurringTasks.map(task => (
              <div key={task.id}>
                {editingId === task.id ? (
                  <form
                    onSubmit={handleSaveEdit}
                    className="p-3 rounded-[8px] bg-card border border-border/50 space-y-3 my-1"
                  >
                    <input
                      type="text"
                      value={editRec.title}
                      onChange={e => editRec.setTitle(e.target.value)}
                      autoFocus
                      className="w-full text-[13px] text-charcoal placeholder:text-stone/30
                        bg-transparent border-none outline-none"
                    />
                    <RecurrenceFrequencyPicker value={editRec.form} onChange={editRec.patch} />
                    {projects.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-stone/50">Project</span>
                        <select
                          value={editRec.projectId ?? ''}
                          onChange={e => editRec.setProjectId(e.target.value || undefined)}
                          className="flex-1 text-[11px] text-charcoal bg-transparent border border-border
                            rounded px-2 py-1 outline-none focus:border-stone/40 transition-colors"
                        >
                          <option value="">No project</option>
                          {projects.map(p => (
                            <option key={p.id} value={p.id}>{p.title}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div className="flex gap-2 items-center pt-1">
                      <button
                        type="submit"
                        disabled={!isFormValid(editRec.title, editRec.form)}
                        className="text-[11px] px-3 py-1.5 rounded-[4px] bg-charcoal text-canvas
                          disabled:opacity-40 transition-opacity"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="text-[11px] text-stone hover:text-charcoal transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-center gap-2 py-2 group">
                    {isMissed(task) ? (
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0"
                        title="Last occurrence not completed"
                      />
                    ) : (
                      <span className="w-1.5 h-1.5 flex-shrink-0" />
                    )}
                    <span className="text-[13px] text-charcoal flex-1 leading-tight">{task.title}</span>
                    {task.projectId && (
                      <span className="text-[10px] text-stone/30 truncate max-w-[80px]">
                        {projects.find(p => p.id === task.projectId)?.title}
                      </span>
                    )}
                    <span className="text-[10px] uppercase tracking-wider text-stone/40 flex-shrink-0">
                      {task.recurrenceRule ? describeRule(task.recurrenceRule) : ''}
                    </span>
                    <button
                      onClick={() => startEdit(task)}
                      className="opacity-0 group-hover:opacity-50 hover:!opacity-100 text-stone transition-all flex-shrink-0"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={() => deleteRecurringTask(task.id)}
                      className="opacity-0 group-hover:opacity-50 hover:!opacity-100 text-stone hover:text-red-500 transition-all flex-shrink-0"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Add form */}
          {showAddForm && (
            <form
              onSubmit={handleAdd}
              className="mt-3 p-3 rounded-[8px] bg-card border border-border/50 space-y-3"
            >
              <input
                type="text"
                value={addRec.title}
                onChange={e => addRec.setTitle(e.target.value)}
                placeholder="Task name"
                autoFocus
                className="w-full text-[13px] text-charcoal placeholder:text-stone/30
                  bg-transparent border-none outline-none"
              />
              <RecurrenceFrequencyPicker value={addRec.form} onChange={addRec.patch} />
              {projects.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-stone/50">Project</span>
                  <select
                    value={addRec.projectId ?? ''}
                    onChange={e => addRec.setProjectId(e.target.value || undefined)}
                    className="flex-1 text-[11px] text-charcoal bg-transparent border border-border
                      rounded px-2 py-1 outline-none focus:border-stone/40 transition-colors"
                  >
                    <option value="">No project</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex gap-2 items-center pt-1">
                <button
                  type="submit"
                  disabled={!isFormValid(addRec.title, addRec.form)}
                  className="text-[11px] px-3 py-1.5 rounded-[4px] bg-charcoal text-canvas
                    disabled:opacity-40 transition-opacity"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAddForm(false); addRec.reset() }}
                  className="text-[11px] text-stone hover:text-charcoal transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer — add button */}
        {!showAddForm && (
          <div className="px-5 py-4 border-t border-border/60">
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 text-[12px] text-stone/50 hover:text-charcoal transition-colors"
            >
              <Plus size={14} />
              Add recurring task
            </button>
          </div>
        )}
      </div>
    </>
  )
}
```

**Step 2: Verify the file compiles (no manual test needed, just check no red squiggles / TS errors)**

```bash
cd "/Users/beer/Vandaag App" && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors related to `RecurringTasksDrawer`.

**Step 3: Commit**

```bash
cd "/Users/beer/Vandaag App"
git add src/components/ui/RecurringTasksDrawer.tsx
git commit -m "feat: add RecurringTasksDrawer component"
```

---

### Task 2: Wire `RecurringTasksDrawer` into `App.tsx` and update `SmartFab`

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/ui/SmartFab.tsx`

**Step 1: Update `App.tsx`**

In `src/App.tsx`:

1. Replace the import:
   ```tsx
   // Remove:
   import { AddRecurringTaskModal } from './components/kanban/AddRecurringTaskModal'
   // Add:
   import { RecurringTasksDrawer } from './components/ui/RecurringTasksDrawer'
   ```

2. Replace the state variable (line ~49):
   ```tsx
   // Remove:
   const [showAddRecurringModal, setShowAddRecurringModal] = useState(false)
   // Add:
   const [showRecurringDrawer, setShowRecurringDrawer] = useState(false)
   ```

3. Update the FAB prop (line ~167):
   ```tsx
   // Remove:
   onAddRecurringTask={() => setShowAddRecurringModal(true)}
   // Add:
   onOpenRecurringTasks={() => setShowRecurringDrawer(true)}
   ```

4. Replace the modal render (lines ~175-177):
   ```tsx
   // Remove:
   {showAddRecurringModal && (
     <AddRecurringTaskModal onClose={() => setShowAddRecurringModal(false)} />
   )}
   // Add:
   <RecurringTasksDrawer open={showRecurringDrawer} onClose={() => setShowRecurringDrawer(false)} />
   ```

**Step 2: Update `SmartFab`**

In `src/components/ui/SmartFab.tsx`:

1. Replace the prop in the interface:
   ```tsx
   // Remove:
   onAddRecurringTask: () => void
   // Add:
   onOpenRecurringTasks: () => void
   ```

2. Replace in the destructured props:
   ```tsx
   // Remove:
   onAddRecurringTask,
   // Add:
   onOpenRecurringTasks,
   ```

3. Replace in the actions array:
   ```tsx
   // Remove:
   { icon: <RotateCcw size={14} />, label: 'New recurring task', action: onAddRecurringTask },
   // Add:
   { icon: <RotateCcw size={14} />, label: 'Recurring tasks', action: onOpenRecurringTasks },
   ```

**Step 3: Verify TypeScript**

```bash
cd "/Users/beer/Vandaag App" && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

**Step 4: Commit**

```bash
cd "/Users/beer/Vandaag App"
git add src/App.tsx src/components/ui/SmartFab.tsx
git commit -m "feat: wire RecurringTasksDrawer into App, update FAB label"
```

---

### Task 3: Delete redundant files

**Files:**
- Delete: `src/components/kanban/AddRecurringTaskModal.tsx`
- Delete: `src/components/vandaag/RecurringTemplates.tsx`

**Step 1: Confirm nothing else imports them**

```bash
cd "/Users/beer/Vandaag App" && grep -r "AddRecurringTaskModal\|RecurringTemplates" src/
```

Expected: no results (both should be unused after Task 2).

**Step 2: Delete the files**

```bash
cd "/Users/beer/Vandaag App"
rm src/components/kanban/AddRecurringTaskModal.tsx
rm src/components/vandaag/RecurringTemplates.tsx
```

**Step 3: Final TypeScript check**

```bash
cd "/Users/beer/Vandaag App" && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

**Step 4: Commit**

```bash
cd "/Users/beer/Vandaag App"
git add -A
git commit -m "chore: remove AddRecurringTaskModal and RecurringTemplates (replaced by drawer)"
```
