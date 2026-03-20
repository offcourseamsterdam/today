# Meeting Agenda Timer — Design

**Date:** 2026-03-20
**Status:** Approved

## Overview

Enhance the meeting planner with structured agenda items (replacing the plain textarea), optional per-item durations, and a live meeting timer mode that persists across navigation with FAB integration.

## Data Model

### New `AgendaItem` type (`src/types/index.ts`)

```ts
interface AgendaItem {
  id: string
  title: string
  durationMinutes?: number  // optional per-item countdown
}
```

### Updated `Meeting` type

- Remove `agenda?: string`
- Add `agendaItems?: AgendaItem[]`
- `actions` and `takeaways` remain unchanged

### New `MeetingSession` type (persisted in Zustand)

```ts
interface MeetingSession {
  meetingId: string
  currentItemIndex: number
  completedItemIds: string[]   // items marked done
  secondsLeft: number | null   // null = no duration for this item
  isRunning: boolean
  startedAt: string
  lastTickAt: string           // for catch-up on page reload/background tab
}
```

## Store Changes

- Add `meetingSession: MeetingSession | null` to `VandaagState`
- Persisted via Zustand `partialize`
- New `makeMeetingSessionActions` (or extend `meetingsSlice`) with:
  - `startMeetingSession(meetingId)`
  - `endMeetingSession()`
  - `tickMeetingSession()` — catches up missed seconds via `lastTickAt`
  - `advanceMeetingItem()` — marks current as complete, moves to next; ends session on last item
  - `pauseMeetingSession()` / `resumeMeetingSession()`
- Global tick added to `App.tsx` `useEffect` (same pattern as focus timer)

## Agenda Editor (MeetingModal)

Replace the `agenda` textarea with a structured list input:

- Each row: `[ text input ] [ duration chip ] [ × remove ]`
- Duration chip: blank / 5 / 10 / 15 / 20 / 30 / 45 / 60 min (inline chip group)
- **Enter** in a row → creates new row below and focuses it
- **Backspace** on empty row → deletes it, focuses row above
- Drag-to-reorder via dnd-kit (`useSortable` — same pattern as task lists)
- Footer "+ Add agenda item" button
- "Start meeting" button appears when at least one agenda item exists

## Live Meeting View (MeetingsDrawer)

A live panel pinned at the top of the drawer when a session is active:

```
┌─────────────────────────────────────────┐
│  ● LIVE  Weekly sync          [End]     │
│                                         │
│  2 / 5 items                            │
│  ████████░░░░░░░░░░░░  (progress bar)  │
│                                         │
│  ✓ Intro                                │
│  → Budget review              12:45 ↓  │
│    Design feedback                      │
│    Q&A                                  │
│                                         │
│  [⏸ Pause]              [Next item →]  │
└─────────────────────────────────────────┘
```

- Current item shown prominently with countdown (if timed) or just highlighted (if untimed)
- Completed items shown with checkmark above current
- Upcoming items dimmed below
- "Next item →" marks current complete and advances; on last item ends session
- "End" stops session entirely
- Drawer can be closed — session continues running in background

## FAB Integration

When `meetingSession` is active and drawer is closed, FAB label shows:

`● Meeting title · Back to agenda`

- Amber dot (meetings), clicking opens MeetingsDrawer

**FAB label priority order:**
1. Focus session active → green dot, `"Project · Back to focus"`
2. Meeting session active → amber dot, `"Meeting title · Back to agenda"`
3. Plan nudges → `"Plan today"` / `"Plan tomorrow"`

## Files to Create/Modify

| File | Change |
|------|--------|
| `src/types/index.ts` | Add `AgendaItem`, `MeetingSession`; update `Meeting` |
| `src/store/meetingsSlice.ts` | Add meeting session actions |
| `src/store/types.ts` | Add `meetingSession` to `VandaagState` |
| `src/store/index.ts` | Add `meetingSession` to persist partialize |
| `src/App.tsx` | Add global tick for meeting session |
| `src/components/meetings/MeetingModal.tsx` | Replace textarea with agenda item list |
| `src/components/meetings/MeetingsDrawer.tsx` | Add live session panel |
| `src/components/ui/SmartFab.tsx` | Add meeting session label |
