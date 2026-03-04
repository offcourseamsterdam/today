import { useEffect } from 'react'
import { X, ArrowUpRight } from 'lucide-react'
import { useStore } from '../../store'

const TOAST_DURATION = 5000

export function Toast() {
  const toastProjectId = useStore(s => s.toastProjectId)
  const dismissToast = useStore(s => s.dismissToast)
  const setOpenProjectId = useStore(s => s.setOpenProjectId)
  const projects = useStore(s => s.projects)

  const project = toastProjectId ? projects.find(p => p.id === toastProjectId) ?? null : null

  // Auto-dismiss after TOAST_DURATION; reset timer whenever a new toast fires
  useEffect(() => {
    if (!toastProjectId) return
    const timer = setTimeout(dismissToast, TOAST_DURATION)
    return () => clearTimeout(timer)
  }, [toastProjectId, dismissToast])

  if (!project) return null

  function handleOpen() {
    setOpenProjectId(project!.id)
    dismissToast()
  }

  return (
    <div
      className="fixed top-5 left-1/2 z-50 w-[320px]"
      style={{ animation: 'slide-down 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both' }}
    >
      <div
        className="bg-card border border-border rounded-[12px] overflow-hidden"
        style={{ boxShadow: 'var(--shadow-modal)' }}
      >
        {/* Body */}
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[11px] uppercase tracking-[0.08em] text-stone font-medium mb-0.5">
                Keep your notes current
              </p>
              <p className="text-[14px] font-medium text-charcoal truncate leading-snug">
                {project.title}
              </p>
            </div>
            <button
              onClick={dismissToast}
              className="text-stone/30 hover:text-stone transition-colors flex-shrink-0 mt-0.5"
            >
              <X size={14} />
            </button>
          </div>

          <button
            onClick={handleOpen}
            className="mt-3 flex items-center gap-1.5 text-[12px] text-charcoal font-medium
              px-3 py-1.5 rounded-[6px] bg-canvas border border-border
              hover:border-stone/30 hover:bg-border-light transition-all w-full justify-between group"
          >
            <span>Open project</span>
            <ArrowUpRight
              size={13}
              className="text-stone/40 group-hover:text-charcoal transition-colors"
            />
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-[3px] bg-border-light overflow-hidden">
          <div
            key={toastProjectId}
            className="h-full bg-stone/20 origin-left"
            style={{ animation: `shrink ${TOAST_DURATION}ms linear forwards` }}
          />
        </div>
      </div>
    </div>
  )
}
