import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuid } from 'uuid'
import type { VandaagState } from './types'
import { defaultSettings, getTodayString } from './helpers'
import type { Meeting, AgendaItemNotes } from '../types'
import { makeNavigationActions } from './navigationSlice'
import { makeProjectActions } from './projectsSlice'
import { makeTaskActions } from './tasksSlice'
import { makeDailyPlanActions } from './plansSlice'
import { makeSettingsActions } from './settingsSlice'
import { makeMeetingActions } from './meetingsSlice'
import { makeCalendarActions } from './calendarSlice'
import { makeFocusActions } from './focusSlice'
import { makeMeetingSessionActions } from './meetingSessionSlice'

function createSeedMeetings(): { meetings: Meeting[]; recurringMeetings: Meeting[] } {
  const now = new Date().toISOString()
  return {
    meetings: [
      {
        id: uuid(), title: 'Klantgesprek Acme Corp', date: getTodayString(), time: '11:00',
        durationMinutes: 45, isRecurring: false, createdAt: now, language: 'nl',
        agendaItems: [
          { id: uuid(), title: 'Introductie', durationMinutes: 5 },
          { id: uuid(), title: 'Demo nieuwe features', durationMinutes: 15 },
          { id: uuid(), title: 'Feedback & vragen', durationMinutes: 15 },
          { id: uuid(), title: 'Vervolgstappen', durationMinutes: 10 },
        ],
      },
    ],
    recurringMeetings: [
      {
        id: uuid(), title: 'Dagelijkse standup', time: '09:00', durationMinutes: 15,
        isRecurring: true, createdAt: now, language: 'nl',
        recurrenceRule: { frequency: 'weekdays' },
        agendaItems: [
          { id: uuid(), title: 'Gisteren', durationMinutes: 5 },
          { id: uuid(), title: 'Vandaag', durationMinutes: 5 },
          { id: uuid(), title: 'Blockers', durationMinutes: 5 },
        ],
      },
      {
        id: uuid(), title: 'Sprint planning', time: '10:00', durationMinutes: 60,
        isRecurring: true, createdAt: now, language: 'nl',
        recurrenceRule: { frequency: 'weekly', customDays: [1] },
        agendaItems: [
          { id: uuid(), title: 'Review backlog', durationMinutes: 15 },
          { id: uuid(), title: 'Capaciteit bespreken', durationMinutes: 10 },
          { id: uuid(), title: 'Sprint doel vaststellen', durationMinutes: 15 },
          { id: uuid(), title: 'Taken verdelen', durationMinutes: 20 },
        ],
      },
      {
        id: uuid(), title: '1-op-1 met manager', time: '14:00', durationMinutes: 30,
        isRecurring: true, createdAt: now, language: 'nl',
        recurrenceRule: { frequency: 'weekly', customDays: [4] },
        agendaItems: [
          { id: uuid(), title: 'Check-in', durationMinutes: 5 },
          { id: uuid(), title: 'Lopende projecten', durationMinutes: 15 },
          { id: uuid(), title: 'Ontwikkeling', durationMinutes: 10 },
        ],
      },
    ],
  }
}

