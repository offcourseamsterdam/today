import type { PlanTier, FocusSession, PomodoroLogEntry } from '../types'
import { TIER_DURATIONS } from './calendar'

export interface FocusTimeInfo {
  label: string
  isActive: boolean
  isComplete: boolean
}

export function getFocusTimeLabel(
  taskId: string,
  tier: PlanTier,
  focusSession: FocusSession | null,
  pomodoroLog: PomodoroLogEntry[],
): FocusTimeInfo {
  const { workMinutes, targetSessions } = TIER_DURATIONS[tier]
  const logEntry = pomodoroLog.find(e => e.taskId === taskId)
  const sessionsCompleted = logEntry?.sessionsCompleted ?? 0

  // Active session for this task
  if (focusSession && focusSession.taskId === taskId) {
    const mins = Math.floor(focusSession.secondsLeft / 60)
    const secs = focusSession.secondsLeft % 60
    const timeStr = `${mins}:${String(secs).padStart(2, '0')}`

    if (focusSession.isRunning) {
      return { label: `${timeStr} remaining`, isActive: true, isComplete: false }
    }
    if (focusSession.isBreak) {
      return { label: `Break \u00b7 ${timeStr}`, isActive: true, isComplete: false }
    }
    return { label: `Paused \u00b7 ${timeStr} left`, isActive: true, isComplete: false }
  }

  // All sessions done
  if (sessionsCompleted >= targetSessions) {
    return { label: 'Focus complete', isActive: false, isComplete: true }
  }

  // Idle — show remaining sessions
  const remaining = targetSessions - sessionsCompleted
  if (tier === 'deep') {
    if (remaining === 1) return { label: `1 \u00d7 ${workMinutes} min session \u00b7 start now`, isActive: false, isComplete: false }
    return { label: `${remaining} \u00d7 ${workMinutes} min sessions left`, isActive: false, isComplete: false }
  }
  if (tier === 'maintenance') {
    return { label: `${workMinutes} min focus time`, isActive: false, isComplete: false }
  }
  // short
  return { label: `${workMinutes} min focus session`, isActive: false, isComplete: false }
}
