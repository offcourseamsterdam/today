import type { CalendarEvent, TierAssignment } from '../types'

export const TIER_DURATIONS = {
  deep:        { workMinutes: 50, breakMinutes: 10, targetSessions: 3 },
  short:       { workMinutes: 50, breakMinutes: 0,  targetSessions: 1 },
  maintenance: { workMinutes: 25, breakMinutes: 0,  targetSessions: 1 },
} as const

export function suggestTier(durationMinutes: number): TierAssignment {
  if (durationMinutes > 60) return 'deep'
  if (durationMinutes >= 30) return 'short'
  if (durationMinutes > 0) return 'maintenance'
  return 'unassigned'
}

interface GoogleCalendarEvent {
  id: string
  summary?: string
  start: { dateTime?: string; date?: string }
  end: { dateTime?: string; date?: string }
}

interface GoogleCalendarResponse {
  items?: GoogleCalendarEvent[]
}

export async function fetchGoogleCalendarEvents(
  accessToken: string,
  date: string,
): Promise<CalendarEvent[]> {
  const timeMin = `${date}T00:00:00Z`
  const timeMax = `${date}T23:59:59Z`

  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true',
    orderBy: 'startTime',
  })

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )

  if (!res.ok) {
    throw new Error(`Google Calendar API error: ${res.status} ${res.statusText}`)
  }

  const data: GoogleCalendarResponse = await res.json()

  if (!data.items) return []

  return data.items
    .filter((e): e is GoogleCalendarEvent & { start: { dateTime: string }; end: { dateTime: string } } =>
      !!e.start.dateTime && !!e.end.dateTime,
    )
    .map((e) => {
      const start = new Date(e.start.dateTime)
      const end = new Date(e.end.dateTime)
      const durationMinutes = Math.round((end.getTime() - start.getTime()) / 60_000)

      return {
        id: e.id,
        title: e.summary ?? '(No title)',
        start: e.start.dateTime,
        end: e.end.dateTime,
        durationMinutes,
        isAllDay: false,
      }
    })
}
