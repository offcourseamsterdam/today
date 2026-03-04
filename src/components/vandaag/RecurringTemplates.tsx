import { useState } from 'react'
import { Plus, RotateCcw, Trash2, ChevronDown, Pencil } from 'lucide-react'
import { useStore } from '../../store'
import type { Task } from '../../types'
import { describeRule, buildRule, getMostRecentOccurrenceDate } from '../../lib/recurrence'
import {
  RecurrenceFrequencyPicker,
  type RecurrenceFormState,
  EMPTY_RULE_STATE,
} from '../ui/RecurrenceFrequencyPicker'

// ─── Local helpers ────────────────────────────────────────────────────────────

/** Returns true when the form has enough data to save/add. */
function isRecurringFormValid(title: string, form: RecurrenceFormState): boolean {
  if (!title.trim()) return false
  if (form.freq === 'custom' && form.customDays.length === 0) return false
  if (form.freq === 'annual_dates' && form.annualDates.length === 0) return false
  return true
}

/** Returns true when the task's most recent scheduled occurrence hasn't been completed. */
function isMissedOccurrence(task: Task): boolean {
  const mostRecent = task.recurrenceRule
    ? getMostRecentOccurrenceDate(task.recurrenceRule, new Date())
    : null
  return mostRecent !== null && (task.lastCompletedDate ?? '') < mostRecent
}

