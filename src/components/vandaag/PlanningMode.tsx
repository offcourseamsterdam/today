import { useState } from 'react'
import { ChevronDown, X, Check, Moon, RotateCcw, Lock, ArrowLeft, Clock } from 'lucide-react'
import { format, addDays } from 'date-fns'
import { useStore } from '../../store'
import { CATEGORY_CONFIG } from '../../types'
import { getTodayQuote } from '../../lib/quotes'
import { findTaskById } from '../../lib/taskLookup'
import { getAvailableTasks } from '../../lib/availableTasks'
import { UncomfortableBadge } from '../ui/UncomfortableBadge'
import { TaskPickerList } from '../ui/TaskPickerList'
import { MeetingModal } from '../meetings/MeetingModal'

interface PlanningModeProps {
  onExit: () => void
}

export function PlanningMode({ onExit }: PlanningModeProps) {
  const projects = useStore(s => s.projects)
  const orphanTasks = useStore(s => s.orphanTasks)
  const recurringTasks = useStore(s => s.recurringTasks)
  const tomorrowPlan = useStore(s => s.tomorrowPlan)
  const setTomorrowDeepBlock = useStore(s => s.setTomorrowDeepBlock)
  const clearTomorrowDeepBlock = useStore(s => s.clearTomorrowDeepBlock)
  const addTomorrowShortTask = useStore(s => s.addTomorrowShortTask)
  const removeTomorrowShortTask = useStore(s => s.removeTomorrowShortTask)
  const addTomorrowMaintenanceTask = useStore(s => s.addTomorrowMaintenanceTask)
  const removeTomorrowMaintenanceTask = useStore(s => s.removeTomorrowMaintenanceTask)
  const lockInTomorrow = useStore(s => s.lockInTomorrow)
  const getTodayRecurringTasks = useStore(s => s.getTodayRecurringTasks)
  const addOrphanTask = useStore(s => s.addOrphanTask)
  const allMeetings = useStore(s => s.meetings)
  const recurringMeetingsStore = useStore(s => s.recurringMeetings)
  const addTomorrowMeeting = useStore(s => s.addTomorrowMeeting)
  const removeTomorrowMeeting = useStore(s => s.removeTomorrowMeeting)
  const getTodayRecurringMeetings = useStore(s => s.getTodayRecurringMeetings)
  const setOpenMeetingId = useStore(s => s.setOpenMeetingId)

  const [showProjectPicker, setShowProjectPicker] = useState(false)
  const [showTaskPicker, setShowTaskPicker] = useState(false)
  const [intention, setIntention] = useState(tomorrowPlan?.deepBlock.intention || '')
  const [quickShort, setQuickShort] = useState('')
  const [quickMaint, setQuickMaint] = useState('')
  const [isLocked, setIsLocked] = useState(tomorrowPlan?.isComplete || false)

  const tomorrow = addDays(new Date(), 1)
  const tomorrowLabel = format(tomorrow, 'EEEE d MMM')
  const quote = getTodayQuote()

  const inProgressProjects = projects.filter(p => p.status === 'in_progress')
  const selectedProjectId = tomorrowPlan?.deepBlock.projectId || ''
  const selectedProject = projects.find(p => p.id === selectedProjectId)

  const shortTaskIds = tomorrowPlan?.shortTasks || []
  const maintenanceTaskIds = tomorrowPlan?.maintenanceTasks || []
  const tomorrowMeetingIds = tomorrowPlan?.meetings ?? []

  const availableTasks = getAvailableTasks(projects, [], shortTaskIds)

  // Recurring tasks for auto-populate
  const todayRecurring = getTodayRecurringTasks()
  const notYetAddedRecurring = todayRecurring.filter(t => !maintenanceTaskIds.includes(t.id))

  // Recurring meetings for auto-populate
  const todayRecurringMeetings = getTodayRecurringMeetings()
  const notYetAddedRecurringMeetings = todayRecurringMeetings.filter(m => !tomorrowMeetingIds.includes(m.id))

  // Resolve tomorrow's meetings
  const tomorrowMeetings = tomorrowMeetingIds
    .map(id => allMeetings.find(m => m.id === id) ?? recurringMeetingsStore.find(m => m.id === id))
    .filter(Boolean) as typeof allMeetings

  function handleSelectProject(projectId: string) {
    setTomorrowDeepBlock(projectId, intention || undefined)
    setShowProjectPicker(false)
  }

  function handleIntentionBlur() {
    if (selectedProjectId) {
      setTomorrowDeepBlock(selectedProjectId, intention || undefined)
    }
  }

  function handleQuickShort(e: React.FormEvent) {
    e.preventDefault()
    if (!quickShort.trim()) return
    const id = addOrphanTask(quickShort.trim())
    addTomorrowShortTask(id)
    setQuickShort('')
  }

  function handleQuickMaint(e: React.FormEvent) {
    e.preventDefault()
    if (!quickMaint.trim()) return
    const id = addOrphanTask(quickMaint.trim())
    addTomorrowMaintenanceTask(id)
    setQuickMaint('')
  }

  function handleAutoPopulateRecurring() {
    for (const task of notYetAddedRecurring) {
      addTomorrowMaintenanceTask(task.id)
    }
  }

  function handleLockIn() {
    lockInTomorrow()
    setIsLocked(true)
  }

  // Calculate readiness
  const hasDeep = !!selectedProjectId
  const hasShort = shortTaskIds.length > 0
  const hasMaint = maintenanceTaskIds.length > 0
  const tiersReady = [hasDeep, hasShort, hasMaint].filter(Boolean).length

  return (
    <div className="max-w-[800px] mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={onExit}
          className="flex items-center gap-2 text-[12px] text-stone/50 hover:text-stone transition-colors"
        >
          <ArrowLeft size={14} />
          Back to today
        </button>
        <div className="text-center">
          <div className="text-[11px] uppercase tracking-[0.1em] text-stone/40 flex items-center gap-2 justify-center">
            <Moon size={12} />
            Planning for
          </div>
          <div className="font-serif text-[18px] text-charcoal mt-0.5">
            {tomorrowLabel.toLowerCase()}
          </div>
        </div>
        <div className="w-[100px]" /> {/* Balance spacer */}
      </div>

      {/* Locked banner */}
      {isLocked && (
        <div className="mb-6 flex items-center gap-3 px-4 py-3 rounded-[8px] bg-green/5 border border-green/15">
          <Lock size={14} className="text-green" />
          <span className="text-[13px] text-green font-medium">Tomorrow is locked in.</span>
          <button
            onClick={() => setIsLocked(false)}
            className="ml-auto text-[11px] text-stone/40 hover:text-stone transition-colors"
          >
            Edit
          </button>
        </div>
      )}

      <div className="space-y-6">
        {/* ── DEEP BLOCK ── */}
        <section className="bg-card rounded-[10px] p-5 shadow-card border border-border/50">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-cat-marketing" />
            <span className="text-[11px] uppercase tracking-[0.08em] text-stone font-medium">
              Deep block
            </span>
            <span className="text-[11px] text-stone/40">Choose your one thing</span>
          </div>

          {selectedProject ? (
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {selectedProject.coverImageUrl && (
                    <div className="w-10 h-10 rounded-[4px] overflow-hidden flex-shrink-0">
                      <img src={selectedProject.coverImageUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div>
                    <div className="text-[15px] font-medium text-charcoal">{selectedProject.title}</div>
                    <div className="text-[10px] mt-0.5" style={{ color: CATEGORY_CONFIG[selectedProject.category].color }}>
                      {CATEGORY_CONFIG[selectedProject.category].label}
                    </div>
                  </div>
                </div>
                {!isLocked && (
                  <button onClick={clearTomorrowDeepBlock} className="text-stone/30 hover:text-stone transition-colors p-1">
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Intention */}
              <input
                value={intention}
                onChange={e => setIntention(e.target.value)}
                onBlur={handleIntentionBlur}
                disabled={isLocked}
                placeholder="What will I focus on?"
                className="w-full mt-3 px-3 py-2 rounded-[6px] border border-border bg-canvas
                  text-[13px] text-charcoal placeholder:text-stone/30
                  outline-none focus:border-stone/40 transition-colors disabled:opacity-50"
              />

              {/* Task preview */}
              {selectedProject.tasks.filter(t => t.status !== 'done').length > 0 && (
                <div className="mt-3 pt-3 border-t border-border/50">
                  <div className="text-[10px] uppercase tracking-wider text-stone/40 mb-1.5">Open tasks</div>
                  {selectedProject.tasks
                    .filter(t => t.status !== 'done')
                    .slice(0, 4)
                    .map(task => (
                      <div key={task.id} className="text-[12px] text-stone/70 py-0.5 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-stone/15 flex-shrink-0" />
                        {task.title}
                      </div>
                    ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              <button
                onClick={() => !isLocked && setShowProjectPicker(!showProjectPicker)}
                disabled={isLocked}
                className="w-full flex items-center justify-between px-3 py-3 rounded-[6px]
                  border border-dashed border-stone/20 text-[13px] text-stone/50
                  hover:border-stone/30 hover:text-stone transition-all disabled:opacity-50"
              >
                <span>Which project gets your best energy?</span>
                <ChevronDown size={14} className={`transition-transform ${showProjectPicker ? 'rotate-180' : ''}`} />
              </button>

              {showProjectPicker && (
                <div className="mt-2 space-y-1.5 animate-slide-up">
                  {inProgressProjects.length === 0 ? (
                    <div className="text-[13px] text-stone/40 py-4 text-center">
                      No projects in progress.
                    </div>
                  ) : (
                    inProgressProjects.map(project => (
                      <button
                        key={project.id}
                        onClick={() => handleSelectProject(project.id)}
                        className="w-full flex items-center gap-3 p-2.5 rounded-[6px]
                          border border-border bg-canvas hover:border-stone/30 hover:shadow-card
                          transition-all duration-150 text-left"
                      >
                        {project.coverImageUrl && (
                          <div className="w-8 h-8 rounded-[4px] overflow-hidden flex-shrink-0">
                            <img src={project.coverImageUrl} alt="" className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-medium text-charcoal truncate">{project.title}</div>
                          <div className="text-[10px] mt-0.5" style={{ color: CATEGORY_CONFIG[project.category].color }}>
                            {CATEGORY_CONFIG[project.category].label}
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </section>

        {/* ── SHORT THREE ── */}
        <section className="bg-card rounded-[10px] p-5 shadow-card border border-border/50">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-cat-ops" />
            <span className="text-[11px] uppercase tracking-[0.08em] text-stone font-medium">
              Short three
            </span>
            <span className="text-[11px] text-stone/40">{shortTaskIds.length}/3 selected</span>
          </div>

          {/* Selected tasks */}
          <div className="min-h-[40px]">
            {shortTaskIds.map(taskId => {
              const found = findTaskById(taskId, projects, orphanTasks, recurringTasks)
              if (!found) return null
              return (
                <div key={taskId} className="flex items-center gap-3 py-2 group">
                  <Check size={14} className="text-stone/20 flex-shrink-0" />
                  <span className="text-[13px] text-charcoal flex-1">{found.task.title}</span>
                  {found.projectTitle && (
                    <span className="text-[10px] text-stone/40">{found.projectTitle}</span>
                  )}
                  {found.task.isUncomfortable && <UncomfortableBadge />}
                  {!isLocked && (
                    <button
                      onClick={() => removeTomorrowShortTask(taskId)}
                      className="opacity-0 group-hover:opacity-60 hover:!opacity-100 text-stone transition-all"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              )
            })}

            {shortTaskIds.length === 0 && (
              <div className="text-[13px] text-stone/30 py-2 text-center italic">
                The ones you've been putting off
              </div>
            )}
          </div>

          {/* Add tasks */}
          {!isLocked && shortTaskIds.length < 3 && (
            <>
              <button
                onClick={() => setShowTaskPicker(!showTaskPicker)}
                className="w-full flex items-center justify-between px-3 py-2 mt-2 rounded-[6px]
                  border border-dashed border-stone/15 text-[12px] text-stone/40
                  hover:border-stone/25 hover:text-stone/60 transition-all"
              >
                <span>Add from projects</span>
                <ChevronDown size={12} className={`transition-transform ${showTaskPicker ? 'rotate-180' : ''}`} />
              </button>

              {showTaskPicker && (
                <div className="mt-2 max-h-[200px] overflow-y-auto space-y-0.5 animate-slide-up">
                  <TaskPickerList
                    tasks={availableTasks}
                    projects={projects}
                    emptyText="No available tasks."
                    onSelect={(id) => { addTomorrowShortTask(id); if (shortTaskIds.length >= 2) setShowTaskPicker(false) }}
                  />
                </div>
              )}

              {/* Quick add */}
              <form onSubmit={handleQuickShort} className="flex items-center gap-2 mt-2">
                <span className="text-[12px] text-stone/25">+</span>
                <input
                  type="text"
                  value={quickShort}
                  onChange={e => setQuickShort(e.target.value)}
                  placeholder="Or add a quick task..."
                  className="flex-1 text-[12px] text-charcoal placeholder:text-stone/25
                    bg-transparent border-none outline-none py-1"
                />
              </form>
            </>
          )}
        </section>

        {/* ── MEETINGS ── */}
        <section className="bg-card rounded-[10px] p-5 shadow-card border border-border/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock size={12} className="text-cat-marketing" />
              <span className="text-[11px] uppercase tracking-[0.08em] text-stone font-medium">
                Meetings
              </span>
              <span className="text-[11px] text-stone/40">{tomorrowMeetingIds.length} scheduled</span>
            </div>

            {!isLocked && notYetAddedRecurringMeetings.length > 0 && (
              <button
                onClick={() => { for (const m of notYetAddedRecurringMeetings) addTomorrowMeeting(m.id) }}
                className="text-[11px] text-stone/50 hover:text-stone px-2 py-1 rounded
                  border border-border/50 hover:border-stone/20 transition-all"
              >
                + Add {notYetAddedRecurringMeetings.length} recurring
              </button>
            )}
          </div>

          <div className="min-h-[40px]">
            {tomorrowMeetings.map(meeting => (
              <div key={meeting.id} className="flex items-center gap-3 py-2 group">
                <Clock size={12} className="text-cat-marketing/40 flex-shrink-0" />
                <span className="text-[10px] font-medium text-cat-marketing bg-cat-marketing/10 px-1.5 py-0.5 rounded-full flex-shrink-0">
                  {meeting.time}
                </span>
                <span className="text-[13px] text-charcoal flex-1 truncate">{meeting.title}</span>
                <span className="text-[10px] text-stone/30">{meeting.durationMinutes}m</span>
                {!isLocked && (
                  <button
                    onClick={() => removeTomorrowMeeting(meeting.id)}
                    className="opacity-0 group-hover:opacity-60 hover:!opacity-100 text-stone transition-all"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            ))}

            {tomorrowMeetingIds.length === 0 && (
              <div className="text-[13px] text-stone/30 py-2 text-center italic">
                No meetings scheduled yet
              </div>
            )}
          </div>

          {!isLocked && (
            <button
              onClick={() => setOpenMeetingId('new')}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 mt-2 rounded-[6px]
                border border-dashed border-stone/15 text-[12px] text-stone/40
                hover:border-stone/25 hover:text-stone/60 transition-all"
            >
              <Clock size={11} />
              <span>Add meeting</span>
            </button>
          )}
        </section>

        {/* ── MAINTENANCE ── */}
        <section className="bg-card rounded-[10px] p-5 shadow-card border border-border/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-cat-admin" />
              <span className="text-[11px] uppercase tracking-[0.08em] text-stone font-medium">
                Maintenance
              </span>
              <span className="text-[11px] text-stone/40">{maintenanceTaskIds.length} items</span>
            </div>

            {!isLocked && notYetAddedRecurring.length > 0 && (
              <button
                onClick={handleAutoPopulateRecurring}
                className="text-[11px] text-stone/50 hover:text-stone px-2 py-1 rounded
                  border border-border/50 hover:border-stone/20 transition-all"
              >
                + Add {notYetAddedRecurring.length} recurring
              </button>
            )}
          </div>

          {/* Maintenance tasks */}
          <div className="min-h-[40px]">
            {maintenanceTaskIds.map(taskId => {
              const found = findTaskById(taskId, projects, orphanTasks, recurringTasks)
              if (!found) return null
              return (
                <div key={taskId} className="flex items-center gap-3 py-2 group">
                  <RotateCcw size={12} className={`flex-shrink-0 ${found.task.isRecurring ? 'text-stone/30' : 'text-transparent'}`} />
                  <span className="text-[13px] text-charcoal flex-1">{found.task.title}</span>
                  {!isLocked && (
                    <button
                      onClick={() => removeTomorrowMaintenanceTask(taskId)}
                      className="opacity-0 group-hover:opacity-60 hover:!opacity-100 text-stone transition-all"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              )
            })}

            {maintenanceTaskIds.length === 0 && (
              <div className="text-[13px] text-stone/30 py-2 text-center italic">
                The recurring work that keeps life running
              </div>
            )}
          </div>

          {/* Quick add maintenance */}
          {!isLocked && (
            <form onSubmit={handleQuickMaint} className="flex items-center gap-2 mt-2">
              <span className="text-[12px] text-stone/25">+</span>
              <input
                type="text"
                value={quickMaint}
                onChange={e => setQuickMaint(e.target.value)}
                placeholder="Add maintenance task..."
                className="flex-1 text-[12px] text-charcoal placeholder:text-stone/25
                  bg-transparent border-none outline-none py-1"
              />
            </form>
          )}
        </section>
      </div>

      {/* Footer: Lock in + quote */}
      <div className="mt-8 text-center">
        {/* Readiness indicator */}
        <div className="text-[12px] text-stone/40 mb-4 italic font-serif">
          {tiersReady === 3
            ? 'All three tiers set. Tomorrow is planned.'
            : tiersReady === 2
              ? 'Two tiers ready. One more?'
              : tiersReady === 1
                ? 'Getting started. Keep going.'
                : 'Plan your tomorrow.'}
        </div>

        {!isLocked && tiersReady > 0 && (
          <button
            onClick={handleLockIn}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-[8px]
              bg-charcoal text-canvas text-[13px] font-medium
              hover:bg-charcoal/90 transition-all shadow-card"
          >
            <Lock size={14} />
            Lock in tomorrow
          </button>
        )}

        {/* Quote */}
        <div className="mt-8 px-8">
          <p className="text-[12px] text-stone/40 italic font-serif leading-relaxed">
            &ldquo;{quote.text}&rdquo;
          </p>
          {quote.source && (
            <p className="text-[10px] text-stone/25 mt-2">
              Oliver Burkeman &mdash; {quote.source}
            </p>
          )}
        </div>
      </div>

      {/* Meeting modal */}
      <MeetingModal />
    </div>
  )
}
