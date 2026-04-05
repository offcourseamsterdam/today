import { useState } from 'react'
import { useStore } from '../../store'
import { CATEGORY_CONFIG, type Category, type Project } from '../../types'
import { ToggleSwitch } from '../ui/ToggleSwitch'

const EMPTY_CONTEXTS: never[] = []
const categories = Object.entries(CATEGORY_CONFIG) as [Category, typeof CATEGORY_CONFIG[Category]][]

interface ProjectModalSettingsProps {
  project: Project
  onClose: () => void
}

export function ProjectModalSettings({ project, onClose }: ProjectModalSettingsProps) {
  const updateProject = useStore(s => s.updateProject)
  const deleteProject = useStore(s => s.deleteProject)
  const contexts = useStore(s => s.settings.contexts) ?? EMPTY_CONTEXTS

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  function handleDelete() {
    deleteProject(project.id)
    onClose()
  }

  return (
    <div className="bg-[#FAF9F7] px-7 py-4 border-b border-border animate-[slide-down_150ms_ease-out]">
      {/* Category selector */}
      <div className="flex flex-wrap gap-1.5 mb-4">
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
        <div className="flex flex-wrap gap-1.5 mb-4">
          {contexts.map(ctx => {
            const isActive = project.contextIds?.includes(ctx.id) ?? false
            function toggleCtx() {
              const current = project.contextIds ?? []
              const updated = isActive
                ? current.filter(id => id !== ctx.id)
                : [...current, ctx.id]
              updateProject(project.id, { contextIds: updated.length > 0 ? updated : undefined })
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

      {/* Toggles — compact 2-column grid */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 mb-4">
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-charcoal">Track progress</span>
          <ToggleSwitch
            active={!!project.trackProgress}
            onChange={() => updateProject(project.id, { trackProgress: !project.trackProgress })}
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[12px] text-charcoal">Mission critical</span>
          <ToggleSwitch
            active={!!project.missionCritical}
            onChange={() => updateProject(project.id, { missionCritical: !project.missionCritical })}
            activeColor="bg-red"
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[12px] text-charcoal">Complete project</span>
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
      </div>

      {/* Delete project */}
      <div>
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
  )
}
