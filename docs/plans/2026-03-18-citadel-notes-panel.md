# Citadel Notes Panel Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a togglable bottom-sheet notes panel to CitadelMode that reads/writes the project's `bodyContent` using the same BlockNote editor as the Project Modal.

**Architecture:** Pass `projectId?` through the CitadelContext chain (VandaagView → App.tsx → CitadelMode). CitadelMode reads the project from the store and renders a `ProjectEditor` (dark theme) in a fixed bottom sheet triggered by a Notes button.

**Tech Stack:** React, Zustand, BlockNote (`@blocknote/react` + `@blocknote/mantine`), Tailwind CSS 4

---

### Task 1: Add `theme` prop to `ProjectEditor`

**Files:**
- Modify: `src/components/editor/ProjectEditor.tsx`

**Step 1: Add the optional theme prop**

In `ProjectEditorProps`, add:
```ts
theme?: 'light' | 'dark'
```

In the component signature:
```ts
export function ProjectEditor({ initialContent, onChange, onCheckboxChange, theme = 'light' }: ProjectEditorProps)
```

Pass it to `BlockNoteView`:
```tsx
<BlockNoteView editor={editor} theme={theme} />
```

**Step 2: Build to verify**
```bash
cd "/Users/beer/Vandaag App" && npm run build 2>&1 | tail -5
```
Expected: `✓ built in ...`

**Step 3: Commit**
```bash
git add src/components/editor/ProjectEditor.tsx
git commit -m "feat: add optional theme prop to ProjectEditor"
```

---

### Task 2: Add `projectId?` to CitadelContext types

**Files:**
- Modify: `src/App.tsx` (lines 23–25)
- Modify: `src/components/vandaag/VandaagView.tsx` (lines 11–16)

**Step 1: Update App.tsx CitadelContext**

Change:
```ts
type CitadelContext =
  | { active: false }
  | { active: true; tier: PlanTier; taskId: string; taskTitle: string; projectTitle?: string; intention?: string }
```
To:
```ts
type CitadelContext =
  | { active: false }
  | { active: true; tier: PlanTier; taskId: string; taskTitle: string; projectTitle?: string; intention?: string; projectId?: string }
```

**Step 2: Update VandaagView CitadelContext**

Change:
```ts
interface CitadelContext {
  tier: PlanTier
  taskId: string
  taskTitle: string
  projectTitle?: string
}
```
To:
```ts
interface CitadelContext {
  tier: PlanTier
  taskId: string
  taskTitle: string
  projectTitle?: string
  projectId?: string
}
```

**Step 3: Build**
```bash
cd "/Users/beer/Vandaag App" && npm run build 2>&1 | tail -5
```
Expected: `✓ built in ...`

**Step 4: Commit**
```bash
git add src/App.tsx src/components/vandaag/VandaagView.tsx
git commit -m "feat: add projectId to CitadelContext type"
```

---

### Task 3: Pass `projectId` when launching CitadelMode

**Files:**
- Modify: `src/App.tsx` (the `onEnterCitadel` handler, lines 194–209)
- Modify: `src/components/vandaag/ShortTasks.tsx` (wherever it calls `onEnterCitadel`)
- Modify: `src/components/vandaag/MaintenanceTier.tsx` (wherever it calls `onEnterCitadel`)

**Step 1: Update deep block path in App.tsx**

In the `onEnterCitadel` callback (around line 194), the `ctx` branch just spreads ctx as-is (so projectId passes through if callers provide it). The `else` branch (deep block) already has `projectId`:

```ts
if (ctx) {
  setCitadelCtx({ active: true, ...ctx })
} else {
  const projectId = dailyPlan?.deepBlock.projectId ?? ''
  const project = projects.find(p => p.id === projectId)
  setCitadelCtx({
    active: true,
    tier: 'deep',
    taskId: projectId,
    taskTitle: project?.title ?? 'Deep Work',
    projectTitle: project?.title,
    intention: dailyPlan?.deepBlock.intention,
    projectId,   // ← add this
  })
}
```

**Step 2: Find where ShortTasks calls onEnterCitadel**
```bash
grep -n "onEnterCitadel" "/Users/beer/Vandaag App/src/components/vandaag/ShortTasks.tsx"
```

In ShortTasks, tasks are plan items. Each plan item has a `taskId`. To get its project, look up the task using `findTaskById(taskId, projects, orphanTasks, recurringTasks)` — it returns `{ task, projectTitle? }`. But we need the project *id*, not just the title.

Look up in ShortTasks:
```ts
import { findTaskById } from '../../lib/taskLookup'
// ...
const projects = useStore(s => s.projects)
const orphanTasks = useStore(s => s.orphanTasks)
const recurringTasks = useStore(s => s.recurringTasks)
```

When building the citadel context for a short task, find which project contains the task:
```ts
// Find which project owns this task
const ownerProject = projects.find(p => p.tasks.some(t => t.id === item.taskId))
```

Then pass `projectId: ownerProject?.id` in the context object.

Check the exact shape of the context object ShortTasks passes to `onEnterCitadel` and add `projectId` to it.

**Step 3: Same for MaintenanceTier**
```bash
grep -n "onEnterCitadel" "/Users/beer/Vandaag App/src/components/vandaag/MaintenanceTier.tsx"
```

Same pattern — find owning project and pass `projectId`.

**Step 4: Build**
```bash
cd "/Users/beer/Vandaag App" && npm run build 2>&1 | tail -5
```
Expected: `✓ built in ...`

**Step 5: Commit**
```bash
git add src/App.tsx src/components/vandaag/ShortTasks.tsx src/components/vandaag/MaintenanceTier.tsx
git commit -m "feat: pass projectId through CitadelContext launch paths"
```

