# Recurring Series Panel Design

**Date:** 2026-04-03

## Problem

When a user clicks a recurring meeting template in the Meetings inbox left column, the right panel currently shows a generic `MeetingInlineCard`. There is no way to see upcoming occurrences (with per-occurrence agenda editing) or review past occurrences and their AI notes in one unified view.

## Goal

Clicking a recurring meeting template in the left panel shows a unified "series view" — a single scrollable panel with:
1. All upcoming occurrences (editable agendas)
2. All past occurrences (with their AI notes)

## Approach: Unified Timeline

One scrollable panel with three sections stacked vertically.

### Header (canvas background)

- `RotateCcw` icon + serif title
- Recurrence description: e.g. "Elke maandag · 09:00 · 60 min" (via `describeRule`)
- Collapsible "Bewerk schema" section — renders `MeetingInlineCard isTemplate` for editing the recurrence rule, default agenda, location, context

### Upcoming Occurrences

- Computed via `getNextOccurrences(template.recurrenceRule, 4)` (next 4 dates)
- Already-spawned occurrences (`meetings` with `recurringMeetingId === template.id` and future date) are shown as `MeetingInlineCard` directly
- Unspawned dates shown as a compact date row — clicking calls `spawnRecurringOccurrence(templateId, date)` and the row expands to a `MeetingInlineCard` with own editable agenda + Begin button
- `+ Voeg occurrence toe` button for manual date

### Past Occurrences (Geschiedenis)

- `meetings` where `recurringMeetingId === template.id` and date is in the past, sorted newest first
- Max 10 shown, "Toon meer" button for additional
- Each row: day + date + summary preview (2 lines, `line-clamp-2`)
- Click → expands inline to show `MeetingNotesDisplay` (if notes exist) or `MeetingInlineCard` (no notes, for rescheduling/editing)

## Data Changes

### `spawnRecurringOccurrence(templateId, date?)`
- Add optional `date?: string` (YYYY-MM-DD) parameter to the existing action
- When provided, stamps the spawned occurrence with that date instead of today

### `MeetingsPage`
- Detect if `selectedMeeting` is from `recurringMeetings` → render `<RecurringSeriesPanel>` instead of `<MeetingDetailPanel>`

## New Component: `RecurringSeriesPanel.tsx`

Props:
```ts
interface RecurringSeriesPanelProps {
  template: Meeting           // the recurring meeting template
  onBeginMeeting: (id: string) => void
  onDelete: () => void
}
```

State:
- `schemaOpen: boolean` — controls template editor visibility
- `expandedOccurrenceId: string | null` — which past row is open
- `spawnedToday: string | null` — id of occurrence just spawned (auto-expands it)

## Files to Create/Modify

| File | Change |
|------|--------|
| `src/components/meetings/RecurringSeriesPanel.tsx` | New component |
| `src/store/meetingsSlice.ts` | Add `date?` param to `spawnRecurringOccurrence` |
| `src/components/meetings/MeetingsPage.tsx` | Route recurring templates to `RecurringSeriesPanel` |
