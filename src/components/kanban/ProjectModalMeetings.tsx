import { useState, useMemo, useEffect } from 'react'
import { format } from 'date-fns'
import { ChevronDown, Calendar, Sparkles, Loader2, RotateCcw, ExternalLink } from 'lucide-react'
import { useStore } from '../../store'
import { OUTCOME_CONFIG } from '../meetings/MeetingNotesDisplay'
import { isDueToday, describeRule } from '../../lib/recurrence'
import type { Meeting, RecurrenceRule } from '../../types'

function getNextOccurrences(rule: RecurrenceRule, n: number, from: Date = new Date()): Date[] {
  const results: Date[] = []
  const d = new Date(from)
  let tries = 0
  while (results.length < n && tries < 365) {
    if (isDueToday(rule, d)) results.push(new Date(d))
    d.setDate(d.getDate() + 1)
    tries++
  }
  return results
}

// ── Shared helpers ────────────────────────────────────────────────────────────

function computeNotesHash(meetings: Meeting[]): string {
  return meetings
    .filter(m => m.meetingNotes)
    .map(m => m.meetingNotes!.generatedAt)
    .sort()
    .join(',')
}

/** Find or create a concrete meeting instance from a recurring template for a specific date. */
function findOrCreateMeetingInstance(
  template: Meeting,
  date: Date,
  meetings: Meeting[],
  addMeeting: (m: Omit<Meeting, 'id' | 'createdAt'>) => string,
): string {
  const dateStr = format(date, 'yyyy-MM-dd')
  const existing = meetings.find(
    m => !m.isRecurring && m.date === dateStr && (m.recurringMeetingId === template.id || (m.time === template.time && m.title === template.title))
  )
  if (existing) return existing.id
  return addMeeting({
    title: template.title,
    date: dateStr,
    time: template.time,
    durationMinutes: template.durationMinutes,
    location: template.location,
    context: template.context,
    projectId: template.projectId,
    language: template.language ?? 'auto',
    agendaItems: template.agendaItems ? template.agendaItems.map(a => ({ ...a, id: crypto.randomUUID() })) : [],
    isRecurring: false,
    recurringMeetingId: template.id,
  })
}

function meetingToApiPayload(m: Meeting) {
  const notes = m.meetingNotes!
  return {
    title: m.title,
    date: m.date ?? notes.generatedAt.slice(0, 10),
    summary: notes.summary ?? '',
    decisions: notes.decisions ?? [],
    actionItems: (notes.actionItems ?? []).map(a => ({
      description: a.description,
      owner: a.assignee ?? null,
    })),
    openQuestions: notes.openQuestions ?? [],
  }
}

// ── A. Key Decisions card ─────────────────────────────────────────────────────

