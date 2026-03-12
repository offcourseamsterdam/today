import { v4 as uuid } from 'uuid'
import type { DailyPlan, Task } from '../types'
import type { StoreSet, StoreGet } from './types'
import { ensureTodayPlan, ensureTomorrowPlan, getTodayString, makePlanActions } from './helpers'

export function makeDailyPlanActions(set: StoreSet, get: StoreGet) {
  const todayActions = makePlanActions(
    ensureTodayPlan,
    (plan: DailyPlan) => set({ dailyPlan: plan }),
    get,
  )
  const tomorrowActions = makePlanActions(
    ensureTomorrowPlan,
    (plan: DailyPlan) => set({ tomorrowPlan: plan }),
    get,
  )

  return {
    // Today plan
    setDailyPlan: (plan: DailyPlan) => set({ dailyPlan: plan }),
    setDeepBlock: todayActions.setDeepBlock,
    clearDeepBlock: todayActions.clearDeepBlock,
    addShortTask: todayActions.addShortTask,
    removeShortTask: todayActions.removeShortTask,
    addMaintenanceTask: todayActions.addMaintenanceTask,
    removeMaintenanceTask: todayActions.removeMaintenanceTask,
    addShortProject: todayActions.addShortProject,
    removeShortProject: todayActions.removeShortProject,
    addMaintenanceProject: todayActions.addMaintenanceProject,
    removeMaintenanceProject: todayActions.removeMaintenanceProject,
    addMeetingToPlan: todayActions.addMeeting,
    removeMeetingFromPlan: todayActions.removeMeeting,

    addQuickMaintenanceTask: (title: string): string => {
      const id = uuid()
      const task: Task = {
        id,
        title,
        status: 'vandaag',
        isRecurring: false,
        isUncomfortable: false,
        createdAt: new Date().toISOString(),
      }
      const state = get()
      const plan = ensureTodayPlan(state)
      set({
        orphanTasks: [...state.orphanTasks, task],
        dailyPlan: { ...plan, maintenanceTasks: [...plan.maintenanceTasks, id] },
      })
      return id
    },

    completeDailyPlan: () => {
      const state = get()
      if (!state.dailyPlan) return
      set({
        dailyPlan: {
          ...state.dailyPlan,
          isComplete: true,
          completedAt: new Date().toISOString(),
        },
      })
    },

    getTodayPlan: (): DailyPlan | null => {
      const state = get()
      const today = getTodayString()
      if (state.dailyPlan && state.dailyPlan.date === today) {
        return state.dailyPlan
      }
      return null
    },

    isDayComplete: (): boolean => {
      const state = get()
      const plan = state.dailyPlan
      if (!plan || plan.date !== getTodayString()) return false
      return plan.isComplete
    },

    // Tomorrow plan
    setTomorrowDeepBlock: tomorrowActions.setDeepBlock,
    clearTomorrowDeepBlock: tomorrowActions.clearDeepBlock,
    addTomorrowShortTask: tomorrowActions.addShortTask,
    removeTomorrowShortTask: tomorrowActions.removeShortTask,
    addTomorrowMaintenanceTask: tomorrowActions.addMaintenanceTask,
    removeTomorrowMaintenanceTask: tomorrowActions.removeMaintenanceTask,
    addTomorrowShortProject: tomorrowActions.addShortProject,
    removeTomorrowShortProject: tomorrowActions.removeShortProject,
    addTomorrowMaintenanceProject: tomorrowActions.addMaintenanceProject,
    removeTomorrowMaintenanceProject: tomorrowActions.removeMaintenanceProject,
    addTomorrowMeeting: tomorrowActions.addMeeting,
    removeTomorrowMeeting: tomorrowActions.removeMeeting,

    lockInTomorrow: () => {
      const state = get()
      const plan = ensureTomorrowPlan(state)
      set({ tomorrowPlan: { ...plan, isComplete: true, completedAt: new Date().toISOString() } })
    },

    clearTomorrowPlan: () => {
      set({ tomorrowPlan: null })
    },

    loadTomorrowPlanIfReady: (): boolean => {
      const state = get()
      const today = getTodayString()
      if (state.tomorrowPlan && state.tomorrowPlan.date === today) {
        set({
          dailyPlan: { ...state.tomorrowPlan, isComplete: false, completedAt: undefined },
          tomorrowPlan: null,
        })
        return true
      }
      if (state.tomorrowPlan && state.tomorrowPlan.date < today) {
        set({ tomorrowPlan: null })
      }
      return false
    },
  }
}
