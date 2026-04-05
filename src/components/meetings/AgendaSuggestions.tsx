// src/components/meetings/AgendaSuggestions.tsx
// Suggests agenda items for the next meeting based on open questions,
// action items and follow-ups from past meetings with notes.
import { useState, useMemo } from 'react'
import { Plus } from 'lucide-react'
import { useStore } from '../../store'
import type { Meeting } from '../../types'

// ── Helpers ────────────────────────────────────────────────────────────────────

export interface AgendaSuggestion {
  title: string
  rationale: string
  source: 'open_question' | 'action_item' | 'follow_up'
}

export function computeAgendaSuggestions(pastMeetingsWithNotes: Meeting[]): AgendaSuggestion[] {
  const suggestions: AgendaSuggestion[] = []
  const recent = pastMeetingsWithNotes.slice(0, 3)

  for (const m of recent) {
    const notes = m.meetingNotes!
    const label = m.title

    for (const q of notes.openQuestions ?? []) {
      if (q.trim()) suggestions.push({ title: q, rationale: `Open question from ${label}`, source: 'open_question' })
    }

    for (const a of notes.actionItems ?? []) {
      if (a.description.trim()) suggestions.push({
        title: `Status update: ${a.description}`,
        rationale: `Action item${a.assignee ? ` (${a.assignee})` : ''} from ${label}`,
        source: 'action_item',
      })
    }

    if (notes.outcome === 'needs-followup') {
      suggestions.push({ title: `Follow up on ${label}`, rationale: `Meeting was marked as needs follow-up`, source: 'follow_up' })
    }
  }
  return suggestions
}

// ── Component ──────────────────────────────────────────────────────────────────

interface AgendaSuggestionsProps {
  /** The meeting whose agenda we're adding items to */
  targetMeetingId: string
}

export function AgendaSuggestions({ targetMeetingId }: AgendaSuggestionsProps) {
  const meetings = useStore(s => s.meetings)
  const recurringMeetings = useStore(s => s.recurringMeetings)
  const updateMeeting = useStore(s => s.updateMeeting)
  const today = new Date().toISOString().slice(0, 10)

  const [acceptedIndices, setAcceptedIndices] = useState<Set<number>>(() => new Set())

  const targetMeeting = useMemo(
    () => [...meetings, ...recurringMeetings].find(m => m.id === targetMeetingId),
    [meetings, recurringMeetings, targetMeetingId]
  )

  // Find past meetings with notes from the same series or project
  const pastMeetingsWithNotes = useMemo(() => {
    const allPast = meetings.filter(m => m.date && m.date < today && m.meetingNotes)

    // Prefer same recurring series; fall back to same project
    if (targetMeeting?.recurringMeetingId) {
      const series = allPast.filter(m => m.recurringMeetingId === targetMeeting.recurringMeetingId)
      if (series.length > 0) return series.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
    }
    if (targetMeeting?.projectId) {
      return allPast
        .filter(m => m.projectId === targetMeeting.projectId)
        .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
    }
    return []
  }, [meetings, today, targetMeeting])

  const suggestions = useMemo(
    () => computeAgendaSuggestions(pastMeetingsWithNotes),
    [pastMeetingsWithNotes]
  )

  if (suggestions.length === 0) return null

  function handleAdd(index: number, title: string) {
    const meeting = meetings.find(m => m.id === targetMeetingId)
    const existing = meeting?.agendaItems ?? []
    updateMeeting(targetMeetingId, {
      agendaItems: [...existing, { id: crypto.randomUUID(), title }],
    })
    setAcceptedIndices(prev => new Set(prev).add(index))
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-border/60">
        <h3 className="text-[10px] uppercase tracking-[0.08em] text-stone/50 font-medium">
          Suggested agenda items
        </h3>
        <p className="text-[11px] text-stone/35 mt-0.5">From previous meetings — click + to add to the agenda</p>
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
        {suggestions.map((s, i) => (
          <div
            key={i}
            className={`flex items-start gap-3 transition-opacity ${acceptedIndices.has(i) ? 'opacity-25' : ''}`}
          >
            <div className="flex-1 min-w-0">
              <p className="text-[12px] text-charcoal/80 leading-snug">{s.title}</p>
              <p className="text-[10px] text-stone/40 italic mt-0.5">{s.rationale}</p>
            </div>
            {!acceptedIndices.has(i) && (
              <button
                onClick={() => handleAdd(i, s.title)}
                className="flex items-center gap-1 text-[10px] text-stone/40 hover:text-charcoal
                  px-2 py-1 rounded border border-border hover:border-stone/30 transition-all flex-shrink-0 mt-0.5"
              >
                <Plus size={10} />
                Add
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
