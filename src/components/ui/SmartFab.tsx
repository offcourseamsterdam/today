import { useState, useEffect } from 'react'
import { Plus, Calendar, CheckSquare, FolderPlus, BookOpen, Cloud, LogOut, RotateCcw } from 'lucide-react'
import { useStore } from '../../store'

interface SmartFabProps {
  onOpenMeetings: () => void
  onAddTask: () => void
  onAddProject: () => void
  onOpenRecurringTasks: () => void
  onPlanToday: () => void
  onPlanTomorrow: () => void
  onMyRules: () => void
  onSignIn: () => void
  onSignOut: () => void
  isSignedIn: boolean
}

export function SmartFab({
  onOpenMeetings,
  onAddTask,
  onAddProject,
  onOpenRecurringTasks,
  onPlanToday,
  onPlanTomorrow,
  onMyRules,
  onSignIn,
  onSignOut,
  isSignedIn,
}: SmartFabProps) {
  const dailyPlan = useStore(s => s.dailyPlan)
  const tomorrowPlan = useStore(s => s.tomorrowPlan)
  const focusSession = useStore(s => s.focusSession)
  const showCitadelOverlay = useStore(s => s.showCitadelOverlay)
  const meetingSession = useStore(s => s.meetingSession)
  const meetings = useStore(s => s.meetings)
  const recurringMeetings = useStore(s => s.recurringMeetings)
  const [open, setOpen] = useState(false)
  const [hour, setHour] = useState(() => new Date().getHours())

  // Update hour every minute (for 3pm detection)
  useEffect(() => {
    const id = setInterval(() => setHour(new Date().getHours()), 60_000)
    return () => clearInterval(id)
  }, [])

  const isPlanned = !!(
    dailyPlan?.deepBlock.projectId || (dailyPlan?.shortTasks.length ?? 0) > 0
  )
  const isTomorrowPlanned = !!(tomorrowPlan?.isComplete)
  const isAfterThree = hour >= 15

  const focusLabel = focusSession
    ? `${focusSession.projectTitle || focusSession.taskTitle} · Back to focus`
    : null

  const activeMeeting = meetingSession
    ? [...meetings, ...recurringMeetings].find(m => m.id === meetingSession.meetingId)
    : null
  const meetingLabel = activeMeeting
    ? `${activeMeeting.title} · Back to agenda`
    : null

  const label = focusLabel
    ?? meetingLabel
    ?? (!isPlanned ? 'Plan today' : isAfterThree && !isTomorrowPlanned ? 'Plan tomorrow?' : null)

  function handlePrimaryClick() {
    if (focusLabel) {
      showCitadelOverlay()
    } else if (meetingLabel) {
      onOpenMeetings()
    } else if (label === 'Plan today') {
      onPlanToday()
    } else if (label === 'Plan tomorrow?') {
      onPlanTomorrow()
    } else {
      setOpen(o => !o)
    }
  }

  const actions = [
    { icon: <Calendar size={14} />, label: 'Plan today', action: onPlanToday },
    { icon: <Calendar size={14} />, label: 'Plan tomorrow', action: onPlanTomorrow },
    { icon: <Calendar size={14} />, label: 'Meetings', action: onOpenMeetings },
    { icon: <CheckSquare size={14} />, label: 'New task', action: onAddTask },
    { icon: <RotateCcw size={14} />, label: 'Recurring tasks', action: onOpenRecurringTasks },
    { icon: <FolderPlus size={14} />, label: 'New project', action: onAddProject },
    { icon: <BookOpen size={14} />, label: 'My rules', action: onMyRules },
    isSignedIn
      ? { icon: <LogOut size={14} />, label: 'Sign out', action: onSignOut }
      : { icon: <Cloud size={14} />, label: 'Sign in', action: onSignIn },
  ]

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
        {/* Action stack */}
        {open && (
          <div className="flex flex-col items-end gap-1.5">
            {actions.map((item, i) => (
              <button
                key={item.label}
                onClick={() => { item.action(); setOpen(false) }}
                className="flex items-center gap-2.5 px-3.5 py-2 rounded-full
                  bg-charcoal text-canvas text-[12px] font-medium
                  shadow-lg hover:bg-charcoal/80 transition-all duration-150
                  animate-fab-item"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                {item.label}
                <span className="text-canvas/60">{item.icon}</span>
              </button>
            ))}
          </div>
        )}

        {/* Label card (floats above FAB) */}
        {label && !open && (
          <button
            onClick={handlePrimaryClick}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-[10px]
              bg-card border border-border
              shadow-[0_4px_20px_rgba(42,39,36,0.10)]
              hover:shadow-[0_4px_28px_rgba(42,39,36,0.15)]
              hover:border-stone/30
              transition-all duration-200
              ${focusLabel || meetingLabel ? 'animate-pulse-focus' : 'animate-pulse-label'}`}
          >
            {focusLabel ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-focus-dot shrink-0" />
                <span className="text-[12px] font-medium text-charcoal">{label}</span>
              </>
            ) : meetingLabel ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-focus-dot shrink-0" />
                <span className="text-[12px] font-medium text-charcoal">{label}</span>
              </>
            ) : (
              <span className="font-serif text-[14px] text-charcoal/80 italic">{label}</span>
            )}
          </button>
        )}

        {/* Main FAB */}
        <div>
          {/* Icon button */}
          <button
            onClick={label ? () => setOpen(o => !o) : handlePrimaryClick}
            className="flex items-center justify-center w-12 h-12 rounded-full
              bg-charcoal text-canvas shadow-lg
              hover:bg-charcoal/80 transition-all duration-200"
          >
            <span
              className="transition-transform duration-200"
              style={{ transform: open ? 'rotate(45deg)' : 'rotate(0deg)' }}
            >
              <Plus size={18} />
            </span>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fab-item {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-fab-item {
          animation: fab-item 200ms ease both;
        }
        @keyframes pulse-label {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.75; }
        }
        .animate-pulse-label {
          animation: pulse-label 3s ease-in-out infinite;
        }
        .animate-pulse-focus {
          animation: pulse-label 2s ease-in-out infinite;
        }
        @keyframes focus-dot {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
        .animate-focus-dot {
          animation: focus-dot 1.5s ease-in-out infinite;
        }
      `}</style>
    </>
  )
}
