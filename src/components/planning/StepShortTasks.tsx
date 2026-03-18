import { useState } from 'react'
import { format } from 'date-fns'
import { X, Calendar, Clock } from 'lucide-react'
import { useStore } from '../../store'
import type { AssignedCalendarEvent } from '../../types'
import { getAvailableTasks } from '../../lib/availableTasks'
import { findTaskById } from '../../lib/taskLookup'
import { TaskPickerList } from '../ui/TaskPickerList'

interface StepShortTasksProps {
  taskIds: string[]
  onTaskIdsChange: (ids: string[]) => void
  calendarShortEvents: AssignedCalendarEvent[]
  meetingIds: string[]
  onAddMeeting: (id: string) => void
  onRemoveMeeting: (id: string) => void
}

const MAX_SLOTS = 3

function formatTimeRange(start: string, end: string): string {
  const fmt = (iso: string) => format(new Date(iso), 'HH:mm')
  return `${fmt(start)} – ${fmt(end)}`
}

export function StepShortTasks({
  taskIds,
  onTaskIdsChange,
  calendarShortEvents,
  meetingIds,
  onAddMeeting,
  onRemoveMeeting,
}: StepShortTasksProps) {
  const projects = useStore(s => s.projects)
  const orphanTasks = useStore(s => s.orphanTasks)
  const recurringTasks = useStore(s => s.recurringTasks)
  const addOrphanTask = useStore(s => s.addOrphanTask)
  const allMeetings = useStore(s => s.meetings)
  const recurringMeetings = useStore(s => s.recurringMeetings)
  const [showPicker, setShowPicker] = useState(false)
  const [showMeetingPicker, setShowMeetingPicker] = useState(false)
  const [quickAdd, setQuickAdd] = useState('')

  const usedSlots = calendarShortEvents.length + taskIds.length + meetingIds.length
  const remainingSlots = MAX_SLOTS - usedSlots

  const availableTasks = getAvailableTasks(projects, orphanTasks, taskIds)

  const allMeetingsList = [...allMeetings, ...recurringMeetings]
    .sort((a, b) => a.time.localeCompare(b.time))
  const availableMeetings = allMeetingsList.filter(m => !meetingIds.includes(m.id))

  function handleSelect(id: string) {
    if (remainingSlots <= 0) return
    onTaskIdsChange([...taskIds, id])
    if (taskIds.length + 1 >= remainingSlots) setShowPicker(false)
  }

  function handleRemove(id: string) {
    onTaskIdsChange(taskIds.filter(tid => tid !== id))
  }

  function handleQuickAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!quickAdd.trim() || remainingSlots <= 0) return
    const id = addOrphanTask(quickAdd.trim())
    onTaskIdsChange([...taskIds, id])
    setQuickAdd('')
  }

  function handleAddMeeting(id: string) {
    if (remainingSlots <= 0) return
    onAddMeeting(id)
    setShowMeetingPicker(false)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-wider text-[#7A746A]/60">
          Short tasks
        </div>
        <div className="text-[11px] text-[#7A746A]/60">
          {usedSlots}/{MAX_SLOTS} slots
        </div>
      </div>

      {/* Calendar short events (read-only) */}
      {calendarShortEvents.map(({ event }) => (
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
          <span className="text-[10px] text-[#7A746A]/50 bg-[#E8E4DD] rounded-full px-2 py-0.5 flex-shrink-0">
            {event.durationMinutes} min
          </span>
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
            <span className="w-1.5 h-1.5 rounded-full bg-[#E8E4DD] flex-shrink-0" />
            <span className="text-[13px] text-[#2A2724] flex-1 min-w-0 truncate">
              {found.task.title}
            </span>
            {found.projectTitle && (
              <span className="text-[10px] text-[#7A746A]/50 flex-shrink-0 hidden group-hover:inline">
                {found.projectTitle}
              </span>
            )}
            <button
              onClick={() => handleRemove(taskId)}
              className="text-[#7A746A]/30 hover:text-[#7A746A] transition-colors flex-shrink-0"
            >
              <X size={13} />
            </button>
          </div>
        )
      })}

      {/* Add controls */}
      {remainingSlots > 0 && (
        <div className="space-y-2">
          <button
            onClick={() => setShowPicker(!showPicker)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-[6px]
              border border-dashed border-[#E8E4DD] text-[12px] text-[#7A746A]/60
              hover:border-[#7A746A]/30 hover:text-[#7A746A] transition-all"
          >
            <span>Add from projects ({remainingSlots} slot{remainingSlots !== 1 ? 's' : ''} left)</span>
            <span className="text-[10px]">{showPicker ? '▲' : '▼'}</span>
          </button>

          {showPicker && (
            <div className="rounded-[6px] border border-[#E8E4DD] bg-white max-h-[180px] overflow-y-auto">
              <TaskPickerList
                tasks={availableTasks}
                projects={projects}
                emptyText="No available tasks."
                onSelect={handleSelect}
              />
            </div>
          )}

          {availableMeetings.length > 0 && (
            <>
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
                <div className="rounded-[6px] border border-[#E8E4DD] bg-white overflow-hidden">
                  {availableMeetings.map(m => (
                    <button
                      key={m.id}
                      onClick={() => handleAddMeeting(m.id)}
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
            </>
          )}

          <form onSubmit={handleQuickAdd} className="flex items-center gap-2">
            <input
              type="text"
              value={quickAdd}
              onChange={e => setQuickAdd(e.target.value)}
              placeholder="Quick-add a task…"
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
      )}

      {remainingSlots === 0 && (
        <div className="text-[12px] text-[#7A746A]/50 text-center py-1">
          All {MAX_SLOTS} slots filled
        </div>
      )}
    </div>
  )
}
