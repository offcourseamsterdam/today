// src/components/shared/SharedProjectPage.tsx
import { useState, useEffect, useMemo, useCallback } from 'react'
import { Loader2, Calendar, Clock, ChevronDown } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { fetchSharedProject } from '../../lib/shareProject'
import { CATEGORY_CONFIG } from '../../types'
import type { SharedProjectSnapshot, Meeting, MeetingNotes, AgendaItem } from '../../types'
import { AgendaItemEditor } from '../meetings/AgendaItemEditor'
import { useSharedAgendaSave } from '../../hooks/useSharedAgendaSave'

interface SharedProjectPageProps {
  shareId: string
}

export function SharedProjectPage({ shareId }: SharedProjectPageProps) {
  const [snapshot, setSnapshot] = useState<SharedProjectSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchSharedProject(shareId)
      .then(data => {
        if (!data) setError('This shared project was not found.')
        else setSnapshot(data)
      })
      .catch(() => setError('Failed to load shared project.'))
      .finally(() => setLoading(false))
  }, [shareId])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF9F7] flex items-center justify-center">
        <Loader2 size={20} className="animate-spin text-[#7A746A]/50" />
      </div>
    )
  }

  if (error || !snapshot) {
    return (
      <div className="min-h-screen bg-[#FAF9F7] flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-[15px] text-[#2A2724]/70">{error ?? 'Not found'}</p>
          <a href="/" className="text-[12px] text-[#7A746A] hover:text-[#2A2724] transition-colors">
            Go to Vandaag
          </a>
        </div>
      </div>
    )
  }

  return <SharedProjectView snapshot={snapshot} shareId={shareId} />
}

