import type { Meeting } from '../types'

export function searchMeeting(m: Meeting, q: string): boolean {
  const lower = q.toLowerCase()
  if (m.title.toLowerCase().includes(lower)) return true
  const notes = m.meetingNotes
  if (!notes) return false
  if (notes.summary?.toLowerCase().includes(lower)) return true
  if (notes.decisions?.some(d => d.toLowerCase().includes(lower))) return true
  if (notes.actionItems?.some(a => a.description.toLowerCase().includes(lower))) return true
  if (notes.agendaItemNotes?.some(n =>
    n.agendaItemTitle.toLowerCase().includes(lower) ||
    n.summary?.toLowerCase().includes(lower) ||
    n.decisions?.some(d => d.toLowerCase().includes(lower)) ||
    n.actionItems?.some(a => a.description.toLowerCase().includes(lower))
  )) return true
  return false
}
