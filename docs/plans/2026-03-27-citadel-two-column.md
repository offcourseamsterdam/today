# Citadel Mode Two-Column Layout Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Split CitadelMode into two columns — timer/scratchpad on the left, project task list (reorderable + checkable) on the right.

**Architecture:** Restructure the CitadelMode layout from a centred single-column to a full-width two-column flex row. Extract a lightweight `CitadelTaskPanel` component that reuses the existing `reorderProjectTasks` store action, `useTaskToggle` hook, and dnd-kit sortable pattern already present in `ProjectModalTasks.tsx`. Right column is empty when no project is linked to the session.

**Tech Stack:** React 19, TypeScript strict, dnd-kit (core + sortable), Zustand store, Tailwind CSS 4

---

### Task 1: Restructure CitadelMode layout to two columns

**Files:**
- Modify: `src/components/vandaag/CitadelMode.tsx`

**Step 1: Replace outer centred flex with a two-column layout**

Current outer wrapper:
```tsx
<div className="fixed inset-0 z-50 bg-citadel-bg flex flex-col items-center justify-center animate-fade-in">
```

Replace with:
```tsx
<div className="fixed inset-0 z-50 bg-citadel-bg flex animate-fade-in">
```

**Step 2: Wrap existing content (heading + timer + controls + scratchpad) in a left column div**

Wrap from the heading div down to the scratchpad section (and the notes bottom sheet) inside:
```tsx
{/* Left column — timer */}
<div className="flex-1 flex flex-col items-center justify-center relative px-6">
  {/* ...existing heading, timer circle, controls, scratchpad... */}
</div>
```

The "Return to Vandaag" button (absolute top-left) and "Session counter" (absolute top-right) stay **outside** the columns (direct children of the root div, positioned absolute — no change needed).

**Step 3: Add right column placeholder after left column**

```tsx
{/* Right column — project tasks (only when project is linked) */}
<div className="w-[340px] flex-shrink-0 border-l border-citadel-text/10 flex flex-col">
  {/* CitadelTaskPanel will go here in Task 2 */}
</div>
```

**Step 4: Verify layout renders — timer centred in left half, empty right panel visible**

Run dev server (`npm run dev`) and open CitadelMode. Confirm two-column layout.

**Step 5: Commit**
```bash
git add src/components/vandaag/CitadelMode.tsx
git commit -m "feat: citadel mode two-column shell layout"
```

---

### Task 2: Build CitadelTaskPanel component

**Files:**
- Create: `src/components/vandaag/CitadelTaskPanel.tsx`

This component gets the project's tasks, renders them sortable, and allows checking off.

**Step 1: Create the file with imports**

```tsx
// src/components/vandaag/CitadelTaskPanel.tsx
import { useMemo } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { useStore } from '../../store'
import { useTaskToggle } from '../../hooks/useTaskToggle'
import type { Project, Task } from '../../types'
```

**Step 2: Build the sortable task row**

