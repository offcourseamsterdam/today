import { useState } from 'react'
import { format } from 'date-fns'
import { X, Calendar, RotateCcw, Clock, AlertTriangle } from 'lucide-react'
import { useStore } from '../../store'
import type { AssignedCalendarEvent } from '../../types'
import { findTaskById } from '../../lib/taskLookup'
import { getTodayString } from '../../store/helpers'

interface StepMaintenanceProps {
  taskIds: string[]
  onTaskIdsChange: (ids: string[]) => void
  calendarMaintEvents: AssignedCalendarEvent[]
  meetingIds: string[]
  onAddMeeting: (id: string) => void
  onRemoveMeeting: (id: string) => void
  day?: 'today' | 'tomorrow'
}

function formatTimeRange(start: string, end: string): string {
  const fmt = (iso: string) => format(new Date(iso), 'HH:mm')
  return `${fmt(start)} – ${fmt(end)}`
}

export function StepMaintenance({
  taskIds,
  onTaskIdsChange,
  calendarMaintEvents,
  meetingIds,
  onAddMeeting,
  onRemoveMeeting,
  day = 'tomorrow',
}: StepMaintenanceProps) {
  const projects = useStore(s => s.projects)
  const orphanTasks = useStore(s => s.orphanTasks)
  const recurringTasks = useStore(s => s.recurringTasks)
  const getTodayRecurringTasks = useStore(s => s.getTodayRecurringTasks)
  const getTomorrowRecurringTasks = useStore(s => s.getTomorrowRecurringTasks)
  const addOrphanTask = useStore(s => s.addOrphanTask)
  const allMeetings = useStore(s => s.meetings)
  const recurringMeetings = useStore(s => s.recurringMeetings)

  const [quickAdd, setQuickAdd] = useState('')
  const [showMeetingPicker, setShowMeetingPicker] = useState(false)

  const todayRecurring = getTodayRecurringTasks()
  // When planning tomorrow, also include tomorrow's recurring tasks as suggestions
  const planDayRecurring = day === 'tomorrow' ? getTomorrowRecurringTasks() : todayRecurring
  const notYetAdded = planDayRecurring.filter(t => !taskIds.includes(t.id))

  // Recurring tasks due today that weren't completed (shown as overdue regardless of day)
  const today = getTodayString()
  const overdueRecurring = todayRecurring.filter(t => t.lastCompletedDate !== today)
  const overdueNotAdded = overdueRecurring.filter(t => !taskIds.includes(t.id))
  const hasOverdue = overdueNotAdded.length > 0

  const allMeetingsList = [...allMeetings, ...recurringMeetings]
    .sort((a, b) => a.time.localeCompare(b.time))
  const availableMeetings = allMeetingsList.filter(m => !meetingIds.includes(m.id))

  function handleAutoPopulate() {
    const newIds = notYetAdded.map(t => t.id)
    onTaskIdsChange([...taskIds, ...newIds])
  }

  function handleRemove(id: string) {
    onTaskIdsChange(taskIds.filter(tid => tid !== id))
  }

  function handleQuickAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!quickAdd.trim()) return
    const id = addOrphanTask(quickAdd.trim())
    onTaskIdsChange([...taskIds, id])
    setQuickAdd('')
  }

  return (
    <div className="space-y-3">

      {/* Overdue recurring tasks banner */}
      {hasOverdue && (
        <div className="rounded-[8px] border border-amber-200 bg-amber-50 p-3 space-y-2">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle size={13} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <div className="text-[12px] font-medium text-amber-800">
                  {overdueNotAdded.length} recurring task{overdueNotAdded.length !== 1 ? 's' : ''} not done today
                </div>
                <div className="text-[11px] text-amber-600/80 mt-0.5">
                  Carry them over — the usual 3-task guideline doesn't apply when you're behind.
                </div>
              </div>
            </div>
            <button
              onClick={() => onTaskIdsChange([...taskIds, ...overdueNotAdded.map(t => t.id)])}
              className="text-[11px] text-amber-700 border border-amber-300 rounded px-2 py-1
                hover:bg-amber-100 transition-colors whitespace-nowrap flex-shrink-0"
            >
              Carry all over
            </button>
          </div>
          <div className="space-y-1">
            {overdueNotAdded.map(t => (
              <div key={t.id} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <RotateCcw size={11} className="text-amber-500/60 flex-shrink-0" />
                  <span className="text-[12px] text-amber-800 truncate">{t.title}</span>
                </div>
                <button
                  onClick={() => onTaskIdsChange([...taskIds, t.id])}
                  className="text-[11px] text-amber-600 hover:text-amber-800 transition-colors flex-shrink-0"
                >
                  + add
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="text-[11px] uppercase tracking-wider text-[#7A746A]/60">
          Maintenance tasks
        </div>
        {notYetAdded.length > 0 && (
          <button
            onClick={handleAutoPopulate}
            className="flex items-center gap-1.5 text-[11px] text-[#7A746A]
              px-2.5 py-1 rounded border border-[#E8E4DD]
              hover:border-[#7A746A]/30 hover:text-[#2A2724] transition-all flex-shrink-0"
          >
            <RotateCcw size={11} />
            Add {notYetAdded.length} {day === 'tomorrow' ? "tomorrow's" : "today's"} recurring
          </button>
        )}
      </div>

      {/* Calendar maintenance events (read-only) */}
      {calendarMaintEvents.map(({ event }) => (
        <div
          key={event.id}
          className="flex items-center gap-3 px-3 py-2.5 rounded-[8px] border border-[#E8E4DD] bg-[#FAF9F7]"
        >
          <Calendar size={13} className="text-[#7A746A] flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[13px] text-[#2A2724] truncate">{event.title}</div>
            <div className="text-[11px] text-[#7A746A]/60">
              {formatTimeRange(event.start, event.end)}
            </div>
          </div>
        </div>
      ))}

      {/* Selected meetings */}
      {meetingIds.map(id => {
        const meeting = allMeetingsList.find(m => m.id === id)
        if (!meeting) return null
        return (
          <div
            key={id}
            className="flex items-center gap-3 px-3 py-2.5 rounded-[8px] border border-[#E8E4DD] bg-[#FAF9F7]"
          >
            <Clock size={13} className="text-[#7A746A] flex-shrink-0" />
            <span className="text-[11px] text-[#7A746A]/60 font-mono flex-shrink-0 w-10">
              {meeting.time}
            </span>
            <span className="text-[13px] text-[#2A2724] flex-1 truncate">{meeting.title}</span>
            <span className="text-[10px] text-[#7A746A]/50 flex-shrink-0">{meeting.durationMinutes}m</span>
            <button
              onClick={() => onRemoveMeeting(id)}
              className="text-[#7A746A]/30 hover:text-[#7A746A] transition-colors"
            >
              <X size={13} />
            </button>
          </div>
        )
      })}

      {/* Selected tasks */}
      {taskIds.map(taskId => {
        const found = findTaskById(taskId, projects, orphanTasks, recurringTasks)
        if (!found) return null
        return (
          <div
            key={taskId}
            className="flex items-center gap-3 px-3 py-2.5 rounded-[8px] border border-[#E8E4DD] bg-white group"
          >
            <RotateCcw
              size={12}
              className={`flex-shrink-0 ${found.task.isRecurring ? 'text-[#7A746A]/40' : 'text-transparent'}`}
            />
            <span className="text-[13px] text-[#2A2724] flex-1 min-w-0 truncate">
              {found.task.title}
            </span>
            <button
              onClick={() => handleRemove(taskId)}
              className="text-[#7A746A]/30 hover:text-[#7A746A] transition-colors flex-shrink-0"
            >
              <X size={13} />
            </button>
          </div>
        )
      })}

      {taskIds.length === 0 && calendarMaintEvents.length === 0 && meetingIds.length === 0 && (
        <div className="text-[13px] text-[#7A746A]/40 text-center py-3 italic">
          The recurring work that keeps life running
        </div>
      )}

      {/* Meeting picker */}
      {availableMeetings.length > 0 && (
        <div>
          <button
            onClick={() => setShowMeetingPicker(!showMeetingPicker)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-[6px]
              border border-dashed border-[#E8E4DD] text-[12px] text-[#7A746A]/60
              hover:border-[#7A746A]/30 hover:text-[#7A746A] transition-all"
          >
            <span>Add a meeting</span>
            <span className="text-[10px]">{showMeetingPicker ? '▲' : '▼'}</span>
          </button>
          {showMeetingPicker && (
            <div className="mt-1 rounded-[6px] border border-[#E8E4DD] bg-white overflow-hidden">
              {availableMeetings.map(m => (
                <button
                  key={m.id}
                  onClick={() => { onAddMeeting(m.id); setShowMeetingPicker(false) }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#FAF9F7] transition-colors text-left border-b border-[#E8E4DD] last:border-0"
                >
                  <Clock size={12} className="text-[#7A746A]/50 flex-shrink-0" />
                  <span className="text-[11px] text-[#7A746A]/60 font-mono flex-shrink-0 w-10">{m.time}</span>
                  <span className="text-[13px] text-[#2A2724] flex-1 truncate">{m.title}</span>
                  <span className="text-[10px] text-[#7A746A]/50 flex-shrink-0">{m.durationMinutes}m</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Quick add */}
      <form onSubmit={handleQuickAdd} className="flex items-center gap-2">
        <input
          type="text"
          value={quickAdd}
          onChange={e => setQuickAdd(e.target.value)}
          placeholder="Add maintenance task…"
          className="flex-1 px-3 py-2 rounded-[6px] border border-[#E8E4DD] bg-white
            text-[12px] text-[#2A2724] placeholder:text-[#7A746A]/40
            outline-none focus:border-[#2A2724]/30 transition-colors"
        />
        <button
          type="submit"
          disabled={!quickAdd.trim()}
          className="px-3 py-2 rounded-[6px] border border-[#E8E4DD]
            text-[12px] text-[#7A746A] hover:border-[#2A2724]/30 hover:text-[#2A2724]
            transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Add
        </button>
      </form>
    </div>
  )
}
