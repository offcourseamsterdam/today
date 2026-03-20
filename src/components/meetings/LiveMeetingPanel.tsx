import { Square, SkipForward, Pause, Play, Mic, MicOff } from 'lucide-react'
import { useStore } from '../../store'
import { useRecording } from '../../hooks/useRecording'

function formatSeconds(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export function LiveMeetingPanel() {
  const meetingSession = useStore(s => s.meetingSession)
  const meetings = useStore(s => s.meetings)
  const recurringMeetings = useStore(s => s.recurringMeetings)
  const endMeetingSession = useStore(s => s.endMeetingSession)
  const pauseMeetingSession = useStore(s => s.pauseMeetingSession)
  const resumeMeetingSession = useStore(s => s.resumeMeetingSession)
  const advanceMeetingItem = useStore(s => s.advanceMeetingItem)

  const meeting = meetingSession
    ? [...meetings, ...recurringMeetings].find(m => m.id === meetingSession.meetingId)
    : undefined

  const { isRecording, error: recordingError } = useRecording(
    meetingSession ? meetingSession.meetingId : null,
    meeting?.language ?? 'auto',
  )

  if (!meetingSession || !meeting) return null

  const items = meeting.agendaItems ?? []
  const completedCount = meetingSession.completedItemIds.length
  const totalItems = items.length
  const progress = totalItems > 0 ? completedCount / totalItems : 0
  const isLastItem = meetingSession.currentItemIndex >= totalItems - 1
  const timerExpired = meetingSession.secondsLeft === 0

  return (
    <div className="bg-charcoal/5 border border-charcoal/10 rounded-[10px] p-4 mb-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
          <span className="text-[11px] font-medium text-charcoal uppercase tracking-[0.06em]">
            Live — {meeting.title}
          </span>
          {isRecording ? (
            <span className="flex items-center gap-1 text-[10px] text-red-400">
              <Mic size={10} className="animate-pulse" />
              Rec
            </span>
          ) : recordingError ? (
            <span className="flex items-center gap-1 text-[10px] text-stone/40">
              <MicOff size={10} />
              No mic
            </span>
          ) : null}
        </div>
        <button
          onClick={endMeetingSession}
          className="text-[10px] text-stone/40 hover:text-red-400 transition-colors"
        >
          End
        </button>
      </div>

      {/* Progress */}
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

      {/* Item list */}
      <div className="space-y-1">
        {items.map((item, i) => {
          const isCompleted = meetingSession.completedItemIds.includes(item.id)
          const isCurrent = i === meetingSession.currentItemIndex
          const isUpcoming = i > meetingSession.currentItemIndex

          return (
            <div
              key={item.id}
              className={`flex items-center gap-2 text-[12px] py-0.5
                ${isCompleted ? 'text-stone/30 line-through' : ''}
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
              {item.durationMinutes != null && (
                <span className="text-[10px] text-stone/30">{item.durationMinutes}m</span>
              )}
            </div>
          )
        })}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between pt-1">
        {meetingSession.secondsLeft != null ? (
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
          onClick={advanceMeetingItem}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px]
            bg-charcoal text-canvas text-[11px] font-medium
            hover:bg-charcoal/80 transition-colors"
        >
          {isLastItem
            ? <><Square size={11} /> End meeting</>
            : <><SkipForward size={11} /> Next item</>}
        </button>
      </div>
    </div>
  )
}
