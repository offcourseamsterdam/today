import { useMemo } from 'react'
import { useStore } from '../store'

/**
 * Bundles all tomorrow-plan state + actions into one hook.
 */
export function useTomorrowPlan() {
  const tomorrowPlan = useStore(s => s.tomorrowPlan)
  const setTomorrowDeepBlock = useStore(s => s.setTomorrowDeepBlock)
  const clearTomorrowDeepBlock = useStore(s => s.clearTomorrowDeepBlock)
  const addTomorrowShortTask = useStore(s => s.addTomorrowShortTask)
  const removeTomorrowShortTask = useStore(s => s.removeTomorrowShortTask)
  const addTomorrowMaintenanceTask = useStore(s => s.addTomorrowMaintenanceTask)
  const removeTomorrowMaintenanceTask = useStore(s => s.removeTomorrowMaintenanceTask)
  const addTomorrowShortProject = useStore(s => s.addTomorrowShortProject)
  const removeTomorrowShortProject = useStore(s => s.removeTomorrowShortProject)
  const addTomorrowMaintenanceProject = useStore(s => s.addTomorrowMaintenanceProject)
  const removeTomorrowMaintenanceProject = useStore(s => s.removeTomorrowMaintenanceProject)
  const addTomorrowMeeting = useStore(s => s.addTomorrowMeeting)
  const removeTomorrowMeeting = useStore(s => s.removeTomorrowMeeting)
  const lockInTomorrow = useStore(s => s.lockInTomorrow)
  const clearTomorrowPlan = useStore(s => s.clearTomorrowPlan)
  const setTomorrowBlockOrder = useStore(s => s.setTomorrowBlockOrder)

  const shortTaskIds = useMemo(() => tomorrowPlan?.shortTasks ?? [], [tomorrowPlan])
  const maintenanceTaskIds = useMemo(() => tomorrowPlan?.maintenanceTasks ?? [], [tomorrowPlan])
  const meetingIds = useMemo(() => tomorrowPlan?.meetings ?? [], [tomorrowPlan])

  return {
    tomorrowPlan,
    shortTaskIds,
    maintenanceTaskIds,
    meetingIds,
    setTomorrowDeepBlock,
    clearTomorrowDeepBlock,
    addTomorrowShortTask,
    removeTomorrowShortTask,
    addTomorrowMaintenanceTask,
    removeTomorrowMaintenanceTask,
    addTomorrowShortProject,
    removeTomorrowShortProject,
    addTomorrowMaintenanceProject,
    removeTomorrowMaintenanceProject,
    addTomorrowMeeting,
    removeTomorrowMeeting,
    lockInTomorrow,
    clearTomorrowPlan,
    setTomorrowBlockOrder,
  }
}
