import { v4 as uuid } from 'uuid'
import type { Category, Project, ProjectStatus } from '../types'
import type { StoreSet, StoreGet } from './types'

export function makeProjectActions(set: StoreSet, get: StoreGet) {
  return {
    addProject: (title: string, category: Category): string => {
      const id = uuid()
      const now = new Date().toISOString()
      const project: Project = {
        id,
        title,
        category,
        status: 'backlog',
        bodyContent: '',
        tasks: [],
        trackProgress: false,
        daysWorked: 0,
        daysWorkedLog: [],
        createdAt: now,
        updatedAt: now,
      }
      set(state => ({ projects: [...state.projects, project] }))
      return id
    },

    updateProject: (id: string, updates: Partial<Omit<Project, 'id'>>) => {
      set(state => ({
        projects: state.projects.map(p =>
          p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
        ),
      }))
    },

    deleteProject: (id: string) => {
      set(state => ({
        projects: state.projects.filter(p => p.id !== id),
        recurringTasks: state.recurringTasks.map(t =>
          t.projectId === id ? { ...t, projectId: undefined } : t
        ),
      }))
    },

    moveProject: (id: string, newStatus: ProjectStatus): boolean => {
      const state = get()
      const project = state.projects.find(p => p.id === id)
      if (!project) return false

      if (newStatus === 'in_progress' || newStatus === 'waiting') {
        const wipCount = state.projects.filter(
          p => (p.status === 'in_progress' || p.status === 'waiting') && p.id !== id
        ).length
        if (wipCount >= state.settings.inProgressLimit) {
          set({ swapModalProjectId: id, swapModalTargetStatus: newStatus })
          return false
        }
      }

      set(state => ({
        projects: state.projects.map(p =>
          p.id === id
            ? {
                ...p,
                status: newStatus,
                updatedAt: new Date().toISOString(),
                // Clear waitingOn only when moving to done; preserve for all other columns
                waitingOn: newStatus === 'done' ? undefined : p.waitingOn,
              }
            : p
        ),
      }))

      // After landing in waiting with no entries, show the non-blocking "who are you waiting for?" prompt
      if (newStatus === 'waiting' && (!project.waitingOn || project.waitingOn.length === 0)) {
        set({ waitingPromptProjectId: id })
      }

      return true
    },

    reorderProjects: (activeId: string, overId: string) => {
      set(state => {
        const projects = [...state.projects]
        const oldIndex = projects.findIndex(p => p.id === activeId)
        const newIndex = projects.findIndex(p => p.id === overId)
        if (oldIndex === -1 || newIndex === -1) return state
        projects.splice(newIndex, 0, projects.splice(oldIndex, 1)[0])
        return { projects }
      })
    },

    reorderProjectAfter: (activeId: string, afterId: string) => {
      set(state => {
        const arr = [...state.projects]
        const oldIdx = arr.findIndex(p => p.id === activeId)
        const afterIdx = arr.findIndex(p => p.id === afterId)
        if (oldIdx === -1 || afterIdx === -1) return state
        const [item] = arr.splice(oldIdx, 1)
        // afterIdx shifts left by 1 if we removed from before it
        const insertAt = oldIdx < afterIdx ? afterIdx : afterIdx + 1
        arr.splice(insertAt, 0, item)
        return { projects: arr }
      })
    },

    reorderProjectToEnd: (activeId: string) => {
      set(state => {
        const arr = [...state.projects]
        const idx = arr.findIndex(p => p.id === activeId)
        if (idx === -1) return state
        const [item] = arr.splice(idx, 1)
        arr.push(item)
        return { projects: arr }
      })
    },

    reorderProjectToStart: (activeId: string) => {
      set(state => {
        const arr = [...state.projects]
        const idx = arr.findIndex(p => p.id === activeId)
        if (idx === -1) return state
        const [item] = arr.splice(idx, 1)
        arr.unshift(item)
        return { projects: arr }
      })
    },

    setSwapModalProjectId: (id: string | null) => set({ swapModalProjectId: id }),
    setWaitingPromptProjectId: (id: string | null) => set({ waitingPromptProjectId: id }),

    setProjectBacklogSection: (id: string, section: 'not_yet' | 'maybe') => {
      set(state => ({
        projects: state.projects.map(p =>
          p.id === id ? { ...p, backlogSection: section } : p
        ),
      }))
    },

    getMissionCriticalStats: () => {
      const { projects, orphanTasks } = get()
      return {
        missionCriticalDays: projects
          .filter(p => p.missionCritical)
          .reduce((sum, p) => sum + p.daysWorked, 0),
        uncomfortableDone:
          projects.flatMap(p => p.tasks).filter(t => t.isUncomfortable && t.status === 'done').length +
          orphanTasks.filter(t => t.isUncomfortable && t.status === 'done').length,
      }
    },
  }
}
