import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { X, GripVertical, RotateCcw, Clock, AlertTriangle } from 'lucide-react'
import { useStore } from '../../store'
import { CATEGORY_CONFIG, type Project } from '../../types'
import { CategoryBadge } from '../ui/CategoryBadge'
import { findTaskById } from '../../lib/taskLookup'

type TierId = 'deep' | 'short' | 'maintenance'

interface TierDropZoneProps {
  tierId: TierId
  // Deep block
  deepProjectId?: string
  deepMeetingId?: string
  intention?: string
  onIntentionChange?: (v: string) => void
  // Short
  shortTaskIds?: string[]
  shortProjectIds?: string[]
  shortMeetingIds?: string[]
  // Maintenance
  mainTaskIds?: string[]
  mainProjectIds?: string[]
  mainMeetingIds?: string[]
  // Overdue recurring
  overdueRecurringTasks?: { id: string; title: string }[]
  recurringNotAdded?: { id: string; title: string }[]
  onAutoPopulateRecurring?: () => void
  onCarryOverOverdue?: () => void
  onAddRecurringTask?: (id: string) => void
  // Quick-add
  onQuickAdd?: (title: string) => void
  // Shared
  onRemoveItem: (type: 'project' | 'task' | 'meeting', id: string) => void
  // DnD hover state from parent
  isItemOver?: boolean
  hoverValid?: boolean
  // Planning day
  day?: 'today' | 'tomorrow'
}

const TIER_CONFIG = {
  deep: { label: 'DEEP BLOCK', subtitle: 'Your best energy on one project', maxSlots: 1 },
  short: { label: 'SHORT THREE', subtitle: 'Quick wins & context switches', maxSlots: 3 },
  maintenance: { label: 'MAINTENANCE', subtitle: 'The recurring work that keeps life running', maxSlots: undefined },
} as const

// ─── Item rendered inside a tier ────────────────────────────────
function TierItem({ type, label, sublabel, onRemove }: { type: 'project' | 'task' | 'meeting'; label: string; sublabel?: string; onRemove: () => void }) {
  const icon = type === 'meeting'
    ? <Clock size={12} className="text-[#7A746A]/60 flex-shrink-0" />
    : type === 'project'
      ? <div className="w-1.5 h-1.5 rounded-sm bg-[#2A2724]/40 flex-shrink-0" />
      : <span className="w-1.5 h-1.5 rounded-full bg-[#E8E4DD] flex-shrink-0" />

  return (
    <div className="flex items-center gap-2.5 px-3 py-2 rounded-[8px] border border-[#E8E4DD] bg-white group
      animate-[scale-in_200ms_ease-out]">
      {icon}
      <span className="text-[13px] text-[#2A2724] flex-1 min-w-0 truncate">{label}</span>
      {sublabel && (
        <span className="text-[10px] text-[#7A746A]/50 flex-shrink-0">{sublabel}</span>
      )}
      <button
        onClick={onRemove}
        className="text-[#7A746A]/30 hover:text-[#7A746A] transition-colors flex-shrink-0
          opacity-0 group-hover:opacity-100"
      >
        <X size={13} />
      </button>
    </div>
  )
}

