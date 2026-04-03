# Focus Mode Skip Button Design

**Date:** 2026-04-03

## Problem

In CitadelMode (focus overlay), there is no way to skip the current work or break phase without waiting for the timer to run down. Users want to be able to skip to the next phase (next break, or next focus session) while still having the completed session counted.

## Goal

Add a "Skip" button to CitadelMode that advances to the next phase immediately, counting the skipped session as complete.

## Behaviour

### Skip during a work phase
1. Increment `sessionsCompleted` (same as natural phase end)
2. Call `logPomodoroSession` to record the session in the pomodoro log
3. If `breakMinutes > 0`: transition to break phase (`isBreak: true`, reset seconds, `isRunning: false`)
4. If `breakMinutes === 0`: transition to next work phase (`isBreak: false`, reset seconds, `isRunning: false`)

### Skip during a break phase
1. Transition to next work phase (`isBreak: false`, reset seconds, `isRunning: false`)
2. No session log (break doesn't count as a session)

Both cases auto-pause at the new phase (same as natural phase transitions), letting the user consciously start the next phase.

## Implementation

### New store action: `skipFocusPhase`

Added to `focusSlice.ts`. Mirrors the `newSecondsLeft <= 0` branch in `tickFocusSession` exactly, but triggers immediately instead of waiting for the timer.

### UI in `CitadelMode.tsx`

Skip button placed in the timer controls row alongside play/pause and reset. Visual style: small, muted — `SkipForward` icon (14px) from lucide-react. Same styling as the reset button.

```
[Reset] [Play/Pause] [Skip]
```

The button is always visible (not hidden during break), since skipping a break is also valid.

## Files to Modify

| File | Change |
|------|--------|
| `src/store/focusSlice.ts` | Add `skipFocusPhase` action |
| `src/store/types.ts` | Add `skipFocusPhase: () => void` to VandaagState |
| `src/components/vandaag/CitadelMode.tsx` | Add Skip button wired to `skipFocusPhase` |
