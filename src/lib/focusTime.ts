import type { InlineTimerState, PomodoroLogEntry } from '../types'

export interface FocusTimeInfo {
  label: string
  isActive: boolean
  isComplete: boolean
}

export function getFocusTimeLabel(
  itemId: string,
  inlineTimer: InlineTimerState | null,
  pomodoroLog: PomodoroLogEntry[],
): FocusTimeInfo {
  const logEntry = pomodoroLog.find(e => e.taskId === itemId)
  const sessionsCompleted = logEntry?.sessionsCompleted ?? 0

  // Active timer for this item
  if (inlineTimer && inlineTimer.linkedItemId === itemId) {
    const mins = Math.floor(inlineTimer.secondsLeft / 60)
    const secs = inlineTimer.secondsLeft % 60
    const timeStr = `${mins}:${String(secs).padStart(2, '0')}`

    if (inlineTimer.isRunning) {
      return { label: `${timeStr} remaining`, isActive: true, isComplete: false }
    }
    if (inlineTimer.isBreak) {
      return { label: `Break · ${timeStr}`, isActive: true, isComplete: false }
    }
    return { label: `Paused · ${timeStr} left`, isActive: true, isComplete: false }
  }

  // Has completed sessions
  if (sessionsCompleted > 0) {
    return { label: `${sessionsCompleted} session${sessionsCompleted > 1 ? 's' : ''} done`, isActive: false, isComplete: true }
  }

  // Idle — no sessions yet
  return { label: 'Focus', isActive: false, isComplete: false }
}
