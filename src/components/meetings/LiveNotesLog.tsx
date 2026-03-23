// src/components/meetings/LiveNotesLog.tsx
import { useEffect, useRef } from 'react'
import { Loader2 } from 'lucide-react'
import type { Meeting, MeetingSession } from '../../types'

interface LiveNotesLogProps {
  meeting: Meeting
  session: MeetingSession
}

export function LiveNotesLog({ meeting, session }: LiveNotesLogProps) {
  const processingItemIds = session.processingItemIds
  const bottomRef = useRef<HTMLDivElement>(null)
  const items = meeting.agendaItems ?? []
  const completedItems = items.filter(i => session.completedItemIds.includes(i.id))
  const agendaItemNotes = meeting.meetingNotes?.agendaItemNotes ?? []

  // Auto-scroll to bottom when new notes arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [agendaItemNotes.length, processingItemIds.length])

  if (completedItems.length === 0 && processingItemIds.length === 0) {
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
      {completedItems.map(item => {
        const notes = agendaItemNotes.find(n => n.agendaItemId === item.id)
        const isProcessing = processingItemIds.includes(item.id)

        return (
          <div key={item.id} className="space-y-2">
            {/* Item header */}
            <div className="flex items-center gap-2">
              <div className="w-[6px] h-[6px] rounded-full bg-stone/30 flex-shrink-0" />
              <h3 className="text-[12px] font-medium text-charcoal/70 uppercase tracking-[0.06em]">
                {item.title}
              </h3>
            </div>

            {isProcessing && (
              <div className="flex items-center gap-2 pl-4 text-[12px] text-stone/50">
                <Loader2 size={11} className="animate-spin" />
                <span>Summarising…</span>
              </div>
            )}

            {notes && !isProcessing && (
              <div className="pl-4 space-y-2">
                {notes.summary && (
                  <p className="text-[13px] text-charcoal/70 leading-relaxed">{notes.summary}</p>
                )}
                {notes.decisions.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-[0.06em] text-stone/50">Decisions</p>
                    {notes.decisions.map((d, i) => (
                      <div key={i} className="flex items-start gap-2 text-[12px] text-charcoal/70">
                        <span className="text-green-600 mt-0.5 flex-shrink-0">✔</span>
                        <span>{d}</span>
                      </div>
                    ))}
                  </div>
                )}
                {notes.actionItems.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-[0.06em] text-stone/50">Actions</p>
                    {notes.actionItems.map((a, i) => (
                      <div key={i} className="flex items-start gap-2 text-[12px] text-charcoal/70">
                        <span className="text-amber-600 mt-0.5 flex-shrink-0">→</span>
                        <span>{a.description}</span>
                      </div>
                    ))}
                  </div>
                )}
                {notes.openQuestions.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-[0.06em] text-stone/50">Open questions</p>
                    {notes.openQuestions.map((q, i) => (
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
