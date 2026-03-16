import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, Clock } from 'lucide-react'
import { useStore } from '../../store'
import { DeepBlock } from './DeepBlock'
import { ShortTasks } from './ShortTasks'
import { MaintenanceTier } from './MaintenanceTier'
import { MeetingModal } from '../meetings/MeetingModal'
import { getTodayQuote } from '../../lib/quotes'
import type { PlanTier } from '../../types'

interface CitadelContext {
  tier: PlanTier
  taskId: string
  taskTitle: string
  projectTitle?: string
}

interface VandaagViewProps {
  onEnterCitadel: (ctx?: CitadelContext) => void
  onDayDone: () => void
  collapsed: boolean
  onToggleCollapse: () => void
  onPeekTomorrow: () => void
}

export function VandaagView({ onEnterCitadel, onDayDone, collapsed, onToggleCollapse, onPeekTomorrow }: VandaagViewProps) {
  const dailyPlan = useStore(s => s.dailyPlan)
  const tomorrowPlan = useStore(s => s.tomorrowPlan)
  const projects = useStore(s => s.projects)
  const getMissionCriticalStats = useStore(s => s.getMissionCriticalStats)

  const shortTaskIds = dailyPlan?.shortTasks || []
  const maintenanceTaskIds = dailyPlan?.maintenanceTasks || []
  const meetingIds = dailyPlan?.meetings ?? []
  const deepBlockProjectId = dailyPlan?.deepBlock.projectId || ''
  const deepBlockProject = projects.find(p => p.id === deepBlockProjectId)

  const hasDeepBlock = !!deepBlockProjectId
  const quote = getTodayQuote()

  // Stats
  const { missionCriticalDays, uncomfortableDone } = getMissionCriticalStats()

  const tiersActive = [
    hasDeepBlock,
    shortTaskIds.length > 0,
    maintenanceTaskIds.length > 0,
  ].filter(Boolean).length

  const statusText =
    tiersActive === 3
      ? 'All three tiers planned. That\u2019s a good day.'
      : tiersActive === 2
        ? 'Two tiers set. One more to go.'
        : tiersActive === 1
          ? 'Getting started.'
          : null

  // Tomorrow peek summary
  const tomorrowDeepProjectId = tomorrowPlan?.deepBlock.projectId
  const tomorrowDeepProject = tomorrowDeepProjectId
    ? projects.find(p => p.id === tomorrowDeepProjectId)
    : undefined
  const tomorrowCalendarEventId = tomorrowPlan?.deepBlock.calendarEventId

  const tomorrowIsComplete = tomorrowPlan?.isComplete === true

  const [tomorrowVisible, setTomorrowVisible] = useState(false)
  useEffect(() => {
    if (tomorrowIsComplete) {
      const t = setTimeout(() => setTomorrowVisible(true), 50)
      return () => clearTimeout(t)
    } else {
      setTomorrowVisible(false)
    }
  }, [tomorrowIsComplete])

  let tomorrowSummary = ''
  if (tomorrowPlan && tomorrowIsComplete) {
    const deepPart = tomorrowCalendarEventId
      ? 'Meeting'
      : tomorrowDeepProject
        ? tomorrowDeepProject.title
        : 'Deep block'
    const shortCount = tomorrowPlan.shortTasks.length
    const maintCount = tomorrowPlan.maintenanceTasks.length
    tomorrowSummary = `${deepPart} · ${shortCount} short · ${maintCount} maint`
  }

  return (
    <div className="max-w-[1400px] mx-auto mb-8">
      {/* Section header with collapse toggle */}
      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={onToggleCollapse}
          className="flex items-center gap-2 text-stone hover:text-charcoal transition-colors group"
        >
          {collapsed
            ? <ChevronDown size={14} className="text-stone/50 group-hover:text-stone transition-colors" />
            : <ChevronUp size={14} className="text-stone/50 group-hover:text-stone transition-colors" />
          }
          <span className="text-[11px] uppercase tracking-[0.08em] font-medium">
            3 – 3 – 3
          </span>
        </button>
        <div className="flex-1 h-px bg-border" />

        {/* Tomorrow peek — shown when tomorrow plan is complete */}
        {tomorrowIsComplete ? (
          <button
            onClick={onPeekTomorrow}
            className={`text-[13px] text-stone cursor-pointer hover:text-charcoal transition-all
              ${tomorrowVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'}`}
            style={{ transitionProperty: 'opacity, transform', transitionDuration: '300ms' }}
          >
            Tomorrow → <span className="text-stone/50">{tomorrowSummary}</span>
          </button>
        ) : (
          <>
            {statusText && !collapsed && (
              <span className="text-[11px] text-stone italic font-serif">{statusText}</span>
            )}
            {tomorrowPlan && (
              <button
                onClick={onPeekTomorrow}
                className="text-[11px] text-stone/40 hover:text-stone transition-colors flex items-center gap-1"
              >
                Morgen →
              </button>
            )}
          </>
        )}
      </div>

      {/* Collapsed: compact summary row */}
      {collapsed && (
        <div
          className="flex items-center gap-6 px-4 py-3 bg-card rounded-[8px] border border-border/50
            shadow-card text-[12px] text-stone cursor-pointer hover:border-stone/20 transition-all"
          onClick={onToggleCollapse}
        >
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-stone/40">Deep block</span>
            <span className="text-charcoal font-medium">
              {deepBlockProject ? deepBlockProject.title : '—'}
            </span>
          </div>
          <div className="w-px h-3 bg-border" />
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-stone/40">Short</span>
            <span className="text-charcoal">{shortTaskIds.length} / 3</span>
          </div>
          {meetingIds.length > 0 && (
            <>
              <div className="w-px h-3 bg-border" />
              <div className="flex items-center gap-1.5">
                <Clock size={10} className="text-stone/40" />
                <span className="text-charcoal">{meetingIds.length}</span>
              </div>
            </>
          )}
          <div className="w-px h-3 bg-border" />
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-stone/40">Maintenance</span>
            <span className="text-charcoal">{maintenanceTaskIds.length} tasks</span>
          </div>
          <div className="ml-auto flex items-center gap-2 text-stone/40">
            <ChevronDown size={13} />
          </div>
        </div>
      )}

      {/* Expanded: three tiers in a horizontal row */}
      {!collapsed && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <DeepBlock onEnterCitadel={() => onEnterCitadel()} />
            <ShortTasks
              onEnterCitadel={ctx => onEnterCitadel(ctx)}
            />
            <MaintenanceTier
              onEnterCitadel={ctx => onEnterCitadel(ctx)}
            />
          </div>

          {/* Stats */}
          {(missionCriticalDays > 0 || uncomfortableDone > 0) && (
            <div className="mt-3 flex items-center gap-5 px-1">
              {missionCriticalDays > 0 && (
                <span className="text-[11px] text-stone/50">
                  Mission critical: <span className="text-stone">{missionCriticalDays} days worked</span>
                </span>
              )}
              {uncomfortableDone > 0 && (
                <span className="text-[11px] text-stone/50">
                  Uncomfortable tasks done: <span className="text-stone">{uncomfortableDone}</span>
                </span>
              )}
            </div>
          )}

          {/* Quote + day done */}
          <div className="mt-4 flex items-end justify-between gap-6">
            <div className="p-3 rounded-[8px] bg-border-light/40 max-w-[460px]">
              <p className="text-[11px] text-[#5A5550] italic font-serif leading-relaxed">
                &ldquo;{quote.text}&rdquo;
              </p>
              <p className="text-[10px] text-stone/50 mt-1">
                Oliver Burkeman{quote.source && <> &mdash; {quote.source}</>}
              </p>
            </div>

            {tiersActive > 0 && (
              <button
                onClick={onDayDone}
                className="text-[13px] text-[#7A746A] hover:text-charcoal transition-colors
                  font-serif italic whitespace-nowrap pb-1"
              >
                That&rsquo;s enough for today &rarr;
              </button>
            )}
          </div>
        </>
      )}

      {/* Meeting modal — always mounted for access from any state */}
      <MeetingModal />
    </div>
  )
}
