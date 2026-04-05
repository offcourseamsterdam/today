import { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronDown, ChevronRight, Clock, Repeat, Play, Trash2 } from 'lucide-react'
import { useMeetingForm } from '../../hooks/useMeetingForm'
import { AgendaItemEditor } from './AgendaItemEditor'
import { RecurrenceFrequencyPicker, type RecurrenceFormState } from '../ui/RecurrenceFrequencyPicker'
import { describeRule } from '../../lib/recurrence'
import { useStore } from '../../store'
import type { Meeting } from '../../types'

const DURATION_PRESETS = [15, 30, 45, 60, 90, 120] as const

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

interface MeetingInlineCardProps {
  meeting: Meeting
  isTemplate?: boolean
  defaultExpanded?: boolean
  onBeginMeeting?: () => void
  onDelete?: () => void
  compact?: boolean
}

export function MeetingInlineCard({
  meeting,
  isTemplate = false,
  defaultExpanded = false,
  onBeginMeeting,
  onDelete,
  compact = false,
}: MeetingInlineCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasMountedRef = useRef(false)

  const updateMeeting = useStore(s => s.updateMeeting)
  const updateRecurringMeeting = useStore(s => s.updateRecurringMeeting)

  const { form, actions, buildMeetingData } = useMeetingForm(
    meeting.id,
    false,
    meeting,
  )

  // Persist changes to the store
  const persist = useCallback(() => {
    const data = buildMeetingData()
    if (isTemplate) {
      updateRecurringMeeting(meeting.id, data)
    } else {
      updateMeeting(meeting.id, data)
    }
  }, [buildMeetingData, isTemplate, meeting.id, updateMeeting, updateRecurringMeeting])

  // Auto-save: debounce 2s after form state changes
  useEffect(() => {
    // Skip the initial mount (form is populated from meeting data)
    if (!hasMountedRef.current) {
      hasMountedRef.current = true
      return
    }

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      persist()
    }, 2000)

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [
    form.title, form.date, form.time, form.durationMinutes,
    form.location, form.agendaItems, form.context, form.projectId,
    form.isRecurring, form.ruleState, form.language,
    persist,
  ])

  // Save on collapse
  function handleToggle() {
    if (expanded) {
      // Collapsing — flush any pending save immediately
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
        saveTimerRef.current = null
      }
      persist()
    }
    setExpanded(prev => !prev)
  }

  // Recurrence handler: merge partial state
  function handleRuleChange(patch: Partial<RecurrenceFormState>) {
    actions.setRuleState((prev: RecurrenceFormState) => ({ ...prev, ...patch }))
  }

  const recurrenceLabel = meeting.recurrenceRule
    ? describeRule(meeting.recurrenceRule)
    : null

  // --- Collapsed state ---
  if (!expanded) {
    return (
      <button
        type="button"
        onClick={handleToggle}
        className={`w-full text-left flex items-center gap-2 px-3 rounded-[10px]
          border border-border bg-white hover:bg-[#FAFAF8] transition-colors
          ${compact ? 'py-1.5' : 'py-2.5'}`}
      >
        <ChevronRight size={14} className="text-stone/40 flex-shrink-0" />

        {/* Time badge */}
        <span className="text-[11px] font-medium text-stone bg-[#F5F3F0] px-1.5 py-0.5 rounded flex-shrink-0">
          {form.time}
        </span>

        {/* Title */}
        <span className="text-[13px] text-charcoal truncate flex-1 min-w-0">
          {form.title || 'Untitled meeting'}
        </span>

        {/* Duration */}
        <span className="text-[11px] text-stone/50 flex-shrink-0">
          {formatDuration(form.durationMinutes)}
        </span>

        {/* Recurrence icon */}
        {isTemplate && (
          <Repeat size={12} className="text-stone/40 flex-shrink-0" />
        )}
      </button>
    )
  }

  // --- Expanded state ---
  return (
    <div className="rounded-[10px] border border-border bg-white">
      {/* Collapse header */}
      <button
        type="button"
        onClick={handleToggle}
        className="w-full text-left flex items-center gap-2 px-3 py-2 hover:bg-[#FAFAF8] transition-colors rounded-t-[10px]"
      >
        <ChevronDown size={14} className="text-stone/40 flex-shrink-0" />
        <span className="text-[11px] text-stone/50 uppercase tracking-wider">
          {isTemplate ? 'Recurring meeting' : 'Meeting'}
        </span>
      </button>

      <div className="px-4 pb-4 space-y-4">
        {/* Title — editable inline */}
        <input
          type="text"
          value={form.title}
          onChange={e => actions.setTitle(e.target.value)}
          placeholder="Meeting title..."
          className="w-full bg-transparent font-serif text-[18px] text-charcoal
            placeholder:text-stone/30 outline-none border-b border-transparent
            focus:border-stone/20 transition-colors pb-1"
        />

        {/* Time / Date / Duration row */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Clock size={13} className="text-stone/40" />
            <input
              type="time"
              value={form.time}
              onChange={e => actions.setTime(e.target.value)}
              className="text-[13px] text-charcoal bg-transparent outline-none
                border-b border-border focus:border-stone/40 transition-colors"
            />
          </div>

          {!isTemplate && (
            <input
              type="date"
              value={form.date}
              onChange={e => actions.setDate(e.target.value)}
              className="text-[13px] text-charcoal bg-transparent outline-none
                border-b border-border focus:border-stone/40 transition-colors"
            />
          )}
        </div>

        {/* Duration presets */}
        <div>
          <div className="text-[10px] text-stone/50 uppercase tracking-wider mb-1.5">Duration</div>
          <div className="flex gap-1 flex-wrap">
            {DURATION_PRESETS.map(d => (
              <button
                key={d}
                type="button"
                onClick={() => actions.setDurationMinutes(d)}
                className={`text-[11px] px-2.5 py-1 rounded-full border transition-all
                  ${form.durationMinutes === d
                    ? 'border-charcoal bg-charcoal text-[#FAF9F7]'
                    : 'border-border text-stone hover:border-stone/40'}`}
              >
                {formatDuration(d)}
              </button>
            ))}
          </div>
        </div>

        {/* Template badge + recurrence */}
        {isTemplate && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider text-stone/50 bg-[#F5F3F0] px-2 py-0.5 rounded-full">
                Template
              </span>
              {recurrenceLabel && (
                <span className="text-[11px] text-stone/60">{recurrenceLabel}</span>
              )}
            </div>
            <RecurrenceFrequencyPicker
              value={form.ruleState}
              onChange={handleRuleChange}
            />
          </div>
        )}

        {/* Agenda items */}
        <div>
          <div className="text-[10px] text-stone/50 uppercase tracking-wider mb-2">Agenda</div>
          <AgendaItemEditor
            items={form.agendaItems}
            onChange={actions.setAgendaItems}
          />
        </div>

        {/* Footer */}
        {(onBeginMeeting || onDelete) && (
          <div className="flex items-center justify-between pt-2 border-t border-border">
            {onBeginMeeting ? (
              <button
                type="button"
                onClick={onBeginMeeting}
                className="flex items-center gap-1.5 text-[12px] font-medium text-charcoal
                  bg-[#F5F3F0] hover:bg-[#EDEAE5] px-3 py-1.5 rounded-lg transition-colors"
              >
                <Play size={12} />
                Begin meeting
              </button>
            ) : (
              <div />
            )}

            {onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="flex items-center gap-1 text-[11px] text-stone/40
                  hover:text-red-400 transition-colors"
              >
                <Trash2 size={12} />
                Delete
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
