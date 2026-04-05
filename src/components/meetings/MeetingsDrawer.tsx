import { useCallback, useMemo, useState } from 'react'
import { format, parseISO, addDays, endOfWeek } from 'date-fns'
import { X, Plus, Calendar, ChevronDown, Play } from 'lucide-react'
import { useStore } from '../../store'
import { MeetingRow } from './MeetingRow'
import type { Meeting } from '../../types'

interface MeetingsDrawerProps {
  open: boolean
  onClose: () => void
}

export function MeetingsDrawer({ open, onClose }: MeetingsDrawerProps) {
  const meetings = useStore(s => s.meetings)
  const recurringMeetings = useStore(s => s.recurringMeetings)
  const setOpenMeetingId = useStore(s => s.setOpenMeetingId)
  const addMeeting = useStore(s => s.addMeeting)
  const startMeetingSession = useStore(s => s.startMeetingSession)

  const meetingSession = useStore(s => s.meetingSession)
  const setLiveMeetingOpen = useStore(s => s.setLiveMeetingOpen)
  const deleteMeeting = useStore(s => s.deleteMeeting)
  const deleteRecurringMeeting = useStore(s => s.deleteRecurringMeeting)
  const spawnRecurringOccurrence = useStore(s => s.spawnRecurringOccurrence)
  const [pastExpanded, setPastExpanded] = useState(false)

  const handleStartNow = useCallback(() => {
    const now = new Date()
    const id = addMeeting({
      title: 'Quick meeting',
      date: format(now, 'yyyy-MM-dd'),
      time: format(now, 'HH:mm'),
      durationMinutes: 30,
      isRecurring: false,
    })
    startMeetingSession(id)
    onClose()
  }, [addMeeting, startMeetingSession, onClose])

  const today = new Date()
  const todayStr = format(today, 'yyyy-MM-dd')
  const tomorrowStr = format(addDays(today, 1), 'yyyy-MM-dd')
  const thisWeekEnd = format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd')

  const sortByTime = (a: Meeting, b: Meeting) => a.time.localeCompare(b.time)
  const sortByDateThenTime = (a: Meeting, b: Meeting) =>
    (a.date ?? '').localeCompare(b.date ?? '') || a.time.localeCompare(b.time)

  const getDayLabel = (m: Meeting, overrideToday = false) => {
    if (overrideToday || !m.date) return format(today, 'EEEE d MMM')
    return format(parseISO(m.date), 'EEEE d MMM')
  }

  const { todayMeetings, todayTemplateIds, tomorrowMeetings, thisWeekMeetings, nextWeekMeetings, pastMeetings } = useMemo(() => {
    // Templates that already have a concrete occurrence for today — hide the template
    // Check both `recurringMeetingId` (new) and title+time match (old occurrences)
    const spawnedTemplateIds = new Set<string>()
    const todayOccurrences = meetings.filter(m => m.date === todayStr)
    for (const occ of todayOccurrences) {
      if (occ.recurringMeetingId) {
        spawnedTemplateIds.add(occ.recurringMeetingId)
      } else {
        // Backward compat: match by title+time for old occurrences without recurringMeetingId
        const match = recurringMeetings.find(t => t.title === occ.title && t.time === occ.time)
        if (match) spawnedTemplateIds.add(match.id)
      }
    }
    const visibleRecurring = recurringMeetings.filter(m => !spawnedTemplateIds.has(m.id))
    const templateIds = new Set(recurringMeetings.map(m => m.id))
    return {
      todayMeetings: [
        ...meetings.filter(m => !m.date || m.date === todayStr).sort(sortByTime),
        ...visibleRecurring.sort(sortByTime),
      ],
      // Track which today-meetings are still recurring templates (not yet spawned)
      todayTemplateIds: templateIds,
      tomorrowMeetings: meetings.filter(m => m.date === tomorrowStr).sort(sortByTime),
      thisWeekMeetings: meetings.filter(m => m.date && m.date > tomorrowStr && m.date <= thisWeekEnd).sort(sortByDateThenTime),
      nextWeekMeetings: meetings.filter(m => m.date && m.date > thisWeekEnd).sort(sortByDateThenTime),
      pastMeetings: meetings
        .filter(m => m.date && m.date < todayStr)
        .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '') || b.time.localeCompare(a.time)),
    }
  }, [meetings, recurringMeetings, todayStr, tomorrowStr, thisWeekEnd])

  const hasAny =
    todayMeetings.length > 0 ||
    tomorrowMeetings.length > 0 ||
    thisWeekMeetings.length > 0 ||
    nextWeekMeetings.length > 0

  const handleDelete = useCallback((meeting: Meeting) => {
    if (meeting.isRecurring) deleteRecurringMeeting(meeting.id)
    else deleteMeeting(meeting.id)
  }, [deleteMeeting, deleteRecurringMeeting])

  const renderSection = (label: string, items: Meeting[], overrideDayToToday = false, isToday = false) => {
    if (items.length === 0) return null
    return (
      <div className="mb-5">
        <div className="text-[10px] uppercase tracking-[0.08em] text-stone/40 font-medium mb-2">
          {label}
        </div>
        {items.map(m => {
          const isTemplate = isToday && todayTemplateIds.has(m.id)
          return (
            <MeetingRow
              key={m.id}
              meeting={m}
              onEdit={() => setOpenMeetingId(m.id)}
              onDelete={() => handleDelete(m)}
              dayLabel={getDayLabel(m, overrideDayToToday || m.isRecurring)}
              onStart={isTemplate ? () => {
                const occurrenceId = spawnRecurringOccurrence(m.id)
                startMeetingSession(occurrenceId)
                onClose()
              } : undefined}
            />
          )
        })}
      </div>
    )
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-charcoal/20 backdrop-blur-[2px] transition-opacity duration-300
          ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full sm:max-w-[420px] bg-canvas border-l border-border
          shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]
          ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-6 pb-4 border-b border-border/50 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-stone/50" />
            <h2 className="text-[14px] font-medium text-charcoal">Meetings</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleStartNow}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px]
                bg-charcoal text-canvas text-[11px] font-medium
                hover:bg-charcoal/80 transition-colors"
            >
              <Play size={10} />
              Start now
            </button>
            <button
              onClick={() => setOpenMeetingId('new')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] border border-border
                text-[11px] text-stone hover:text-charcoal hover:border-stone/30 transition-all"
            >
              <Plus size={11} />
              Add
            </button>
            <button
              onClick={onClose}
              className="text-stone/40 hover:text-stone transition-colors p-1"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Live meeting banner */}
          {meetingSession && (() => {
            const allM = [...meetings, ...recurringMeetings]
            const activeMeeting = allM.find(m => m.id === meetingSession.meetingId)
            if (!activeMeeting) return null
            return (
              <div className="mx-0 mb-3 px-3 py-2 bg-amber-50/50 border border-amber-200/40 rounded-[8px]
                flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
                <span className="flex-1 text-[12px] text-charcoal/70 truncate">{activeMeeting.title}</span>
                <button
                  onClick={() => { setLiveMeetingOpen(true); onClose() }}
                  className="text-[11px] text-amber-700/70 hover:text-amber-800 transition-colors flex-shrink-0"
                >
                  Open &rarr;
                </button>
              </div>
            )
          })()}

          {!hasAny && pastMeetings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Calendar size={28} className="text-stone/20" />
              <p className="text-[13px] text-stone/40 text-center">
                No meetings yet.
                <br />
                Add one to get started.
              </p>
              <button
                onClick={() => setOpenMeetingId('new')}
                className="mt-2 px-4 py-2 rounded-[6px] border border-border text-[12px] text-stone
                  hover:text-charcoal hover:border-stone/30 transition-all"
              >
                Add meeting
              </button>
            </div>
          ) : (
            <>
              {renderSection('Today', todayMeetings, false, true)}
              {renderSection('Tomorrow', tomorrowMeetings)}
              {renderSection('This week', thisWeekMeetings)}
              {renderSection('Next week', nextWeekMeetings)}

              {/* Past meetings — collapsible */}
              {pastMeetings.length > 0 && (
                <div className="mt-2">
                  <button
                    onClick={() => setPastExpanded(v => !v)}
                    className="flex items-center gap-2 w-full text-left mb-2 group"
                  >
                    <span className="text-[10px] uppercase tracking-[0.08em] text-stone/40 font-medium">
                      Past meetings
                    </span>
                    <span className="text-[10px] text-stone/30 bg-stone/10 rounded-full px-1.5 py-0.5 leading-none">
                      {pastMeetings.length}
                    </span>
                    <ChevronDown
                      size={10}
                      className={`text-stone/30 ml-auto transition-transform ${pastExpanded ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {pastExpanded && (
                    <div className="animate-slide-up">
                      {pastMeetings.map(m => (
                        <MeetingRow
                          key={m.id}
                          meeting={m}
                          onEdit={() => setOpenMeetingId(m.id)}
                          onDelete={() => handleDelete(m)}
                          dayLabel={getDayLabel(m)}
                          defaultExpanded={!!m.meetingNotes}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}
