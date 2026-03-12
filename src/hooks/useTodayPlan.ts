import { useMemo } from 'react'
import { useStore } from '../store'

/**
 * Bundles all daily-plan state + actions into one hook.
 * Replaces 6–8 individual useStore calls across DeepBlock, MaintenanceTier,
 * ShortTasks, VandaagView, CitadelMode, NewDayScreen, and EnoughScreen.
 */
export function useTodayPlan() {
  const dailyPlan = useStore(s => s.dailyPlan)
  const addShortTask = useStore(s => s.addShortTask)
  const removeShortTask = useStore(s => s.removeShortTask)
  const addMaintenanceTask = useStore(s => s.addMaintenanceTask)
  const removeMaintenanceTask = useStore(s => s.removeMaintenanceTask)
  const addShortProject = useStore(s => s.addShortProject)
  const removeShortProject = useStore(s => s.removeShortProject)
  const addMaintenanceProject = useStore(s => s.addMaintenanceProject)
  const removeMaintenanceProject = useStore(s => s.removeMaintenanceProject)
  const setDeepBlock = useStore(s => s.setDeepBlock)
  const clearDeepBlock = useStore(s => s.clearDeepBlock)
  const addMeetingToPlan = useStore(s => s.addMeetingToPlan)
  const removeMeetingFromPlan = useStore(s => s.removeMeetingFromPlan)

  const shortTaskIds = useMemo(() => dailyPlan?.shortTasks ?? [], [dailyPlan])
  const maintenanceTaskIds = useMemo(() => dailyPlan?.maintenanceTasks ?? [], [dailyPlan])
  const shortProjectIds = useMemo(() => dailyPlan?.shortProjects ?? [], [dailyPlan])
  const maintenanceProjectIds = useMemo(() => dailyPlan?.maintenanceProjects ?? [], [dailyPlan])
  const meetingIds = useMemo(() => dailyPlan?.meetings ?? [], [dailyPlan])

  return {
    dailyPlan,
    shortTaskIds,
    maintenanceTaskIds,
    shortProjectIds,
    maintenanceProjectIds,
    meetingIds,
    addShortTask,
    removeShortTask,
    addMaintenanceTask,
    removeMaintenanceTask,
    addShortProject,
    removeShortProject,
    addMaintenanceProject,
    removeMaintenanceProject,
    setDeepBlock,
    clearDeepBlock,
    addMeetingToPlan,
    removeMeetingFromPlan,
  }
}