```tsx
function CitadelTaskRow({ task, onToggle }: { task: Task; onToggle: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const isDone = task.status === 'done'

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 py-2.5 px-4 rounded-[8px] transition-all
        ${isDragging ? 'opacity-40' : ''}
        ${!isDragging ? 'hover:bg-citadel-text/5' : ''}`}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="text-citadel-text/15 hover:text-citadel-text/40 cursor-grab active:cursor-grabbing flex-shrink-0"
        tabIndex={-1}
      >
        <GripVertical size={13} />
      </button>

      {/* Checkbox */}
      <button
        onClick={() => onToggle(task.id)}
        className={`w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center transition-all
          ${isDone
            ? 'bg-citadel-accent/50 border-citadel-accent/50'
            : 'border-citadel-text/20 hover:border-citadel-text/40'}`}
      >
        {isDone && (
          <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
            <path d="M1 3L3 5L7 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-citadel-bg" />
          </svg>
        )}
      </button>

      {/* Title */}
      <span className={`text-[13px] flex-1 min-w-0 leading-snug transition-all
        ${isDone ? 'line-through text-citadel-text/25' : 'text-citadel-text/70'}`}>
        {task.title}
      </span>
    </div>
  )
}
```

**Step 3: Build the main panel**

```tsx
export function CitadelTaskPanel({ project }: { project: Project }) {
  const reorderProjectTasks = useStore(s => s.reorderProjectTasks)
  const toggleTask = useTaskToggle()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  // Active tasks first, done tasks at end
  const activeTasks = useMemo(() => project.tasks.filter(t => t.status !== 'done'), [project.tasks])
  const doneTasks = useMemo(() => project.tasks.filter(t => t.status === 'done'), [project.tasks])
  const allOrdered = useMemo(() => [...activeTasks, ...doneTasks], [activeTasks, doneTasks])
  const activeIds = activeTasks.map(t => t.id)

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = activeIds.indexOf(active.id as string)
    const newIndex = activeIds.indexOf(over.id as string)
    if (oldIndex === -1 || newIndex === -1) return
    const reordered = arrayMove(activeTasks, oldIndex, newIndex)
    reorderProjectTasks(project.id, [...reordered.map(t => t.id), ...doneTasks.map(t => t.id)])
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-5 border-b border-citadel-text/10">
        <p className="text-[10px] uppercase tracking-[0.1em] text-citadel-text/25 font-medium mb-1">
          Project tasks
        </p>
        <h3 className="text-[15px] font-serif text-citadel-text/60 leading-tight truncate">
          {project.title}
        </h3>
        {project.tasks.length > 0 && (
          <p className="text-[10px] text-citadel-text/25 mt-1">
            {doneTasks.length} / {project.tasks.length} done
          </p>
        )}
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto py-2">
        {project.tasks.length === 0 ? (
          <p className="text-[12px] text-citadel-text/20 italic px-5 py-4">
            No tasks in this project
          </p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={activeIds} strategy={verticalListSortingStrategy}>
              {activeTasks.map(task => (
                <CitadelTaskRow key={task.id} task={task} onToggle={toggleTask} />
              ))}
            </SortableContext>
          </DndContext>
        )}

        {/* Done tasks — not sortable, shown below */}
        {doneTasks.length > 0 && (
          <div className="mt-1">
            {doneTasks.map(task => (
              <CitadelTaskRow key={task.id} task={task} onToggle={toggleTask} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

**Step 4: Commit**
```bash
git add src/components/vandaag/CitadelTaskPanel.tsx
git commit -m "feat: CitadelTaskPanel — sortable checkable project tasks for focus mode"
```

---

### Task 3: Wire CitadelTaskPanel into CitadelMode right column

**Files:**
- Modify: `src/components/vandaag/CitadelMode.tsx`

**Step 1: Import CitadelTaskPanel**

Add to imports at top of `CitadelMode.tsx`:
```tsx
import { CitadelTaskPanel } from './CitadelTaskPanel'
```

**Step 2: Replace the right column placeholder with the panel**

Replace the `{/* CitadelTaskPanel will go here */}` comment with:
```tsx
<div className="w-[340px] flex-shrink-0 border-l border-citadel-text/10 flex flex-col">
  {project ? (
    <CitadelTaskPanel project={project} />
  ) : (
    // No project linked — right column stays empty (intentional)
    null
  )}
</div>
```

The `project` variable is already derived at the top of `CitadelMode` from `projectId`:
```tsx
const project: Project | undefined = projectId
  ? projects.find(p => p.id === projectId)
  : undefined
```

**Step 3: Live-subscribe to the project for real-time task updates**

Currently `project` is derived from `projects` (Zustand state), so it already re-renders when tasks change — no extra subscription needed.

**Step 4: Verify in browser**
- Open CitadelMode with a project-linked deep focus session → right column shows project tasks, drag to reorder works, checkbox toggles work
- Open CitadelMode for a short task (no project) → right column is absent/empty, layout still centred

**Step 5: Commit**
```bash
git add src/components/vandaag/CitadelMode.tsx
git commit -m "feat: wire CitadelTaskPanel into focus mode right column"
```

---

### Task 4: Deploy

```bash
npx vercel --prod
```
