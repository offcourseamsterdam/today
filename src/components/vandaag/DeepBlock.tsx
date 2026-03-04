import { useState } from 'react'
import { ChevronDown, X, Target, Check } from 'lucide-react'
import { useStore } from '../../store'
import { CategoryBadge } from '../ui/CategoryBadge'
import { PomodoroTimer } from './PomodoroTimer'
import { CATEGORY_CONFIG } from '../../types'

interface DeepBlockProps {
  onEnterCitadel: () => void
}

export function DeepBlock({ onEnterCitadel }: DeepBlockProps) {
  const projects = useStore(s => s.projects)
  const dailyPlan = useStore(s => s.dailyPlan)
  const setDeepBlock = useStore(s => s.setDeepBlock)
  const clearDeepBlock = useStore(s => s.clearDeepBlock)
  const recordDayWorked = useStore(s => s.recordDayWorked)
  const setOpenProjectId = useStore(s => s.setOpenProjectId)
  const showToast = useStore(s => s.showToast)

  const [showPicker, setShowPicker] = useState(false)
  const [intention, setIntention] = useState(dailyPlan?.deepBlock.intention || '')
  const [editingIntention, setEditingIntention] = useState(false)

  const inProgressProjects = projects.filter(p => p.status === 'in_progress')
  const selectedProjectId = dailyPlan?.deepBlock.projectId || ''
  const selectedProject = projects.find(p => p.id === selectedProjectId)

  function handleSelectProject(projectId: string) {
    setDeepBlock(projectId, intention || undefined)
    recordDayWorked(projectId)
    setShowPicker(false)
  }

  function handleClear() {
    clearDeepBlock()
    setIntention('')
  }

  function handleDoneForToday() {
    if (selectedProject) showToast(selectedProject.id)
    clearDeepBlock()
    setIntention('')
  }

  function handleIntentionSubmit() {
    if (selectedProjectId) {
      setDeepBlock(selectedProjectId, intention || undefined)
    }
    setEditingIntention(false)
  }

  return (
    <div className="bg-card rounded-[10px] p-5 shadow-card border border-border/50">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target size={14} className="text-cat-marketing" />
          <span className="text-[11px] uppercase tracking-[0.08em] text-stone font-medium">
            Deep block
          </span>
          <span className="text-[11px] text-stone/50">3 hours, 1 project</span>
        </div>
      </div>

      {selectedProject ? (
        <div>
          {/* Selected project display */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                {selectedProject.coverImageUrl && (
                  <div className="w-10 h-10 rounded-[4px] overflow-hidden flex-shrink-0">
                    <img src={selectedProject.coverImageUrl} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                <div>
                  <button
                    onClick={() => setOpenProjectId(selectedProject.id)}
                    className="text-[15px] font-medium text-charcoal hover:text-stone transition-colors text-left"
                  >
                    {selectedProject.title}
                  </button>
                  <CategoryBadge category={selectedProject.category} />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleDoneForToday}
                title="Done for today"
                className="text-stone/30 hover:text-green transition-colors p-1"
              >
                <Check size={14} />
              </button>
              <button
                onClick={handleClear}
                className="text-stone/40 hover:text-stone transition-colors p-1"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Intention */}
          {editingIntention ? (
            <input
              value={intention}
              onChange={e => setIntention(e.target.value)}
              onBlur={handleIntentionSubmit}
              onKeyDown={e => e.key === 'Enter' && handleIntentionSubmit()}
              placeholder="What progress will I make today?"
              autoFocus
              className="w-full px-3 py-2 rounded-[6px] border border-border bg-canvas
                text-[13px] text-charcoal placeholder:text-stone/30
                outline-none focus:border-stone/40 transition-colors mb-4"
            />
          ) : (
            <button
              onClick={() => setEditingIntention(true)}
              className="text-[13px] text-stone/50 hover:text-stone mb-4 block transition-colors italic"
            >
              {intention || 'What progress will I make today?'}
            </button>
          )}

          {/* Pomodoro timer */}
          <div className="pt-3 border-t border-border/50">
            <PomodoroTimer onStartFocus={onEnterCitadel} />
          </div>

          {/* Task preview */}
          {selectedProject.tasks.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border/50">
              <div className="text-[10px] uppercase tracking-wider text-stone/50 mb-2">
                Tasks in this project
              </div>
              {selectedProject.tasks
                .filter(t => t.status !== 'done')
                .slice(0, 3)
                .map(task => (
                  <button
                    key={task.id}
                    onClick={() => setOpenProjectId(selectedProject.id)}
                    className="text-[12px] text-stone py-0.5 flex items-center gap-2 hover:text-charcoal transition-colors w-full text-left"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-stone/20 flex-shrink-0" />
                    {task.title}
                  </button>
                ))}
              {selectedProject.tasks.filter(t => t.status !== 'done').length > 3 && (
                <div className="text-[11px] text-stone/40 mt-1">
                  +{selectedProject.tasks.filter(t => t.status !== 'done').length - 3} more
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div>
          {/* Project picker */}
          <button
            onClick={() => setShowPicker(!showPicker)}
            className="w-full flex items-center justify-between px-3 py-3 rounded-[6px]
              border border-dashed border-stone/20 text-[13px] text-stone/50
              hover:border-stone/30 hover:text-stone transition-all"
          >
            <span>Pick your deep work project</span>
            <ChevronDown size={14} className={`transition-transform ${showPicker ? 'rotate-180' : ''}`} />
          </button>

          {showPicker && (
            <div className="mt-2 space-y-1.5 animate-slide-up">
              {inProgressProjects.length === 0 ? (
                <div className="text-[13px] text-stone/40 py-4 text-center">
                  No projects in progress. Move a project to In Progress first.
                </div>
              ) : (
                inProgressProjects.map(project => {
                  const config = CATEGORY_CONFIG[project.category]
                  return (
                    <button
                      key={project.id}
                      onClick={() => handleSelectProject(project.id)}
                      className="w-full flex items-center gap-3 p-2.5 rounded-[6px]
                        border border-border bg-canvas hover:border-stone/30 hover:shadow-card
                        transition-all duration-150 text-left group"
                    >
                      {project.coverImageUrl && (
                        <div className="w-8 h-8 rounded-[4px] overflow-hidden flex-shrink-0">
                          <img src={project.coverImageUrl} alt="" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium text-charcoal truncate">{project.title}</div>
                        <div className="text-[10px] mt-0.5" style={{ color: config.color }}>
                          {config.label}
                          {project.trackProgress && project.daysWorked > 0 && (
                            <span className="text-stone/50 ml-2">{project.daysWorked} days</span>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          )}

          {!showPicker && (
            <div className="mt-3 text-[12px] text-stone/40 italic text-center">
              Your best energy. Your most important project.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
