import { useState } from 'react'
import { ChevronDown, Calendar } from 'lucide-react'
import { useStore } from '../../store'
import { MeetingNotesDisplay, OUTCOME_CONFIG } from '../meetings/MeetingNotesDisplay'
import type { Meeting } from '../../types'

function MeetingNoteRow({ meeting }: { meeting: Meeting }) {
  const [open, setOpen] = useState(false)
  const notes = meeting.meetingNotes!
  const outcome = notes.outcome ? OUTCOME_CONFIG[notes.outcome] : null
  const dateLabel = meeting.date ?? notes.generatedAt.slice(0, 10)

  return (
    <div className="border-b border-border/40 last:border-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 py-2.5 text-left group"
      >
        <span className="text-[11px] text-stone/40 flex-shrink-0 w-[72px]">{dateLabel}</span>
        <span className="text-[13px] text-charcoal flex-1 min-w-0 truncate">{meeting.title}</span>
        {outcome && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${outcome.color}`}>
            {outcome.label}
          </span>
        )}
        <ChevronDown
          size={11}
          className={`text-stone/30 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="pb-3 animate-slide-up">
          <MeetingNotesDisplay notes={notes} showSummaryLabel={false} />
        </div>
      )}
    </div>
  )
}

interface ProjectModalMeetingsProps {
  projectId: string
}

export function ProjectModalMeetings({ projectId }: ProjectModalMeetingsProps) {
  const [expanded, setExpanded] = useState(true)
  const meetings = useStore(s => s.meetings)
  const recurringMeetings = useStore(s => s.recurringMeetings)

  const linkedMeetings = [...meetings, ...recurringMeetings]
    .filter(m => m.projectId === projectId && m.meetingNotes)
    .sort((a, b) => {
      const dateA = a.meetingNotes!.generatedAt
      const dateB = b.meetingNotes!.generatedAt
      return dateB.localeCompare(dateA) // newest first
    })

  if (linkedMeetings.length === 0) return null

  return (
    <div className="border-t border-border pt-4 mt-0">
      <button
        onClick={() => setExpanded(e => !e)}
        className="flex items-center gap-2 w-full mb-3 group"
      >
        <Calendar size={12} className="text-stone/40" />
        <span className="text-[11px] uppercase tracking-[0.08em] text-stone font-medium">
          Meeting Notes
        </span>
        <span className="text-[10px] text-stone/40 bg-stone/10 px-1.5 py-0.5 rounded-full">
          {linkedMeetings.length}
        </span>
        <ChevronDown
          size={11}
          className={`text-stone/30 ml-auto transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {expanded && (
        <div className="animate-slide-up">
          {linkedMeetings.map(m => (
            <MeetingNoteRow key={m.id} meeting={m} />
          ))}
        </div>
      )}
    </div>
  )
}
