// src/components/meetings/LiveMeetingView.tsx
import { useState, useEffect } from 'react'
import { X, FileText, CheckCircle2, Clock, MapPin } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { useStore } from '../../store'
import { useRecording } from '../../hooks/useRecording'
import { LiveAgendaPanel } from './LiveAgendaPanel'
import { LiveNotesLog } from './LiveNotesLog'
import { MeetingPrePanel } from './MeetingPrePanel'
import { MeetingNotesDisplay, OUTCOME_CONFIG } from './MeetingNotesDisplay'
import { AgendaSuggestions } from './AgendaSuggestions'

export function LiveMeetingView() {
  const meetingSession = useStore(s => s.meetingSession)
  const isLiveMeetingOpen = useStore(s => s.isLiveMeetingOpen)
  const setLiveMeetingOpen = useStore(s => s.setLiveMeetingOpen)
  const openMeetingId = useStore(s => s.openMeetingId)
  const setOpenMeetingId = useStore(s => s.setOpenMeetingId)
  const meetings = useStore(s => s.meetings)
  const recurringMeetings = useStore(s => s.recurringMeetings)

  const allMeetings = [...meetings, ...recurringMeetings]

  // Resolve the meeting being viewed/set-up
  const openedMeeting = openMeetingId && openMeetingId !== 'new'
    ? allMeetings.find(m => m.id === openMeetingId)
    : null

  // Modes
  const isNotesMode = !!(openedMeeting?.meetingNotes)
  const isSetupMode = openMeetingId !== null && !isNotesMode
  const isLiveMode = meetingSession !== null && isLiveMeetingOpen

  const shouldShow = isNotesMode || isSetupMode || isLiveMode

  const liveMeeting = meetingSession
    ? allMeetings.find(m => m.id === meetingSession.meetingId)
    : null

  // Elapsed time counter (live mode only)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  useEffect(() => {
    if (!meetingSession?.startedAt) return
    const update = () => {
      setElapsedSeconds(Math.floor((Date.now() - Date.parse(meetingSession.startedAt)) / 1000))
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [meetingSession?.startedAt])

  // Recording hook — active only during live mode
  const { isRecording } = useRecording(
    isLiveMode ? (meetingSession?.meetingId ?? null) : null,
    liveMeeting?.language ?? 'auto',
  )

  if (!shouldShow) return null

  function handleClose() {
    if (isLiveMode) setLiveMeetingOpen(false)
    else setOpenMeetingId(null)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] bg-charcoal/40 backdrop-blur-[3px]"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 pointer-events-none">
        <div
          className="relative w-full max-w-[1120px] h-full max-h-[740px] bg-canvas rounded-[14px]
            shadow-2xl border border-border flex flex-col overflow-hidden pointer-events-auto"
          onClick={e => e.stopPropagation()}
        >
          {/* Close / minimise button */}
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 z-10 w-7 h-7 flex items-center justify-center
              text-stone/40 hover:text-charcoal hover:bg-border-light rounded-full transition-colors"
            title={isLiveMode ? 'Minimise (meeting keeps running)' : 'Close'}
          >
            <X size={14} />
          </button>

          {/* Two-column layout */}
          <div className="flex flex-col sm:flex-row flex-1 min-h-0">

            {/* Left panel (40%) */}
            <div className="w-full sm:w-[40%] flex flex-col min-h-0">
              {isNotesMode && openedMeeting ? (
                <NotesLeftPanel meeting={openedMeeting} />
              ) : isSetupMode ? (
                <MeetingPrePanel openMeetingId={openMeetingId!} />
              ) : (
                isLiveMode && liveMeeting && (
                  <LiveAgendaPanel
                    meeting={liveMeeting}
                    session={meetingSession}
                    isRecording={isRecording}
                    elapsedSeconds={elapsedSeconds}
                  />
                )
              )}
            </div>

            {/* Right panel (60%) */}
            <div className="flex-1 flex flex-col min-h-0 bg-white/30">
              {isNotesMode && openedMeeting?.meetingNotes ? (
                <>
                  <div className="px-6 py-4 border-b border-border/60 flex items-center gap-3">
                    <h3 className="text-[10px] uppercase tracking-[0.08em] text-stone/50 font-medium">
                      Meeting notes
                    </h3>
                    {openedMeeting.meetingNotes.outcome && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium
                        ${OUTCOME_CONFIG[openedMeeting.meetingNotes.outcome]?.color ?? 'bg-stone/10 text-stone/50'}`}>
                        {OUTCOME_CONFIG[openedMeeting.meetingNotes.outcome]?.label}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 overflow-y-auto px-6 py-5">
                    <MeetingNotesDisplay notes={openedMeeting.meetingNotes} showSummaryLabel={false} />
                  </div>
                </>
              ) : isSetupMode && openMeetingId && openMeetingId !== 'new' ? (
                /* Setup mode: agenda suggestions from past meetings */
                <AgendaSuggestions targetMeetingId={openMeetingId} />
              ) : isSetupMode ? (
                /* New meeting — nothing to suggest yet */
                <div className="flex flex-col items-center justify-center h-full gap-3 opacity-40">
                  <FileText size={28} className="text-stone/30" />
                  <p className="text-[12px] text-stone/40 text-center leading-relaxed">
                    Notes will appear here<br />as the meeting runs
                  </p>
                </div>
              ) : (
                isLiveMode && liveMeeting && (
                  <>
                    <div className="px-6 py-4 border-b border-border/60">
                      <h3 className="text-[10px] uppercase tracking-[0.08em] text-stone/50 font-medium">
                        Notes Log
                      </h3>
                    </div>
                    <LiveNotesLog meeting={liveMeeting} session={meetingSession} isRecording={isRecording} />
                  </>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Notes-mode left panel ─────────────────────────────────────────────────────

import type { Meeting } from '../../types'

function NotesLeftPanel({ meeting }: { meeting: Meeting }) {
  const items = meeting.agendaItems ?? []
  const notes = meeting.meetingNotes!
  const completedIds = notes.agendaItemNotes?.map(n => n.agendaItemId) ?? []

  return (
    <div className="flex flex-col h-full border-r border-border">
      {/* Header */}
      <div className="px-6 py-5 border-b border-border/60">
        <div className="text-[10px] uppercase tracking-[0.08em] text-stone/40 font-medium mb-2">
          Past meeting
        </div>
        <h2 className="font-serif text-[20px] text-charcoal leading-snug">{meeting.title}</h2>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
          {meeting.date && (
            <span className="flex items-center gap-1 text-[11px] text-stone/50">
              <Clock size={10} />
              {format(parseISO(meeting.date), 'd MMM yyyy')}
              {meeting.time && ` · ${meeting.time}`}
            </span>
          )}
          {meeting.location && (
            <span className="flex items-center gap-1 text-[11px] text-stone/50">
              <MapPin size={10} />
              {meeting.location}
            </span>
          )}
        </div>
      </div>

      {/* Agenda items — all shown as done */}
      <div className="flex-1 overflow-y-auto py-3 px-4">
        {items.length === 0 ? (
          <p className="text-[12px] text-stone/30 italic px-2 py-1">No agenda items</p>
        ) : (
          <div className="space-y-0.5">
            {items.map(item => {
              const hasNotes = completedIds.includes(item.id)
              return (
                <div key={item.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-[5px]">
                  <CheckCircle2
                    size={13}
                    className={hasNotes ? 'text-stone/40 flex-shrink-0' : 'text-stone/20 flex-shrink-0'}
                  />
                  <span className={`text-[12px] leading-snug flex-1 ${hasNotes ? 'text-charcoal/60' : 'text-stone/40'}`}>
                    {item.title}
                  </span>
                  {item.durationMinutes && (
                    <span className="text-[10px] text-stone/30 flex-shrink-0">{item.durationMinutes}m</span>
                  )}
                  {item.owner && (
                    <span className="text-[10px] text-stone/30 flex-shrink-0">{item.owner}</span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
