import { useStore } from '../store'

/**
 * Bundles all meeting modal state + actions into one hook.
 * Mirrors the useTodayPlan() pattern.
 */
export function useMeetingModal() {
  const openMeetingId = useStore(s => s.openMeetingId)
  const setOpenMeetingId = useStore(s => s.setOpenMeetingId)
  const meetings = useStore(s => s.meetings)
  const recurringMeetings = useStore(s => s.recurringMeetings)
  const addMeeting = useStore(s => s.addMeeting)
  const updateMeeting = useStore(s => s.updateMeeting)
  const deleteMeeting = useStore(s => s.deleteMeeting)
  const addRecurringMeeting = useStore(s => s.addRecurringMeeting)
  const updateRecurringMeeting = useStore(s => s.updateRecurringMeeting)
  const deleteRecurringMeeting = useStore(s => s.deleteRecurringMeeting)
  const addMeetingToPlan = useStore(s => s.addMeetingToPlan)

  const isOpen = openMeetingId !== null
  const isNew = openMeetingId === 'new'
  const existingMeeting = !isNew && openMeetingId
    ? meetings.find(m => m.id === openMeetingId) ?? recurringMeetings.find(m => m.id === openMeetingId)
    : null
  const isInRecurring = existingMeeting
    ? recurringMeetings.some(m => m.id === existingMeeting.id)
    : false

  return {
    openMeetingId, setOpenMeetingId,
    isOpen, isNew, existingMeeting, isInRecurring,
    addMeeting, updateMeeting, deleteMeeting,
    addRecurringMeeting, updateRecurringMeeting, deleteRecurringMeeting,
    addMeetingToPlan,
  }
}
