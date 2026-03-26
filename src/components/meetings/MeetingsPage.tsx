// src/components/meetings/MeetingsPage.tsx
import { UpcomingColumn } from './UpcomingColumn'
import { HistoryColumn } from './HistoryColumn'

export function MeetingsPage() {
  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 pb-12">
      <div className="flex gap-0 border border-border rounded-[12px] overflow-hidden
        bg-canvas shadow-sm" style={{ minHeight: 'calc(100vh - 180px)' }}>
        {/* Left: Upcoming (35%) */}
        <div className="w-[35%] flex-shrink-0 flex flex-col min-h-0">
          <UpcomingColumn />
        </div>
        {/* Right: History (65%) */}
        <div className="flex-1 flex flex-col min-h-0">
          <HistoryColumn />
        </div>
      </div>
    </div>
  )
}
