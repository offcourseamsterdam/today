import type { InlineTimerMode, InlineTimerState } from '../types'
import type { StoreSet, StoreGet } from './types'
import { playChime } from '../lib/chime'

export const INLINE_DURATIONS = {
  short: { workMinutes: 25, breakMinutes: 5 },
  long:  { workMinutes: 50, breakMinutes: 10 },
} as const

export function makeInlineTimerActions(set: StoreSet, get: StoreGet) {
  return {
    startInlineTimer: (mode: InlineTimerMode, linkedItemId?: string, linkedItemTitle?: string, linkedProjectTitle?: string, linkedProjectId?: string) => {
      const { workMinutes, breakMinutes } = INLINE_DURATIONS[mode]
      const now = new Date().toISOString()
      const timer: InlineTimerState = {
        mode,
        secondsLeft: workMinutes * 60,
        isRunning: true,
        isBreak: false,
        sessionsCompleted: 0,
        linkedItemId,
        linkedItemTitle,
        linkedProjectTitle,
        linkedProjectId,
        startedAt: now,
        lastTickAt: now,
        workMinutes,
        breakMinutes,
      }
      set({ inlineTimer: timer })
    },

    stopInlineTimer: () => {
      set({ inlineTimer: null })
    },

    pauseInlineTimer: () => {
      const { inlineTimer } = get()
      if (!inlineTimer) return
      set({ inlineTimer: { ...inlineTimer, isRunning: false } })
    },

    resumeInlineTimer: () => {
      const { inlineTimer } = get()
      if (!inlineTimer) return
      set({ inlineTimer: { ...inlineTimer, isRunning: true, lastTickAt: new Date().toISOString() } })
    },

    resetInlineTimer: () => {
      const { inlineTimer } = get()
      if (!inlineTimer) return
      const duration = inlineTimer.isBreak
        ? inlineTimer.breakMinutes * 60
        : inlineTimer.workMinutes * 60
      set({ inlineTimer: { ...inlineTimer, secondsLeft: duration, isRunning: false } })
    },

    skipInlineTimerPhase: () => {
      const { inlineTimer } = get()
      if (!inlineTimer) return

      if (!inlineTimer.isBreak) {
        // Skipping work phase — counts as completed session
        const newSessions = inlineTimer.sessionsCompleted + 1
        if (inlineTimer.linkedItemId) {
          get().logPomodoroSession(inlineTimer.linkedItemId, 'short', inlineTimer.workMinutes)
        }
        // Switch to break, auto-pause
        set({
          inlineTimer: {
            ...inlineTimer,
            sessionsCompleted: newSessions,
            isBreak: true,
            secondsLeft: inlineTimer.breakMinutes * 60,
            isRunning: false,
            lastTickAt: new Date().toISOString(),
          },
        })
      } else {
        // Skipping break — switch to work, auto-pause
        set({
          inlineTimer: {
            ...inlineTimer,
            isBreak: false,
            secondsLeft: inlineTimer.workMinutes * 60,
            isRunning: false,
            lastTickAt: new Date().toISOString(),
          },
        })
      }
    },

    setInlineTimerMode: (mode: InlineTimerMode) => {
      const { inlineTimer } = get()
      if (!inlineTimer || inlineTimer.isRunning) return // only when paused
      const { workMinutes, breakMinutes } = INLINE_DURATIONS[mode]
      set({
        inlineTimer: {
          ...inlineTimer,
          mode,
          workMinutes,
          breakMinutes,
          secondsLeft: inlineTimer.isBreak ? breakMinutes * 60 : workMinutes * 60,
        },
      })
    },

    tickInlineTimer: () => {
      const { inlineTimer } = get()
      if (!inlineTimer || !inlineTimer.isRunning) return

      const missedSeconds = Math.floor((Date.now() - Date.parse(inlineTimer.lastTickAt)) / 1000)
      const decrement = Math.max(1, missedSeconds)
      const newSecondsLeft = inlineTimer.secondsLeft - decrement

      if (newSecondsLeft <= 0) {
        // Phase ended
        if (!inlineTimer.isBreak) {
          // Work phase ended — log session, switch to break, auto-pause
          const newSessions = inlineTimer.sessionsCompleted + 1
          if (inlineTimer.linkedItemId) {
            get().logPomodoroSession(inlineTimer.linkedItemId, 'short', inlineTimer.workMinutes)
          }
          playChime('work')
          set({
            inlineTimer: {
              ...inlineTimer,
              sessionsCompleted: newSessions,
              isBreak: true,
              secondsLeft: inlineTimer.breakMinutes * 60,
              isRunning: false,
              lastTickAt: new Date().toISOString(),
            },
          })
        } else {
          // Break ended — switch to work, auto-pause
          playChime('break')
          set({
            inlineTimer: {
              ...inlineTimer,
              isBreak: false,
              secondsLeft: inlineTimer.workMinutes * 60,
              isRunning: false,
              lastTickAt: new Date().toISOString(),
            },
          })
        }
      } else {
        // Normal tick
        set({
          inlineTimer: {
            ...inlineTimer,
            secondsLeft: newSecondsLeft,
            lastTickAt: new Date().toISOString(),
          },
        })
      }
    },
  }
}
