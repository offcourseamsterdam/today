import { v4 as uuid } from 'uuid'
import { format, getDay } from 'date-fns'
import type { Task, RecurrenceRule } from '../types'
import type { StoreSet, StoreGet } from './types'

/** Factory that builds a Task with sensible defaults. Spread overrides last. */
function createTask(overrides: Partial<Task> & { id: string; title: string }): Task {
  return {
    status: 'backlog',
    isRecurring: false,
    isUncomfortable: false,
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

export function makeTaskActions(set: StoreSet, get: StoreGet) {
  return {
    // Task actions (within projects)
    addTask: (title: string, projectId?: string): string => {
      const id = uuid()
      const task = createTask({ id, title, projectId })
      if (projectId) {
        set(state => ({
          projects: state.projects.map(p =>
            p.id === projectId
              ? { ...p, tasks: [...p.tasks, task], updatedAt: new Date().toISOString() }
              : p
          ),
        }))
      }
      return id
    },

    updateTask: (taskId: string, projectId: string | undefined, updates: Partial<Omit<Task, 'id'>>) => {
      if (projectId) {
        set(state => ({
          projects: state.projects.map(p =>
            p.id === projectId
              ? {
                  ...p,
                  tasks: p.tasks.map(t => (t.id === taskId ? { ...t, ...updates } : t)),
                  updatedAt: new Date().toISOString(),
                }
              : p
          ),
        }))
      }
    },

    deleteTask: (taskId: string, projectId?: string) => {
      if (projectId) {
        set(state => ({
          projects: state.projects.map(p =>
            p.id === projectId
              ? { ...p, tasks: p.tasks.filter(t => t.id !== taskId), updatedAt: new Date().toISOString() }
              : p
          ),
        }))
      }
    },

    addOrphanTask: (title: string): string => {
      const id = uuid()
      const task = createTask({ id, title })
      set(state => ({ orphanTasks: [...state.orphanTasks, task] }))
      return id
    },

    updateOrphanTask: (taskId: string, updates: Partial<Omit<Task, 'id'>>) => {
      set(state => ({
        orphanTasks: state.orphanTasks.map(t =>
          t.id === taskId ? { ...t, ...updates } : t
        ),
      }))
    },

    deleteOrphanTask: (taskId: string) => {
      set(state => ({ orphanTasks: state.orphanTasks.filter(t => t.id !== taskId) }))
    },

    moveOrphanTaskToProject: (taskId: string, projectId: string) => {
      const state = get()
      const task = state.orphanTasks.find(t => t.id === taskId)
      if (!task) return
      const updatedTask = { ...task, projectId }
      set(s => ({
        orphanTasks: s.orphanTasks.filter(t => t.id !== taskId),
        projects: s.projects.map(p =>
          p.id === projectId
            ? { ...p, tasks: [...p.tasks, updatedTask], updatedAt: new Date().toISOString() }
            : p
        ),
      }))
    },

    // Recurring tasks
    addRecurringTask: (title: string, rule: RecurrenceRule, projectId?: string): string => {
      const id = uuid()
      const task = createTask({ id, title, projectId, isRecurring: true, recurrenceRule: rule })
      set(state => ({ recurringTasks: [...state.recurringTasks, task] }))
      return id
    },

    updateRecurringTask: (taskId: string, updates: Partial<Omit<Task, 'id'>>) => {
      set(state => ({
        recurringTasks: state.recurringTasks.map(t =>
          t.id === taskId ? { ...t, ...updates } : t
        ),
      }))
    },

    deleteRecurringTask: (taskId: string) => {
      set(state => ({ recurringTasks: state.recurringTasks.filter(t => t.id !== taskId) }))
    },

    getTodayRecurringTasks: (): Task[] => {
      const state = get()
      const now = new Date()
      const dow = getDay(now) // 0=Sun...6=Sat
      const dom = now.getDate() // 1–31
      return state.recurringTasks.filter(t => {
        if (!t.recurrenceRule) return false
        const rule = t.recurrenceRule
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

    // Checkbox-task sync
    syncCheckboxTasks: (projectId: string, checkboxTexts: string[]) => {
      set(state => ({
        projects: state.projects.map(p => {
          if (p.id !== projectId) return p

          // Separate editor-managed tasks from manual tasks
          const editorTasks = p.tasks.filter(t => t.fromEditor)
          const manualTasks = p.tasks.filter(t => !t.fromEditor)

          // Build lookup maps for matching
          const editorByTitle = new Map(editorTasks.map(t => [t.title, t]))
          const manualByTitle = new Map(manualTasks.map(t => [t.title, t]))

          // Build new editor task list from current checkbox texts
          const newEditorTasks: Task[] = checkboxTexts.map(text => {
            // Exact match in existing editor tasks → keep (preserves status, id, etc.)
            const existingEditor = editorByTitle.get(text)
            if (existingEditor) return existingEditor

            // Exact match in manual tasks → tag it as fromEditor (migration path)
            const existingManual = manualByTitle.get(text)
            if (existingManual) return { ...existingManual, fromEditor: true }

            // New checkbox → create new task
            return createTask({ id: uuid(), title: text, projectId, fromEditor: true })
          })

          // Remove manual tasks that got promoted to editor tasks (to avoid duplicates)
          const promotedTitles = new Set(
            newEditorTasks.filter(t => manualByTitle.has(t.title)).map(t => t.title)
          )
          const remainingManualTasks = manualTasks.filter(t => !promotedTitles.has(t.title))

          // Check if anything actually changed before updating
          const combined = [...remainingManualTasks, ...newEditorTasks]
          if (
            combined.length === p.tasks.length &&
            combined.every((t, i) => t === p.tasks[i])
          ) return p

          return { ...p, tasks: combined, updatedAt: new Date().toISOString() }
        }),
      }))
    },

    // Progress tracking
    recordDayWorked: (projectId: string) => {
      const today = format(new Date(), 'yyyy-MM-dd')
      set(state => ({
        projects: state.projects.map(p => {
          if (p.id !== projectId || !p.trackProgress) return p
          if (p.daysWorkedLog.includes(today)) return p
          return {
            ...p,
            daysWorked: p.daysWorked + 1,
            daysWorkedLog: [...p.daysWorkedLog, today],
            updatedAt: new Date().toISOString(),
          }
        }),
      }))
    },
  }
}
