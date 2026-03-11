import { useState } from 'react'
import { ChevronDown, Plus, Clock, RotateCcw } from 'lucide-react'
import { useStore } from '../../store'
import { useTodayPlan } from '../../hooks/useTodayPlan'
import { describeRule } from '../../lib/recurrence'

export function AllMeetingsPanel() {
  const meetings = useStore(s => s.meetings)
  const recurringMeetings = useStore(s => s.recurringMeetings)
  const setOpenMeetingId = useStore(s => s.setOpenMeetingId)
  const { meetingIds, addMeetingToPlan } = useTodayPlan()

  const [expanded, setExpanded] = useState(false)

  const allMeetings = [...meetings, ...recurringMeetings]
  if (allMeetings.length === 0) return null

  // Meetings not in today's plan
  const availableMeetings = meetings.filter(m => !meetingIds.includes(m.id))
  const availableRecurring = recurringMeetings.filter(m => !meetingIds.includes(m.id))

  return (
    <div className="mt-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-2 py-1.5 rounded-[4px]
          text-[11px] text-stone/40 hover:text-stone/60 transition-all"
      >
        <span className="flex items-center gap-1.5">
          <Clock size={10} />
          All meetings ({allMeetings.length})
        </span>
        <ChevronDown size={11} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="mt-1 animate-slide-up">
          {/* One-off meetings */}
          {availableMeetings.length > 0 && (
            <div>
              {availableMeetings.map(m => (
                <div key={m.id} className="flex items-center gap-2 py-1.5 group">
                  <button
                    onClick={() => addMeetingToPlan(m.id)}
                    className="text-stone/30 hover:text-cat-marketing transition-colors flex-shrink-0"
                  >
                    <Plus size={12} />
                  </button>
                  <span className="text-[10px] text-stone/50 flex-shrink-0">{m.time}</span>
                  <button
                    onClick={() => setOpenMeetingId(m.id)}
                    className="text-[12px] text-charcoal/70 hover:text-charcoal truncate text-left flex-1 transition-colors"
                  >
                    {m.title}
                  </button>
                  <span className="text-[10px] text-stone/30">{m.durationMinutes}m</span>
                </div>
              ))}
            </div>
          )}

          {/* Recurring meetings */}
          {availableRecurring.length > 0 && (
            <div>
              {availableMeetings.length > 0 && (
                <div className="border-t border-border/30 my-1" />
              )}
              <div className="px-1 py-1 text-[10px] uppercase tracking-[0.08em] text-stone/30 font-medium flex items-center gap-1">
                <RotateCcw size={9} />
                Recurring
              </div>
              {availableRecurring.map(m => (
                <div key={m.id} className="flex items-center gap-2 py-1.5 group">
                  <button
                    onClick={() => addMeetingToPlan(m.id)}
                    className="text-stone/30 hover:text-cat-marketing transition-colors flex-shrink-0"
                  >
                    <Plus size={12} />
                  </button>
                  <span className="text-[10px] text-stone/50 flex-shrink-0">{m.time}</span>
                  <button
                    onClick={() => setOpenMeetingId(m.id)}
                    className="text-[12px] text-charcoal/70 hover:text-charcoal truncate text-left flex-1 transition-colors"
                  >
                    {m.title}
                  </button>
                  <span className="text-[10px] text-stone/30 italic">
                    {m.recurrenceRule ? describeRule(m.recurrenceRule) : ''}
                  </span>
                </div>
              ))}
            </div>
          )}

          {availableMeetings.length === 0 && availableRecurring.length === 0 && (
            <div className="text-[11px] text-stone/30 py-2 text-center italic">
              All meetings added to today
            </div>
          )}
        </div>
      )}
    </div>
  )
}
