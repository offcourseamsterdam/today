# Meetings Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a dedicated Meetings page (upcoming + history) as a first-class nav view, plus smart end-meeting redirects that send you directly to the right place.

**Architecture:** New `meetings` ActiveView renders `MeetingsPage` (two-column: upcoming left, history right). Store gains `justEndedMeetingId` + `endAndRedirectMeeting` action. End button in `LiveAgendaPanel` calls the new action, which branches: project-linked → open project modal on Meetings tab; standalone → navigate to Meetings page with the row auto-expanded.

**Tech Stack:** React 19, TypeScript strict, Zustand, Tailwind CSS 4, Lucide icons, date-fns

---

### Task 1: Store — add `meetings` view + `justEndedMeetingId`

**Files:**
- Modify: `src/store/types.ts`
- Modify: `src/store/index.ts`

**Step 1: Add `'meetings'` to `ActiveView` and `justEndedMeetingId` to state**

In `src/store/types.ts`, change:
```ts
export type ActiveView = 'vandaag' | 'kanban' | 'planning' | 'philosophy'
```
to:
```ts
export type ActiveView = 'vandaag' | 'kanban' | 'planning' | 'philosophy' | 'meetings'
```

Add to `VandaagState` interface (near `openMeetingId`):
```ts
justEndedMeetingId: string | null  // auto-expands this meeting in History after ending
```

**Step 2: Initialise in store**

In `src/store/index.ts`, in the initial state object (around where `openMeetingId: null` is set), add:
```ts
justEndedMeetingId: null,
```

**Step 3: Exclude from persist partialize**

In `src/store/index.ts`, find the `partialize` function and add `justEndedMeetingId` to the excluded keys (alongside `swapModalProjectId`, `artworkLoadingIds`, etc):
```ts
const { justEndedMeetingId, swapModalProjectId, artworkLoadingIds, ...rest } = state
return rest
```

**Step 4: TypeScript check**
```bash
cd "/Users/beer/Vandaag App" && npx tsc --noEmit
```
Expected: no errors.

**Step 5: Commit**
```bash
git add src/store/types.ts src/store/index.ts
git commit -m "feat: add meetings ActiveView and justEndedMeetingId to store"
```

---

### Task 2: Store — `endAndRedirectMeeting` action

**Files:**
- Modify: `src/store/meetingSessionSlice.ts`
- Modify: `src/store/types.ts` (add action signature)

**Step 1: Add action to `VandaagState` interface**

In `src/store/types.ts`, in the actions area (near meeting session actions), add:
```ts
endAndRedirectMeeting: (meetingId: string) => void
clearJustEndedMeeting: () => void
```

**Step 2: Implement the action in `meetingSessionSlice.ts`**

Add to the returned object of `makeMeetingSessionActions`:
```ts
endAndRedirectMeeting: (meetingId: string) => {
  const state = get()
  const allMeetings = [...state.meetings, ...state.recurringMeetings]
  const meeting = allMeetings.find(m => m.id === meetingId)

  // End the session
  set({ meetingSession: null, isLiveMeetingOpen: false, openMeetingId: null })

  if (meeting?.projectId) {
    const projectExists = state.projects.some(p => p.id === meeting.projectId)
    if (projectExists) {
      // Redirect to project modal — Meetings tab, row auto-expanded
      set({
        openProjectId: meeting.projectId,
        projectModalDefaultTab: 'meetings',
        justEndedMeetingId: meetingId,
      })
      return
    }
  }

  // Standalone meeting — navigate to Meetings page
  set({
    activeView: 'meetings',
    justEndedMeetingId: meetingId,
  })
},
clearJustEndedMeeting: () => set({ justEndedMeetingId: null }),
```

> Note: `openProjectId` and `projectModalDefaultTab` are both store state. `projectModalDefaultTab` needs to be added (see Task 3).

**Step 3: TypeScript check**
```bash
npx tsc --noEmit
```

**Step 4: Commit**
```bash
git add src/store/meetingSessionSlice.ts src/store/types.ts
git commit -m "feat: add endAndRedirectMeeting action with project/standalone branching"
```

---

### Task 3: Store — `projectModalDefaultTab`

The project modal needs to know which tab to open when redirected from a meeting end.

**Files:**
- Modify: `src/store/types.ts`
- Modify: `src/store/index.ts`
- Modify: `src/store/projectsSlice.ts` (or wherever `setOpenProjectId` lives)

**Step 1: Add to `VandaagState`**

