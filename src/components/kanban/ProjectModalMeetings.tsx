import { useState, useMemo } from 'react'
import { ChevronDown, Calendar, Sparkles, Loader2 } from 'lucide-react'
import { useStore } from '../../store'
import { MeetingNotesDisplay, OUTCOME_CONFIG } from '../meetings/MeetingNotesDisplay'
import type { Meeting } from '../../types'

// ── Notes hash helper ─────────────────────────────────────────────────────────

function computeNotesHash(meetings: Meeting[]): string {
  return meetings
    .filter(m => m.meetingNotes)
    .map(m => m.meetingNotes!.generatedAt)
    .sort()
    .join(',')
}

// ── A. Key Decisions card ─────────────────────────────────────────────────────

function KeyDecisionsCard({ projectId, linkedMeetingsWithNotes }: { projectId: string; linkedMeetingsWithNotes: Meeting[] }) {
  const projectDecisionsCache = useStore(s => s.projectDecisionsCache)
  const setProjectDecisions = useStore(s => s.setProjectDecisions)
  const [loading, setLoading] = useState(false)
  const [showDecisions, setShowDecisions] = useState(false)

  const cached = projectDecisionsCache[projectId]
  const currentHash = useMemo(() => computeNotesHash(linkedMeetingsWithNotes), [linkedMeetingsWithNotes])

  const handleClick = async () => {
    // If already showing, toggle off
    if (showDecisions) {
      setShowDecisions(false)
      return
    }

    // Check cache validity
    if (cached && cached.notesHash === currentHash) {
      setShowDecisions(true)
      return
    }

    // Fetch from API
    setLoading(true)
    try {
      const fourteenDaysAgo = new Date()
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)
      const cutoff = fourteenDaysAgo.toISOString().slice(0, 10)

      const recentMeetings = linkedMeetingsWithNotes.filter(m => {
        const d = m.date ?? m.meetingNotes!.generatedAt.slice(0, 10)
        return d >= cutoff
      })

      const res = await fetch('/api/project-decisions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          meetings: recentMeetings.map(m => ({
            id: m.id,
            title: m.title,
            date: m.date ?? m.meetingNotes!.generatedAt.slice(0, 10),
            notes: m.meetingNotes,
          })),
        }),
      })

      const data = await res.json()
      setProjectDecisions(projectId, {
        decisions: data.decisions,
        themes: data.themes,
        generatedAt: new Date().toISOString(),
        notesHash: currentHash,
      })
      setShowDecisions(true)
    } catch (err) {
      console.error('Failed to fetch project decisions:', err)
    } finally {
      setLoading(false)
    }
  }

  const decisions = cached?.notesHash === currentHash ? cached.decisions : []

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        className="flex items-center gap-1.5 text-[11px] text-stone/40 hover:text-charcoal transition-colors disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader2 size={12} className="animate-spin" />
            <span>Generating…</span>
          </>
        ) : (
          <>
            <Sparkles size={12} />
            <span>Key decisions · last 2 weeks</span>
          </>
        )}
      </button>

      {showDecisions && decisions.length > 0 && (
        <div className="mt-2.5 space-y-1.5 animate-slide-up">
          {decisions.map((d, i) => (
            <div key={i} className="flex items-start gap-2 text-[12px] text-charcoal/80">
              <span className="text-stone/30 mt-0.5 flex-shrink-0">·</span>
              <div className="flex-1 min-w-0">
                <span>{d.decision}</span>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  {d.responsible && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-500 font-medium">
                      {d.responsible}
                    </span>
                  )}
                  <span className="text-[10px] text-stone/40">{d.date}</span>
                  <span className="text-[10px] text-stone/30">·</span>
                  <span className="text-[10px] text-stone/40 truncate">{d.meetingTitle}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── B. Upcoming meetings row ──────────────────────────────────────────────────

function UpcomingMeetingRow({ meeting }: { meeting: Meeting }) {
  const setOpenMeetingId = useStore(s => s.setOpenMeetingId)

  const timeLabel = meeting.time
  return (
    <button
      onClick={() => setOpenMeetingId(meeting.id)}
      className="w-full flex items-center gap-3 py-1.5 text-left hover:bg-stone/5 rounded transition-colors"
    >
      <span className="text-[11px] text-stone/40 flex-shrink-0 w-[42px]">{timeLabel}</span>
      <span className="text-[12px] text-charcoal flex-1 min-w-0 truncate">{meeting.title}</span>
    </button>
  )
}

// ── C. Past meeting row ───────────────────────────────────────────────────────

function PastMeetingRow({ meeting }: { meeting: Meeting }) {
  const [open, setOpen] = useState(false)
  const notes = meeting.meetingNotes
  const outcome = notes?.outcome ? OUTCOME_CONFIG[notes.outcome] : null
  const dateLabel = meeting.date ?? notes?.generatedAt.slice(0, 10) ?? ''

  if (!notes) {
    // Meeting without notes — greyed out row
    return (
      <div className="flex items-center gap-3 py-2.5">
        <span className="text-[11px] text-stone/30 flex-shrink-0 w-[72px]">{dateLabel}</span>
        <span className="text-[13px] text-stone/30 flex-1 min-w-0 truncate">{meeting.title}</span>
        <span className="text-[10px] text-stone/25 italic flex-shrink-0">no recording</span>
      </div>
    )
  }

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

// ── Main component ────────────────────────────────────────────────────────────

interface ProjectModalMeetingsProps {
  projectId: string
}

export function ProjectModalMeetings({ projectId }: ProjectModalMeetingsProps) {
  const [pastExpanded, setPastExpanded] = useState(true)
  const meetings = useStore(s => s.meetings)
  const recurringMeetings = useStore(s => s.recurringMeetings)

  const today = new Date().toISOString().slice(0, 10)

  // All meetings linked to this project
  const allLinked = useMemo(() =>
    [...meetings, ...recurringMeetings].filter(m => m.projectId === projectId),
    [meetings, recurringMeetings, projectId]
  )

  // Meetings with notes (for key decisions)
  const linkedMeetingsWithNotes = useMemo(() =>
    allLinked.filter(m => m.meetingNotes),
    [allLinked]
  )

  // Upcoming: date >= today OR recurring (no date field means always show)
  const upcomingMeetings = useMemo(() =>
    allLinked
      .filter(m => !m.date || m.date >= today)
      .sort((a, b) => {
        const da = a.date ?? ''
        const db = b.date ?? ''
        if (da === db) return a.time.localeCompare(b.time)
        return da.localeCompare(db)
      }),
    [allLinked, today]
  )

  // Past: meetings with a date < today, sorted newest first — show ALL (with or without notes)
  const pastMeetings = useMemo(() =>
    allLinked
      .filter(m => m.date && m.date < today)
      .sort((a, b) => {
        const da = a.date ?? ''
        const db = b.date ?? ''
        return db.localeCompare(da) // newest first
      }),
    [allLinked, today]
  )

  // Show component if there are any linked meetings or upcoming meetings
  if (allLinked.length === 0) return null

  return (
    <div className="border-t border-border pt-4 mt-0">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-3">
        <Calendar size={12} className="text-stone/40" />
        <span className="text-[11px] uppercase tracking-[0.08em] text-stone font-medium">
          Meetings
        </span>
        <span className="text-[10px] text-stone/40 bg-stone/10 px-1.5 py-0.5 rounded-full">
          {allLinked.length}
        </span>
      </div>

      {/* A. Key Decisions */}
      {linkedMeetingsWithNotes.length > 0 && (
        <KeyDecisionsCard
          projectId={projectId}
          linkedMeetingsWithNotes={linkedMeetingsWithNotes}
        />
      )}

      {/* B. Upcoming meetings */}
      {upcomingMeetings.length > 0 && (
        <div className={linkedMeetingsWithNotes.length > 0 ? 'border-t border-border/40 pt-3 mt-3' : ''}>
          <div className="text-[10px] uppercase tracking-[0.08em] text-stone/40 font-medium mb-1.5">
            Upcoming
          </div>
          {upcomingMeetings.map(m => (
            <UpcomingMeetingRow key={m.id} meeting={m} />
          ))}
        </div>
      )}

      {/* C. Past meetings */}
      {pastMeetings.length > 0 && (
        <div className="border-t border-border/40 pt-3 mt-3">
          <button
            onClick={() => setPastExpanded(e => !e)}
            className="flex items-center gap-2 w-full mb-1.5 group"
          >
            <span className="text-[10px] uppercase tracking-[0.08em] text-stone/40 font-medium">
              Past meetings
            </span>
            <span className="text-[10px] text-stone/40 bg-stone/10 px-1.5 py-0.5 rounded-full">
              {pastMeetings.length}
            </span>
            <ChevronDown
              size={11}
              className={`text-stone/30 ml-auto transition-transform ${pastExpanded ? 'rotate-180' : ''}`}
            />
          </button>

          {pastExpanded && (
            <div className="animate-slide-up">
              {pastMeetings.map(m => (
                <PastMeetingRow key={m.id} meeting={m} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
