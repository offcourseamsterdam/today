import { format, parseISO, isToday, isFuture, isPast } from 'date-fns'
import { nl } from 'date-fns/locale'
import { Calendar, Clock, MapPin, Users, Play } from 'lucide-react'
import { useStore } from '../../store'
import { MeetingNotesDisplay, OUTCOME_CONFIG } from './MeetingNotesDisplay'
import { MeetingInlineCard } from './MeetingInlineCard'
import { formatDuration } from '../../lib/formatting'
import type { Meeting } from '../../types'

interface MeetingDetailPanelProps {
  meeting: Meeting | null
  onBeginMeeting?: () => void
  onDelete?: () => void
}

export function MeetingDetailPanel({ meeting, onBeginMeeting, onDelete }: MeetingDetailPanelProps) {
  const setOpenProjectId = useStore(s => s.setOpenProjectId)
  const projects = useStore(s => s.projects)

  // ── Empty state ──────────────────────────────────────────────────────────────
  if (!meeting) {
    return (
      <div className="flex flex-col h-full items-center justify-center bg-white">
        <p className="text-[13px] text-stone/30 italic">
          Selecteer een meeting om details te bekijken
        </p>
      </div>
    )
  }

  const hasMeetingNotes = !!meeting.meetingNotes
  const meetingDate = meeting.date ? parseISO(meeting.date) : null
  // Treat undated meetings (no notes yet) as startable — same as upcoming
  const isUpcomingOrToday = !meetingDate || isToday(meetingDate) || isFuture(meetingDate)
  const linkedProject = meeting.projectId
    ? projects.find(p => p.id === meeting.projectId)
    : null

  // ── Upcoming / today: canvas header with Start button + white body ──────────
  if (!hasMeetingNotes && isUpcomingOrToday) {
    return (
      <div className="flex flex-col h-full bg-white overflow-y-auto">
        {/* Canvas header */}
        <div className="bg-canvas px-6 py-5 border-b border-border/60 flex-shrink-0">
          <div className="flex items-start justify-between gap-4">
            <h2 className="font-serif text-[20px] text-charcoal leading-snug">
              {meeting.title || 'Naamloos gesprek'}
            </h2>
            {onBeginMeeting && (
              <button
                onClick={onBeginMeeting}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-charcoal text-white text-[13px] font-medium hover:bg-charcoal/85 transition-colors shrink-0"
              >
                <Play size={13} fill="currentColor" />
                Start
              </button>
            )}
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[12px] text-stone">
            {meetingDate && (
              <span className="flex items-center gap-1.5">
                <Calendar size={12} className="text-stone/40" />
                {format(meetingDate, 'EEEE d MMMM', { locale: nl })}
              </span>
            )}
            {meeting.time && (
              <span className="flex items-center gap-1.5">
                <Clock size={12} className="text-stone/40" />
                {meeting.time} &middot; {formatDuration(meeting.durationMinutes)}
              </span>
            )}
            {meeting.location && (
              <span className="flex items-center gap-1.5">
                <MapPin size={12} className="text-stone/40" />
                {meeting.location}
              </span>
            )}
          </div>

          {/* Context */}
          {meeting.context && (
            <div className="flex items-start gap-1.5 mt-2 text-[12px] text-stone/70">
              <Users size={12} className="text-stone/40 mt-0.5 flex-shrink-0" />
              <span className="leading-relaxed">{meeting.context}</span>
            </div>
          )}

          {/* Project link */}
          {linkedProject && (
            <div className="mt-3">
              <button
                onClick={() => setOpenProjectId(linkedProject.id)}
                className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-stone/8 text-stone hover:bg-stone/12 transition-colors"
              >
                {linkedProject.title}
              </button>
            </div>
          )}
        </div>

        <div className="px-6 py-5">
          <MeetingInlineCard
            meeting={meeting}
            defaultExpanded
            onBeginMeeting={onBeginMeeting}
            onDelete={onDelete}
          />
        </div>
      </div>
    )
  }

  // ── Header (shared by past-with-notes and past-without-notes) ────────────────
  // Canvas background — the "broken white" header strip
  const header = (
    <div className="bg-canvas px-6 py-5 border-b border-border/60 flex-shrink-0">
      <h2 className="font-serif text-[20px] text-charcoal leading-snug">
        {meeting.title || 'Naamloos gesprek'}
      </h2>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[12px] text-stone">
        {meetingDate && (
          <span className="flex items-center gap-1.5">
            <Calendar size={12} className="text-stone/40" />
            {format(meetingDate, 'EEEE d MMMM', { locale: nl })}
          </span>
        )}
        {meeting.time && (
          <span className="flex items-center gap-1.5">
            <Clock size={12} className="text-stone/40" />
            {meeting.time} &middot; {formatDuration(meeting.durationMinutes)}
          </span>
        )}
        {meeting.location && (
          <span className="flex items-center gap-1.5">
            <MapPin size={12} className="text-stone/40" />
            {meeting.location}
          </span>
        )}
      </div>

      {/* Context (attendees / background) */}
      {meeting.context && (
        <div className="flex items-start gap-1.5 mt-2 text-[12px] text-stone/70">
          <Users size={12} className="text-stone/40 mt-0.5 flex-shrink-0" />
          <span className="leading-relaxed">{meeting.context}</span>
        </div>
      )}

      {/* Status badge + outcome badge + project link */}
      <div className="flex flex-wrap items-center gap-2 mt-3">
        {meetingDate && isPast(meetingDate) && !isToday(meetingDate) && (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-stone/8 text-stone/50">
            Afgelopen
          </span>
        )}
        {hasMeetingNotes && meeting.meetingNotes!.outcome && (
          <span
            className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${OUTCOME_CONFIG[meeting.meetingNotes!.outcome].color}`}
          >
            {OUTCOME_CONFIG[meeting.meetingNotes!.outcome].label}
          </span>
        )}
        {linkedProject && (
          <button
            onClick={() => setOpenProjectId(linkedProject.id)}
            className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-stone/8 text-stone hover:bg-stone/12 transition-colors"
          >
            {linkedProject.title}
          </button>
        )}
      </div>
    </div>
  )

  // ── Past meeting WITH notes ──────────────────────────────────────────────────
  if (hasMeetingNotes) {
    return (
      <div className="flex flex-col h-full bg-white">
        {header}
        <div className="px-6 py-5 overflow-y-auto flex-1 min-h-0">
          {/* Agenda items — shown on canvas background card */}
          {meeting.agendaItems && meeting.agendaItems.length > 0 && (
            <div className="mb-5 bg-canvas rounded-[8px] px-4 py-3">
              <div className="text-[10px] uppercase tracking-[0.08em] text-stone/40 font-medium mb-2">
                Agenda
              </div>
              <ul className="space-y-1">
                {meeting.agendaItems.map(item => (
                  <li key={item.id} className="text-[12px] text-charcoal/80 flex items-start gap-2">
                    <span className="text-stone/30 mt-0.5 flex-shrink-0">·</span>
                    <span>{item.title}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <MeetingNotesDisplay notes={meeting.meetingNotes!} />
        </div>
      </div>
    )
  }

  // ── Past meeting WITHOUT notes ───────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-white">
      {header}
      <div className="px-6 py-5 overflow-y-auto flex-1 min-h-0">
        <MeetingInlineCard
          meeting={meeting}
          defaultExpanded
          onDelete={onDelete}
        />
      </div>
    </div>
  )
}
