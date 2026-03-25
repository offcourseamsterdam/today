# Project Modal Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restructure the ProjectModal from a long vertical scroll into a tabbed interface (Tasks / Notes / Meetings) with a compact fixed header, gear-icon settings panel, and wider container (max-w-4xl).

**Architecture:** The modal splits into a fixed header (cover + title + tab bar) and a scrollable tab content area. A collapsible gear panel slides between header and content. Each tab renders existing sub-components in new layout. A shared `CollapsibleSection` component handles open/closed state consistently.

**Tech Stack:** React 19, Tailwind CSS 4, existing dnd-kit + BlockNote, Lucide icons

---

### Task 1: Create CollapsibleSection utility component

**Files:**
- Create: `src/components/ui/CollapsibleSection.tsx`

**Step 1: Create the component**

```tsx
// src/components/ui/CollapsibleSection.tsx
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface CollapsibleSectionProps {
  title: string
  icon?: React.ReactNode
  badge?: string | number
  defaultOpen?: boolean
  children: React.ReactNode
}

export function CollapsibleSection({ title, icon, badge, defaultOpen = false, children }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full py-2 text-left group"
      >
        {icon}
        <span className="text-[11px] uppercase tracking-[0.08em] text-stone font-medium">
          {title}
        </span>
        {badge !== undefined && (
          <span className="text-[10px] text-stone/50 bg-[#F0EEEB] rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
            {badge}
          </span>
        )}
        <ChevronDown
          size={13}
          className={`ml-auto text-stone/40 transition-transform duration-200
            ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <div className={`overflow-hidden transition-all duration-200 ease-out
        ${open ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
        {children}
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/ui/CollapsibleSection.tsx
git commit -m "feat: add CollapsibleSection utility component"
```

---

### Task 2: Create ProjectModalSettings component

**Files:**
- Create: `src/components/kanban/ProjectModalSettings.tsx`

**Step 1: Create the component**

Extract lines 144–250 from current `ProjectModal.tsx` (category selector, context selector, toggles) into a standalone settings panel.

```tsx
// src/components/kanban/ProjectModalSettings.tsx
import { useState } from 'react'
import { CATEGORY_CONFIG, type Category, type Project } from '../../types'
import { useStore } from '../../store'
import { ToggleSwitch } from '../ui/ToggleSwitch'

interface ProjectModalSettingsProps {
  project: Project
  onClose: () => void  // close the project modal (for "complete project" action)
}

const categories = Object.entries(CATEGORY_CONFIG) as [Category, typeof CATEGORY_CONFIG[Category]][]
const EMPTY_CONTEXTS: never[] = []

export function ProjectModalSettings({ project, onClose }: ProjectModalSettingsProps) {
  const updateProject = useStore(s => s.updateProject)
  const deleteProject = useStore(s => s.deleteProject)
  const contexts = useStore(s => s.settings.contexts) ?? EMPTY_CONTEXTS
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  function handleDelete() {
    deleteProject(project.id)
    onClose()
  }

  return (
    <div className="px-7 py-4 border-b border-border bg-[#FAF9F7] animate-[slide-down_150ms_ease-out]">
      {/* Category selector */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {categories.map(([key, config]) => (
          <button
            key={key}
            onClick={() => updateProject(project.id, { category: key })}
            className={`text-[10px] px-2.5 py-1 rounded-full border transition-all duration-150
              ${project.category === key
                ? 'border-transparent font-medium'
                : 'border-border bg-card text-stone hover:border-stone/30'}`}
            style={project.category === key
              ? { background: config.bg, color: config.color }
              : undefined}
          >
            {config.label}
          </button>
        ))}
      </div>

      {/* Context selector */}
      {contexts.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {contexts.map(ctx => {
            const isActive = project.contextIds?.includes(ctx.id) ?? false
            return (
              <button
                key={ctx.id}
                onClick={() => {
                  const current = project.contextIds ?? []
                  const updated = isActive
                    ? current.filter(id => id !== ctx.id)
                    : [...current, ctx.id]
                  updateProject(project.id, { contextIds: updated.length > 0 ? updated : undefined })
                }}
                className={`text-[10px] px-2.5 py-1 rounded-full border transition-all duration-150
                  ${isActive
                    ? 'bg-charcoal text-canvas border-transparent font-medium'
                    : 'border-border bg-card text-stone hover:border-stone/30'}`}
              >
                {ctx.name}
              </button>
            )
          })}
        </div>
      )}

      {/* Toggles — 2 column grid */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-2">
        <div className="flex items-center justify-between py-2">
          <span className="text-[12px] text-charcoal">Track progress</span>
          <ToggleSwitch
            active={!!project.trackProgress}
            onChange={() => updateProject(project.id, { trackProgress: !project.trackProgress })}
          />
        </div>
        <div className="flex items-center justify-between py-2">
          <span className="text-[12px] text-charcoal">Mission critical</span>
          <ToggleSwitch
            active={!!project.missionCritical}
            onChange={() => updateProject(project.id, { missionCritical: !project.missionCritical })}
            activeColor="bg-red"
          />
        </div>
        <div className="flex items-center justify-between py-2">
          <span className="text-[12px] text-charcoal">Complete project</span>
          <ToggleSwitch
            active={project.status === 'done'}
            onChange={() => {
              if (project.status === 'done') {
                updateProject(project.id, { status: 'in_progress' })
              } else {
                updateProject(project.id, { status: 'done' })
                onClose()
              }
            }}
          />
        </div>
      </div>

      {/* Delete */}
      <div className="mt-3 pt-3 border-t border-border">
        {showDeleteConfirm ? (
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-red">Delete this project and all its tasks?</span>
            <button onClick={handleDelete}
              className="text-[11px] text-card bg-red px-2.5 py-1 rounded-[6px] hover:opacity-90">
              Delete
            </button>
            <button onClick={() => setShowDeleteConfirm(false)}
              className="text-[11px] text-stone hover:text-charcoal">
              Cancel
            </button>
          </div>
        ) : (
          <button onClick={() => setShowDeleteConfirm(true)}
            className="text-[11px] text-stone hover:text-red transition-colors">
            Delete project...
          </button>
        )}
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/kanban/ProjectModalSettings.tsx
git commit -m "feat: extract ProjectModalSettings component"
```

---

### Task 3: Update ProjectModalCover — reduce height, add gear icon

**Files:**
- Modify: `src/components/kanban/ProjectModalCover.tsx`

**Step 1: Changes to make**

1. Change image container height: `h-52` → `h-32`
2. Change no-image container height: `h-36` → `h-24`
3. Add `onGearClick` prop and render gear icon button next to the X close button
4. Add `showGear` prop (boolean) to show active state on gear icon

Props become:
```tsx
interface ProjectModalCoverProps {
  project: Project
  categoryConfig: { color: string; bg: string }
  onClose: () => void
  updateProject: (id: string, updates: Partial<Project>) => void
  onGearClick?: () => void
  gearOpen?: boolean
}
```

Gear button rendered next to X:
```tsx
{onGearClick && (
  <button
    onClick={(e) => { e.stopPropagation(); onGearClick() }}
    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all
      ${gearOpen
        ? 'bg-white/90 text-charcoal'
        : 'bg-charcoal/30 backdrop-blur-sm text-white hover:bg-charcoal/50'}`}
  >
    <Settings size={15} />
  </button>
)}
```

**Step 2: Commit**

```bash
git add src/components/kanban/ProjectModalCover.tsx
git commit -m "feat: reduce cover height, add gear icon to ProjectModalCover"
```

---

### Task 4: Rewrite ProjectModal — tabbed layout with fixed header

**Files:**
- Modify: `src/components/kanban/ProjectModal.tsx`

**Step 1: Full rewrite of ProjectModal**

Key structural changes:

```tsx
export function ProjectModal({ project, onClose }: ProjectModalProps) {
  // ... existing store hooks ...
  const [activeTab, setActiveTab] = useState<'tasks' | 'notes' | 'meetings'>('tasks')
  const [showSettings, setShowSettings] = useState(false)

  // ... existing title editing, editor delay logic ...

  // Count linked meetings for badge
  const linkedMeetings = useStore(s => [...s.meetings, ...s.recurringMeetings])
    .filter(m => m.projectId === project?.id)
  const meetingCount = linkedMeetings.length

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-charcoal/40 backdrop-blur-sm" />
      <div
        className="relative bg-card w-full rounded-t-[16px] sm:rounded-[10px] sm:max-w-4xl max-h-[92vh] flex flex-col animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        {/* ─── Fixed Header ─── */}
        <div className="flex-shrink-0">
          <ProjectModalCover
            project={project}
            categoryConfig={categoryConfig}
            onClose={onClose}
            updateProject={updateProject}
            onGearClick={() => setShowSettings(!showSettings)}
            gearOpen={showSettings}
          />

          <div className="px-7 pt-4 pb-0">
            {/* Title (editable) */}
            {/* Meta row: category badge + days worked */}
            {/* Tab bar */}
            <div className="flex gap-6 mt-4 border-b border-border -mx-7 px-7">
              {(['tasks', 'notes', 'meetings'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-2.5 text-[13px] capitalize transition-all border-b-2 -mb-px
                    ${activeTab === tab
                      ? 'font-medium text-charcoal'
                      : 'text-stone border-transparent hover:text-charcoal/70'}`}
                  style={activeTab === tab
                    ? { borderBottomColor: categoryConfig.color }
                    : undefined}
                >
                  {tab}
                  {tab === 'meetings' && meetingCount > 0 && (
                    <span className="ml-1.5 text-[10px] bg-[#F0EEEB] rounded-full px-1.5 py-0.5">
                      {meetingCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ─── Settings Panel (collapsible) ─── */}
        {showSettings && (
          <ProjectModalSettings project={project} onClose={onClose} />
        )}

        {/* ─── Scrollable Tab Content ─── */}
        <div className="flex-1 overflow-y-auto px-7 py-5">
          {activeTab === 'tasks' && (
            <>
              <ProjectModalWaiting project={project} updateProject={updateProject} />
              <ProjectModalTasks project={project} />
              <ProjectModalRecurring project={project} />
            </>
          )}
          {activeTab === 'notes' && (
            <div className="min-h-[400px] -mx-3">
              {showEditor && (
                <ProjectEditor
                  key={project.id}
                  initialContent={project.bodyContent}
                  onChange={handleEditorChange}
                  onCheckboxChange={handleCheckboxChange}
                />
              )}
            </div>
          )}
          {activeTab === 'meetings' && (
            <ProjectModalMeetings projectId={project.id} />
          )}
        </div>
      </div>
    </div>
  )
}
```

The key change: `overflow-y-auto` moves from the outer container to the tab content div. The header is `flex-shrink-0` so it stays fixed.

Container changes from `sm:max-w-2xl` → `sm:max-w-4xl`.

**Step 2: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors

**Step 3: Commit**

```bash
git add src/components/kanban/ProjectModal.tsx
git commit -m "feat: rewrite ProjectModal with tabbed layout and fixed header"
```

---

### Task 5: Make ProjectModalWaiting collapsible

**Files:**
- Modify: `src/components/kanban/ProjectModalWaiting.tsx`

**Step 1: Wrap content in CollapsibleSection**

Import `CollapsibleSection` and wrap the waiting-on content. The section should `defaultOpen` when `project.waitingOn?.length > 0`.

The component already conditionally renders based on project status — keep that logic. Just wrap the visible content in `CollapsibleSection` with title "Waiting On" and badge count.

**Step 2: Commit**

```bash
git add src/components/kanban/ProjectModalWaiting.tsx
git commit -m "feat: make ProjectModalWaiting collapsible"
```

---

### Task 6: Make ProjectModalRecurring collapsible

**Files:**
- Modify: `src/components/kanban/ProjectModalRecurring.tsx`

**Step 1: Wrap in CollapsibleSection**

Replace the existing header rendering with `CollapsibleSection`. `defaultOpen` when the project has recurring tasks linked to it.

Check recurring tasks linked to this project:
```tsx
const linkedRecurring = recurringTasks.filter(t => t.projectId === project.id)
```

**Step 2: Commit**

```bash
git add src/components/kanban/ProjectModalRecurring.tsx
git commit -m "feat: make ProjectModalRecurring collapsible"
```

---

### Task 7: Add slide-down keyframe animation

**Files:**
- Modify: `src/index.css` (or wherever Tailwind keyframes are defined)

**Step 1: Add the animation**

Check if `slide-down` keyframe already exists. If not, add:

```css
@keyframes slide-down {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}
```

This is used by the settings panel (`animate-[slide-down_150ms_ease-out]`).

**Step 2: Commit**

```bash
git add src/index.css
git commit -m "feat: add slide-down keyframe animation"
```

---

### Task 8: Verify end-to-end

**Step 1: Start dev server and verify**

```bash
npm run dev
```

Check:
1. Open a project modal → tabs visible (Tasks / Notes / Meetings)
2. Modal is wider (4xl)
3. Cover is shorter (h-32)
4. Click gear icon → settings panel slides down
5. Tasks tab: waiting on (collapsible) + tasks (dnd + inline edit) + recurring (collapsible)
6. Notes tab: full-height editor
7. Meetings tab: existing meetings content
8. Tab active underline uses category color
9. Meetings badge shows count when meetings linked
10. Mobile: still works as bottom sheet

**Step 2: Run TypeScript check**

```bash
npx tsc --noEmit
```

**Step 3: Final commit if any fixes needed**

---

### Task 9: Deploy

```bash
npx vercel --prod
```
