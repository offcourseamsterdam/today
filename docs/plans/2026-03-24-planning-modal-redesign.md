# Planning Modal Redesign: Full-Screen Drag-and-Drop

**Date:** 2026-03-24
**Status:** Design approved, pending implementation

## Problem

The current PlanningModal is a 4-step wizard (Calendar → Deep Block → Short Three → Maintenance) where users click through steps and select tasks/projects from dropdown pickers. This feels slow and disconnected — you can't see all three tiers at once, and adding items requires clicking through picker menus.

## Solution

A full-screen two-column layout where all three planning tiers are visible simultaneously on the left, and all available projects, tasks, and meetings are on the right as a draggable inventory. Users drag items directly into tiers. Tiers are reorderable via drag handles.

---

## Layout

### Desktop (>640px)

```
┌──────────────────────────────────────────────────────────────────────┐
│  Plan tomorrow                    wednesday 25 march      [Lock in] [×] │
├────────────────────────────────────────┬─────────────────────────────┤
│  LEFT (flex-1, overflow-y-auto)       │  RIGHT (w-[340px], scroll)  │
│                                       │                             │
│  ⠿ MAINTENANCE  ← (if overdue)       │  🔍 Search...               │
│  ⠿ DEEP BLOCK                        │                             │
│  ⠿ SHORT THREE                       │  PROJECTS                   │
│                                       │  ▪ Project cards             │
│                                       │                             │
│                                       │  TASKS                      │
│                                       │  ▪ Task rows                │
│                                       │                             │
│                                       │  MEETINGS                   │
│                                       │  ▪ Meeting rows             │
└────────────────────────────────────────┴─────────────────────────────┘
```

- Full screen: `fixed inset-0 z-50 bg-[#FAF9F7]`
- Header: sticky, serif title, centered date label, Lock-in button + close X
- Left: `flex-1 overflow-y-auto px-8 py-6`
- Right: `w-[340px] border-l border-[#E8E4DD] overflow-y-auto px-5 py-6`

### Mobile (<640px)

```
┌─────────────────────────┐
│  Plan tomorrow    [×]   │
│  wednesday 25 march     │
├─────────────────────────┤
│  ⠿ MAINTENANCE          │
│  ⠿ DEEP BLOCK           │
│  ⠿ SHORT THREE          │
│                         │
│  [+ Add items]  ← FAB  │
├─────────────────────────┤  ← bottom sheet
│  ⠿ PROJECTS             │
│  ⠿ TASKS                │
│  ⠿ MEETINGS             │
│  [Lock in tomorrow]     │
└─────────────────────────┘
```

- Single column, tiers stacked
- Inventory = bottom sheet (60vh max) triggered by FAB
- Lock-in button at bottom of sheet (sticky)

---

## Drag-and-Drop Interaction Design

### Sensors & Collision
- `PointerSensor`: `activationConstraint: { distance: 8 }` (same as KanbanBoard)
- `KeyboardSensor`: `sortableKeyboardCoordinates`
- Collision: `pointerWithin` → `closestCorners` fallback

### Droppable Zone IDs
- `tier-deep`, `tier-short`, `tier-maintenance`, `inventory`

### Draggable Item IDs
- `project-{id}`, `task-{id}`, `meeting-{id}`
- `data` payload: `{ type: 'project' | 'task' | 'meeting', id: string }`

### Picking Up (from Inventory)
1. Hover: `cursor-grab`, subtle `hover:border-[#2A2724]/20 hover:shadow-sm`
2. Drag starts (8px move):
   - Original ghosted: `opacity-30 pointer-events-none` (stays visible to show origin)
   - DragOverlay appears at cursor: `rotate-2 scale-105 shadow-lg` (projects) or `rotate-1 scale-105` (tasks)
   - Cursor: `cursor-grabbing`

### Hovering Over Drop Zone

**Valid drop:**
- Zone border: `border-[#E8E4DD]` → `border-[#2A2724]/40` (150ms transition)
- Zone bg: `bg-white` → `bg-[#FAF9F7]`
- DropGhost appears at bottom: `border-2 border-dashed border-[#2A2724]/20 rounded-[8px]`
  - Height: 48px (tasks), 64px (projects)
  - Entry animation: `animate-[fadeUpIn_150ms_ease-out]`
- Tier label brightens: `text-[#7A746A]/60` → `text-[#2A2724]`

**Invalid drop (task → Deep Block):**
- Zone border: `border-red-200`
- No ghost appears
- Visual rejection feedback

**Full zone (Short at 3/3):**
- Slot counter pulses amber: `text-amber-500`
- No ghost

### Dropping

**Successful:**
1. DragOverlay snaps to position: `dropAnimation: { duration: 200, easing: 'ease-out' }`
2. Ghost morphs to card: dashed → solid border, `animate-[scale-in_200ms_ease-out]`
3. Inventory item stays `opacity-30` permanently (assigned)
4. Slot counter updates

**Cancelled:**
1. DragOverlay springs back to origin (dnd-kit default)
2. Inventory item returns to `opacity-100`

### Moving Between Tiers
1. Source item fades to `opacity-30`
2. Source counter decrements
3. Target shows ghost + border highlight
4. On drop: remove from source, add to target

### Removing from Tier
1. **X button**: click to remove, returns to inventory at `opacity-100`
2. **Drag to inventory**: drag right, inventory highlights, drop to remove

---

## Tier Block Reordering

Each tier block has `GripVertical` handle in its header. Uses `SortableContext` with `verticalListSortingStrategy` for the three blocks.

