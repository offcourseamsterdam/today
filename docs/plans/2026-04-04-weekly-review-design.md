# Weekly Review Design

**Date:** 2026-04-04

## Problem

No structured way to do a GTD-style weekly review — going through all projects, cleaning up orphan tasks, reviewing recurring templates, and getting a clear head for the next week.

## Goal

A dedicated "Review" page (alongside Vandaag and Meetings) with 4 sections in a hybrid wizard: fixed sections with free navigation and a progress bar.

## Approach: Vertical checklist page with collapsible sections

Single scrollable page, 4 sections stacked vertically. Progress bar at top with clickable section indicators. Sections auto-open when previous is completed. All changes are live (real store mutations) — no session state needed.

---

## Sections

### 1. Inbox (orphan tasks)

**Card-stack UX** — one task at a time, centered. Not a list.

Each card shows:
- Task title (serif, large)
- Created date (small, stone)
- Three action buttons:
  - "Naar project" → project picker dropdown → assigns task, next card slides in
  - "Houden" → keeps as standalone orphan, next card
  - "Verwijderen" → removes task, next card

Counter: "3 van 8". Empty state: large checkmark "Inbox leeg".

### 2. Projecten (the core)

All projects grouped by kanban column, ordered: **In Progress → Waiting → Backlog → Done**.

Per project — compact row:
- Column badge (color-coded)
- Title
- Open tasks count / total
- Waiting-on indicator (amber badge with days if applicable)

Click to expand in-place:
- **Tasks**: checklist with complete/delete actions
- **Waiting on**: editable field with "resolved" button
- **"Eerste volgende actie?"**: text input at bottom. If no clear next action exists, highlighted with soft amber background. Typing here creates a new task as the first task.
- **Project actions**: subtle button row — "→ Backlog", "→ Done", "Archiveren" to move/archive the project directly

When all tasks checked + project moved to Done → row collapses with green checkmark.

### 3. Recurring tasks

Simple list of recurring task templates:
- Title + frequency badge ("Wekelijks", "Dagelijks")
- Active/inactive toggle
- Edit button → expands `RecurrenceFrequencyPicker` in-place
- Delete button (with confirmation)

### 4. Afsluiten

Auto-generated summary of what was done during the review:
- "5 inbox items verwerkt (2 naar project, 1 verwijderd, 2 gehouden)"
- "3 taken afgevinkt, 2 projecten naar Done verplaatst"
- "1 recurring task gedeactiveerd"

Stats tracked automatically via counting store mutations. Free text field for reflection/notes. "Review afronden" button shows a toast.

---

## UX Details

- **Auto-scroll**: completing a section scrolls smoothly to the next and opens it
- **Keyboard**: Enter to confirm inbox card, arrow keys for project navigation
- **Animations**: cards slide away on process, project rows fold open/closed smoothly
- **No session state**: all mutations are real store operations — stopping mid-review and coming back later loses no work
- **Progress bar**: 4 numbered circles connected by lines, filled when section is marked done, clickable to jump

## Navigation

New tab in the app navigation: "Review" (alongside Vandaag and Meetings). Always accessible.

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/review/WeeklyReviewPage.tsx` | Page orchestrator: progress bar + 4 collapsible sections |
| `src/components/review/InboxSection.tsx` | Card-stack inbox processing |
| `src/components/review/ProjectsSection.tsx` | Project list with expand/edit/move |
| `src/components/review/ProjectReviewCard.tsx` | Single expandable project row |
| `src/components/review/RecurringSection.tsx` | Recurring templates list |
| `src/components/review/SummarySection.tsx` | Auto-generated stats + reflection |

## Files to Modify

| File | Change |
|------|---------|
| `src/App.tsx` | Add "review" to `ActiveView`, add route to `WeeklyReviewPage` |
| `src/store/types.ts` | Add `'review'` to `ActiveView` type if needed |
| Navigation component | Add Review tab |
