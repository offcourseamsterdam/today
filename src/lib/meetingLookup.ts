import type { Meeting } from '../types'

/**
 * Finds a meeting by ID across both one-off and recurring collections.
 */
export function findMeetingById(
  id: string,
  meetings: Meeting[],
  recurringMeetings: Meeting[],
): Meeting | null {
  return meetings.find(m => m.id === id) ?? recurringMeetings.find(m => m.id === id) ?? null
}

/**
 * Resolves an array of meeting IDs to Meeting objects.
 * Skips IDs that don't match any meeting.
 */
export function resolveMeetingIds(
  ids: string[],
  meetings: Meeting[],
  recurringMeetings: Meeting[],
): Meeting[] {
  return ids
    .map(id => findMeetingById(id, meetings, recurringMeetings))
    .filter((m): m is Meeting => m !== null)
}