/** Unified form state for add and edit forms. */
function useRecurringForm() {
  const [title, setTitle] = useState('')
  const [form, setForm] = useState<RecurrenceFormState>(EMPTY_RULE_STATE)
  const [projectId, setProjectId] = useState<string | undefined>(undefined)

  function patch(p: Partial<RecurrenceFormState>) {
    setForm(prev => ({ ...prev, ...p }))
  }

  function reset() {
    setTitle('')
    setForm(EMPTY_RULE_STATE)
    setProjectId(undefined)
  }

  return { title, setTitle, form, patch, projectId, setProjectId, reset }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RecurringTemplates() {
  const recurringTasks = useStore(s => s.recurringTasks)
  const addRecurringTask = useStore(s => s.addRecurringTask)
  const updateRecurringTask = useStore(s => s.updateRecurringTask)
  const deleteRecurringTask = useStore(s => s.deleteRecurringTask)
  const projects = useStore(s => s.projects)

  const [showRecurring, setShowRecurring] = useState(false)
  const [showAddRecurring, setShowAddRecurring] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const addRec = useRecurringForm()
  const editRec = useRecurringForm()

  function handleAddRecurring(e: React.FormEvent) {
    e.preventDefault()
    if (!isRecurringFormValid(addRec.title, addRec.form)) return
    const rule = buildRule(addRec.form)
    addRecurringTask(addRec.title.trim(), rule, addRec.projectId)
    addRec.reset()
    setShowAddRecurring(false)
  }

  function startEdit(task: Task) {
    const rule = task.recurrenceRule!
    setEditingId(task.id)
    editRec.setTitle(task.title)
    editRec.setProjectId(task.projectId)
    editRec.patch({
      freq: rule.frequency,
      weeklyDay: rule.customDays?.[0] ?? 1,
      monthlyDate: rule.monthlyDate ?? 1,
      monthlyWeek: rule.monthlyWeekday?.week ?? 1,
      monthlyDay: rule.monthlyWeekday?.day ?? 1,
      customDays: rule.customDays ?? [],
      annualDates: rule.annualDates ?? [],
    })
  }

  function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!isRecurringFormValid(editRec.title, editRec.form) || !editingId) return
    const rule = buildRule(editRec.form)
    updateRecurringTask(editingId, { title: editRec.title.trim(), recurrenceRule: rule, projectId: editRec.projectId })
    setEditingId(null)
    editRec.reset()
  }

  return (
    <div className="border-t border-border/40 pt-3">
      <button
        onClick={() => setShowRecurring(v => !v)}
        className="flex items-center gap-2 w-full text-left group"
      >
        <RotateCcw size={12} className="text-stone/40 group-hover:text-stone transition-colors" />
        <span className="text-[10px] uppercase tracking-[0.08em] text-stone/50 group-hover:text-stone transition-colors font-medium flex-1">
          Recurring templates
          {recurringTasks.length > 0 && (
            <span className="ml-1.5 text-stone/30">{recurringTasks.length}</span>
          )}
        </span>
        <ChevronDown
          size={12}
          className={`text-stone/30 transition-transform ${showRecurring ? 'rotate-180' : ''}`}
        />
      </button>

      {showRecurring && (
        <div className="mt-3 animate-slide-up">
          {recurringTasks.length === 0 && !showAddRecurring && (
            <div className="text-[11px] text-stone/30 py-1 italic mb-2">No recurring tasks yet</div>
          )}

          <div className="space-y-0.5 mb-2">
            {recurringTasks.map(task => (
              <div key={task.id}>
                {editingId === task.id ? (
                  <form
                    onSubmit={handleSaveEdit}
                    className="p-3 rounded-[8px] bg-canvas border border-border/50 space-y-3 mb-1"
                  >
                    <input
                      type="text"
                      value={editRec.title}
                      onChange={e => editRec.setTitle(e.target.value)}
                      autoFocus
                      className="w-full text-[12px] text-charcoal placeholder:text-stone/30
                        bg-transparent border-none outline-none"
                    />

                    <RecurrenceFrequencyPicker value={editRec.form} onChange={editRec.patch} />

                    {projects.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-stone/50">Project</span>
                        <select
                          value={editRec.projectId ?? ''}
                          onChange={e => editRec.setProjectId(e.target.value || undefined)}
                          className="flex-1 text-[11px] text-charcoal bg-transparent border border-border
                            rounded px-2 py-1 outline-none focus:border-stone/40 transition-colors"
                        >
                          <option value="">No project</option>
                          {projects.map(p => (
                            <option key={p.id} value={p.id}>{p.title}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="flex gap-2 items-center pt-1">
                      <button
                        type="submit"
                        disabled={!isRecurringFormValid(editRec.title, editRec.form)}
                        className="text-[11px] px-3 py-1.5 rounded-[4px] bg-charcoal text-canvas
                          disabled:opacity-40 transition-opacity"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => { setEditingId(null); editRec.reset() }}
                        className="text-[11px] text-stone hover:text-charcoal transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-center gap-2 py-1 group">
                    {/* Missed indicator dot */}
                    {isMissedOccurrence(task) ? (
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0"
                        title="Last occurrence not completed"
                      />
                    ) : (
                      <span className="w-1.5 h-1.5 flex-shrink-0" />
                    )}
                    <span className="text-[12px] text-charcoal flex-1 leading-tight">{task.title}</span>
                    {task.projectId && (
                      <span className="text-[9px] text-stone/30 truncate max-w-[80px]">
                        {projects.find(p => p.id === task.projectId)?.title}
                      </span>
                    )}
                    <span className="text-[9px] uppercase tracking-wider text-stone/40">
                      {task.recurrenceRule ? describeRule(task.recurrenceRule) : ''}
                    </span>
                    <button
                      onClick={() => startEdit(task)}
                      className="opacity-0 group-hover:opacity-50 hover:!opacity-100 text-stone transition-all"
                    >
                      <Pencil size={11} />
                    </button>
                    <button
                      onClick={() => deleteRecurringTask(task.id)}
                      className="opacity-0 group-hover:opacity-50 hover:!opacity-100 text-stone hover:text-red transition-all"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {showAddRecurring ? (
            <form onSubmit={handleAddRecurring} className="p-3 rounded-[8px] bg-canvas border border-border/50 space-y-3">
              <input
                type="text"
                value={addRec.title}
                onChange={e => addRec.setTitle(e.target.value)}
                placeholder="Task name"
                autoFocus
                className="w-full text-[12px] text-charcoal placeholder:text-stone/30
                  bg-transparent border-none outline-none"
              />

              <RecurrenceFrequencyPicker value={addRec.form} onChange={addRec.patch} />

              {projects.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-stone/50">Project</span>
                  <select
                    value={addRec.projectId ?? ''}
                    onChange={e => addRec.setProjectId(e.target.value || undefined)}
                    className="flex-1 text-[11px] text-charcoal bg-transparent border border-border
                      rounded px-2 py-1 outline-none focus:border-stone/40 transition-colors"
                  >
                    <option value="">No project</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex gap-2 items-center pt-1">
                <button
                  type="submit"
                  disabled={!isRecurringFormValid(addRec.title, addRec.form)}
                  className="text-[11px] px-3 py-1.5 rounded-[4px] bg-charcoal text-canvas
                    disabled:opacity-40 transition-opacity"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAddRecurring(false); addRec.reset() }}
                  className="text-[11px] text-stone hover:text-charcoal transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setShowAddRecurring(true)}
              className="flex items-center gap-1.5 text-[11px] text-stone/40 hover:text-stone transition-colors"
            >
              <Plus size={12} />
              Add recurring task
            </button>
          )}
        </div>
      )}
    </div>
  )
}
