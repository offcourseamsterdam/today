import type { PlanTier, FocusSession } from '../types'
import type { StoreSet, StoreGet } from './types'
import { TIER_DURATIONS } from '../lib/calendar'

export function makeFocusActions(set: StoreSet, get: StoreGet) {
  return {
    startFocusSession: (params: {
      tier: PlanTier
      taskId: string
      taskTitle: string
      projectTitle?: string
      intention?: string
      projectId?: string
    }) => {
      const { workMinutes, breakMinutes, targetSessions } = TIER_DURATIONS[params.tier]
      const now = new Date().toISOString()
      const session: FocusSession = {
        tier: params.tier,
        taskId: params.taskId,
        taskTitle: params.taskTitle,
        projectTitle: params.projectTitle,
        intention: params.intention,
        projectId: params.projectId,
        startedAt: now,
        lastTickAt: now,
        secondsLeft: workMinutes * 60,
        isRunning: true,
        isBreak: false,
        sessionsCompleted: 0,
        workMinutes,
        breakMinutes,
        targetSessions,
      }
      set({ focusSession: session, showCitadel: true })
    },

    endFocusSession: () => {
      set({ focusSession: null, showCitadel: false })
    },

    showCitadelOverlay: () => {
      if (get().focusSession !== null) {
        set({ showCitadel: true })
      }
    },

    hideCitadelOverlay: () => {
      set({ showCitadel: false })
    },

    tickFocusSession: () => {
      const { focusSession } = get()
      if (!focusSession || !focusSession.isRunning) return

      const missedSeconds = Math.floor((Date.now() - Date.parse(focusSession.lastTickAt)) / 1000)
      const decrement = Math.max(1, missedSeconds)
      const newSecondsLeft = focusSession.secondsLeft - decrement

      if (newSecondsLeft <= 0) {
        // Phase ended
        if (!focusSession.isBreak) {
          // Work phase ended
          const newSessionsCompleted = focusSession.sessionsCompleted + 1
          get().logPomodoroSession(focusSession.taskId, focusSession.tier, focusSession.workMinutes)

          if (focusSession.breakMinutes === 0) {
            // No break — go straight back to work phase, auto-pause
            set({
              focusSession: {
                ...focusSession,
                sessionsCompleted: newSessionsCompleted,
                isBreak: false,
                secondsLeft: focusSession.workMinutes * 60,
                isRunning: false,
                lastTickAt: new Date().toISOString(),
              },
            })
          } else {
            // Switch to break phase, auto-pause
            set({
              focusSession: {
                ...focusSession,
                sessionsCompleted: newSessionsCompleted,
                isBreak: true,
                secondsLeft: focusSession.breakMinutes * 60,
                isRunning: false,
                lastTickAt: new Date().toISOString(),
              },
            })
          }
        } else {
          // Break phase ended — switch to work phase, auto-pause
          set({
            focusSession: {
              ...focusSession,
              isBreak: false,
              secondsLeft: focusSession.workMinutes * 60,
              isRunning: false,
              lastTickAt: new Date().toISOString(),
            },
          })
        }
      } else {
        // Normal tick — just decrement
        set({
          focusSession: {
            ...focusSession,
            secondsLeft: newSecondsLeft,
            lastTickAt: new Date().toISOString(),
          },
        })
      }
    },

    pauseFocusSession: () => {
      const { focusSession } = get()
      if (!focusSession) return
      set({ focusSession: { ...focusSession, isRunning: false } })
    },

    resumeFocusSession: () => {
      const { focusSession } = get()
      if (!focusSession) return
      set({ focusSession: { ...focusSession, isRunning: true, lastTickAt: new Date().toISOString() } })
    },

    resetFocusSession: () => {
      const { focusSession } = get()
      if (!focusSession) return
      const duration = focusSession.isBreak
        ? focusSession.breakMinutes * 60
        : focusSession.workMinutes * 60
      set({ focusSession: { ...focusSession, secondsLeft: duration, isRunning: false } })
    },

    skipFocusPhase: () => {
      const { focusSession } = get()
      if (!focusSession) return

      if (!focusSession.isBreak) {
        // Skipping a work phase — counts as a completed session
        const newSessionsCompleted = focusSession.sessionsCompleted + 1
        get().logPomodoroSession(focusSession.taskId, focusSession.tier, focusSession.workMinutes)

        if (focusSession.breakMinutes === 0) {
          set({
            focusSession: {
              ...focusSession,
              sessionsCompleted: newSessionsCompleted,
              isBreak: false,
              secondsLeft: focusSession.workMinutes * 60,
              isRunning: false,
              lastTickAt: new Date().toISOString(),
            },
          })
        } else {
          set({
            focusSession: {
              ...focusSession,
              sessionsCompleted: newSessionsCompleted,
              isBreak: true,
              secondsLeft: focusSession.breakMinutes * 60,
              isRunning: false,
              lastTickAt: new Date().toISOString(),
            },
          })
        }
      } else {
        // Skipping a break — just move to next work phase
        set({
          focusSession: {
            ...focusSession,
            isBreak: false,
            secondsLeft: focusSession.workMinutes * 60,
            isRunning: false,
            lastTickAt: new Date().toISOString(),
          },
        })
      }
    },
  }
}
