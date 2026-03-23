# Mobile Responsiveness Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make every screen, drawer, and modal in the Vandaag app fully usable on mobile without horizontal scrolling, overflow, or inaccessible tap targets.

**Architecture:** Mobile-first Tailwind — default styles = mobile, `sm:` prefix = 640px+. No new dependencies. DnD-kit stays enabled (PointerSensor works on touch). Kanban switches to single-column tab navigation on mobile. All drawers go full-width. All modals go full-screen.

**Tech Stack:** React 19, Tailwind CSS 4, Vite. No libraries added.

---

## What's broken right now

| Component | Problem |
|---|---|
| `KanbanBoard` | `grid grid-cols-4` — 4 columns crushed on mobile |
| `VandaagView` | `grid grid-cols-3` — 3 tiers side by side, unusable |
| All drawers | `max-w-[380px]` — fine on desktop, should be full-width on mobile |
| `ProjectModal` | `max-w-2xl` centered — needs full-screen on mobile |
| All other modals | Same as ProjectModal |
| Header | `px-6 pt-8` + 22px font too big, logo cramped |
| `main` | `pb-12` not enough bottom padding — FAB covers content |
| `SmartFab` | 8 action buttons can overflow small screens; no iOS safe-area |
| `PlanningModal` | Multi-step wizard, needs mobile scroll |

---

## Task 1: Verify viewport meta + add safe-area CSS vars

**Files:**
- Check: `index.html`
- Modify: `src/index.css` (or wherever global CSS lives)

**Step 1: Check index.html has the correct viewport meta**

Open `index.html`. Verify this line exists in `<head>`:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
```
The `viewport-fit=cover` is required for iPhone notch/home-bar safe area support.
If it says `initial-scale=1` without `viewport-fit=cover`, update it.

**Step 2: Add safe-area custom property to global CSS**

Find `src/index.css` (or `src/app.css`) — the global stylesheet. Add at the top of `:root`:
```css
:root {
  --safe-area-bottom: env(safe-area-inset-bottom, 0px);
}
```

**Step 3: Verify in browser**
Open Chrome DevTools → toggle device toolbar → select iPhone 14 Pro. Confirm no horizontal scrollbar appears on the base page.

**Step 4: Commit**
```bash
git add index.html src/index.css
git commit -m "fix: add viewport-fit=cover and safe-area CSS var for mobile"
```

---

## Task 2: App.tsx — responsive header and main padding

**Files:**
- Modify: `src/App.tsx`

The header has `px-6 pt-8 pb-6` and a 22px serif title. On mobile this is cramped. The `main` tag has `pb-12` which lets the FAB overlap content.

**Step 1: Update header padding and text sizes**

In `App.tsx`, find the `<header>` tag (line 130). Replace:
```tsx
<header className="max-w-[1400px] mx-auto px-6 pt-8 pb-6 flex justify-between items-start">
```
With:
```tsx
<header className="max-w-[1400px] mx-auto px-4 pt-5 pb-4 sm:px-6 sm:pt-8 sm:pb-6 flex justify-between items-start">
```

**Step 2: Responsive logo + title**

Find the `<EnsoLogo size={40}>` and the title `text-[22px]`. Replace:
```tsx
<EnsoLogo size={40} color="#2A2724" />
<div>
  <h1 className="font-serif text-[22px] font-normal text-charcoal tracking-[-0.02em]">
```
With:
```tsx
<EnsoLogo size={32} color="#2A2724" className="sm:w-10 sm:h-10" />
<div>
  <h1 className="font-serif text-[18px] sm:text-[22px] font-normal text-charcoal tracking-[-0.02em]">
```

**Step 3: Hide week number on mobile**

Find `Week {weekNum}`. Replace:
```tsx
<div className="text-[12px] text-stone/60 tracking-[0.04em] uppercase mt-1">
  Week {weekNum}
</div>
```
With:
```tsx
<div className="hidden sm:block text-[12px] text-stone/60 tracking-[0.04em] uppercase mt-1">
  Week {weekNum}
