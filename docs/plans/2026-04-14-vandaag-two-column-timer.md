# Vandaag Two-Column Layout + Inline Pomodoro Timer

## Context

Redesign Vandaag view from single-column task list to two-column layout: tasks left, pomodoro timer right. Timer replaces CitadelMode. Full page goes dark when timer runs. All plan items (including projects) become checkmarkable.

Bug fix: "Plan mijn dag" incorrectly navigates to tomorrow's planning.

## Design Decisions

- **Timer replaces CitadelMode** entirely (no coexistence)
- **Full page dark mode** when timer is running (not just Vandaag section)
- **Project completion is visual only** in today's plan (no kanban effect)
- **Timer linked to tasks** — click play on a task to start timer for it
- **All tasks visible** when timer runs, active task highlighted
- **Scratchpad + notes** carry over from CitadelMode
- **Mobile**: floating mini timer bar when timer active

## Timer Modes

| Mode  | Work  | Break | 
|-------|-------|-------|
| Short | 25min | 5min  |
| Long  | 50min | 10min |

Sessions count upward indefinitely. Auto-pause between phases.

## Architecture

- `InlineTimerState` replaces `FocusSession` type
- `inlineTimerSlice.ts` replaces `focusSlice.ts`
- `VandaagDarkContext` propagates dark state to all children
- `completedItemIds: string[]` on `DailyPlan` tracks checked-off items
- `InlinePomodoroTimer` component in right column
- `MiniTimerBar` floating bar on mobile

## Files Changed

New: `inlineTimerSlice.ts`, `VandaagDarkContext.tsx`, `InlinePomodoroTimer.tsx`, `MiniTimerBar.tsx`
Deleted: `focusSlice.ts`, `CitadelMode.tsx`, `CitadelTaskPanel.tsx`
Modified: `types/index.ts`, `store/types.ts`, `store/index.ts`, `store/plansSlice.ts`, `App.tsx`, `VandaagView.tsx`, `SortableVandaagItem.tsx`, `TierSectionHeader.tsx`, `PlanningMode.tsx`
