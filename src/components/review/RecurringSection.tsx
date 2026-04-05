import { useState } from 'react'
import { ChevronRight, ChevronDown, Trash2 } from 'lucide-react'
import { useStore } from '../../store'
import { describeRule, buildRule } from '../../lib/recurrence'
import {
  RecurrenceFrequencyPicker,
  EMPTY_RULE_STATE,
  type RecurrenceFormState,
} from '../ui/RecurrenceFrequencyPicker'
import type { RecurrenceRule } from '../../types'

interface RecurringSectionProps {
  onDeactivated: () => void
}

/** Convert a persisted RecurrenceRule into RecurrenceFormState for the picker. */
function ruleToFormState(rule: RecurrenceRule): RecurrenceFormState {
  return {
    freq: rule.frequency,
    weeklyDay: rule.frequency === 'weekly' ? (rule.customDays?.[0] ?? 1) : 1,
    monthlyDate: rule.monthlyDate ?? 1,
    monthlyWeek: rule.monthlyWeekday?.week ?? 1,
    monthlyDay: rule.monthlyWeekday?.day ?? 1,
    customDays: rule.customDays ?? [],
    annualDates: rule.annualDates ?? [],
  }
}

export function RecurringSection({ onDeactivated }: RecurringSectionProps) {
  const recurringTasks = useStore(s => s.recurringTasks)
  const updateRecurringTask = useStore(s => s.updateRecurringTask)
  const deleteRecurringTask = useStore(s => s.deleteRecurringTask)

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [formStates, setFormStates] = useState<Record<string, RecurrenceFormState>>({})

  function getFormState(taskId: string, rule?: RecurrenceRule): RecurrenceFormState {
    if (formStates[taskId]) return formStates[taskId]
    return rule ? ruleToFormState(rule) : EMPTY_RULE_STATE
  }

  function handleToggle(taskId: string) {
    if (expandedId === taskId) {
      setExpandedId(null)
    } else {
      setExpandedId(taskId)
      setConfirmDeleteId(null)
    }
  }

  function handleFormChange(taskId: string, patch: Partial<RecurrenceFormState>) {
    const current = getFormState(
      taskId,
      recurringTasks.find(t => t.id === taskId)?.recurrenceRule,
    )
    const next = { ...current, ...patch }
    setFormStates(prev => ({ ...prev, [taskId]: next }))

    const rule = buildRule(next)
    updateRecurringTask(taskId, { recurrenceRule: rule })
  }

  function handleDelete(taskId: string) {
    if (confirmDeleteId === taskId) {
      deleteRecurringTask(taskId)
      onDeactivated()
      setConfirmDeleteId(null)
      if (expandedId === taskId) setExpandedId(null)
    } else {
      setConfirmDeleteId(taskId)
    }
  }

  if (recurringTasks.length === 0) {
    return (
      <p className="text-[13px] text-stone italic">Geen recurring tasks</p>
    )
  }

  return (
    <div className="space-y-1">
      {recurringTasks.map(task => {
        const isExpanded = expandedId === task.id
        const isConfirming = confirmDeleteId === task.id
        const formState = getFormState(task.id, task.recurrenceRule)

        return (
          <div key={task.id} className="rounded-lg border border-border bg-card">
            {/* Row header */}
            <div className="flex items-center gap-2 px-3 py-2">
              <button
                type="button"
                onClick={() => handleToggle(task.id)}
                className="text-stone hover:text-charcoal transition-colors shrink-0"
              >
                {isExpanded
                  ? <ChevronDown size={14} />
                  : <ChevronRight size={14} />}
              </button>

              <button
                type="button"
                onClick={() => handleToggle(task.id)}
                className="flex-1 text-left text-[13px] text-charcoal truncate"
              >
                {task.title}
              </button>

              {task.recurrenceRule && (
                <span className="text-[10px] text-stone px-2 py-0.5 rounded-full border border-border shrink-0">
                  {describeRule(task.recurrenceRule)}
                </span>
              )}

              <button
                type="button"
                onClick={() => handleDelete(task.id)}
                className={`shrink-0 text-[11px] transition-colors ${
                  isConfirming
                    ? 'text-red-500 font-medium'
                    : 'text-stone/40 hover:text-red-400'
                }`}
                title={isConfirming ? 'Click again to confirm' : 'Delete'}
              >
                {isConfirming ? (
                  <span className="text-[10px]">Confirm?</span>
                ) : (
                  <Trash2 size={13} />
                )}
              </button>
            </div>

            {/* Expanded editor */}
            {isExpanded && (
              <div className="px-3 pb-3 pt-1 border-t border-border space-y-2">
                <RecurrenceFrequencyPicker
                  value={formState}
                  onChange={patch => handleFormChange(task.id, patch)}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
