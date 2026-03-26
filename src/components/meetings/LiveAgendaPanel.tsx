// src/components/meetings/LiveAgendaPanel.tsx
import { useState, useRef } from 'react'
import { GripVertical, Pause, Play, SkipForward, Square, Mic, MicOff, PlayCircle } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useStore } from '../../store'
import type { Meeting, MeetingSession, AgendaItem } from '../../types'
import { v4 as uuid } from 'uuid'

interface LiveAgendaPanelProps {
  meeting: Meeting
  session: MeetingSession
  isRecording: boolean
  elapsedSeconds: number
}

function formatElapsed(s: number) {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

function formatTimeLeft(s: number | null): string | null {
  if (s === null) return null
  if (s <= 0) return '—'
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${String(sec).padStart(2, '0')}`
}

// ── Single sortable agenda item row ─────────────────────────────────────────

interface AgendaRowProps {
  item: AgendaItem
  status: 'done' | 'current' | 'upcoming'
  timeLeft: string | null
  isRecording?: boolean
}

function AgendaRow({ item, status, timeLeft, isRecording }: AgendaRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.id,
    disabled: status !== 'upcoming',
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative flex items-center gap-2.5 px-3 py-2 rounded-[6px] transition-colors
        ${status === 'current' ? 'bg-amber-50/60 border border-amber-200/40' : ''}
        ${status === 'done' ? 'opacity-50' : ''}
      `}
    >
      {/* Recording pulse — rendered behind content */}
      {status === 'current' && isRecording && (
        <span className="absolute inset-0 rounded-[6px] bg-red-400/10 animate-pulse pointer-events-none z-0" />
      )}

      {/* Drag handle — only visible/active for upcoming items */}
      <div
        {...(status === 'upcoming' ? { ...attributes, ...listeners } : {})}
        className={`relative z-10 flex-shrink-0 ${status === 'upcoming' ? 'cursor-grab text-stone/30 hover:text-stone/60' : 'text-transparent pointer-events-none'}`}
      >
        <GripVertical size={13} />
      </div>

      {/* Status indicator */}
      <div className="relative z-10 flex-shrink-0 w-4 flex items-center justify-center">
        {status === 'done' && <span className="text-[11px] text-stone/40">✓</span>}
        {status === 'current' && <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse block" />}
        {status === 'upcoming' && <span className="w-1.5 h-1.5 rounded-full bg-stone/20 block" />}
      </div>

      {/* Title */}
      <span className={`relative z-10 flex-1 text-[13px] leading-snug ${
        status === 'done' ? 'text-stone/50 line-through' :
        status === 'current' ? 'text-charcoal font-medium' :
        'text-charcoal/70'
      }`}>
        {item.title}
      </span>

      {/* Time left — only shown for current item */}
      {timeLeft !== null && status === 'current' && (
        <span className={`relative z-10 text-[11px] flex-shrink-0 tabular-nums ${
          timeLeft === '—' || parseInt(timeLeft) <= 1 ? 'text-red-500' : 'text-stone/50'
        }`}>
          {timeLeft}
        </span>
      )}
    </div>
  )
}

// ── Main panel ───────────────────────────────────────────────────────────────

