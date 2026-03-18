import { useState, useEffect } from 'react'
import { X, Trash2, RotateCcw } from 'lucide-react'
import { RecurrenceFrequencyPicker, EMPTY_RULE_STATE, type RecurrenceFormState } from '../ui/RecurrenceFrequencyPicker'
import { buildRule } from '../../lib/recurrence'
import { useMeetingModal } from '../../hooks/useMeetingModal'
import type { Meeting } from '../../types'

const DURATION_PRESETS = [15, 30, 45, 60, 90]

export function MeetingModal() {
  const {
    openMeetingId, setOpenMeetingId,
    isOpen, isNew, existingMeeting, isInRecurring,
    addMeeting, updateMeeting, deleteMeeting,
    addRecurringMeeting, updateRecurringMeeting, deleteRecurringMeeting,
    addMeetingToPlan,
  } = useMeetingModal()

  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('09:00')
  const [durationMinutes, setDurationMinutes] = useState(30)
  const [location, setLocation] = useState('')
  const [agenda, setAgenda] = useState('')
  const [actions, setActions] = useState('')
  const [takeaways, setTakeaways] = useState('')
  const [isRecurring, setIsRecurring] = useState(false)
  const [ruleState, setRuleState] = useState<RecurrenceFormState>(EMPTY_RULE_STATE)

  // Reset form when modal opens
  useEffect(() => {
    if (isNew) {
      setTitle('')
      setDate('')
      setTime('09:00')
      setDurationMinutes(30)
      setLocation('')
      setAgenda('')
      setActions('')
      setTakeaways('')
      setIsRecurring(false)
      setRuleState(EMPTY_RULE_STATE)
    } else if (existingMeeting) {
      setTitle(existingMeeting.title)
      setDate(existingMeeting.date ?? '')
      setTime(existingMeeting.time)
      setDurationMinutes(existingMeeting.durationMinutes)
      setLocation(existingMeeting.location ?? '')
      setAgenda(existingMeeting.agenda ?? '')
      setActions(existingMeeting.actions ?? '')
      setTakeaways(existingMeeting.takeaways ?? '')
      setIsRecurring(existingMeeting.isRecurring)
      if (existingMeeting.recurrenceRule) {
        const r = existingMeeting.recurrenceRule
        setRuleState({
          freq: r.frequency,
          weeklyDay: r.customDays?.[0] ?? 1,
          monthlyDate: r.monthlyDate ?? 1,
          monthlyWeek: r.monthlyWeekday?.week ?? 1,
          monthlyDay: r.monthlyWeekday?.day ?? 1,
          customDays: r.customDays ?? [],
          annualDates: r.annualDates ?? [],
        })
      } else {
        setRuleState(EMPTY_RULE_STATE)
      }
    }
  }, [openMeetingId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen) return null

  function handleSave() {
    if (!title.trim()) return

    const meetingData: Omit<Meeting, 'id' | 'createdAt'> = {
      title: title.trim(),
      date: date || undefined,
      time,
      durationMinutes,
      location: location.trim() || undefined,
      agenda: agenda.trim() || undefined,
      actions: actions.trim() || undefined,
      takeaways: takeaways.trim() || undefined,
      isRecurring,
      recurrenceRule: isRecurring ? buildRule(ruleState) : undefined,
    }

    if (isNew) {
      let id: string
      if (isRecurring) {
        id = addRecurringMeeting(meetingData)
      } else {
        id = addMeeting(meetingData)
      }
      addMeetingToPlan(id)
    } else if (existingMeeting) {
      if (isInRecurring) {
        updateRecurringMeeting(existingMeeting.id, meetingData)
      } else {
        updateMeeting(existingMeeting.id, meetingData)
      }
    }

    setOpenMeetingId(null)
  }

  function handleDelete() {
    if (!existingMeeting) return
    if (isInRecurring) {
      deleteRecurringMeeting(existingMeeting.id)
    } else {
      deleteMeeting(existingMeeting.id)
    }
    setOpenMeetingId(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-charcoal/30 backdrop-blur-sm"
        onClick={() => setOpenMeetingId(null)}
      />

      {/* Modal */}
      <div className="relative bg-card rounded-[12px] shadow-lg border border-border/50 w-full max-w-[480px] max-h-[85vh] overflow-y-auto animate-scale-in mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="text-[15px] font-medium text-charcoal">
            {isNew ? 'New meeting' : 'Edit meeting'}
          </h2>
          <button
            onClick={() => setOpenMeetingId(null)}
            className="text-stone/40 hover:text-stone transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 pb-5 space-y-4">
          {/* Title */}
          <div>
            <label className="text-[10px] uppercase tracking-[0.08em] text-stone/50 font-medium mb-1 block">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Meeting title..."
              autoFocus
              className="w-full px-3 py-2 rounded-[6px] border border-border bg-canvas
                text-[13px] text-charcoal placeholder:text-stone/30
                outline-none focus:border-stone/40 transition-colors"
            />
          </div>

          {/* Date + Time row */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-[10px] uppercase tracking-[0.08em] text-stone/50 font-medium mb-1 block">
                Date <span className="normal-case text-stone/30">(optional)</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-[6px] border border-border bg-canvas
                  text-[13px] text-charcoal
                  outline-none focus:border-stone/40 transition-colors"
              />
            </div>
            <div className="flex-1">
              <label className="text-[10px] uppercase tracking-[0.08em] text-stone/50 font-medium mb-1 block">
                Time
              </label>
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                className="w-full px-3 py-2 rounded-[6px] border border-border bg-canvas
                  text-[13px] text-charcoal
                  outline-none focus:border-stone/40 transition-colors"
              />
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="text-[10px] uppercase tracking-[0.08em] text-stone/50 font-medium mb-1 block">
              Duration
            </label>
            <div className="flex gap-1">
              {DURATION_PRESETS.map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDurationMinutes(d)}
                  className={`text-[10px] px-2 py-2 rounded-[4px] border transition-all flex-1
                    ${durationMinutes === d
                      ? 'border-charcoal bg-charcoal text-canvas'
                      : 'border-border text-stone hover:border-stone/40'}`}
                >
                  {d}m
                </button>
              ))}
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="text-[10px] uppercase tracking-[0.08em] text-stone/50 font-medium mb-1 block">
              Location / link
            </label>
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="Office, Zoom link, etc."
              className="w-full px-3 py-2 rounded-[6px] border border-border bg-canvas
                text-[13px] text-charcoal placeholder:text-stone/30
                outline-none focus:border-stone/40 transition-colors"
            />
          </div>

          {/* Agenda */}
          <div>
            <label className="text-[10px] uppercase tracking-[0.08em] text-stone/50 font-medium mb-1 block">
              Agenda
            </label>
            <textarea
              value={agenda}
              onChange={e => setAgenda(e.target.value)}
              placeholder="What needs to be discussed..."
              rows={3}
              className="w-full px-3 py-2 rounded-[6px] border border-border bg-canvas
                text-[13px] text-charcoal placeholder:text-stone/30 resize-none
                outline-none focus:border-stone/40 transition-colors"
            />
          </div>

          {/* Recurring toggle */}
          <div className="border-t border-border/50 pt-4">
            <button
              type="button"
              onClick={() => setIsRecurring(!isRecurring)}
              className="flex items-center gap-2 text-[12px] text-stone hover:text-charcoal transition-colors"
            >
              <RotateCcw size={12} className={isRecurring ? 'text-cat-marketing' : 'text-stone/30'} />
              <span>{isRecurring ? 'Recurring meeting' : 'Make recurring'}</span>
            </button>

            {isRecurring && (
              <div className="mt-3 space-y-3 animate-slide-up">
                <RecurrenceFrequencyPicker
                  value={ruleState}
                  onChange={patch => setRuleState(prev => ({ ...prev, ...patch }))}
                />
              </div>
            )}
          </div>

          {/* Post-meeting section */}
          {!isNew && (
            <div className="border-t border-border/50 pt-4 space-y-3">
              <div className="text-[10px] uppercase tracking-[0.08em] text-stone/40 font-medium">
                Post-meeting notes
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-[0.08em] text-stone/50 font-medium mb-1 block">
                  Key actions
                </label>
                <textarea
                  value={actions}
                  onChange={e => setActions(e.target.value)}
                  placeholder="Action items from the meeting..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-[6px] border border-border bg-canvas
                    text-[13px] text-charcoal placeholder:text-stone/30 resize-none
                    outline-none focus:border-stone/40 transition-colors"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-[0.08em] text-stone/50 font-medium mb-1 block">
                  Takeaways
                </label>
                <textarea
                  value={takeaways}
                  onChange={e => setTakeaways(e.target.value)}
                  placeholder="Key takeaways and decisions..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-[6px] border border-border bg-canvas
                    text-[13px] text-charcoal placeholder:text-stone/30 resize-none
                    outline-none focus:border-stone/40 transition-colors"
                />
              </div>
            </div>
          )}

          {/* Footer actions */}
          <div className="flex items-center justify-between pt-2">
            {!isNew && existingMeeting ? (
              <button
                onClick={handleDelete}
                className="flex items-center gap-1.5 text-[12px] text-red-400 hover:text-red-500 transition-colors"
              >
                <Trash2 size={12} />
                Delete
              </button>
            ) : (
              <div />
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setOpenMeetingId(null)}
                className="px-4 py-2 text-[12px] text-stone hover:text-charcoal transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!title.trim()}
                className="px-4 py-2 text-[12px] font-medium text-canvas bg-charcoal
                  rounded-[6px] hover:bg-charcoal/90 transition-all
                  disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {isNew ? 'Add meeting' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
