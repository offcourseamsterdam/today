import { useState } from 'react'
import { X, Check } from 'lucide-react'
import { normalizeWaitingOn } from '../../lib/utils'
import { WaitingBadge } from '../ui/WaitingBadge'
import { WaitingOnForm } from '../ui/WaitingOnForm'
import { CollapsibleSection } from '../ui/CollapsibleSection'
import type { Project, WaitingOn } from '../../types'

interface ProjectModalWaitingProps {
  project: Project
  updateProject: (id: string, updates: Partial<Project>) => void
}

export function ProjectModalWaiting({ project, updateProject }: ProjectModalWaitingProps) {
  const [editingWaiting, setEditingWaiting] = useState(false)
  const [waitingPerson, setWaitingPerson] = useState('')
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editingValue, setEditingValue] = useState('')

  const waitingEntries = normalizeWaitingOn(project.waitingOn)
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

  function handleStartEdit(index: number) {
    setEditingIndex(index)
    setEditingValue(waitingEntries[index].person)
  }

  function handleSaveEdit() {
    if (editingIndex === null || !editingValue.trim()) return
    const updated = waitingEntries.map((e, i) =>
      i === editingIndex ? { ...e, person: editingValue.trim() } : e
    )
    updateProject(project.id, { waitingOn: updated })
    setEditingIndex(null)
    setEditingValue('')
  }

  function handleCancelEdit() {
    setEditingIndex(null)
    setEditingValue('')
  }

  return (
    <>
      {/* Waiting entries list — visible for 'waiting' and 'backlog' with entries */}
      {(isWaiting || isBacklog) && waitingEntries.length > 0 && (
        <div className="py-3 border-t border-border">
          <CollapsibleSection
            title="Waiting On"
            badge={project.waitingOn?.length || undefined}
            defaultOpen={!!project.waitingOn?.length}
          >
            <div className="space-y-2">
              {waitingEntries.map((entry, index) => {
                if (editingIndex === index) {
                  return (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        value={editingValue}
                        onChange={e => setEditingValue(e.target.value)}
                        autoFocus
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleSaveEdit()
                          if (e.key === 'Escape') handleCancelEdit()
                        }}
                        className="flex-1 px-2 py-1 rounded-[4px] border border-stone/40 bg-card
                          text-[13px] text-charcoal outline-none focus:border-stone/60 transition-colors"
                      />
                      <button
                        onClick={handleSaveEdit}
                        disabled={!editingValue.trim()}
                        className="text-stone hover:text-charcoal transition-colors disabled:opacity-30 p-0.5"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="text-stone hover:text-charcoal transition-colors p-0.5"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )
                }

                return (
                  <div key={index} className="flex items-center justify-between">
                    <button
                      onClick={() => handleStartEdit(index)}
                      className="text-[13px] text-charcoal hover:text-stone transition-colors text-left"
                    >
                      {entry.person}
                    </button>
                    <div className="flex items-center gap-2">
                      <WaitingBadge since={entry.since} shape="rounded-full" />
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

            {/* Input form — inside collapsible when entries exist */}
            {editingWaiting && (
              <div className="pt-3">
                <WaitingOnForm
                  value={waitingPerson}
                  onChange={setWaitingPerson}
                  onConfirm={handleAddWaiting}
                  onCancel={() => { setEditingWaiting(false); setWaitingPerson('') }}
                />
              </div>
            )}
          </CollapsibleSection>
        </div>
      )}

      {/* Add buttons */}
      {isInProgress && !editingWaiting && (
        <button
          onClick={() => setEditingWaiting(true)}
          className="text-[12px] text-stone hover:text-charcoal py-3 border-t border-border w-full text-left transition-colors"
        >
          Move to Waiting For...
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

      {/* Input form — outside collapsible when no entries exist yet */}
      {editingWaiting && waitingEntries.length === 0 && (
        <div className="py-3 border-t border-border">
          <WaitingOnForm
            value={waitingPerson}
            onChange={setWaitingPerson}
            onConfirm={handleAddWaiting}
            onCancel={() => { setEditingWaiting(false); setWaitingPerson('') }}
          />
        </div>
      )}
    </>
  )
}
