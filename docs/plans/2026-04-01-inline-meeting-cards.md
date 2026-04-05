# Inline Meeting Cards Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace fragmented meeting editing (separate MeetingPrePanel modal) with a single inline-expandable MeetingInlineCard component used everywhere — Meetings page, project modal, planning modal, Vandaag view.

**Architecture:** One new component (`MeetingInlineCard`) wraps `useMeetingForm` for form state and uses existing `AgendaItemEditor` + `RecurrenceFrequencyPicker`. The card expands in-place to reveal editing. Auto-saves via debounced `updateMeeting`/`updateRecurringMeeting`. Integrated into existing screens by replacing current meeting rows.

**Tech Stack:** React 19, TypeScript strict, Zustand, Tailwind CSS 4, existing `useMeetingForm` hook, existing `AgendaItemEditor`, `RecurrenceFrequencyPicker`, `@dnd-kit`.

---

## Task 1: Create `MeetingInlineCard` core component

**Files:**
- Create: `src/components/meetings/MeetingInlineCard.tsx`

**Step 1: Create the component file with collapsed state**

The collapsed state is a single clickable row: time badge + title + duration + recurrence icon.

```tsx
// src/components/meetings/MeetingInlineCard.tsx
import { useState, useEffect, useRef, useCallback } from 'react'
import { Clock, RotateCcw, ChevronDown, Trash2 } from 'lucide-react'
import { useStore } from '../../store'
import { useMeetingForm } from '../../hooks/useMeetingForm'
import { AgendaItemEditor } from './AgendaItemEditor'
import { RecurrenceFrequencyPicker } from '../ui/RecurrenceFrequencyPicker'
import { describeRule } from '../../lib/recurrence'
import type { Meeting } from '../../types'

interface MeetingInlineCardProps {
  meeting: Meeting
  isTemplate?: boolean        // recurring template
  defaultExpanded?: boolean   // for newly created meetings
  onBeginMeeting?: () => void // shows "Begin" button when provided
  onDelete?: () => void       // shows delete in footer
  compact?: boolean           // planning modal uses tighter spacing
}

export function MeetingInlineCard({
  meeting,
  isTemplate = false,
  defaultExpanded = false,
  onBeginMeeting,
  onDelete,
  compact = false,
}: MeetingInlineCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const updateMeeting = useStore(s => s.updateMeeting)
  const updateRecurringMeeting = useStore(s => s.updateRecurringMeeting)

  // Form state from existing hook
  const { form, actions, buildMeetingData, isValid } = useMeetingForm(
    meeting.id,
    false,
    meeting,
  )

  // Auto-save: debounced 2s after last edit
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const formJsonRef = useRef('')

  const doSave = useCallback(() => {
    const data = buildMeetingData()
    if (isTemplate) {
      updateRecurringMeeting(meeting.id, data)
    } else {
      updateMeeting(meeting.id, data)
    }
  }, [meeting.id, isTemplate, buildMeetingData, updateMeeting, updateRecurringMeeting])

  // Watch form changes and auto-save
  useEffect(() => {
    const json = JSON.stringify(form)
    if (formJsonRef.current === '') {
      formJsonRef.current = json
      return
    }
    if (json === formJsonRef.current) return
    formJsonRef.current = json

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(doSave, 2000)

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
  }, [form, doSave])

  // Save on collapse
  function handleCollapse() {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
      doSave()
    }
    setExpanded(false)
  }

  // Duration display
  const durationLabel = form.durationMinutes < 60
    ? `${form.durationMinutes}m`
    : `${form.durationMinutes / 60}h`

  // ── Collapsed state ────────────────────────────────────────────
  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className={`w-full flex items-center gap-2.5 text-left hover:bg-stone/5
          rounded-[8px] transition-colors group
          ${compact ? 'py-1.5 px-2' : 'py-2 px-3'}`}
      >
        {isTemplate && <RotateCcw size={10} className="text-stone/30 flex-shrink-0" />}
        <span className="text-[11px] text-stone/40 flex-shrink-0 w-[38px] tabular-nums">
          {form.time || '—'}
        </span>
        <span className="text-[13px] text-charcoal flex-1 min-w-0 truncate">
          {form.title || 'Untitled meeting'}
        </span>
        {form.durationMinutes > 0 && (
          <span className="text-[10px] text-stone/30 flex-shrink-0">{durationLabel}</span>
        )}
        {isTemplate && meeting.recurrenceRule && (
          <span className="text-[10px] text-stone/20 italic flex-shrink-0 hidden sm:inline">
            {describeRule(meeting.recurrenceRule)}
          </span>
        )}
        <ChevronDown size={10} className="text-stone/20 flex-shrink-0
          opacity-0 group-hover:opacity-100 transition-opacity" />
      </button>
    )
  }

  // ── Expanded state ─────────────────────────────────────────────
  const DURATION_PRESETS = [15, 30, 45, 60, 90, 120]

  return (
    <div className="rounded-[10px] border border-border bg-card p-4 space-y-4 animate-[scale-in_150ms_ease-out]">
      {/* Collapse handle */}
      <button
        onClick={handleCollapse}
        className="flex items-center gap-1.5 text-[10px] text-stone/30 hover:text-stone/60 transition-colors"
      >
        <ChevronDown size={10} className="rotate-180" />
        {isTemplate ? 'Recurring template' : 'Collapse'}
      </button>

      {/* Title */}
      <input
        type="text"
        value={form.title}
        onChange={e => actions.setTitle(e.target.value)}
        placeholder="Meeting title..."
        autoFocus={defaultExpanded}
        className="w-full bg-transparent font-serif text-[18px] text-charcoal
          placeholder:text-stone/20 outline-none border-none leading-tight"
      />

      {/* Time + Date + Duration row */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="time"
          value={form.time}
          onChange={e => actions.setTime(e.target.value)}
          className="px-2 py-1.5 rounded-[6px] border border-border bg-canvas
            text-[12px] text-charcoal outline-none focus:border-stone/40 transition-colors"
        />
        <input
          type="date"
          value={form.date}
          onChange={e => actions.setDate(e.target.value)}
          className="px-2 py-1.5 rounded-[6px] border border-border bg-canvas
            text-[12px] text-charcoal outline-none focus:border-stone/40 transition-colors"
        />
        <div className="flex gap-1">
          {DURATION_PRESETS.map(d => (
            <button
              key={d}
              onClick={() => actions.setDurationMinutes(d)}
              className={`px-2 py-1 rounded-[5px] text-[10px] transition-colors
                ${form.durationMinutes === d
                  ? 'bg-charcoal text-white'
                  : 'bg-border/50 text-stone/60 hover:bg-border'}`}
            >
              {d < 60 ? `${d}m` : `${d / 60}h`}
            </button>
          ))}
        </div>
      </div>

      {/* Template badge */}
      {isTemplate && (
        <p className="text-[10px] text-stone/30 italic">
          Template · changes apply to new occurrences
        </p>
      )}

      {/* Recurrence settings (templates only) */}
      {isTemplate && (
        <div className="border-t border-border/40 pt-3">
          <RecurrenceFrequencyPicker
            value={form.ruleState}
            onChange={patch => actions.setRuleState(prev => ({ ...prev, ...patch }))}
          />
        </div>
      )}

      {/* Agenda editor */}
      <div className="border-t border-border/40 pt-3">
        <div className="text-[10px] uppercase tracking-[0.08em] text-stone/35 font-medium mb-2">
          {isTemplate ? 'Template agenda' : 'Agenda'}
        </div>
        <AgendaItemEditor
          items={form.agendaItems}
          onChange={actions.setAgendaItems}
        />
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-between pt-2 border-t border-border/30">
        <div className="flex items-center gap-2">
          {onBeginMeeting && (
            <button
              onClick={() => { doSave(); onBeginMeeting() }}
              disabled={!isValid}
              className="px-3 py-1.5 rounded-[6px] bg-charcoal text-white text-[11px] font-medium
                hover:bg-charcoal/80 transition-colors disabled:opacity-40"
            >
              Begin meeting
            </button>
          )}
        </div>
        {onDelete && (
          <button
            onClick={onDelete}
            className="text-[10px] text-stone/25 hover:text-red-500 transition-colors flex items-center gap-1"
          >
            <Trash2 size={10} />
            Delete
          </button>
        )}
      </div>
    </div>
  )
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: Clean (0 errors)

**Step 3: Commit**

```bash
git add src/components/meetings/MeetingInlineCard.tsx
git commit -m "feat: add MeetingInlineCard core component with auto-save"
```

---

## Task 2: Integrate into UpcomingColumn (Meetings page)

**Files:**
- Modify: `src/components/meetings/UpcomingColumn.tsx`

**Step 1: Replace MeetingItem with MeetingInlineCard**

Replace the `MeetingItem` component and the `Section` component to use `MeetingInlineCard`. The existing section grouping (Today/Tomorrow/This Week/Later/Recurring) stays.

Key changes:
- Remove `MeetingItem` component (lines 9-36)
- Update `Section` to render `MeetingInlineCard` instead of `MeetingItem`
- For recurring section, pass `isTemplate={true}`
- For upcoming meetings, provide `onBeginMeeting` callback that spawns occurrence and starts session
- Remove `handleOpen` function (no longer needed — cards are self-contained)

The `Section` component becomes:
```tsx
function Section({ label, meetings: items, isTemplate, showDate }: {
  label: string
  meetings: Meeting[]
  isTemplate?: boolean
  showDate?: boolean
}) {
  if (items.length === 0) return null
  return (
    <div className="mb-4">
      <div className="text-[10px] uppercase tracking-[0.08em] text-stone/35 font-medium mb-1 px-2">
        {label}
      </div>
      {items.map(m => (
        <MeetingInlineCard
          key={m.id}
          meeting={m}
          isTemplate={isTemplate}
          onBeginMeeting={/* spawn + start session */}
          onDelete={/* delete meeting */}
        />
      ))}
    </div>
  )
}
```

For `onBeginMeeting`: the handler should:
1. If recurring template → `spawnRecurringOccurrence(m.id)` → `startMeetingSession(occId)` → `setLiveMeetingOpen(true)`
2. If regular → `startMeetingSession(m.id)` → `setLiveMeetingOpen(true)`

For `onDelete`:
1. If recurring → `deleteRecurringMeeting(m.id)`
2. If regular → `deleteMeeting(m.id)`

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: Clean

**Step 3: Visual check in preview**

Navigate to Meetings page. Verify:
- Today's meetings show as collapsed cards
- Click to expand → title editable, time/date/duration pickers, agenda editor visible
- Click collapse → card saves and collapses
- Recurring section shows template cards with recurrence picker
- "Begin meeting" button works

**Step 4: Commit**

```bash
git add src/components/meetings/UpcomingColumn.tsx
git commit -m "feat: integrate MeetingInlineCard into Meetings page UpcomingColumn"
```

---

## Task 3: Integrate into ProjectModalMeetings

**Files:**
- Modify: `src/components/kanban/ProjectModalMeetings.tsx`

**Step 1: Replace UpcomingMeetingRow and RecurringUpcomingBlock with MeetingInlineCard**

Key changes:
- Replace `UpcomingMeetingRow` (line 166-181) with `MeetingInlineCard`
- Replace `RecurringUpcomingBlock` occurrence rows with per-occurrence `MeetingInlineCard`
- Keep the `RecurringUpcomingBlock` header (recurrence icon + title + rule description) but replace occurrence rows inside
- Keep the "edit schedule" link but make it expand the template card instead of `setOpenMeetingId`
- For the "+ New" button: create meeting, render a `MeetingInlineCard` with `defaultExpanded={true}`

The upcoming section rendering becomes:
```tsx
{/* Next up */}
{nextMeeting && (
  <MeetingInlineCard
    meeting={nextMeeting}
    onBeginMeeting={() => { startMeetingSession(nextMeeting.id); setLiveMeetingOpen(true) }}
    onDelete={() => deleteMeeting(nextMeeting.id)}
  />
)}

