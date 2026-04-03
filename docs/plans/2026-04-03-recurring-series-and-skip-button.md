# Recurring Series Panel + Focus Skip Button Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** (1) Show a unified recurring-meeting series view (upcoming + past occurrences) when a recurring template is selected in the Meetings inbox. (2) Add a Skip button to CitadelMode that advances to the next focus/break phase while counting the skipped session as complete.

**Architecture:** The recurring panel is a new `RecurringSeriesPanel.tsx` component routed from `MeetingsPage` when the selected meeting is a template. The skip button is a new `skipFocusPhase` store action mirroring the existing timer phase-transition logic in `focusSlice.ts`, wired to a small button in `CitadelMode.tsx`.

**Tech Stack:** React 19, TypeScript strict, Zustand, Tailwind CSS 4, dnd-kit, date-fns, Lucide icons, `getNextOccurrences` from `src/lib/recurrence.ts`

---

### Task 1: Add `skipFocusPhase` store action

**Files:**
- Modify: `src/store/focusSlice.ts`
- Modify: `src/store/types.ts`

**Step 1: Add `skipFocusPhase` to types**

In `src/store/types.ts`, find the focus actions block (around line 71–73):
```ts
  pauseFocusSession: () => void
  resumeFocusSession: () => void
  resetFocusSession: () => void
```
Add after `resetFocusSession`:
```ts
  skipFocusPhase: () => void
```

**Step 2: Implement `skipFocusPhase` in focusSlice.ts**

In `src/store/focusSlice.ts`, add this action after `resetFocusSession`:
```ts
skipFocusPhase: () => {
  const { focusSession } = get()
  if (!focusSession) return

  if (!focusSession.isBreak) {
    // Skipping a work phase — counts as a completed session
    const newSessionsCompleted = focusSession.sessionsCompleted + 1
    get().logPomodoroSession(focusSession.taskId, focusSession.tier, focusSession.workMinutes)

    if (focusSession.breakMinutes === 0) {
      set({
        focusSession: {
          ...focusSession,
          sessionsCompleted: newSessionsCompleted,
          isBreak: false,
          secondsLeft: focusSession.workMinutes * 60,
          isRunning: false,
          lastTickAt: new Date().toISOString(),
        },
      })
    } else {
      set({
        focusSession: {
          ...focusSession,
          sessionsCompleted: newSessionsCompleted,
          isBreak: true,
          secondsLeft: focusSession.breakMinutes * 60,
          isRunning: false,
          lastTickAt: new Date().toISOString(),
        },
      })
    }
  } else {
    // Skipping a break — just move to next work phase
    set({
      focusSession: {
        ...focusSession,
        isBreak: false,
        secondsLeft: focusSession.workMinutes * 60,
        isRunning: false,
        lastTickAt: new Date().toISOString(),
      },
    })
  }
},
```

**Step 3: TypeScript check**
```bash
npx tsc --noEmit
```
Expected: no errors.

**Step 4: Commit**
```bash
git add src/store/focusSlice.ts src/store/types.ts
git commit -m "feat: add skipFocusPhase action to focus store"
```

---

### Task 2: Add Skip button to CitadelMode

**Files:**
- Modify: `src/components/vandaag/CitadelMode.tsx`

**Step 1: Wire the action**

In `CitadelMode.tsx`, find where the other store actions are selected (lines ~14–18):
```ts
const resetFocusSession = useStore(s => s.resetFocusSession)
```
Add below it:
```ts
const skipFocusPhase = useStore(s => s.skipFocusPhase)
```

**Step 2: Add the `SkipForward` import**

Find the lucide import at the top:
```ts
import { Play, Pause, RotateCcw, ArrowLeft, NotebookPen, X } from 'lucide-react'
```
Add `SkipForward`:
```ts
import { Play, Pause, RotateCcw, SkipForward, ArrowLeft, NotebookPen, X } from 'lucide-react'
```

**Step 3: Add handler and button**

After `handleReset`, add:
```ts
function handleSkip() {
  skipFocusPhase()
}
```

Find the timer controls row in the JSX that has the reset and play/pause buttons. Add the Skip button next to reset:
```tsx
<button
  onClick={handleSkip}
  title={isBreak ? 'Skip break' : 'Skip to break'}
  className="w-9 h-9 flex items-center justify-center rounded-full
    text-citadel-muted hover:text-citadel-text transition-colors"
>
  <SkipForward size={14} />
</button>
```

