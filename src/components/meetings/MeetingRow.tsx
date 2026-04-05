import { useState, useRef } from 'react'
import { ChevronDown, Play, Upload } from 'lucide-react'
import { useStore } from '../../store'
import { MeetingNotesDisplay, OUTCOME_CONFIG } from './MeetingNotesDisplay'
import { processAudioBlob } from '../../lib/processAudioBlob'
import type { Meeting, MeetingNotes } from '../../types'

function AiNotesSection({ notes }: { notes: MeetingNotes }) {
  const [expanded, setExpanded] = useState(true)
  const outcome = notes.outcome ? OUTCOME_CONFIG[notes.outcome] : null

  return (
    <div className="border-t border-border/30 pt-2">
      <button
        onClick={() => setExpanded(e => !e)}
        className="flex items-center gap-2 text-[10px] uppercase tracking-[0.08em]
          text-stone/40 hover:text-stone/60 transition-colors font-medium w-full text-left"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0" />
        AI Notes
        {outcome && (
          <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium normal-case tracking-normal ${outcome.color}`}>
            {outcome.label}
          </span>
        )}
        <ChevronDown
          size={10}
          className={`transition-transform ml-auto ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {expanded && (
        <div className="mt-2 animate-slide-up">
          <MeetingNotesDisplay notes={notes} />
        </div>
      )}
    </div>
  )
}

export interface MeetingRowProps {
  meeting: Meeting
  onEdit: () => void
  onDelete: () => void
  onStart?: () => void  // optional override for the play/start button
  dayLabel?: string
  defaultExpanded?: boolean
}

export function MeetingRow({ meeting, onEdit, onDelete, onStart, dayLabel, defaultExpanded = false }: MeetingRowProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const startMeetingSession = useStore(s => s.startMeetingSession)
  const handleStart = onStart ?? (() => startMeetingSession(meeting.id))
  const processingMeetingId = useStore(s => s.processingMeetingId)
  const projects = useStore(s => s.projects)
  const linkedProject = meeting.projectId ? projects.find(p => p.id === meeting.projectId) : undefined
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isProcessing = processingMeetingId === meeting.id
  const hasNotes = !!meeting.meetingNotes

  function handleRetryFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const blob = new Blob([file], { type: file.type || 'audio/webm' })
    const lang = meeting.language ?? 'auto'
    processAudioBlob(blob, meeting.id, lang)
    // Reset input so the same file can be selected again if needed
    e.target.value = ''
  }

  return (
    <div className="border-b border-border/30 last:border-0">
      {/* Row header */}
      <div className="flex items-center gap-0 group -mx-1">
        <button
          onClick={onEdit}
          className="flex-1 flex items-center gap-3 py-3 px-1 text-left
            hover:bg-canvas/60 rounded-l-[4px] transition-colors min-w-0"
        >
          <span className="text-[11px] font-medium text-stone/60 flex-shrink-0 w-[38px] text-right">
            {meeting.time}
          </span>
          <span className="flex-1 min-w-0 flex flex-col">
            <span className="text-[13px] text-charcoal truncate">{meeting.title}
              {linkedProject && (
                <span className="ml-2 text-[10px] text-stone/40">{linkedProject.title}</span>
              )}
            </span>
            {dayLabel && (
              <span className="text-[10px] text-stone/35 mt-0.5">{dayLabel}</span>
            )}
          </span>
          <span className="text-[10px] text-stone/40 flex-shrink-0">{meeting.durationMinutes}m</span>
          <ChevronDown
            size={12}
            className={`text-stone/30 flex-shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
            onClick={(e) => { e.stopPropagation(); setExpanded(v => !v) }}
          />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); handleStart() }}
          className="p-2 rounded-r-[4px] text-stone/25 hover:text-charcoal transition-all flex-shrink-0"
          title="Start meeting"
        >
          <Play size={11} />
        </button>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="pb-4 px-1 space-y-3 animate-slide-up">
          {/* Agenda items */}
          {(meeting.agendaItems?.length ?? 0) > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-[0.08em] text-stone/40 font-medium mb-2">
                Agenda
              </div>
              <div className="space-y-1">
                {meeting.agendaItems!.map(item => (
                  <div key={item.id} className="flex items-center gap-2 text-[12px] text-charcoal/80">
                    <span className="w-1 h-1 rounded-full bg-stone/30 flex-shrink-0" />
                    <span className="flex-1">{item.title}</span>
                    {item.owner && (
                      <span className="text-[10px] text-stone/40 flex-shrink-0">@{item.owner}</span>
                    )}
                    {item.durationMinutes != null && (
                      <span className="text-[10px] text-stone/30">{item.durationMinutes}m</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Notes */}
          {meeting.meetingNotes && (
            <AiNotesSection notes={meeting.meetingNotes} />
          )}
          {isProcessing && (
            <div className="flex items-center gap-2 py-3 text-[11px] text-stone/50">
              <span className="w-3 h-3 border-2 border-stone/30 border-t-stone/60 rounded-full animate-spin" />
              Processing recording...
            </div>
          )}

          {/* Retry from audio file — shown when no notes and not currently processing */}
          {!hasNotes && !isProcessing && (
            <div className="border-t border-border/30 pt-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*,video/*"
                className="hidden"
                onChange={handleRetryFile}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 text-[11px] text-stone/40 hover:text-stone transition-colors"
              >
                <Upload size={11} />
                Retry with audio file
              </button>
            </div>
          )}

          {/* Actions row */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-3">
              <button
                onClick={onDelete}
                className="text-[11px] text-red-400/70 hover:text-red-500 transition-colors"
              >
                Delete
              </button>
            </div>
            <button
              type="button"
              onClick={() => handleStart()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px]
                bg-charcoal text-canvas text-[11px] font-medium
                hover:bg-charcoal/80 transition-colors"
            >
              <Play size={10} />
              Start
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
