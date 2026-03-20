# Meeting Agenda Timer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the plain agenda textarea with structured agenda items (title + optional duration), add a live meeting session timer in the MeetingsDrawer, and show an active session label in the FAB.

**Architecture:** New `MeetingSession` type stored in Zustand (persisted, like `FocusSession`). A `meetingSessionSlice` handles all timer logic. The MeetingsDrawer renders a live panel at the top when a session is active. A global tick in `App.tsx` drives the countdown for timed items.

**Tech Stack:** React 19, TypeScript, Zustand persist, dnd-kit/sortable, Tailwind CSS 4, Lucide icons

---

### Task 1: Add types

**Files:**
- Modify: `src/types/index.ts`

**Step 1: Add `AgendaItem` interface after the `Meeting` interface**

```ts
export interface AgendaItem {
  id: string
  title: string
  durationMinutes?: number
}
```

**Step 2: Add `MeetingSession` interface after `AgendaItem`**

```ts
export interface MeetingSession {
  meetingId: string
  currentItemIndex: number
  completedItemIds: string[]
  secondsLeft: number | null   // null = this item has no duration
  isRunning: boolean
  startedAt: string
  lastTickAt: string
}
```

**Step 3: Update `Meeting` interface** — replace `agenda?: string` with `agendaItems?: AgendaItem[]`

```ts
export interface Meeting {
  id: string
  title: string
  date?: string
  time: string
  durationMinutes: number
  location?: string
  agendaItems?: AgendaItem[]   // ← was: agenda?: string
  actions?: string
  takeaways?: string
  isRecurring: boolean
  recurrenceRule?: RecurrenceRule
  lastCompletedDate?: string
  createdAt: string
}
```

**Step 4: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add AgendaItem and MeetingSession types, update Meeting"
```

---

### Task 2: Create meetingSessionSlice

**Files:**
- Create: `src/store/meetingSessionSlice.ts`

**Step 1: Create the file**

```ts
import { v4 as uuid } from 'uuid'
import type { MeetingSession } from '../types'
import type { StoreSet, StoreGet } from './types'

