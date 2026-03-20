import type { StoreApi } from 'zustand'
import type { Project, Task, Meeting, Settings, Category, ProjectStatus, DailyPlan, RecurrenceRule, CalendarEvent, PlanTier, FocusSession, MeetingSession } from '../types'

export type ActiveView = 'vandaag' | 'kanban' | 'planning' | 'philosophy'

export interface VandaagState {
  // Data
  projects: Project[]
  orphanTasks: Task[]
  recurringTasks: Task[]
  meetings: Meeting[]
  recurringMeetings: Meeting[]
  settings: Settings
  dailyPlan: DailyPlan | null
  tomorrowPlan: DailyPlan | null
  personalRules: string[]

  // UI state
  openProjectId: string | null  // project modal open from any view
  toastProjectId: string | null  // project ID for update-reminder toast
  swapModalProjectId: string | null
  swapModalTargetStatus: 'in_progress' | 'waiting' | null  // destination for the incoming project
  waitingPromptProjectId: string | null  // triggers "Op wie wacht je?" modal
  openMeetingId: string | null  // null = closed, 'new' = create mode, uuid = edit mode
  activeView: ActiveView
  greetedDate: string | null  // YYYY-MM-DD — last date the morning screen was dismissed
  artworkLoadingIds: string[]  // project IDs with in-flight artwork fetch (not persisted)

  // Focus session state
  focusSession: FocusSession | null
  showCitadel: boolean

  // Meeting session state
  meetingSession: MeetingSession | null

  // Focus session actions
  startFocusSession: (params: { tier: PlanTier; taskId: string; taskTitle: string; projectTitle?: string; intention?: string; projectId?: string }) => void
  endFocusSession: () => void
  showCitadelOverlay: () => void
  hideCitadelOverlay: () => void
  tickFocusSession: () => void
  pauseFocusSession: () => void
  resumeFocusSession: () => void
  resetFocusSession: () => void

  // Calendar state (non-persisted)
  calendarEvents: CalendarEvent[]
  calendarLoading: boolean
  calendarError: string | null

  // Navigation
  setOpenProjectId: (id: string | null) => void
  showToast: (projectId: string) => void
  dismissToast: () => void
  setActiveView: (view: ActiveView) => void
  setGreetedDate: (date: string) => void
  markArtworkLoading: (id: string) => void
  unmarkArtworkLoading: (id: string) => void

  // Project actions
  addProject: (title: string, category: Category) => string
  updateProject: (id: string, updates: Partial<Omit<Project, 'id'>>) => void
  deleteProject: (id: string) => void
  moveProject: (id: string, newStatus: ProjectStatus) => boolean
  reorderProjects: (activeId: string, overId: string) => void
  reorderProjectAfter: (activeId: string, afterId: string) => void
  reorderProjectToEnd: (activeId: string) => void
  reorderProjectToStart: (activeId: string) => void
  setSwapModalProjectId: (id: string | null) => void
  setWaitingPromptProjectId: (id: string | null) => void
  setProjectBacklogSection: (id: string, section: 'not_yet' | 'maybe') => void

  // Task actions
  addTask: (title: string, projectId?: string) => string
  updateTask: (taskId: string, projectId: string | undefined, updates: Partial<Omit<Task, 'id'>>) => void
  deleteTask: (taskId: string, projectId?: string) => void
  addOrphanTask: (title: string) => string
  updateOrphanTask: (taskId: string, updates: Partial<Omit<Task, 'id'>>) => void
  deleteOrphanTask: (taskId: string) => void
  moveOrphanTaskToProject: (taskId: string, projectId: string) => void

  // Meeting actions
  addMeeting: (meeting: Omit<Meeting, 'id' | 'createdAt'>) => string
  updateMeeting: (id: string, updates: Partial<Omit<Meeting, 'id'>>) => void
  deleteMeeting: (id: string) => void
  addRecurringMeeting: (meeting: Omit<Meeting, 'id' | 'createdAt'>) => string
  updateRecurringMeeting: (id: string, updates: Partial<Omit<Meeting, 'id'>>) => void
  deleteRecurringMeeting: (id: string) => void
  getTodayRecurringMeetings: () => Meeting[]
  setOpenMeetingId: (id: string | null) => void

