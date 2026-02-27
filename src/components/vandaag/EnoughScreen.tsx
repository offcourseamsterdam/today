import { useStore } from '../../store'
import { getTodayQuote } from '../../lib/quotes'
import type { Task } from '../../types'
import { findTaskById } from '../../lib/taskLookup'

interface EnoughScreenProps {
  onCloseDay: () => void
  onKeepWorking: () => void
}

export function EnoughScreen({ onCloseDay, onKeepWorking }: EnoughScreenProps) {
  const projects = useStore(s => s.projects)
  const orphanTasks = useStore(s => s.orphanTasks)
  const recurringTasks = useStore(s => s.recurringTasks)
  const dailyPlan = useStore(s => s.dailyPlan)

  const quote = getTodayQuote()

  // Gather what was accomplished today
  const deepProjectId = dailyPlan?.deepBlock.projectId || ''
  const deepProject = projects.find(p => p.id === deepProjectId)

  const shortTaskIds = dailyPlan?.shortTasks || []
  const maintenanceTaskIds = dailyPlan?.maintenanceTasks || []

  const shortTasks = shortTaskIds
    .map(id => findTaskById(id, projects, orphanTasks, recurringTasks)?.task)
    .filter(Boolean) as Task[]
  const maintenanceTasks = maintenanceTaskIds
    .map(id => findTaskById(id, projects, orphanTasks, recurringTasks)?.task)
    .filter(Boolean) as Task[]

  const totalItems = (deepProject ? 1 : 0) + shortTasks.length + maintenanceTasks.length

  return (
    <div className="fixed inset-0 z-50 bg-citadel-bg flex items-center justify-center animate-fade-in">
      <div className="max-w-[520px] w-full px-6 text-center">
        {/* The word */}
        <h1 className="font-serif text-[64px] text-citadel-text tracking-[-0.03em] mb-8">
          Enough.
        </h1>

        {/* What you did */}
        {totalItems > 0 && (
          <div className="mb-10">
            <div className="text-[11px] uppercase tracking-[0.1em] text-citadel-text/30 mb-4">
              Today you worked on
            </div>

            <div className="space-y-2 text-left max-w-[360px] mx-auto">
              {/* Deep block */}
              {deepProject && (
                <div className="flex items-center gap-3 py-2">
                  <span className="w-2 h-2 rounded-full bg-citadel-accent flex-shrink-0" />
                  <span className="text-[14px] text-citadel-text/80 font-serif">
                    {deepProject.title}
                  </span>
                  <span className="text-[10px] text-citadel-text/25 ml-auto uppercase tracking-wider">
                    deep work
                  </span>
                </div>
              )}

              {/* Short tasks */}
              {shortTasks.map(task => (
                <div key={task.id} className="flex items-center gap-3 py-1.5">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0
                    ${task.status === 'done' ? 'bg-citadel-accent/60' : 'bg-citadel-text/15'}`} />
                  <span className={`text-[13px]
                    ${task.status === 'done'
                      ? 'text-citadel-text/60'
                      : 'text-citadel-text/30'}`}>
                    {task.title}
                  </span>
                </div>
              ))}

              {/* Maintenance tasks */}
              {maintenanceTasks.map(task => (
                <div key={task.id} className="flex items-center gap-3 py-1.5">
                  <span className="w-2 h-2 rounded-full bg-citadel-text/10 flex-shrink-0" />
                  <span className="text-[13px] text-citadel-text/40">
                    {task.title}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Burkeman quote */}
        <div className="mb-12 px-4">
          <p className="text-[15px] text-citadel-text/40 italic font-serif leading-relaxed">
            &ldquo;{quote.text}&rdquo;
          </p>
          {quote.source && (
            <p className="text-[11px] text-citadel-text/20 mt-3">
              Oliver Burkeman &mdash; {quote.source}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={onCloseDay}
            className="px-8 py-3 rounded-[8px] bg-citadel-accent/20 text-citadel-accent
              text-[14px] font-medium hover:bg-citadel-accent/30 transition-all"
          >
            Close the day
          </button>
          <button
            onClick={onKeepWorking}
            className="text-[12px] text-citadel-text/25 hover:text-citadel-text/40 transition-colors py-2"
          >
            Keep working
          </button>
        </div>
      </div>
    </div>
  )
}
