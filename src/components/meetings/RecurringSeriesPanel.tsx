// src/components/meetings/RecurringSeriesPanel.tsx
import { useState, useMemo } from 'react'
import { format, parseISO, isFuture, isToday } from 'date-fns'
import { nl } from 'date-fns/locale'
import { RotateCcw, ChevronDown, ChevronRight, Calendar } from 'lucide-react'
import { useStore } from '../../store'
import { getNextOccurrences, describeRule } from '../../lib/recurrence'
import { MeetingInlineCard } from './MeetingInlineCard'
import { MeetingNotesDisplay, OUTCOME_CONFIG } from './MeetingNotesDisplay'
import type { Meeting } from '../../types'

interface RecurringSeriesPanelProps {
  template: Meeting
  onBeginMeeting: (occurrenceId: string) => void
  onDelete: () => void
}

function formatShortDate(dateStr: string): string {
  return format(parseISO(dateStr), 'EEEE d MMM', { locale: nl })
}

export function RecurringSeriesPanel({ template, onBeginMeeting, onDelete }: RecurringSeriesPanelProps) {
  const meetings = useStore(s => s.meetings)
  const spawnRecurringOccurrence = useStore(s => s.spawnRecurringOccurrence)
  const startMeetingSession = useStore(s => s.startMeetingSession)
  const setLiveMeetingOpen = useStore(s => s.setLiveMeetingOpen)

  const [schemaOpen, setSchemaOpen] = useState(false)
  const [expandedPastId, setExpandedPastId] = useState<string | null>(null)
  const [expandedOccurrenceId, setExpandedOccurrenceId] = useState<string | null>(null)
  const [showAllPast, setShowAllPast] = useState(false)

  // Past occurrences — concrete meetings spawned from this template
  const pastOccurrences = useMemo(() => {
    return meetings
      .filter(m => m.recurringMeetingId === template.id && m.date && !isFuture(parseISO(m.date)) && !isToday(parseISO(m.date)))
      .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
  }, [meetings, template.id])

  // Future spawned occurrences
  const futureSpawned = useMemo(() => {
    return meetings.filter(
      m => m.recurringMeetingId === template.id && m.date && (isFuture(parseISO(m.date)) || isToday(parseISO(m.date)))
    ).sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))
  }, [meetings, template.id])

  // Upcoming dates from recurrence rule (unspawned)
  const upcomingDates = useMemo(() => {
    if (!template.recurrenceRule) return []
    const next4 = getNextOccurrences(template.recurrenceRule, 4)
    const spawnedDates = new Set(futureSpawned.map(m => m.date))
    return next4
      .map(d => format(d, 'yyyy-MM-dd'))
      .filter(d => !spawnedDates.has(d))
  }, [template.recurrenceRule, futureSpawned])

  function handleSpawnAndExpand(date: string) {
    const id = spawnRecurringOccurrence(template.id, date)
    setExpandedOccurrenceId(id)
  }

  function handleBeginOccurrence(occId: string) {
    startMeetingSession(occId)
    setLiveMeetingOpen(true)
    onBeginMeeting(occId)
  }

  const visiblePast = showAllPast ? pastOccurrences : pastOccurrences.slice(0, 10)

  return (
    <div className="flex flex-col h-full bg-white">
      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="bg-canvas px-6 py-5 border-b border-border/60 flex-shrink-0">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <RotateCcw size={14} className="text-stone/40 flex-shrink-0 mt-0.5" />
            <h2 className="font-serif text-[20px] text-charcoal leading-snug truncate">
              {template.title}
            </h2>
          </div>
        </div>
        {template.recurrenceRule && (
          <p className="text-[12px] text-stone mt-1 ml-[22px]">
            {describeRule(template.recurrenceRule)} · {template.time} · {template.durationMinutes} min
          </p>
        )}

        {/* Edit schema toggle */}
        <button
          onClick={() => setSchemaOpen(o => !o)}
          className="flex items-center gap-1 mt-3 ml-[22px] text-[11px] text-stone/50 hover:text-charcoal transition-colors"
        >
          {schemaOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
          Bewerk schema
        </button>
        {schemaOpen && (
          <div className="mt-3">
            <MeetingInlineCard
              meeting={template}
              isTemplate
              defaultExpanded
              onDelete={onDelete}
            />
          </div>
        )}
      </div>

      {/* ── Scrollable body ───────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto min-h-0">

        {/* Upcoming section */}
        {(futureSpawned.length > 0 || upcomingDates.length > 0) && (
          <div className="px-6 py-4 border-b border-border/40">
            <div className="text-[10px] uppercase tracking-[0.08em] text-stone/35 font-medium mb-3">
              Upcoming
            </div>

            {/* Already-spawned future occurrences */}
            {futureSpawned.map(occ => (
              <div key={occ.id} className="mb-2">
                <MeetingInlineCard
                  meeting={occ}
                  defaultExpanded={occ.id === expandedOccurrenceId}
                  onBeginMeeting={() => handleBeginOccurrence(occ.id)}
                />
              </div>
            ))}

            {/* Unspawned upcoming dates */}
            {upcomingDates.map(date => (
              <button
                key={date}
                onClick={() => handleSpawnAndExpand(date)}
                className="w-full flex items-center gap-3 py-2 px-3 rounded-[6px]
                  text-left hover:bg-canvas transition-colors group"
              >
                <Calendar size={12} className="text-stone/30 flex-shrink-0" />
                <span className="text-[13px] text-charcoal flex-1">
                  {formatShortDate(date)}
                </span>
                <span className="text-[11px] text-stone/30 group-hover:text-stone/50 transition-colors">
                  Agenda aanpassen →
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Past occurrences */}
        {pastOccurrences.length > 0 && (
          <div className="px-6 py-4">
            <div className="text-[10px] uppercase tracking-[0.08em] text-stone/35 font-medium mb-3">
              Geschiedenis
            </div>
            <div className="space-y-1">
              {visiblePast.map(occ => (
                <div key={occ.id}>
                  {/* Collapsed row */}
                  <button
                    onClick={() => setExpandedPastId(id => id === occ.id ? null : occ.id)}
                    className={`w-full flex items-start gap-3 py-2.5 px-3 rounded-[6px]
                      text-left transition-colors
                      ${expandedPastId === occ.id ? 'bg-canvas' : 'hover:bg-canvas/60'}`}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {expandedPastId === occ.id
                        ? <ChevronDown size={11} className="text-stone/40" />
                        : <ChevronRight size={11} className="text-stone/30" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-stone/40 flex-shrink-0">
                          {occ.date ? formatShortDate(occ.date) : ''}
                        </span>
                        {occ.meetingNotes?.outcome && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${OUTCOME_CONFIG[occ.meetingNotes.outcome].color}`}>
                            {OUTCOME_CONFIG[occ.meetingNotes.outcome].label}
                          </span>
                        )}
                      </div>
                      {occ.meetingNotes?.summary && (
                        <p className="text-[12px] text-stone/60 mt-0.5 line-clamp-2 leading-relaxed">
                          {occ.meetingNotes.summary}
                        </p>
                      )}
                      {!occ.meetingNotes && (
                        <p className="text-[12px] text-stone/30 mt-0.5 italic">Geen opname</p>
                      )}
                    </div>
                  </button>

                  {/* Expanded: notes or editable card */}
                  {expandedPastId === occ.id && (
                    <div className="mt-1 mb-3 pl-6">
                      {occ.meetingNotes
                        ? <MeetingNotesDisplay notes={occ.meetingNotes} />
                        : <MeetingInlineCard meeting={occ} defaultExpanded />
                      }
                    </div>
                  )}
                </div>
              ))}
            </div>

            {!showAllPast && pastOccurrences.length > 10 && (
              <button
                onClick={() => setShowAllPast(true)}
                className="mt-3 text-[11px] text-stone/40 hover:text-charcoal transition-colors"
              >
                Toon meer ({pastOccurrences.length - 10} meer)
              </button>
            )}
          </div>
        )}

        {/* Empty state */}
        {futureSpawned.length === 0 && upcomingDates.length === 0 && pastOccurrences.length === 0 && (
          <div className="flex items-center justify-center h-40">
            <p className="text-[12px] text-stone/30 italic">Nog geen occurrences</p>
          </div>
        )}
      </div>
    </div>
  )
}
