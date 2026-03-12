import { v4 as uuid } from 'uuid'
import type { Meeting } from '../types'
import type { StoreSet, StoreGet } from './types'
import { isDueToday } from '../lib/recurrence'

export function makeMeetingActions(set: StoreSet, get: StoreGet) {
  return {
    addMeeting: (meeting: Omit<Meeting, 'id' | 'createdAt'>): string => {
      const id = uuid()
      const newMeeting: Meeting = {
        ...meeting,
        id,
        createdAt: new Date().toISOString(),
      }
      set(state => ({ meetings: [...state.meetings, newMeeting] }))
      return id
    },

    updateMeeting: (id: string, updates: Partial<Omit<Meeting, 'id'>>) => {
      set(state => ({
        meetings: state.meetings.map(m =>
          m.id === id ? { ...m, ...updates } : m
        ),
      }))
    },

    deleteMeeting: (id: string) => {
      set(state => ({ meetings: state.meetings.filter(m => m.id !== id) }))
    },

    addRecurringMeeting: (meeting: Omit<Meeting, 'id' | 'createdAt'>): string => {
      const id = uuid()
      const newMeeting: Meeting = {
        ...meeting,
        id,
        createdAt: new Date().toISOString(),
      }
      set(state => ({ recurringMeetings: [...state.recurringMeetings, newMeeting] }))
      return id
    },

    updateRecurringMeeting: (id: string, updates: Partial<Omit<Meeting, 'id'>>) => {
      set(state => ({
        recurringMeetings: state.recurringMeetings.map(m =>
          m.id === id ? { ...m, ...updates } : m
        ),
      }))
    },

    deleteRecurringMeeting: (id: string) => {
      set(state => ({ recurringMeetings: state.recurringMeetings.filter(m => m.id !== id) }))
    },

    getTodayRecurringMeetings: (): Meeting[] => {
      return get().recurringMeetings.filter(m => m.recurrenceRule && isDueToday(m.recurrenceRule))
    },

    setOpenMeetingId: (id: string | null) => set({ openMeetingId: id }),
  }
}