</div>
```

**Step 4: Increase main bottom padding for FAB**

Find `<main className="px-6 pb-12">`. Replace:
```tsx
<main className="px-6 pb-12">
```
With:
```tsx
<main className="px-4 pb-28 sm:px-6 sm:pb-12">
```

**Step 5: TomorrowPeek drawer — full width on mobile**

Find the TomorrowPeek panel div (line 162):
```tsx
className={`fixed top-0 right-0 h-full w-full max-w-[360px] bg-canvas border-l border-border
```
Replace:
```tsx
className={`fixed top-0 right-0 h-full w-full sm:max-w-[360px] bg-canvas border-l border-border
```

**Step 6: Verify in browser**
DevTools → iPhone 14 Pro. Header should be compact, no overflow.

**Step 7: Commit**
```bash
git add src/App.tsx
git commit -m "fix(mobile): responsive header padding, font sizes, FAB clearance"
```

---

## Task 3: VandaagView — stack tiers vertically on mobile

**Files:**
- Modify: `src/components/vandaag/VandaagView.tsx`

The 3-column grid `grid grid-cols-3 gap-4` is unusable on mobile. Stack vertically.

**Step 1: Update the tiers grid**

Find (line 197):
```tsx
<div className="grid grid-cols-3 gap-4">
```
Replace:
```tsx
<div className="flex flex-col gap-3 sm:grid sm:grid-cols-3 sm:gap-4">
```

**Step 2: Remove hover-only swap arrows on mobile — make always visible**

The swap arrows use `opacity-0 group-hover/tier:opacity-100`. On touch screens, hover never fires. On mobile, just show them always. Replace:
```tsx
<div className="absolute top-2 right-2 z-10 flex gap-0.5
  opacity-0 group-hover/tier:opacity-100 transition-opacity">
```
With:
```tsx
<div className="absolute top-2 right-2 z-10 flex gap-0.5
  opacity-100 sm:opacity-0 sm:group-hover/tier:opacity-100 transition-opacity">
```

**Step 3: Responsive quote + "That's enough" row**

Find (line 255):
```tsx
<div className="mt-4 flex items-end justify-between gap-6">
```
Replace:
```tsx
<div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
```

**Step 4: Responsive collapsed summary row**

Find (line 152):
```tsx
<div
  className="flex items-center gap-6 px-4 py-3 bg-card rounded-[8px] border border-border/50
    shadow-card text-[12px] text-stone cursor-pointer hover:border-stone/20 transition-all"
```
Replace:
```tsx
<div
  className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 bg-card rounded-[8px] border border-border/50
    shadow-card text-[12px] text-stone cursor-pointer hover:border-stone/20 transition-all"
```

**Step 5: Verify in browser**
Mobile: three tiers should stack vertically as cards. Desktop: back to 3-column grid.

**Step 6: Commit**
```bash
git add src/components/vandaag/VandaagView.tsx
git commit -m "fix(mobile): stack VandaagView tiers vertically, always-visible swap arrows"
```

---

## Task 4: KanbanBoard — column tab navigation on mobile

**Files:**
- Modify: `src/components/kanban/KanbanBoard.tsx`

The 4-column grid `grid grid-cols-4 gap-4` is completely broken on mobile. On mobile, show a pill tab bar (Backlog | Active | Waiting | Done) and render only the selected column.

**Step 1: Add mobile column state**

At the top of `KanbanBoard`, after the existing `useState` declarations (around line 96), add:
```tsx
const [mobileCol, setMobileCol] = useState<string>('backlog')
```

**Step 2: Add the mobile tab bar component**

Just above the `<DndContext>` block (around line 369), add this tab bar that only renders on mobile:
```tsx
{/* Mobile column tab selector — hidden on sm+ */}
<div className="flex sm:hidden gap-1 mb-3 p-1 bg-border-light/60 rounded-[8px]">
  {[
    { id: 'backlog', label: 'Backlog' },
    { id: 'in_progress', label: 'Active' },
    { id: 'waiting', label: 'Waiting' },
    { id: 'done', label: 'Done' },
  ].map(tab => (
    <button
      key={tab.id}
      onClick={() => setMobileCol(tab.id)}
      className={`flex-1 py-1.5 text-[11px] font-medium rounded-[6px] transition-all duration-150
        ${mobileCol === tab.id
          ? 'bg-card text-charcoal shadow-sm'
          : 'text-stone hover:text-charcoal'}`}
    >
      {tab.label}
    </button>
  ))}
</div>
```

**Step 3: Wrap the grid in responsive logic**

Find (line 376):
```tsx
<div className="grid grid-cols-4 gap-4">
```
Replace:
```tsx
<div className="sm:grid sm:grid-cols-4 sm:gap-4 flex flex-col gap-3">
```

**Step 4: Wrap each column to hide on mobile when not selected**

Wrap `<BacklogColumn>` (line 377):
```tsx
<div className={`${mobileCol !== 'backlog' ? 'hidden sm:block' : ''}`}>
  <BacklogColumn
    ...
  />
</div>
```

Wrap each `<KanbanColumn>` in the `.map()` (line 384):
```tsx
{KANBAN_COLUMNS.filter(col => col.id !== 'backlog').map(col => {
  const isWipColumn = col.id === 'in_progress' || col.id === 'waiting'
  return (
    <div key={col.id} className={`${mobileCol !== col.id ? 'hidden sm:block' : ''}`}>
      <KanbanColumn
        id={col.id}
        title={col.title}
        limit={isWipColumn ? inProgressLimit : null}
        combinedCount={isWipColumn ? getWipCount() : undefined}
        projects={getProjectsByStatus(col.id)}
        orphanTasks={getOrphansByColumn(col.id)}
        onProjectClick={handleProjectClick}
        dragPreview={
          dragPreview?.targetCol === col.id
            ? { activeId: dragPreview.activeId, afterItemId: dragPreview.afterItemId, height: dragPreview.height, beforeFirst: dragPreview.beforeFirst }
            : undefined
        }
        {...orphanHandlers}
      />
    </div>
  )
})}
```

Wrap `<DoneListColumn />` (line 405):
```tsx
<div className={`${mobileCol !== 'done' ? 'hidden sm:block' : ''}`}>
  <DoneListColumn />
</div>
```

**Step 5: Verify in browser**
Mobile: shows pill tabs, only one column visible at a time. Desktop: shows all 4 columns in grid.

**Step 6: Commit**
```bash
git add src/components/kanban/KanbanBoard.tsx
git commit -m "fix(mobile): kanban column tab navigation on mobile"
```

---

## Task 5: All drawers — full width on mobile

**Files:**
- Modify: `src/components/meetings/MeetingsDrawer.tsx`
- Modify: `src/components/ui/RecurringTasksDrawer.tsx`

**Step 1: MeetingsDrawer — full width on mobile**

In `MeetingsDrawer.tsx`, find the drawer panel div (line 43-47):
```tsx
className={`fixed top-0 right-0 h-full w-full max-w-[380px] bg-canvas border-l border-border
  shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]
  ${open ? 'translate-x-0' : 'translate-x-full'}`}
```
Replace `max-w-[380px]` with `sm:max-w-[380px]`:
```tsx
className={`fixed top-0 right-0 h-full w-full sm:max-w-[380px] bg-canvas border-l border-border
  shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]
  ${open ? 'translate-x-0' : 'translate-x-full'}`}
```

**Step 2: Read RecurringTasksDrawer width**

Open `src/components/ui/RecurringTasksDrawer.tsx` and find the panel div with `max-w-[...]`. Apply the same pattern: add `sm:` prefix to the max-width constraint so on mobile it's full width.

**Step 3: Verify in browser**
Mobile: both drawers slide in full width. Desktop: constrained to original width.

**Step 4: Commit**
```bash
git add src/components/meetings/MeetingsDrawer.tsx src/components/ui/RecurringTasksDrawer.tsx
git commit -m "fix(mobile): drawers full-width on mobile"
```

---

## Task 6: ProjectModal — full screen on mobile

**Files:**
- Modify: `src/components/kanban/ProjectModal.tsx`

**Step 1: Update the modal panel classes**

In `ProjectModal.tsx` (line 77-79), find:
```tsx
<div
  className="relative bg-card rounded-[10px] shadow-modal w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-scale-in"
  onClick={e => e.stopPropagation()}
>
```
Replace with:
```tsx
<div
  className="relative bg-card w-full h-full sm:rounded-[10px] sm:max-w-2xl sm:h-auto sm:max-h-[90vh] overflow-y-auto animate-scale-in"
  onClick={e => e.stopPropagation()}
>
```

**Step 2: Update the fixed backdrop container**

The outer `div.fixed.inset-0` (line 75) uses `flex items-center justify-center`. On mobile, align to top:
```tsx
<div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
```
This makes the modal slide up from bottom on mobile — a natural mobile pattern. Add a top-rounded style on mobile:
```tsx
<div
  className="relative bg-card w-full rounded-t-[16px] sm:rounded-[10px] sm:max-w-2xl sm:max-h-[90vh] overflow-y-auto animate-scale-in max-h-[92vh]"
  onClick={e => e.stopPropagation()}
>
```

**Step 3: Verify**
Mobile: modal comes up as a bottom sheet (slides from bottom, rounded top corners, 92% screen height). Desktop: centered overlay.

**Step 4: Commit**
```bash
git add src/components/kanban/ProjectModal.tsx
git commit -m "fix(mobile): ProjectModal as bottom sheet on mobile"
```

---

## Task 7: AddProjectModal, AddTaskModal, OrphanTaskModal — full screen on mobile

**Files:**
- Modify: `src/components/kanban/AddProjectModal.tsx`
- Modify: `src/components/kanban/AddTaskModal.tsx`
- Modify: `src/components/kanban/OrphanTaskModal.tsx`
- Modify: `src/components/kanban/WaitingPromptModal.tsx`
- Modify: `src/components/kanban/SwapModal.tsx`

For each of these modals, apply the same bottom-sheet pattern from Task 6:

**Pattern to apply to each:**

Outer container:
```tsx
<div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
```

Inner panel:
```tsx
<div
  className="relative bg-card w-full rounded-t-[16px] sm:rounded-[10px] sm:max-w-lg sm:max-h-[85vh] overflow-y-auto"
  onClick={e => e.stopPropagation()}
>
```
(Adjust `sm:max-w-*` to match each modal's original width)

**Step 1: Apply pattern to AddProjectModal**
**Step 2: Apply pattern to AddTaskModal**
**Step 3: Apply pattern to OrphanTaskModal**
**Step 4: Apply pattern to WaitingPromptModal**
**Step 5: Apply pattern to SwapModal** (this is a confirmation modal — keep it centered, just ensure padding is safe on mobile)

**Step 6: Verify each modal on mobile**
Each should appear as a bottom sheet that can be scrolled.

**Step 7: Commit**
```bash
git add src/components/kanban/AddProjectModal.tsx src/components/kanban/AddTaskModal.tsx \
  src/components/kanban/OrphanTaskModal.tsx src/components/kanban/WaitingPromptModal.tsx \
  src/components/kanban/SwapModal.tsx
git commit -m "fix(mobile): small modals as bottom sheets on mobile"
```

---

## Task 8: PlanningModal — mobile layout

**Files:**
- Modify: `src/components/planning/PlanningModal.tsx`
- Check: `src/components/planning/StepCalendar.tsx`, `StepDeepBlock.tsx`, `StepShortTasks.tsx`, `StepMaintenance.tsx`

The PlanningModal is a multi-step wizard. Read the full component first to understand its container structure (it may already be `fixed inset-0`).

**Step 1: Read PlanningModal.tsx in full**
```bash
cat src/components/planning/PlanningModal.tsx
```

**Step 2: Identify the container**
If the modal uses `fixed inset-0` with `overflow-y-auto` it may already work well on mobile. Check if:
- The inner content container has a max-width that needs `sm:` prefix
- The step content areas have horizontal layouts that need to stack on mobile

**Step 3: Apply mobile-first padding to the modal container**
Any inner panel like `max-w-2xl` or `max-w-3xl` should become `w-full sm:max-w-2xl`.

**Step 4: Make each Step component check for stacking issues**
Read each Step component briefly. If any uses `grid grid-cols-2` or `flex gap-x-*` side-by-side layouts, add `flex-col sm:flex-row` or `sm:grid sm:grid-cols-2`.

**Step 5: Verify full planning flow on mobile**
Go through all 4 steps on mobile viewport in DevTools.

**Step 6: Commit**
```bash
git add src/components/planning/
git commit -m "fix(mobile): PlanningModal and step components responsive layout"
```

---

## Task 9: SmartFab — action stack overflow + safe area insets

**Files:**
- Modify: `src/components/ui/SmartFab.tsx`

**Step 1: Add max-height + scroll to action stack**

The action stack (8 buttons) can overflow on small phones. Find (line 107):
```tsx
<div className="flex flex-col items-end gap-1.5">
```
Replace:
```tsx
<div className="flex flex-col items-end gap-1.5 max-h-[calc(100vh-140px)] overflow-y-auto pb-1">
```

**Step 2: Add iOS safe area to FAB position**

The FAB sits at `bottom-6 right-6`. On iPhone with home bar, this can be covered. Replace:
```tsx
<div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
```
With:
```tsx
<div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2"
  style={{ bottom: 'calc(1.5rem + var(--safe-area-bottom, 0px))' }}>
```

**Step 3: Cap label card width on mobile**

The label card (line 127) can be wide. Add max-width:
```tsx
<button
  onClick={handlePrimaryClick}
  className={`flex items-center gap-2 px-4 py-2.5 rounded-[10px]
    bg-card border border-border max-w-[calc(100vw-96px)]
    ...`}
>
```

**Step 4: Verify on iPhone SE (375px wide)**
All 8 action buttons should be scrollable; FAB should not be hidden behind home bar.

**Step 5: Commit**
```bash
git add src/components/ui/SmartFab.tsx
git commit -m "fix(mobile): SmartFab safe area, action stack overflow, label max-width"
```

---

## Task 10: MeetingModal + LiveMeetingPanel — mobile

**Files:**
- Modify: `src/components/meetings/MeetingModal.tsx`
- Modify: `src/components/meetings/LiveMeetingPanel.tsx`

**Step 1: Read MeetingModal.tsx**
```bash
cat src/components/meetings/MeetingModal.tsx
```
Apply bottom-sheet pattern if it's a floating modal (same as Task 6/7).

**Step 2: Read LiveMeetingPanel.tsx**
```bash
cat src/components/meetings/LiveMeetingPanel.tsx
```
Check for any horizontal layouts that need stacking on mobile. Particularly look for `flex gap-x-*` or `grid grid-cols-*`.

**Step 3: Apply responsive classes as needed**
- Any `flex` row that should stack: add `flex-col sm:flex-row`
- Any fixed widths: replace with `w-full sm:w-[Npx]`

**Step 4: Verify MeetingsDrawer + LiveMeetingPanel on mobile**
Open meetings drawer on mobile. Start a live meeting session. All controls should be reachable.

**Step 5: Commit**
```bash
git add src/components/meetings/MeetingModal.tsx src/components/meetings/LiveMeetingPanel.tsx
git commit -m "fix(mobile): MeetingModal bottom sheet, LiveMeetingPanel stacking"
```

---

## Task 11: Final audit pass

**Step 1: Test all full-screen views on mobile**

`CitadelMode`, `EnoughScreen`, `NewDayScreen` are full-screen views (`min-h-screen`). Read each one briefly and check:
- No horizontal overflow
- Font sizes readable
- Tap targets ≥ 44px

```bash
cat src/components/vandaag/CitadelMode.tsx | grep -n "className"
cat src/components/vandaag/EnoughScreen.tsx | grep -n "className"
cat src/components/vandaag/NewDayScreen.tsx | grep -n "className"
```

**Step 2: Test PhilosophyPage on mobile**
```bash
cat src/components/philosophy/PhilosophyPage.tsx | grep -n "className"
```
Verify layout doesn't overflow.

**Step 3: Test TomorrowPeek content on mobile**
Open the TomorrowPeek drawer on mobile (via "Morgen →" link). Confirm full-width layout works.

**Step 4: Global overflow check**
In browser DevTools → iPhone 14 Pro:
- [ ] Header compact and readable
- [ ] VandaagView tiers stacked
- [ ] KanbanBoard tab navigation works
- [ ] All drawers full width
- [ ] All modals bottom sheet
- [ ] FAB above safe area
- [ ] No horizontal scroll on any screen
- [ ] Tap targets feel comfortable (not tiny)

**Step 5: Commit any remaining fixes**
```bash
git commit -m "fix(mobile): final audit pass — full screen views and overflow fixes"
```

---

## Execution Notes

- **DnD on mobile**: PointerSensor in dnd-kit handles touch. Within a single visible column on mobile, drag-to-reorder should work. Cross-column drag is not needed on mobile since users switch columns via tabs.
- **Bottom sheet animation**: The `animate-scale-in` on ProjectModal may look odd coming from bottom. Consider replacing it with a slide-up animation for mobile. This is a nice-to-have.
- **Breakpoint**: All `sm:` targets 640px. The app should be fully usable at 375px (iPhone SE), 390px (iPhone 14), and 414px (iPhone 11).
