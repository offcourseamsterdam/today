import type { CalendarEvent } from '../types'
import type { StoreSet, StoreGet } from './types'
import { fetchGoogleCalendarEvents } from '../lib/calendar'

export function makeCalendarActions(set: StoreSet, _get: StoreGet) {
  return {
    fetchCalendarEvents: async (accessToken: string, date: string): Promise<void> => {
      set({ calendarLoading: true, calendarError: null })
      try {
        const events = await fetchGoogleCalendarEvents(accessToken, date)
        set({ calendarEvents: events, calendarLoading: false })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch calendar events'
        set({ calendarError: message, calendarLoading: false })
      }
    },

    setCalendarEvents: (events: CalendarEvent[]) => set({ calendarEvents: events }),

    clearCalendarEvents: () => set({ calendarEvents: [], calendarError: null }),
  }
}
