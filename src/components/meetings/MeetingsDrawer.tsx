import { useState, useCallback } from 'react'
import { format } from 'date-fns'
import { X, Plus, ChevronDown, RotateCcw, Calendar } from 'lucide-react'
import { useStore } from '../../store'
import { useTodayPlan } from '../../hooks/useTodayPlan'
import { LiveMeetingPanel } from './LiveMeetingPanel'
import { describeRule } from '../../lib/recurrence'
import type { Meeting } from '../../types'

interface MeetingsDrawerProps {
  open: boolean
  onClose: () => void
}

// Pill for assigning a meeting to a tier
interface TierPillProps {
  label: string
  active: boolean
  onClick: () => void
}
function TierPill({ label, active, onClick }: TierPillProps) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded-full text-[10px] font-medium border transition-all
        ${active
          ? 'bg-charcoal text-canvas border-charcoal'
          : 'border-border text-stone/60 hover:border-stone/40 hover:text-charcoal'}`}
    >
      {label}
    </button>
  )
}

// Expandable meeting row
interface MeetingRowProps {
  meeting: Meeting
  isInRecurring: boolean
  deepMeetingId: string | undefined
  shortMeetingIds: string[]
  maintenanceMeetingIds: string[]
  setDeepMeeting: (id: string | undefined) => void
  addShortMeeting: (id: string) => void
  removeShortMeeting: (id: string) => void
  addMaintenanceMeeting: (id: string) => void
  removeMaintenanceMeeting: (id: string) => void
  onEdit: () => void
  onDelete: () => void
}

function MeetingRow({
  meeting,
  deepMeetingId,
  shortMeetingIds,
  maintenanceMeetingIds,
  setDeepMeeting,
  addShortMeeting,
  removeShortMeeting,
  addMaintenanceMeeting,
  removeMaintenanceMeeting,
  onEdit,
  onDelete,
}: MeetingRowProps) {
  const [expanded, setExpanded] = useState(false)
  const [actions, setActions] = useState(meeting.actions ?? '')
  const [takeaways, setTakeaways] = useState(meeting.takeaways ?? '')
  const updateMeeting = useStore(s => s.updateMeeting)
  const updateRecurringMeeting = useStore(s => s.updateRecurringMeeting)
  const startMeetingSession = useStore(s => s.startMeetingSession)

  const isDeep = deepMeetingId === meeting.id
  const isShort = shortMeetingIds.includes(meeting.id)
  const isMaint = maintenanceMeetingIds.includes(meeting.id)

  function saveField(field: 'actions' | 'takeaways', value: string) {
    const updateFn = meeting.isRecurring ? updateRecurringMeeting : updateMeeting
    updateFn(meeting.id, { [field]: value.trim() || undefined })
  }

  function handleDeep() {
    if (isDeep) {
      setDeepMeeting(undefined)
    } else {
      setDeepMeeting(meeting.id)
    }
  }
  function handleShort() {
    if (isShort) removeShortMeeting(meeting.id)
    else addShortMeeting(meeting.id)
  }
  function handleMaint() {
    if (isMaint) removeMaintenanceMeeting(meeting.id)
    else addMaintenanceMeeting(meeting.id)
  }

  return (
    <div className="border-b border-border/30 last:border-0">
      {/* Row header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 py-3 px-1 text-left
          hover:bg-canvas/60 -mx-1 rounded-[4px] transition-colors group"
      >
        <span className="text-[11px] font-medium text-stone/60 flex-shrink-0 w-[38px] text-right">
          {meeting.time}
        </span>
        <span className="text-[13px] text-charcoal flex-1 min-w-0 truncate">
          {meeting.title}
        </span>
        <span className="text-[10px] text-stone/40 flex-shrink-0">{meeting.durationMinutes}m</span>
        <ChevronDown
          size={12}
          className={`text-stone/30 flex-shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="pb-4 px-1 space-y-3 animate-slide-up">
          {/* Assign to tier */}
          <div>
            <div className="text-[10px] uppercase tracking-[0.08em] text-stone/40 font-medium mb-2">
              Assign to plan
            </div>
            <div className="flex gap-2">
              <TierPill label="Deep block" active={isDeep} onClick={handleDeep} />
              <TierPill label="Short three" active={isShort} onClick={handleShort} />
              <TierPill label="Maintenance" active={isMaint} onClick={handleMaint} />
            </div>
          </div>

          {/* Agenda items */}
          {(meeting.agendaItems?.length ?? 0) > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-[0.08em] text-stone/40 font-medium mb-2">
                Agenda
              </div>
              <div className="space-y-1">
                {meeting.agendaItems!.map(item => (
                  <div key={item.id} className="flex items-center gap-2 text-[12px] text-charcoal/80">
                    <span className="w-1 h-1 rounded-full bg-stone/30 flex-shrink-0" />
                    <span className="flex-1">{item.title}</span>
                    {item.durationMinutes != null && (
                      <span className="text-[10px] text-stone/30">{item.durationMinutes}m</span>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => startMeetingSession(meeting.id)}
                className="mt-2 text-[11px] text-stone/50 hover:text-charcoal transition-colors"
              >
                ▶ Start meeting
              </button>
            </div>
          )}

          {/* Actions & Takeaways */}
          <div>
            <div className="text-[10px] uppercase tracking-[0.08em] text-stone/40 font-medium mb-1">
              Actions
            </div>
            <textarea
              value={actions}
              onChange={e => setActions(e.target.value)}
              onBlur={e => saveField('actions', e.target.value)}
              placeholder="Key actions from the meeting..."
              rows={2}
              className="w-full px-3 py-2 rounded-[6px] border border-border bg-canvas
                text-[12px] text-charcoal placeholder:text-stone/25 resize-none
                outline-none focus:border-stone/40 transition-colors"
            />
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-[0.08em] text-stone/40 font-medium mb-1">
              Takeaways
            </div>
            <textarea
              value={takeaways}
              onChange={e => setTakeaways(e.target.value)}
              onBlur={e => saveField('takeaways', e.target.value)}
              placeholder="Key decisions and notes..."
              rows={2}
              className="w-full px-3 py-2 rounded-[6px] border border-border bg-canvas
                text-[12px] text-charcoal placeholder:text-stone/25 resize-none
                outline-none focus:border-stone/40 transition-colors"
            />
          </div>

          {/* Edit / Delete */}
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={onEdit}
              className="text-[11px] text-stone/50 hover:text-charcoal transition-colors"
            >
              Edit details
            </button>
            <span className="text-stone/20">·</span>
            <button
              onClick={onDelete}
              className="text-[11px] text-red-400 hover:text-red-500 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export function MeetingsDrawer({ open, onClose }: MeetingsDrawerProps) {
  const meetings = useStore(s => s.meetings)
  const recurringMeetings = useStore(s => s.recurringMeetings)
  const setOpenMeetingId = useStore(s => s.setOpenMeetingId)
  const deleteMeeting = useStore(s => s.deleteMeeting)
  const deleteRecurringMeeting = useStore(s => s.deleteRecurringMeeting)
  const [showRecurring, setShowRecurring] = useState(false)

  const {
    deepMeetingId,
    shortMeetingIds,
    maintenanceMeetingIds,
    setDeepMeeting,
    addShortMeeting,
    removeShortMeeting,
    addMaintenanceMeeting,
    removeMaintenanceMeeting,
  } = useTodayPlan()

  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const todayMeetings = meetings.filter(m => !m.date || m.date === todayStr)
  const sortedMeetings = [...todayMeetings].sort((a, b) => a.time.localeCompare(b.time))
  const sortedRecurring = [...recurringMeetings].sort((a, b) => a.time.localeCompare(b.time))

  const handleDelete = useCallback((meeting: Meeting, isRecurring: boolean) => {
    if (isRecurring) deleteRecurringMeeting(meeting.id)
    else deleteMeeting(meeting.id)
  }, [deleteMeeting, deleteRecurringMeeting])

  const rowProps = {
    deepMeetingId,
    shortMeetingIds,
    maintenanceMeetingIds,
    setDeepMeeting,
    addShortMeeting,
    removeShortMeeting,
    addMaintenanceMeeting,
    removeMaintenanceMeeting,
  }

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
          {/* One-off meetings */}
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
                      isInRecurring={false}
                      onEdit={() => setOpenMeetingId(m.id)}
                      onDelete={() => handleDelete(m, false)}
                      {...rowProps}
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