Place it after the play/pause button (or after reset — match the visual order: Reset · Play/Pause · Skip).

**Step 4: TypeScript check**
```bash
npx tsc --noEmit
```
Expected: no errors.

**Step 5: Commit**
```bash
git add src/components/vandaag/CitadelMode.tsx
git commit -m "feat: add skip button to CitadelMode focus overlay"
```

---

### Task 3: Update `spawnRecurringOccurrence` to accept a date

**Files:**
- Modify: `src/store/meetingsSlice.ts`
- Modify: `src/store/types.ts`

**Step 1: Update type signature**

In `src/store/types.ts`, find:
```ts
spawnRecurringOccurrence: (templateId: string) => string
```
Change to:
```ts
spawnRecurringOccurrence: (templateId: string, date?: string) => string
```

**Step 2: Update implementation**

In `src/store/meetingsSlice.ts`, find:
```ts
spawnRecurringOccurrence: (templateId: string): string => {
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const existing = get().meetings.find(
    m => m.recurringMeetingId === templateId && m.date === todayStr
  )
  if (existing) return existing.id
```
Change to:
```ts
spawnRecurringOccurrence: (templateId: string, date?: string): string => {
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const targetDate = date ?? todayStr
  const existing = get().meetings.find(
    m => m.recurringMeetingId === templateId && m.date === targetDate
  )
  if (existing) return existing.id
```
Then find the `date: todayStr` line in the `occurrence` object and change to:
```ts
date: targetDate,
```

**Step 3: TypeScript check**
```bash
npx tsc --noEmit
```
Expected: no errors (existing callers pass no date → still works).

**Step 4: Commit**
```bash
git add src/store/meetingsSlice.ts src/store/types.ts
git commit -m "feat: spawnRecurringOccurrence accepts optional date param"
```

---

### Task 4: Create `RecurringSeriesPanel.tsx`

**Files:**
- Create: `src/components/meetings/RecurringSeriesPanel.tsx`

This is the main new component. Build it section by section.

**Step 1: Scaffold the component with imports and props**

```tsx
// src/components/meetings/RecurringSeriesPanel.tsx
import { useState, useMemo } from 'react'
import { format, parseISO, isFuture, isToday } from 'date-fns'
import { nl } from 'date-fns/locale'
import { RotateCcw, ChevronDown, ChevronRight, Calendar } from 'lucide-react'
import { useStore } from '../../store'
import { getNextOccurrences, describeRule } from '../../lib/recurrence'
import { MeetingInlineCard } from './MeetingInlineCard'
import { MeetingNotesDisplay, OUTCOME_CONFIG } from './MeetingNotesDisplay'
import type { Meeting } from '../../types'

interface RecurringSeriesPanelProps {
  template: Meeting
  onBeginMeeting: (occurrenceId: string) => void
  onDelete: () => void
}

function formatShortDate(dateStr: string): string {
  return format(parseISO(dateStr), 'EEEE d MMM', { locale: nl })
}
```

**Step 2: Build the component**

