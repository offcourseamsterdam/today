import { useState } from 'react'
import { format } from 'date-fns'
import { Plus, X, RotateCcw, ChevronDown } from 'lucide-react'
import { useStore } from '../../store'
import { CATEGORY_CONFIG } from '../../types'
import { findTaskById } from '../../lib/taskLookup'
import { useTodayPlan } from '../../hooks/useTodayPlan'
import { TaskCheckbox } from '../ui/TaskCheckbox'
import { ProjectTaskPreview } from '../ui/ProjectTaskPreview'
import { RecurringTemplates } from './RecurringTemplates'

export function MaintenanceTier() {
  const projects = useStore(s => s.projects)
  const orphanTasks = useStore(s => s.orphanTasks)
  const recurringTasks = useStore(s => s.recurringTasks)
  const addQuickMaintenanceTask = useStore(s => s.addQuickMaintenanceTask)
  const updateOrphanTask = useStore(s => s.updateOrphanTask)
  const updateRecurringTask = useStore(s => s.updateRecurringTask)
  const getTodayRecurringTasks = useStore(s => s.getTodayRecurringTasks)
  const {
    maintenanceTaskIds, addMaintenanceTask, removeMaintenanceTask,
    maintenanceProjectIds, addMaintenanceProject, removeMaintenanceProject,
  } = useTodayPlan()

  const [quickAdd, setQuickAdd] = useState('')
  const [completedToday, setCompletedToday] = useState<Set<string>>(new Set())
  const [showProjectPicker, setShowProjectPicker] = useState(false)

  const inProgressProjects = projects.filter(p => p.status === 'in_progress')
  const availableProjects = inProgressProjects.filter(p => !maintenanceProjectIds.includes(p.id))

  function handleToggle(taskId: string) {
    const wasCompleted = completedToday.has(taskId)
    setCompletedToday(prev => {
      const next = new Set(prev)
      if (next.has(taskId)) next.delete(taskId)
      else next.add(taskId)
      return next
    })
    const orphan = orphanTasks.find(t => t.id === taskId)
    if (orphan) {
      updateOrphanTask(taskId, {
        status: wasCompleted ? 'vandaag' : 'done',
        completedAt: wasCompleted ? undefined : new Date().toISOString(),
      })
    }
    const recurring = recurringTasks.find(t => t.id === taskId)
    if (recurring) {
      updateRecurringTask(taskId, {
        lastCompletedDate: wasCompleted ? undefined : format(new Date(), 'yyyy-MM-dd'),
      })
    }
  }

  function handleQuickAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!quickAdd.trim()) return
    addQuickMaintenanceTask(quickAdd.trim())
    setQuickAdd('')
  }

  const todayRecurring = getTodayRecurringTasks()
  const notYetAdded = todayRecurring.filter(t => !maintenanceTaskIds.includes(t.id))

  function handleAutoPopulate() {
    for (const task of notYetAdded) addMaintenanceTask(task.id)
  }

  const slotsUsed = maintenanceTaskIds.length
  const completedCount = maintenanceTaskIds.filter(id => completedToday.has(id)).length

  return (
    <div className="bg-card rounded-[10px] p-5 shadow-card border border-border/50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <RotateCcw size={14} className="text-cat-admin" />
          <span className="text-[11px] uppercase tracking-[0.08em] text-stone font-medium">
            Maintenance
          </span>
          {slotsUsed > 0 && (
            <span className="text-[11px] text-stone/50">{completedCount}/{slotsUsed} done</span>
          )}
        </div>
        {notYetAdded.length > 0 && (
          <button
            onClick={handleAutoPopulate}
            className="text-[11px] text-stone/50 hover:text-stone px-2 py-1 rounded
              border border-border/50 hover:border-stone/20 transition-all"
          >
            + Add {notYetAdded.length} recurring
          </button>
        )}
      </div>

      {/* Today's tasks */}
      <div className="min-h-[40px] flex-1">
        {/* Selected projects */}
        {maintenanceProjectIds.map(projectId => {
          const project = projects.find(p => p.id === projectId)
          if (!project) return null
          return (
            <ProjectTaskPreview
              key={projectId}
              project={project}
              onRemove={() => removeMaintenanceProject(projectId)}
              previewCount={1}
            />
          )
        })}

        {/* Divider between projects and tasks when both present */}
        {maintenanceProjectIds.length > 0 && maintenanceTaskIds.length > 0 && (
          <div className="border-t border-border/30 my-1" />
        )}

        {/* Individual tasks */}
        {maintenanceTaskIds.map(taskId => {
          const task = findTaskById(taskId, [], orphanTasks, recurringTasks)?.task ?? null
          if (!task) return null
          const isDone = completedToday.has(taskId)
          return (
            <div key={taskId} className="flex items-center gap-3 py-1.5 group">
              <TaskCheckbox
                checked={isDone}
                onChange={() => handleToggle(taskId)}
                size="sm"
                color="var(--color-cat-admin)"
              />
              <span className={`text-[13px] flex-1 ${isDone ? 'text-stone/50 line-through' : 'text-charcoal'}`}>
                {task.title}
              </span>
              {task.isRecurring && <RotateCcw size={10} className="text-stone/25 flex-shrink-0" />}
              <button
                onClick={() => removeMaintenanceTask(taskId)}
                className="opacity-0 group-hover:opacity-60 hover:!opacity-100 text-stone transition-all"
              >
                <X size={13} />
              </button>
            </div>
          )
        })}
        {maintenanceProjectIds.length === 0 && slotsUsed === 0 && (
          <div className="text-[12px] text-stone/30 py-2 italic">
            The recurring work that keeps life running
          </div>
        )}
      </div>

      {/* Add project picker */}
      <button
        onClick={() => setShowProjectPicker(!showProjectPicker)}
        className="w-full flex items-center justify-between px-3 py-2 mt-2 rounded-[6px]
          border border-dashed border-stone/15 text-[12px] text-stone/40
          hover:border-stone/25 hover:text-stone/60 transition-all"
      >
        <span>Add project</span>
        <ChevronDown size={12} className={`transition-transform ${showProjectPicker ? 'rotate-180' : ''}`} />
      </button>

      {showProjectPicker && (
        <div className="mt-2 max-h-[180px] overflow-y-auto animate-slide-up">
          {availableProjects.length === 0 ? (
            <div className="text-[12px] text-stone/40 py-3 text-center italic">
              No projects available
            </div>
          ) : (
            availableProjects.map(p => {
              const config = CATEGORY_CONFIG[p.category]
              return (
                <button
                  key={p.id}
                  onClick={() => { addMaintenanceProject(p.id); setShowProjectPicker(false) }}
                  className="w-full flex items-center gap-2.5 px-2 py-2 rounded-[6px]
                    text-left hover:bg-canvas transition-colors"
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: config.color }}
                  />
                  <span className="text-[12px] text-charcoal truncate">{p.title}</span>
                </button>
              )
            })
          )}
        </div>
      )}

      {/* Quick add */}
      <form onSubmit={handleQuickAdd} className="flex items-center gap-2 mt-2 mb-4">
        <Plus size={13} className="text-stone/25 flex-shrink-0" />
        <input
          type="text"
          value={quickAdd}
          onChange={e => setQuickAdd(e.target.value)}
          placeholder="Add maintenance task..."
          className="flex-1 text-[12px] text-charcoal placeholder:text-stone/25
            bg-transparent border-none outline-none py-1"
        />
      </form>

      <RecurringTemplates />
    </div>
  )
}
