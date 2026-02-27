import type { ActiveView, StoreSet, StoreGet } from './types'

export function makeNavigationActions(set: StoreSet, _get: StoreGet) {
  return {
    setActiveView: (view: ActiveView) => set({ activeView: view }),
    setGreetedDate: (date: string) => set({ greetedDate: date }),
    markArtworkLoading: (id: string) =>
      set(state => ({ artworkLoadingIds: [...state.artworkLoadingIds, id] })),
    unmarkArtworkLoading: (id: string) =>
      set(state => ({ artworkLoadingIds: state.artworkLoadingIds.filter(i => i !== id) })),
  }
}
