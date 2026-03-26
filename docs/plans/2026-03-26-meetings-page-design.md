# Meetings Page Design
**Date:** 2026-03-26

## Problem

Two pain points in the current meeting flow:
1. After ending a meeting connected to a project, there is no redirect — the user is left in the notes modal with no path to the project context.
2. Standalone meetings (not connected to a project) have no persistent home for their notes. The drawer is transient and too narrow.

## Solution

A dedicated **Meetings page** as a first-class navigation view, plus smart end-meeting redirects.

---

## Layout

Two-column layout (mirrors kanban style):

### Left column (~35%) — Upcoming
- All scheduled meetings grouped: **Today / This week / Later**
- Recurring meetings shown as expandable blocks with next 5 occurrences
- Click any meeting → opens unified meeting modal (pre-panel or live)
- "+ New meeting" button at top
- Same data as the MeetingsDrawer, but persistent

### Right column (~65%) — History
- Chronological list of past meetings with notes, newest first
- Each row expands inline to show full notes (decisions, action items, open questions)
- Search bar at top — filters across titles, decisions, and action items
- Meetings without recordings shown dimmed with "no recording" label
- Meetings linked to a project show a project badge (clickable → opens project modal)

---

## Navigation

- New `meetings` value added to `ActiveView` type in `store/types.ts`
- New calendar icon in the main nav bar (between Vandaag and Kanban)
- Existing `MeetingsDrawer` stays — quick overlay from anywhere in the app
- Both share the same store data — no duplication

---

## End-Meeting Redirect Logic

In `LiveAgendaPanel`, the End button currently calls:
```ts
endMeetingSession()
setOpenMeetingId(meetingId) // → notes mode
```

**New behaviour:**
1. `meeting.projectId` exists and project still exists → close modal, open project modal, switch to Meetings tab, auto-expand that meeting's notes row
2. No `projectId` (or project deleted) → close modal, navigate to Meetings page (`setActiveView('meetings')`), mark `justEndedMeetingId` in store so History auto-expands it

---

## Store Changes

- Add `meetings` to `ActiveView` union
- Add `justEndedMeetingId: string | null` to store state (cleared when user collapses the row or navigates away)
- `endAndRedirectMeeting(meetingId)` action: encapsulates the branch logic above

---

## Components

### New
- `src/components/meetings/MeetingsPage.tsx` — page root, two-column layout
- `src/components/meetings/UpcomingColumn.tsx` — left column, grouped upcoming meetings
- `src/components/meetings/HistoryColumn.tsx` — right column, searchable past notes

### Modified
- `src/components/meetings/LiveAgendaPanel.tsx` — End button calls `endAndRedirectMeeting` instead of `setOpenMeetingId`
- `src/store/types.ts` — add `meetings` to `ActiveView`, add `justEndedMeetingId`
- `src/store/navigationSlice.ts` — handle `meetings` view
- `src/store/meetingSessionSlice.ts` — add `endAndRedirectMeeting` action
- `src/App.tsx` — render `MeetingsPage` when `activeView === 'meetings'`
- `src/components/kanban/ProjectModalMeetings.tsx` — `PastMeetingRow` auto-expands when `justEndedMeetingId` matches

---

## Edge Cases

- Meeting deleted mid-session → End falls back to Meetings page
- Project deleted but `meeting.projectId` still set → fall back to Meetings page
- User minimises live modal, navigates away, then ends later → same redirect logic applies
- `justEndedMeetingId` cleared on: row collapse, page navigation, or 30s timeout

---

## Out of Scope

- Search indexing / full-text backend search (client-side filter only)
- Email/export of meeting notes
- Calendar sync (Google Calendar import)
