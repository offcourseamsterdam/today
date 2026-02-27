import { useState } from 'react'
import { X } from 'lucide-react'
import { useStore } from '../../store'

export function WaitingPromptModal() {
  const projects = useStore(s => s.projects)
  const waitingPromptProjectId = useStore(s => s.waitingPromptProjectId)
  const setWaitingPromptProjectId = useStore(s => s.setWaitingPromptProjectId)
  const updateProject = useStore(s => s.updateProject)

  const [personInput, setPersonInput] = useState('')

  if (!waitingPromptProjectId) return null

  const project = projects.find(p => p.id === waitingPromptProjectId)
  if (!project) return null

  function handleConfirm() {
    const trimmed = personInput.trim()
    if (!trimmed) return
    updateProject(waitingPromptProjectId!, {
      status: 'waiting',
      waitingOn: [{ person: trimmed, since: new Date().toISOString() }],
    })
    setPersonInput('')
    setWaitingPromptProjectId(null)
  }

  function handleCancel() {
    setPersonInput('')
    setWaitingPromptProjectId(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={handleCancel}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-charcoal/40 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative bg-card rounded-[10px] shadow-modal p-6 w-full max-w-sm animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={handleCancel}
          className="absolute top-4 right-4 text-stone hover:text-charcoal transition-colors"
        >
          <X size={18} />
        </button>

        <h2 className="font-serif text-lg text-charcoal mb-1">Op wie wacht je?</h2>
        <p className="text-[12px] text-stone mb-5 truncate">{project.title}</p>

        <input
          type="text"
          value={personInput}
          onChange={e => setPersonInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleConfirm()}
          placeholder="Naam of bedrijf"
          autoFocus
          className="w-full px-3 py-2 text-[13px] border border-border rounded-[6px] bg-canvas
            text-charcoal placeholder:text-stone/30
            focus:outline-none focus:border-stone/40 transition-colors mb-4"
        />

        <div className="flex items-center gap-2">
          <button
            onClick={handleConfirm}
            disabled={!personInput.trim()}
            className="flex-1 py-2 text-[13px] bg-charcoal text-canvas rounded-[6px]
              hover:bg-charcoal/90 transition-colors disabled:opacity-40"
          >
            Bevestig
          </button>
          <button
            onClick={handleCancel}
            className="flex-1 py-2 text-[13px] text-stone border border-border rounded-[6px]
              hover:text-charcoal hover:border-stone/30 transition-colors"
          >
            Annuleer
          </button>
        </div>
      </div>
    </div>
  )
}