---

### Task 4: Add notes bottom sheet to CitadelMode

**Files:**
- Modify: `src/components/vandaag/CitadelMode.tsx`

**Step 1: Add imports and new props**

Add to imports:
```ts
import { NotebookPen } from 'lucide-react'
import { ProjectEditor } from '../editor/ProjectEditor'
import { useStore } from '../../store'
import type { Project } from '../../types'
```

Add `projectId?` to `CitadelModeProps`:
```ts
interface CitadelModeProps {
  tier: PlanTier
  taskId: string
  taskTitle: string
  projectTitle?: string
  intention?: string
  projectId?: string   // ← add
  onExit: () => void
}
```

**Step 2: Add store access and notes state**

Inside the component, after existing store calls:
```ts
const projects = useStore(s => s.projects)
const updateProject = useStore(s => s.updateProject)

const project: Project | undefined = projectId
  ? projects.find(p => p.id === projectId)
  : undefined

const [notesOpen, setNotesOpen] = useState(false)
```

**Step 3: Add Notes toggle button**

The scratchpad section currently ends at `</div>` (around line 195). Replace the scratchpad wrapper so the Notes button sits to the right of the thought-capture input:

```tsx
{/* Scratchpad + Notes toggle row — deep and short tiers only */}
{showScratchpad && (
  <div className="w-full max-w-[500px] px-6">
    <div className="flex items-center gap-3">
      <form onSubmit={handleCapture} className="relative flex-1">
        <input
          ref={inputRef}
          type="text"
          value={thought}
          onChange={e => setThought(e.target.value)}
          placeholder="Intrusive thought? Capture it here..."
          className="w-full bg-citadel-text/5 border border-citadel-text/10
            rounded-[8px] px-4 py-3 text-[13px] text-citadel-text/70
            placeholder:text-citadel-text/20 outline-none
            focus:border-citadel-accent/30 transition-colors"
        />
      </form>

      {project && (
        <button
          onClick={() => setNotesOpen(o => !o)}
          className={`flex items-center gap-1.5 px-3 py-3 rounded-[8px] transition-all
            border text-[12px]
            ${notesOpen
              ? 'border-citadel-text/20 bg-citadel-text/10 text-citadel-text/70'
              : 'border-citadel-text/10 bg-transparent text-citadel-text/30 hover:text-citadel-text/60 hover:border-citadel-text/20'
            }`}
        >
          <NotebookPen size={14} />
          <span>Notes</span>
        </button>
      )}
    </div>

    {captured.length > 0 && (
      <div className="mt-3 space-y-1">
        {captured.slice(-3).map((t, i) => (
          <div key={i} className="text-[11px] text-citadel-text/20 flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-citadel-accent/30" />
            {t}
            <span className="text-citadel-accent/30 ml-auto">captured</span>
          </div>
        ))}
      </div>
    )}
  </div>
)}
```

**Step 4: Add the bottom sheet**

Just before the closing `</div>` of the main `fixed inset-0` wrapper, add:

```tsx
{/* Notes bottom sheet */}
{project && (
  <div
    className={`fixed bottom-0 left-0 right-0 z-10 bg-[#1C1A17] border-t border-citadel-text/10
      transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]
      ${notesOpen ? 'translate-y-0' : 'translate-y-full'}`}
    style={{ height: '55vh' }}
  >
    {/* Sheet header */}
    <div className="flex items-center justify-between px-6 py-3 border-b border-citadel-text/10">
      <span className="text-[11px] uppercase tracking-[0.08em] text-citadel-text/40 font-medium">
        Project Notes
      </span>
      <button
        onClick={() => setNotesOpen(false)}
        className="text-citadel-text/30 hover:text-citadel-text/60 transition-colors p-1"
      >
        <X size={16} />
      </button>
    </div>

    {/* Editor — only mount when open to avoid unnecessary BlockNote instances */}
    <div className="h-[calc(55vh-44px)] overflow-y-auto">
      {notesOpen && (
        <ProjectEditor
          key={project.id}
          initialContent={project.bodyContent}
          onChange={content => updateProject(project.id, { bodyContent: content })}
          theme="dark"
        />
      )}
    </div>
  </div>
)}
```

**Step 5: Pass projectId from App.tsx to CitadelMode**

In `src/App.tsx`, add `projectId` prop to the `<CitadelMode>` render:
```tsx
<CitadelMode
  tier={citadelCtx.tier}
  taskId={citadelCtx.taskId}
  taskTitle={citadelCtx.taskTitle}
  projectTitle={citadelCtx.projectTitle}
  intention={citadelCtx.intention}
  projectId={citadelCtx.projectId}   // ← add
  onExit={() => setCitadelCtx({ active: false })}
/>
```

**Step 6: Build**
```bash
cd "/Users/beer/Vandaag App" && npm run build 2>&1 | tail -5
```
Expected: `✓ built in ...`

**Step 7: Commit**
```bash
git add src/components/vandaag/CitadelMode.tsx src/App.tsx
git commit -m "feat: add togglable project notes bottom sheet to CitadelMode"
```

---

### Task 5: Verify in preview

**Step 1: Check for errors**
Open the preview, enter CitadelMode from a deep block or a task that belongs to a project.

**Step 2: Verify notes button appears**
A "Notes" button should appear to the right of the scratchpad input — only when a project is linked.

**Step 3: Toggle the panel**
Click Notes → bottom sheet slides up with dark BlockNote editor.
Type something → close the project modal and reopen the project → notes should match.

**Step 4: No project = no button**
Enter CitadelMode from an orphan/standalone task → Notes button should NOT appear.