function KeyDecisionsCard({ projectId, projectTitle, linkedMeetingsWithNotes }: { projectId: string; projectTitle: string; linkedMeetingsWithNotes: Meeting[] }) {
  const projectDecisionsCache = useStore(s => s.projectDecisionsCache)
  const setProjectDecisions = useStore(s => s.setProjectDecisions)
  const [loading, setLoading] = useState(false)
  const [showDecisions, setShowDecisions] = useState(false)

  const cached = projectDecisionsCache[projectId]
  const currentHash = useMemo(() => computeNotesHash(linkedMeetingsWithNotes), [linkedMeetingsWithNotes])

  const handleClick = async () => {
    if (showDecisions) { setShowDecisions(false); return }
    if (cached && cached.notesHash === currentHash) { setShowDecisions(true); return }

    setLoading(true)
    try {
      const fourteenDaysAgo = new Date()
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)
      const cutoff = fourteenDaysAgo.toISOString().slice(0, 10)

      const recentMeetings = linkedMeetingsWithNotes.filter(m => {
        const d = m.date ?? m.meetingNotes!.generatedAt.slice(0, 10)
        return d >= cutoff
      })
      if (recentMeetings.length === 0) return

      const res = await fetch('/api/project-decisions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectTitle,
          meetings: recentMeetings.map(m => ({
            title: m.title,
            date: m.date ?? m.meetingNotes!.generatedAt.slice(0, 10),
            decisions: m.meetingNotes!.decisions ?? [],
            actionItems: (m.meetingNotes!.actionItems ?? []).map(a => ({
              description: a.description,
              owner: a.assignee ?? null,
            })),
            openQuestions: m.meetingNotes!.openQuestions ?? [],
          })),
        }),
      })

      if (!res.ok) { console.error('project-decisions API error:', res.status); return }
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
          <><Loader2 size={12} className="animate-spin" /><span>Generating…</span></>
        ) : (
          <><Sparkles size={12} /><span>Key decisions · last 2 weeks</span></>
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
  return (
    <button
      onClick={() => setOpenMeetingId(meeting.id)}
      className="w-full flex items-center gap-3 py-1.5 text-left hover:bg-stone/5 rounded transition-colors group"
    >
      <span className="text-[11px] text-stone/40 flex-shrink-0 w-[42px]">{meeting.time}</span>
      <span className="text-[11px] text-stone/35 flex-shrink-0 w-[72px]">{meeting.date}</span>
      <span className="text-[12px] text-charcoal flex-1 min-w-0 truncate">{meeting.title}</span>
      <ExternalLink size={10} className="text-stone/25 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  )
}

function RecurringUpcomingBlock({ meeting }: { meeting: Meeting }) {
  const setOpenMeetingId = useStore(s => s.setOpenMeetingId)
  const meetings = useStore(s => s.meetings)
  const addMeeting = useStore(s => s.addMeeting)
  const spawnRecurringOccurrence = useStore(s => s.spawnRecurringOccurrence)
  const rule = meeting.recurrenceRule
  const todayStr = format(new Date(), 'yyyy-MM-dd')

  const occurrences = useMemo(() => {
    if (!rule) return []
    // If today's occurrence has already ended (start + duration < now), skip to tomorrow
    let from = new Date()
    if (meeting.time) {
      const [h, m] = meeting.time.split(':').map(Number)
      const endMinutes = h * 60 + m + (meeting.durationMinutes ?? 0)
      const nowMinutes = from.getHours() * 60 + from.getMinutes()
      if (nowMinutes >= endMinutes) {
        from = new Date(from)
        from.setDate(from.getDate() + 1)
        from.setHours(0, 0, 0, 0)
      }
    }
    return getNextOccurrences(rule, 5, from)
  }, [rule, meeting.time, meeting.durationMinutes])

  // Eagerly pre-spawn a concrete instance for every visible occurrence so each
  // has its own independent agenda from the moment it appears in the list.
  useEffect(() => {
    occurrences.forEach(date => {
      const dateStr = format(date, 'yyyy-MM-dd')
      if (dateStr === todayStr) {
        spawnRecurringOccurrence(meeting.id)
      } else {
        findOrCreateMeetingInstance(meeting, date, meetings, addMeeting)
      }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleOccurrenceClick(date: Date) {
    const dateStr = format(date, 'yyyy-MM-dd')
    // Use the pre-spawned concrete instance (or spawn on click as fallback)
    const existing = meetings.find(
      m => !m.isRecurring && m.date === dateStr && m.recurringMeetingId === meeting.id
    )
    if (existing) { setOpenMeetingId(existing.id); return }
    const id = dateStr === todayStr
      ? spawnRecurringOccurrence(meeting.id)
      : findOrCreateMeetingInstance(meeting, date, meetings, addMeeting)
    setOpenMeetingId(id)
  }

  // For each displayed date, find the concrete instance (if already spawned) to show its data
  function getInstanceForDate(date: Date): Meeting | undefined {
    const dateStr = format(date, 'yyyy-MM-dd')
    return meetings.find(m => !m.isRecurring && m.date === dateStr && m.recurringMeetingId === meeting.id)
  }

  return (
    <div className="mb-3">
      <div className="flex items-center gap-1.5 mb-1">
        <RotateCcw size={9} className="text-stone/35" />
        <span className="text-[10px] text-stone/40">{meeting.title}</span>
        {rule && <span className="text-[10px] text-stone/30 italic">· {describeRule(rule)}</span>}
      </div>

      <div className="pl-3 border-l border-border/40">
        {occurrences.map((date, i) => {
          const instance = getInstanceForDate(date)
          const agendaCount = (instance?.agendaItems ?? meeting.agendaItems ?? []).length
          return (
            <button
              key={i}
              onClick={() => handleOccurrenceClick(date)}
              className="w-full flex items-center gap-3 py-1.5 text-left hover:bg-stone/5 rounded transition-colors group"
            >
              <span className="text-[11px] text-stone/40 flex-shrink-0 w-[42px]">{meeting.time}</span>
              <span className="text-[12px] text-charcoal/70 group-hover:text-charcoal transition-colors">{format(date, 'EEE d MMM')}</span>
              {agendaCount > 0 && (
                <span className="text-[10px] text-stone/30 flex-shrink-0 ml-auto">{agendaCount} items</span>
              )}
            </button>
          )
        })}
      </div>

      <p className="mt-1.5 pl-3 text-[10px] text-stone/35">
        Each occurrence has its own agenda ·{' '}
        <button
          onClick={() => setOpenMeetingId(meeting.id)}
          className="underline underline-offset-2 hover:text-stone/60 transition-colors"
        >
          edit schedule
        </button>
      </p>
    </div>
  )
}

// ── C. Recent Meeting Summary card ────────────────────────────────────────────

function RecentMeetingSummaryCard({ projectId, projectTitle, recentWithNotes }: {
  projectId: string
  projectTitle: string
  recentWithNotes: Meeting[]
}) {
  const recentMeetingSummaryCache = useStore(s => s.recentMeetingSummaryCache)
  const setRecentMeetingSummary = useStore(s => s.setRecentMeetingSummary)
  const [loading, setLoading] = useState(false)
  const [show, setShow] = useState(false)

  const cached = recentMeetingSummaryCache[projectId]
  const currentHash = useMemo(() => computeNotesHash(recentWithNotes), [recentWithNotes])

  const handleClick = async () => {
    if (show) { setShow(false); return }
    if (cached && cached.notesHash === currentHash) { setShow(true); return }

    setLoading(true)
    try {
      const res = await fetch('/api/recent-meeting-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectTitle,
          meetings: recentWithNotes.map(meetingToApiPayload),
        }),
      })
      if (!res.ok) { console.error('recent-meeting-summary API error:', res.status); return }
      const data = await res.json()
      setRecentMeetingSummary(projectId, {
        summary: data.summary,
        commitments: data.commitments,
        generatedAt: new Date().toISOString(),
        notesHash: currentHash,
      })
      setShow(true)
    } catch (err) {
      console.error('Failed to fetch recent meeting summary:', err)
    } finally {
      setLoading(false)
    }
  }

  const summary = cached?.notesHash === currentHash ? cached : null

  return (
    <div className="mb-3">
      <button
        onClick={handleClick}
        disabled={loading}
        className="flex items-center gap-1.5 text-[11px] text-stone/40 hover:text-charcoal transition-colors disabled:opacity-50"
      >
        {loading ? (
          <><Loader2 size={12} className="animate-spin" /><span>Generating…</span></>
        ) : (
          <><Sparkles size={12} /><span>Recent decisions & commitments</span></>
        )}
      </button>

      {show && summary && (
        <div className="mt-2.5 animate-slide-up">
          <p className="text-[12px] text-charcoal/80 leading-relaxed mb-2">{summary.summary}</p>

          {summary.commitments.length > 0 && (
            <div className="space-y-1.5">
              {summary.commitments.map((c, i) => (
                <div key={i} className="flex items-start gap-2 text-[12px] text-charcoal/80">
                  <span className="text-stone/30 mt-0.5 flex-shrink-0">·</span>
                  <div className="flex-1 min-w-0">
                    <span>{c.description}</span>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      {c.owner && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-500 font-medium">
                          {c.owner}
                        </span>
                      )}
                      <span className="text-[10px] text-stone/40 truncate">{c.fromMeeting}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── E. Past meeting row (expandable inline notes) ─────────────────────────────

function PastMeetingRow({ meeting }: { meeting: Meeting }) {
  const justEndedMeetingId = useStore(s => s.justEndedMeetingId)
  const clearJustEndedMeeting = useStore(s => s.clearJustEndedMeeting)
  const [expanded, setExpanded] = useState(meeting.id === justEndedMeetingId)
  const notes = meeting.meetingNotes

  useEffect(() => {
    if (meeting.id === justEndedMeetingId) clearJustEndedMeeting()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const outcome = notes?.outcome ? OUTCOME_CONFIG[notes.outcome] : null
  const dateLabel = meeting.date ?? notes?.generatedAt.slice(0, 10) ?? ''

  // No notes — just a dim row, not clickable
  if (!notes) {
    return (
      <div className="flex items-center gap-3 py-2 border-b border-border/30 last:border-0">
        <span className="text-[11px] text-stone/25 flex-shrink-0 w-[72px]">{dateLabel}</span>
        <span className="text-[12px] text-stone/30 flex-1 min-w-0 truncate">{meeting.title}</span>
        <span className="text-[10px] text-stone/20 italic flex-shrink-0">no recording</span>
      </div>
    )
  }

  const agendaItemNotes = notes.agendaItemNotes ?? []
  const allDecisions = [
    ...(notes.decisions ?? []),
    ...agendaItemNotes.flatMap(n => n.decisions ?? []),
  ]
  const allActions = [
    ...(notes.actionItems ?? []),
    ...agendaItemNotes.flatMap(n => n.actionItems ?? []),
  ]

  return (
    <div className="border-b border-border/30 last:border-0">
      {/* Header row — toggle expand */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-2.5 py-2 text-left group hover:bg-stone/5 rounded transition-colors"
      >
        <ChevronDown
          size={10}
          className={`text-stone/30 flex-shrink-0 transition-transform ${expanded ? '' : '-rotate-90'}`}
        />
        <span className="text-[11px] text-stone/40 flex-shrink-0 w-[64px]">{dateLabel}</span>
        <span className="text-[12px] text-charcoal flex-1 min-w-0 truncate">{meeting.title}</span>
        {outcome && !expanded && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${outcome.color}`}>
            {outcome.label}
          </span>
        )}
      </button>

      {/* Inline notes */}
      {expanded && (
        <div className="pb-3 pl-5 space-y-2.5 animate-slide-up">
          {/* Overall summary */}
          {notes.summary && (
            <p className="text-[12px] text-charcoal/70 leading-relaxed">{notes.summary}</p>
          )}

          {/* Per-agenda-item breakdown */}
          {agendaItemNotes.length > 0 && (
            <div className="space-y-2.5">
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
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-500 font-medium flex-shrink-0">
                          {a.assignee}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Top-level decisions & actions (if no per-item breakdown) */}
          {agendaItemNotes.length === 0 && (
            <>
              {allDecisions.length > 0 && (
                <div className="space-y-1">
                  {allDecisions.map((d, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-[12px] text-charcoal/70">
                      <span className="text-green-600 mt-0.5 flex-shrink-0">✔</span>
                      <span>{d}</span>
                    </div>
                  ))}
                </div>
              )}
              {allActions.length > 0 && (
                <div className="space-y-1">
                  {allActions.map((a, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-[12px] text-charcoal/70">
                      <span className="text-amber-500 mt-0.5 flex-shrink-0">→</span>
                      <span>{a.description}</span>
                      {a.assignee && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-500 font-medium flex-shrink-0">
                          {a.assignee}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Outcome badge (shown when expanded) */}
          {outcome && (
            <span className={`inline-flex text-[10px] px-1.5 py-0.5 rounded-full font-medium ${outcome.color}`}>
              {outcome.label}
            </span>
          )}
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
  const [moreUpcomingExpanded, setMoreUpcomingExpanded] = useState(false)
  const meetings = useStore(s => s.meetings)
  const recurringMeetings = useStore(s => s.recurringMeetings)
  const projects = useStore(s => s.projects)

  const projectTitle = projects.find(p => p.id === projectId)?.title ?? 'Unknown project'
  const now = new Date()
  const today = format(now, 'yyyy-MM-dd')
  const nowTime = format(now, 'HH:mm')

  // A meeting is considered past if its date+time (+ duration) have elapsed
  function isPastMeeting(m: Meeting): boolean {
    if (!m.date) return false
    if (m.date < today) return true
    if (m.date === today && m.time) {
      const [h, min] = m.time.split(':').map(Number)
      const endMinutes = h * 60 + min + (m.durationMinutes ?? 0)
      const [nowH, nowMin] = nowTime.split(':').map(Number)
      const nowMinutes = nowH * 60 + nowMin
      return nowMinutes >= endMinutes
    }
    return false
  }

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

  // Upcoming one-off: not yet started (date > today, or date = today and time >= now)
  const upcomingMeetings = useMemo(() =>
    allLinked
      .filter(m => m.date && !m.isRecurring && !isPastMeeting(m))
      .sort((a, b) => {
        if (a.date === b.date) return a.time.localeCompare(b.time)
        return a.date!.localeCompare(b.date!)
      }),
    [allLinked, today, nowTime] // eslint-disable-line react-hooks/exhaustive-deps
  )

  // Recurring meetings linked to this project
  const recurringLinked = useMemo(() =>
    allLinked.filter(m => m.isRecurring),
    [allLinked]
  )

  // Past: date < today, OR today but time already passed — sorted newest first
  const pastMeetings = useMemo(() =>
    allLinked
      .filter(m => m.date && !m.isRecurring && isPastMeeting(m))
      .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')),
    [allLinked, today, nowTime] // eslint-disable-line react-hooks/exhaustive-deps
  )

  // Last 2 past meetings with notes (for recent summary)
  const recentWithNotes = useMemo(() =>
    pastMeetings.filter(m => m.meetingNotes).slice(0, 2),
    [pastMeetings]
  )

  const hasUpcoming = upcomingMeetings.length > 0 || recurringLinked.length > 0

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
          projectTitle={projectTitle}
          linkedMeetingsWithNotes={linkedMeetingsWithNotes}
        />
      )}

      {/* B. Upcoming meetings + Agenda suggestions */}
      {hasUpcoming && (() => {
        const nextMeeting = upcomingMeetings[0] ?? null
        const moreMeetings = upcomingMeetings.slice(1)
        // Collapsible shows: remaining one-off meetings + all recurring blocks
        // (recurring blocks only go in the collapsible when there's already a one-off next meeting)
        const collapsibleMeetings = moreMeetings
        const collapsibleRecurring = nextMeeting ? recurringLinked : []
        const hasCollapsible = collapsibleMeetings.length > 0 || collapsibleRecurring.length > 0
        const collapsibleCount = collapsibleMeetings.length + collapsibleRecurring.length

        return (
          <div className={linkedMeetingsWithNotes.length > 0 ? 'border-t border-border/40 pt-3 mt-3' : ''}>
            <div className="text-[10px] uppercase tracking-[0.08em] text-stone/40 font-medium mb-1.5">
              Next up
            </div>

            {/* The single next meeting */}
            {nextMeeting && <UpcomingMeetingRow meeting={nextMeeting} />}

            {/* If no one-off next meeting, show recurring blocks directly */}
            {!nextMeeting && recurringLinked.map(m => (
              <RecurringUpcomingBlock key={m.id} meeting={m} />
            ))}

            {/* Collapsible: remaining one-off + recurring (when a one-off is already shown) */}
            {hasCollapsible && (
              <div className="mt-1">
                <button
                  onClick={() => setMoreUpcomingExpanded(e => !e)}
                  className="flex items-center gap-1.5 text-[11px] text-stone/40 hover:text-stone/70 transition-colors py-1"
                >
                  <ChevronDown
                    size={11}
                    className={`transition-transform ${moreUpcomingExpanded ? 'rotate-180' : ''}`}
                  />
                  {moreUpcomingExpanded ? 'Hide others' : `${collapsibleCount} more upcoming`}
                </button>
                {moreUpcomingExpanded && (
                  <div className="animate-slide-up">
                    {collapsibleMeetings.map(m => (
                      <UpcomingMeetingRow key={m.id} meeting={m} />
                    ))}
                    {collapsibleRecurring.map(m => (
                      <RecurringUpcomingBlock key={m.id} meeting={m} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })()}

      {/* C. Past meetings + Recent summary */}
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
              {/* Recent meeting summary — above past meeting rows */}
              {recentWithNotes.length > 0 && (
                <RecentMeetingSummaryCard
                  projectId={projectId}
                  projectTitle={projectTitle}
                  recentWithNotes={recentWithNotes}
                />
              )}

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
