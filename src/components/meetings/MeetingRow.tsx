import { useState } from 'react'
import { ChevronDown, Play } from 'lucide-react'
import { useStore } from '../../store'
import { MeetingNotesDisplay, OUTCOME_CONFIG } from './MeetingNotesDisplay'
import type { Meeting, MeetingNotes } from '../../types'

function AiNotesSection({ notes }: { notes: MeetingNotes }) {
  const [expanded, setExpanded] = useState(true)
  const outcome = notes.outcome ? OUTCOME_CONFIG[notes.outcome] : null

  return (
    <div className="border-t border-border/30 pt-2">
      <button
        onClick={() => setExpanded(e => !e)}
        className="flex items-center gap-2 text-[10px] uppercase tracking-[0.08em]
          text-stone/40 hover:text-stone/60 transition-colors font-medium w-full text-left"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0" />
        AI Notes
        {outcome && (
          <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium normal-case tracking-normal ${outcome.color}`}>
            {outcome.label}
          </span>
        )}
        <ChevronDown
          size={10}
          className={`transition-transform ml-auto ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {expanded && (
        <div className="mt-2 animate-slide-up">
          <MeetingNotesDisplay notes={notes} />
        </div>
      )}
    </div>
  )
}

export interface MeetingRowProps {
  meeting: Meeting
  onEdit: () => void
  onDelete: () => void
}

export function MeetingRow({ meeting, onEdit, onDelete }: MeetingRowProps) {
  const [expanded, setExpanded] = useState(false)
  const startMeetingSession = useStore(s => s.startMeetingSession)
  const processingMeetingId = useStore(s => s.processingMeetingId)
  const projects = useStore(s => s.projects)
  const linkedProject = meeting.projectId ? projects.find(p => p.id === meeting.projectId) : undefined

  return (
    <div className="border-b border-border/30 last:border-0">
      {/* Row header */}
      <div className="flex items-center gap-0 group -mx-1">
        <button
          onClick={onEdit}
          className="flex-1 flex items-center gap-3 py-3 px-1 text-left
            hover:bg-canvas/60 rounded-l-[4px] transition-colors min-w-0"
        >
          <span className="text-[11px] font-medium text-stone/60 flex-shrink-0 w-[38px] text-right">
            {meeting.time}
          </span>
          <span className="flex-1 min-w-0 truncate">
            <span className="text-[13px] text-charcoal">{meeting.title}</span>
            {linkedProject && (
              <span className="ml-2 text-[10px] text-stone/40 truncate">{linkedProject.title}</span>
            )}
          </span>
          <span className="text-[10px] text-stone/40 flex-shrink-0">{meeting.durationMinutes}m</span>
          <ChevronDown
            size={12}
            className={`text-stone/30 flex-shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
            onClick={(e) => { e.stopPropagation(); setExpanded(v => !v) }}
          />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); startMeetingSession(meeting.id) }}
          className="p-2 rounded-r-[4px] opacity-0 group-hover:opacity-100
            text-stone/30 hover:text-charcoal transition-all flex-shrink-0"
          title="Start meeting"
        >
          <Play size={11} />
        </button>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="pb-4 px-1 space-y-3 animate-slide-up">
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
            </div>
          )}

          {/* AI Notes */}
          {meeting.meetingNotes && (
            <AiNotesSection notes={meeting.meetingNotes} />
          )}
          {processingMeetingId === meeting.id && (
            <div className="flex items-center gap-2 py-3 text-[11px] text-stone/50">
              <span className="w-3 h-3 border-2 border-stone/30 border-t-stone/60 rounded-full animate-spin" />
              Processing recording...
            </div>
          )}

          {/* Actions row */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-3">
              <button
                onClick={onDelete}
                className="text-[11px] text-red-400/70 hover:text-red-500 transition-colors"
              >
                Delete
              </button>
            </div>
            <button
              type="button"
              onClick={() => startMeetingSession(meeting.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px]
                bg-charcoal text-canvas text-[11px] font-medium
                hover:bg-charcoal/80 transition-colors"
            >
              <Play size={10} />
              Start
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
