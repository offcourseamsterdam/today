import { useState, useEffect } from 'react'
import { Square, SkipForward, Pause, Play, MicOff, RotateCw, ChevronDown, ChevronRight, AlertCircle } from 'lucide-react'
import { useStore } from '../../store'
import { useRecording } from '../../hooks/useRecording'
import { AudioLevelBars } from './AudioLevelBars'
import type { AgendaItemNotes } from '../../types'

function formatSeconds(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function AgendaItemNotesCard({ notes }: { notes: AgendaItemNotes }) {
  const [open, setOpen] = useState(true)
  const hasDecisions = notes.decisions.length > 0
  const hasActions = notes.actionItems.length > 0
  const hasQuestions = notes.openQuestions.length > 0

  return (
    <div className="mt-1.5 ml-5 rounded-[6px] bg-white/60 border border-charcoal/8 text-[11px]">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-left"
      >
        {open ? <ChevronDown size={10} className="text-stone/40 flex-shrink-0" /> : <ChevronRight size={10} className="text-stone/40 flex-shrink-0" />}
        <span className="text-stone/50 font-medium uppercase tracking-[0.06em] text-[9px]">Notes</span>
      </button>

      {open && (
        <div className="px-2.5 pb-2.5 space-y-2 border-t border-charcoal/6 pt-2">
          {/* Summary */}
          <p className="text-charcoal/70 leading-relaxed">{notes.summary}</p>

          {/* Decisions */}
          {hasDecisions && (
            <div>
              <div className="text-[9px] uppercase tracking-[0.08em] text-stone/40 font-medium mb-1">Decisions</div>
              <ul className="space-y-0.5">
                {notes.decisions.map((d, i) => (
                  <li key={i} className="flex gap-1.5 text-charcoal/70">
                    <span className="text-stone/30 flex-shrink-0">·</span>
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action items */}
          {hasActions && (
            <div>
              <div className="text-[9px] uppercase tracking-[0.08em] text-stone/40 font-medium mb-1">Actions</div>
              <ul className="space-y-0.5">
                {notes.actionItems.map((a, i) => (
                  <li key={i} className="flex gap-1.5 text-charcoal/70">
                    <span className="text-stone/30 flex-shrink-0">→</span>
                    <span className="flex-1 min-w-0">
                      {a.description}
                      {(a.assignee || a.dueDate) && (
                        <span className="inline-flex gap-1 ml-1 flex-wrap">
                          {a.assignee && (
                            <span className="px-1 py-0.5 rounded-full bg-violet-50 text-violet-500 font-medium text-[9px]">
                              {a.assignee}
                            </span>
                          )}
                          {a.dueDate && (
                            <span className="px-1 py-0.5 rounded-full bg-stone/10 text-stone/60 font-medium text-[9px]">
                              {a.dueDate}
                            </span>
                          )}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Open questions */}
          {hasQuestions && (
            <div>
              <div className="text-[9px] uppercase tracking-[0.08em] text-stone/40 font-medium mb-1">Open questions</div>
              <ul className="space-y-0.5">
                {notes.openQuestions.map((q, i) => (
                  <li key={i} className="flex gap-1.5 text-charcoal/70">
                    <span className="text-stone/30 flex-shrink-0">?</span>
                    <span>{q}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function LiveMeetingPanel() {
  const meetingSession = useStore(s => s.meetingSession)
  const meetings = useStore(s => s.meetings)
  const recurringMeetings = useStore(s => s.recurringMeetings)
  const endAndRedirectMeeting = useStore(s => s.endAndRedirectMeeting)
  const pauseMeetingSession = useStore(s => s.pauseMeetingSession)
  const resumeMeetingSession = useStore(s => s.resumeMeetingSession)
  const advanceMeetingItem = useStore(s => s.advanceMeetingItem)
  const processingMeetingId = useStore(s => s.processingMeetingId)
  const processingPhase = useStore(s => s.processingPhase)
  const processingError = useStore(s => s.processingError)
  const processingItemPhases = useStore(s => s.processingItemPhases)
  const processingItemErrors = useStore(s => s.processingItemErrors)
  const setProcessingError = useStore(s => s.setProcessingError)

  const meeting = meetingSession
    ? [...meetings, ...recurringMeetings].find(m => m.id === meetingSession.meetingId)
    : undefined

  const { isRecording, error: recordingError, stream, retryRecording } = useRecording(
    meetingSession ? meetingSession.meetingId : null,
    meeting?.language ?? 'auto',
  )

  // Elapsed time counter
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (!meetingSession) return
    const update = () => {
      setElapsed(Math.floor((Date.now() - Date.parse(meetingSession.startedAt)) / 1000))
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [meetingSession?.startedAt, !!meetingSession])

  if (!meetingSession || !meeting) return null

  const items = meeting.agendaItems ?? []
  const hasItems = items.length > 0
  const completedCount = meetingSession.completedItemIds.length
  const totalItems = items.length
  const progress = totalItems > 0 ? completedCount / totalItems : 0
  const isLastItem = !hasItems || meetingSession.currentItemIndex >= totalItems - 1
  const timerExpired = meetingSession.secondsLeft === 0
  const processingItemIds = meetingSession.processingItemIds ?? []
  const agendaItemNotes = meeting.meetingNotes?.agendaItemNotes ?? []

  return (
    <div className="bg-charcoal/5 border border-charcoal/10 rounded-[10px] p-4 mb-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
          <span className="text-[11px] font-medium text-charcoal uppercase tracking-[0.06em] truncate">
            Live — {meeting.title}
          </span>
          {isRecording ? (
            <span className="flex items-center gap-1 text-[10px] text-red-400">
              <AudioLevelBars stream={stream} />
              Rec
            </span>
          ) : recordingError ? (
            <span className="flex items-center gap-1 text-[10px] text-stone/40">
              <MicOff size={10} />
              No mic
              <button
                onClick={retryRecording}
                className="ml-0.5 text-stone/40 hover:text-charcoal transition-colors"
                title="Retry microphone"
              >
                <RotateCw size={9} />
              </button>
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-stone/40">
            {formatSeconds(elapsed)}
          </span>
          <button
            onClick={() => endAndRedirectMeeting(meetingSession.meetingId)}
            className="text-[10px] text-stone/40 hover:text-red-400 transition-colors"
          >
            End
          </button>
        </div>
      </div>

      {/* Post-meeting processing status */}
      {processingMeetingId && (
        <div className="flex items-center gap-2 text-[11px] text-stone/60 bg-stone/5 rounded-[6px] px-3 py-2">
          <span className="w-3 h-3 border border-stone/30 border-t-stone/70 rounded-full animate-spin flex-shrink-0" />
          <div className="flex items-center gap-1.5">
            <span className={processingPhase === 'transcribing' ? 'text-charcoal font-medium' : 'text-stone/40'}>
              Transcribing
            </span>
            <span className="text-stone/20">→</span>
            <span className={processingPhase === 'summarizing' ? 'text-charcoal font-medium' : 'text-stone/40'}>
              Summarizing
            </span>
          </div>
        </div>
      )}

      {/* Processing error */}
      {processingError && !processingMeetingId && (
        <div className="flex items-start gap-2 text-[11px] text-red-500/80 bg-red-50/60 rounded-[6px] px-3 py-2">
          <AlertCircle size={12} className="flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <span className="font-medium">Processing failed</span>
            <span className="text-red-400/80 ml-1.5">{processingError}</span>
          </div>
          <button
            onClick={() => setProcessingError(null)}
            className="text-red-400/60 hover:text-red-500 transition-colors flex-shrink-0"
          >
            ×
          </button>
        </div>
      )}

      {/* Progress — only when there are agenda items */}
      {hasItems && (
        <div>
          <div className="flex justify-between text-[10px] text-stone/40 mb-1">
            <span>{completedCount} / {totalItems} items</span>
            {meetingSession.secondsLeft != null && (
              <span className={timerExpired ? 'text-red-400' : ''}>
                {timerExpired ? "Time's up" : formatSeconds(meetingSession.secondsLeft)}
              </span>
            )}
          </div>
          <div className="h-1 bg-charcoal/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-charcoal/40 rounded-full transition-all duration-300"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Item list with inline per-item notes */}
      {hasItems && (
        <div className="space-y-1">
          {items.map((item, i) => {
            const isCompleted = meetingSession.completedItemIds.includes(item.id)
            const isCurrent = i === meetingSession.currentItemIndex
            const isUpcoming = i > meetingSession.currentItemIndex
            const isProcessing = processingItemIds.includes(item.id)
            const itemNotes = agendaItemNotes.find(n => n.agendaItemId === item.id)

            return (
              <div key={item.id}>
                <div
                  className={`flex items-center gap-2 text-[12px] py-0.5
                    ${isCompleted ? 'text-stone/40' : ''}
                    ${isCurrent ? 'text-charcoal font-medium' : ''}
                    ${isUpcoming ? 'text-stone/50' : ''}`}
                >
                  {isCompleted ? (
                    <span className="w-3 text-center text-green-500 text-[10px]">✓</span>
                  ) : isCurrent ? (
                    <span className="w-3 text-center text-amber-500">→</span>
                  ) : (
                    <span className="w-3" />
                  )}
                  <span className="flex-1">{item.title}</span>
                  {item.durationMinutes != null && !isCompleted && (
                    <span className="text-[10px] text-stone/30">{item.durationMinutes}m</span>
                  )}
                  {isProcessing && (
                    <span className="flex items-center gap-1 text-[10px] text-stone/40">
                      <span className="w-2.5 h-2.5 border border-stone/30 border-t-stone/60 rounded-full animate-spin" />
                      {processingItemPhases[item.id] === 'transcribing' ? 'Transcribing…' : 'Summarizing…'}
                    </span>
                  )}
                  {!isProcessing && processingItemErrors[item.id] && (
                    <span className="flex items-center gap-1 text-[10px] text-red-400" title={processingItemErrors[item.id]}>
                      <AlertCircle size={10} />
                      Failed
                    </span>
                  )}
                </div>

                {/* Per-item notes — appear as soon as generated */}
                {itemNotes && !isProcessing && (
                  <AgendaItemNotesCard notes={itemNotes} />
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
        {hasItems && meetingSession.secondsLeft != null ? (
          <button
            onClick={meetingSession.isRunning ? pauseMeetingSession : resumeMeetingSession}
            className="flex items-center gap-1.5 text-[11px] text-stone/60 hover:text-charcoal transition-colors"
          >
            {meetingSession.isRunning
              ? <><Pause size={11} /> Pause</>
              : <><Play size={11} /> Resume</>}
          </button>
        ) : (
          <div />
        )}

        <button
          onClick={hasItems ? advanceMeetingItem : () => endAndRedirectMeeting(meetingSession.meetingId)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px]
            bg-charcoal text-canvas text-[11px] font-medium
            hover:bg-charcoal/80 transition-colors"
        >
          {!hasItems || isLastItem
            ? <><Square size={11} /> End meeting</>
            : <><SkipForward size={11} /> Next item</>}
        </button>
      </div>
    </div>
  )
}