export function makeMeetingSessionActions(set: StoreSet, get: StoreGet) {
  return {
    startMeetingSession: (meetingId: string) => {
      const meeting = [
        ...get().meetings,
        ...get().recurringMeetings,
      ].find(m => m.id === meetingId)
      if (!meeting) return

      const firstItem = meeting.agendaItems?.[0]
      const now = new Date().toISOString()
      const session: MeetingSession = {
        meetingId,
        currentItemIndex: 0,
        completedItemIds: [],
        secondsLeft: firstItem?.durationMinutes != null
          ? firstItem.durationMinutes * 60
          : null,
        isRunning: true,
        startedAt: now,
        lastTickAt: now,
      }
      set({ meetingSession: session })
    },

    endMeetingSession: () => {
      set({ meetingSession: null })
    },

    pauseMeetingSession: () => {
      const { meetingSession } = get()
      if (!meetingSession) return
      set({ meetingSession: { ...meetingSession, isRunning: false } })
    },

    resumeMeetingSession: () => {
      const { meetingSession } = get()
      if (!meetingSession) return
      set({
        meetingSession: {
          ...meetingSession,
          isRunning: true,
          lastTickAt: new Date().toISOString(),
        },
      })
    },

    advanceMeetingItem: () => {
      const { meetingSession, meetings, recurringMeetings } = get()
      if (!meetingSession) return

      const meeting = [...meetings, ...recurringMeetings].find(
        m => m.id === meetingSession.meetingId
      )
      if (!meeting) return

      const items = meeting.agendaItems ?? []
      const currentItem = items[meetingSession.currentItemIndex]
      const nextIndex = meetingSession.currentItemIndex + 1

      // Mark current as complete
      const completedItemIds = currentItem
        ? [...meetingSession.completedItemIds, currentItem.id]
        : meetingSession.completedItemIds

      // If no more items, end session
      if (nextIndex >= items.length) {
        set({ meetingSession: null })
        return
      }

      const nextItem = items[nextIndex]
      const now = new Date().toISOString()
      set({
        meetingSession: {
          ...meetingSession,
          currentItemIndex: nextIndex,
          completedItemIds,
          secondsLeft: nextItem?.durationMinutes != null
            ? nextItem.durationMinutes * 60
            : null,
          isRunning: true,
          lastTickAt: now,
        },
      })
    },

    tickMeetingSession: () => {
      const { meetingSession } = get()
      if (!meetingSession || !meetingSession.isRunning) return
      if (meetingSession.secondsLeft === null) return  // untimed item, no tick needed

      const missed = Math.floor(
        (Date.now() - Date.parse(meetingSession.lastTickAt)) / 1000
      )
      const decrement = Math.max(1, missed)
      const newSecondsLeft = meetingSession.secondsLeft - decrement

      if (newSecondsLeft <= 0) {
        // Timer expired — pause and show 0 (user clicks Next manually)
        set({
          meetingSession: {
            ...meetingSession,
            secondsLeft: 0,
            isRunning: false,
            lastTickAt: new Date().toISOString(),
          },
        })
      } else {
        set({
          meetingSession: {
            ...meetingSession,
            secondsLeft: newSecondsLeft,
            lastTickAt: new Date().toISOString(),
          },
        })
      }
    },
  }
}
```

**Step 2: Commit**

```bash
git add src/store/meetingSessionSlice.ts
git commit -m "feat: add meetingSessionSlice with timer actions"
```

---

### Task 3: Wire session into store

**Files:**
- Modify: `src/store/types.ts`
- Modify: `src/store/index.ts`

**Step 1: Add to `VandaagState` in `src/store/types.ts`**

Add import at top:
```ts
import type { ..., MeetingSession } from '../types'
```

Add to state fields (after `showCitadel: boolean`):
```ts
// Meeting session state
meetingSession: MeetingSession | null
```

Add action signatures (after meeting actions section):
```ts
// Meeting session actions
startMeetingSession: (meetingId: string) => void
endMeetingSession: () => void
pauseMeetingSession: () => void
resumeMeetingSession: () => void
advanceMeetingItem: () => void
tickMeetingSession: () => void
```

**Step 2: Update `src/store/index.ts`**

Add import:
```ts
import { makeMeetingSessionActions } from './meetingSessionSlice'
```

Add initial state (after `showCitadel: false`):
```ts
meetingSession: null,
```

Add to slice spread (after `...makeFocusActions(set, get)`):
```ts
...makeMeetingSessionActions(set, get),
```

Add to `partialize` (after `focusSession: state.focusSession`):
```ts
meetingSession: state.meetingSession,
```

**Step 3: Commit**

```bash
git add src/store/types.ts src/store/index.ts
git commit -m "feat: wire meetingSession into Zustand store"
```

---

### Task 4: Global tick in App.tsx

**Files:**
- Modify: `src/App.tsx`

**Step 1: Read `meetingSession` and `tickMeetingSession` from store**

Add after the `tickFocusSession` line:
```ts
const meetingSession = useStore(s => s.meetingSession)
const tickMeetingSession = useStore(s => s.tickMeetingSession)
```

**Step 2: Add global tick effect** (after the focus session tick effect)

```ts
// Global meeting session tick
useEffect(() => {
  if (!meetingSession?.isRunning || meetingSession.secondsLeft === null) return
  const id = setInterval(() => tickMeetingSession(), 1000)
  return () => clearInterval(id)
}, [meetingSession?.isRunning, meetingSession?.secondsLeft, tickMeetingSession])
```

**Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add global meeting session tick to App.tsx"
```

---

### Task 5: AgendaItemEditor component

**Files:**
- Create: `src/components/meetings/AgendaItemEditor.tsx`

**Step 1: Create the component**

This is a sortable list using dnd-kit. Each row has a text input, optional duration, and delete button.

