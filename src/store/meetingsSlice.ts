import { v4 as uuid } from 'uuid'
import { getDay } from 'date-fns'
import type { Meeting } from '../types'
import type { StoreSet, StoreGet } from './types'

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
      const state = get()
      const now = new Date()
      const dow = getDay(now) // 0=Sun...6=Sat
      const dom = now.getDate() // 1–31
      return state.recurringMeetings.filter(m => {
        if (!m.recurrenceRule) return false
        const rule = m.recurrenceRule
        switch (rule.frequency) {
          case 'daily': return true
          case 'weekdays': return dow >= 1 && dow <= 5
          case 'weekly': return rule.customDays?.includes(dow) ?? dow === 1
          case 'custom': return rule.customDays?.includes(dow) ?? false
          case 'monthly_date': return rule.monthlyDate === dom
          case 'monthly_weekday': {
            if (!rule.monthlyWeekday) return false
            const { week, day } = rule.monthlyWeekday
            if (dow !== day) return false
            return Math.ceil(dom / 7) === week
          }
          case 'annual_dates': {
            const dates = rule.annualDates ?? []
            const month = now.getMonth() + 1
            const day = now.getDate()
            return dates.some(d => d.month === month && d.day === day)
          }
          default: return false
        }
      })
    },

    setOpenMeetingId: (id: string | null) => set({ openMeetingId: id }),
  }
}