{/* Recurring blocks — each occurrence as inline card */}
{recurringLinked.map(template => (
  <RecurringBlock key={template.id} template={template} />
))}
```

Inside `RecurringBlock`, each occurrence renders as `MeetingInlineCard` with the concrete instance.

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: Clean

**Step 3: Visual check in preview**

Open a project modal → Meetings tab. Verify:
- Upcoming meetings show as inline cards
- Click to expand → edit agenda, time, etc.
- Recurring occurrences each expandable
- "+ New" creates expandable card
- Past meetings still show read-only notes (unchanged)

**Step 4: Commit**

```bash
git add src/components/kanban/ProjectModalMeetings.tsx
git commit -m "feat: integrate MeetingInlineCard into project modal meetings tab"
```

---

## Task 4: Integrate into SortableVandaagItem (daily plan)

**Files:**
- Modify: `src/components/vandaag/SortableVandaagItem.tsx`

**Step 1: Add expandable meeting card to sortable item**

When a meeting item in the daily plan list is clicked, instead of navigating to the Meetings page, expand inline to show `MeetingInlineCard`.

Key changes:
- Add `expanded` state to the meeting branch of `SortableVandaagItem`
- When collapsed: show current compact row (clock + time + title + duration)
- When expanded: render `MeetingInlineCard` below the sortable row
- Provide `onBeginMeeting` callback

```tsx
{/* ── Meeting content ── */}
{item.type === 'meeting' && meeting && (
  <>
    <button
      onClick={() => setMeetingExpanded(e => !e)}
      className="flex items-center gap-2 flex-1 min-w-0 text-left"
    >
      <Clock size={12} className="text-stone/50 flex-shrink-0" />
      {/* ... existing content ... */}
    </button>
    {meetingExpanded && (
      <div className="mt-2 -mx-1">
        <MeetingInlineCard
          meeting={meeting}
          compact
          onBeginMeeting={() => onEnterCitadel(/* meeting context */)}
        />
      </div>
    )}
  </>
)}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: Clean

**Step 3: Commit**

```bash
git add src/components/vandaag/SortableVandaagItem.tsx
git commit -m "feat: add inline meeting expansion to daily plan sortable items"
```

---

## Task 5: Final verification and deploy

**Step 1: Full TypeScript check**

Run: `npx tsc --noEmit`
Expected: Clean (0 errors)

**Step 2: Visual verification across all screens**

Check each integration point:
1. Meetings page → cards expand/collapse, auto-save works, recurring templates editable
2. Project modal → cards work inline, "+ New" creates expanded card
3. Vandaag view → meeting items in plan expand to show card
4. No console errors

**Step 3: Deploy**

Run: `npx vercel --prod`
Expected: Successful deployment

**Step 4: Commit any final fixes**

```bash
git add -A
git commit -m "feat: complete inline meeting cards integration across all screens"
```