```tsx
import { useRef } from 'react'
import { GripVertical, X } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { v4 as uuid } from 'uuid'
import type { AgendaItem } from '../../types'

const DURATION_OPTIONS = [5, 10, 15, 20, 30, 45, 60]

interface AgendaItemRowProps {
  item: AgendaItem
  index: number
  total: number
  onChange: (id: string, patch: Partial<AgendaItem>) => void
  onDelete: (id: string) => void
  onEnter: (id: string) => void
  onBackspaceEmpty: (id: string) => void
  focusRef: React.MutableRefObject<Map<string, HTMLInputElement>>
}

function AgendaItemRow({
  item,
  onChange,
  onDelete,
  onEnter,
  onBackspaceEmpty,
  focusRef,
}: AgendaItemRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 group py-1"
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="text-stone/20 hover:text-stone/50 transition-colors cursor-grab active:cursor-grabbing flex-shrink-0"
        tabIndex={-1}
      >
        <GripVertical size={12} />
      </button>

      {/* Title input */}
      <input
        ref={el => {
          if (el) focusRef.current.set(item.id, el)
          else focusRef.current.delete(item.id)
        }}
        type="text"
        value={item.title}
        onChange={e => onChange(item.id, { title: e.target.value })}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.preventDefault()
            onEnter(item.id)
          } else if (e.key === 'Backspace' && item.title === '') {
            e.preventDefault()
            onBackspaceEmpty(item.id)
          }
        }}
        placeholder="Agenda item..."
        className="flex-1 min-w-0 bg-transparent text-[13px] text-charcoal
          placeholder:text-stone/25 outline-none border-b border-transparent
          focus:border-stone/20 transition-colors py-0.5"
      />

      {/* Duration chips */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          type="button"
          onClick={() => onChange(item.id, { durationMinutes: undefined })}
          className={`text-[10px] px-1.5 py-0.5 rounded transition-colors
            ${item.durationMinutes == null
              ? 'bg-charcoal text-canvas'
              : 'text-stone/40 hover:text-stone'}`}
        >
          —
        </button>
        {DURATION_OPTIONS.map(d => (
          <button
            key={d}
            type="button"
            onClick={() => onChange(item.id, { durationMinutes: d })}
            className={`text-[10px] px-1.5 py-0.5 rounded transition-colors
              ${item.durationMinutes === d
                ? 'bg-charcoal text-canvas'
                : 'text-stone/40 hover:text-stone'}`}
          >
            {d}
          </button>
        ))}
      </div>

      {/* Delete */}
      <button
        type="button"
        onClick={() => onDelete(item.id)}
        className="text-stone/20 hover:text-red-400 transition-colors flex-shrink-0
          opacity-0 group-hover:opacity-100"
        tabIndex={-1}
      >
        <X size={12} />
      </button>
    </div>
  )
}

interface AgendaItemEditorProps {
  items: AgendaItem[]
  onChange: (items: AgendaItem[]) => void
}

export function AgendaItemEditor({ items, onChange }: AgendaItemEditorProps) {
  const focusRef = useRef<Map<string, HTMLInputElement>>(new Map())
  const sensors = useSensors(useSensor(PointerSensor))

  function handleChange(id: string, patch: Partial<AgendaItem>) {
    onChange(items.map(it => it.id === id ? { ...it, ...patch } : it))
  }

  function handleDelete(id: string) {
    const idx = items.findIndex(it => it.id === id)
    const next = items.filter(it => it.id !== id)
    onChange(next)
    // Focus previous or next item
    const focusId = next[idx - 1]?.id ?? next[idx]?.id
    if (focusId) setTimeout(() => focusRef.current.get(focusId)?.focus(), 0)
  }

  function handleEnter(id: string) {
    const idx = items.findIndex(it => it.id === id)
    const newItem: AgendaItem = { id: uuid(), title: '' }
    const next = [...items.slice(0, idx + 1), newItem, ...items.slice(idx + 1)]
    onChange(next)
    setTimeout(() => focusRef.current.get(newItem.id)?.focus(), 0)
  }

  function handleBackspaceEmpty(id: string) {
    if (items.length <= 1) return
    handleDelete(id)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = items.findIndex(it => it.id === active.id)
    const newIndex = items.findIndex(it => it.id === over.id)
    onChange(arrayMove(items, oldIndex, newIndex))
  }

  function addItem() {
    const newItem: AgendaItem = { id: uuid(), title: '' }
    onChange([...items, newItem])
    setTimeout(() => focusRef.current.get(newItem.id)?.focus(), 0)
  }

  return (
    <div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={items.map(it => it.id)} strategy={verticalListSortingStrategy}>
          {items.map((item, i) => (
            <AgendaItemRow
              key={item.id}
              item={item}
              index={i}
              total={items.length}
              onChange={handleChange}
              onDelete={handleDelete}
              onEnter={handleEnter}
              onBackspaceEmpty={handleBackspaceEmpty}
              focusRef={focusRef}
            />
          ))}
        </SortableContext>
      </DndContext>

      <button
        type="button"
        onClick={addItem}
        className="mt-2 text-[11px] text-stone/40 hover:text-stone transition-colors"
      >
        + Add item
      </button>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/meetings/AgendaItemEditor.tsx
git commit -m "feat: add AgendaItemEditor with sortable rows and duration chips"
```

