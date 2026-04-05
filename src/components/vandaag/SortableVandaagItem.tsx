import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, X, Clock, Play } from 'lucide-react'
import { useStore } from '../../store'
import { CATEGORY_CONFIG } from '../../types'
import type { PlanItem, PlanTier } from '../../types'
import { findTaskById } from '../../lib/taskLookup'
import { TaskCheckbox } from '../ui/TaskCheckbox'
import { TierBadge } from '../planning/TierBadge'
import { getFocusTimeLabel } from '../../lib/focusTime'
import { MeetingInlineCard } from '../meetings/MeetingInlineCard'

interface CitadelContext {
  tier: PlanTier
  taskId: string
  taskTitle: string
  projectTitle?: string
  projectId?: string
}

interface SortableVandaagItemProps {
  item: PlanItem
  onEnterCitadel: (ctx?: CitadelContext) => void
  onOpenMeetings?: () => void
  onRemove: (id: string) => void
  onTierChange: (id: string, newTier: 'deep' | 'short' | 'maintenance') => void
  toggleTask: (taskId: string) => void
}

export function SortableVandaagItem({
  item, onEnterCitadel, onOpenMeetings, onRemove, onTierChange, toggleTask,
}: SortableVandaagItemProps) {
  const projects = useStore(s => s.projects)
  const orphanTasks = useStore(s => s.orphanTasks)
  const recurringTasks = useStore(s => s.recurringTasks)
  const meetings = useStore(s => s.meetings)
  const recurringMeetings = useStore(s => s.recurringMeetings)
  const setOpenProjectId = useStore(s => s.setOpenProjectId)
  const focusSession = useStore(s => s.focusSession)
  const pomodoroLog = useStore(s => s.dailyPlan?.pomodoroLog) ?? []

  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: `plan-${item.id}` })

  const style = { transform: CSS.Transform.toString(transform), transition }

  // Resolve item data
  const project = item.type === 'project' ? projects.find(p => p.id === item.id) : null
  const taskResult = item.type === 'task' ? findTaskById(item.id, projects, orphanTasks, recurringTasks) : null
  const allMeetings = [...meetings, ...recurringMeetings]
  const meeting = item.type === 'meeting' ? allMeetings.find(m => m.id === item.id) : null

  if (item.type === 'project' && !project) return null
  if (item.type === 'task' && !taskResult) return null
  if (item.type === 'meeting' && !meeting) return null

  const [meetingExpanded, setMeetingExpanded] = useState(false)

  const isDeep = item.tier === 'deep'

  // Focus time info (for tasks and projects)
  const focusInfo = (item.type === 'task' || item.type === 'project')
    ? getFocusTimeLabel(item.id, item.tier, focusSession, pomodoroLog)
    : null

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`rounded-[8px] border bg-card transition-all duration-150 group
        ${isDragging ? 'shadow-lg scale-[1.02] z-10 opacity-80 border-charcoal/30' : 'border-border/50'}
        ${isDeep ? 'border-charcoal/15' : ''}`}
    >
      <div className="flex items-center gap-2 px-3 py-2.5">
        {/* Grip handle */}
        <div
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-stone/25 hover:text-stone/50
            transition-colors touch-none flex-shrink-0"
        >
          <GripVertical size={14} />
        </div>

        {/* Tier badge */}
        <TierBadge
          tier={item.tier}
          itemType={item.type}
          onChange={(newTier) => onTierChange(item.id, newTier)}
        />

        {/* ── Project content ── */}
        {item.type === 'project' && project && (
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            {isDeep && project.coverImageUrl ? (
              <div className="w-8 h-8 rounded-[5px] overflow-hidden flex-shrink-0">
                <img src={project.coverImageUrl} alt="" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div
                className="w-2 h-2 rounded-sm flex-shrink-0"
                style={{ background: CATEGORY_CONFIG[project.category].color }}
              />
            )}
            <button
              onClick={() => setOpenProjectId(project.id)}
              className="flex-1 min-w-0 text-left"
            >
              <span className={`text-charcoal truncate block ${isDeep ? 'text-[14px] font-medium' : 'text-[13px]'}`}>
                {project.title}
              </span>
            </button>
          </div>
        )}

        {/* ── Task content ── */}
        {item.type === 'task' && taskResult && (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <TaskCheckbox
              size="sm"
              checked={taskResult.task.status === 'done'}
              onChange={() => toggleTask(item.id)}
              color={taskResult.task.projectId
                ? `var(--color-cat-${projects.find(p => p.id === taskResult.task.projectId)?.category ?? 'personal'})`
                : undefined}
            />
            <span className={`text-[13px] flex-1 min-w-0 truncate
              ${taskResult.task.status === 'done' ? 'text-stone/40 line-through' : 'text-charcoal'}`}>
              {taskResult.task.title}
            </span>
            {taskResult.projectTitle && (
              <span className="text-[10px] text-stone/40 flex-shrink-0 truncate max-w-[100px]">
                {taskResult.projectTitle}
              </span>
            )}
          </div>
        )}

        {/* ── Meeting content ── */}
        {item.type === 'meeting' && meeting && (
          <button
            onClick={() => setMeetingExpanded(prev => !prev)}
            className="flex items-center gap-2 flex-1 min-w-0 text-left"
          >
            <Clock size={12} className="text-stone/50 flex-shrink-0" />
            <span className="text-[11px] text-stone/50 flex-shrink-0">{meeting.time}</span>
            <span className="text-[13px] text-charcoal flex-1 min-w-0 truncate">{meeting.title}</span>
            <span className="text-[10px] text-stone/30 flex-shrink-0">
              {meeting.durationMinutes < 60 ? `${meeting.durationMinutes}m` : `${meeting.durationMinutes / 60}h`}
            </span>
          </button>
        )}

        {/* Focus time button */}
        {focusInfo && !focusInfo.isComplete && (
          <button
            onClick={() => {
              if (item.type === 'project' && project) {
                onEnterCitadel(isDeep ? undefined : { tier: item.tier, taskId: item.id, taskTitle: project.title, projectId: project.id })
              } else if (item.type === 'task' && taskResult) {
                onEnterCitadel({ tier: item.tier, taskId: item.id, taskTitle: taskResult.task.title, projectTitle: taskResult.projectTitle, projectId: taskResult.task.projectId })
              }
            }}
            className={`flex items-center gap-1 text-[10px] flex-shrink-0 transition-all rounded-full px-2 py-0.5
              ${focusInfo.isActive
                ? 'bg-indigo-100 text-indigo-700'
                : 'opacity-0 group-hover:opacity-60 text-stone/50 hover:text-charcoal hover:bg-border/50'}`}
          >
            <Play size={8} />
            <span className="hidden sm:inline">{focusInfo.isActive ? focusInfo.label : 'Focus'}</span>
          </button>
        )}
        {focusInfo?.isComplete && (
          <span className="text-[10px] text-green-600/60 flex-shrink-0">✓ Done</span>
        )}

        {/* Remove button */}
        <button
          onClick={() => onRemove(item.id)}
          className="text-stone/20 hover:text-stone/60 transition-colors flex-shrink-0
            opacity-0 group-hover:opacity-100"
        >
          <X size={13} />
        </button>
      </div>

      {/* Expanded meeting inline card */}
      {item.type === 'meeting' && meeting && meetingExpanded && (
        <div className="px-3 pb-3">
          <MeetingInlineCard
            meeting={meeting}
            compact
            onBeginMeeting={onOpenMeetings}
          />
        </div>
      )}
    </div>
  )
}
