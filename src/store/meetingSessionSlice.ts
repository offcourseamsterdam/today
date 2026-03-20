import type { MeetingSession } from '../types'
import type { StoreSet, StoreGet } from './types'

export function makeMeetingSessionActions(set: StoreSet, get: StoreGet) {
  return {
    startMeetingSession: (meetingId: string) => {
      const meeting = [...get().meetings, ...get().recurringMeetings].find(m => m.id === meetingId)
      if (!meeting) return
      const firstItem = meeting.agendaItems?.[0]
      const now = new Date().toISOString()
      set({ meetingSession: {
        meetingId, currentItemIndex: 0, completedItemIds: [],
        secondsLeft: firstItem?.durationMinutes != null ? firstItem.durationMinutes * 60 : null,
        isRunning: true, startedAt: now, lastTickAt: now,
      }})
    },
    endMeetingSession: () => set({ meetingSession: null }),
    pauseMeetingSession: () => {
      const { meetingSession } = get()
      if (meetingSession) set({ meetingSession: { ...meetingSession, isRunning: false } })
    },
    resumeMeetingSession: () => {
      const { meetingSession } = get()
      if (meetingSession) set({ meetingSession: { ...meetingSession, isRunning: true, lastTickAt: new Date().toISOString() } })
    },
    advanceMeetingItem: () => {
      const { meetingSession, meetings, recurringMeetings } = get()
      if (!meetingSession) return
      const meeting = [...meetings, ...recurringMeetings].find(m => m.id === meetingSession.meetingId)
      if (!meeting) return
      const items = meeting.agendaItems ?? []
      const currentItem = items[meetingSession.currentItemIndex]
      const completedItemIds = currentItem
        ? [...meetingSession.completedItemIds, currentItem.id]
        : meetingSession.completedItemIds
      const nextIndex = meetingSession.currentItemIndex + 1
      if (nextIndex >= items.length) { set({ meetingSession: null }); return }
      const nextItem = items[nextIndex]
      set({ meetingSession: {
        ...meetingSession, currentItemIndex: nextIndex, completedItemIds,
        secondsLeft: nextItem?.durationMinutes != null ? nextItem.durationMinutes * 60 : null,
        isRunning: true, lastTickAt: new Date().toISOString(),
      }})
    },
    tickMeetingSession: () => {
      const { meetingSession } = get()
      if (!meetingSession?.isRunning || meetingSession.secondsLeft === null) return
      const missed = Math.floor((Date.now() - Date.parse(meetingSession.lastTickAt)) / 1000)
      const newSecondsLeft = meetingSession.secondsLeft - Math.max(1, missed)
      if (newSecondsLeft <= 0) {
        set({ meetingSession: { ...meetingSession, secondsLeft: 0, isRunning: false, lastTickAt: new Date().toISOString() } })
      } else {
        set({ meetingSession: { ...meetingSession, secondsLeft: newSecondsLeft, lastTickAt: new Date().toISOString() } })
      }
    },
  }
}