---

### Task 6: Update MeetingModal

**Files:**
- Modify: `src/components/meetings/MeetingModal.tsx`

**Step 1: Replace `agenda` state with `agendaItems` state**

Replace:
```ts
const [agenda, setAgenda] = useState('')
```
With:
```ts
const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([])
```

**Step 2: Update imports** — add `AgendaItem` from types, `AgendaItemEditor`, and `startMeetingSession` from store

```ts
import { AgendaItemEditor } from './AgendaItemEditor'
import type { AgendaItem } from '../../types'
```

Add `startMeetingSession` to the hook destructure:
```ts
const startMeetingSession = useStore(s => s.startMeetingSession)
```

**Step 3: Update reset/load effects**

In the `isNew` branch, replace `setAgenda('')` with:
```ts
setAgendaItems([])
```

In the `existingMeeting` branch, replace:
```ts
setAgenda(existingMeeting.agenda ?? '')
```
With:
```ts
setAgendaItems(existingMeeting.agendaItems ?? [])
```

**Step 4: Update `meetingData` in `handleSave`**

Replace `agenda: agenda.trim() || undefined` with:
```ts
agendaItems: agendaItems.length > 0 ? agendaItems : undefined,
```

**Step 5: Replace the Agenda textarea with AgendaItemEditor**

Replace the entire agenda `<div>` block:
```tsx
{/* Agenda */}
<div>
  <label className="text-[10px] uppercase tracking-[0.08em] text-stone/50 font-medium mb-2 block">
    Agenda
  </label>
  {agendaItems.length === 0 ? (
    <button
      type="button"
      onClick={() => setAgendaItems([{ id: crypto.randomUUID(), title: '' }])}
      className="text-[12px] text-stone/40 hover:text-stone transition-colors"
    >
      + Add agenda item
    </button>
  ) : (
    <AgendaItemEditor items={agendaItems} onChange={setAgendaItems} />
  )}
</div>
```

**Step 6: Add "Start meeting" button in footer (edit mode only, when agendaItems exist)**

In the footer actions section, add before the Cancel/Save buttons row:
```tsx
{!isNew && existingMeeting && (agendaItems.length > 0) && (
  <button
    type="button"
    onClick={() => {
      handleSave()
      startMeetingSession(existingMeeting.id)
      setOpenMeetingId(null)
    }}
    className="flex items-center gap-1.5 px-4 py-2 text-[12px] font-medium
      text-white bg-green-600 rounded-[6px] hover:bg-green-700 transition-colors"
  >
    Start meeting
  </button>
)}
```

**Step 7: Commit**

```bash
git add src/components/meetings/MeetingModal.tsx
git commit -m "feat: replace agenda textarea with AgendaItemEditor in MeetingModal"
```

---

### Task 7: LiveMeetingPanel component + MeetingsDrawer update

**Files:**
- Create: `src/components/meetings/LiveMeetingPanel.tsx`
- Modify: `src/components/meetings/MeetingsDrawer.tsx`

**Step 1: Create `LiveMeetingPanel.tsx`**

