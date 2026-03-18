# Recurring Tasks Drawer Design

**Date:** 2026-03-18

## Overview

Replace the "New recurring task" FAB action (which opened an add-only modal) with a "Recurring tasks" action that opens a full-featured right-side drawer for managing all recurring tasks.

## Problem

- The FAB had `AddRecurringTaskModal` — add only, no management of existing tasks.
- `RecurringTemplates` component existed with full manage+add UI but was wired nowhere.
- No single place to view, edit, or delete recurring tasks from the main app.

## Solution

A `RecurringTasksDrawer` component: a right-side slide-in panel triggered from the FAB, containing the full recurring task manager.

## Components

### `RecurringTasksDrawer` (new, replaces both `AddRecurringTaskModal` and `RecurringTemplates`)

- Fixed right-side panel, `z-50`, slides in from the right (`translate-x-full` → `translate-x-0`)
- Backdrop overlay on the left closes the drawer on click
- Header: "Recurring tasks" title + X close button
- Body (scrollable): list of all recurring tasks
  - Each row: missed-indicator dot, title, project tag, frequency description
  - Hover reveals edit (pencil) and delete (trash) actions
  - Inline edit form expands in place
- Footer: "Add recurring task" button that expands inline add form
- Reuses `RecurrenceFrequencyPicker` for both add and edit forms
- Reuses logic from `RecurringTemplates` (form state, validation, handlers)

### `SmartFab` (update)

- Rename prop `onAddRecurringTask` → `onOpenRecurringTasks`
- Rename label "New recurring task" → "Recurring tasks"

### `App.tsx` (update)

- Replace `showAddRecurringModal` state with `showRecurringDrawer`
- Replace `<AddRecurringTaskModal>` with `<RecurringTasksDrawer>`
- Pass `onOpenRecurringTasks={() => setShowRecurringDrawer(true)}` to FAB

### Files to delete

- `src/components/kanban/AddRecurringTaskModal.tsx` — superseded by drawer
- `src/components/vandaag/RecurringTemplates.tsx` — logic moved into drawer

## Data Flow

- Drawer reads from `useStore`: `recurringTasks`, `projects`
- Drawer writes via: `addRecurringTask`, `updateRecurringTask`, `deleteRecurringTask`
- No new store changes needed

## Drawer UX Details

- Width: ~380px on desktop
- Animation: `transform` slide from right, `duration-300`
- Backdrop: semi-transparent, click to close
- ESC key closes the drawer
- After adding a task, form resets and collapses; new task appears at top of list
