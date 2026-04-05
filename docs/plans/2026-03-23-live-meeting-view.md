# Live Meeting View + Transcription Debug Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a full-screen live meeting experience (dismissable modal, two-column layout with sortable agenda + live notes log) and surface the root cause of the transcription 500 errors.

**Architecture:** New `LiveMeetingView` modal renders over the app as a fixed overlay. It contains `LiveAgendaPanel` (left, 40%) and `LiveNotesLog` (right, 60%). The meeting keeps running when dismissed; the FAB "Back to agenda" button re-opens it. Store gains `isLiveMeetingOpen` + `reorderLiveMeetingItems` action.

**Tech Stack:** React 19 + TypeScript strict, Zustand store slices, dnd-kit (useSortable + DndContext), Tailwind CSS 4

---

## Pre-flight: What's already done

Before coding, verify these are already in place (they are — don't re-implement):
- `useRecording.ts` — error capture with response body AND auto-download backup on meeting end ✅
- `src/lib/processAudioBlob.ts` — standalone audio processing utility ✅
- `api/transcribe.ts` — returns `{ error: message }` on 500 ✅

---

### Task 1: Diagnose transcription 500 — add diagnostic endpoint

The 500 returns an empty body (seen as `()` in browser), meaning the error happens at Vercel infrastructure level, not inside the handler. Most likely cause: Vercel Hobby plan has 10s max function duration; `maxDuration: 60` in vercel.json is ignored on Hobby and the Whisper API call takes > 10s.

**Files:**
- Create: `api/health.ts`
- Modify: `vercel.json`

**Step 1: Create health check endpoint**

```typescript
// api/health.ts
import type { VercelRequest, VercelResponse } from '@vercel/node'

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    ok: true,
    hasOpenAiKey: !!process.env.OPENAI_API_KEY,
    keyPrefix: process.env.OPENAI_API_KEY?.slice(0, 7) ?? null,
    nodeVersion: process.version,
    timestamp: new Date().toISOString(),
  })
}
```

**Step 2: Add to vercel.json**

```json
{
  "functions": {
    "api/transcribe.ts": { "maxDuration": 60, "memory": 1024 },
    "api/meeting-notes.ts": { "maxDuration": 60, "memory": 512 },
    "api/done-reflection.ts": { "maxDuration": 30 },
    "api/health.ts": { "maxDuration": 10 }
  }
}
```

**Step 3: Commit and deploy, then hit `https://vandaag-app.vercel.app/api/health`**

```bash
git add api/health.ts vercel.json
git commit -m "feat: add /api/health diagnostic endpoint"
```

Deploy and verify: the response reveals whether the OpenAI key is present and what prefix it has. This tells us immediately if the key is wrong or missing.

---

### Task 2: Add `isLiveMeetingOpen` to store

**Files:**
- Modify: `src/store/types.ts`
- Modify: `src/store/meetingSessionSlice.ts`
- Modify: `src/store/index.ts`

**Step 1: Add to VandaagState in `src/store/types.ts`**

After line 35 (`meetingSession: MeetingSession | null`), add:
```typescript
isLiveMeetingOpen: boolean
```

After line 103 (`tickMeetingSession: () => void`), add:
```typescript
setLiveMeetingOpen: (open: boolean) => void
reorderLiveMeetingItems: (newItems: AgendaItemType[]) => void
```

Note: `AgendaItemType` is `AgendaItem` from `'../types'` — add to the import at the top of the file.

**Step 2: Implement in `src/store/meetingSessionSlice.ts`**

Add these two actions to `makeMeetingSessionActions`:

```typescript
setLiveMeetingOpen: (open: boolean) => set({ isLiveMeetingOpen: open }),

reorderLiveMeetingItems: (newItems: AgendaItem[]) => {
  const { meetingSession, meetings, recurringMeetings } = get()
  if (!meetingSession) return

  // Find the current item's ID before reorder
  const allMeetings = [...meetings, ...recurringMeetings]
  const meeting = allMeetings.find(m => m.id === meetingSession.meetingId)
  if (!meeting) return

  const currentItem = meeting.agendaItems?.[meetingSession.currentItemIndex]

  // Update agendaItems on the meeting
  const isRecurring = recurringMeetings.some(m => m.id === meetingSession.meetingId)
  if (isRecurring) {
    set({
      recurringMeetings: recurringMeetings.map(m =>
        m.id === meetingSession.meetingId ? { ...m, agendaItems: newItems } : m
      )
    })
  } else {
    set({
      meetings: meetings.map(m =>
        m.id === meetingSession.meetingId ? { ...m, agendaItems: newItems } : m
      )
    })
  }

  // Recalculate currentItemIndex to track the same item by ID
  if (currentItem) {
    const newIndex = newItems.findIndex(i => i.id === currentItem.id)
    if (newIndex >= 0 && newIndex !== meetingSession.currentItemIndex) {
      set({ meetingSession: { ...meetingSession, currentItemIndex: newIndex } })
    }
  }
},
```

Also update `startMeetingSession` to auto-open the view — add `isLiveMeetingOpen: true` to the `set()` call at line 12-17.

**Step 3: Expose in `src/store/index.ts`**

Find where `makeMeetingSessionActions` is spread. Confirm `setLiveMeetingOpen` and `reorderLiveMeetingItems` are included (they are if the slice is spread with `...makeMeetingSessionActions(set, get)`).

Also add `isLiveMeetingOpen: false` to the initial state object.

**Step 4: Verify TypeScript compiles**

```bash
cd "/Users/beer/Vandaag App" && npx tsc --noEmit 2>&1 | head -30
```
Expected: no errors

**Step 5: Commit**

```bash
git add src/store/types.ts src/store/meetingSessionSlice.ts src/store/index.ts
git commit -m "feat: add isLiveMeetingOpen + reorderLiveMeetingItems to meeting session store"
```

---

### Task 3: Create `LiveNotesLog` component

**Files:**
- Create: `src/components/meetings/LiveNotesLog.tsx`

This is the right-hand column: a scrollable list of completed agenda items with their AI-generated notes.

```tsx
// src/components/meetings/LiveNotesLog.tsx
import { useEffect, useRef } from 'react'
import { Loader2 } from 'lucide-react'
import { useStore } from '../../store'
import type { Meeting, MeetingSession } from '../../types'

interface LiveNotesLogProps {
  meeting: Meeting
  session: MeetingSession
}

export function LiveNotesLog({ meeting, session }: LiveNotesLogProps) {
  const processingItemIds = session.processingItemIds
  const bottomRef = useRef<HTMLDivElement>(null)
  const items = meeting.agendaItems ?? []
  const completedItems = items.filter(i => session.completedItemIds.includes(i.id))
  const agendaItemNotes = meeting.meetingNotes?.agendaItemNotes ?? []

  // Auto-scroll to bottom when new notes arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [agendaItemNotes.length, processingItemIds.length])

  if (completedItems.length === 0 && processingItemIds.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-[12px] text-stone/40 text-center leading-relaxed max-w-[200px]">
          Notes will appear here as agenda items are completed
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
      {completedItems.map(item => {
        const notes = agendaItemNotes.find(n => n.agendaItemId === item.id)
        const isProcessing = processingItemIds.includes(item.id)

        return (
          <div key={item.id} className="space-y-2">
            {/* Item header */}
            <div className="flex items-center gap-2">
              <div className="w-[6px] h-[6px] rounded-full bg-stone/30 flex-shrink-0" />
              <h3 className="text-[12px] font-medium text-charcoal/70 uppercase tracking-[0.06em]">
                {item.title}
              </h3>
            </div>

            {isProcessing && (
              <div className="flex items-center gap-2 pl-4 text-[12px] text-stone/50">
                <Loader2 size={11} className="animate-spin" />
                <span>Summarising…</span>
              </div>
            )}

            {notes && !isProcessing && (
              <div className="pl-4 space-y-2">
                {notes.summary && (
                  <p className="text-[13px] text-charcoal/70 leading-relaxed">{notes.summary}</p>
                )}
                {notes.decisions.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-[0.06em] text-stone/50">Decisions</p>
                    {notes.decisions.map((d, i) => (
                      <div key={i} className="flex items-start gap-2 text-[12px] text-charcoal/70">
                        <span className="text-green-600 mt-0.5 flex-shrink-0">✔</span>
                        <span>{d}</span>
                      </div>
                    ))}
                  </div>
                )}
                {notes.actionItems.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-[0.06em] text-stone/50">Actions</p>
                    {notes.actionItems.map((a, i) => (
                      <div key={i} className="flex items-start gap-2 text-[12px] text-charcoal/70">
                        <span className="text-amber-600 mt-0.5 flex-shrink-0">→</span>
                        <span>{typeof a === 'string' ? a : a.description}</span>
                      </div>
                    ))}
                  </div>
                )}
                {notes.openQuestions.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-[0.06em] text-stone/50">Open questions</p>
                    {notes.openQuestions.map((q, i) => (
                      <div key={i} className="flex items-start gap-2 text-[12px] text-charcoal/70">
                        <span className="text-stone/50 mt-0.5 flex-shrink-0">?</span>
                        <span>{q}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
      <div ref={bottomRef} />
    </div>
  )
}
```

**Step 1: Create the file as above**

**Step 2: TypeScript check**

```bash
cd "/Users/beer/Vandaag App" && npx tsc --noEmit 2>&1 | head -30
```

**Step 3: Commit**

```bash
git add src/components/meetings/LiveNotesLog.tsx
git commit -m "feat: add LiveNotesLog component for live meeting right column"
```

---

### Task 4: Create `LiveAgendaPanel` component

**Files:**
- Create: `src/components/meetings/LiveAgendaPanel.tsx`

This is the left column: meeting header, sortable agenda, add item input, and control buttons.

```tsx
// src/components/meetings/LiveAgendaPanel.tsx
import { useState, useRef, useEffect } from 'react'
import { GripVertical, Plus, Pause, Play, SkipForward, Square, Mic, MicOff } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useStore } from '../../store'
import type { Meeting, MeetingSession, AgendaItem } from '../../types'
import { v4 as uuid } from 'uuid'

interface LiveAgendaPanelProps {
  meeting: Meeting
  session: MeetingSession
  isRecording: boolean
  elapsedSeconds: number
}

function formatElapsed(s: number) {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

function formatTimeLeft(s: number | null) {
  if (s === null) return null
  if (s <= 0) return '—'
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${String(sec).padStart(2, '0')}`
}

