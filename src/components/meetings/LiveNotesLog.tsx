// src/components/meetings/LiveNotesLog.tsx
import { useEffect, useRef } from 'react'
import { Loader2 } from 'lucide-react'
import { useStore } from '../../store'
import type { Meeting, MeetingSession } from '../../types'

interface LiveNotesLogProps {
  meeting: Meeting
  session: MeetingSession
  isRecording: boolean
}

export function LiveNotesLog({ meeting, session, isRecording }: LiveNotesLogProps) {
  const processingItemIds = session.processingItemIds
  const processingItemPhases = useStore(s => s.processingItemPhases)
  const bottomRef = useRef<HTMLDivElement>(null)
  const items = meeting.agendaItems ?? []
  const agendaItemNotes = meeting.meetingNotes?.agendaItemNotes ?? []

  // Auto-scroll to bottom when new notes arrive or current item changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [agendaItemNotes.length, processingItemIds.length, session.currentItemIndex])

  if (items.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-[12px] text-stone/40 text-center leading-relaxed max-w-[200px]">
          Notes will appear here as agenda items are completed
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
      {items.map((item, idx) => {
        const isCompleted = session.completedItemIds.includes(item.id)
        const isCurrent = idx === session.currentItemIndex && session.hasStarted
        const isUpcoming = !isCompleted && !isCurrent
        const notes = agendaItemNotes.find(n => n.agendaItemId === item.id)
        const isProcessing = processingItemIds.includes(item.id)
        const phase = processingItemPhases[item.id]

        return (
          <div key={item.id} className={`space-y-2 ${isUpcoming ? 'opacity-35' : ''}`}>
            {/* Item header */}
            <div className="flex items-center gap-2">
              {isCurrent && isRecording ? (
                <span className="w-[6px] h-[6px] rounded-full bg-red-400 animate-pulse flex-shrink-0" />
              ) : isCompleted ? (
                <span className="w-[6px] h-[6px] rounded-full bg-stone/30 flex-shrink-0" />
              ) : (
                <span className="w-[6px] h-[6px] rounded-full border border-stone/25 flex-shrink-0" />
              )}
              <h3 className={`text-[12px] font-medium uppercase tracking-[0.06em] ${
                isCurrent ? 'text-charcoal' : 'text-charcoal/60'
              }`}>
                {item.title}
              </h3>
              {isCurrent && isRecording && (
                <span className="text-[10px] text-red-400/70 font-normal normal-case tracking-normal">recording</span>
              )}
            </div>

            {/* Processing spinner */}
            {isProcessing && (
              <div className="flex items-center gap-2 pl-4 text-[12px] text-stone/50">
                <Loader2 size={11} className="animate-spin" />
                <span>{phase === 'transcribing' ? 'Transcribing…' : 'Summarising…'}</span>
              </div>
            )}

            {/* Notes */}
            {notes && !isProcessing && (
              <div className="pl-4 space-y-2">
                {notes.summary && (
                  <p className="text-[13px] text-charcoal/70 leading-relaxed">{notes.summary}</p>
                )}
                {(notes.decisions?.length ?? 0) > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-[0.06em] text-stone/50">Decisions</p>
                    {notes.decisions?.map((d, i) => (
                      <div key={i} className="flex items-start gap-2 text-[12px] text-charcoal/70">
                        <span className="text-green-600 mt-0.5 flex-shrink-0">✔</span>
                        <span>{d}</span>
                      </div>
                    ))}
                  </div>
                )}
                {(notes.actionItems?.length ?? 0) > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-[0.06em] text-stone/50">Actions</p>
                    {notes.actionItems?.map((a, i) => (
                      <div key={i} className="flex items-start gap-2 text-[12px] text-charcoal/70">
                        <span className="text-amber-600 mt-0.5 flex-shrink-0">→</span>
                        <span>{a.description}</span>
                      </div>
                    ))}
                  </div>
                )}
                {(notes.openQuestions?.length ?? 0) > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-[0.06em] text-stone/50">Open questions</p>
                    {notes.openQuestions?.map((q, i) => (
                      <div key={i} className="flex items-start gap-2 text-[12px] text-charcoal/70">
                        <span className="text-stone/50 mt-0.5 flex-shrink-0">?</span>
                        <span>{q}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
      <div ref={bottomRef} />
    </div>
  )
}