```tsx
export function RecurringSeriesPanel({ template, onBeginMeeting, onDelete }: RecurringSeriesPanelProps) {
  const meetings = useStore(s => s.meetings)
  const spawnRecurringOccurrence = useStore(s => s.spawnRecurringOccurrence)
  const startMeetingSession = useStore(s => s.startMeetingSession)
  const setLiveMeetingOpen = useStore(s => s.setLiveMeetingOpen)

  const [schemaOpen, setSchemaOpen] = useState(false)
  const [expandedPastId, setExpandedPastId] = useState<string | null>(null)
  const [expandedOccurrenceId, setExpandedOccurrenceId] = useState<string | null>(null)
  const [showAllPast, setShowAllPast] = useState(false)

  // Past occurrences — concrete meetings spawned from this template
  const pastOccurrences = useMemo(() => {
    return meetings
      .filter(m => m.recurringMeetingId === template.id && m.date && !isFuture(parseISO(m.date)) && !isToday(parseISO(m.date)))
      .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
  }, [meetings, template.id])

  // Future spawned occurrences
  const futureSpawned = useMemo(() => {
    return meetings.filter(
      m => m.recurringMeetingId === template.id && m.date && (isFuture(parseISO(m.date)) || isToday(parseISO(m.date)))
    ).sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))
  }, [meetings, template.id])

  // Upcoming dates from recurrence rule (unspawned)
  const upcomingDates = useMemo(() => {
    if (!template.recurrenceRule) return []
    const next4 = getNextOccurrences(template.recurrenceRule, 4)
    const spawnedDates = new Set(futureSpawned.map(m => m.date))
    return next4
      .map(d => format(d, 'yyyy-MM-dd'))
      .filter(d => !spawnedDates.has(d))
  }, [template.recurrenceRule, futureSpawned])

  function handleSpawnAndExpand(date: string) {
    const id = spawnRecurringOccurrence(template.id, date)
    setExpandedOccurrenceId(id)
  }

  function handleBeginOccurrence(occId: string) {
    startMeetingSession(occId)
    setLiveMeetingOpen(true)
    onBeginMeeting(occId)
  }

  const visiblePast = showAllPast ? pastOccurrences : pastOccurrences.slice(0, 10)

  return (
    <div className="flex flex-col h-full bg-white">
      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="bg-canvas px-6 py-5 border-b border-border/60 flex-shrink-0">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <RotateCcw size={14} className="text-stone/40 flex-shrink-0 mt-0.5" />
            <h2 className="font-serif text-[20px] text-charcoal leading-snug truncate">
              {template.title}
            </h2>
          </div>
        </div>
        {template.recurrenceRule && (
          <p className="text-[12px] text-stone mt-1 ml-[22px]">
            {describeRule(template.recurrenceRule)} · {template.time} · {template.durationMinutes} min
          </p>
        )}

        {/* Edit schema toggle */}
        <button
          onClick={() => setSchemaOpen(o => !o)}
          className="flex items-center gap-1 mt-3 ml-[22px] text-[11px] text-stone/50 hover:text-charcoal transition-colors"
        >
          {schemaOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
          Bewerk schema
        </button>
        {schemaOpen && (
          <div className="mt-3">
            <MeetingInlineCard
              meeting={template}
              isTemplate
              defaultExpanded
              onDelete={onDelete}
            />
          </div>
        )}
      </div>

      {/* ── Scrollable body ───────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto min-h-0">

        {/* Upcoming section */}
        {(futureSpawned.length > 0 || upcomingDates.length > 0) && (
          <div className="px-6 py-4 border-b border-border/40">
            <div className="text-[10px] uppercase tracking-[0.08em] text-stone/35 font-medium mb-3">
              Upcoming
            </div>

            {/* Already-spawned future occurrences */}
            {futureSpawned.map(occ => (
              <div key={occ.id} className="mb-2">
                <MeetingInlineCard
                  meeting={occ}
                  defaultExpanded={occ.id === expandedOccurrenceId}
                  onBeginMeeting={() => handleBeginOccurrence(occ.id)}
                />
              </div>
            ))}

            {/* Unspawned upcoming dates */}
            {upcomingDates.map(date => (
              <button
                key={date}
                onClick={() => handleSpawnAndExpand(date)}
                className="w-full flex items-center gap-3 py-2 px-3 rounded-[6px]
                  text-left hover:bg-canvas transition-colors group"
              >
                <Calendar size={12} className="text-stone/30 flex-shrink-0" />
                <span className="text-[13px] text-charcoal flex-1">
                  {formatShortDate(date)}
                </span>
                <span className="text-[11px] text-stone/30 group-hover:text-stone/50 transition-colors">
                  Agenda aanpassen →
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Past occurrences */}
        {pastOccurrences.length > 0 && (
          <div className="px-6 py-4">
            <div className="text-[10px] uppercase tracking-[0.08em] text-stone/35 font-medium mb-3">
              Geschiedenis
            </div>
            <div className="space-y-1">
              {visiblePast.map(occ => (
                <div key={occ.id}>
                  {/* Collapsed row */}
                  <button
                    onClick={() => setExpandedPastId(id => id === occ.id ? null : occ.id)}
                    className={`w-full flex items-start gap-3 py-2.5 px-3 rounded-[6px]
                      text-left transition-colors
                      ${expandedPastId === occ.id ? 'bg-canvas' : 'hover:bg-canvas/60'}`}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {expandedPastId === occ.id
                        ? <ChevronDown size={11} className="text-stone/40" />
                        : <ChevronRight size={11} className="text-stone/30" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-stone/40 flex-shrink-0">
                          {occ.date ? formatShortDate(occ.date) : ''}
                        </span>
                        {occ.meetingNotes?.outcome && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${OUTCOME_CONFIG[occ.meetingNotes.outcome].color}`}>
                            {OUTCOME_CONFIG[occ.meetingNotes.outcome].label}
                          </span>
                        )}
                      </div>
                      {occ.meetingNotes?.summary && (
                        <p className="text-[12px] text-stone/60 mt-0.5 line-clamp-2 leading-relaxed">
                          {occ.meetingNotes.summary}
                        </p>
                      )}
                      {!occ.meetingNotes && (
                        <p className="text-[12px] text-stone/30 mt-0.5 italic">Geen opname</p>
                      )}
                    </div>
                  </button>

                  {/* Expanded: notes or editable card */}
                  {expandedPastId === occ.id && (
                    <div className="mt-1 mb-3 pl-6">
                      {occ.meetingNotes
                        ? <MeetingNotesDisplay notes={occ.meetingNotes} />
                        : <MeetingInlineCard meeting={occ} defaultExpanded />
                      }
                    </div>
                  )}
                </div>
              ))}
            </div>

            {!showAllPast && pastOccurrences.length > 10 && (
              <button
                onClick={() => setShowAllPast(true)}
                className="mt-3 text-[11px] text-stone/40 hover:text-charcoal transition-colors"
              >
                Toon meer ({pastOccurrences.length - 10} meer)
              </button>
            )}
          </div>
        )}

        {/* Empty state */}
        {futureSpawned.length === 0 && upcomingDates.length === 0 && pastOccurrences.length === 0 && (
          <div className="flex items-center justify-center h-40">
            <p className="text-[12px] text-stone/30 italic">Nog geen occurrences</p>
          </div>
        )}
      </div>
    </div>
  )
}
```

**Step 3: TypeScript check**
```bash
npx tsc --noEmit
```
Expected: no errors.

**Step 4: Commit**
```bash
git add src/components/meetings/RecurringSeriesPanel.tsx
git commit -m "feat: RecurringSeriesPanel — unified recurring meeting series view"
```

---

### Task 5: Wire `RecurringSeriesPanel` into `MeetingsPage`

**Files:**
- Modify: `src/components/meetings/MeetingsPage.tsx`

**Step 1: Import the new component**

Add to imports:
```tsx
import { RecurringSeriesPanel } from './RecurringSeriesPanel'
```

**Step 2: Detect recurring template**

After the `selectedMeeting` memo, add:
```tsx
const isRecurringTemplate = selectedMeeting
  ? recurringMeetings.some(r => r.id === selectedMeeting.id)
  : false
