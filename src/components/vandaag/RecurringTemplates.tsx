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

export function RecurringTemplates() {
  const recurringTasks = useStore(s => s.recurringTasks)
  const addRecurringTask = useStore(s => s.addRecurringTask)
  const updateRecurringTask = useStore(s => s.updateRecurringTask)
  const deleteRecurringTask = useStore(s => s.deleteRecurringTask)
  const projects = useStore(s => s.projects)

  const [showRecurring, setShowRecurring] = useState(false)
  const [showAddRecurring, setShowAddRecurring] = useState(false)

  // Add form state
  const [newTitle, setNewTitle] = useState('')
  const [addForm, setAddForm] = useState<RecurrenceFormState>(EMPTY_RULE_STATE)
  const [addProjectId, setAddProjectId] = useState<string | undefined>(undefined)

  // Edit form state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editForm, setEditForm] = useState<RecurrenceFormState>(EMPTY_RULE_STATE)
  const [editProjectId, setEditProjectId] = useState<string | undefined>(undefined)

  function patchAdd(patch: Partial<RecurrenceFormState>) {
    setAddForm(prev => ({ ...prev, ...patch }))
  }

  function patchEdit(patch: Partial<RecurrenceFormState>) {
    setEditForm(prev => ({ ...prev, ...patch }))
  }

  function handleAddRecurring(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim()) return
    const rule = buildRule(addForm)
    addRecurringTask(newTitle.trim(), rule, addProjectId)
    setNewTitle('')
    setAddForm(EMPTY_RULE_STATE)
    setAddProjectId(undefined)
    setShowAddRecurring(false)
  }

  function startEdit(task: Task) {
    const rule = task.recurrenceRule!
    setEditingId(task.id)
    setEditTitle(task.title)
    setEditForm({
      freq: rule.frequency,
      weeklyDay: rule.customDays?.[0] ?? 1,
      monthlyDate: rule.monthlyDate ?? 1,
      monthlyWeek: rule.monthlyWeekday?.week ?? 1,
      monthlyDay: rule.monthlyWeekday?.day ?? 1,
      customDays: rule.customDays ?? [],
      annualDates: rule.annualDates ?? [],
    })
    setEditProjectId(task.projectId)
  }

  function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editTitle.trim() || !editingId) return
    const rule = buildRule(editForm)
    updateRecurringTask(editingId, { title: editTitle.trim(), recurrenceRule: rule, projectId: editProjectId })
    setEditingId(null)
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
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      autoFocus
                      className="w-full text-[12px] text-charcoal placeholder:text-stone/30
                        bg-transparent border-none outline-none"
                    />

                    <RecurrenceFrequencyPicker value={editForm} onChange={patchEdit} />

                    {projects.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-stone/50">Project</span>
                        <select
                          value={editProjectId ?? ''}
                          onChange={e => setEditProjectId(e.target.value || undefined)}
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
                        disabled={!editTitle.trim() || (editForm.freq === 'custom' && editForm.customDays.length === 0) || (editForm.freq === 'annual_dates' && editForm.annualDates.length === 0)}
                        className="text-[11px] px-3 py-1.5 rounded-[4px] bg-charcoal text-canvas
                          disabled:opacity-40 transition-opacity"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="text-[11px] text-stone hover:text-charcoal transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-center gap-2 py-1 group">
                    {/* Missed indicator dot */}
                    {(() => {
                      const mostRecent = task.recurrenceRule
                        ? getMostRecentOccurrenceDate(task.recurrenceRule, new Date())
                        : null
                      const isMissed = mostRecent !== null && (task.lastCompletedDate ?? '') < mostRecent
                      return isMissed ? (
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0"
                          title="Last occurrence not completed"
                        />
                      ) : (
                        <span className="w-1.5 h-1.5 flex-shrink-0" />
                      )
                    })()}
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
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="Task name"
                autoFocus
                className="w-full text-[12px] text-charcoal placeholder:text-stone/30
                  bg-transparent border-none outline-none"
              />

              <RecurrenceFrequencyPicker value={addForm} onChange={patchAdd} />

              {projects.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-stone/50">Project</span>
                  <select
                    value={addProjectId ?? ''}
                    onChange={e => setAddProjectId(e.target.value || undefined)}
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
                  disabled={!newTitle.trim() || (addForm.freq === 'custom' && addForm.customDays.length === 0) || (addForm.freq === 'annual_dates' && addForm.annualDates.length === 0)}
                  className="text-[11px] px-3 py-1.5 rounded-[4px] bg-charcoal text-canvas
                    disabled:opacity-40 transition-opacity"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAddRecurring(false); setNewTitle('') }}
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