export function LiveAgendaPanel({ meeting, session, isRecording, elapsedSeconds }: LiveAgendaPanelProps) {
  const pauseMeetingSession = useStore(s => s.pauseMeetingSession)
  const resumeMeetingSession = useStore(s => s.resumeMeetingSession)
  const advanceMeetingItem = useStore(s => s.advanceMeetingItem)
  const endAndRedirectMeeting = useStore(s => s.endAndRedirectMeeting)
  const reorderLiveMeetingItems = useStore(s => s.reorderLiveMeetingItems)
  const updateMeeting = useStore(s => s.updateMeeting)
  const updateRecurringMeeting = useStore(s => s.updateRecurringMeeting)
  const recurringMeetings = useStore(s => s.recurringMeetings)

  const [newItemTitle, setNewItemTitle] = useState('')
  const [newItemDuration, setNewItemDuration] = useState<number | undefined>(undefined)
  const addInputRef = useRef<HTMLInputElement>(null)

  const QUICK_DURATIONS = [5, 10, 15, 20, 30]

  const items = meeting.agendaItems ?? []
  const total = items.length
  const completed = session.completedItemIds.length
  const progress = total > 0 ? completed / total : 0

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = items.findIndex(i => i.id === active.id)
    const newIndex = items.findIndex(i => i.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    reorderLiveMeetingItems(arrayMove(items, oldIndex, newIndex))
  }

  function handleAddItem() {
    const title = newItemTitle.trim()
    if (!title) return
    const newItem: AgendaItem = { id: uuid(), title, ...(newItemDuration != null ? { durationMinutes: newItemDuration } : {}) }
    const newItems = [...items, newItem]
    const isRecurring = recurringMeetings.some(m => m.id === meeting.id)
    if (isRecurring) {
      updateRecurringMeeting(meeting.id, { agendaItems: newItems })
    } else {
      updateMeeting(meeting.id, { agendaItems: newItems })
    }
    setNewItemTitle('')
    setNewItemDuration(undefined)
    addInputRef.current?.focus()
  }

  return (
    <div className="flex flex-col h-full border-r border-border">
      {/* Meeting header */}
      <div className="px-6 py-5 border-b border-border/60">
        <div className="flex items-center gap-2 mb-1">
          {isRecording ? (
            <span className="flex items-center gap-1.5 text-[11px] text-red-500/80">
              <Mic size={10} />
              Recording
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-[11px] text-stone/40">
              <MicOff size={10} />
              Not recording
            </span>
          )}
          <span className="text-stone/30 text-[11px]">·</span>
          <span className="text-[11px] text-stone/50 tabular-nums">{formatElapsed(elapsedSeconds)}</span>
        </div>
        <h2 className="font-serif text-[20px] text-charcoal leading-snug">{meeting.title}</h2>

        {/* Progress bar */}
        <div className="mt-3 h-[3px] bg-border rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-400/60 rounded-full transition-all duration-500"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <p className="text-[10px] text-stone/40 mt-1">
          {completed} of {total} items done
        </p>
      </div>

      {/* Agenda list */}
      <div className="flex-1 overflow-y-auto py-2">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
            {items.map((item, idx) => {
              const status =
                session.completedItemIds.includes(item.id) ? 'done' :
                idx === session.currentItemIndex ? 'current' :
                'upcoming'
              const timeLeft = status === 'current' ? formatTimeLeft(session.secondsLeft) : null
              return (
                <AgendaRow key={item.id} item={item} status={status} timeLeft={timeLeft} isRecording={isRecording} />
              )
            })}
          </SortableContext>
        </DndContext>

        {/* Add item input */}
        <div className="px-3 mt-2">
          <input
            ref={addInputRef}
            value={newItemTitle}
            onChange={e => setNewItemTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAddItem() }}
            placeholder="+ Add agenda item"
            className="w-full text-[12px] text-stone/60 placeholder:text-stone/30 bg-transparent
              border-none outline-none py-1.5 px-1"
          />
          {newItemTitle.trim().length > 0 && (
            <div className="flex items-center gap-1 mt-1 px-1">
              <span className="text-[10px] text-stone/30 mr-0.5">min:</span>
              {QUICK_DURATIONS.map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setNewItemDuration(newItemDuration === d ? undefined : d)}
                  className={`text-[10px] px-1.5 py-0.5 rounded transition-colors
                    ${newItemDuration === d
                      ? 'bg-charcoal/80 text-canvas'
                      : 'text-stone/40 hover:text-stone/70 bg-border-light'}`}
                >
                  {d}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Controls bar */}
      <div className="px-4 py-4 border-t border-border/60 flex items-center gap-2">
        {!session.hasStarted ? (
          /* Fresh session — show prominent Start button */
          <button
            onClick={resumeMeetingSession}
            className="flex items-center gap-1.5 px-4 py-1.5 text-[12px] font-medium
              text-canvas bg-charcoal rounded-[6px] hover:bg-charcoal/85 transition-colors"
          >
            <PlayCircle size={13} />
            Start
          </button>
        ) : session.isRunning ? (
          <button
            onClick={pauseMeetingSession}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] text-stone/70
              hover:text-charcoal border border-border rounded-[6px] hover:bg-border-light transition-colors"
          >
            <Pause size={12} />
            Pause
          </button>
        ) : (
          <button
            onClick={resumeMeetingSession}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] text-stone/70
              hover:text-charcoal border border-border rounded-[6px] hover:bg-border-light transition-colors"
          >
            <Play size={12} />
            Resume
          </button>
        )}

        {session.hasStarted && (
          <button
            onClick={advanceMeetingItem}
            disabled={session.currentItemIndex >= items.length - 1}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] text-stone/70
              hover:text-charcoal border border-border rounded-[6px] hover:bg-border-light
              transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <SkipForward size={12} />
            Next
          </button>
        )}

        <div className="flex-1" />

        <button
          onClick={() => endAndRedirectMeeting(session.meetingId)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] text-red-500/70
            hover:text-red-600 border border-red-200/50 rounded-[6px] hover:bg-red-50/50 transition-colors"
        >
          <Square size={11} />
          End
        </button>
      </div>
    </div>
  )
}
