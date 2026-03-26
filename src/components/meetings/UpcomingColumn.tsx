// src/components/meetings/UpcomingColumn.tsx
import { useMemo } from 'react'
import { format, addDays, endOfWeek } from 'date-fns'
import { Plus } from 'lucide-react'
import { useStore } from '../../store'
import { isDueToday } from '../../lib/recurrence'
import type { Meeting } from '../../types'

function MeetingItem({ meeting, onOpen }: { meeting: Meeting; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="w-full flex items-center gap-2.5 py-2 px-2 text-left hover:bg-stone/5
        rounded-[6px] transition-colors group"
    >
      <span className="text-[11px] text-stone/40 flex-shrink-0 w-[38px]">{meeting.time}</span>
      <span className="text-[13px] text-charcoal flex-1 min-w-0 truncate">{meeting.title}</span>
      {meeting.durationMinutes && (
        <span className="text-[10px] text-stone/30 flex-shrink-0">
          {meeting.durationMinutes < 60 ? `${meeting.durationMinutes}m` : `${meeting.durationMinutes / 60}h`}
        </span>
      )}
    </button>
  )
}

function Section({ label, meetings: items, onOpen }: {
  label: string
  meetings: Meeting[]
  onOpen: (id: string) => void
}) {
  if (items.length === 0) return null
  return (
    <div className="mb-4">
      <div className="text-[10px] uppercase tracking-[0.08em] text-stone/35 font-medium mb-1 px-2">
        {label}
      </div>
      {items.map(m => (
        <MeetingItem key={m.id} meeting={m} onOpen={() => onOpen(m.id)} />
      ))}
    </div>
  )
}

export function UpcomingColumn() {
  const meetings = useStore(s => s.meetings)
  const recurringMeetings = useStore(s => s.recurringMeetings)
  const setOpenMeetingId = useStore(s => s.setOpenMeetingId)
  const spawnRecurringOccurrence = useStore(s => s.spawnRecurringOccurrence)

  const now = new Date()
  const todayStr = format(now, 'yyyy-MM-dd')
  const nowTime = format(now, 'HH:mm')
  const tomorrowStr = format(addDays(now, 1), 'yyyy-MM-dd')
  const thisWeekEnd = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')

  function isPast(m: Meeting): boolean {
    if (!m.date) return false
    if (m.date < todayStr) return true
    if (m.date === todayStr && m.time < nowTime) return true
    return false
  }

  function handleOpen(id: string) {
    const isRecurring = recurringMeetings.some(m => m.id === id)
    if (isRecurring) {
      const occId = spawnRecurringOccurrence(id)
      setOpenMeetingId(occId)
    } else {
      setOpenMeetingId(id)
    }
  }

  const recurringAsToday = useMemo(() => {
    return recurringMeetings.filter(m => m.recurrenceRule && isDueToday(m.recurrenceRule, now))
  }, [recurringMeetings]) // eslint-disable-line react-hooks/exhaustive-deps

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
        {!hasAnything && (
          <p className="text-[12px] text-stone/30 italic px-2 py-8 text-center">No upcoming meetings</p>
        )}
        <Section label="Today" meetings={todayItems} onOpen={handleOpen} />
        <Section label="Tomorrow" meetings={tomorrowItems} onOpen={handleOpen} />
        <Section label="This week" meetings={thisWeekItems} onOpen={handleOpen} />
        <Section label="Later" meetings={laterItems} onOpen={handleOpen} />
      </div>
    </div>
  )
}