export const useStore = create<VandaagState>()(
  persist(
    (set, get) => ({
      // Initial state
      projects: [],
      orphanTasks: [],
      recurringTasks: [],
      meetings: [],
      recurringMeetings: [],
      settings: defaultSettings,
      dailyPlan: null,
      tomorrowPlan: null,
      personalRules: [],
      openProjectId: null,
      toastProjectId: null,
      swapModalProjectId: null,
      swapModalTargetStatus: null,
      waitingPromptProjectId: null,
      openMeetingId: null,
      activeView: 'vandaag',
      greetedDate: null,
      artworkLoadingIds: [],
      focusSession: null,
      showCitadel: false,
      meetingSession: null,
      processingMeetingId: null,
      calendarEvents: [],
      calendarLoading: false,
      calendarError: null,
      doneReflection: null,
      doneReflectionLoading: false,

      setOpenProjectId: (id) => set({ openProjectId: id }),
      setProcessingMeetingId: (id) => set({ processingMeetingId: id }),
      setDoneReflection: (reflection) => set({ doneReflection: reflection, doneReflectionLoading: false }),
      setDoneReflectionLoading: (loading) => set({ doneReflectionLoading: loading }),
      clearDoneReflection: () => set({ doneReflection: null }),

      saveMeetingNotes: (meetingId, notes) => {
        const { meetings, recurringMeetings } = get()
        const inMeetings = meetings.some(m => m.id === meetingId)
        if (inMeetings) {
          set({ meetings: meetings.map(m => m.id === meetingId ? { ...m, meetingNotes: notes } : m) })
        } else {
          set({ recurringMeetings: recurringMeetings.map(m => m.id === meetingId ? { ...m, meetingNotes: notes } : m) })
        }
      },

      saveAgendaItemNotes: (meetingId, itemNotes: AgendaItemNotes) => {
        const { meetings, recurringMeetings } = get()
        const updateMeeting = (m: Meeting): Meeting => {
          if (m.id !== meetingId) return m
          const existing = m.meetingNotes?.agendaItemNotes ?? []
          const filtered = existing.filter(n => n.agendaItemId !== itemNotes.agendaItemId)
          const agendaItemNotes = [...filtered, itemNotes]
          if (m.meetingNotes) {
            return { ...m, meetingNotes: { ...m.meetingNotes, agendaItemNotes } }
          }
          // Store per-item notes even before overall notes exist
          return { ...m, meetingNotes: {
            transcript: '', summary: '', actionItems: [], decisions: [],
            openQuestions: [], outcome: 'productive', generatedAt: new Date().toISOString(),
            agendaItemNotes,
          } }
        }
        if (meetings.some(m => m.id === meetingId)) {
          set({ meetings: meetings.map(updateMeeting) })
        } else {
          set({ recurringMeetings: recurringMeetings.map(updateMeeting) })
        }
      },

      addProcessingItemId: (itemId) => {
        const { meetingSession } = get()
        if (!meetingSession) return
        const existing = meetingSession.processingItemIds ?? []
        set({ meetingSession: { ...meetingSession, processingItemIds: [...existing, itemId] } })
      },

      removeProcessingItemId: (itemId) => {
        const { meetingSession } = get()
        if (!meetingSession) return
        const existing = meetingSession.processingItemIds ?? []
        set({ meetingSession: { ...meetingSession, processingItemIds: existing.filter(id => id !== itemId) } })
      },

      // Slices
      ...makeNavigationActions(set, get),
      ...makeProjectActions(set, get),
      ...makeTaskActions(set, get),
      ...makeDailyPlanActions(set, get),
      ...makeMeetingActions(set, get),
      ...makeSettingsActions(set, get),
      ...makeCalendarActions(set, get),
      ...makeFocusActions(set, get),
      ...makeMeetingSessionActions(set, get),

      // Selectors
      getProjectsByStatus: (status) => get().projects.filter(p => p.status === status),
      getInProgressCount: () => get().projects.filter(p => p.status === 'in_progress').length,
      getWipCount: () => get().projects.filter(p => p.status === 'in_progress' || p.status === 'waiting').length,
    }),
    {
      name: 'vandaag-storage',
      merge: (persisted: unknown, current: VandaagState) => {
        const p = persisted as Partial<VandaagState>
        const merged = {
          ...current,
          ...p,
          settings: { ...current.settings, ...(p.settings ?? {}) },
        }
        // Seed sample meetings on first launch
        if ((merged.meetings?.length ?? 0) === 0 && (merged.recurringMeetings?.length ?? 0) === 0) {
          const seed = createSeedMeetings()
          merged.meetings = seed.meetings
          merged.recurringMeetings = seed.recurringMeetings
        }
        return merged
      },
      partialize: (state) => ({
        projects: state.projects,
        orphanTasks: state.orphanTasks,
        recurringTasks: state.recurringTasks,
        meetings: state.meetings,
        recurringMeetings: state.recurringMeetings,
        settings: state.settings,
        dailyPlan: state.dailyPlan,
        tomorrowPlan: state.tomorrowPlan,
        personalRules: state.personalRules,
        greetedDate: state.greetedDate,
        focusSession: state.focusSession,
        meetingSession: state.meetingSession,
      }),
    }
  )
)
