import { useState, useEffect } from 'react'
import { format, addDays } from 'date-fns'
import { Calendar, Loader2, AlertCircle } from 'lucide-react'
import type { AssignedCalendarEvent, TierAssignment } from '../../types'
import { fetchGoogleCalendarEvents, suggestTier } from '../../lib/calendar'

interface StepCalendarProps {
  assignments: AssignedCalendarEvent[]
  onAssignmentsChange: (a: AssignedCalendarEvent[]) => void
  accessToken: string | null
  onRequestAccess: () => Promise<string | null>
}

const TIER_PILLS: { tier: TierAssignment; label: string }[] = [
  { tier: 'deep', label: 'Deep' },
  { tier: 'short', label: 'Short' },
  { tier: 'maintenance', label: 'Maint' },
  { tier: 'unassigned', label: 'Skip' },
]

function formatTime(iso: string): string {
  const d = new Date(iso)
  return format(d, 'HH:mm')
}

export function StepCalendar({
  assignments,
  onAssignmentsChange,
  accessToken,
  onRequestAccess,
}: StepCalendarProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fetched, setFetched] = useState(false)

  const tomorrowDate = format(addDays(new Date(), 1), 'yyyy-MM-dd')

  async function loadEvents(token: string) {
    setLoading(true)
    setError(null)
    try {
      const events = await fetchGoogleCalendarEvents(token, tomorrowDate)
      const initial: AssignedCalendarEvent[] = events.map(event => {
        const suggested = suggestTier(event.durationMinutes)
        return { event, tier: suggested, suggestedTier: suggested }
      })
      onAssignmentsChange(initial)
      setFetched(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load calendar events')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (accessToken && !fetched) {
      loadEvents(accessToken)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken])

  async function handleConnect() {
    const token = await onRequestAccess()
    if (token) {
      await loadEvents(token)
    }
  }

  function handleTierChange(eventId: string, newTier: TierAssignment) {
    const updated = assignments.map(a => {
      if (a.event.id === eventId) {
        return { ...a, tier: newTier }
      }
      // Enforce only 1 deep: reset any other deep to its suggested tier
      if (newTier === 'deep' && a.tier === 'deep') {
        return { ...a, tier: a.suggestedTier }
      }
      return a
    })
    onAssignmentsChange(updated)
  }

  if (!accessToken && !fetched) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <div className="w-10 h-10 rounded-full bg-border-light flex items-center justify-center">
          <Calendar size={18} className="text-stone" />
        </div>
        <div>
          <div className="font-serif text-[15px] text-charcoal mb-1">
            See tomorrow's meetings
          </div>
          <div className="text-[13px] text-stone">
            Connect Google Calendar to automatically plan around your schedule.
          </div>
        </div>
        <button
          onClick={handleConnect}
          className="flex items-center gap-2 px-4 py-2 rounded-[8px]
            border border-border text-[13px] text-charcoal
            hover:border-charcoal/30 hover:bg-canvas transition-all"
        >
          <Calendar size={14} />
          Connect Google Calendar
        </button>
        <button
          className="text-[12px] text-stone/50 hover:text-stone transition-colors"
          onClick={() => setFetched(true)}
        >
          Skip for now →
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <Loader2 size={20} className="text-stone animate-spin" />
        <span className="text-[13px] text-stone">Loading tomorrow's calendar…</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <AlertCircle size={18} className="text-red-400" />
        <span className="text-[13px] text-stone">{error}</span>
        {accessToken && (
          <button
            onClick={() => loadEvents(accessToken)}
            className="text-[12px] text-charcoal underline underline-offset-2"
          >
            Retry
          </button>
        )}
      </div>
    )
  }

  if (assignments.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <Calendar size={18} className="text-stone/40" />
        <span className="text-[13px] text-stone">No events found for tomorrow.</span>
        <span className="text-[12px] text-stone/50">You can skip this step.</span>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="text-[11px] uppercase tracking-wider text-stone/60 mb-3">
        Assign each meeting to a tier
      </div>
      {assignments.map(({ event, tier }) => (
        <div
          key={event.id}
          className="rounded-[8px] border border-border bg-white p-3"
        >
          <div className="flex items-start justify-between gap-2 mb-2.5">
            <div>
              <div className="text-[13px] font-medium text-charcoal leading-snug">
                {event.title}
              </div>
              <div className="text-[11px] text-stone mt-0.5">
                {formatTime(event.start)} – {formatTime(event.end)}
              </div>
            </div>
            <span className="text-[10px] text-stone/60 bg-border-light rounded-full px-2 py-0.5 flex-shrink-0 mt-0.5">
              {event.durationMinutes} min
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {TIER_PILLS.map(pill => (
              <button
                key={pill.tier}
                onClick={() => handleTierChange(event.id, pill.tier)}
                className={`text-[11px] px-2.5 py-1 rounded-full transition-all ${
                  tier === pill.tier
                    ? 'bg-charcoal text-white'
                    : 'bg-border-light text-stone hover:bg-border'
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
