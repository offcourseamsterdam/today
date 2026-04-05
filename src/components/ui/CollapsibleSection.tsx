import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface CollapsibleSectionProps {
  title: string
  icon?: React.ReactNode
  badge?: string | number
  defaultOpen?: boolean
  children: React.ReactNode
}

export function CollapsibleSection({ title, icon, badge, defaultOpen = false, children }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full py-2 text-left group"
      >
        {icon}
        <span className="text-[11px] uppercase tracking-[0.08em] text-stone font-medium">
          {title}
        </span>
        {badge !== undefined && (
          <span className="text-[10px] text-stone/50 bg-[#F0EEEB] rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
            {badge}
          </span>
        )}
        <ChevronDown
          size={13}
          className={`ml-auto text-stone/40 transition-transform duration-200
            ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <div className={`overflow-hidden transition-all duration-200 ease-out
        ${open ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
        {children}
      </div>
    </div>
  )
}
