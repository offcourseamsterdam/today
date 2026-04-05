# Inline Meeting Cards — Design

## Problem
Meetings are fragmented across too many screens. Editing a meeting requires navigating away from your current context (project modal → Meetings page, planning modal → MeetingPrePanel). Recurring templates can't have their agenda edited. The whole flow feels disconnected.

## Solution
A single `MeetingInlineCard` component used everywhere. It expands in-place to reveal full editing — title, time, agenda, recurrence. No navigation away. Same component in the Meetings page, project modal, planning modal, and Vandaag view.

## Component: MeetingInlineCard

### Props
```ts
interface MeetingInlineCardProps {
  meeting: Meeting
  isTemplate?: boolean        // recurring template (shows template agenda)
  defaultExpanded?: boolean   // for newly created meetings
  onBeginMeeting?: () => void // optional — shows "Begin" button when provided
  onDelete?: () => void       // optional — shows delete in footer
  compact?: boolean           // planning modal uses tighter spacing
}
```

### Collapsed state
One row: time badge + title + duration + ↻ icon (if recurring). Click to expand.

### Expanded state
- Title (editable inline, serif 18px)
- Time / Date / Duration (compact row with pickers)
- AgendaItemEditor (reuse existing component)
- RecurrenceFrequencyPicker (if template)
- Footer: "Begin meeting" button (if onBeginMeeting provided) + "Delete" (subtle)
- Auto-saves on collapse or blur via debounced store update

### Recurring template behavior
- Shows agenda as template items (editable)
- Badge: "Template · applies to new occurrences"
- Uses `updateRecurringMeeting()` to save
- Instance cards use `updateMeeting()` for per-occurrence edits

## Integration per screen

### Meetings page (UpcomingColumn)
- Replace `MeetingItem` rows with `MeetingInlineCard`
- Section grouping (Today/Tomorrow/This Week/Later) unchanged
- Recurring section: template cards with recurrence editing
- MeetingPrePanel becomes optional (only for live session transition)

### Project modal (Meetings tab)
- Upcoming meetings: `MeetingInlineCard` per meeting
- Recurring: template card + occurrence cards
- "+ New" creates card in expanded state
- Past meetings: keep current expandable notes (read-only)

### Planning modal (InventoryPanel)
- Meeting items show as compact `MeetingInlineCard`
- Expand to preview/edit agenda before adding to plan

### Vandaag view (DailyPlanList)
- Meeting items in sortable list expand inline for agenda preview
- "Begin meeting" button on expanded card

## Files

### New
- `src/components/meetings/MeetingInlineCard.tsx` — the core component

### Modified
- `src/components/meetings/UpcomingColumn.tsx` — swap MeetingItem for MeetingInlineCard
- `src/components/kanban/ProjectModalMeetings.tsx` — swap occurrence rows for MeetingInlineCard
- `src/components/planning/InventoryPanel.tsx` — compact MeetingInlineCard for meetings
- `src/components/vandaag/SortableVandaagItem.tsx` — inline expansion for meeting items

### Unchanged
- `AgendaItemEditor.tsx` — reused as-is inside the card
- `RecurrenceFrequencyPicker` — reused as-is for template cards
- `MeetingPrePanel.tsx` — kept for live session setup flow (not removed)
- `useMeetingForm.ts` — reused for form state management

## Auto-save strategy
- Card tracks local form state (title, time, agenda, recurrence)
- On collapse: save to store (`updateMeeting` or `updateRecurringMeeting`)
- On 2s idle after last edit: auto-save (debounced)
- No explicit "Save" button needed for edits (only "Begin meeting" and "Delete")
