import { useEffect, useRef, useCallback, useState } from 'react'
import { useStore } from '../store'
import { assembleMeetingContext } from '../lib/meetingContext'
import type { AgendaItemNotes, MeetingNotes } from '../types'

interface UseRecordingReturn {
  isRecording: boolean
  error: string | null
  stream: MediaStream | null
  retryRecording: () => void
}

// ── Transcription helpers ────────────────────────────────────────────────────

const MAX_BLOB_SIZE = 4 * 1024 * 1024 // 4 MB — under Vercel's 4.5 MB serverless body limit

/** Send a single blob to the transcribe API. */
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
 * Group 1-second MediaRecorder chunks into batches that stay under MAX_BLOB_SIZE.
 * Each batch gets the WebM EBML header prepended so it's a valid standalone container.
 * If `header` is null (first segment), the first chunk already contains the header.
 */
function createChunkedBlobs(
  chunks: Blob[],
  header: Blob | null,
  needsHeader: boolean,
  mimeType: string,
): Blob[] {
  if (chunks.length === 0) return []

  const blobs: Blob[] = []
  let parts: Blob[] = needsHeader && header ? [header] : []
  let size = needsHeader && header ? header.size : 0

  for (const chunk of chunks) {
    // If adding this chunk would exceed the limit, flush current batch
    if (size + chunk.size > MAX_BLOB_SIZE && parts.length > (needsHeader && header ? 1 : 0)) {
      blobs.push(new Blob(parts, { type: mimeType }))
      // Next batch needs header too (it's a new standalone segment)
      parts = header ? [header] : []
      size = header ? header.size : 0
    }
    parts.push(chunk)
    size += chunk.size
  }

  // Flush remaining
  if (parts.length > (header ? 1 : 0) || (!header && parts.length > 0)) {
    blobs.push(new Blob(parts, { type: mimeType }))
  }

  return blobs
}

/** Transcribe an array of blob segments sequentially and concatenate the text. */
async function transcribeBlobs(blobs: Blob[], lang: string): Promise<string> {
  const results: string[] = []
  for (const blob of blobs) {
    const text = await transcribeSingleBlob(blob, lang)
    if (text.trim()) results.push(text.trim())
  }
  return results.join(' ')
}

