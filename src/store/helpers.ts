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
    return {
      ...state.dailyPlan,
      shortProjects: state.dailyPlan.shortProjects ?? [],
      maintenanceProjects: state.dailyPlan.maintenanceProjects ?? [],
      meetings: state.dailyPlan.meetings ?? [],
    }
  }
  return {
    date: today,
    deepBlock: { projectId: '' },
    shortTasks: [],
    shortProjects: [],
    maintenanceTasks: [],
    maintenanceProjects: [],
    meetings: [],
    isComplete: false,
  }
}

export function ensureTomorrowPlan(state: VandaagState): DailyPlan {
  const tomorrow = getTomorrowString()
  if (state.tomorrowPlan && state.tomorrowPlan.date === tomorrow) {
    return {
      ...state.tomorrowPlan,
      shortProjects: state.tomorrowPlan.shortProjects ?? [],
      maintenanceProjects: state.tomorrowPlan.maintenanceProjects ?? [],
      meetings: state.tomorrowPlan.meetings ?? [],
    }
  }
  return {
    date: tomorrow,
    deepBlock: { projectId: '' },
    shortTasks: [],
    shortProjects: [],
    maintenanceTasks: [],
    maintenanceProjects: [],
    meetings: [],
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
    addShortProject: (projectId: string) => {
      const plan = ensurePlan(get())
      if (plan.shortProjects.includes(projectId)) return
      setPlan({ ...plan, shortProjects: [...plan.shortProjects, projectId] })
    },
    removeShortProject: (projectId: string) => {
      const plan = ensurePlan(get())
      setPlan({ ...plan, shortProjects: plan.shortProjects.filter(id => id !== projectId) })
    },
    addMaintenanceProject: (projectId: string) => {
      const plan = ensurePlan(get())
      if (plan.maintenanceProjects.includes(projectId)) return
      setPlan({ ...plan, maintenanceProjects: [...plan.maintenanceProjects, projectId] })
    },
    removeMaintenanceProject: (projectId: string) => {
      const plan = ensurePlan(get())
      setPlan({ ...plan, maintenanceProjects: plan.maintenanceProjects.filter(id => id !== projectId) })
    },
    addMeeting: (meetingId: string) => {
      const plan = ensurePlan(get())
      if (plan.meetings.includes(meetingId)) return
      setPlan({ ...plan, meetings: [...plan.meetings, meetingId] })
    },
    removeMeeting: (meetingId: string) => {
      const plan = ensurePlan(get())
      setPlan({ ...plan, meetings: plan.meetings.filter(id => id !== meetingId) })
    },
  }
}