In `src/store/types.ts`:
```ts
projectModalDefaultTab: string | null  // e.g. 'meetings' — consumed once by ProjectModal
```

**Step 2: Initialise**

In `src/store/index.ts` initial state:
```ts
projectModalDefaultTab: null,
```

Add to `partialize` exclusions (it's transient UI state):
```ts
const { justEndedMeetingId, projectModalDefaultTab, swapModalProjectId, artworkLoadingIds, ...rest } = state
return rest
```

**Step 3: Add clear action**

In `src/store/types.ts` actions:
```ts
clearProjectModalDefaultTab: () => void
```

In whichever slice handles project UI (likely `projectsSlice.ts`), add:
```ts
clearProjectModalDefaultTab: () => set({ projectModalDefaultTab: null }),
```

**Step 4: TypeScript check + commit**
```bash
npx tsc --noEmit
git add src/store/types.ts src/store/index.ts src/store/projectsSlice.ts
git commit -m "feat: add projectModalDefaultTab transient store state"
```

---

### Task 4: Wire `ProjectModal` to consume `projectModalDefaultTab`

**Files:**
- Modify: `src/components/kanban/ProjectModal.tsx`

**Step 1: Read the current tab logic in `ProjectModal.tsx`**

Find how the active tab is managed — look for `useState` with tab values like `'tasks'`, `'notes'`, `'meetings'`.

**Step 2: Consume `projectModalDefaultTab` on mount**

At the top of `ProjectModal`, read from store:
```ts
const projectModalDefaultTab = useStore(s => s.projectModalDefaultTab)
const clearProjectModalDefaultTab = useStore(s => s.clearProjectModalDefaultTab)
```

Change the tab `useState` initialiser to use it:
```ts
const [activeTab, setActiveTab] = useState<'tasks' | 'notes' | 'meetings'>(
  (projectModalDefaultTab as 'tasks' | 'notes' | 'meetings') ?? 'tasks'
)
```

And clear it immediately after consuming (use `useEffect` that runs once):
```ts
useEffect(() => {
  if (projectModalDefaultTab) clearProjectModalDefaultTab()
}, []) // eslint-disable-line react-hooks/exhaustive-deps
```

**Step 3: TypeScript check + commit**
```bash
npx tsc --noEmit
git add src/components/kanban/ProjectModal.tsx
git commit -m "feat: ProjectModal opens on default tab when set from store"
```

---

### Task 5: Wire End button in `LiveAgendaPanel`

**Files:**
- Modify: `src/components/meetings/LiveAgendaPanel.tsx`

**Step 1: Replace End button logic**

Currently:
```ts
const setOpenMeetingId = useStore(s => s.setOpenMeetingId)
// ...
onClick={() => {
  const meetingId = session.meetingId
  endMeetingSession()
  setOpenMeetingId(meetingId)
}}
```

Replace with:
```ts
const endAndRedirectMeeting = useStore(s => s.endAndRedirectMeeting)
// ...
onClick={() => endAndRedirectMeeting(session.meetingId)}
```

Remove the now-unused `setOpenMeetingId` import (only if not used elsewhere in the file — check first).

**Step 2: TypeScript check + commit**
```bash
npx tsc --noEmit
git add src/components/meetings/LiveAgendaPanel.tsx
git commit -m "feat: End button redirects to project or meetings page after session"
```

---

### Task 6: Create `HistoryColumn` component

The right column of the Meetings page: searchable past meeting notes.

**Files:**
- Create: `src/components/meetings/HistoryColumn.tsx`

**Step 1: Create the component**

```tsx
// src/components/meetings/HistoryColumn.tsx
import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import { useStore } from '../../store'
import { OUTCOME_CONFIG } from './MeetingNotesDisplay'
import type { Meeting } from '../../types'

function searchMeeting(m: Meeting, q: string): boolean {
  const lower = q.toLowerCase()
  if (m.title.toLowerCase().includes(lower)) return true
  const notes = m.meetingNotes
  if (!notes) return false
  if (notes.summary?.toLowerCase().includes(lower)) return true
  if (notes.decisions?.some(d => d.toLowerCase().includes(lower))) return true
  if (notes.actionItems?.some(a => a.description.toLowerCase().includes(lower))) return true
  if (notes.agendaItemNotes?.some(n =>
    n.agendaItemTitle.toLowerCase().includes(lower) ||
    n.summary?.toLowerCase().includes(lower) ||
    n.decisions?.some(d => d.toLowerCase().includes(lower)) ||
    n.actionItems?.some(a => a.description.toLowerCase().includes(lower))
  )) return true
  return false
}

interface HistoryRowProps {
  meeting: Meeting
  defaultExpanded?: boolean
}

function HistoryRow({ meeting, defaultExpanded = false }: HistoryRowProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const clearJustEndedMeeting = useStore(s => s.clearJustEndedMeeting)
  const setOpenProjectId = useStore(s => s.setOpenProjectId)
  const projects = useStore(s => s.projects)
  const notes = meeting.meetingNotes
  const outcome = notes?.outcome ? OUTCOME_CONFIG[notes.outcome] : null
  const project = meeting.projectId ? projects.find(p => p.id === meeting.projectId) : null
  const dateLabel = meeting.date ?? notes?.generatedAt?.slice(0, 10) ?? ''

  function handleToggle() {
    if (!expanded && defaultExpanded) clearJustEndedMeeting()
    setExpanded(e => !e)
  }

  const agendaItemNotes = notes?.agendaItemNotes ?? []
  const topDecisions = notes?.decisions ?? []
  const topActions = notes?.actionItems ?? []

  return (
    <div className="border-b border-border/40 last:border-0">
      <button
        onClick={handleToggle}
        className="w-full flex items-center gap-3 py-3 text-left hover:bg-stone/5 rounded transition-colors group"
      >
        <span className={`w-[6px] h-[6px] rounded-full flex-shrink-0 transition-colors ${
          notes ? 'bg-stone/30' : 'bg-transparent border border-stone/20'
        }`} />
        <span className="text-[11px] text-stone/35 flex-shrink-0 w-[80px]">{dateLabel}</span>
        <span className="text-[13px] text-charcoal flex-1 min-w-0 truncate">{meeting.title}</span>
        {project && (
          <button
            onClick={e => { e.stopPropagation(); setOpenProjectId(project.id) }}
            className="text-[10px] text-stone/40 hover:text-charcoal px-1.5 py-0.5 rounded
              border border-border/60 hover:border-stone/30 transition-colors flex-shrink-0"
          >
            {project.title}
          </button>
        )}
        {outcome && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${outcome.color}`}>
            {outcome.label}
          </span>
        )}
        {!notes && (
          <span className="text-[10px] text-stone/25 italic flex-shrink-0">no recording</span>
        )}
      </button>

      {expanded && notes && (
        <div className="pb-4 pl-[22px] pr-2 space-y-3 animate-slide-up">
          {notes.summary && (
            <p className="text-[13px] text-charcoal/70 leading-relaxed">{notes.summary}</p>
          )}

          {agendaItemNotes.length > 0 && (
            <div className="space-y-3">
              {agendaItemNotes.map(itemNote => (
                <div key={itemNote.agendaItemId}>
                  <div className="text-[10px] font-medium text-stone/50 uppercase tracking-[0.06em] mb-1">
                    {itemNote.agendaItemTitle}
                  </div>
                  {itemNote.summary && (
                    <p className="text-[12px] text-charcoal/70 leading-relaxed mb-1">{itemNote.summary}</p>
                  )}
                  {(itemNote.decisions ?? []).map((d, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-[12px] text-charcoal/70">
                      <span className="text-green-600 mt-0.5 flex-shrink-0">✔</span>
                      <span>{d}</span>
                    </div>
                  ))}
                  {(itemNote.actionItems ?? []).map((a, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-[12px] text-charcoal/70">
                      <span className="text-amber-500 mt-0.5 flex-shrink-0">→</span>
                      <span>{a.description}</span>
                      {a.assignee && (
                        <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-500 font-medium flex-shrink-0">
                          {a.assignee}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {agendaItemNotes.length === 0 && (
            <>
              {topDecisions.map((d, i) => (
                <div key={i} className="flex items-start gap-1.5 text-[12px] text-charcoal/70">
                  <span className="text-green-600 mt-0.5 flex-shrink-0">✔</span>
                  <span>{d}</span>
                </div>
              ))}
              {topActions.map((a, i) => (
                <div key={i} className="flex items-start gap-1.5 text-[12px] text-charcoal/70">
                  <span className="text-amber-500 mt-0.5 flex-shrink-0">→</span>
                  <span>{a.description}</span>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}

export function HistoryColumn() {
  const meetings = useStore(s => s.meetings)
  const justEndedMeetingId = useStore(s => s.justEndedMeetingId)
  const [query, setQuery] = useState('')

  const today = new Date().toISOString().slice(0, 10)

  const pastMeetings = useMemo(() =>
    meetings
      .filter(m => m.date && m.date <= today)
      .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')),
    [meetings, today]
  )

  const filtered = useMemo(() =>
    query.trim()
      ? pastMeetings.filter(m => searchMeeting(m, query))
      : pastMeetings,
    [pastMeetings, query]
  )

  return (
    <div className="flex flex-col h-full">
      {/* Search bar */}
      <div className="px-6 py-4 border-b border-border/60">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone/30" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search notes, decisions, actions..."
            className="w-full pl-8 pr-3 py-2 rounded-[6px] border border-border bg-canvas
              text-[12px] text-charcoal placeholder:text-stone/30
              outline-none focus:border-stone/40 transition-colors"
          />
        </div>
      </div>

      {/* History list */}
      <div className="flex-1 overflow-y-auto px-6 py-3">
        {filtered.length === 0 ? (
          <p className="text-[12px] text-stone/30 italic py-8 text-center">
            {query ? 'No matches found' : 'No past meetings yet'}
          </p>
        ) : (
          filtered.map(m => (
            <HistoryRow
              key={m.id}
              meeting={m}
              defaultExpanded={m.id === justEndedMeetingId}
            />
          ))
        )}
      </div>
    </div>
  )
}
```

**Step 2: TypeScript check**
```bash
npx tsc --noEmit
```

**Step 3: Commit**
```bash
git add src/components/meetings/HistoryColumn.tsx
git commit -m "feat: HistoryColumn — searchable past meeting notes with inline expand"
```

---

### Task 7: Create `UpcomingColumn` component

The left column: upcoming meetings grouped by Today / This week / Later.

**Files:**
- Create: `src/components/meetings/UpcomingColumn.tsx`

**Step 1: Create the component**

```tsx
// src/components/meetings/UpcomingColumn.tsx
import { useMemo } from 'react'
import { format, addDays, endOfWeek, parseISO } from 'date-fns'
import { Plus, RotateCcw } from 'lucide-react'
import { useStore } from '../../store'
import { isDueToday } from '../../lib/recurrence'
import type { Meeting, RecurrenceRule } from '../../types'

function getNextOccurrences(rule: RecurrenceRule, n: number, from: Date = new Date()): Date[] {
  const results: Date[] = []
  const d = new Date(from)
  let tries = 0
  while (results.length < n && tries < 365) {
    if (isDueToday(rule, d)) results.push(new Date(d))
    d.setDate(d.getDate() + 1)
    tries++
  }
  return results
}

function MeetingItem({ meeting, onOpen }: { meeting: Meeting; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="w-full flex items-center gap-2.5 py-2 px-2 text-left hover:bg-stone/5
        rounded-[6px] transition-colors group"
    >
      <span className="text-[11px] text-stone/40 flex-shrink-0 w-[38px]">{meeting.time}</span>
      <span className="text-[13px] text-charcoal flex-1 min-w-0 truncate">{meeting.title}</span>
      {meeting.durationMinutes && (
        <span className="text-[10px] text-stone/30 flex-shrink-0">
          {meeting.durationMinutes < 60 ? `${meeting.durationMinutes}m` : `${meeting.durationMinutes / 60}h`}
        </span>
      )}
    </button>
  )
}

function Section({ label, meetings: items, onOpen }: {
  label: string
  meetings: Meeting[]
  onOpen: (id: string) => void
}) {
  if (items.length === 0) return null
  return (
    <div className="mb-4">
      <div className="text-[10px] uppercase tracking-[0.08em] text-stone/35 font-medium mb-1 px-2">
        {label}
      </div>
      {items.map(m => (
        <MeetingItem key={m.id} meeting={m} onOpen={() => onOpen(m.id)} />
      ))}
    </div>
  )
}

export function UpcomingColumn() {
  const meetings = useStore(s => s.meetings)
  const recurringMeetings = useStore(s => s.recurringMeetings)
  const setOpenMeetingId = useStore(s => s.setOpenMeetingId)
  const spawnRecurringOccurrence = useStore(s => s.spawnRecurringOccurrence)
  const addMeeting = useStore(s => s.addMeeting)

  const now = new Date()
  const todayStr = format(now, 'yyyy-MM-dd')
  const nowTime = format(now, 'HH:mm')
  const tomorrowStr = format(addDays(now, 1), 'yyyy-MM-dd')
  const thisWeekEnd = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')

  function isPast(m: Meeting): boolean {
    if (!m.date) return false
    if (m.date < todayStr) return true
    if (m.date === todayStr && m.time < nowTime) return true
    return false
  }

  function handleOpen(id: string) {
    const isRecurring = recurringMeetings.some(m => m.id === id)
    if (isRecurring) {
      const occId = spawnRecurringOccurrence(id)
      setOpenMeetingId(occId)
    } else {
      setOpenMeetingId(id)
    }
  }

  // Flatten recurring templates into their next occurrence for sorting
  const recurringAsToday = useMemo(() => {
    return recurringMeetings.filter(m => m.recurrenceRule && isDueToday(m.recurrenceRule, now))
  }, [recurringMeetings]) // eslint-disable-line react-hooks/exhaustive-deps

  const { todayItems, tomorrowItems, thisWeekItems, laterItems } = useMemo(() => {
    const oneOff = meetings.filter(m => !isPast(m))
    return {
      todayItems: [
        ...oneOff.filter(m => !m.date || m.date === todayStr).sort((a, b) => a.time.localeCompare(b.time)),
        ...recurringAsToday.sort((a, b) => a.time.localeCompare(b.time)),
      ],
      tomorrowItems: oneOff.filter(m => m.date === tomorrowStr).sort((a, b) => a.time.localeCompare(b.time)),
      thisWeekItems: oneOff.filter(m => m.date && m.date > tomorrowStr && m.date <= thisWeekEnd)
        .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? '') || a.time.localeCompare(b.time)),
      laterItems: oneOff.filter(m => m.date && m.date > thisWeekEnd)
        .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? '') || a.time.localeCompare(b.time)),
    }
  }, [meetings, recurringAsToday, todayStr, tomorrowStr, thisWeekEnd]) // eslint-disable-line react-hooks/exhaustive-deps

  const hasAnything = todayItems.length + tomorrowItems.length + thisWeekItems.length + laterItems.length > 0

  return (
    <div className="flex flex-col h-full border-r border-border">
      {/* Header */}
      <div className="px-6 py-5 border-b border-border/60 flex items-center justify-between">
        <h2 className="text-[11px] uppercase tracking-[0.08em] text-stone/50 font-medium">Upcoming</h2>
        <button
          onClick={() => setOpenMeetingId('new')}
          className="flex items-center gap-1 text-[11px] text-stone/40 hover:text-charcoal
            transition-colors px-2 py-1 rounded border border-border hover:border-stone/30"
        >
          <Plus size={11} />
          New
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {!hasAnything && (
          <p className="text-[12px] text-stone/30 italic px-2 py-8 text-center">No upcoming meetings</p>
        )}
        <Section label="Today" meetings={todayItems} onOpen={handleOpen} />
        <Section label="Tomorrow" meetings={tomorrowItems} onOpen={handleOpen} />
        <Section label="This week" meetings={thisWeekItems} onOpen={handleOpen} />
        <Section label="Later" meetings={laterItems} onOpen={handleOpen} />
      </div>
    </div>
  )
}
```

**Step 2: TypeScript check + commit**
```bash
npx tsc --noEmit
git add src/components/meetings/UpcomingColumn.tsx
git commit -m "feat: UpcomingColumn — grouped upcoming meetings with new meeting button"
```

---

### Task 8: Create `MeetingsPage` root component

**Files:**
- Create: `src/components/meetings/MeetingsPage.tsx`

**Step 1: Create the page**

```tsx
// src/components/meetings/MeetingsPage.tsx
import { UpcomingColumn } from './UpcomingColumn'
import { HistoryColumn } from './HistoryColumn'

export function MeetingsPage() {
  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 pb-12">
      <div className="flex gap-0 border border-border rounded-[12px] overflow-hidden
        bg-canvas shadow-sm" style={{ minHeight: 'calc(100vh - 180px)' }}>
        {/* Left: Upcoming (35%) */}
        <div className="w-[35%] flex-shrink-0 flex flex-col min-h-0">
          <UpcomingColumn />
        </div>
        {/* Right: History (65%) */}
        <div className="flex-1 flex flex-col min-h-0">
          <HistoryColumn />
        </div>
      </div>
    </div>
  )
}
```

**Step 2: TypeScript check + commit**
```bash
npx tsc --noEmit
git add src/components/meetings/MeetingsPage.tsx
git commit -m "feat: MeetingsPage root — two-column upcoming + history layout"
```

---

### Task 9: Wire `MeetingsPage` into `App.tsx` with nav icon

**Files:**
- Modify: `src/App.tsx`

**Step 1: Add lazy import**

Near the other lazy imports at the top of `App.tsx`:
```ts
const MeetingsPage = lazy(() => import('./components/meetings/MeetingsPage').then(m => ({ default: m.MeetingsPage })))
```

**Step 2: Add nav icon**

Find the nav bar area in `App.tsx` (the `<header>` section). Add a calendar icon button after the existing nav buttons. Import `Calendar` from `lucide-react`.

```tsx
<button
  onClick={() => setActiveView('meetings')}
  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-[12px] transition-colors
    ${activeView === 'meetings'
      ? 'bg-charcoal text-canvas'
      : 'text-stone/60 hover:text-charcoal hover:bg-stone/8'}`}
>
  <Calendar size={13} />
  Meetings
</button>
```

Place this button near where Vandaag / Kanban / Philosophy navigation exists (look for `setActiveView` calls in the nav area).

**Step 3: Render `MeetingsPage` in the main content switch**

In the `<main>` section, find:
```tsx
{activeView === 'philosophy' ? (
  <Suspense fallback={null}><PhilosophyPage ... /></Suspense>
) : activeView === 'planning' ? (
  <PlanningMode ... />
) : (
  <>
    <VandaagView ... />
    <KanbanBoard ... />
  </>
)}
```

Change to:
```tsx
{activeView === 'philosophy' ? (
  <Suspense fallback={null}><PhilosophyPage ... /></Suspense>
) : activeView === 'planning' ? (
  <PlanningMode ... />
) : activeView === 'meetings' ? (
  <Suspense fallback={null}><MeetingsPage /></Suspense>
) : (
  <>
    <VandaagView ... />
    <KanbanBoard ... />
  </>
)}
```

**Step 4: TypeScript check**
```bash
npx tsc --noEmit
```

**Step 5: Commit**
```bash
git add src/App.tsx
git commit -m "feat: add Meetings nav item and render MeetingsPage as active view"
```

---

### Task 10: Auto-expand `justEndedMeetingId` in `ProjectModalMeetings`

When redirected from a meeting end to the project modal, the just-ended meeting's row should be auto-expanded in the Meetings tab.

**Files:**
- Modify: `src/components/kanban/ProjectModalMeetings.tsx`

**Step 1: Consume `justEndedMeetingId` in `PastMeetingRow`**

In `PastMeetingRow`, read from store:
```ts
const justEndedMeetingId = useStore(s => s.justEndedMeetingId)
const clearJustEndedMeeting = useStore(s => s.clearJustEndedMeeting)
```

Change the `expanded` useState initialiser:
```ts
const [expanded, setExpanded] = useState(meeting.id === justEndedMeetingId)
```

Add a `useEffect` to clear `justEndedMeetingId` when this row mounts expanded:
```ts
useEffect(() => {
  if (meeting.id === justEndedMeetingId) clearJustEndedMeeting()
}, []) // eslint-disable-line react-hooks/exhaustive-deps
```

**Step 2: TypeScript check + commit**
```bash
npx tsc --noEmit
git add src/components/kanban/ProjectModalMeetings.tsx
git commit -m "feat: auto-expand just-ended meeting row in project modal meetings tab"
```

---

### Task 11: Manual QA + Deploy

**Step 1: Verify end-meeting → project redirect**
1. Start a meeting that is linked to a project
2. Click End
3. ✅ Project modal opens on Meetings tab
4. ✅ That meeting's row is expanded showing notes

**Step 2: Verify end-meeting → meetings page redirect**
1. Start a meeting with no linked project (e.g. Quick meeting)
2. Click End
3. ✅ Navigates to Meetings page
4. ✅ History column shows that meeting expanded at top

**Step 3: Verify Meetings page**
1. Click Meetings in nav
2. ✅ Left column: upcoming meetings grouped by Today/Tomorrow/This week
3. ✅ Right column: past meetings with search
4. ✅ Search filters across titles, decisions, actions

**Step 4: Verify new meeting flow**
1. On Meetings page, click "+ New" in Upcoming column
2. ✅ Opens unified meeting modal (MeetingPrePanel)

**Step 5: Deploy**
```bash
cd "/Users/beer/Vandaag App" && npx vercel --prod
```
