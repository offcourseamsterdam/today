import { CATEGORY_CONFIG, type Project, type Task, type Meeting } from '../../types'
import { CategoryBadge } from '../ui/CategoryBadge'
import { Clock } from 'lucide-react'

interface PlanningDragOverlayProps {
  activeType: 'project' | 'task' | 'meeting' | 'tier-block' | null
  project?: Project | null
  task?: { task: Task; projectTitle?: string } | null
  meeting?: Meeting | null
}

export function PlanningDragOverlay({ activeType, project, task, meeting }: PlanningDragOverlayProps) {
  if (activeType === 'project' && project) {
    const catConfig = CATEGORY_CONFIG[project.category]
    return (
      <div className="rotate-2 scale-105">
        <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-[10px] bg-white border border-[#E8E4DD] shadow-lg w-[280px] cursor-grabbing">
          {project.coverImageUrl ? (
            <div className="w-8 h-8 rounded-[4px] overflow-hidden flex-shrink-0">
              <img src={project.coverImageUrl} alt="" className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-[4px] flex-shrink-0" style={{ background: catConfig.bg }} />
          )}
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium text-[#2A2724] truncate">{project.title}</div>
            <div className="mt-0.5">
              <CategoryBadge category={project.category} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (activeType === 'task' && task) {
    return (
      <div className="rotate-1 scale-105">
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-[8px] bg-white border border-[#E8E4DD] shadow-lg w-[260px] cursor-grabbing">
          <span className="w-1.5 h-1.5 rounded-full bg-[#2A2724]/30 flex-shrink-0" />
          <span className="text-[13px] text-[#2A2724] flex-1 min-w-0 truncate">{task.task.title}</span>
          {task.projectTitle && (
            <span className="text-[10px] text-[#7A746A]/50 flex-shrink-0">{task.projectTitle}</span>
          )}
        </div>
      </div>
    )
  }

  if (activeType === 'meeting' && meeting) {
    return (
      <div className="rotate-1 scale-105">
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-[8px] bg-white border border-[#E8E4DD] shadow-lg w-[260px] cursor-grabbing">
          <Clock size={13} className="text-[#7A746A] flex-shrink-0" />
          <span className="text-[11px] text-[#7A746A]/60 font-mono flex-shrink-0 w-10">{meeting.time}</span>
          <span className="text-[13px] text-[#2A2724] flex-1 truncate">{meeting.title}</span>
          <span className="text-[10px] text-[#7A746A]/50 flex-shrink-0">{meeting.durationMinutes}m</span>
        </div>
      </div>
    )
  }

  return null
}
