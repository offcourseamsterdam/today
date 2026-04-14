import { useState } from 'react'
import { RotateCcw, Trash2, ArrowRight } from 'lucide-react'
import { useStore } from '../../store'
import { useMeetingForm } from '../../hooks/useMeetingForm'
import { AgendaItemEditor } from './AgendaItemEditor'
import { RecurrenceFrequencyPicker } from '../ui/RecurrenceFrequencyPicker'
import { formatDuration } from '../../lib/formatting'

const DURATION_PRESETS = [15, 30, 60, 90, 120, 150, 180, 240, 300, 360, 480]

interface MeetingSetupPanelProps {
  openMeetingId: string // 'new' or existing meeting id
}

export function MeetingSetupPanel({ openMeetingId }: MeetingSetupPanelProps) {
  const meetings = useStore(s => s.meetings)
  const recurringMeetings = useStore(s => s.recurringMeetings)
  const projects = useStore(s => s.projects)
  const addMeeting = useStore(s => s.addMeeting)
  const updateMeeting = useStore(s => s.updateMeeting)
  const deleteMeeting = useStore(s => s.deleteMeeting)
  const addRecurringMeeting = useStore(s => s.addRecurringMeeting)
  const updateRecurringMeeting = useStore(s => s.updateRecurringMeeting)
  const deleteRecurringMeeting = useStore(s => s.deleteRecurringMeeting)
  const addMeetingToPlan = useStore(s => s.addMeetingToPlan)
  const startMeetingSession = useStore(s => s.startMeetingSession)
  const spawnRecurringOccurrence = useStore(s => s.spawnRecurringOccurrence)
  const setOpenMeetingId = useStore(s => s.setOpenMeetingId)
  const setLiveMeetingOpen = useStore(s => s.setLiveMeetingOpen)

  const isNew = openMeetingId === 'new'
  const existingMeeting = isNew
    ? undefined
    : meetings.find(m => m.id === openMeetingId) ??
      recurringMeetings.find(m => m.id === openMeetingId)
  const isInRecurring = !!existingMeeting && recurringMeetings.some(m => m.id === existingMeeting.id)

  const { form, actions, buildMeetingData, isValid } = useMeetingForm(openMeetingId, isNew, existingMeeting)
  const [showRecurring, setShowRecurring] = useState(form.isRecurring)

  // ── Save helpers ────────────────────────────────────────────────────────────

  function persistMeeting(): string {
    const data = buildMeetingData()
    if (isNew) {
      const id = data.isRecurring ? addRecurringMeeting(data) : addMeeting(data)
      addMeetingToPlan(id)
      return id
    } else if (existingMeeting) {
      if (isInRecurring) updateRecurringMeeting(existingMeeting.id, data)
      else updateMeeting(existingMeeting.id, data)
      return existingMeeting.id
    }
    return ''
  }

  function handleSaveForLater() {
    if (!isValid) return
    persistMeeting()
    setOpenMeetingId(null)
  }

  function handleBeginMeeting() {
    if (!isValid) return
    const id = persistMeeting()
    if (id) {
      // For recurring templates, spawn a concrete occurrence for today and run on that
      const willBeRecurring = isInRecurring || (isNew && form.isRecurring)
      const sessionId = willBeRecurring ? spawnRecurringOccurrence(id) : id
      setOpenMeetingId(null)
      startMeetingSession(sessionId)
      setLiveMeetingOpen(true)
    }
  }

  function handleDelete() {
    if (!existingMeeting) return
    if (isInRecurring) deleteRecurringMeeting(existingMeeting.id)
    else deleteMeeting(existingMeeting.id)
    setOpenMeetingId(null)
  }

  return (
    <div className="flex flex-col h-full border-r border-border">
      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">

        {/* Header label */}
        <div>
          <div className="text-[10px] uppercase tracking-[0.1em] text-stone/35 font-medium mb-3">
            {isNew ? 'New meeting' : 'Edit meeting'}
          </div>
          {/* Title — large serif, auto-focused */}
          <input
            type="text"
            value={form.title}
            onChange={e => actions.setTitle(e.target.value)}
            placeholder="Meeting title or subject..."
            autoFocus
            className="w-full bg-transparent font-serif text-[24px] text-charcoal
              placeholder:text-stone/20 outline-none border-none leading-tight"
          />
        </div>

        {/* Date + Time */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-[10px] uppercase tracking-[0.08em] text-stone/40 font-medium mb-1 block">
              Date <span className="normal-case text-stone/25">(optional)</span>
            </label>
            <input
              type="date"
              value={form.date}
              onChange={e => actions.setDate(e.target.value)}
              className="w-full px-3 py-2 rounded-[6px] border border-border bg-canvas
                text-[12px] text-charcoal outline-none focus:border-stone/40 transition-colors"
            />
          </div>
          <div className="flex-1">
            <label className="text-[10px] uppercase tracking-[0.08em] text-stone/40 font-medium mb-1 block">
              Time
            </label>
            <input
              type="time"
              value={form.time}
              onChange={e => actions.setTime(e.target.value)}
              className="w-full px-3 py-2 rounded-[6px] border border-border bg-canvas
                text-[12px] text-charcoal outline-none focus:border-stone/40 transition-colors"
            />
          </div>
        </div>

        {/* Duration */}
        <div>
          <label className="text-[10px] uppercase tracking-[0.08em] text-stone/40 font-medium mb-1.5 block">
            Duration
          </label>
          <div className="flex flex-wrap gap-1">
            {DURATION_PRESETS.map(d => (
              <button
                key={d}
                type="button"
                onClick={() => actions.setDurationMinutes(d)}
                className={`text-[10px] px-2.5 py-1.5 rounded-[4px] border transition-all
                  ${form.durationMinutes === d
                    ? 'border-charcoal bg-charcoal text-canvas'
                    : 'border-border text-stone hover:border-stone/40'}`}
              >
                {formatDuration(d)}
              </button>
            ))}
          </div>
        </div>

        {/* Project */}
        <div>
          <label className="text-[10px] uppercase tracking-[0.08em] text-stone/40 font-medium mb-1 block">
            Linked project
            {!form.isRecurring && (
              <span className="normal-case tracking-normal text-stone/25 ml-1.5 font-normal">optional</span>
            )}
            {form.isRecurring && !form.projectId && (
              <span className="normal-case tracking-normal text-amber-500/70 ml-1.5 font-normal">required for recurring</span>
            )}
          </label>
          <select
            value={form.projectId}
            onChange={e => actions.setProjectId(e.target.value)}
            className="w-full px-3 py-2 rounded-[6px] border border-border bg-canvas
              text-[12px] text-charcoal outline-none focus:border-stone/40 transition-colors
              appearance-none cursor-pointer"
          >
            <option value="">No project</option>
            {[...projects]
              .sort((a, b) => {
                const order = { in_progress: 0, waiting: 1, backlog: 2, done: 3 }
                return (order[a.status] ?? 9) - (order[b.status] ?? 9)
              })
              .map(p => (
                <option key={p.id} value={p.id}>
                  {p.title}{p.status === 'in_progress' ? ' ●' : ''}
                </option>
              ))}
          </select>
        </div>

        {/* Location */}
        <div>
          <label className="text-[10px] uppercase tracking-[0.08em] text-stone/40 font-medium mb-1 block">
            Location / link
          </label>
          <input
            type="text"
            value={form.location}
            onChange={e => actions.setLocation(e.target.value)}
            placeholder="Office, Zoom link, etc."
            className="w-full px-3 py-2 rounded-[6px] border border-border bg-canvas
              text-[12px] text-charcoal placeholder:text-stone/30
              outline-none focus:border-stone/40 transition-colors"
          />
        </div>

        {/* Context */}
        <div>
          <label className="text-[10px] uppercase tracking-[0.08em] text-stone/40 font-medium mb-1 block">
            Context for AI notes
            <span className="normal-case tracking-normal text-stone/25 ml-1.5 font-normal">optional</span>
          </label>
          <textarea
            value={form.context}
            onChange={e => actions.setContext(e.target.value)}
            placeholder="Who's attending, background, what to focus on..."
            rows={2}
            className="w-full px-3 py-2 rounded-[6px] border border-border bg-canvas
              text-[12px] text-charcoal placeholder:text-stone/30 resize-none
              outline-none focus:border-stone/40 transition-colors"
          />
        </div>

        {/* Agenda */}
        <div>
          <div className="text-[10px] uppercase tracking-[0.08em] text-stone/40 font-medium mb-3">
            Agenda
          </div>
          {form.agendaItems.length === 0 ? (
            <button
              type="button"
              onClick={() => actions.setAgendaItems([{ id: crypto.randomUUID(), title: '' }])}
              className="text-[12px] text-stone/35 hover:text-stone transition-colors"
            >
              + Add agenda item
            </button>
          ) : (
            <AgendaItemEditor items={form.agendaItems} onChange={actions.setAgendaItems} />
          )}
        </div>

        {/* Recurring */}
        <div className="border-t border-border/40 pt-4">
          <button
            type="button"
            onClick={() => {
              const next = !form.isRecurring
              actions.setIsRecurring(next)
              setShowRecurring(next)
            }}
            className="flex items-center gap-2 text-[12px] text-stone hover:text-charcoal transition-colors"
          >
            <RotateCcw
              size={11}
              className={form.isRecurring ? 'text-charcoal' : 'text-stone/30'}
            />
            {form.isRecurring ? 'Recurring meeting' : 'Make recurring'}
          </button>
          {showRecurring && form.isRecurring && (
            <div className="mt-3 animate-slide-up">
              <RecurrenceFrequencyPicker
                value={form.ruleState}
                onChange={patch => actions.setRuleState(prev => ({ ...prev, ...patch }))}
              />
            </div>
          )}
        </div>
      </div>

      {/* Footer actions */}
      <div className="px-6 py-4 border-t border-border/50 flex items-center gap-2">
        {/* Delete (edit mode only) */}
        {!isNew && existingMeeting && (
          <button
            onClick={handleDelete}
            className="flex items-center gap-1.5 text-[11px] text-red-400/70 hover:text-red-500 transition-colors mr-auto"
          >
            <Trash2 size={11} />
            Delete
          </button>
        )}

        {isNew && <div className="flex-1" />}

        <button
          type="button"
          onClick={handleSaveForLater}
          disabled={!isValid}
          className="px-3 py-1.5 text-[12px] text-stone hover:text-charcoal
            border border-border hover:border-stone/30 rounded-[6px] transition-all
            disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Save for later
        </button>

        <button
          type="button"
          onClick={handleBeginMeeting}
          disabled={!isValid}
          className="flex items-center gap-1.5 px-4 py-1.5 text-[12px] font-medium
            text-canvas bg-charcoal rounded-[6px] hover:bg-charcoal/85 transition-all
            disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Begin meeting
          <ArrowRight size={11} />
        </button>
      </div>
    </div>
  )
}
