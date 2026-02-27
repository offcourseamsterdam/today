import { useState } from 'react'
import { X } from 'lucide-react'
import { useStore } from '../../store'
import { TaskCheckbox } from '../ui/TaskCheckbox'
import { daysSince, getWaitingStatus, getWaitingLabel } from '../../lib/utils'

export function ResolveWaitingModal() {
  const projects = useStore(s => s.projects)
  const resolveWaitingProjectId = useStore(s => s.resolveWaitingProjectId)
  const setResolveWaitingProjectId = useStore(s => s.setResolveWaitingProjectId)
  const updateProject = useStore(s => s.updateProject)

  const [checkedIndices, setCheckedIndices] = useState<Set<number>>(new Set())

  if (!resolveWaitingProjectId) return null

  const project = projects.find(p => p.id === resolveWaitingProjectId)
  if (!project) return null

  const entries = project.waitingOn ?? []
  const hasChecked = checkedIndices.size > 0

  function toggleIndex(i: number) {
    setCheckedIndices(prev => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  function handleConfirm() {
    const remaining = entries.filter((_, i) => !checkedIndices.has(i))
    updateProject(resolveWaitingProjectId!, {
      status: 'in_progress',
      waitingOn: remaining.length > 0 ? remaining : undefined,
    })
    setCheckedIndices(new Set())
    setResolveWaitingProjectId(null)
  }

  function handleCancel() {
    setCheckedIndices(new Set())
    setResolveWaitingProjectId(null)
  }

  const statusColors = {
    normal: { bg: 'bg-border', text: 'text-stone' },
    amber: { bg: 'bg-[var(--color-status-amber-bg)]', text: 'text-[var(--color-status-amber-text)]' },
    red: { bg: 'bg-[var(--color-status-red-bg)]', text: 'text-[var(--color-status-red-text)]' },
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={handleCancel}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-charcoal/40 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative bg-card rounded-[10px] shadow-modal p-6 w-full max-w-sm animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={handleCancel}
          className="absolute top-4 right-4 text-stone hover:text-charcoal transition-colors"
        >
          <X size={18} />
        </button>

        <h2 className="font-serif text-lg text-charcoal mb-1">Wachten op — afgerond?</h2>
        <p className="text-[12px] text-stone mb-5 truncate">{project.title}</p>

        <div className="space-y-2 mb-5">
          {entries.map((entry, i) => {
            const days = daysSince(entry.since)
            const status = getWaitingStatus(days)
            const colors = statusColors[status]
            const isChecked = checkedIndices.has(i)

            return (
              <button
                key={i}
                onClick={() => toggleIndex(i)}
                className={`w-full flex items-center gap-3 p-3 rounded-[6px] text-left
                  border transition-all duration-150
                  ${isChecked
                    ? 'border-stone/20 bg-border-light/60 opacity-60'
                    : 'border-border bg-canvas hover:border-stone/25'}`}
              >
                <TaskCheckbox
                  checked={isChecked}
                  onChange={() => toggleIndex(i)}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <span className={`text-[13px] font-medium ${isChecked ? 'line-through text-stone/50' : 'text-charcoal'}`}>
                    {entry.person}
                  </span>
                </div>
                <span className={`text-[11px] px-1.5 py-0.5 rounded-full shrink-0
                  ${colors.bg} ${colors.text}`}>
                  {getWaitingLabel(days)}
                </span>
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleConfirm}
            disabled={!hasChecked}
            className="flex-1 py-2 text-[13px] bg-charcoal text-canvas rounded-[6px]
              hover:bg-charcoal/90 transition-colors disabled:opacity-40"
          >
            Klaar
          </button>
          <button
            onClick={handleCancel}
            className="flex-1 py-2 text-[13px] text-stone border border-border rounded-[6px]
              hover:text-charcoal hover:border-stone/30 transition-colors"
          >
            Annuleer
          </button>
        </div>
      </div>
    </div>
  )
}
