// src/components/meetings/UpcomingColumn.tsx
import { useMemo } from 'react'
import { format, addDays, endOfWeek } from 'date-fns'
import { Plus, RotateCcw } from 'lucide-react'
import { useStore } from '../../store'
import { isDueToday, meetingEndMinutes } from '../../lib/recurrence'
import { MeetingInlineCard } from './MeetingInlineCard'
import type { Meeting } from '../../types'

function Section({ label, meetings: items, renderCard }: {
  label: string
  meetings: Meeting[]
  renderCard: (m: Meeting) => React.ReactNode
}) {
  if (items.length === 0) return null
  return (
    <div className="mb-4">
      <div className="text-[10px] uppercase tracking-[0.08em] text-stone/35 font-medium mb-1 px-2">
        {label}
      </div>
      <div className="space-y-1.5">
        {items.map(m => (
          <div key={m.id}>{renderCard(m)}</div>
        ))}
      </div>
    </div>
  )
}

export function UpcomingColumn() {
  const meetings = useStore(s => s.meetings)
  const recurringMeetings = useStore(s => s.recurringMeetings)
  const setOpenMeetingId = useStore(s => s.setOpenMeetingId)
  const spawnRecurringOccurrence = useStore(s => s.spawnRecurringOccurrence)
  const startMeetingSession = useStore(s => s.startMeetingSession)
  const setLiveMeetingOpen = useStore(s => s.setLiveMeetingOpen)
  const deleteMeeting = useStore(s => s.deleteMeeting)
  const deleteRecurringMeeting = useStore(s => s.deleteRecurringMeeting)

  const now = new Date()
  const todayStr = format(now, 'yyyy-MM-dd')
  const nowTime = format(now, 'HH:mm')
  const tomorrowStr = format(addDays(now, 1), 'yyyy-MM-dd')
  const thisWeekEnd = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')

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

  const recurringAsToday = useMemo(() => {
    return recurringMeetings.filter(m =>
      m.recurrenceRule && isDueToday(m.recurrenceRule, now) && isRecurringStillUpcoming(m)
    )
  }, [recurringMeetings, nowTime]) // eslint-disable-line react-hooks/exhaustive-deps

  const { todayItems, tomorrowItems, thisWeekItems, laterItems } = useMemo(() => {
    const oneOff = meetings.filter(m => !isPast(m))
    return {
      todayItems: [
        ...oneOff.filter(m => !m.date || m.date === todayStr).sort((a, b) => a.time.localeCompare(b.time)),
        ...recurringAsToday.sort((a, b) => a.time.localeCompare(b.time)),
      ],
      tomorrowItems: oneOff.filter(m => m.date === tomorrowStr).sort((a, b) => a.time.localeCompare(b.time)),
      thisWeekItems: oneOff.filter(m => m.date && m.date > tomorrowStr && m.date <= thisWeekEnd)
        .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? '') || a.time.localeCompare(b.time)),
      laterItems: oneOff.filter(m => m.date && m.date > thisWeekEnd)
        .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? '') || a.time.localeCompare(b.time)),
    }
  }, [meetings, recurringAsToday, todayStr, tomorrowStr, thisWeekEnd]) // eslint-disable-line react-hooks/exhaustive-deps

  const hasAnything = todayItems.length + tomorrowItems.length + thisWeekItems.length + laterItems.length > 0

  function makeBeginHandler(m: Meeting): () => void {
    const isRecurring = recurringMeetings.some(r => r.id === m.id)
    return () => {
      if (isRecurring) {
        const occId = spawnRecurringOccurrence(m.id)
        startMeetingSession(occId)
      } else {
        startMeetingSession(m.id)
      }
      setLiveMeetingOpen(true)
    }
  }

  function makeDeleteHandler(m: Meeting): () => void {
    const isRecurring = recurringMeetings.some(r => r.id === m.id)
    return () => {
      if (isRecurring) {
        deleteRecurringMeeting(m.id)
      } else {
        deleteMeeting(m.id)
      }
    }
  }

  function renderUpcomingCard(m: Meeting) {
    return (
      <MeetingInlineCard
        meeting={m}
        onBeginMeeting={makeBeginHandler(m)}
        onDelete={makeDeleteHandler(m)}
        compact
      />
    )
  }

  return (
    <div className="flex flex-col h-full border-r border-border">
      <div className="px-6 py-5 border-b border-border/60 flex items-center justify-between">
        <h2 className="text-[11px] uppercase tracking-[0.08em] text-stone/50 font-medium">Upcoming</h2>
        <button
          onClick={() => setOpenMeetingId('new')}
          className="flex items-center gap-1 text-[11px] text-stone/40 hover:text-charcoal
            transition-colors px-2 py-1 rounded border border-border hover:border-stone/30"
        >
          <Plus size={11} />
          New
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {!hasAnything && recurringMeetings.length === 0 && (
          <p className="text-[12px] text-stone/30 italic px-2 py-8 text-center">No upcoming meetings</p>
        )}
        <Section label="Today" meetings={todayItems} renderCard={renderUpcomingCard} />
        <Section label="Tomorrow" meetings={tomorrowItems} renderCard={renderUpcomingCard} />
        <Section label="This week" meetings={thisWeekItems} renderCard={renderUpcomingCard} />
        <Section label="Later" meetings={laterItems} renderCard={renderUpcomingCard} />

        {/* Recurring templates — manage schedules */}
        {recurringMeetings.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border/40">
            <div className="text-[10px] uppercase tracking-[0.08em] text-stone/35 font-medium mb-1 px-2 flex items-center gap-1.5">
              <RotateCcw size={9} />
              Recurring
            </div>
            <div className="space-y-1.5">
              {recurringMeetings.map(m => (
                <MeetingInlineCard
                  key={m.id}
                  meeting={m}
                  isTemplate
                  onBeginMeeting={makeBeginHandler(m)}
                  onDelete={() => deleteRecurringMeeting(m.id)}
                  compact
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
