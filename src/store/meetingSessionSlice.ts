import type { StoreSet, StoreGet } from './types'
import type { AgendaItem } from '../types'

export function makeMeetingSessionActions(set: StoreSet, get: StoreGet) {
  return {
    startMeetingSession: (meetingId: string) => {
      const meeting = [...get().meetings, ...get().recurringMeetings].find(m => m.id === meetingId)
      if (!meeting) return
      const items = meeting.agendaItems ?? []
      const hasItems = items.length > 0
      const firstItem = hasItems ? items[0] : undefined
      const now = new Date().toISOString()
      set({
        isLiveMeetingOpen: true,
        meetingSession: {
          meetingId, currentItemIndex: hasItems ? 0 : -1, completedItemIds: [],
          secondsLeft: firstItem?.durationMinutes != null ? firstItem.durationMinutes * 60 : null,
          isRunning: hasItems, startedAt: now, lastTickAt: now, isRecording: false,
          processingItemIds: [],
        }
      })
    },
    endMeetingSession: () => set({ meetingSession: null, isLiveMeetingOpen: false }),
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
      if (nextIndex >= items.length) { set({ meetingSession: null, isLiveMeetingOpen: false }); return }
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
    setLiveMeetingOpen: (open: boolean) => set({ isLiveMeetingOpen: open }),
    reorderLiveMeetingItems: (newItems: AgendaItem[]) => {
      const { meetingSession, meetings, recurringMeetings } = get()
      if (!meetingSession) return

      const allMeetings = [...meetings, ...recurringMeetings]
      const meeting = allMeetings.find(m => m.id === meetingSession.meetingId)
      if (!meeting) return

      const currentItem = meeting.agendaItems?.[meetingSession.currentItemIndex]

      const isRecurring = recurringMeetings.some(m => m.id === meetingSession.meetingId)

      const newIndex = currentItem ? newItems.findIndex(i => i.id === currentItem.id) : -1
      const indexChanged = !!(currentItem && newIndex >= 0 && newIndex !== meetingSession.currentItemIndex)

      const meetingsUpdate = isRecurring
        ? { recurringMeetings: recurringMeetings.map(m => m.id === meetingSession.meetingId ? { ...m, agendaItems: newItems } : m) }
        : { meetings: meetings.map(m => m.id === meetingSession.meetingId ? { ...m, agendaItems: newItems } : m) }

      set({
        ...meetingsUpdate,
        ...(indexChanged ? { meetingSession: { ...meetingSession, currentItemIndex: newIndex } } : {}),
      })
    },
  }
}
