import { useState, useEffect, useRef } from 'react'
import { updateSharedMeetingAgenda } from '../lib/shareProject'
import type { AgendaItem } from '../types'

export type SharedSaveStatus = 'idle' | 'saving' | 'saved' | 'error'

/**
 * Auto-saves agenda item changes to the shared Firestore doc.
 * Debounces writes by 1.5s to avoid hammering Firestore on every keystroke.
 */
export function useSharedAgendaSave(
  shareId: string,
  meetingId: string | null,
  agendaItems: AgendaItem[],
): SharedSaveStatus {
  const [status, setStatus] = useState<SharedSaveStatus>('idle')
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isInitialRef = useRef(true)
  const prevJsonRef = useRef('')

  useEffect(() => {
    if (!meetingId) return

    const json = JSON.stringify(agendaItems)

    // Skip initial render — don't write back the data we just loaded
    if (isInitialRef.current) {
      isInitialRef.current = false
      prevJsonRef.current = json
      return
    }

    // Skip if nothing actually changed
    if (json === prevJsonRef.current) return
    prevJsonRef.current = json

    // Debounce the save
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setStatus('saving')

    timeoutRef.current = setTimeout(async () => {
      try {
        await updateSharedMeetingAgenda(shareId, meetingId, agendaItems)
        setStatus('saved')
        // Fade back to idle after 2s
        setTimeout(() => setStatus(s => s === 'saved' ? 'idle' : s), 2000)
      } catch (err) {
        console.error('[shared-save] failed:', err)
        setStatus('error')
      }
    }, 1500)

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [shareId, meetingId, agendaItems])

  // Reset when meeting changes
  useEffect(() => {
    isInitialRef.current = true
    prevJsonRef.current = ''
    setStatus('idle')
  }, [meetingId])

  return status
}
