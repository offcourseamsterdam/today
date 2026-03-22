import { format } from 'date-fns'
import { nl } from 'date-fns/locale'
import { ArrowRight } from 'lucide-react'
import { useStore } from '../../store'
import { CATEGORY_CONFIG } from '../../types'
import { findTaskById } from '../../lib/taskLookup'

interface NewDayScreenProps {
  onStart: () => void
  onPlan: () => void
}

export function NewDayScreen({ onStart, onPlan }: NewDayScreenProps) {
  const dailyPlan = useStore(s => s.dailyPlan)
  const projects = useStore(s => s.projects)
  const orphanTasks = useStore(s => s.orphanTasks)
  const recurringTasks = useStore(s => s.recurringTasks)

  const today = new Date()
  const dayName = format(today, 'EEEE', { locale: nl })
  const dateStr = format(today, 'd MMMM', { locale: nl })

  const deepBlockProject = dailyPlan?.deepBlock.projectId
    ? projects.find(p => p.id === dailyPlan!.deepBlock.projectId)
    : null

  const hasPlan = dailyPlan && (
    dailyPlan.deepBlock.projectId !== '' ||
    dailyPlan.shortTasks.length > 0 ||
    dailyPlan.maintenanceTasks.length > 0
  )

  const shortTasks = (dailyPlan?.shortTasks ?? [])
    .map(id => findTaskById(id, projects, orphanTasks, recurringTasks)?.task)
    .filter(Boolean)

  return (
    <div className="fixed inset-0 z-50 bg-canvas flex items-center justify-center animate-fade-in">
      <div className="max-w-sm w-full px-5 sm:px-8">

        {/* Date */}
        <div className="text-[11px] uppercase tracking-[0.12em] text-stone/40 mb-7 capitalize">
          {dayName}, {dateStr}
        </div>

        {hasPlan ? (
          <>
            <h1 className="font-serif text-[34px] text-charcoal tracking-[-0.02em] mb-8 leading-tight">
              Goedemorgen.
            </h1>

            {/* Deep block */}
            {deepBlockProject && (
              <div className="mb-6">
                <div className="text-[10px] uppercase tracking-[0.1em] text-stone/35 mb-2.5">Deep block</div>
                <div className="flex items-center gap-3">
                  <div
                    className="w-[3px] h-9 rounded-full flex-shrink-0"
                    style={{ background: CATEGORY_CONFIG[deepBlockProject.category].color }}
                  />
                  <div>
                    <div className="text-[16px] font-medium text-charcoal leading-snug">
                      {deepBlockProject.title}
                    </div>
                    {dailyPlan?.deepBlock.intention && (
                      <div className="text-[12px] text-stone/55 italic mt-0.5">
                        {dailyPlan.deepBlock.intention}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Short tasks */}
            {shortTasks.length > 0 && (
              <div className="mb-6">
                <div className="text-[10px] uppercase tracking-[0.1em] text-stone/35 mb-2.5">Short tasks</div>
                <div className="space-y-1.5">
                  {shortTasks.map(task => (
                    <div key={task!.id} className="flex items-start gap-2.5">
                      <div className="w-1 h-1 rounded-full bg-stone/25 flex-shrink-0 mt-[7px]" />
                      <span className="text-[14px] text-charcoal leading-snug">{task!.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Maintenance count */}
            {(dailyPlan?.maintenanceTasks.length ?? 0) > 0 && (
              <div className="mb-8">
                <div className="text-[10px] uppercase tracking-[0.1em] text-stone/35 mb-1.5">Maintenance</div>
                <div className="text-[13px] text-stone">
                  {dailyPlan!.maintenanceTasks.length} taken
                </div>
              </div>
            )}

            <button
              onClick={onStart}
              className="flex items-center gap-2.5 text-[15px] text-charcoal font-serif italic
                hover:gap-4 transition-all duration-200 mt-2"
            >
              Begin de dag <ArrowRight size={16} />
            </button>
          </>
        ) : (
          <>
            <h1 className="font-serif text-[34px] text-charcoal tracking-[-0.02em] mb-4 leading-tight">
              Goedemorgen.
            </h1>
            <p className="text-[15px] text-stone leading-relaxed mb-2">
              Je hebt nog geen dag gepland.
            </p>
            <p className="text-[13px] text-stone/45 leading-relaxed mb-9">
              Twee minuten om je dag te intentioneren<br />
              maakt alles wat volgt makkelijker.
            </p>

            <div className="flex items-center gap-5">
              <button
                onClick={onPlan}
                className="flex items-center gap-2 text-[14px] bg-charcoal text-canvas
                  px-5 py-2.5 rounded-[8px] hover:opacity-90 transition-opacity"
              >
                Plan mijn dag <ArrowRight size={14} />
              </button>
              <button
                onClick={onStart}
                className="text-[13px] text-stone/40 hover:text-stone transition-colors"
              >
                Sla over
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
