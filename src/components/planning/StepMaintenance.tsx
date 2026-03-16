import { useState } from 'react'
import { format } from 'date-fns'
import { X, Calendar, RotateCcw } from 'lucide-react'
import { useStore } from '../../store'
import type { AssignedCalendarEvent } from '../../types'
import { findTaskById } from '../../lib/taskLookup'

interface StepMaintenanceProps {
  taskIds: string[]
  onTaskIdsChange: (ids: string[]) => void
  calendarMaintEvents: AssignedCalendarEvent[]
}

function formatTimeRange(start: string, end: string): string {
  const fmt = (iso: string) => format(new Date(iso), 'HH:mm')
  return `${fmt(start)} – ${fmt(end)}`
}

export function StepMaintenance({
  taskIds,
  onTaskIdsChange,
  calendarMaintEvents,
}: StepMaintenanceProps) {
  const projects = useStore(s => s.projects)
  const orphanTasks = useStore(s => s.orphanTasks)
  const recurringTasks = useStore(s => s.recurringTasks)
  const getTodayRecurringTasks = useStore(s => s.getTodayRecurringTasks)
  const addOrphanTask = useStore(s => s.addOrphanTask)

  const [quickAdd, setQuickAdd] = useState('')

  const todayRecurring = getTodayRecurringTasks()
  const notYetAdded = todayRecurring.filter(t => !taskIds.includes(t.id))

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
      <div className="flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-wider text-[#7A746A]/60">
          Maintenance tasks
        </div>
        {notYetAdded.length > 0 && (
          <button
            onClick={handleAutoPopulate}
            className="flex items-center gap-1.5 text-[11px] text-[#7A746A]
              px-2.5 py-1 rounded border border-[#E8E4DD]
              hover:border-[#7A746A]/30 hover:text-[#2A2724] transition-all"
          >
            <RotateCcw size={11} />
            Add {notYetAdded.length} recurring
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

      {taskIds.length === 0 && calendarMaintEvents.length === 0 && (
        <div className="text-[13px] text-[#7A746A]/40 text-center py-3 italic">
          The recurring work that keeps life running
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