```

**Step 3: Render `RecurringSeriesPanel` for templates**

In the JSX, replace the right panel:
```tsx
{/* Right: Detail panel (65%) — white base */}
<div className="flex-1 flex flex-col min-h-0 bg-white">
  {isRecurringTemplate && selectedMeeting ? (
    <RecurringSeriesPanel
      template={selectedMeeting}
      onBeginMeeting={(occId) => {
        // Update selected meeting to the spawned occurrence
        setSelectedMeetingId(occId)
      }}
      onDelete={handleDelete}
    />
  ) : (
    <MeetingDetailPanel
      meeting={selectedMeeting}
      onBeginMeeting={handleBeginMeeting}
      onDelete={handleDelete}
    />
  )}
</div>
```

**Step 4: TypeScript check**
```bash
npx tsc --noEmit
```
Expected: no errors.

**Step 5: Commit**
```bash
git add src/components/meetings/MeetingsPage.tsx
git commit -m "feat: route recurring templates to RecurringSeriesPanel in MeetingsPage"
```

---

### Task 6: Deploy

```bash
npx vercel --prod
```

Verify in production:
- Clicking a recurring meeting in the left panel → RecurringSeriesPanel shows upcoming dates + past occurrences
- Clicking an unspawned date → spawns occurrence, expands inline card
- Past occurrences with notes → notes display on click
- Focus mode skip button → advances phase, session counted
