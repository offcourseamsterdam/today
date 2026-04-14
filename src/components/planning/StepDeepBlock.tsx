import { useState } from 'react'
import { format } from 'date-fns'
import { Calendar, Clock, X } from 'lucide-react'
import { useStore } from '../../store'
import { CATEGORY_CONFIG } from '../../types'
import type { AssignedCalendarEvent } from '../../types'
import { CategoryBadge } from '../ui/CategoryBadge'
import { formatDuration } from '../../lib/formatting'

const DEEP_BLOCK_MINUTES = 180 // 3 × 60 min sessions

interface StepDeepBlockProps {
  projectId: string
  intention: string
  onProjectChange: (id: string) => void
  onIntentionChange: (i: string) => void
  calendarDeepEvent: AssignedCalendarEvent | null
  deepMeetingId?: string
  onSetDeepMeeting: (id: string | undefined) => void
  onAddOverflowToShort?: (meetingId: string) => void
}

function formatTimeRange(start: string, end: string): string {
  const fmt = (iso: string) => format(new Date(iso), 'HH:mm')
  return `${fmt(start)} – ${fmt(end)}`
}

export function StepDeepBlock({
  projectId,
  intention,
  onProjectChange,
  onIntentionChange,
  calendarDeepEvent,
  deepMeetingId,
  onSetDeepMeeting,
  onAddOverflowToShort,
}: StepDeepBlockProps) {
  const projects = useStore(s => s.projects)
  const inProgressProjects = projects.filter(p => p.status === 'in_progress')
  const allMeetings = useStore(s => s.meetings)
  const recurringMeetings = useStore(s => s.recurringMeetings)
  const [showMeetingPicker, setShowMeetingPicker] = useState(false)
  const [overflowDismissed, setOverflowDismissed] = useState(false)

  const allMeetingsList = [...allMeetings, ...recurringMeetings]
    .sort((a, b) => a.time.localeCompare(b.time))

  const selectedMeeting = deepMeetingId
    ? allMeetingsList.find(m => m.id === deepMeetingId)
    : null

  const availableMeetings = allMeetingsList.filter(m => m.id !== deepMeetingId)

  const overflowMinutes = selectedMeeting && selectedMeeting.durationMinutes > DEEP_BLOCK_MINUTES
    ? selectedMeeting.durationMinutes - DEEP_BLOCK_MINUTES
    : 0

  return (
    <div className="space-y-4">
      {calendarDeepEvent ? (
        <div>
          <div className="text-[11px] uppercase tracking-wider text-[#7A746A]/60 mb-2">
            Your deep focus block
          </div>
          <div className="rounded-[8px] border border-[#E8E4DD] bg-[#FAF9F7] p-3 flex items-start gap-3">
            <Calendar size={15} className="text-[#7A746A] flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium text-[#2A2724] truncate">
                {calendarDeepEvent.event.title}
              </div>
              <div className="text-[11px] text-[#7A746A] mt-0.5">
                {formatTimeRange(calendarDeepEvent.event.start, calendarDeepEvent.event.end)}
                {' · '}
                {calendarDeepEvent.event.durationMinutes} min
              </div>
            </div>
          </div>
          <div className="text-[12px] text-[#7A746A]/60 mt-2">
            This meeting takes your deep focus block.
          </div>
        </div>
      ) : selectedMeeting ? (
        /* Selected meeting replaces project */
        <div>
          <div className="text-[11px] uppercase tracking-wider text-[#7A746A]/60 mb-2">
            Your deep focus block
          </div>
          <div className="rounded-[8px] border border-[#2A2724]/20 bg-[#FAF9F7] p-3 flex items-center gap-3 group">
            <Clock size={14} className="text-[#7A746A] flex-shrink-0" />
            <span className="text-[11px] text-[#7A746A]/60 font-mono flex-shrink-0">
              {selectedMeeting.time}
            </span>
            <span className="text-[13px] font-medium text-[#2A2724] flex-1 truncate">
              {selectedMeeting.title}
            </span>
            <span className="text-[10px] text-[#7A746A]/50 flex-shrink-0">
              {selectedMeeting.durationMinutes}m
            </span>
            <button
              onClick={() => { onSetDeepMeeting(undefined); setOverflowDismissed(false) }}
              className="text-[#7A746A]/30 hover:text-[#7A746A] transition-colors ml-1"
            >
              <X size={13} />
            </button>
          </div>

          {/* Overflow banner */}
          {overflowMinutes > 0 && !overflowDismissed && (
            <div className="mt-2 rounded-[8px] border border-amber-200 bg-amber-50 px-3 py-2.5 flex items-start gap-2.5">
              <span className="text-amber-500 text-[13px] leading-none flex-shrink-0 mt-0.5">⚠</span>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] text-[#2A2724]/80 leading-snug">
                  This meeting is <strong>{formatDuration(selectedMeeting!.durationMinutes)}</strong> — {formatDuration(overflowMinutes)} longer than your deep block (3h).
                  Add the overflow to Short tasks?
                </p>
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => { onAddOverflowToShort?.(selectedMeeting!.id); setOverflowDismissed(true) }}
                    className="text-[11px] font-medium px-2.5 py-1 rounded-[4px] bg-[#2A2724] text-white hover:bg-[#2A2724]/80 transition-colors"
                  >
                    Yes, extend into Short
                  </button>
                  <button
                    type="button"
                    onClick={() => setOverflowDismissed(true)}
                    className="text-[11px] text-[#7A746A] hover:text-[#2A2724] transition-colors px-1"
                  >
                    No thanks
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="text-[11px] uppercase tracking-wider text-[#7A746A]/60">
            Which project gets your best energy?
          </div>
          {inProgressProjects.length === 0 ? (
            <div className="text-[13px] text-[#7A746A] text-center py-6">
              No projects in progress. Add one to your kanban first.
            </div>
          ) : (
            <div className="space-y-2">
              {inProgressProjects.map(project => {
                const catConfig = CATEGORY_CONFIG[project.category]
                const isSelected = project.id === projectId
                return (
                  <button
                    key={project.id}
                    onClick={() => onProjectChange(project.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-[8px] border text-left transition-all ${
                      isSelected
                        ? 'border-[#2A2724] bg-white shadow-sm'
                        : 'border-[#E8E4DD] bg-white hover:border-[#2A2724]/30'
                    }`}
                  >
                    {project.coverImageUrl && (
                      <div className="w-9 h-9 rounded-[4px] overflow-hidden flex-shrink-0">
                        <img
                          src={project.coverImageUrl}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    {!project.coverImageUrl && (
                      <div
                        className="w-9 h-9 rounded-[4px] flex-shrink-0"
                        style={{ background: catConfig.bg }}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-[#2A2724] truncate">
                        {project.title}
                      </div>
                      <div className="mt-0.5">
                        <CategoryBadge category={project.category} />
                      </div>
                    </div>
                    {isSelected && (
                      <div className="w-2 h-2 rounded-full bg-[#2A2724] flex-shrink-0" />
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {/* Meeting picker — alternative to project */}
          {allMeetingsList.length > 0 && (
            <div className="pt-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex-1 h-px bg-[#E8E4DD]" />
                <span className="text-[10px] text-[#7A746A]/40 uppercase tracking-wider">or</span>
                <div className="flex-1 h-px bg-[#E8E4DD]" />
              </div>
              <button
                onClick={() => setShowMeetingPicker(!showMeetingPicker)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-[6px]
                  border border-dashed border-[#E8E4DD] text-[12px] text-[#7A746A]/60
                  hover:border-[#7A746A]/30 hover:text-[#7A746A] transition-all"
              >
                <span>Use a meeting as deep block</span>
                <span className="text-[10px]">{showMeetingPicker ? '▲' : '▼'}</span>
              </button>
              {showMeetingPicker && (
                <div className="mt-1 rounded-[6px] border border-[#E8E4DD] bg-white overflow-hidden">
                  {availableMeetings.map(m => (
                    <button
                      key={m.id}
                      onClick={() => { onSetDeepMeeting(m.id); setShowMeetingPicker(false) }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#FAF9F7] transition-colors text-left border-b border-[#E8E4DD] last:border-0"
                    >
                      <Clock size={12} className="text-[#7A746A]/50 flex-shrink-0" />
                      <span className="text-[11px] text-[#7A746A]/60 font-mono flex-shrink-0 w-10">
                        {m.time}
                      </span>
                      <span className="text-[13px] text-[#2A2724] flex-1 truncate">{m.title}</span>
                      <span className="text-[10px] text-[#7A746A]/50 flex-shrink-0">
                        {m.durationMinutes}m
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Intention input — always shown */}
      <div>
        <label className="text-[11px] uppercase tracking-wider text-[#7A746A]/60 block mb-1.5">
          What do you want to accomplish tomorrow?
        </label>
        <input
          type="text"
          value={intention}
          onChange={e => onIntentionChange(e.target.value)}
          placeholder="e.g. Finish the landing page copy"
          className="w-full px-3 py-2.5 rounded-[8px] border border-[#E8E4DD] bg-white
            text-[13px] text-[#2A2724] placeholder:text-[#7A746A]/40
            outline-none focus:border-[#2A2724]/30 transition-colors"
        />
      </div>
    </div>
  )
}