```tsx
import { Square, SkipForward, Pause, Play } from 'lucide-react'
import { useStore } from '../../store'

function formatSeconds(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export function LiveMeetingPanel() {
  const meetingSession = useStore(s => s.meetingSession)
  const meetings = useStore(s => s.meetings)
  const recurringMeetings = useStore(s => s.recurringMeetings)
  const endMeetingSession = useStore(s => s.endMeetingSession)
  const pauseMeetingSession = useStore(s => s.pauseMeetingSession)
  const resumeMeetingSession = useStore(s => s.resumeMeetingSession)
  const advanceMeetingItem = useStore(s => s.advanceMeetingItem)

  if (!meetingSession) return null

  const meeting = [...meetings, ...recurringMeetings].find(
    m => m.id === meetingSession.meetingId
  )
  if (!meeting) return null

  const items = meeting.agendaItems ?? []
  const currentItem = items[meetingSession.currentItemIndex]
  const totalItems = items.length
  const completedCount = meetingSession.completedItemIds.length
  const progress = totalItems > 0 ? completedCount / totalItems : 0

  const isLastItem = meetingSession.currentItemIndex >= totalItems - 1
  const timerExpired = meetingSession.secondsLeft === 0

  return (
    <div className="bg-charcoal/5 border border-charcoal/10 rounded-[10px] p-4 mb-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
          <span className="text-[11px] font-medium text-charcoal uppercase tracking-[0.06em]">
            Live — {meeting.title}
          </span>
        </div>
        <button
          onClick={endMeetingSession}
          className="text-[10px] text-stone/40 hover:text-red-400 transition-colors"
        >
          End
        </button>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-[10px] text-stone/40 mb-1">
          <span>{completedCount} / {totalItems} items</span>
          {meetingSession.secondsLeft != null && (
            <span className={timerExpired ? 'text-red-400' : ''}>
              {timerExpired ? "Time's up" : formatSeconds(meetingSession.secondsLeft)}
            </span>
          )}
        </div>
        <div className="h-1 bg-charcoal/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-charcoal/40 rounded-full transition-all duration-300"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>

      {/* Item list */}
      <div className="space-y-1">
        {items.map((item, i) => {
          const isCompleted = meetingSession.completedItemIds.includes(item.id)
          const isCurrent = i === meetingSession.currentItemIndex
          const isUpcoming = i > meetingSession.currentItemIndex

          return (
            <div
              key={item.id}
              className={`flex items-center gap-2 text-[12px] py-0.5
                ${isCompleted ? 'text-stone/30 line-through' : ''}
                ${isCurrent ? 'text-charcoal font-medium' : ''}
                ${isUpcoming ? 'text-stone/50' : ''}`}
            >
              {isCompleted ? (
                <span className="w-3 text-center text-green-500">✓</span>
              ) : isCurrent ? (
                <span className="w-3 text-center text-amber-500">→</span>
              ) : (
                <span className="w-3" />
              )}
              <span className="flex-1">{item.title}</span>
              {item.durationMinutes != null && (
                <span className="text-[10px] text-stone/30">{item.durationMinutes}m</span>
              )}
            </div>
          )
        })}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between pt-1">
        {meetingSession.secondsLeft != null ? (
          <button
            onClick={meetingSession.isRunning ? pauseMeetingSession : resumeMeetingSession}
            className="flex items-center gap-1.5 text-[11px] text-stone/60 hover:text-charcoal transition-colors"
          >
            {meetingSession.isRunning
              ? <><Pause size={11} /> Pause</>
              : <><Play size={11} /> Resume</>}
          </button>
        ) : (
          <div />
        )}

        <button
          onClick={advanceMeetingItem}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px]
            bg-charcoal text-canvas text-[11px] font-medium
            hover:bg-charcoal/80 transition-colors"
        >
          {isLastItem ? (
            <><Square size={11} /> End meeting</>
          ) : (
            <><SkipForward size={11} /> Next item</>
          )}
        </button>
      </div>
    </div>
  )
}
```

**Step 2: Add `LiveMeetingPanel` to `MeetingsDrawer.tsx`**

Import it at the top:
```ts
import { LiveMeetingPanel } from './LiveMeetingPanel'
```

Add it at the start of the drawer body (just inside `<div className="flex-1 overflow-y-auto px-5 py-4">`):
```tsx
<LiveMeetingPanel />
```

**Step 3: Update `MeetingRow` — replace agenda textarea with agenda items display**

In `MeetingRow`, replace the local `agenda` state and its textarea with a read-only display of `meeting.agendaItems`:

Remove:
```ts
const [agenda, setAgenda] = useState(meeting.agenda ?? '')
```
And remove the `saveField` agenda call and the Agenda textarea block.

