export type Category = 'marketing' | 'ops' | 'admin' | 'finance' | 'product' | 'personal'

export type ProjectStatus = 'backlog' | 'in_progress' | 'waiting' | 'done'

export type TaskStatus = 'backlog' | 'vandaag' | 'done' | 'dropped'

export type RecurrenceFrequency = 'daily' | 'weekdays' | 'weekly' | 'monthly_date' | 'monthly_weekday' | 'custom' | 'annual_dates'

export interface RecurrenceRule {
  frequency: RecurrenceFrequency
  customDays?: number[]          // 0=Sun..6=Sat — for 'custom' multi-day and 'weekly' single-day
  monthlyDate?: number           // 1–31 — for 'monthly_date' (e.g. 1st of month)
  monthlyWeekday?: {             // for 'monthly_weekday' (e.g. 2nd Monday)
    week: number                 // 1–5
    day: number                  // 0=Sun..6=Sat
  }
  annualDates?: { month: number; day: number }[]  // for 'annual_dates' (e.g. Apr 1, Oct 1)
}

export interface WaitingOn {
  person: string
  since: string // ISO date
}

export interface Project {
  id: string
  title: string
  category: Category
  status: ProjectStatus
  backlogSection?: 'not_yet' | 'maybe'  // only relevant when status === 'backlog'
  contextIds?: string[]
  coverImageUrl?: string
  coverImageTitle?: string
  coverImagePosition?: { x: number; y: number } // percentage 0–100, default 50 50
  bodyContent: string // Rich text (BlockNote JSON)
  tasks: Task[]
  trackProgress: boolean
  missionCritical?: boolean
  daysWorked: number
  daysWorkedLog: string[] // Array of date strings (YYYY-MM-DD)
  waitingOn?: WaitingOn[]
  createdAt: string
  updatedAt: string
}

export interface Task {
  id: string
  projectId?: string
  title: string
  status: TaskStatus
  isRecurring: boolean
  recurrenceRule?: RecurrenceRule
  isUncomfortable: boolean
  fromEditor?: boolean  // true = created/managed by notes editor checkboxes
  bodyContent?: string  // BlockNote JSON — rich text notes for standalone tasks
  kanbanColumn?: ProjectStatus  // which kanban column this orphan task appears in
  waitingOn?: WaitingOn[]       // waiting-on entries (same as Project)
  pomodoroSessions?: number
  totalMinutesWorked?: number
  createdAt: string
  completedAt?: string
  lastCompletedDate?: string  // YYYY-MM-DD — last date this recurring task was checked off
}

export interface Meeting {
  id: string
  title: string
  date?: string              // YYYY-MM-DD — if set, only appears on that day
  time: string               // "HH:mm" 24h format
  durationMinutes: number    // 15, 30, 45, 60, 90, etc.
  location?: string          // physical address or video link
  agenda?: string            // pre-meeting agenda text
  actions?: string           // post-meeting key actions
  takeaways?: string         // post-meeting takeaways/notes
  isRecurring: boolean
  recurrenceRule?: RecurrenceRule
  lastCompletedDate?: string // for recurring meetings (YYYY-MM-DD)
  createdAt: string
}

export interface DailyPlan {
  date: string // YYYY-MM-DD
  deepBlock: {
    projectId: string
    intention?: string
    calendarEventId?: string
    completedProjectTitle?: string  // set when user clicks Done
    completedAt?: string            // ISO timestamp of completion
  }
  shortTasks: string[] // Task IDs (up to ~3)
  shortProjects: string[] // Project IDs added to short tasks tier
  maintenanceTasks: string[] // Task IDs (from recurring + manual)
  maintenanceProjects: string[] // Project IDs added to maintenance tier
  meetings: string[] // Meeting IDs (legacy, kept for backward compat)
  deepMeetingId?: string           // meeting assigned to the deep block
  shortMeetingIds?: string[]       // meetings assigned to short three
  maintenanceMeetingIds?: string[] // meetings assigned to maintenance
  calendarEvents?: AssignedCalendarEvent[]
  pomodoroLog?: PomodoroLogEntry[]
  blockOrder?: Array<'deep' | 'short' | 'maintenance'>
  isComplete: boolean
  completedAt?: string
}

// Calendar integration
export interface CalendarEvent {
  id: string
  title: string
  start: string        // ISO datetime
  end: string          // ISO datetime
  durationMinutes: number
  isAllDay: boolean
}

export type TierAssignment = 'deep' | 'short' | 'maintenance' | 'unassigned'

export interface AssignedCalendarEvent {
  event: CalendarEvent
  tier: TierAssignment
  suggestedTier: TierAssignment
}

// Pomodoro tiers
export type PlanTier = 'deep' | 'short' | 'maintenance'

export interface PomodoroLogEntry {
  taskId: string
  tier: PlanTier
  sessionsCompleted: number
  totalMinutesWorked: number
}

export interface LifeWeeks {
  birthDate: string
  weeksLived: number
  weeksRemaining: number
  currentWeekNumber: number
}

export interface WorkContext {
  id: string
  name: string
}

export interface Settings {
  inProgressLimit: number
  pomodoroMinutes: number
  breakMinutes: number
  birthDate?: string
  planningTime: 'evening' | 'morning'
  contexts: WorkContext[]
  inProgressLimitChangeLog: string[] // ISO dates of each limit change (for friction UI)
}

// Kanban column definitions (done projects live in DoneListColumn, not a drag column)
// Note: in_progress and waiting share a combined WIP limit from settings.inProgressLimit
export const KANBAN_COLUMNS = [
  { id: 'backlog' as ProjectStatus, title: 'Backlog', limit: null },
  { id: 'in_progress' as ProjectStatus, title: 'In Progress', limit: null },
  { id: 'waiting' as ProjectStatus, title: 'Wachten Op', limit: null },
] as const

// Category display config
export const CATEGORY_CONFIG: Record<Category, { label: string; color: string; bg: string }> = {
  marketing: { label: 'Marketing', color: 'var(--color-cat-marketing)', bg: 'var(--color-cat-marketing-bg)' },
  ops: { label: 'Ops', color: 'var(--color-cat-ops)', bg: 'var(--color-cat-ops-bg)' },
  admin: { label: 'Admin', color: 'var(--color-cat-admin)', bg: 'var(--color-cat-admin-bg)' },
  finance: { label: 'Finance', color: 'var(--color-cat-finance)', bg: 'var(--color-cat-finance-bg)' },
  product: { label: 'Product', color: 'var(--color-cat-product)', bg: 'var(--color-cat-product-bg)' },
  personal: { label: 'Personal', color: 'var(--color-cat-personal)', bg: 'var(--color-cat-personal-bg)' },
}
