import { useMemo } from 'react'
import { useStore } from '../store'

/**
 * Bundles all tomorrow-plan state + actions into one hook.
 * PlanningMode currently has 13 useStore calls; this reduces it to ~4.
 */
export function useTomorrowPlan() {
  const tomorrowPlan = useStore(s => s.tomorrowPlan)
  const setTomorrowDeepBlock = useStore(s => s.setTomorrowDeepBlock)
  const clearTomorrowDeepBlock = useStore(s => s.clearTomorrowDeepBlock)
  const addTomorrowShortTask = useStore(s => s.addTomorrowShortTask)
  const removeTomorrowShortTask = useStore(s => s.removeTomorrowShortTask)
  const addTomorrowMaintenanceTask = useStore(s => s.addTomorrowMaintenanceTask)
  const removeTomorrowMaintenanceTask = useStore(s => s.removeTomorrowMaintenanceTask)
  const lockInTomorrow = useStore(s => s.lockInTomorrow)
  const clearTomorrowPlan = useStore(s => s.clearTomorrowPlan)

  const shortTaskIds = useMemo(() => tomorrowPlan?.shortTasks ?? [], [tomorrowPlan])
  const maintenanceTaskIds = useMemo(() => tomorrowPlan?.maintenanceTasks ?? [], [tomorrowPlan])

  return {
    tomorrowPlan,
    shortTaskIds,
    maintenanceTaskIds,
    setTomorrowDeepBlock,
    clearTomorrowDeepBlock,
    addTomorrowShortTask,
    removeTomorrowShortTask,
    addTomorrowMaintenanceTask,
    removeTomorrowMaintenanceTask,
    lockInTomorrow,
    clearTomorrowPlan,
  }
}