// ─── Deep block project card ────────────────────────────────────
function DeepProjectCard({ project, onRemove }: { project: Project; onRemove: () => void }) {
  const catConfig = CATEGORY_CONFIG[project.category]
  return (
    <div className="flex items-center gap-3 px-3.5 py-3 rounded-[8px] border border-[#2A2724]/20 bg-white group
      animate-[scale-in_200ms_ease-out]">
      {project.coverImageUrl ? (
        <div className="w-10 h-10 rounded-[6px] overflow-hidden flex-shrink-0">
          <img src={project.coverImageUrl} alt="" className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="w-10 h-10 rounded-[6px] flex-shrink-0" style={{ background: catConfig.bg }} />
      )}
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-medium text-[#2A2724] truncate">{project.title}</div>
        <div className="mt-0.5">
          <CategoryBadge category={project.category} />
        </div>
      </div>
      <button
        onClick={onRemove}
        className="text-[#7A746A]/30 hover:text-[#7A746A] transition-colors flex-shrink-0
          opacity-0 group-hover:opacity-100"
      >
        <X size={14} />
      </button>
    </div>
  )
}

// ─── Drop Ghost ─────────────────────────────────────────────────
function DropGhost({ height = 44 }: { height?: number }) {
  return (
    <div
      className="rounded-[8px] border-2 border-dashed border-[#2A2724]/20 transition-all duration-150
        animate-[fadeUpIn_150ms_ease-out]"
      style={{ height }}
    />
  )
}

// ─── Main TierDropZone ──────────────────────────────────────────
export function TierDropZone(props: TierDropZoneProps) {
  const {
    tierId,
    deepProjectId, deepMeetingId, intention, onIntentionChange,
    shortTaskIds = [], shortProjectIds = [], shortMeetingIds = [],
    mainTaskIds = [], mainProjectIds = [], mainMeetingIds = [],
    overdueRecurringTasks = [], recurringNotAdded = [],
    onAutoPopulateRecurring, onCarryOverOverdue, onAddRecurringTask,
    onQuickAdd,
    onRemoveItem,
    isItemOver = false, hoverValid = true,
    day = 'tomorrow',
  } = props

  const projects = useStore(s => s.projects)
  const orphanTasks = useStore(s => s.orphanTasks)
  const recurringTasks = useStore(s => s.recurringTasks)
  const allMeetings = useStore(s => s.meetings)
  const recurringMeetingsList = useStore(s => s.recurringMeetings)
  const allMeetingsList = [...allMeetings, ...recurringMeetingsList]

  const [quickAdd, setQuickAdd] = useState('')

  const { setNodeRef: setDropRef, isOver: isDropOver } = useDroppable({ id: `tier-${tierId}` })

  // Sortable for block reordering (the tier block itself is sortable)
  const {
    attributes: sortableAttrs,
    listeners: sortableListeners,
    setNodeRef: setSortableRef,
    transform: sortableTransform,
    transition: sortableTransition,
    isDragging: isTierDragging,
  } = useSortable({ id: `block-${tierId}` })

  const sortableStyle = {
    transform: CSS.Transform.toString(sortableTransform),
    transition: sortableTransition,
  }

  const config = TIER_CONFIG[tierId]
  const showDragOver = isDropOver || isItemOver
  const isValid = hoverValid
  const hasOverdue = overdueRecurringTasks.length > 0

  // Resolve items for display
  function resolveProject(id: string) {
    return projects.find(p => p.id === id)
  }
  function resolveMeeting(id: string) {
    return allMeetingsList.find(m => m.id === id)
  }
  function resolveTask(id: string) {
    return findTaskById(id, projects, orphanTasks, recurringTasks)
  }

  // Slot counting for short tier
  const meetingSlots = (durationMinutes: number) => Math.ceil(durationMinutes / 60)
  const shortUsedSlots = tierId === 'short'
    ? shortTaskIds.length + shortProjectIds.length +
      shortMeetingIds.reduce((sum, id) => {
        const m = resolveMeeting(id)
        return sum + (m ? meetingSlots(m.durationMinutes) : 1)
      }, 0)
    : 0

  function handleQuickAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!quickAdd.trim() || !onQuickAdd) return
    onQuickAdd(quickAdd.trim())
    setQuickAdd('')
  }

  // Check if tier is empty
  const isEmpty = tierId === 'deep'
    ? !deepProjectId && !deepMeetingId
    : tierId === 'short'
      ? shortTaskIds.length === 0 && shortProjectIds.length === 0 && shortMeetingIds.length === 0
      : mainTaskIds.length === 0 && mainProjectIds.length === 0 && mainMeetingIds.length === 0

  return (
    <div
      ref={(node) => {
        setSortableRef(node)
        setDropRef(node)
      }}
      style={sortableStyle}
      {...sortableAttrs}
      className={`rounded-[12px] border p-4 transition-all duration-150 relative
        ${isTierDragging ? 'shadow-xl scale-[1.02] z-10 opacity-90' : ''}
        ${showDragOver && isValid ? 'border-[#2A2724]/40 bg-[#FAF9F7]' : ''}
        ${showDragOver && !isValid ? 'border-red-200 bg-red-50/30' : ''}
        ${!showDragOver && !isTierDragging ? 'border-[#E8E4DD] bg-white' : ''}`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div
          {...sortableListeners}
          className="cursor-grab active:cursor-grabbing text-[#7A746A]/30 hover:text-[#7A746A]/60 transition-colors touch-none"
        >
          <GripVertical size={14} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] uppercase tracking-wider text-[#7A746A]/60 font-medium">
              {config.label}
            </span>
            {tierId === 'short' && (
              <span className={`text-[10px] transition-colors ${
                showDragOver && shortUsedSlots >= 3 ? 'text-amber-500 font-medium' : 'text-[#7A746A]/40'
              }`}>
                {shortUsedSlots}/{config.maxSlots} slots
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ─── DEEP BLOCK CONTENT ─── */}
      {tierId === 'deep' && (
        <div className="space-y-3">
          {deepProjectId && resolveProject(deepProjectId) && (
            <DeepProjectCard
              project={resolveProject(deepProjectId)!}
              onRemove={() => onRemoveItem('project', deepProjectId)}
            />
          )}
          {deepMeetingId && resolveMeeting(deepMeetingId) && (
            <TierItem
              type="meeting"
              label={resolveMeeting(deepMeetingId)!.title}
              sublabel={`${resolveMeeting(deepMeetingId)!.durationMinutes}m`}
              onRemove={() => onRemoveItem('meeting', deepMeetingId)}
            />
          )}
          {isEmpty && !showDragOver && (
            <div className="rounded-[8px] border border-dashed border-[#E8E4DD] py-6 text-center">
              <div className="text-[12px] text-[#7A746A]/40 italic">Drag a project here</div>
            </div>
          )}
          {showDragOver && isValid && isEmpty && <DropGhost height={64} />}

          {/* Intention input */}
          <div>
            <label className="text-[11px] uppercase tracking-wider text-[#7A746A]/60 block mb-1.5">
              What do you want to accomplish?
            </label>
            <input
              type="text"
              value={intention ?? ''}
              onChange={e => onIntentionChange?.(e.target.value)}
              placeholder="e.g. Finish the landing page copy"
              className="w-full px-3 py-2.5 rounded-[8px] border border-[#E8E4DD] bg-[#FAF9F7]
                text-[13px] text-[#2A2724] placeholder:text-[#7A746A]/40
                outline-none focus:border-[#2A2724]/30 transition-colors"
            />
          </div>
        </div>
      )}

      {/* ─── SHORT THREE CONTENT ─── */}
      {tierId === 'short' && (
        <div className="space-y-2">
          {shortProjectIds.map(id => {
            const proj = resolveProject(id)
            if (!proj) return null
            return (
              <TierItem key={id} type="project" label={proj.title} onRemove={() => onRemoveItem('project', id)} />
            )
          })}
          {shortTaskIds.map(id => {
            const found = resolveTask(id)
            if (!found) return null
            return (
              <TierItem
                key={id}
                type="task"
                label={found.task.title}
                sublabel={found.projectTitle}
                onRemove={() => onRemoveItem('task', id)}
              />
            )
          })}
          {shortMeetingIds.map(id => {
            const m = resolveMeeting(id)
            if (!m) return null
            return (
              <TierItem
                key={id}
                type="meeting"
                label={m.title}
                sublabel={`${m.time} · ${m.durationMinutes}m`}
                onRemove={() => onRemoveItem('meeting', id)}
              />
            )
          })}
          {isEmpty && !showDragOver && (
            <div className="rounded-[8px] border border-dashed border-[#E8E4DD] py-4 text-center">
              <div className="text-[12px] text-[#7A746A]/40 italic">Drag tasks or projects here</div>
            </div>
          )}
          {showDragOver && isValid && shortUsedSlots < 3 && <DropGhost height={44} />}
        </div>
      )}

      {/* ─── MAINTENANCE CONTENT ─── */}
      {tierId === 'maintenance' && (
        <div className="space-y-2">
          {/* Overdue recurring banner */}
          {hasOverdue && (
            <div className="rounded-[8px] border border-amber-200 bg-amber-50 p-3 space-y-2 mb-2">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                  <AlertTriangle size={13} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <div className="text-[12px] font-medium text-amber-800">
                      {overdueRecurringTasks.length} recurring task{overdueRecurringTasks.length !== 1 ? 's' : ''} not done today
                    </div>
                    <div className="text-[11px] text-amber-600/80 mt-0.5">
                      Starting here — carry them over to get back on track.
                    </div>
                  </div>
                </div>
                <button
                  onClick={onCarryOverOverdue}
                  className="text-[11px] text-amber-700 border border-amber-300 rounded px-2 py-1
                    hover:bg-amber-100 transition-colors whitespace-nowrap flex-shrink-0"
                >
                  Carry all over
                </button>
              </div>
              <div className="space-y-1">
                {overdueRecurringTasks.map(t => (
                  <div key={t.id} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <RotateCcw size={11} className="text-amber-500/60 flex-shrink-0" />
                      <span className="text-[12px] text-amber-800 truncate">{t.title}</span>
                    </div>
                    <button
                      onClick={() => onAddRecurringTask?.(t.id)}
                      className="text-[11px] text-amber-600 hover:text-amber-800 transition-colors flex-shrink-0"
                    >
                      + add
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Auto-populate button */}
          {recurringNotAdded && recurringNotAdded.length > 0 && (
            <button
              onClick={onAutoPopulateRecurring}
              className="flex items-center gap-1.5 text-[11px] text-[#7A746A]
                px-2.5 py-1.5 rounded border border-[#E8E4DD]
                hover:border-[#7A746A]/30 hover:text-[#2A2724] transition-all w-full justify-center"
            >
              <RotateCcw size={11} />
              Add {recurringNotAdded.length} {day === 'tomorrow' ? "tomorrow's" : "today's"} recurring
            </button>
          )}

          {/* Items */}
          {mainProjectIds.map(id => {
            const proj = resolveProject(id)
            if (!proj) return null
            return (
              <TierItem key={id} type="project" label={proj.title} onRemove={() => onRemoveItem('project', id)} />
            )
          })}
          {mainTaskIds.map(id => {
            const found = resolveTask(id)
            if (!found) return null
            return (
              <TierItem
                key={id}
                type="task"
                label={found.task.title}
                sublabel={found.projectTitle}
                onRemove={() => onRemoveItem('task', id)}
              />
            )
          })}
          {mainMeetingIds.map(id => {
            const m = resolveMeeting(id)
            if (!m) return null
            return (
              <TierItem
                key={id}
                type="meeting"
                label={m.title}
                sublabel={`${m.time} · ${m.durationMinutes}m`}
                onRemove={() => onRemoveItem('meeting', id)}
              />
            )
          })}

          {isEmpty && !hasOverdue && !showDragOver && (
            <div className="rounded-[8px] border border-dashed border-[#E8E4DD] py-4 text-center">
              <div className="text-[12px] text-[#7A746A]/40 italic">
                The recurring work that keeps life running
              </div>
            </div>
          )}
          {showDragOver && isValid && <DropGhost height={44} />}

          {/* Quick-add */}
          <form onSubmit={handleQuickAdd} className="flex items-center gap-2 mt-2">
            <input
              type="text"
              value={quickAdd}
              onChange={e => setQuickAdd(e.target.value)}
              placeholder="Add maintenance task..."
              className="flex-1 px-3 py-2 rounded-[6px] border border-[#E8E4DD] bg-[#FAF9F7]
                text-[12px] text-[#2A2724] placeholder:text-[#7A746A]/40
                outline-none focus:border-[#2A2724]/30 transition-colors"
            />
            <button
              type="submit"
              disabled={!quickAdd.trim()}
              className="px-3 py-2 rounded-[6px] border border-[#E8E4DD]
                text-[12px] text-[#7A746A] hover:border-[#2A2724]/30 hover:text-[#2A2724]
                transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Add
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
