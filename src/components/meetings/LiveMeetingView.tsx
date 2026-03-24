// src/components/meetings/LiveMeetingView.tsx
import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { useStore } from '../../store'
import { useRecording } from '../../hooks/useRecording'
import { LiveAgendaPanel } from './LiveAgendaPanel'
import { LiveNotesLog } from './LiveNotesLog'

export function LiveMeetingView() {
  const meetingSession = useStore(s => s.meetingSession)
  const isLiveMeetingOpen = useStore(s => s.isLiveMeetingOpen)
  const setLiveMeetingOpen = useStore(s => s.setLiveMeetingOpen)
  const meetings = useStore(s => s.meetings)
  const recurringMeetings = useStore(s => s.recurringMeetings)

  const meeting = meetingSession
    ? [...meetings, ...recurringMeetings].find(m => m.id === meetingSession.meetingId)
    : null

  // Elapsed time counter
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

  // Recording hook — always mounted when session exists
  const { isRecording } = useRecording(
    meetingSession?.meetingId ?? null,
    meeting?.language ?? 'auto',
  )

  if (!meetingSession || !meeting || !isLiveMeetingOpen) return null

  return (
    <>
      {/* Backdrop — click to dismiss (doesn't end meeting) */}
      <div
        className="fixed inset-0 z-50 bg-charcoal/40 backdrop-blur-[3px]"
        onClick={() => setLiveMeetingOpen(false)}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 pointer-events-none">
        <div
          className="relative w-full max-w-[960px] h-full max-h-[680px] bg-canvas rounded-[14px]
            shadow-2xl border border-border flex flex-col overflow-hidden pointer-events-auto"
          onClick={e => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={() => setLiveMeetingOpen(false)}
            className="absolute top-3 right-3 z-10 w-7 h-7 flex items-center justify-center
              text-stone/40 hover:text-charcoal hover:bg-border-light rounded-full transition-colors"
            title="Minimise (meeting keeps running)"
          >
            <X size={14} />
          </button>

          {/* Two-column layout — stack on mobile */}
          <div className="flex flex-col sm:flex-row flex-1 min-h-0">
            {/* Left: Agenda (40%) */}
            <div className="w-full sm:w-[40%] flex flex-col min-h-0">
              <LiveAgendaPanel
                meeting={meeting}
                session={meetingSession}
                isRecording={isRecording}
                elapsedSeconds={elapsedSeconds}
              />
            </div>

            {/* Right: Notes log (60%) */}
            <div className="flex-1 flex flex-col min-h-0 bg-white/30">
              <div className="px-6 py-4 border-b border-border/60">
                <h3 className="text-[10px] uppercase tracking-[0.08em] text-stone/50 font-medium">
                  Notes Log
                </h3>
              </div>
              <LiveNotesLog meeting={meeting} session={meetingSession} />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
