// src/components/meetings/MeetingsPage.tsx
import { useState, useEffect, useMemo } from 'react'
import { useStore } from '../../store'
import { MeetingListColumn } from './MeetingListColumn'
import { MeetingDetailPanel } from './MeetingDetailPanel'
import { RecurringSeriesPanel } from './RecurringSeriesPanel'

export function MeetingsPage() {
  const meetings = useStore(s => s.meetings)
  const recurringMeetings = useStore(s => s.recurringMeetings)
  const justEndedMeetingId = useStore(s => s.justEndedMeetingId)
  const spawnRecurringOccurrence = useStore(s => s.spawnRecurringOccurrence)
  const startMeetingSession = useStore(s => s.startMeetingSession)
  const setLiveMeetingOpen = useStore(s => s.setLiveMeetingOpen)
  const deleteMeeting = useStore(s => s.deleteMeeting)
  const deleteRecurringMeeting = useStore(s => s.deleteRecurringMeeting)

  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null)
  const [upcomingExpanded, setUpcomingExpanded] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Auto-select just-ended meeting
  useEffect(() => {
    if (justEndedMeetingId && !selectedMeetingId) {
      setSelectedMeetingId(justEndedMeetingId)
    }
  }, [justEndedMeetingId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Resolve selected meeting
  const selectedMeeting = useMemo(() => {
    if (!selectedMeetingId) return null
    return meetings.find(m => m.id === selectedMeetingId)
      ?? recurringMeetings.find(m => m.id === selectedMeetingId)
      ?? null
  }, [selectedMeetingId, meetings, recurringMeetings])

  const isRecurringTemplate = selectedMeeting
    ? recurringMeetings.some(r => r.id === selectedMeeting.id)
    : false

  // Begin meeting handler for detail panel
  function handleBeginMeeting() {
    if (!selectedMeeting) return
    const isRecurring = recurringMeetings.some(r => r.id === selectedMeeting.id)
    if (isRecurring) {
      const occId = spawnRecurringOccurrence(selectedMeeting.id)
      startMeetingSession(occId)
    } else {
      startMeetingSession(selectedMeeting.id)
    }
    setLiveMeetingOpen(true)
  }

  // Delete handler for detail panel
  function handleDelete() {
    if (!selectedMeeting) return
    const isRecurring = recurringMeetings.some(r => r.id === selectedMeeting.id)
    if (isRecurring) {
      deleteRecurringMeeting(selectedMeeting.id)
    } else {
      deleteMeeting(selectedMeeting.id)
    }
    setSelectedMeetingId(null)
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 pb-12">
      <div
        className="flex gap-0 border border-border rounded-[12px] overflow-hidden shadow-sm"
        style={{ minHeight: 'calc(100vh - 180px)' }}
      >
        {/* Left: Meeting list (35%) — canvas background, right border */}
        <div className="w-[35%] flex-shrink-0 flex flex-col min-h-0 bg-canvas border-r border-border">
          <MeetingListColumn
            selectedMeetingId={selectedMeetingId}
            onSelectMeeting={setSelectedMeetingId}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            upcomingExpanded={upcomingExpanded}
            onToggleUpcoming={() => setUpcomingExpanded(e => !e)}
          />
        </div>
        {/* Right: Detail panel (65%) — white base */}
        <div className="flex-1 flex flex-col min-h-0 bg-white">
          {isRecurringTemplate && selectedMeeting ? (
            <RecurringSeriesPanel
              template={selectedMeeting}
              onBeginMeeting={(occId) => setSelectedMeetingId(occId)}
              onDelete={handleDelete}
            />
          ) : (
            <MeetingDetailPanel
              meeting={selectedMeeting}
              onBeginMeeting={handleBeginMeeting}
              onDelete={handleDelete}
            />
          )}
        </div>
      </div>
    </div>
  )
}