function SharedProjectView({ snapshot, shareId }: { snapshot: SharedProjectSnapshot; shareId: string }) {
  const { project, sharedAt } = snapshot
  const cat = CATEGORY_CONFIG[project.category]
  const today = new Date().toISOString().slice(0, 10)

  // Mutable local copy of meetings — visitor edits update this
  const [localMeetings, setLocalMeetings] = useState(snapshot.meetings ?? [])

  // Track which meeting was last edited for auto-save
  const [editingMeetingId, setEditingMeetingId] = useState<string | null>(null)
  const editingMeeting = localMeetings.find(m => m.id === editingMeetingId)
  const saveStatus = useSharedAgendaSave(shareId, editingMeetingId, editingMeeting?.agendaItems ?? [])

  const { upcoming, past } = useMemo(() => {
    const sorted = [...localMeetings].sort((a, b) =>
      (a.date ?? '').localeCompare(b.date ?? '') || a.time.localeCompare(b.time)
    )
    return {
      upcoming: sorted.filter(m => !m.date || m.date >= today),
      past: sorted.filter(m => m.date && m.date < today).reverse(),
    }
  }, [localMeetings, today])

  const nextMeeting = upcoming[0] ?? null

  const handleAgendaChange = useCallback((meetingId: string, newItems: AgendaItem[]) => {
    setEditingMeetingId(meetingId)
    setLocalMeetings(prev =>
      prev.map(m => m.id === meetingId ? { ...m, agendaItems: newItems } : m)
    )
  }, [])

  return (
    <div className="min-h-screen bg-[#FAF9F7]">
      {/* Cover */}
      {project.coverImageUrl && (
        <div className="w-full max-w-3xl mx-auto">
          <div
            className="w-full h-[180px] sm:h-[240px] bg-cover rounded-b-[12px] sm:rounded-[12px] sm:mt-6"
            style={{
              backgroundImage: `url(${project.coverImageUrl})`,
              backgroundPosition: project.coverImagePosition
                ? `${project.coverImagePosition.x}% ${project.coverImagePosition.y}%`
                : 'center',
            }}
          />
        </div>
      )}

      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-6 sm:py-8">
        {/* Header */}
        <span
          className="inline-block text-[10px] uppercase tracking-[0.08em] font-medium px-2.5 py-1 rounded-full mb-3"
          style={{ background: cat.bg, color: cat.color }}
        >
          {cat.label}
        </span>
        <h1 className="text-[28px] sm:text-[34px] font-serif text-[#2A2724] leading-tight mb-6">
          {project.title}
        </h1>

        {/* Next meeting — prominent + editable */}
        {nextMeeting && (
          <div className="rounded-[12px] border border-[#E8E4DD] bg-white px-5 py-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] uppercase tracking-[0.08em] text-[#7A746A]/60 font-medium">
                Next meeting
              </p>
              <SaveIndicator status={saveStatus} />
            </div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-[17px] font-serif text-[#2A2724] leading-tight mb-1">
                  {nextMeeting.title}
                </h2>
                <div className="flex items-center gap-3 text-[12px] text-[#7A746A]">
                  {nextMeeting.date && (
                    <span className="flex items-center gap-1">
                      <Calendar size={11} />
                      {format(parseISO(nextMeeting.date), 'EEEE d MMMM')}
                    </span>
                  )}
                  {nextMeeting.time && (
                    <span className="flex items-center gap-1">
                      <Clock size={11} />
                      {nextMeeting.time}
                      {nextMeeting.durationMinutes && ` · ${nextMeeting.durationMinutes < 60 ? `${nextMeeting.durationMinutes}m` : `${nextMeeting.durationMinutes / 60}h`}`}
                    </span>
                  )}
                  {nextMeeting.location && (
                    <span className="text-[#7A746A]/60">{nextMeeting.location}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Meeting context/description */}
            {nextMeeting.context && (
              <p className="mt-3 text-[12px] text-[#7A746A]/60 leading-relaxed">
                {nextMeeting.context}
              </p>
            )}

            {/* Editable agenda */}
            <div className="mt-4 border-t border-[#F0EEEB] pt-3">
              <AgendaItemEditor
                items={nextMeeting.agendaItems ?? []}
                onChange={(items) => handleAgendaChange(nextMeeting.id, items)}
              />
            </div>
          </div>
        )}

        {/* More upcoming — expandable with editors */}
        {upcoming.length > 1 && (
          <div className="mb-6 border-t border-[#E8E4DD] pt-5">
            <p className="text-[11px] uppercase tracking-[0.08em] text-[#7A746A]/60 font-medium mb-3">
              Also upcoming
            </p>
            <div className="space-y-px">
              {upcoming.slice(1).map(m => (
                <UpcomingRow
                  key={m.id}
                  meeting={m}
                  onAgendaChange={handleAgendaChange}
                  saveStatus={editingMeetingId === m.id ? saveStatus : 'idle'}
                />
              ))}
            </div>
          </div>
        )}

        {/* Past meetings */}
        {past.length > 0 && (
          <div className="border-t border-[#E8E4DD] pt-5">
            <p className="text-[11px] uppercase tracking-[0.08em] text-[#7A746A]/60 font-medium mb-3">
              Past meetings
            </p>
            <div className="space-y-px">
              {past.map(m => (
                <PastMeetingRow key={m.id} meeting={m} />
              ))}
            </div>
          </div>
        )}

        {localMeetings.length === 0 && (
          <p className="text-[13px] text-[#7A746A]/40 italic py-4">No meetings yet.</p>
        )}

        {/* Footer */}
        <div className="mt-12 pt-5 border-t border-[#E8E4DD] flex items-center justify-between">
          <p className="text-[11px] text-[#7A746A]/40">
            Shared {new Date(sharedAt).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
          <a href="/" className="text-[11px] text-[#7A746A]/40 hover:text-[#2A2724] transition-colors">
            Vandaag
          </a>
        </div>
      </div>
    </div>
  )
}

// ── Save status indicator ──────────────────────────────────────────────

function SaveIndicator({ status }: { status: string }) {
  if (status === 'idle') return null
  return (
    <span className={`text-[10px] flex items-center gap-1 transition-opacity ${
      status === 'saved' ? 'text-green-600/60' : status === 'error' ? 'text-red-500/60' : 'text-[#7A746A]/40'
    }`}>
      {status === 'saving' && <><Loader2 size={9} className="animate-spin" /> Saving...</>}
      {status === 'saved' && 'Saved'}
      {status === 'error' && 'Save failed'}
    </span>
  )
}

// ── Upcoming row (expandable + editable) ───────────────────────────────

function UpcomingRow({
  meeting,
  onAgendaChange,
  saveStatus,
}: {
  meeting: Meeting
  onAgendaChange: (meetingId: string, items: AgendaItem[]) => void
  saveStatus: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border-b border-[#F0EEEB] last:border-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 py-2.5 text-left hover:bg-[#7A746A]/5 rounded transition-colors"
      >
        <span className="text-[#7A746A]/50 flex-shrink-0 w-[90px] text-[12px]">
          {meeting.date ? format(parseISO(meeting.date), 'd MMM') : '—'}
          {meeting.time ? ` · ${meeting.time}` : ''}
        </span>
        <span className="text-[13px] text-[#2A2724] flex-1 min-w-0 truncate">{meeting.title}</span>
        <span className="text-[10px] text-[#7A746A]/30 flex-shrink-0">
          {(meeting.agendaItems ?? []).length > 0 && `${meeting.agendaItems!.length} items`}
        </span>
        <ChevronDown size={12} className={`text-[#7A746A]/30 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="pb-4 pl-2 pr-2">
          {meeting.context && (
            <p className="text-[12px] text-[#7A746A]/60 leading-relaxed mb-3">
              {meeting.context}
            </p>
          )}
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] uppercase tracking-[0.08em] text-[#7A746A]/40 font-medium">Agenda</p>
            <SaveIndicator status={saveStatus} />
          </div>
          <AgendaItemEditor
            items={meeting.agendaItems ?? []}
            onChange={(items) => onAgendaChange(meeting.id, items)}
          />
        </div>
      )}
    </div>
  )
}

// ── Past meeting row (expandable, read-only) ──────────────────────────

const OUTCOME_LABEL: Record<string, { label: string; color: string }> = {
  productive: { label: 'Productive', color: 'text-green-600' },
  inconclusive: { label: 'Inconclusive', color: 'text-[#7A746A]' },
  'needs-followup': { label: 'Needs follow-up', color: 'text-blue-500' },
}

function PastMeetingRow({ meeting }: { meeting: Meeting }) {
  const [open, setOpen] = useState(false)
  const notes: MeetingNotes | undefined = meeting.meetingNotes
  const outcome = notes?.outcome ? OUTCOME_LABEL[notes.outcome] : null

  return (
    <div className="border-b border-[#F0EEEB] last:border-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 py-3 text-left hover:bg-[#7A746A]/5 rounded transition-colors"
      >
        <span className={`w-[6px] h-[6px] rounded-full flex-shrink-0 ${notes ? 'bg-[#7A746A]/30' : 'bg-transparent border border-[#7A746A]/20'}`} />
        <span className="text-[11px] text-[#7A746A]/40 flex-shrink-0 w-[64px]">
          {meeting.date ? format(parseISO(meeting.date), 'd MMM') : '—'}
        </span>
        <span className="text-[13px] text-[#2A2724] flex-1 min-w-0 truncate">{meeting.title}</span>
        {outcome && (
          <span className={`text-[10px] flex-shrink-0 font-medium ${outcome.color}`}>{outcome.label}</span>
        )}
        {!notes && (
          <span className="text-[10px] text-[#7A746A]/25 italic flex-shrink-0">no notes</span>
        )}
      </button>

      {open && notes && (
        <div className="pb-4 pl-[22px] pr-2 space-y-3">
          {notes.summary && (
            <p className="text-[13px] text-[#2A2724]/65 leading-relaxed">{notes.summary}</p>
          )}

          {/* Per agenda-item notes */}
          {(notes.agendaItemNotes ?? []).length > 0 && (
            <div className="space-y-3">
              {notes.agendaItemNotes!.map(itemNote => (
                <div key={itemNote.agendaItemId}>
                  <div className="text-[10px] font-medium text-[#7A746A]/50 uppercase tracking-[0.06em] mb-1">
                    {itemNote.agendaItemTitle}
                  </div>
                  {itemNote.summary && (
                    <p className="text-[12px] text-[#2A2724]/65 leading-relaxed mb-1">{itemNote.summary}</p>
                  )}
                  {(itemNote.decisions ?? []).map((d, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-[12px] text-[#2A2724]/65">
                      <span className="text-green-600 mt-0.5 flex-shrink-0">✔</span>
                      <span>{d}</span>
                    </div>
                  ))}
                  {(itemNote.actionItems ?? []).map((a, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-[12px] text-[#2A2724]/65">
                      <span className="text-amber-500 mt-0.5 flex-shrink-0">→</span>
                      <span>{a.description}</span>
                      {a.assignee && (
                        <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-500 font-medium flex-shrink-0">
                          {a.assignee}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Top-level decisions/actions (when no per-item notes) */}
          {(notes.agendaItemNotes ?? []).length === 0 && (
            <>
              {(notes.decisions ?? []).map((d, i) => (
                <div key={i} className="flex items-start gap-1.5 text-[12px] text-[#2A2724]/65">
                  <span className="text-green-600 mt-0.5 flex-shrink-0">✔</span>
                  <span>{d}</span>
                </div>
              ))}
              {(notes.actionItems ?? []).map((a, i) => (
                <div key={i} className="flex items-start gap-1.5 text-[12px] text-[#2A2724]/65">
                  <span className="text-amber-500 mt-0.5 flex-shrink-0">→</span>
                  <span>{a.description}</span>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}