  // Meeting session actions
  startMeetingSession: (meetingId: string) => void
  endMeetingSession: () => void
  pauseMeetingSession: () => void
  resumeMeetingSession: () => void
  advanceMeetingItem: () => void
  tickMeetingSession: () => void

  // Recurring tasks
  addRecurringTask: (title: string, rule: RecurrenceRule, projectId?: string) => string
  updateRecurringTask: (taskId: string, updates: Partial<Omit<Task, 'id'>>) => void
  deleteRecurringTask: (taskId: string) => void
  getTodayRecurringTasks: () => Task[]
  getTomorrowRecurringTasks: () => Task[]

  // Checkbox-task sync
  syncCheckboxTasks: (projectId: string, checkboxTexts: string[]) => void

  // Progress tracking
  recordDayWorked: (projectId: string) => void

  // Daily plan actions
  setDailyPlan: (plan: DailyPlan) => void
  setDeepBlock: (projectId: string, intention?: string) => void
  clearDeepBlock: () => void
  completeDeepBlock: (projectTitle: string) => void
  addShortTask: (taskId: string) => void
  removeShortTask: (taskId: string) => void
  addMaintenanceTask: (taskId: string) => void
  removeMaintenanceTask: (taskId: string) => void
  addShortProject: (projectId: string) => void
  removeShortProject: (projectId: string) => void
  addMaintenanceProject: (projectId: string) => void
  removeMaintenanceProject: (projectId: string) => void
  addMeetingToPlan: (meetingId: string) => void
  removeMeetingFromPlan: (meetingId: string) => void
  setDeepMeeting: (meetingId: string | undefined) => void
  addShortMeeting: (meetingId: string) => void
  removeShortMeeting: (meetingId: string) => void
  addMaintenanceMeeting: (meetingId: string) => void
  removeMaintenanceMeeting: (meetingId: string) => void
  setTomorrowDeepMeeting: (meetingId: string | undefined) => void
  addTomorrowShortMeeting: (meetingId: string) => void
  removeTomorrowShortMeeting: (meetingId: string) => void
  addTomorrowMaintenanceMeeting: (meetingId: string) => void
  removeTomorrowMaintenanceMeeting: (meetingId: string) => void
  addQuickMaintenanceTask: (title: string) => string
  setBlockOrder: (order: Array<'deep' | 'short' | 'maintenance'>) => void
  completeDailyPlan: () => void
  getTodayPlan: () => DailyPlan | null
  isDayComplete: () => boolean

  // Planning mode (tomorrow)
  setTomorrowDeepBlock: (projectId: string, intention?: string) => void
  clearTomorrowDeepBlock: () => void
  addTomorrowShortTask: (taskId: string) => void
  removeTomorrowShortTask: (taskId: string) => void
  addTomorrowMaintenanceTask: (taskId: string) => void
  removeTomorrowMaintenanceTask: (taskId: string) => void
  addTomorrowShortProject: (projectId: string) => void
  removeTomorrowShortProject: (projectId: string) => void
  addTomorrowMaintenanceProject: (projectId: string) => void
  removeTomorrowMaintenanceProject: (projectId: string) => void
  addTomorrowMeeting: (meetingId: string) => void
  removeTomorrowMeeting: (meetingId: string) => void
  lockInTomorrow: () => void
  clearTomorrowPlan: () => void
  loadTomorrowPlanIfReady: () => boolean
  refreshDailyPlan: () => void

  // Calendar actions
  fetchCalendarEvents: (accessToken: string, date: string) => Promise<void>
  setCalendarEvents: (events: CalendarEvent[]) => void
  clearCalendarEvents: () => void

  // Pomodoro logging
  logPomodoroSession: (taskId: string, tier: PlanTier, minutesWorked: number) => void

  // Personal rules
  addPersonalRule: (rule: string) => void
  updatePersonalRule: (index: number, rule: string) => void
  deletePersonalRule: (index: number) => void

  // Settings actions
  updateSettings: (updates: Partial<Settings>) => void
  updateSettingsWithLimitTracking: (limit: number) => void

  // Selectors
  getProjectsByStatus: (status: ProjectStatus) => Project[]
  getInProgressCount: () => number
  getWipCount: () => number  // in_progress + waiting combined
  getMissionCriticalStats: () => { missionCriticalDays: number; uncomfortableDone: number }
}

export type StoreSet = StoreApi<VandaagState>['setState']
export type StoreGet = StoreApi<VandaagState>['getState']
