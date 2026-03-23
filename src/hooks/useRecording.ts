import { useEffect, useRef, useCallback, useState } from 'react'
import { useStore } from '../store'
import { assembleMeetingContext } from '../lib/meetingContext'
import type { AgendaItemNotes, MeetingNotes } from '../types'

const CHUNK_SIZE = 4 * 1024 * 1024 // 4MB

interface UseRecordingReturn {
  isRecording: boolean
  error: string | null
  stream: MediaStream | null
  retryRecording: () => void
}

async function transcribeBlob(blob: Blob, lang: string): Promise<string> {
  const chunks: Blob[] = []
  let offset = 0
  while (offset < blob.size) {
    chunks.push(blob.slice(offset, offset + CHUNK_SIZE))
    offset += CHUNK_SIZE
  }

  const parts: string[] = []
  for (const chunk of chunks) {
    const langParam = lang === 'auto' ? '' : `?language=${lang}`
    const resp = await fetch(`/api/transcribe${langParam}`, {
      method: 'POST',
      body: chunk,
      headers: { 'Content-Type': 'audio/webm' },
    })
    if (!resp.ok) throw new Error(`Transcription failed: ${resp.status}`)
    const data = await resp.json()
    if (data.text) parts.push(data.text)
  }
  return parts.join(' ')
}

export function useRecording(
  meetingId: string | null,
  language: string,
): UseRecordingReturn {
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const meetingIdRef = useRef(meetingId)
  const languageRef = useRef(language)
  const lastItemChunkIndexRef = useRef(0)  // index into chunksRef where current agenda item started
  const prevItemIndexRef = useRef<number>(-2)  // -2 = unset sentinel
  const [retryCount, setRetryCount] = useState(0)
  const [currentStream, setCurrentStream] = useState<MediaStream | null>(null)

  const meetingSession = useStore(s => s.meetingSession)
  const setProcessingMeetingId = useStore(s => s.setProcessingMeetingId)
  const saveMeetingNotes = useStore(s => s.saveMeetingNotes)
  const saveAgendaItemNotes = useStore(s => s.saveAgendaItemNotes)
  const addProcessingItemId = useStore(s => s.addProcessingItemId)
  const removeProcessingItemId = useStore(s => s.removeProcessingItemId)

  // Keep refs in sync
  meetingIdRef.current = meetingId
  languageRef.current = language

  // ── Process a single agenda item's audio segment ──────────────────────────
  const processAgendaItem = useCallback(async (
    blob: Blob,
    mId: string,
    lang: string,
    agendaItemId: string,
    agendaItemTitle: string,
  ) => {
    addProcessingItemId(agendaItemId)
    try {
      if (blob.size === 0) return

      const transcript = await transcribeBlob(blob, lang)
      const isPromptEcho = transcript.toLowerCase().includes('meeting recording') && transcript.length < 200
      if (!transcript.trim() || isPromptEcho) return

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
      if (!resp.ok) throw new Error(`Meeting notes failed: ${resp.status}`)
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
    } finally {
      removeProcessingItemId(agendaItemId)
    }
  }, [addProcessingItemId, removeProcessingItemId, saveAgendaItemNotes])

  // ── Process the full recording for the overall summary ────────────────────
  const processRecording = useCallback(async (blob: Blob, mId: string, lang: string) => {
    setProcessingMeetingId(mId)
    try {
      if (blob.size === 0) {
        setProcessingMeetingId(null)
        return
      }

      const transcript = await transcribeBlob(blob, lang)
      const isPromptEcho = transcript.toLowerCase().includes('meeting recording') && transcript.length < 200
      if (!transcript.trim() || isPromptEcho) {
        setProcessingMeetingId(null)
        return
      }

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
      if (!notesResp.ok) throw new Error(`Meeting notes failed: ${notesResp.status}`)
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
    } finally {
      setProcessingMeetingId(null)
    }
  }, [setProcessingMeetingId, saveMeetingNotes])

  // ── Detect agenda item advances and snapshot audio ────────────────────────
  useEffect(() => {
    if (!meetingSession || !meetingId) return

    const currentIndex = meetingSession.currentItemIndex
    const prevIndex = prevItemIndexRef.current

    // First time we see this session — just record the starting position
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
          const itemBlob = new Blob(itemChunks, { type: mimeType })
          processAgendaItem(itemBlob, meetingId, languageRef.current, completedItem.id, completedItem.title)
        }

        lastItemChunkIndexRef.current = endIdx
      }
    }

    prevItemIndexRef.current = currentIndex
  }, [meetingSession?.currentItemIndex, meetingId, processAgendaItem])

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

        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm'

        const recorder = new MediaRecorder(stream, {
          mimeType,
          audioBitsPerSecond: 128000,
        })

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data)
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
          const blob = new Blob(chunksRef.current, { type: recorder.mimeType })
          chunksRef.current = []
          lastItemChunkIndexRef.current = 0
          prevItemIndexRef.current = -2
          if (blob.size > 0) {
            processRecording(blob, mId, lang)
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
