import { useState } from 'react'
import { X } from 'lucide-react'
import { useStore } from '../../store'
import { buildRule } from '../../lib/recurrence'
import {
  RecurrenceFrequencyPicker,
  type RecurrenceFormState,
  EMPTY_RULE_STATE,
} from '../ui/RecurrenceFrequencyPicker'

interface AddRecurringTaskModalProps {
  onClose: () => void
}

export function AddRecurringTaskModal({ onClose }: AddRecurringTaskModalProps) {
  const addRecurringTask = useStore(s => s.addRecurringTask)
  const projects = useStore(s => s.projects)

  const [title, setTitle] = useState('')
  const [form, setForm] = useState<RecurrenceFormState>(EMPTY_RULE_STATE)
  const [projectId, setProjectId] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    const rule = buildRule(form)
    addRecurringTask(title.trim(), rule, projectId || undefined)
    onClose()
  }

  const isDisabled = !title.trim() || (form.freq === 'custom' && form.customDays.length === 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-charcoal/40 backdrop-blur-sm" />
      <div
        className="relative bg-card rounded-[10px] shadow-modal p-6 w-full max-w-sm animate-scale-in overflow-y-auto max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-stone hover:text-charcoal transition-colors"
        >
          <X size={18} />
        </button>

        <h2 className="font-serif text-lg text-charcoal mb-5">New recurring task</h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[11px] uppercase tracking-[0.08em] text-stone font-medium mb-2">
              Task
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="What repeats?"
              autoFocus
              className="w-full px-3 py-2.5 rounded-[6px] border border-border bg-card
                text-[14px] text-charcoal placeholder:text-stone/40
                outline-none focus:border-stone/40 transition-colors"
            />
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-[0.08em] text-stone font-medium mb-2">
              Frequency
            </label>
            <RecurrenceFrequencyPicker
              value={form}
              onChange={patch => setForm(prev => ({ ...prev, ...patch }))}
            />
          </div>

          {projects.length > 0 && (
            <div>
              <label className="block text-[11px] uppercase tracking-[0.08em] text-stone font-medium mb-2">
                Project (optional)
              </label>
              <select
                value={projectId}
                onChange={e => setProjectId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-[6px] border border-border bg-card
                  text-[13px] text-charcoal outline-none focus:border-stone/40 transition-colors"
              >
                <option value="">No project</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={isDisabled}
            className="w-full py-2.5 rounded-[6px] text-[13px] font-medium
              bg-charcoal text-canvas
              hover:bg-charcoal/90 disabled:opacity-40 disabled:cursor-not-allowed
              transition-all duration-150"
          >
            Add recurring task
          </button>
        </form>
      </div>
    </div>
  )
}
