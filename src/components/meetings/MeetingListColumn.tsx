// src/components/meetings/MeetingListColumn.tsx
import { useMemo } from 'react'
import { format, addDays, endOfWeek } from 'date-fns'
import { nl } from 'date-fns/locale'
import { Search, Plus, ChevronDown, ChevronRight, RotateCcw } from 'lucide-react'
import { useStore } from '../../store'
import { searchMeeting } from '../../lib/meetingSearch'
import { isDueToday, meetingEndMinutes, describeRule } from '../../lib/recurrence'
import { formatDuration, formatTimeShort } from '../../lib/formatting'
import type { Meeting } from '../../types'

interface MeetingListColumnProps {
  selectedMeetingId: string | null
  onSelectMeeting: (id: string) => void
  searchQuery: string
  onSearchChange: (q: string) => void
  upcomingExpanded: boolean
  onToggleUpcoming: () => void
}

/* ── tiny helpers ─────────────────────────────────────────── */

function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return text.slice(0, max).trimEnd() + '...'
}

/* ── section header ──────────────────────────────────────── */

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="text-[10px] uppercase tracking-[0.08em] text-stone/35 font-medium px-4 py-2">
      {label}
    </div>
  )
}

/* ── compact upcoming row ────────────────────────────────── */

function UpcomingRow({
  meeting,
  selected,
  onSelect,
}: {
  meeting: Meeting
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-full flex items-center gap-2 py-1.5 px-4 text-left transition-colors
        ${selected ? 'bg-[#F0EEEB] border-l-2 border-l-charcoal' : 'border-l-2 border-l-transparent hover:bg-canvas/60'}`}
    >
      <span className="text-[11px] text-stone/40 w-[38px] flex-shrink-0 tabular-nums">
        {formatTimeShort(meeting.time)}
      </span>
      <span className="text-[13px] text-charcoal truncate flex-1 min-w-0">
        {meeting.title}
      </span>
      <span className="text-[10px] text-stone/30 flex-shrink-0">
        {formatDuration(meeting.durationMinutes)}
      </span>
    </button>
  )
}

/* ── recurring template row ──────────────────────────────── */

function RecurringRow({
  meeting,
  selected,
  onSelect,
}: {
  meeting: Meeting
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-full flex items-center gap-2 py-1.5 px-4 text-left transition-colors
        ${selected ? 'bg-[#F0EEEB] border-l-2 border-l-charcoal' : 'border-l-2 border-l-transparent hover:bg-canvas/60'}`}
    >
      <RotateCcw size={9} className="text-stone/30 flex-shrink-0" />
      <span className="text-[13px] text-charcoal truncate flex-1 min-w-0">
        {meeting.title}
      </span>
      <span className="text-[10px] text-stone/30 flex-shrink-0">
        {meeting.recurrenceRule ? describeRule(meeting.recurrenceRule) : ''}
      </span>
    </button>
  )
}

/* ── past meeting row (two-line) ─────────────────────────── */