// ── Single sortable agenda item row ─────────────────────────────────────────

interface AgendaRowProps {
  item: AgendaItem
  status: 'done' | 'current' | 'upcoming'
  timeLeft: string | null
}

function AgendaRow({ item, status, timeLeft }: AgendaRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.id,
    disabled: status !== 'upcoming',
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-[6px] transition-colors
        ${status === 'current' ? 'bg-amber-50/60 border border-amber-200/40' : ''}
        ${status === 'done' ? 'opacity-50' : ''}
      `}
    >
      {/* Drag handle — only for upcoming */}
      <div
        {...(status === 'upcoming' ? { ...attributes, ...listeners } : {})}
        className={`flex-shrink-0 ${status === 'upcoming' ? 'cursor-grab text-stone/30 hover:text-stone/60' : 'text-transparent'}`}
      >
        <GripVertical size={13} />
      </div>

      {/* Status indicator */}
      <div className="flex-shrink-0 w-4 flex items-center justify-center">
        {status === 'done' && <span className="text-[11px] text-stone/40">✓</span>}
        {status === 'current' && <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse block" />}
        {status === 'upcoming' && <span className="w-1.5 h-1.5 rounded-full bg-stone/20 block" />}
      </div>

      {/* Title */}
      <span className={`flex-1 text-[13px] leading-snug ${
        status === 'done' ? 'text-stone/50 line-through' :
        status === 'current' ? 'text-charcoal font-medium' :
        'text-charcoal/70'
      }`}>
        {item.title}
      </span>

      {/* Time left (current item only) */}
      {timeLeft && status === 'current' && (
        <span className={`text-[11px] flex-shrink-0 tabular-nums ${
          parseInt(timeLeft) <= 1 ? 'text-red-500' : 'text-stone/50'
        }`}>
          {timeLeft}
        </span>
      )}
    </div>
  )
}

// ── Main panel ───────────────────────────────────────────────────────────────

export function LiveAgendaPanel({ meeting, session, isRecording, elapsedSeconds }: LiveAgendaPanelProps) {
  const pauseMeetingSession = useStore(s => s.pauseMeetingSession)
  const resumeMeetingSession = useStore(s => s.resumeMeetingSession)
  const advanceMeetingItem = useStore(s => s.advanceMeetingItem)
  const endMeetingSession = useStore(s => s.endMeetingSession)
  const setLiveMeetingOpen = useStore(s => s.setLiveMeetingOpen)
  const reorderLiveMeetingItems = useStore(s => s.reorderLiveMeetingItems)
  const updateMeeting = useStore(s => s.updateMeeting)
  const updateRecurringMeeting = useStore(s => s.updateRecurringMeeting)
  const recurringMeetings = useStore(s => s.recurringMeetings)

  const [newItemTitle, setNewItemTitle] = useState('')
  const addInputRef = useRef<HTMLInputElement>(null)

  const items = meeting.agendaItems ?? []
  const total = items.length
  const completed = session.completedItemIds.length
  const progress = total > 0 ? completed / total : 0

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = items.findIndex(i => i.id === active.id)
    const newIndex = items.findIndex(i => i.id === over.id)
    const newItems = arrayMove(items, oldIndex, newIndex)
    reorderLiveMeetingItems(newItems)
  }

  function handleAddItem() {
    const title = newItemTitle.trim()
    if (!title) return
    const newItem: AgendaItem = { id: uuid(), title }
    const newItems = [...items, newItem]
    const isRecurring = recurringMeetings.some(m => m.id === meeting.id)
    if (isRecurring) {
      updateRecurringMeeting(meeting.id, { agendaItems: newItems })
    } else {
      updateMeeting(meeting.id, { agendaItems: newItems })
    }
    setNewItemTitle('')
    addInputRef.current?.focus()
  }

  return (
    <div className="flex flex-col h-full border-r border-border">
      {/* Meeting header */}
      <div className="px-6 py-5 border-b border-border/60">
        <div className="flex items-center gap-2 mb-1">
          {isRecording ? (
            <span className="flex items-center gap-1.5 text-[11px] text-red-500/80">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse block" />
              Recording
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-[11px] text-stone/40">
              <MicOff size={10} />
              Not recording
            </span>
          )}
          <span className="text-stone/30 text-[11px]">·</span>
          <span className="text-[11px] text-stone/50 tabular-nums">{formatElapsed(elapsedSeconds)}</span>
        </div>
        <h2 className="font-serif text-[20px] text-charcoal leading-snug">{meeting.title}</h2>

        {/* Progress bar */}
        <div className="mt-3 h-[3px] bg-border rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-400/60 rounded-full transition-all duration-500"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <p className="text-[10px] text-stone/40 mt-1">
          {completed} of {total} items done
        </p>
      </div>

      {/* Agenda list */}
      <div className="flex-1 overflow-y-auto py-2">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
            {items.map((item, idx) => {
              const status =
                session.completedItemIds.includes(item.id) ? 'done' :
                idx === session.currentItemIndex ? 'current' :
                'upcoming'
              const timeLeft = status === 'current' ? formatTimeLeft(session.secondsLeft) : null
              return (
                <AgendaRow key={item.id} item={item} status={status} timeLeft={timeLeft} />
              )
            })}
          </SortableContext>
        </DndContext>

        {/* Add item */}
        <div className="px-3 mt-2">
          <input
            ref={addInputRef}
            value={newItemTitle}
            onChange={e => setNewItemTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAddItem() }}
            placeholder="+ Add agenda item"
            className="w-full text-[12px] text-stone/60 placeholder-stone/30 bg-transparent
              border-none outline-none py-1.5 px-1"
          />
        </div>
      </div>

      {/* Controls */}
      <div className="px-4 py-4 border-t border-border/60 flex items-center gap-2">
        {session.isRunning ? (
          <button
            onClick={pauseMeetingSession}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] text-stone/70
              hover:text-charcoal border border-border rounded-[6px] hover:bg-border-light transition-colors"
          >
            <Pause size={12} />
            Pause
          </button>
        ) : (
          <button
            onClick={resumeMeetingSession}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] text-stone/70
              hover:text-charcoal border border-border rounded-[6px] hover:bg-border-light transition-colors"
          >
            <Play size={12} />
            Resume
          </button>
        )}

        <button
          onClick={advanceMeetingItem}
          disabled={session.currentItemIndex >= items.length - 1}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] text-stone/70
            hover:text-charcoal border border-border rounded-[6px] hover:bg-border-light
            transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <SkipForward size={12} />
          Next
        </button>

        <div className="flex-1" />

        <button
          onClick={() => {
            endMeetingSession()
            setLiveMeetingOpen(false)
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] text-red-500/70
            hover:text-red-600 border border-red-200/50 rounded-[6px] hover:bg-red-50/50 transition-colors"
        >
          <Square size={11} />
          End
        </button>
      </div>
    </div>
  )
}
```

**Step 1: Create the file as above**

**Step 2: TypeScript check**

```bash
cd "/Users/beer/Vandaag App" && npx tsc --noEmit 2>&1 | head -30
```

**Step 3: Commit**

```bash
git add src/components/meetings/LiveAgendaPanel.tsx
git commit -m "feat: add LiveAgendaPanel with sortable agenda + controls"
```

---

### Task 5: Create `LiveMeetingView` (full-screen modal wrapper)

**Files:**
- Create: `src/components/meetings/LiveMeetingView.tsx`

This is the top-level orchestrator: renders the two-column layout, manages elapsed time, wires up `useRecording`.

```tsx
// src/components/meetings/LiveMeetingView.tsx
import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { useStore } from '../../store'
import { useRecording } from '../../hooks/useRecording'
import { LiveAgendaPanel } from './LiveAgendaPanel'
import { LiveNotesLog } from './LiveNotesLog'

export function LiveMeetingView() {
  const meetingSession = useStore(s => s.meetingSession)
  const isLiveMeetingOpen = useStore(s => s.isLiveMeetingOpen)
  const setLiveMeetingOpen = useStore(s => s.setLiveMeetingOpen)
  const meetings = useStore(s => s.meetings)
  const recurringMeetings = useStore(s => s.recurringMeetings)

  const meeting = meetingSession
    ? [...meetings, ...recurringMeetings].find(m => m.id === meetingSession.meetingId)
    : null

  // Elapsed time counter
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  useEffect(() => {
    if (!meetingSession?.startedAt) return
    const update = () => {
      setElapsedSeconds(Math.floor((Date.now() - Date.parse(meetingSession.startedAt)) / 1000))
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [meetingSession?.startedAt])

  // Recording hook — always mounted when session exists
  const { isRecording } = useRecording(
    meetingSession?.meetingId ?? null,
    meeting?.language ?? 'auto',
  )

  if (!meetingSession || !meeting || !isLiveMeetingOpen) return null

  return (
    <>
      {/* Backdrop — click to dismiss (doesn't end meeting) */}
      <div
        className="fixed inset-0 z-50 bg-charcoal/40 backdrop-blur-[3px]"
        onClick={() => setLiveMeetingOpen(false)}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 pointer-events-none">
        <div
          className="relative w-full max-w-[960px] h-full max-h-[680px] bg-canvas rounded-[14px]
            shadow-2xl border border-border flex flex-col overflow-hidden pointer-events-auto"
          onClick={e => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={() => setLiveMeetingOpen(false)}
            className="absolute top-3 right-3 z-10 w-7 h-7 flex items-center justify-center
              text-stone/40 hover:text-charcoal hover:bg-border-light rounded-full transition-colors"
            title="Minimise (meeting keeps running)"
          >
            <X size={14} />
          </button>

          {/* Two-column layout — stack on mobile */}
          <div className="flex flex-col sm:flex-row flex-1 min-h-0">
            {/* Left: Agenda (40%) */}
            <div className="w-full sm:w-[40%] flex flex-col min-h-0">
              <LiveAgendaPanel
                meeting={meeting}
                session={meetingSession}
                isRecording={isRecording}
                elapsedSeconds={elapsedSeconds}
              />
            </div>

            {/* Right: Notes log (60%) */}
            <div className="flex-1 flex flex-col min-h-0 bg-white/30">
              <div className="px-6 py-4 border-b border-border/60">
                <h3 className="text-[10px] uppercase tracking-[0.08em] text-stone/50 font-medium">
                  Notes Log
                </h3>
              </div>
              <LiveNotesLog meeting={meeting} session={meetingSession} />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
```

**Step 1: Create the file as above**

**Step 2: TypeScript check**

```bash
cd "/Users/beer/Vandaag App" && npx tsc --noEmit 2>&1 | head -30
```

**Step 3: Commit**

```bash
git add src/components/meetings/LiveMeetingView.tsx
git commit -m "feat: add LiveMeetingView full-screen modal"
```

---

### Task 6: Wire up `App.tsx` and `SmartFab`

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/ui/SmartFab.tsx`
- Modify: `src/components/meetings/MeetingsDrawer.tsx`

**Step 1: Add `LiveMeetingView` to `App.tsx`**

Add import near the top with other meeting imports:
```typescript
import { LiveMeetingView } from './components/meetings/LiveMeetingView'
```

Add a new prop to `SmartFab` call for `onBackToMeeting`:
```tsx
// In App.tsx, add to state:
const setLiveMeetingOpen = useStore(s => s.setLiveMeetingOpen)

// Update SmartFab call:
<SmartFab
  ...existing props...
  onBackToMeeting={() => setLiveMeetingOpen(true)}
/>
```

Add `<LiveMeetingView />` just before the closing `</div>` of the outer wrapper (line 243), alongside other modals:
```tsx
{/* Live meeting full-screen view */}
<LiveMeetingView />
```

**Step 2: Update `SmartFab.tsx` to accept `onBackToMeeting` prop**

Add to `SmartFabProps` interface:
```typescript
onBackToMeeting: () => void
```

Add to destructured params.

In `handlePrimaryClick`, change the `meetingLabel` branch:
```typescript
} else if (meetingLabel) {
  onBackToMeeting()  // was: onOpenMeetings()
}
```

**Step 3: Update `MeetingsDrawer.tsx` — remove `LiveMeetingPanel`, add compact banner**

Find the `LiveMeetingPanel` import and usage, remove it. In its place, add a compact "meeting active" banner that shows when `meetingSession` exists:

```tsx
// Near top of MeetingsDrawer
const meetingSession = useStore(s => s.meetingSession)
const setLiveMeetingOpen = useStore(s => s.setLiveMeetingOpen)
const meetings = useStore(s => s.meetings)
const recurringMeetings = useStore(s => s.recurringMeetings)
const activeMeeting = meetingSession
  ? [...meetings, ...recurringMeetings].find(m => m.id === meetingSession.meetingId)
  : null

