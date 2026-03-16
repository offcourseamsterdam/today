import { useState, useEffect } from 'react'
import { format, addDays } from 'date-fns'
import { X } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useTomorrowPlan } from '../../hooks/useTomorrowPlan'
import type { AssignedCalendarEvent } from '../../types'
import { StepIndicator } from './StepIndicator'
import { StepCalendar } from './StepCalendar'
import { StepDeepBlock } from './StepDeepBlock'
import { StepShortTasks } from './StepShortTasks'
import { StepMaintenance } from './StepMaintenance'

interface PlanningModalProps {
  onClose: () => void
}

export function PlanningModal({ onClose }: PlanningModalProps) {
  const { calendarAccessToken, requestCalendarAccess } = useAuth()
  const {
    tomorrowPlan,
    setTomorrowDeepBlock,
    clearTomorrowDeepBlock,
    addTomorrowShortTask,
    removeTomorrowShortTask,
    addTomorrowMaintenanceTask,
    removeTomorrowMaintenanceTask,
    lockInTomorrow,
    shortTaskIds: existingShortIds,
    maintenanceTaskIds: existingMainIds,
  } = useTomorrowPlan()

  const [step, setStep] = useState(1)
  const [assignments, setAssignments] = useState<AssignedCalendarEvent[]>([])
  const [deepProjectId, setDeepProjectId] = useState('')
  const [intention, setIntention] = useState('')
  const [shortTaskIds, setShortTaskIds] = useState<string[]>([])
  const [mainTaskIds, setMainTaskIds] = useState<string[]>([])

  // Pre-populate from existing tomorrowPlan on mount
  useEffect(() => {
    if (tomorrowPlan) {
      setDeepProjectId(tomorrowPlan.deepBlock.projectId || '')
      setIntention(tomorrowPlan.deepBlock.intention || '')
      setShortTaskIds([...existingShortIds])
      setMainTaskIds([...existingMainIds])
    }
  // Only run on mount — existingShortIds/existingMainIds are derived from tomorrowPlan
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const tomorrowLabel = format(addDays(new Date(), 1), 'EEEE d MMMM')

  const calendarDeepEvent = assignments.find(a => a.tier === 'deep') ?? null
  const calendarShortEvents = assignments.filter(a => a.tier === 'short')
  const calendarMaintEvents = assignments.filter(a => a.tier === 'maintenance')

  function handleLockIn() {
    // Sync deep block
    clearTomorrowDeepBlock()
    if (calendarDeepEvent) {
      setTomorrowDeepBlock(calendarDeepEvent.event.id, intention || undefined)
    } else if (deepProjectId) {
      setTomorrowDeepBlock(deepProjectId, intention || undefined)
    }

    // Sync short tasks — remove old ones first, then add new ones
    for (const id of existingShortIds) {
      removeTomorrowShortTask(id)
    }
    for (const id of shortTaskIds) {
      addTomorrowShortTask(id)
    }

    // Sync maintenance tasks
    for (const id of existingMainIds) {
      removeTomorrowMaintenanceTask(id)
    }
    for (const id of mainTaskIds) {
      addTomorrowMaintenanceTask(id)
    }

    lockInTomorrow()
    onClose()
  }

  function handleNext() {
    setStep(s => Math.min(s + 1, 4))
  }

  function handleBack() {
    setStep(s => Math.max(s - 1, 1))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal card */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#F0EEEB]">
          <span className="font-serif text-[18px] text-[#2A2724]">Plan tomorrow</span>
          <span className="text-[13px] text-[#7A746A] absolute left-1/2 -translate-x-1/2">
            {tomorrowLabel.toLowerCase()}
          </span>
          <button
            onClick={onClose}
            className="text-[#7A746A]/50 hover:text-[#7A746A] transition-colors p-1"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <StepIndicator currentStep={step} />

          {step === 1 && (
            <StepCalendar
              assignments={assignments}
              onAssignmentsChange={setAssignments}
              accessToken={calendarAccessToken}
              onRequestAccess={requestCalendarAccess}
            />
          )}

          {step === 2 && (
            <StepDeepBlock
              projectId={deepProjectId}
              intention={intention}
              onProjectChange={setDeepProjectId}
              onIntentionChange={setIntention}
              calendarDeepEvent={calendarDeepEvent}
            />
          )}

          {step === 3 && (
            <StepShortTasks
              taskIds={shortTaskIds}
              onTaskIdsChange={setShortTaskIds}
              calendarShortEvents={calendarShortEvents}
            />
          )}

          {step === 4 && (
            <StepMaintenance
              taskIds={mainTaskIds}
              onTaskIdsChange={setMainTaskIds}
              calendarMaintEvents={calendarMaintEvents}
            />
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#F0EEEB] flex justify-between items-center">
          {step > 1 ? (
            <button
              onClick={handleBack}
              className="text-[13px] text-[#7A746A] hover:text-[#2A2724] transition-colors px-2 py-1"
            >
              ← Back
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              onClick={handleNext}
              className="flex items-center gap-1 px-4 py-2 rounded-[8px]
                bg-[#2A2724] text-white text-[13px] font-medium
                hover:bg-[#2A2724]/90 transition-all"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={handleLockIn}
              className="flex items-center gap-2 px-5 py-2 rounded-[8px]
                bg-[#2A2724] text-white text-[13px] font-medium
                hover:bg-[#2A2724]/90 transition-all"
            >
              Lock in tomorrow
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
