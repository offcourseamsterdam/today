import type { Settings } from '../types'
import type { StoreSet, StoreGet } from './types'

export function makeSettingsActions(set: StoreSet, _get: StoreGet) {
  return {
    updateSettings: (updates: Partial<Settings>) => {
      set(state => ({ settings: { ...state.settings, ...updates } }))
    },

    updateSettingsWithLimitTracking: (limit: number) => {
      const now = new Date().toISOString()
      set(state => ({
        settings: {
          ...state.settings,
          inProgressLimit: limit,
          inProgressLimitChangeLog: [
            ...(state.settings.inProgressLimitChangeLog ?? []),
            now,
          ],
        },
      }))
    },

    addPersonalRule: (rule: string) => {
      set(state => ({ personalRules: [...state.personalRules, rule] }))
    },

    updatePersonalRule: (index: number, rule: string) => {
      set(state => ({
        personalRules: state.personalRules.map((r, i) => (i === index ? rule : r)),
      }))
    },

    deletePersonalRule: (index: number) => {
      set(state => ({
        personalRules: state.personalRules.filter((_, i) => i !== index),
      }))
    },
  }
}
