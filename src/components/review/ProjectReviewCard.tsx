import { useState } from 'react'
import { ChevronRight, ChevronDown, Clock, Trash2, CheckCircle2 } from 'lucide-react'
import type { Project, ProjectStatus } from '../../types'
import { useStore } from '../../store'
import { daysSince, getWaitingLabel, getWaitingStatus } from '../../lib/utils'

interface ProjectReviewCardProps {
  project: Project
  onTaskCompleted: () => void
  onTaskDeleted: () => void
  onProjectMoved: () => void
}

const STATUS_BADGE: Record<ProjectStatus, string> = {
  in_progress: 'bg-blue-100 text-blue-700',
  waiting: 'bg-amber-100 text-amber-700',
  backlog: 'bg-stone-100 text-stone-600',
  done: 'bg-green-100 text-green-700',
}

const STATUS_LABEL: Record<ProjectStatus, string> = {
  in_progress: 'In Progress',
  waiting: 'Waiting',
  backlog: 'Backlog',
  done: 'Done',
}

export default function ProjectReviewCard({
  project,
  onTaskCompleted,
  onTaskDeleted,
  onProjectMoved,
}: ProjectReviewCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [nextAction, setNextAction] = useState('')
  const updateProject = useStore((s) => s.updateProject)
  const moveProject = useStore((s) => s.moveProject)

  const openTasks = project.tasks.filter((t) => t.status !== 'done' && t.status !== 'dropped')
  const hasWaiting = (project.waitingOn?.length ?? 0) > 0

  function toggleTask(taskId: string) {
    const task = project.tasks.find((t) => t.id === taskId)
    if (!task) return
    const newStatus = task.status === 'done' ? 'backlog' : 'done'
    updateProject(project.id, {
      tasks: project.tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status: newStatus,
              completedAt: newStatus === 'done' ? new Date().toISOString() : undefined,
            }
          : t,
      ),
    })
    if (newStatus === 'done') onTaskCompleted()
  }

  function deleteTask(taskId: string) {
    updateProject(project.id, {
      tasks: project.tasks.filter((t) => t.id !== taskId),
    })
    onTaskDeleted()
  }

  function resolveWaiting(person: string) {
    updateProject(project.id, {
      waitingOn: (project.waitingOn ?? []).filter((w) => w.person !== person),
    })
  }

  function handleMove(newStatus: ProjectStatus) {
    moveProject(project.id, newStatus)
    onProjectMoved()
  }

  return (
    <div className="border border-[#E8E4DD] rounded-lg bg-white">
      {/* Collapsed row */}
      <button
        onClick={() => setExpanded((prev) => !prev)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-[#FAF9F7] transition-colors rounded-lg"
      >
        {expanded ? (
          <ChevronDown size={16} className="text-[#7A746A] shrink-0" />
        ) : (
          <ChevronRight size={16} className="text-[#7A746A] shrink-0" />
        )}

        <span
          className={`text-[11px] font-medium uppercase tracking-wide px-2 py-0.5 rounded ${STATUS_BADGE[project.status]}`}
        >
          {STATUS_LABEL[project.status]}
        </span>

        <span className="text-[14px] font-medium text-[#2A2724] truncate">
          {project.title}
        </span>

        <span className="ml-auto flex items-center gap-2 shrink-0">
          {hasWaiting && (
            <Clock size={14} className="text-amber-500" />
          )}
          <span className="text-[12px] text-[#7A746A]">
            {openTasks.length} open
          </span>
        </span>
      </button>

      {/* Expanded panel */}
      {expanded && (
        <div className="px-4 pb-4 pt-1 space-y-4 border-t border-[#F0EEEB]">
          {/* Tasks checklist */}
          {project.tasks.length > 0 && (
            <div className="space-y-1">
              <h4 className="text-[11px] font-medium uppercase tracking-wide text-[#7A746A] mb-2">
                Taken
              </h4>
              {project.tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-2 group py-1"
                >
                  <button
                    onClick={() => toggleTask(task.id)}
                    className="shrink-0"
                  >
                    <CheckCircle2
                      size={18}
                      className={
                        task.status === 'done'
                          ? 'text-green-500'
                          : 'text-[#E8E4DD] hover:text-green-400 transition-colors'
                      }
                      fill={task.status === 'done' ? 'currentColor' : 'none'}
                    />
                  </button>
                  <span
                    className={`text-[13px] flex-1 ${
                      task.status === 'done'
                        ? 'line-through text-[#7A746A]'
                        : 'text-[#2A2724]'
                    }`}
                  >
                    {task.title}
                  </span>
                  <button
                    onClick={() => deleteTask(task.id)}
                    className="opacity-0 group-hover:opacity-100 text-[#7A746A] hover:text-red-500 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Waiting-on list */}
          {hasWaiting && (
            <div className="space-y-1">
              <h4 className="text-[11px] font-medium uppercase tracking-wide text-[#7A746A] mb-2">
                Wachten op
              </h4>
              {project.waitingOn!.map((w) => {
                const days = daysSince(w.since)
                const status = getWaitingStatus(days)
                return (
                  <div
                    key={w.person}
                    className="flex items-center gap-2 py-1"
                  >
                    <span className="text-[13px] text-[#2A2724]">
                      {w.person}
                    </span>
                    <span
                      className={`text-[11px] ${
                        status === 'red'
                          ? 'text-red-600'
                          : status === 'amber'
                            ? 'text-amber-600'
                            : 'text-[#7A746A]'
                      }`}
                    >
                      {getWaitingLabel(days)}
                    </span>
                    <button
                      onClick={() => resolveWaiting(w.person)}
                      className="ml-auto text-[12px] text-green-600 hover:text-green-700 font-medium transition-colors"
                    >
                      Opgelost
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {/* Next action input */}
          <div>
            <label className="text-[11px] font-medium uppercase tracking-wide text-[#7A746A] block mb-1">
              Eerste volgende actie?
            </label>
            <input
              type="text"
              value={nextAction}
              onChange={(e) => setNextAction(e.target.value)}
              placeholder="Wat is de eerstvolgende stap?"
              className={`w-full text-[13px] px-3 py-2 rounded-md border border-[#E8E4DD] outline-none focus:ring-1 focus:ring-blue-300 ${
                openTasks.length === 0 ? 'bg-amber-50' : 'bg-white'
              }`}
            />
          </div>

          {/* Move buttons */}
          <div className="flex gap-2">
            {project.status !== 'backlog' && (
              <button
                onClick={() => handleMove('backlog')}
                className="text-[12px] px-3 py-1.5 rounded-md border border-[#E8E4DD] text-[#7A746A] hover:bg-[#FAF9F7] transition-colors"
              >
                &rarr; Backlog
              </button>
            )}
            {project.status !== 'done' && (
              <button
                onClick={() => handleMove('done')}
                className="text-[12px] px-3 py-1.5 rounded-md border border-green-200 text-green-700 hover:bg-green-50 transition-colors"
              >
                &rarr; Done
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
