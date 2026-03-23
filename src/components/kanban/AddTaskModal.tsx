import { useState } from 'react'
import { X } from 'lucide-react'
import { useStore } from '../../store'

interface AddTaskModalProps {
  open: boolean
  onClose: () => void
}

export function AddTaskModal({ open, onClose }: AddTaskModalProps) {
  const [title, setTitle] = useState('')
  const addOrphanTask = useStore(s => s.addOrphanTask)

  if (!open) return null

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    addOrphanTask(title.trim())
    setTitle('')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-charcoal/40 backdrop-blur-sm" />
      <div
        className="relative bg-card rounded-t-[16px] sm:rounded-[10px] p-6 w-full sm:max-w-sm sm:max-h-[85vh] max-h-[90vh] overflow-y-auto animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-stone hover:text-charcoal transition-colors"
        >
          <X size={18} />
        </button>

        <h2 className="font-serif text-lg text-charcoal mb-5">New task</h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-[11px] uppercase tracking-[0.08em] text-stone font-medium mb-2">
              Task
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="What needs doing?"
              autoFocus
              className="w-full px-3 py-2.5 rounded-[6px] border border-border bg-card
                text-[14px] text-charcoal placeholder:text-stone/40
                outline-none focus:border-stone/40 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={!title.trim()}
            className="w-full py-2.5 rounded-[6px] text-[13px] font-medium
              bg-charcoal text-canvas
              hover:bg-charcoal/90 disabled:opacity-40 disabled:cursor-not-allowed
              transition-all duration-150"
          >
            Add task
          </button>
        </form>
      </div>
    </div>
  )
}
