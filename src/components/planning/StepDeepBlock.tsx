import { format } from 'date-fns'
import { Calendar } from 'lucide-react'
import { useStore } from '../../store'
import { CATEGORY_CONFIG } from '../../types'
import type { AssignedCalendarEvent } from '../../types'
import { CategoryBadge } from '../ui/CategoryBadge'

interface StepDeepBlockProps {
  projectId: string
  intention: string
  onProjectChange: (id: string) => void
  onIntentionChange: (i: string) => void
  calendarDeepEvent: AssignedCalendarEvent | null
}

function formatTimeRange(start: string, end: string): string {
  const fmt = (iso: string) => format(new Date(iso), 'HH:mm')
  return `${fmt(start)} – ${fmt(end)}`
}

export function StepDeepBlock({
  projectId,
  intention,
  onProjectChange,
  onIntentionChange,
  calendarDeepEvent,
}: StepDeepBlockProps) {
  const inProgressProjects = useStore(s =>
    s.projects.filter(p => p.status === 'in_progress'),
  )

  return (
    <div className="space-y-4">
      {calendarDeepEvent ? (
        <div>
          <div className="text-[11px] uppercase tracking-wider text-[#7A746A]/60 mb-2">
            Your deep focus block
          </div>
          <div className="rounded-[8px] border border-[#E8E4DD] bg-[#FAF9F7] p-3 flex items-start gap-3">
            <Calendar size={15} className="text-[#7A746A] flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium text-[#2A2724] truncate">
                {calendarDeepEvent.event.title}
              </div>
              <div className="text-[11px] text-[#7A746A] mt-0.5">
                {formatTimeRange(calendarDeepEvent.event.start, calendarDeepEvent.event.end)}
                {' · '}
                {calendarDeepEvent.event.durationMinutes} min
              </div>
            </div>
          </div>
          <div className="text-[12px] text-[#7A746A]/60 mt-2">
            This meeting takes your deep focus block.
          </div>
        </div>
      ) : (
        <div>
          <div className="text-[11px] uppercase tracking-wider text-[#7A746A]/60 mb-3">
            Which project gets your best energy?
          </div>
          {inProgressProjects.length === 0 ? (
            <div className="text-[13px] text-[#7A746A] text-center py-6">
              No projects in progress. Add one to your kanban first.
            </div>
          ) : (
            <div className="space-y-2">
              {inProgressProjects.map(project => {
                const catConfig = CATEGORY_CONFIG[project.category]
                const isSelected = project.id === projectId
                return (
                  <button
                    key={project.id}
                    onClick={() => onProjectChange(project.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-[8px] border text-left transition-all ${
                      isSelected
                        ? 'border-[#2A2724] bg-white shadow-sm'
                        : 'border-[#E8E4DD] bg-white hover:border-[#2A2724]/30'
                    }`}
                  >
                    {project.coverImageUrl && (
                      <div className="w-9 h-9 rounded-[4px] overflow-hidden flex-shrink-0">
                        <img
                          src={project.coverImageUrl}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    {!project.coverImageUrl && (
                      <div
                        className="w-9 h-9 rounded-[4px] flex-shrink-0"
                        style={{ background: catConfig.bg }}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-[#2A2724] truncate">
                        {project.title}
                      </div>
                      <div className="mt-0.5">
                        <CategoryBadge category={project.category} />
                      </div>
                    </div>
                    {isSelected && (
                      <div className="w-2 h-2 rounded-full bg-[#2A2724] flex-shrink-0" />
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Intention input — always shown */}
      <div>
        <label className="text-[11px] uppercase tracking-wider text-[#7A746A]/60 block mb-1.5">
          What do you want to accomplish tomorrow?
        </label>
        <input
          type="text"
          value={intention}
          onChange={e => onIntentionChange(e.target.value)}
          placeholder="e.g. Finish the landing page copy"
          className="w-full px-3 py-2.5 rounded-[8px] border border-[#E8E4DD] bg-white
            text-[13px] text-[#2A2724] placeholder:text-[#7A746A]/40
            outline-none focus:border-[#2A2724]/30 transition-colors"
        />
      </div>
    </div>
  )
}
