import { useState } from 'react'
import { Plus, RotateCcw, Trash2, Pencil } from 'lucide-react'
import { useStore } from '../../store'
import type { Project, Task } from '../../types'
import { describeRule, buildRule } from '../../lib/recurrence'
import {
  RecurrenceFrequencyPicker,
  type RecurrenceFormState,
  EMPTY_RULE_STATE,
} from '../ui/RecurrenceFrequencyPicker'
import { CollapsibleSection } from '../ui/CollapsibleSection'

interface ProjectModalRecurringProps {
  project: Project
}

export function ProjectModalRecurring({ project }: ProjectModalRecurringProps) {
  const recurringTasks = useStore(s => s.recurringTasks)
  const addRecurringTask = useStore(s => s.addRecurringTask)
  const updateRecurringTask = useStore(s => s.updateRecurringTask)
  const deleteRecurringTask = useStore(s => s.deleteRecurringTask)

  const projectTasks = recurringTasks.filter(t => t.projectId === project.id)

  // Add form state
  const [showAdd, setShowAdd] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [addForm, setAddForm] = useState<RecurrenceFormState>(EMPTY_RULE_STATE)

  // Edit form state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editForm, setEditForm] = useState<RecurrenceFormState>(EMPTY_RULE_STATE)

  function patchAdd(patch: Partial<RecurrenceFormState>) {
    setAddForm(prev => ({ ...prev, ...patch }))
  }

  function patchEdit(patch: Partial<RecurrenceFormState>) {
    setEditForm(prev => ({ ...prev, ...patch }))
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim()) return
    const rule = buildRule(addForm)
    addRecurringTask(newTitle.trim(), rule, project.id)
    setNewTitle('')
    setAddForm(EMPTY_RULE_STATE)
    setShowAdd(false)
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
  }

  function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editTitle.trim() || !editingId) return
    const rule = buildRule(editForm)
    updateRecurringTask(editingId, { title: editTitle.trim(), recurrenceRule: rule })
    setEditingId(null)
  }

  return (
    <div className="pt-4 border-t border-border">
      <CollapsibleSection
        title="Recurring Tasks"
        icon={<RotateCcw size={12} className="text-stone/50" />}
        defaultOpen={projectTasks.length > 0}
      >
        {/* Empty state */}
        {projectTasks.length === 0 && !showAdd && (
          <div className="text-[12px] text-stone/30 italic mb-2">
            No recurring tasks linked to this project
          </div>
        )}

        {/* Task list */}
        <div className="space-y-0.5 mb-2">
          {projectTasks.map(task => (
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

                  <div className="flex gap-2 items-center pt-1">
                    <button
                      type="submit"
                      disabled={!editTitle.trim() || (editForm.freq === 'custom' && editForm.customDays.length === 0)}
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
                  <span className="text-[12px] text-charcoal flex-1 leading-tight">{task.title}</span>
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

        {/* Add form */}
        {showAdd ? (
          <form onSubmit={handleAdd} className="p-3 rounded-[8px] bg-canvas border border-border/50 space-y-3">
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

            <div className="flex gap-2 items-center pt-1">
              <button
                type="submit"
                disabled={!newTitle.trim() || (addForm.freq === 'custom' && addForm.customDays.length === 0)}
                className="text-[11px] px-3 py-1.5 rounded-[4px] bg-charcoal text-canvas
                  disabled:opacity-40 transition-opacity"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => { setShowAdd(false); setNewTitle('') }}
                className="text-[11px] text-stone hover:text-charcoal transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1 text-[11px] text-stone/40 hover:text-stone transition-colors mt-1"
          >
            <Plus size={12} /> Add
          </button>
        )}
      </CollapsibleSection>
    </div>
  )
}
