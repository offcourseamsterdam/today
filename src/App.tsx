import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { Cloud, CloudOff, Loader2, CloudAlert } from 'lucide-react'
import { EnsoLogo } from './components/ui/EnsoLogo'
import { KanbanBoard } from './components/kanban/KanbanBoard'
import { ProjectModal } from './components/kanban/ProjectModal'
import { Toast } from './components/ui/Toast'
import { VandaagView } from './components/vandaag/VandaagView'
import { PlanningMode } from './components/vandaag/PlanningMode'
import { PlanningModal } from './components/planning/PlanningModal'
import { SmartFab } from './components/ui/SmartFab'
import { MeetingsDrawer } from './components/meetings/MeetingsDrawer'
import { CitadelMode } from './components/vandaag/CitadelMode'
import { EnoughScreen } from './components/vandaag/EnoughScreen'
import { NewDayScreen } from './components/vandaag/NewDayScreen'
import { TomorrowPeek } from './components/vandaag/TomorrowPeek'
import { PhilosophyPage } from './components/philosophy/PhilosophyPage'
import { useStore } from './store'
import { useAuth } from './hooks/useAuth'
import { useFirestoreSync } from './hooks/useFirestoreSync'
import type { PlanTier } from './types'

type CitadelContext =
  | { active: false }
  | { active: true; tier: PlanTier; taskId: string; taskTitle: string; projectTitle?: string; intention?: string; projectId?: string }

