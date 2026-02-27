import { format, addDays } from 'date-fns'
import type { Settings, DailyPlan } from '../types'
import type { VandaagState, StoreGet } from './types'

export const defaultSettings: Settings = {
  inProgressLimit: 5,
  pomodoroMinutes: 25,
  breakMinutes: 5,
  planningTime: 'evening',
  contexts: [],
  inProgressLimitChangeLog: [],
}

export function getTodayString(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export function getTomorrowString(): string {
  return format(addDays(new Date(), 1), 'yyyy-MM-dd')
}

export function ensureTodayPlan(state: VandaagState): DailyPlan {
  const today = getTodayString()
  if (state.dailyPlan && state.dailyPlan.date === today) {
    return state.dailyPlan
  }
  return {
    date: today,
    deepBlock: { projectId: '' },
    shortTasks: [],
    maintenanceTasks: [],
    isComplete: false,
  }
}

export function ensureTomorrowPlan(state: VandaagState): DailyPlan {
  const tomorrow = getTomorrowString()
  if (state.tomorrowPlan && state.tomorrowPlan.date === tomorrow) {
    return state.tomorrowPlan
  }
  return {
    date: tomorrow,
    deepBlock: { projectId: '' },
    shortTasks: [],
    maintenanceTasks: [],
    isComplete: false,
  }
}

type PlanSetter = (plan: DailyPlan) => void

export function makePlanActions(
  ensurePlan: (state: VandaagState) => DailyPlan,
  setPlan: PlanSetter,
  get: StoreGet,
) {
  return {
    setDeepBlock: (projectId: string, intention?: string) => {
      setPlan({ ...ensurePlan(get()), deepBlock: { projectId, intention } })
    },
    clearDeepBlock: () => {
      setPlan({ ...ensurePlan(get()), deepBlock: { projectId: '' } })
    },
    addShortTask: (taskId: string) => {
      const plan = ensurePlan(get())
      if (plan.shortTasks.includes(taskId)) return
      setPlan({ ...plan, shortTasks: [...plan.shortTasks, taskId] })
    },
    removeShortTask: (taskId: string) => {
      const plan = ensurePlan(get())
      setPlan({ ...plan, shortTasks: plan.shortTasks.filter(id => id !== taskId) })
    },
    addMaintenanceTask: (taskId: string) => {
      const plan = ensurePlan(get())
      if (plan.maintenanceTasks.includes(taskId)) return
      setPlan({ ...plan, maintenanceTasks: [...plan.maintenanceTasks, taskId] })
    },
    removeMaintenanceTask: (taskId: string) => {
      const plan = ensurePlan(get())
      setPlan({ ...plan, maintenanceTasks: plan.maintenanceTasks.filter(id => id !== taskId) })
    },
  }
}
