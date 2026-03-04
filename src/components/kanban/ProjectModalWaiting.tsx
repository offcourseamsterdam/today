import { useState } from 'react'
import { X } from 'lucide-react'
import { daysSince, getWaitingStatus, getWaitingLabel } from '../../lib/utils'
import type { Project, WaitingOn } from '../../types'

interface ProjectModalWaitingProps {
  project: Project
  updateProject: (id: string, updates: Partial<Project>) => void
}

// Normalise whatever is in localStorage (old single-object or new array) to WaitingOn[]
function toArray(raw: WaitingOn[] | unknown): WaitingOn[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw as WaitingOn[]
  // Legacy: single object stored before the array migration
  const obj = raw as WaitingOn
  if (obj.person && obj.since) return [obj]
  return []
}

export function ProjectModalWaiting({ project, updateProject }: ProjectModalWaitingProps) {
  const [editingWaiting, setEditingWaiting] = useState(false)
  const [waitingPerson, setWaitingPerson] = useState('')

  const waitingEntries = toArray(project.waitingOn)
  const isBacklog = project.status === 'backlog'
  const isInProgress = project.status === 'in_progress'
  const isWaiting = project.status === 'waiting'

  function handleAddWaiting() {
    if (!waitingPerson.trim()) return
    const newEntry: WaitingOn = { person: waitingPerson.trim(), since: new Date().toISOString() }
    updateProject(project.id, {
      // Only move to 'waiting' if currently in_progress; backlog stays backlog
      ...(isInProgress ? { status: 'waiting' } : {}),
      waitingOn: [...waitingEntries, newEntry],
    })
    setEditingWaiting(false)
    setWaitingPerson('')
  }

  function handleRemoveWaiting(index: number) {
    const updated = waitingEntries.filter((_, i) => i !== index)
    if (updated.length === 0) {
      updateProject(project.id, {
        // Backlog stays backlog; waiting moves back to in_progress
        ...(isBacklog ? {} : { status: 'in_progress' }),
        waitingOn: undefined,
      })
    } else {
      updateProject(project.id, { waitingOn: updated })
    }
  }

  return (
    <>
      {/* Waiting entries list — visible for 'waiting' and 'backlog' with entries */}
      {(isWaiting || isBacklog) && waitingEntries.length > 0 && (
        <div className="py-3 border-t border-border">
          <div className="text-[11px] uppercase tracking-[0.08em] text-stone font-medium mb-2">
            Waiting on
          </div>
          <div className="space-y-2">
            {waitingEntries.map((entry, index) => {
              const waitingDays = daysSince(entry.since)
              const waitingStatus = getWaitingStatus(waitingDays)
              return (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-[13px] text-charcoal">{entry.person}</span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full
                        ${waitingStatus === 'red'
                          ? 'bg-status-red-bg text-status-red-text'
                          : waitingStatus === 'amber'
                            ? 'bg-status-amber-bg text-status-amber-text'
                            : 'bg-border-light text-stone'}`}
                    >
                      {getWaitingLabel(waitingDays)}
                    </span>
                    <button
                      onClick={() => handleRemoveWaiting(index)}
                      className="text-stone hover:text-charcoal transition-colors p-0.5"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Add buttons */}
      {isInProgress && !editingWaiting && (
        <button
          onClick={() => setEditingWaiting(true)}
          className="text-[12px] text-stone hover:text-charcoal py-3 border-t border-border w-full text-left transition-colors"
        >
          Move to Wachten Op...
        </button>
      )}

      {isBacklog && !editingWaiting && (
        <button
          onClick={() => setEditingWaiting(true)}
          className="text-[12px] text-stone hover:text-charcoal py-3 border-t border-border w-full text-left transition-colors"
        >
          {waitingEntries.length > 0 ? 'Add another...' : 'Waiting on someone?'}
        </button>
      )}

      {isWaiting && !editingWaiting && (
        <button
          onClick={() => setEditingWaiting(true)}
          className="text-[12px] text-stone hover:text-charcoal py-3 border-t border-border w-full text-left transition-colors"
        >
          Add another...
        </button>
      )}

      {/* Input form */}
      {editingWaiting && (
        <div className="py-3 border-t border-border">
          <label className="block text-[11px] uppercase tracking-[0.08em] text-stone font-medium mb-2">
            Who are you waiting on?
          </label>
          <div className="flex gap-2">
            <input
              value={waitingPerson}
              onChange={e => setWaitingPerson(e.target.value)}
              placeholder="Name or company"
              autoFocus
              className="flex-1 px-3 py-2 rounded-[6px] border border-border bg-card
                text-[13px] text-charcoal placeholder:text-stone/40
                outline-none focus:border-stone/40 transition-colors"
              onKeyDown={e => e.key === 'Enter' && handleAddWaiting()}
            />
            <button
              onClick={handleAddWaiting}
              disabled={!waitingPerson.trim()}
              className="px-3 py-2 rounded-[6px] bg-charcoal text-canvas text-[12px]
                disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
            >
              Add
            </button>
            <button
              onClick={() => { setEditingWaiting(false); setWaitingPerson('') }}
              className="px-2 text-stone hover:text-charcoal transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
