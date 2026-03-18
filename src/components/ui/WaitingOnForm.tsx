import { X } from 'lucide-react'

interface WaitingOnFormProps {
  value: string
  onChange: (v: string) => void
  onConfirm: () => void
  onCancel: () => void
}

export function WaitingOnForm({ value, onChange, onConfirm, onCancel }: WaitingOnFormProps) {
  return (
    <div>
      <label className="block text-[11px] uppercase tracking-[0.08em] text-stone font-medium mb-2">
        Who are you waiting for?
      </label>
      <div className="flex gap-2">
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="Name or company"
          autoFocus
          onKeyDown={e => e.key === 'Enter' && onConfirm()}
          className="flex-1 px-3 py-2 rounded-[6px] border border-border bg-card
            text-[13px] text-charcoal placeholder:text-stone/40
            outline-none focus:border-stone/40 transition-colors"
        />
        <button
          onClick={onConfirm}
          disabled={!value.trim()}
          className="px-3 py-2 rounded-[6px] bg-charcoal text-canvas text-[12px]
            disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
        >
          Add
        </button>
        <button
          onClick={onCancel}
          className="px-2 text-stone hover:text-charcoal transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
