# Project Modal Redesign

## Goal

Streamline the project modal from a long vertical scroll into a tabbed interface with a compact fixed header, collapsible sections, and a wider container.

## Container

- `max-w-4xl` (896px), up from current `max-w-2xl` (672px)
- `max-h-[92vh]`, rounded-2xl, white bg, backdrop overlay
- Mobile: full-width bottom sheet (unchanged)

## Fixed Header (non-scrolling)

```
┌────────────────────────────────────────────────────────┐
│ [Cover image h-32, reposition + refresh on hover]  ⚙ X│
├────────────────────────────────────────────────────────┤
│ Project Title (click to edit, 22px serif)               │
│ MARKETING · 3 days worked                              │
├────────────────────────────────────────────────────────┤
│  Tasks    Notes    Meetings (3)                        │
│  ─────                                                 │
└────────────────────────────────────────────────────────┘
```

- **Cover:** h-32 (reduced from h-52). Reposition/refresh controls appear on hover. No-image state shows colored bar + "Find artwork" button.
- **Close button (X):** Top-right corner of cover.
- **Gear icon:** Next to X. Toggles settings panel.
- **Title:** Editable on click. 22px Fraunces serif.
- **Meta row:** Category badge (compact pill) + days worked count (if track progress enabled).
- **Tab bar:** 3 tabs. Active tab has underline in category color. Meetings tab shows count badge if meetings exist.

## Gear Panel (settings)

Slides down below header, above tab content. Toggle via gear icon.

Contains in a compact 2-column grid:
- Category selector (6 buttons)
- Context toggles (from personal rules)
- Track progress toggle
- Mission critical toggle
- Complete project toggle
- Delete project (red text, with confirmation)

## Tab: Tasks (default)

Vertical stack, scrollable:

1. **Waiting On** — collapsible section
   - Auto-open if entries exist, collapsed if empty
   - Person name + age badge (amber <7d, red >=14d) + delete
   - "Add another..." input at bottom
   - Adding first entry on in_progress project moves it to waiting status

2. **Tasks** — always visible
   - Header: "TASKS" + "done/total" count
   - Active tasks: sortable via dnd-kit drag handles, inline title editing
   - Done tasks: pinned at bottom, separated by thin border, not draggable
   - Each row: grip | checkbox | title | uncomfortable pill | delete
   - "+ Add a task..." form at bottom

3. **Recurring Tasks** — collapsible section
   - Auto-open if recurring tasks exist, collapsed if empty
   - Each row: title + frequency description + edit + delete
   - Add form (collapsible): title input + RecurrenceFrequencyPicker

## Tab: Notes

Full-height BlockNote rich text editor. No other content — maximizes writing space.

## Tab: Meetings

Existing ProjectModalMeetings content, now with full tab width:

1. **Key Decisions** — collapsible, auto-open if cached data exists
   - Fetches from /api/project-decisions
   - List of decisions with responsible person + date + meeting title

2. **Upcoming** — visible if upcoming meetings exist
   - One-off meetings: time + date + title rows
   - Recurring meetings: collapsible blocks with next 5 occurrences
   - Agenda suggestions computed from past meeting notes

3. **Past Meetings** — collapsible with count badge
   - Recent Summary card (AI-generated, collapsible)
   - Past meeting rows: date + title + outcome badge, expandable for notes

## Collapsible Behavior

All collapsible sections follow the same pattern:
- **Auto-open** if the section has data
- **Collapsed** if empty (shows header only, click to expand)
- Smooth height transition (200ms ease-out)
- Chevron icon rotates on expand/collapse

## Component Changes

| File | Change |
|------|--------|
| `ProjectModal.tsx` | Rewrite: add tab state, fixed header, gear panel, render active tab content |
| `ProjectModalCover.tsx` | Reduce height h-52 → h-32, gear icon slot |
| `ProjectModalTasks.tsx` | Already has dnd + inline edit. Wrap in tab content container |
| `ProjectModalWaiting.tsx` | Make collapsible, move into Tasks tab |
| `ProjectModalRecurring.tsx` | Make collapsible, move into Tasks tab |
| `ProjectModalMeetings.tsx` | No structural changes, just rendered in Meetings tab |
| NEW: `ProjectModalSettings.tsx` | Extract settings into gear panel component |

## No Changes

- Store actions unchanged
- Data model unchanged
- Mobile layout unchanged (bottom sheet, but wider on tablet+)
