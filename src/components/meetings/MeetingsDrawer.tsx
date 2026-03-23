import { useState, useCallback } from 'react'
import { format } from 'date-fns'
import { X, Plus, ChevronDown, RotateCcw, Calendar } from 'lucide-react'
import { useStore } from '../../store'
import { LiveMeetingPanel } from './LiveMeetingPanel'
import { MeetingRow } from './MeetingRow'
import { describeRule } from '../../lib/recurrence'
import type { Meeting } from '../../types'

interface MeetingsDrawerProps {
  open: boolean
  onClose: () => void
}

export function MeetingsDrawer({ open, onClose }: MeetingsDrawerProps) {
  const meetings = useStore(s => s.meetings)
  const recurringMeetings = useStore(s => s.recurringMeetings)
  const setOpenMeetingId = useStore(s => s.setOpenMeetingId)
  const deleteMeeting = useStore(s => s.deleteMeeting)
  const deleteRecurringMeeting = useStore(s => s.deleteRecurringMeeting)
  const [showRecurring, setShowRecurring] = useState(false)

  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const todayMeetings = meetings.filter(m => !m.date || m.date === todayStr)
  const sortedMeetings = [...todayMeetings].sort((a, b) => a.time.localeCompare(b.time))
  const sortedRecurring = [...recurringMeetings].sort((a, b) => a.time.localeCompare(b.time))

  const handleDelete = useCallback((meeting: Meeting, isRecurring: boolean) => {
    if (isRecurring) deleteRecurringMeeting(meeting.id)
    else deleteMeeting(meeting.id)
  }, [deleteMeeting, deleteRecurringMeeting])

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-charcoal/20 backdrop-blur-[2px] transition-opacity duration-300
          ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-[380px] bg-canvas border-l border-border
          shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]
          ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-6 pb-4 border-b border-border/50 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-stone/50" />
            <h2 className="text-[14px] font-medium text-charcoal">Meetings</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setOpenMeetingId('new')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] border border-border
                text-[11px] text-stone hover:text-charcoal hover:border-stone/30 transition-all"
            >
              <Plus size={11} />
              Add
            </button>
            <button
              onClick={onClose}
              className="text-stone/40 hover:text-stone transition-colors p-1"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <LiveMeetingPanel />
          {sortedMeetings.length === 0 && sortedRecurring.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Calendar size={28} className="text-stone/20" />
              <p className="text-[13px] text-stone/40 text-center">
                No meetings yet.
                <br />
                Add one to get started.
              </p>
              <button
                onClick={() => setOpenMeetingId('new')}
                className="mt-2 px-4 py-2 rounded-[6px] border border-border text-[12px] text-stone
                  hover:text-charcoal hover:border-stone/30 transition-all"
              >
                Add meeting
              </button>
            </div>
          ) : (
            <>
              {sortedMeetings.length > 0 && (
                <div>
                  {sortedMeetings.map(m => (
                    <MeetingRow
                      key={m.id}
                      meeting={m}
                      onEdit={() => setOpenMeetingId(m.id)}
                      onDelete={() => handleDelete(m, false)}
                    />
                  ))}
                </div>
              )}

              {/* Recurring meetings */}
              {sortedRecurring.length > 0 && (
                <div className="mt-4">
                  <button
                    onClick={() => setShowRecurring(v => !v)}
                    className="flex items-center gap-2 py-1 text-[10px] uppercase tracking-[0.08em]
                      text-stone/40 hover:text-stone/60 transition-colors font-medium mb-2"
                  >
                    <RotateCcw size={10} />
                    Recurring ({sortedRecurring.length})
                    <ChevronDown
                      size={10}
                      className={`transition-transform ${showRecurring ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {showRecurring && (
                    <div className="animate-slide-up">
                      {sortedRecurring.map(m => (
                        <div key={m.id} className="border-b border-border/30 last:border-0">
                          <div className="flex items-center gap-3 py-2.5">
                            <span className="text-[11px] text-stone/50 w-[38px] text-right flex-shrink-0">
                              {m.time}
                            </span>
                            <span className="text-[12px] text-charcoal/80 flex-1 truncate">
                              {m.title}
                            </span>
                            <span className="text-[10px] text-stone/30 italic">
                              {m.recurrenceRule ? describeRule(m.recurrenceRule) : ''}
                            </span>
                            <button
                              onClick={() => setOpenMeetingId(m.id)}
                              className="text-[10px] text-stone/40 hover:text-charcoal transition-colors flex-shrink-0"
                            >
                              Edit
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}