export function useRecording(
  meetingId: string | null,
  language: string,
): UseRecordingReturn {
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const headerChunkRef = useRef<Blob | null>(null) // First chunk contains WebM EBML header
  const streamRef = useRef<MediaStream | null>(null)
  const meetingIdRef = useRef(meetingId)
  const languageRef = useRef(language)
  const lastItemChunkIndexRef = useRef(0)  // index into chunksRef where current agenda item started
  const prevItemIndexRef = useRef<number>(-2)  // -2 = unset sentinel
  const [retryCount, setRetryCount] = useState(0)
  const [currentStream, setCurrentStream] = useState<MediaStream | null>(null)

  const meetingSession = useStore(s => s.meetingSession)
  const setProcessingMeetingId = useStore(s => s.setProcessingMeetingId)
  const setProcessingPhase = useStore(s => s.setProcessingPhase)
  const setProcessingError = useStore(s => s.setProcessingError)
  const setProcessingItemPhase = useStore(s => s.setProcessingItemPhase)
  const setProcessingItemError = useStore(s => s.setProcessingItemError)
  const saveMeetingNotes = useStore(s => s.saveMeetingNotes)
  const saveAgendaItemNotes = useStore(s => s.saveAgendaItemNotes)
  const addProcessingItemId = useStore(s => s.addProcessingItemId)
  const removeProcessingItemId = useStore(s => s.removeProcessingItemId)

  // Keep refs in sync
  meetingIdRef.current = meetingId
  languageRef.current = language

  // ── Process a single agenda item's audio segment ──────────────────────────
  const processAgendaItem = useCallback(async (
    blobs: Blob[],
    mId: string,
    lang: string,
    agendaItemId: string,
    agendaItemTitle: string,
  ) => {
    addProcessingItemId(agendaItemId)
    setProcessingItemPhase(agendaItemId, 'transcribing')
    setProcessingItemError(agendaItemId, null)
    try {
      if (blobs.length === 0 || blobs.every(b => b.size === 0)) return

      const transcript = await transcribeBlobs(blobs, lang)
      const isPromptEcho = transcript.toLowerCase().includes('meeting recording') && transcript.length < 200
      if (!transcript.trim() || isPromptEcho) return

      setProcessingItemPhase(agendaItemId, 'summarizing')

      const state = useStore.getState()
      const allMeetings = [...state.meetings, ...state.recurringMeetings]
      const meeting = allMeetings.find(m => m.id === mId)
      const context = meeting?.context ?? ''
      const projectContext = meeting
        ? assembleMeetingContext(meeting, state.projects, allMeetings)
        : undefined

      const resp = await fetch('/api/meeting-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, agendaItemTitle, language: lang, context, projectContext }),
      })
      if (!resp.ok) {
        let msg = `Summarization failed: ${resp.status}`
        try { const d = await resp.json(); if (d.error) msg += ` — ${d.error}` } catch {}
        throw new Error(msg)
      }
      const data = await resp.json()

      const itemNotes: AgendaItemNotes = {
        agendaItemId,
        agendaItemTitle,
        summary: data.summary ?? '',
        decisions: data.decisions ?? [],
        actionItems: data.actionItems ?? [],
        openQuestions: data.openQuestions ?? [],
        generatedAt: new Date().toISOString(),
      }
      saveAgendaItemNotes(mId, itemNotes)
    } catch (err) {
      console.error('[recording] agenda item notes error:', err)
      setProcessingItemError(agendaItemId, err instanceof Error ? err.message : 'Processing failed')
    } finally {
      removeProcessingItemId(agendaItemId)
      setProcessingItemPhase(agendaItemId, null)
    }
  }, [addProcessingItemId, removeProcessingItemId, saveAgendaItemNotes, setProcessingItemPhase, setProcessingItemError])

  // ── Process the full recording for the overall summary ────────────────────
  const processRecording = useCallback(async (blobs: Blob[], mId: string, lang: string) => {
    setProcessingMeetingId(mId)
    setProcessingPhase('transcribing')
    setProcessingError(null)
    try {
      if (blobs.length === 0 || blobs.every(b => b.size === 0)) {
        setProcessingMeetingId(null)
        setProcessingPhase(null)
        return
      }

      const transcript = await transcribeBlobs(blobs, lang)
      const isPromptEcho = transcript.toLowerCase().includes('meeting recording') && transcript.length < 200
      if (!transcript.trim() || isPromptEcho) {
        setProcessingMeetingId(null)
        setProcessingPhase(null)
        return
      }

      setProcessingPhase('summarizing')

      const state = useStore.getState()
      const allMeetings = [...state.meetings, ...state.recurringMeetings]
      const meeting = allMeetings.find(m => m.id === mId)
      const agendaItems = meeting?.agendaItems?.map(item => item.title) ?? []
      const context = meeting?.context ?? ''
      const projectContext = meeting
        ? assembleMeetingContext(meeting, state.projects, allMeetings)
        : undefined

      // Preserve per-item notes that were already generated during the meeting
      const existingAgendaItemNotes = meeting?.meetingNotes?.agendaItemNotes

      const notesResp = await fetch('/api/meeting-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, agendaItems, language: lang, context, projectContext }),
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

      saveMeetingNotes(mId, meetingNotes)
    } catch (err) {
      console.error('[recording] processing error:', err)
      setProcessingError(err instanceof Error ? err.message : 'Processing failed')
    } finally {
      setProcessingMeetingId(null)
      setProcessingPhase(null)
    }
  }, [setProcessingMeetingId, setProcessingPhase, setProcessingError, saveMeetingNotes])

  // ── Detect agenda item advances and snapshot audio ────────────────────────
  useEffect(() => {
    if (!meetingSession || !meetingId) return

    const currentIndex = meetingSession.currentItemIndex
    const prevIndex = prevItemIndexRef.current
    const hasStarted = meetingSession.hasStarted

    // Wait until the user clicks Start — only then begin tracking chunks for item 0
    if (!hasStarted) return

    // First time we see a started session — lock in chunk boundary at the moment Start was clicked
    if (prevIndex === -2) {
      prevItemIndexRef.current = currentIndex
      lastItemChunkIndexRef.current = chunksRef.current.length
      return
    }

    // Item advanced
    if (currentIndex !== prevIndex && prevIndex >= 0) {
      const state = useStore.getState()
      const allMeetings = [...state.meetings, ...state.recurringMeetings]
      const meeting = allMeetings.find(m => m.id === meetingId)
      const items = meeting?.agendaItems ?? []
      const completedItem = items[prevIndex]

      if (completedItem) {
        const startIdx = lastItemChunkIndexRef.current
        const endIdx = chunksRef.current.length
        const itemChunks = chunksRef.current.slice(startIdx, endIdx)

        if (itemChunks.length > 0 && recorderRef.current) {
          const mimeType = recorderRef.current.mimeType || 'audio/webm'
          const header = headerChunkRef.current
          const needsHeader = startIdx > 0 // First segment already has the header in its chunks
          const blobs = createChunkedBlobs(itemChunks, header, needsHeader, mimeType)
          processAgendaItem(blobs, meetingId, languageRef.current, completedItem.id, completedItem.title)
        }

        lastItemChunkIndexRef.current = endIdx
      }
    }

    prevItemIndexRef.current = currentIndex
  }, [meetingSession?.currentItemIndex, meetingSession?.hasStarted, meetingId, processAgendaItem])

  // ── Start/stop recording ──────────────────────────────────────────────────
  useEffect(() => {
    if (!meetingId) {
      setCurrentStream(null)
      return
    }

    // Reset per-item tracking when a new recording session starts
    prevItemIndexRef.current = -2
    lastItemChunkIndexRef.current = 0

    let cancelled = false

    async function startRecording() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { channelCount: 1 },
        })

        if (cancelled) {
          stream.getTracks().forEach(t => t.stop())
          return
        }

        streamRef.current = stream
        setCurrentStream(stream)
        chunksRef.current = []
        headerChunkRef.current = null

        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm'

        const recorder = new MediaRecorder(stream, {
          mimeType,
          audioBitsPerSecond: 32000, // 32 kbps Opus — excellent for speech, keeps blobs under Vercel's 4.5 MB limit
        })

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            // First chunk contains the WebM container header (EBML + Tracks)
            if (chunksRef.current.length === 0) headerChunkRef.current = e.data
            chunksRef.current.push(e.data)
          }
        }

        recorder.start(1000)
        recorderRef.current = recorder

        const session = useStore.getState().meetingSession
        if (session) {
          useStore.setState({
            meetingSession: { ...session, isRecording: true, recordingError: undefined },
          })
        }
      } catch (err) {
        console.error('Mic access error:', err)
        const session = useStore.getState().meetingSession
        if (session) {
          useStore.setState({
            meetingSession: {
              ...session,
              isRecording: false,
              recordingError: err instanceof Error ? err.message : 'Mic access denied',
            },
          })
        }
      }
    }

    startRecording()

    return () => {
      cancelled = true
      const recorder = recorderRef.current
      const stream = streamRef.current
      const mId = meetingIdRef.current ?? meetingId
      const lang = languageRef.current

      if (recorder && recorder.state !== 'inactive') {
        recorder.onstop = () => {
          const allChunks = chunksRef.current
          const mimeType = recorder.mimeType || 'audio/webm'
          chunksRef.current = []
          const header = headerChunkRef.current
          headerChunkRef.current = null
          lastItemChunkIndexRef.current = 0
          prevItemIndexRef.current = -2

          if (allChunks.length > 0) {
            // Auto-download full recording as backup before transcription
            const fullBlob = new Blob(allChunks, { type: mimeType })
            try {
              const url = URL.createObjectURL(fullBlob)
              const a = document.createElement('a')
              a.href = url
              const ext = mimeType.includes('mp4') ? 'mp4' : 'webm'
              a.download = `meeting-${new Date().toISOString().slice(0, 10)}.${ext}`
              document.body.appendChild(a)
              a.click()
              document.body.removeChild(a)
              setTimeout(() => URL.revokeObjectURL(url), 10_000)
            } catch (e) {
              console.warn('[recording] download backup failed:', e)
            }

            // Split into valid WebM segments for transcription
            const blobs = createChunkedBlobs(allChunks, header, false, mimeType)
            processRecording(blobs, mId, lang)
          }
        }
        recorder.stop()
      }

      if (stream) {
        stream.getTracks().forEach(t => t.stop())
        streamRef.current = null
      }
      recorderRef.current = null
      setCurrentStream(null)
    }
  }, [meetingId, retryCount, processRecording])

  const retryRecording = useCallback(() => {
    setRetryCount(c => c + 1)
  }, [])

  return {
    isRecording: meetingSession?.isRecording ?? false,
    error: meetingSession?.recordingError ?? null,
    stream: currentStream,
    retryRecording,
  }
}
