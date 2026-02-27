import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { VandaagState } from './types'
import { defaultSettings } from './helpers'
import { makeNavigationActions } from './navigationSlice'
import { makeProjectActions } from './projectsSlice'
import { makeTaskActions } from './tasksSlice'
import { makeDailyPlanActions } from './plansSlice'
import { makeSettingsActions } from './settingsSlice'

export const useStore = create<VandaagState>()(
  persist(
    (set, get) => ({
      // Initial state
      projects: [],
      orphanTasks: [],
      recurringTasks: [],
      settings: defaultSettings,
      dailyPlan: null,
      tomorrowPlan: null,
      personalRules: [],
      swapModalProjectId: null,
      swapModalTargetStatus: null,
      waitingPromptProjectId: null,
      resolveWaitingProjectId: null,
      activeView: 'vandaag',
      greetedDate: null,
      artworkLoadingIds: [],

      // Slices
      ...makeNavigationActions(set, get),
      ...makeProjectActions(set, get),
      ...makeTaskActions(set, get),
      ...makeDailyPlanActions(set, get),
      ...makeSettingsActions(set, get),

      // Selectors
      getProjectsByStatus: (status) => get().projects.filter(p => p.status === status),
      getInProgressCount: () => get().projects.filter(p => p.status === 'in_progress').length,
      getWipCount: () => get().projects.filter(p => p.status === 'in_progress' || p.status === 'waiting').length,
    }),
    {
      name: 'vandaag-storage',
      merge: (persisted: unknown, current: VandaagState) => {
        const p = persisted as Partial<VandaagState>
        return {
          ...current,
          ...p,
          settings: { ...current.settings, ...(p.settings ?? {}) },
        }
      },
      partialize: (state) => ({
        projects: state.projects,
        orphanTasks: state.orphanTasks,
        recurringTasks: state.recurringTasks,
        settings: state.settings,
        dailyPlan: state.dailyPlan,
        tomorrowPlan: state.tomorrowPlan,
        personalRules: state.personalRules,
        greetedDate: state.greetedDate,
      }),
    }
  )
)