Add instead (in the expanded content):
```tsx
{/* Agenda items */}
{(meeting.agendaItems?.length ?? 0) > 0 && (
  <div>
    <div className="text-[10px] uppercase tracking-[0.08em] text-stone/40 font-medium mb-2">
      Agenda
    </div>
    <div className="space-y-1">
      {meeting.agendaItems!.map(item => (
        <div key={item.id} className="flex items-center gap-2 text-[12px] text-charcoal/80">
          <span className="w-1 h-1 rounded-full bg-stone/30 flex-shrink-0" />
          <span className="flex-1">{item.title}</span>
          {item.durationMinutes != null && (
            <span className="text-[10px] text-stone/30">{item.durationMinutes}m</span>
          )}
        </div>
      ))}
    </div>
    <button
      type="button"
      onClick={() => {
        startMeetingSession(meeting.id)
      }}
      className="mt-2 text-[11px] text-stone/50 hover:text-charcoal transition-colors"
    >
      ▶ Start meeting
    </button>
  </div>
)}
```

Add `startMeetingSession` from store in `MeetingRow`:
```ts
const startMeetingSession = useStore(s => s.startMeetingSession)
```

**Step 4: Commit**

```bash
git add src/components/meetings/LiveMeetingPanel.tsx src/components/meetings/MeetingsDrawer.tsx
git commit -m "feat: add LiveMeetingPanel and wire into MeetingsDrawer"
```

---

### Task 8: SmartFab meeting session label

**Files:**
- Modify: `src/components/ui/SmartFab.tsx`

**Step 1: Read `meetingSession` from store**

Add after `focusSession`:
```ts
const meetingSession = useStore(s => s.meetingSession)
```

**Step 2: Derive meeting label**

Add after `focusLabel`:
```ts
const meetings = useStore(s => s.meetings)
const recurringMeetings = useStore(s => s.recurringMeetings)
const activeMeeting = meetingSession
  ? [...meetings, ...recurringMeetings].find(m => m.id === meetingSession.meetingId)
  : null
const meetingLabel = activeMeeting
  ? `${activeMeeting.title} · Back to agenda`
  : null
```

**Step 3: Update label priority**

```ts
const label = focusLabel
  ?? meetingLabel
  ?? (!isPlanned ? 'Plan today' : isAfterThree && !isTomorrowPlanned ? 'Plan tomorrow?' : null)
```

**Step 4: Update `handlePrimaryClick`**

Add `onOpenMeetings` prop to `SmartFabProps` (it's already there). Add handling:
```ts
function handlePrimaryClick() {
  if (focusLabel) {
    showCitadelOverlay()
  } else if (meetingLabel) {
    onOpenMeetings()
  } else if (label === 'Plan today') {
    onPlanToday()
  } else if (label === 'Plan tomorrow?') {
    onPlanTomorrow()
  } else {
    setOpen(o => !o)
  }
}
```

**Step 5: Update label rendering** — add amber dot for meeting label

```tsx
{label && !open && (
  <button
    onClick={handlePrimaryClick}
    className={`flex items-center gap-2 px-4 py-2.5 rounded-[10px]
      bg-card border border-border
      shadow-[0_4px_20px_rgba(42,39,36,0.10)]
      hover:shadow-[0_4px_28px_rgba(42,39,36,0.15)]
      hover:border-stone/30
      transition-all duration-200
      ${focusLabel ? 'animate-pulse-focus' : meetingLabel ? 'animate-pulse-focus' : 'animate-pulse-label'}`}
  >
    {focusLabel ? (
      <>
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-focus-dot shrink-0" />
        <span className="text-[12px] font-medium text-charcoal">{label}</span>
      </>
    ) : meetingLabel ? (
      <>
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-focus-dot shrink-0" />
        <span className="text-[12px] font-medium text-charcoal">{label}</span>
      </>
    ) : (
      <span className="font-serif text-[14px] text-charcoal/80 italic">{label}</span>
    )}
  </button>
)}
```

**Step 6: Commit**

```bash
git add src/components/ui/SmartFab.tsx
git commit -m "feat: add meeting session label to SmartFab with amber dot"
```

---

### Task 9: TypeScript check + build verify

**Step 1: Run type check**

```bash
cd "/Users/beer/Vandaag App" && npx tsc -b --noEmit 2>&1 | head -60
```

Expected: no errors. Fix any type errors before proceeding.

**Step 2: Run build**

```bash
cd "/Users/beer/Vandaag App" && npm run build 2>&1 | tail -20
```

Expected: `✓ built in Xs`

**Step 3: Final commit if needed**

```bash
git add -p
git commit -m "fix: resolve TypeScript errors in meeting agenda timer"
```
