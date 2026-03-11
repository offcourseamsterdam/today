import { useState, useMemo } from 'react'
import { Plus, Check, ChevronDown, Clock } from 'lucide-react'
import { useStore } from '../../store'
import { CATEGORY_CONFIG } from '../../types'
import { findTaskById } from '../../lib/taskLookup'
import { getAvailableTasks } from '../../lib/availableTasks'
import { useTodayPlan } from '../../hooks/useTodayPlan'
import { useTaskToggle } from '../../hooks/useTaskToggle'
import { TaskPickerList } from '../ui/TaskPickerList'
import { ProjectTaskPreview } from '../ui/ProjectTaskPreview'
import { TaskItem } from '../ui/TaskItem'
import { MeetingItem } from '../meetings/MeetingItem'
import { AllMeetingsPanel } from '../meetings/AllMeetingsPanel'

export function ShortTasks() {
  const projects = useStore(s => s.projects)
  const orphanTasks = useStore(s => s.orphanTasks)
  const addOrphanTask = useStore(s => s.addOrphanTask)
  const moveOrphanTaskToProject = useStore(s => s.moveOrphanTaskToProject)
  const setOpenProjectId = useStore(s => s.setOpenProjectId)
  const setOpenMeetingId = useStore(s => s.setOpenMeetingId)
  const allMeetings = useStore(s => s.meetings)
  const recurringMeetings = useStore(s => s.recurringMeetings)
  const {
    shortTaskIds, addShortTask, removeShortTask,
    shortProjectIds, addShortProject, removeShortProject,
    meetingIds, removeMeetingFromPlan,
  } = useTodayPlan()
  const showToast = useStore(s => s.showToast)
  const toggleTask = useTaskToggle(showToast)

  const [showPicker, setShowPicker] = useState(false)
  const [quickAdd, setQuickAdd] = useState('')

  const availableTasks = getAvailableTasks(projects, orphanTasks, shortTaskIds)
  const inProgressProjects = projects.filter(p => p.status === 'in_progress')
  const availableProjects = inProgressProjects.filter(p => !shortProjectIds.includes(p.id))

  // Resolve meetings from IDs
  const planMeetings = useMemo(() => {
    return meetingIds
      .map(id => allMeetings.find(m => m.id === id) ?? recurringMeetings.find(m => m.id === id))
      .filter(Boolean) as typeof allMeetings
  }, [meetingIds, allMeetings, recurringMeetings])

  // Sort meetings by time
  const sortedMeetings = useMemo(() => {
    return [...planMeetings].sort((a, b) => a.time.localeCompare(b.time))
  }, [planMeetings])

  function handleQuickAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!quickAdd.trim()) return
    const id = addOrphanTask(quickAdd.trim())
    addShortTask(id)
    setQuickAdd('')
  }

  const slotsUsed = shortTaskIds.length
  const slotsFull = slotsUsed >= 3

  return (
    <div className="bg-card rounded-[10px] p-5 shadow-card border border-border/50">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Check size={14} className="text-cat-ops" />
          <span className="text-[11px] uppercase tracking-[0.08em] text-stone font-medium">
            Short three
          </span>
          <span className="text-[11px] text-stone/50">{slotsUsed}/3 tasks</span>
          {sortedMeetings.length > 0 && (
            <span className="text-[11px] text-stone/50 flex items-center gap-1">
              <Clock size={10} /> {sortedMeetings.length}
            </span>
          )}
        </div>
      </div>

      {/* Content list */}
      <div className="min-h-[60px]">
        {/* Meetings (sorted by time, shown first) */}
        {sortedMeetings.map(meeting => (
          <MeetingItem
            key={meeting.id}
            meeting={meeting}
            onRemove={() => removeMeetingFromPlan(meeting.id)}
            onEdit={() => setOpenMeetingId(meeting.id)}
          />
        ))}

        {/* Divider between meetings and projects/tasks */}
        {sortedMeetings.length > 0 && (shortProjectIds.length > 0 || shortTaskIds.length > 0) && (
          <div className="border-t border-border/30 my-1" />
        )}

        {/* Selected projects */}
        {shortProjectIds.map(projectId => {
          const project = projects.find(p => p.id === projectId)
          if (!project) return null
          return (
            <ProjectTaskPreview
              key={projectId}
              project={project}
              onRemove={() => removeShortProject(projectId)}
            />
          )
        })}

        {/* Divider between projects and tasks when both present */}
        {shortProjectIds.length > 0 && shortTaskIds.length > 0 && (
          <div className="border-t border-border/30 my-1" />
        )}

        {/* Individual tasks */}
        {shortTaskIds.map(taskId => {
          const found = findTaskById(taskId, projects, orphanTasks)
          if (!found) return null
          return (
            <TaskItem
              key={taskId}
              task={found.task}
              projectTitle={found.projectTitle}
              projects={projects}
              onToggle={() => toggleTask(taskId)}
              onRemove={() => removeShortTask(taskId)}
              onAssignProject={(projectId) => moveOrphanTaskToProject(taskId, projectId)}
              onOpenProject={setOpenProjectId}
            />
          )
        })}

        {shortProjectIds.length === 0 && slotsUsed === 0 && sortedMeetings.length === 0 && !showPicker && (
          <div className="text-[13px] text-stone/30 py-3 text-center italic">
            Especially the ones you've been putting off
          </div>
        )}
      </div>

      {/* Add buttons */}
      {!slotsFull && (
        <>
          <button
            onClick={() => setShowPicker(!showPicker)}
            className="w-full flex items-center justify-between px-3 py-2 mt-2 rounded-[6px]
              border border-dashed border-stone/15 text-[12px] text-stone/40
              hover:border-stone/25 hover:text-stone/60 transition-all"
          >
            <span>Add from projects</span>
            <ChevronDown size={12} className={`transition-transform ${showPicker ? 'rotate-180' : ''}`} />
          </button>

          {showPicker && (
            <div className="mt-2 max-h-[260px] overflow-y-auto animate-slide-up">
              {/* Projects section */}
              {availableProjects.length > 0 && (
                <div className="mb-1">
                  <div className="px-1 py-1 text-[10px] uppercase tracking-[0.08em] text-stone/40 font-medium">
                    Projects
                  </div>
                  {availableProjects.map(p => {
                    const config = CATEGORY_CONFIG[p.category]
                    return (
                      <button
                        key={p.id}
                        onClick={() => { addShortProject(p.id); setShowPicker(false) }}
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
                  })}
                </div>
              )}

              {/* Tasks section */}
              {availableTasks.length > 0 && (
                <div>
                  {availableProjects.length > 0 && (
                    <div className="px-1 py-1 text-[10px] uppercase tracking-[0.08em] text-stone/40 font-medium border-t border-border/30 mt-1 pt-2">
                      Tasks
                    </div>
                  )}
                  <div className="space-y-0.5">
                    <TaskPickerList
                      tasks={availableTasks}
                      projects={projects}
                      onSelect={(id) => { addShortTask(id); if (shortTaskIds.length >= 2) setShowPicker(false) }}
                    />
                  </div>
                </div>
              )}

              {availableProjects.length === 0 && availableTasks.length === 0 && (
                <div className="text-[12px] text-stone/40 py-3 text-center italic">
                  No projects or tasks available
                </div>
              )}
            </div>
          )}

          {/* Quick add orphan task */}
          <form onSubmit={handleQuickAdd} className="flex items-center gap-2 mt-2">
            <Plus size={13} className="text-stone/25 flex-shrink-0" />
            <input
              type="text"
              value={quickAdd}
              onChange={e => setQuickAdd(e.target.value)}
              placeholder="Or add a quick task..."
              className="flex-1 text-[12px] text-charcoal placeholder:text-stone/25
                bg-transparent border-none outline-none py-1"
            />
          </form>
        </>
      )}

      {/* Add meeting button */}
      <button
        onClick={() => setOpenMeetingId('new')}
        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 mt-2 rounded-[6px]
          border border-dashed border-stone/15 text-[12px] text-stone/40
          hover:border-stone/25 hover:text-stone/60 transition-all"
      >
        <Clock size={11} />
        <span>Add meeting</span>
      </button>

      {/* All meetings panel */}
      <AllMeetingsPanel />
    </div>
  )
}
