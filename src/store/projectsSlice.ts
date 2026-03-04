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

      if (newStatus === 'in_progress') {
        // Feature 4: moving from waiting → in_progress with waitingOn entries → show resolve modal
        if (project.status === 'waiting' && project.waitingOn && project.waitingOn.length > 0) {
          set({ resolveWaitingProjectId: id })
          return false
        }

        // Feature 2: combined WIP check (in_progress + waiting, excluding self)
        const wipCount = state.projects.filter(
          p => (p.status === 'in_progress' || p.status === 'waiting') && p.id !== id
        ).length
        if (wipCount >= state.settings.inProgressLimit) {
          set({ swapModalProjectId: id, swapModalTargetStatus: 'in_progress' })
          return false
        }
      }

      if (newStatus === 'waiting') {
        // Feature 2: combined WIP check (in_progress + waiting, excluding self)
        const wipCount = state.projects.filter(
          p => (p.status === 'in_progress' || p.status === 'waiting') && p.id !== id
        ).length
        if (wipCount >= state.settings.inProgressLimit) {
          set({ swapModalProjectId: id, swapModalTargetStatus: 'waiting' })
          return false
        }

        // Feature 1: no waitingOn entries → show prompt modal
        if (!project.waitingOn || project.waitingOn.length === 0) {
          set({ waitingPromptProjectId: id })
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
                // Clear waitingOn only when moving to backlog or done
                waitingOn: (newStatus === 'backlog' || newStatus === 'done') ? undefined : p.waitingOn,
              }
            : p
        ),
      }))

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

    setSwapModalProjectId: (id: string | null) => set({ swapModalProjectId: id }),
    setWaitingPromptProjectId: (id: string | null) => set({ waitingPromptProjectId: id }),
    setResolveWaitingProjectId: (id: string | null) => set({ resolveWaitingProjectId: id }),

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
