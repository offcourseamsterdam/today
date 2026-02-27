import { useState } from 'react'
import { X } from 'lucide-react'
import { useStore } from '../../store'
import { CATEGORY_CONFIG, type Category } from '../../types'
import { fetchCoverImage, markProjectFetchInFlight, unmarkProjectFetchInFlight } from '../../lib/artwork'

interface AddProjectModalProps {
  open: boolean
  onClose: () => void
}

const categories = Object.entries(CATEGORY_CONFIG) as [Category, typeof CATEGORY_CONFIG[Category]][]

export function AddProjectModal({ open, onClose }: AddProjectModalProps) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<Category>('marketing')
  const addProject = useStore(s => s.addProject)
  const updateProject = useStore(s => s.updateProject)
  const markArtworkLoading = useStore(s => s.markArtworkLoading)
  const unmarkArtworkLoading = useStore(s => s.unmarkArtworkLoading)

  if (!open) return null

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    const id = addProject(title.trim(), category)
    setTitle('')
    setCategory('marketing')
    onClose()
    // Fetch artwork in background
    // markProjectFetchInFlight: prevents ProjectModalCover from double-fetching
    // markArtworkLoading: drives skeleton animation on ProjectCard
    markProjectFetchInFlight(id)
    markArtworkLoading(id)
    fetchCoverImage(category, title.trim()).then(result => {
      if (result) {
        updateProject(id, { coverImageUrl: result.url, coverImageTitle: result.title })
      }
    }).finally(() => {
      unmarkProjectFetchInFlight(id)
      unmarkArtworkLoading(id)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-charcoal/40 backdrop-blur-sm" />
      <div
        className="relative bg-card rounded-[10px] shadow-modal p-6 w-full max-w-md animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-stone hover:text-charcoal transition-colors"
        >
          <X size={18} />
        </button>

        <h2 className="font-serif text-lg text-charcoal mb-5">New project</h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-[11px] uppercase tracking-[0.08em] text-stone font-medium mb-2">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="What are you building?"
              autoFocus
              className="w-full px-3 py-2.5 rounded-[6px] border border-border bg-card
                text-[14px] text-charcoal placeholder:text-stone/40
                outline-none focus:border-stone/40 transition-colors"
            />
          </div>

          <div className="mb-6">
            <label className="block text-[11px] uppercase tracking-[0.08em] text-stone font-medium mb-2">
              Category
            </label>
            <div className="flex flex-wrap gap-2">
              {categories.map(([key, config]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCategory(key)}
                  className={`text-[12px] px-3 py-1.5 rounded-full border transition-all duration-150
                    ${category === key
                      ? 'border-transparent font-medium'
                      : 'border-border bg-card text-stone hover:border-stone/30'}`}
                  style={category === key
                    ? { background: config.bg, color: config.color }
                    : undefined}
                >
                  {config.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={!title.trim()}
            className="w-full py-2.5 rounded-[6px] text-[13px] font-medium
              bg-charcoal text-canvas
              hover:bg-charcoal/90 disabled:opacity-40 disabled:cursor-not-allowed
              transition-all duration-150"
          >
            Add to backlog
          </button>
        </form>
      </div>
    </div>
  )
}
