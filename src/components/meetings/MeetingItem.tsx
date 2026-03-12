import { Clock, X } from 'lucide-react'
import type { Meeting } from '../../types'

interface MeetingItemProps {
  meeting: Meeting
  onRemove: () => void
  onEdit: () => void
}

export function MeetingItem({ meeting, onRemove, onEdit }: MeetingItemProps) {
  return (
    <div
      className="flex items-center gap-3 py-2 group cursor-pointer hover:bg-canvas/50 -mx-1 px-1 rounded-[4px] transition-colors"
      onClick={onEdit}
    >
      <Clock size={13} className="text-cat-marketing flex-shrink-0" />
      <span className="text-[10px] font-medium text-cat-marketing bg-cat-marketing/10 px-1.5 py-0.5 rounded-full flex-shrink-0">
        {meeting.time}
      </span>
      <span className="text-[13px] text-charcoal flex-1 min-w-0 truncate">
        {meeting.title}
      </span>
      <span className="text-[10px] text-stone/40 flex-shrink-0">
        {meeting.durationMinutes}m
      </span>
      <button
        onClick={(e) => { e.stopPropagation(); onRemove() }}
        className="opacity-0 group-hover:opacity-60 hover:!opacity-100 text-stone transition-all"
      >
        <X size={13} />
      </button>
    </div>
  )
}