**Drag interaction:**
1. Grab handle → block lifts: `shadow-xl scale-[1.02] z-10`
2. Other blocks animate to make room: `transition-transform duration-200`
3. Gap opens at insertion point
4. Drop → blocks settle with spring animation
5. `blockOrder` state updates

**Overdue recurring auto-promotion:**
- On open, if `overdueRecurring.length > 0`: `blockOrder` defaults to `['maintenance', 'deep', 'short']`
- Amber banner in maintenance: "X recurring tasks not done today"
- Can still manually reorder after

---

## Drop Rules

| Target | Accepts | Max | Notes |
|--------|---------|-----|-------|
| Deep Block | Projects, Meetings | 1 | Replaces existing. Has intention input below. |
| Short Three | Projects, Tasks, Meetings | 3 slots | Meetings use ceil(duration/60) slots |
| Maintenance | Projects, Tasks, Meetings | ∞ | Auto-populate recurring button. Quick-add input. |

---

## Tier Drop Zone Design

### Deep Block
- Single large slot area
- When filled: project cover image + title + CategoryBadge + X button
- Intention input always visible below: "What do you want to accomplish?"
- If meeting fills deep block: shows time + title + duration

### Short Three
- Slot counter in header: "1/3 slots"
- Up to 3 compact items (task/project rows with X)
- Empty slots shown as dashed placeholders
- Meeting slots consume ceil(duration/60)

### Maintenance
- Header with "Auto-populate recurring" button (RotateCcw icon)
- Overdue banner (amber) when recurring tasks missed yesterday
- Unlimited item list
- Quick-add input at bottom: "Add maintenance task…"
- Meeting picker preserved

---

## Inventory Panel Design

### Sections (collapsible)
1. **Projects** — all `in_progress` projects, compact cards with cover thumbnail + title + CategoryBadge
2. **Tasks** — from `getAvailableTasks()`, compact rows with dot + title + project context
3. **Meetings** — all meetings/recurringMeetings, compact rows with time + title + duration

### Visual States
- **Available**: full opacity, `cursor-grab`
- **Assigned to tier**: `opacity-30`, no cursor change, still visible
- **Search filter**: text input at top filters all sections by title

---

## State Management

All assignments in local state until "Lock in":

```typescript
interface PlanningDragState {
  blockOrder: Array<'deep' | 'short' | 'maintenance'>
  deepProjectId: string
  deepMeetingId?: string
  intention: string
  shortTaskIds: string[]
  shortProjectIds: string[]
  shortMeetingIds: string[]
  mainTaskIds: string[]
  mainProjectIds: string[]
  mainMeetingIds: string[]
}
```

`removeFromAllTiers(id)` helper strips an ID from every array before placing in new tier.

Lock-in dispatches to existing store actions — no store changes needed.

---

## Component Architecture

### Modified
- `PlanningModal.tsx` — full rewrite: full-screen layout, DndContext, two-column grid, block ordering, all state, lock-in

### New
- `TierDropZone.tsx` — reusable drop zone for each tier, useDroppable, renders items + ghost + empty state
- `InventoryPanel.tsx` — right column: sections for projects/tasks/meetings, search filter, useDraggable items
- `PlanningDragOverlay.tsx` — DragOverlay content: renders project card or task row during drag

### Deleted (absorbed into new components)
- `StepDeepBlock.tsx`
- `StepShortTasks.tsx`
- `StepMaintenance.tsx`
- `StepIndicator.tsx`

### Kept as-is
- `StepCalendar.tsx` — not used in new flow, but preserved for future use
- Store: `plansSlice.ts`, `helpers.ts`, `types.ts` — unchanged
- Hooks: `useTodayPlan.ts`, `useTomorrowPlan.ts` — unchanged

---

## Existing Code to Reuse

| Utility | Location | Purpose |
|---------|----------|---------|
| `getAvailableTasks()` | `src/lib/availableTasks.ts` | Populate task inventory |
| `findTaskById()` | `src/lib/taskLookup.ts` | Resolve task details for display |
| `CategoryBadge` | `src/components/ui/CategoryBadge.tsx` | Project category labels |
| `CATEGORY_CONFIG` | `src/types/index.ts` | Category colors/styling |
| `DropGhost` | `src/components/kanban/DropGhost.tsx` | Dashed drop placeholder |
| `getTodayRecurringTasks()` | Store | Overdue recurring detection |
| `getTomorrowRecurringTasks()` | Store | Tomorrow's recurring tasks |
| Store actions | `plansSlice.ts` | All add/remove/set tier methods |
| Sensor config pattern | `KanbanBoard.tsx` | PointerSensor + KeyboardSensor setup |
| Collision strategy | `KanbanBoard.tsx` | pointerWithin → closestCorners |

---

## Verification Plan

1. Open planning modal → verify full-screen two-column layout
2. Drag project from inventory → Deep Block (shows cover + intention input)
3. Drag task from inventory → Short Three (counter increments, max 3)
4. Drag project → Short Three (also works, uses 1 slot)
5. Drag items → Maintenance (unlimited, shows recurring auto-populate)
6. Move item between tiers (removes from source, adds to target)
7. Click X on tier item (returns to inventory at full opacity)
8. Drag tier block handle → reorder blocks (smooth animation)
9. If overdue recurring: maintenance auto-promotes to top with amber banner
10. Lock in → verify store state matches assignments
11. Re-open modal → verify pre-population from existing plan
12. Mobile: verify single-column + bottom sheet inventory
13. Search filter in inventory filters projects and tasks