function App() {
  const activeView = useStore(s => s.activeView)
  const setActiveView = useStore(s => s.setActiveView)
  const openProjectId = useStore(s => s.openProjectId)
  const setOpenProjectId = useStore(s => s.setOpenProjectId)
  const projects = useStore(s => s.projects)
  const openProject = openProjectId ? (projects.find(p => p.id === openProjectId) ?? null) : null
  const completeDailyPlan = useStore(s => s.completeDailyPlan)
  const loadTomorrowPlanIfReady = useStore(s => s.loadTomorrowPlanIfReady)
  const greetedDate = useStore(s => s.greetedDate)
  const setGreetedDate = useStore(s => s.setGreetedDate)
  const dailyPlan = useStore(s => s.dailyPlan)
  const [citadelCtx, setCitadelCtx] = useState<CitadelContext>({ active: false })
  const [showEnough, setShowEnough] = useState(false)
  const [vandaagCollapsed, setVandaagCollapsed] = useState(false)
  const [kanbanCollapsed, setKanbanCollapsed] = useState(false)
  const [showTomorrowPeek, setShowTomorrowPeek] = useState(false)
  const [showMeetingsDrawer, setShowMeetingsDrawer] = useState(false)
  const [showPlanTodayModal, setShowPlanTodayModal] = useState(false)
  const [showAddTaskModal, setShowAddTaskModal] = useState(false)
  const [showAddProjectModal, setShowAddProjectModal] = useState(false)

  // Track today's date string — updates if the tab is kept open past midnight
  const [todayStr, setTodayStr] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  useEffect(() => {
    const interval = setInterval(() => {
      setTodayStr(format(new Date(), 'yyyy-MM-dd'))
    }, 60_000)
    return () => clearInterval(interval)
  }, [])

  // Auth + sync
  const { user, loading: authLoading, signInError, signIn, signOut } = useAuth()
  const syncStatus = useFirestoreSync(user)

  // Auto-load tomorrow's plan when it becomes today
  useEffect(() => {
    loadTomorrowPlanIfReady()
  }, [loadTomorrowPlanIfReady])

  const showNewDay = greetedDate !== todayStr

  const today = new Date()
  const dayName = format(today, 'EEEE')
  const dateStr = format(today, 'd MMM')
  const weekNum = Math.ceil(
    (today.getTime() - new Date(today.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000)
  )

  // Morning screen — show once per day before anything else
  if (showNewDay) {
    return (
      <NewDayScreen
        onStart={() => setGreetedDate(todayStr)}
        onPlan={() => { setGreetedDate(todayStr); setActiveView('planning') }}
      />
    )
  }

  // Citadel Mode — full-screen dark focus overlay
  if (citadelCtx.active) {
    return (
      <CitadelMode
        tier={citadelCtx.tier}
        taskId={citadelCtx.taskId}
        taskTitle={citadelCtx.taskTitle}
        projectTitle={citadelCtx.projectTitle}
        intention={citadelCtx.intention}
        onExit={() => setCitadelCtx({ active: false })}
      />
    )
  }

  // Enough Screen — full-screen completion overlay
  if (showEnough) {
    return (
      <EnoughScreen
        onCloseDay={() => {
          completeDailyPlan()
          setShowEnough(false)
        }}
        onKeepWorking={() => setShowEnough(false)}
      />
    )
  }

  return (
    <div className="min-h-screen bg-canvas overflow-x-hidden">
      {/* Header */}
      <header className="max-w-[1400px] mx-auto px-6 pt-8 pb-6 flex justify-between items-start">
        <div className="flex items-center gap-3">
          <EnsoLogo size={40} color="#2A2724" />
          <div>
            <h1 className="font-serif text-[22px] font-normal text-charcoal tracking-[-0.02em]">
              Vandaag{' '}
              <span className="text-stone/50 font-light">
                / {dayName.toLowerCase()} {dateStr.toLowerCase()}
              </span>
            </h1>
            <div className="text-[12px] text-stone/60 tracking-[0.04em] uppercase mt-1">
              Week {weekNum}
            </div>
          </div>
        </div>

        {/* Sync indicator — minimal dot only */}
        {!authLoading && (
          <SyncIndicator status={syncStatus} isLoggedIn={!!user} onSignIn={signIn} signInError={signInError} />
        )}
      </header>

      {/* Tomorrow peek — slide-in drawer from the right */}
      <>
        {/* Backdrop */}
        <div
          className={`fixed inset-0 z-40 bg-charcoal/20 backdrop-blur-[2px] transition-opacity duration-300
            ${showTomorrowPeek ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
          onClick={() => setShowTomorrowPeek(false)}
        />
        {/* Panel */}
        <div
          className={`fixed top-0 right-0 h-full w-full max-w-[360px] bg-canvas border-l border-border
            shadow-2xl z-50 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]
            ${showTomorrowPeek ? 'translate-x-0' : 'translate-x-full'}`}
        >
          <TomorrowPeek
            onClose={() => setShowTomorrowPeek(false)}
            onEdit={() => { setShowTomorrowPeek(false); setActiveView('planning') }}
          />
        </div>
      </>

      {/* Smart FAB */}
      <SmartFab
        onOpenMeetings={() => setShowMeetingsDrawer(true)}
        onAddTask={() => setShowAddTaskModal(true)}
        onAddProject={() => setShowAddProjectModal(true)}
        onPlanToday={() => setShowPlanTodayModal(true)}
        onPlanTomorrow={() => setActiveView('planning')}
        onMyRules={() => setActiveView('philosophy')}
        onSignIn={signIn}
        onSignOut={signOut}
        isSignedIn={!!user}
      />
      <MeetingsDrawer open={showMeetingsDrawer} onClose={() => setShowMeetingsDrawer(false)} />
      {showPlanTodayModal && (
        <PlanningModal day="today" onClose={() => setShowPlanTodayModal(false)} />
      )}

      {/* Project modal — openable from any view */}
      {openProject && (
        <ProjectModal project={openProject} onClose={() => setOpenProjectId(null)} />
      )}

      {/* Update-reminder toast */}
      <Toast />

      {/* Main content */}
      <main className="px-6 pb-12">
        {activeView === 'philosophy' ? (
          <PhilosophyPage onBack={() => setActiveView('vandaag')} />
        ) : activeView === 'planning' ? (
          <PlanningMode onExit={() => setActiveView('vandaag')} />
        ) : (
          <>
            <VandaagView
              onOpenMeetings={() => setShowMeetingsDrawer(true)}
              onEnterCitadel={(ctx) => {
                if (ctx) {
                  setCitadelCtx({ active: true, ...ctx })
                } else {
                  // Deep block entry — derive context from store
                  const projectId = dailyPlan?.deepBlock.projectId ?? ''
                  const project = projects.find(p => p.id === projectId)
                  setCitadelCtx({
                    active: true,
                    tier: 'deep',
                    taskId: projectId,
                    taskTitle: project?.title ?? 'Deep Work',
                    projectTitle: project?.title,
                    intention: dailyPlan?.deepBlock.intention,
                  })
                }
              }}
              onDayDone={() => setShowEnough(true)}
              collapsed={vandaagCollapsed}
              onToggleCollapse={() => setVandaagCollapsed(v => !v)}
              onPeekTomorrow={() => setShowTomorrowPeek(true)}
            />
            <KanbanBoard
              collapsed={kanbanCollapsed}
              onToggleCollapse={() => setKanbanCollapsed(v => !v)}
              externalAddTask={showAddTaskModal}
              onExternalAddTaskClose={() => setShowAddTaskModal(false)}
              externalAddProject={showAddProjectModal}
              onExternalAddProjectClose={() => setShowAddProjectModal(false)}
            />
          </>
        )}
      </main>
    </div>
  )
}

// ── Sync status indicator ──────────────────────────────────────────────────────

interface SyncIndicatorProps {
  status: ReturnType<typeof useFirestoreSync>
  isLoggedIn: boolean
  onSignIn: () => void
  signInError: string | null
}

function SyncIndicator({ status, isLoggedIn, onSignIn, signInError }: SyncIndicatorProps) {
  if (!isLoggedIn) {
    return (
      <div className="flex flex-col items-end gap-1">
        <button
          onClick={onSignIn}
          className="flex items-center gap-1.5 px-3 py-2 text-[12px] text-stone/40
            hover:text-stone transition-colors rounded-[6px] hover:bg-border-light"
          title="Sign in to sync across devices"
        >
          <CloudOff size={13} />
          <span className="hidden sm:inline">Sign in</span>
        </button>
        {signInError && (
          <p className="text-[11px] text-[var(--color-status-red-text)] max-w-[260px] text-right leading-tight px-1">
            {signInError}
          </p>
        )}
      </div>
    )
  }

  if (status === 'loading') {
    return (
      <span className="flex items-center gap-1.5 px-2 text-[11px] text-stone/40" title="Loading from cloud…">
        <Loader2 size={12} className="animate-spin" />
      </span>
    )
  }

  if (status === 'saving') {
    return (
      <span className="flex items-center gap-1.5 px-2 text-[11px] text-stone/30" title="Saving…">
        <Cloud size={12} />
      </span>
    )
  }

  if (status === 'synced') {
    return (
      <span className="flex items-center gap-1.5 px-2 text-[11px] text-green/50" title="Synced to cloud">
        <Cloud size={12} />
      </span>
    )
  }

  if (status === 'error') {
    return (
      <span className="flex items-center gap-1.5 px-2 text-[11px] text-[var(--color-status-red-text)]" title="Sync failed — changes are saved locally">
        <CloudAlert size={12} />
      </span>
    )
  }

  return null
}

export default App
