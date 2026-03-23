import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { MeetingNotes, MeetingOutcome, AgendaItemNotes } from '../../types'

export const OUTCOME_CONFIG: Record<MeetingOutcome, { label: string; color: string }> = {
  'productive':     { label: 'Productive',      color: 'text-emerald-600 bg-emerald-50' },
  'inconclusive':   { label: 'Inconclusive',    color: 'text-amber-600 bg-amber-50' },
  'needs-followup': { label: 'Needs follow-up', color: 'text-blue-600 bg-blue-50' },
}

// ── Agenda item section ───────────────────────────────────────────────────────

function AgendaItemSection({ notes }: { notes: AgendaItemNotes }) {
  const [open, setOpen] = useState(true)
  const hasDecisions = notes.decisions.length > 0
  const hasActions = notes.actionItems.length > 0
  const hasQuestions = notes.openQuestions.length > 0

  return (
    <div className="border border-border/60 rounded-[8px] overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-3 py-2.5 bg-canvas/60 text-left hover:bg-stone/5 transition-colors"
      >
        {open
          ? <ChevronDown size={11} className="text-stone/40 flex-shrink-0" />
          : <ChevronRight size={11} className="text-stone/40 flex-shrink-0" />}
        <span className="text-[12px] font-medium text-charcoal/80 flex-1 min-w-0 truncate">
          {notes.agendaItemTitle}
        </span>
        <span className="text-[10px] text-stone/30 flex-shrink-0">
          {[
            hasDecisions && `${notes.decisions.length} decision${notes.decisions.length !== 1 ? 's' : ''}`,
            hasActions && `${notes.actionItems.length} action${notes.actionItems.length !== 1 ? 's' : ''}`,
          ].filter(Boolean).join(' · ')}
        </span>
      </button>

      {open && (
        <div className="px-3 py-2.5 space-y-3 border-t border-border/40">
          {/* Summary */}
          <p className="text-[12px] text-charcoal/75 leading-relaxed">{notes.summary}</p>

          {/* Decisions */}
          {hasDecisions && (
            <div>
              <div className="text-[10px] uppercase tracking-[0.08em] text-stone/40 font-medium mb-1.5">
                Decisions
              </div>
              <ul className="space-y-1">
                {notes.decisions.map((d, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12px] text-charcoal/80">
                    <span className="text-stone/30 mt-0.5 flex-shrink-0">·</span>
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action items */}
          {hasActions && (
            <div>
              <div className="text-[10px] uppercase tracking-[0.08em] text-stone/40 font-medium mb-1.5">
                Actions
              </div>
              <ul className="space-y-1.5">
                {notes.actionItems.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12px] text-charcoal/80">
                    <span className="text-stone/30 mt-0.5 flex-shrink-0">→</span>
                    <span className="flex-1 min-w-0">
                      {item.description}
                      {(item.assignee || item.dueDate) && (
                        <span className="inline-flex flex-wrap gap-1 ml-1.5">
                          {item.assignee && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-500 font-medium">
                              {item.assignee}
                            </span>
                          )}
                          {item.dueDate && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-stone/10 text-stone/60 font-medium">
                              {item.dueDate}
                            </span>
                          )}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Open questions */}
          {hasQuestions && (
            <div>
              <div className="text-[10px] uppercase tracking-[0.08em] text-stone/40 font-medium mb-1.5">
                Open questions
              </div>
              <ul className="space-y-1">
                {notes.openQuestions.map((q, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12px] text-charcoal/80">
                    <span className="text-stone/30 mt-0.5 flex-shrink-0">?</span>
                    <span>{q}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main display ──────────────────────────────────────────────────────────────

interface MeetingNotesDisplayProps {
  notes: MeetingNotes
  showSummaryLabel?: boolean
}

export function MeetingNotesDisplay({ notes, showSummaryLabel = true }: MeetingNotesDisplayProps) {
  const hasAgendaItemNotes = (notes.agendaItemNotes?.length ?? 0) > 0
  const hasOverallContent = notes.summary || notes.actionItems.length > 0 || notes.decisions.length > 0

  return (
    <div className="space-y-4">
      {/* Per-agenda-item breakdown */}
      {hasAgendaItemNotes && (
        <div className="space-y-2">
          <div className="text-[10px] uppercase tracking-[0.08em] text-stone/40 font-medium">
            By agenda item
          </div>
          {notes.agendaItemNotes!.map(itemNotes => (
            <AgendaItemSection key={itemNotes.agendaItemId} notes={itemNotes} />
          ))}
        </div>
      )}

      {/* Overall summary */}
      {hasOverallContent && (
        <div className={hasAgendaItemNotes ? 'pt-1 border-t border-border/40' : ''}>
          {hasAgendaItemNotes && (
            <div className="text-[10px] uppercase tracking-[0.08em] text-stone/40 font-medium mb-3">
              Overall
            </div>
          )}

          <div className="space-y-3">
            {/* Summary */}
            {notes.summary && (
              <div>
                {showSummaryLabel && !hasAgendaItemNotes && (
                  <div className="text-[10px] uppercase tracking-[0.08em] text-stone/40 font-medium mb-1">
                    Summary
                  </div>
                )}
                <p className="text-[12px] text-charcoal/80 leading-relaxed">
                  {notes.summary}
                </p>
              </div>
            )}

            {/* Action items */}
            {notes.actionItems.length > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-[0.08em] text-stone/40 font-medium mb-1">
                  Action items
                </div>
                <ul className="space-y-1.5">
                  {notes.actionItems.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-[12px] text-charcoal/80">
                      <span className="text-stone/30 mt-0.5 flex-shrink-0">•</span>
                      <span className="flex-1 min-w-0">
                        {item.description}
                        {(item.assignee || item.dueDate) && (
                          <span className="inline-flex flex-wrap gap-1 ml-1.5">
                            {item.assignee && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-500 font-medium">
                                {item.assignee}
                              </span>
                            )}
                            {item.dueDate && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-stone/10 text-stone/60 font-medium">
                                {item.dueDate}
                              </span>
                            )}
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Decisions */}
            {notes.decisions.length > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-[0.08em] text-stone/40 font-medium mb-1">
                  Decisions
                </div>
                <ul className="space-y-1">
                  {notes.decisions.map((decision, i) => (
                    <li key={i} className="flex items-start gap-2 text-[12px] text-charcoal/80">
                      <span className="text-stone/30 mt-0.5 flex-shrink-0">•</span>
                      <span>{decision}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Open questions */}
            {(notes.openQuestions?.length ?? 0) > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-[0.08em] text-stone/40 font-medium mb-1">
                  Open questions
                </div>
                <ul className="space-y-1">
                  {notes.openQuestions.map((q, i) => (
                    <li key={i} className="flex items-start gap-2 text-[12px] text-charcoal/80">
                      <span className="text-stone/30 mt-0.5 flex-shrink-0">?</span>
                      <span>{q}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
