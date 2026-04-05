import { useState, useEffect, useRef } from 'react'
import { X, ImagePlus, RefreshCw, Move, Settings, Link2, Check } from 'lucide-react'
import { publishSharedProject, getShareUrl } from '../../lib/shareProject'
import { fetchCoverImage, isProjectFetchInFlight } from '../../lib/artwork'
import { auth } from '../../lib/firebase'
import { useStore } from '../../store'
import type { Project } from '../../types'

interface ProjectModalCoverProps {
  project: Project
  categoryConfig: { color: string; bg: string }
  onClose: () => void
  updateProject: (id: string, updates: Partial<Project>) => void
  onGearClick?: () => void
  gearOpen?: boolean
  categoryLabel?: string
  categoryColor?: string
  categoryBg?: string
}

export function ProjectModalCover({
  project,
  categoryConfig,
  onClose,
  updateProject,
  onGearClick,
  gearOpen,
  categoryLabel,
  categoryColor,
  categoryBg,
}: ProjectModalCoverProps) {
  const [repositioning, setRepositioning] = useState(false)
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null)
  const [loadingImage, setLoadingImage] = useState(false)
  const [fetchFailed, setFetchFailed] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)
  const [shareError, setShareError] = useState(false)
  const meetings = useStore(s => s.meetings)
  const recurringMeetings = useStore(s => s.recurringMeetings)
  const projectMeetings = [...meetings, ...recurringMeetings].filter(m => m.projectId === project.id)
  const markArtworkLoading = useStore(s => s.markArtworkLoading)
  const unmarkArtworkLoading = useStore(s => s.unmarkArtworkLoading)
  const imgContainerRef = useRef<HTMLDivElement>(null)
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; posX: number; posY: number } | null>(null)
  const dragPosRef = useRef<{ x: number; y: number } | null>(null)

  // Auto-fetch cover image for new projects without one (skip if already fetching in background)
  useEffect(() => {
    if (!project.coverImageUrl && !loadingImage && !isProjectFetchInFlight(project.id)) {
      handleFetchImage()
    }
  }, [project.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const currentPos = dragPos ?? project.coverImagePosition ?? { x: 50, y: 50 }

  function handleRepositionMouseDown(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    const pos = project.coverImagePosition ?? { x: 50, y: 50 }
    dragStartRef.current = { mouseX: e.clientX, mouseY: e.clientY, posX: pos.x, posY: pos.y }

    function onMouseMove(ev: MouseEvent) {
      if (!dragStartRef.current || !imgContainerRef.current) return
      const container = imgContainerRef.current.getBoundingClientRect()
      const dx = ev.clientX - dragStartRef.current.mouseX
      const dy = ev.clientY - dragStartRef.current.mouseY
      const newX = Math.max(0, Math.min(100, dragStartRef.current.posX - (dx / container.width) * 100))
      const newY = Math.max(0, Math.min(100, dragStartRef.current.posY - (dy / container.height) * 100))
      const newPos = { x: newX, y: newY }
      dragPosRef.current = newPos
      setDragPos(newPos)
    }

    function onMouseUp() {
      if (dragPosRef.current) {
        updateProject(project.id, { coverImagePosition: dragPosRef.current })
      }
      dragStartRef.current = null
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  function commitReposition() {
    const pos = dragPosRef.current ?? dragPos
    if (pos) {
      updateProject(project.id, { coverImagePosition: pos })
    }
    setRepositioning(false)
    setDragPos(null)
    dragPosRef.current = null
  }

  async function handleFetchImage() {
    setLoadingImage(true)
    setFetchFailed(false)
    markArtworkLoading(project.id)
    try {
      const result = await fetchCoverImage(project.category, project.title)
      if (result) {
        updateProject(project.id, {
          coverImageUrl: result.url,
          coverImageTitle: result.title,
        })
      } else {
        setFetchFailed(true)
        setTimeout(() => setFetchFailed(false), 2500)
      }
    } finally {
      setLoadingImage(false)
      unmarkArtworkLoading(project.id)
    }
  }

  return (
    <div className="relative group">
      {project.coverImageUrl ? (
        <div
          ref={imgContainerRef}
          className={`h-48 rounded-t-[10px] overflow-hidden relative
            ${repositioning ? 'cursor-grab active:cursor-grabbing' : ''}`}
          onMouseDown={repositioning ? handleRepositionMouseDown : undefined}
        >
          <img
            src={project.coverImageUrl}
            alt={project.coverImageTitle || ''}
            className="w-full h-full object-cover pointer-events-none select-none"
            style={{ objectPosition: `${currentPos.x}% ${currentPos.y}%` }}
            draggable={false}
          />
          {/* Category accent bar */}
          <div
            className="absolute bottom-0 left-0 right-0 h-1"
            style={{ background: categoryConfig.color }}
          />

          {/* Reposition mode overlay */}
          {repositioning && (
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
              <div className="flex items-center gap-2 bg-black/60 text-white text-[12px] px-4 py-2 rounded-full backdrop-blur-sm">
                <Move size={14} />
                Drag to reposition
                <button
                  onMouseDown={e => e.stopPropagation()}
                  onClick={commitReposition}
                  className="ml-2 text-[11px] bg-white/20 hover:bg-white/30 px-2.5 py-0.5 rounded-full transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          )}

          {/* Hover controls */}
          {!repositioning && (
            <>
              {/* Artwork title */}
              {project.coverImageTitle && (
                <div className="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[10px] text-white/80 bg-black/40 px-2 py-0.5 rounded backdrop-blur-sm">
                    {project.coverImageTitle}
                  </span>
                </div>
              )}

              {/* Action buttons row */}
              <div className="absolute top-3 left-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => { e.stopPropagation(); setRepositioning(true) }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-black/40 text-white/90
                    hover:bg-black/60 transition-all backdrop-blur-sm text-[11px]"
                >
                  <Move size={12} />
                  Reposition
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleFetchImage() }}
                  disabled={loadingImage}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-white/90
                    transition-all backdrop-blur-sm text-[11px] disabled:opacity-60
                    ${fetchFailed ? 'bg-red-500/60 hover:bg-red-500/70' : 'bg-black/40 hover:bg-black/60'}`}
                >
                  {loadingImage
                    ? <RefreshCw size={12} className="animate-spin" />
                    : <ImagePlus size={12} />}
                  {fetchFailed ? 'Try again' : 'New artwork'}
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        <div
          className="h-36 rounded-t-[10px] flex items-center justify-center cursor-pointer transition-colors"
          style={{ background: categoryConfig.bg }}
          onClick={(e) => { e.stopPropagation(); handleFetchImage() }}
        >
          {loadingImage ? (
            <RefreshCw size={20} className="text-stone/40 animate-spin" />
          ) : (
            <div className="flex flex-col items-center gap-1.5 text-stone/40 hover:text-stone/60 transition-colors">
              <ImagePlus size={22} />
              <span className="text-[11px]">Find artwork</span>
            </div>
          )}
        </div>
      )}

      {/* Top-right buttons */}
      <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
        {categoryLabel && (
          <span
            className="text-[10px] font-medium uppercase tracking-wider px-2.5 py-1 rounded-full backdrop-blur-sm"
            style={{ background: categoryBg, color: categoryColor }}
          >
            {categoryLabel}
          </span>
        )}
        <button
          onClick={async (e) => {
            e.stopPropagation()
            if (sharing) return
            if (!auth.currentUser) {
              setShareError(true)
              setTimeout(() => setShareError(false), 2500)
              return
            }
            setSharing(true)
            try {
              const shareId = await publishSharedProject(project, projectMeetings, auth.currentUser.displayName ?? undefined)
              // Persist the shareId on the project so future shares reuse the same URL
              if (!project.shareId) {
                updateProject(project.id, { shareId })
              }
              const url = getShareUrl(shareId)
              await navigator.clipboard.writeText(url)
              setShareCopied(true)
              setTimeout(() => setShareCopied(false), 2000)
            } catch (err) {
              console.error('[share] failed:', err)
              setShareError(true)
              setTimeout(() => setShareError(false), 2500)
            } finally {
              setSharing(false)
            }
          }}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all backdrop-blur-sm
            ${shareCopied
              ? 'bg-green-500/70 text-white'
              : shareError
                ? 'bg-red-500/70 text-white'
                : 'bg-charcoal/30 text-white hover:bg-charcoal/50'}`}
          title={shareCopied ? 'Link copied!' : shareError ? 'Sign in to share' : 'Copy share link'}
        >
          {shareCopied ? <Check size={14} /> : <Link2 size={14} />}
        </button>
        {onGearClick && (
          <button
            onClick={(e) => { e.stopPropagation(); onGearClick() }}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all
              ${gearOpen
                ? 'bg-white/90 text-charcoal'
                : 'bg-charcoal/30 backdrop-blur-sm text-white hover:bg-charcoal/50'}`}
          >
            <Settings size={15} />
          </button>
        )}
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full flex items-center justify-center
            bg-black/30 text-white/80 hover:bg-black/50 hover:text-white transition-all backdrop-blur-sm"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
