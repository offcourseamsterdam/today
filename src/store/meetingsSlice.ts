import { v4 as uuid } from 'uuid'
import { format } from 'date-fns'
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

    // Creates a concrete meeting occurrence for today from a recurring template.
    // Idempotent: returns existing occurrence if already spawned today.
    spawnRecurringOccurrence: (templateId: string, date?: string): string => {
      const todayStr = format(new Date(), 'yyyy-MM-dd')
      const targetDate = date ?? todayStr
      const existing = get().meetings.find(
        m => m.recurringMeetingId === templateId && m.date === targetDate
      )
      if (existing) return existing.id
      const template = get().recurringMeetings.find(m => m.id === templateId)
      if (!template) return ''
      const id = uuid()
      const occurrence: Meeting = {
        ...template,
        id,
        date: targetDate,
        recurringMeetingId: templateId,
        isRecurring: false,
        recurrenceRule: undefined,
        meetingNotes: undefined,
        // Fresh agenda item IDs so this occurrence can diverge from the template
        agendaItems: template.agendaItems?.map(item => ({ ...item, id: uuid() })),
        createdAt: new Date().toISOString(),
      }
      set(state => ({ meetings: [...state.meetings, occurrence] }))
      return id
    },
  }
}
