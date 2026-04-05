import type { MeetingNotes } from '../types'
import { assembleMeetingContext } from './meetingContext'
import { useStore } from '../store'

const MAX_BLOB_SIZE = 4 * 1024 * 1024 // 4 MB — under Vercel's 4.5 MB limit

async function transcribeSingleBlob(blob: Blob, lang: string): Promise<string> {
  if (blob.size === 0) return ''
  const langParam = lang === 'auto' ? '' : `?language=${lang}`
  const resp = await fetch(`/api/transcribe${langParam}`, {
    method: 'POST',
    body: blob,
    headers: { 'Content-Type': 'audio/webm' },
  })
  if (!resp.ok) {
    let msg = `Transcription failed: ${resp.status}`
    try { const d = await resp.json(); if (d.error) msg += ` — ${d.error}` } catch {}
    throw new Error(msg)
  }
  const data = await resp.json()
  return data.text ?? ''
}

/**
 * Transcribe a blob that may exceed Vercel's body limit.
 * For uploaded files we can't split by MediaRecorder chunk boundaries,
 * so we warn and send as-is (user should use shorter files or lower quality).
 */
async function transcribeBlob(blob: Blob, lang: string): Promise<string> {
  if (blob.size > MAX_BLOB_SIZE) {
    console.warn(`[processAudioBlob] Audio file is ${(blob.size / 1024 / 1024).toFixed(1)} MB — may exceed server limit. Consider using shorter recordings.`)
  }
  return transcribeSingleBlob(blob, lang)
}

/**
 * Standalone audio processing — same pipeline as processRecording in useRecording.ts,
 * but without the hook dependency so it can be called from any component.
 */
export async function processAudioBlob(
  blob: Blob,
  meetingId: string,
  language: string,
): Promise<void> {
  const store = useStore.getState()
  const { setProcessingMeetingId, setProcessingPhase, setProcessingError, saveMeetingNotes } = store

  setProcessingMeetingId(meetingId)
  setProcessingPhase('transcribing')
  setProcessingError(null)
  try {
    if (blob.size === 0) return

    const transcript = await transcribeBlob(blob, language)
    const isPromptEcho = transcript.toLowerCase().includes('meeting recording') && transcript.length < 200
    if (!transcript.trim() || isPromptEcho) return

    useStore.getState().setProcessingPhase('summarizing')

    const state = useStore.getState()
    const allMeetings = [...state.meetings, ...state.recurringMeetings]
    const meeting = allMeetings.find(m => m.id === meetingId)
    const agendaItems = meeting?.agendaItems?.map(item => item.title) ?? []
    const context = meeting?.context ?? ''
    const projectContext = meeting
      ? assembleMeetingContext(meeting, state.projects, allMeetings)
      : undefined

    const existingAgendaItemNotes = meeting?.meetingNotes?.agendaItemNotes

    const notesResp = await fetch('/api/meeting-notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript, agendaItems, language, context, projectContext }),
    })
    if (!notesResp.ok) {
      let msg = `Summarization failed: ${notesResp.status}`
      try { const d = await notesResp.json(); if (d.error) msg += ` — ${d.error}` } catch {}
      throw new Error(msg)
    }
    const notesData = await notesResp.json()

    const meetingNotes: MeetingNotes = {
      transcript,
      summary: notesData.summary,
      actionItems: notesData.actionItems,
      decisions: notesData.decisions,
      openQuestions: notesData.openQuestions ?? [],
      outcome: notesData.outcome ?? 'productive',
      generatedAt: new Date().toISOString(),
      agendaItemNotes: existingAgendaItemNotes,
    }

    saveMeetingNotes(meetingId, meetingNotes)
  } catch (err) {
    console.error('[processAudioBlob] error:', err)
    useStore.getState().setProcessingError(err instanceof Error ? err.message : 'Processing failed')
  } finally {
    useStore.getState().setProcessingMeetingId(null)
    useStore.getState().setProcessingPhase(null)
  }
}
