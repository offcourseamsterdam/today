import { useState, useCallback, useEffect } from 'react'
import { useStore } from '../../store'
import { CategoryBadge } from '../ui/CategoryBadge'
import { ProjectEditor } from '../editor/ProjectEditor'
import { CATEGORY_CONFIG, type Category, type Project } from '../../types'

const EMPTY_CONTEXTS: never[] = []
import { ProjectModalCover } from './ProjectModalCover'
import { ProjectModalTasks } from './ProjectModalTasks'
import { ProjectModalWaiting } from './ProjectModalWaiting'
import { ProjectModalRecurring } from './ProjectModalRecurring'
import { ProjectModalMeetings } from './ProjectModalMeetings'
import { ToggleSwitch } from '../ui/ToggleSwitch'

interface ProjectModalProps {
  project: Project | null
  onClose: () => void
}

const categories = Object.entries(CATEGORY_CONFIG) as [Category, typeof CATEGORY_CONFIG[Category]][]

export function ProjectModal({ project, onClose }: ProjectModalProps) {
  const updateProject = useStore(s => s.updateProject)
  const deleteProject = useStore(s => s.deleteProject)
  const syncCheckboxTasks = useStore(s => s.syncCheckboxTasks)
  const contexts = useStore(s => s.settings.contexts) ?? EMPTY_CONTEXTS

  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showEditor, setShowEditor] = useState(false)

  // Delay showing editor to avoid flash
  useEffect(() => {
    if (project) {
      const timer = setTimeout(() => setShowEditor(true), 100)
      return () => clearTimeout(timer)
    } else {
      setShowEditor(false)
    }
  }, [project?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleEditorChange = useCallback((content: string) => {
    if (project) {
      updateProject(project.id, { bodyContent: content })
    }
  }, [project?.id, updateProject]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleCheckboxChange = useCallback((checkboxTexts: string[]) => {
    if (project) {
      syncCheckboxTasks(project.id, checkboxTexts)
    }
  }, [project?.id, syncCheckboxTasks]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!project) return null

  const categoryConfig = CATEGORY_CONFIG[project.category]
  const doneTasks = project.tasks.filter(t => t.status === 'done').length
  const totalTasks = project.tasks.length
  const activeContexts = contexts.filter(c => project.contextIds?.includes(c.id))

  function handleTitleSubmit() {
    if (titleDraft.trim()) {
      updateProject(project!.id, { title: titleDraft.trim() })
    }
    setEditingTitle(false)
  }

  function handleDelete() {
    deleteProject(project!.id)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-charcoal/40 backdrop-blur-sm" />
      <div
        className="relative bg-card rounded-[10px] shadow-modal w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        <ProjectModalCover
          project={project}
          categoryConfig={categoryConfig}
          onClose={onClose}
          updateProject={updateProject}
        />

        <div className="px-7 py-6">
          {/* Title */}
          {editingTitle ? (
            <input
              value={titleDraft}
              onChange={e => setTitleDraft(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={e => e.key === 'Enter' && handleTitleSubmit()}
              autoFocus
              className="text-[22px] font-serif text-charcoal bg-transparent border-none outline-none w-full mb-1 tracking-[-0.01em]"
            />
          ) : (
            <h2
              className="text-[22px] font-serif text-charcoal mb-1 cursor-pointer hover:opacity-70 transition-opacity tracking-[-0.01em]"
              onClick={() => {
                setTitleDraft(project.title)
                setEditingTitle(true)
              }}
            >
              {project.title}
            </h2>
          )}

          {/* Meta row */}
          <div className="flex items-center gap-3 mb-5">
            <CategoryBadge category={project.category} />
            {activeContexts.map(ctx => (
              <span key={ctx.id} className="text-[10px] uppercase tracking-[0.06em] text-stone/50 font-medium">
                {ctx.name}
              </span>
            ))}
            {project.trackProgress && project.daysWorked > 0 && (
              <span className="text-[11px] text-stone font-medium" style={{ color: categoryConfig.color }}>
                {project.daysWorked} days worked
              </span>
            )}
            {totalTasks > 0 && (
              <span className="text-[11px] text-stone ml-auto">
                {doneTasks}/{totalTasks}
              </span>
            )}
          </div>

          {/* Progress bar */}
          {totalTasks > 0 && (
            <div className="h-1 bg-border-light rounded-full mb-5 overflow-hidden">
              <div
                className="h-full rounded-full transition-[width] duration-500 ease-out"
                style={{
                  width: `${Math.round((doneTasks / totalTasks) * 100)}%`,
                  background: categoryConfig.color,
                }}
              />
            </div>
          )}

          {/* Category selector */}
          <div className="flex flex-wrap gap-1.5 mb-5">
            {categories.map(([key, config]) => (
              <button
                key={key}
                onClick={() => updateProject(project.id, { category: key })}
                className={`text-[10px] px-2.5 py-1 rounded-full border transition-all duration-150
                  ${project.category === key
                    ? 'border-transparent font-medium'
                    : 'border-border bg-card text-stone hover:border-stone/30'}`}
                style={project.category === key
                  ? { background: config.bg, color: config.color }
                  : undefined}
              >
                {config.label}
              </button>
            ))}
          </div>

          {/* Context selector (multi-select) */}
          {contexts.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-5">
              {contexts.map(ctx => {
                const isActive = project.contextIds?.includes(ctx.id) ?? false
                function toggleCtx() {
                  const current = project!.contextIds ?? []
                  const updated = isActive
                    ? current.filter(id => id !== ctx.id)
                    : [...current, ctx.id]
                  updateProject(project!.id, { contextIds: updated.length > 0 ? updated : undefined })
                }
                return (
                  <button
                    key={ctx.id}
                    onClick={toggleCtx}
                    className={`text-[10px] px-2.5 py-1 rounded-full border transition-all duration-150
                      ${isActive
                        ? 'bg-charcoal text-canvas border-transparent font-medium'
                        : 'border-border bg-card text-stone hover:border-stone/30'}`}
                  >
                    {ctx.name}
                  </button>
                )
              })}
            </div>
          )}

          {/* Rich text editor */}
          <div className="mb-5 border-t border-border pt-4">
            <div className="text-[11px] uppercase tracking-[0.08em] text-stone font-medium mb-3">
              Notes
            </div>
            {showEditor && (
              <div className="min-h-[120px] -mx-3">
                <ProjectEditor
                  key={project.id}
                  initialContent={project.bodyContent}
                  onChange={handleEditorChange}
                  onCheckboxChange={handleCheckboxChange}
                />
              </div>
            )}
          </div>

          {/* Track progress toggle */}
          <div className="flex items-center justify-between py-3 border-t border-border">
            <div>
              <span className="text-[13px] text-charcoal">Track progress</span>
              <span className="text-[11px] text-stone ml-2">Count days you work on this</span>
            </div>
            <ToggleSwitch
              active={!!project.trackProgress}
              onChange={() => updateProject(project.id, { trackProgress: !project.trackProgress })}
            />
          </div>

          {/* Mission critical toggle */}
          <div className="flex items-center justify-between py-3 border-t border-border">
            <div>
              <span className="text-[13px] text-charcoal">Mission critical</span>
              <span className="text-[11px] text-stone ml-2">This project must not stall</span>
            </div>
            <ToggleSwitch
              active={!!project.missionCritical}
              onChange={() => updateProject(project.id, { missionCritical: !project.missionCritical })}
              activeColor="bg-red"
            />
          </div>

          {/* Complete project toggle */}
          <div className="flex items-center justify-between py-3 border-t border-border">
            <div>
              <span className="text-[13px] text-charcoal">Complete project</span>
              <span className="text-[11px] text-stone ml-2">Moved to Done</span>
            </div>
            <ToggleSwitch
              active={project.status === 'done'}
              onChange={() => {
                if (project.status === 'done') {
                  updateProject(project.id, { status: 'in_progress' })
                } else {
                  updateProject(project.id, { status: 'done' })
                  onClose()
                }
              }}
            />
          </div>

          <ProjectModalWaiting project={project} updateProject={updateProject} />

          <ProjectModalRecurring project={project} />

          <ProjectModalTasks project={project} />

          <ProjectModalMeetings projectId={project.id} />

          {/* Delete project */}
          <div className="mt-6 pt-4 border-t border-border">
            {showDeleteConfirm ? (
              <div className="flex items-center gap-3">
                <span className="text-[12px] text-red">Delete this project and all its tasks?</span>
                <button
                  onClick={handleDelete}
                  className="text-[12px] text-card bg-red px-3 py-1.5 rounded-[6px] hover:opacity-90 transition-opacity"
                >
                  Delete
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="text-[12px] text-stone hover:text-charcoal transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="text-[12px] text-stone hover:text-red transition-colors"
              >
                Delete project...
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