// In JSX, where LiveMeetingPanel was:
{activeMeeting && (
  <div className="mx-4 mb-3 px-3 py-2 bg-amber-50/50 border border-amber-200/40 rounded-[8px]
    flex items-center gap-2">
    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
    <span className="flex-1 text-[12px] text-charcoal/70 truncate">{activeMeeting.title}</span>
    <button
      onClick={() => { setLiveMeetingOpen(true); onClose() }}
      className="text-[11px] text-amber-700/70 hover:text-amber-800 transition-colors flex-shrink-0"
    >
      Open →
    </button>
  </div>
)}
```

**Step 4: TypeScript check**

```bash
cd "/Users/beer/Vandaag App" && npx tsc --noEmit 2>&1 | head -30
```

**Step 5: Commit**

```bash
git add src/App.tsx src/components/ui/SmartFab.tsx src/components/meetings/MeetingsDrawer.tsx
git commit -m "feat: wire LiveMeetingView into App — FAB opens full-screen view, drawer shows compact banner"
```

---

### Task 7: End-to-end verification

**Manual test checklist:**

1. **Start meeting** → full-screen modal opens automatically
2. **Two columns visible** → left: agenda items with recording dot + elapsed timer; right: empty notes log with placeholder text
3. **Dismiss** → click ×, modal closes, but meeting still ticking (check FAB shows amber dot + meeting title)
4. **Re-open** → click FAB → modal reopens, same state preserved
5. **Re-open via drawer** → open MeetingsDrawer → compact amber banner visible with "Open →" button
6. **Reorder items** → drag upcoming item to different position — ordering updates, current item stays highlighted
7. **Cannot drag** → try to drag current or completed item — nothing happens (handle is inert)
8. **Add item** → type in the "Add agenda item" input, press Enter → item appears at bottom of list
9. **Next item** → click Next → progress bar advances, previous item greyed out
10. **End meeting** → click End → modal closes, recording processes, notes appear in MeetingRow when done
11. **Mobile** (375px) → stacked layout, agenda on top, notes below

**TypeScript final check:**

```bash
cd "/Users/beer/Vandaag App" && npx tsc --noEmit
```
Expected: zero errors

---

### Task 8: Deploy

```bash
cd "/Users/beer/Vandaag App" && npx vercel --prod
```

After deploy, immediately visit `/api/health` to confirm:
- `"hasOpenAiKey": true`
- `"keyPrefix": "sk-pro"` (or `"sk-"` prefix confirms key is set)

Then test a meeting with actual audio to verify transcription works.