function PastRow({
  meeting,
  selected,
  onSelect,
}: {
  meeting: Meeting
  selected: boolean
  onSelect: () => void
}) {
  const projects = useStore(s => s.projects)
  const notes = meeting.meetingNotes
  const project = meeting.projectId ? projects.find(p => p.id === meeting.projectId) : null
  const dateStr = meeting.date ?? ''
  const parsed = dateStr ? new Date(dateStr + 'T00:00:00') : null
  const dayName = parsed ? format(parsed, 'EEEE', { locale: nl }) : ''
  const dateLabel = parsed ? format(parsed, 'd MMM', { locale: nl }) : ''
  const summary = notes?.summary ? truncate(notes.summary, 120) : null

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left py-2.5 px-4 border-b border-border/30 transition-colors
        ${selected ? 'bg-[#F0EEEB] border-l-2 border-l-charcoal' : 'border-l-2 border-l-transparent hover:bg-canvas/60'}`}
    >
      {/* Line 1 */}
      <div className="flex items-center gap-2 min-w-0">
        <span className={`w-[6px] h-[6px] rounded-full flex-shrink-0 ${
          notes ? 'bg-stone/30' : 'bg-transparent border border-stone/20'
        }`} />
        <span className="text-[11px] text-stone/40 flex-shrink-0">
          {dayName}
        </span>
        <span className="text-[11px] text-stone/30 flex-shrink-0">
          {dateLabel}
        </span>
        <span className="text-[13px] font-medium text-charcoal truncate flex-1 min-w-0">
          {meeting.title}
        </span>
        {project && (
          <span className="text-[10px] text-stone/40 px-1.5 py-0.5 rounded
            border border-border/60 flex-shrink-0">
            {project.title}
          </span>
        )}
      </div>
      {/* Line 2 — summary or "Geen opname" */}
      <div className="mt-0.5 pl-[22px]">
        {summary ? (
          <p className="text-[11px] text-stone/40 leading-snug line-clamp-2">{summary}</p>
        ) : (
          <p className="text-[11px] text-stone/25 italic">Geen opname</p>
        )}
      </div>
    </button>
  )
}

/* ── main component ──────────────────────────────────────── */

export function MeetingListColumn({
  selectedMeetingId,
  onSelectMeeting,
  searchQuery,
  onSearchChange,
  upcomingExpanded,
  onToggleUpcoming,
}: MeetingListColumnProps) {
  const meetings = useStore(s => s.meetings)
  const recurringMeetings = useStore(s => s.recurringMeetings)
  const setOpenMeetingId = useStore(s => s.setOpenMeetingId)

  const now = new Date()
  const todayStr = format(now, 'yyyy-MM-dd')
  const nowTime = format(now, 'HH:mm')
  const tomorrowStr = format(addDays(now, 1), 'yyyy-MM-dd')
  const thisWeekEnd = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')

  /* ── classification helpers ──────────────────────────── */

  function isPast(m: Meeting): boolean {
    if (!m.date) return false
    if (m.date < todayStr) return true
    if (m.date === todayStr && m.time) {
      const endMinutes = meetingEndMinutes(m.time, m.durationMinutes)
      const [h, min] = nowTime.split(':').map(Number)
      return h * 60 + min >= endMinutes
    }
    return false
  }

  function isRecurringStillUpcoming(m: Meeting): boolean {
    if (!m.time) return true
    const [h, min] = m.time.split(':').map(Number)
    const endMinutes = h * 60 + min + (m.durationMinutes ?? 0)
    const nowMinutes = now.getHours() * 60 + now.getMinutes()
    return nowMinutes < endMinutes
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const recurringAsToday = useMemo(() => {
    return recurringMeetings.filter(
      m => m.recurrenceRule && isDueToday(m.recurrenceRule, now) && isRecurringStillUpcoming(m),
    )
  }, [recurringMeetings, nowTime]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── buckets ─────────────────────────────────────────── */

  const { todayItems, tomorrowItems, thisWeekItems, laterItems, pastMeetings } = useMemo(() => {
    const oneOff = meetings.filter(m => !isPast(m))
    const past = meetings
      .filter(m => isPast(m))
      .sort((a, b) =>
        (b.date ?? '').localeCompare(a.date ?? '') || (b.time ?? '').localeCompare(a.time ?? ''),
      )

    return {
      todayItems: [
        ...oneOff.filter(m => !m.date || m.date === todayStr).sort((a, b) => a.time.localeCompare(b.time)),
        ...recurringAsToday.sort((a, b) => a.time.localeCompare(b.time)),
      ],
      tomorrowItems: oneOff
        .filter(m => m.date === tomorrowStr)
        .sort((a, b) => a.time.localeCompare(b.time)),
      thisWeekItems: oneOff
        .filter(m => m.date && m.date > tomorrowStr && m.date <= thisWeekEnd)
        .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? '') || a.time.localeCompare(b.time)),
      laterItems: oneOff
        .filter(m => m.date && m.date > thisWeekEnd)
        .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? '') || a.time.localeCompare(b.time)),
      pastMeetings: past,
    }
  }, [meetings, recurringAsToday, todayStr, tomorrowStr, thisWeekEnd]) // eslint-disable-line react-hooks/exhaustive-deps

  const upcomingCount = tomorrowItems.length + thisWeekItems.length + laterItems.length

  /* ── search filtering ────────────────────────────────── */

  const allMeetings = useMemo(() => {
    return [...todayItems, ...tomorrowItems, ...thisWeekItems, ...laterItems, ...pastMeetings]
  }, [todayItems, tomorrowItems, thisWeekItems, laterItems, pastMeetings])

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return []
    const combined = [...allMeetings, ...recurringMeetings]
    return combined.filter(m => searchMeeting(m, searchQuery))
  }, [searchQuery, allMeetings, recurringMeetings])

  const isSearching = searchQuery.trim().length > 0

  /* ── render ──────────────────────────────────────────── */

  return (
    <div className="flex flex-col h-full bg-canvas">
      {/* Header bar */}
      <div className="px-5 py-4 border-b border-border/60 flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone/30" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Search meetings..."
            className="w-full pl-8 pr-3 py-2 rounded-[6px] border border-border bg-canvas
              text-[12px] text-charcoal placeholder:text-stone/30
              outline-none focus:border-stone/40 transition-colors"
          />
        </div>
        <button
          onClick={() => setOpenMeetingId('new')}
          className="flex items-center gap-1 text-[11px] text-stone/40 hover:text-charcoal
            transition-colors px-2 py-1 rounded border border-border hover:border-stone/30 flex-shrink-0"
        >
          <Plus size={11} />
          New
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        {isSearching ? (
          /* ── flat search results ─────────────────────── */
          <>
            {searchResults.length === 0 ? (
              <p className="text-[12px] text-stone/30 italic py-8 text-center">
                No matches found
              </p>
            ) : (
              searchResults.map(m => (
                <PastRow
                  key={m.id}
                  meeting={m}
                  selected={m.id === selectedMeetingId}
                  onSelect={() => onSelectMeeting(m.id)}
                />
              ))
            )}
          </>
        ) : (
          /* ── structured sections ─────────────────────── */
          <>
            {/* Upcoming toggle */}
            {(upcomingCount > 0 || recurringMeetings.length > 0) && (
              <div>
                <button
                  onClick={onToggleUpcoming}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-left
                    hover:bg-canvas/60 transition-colors"
                >
                  {upcomingExpanded ? (
                    <ChevronDown size={12} className="text-stone/40" />
                  ) : (
                    <ChevronRight size={12} className="text-stone/40" />
                  )}
                  <span className="text-[11px] uppercase tracking-[0.08em] text-stone/50 font-medium">
                    Upcoming
                  </span>
                  {upcomingCount > 0 && (
                    <span className="text-[10px] text-stone/30 bg-stone/5 px-1.5 py-0.5 rounded-full">
                      {upcomingCount}
                    </span>
                  )}
                </button>

                {upcomingExpanded && (
                  <div className="pb-2">
                    {tomorrowItems.length > 0 && (
                      <>
                        <SectionHeader label="Tomorrow" />
                        {tomorrowItems.map(m => (
                          <UpcomingRow
                            key={m.id}
                            meeting={m}
                            selected={m.id === selectedMeetingId}
                            onSelect={() => onSelectMeeting(m.id)}
                          />
                        ))}
                      </>
                    )}
                    {thisWeekItems.length > 0 && (
                      <>
                        <SectionHeader label="This week" />
                        {thisWeekItems.map(m => (
                          <UpcomingRow
                            key={m.id}
                            meeting={m}
                            selected={m.id === selectedMeetingId}
                            onSelect={() => onSelectMeeting(m.id)}
                          />
                        ))}
                      </>
                    )}
                    {laterItems.length > 0 && (
                      <>
                        <SectionHeader label="Later" />
                        {laterItems.map(m => (
                          <UpcomingRow
                            key={m.id}
                            meeting={m}
                            selected={m.id === selectedMeetingId}
                            onSelect={() => onSelectMeeting(m.id)}
                          />
                        ))}
                      </>
                    )}
                    {/* Recurring templates */}
                    {recurringMeetings.length > 0 && (
                      <>
                        <div className="mt-2 pt-2 border-t border-border/40 mx-4" />
                        <div className="text-[10px] uppercase tracking-[0.08em] text-stone/35 font-medium px-4 py-1 flex items-center gap-1.5">
                          <RotateCcw size={9} />
                          Recurring
                        </div>
                        {recurringMeetings.map(m => (
                          <RecurringRow
                            key={m.id}
                            meeting={m}
                            selected={m.id === selectedMeetingId}
                            onSelect={() => onSelectMeeting(m.id)}
                          />
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* VANDAAG section */}
            {todayItems.length > 0 && (
              <div className="border-t border-border/40">
                <SectionHeader label="Vandaag" />
                {todayItems.map(m => (
                  <UpcomingRow
                    key={m.id}
                    meeting={m}
                    selected={m.id === selectedMeetingId}
                    onSelect={() => onSelectMeeting(m.id)}
                  />
                ))}
              </div>
            )}

            {/* Past meetings */}
            {pastMeetings.length > 0 && (
              <div className="border-t border-border/40">
                <SectionHeader label="Geschiedenis" />
                {pastMeetings.map(m => (
                  <PastRow
                    key={m.id}
                    meeting={m}
                    selected={m.id === selectedMeetingId}
                    onSelect={() => onSelectMeeting(m.id)}
                  />
                ))}
              </div>
            )}

            {/* Empty state */}
            {todayItems.length === 0 && pastMeetings.length === 0 && upcomingCount === 0 && recurringMeetings.length === 0 && (
              <p className="text-[12px] text-stone/30 italic px-4 py-8 text-center">
                No meetings yet
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
