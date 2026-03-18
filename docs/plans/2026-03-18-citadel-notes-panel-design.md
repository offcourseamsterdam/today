# Citadel Mode — Project Notes Panel

**Date:** 2026-03-18
**Status:** Approved

## Overview

Add a togglable project notes panel to CitadelMode (the full-screen dark focus environment). The panel slides up from the bottom as a sheet, showing the same BlockNote rich-text editor that lives in the Project Modal — reading and writing the same `project.bodyContent` field.

## Architecture

### Data flow
- `project.bodyContent` (BlockNote JSON string) is the single source of truth
- Both the Project Modal editor and the Citadel notes panel call `updateProject(id, { bodyContent })` on change
- No extra sync layer needed — they share the same Zustand store

### Changes required

**1. `CitadelContext` (App.tsx)**
Add `projectId?: string` so the project can be looked up inside CitadelMode.

**2. App.tsx — citadel launch paths**
- Deep block path: already has `projectId` — pass it through
- Task-based paths: pass `projectId` only if the task belongs to a project (lookup via `findTaskById`)

**3. `CitadelMode` component**
- New prop: `projectId?: string`
- Uses `useStore` to get `projects` and `updateProject`
- New state: `notesOpen: boolean`
- Renders a "Notes" toggle button (bottom area, near scratchpad)
- Renders a bottom sheet panel (`fixed bottom-0 left-0 right-0 h-[55vh]`) with CSS slide-up transition
- Sheet contains a dark-themed `ProjectEditor`
- Only shown when `projectId` resolves to a real project

**4. `ProjectEditor` component**
- Add optional `theme?: 'light' | 'dark'` prop (default `'light'`)
- Passes `theme` to `BlockNoteView`

## UI / Layout

```
┌─────────────────────────────────────┐
│  ← Return          Session 1/4      │  ← top bar
│                                     │
│        Project Title                │
│        intention text               │  ← heading
│                                     │
│         ┌─ timer ─┐                 │
│         │ 24:59   │                 │  ← SVG ring timer
│         └─────────┘                 │
│                                     │
│         ▶  ↺                        │  ← controls
│                                     │
│  [thought capture input]  [Notes ✎] │  ← scratchpad + notes toggle
│                                     │
├─────────────────────────────────────┤  ← sheet slides up from here
│  Project Notes              ×       │
│  ─────────────────────────────────  │
│  [BlockNote dark editor]            │
│                                     │  ← 55vh
└─────────────────────────────────────┘
```

**Styling:**
- Sheet bg: `bg-[#1C1A17]`, top border: `border-t border-citadel-text/10`
- Notes toggle button: subtle icon+label, `text-citadel-text/30 hover:text-citadel-text/60`
- Sheet header: "Project Notes" label + close × button
- BlockNote: `theme="dark"`
- Slide animation: `transition-transform duration-300`, `translate-y-full` → `translate-y-0`

## Implementation Steps

1. Add `theme` prop to `ProjectEditor`
2. Add `projectId?` to `CitadelContext` type in App.tsx
3. Update App.tsx citadel launch paths to pass `projectId`
4. Update `CitadelModeProps` to include `projectId?`
5. Add notes state + bottom sheet JSX to `CitadelMode`
6. Wire up `updateProject` in CitadelMode for notes changes
7. Build, verify, screenshot
