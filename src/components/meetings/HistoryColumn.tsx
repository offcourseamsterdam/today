// src/components/meetings/HistoryColumn.tsx
import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import { useStore } from '../../store'
import { OUTCOME_CONFIG } from './MeetingNotesDisplay'
import type { Meeting } from '../../types'

function searchMeeting(m: Meeting, q: string): boolean {
  const lower = q.toLowerCase()
  if (m.title.toLowerCase().includes(lower)) return true
  const notes = m.meetingNotes
  if (!notes) return false
  if (notes.summary?.toLowerCase().includes(lower)) return true
  if (notes.decisions?.some(d => d.toLowerCase().includes(lower))) return true
  if (notes.actionItems?.some(a => a.description.toLowerCase().includes(lower))) return true
  if (notes.agendaItemNotes?.some(n =>
    n.agendaItemTitle.toLowerCase().includes(lower) ||
    n.summary?.toLowerCase().includes(lower) ||
    n.decisions?.some(d => d.toLowerCase().includes(lower)) ||
    n.actionItems?.some(a => a.description.toLowerCase().includes(lower))
  )) return true
  return false
}

interface HistoryRowProps {
  meeting: Meeting
  defaultExpanded?: boolean
}

function HistoryRow({ meeting, defaultExpanded = false }: HistoryRowProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const clearJustEndedMeeting = useStore(s => s.clearJustEndedMeeting)
  const setOpenProjectId = useStore(s => s.setOpenProjectId)
  const projects = useStore(s => s.projects)
  const notes = meeting.meetingNotes
  const outcome = notes?.outcome ? OUTCOME_CONFIG[notes.outcome] : null
  const project = meeting.projectId ? projects.find(p => p.id === meeting.projectId) : null
  const dateLabel = meeting.date ?? notes?.generatedAt?.slice(0, 10) ?? ''

  function handleToggle() {
    if (!expanded && defaultExpanded) clearJustEndedMeeting()
    setExpanded(e => !e)
  }

  const agendaItemNotes = notes?.agendaItemNotes ?? []
  const topDecisions = notes?.decisions ?? []
  const topActions = notes?.actionItems ?? []

  return (
    <div className="border-b border-border/40 last:border-0">
      <button
        onClick={handleToggle}
        className="w-full flex items-center gap-3 py-3 text-left hover:bg-stone/5 rounded transition-colors group"
      >
        <span className={`w-[6px] h-[6px] rounded-full flex-shrink-0 transition-colors ${
          notes ? 'bg-stone/30' : 'bg-transparent border border-stone/20'
        }`} />
        <span className="text-[11px] text-stone/35 flex-shrink-0 w-[80px]">{dateLabel}</span>
        <span className="text-[13px] text-charcoal flex-1 min-w-0 truncate">{meeting.title}</span>
        {project && (
          <button
            onClick={e => { e.stopPropagation(); setOpenProjectId(project.id) }}
            className="text-[10px] text-stone/40 hover:text-charcoal px-1.5 py-0.5 rounded
              border border-border/60 hover:border-stone/30 transition-colors flex-shrink-0"
          >
            {project.title}
          </button>
        )}
        {outcome && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${outcome.color}`}>
            {outcome.label}
          </span>
        )}
        {!notes && (
          <span className="text-[10px] text-stone/25 italic flex-shrink-0">no recording</span>
        )}
      </button>

      {expanded && notes && (
        <div className="pb-4 pl-[22px] pr-2 space-y-3 animate-slide-up">
          {notes.summary && (
            <p className="text-[13px] text-charcoal/70 leading-relaxed">{notes.summary}</p>
          )}

          {agendaItemNotes.length > 0 && (
            <div className="space-y-3">
              {agendaItemNotes.map(itemNote => (
                <div key={itemNote.agendaItemId}>
                  <div className="text-[10px] font-medium text-stone/50 uppercase tracking-[0.06em] mb-1">
                    {itemNote.agendaItemTitle}
                  </div>
                  {itemNote.summary && (
                    <p className="text-[12px] text-charcoal/70 leading-relaxed mb-1">{itemNote.summary}</p>
                  )}
                  {(itemNote.decisions ?? []).map((d, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-[12px] text-charcoal/70">
                      <span className="text-green-600 mt-0.5 flex-shrink-0">✔</span>
                      <span>{d}</span>
                    </div>
                  ))}
                  {(itemNote.actionItems ?? []).map((a, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-[12px] text-charcoal/70">
                      <span className="text-amber-500 mt-0.5 flex-shrink-0">→</span>
                      <span>{a.description}</span>
                      {a.assignee && (
                        <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-500 font-medium flex-shrink-0">
                          {a.assignee}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {agendaItemNotes.length === 0 && (
            <>
              {topDecisions.map((d, i) => (
                <div key={i} className="flex items-start gap-1.5 text-[12px] text-charcoal/70">
                  <span className="text-green-600 mt-0.5 flex-shrink-0">✔</span>
                  <span>{d}</span>
                </div>
              ))}
              {topActions.map((a, i) => (
                <div key={i} className="flex items-start gap-1.5 text-[12px] text-charcoal/70">
                  <span className="text-amber-500 mt-0.5 flex-shrink-0">→</span>
                  <span>{a.description}</span>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}

export function HistoryColumn() {
  const meetings = useStore(s => s.meetings)
  const justEndedMeetingId = useStore(s => s.justEndedMeetingId)
  const [query, setQuery] = useState('')

  const today = new Date().toISOString().slice(0, 10)

  const pastMeetings = useMemo(() =>
    meetings
      .filter(m => m.date && m.date <= today)
      .sort((a, b) =>
        (b.date ?? '').localeCompare(a.date ?? '') ||
        (b.time ?? '').localeCompare(a.time ?? '')
      ),
    [meetings, today]
  )

  const filtered = useMemo(() =>
    query.trim()
      ? pastMeetings.filter(m => searchMeeting(m, query))
      : pastMeetings,
    [pastMeetings, query]
  )

  return (
    <div className="flex flex-col h-full">
      {/* Search bar */}
      <div className="px-6 py-4 border-b border-border/60">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone/30" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search notes, decisions, actions..."
            className="w-full pl-8 pr-3 py-2 rounded-[6px] border border-border bg-canvas
              text-[12px] text-charcoal placeholder:text-stone/30
              outline-none focus:border-stone/40 transition-colors"
          />
        </div>
      </div>

      {/* History list */}
      <div className="flex-1 overflow-y-auto px-6 py-3">
        {filtered.length === 0 ? (
          <p className="text-[12px] text-stone/30 italic py-8 text-center">
            {query ? 'No matches found' : 'No past meetings yet'}
          </p>
        ) : (
          filtered.map(m => (
            <HistoryRow
              key={m.id}
              meeting={m}
              defaultExpanded={m.id === justEndedMeetingId}
            />
          ))
        )}
      </div>
    </div>
  )
}
