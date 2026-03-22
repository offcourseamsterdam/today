import { X } from 'lucide-react'
import { useStore } from '../../store'
import { CategoryBadge } from '../ui/CategoryBadge'
import type { Project } from '../../types'

export function SwapModal() {
  const projects = useStore(s => s.projects)
  const swapModalProjectId = useStore(s => s.swapModalProjectId)
  const swapModalTargetStatus = useStore(s => s.swapModalTargetStatus)
  const inProgressLimit = useStore(s => s.settings.inProgressLimit)
  const setSwapModalProjectId = useStore(s => s.setSwapModalProjectId)
  const updateProject = useStore(s => s.updateProject)

  if (!swapModalProjectId) return null

  const incomingProject = projects.find(p => p.id === swapModalProjectId)
  // Show both in_progress and waiting as candidates to pause
  const activeProjects = projects.filter(
    p => p.status === 'in_progress' || p.status === 'waiting'
  )

  if (!incomingProject) return null

  function handleSwap(projectToRemove: Project) {
    updateProject(projectToRemove.id, { status: 'backlog', waitingOn: undefined })
    updateProject(swapModalProjectId!, { status: swapModalTargetStatus ?? 'in_progress' })
    setSwapModalProjectId(null)
  }

  function handleCancel() {
    setSwapModalProjectId(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={handleCancel}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-charcoal/40 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative bg-card rounded-[10px] shadow-modal p-6 w-full max-w-sm mx-4 animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={handleCancel}
          className="absolute top-4 right-4 text-stone hover:text-charcoal transition-colors"
        >
          <X size={18} />
        </button>

        <h2 className="font-serif text-lg text-charcoal mb-2">Which project do you want to pause?</h2>
        <p className="text-[13px] text-stone mb-5 leading-relaxed">
          You already have {inProgressLimit} active projects (in progress + waiting). To start{' '}
          <span className="font-medium text-charcoal">{incomingProject.title}</span>, you need to pause one.
        </p>

        <div className="space-y-2">
          {activeProjects.map(project => (
            <button
              key={project.id}
              onClick={() => handleSwap(project)}
              className="w-full flex items-center justify-between p-3 rounded-[6px]
                border border-border bg-canvas hover:border-stone/30 hover:shadow-card
                transition-all duration-150 text-left group"
            >
              <div>
                <div className="text-[13px] font-medium text-charcoal">{project.title}</div>
                <div className="mt-1 flex items-center gap-2">
                  <CategoryBadge category={project.category} />
                  {project.status === 'waiting' && (
                    <span className="text-[11px] text-stone/50">· waiting for</span>
                  )}
                </div>
              </div>
              <span className="text-[12px] text-stone opacity-0 group-hover:opacity-100 transition-opacity">
                Pause
              </span>
            </button>
          ))}
        </div>

        <button
          onClick={handleCancel}
          className="w-full mt-4 text-[13px] text-stone hover:text-charcoal py-2 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
