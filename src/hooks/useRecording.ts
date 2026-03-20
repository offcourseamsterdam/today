import { useEffect, useRef, useCallback } from 'react'
import { useStore } from '../store'
import type { MeetingNotes } from '../types'

const CHUNK_SIZE = 4 * 1024 * 1024 // 4MB

interface UseRecordingReturn {
  isRecording: boolean
  error: string | null
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

  const meetingSession = useStore(s => s.meetingSession)
  const setProcessingMeetingId = useStore(s => s.setProcessingMeetingId)
  const saveMeetingNotes = useStore(s => s.saveMeetingNotes)

  // Keep refs in sync
  meetingIdRef.current = meetingId
  languageRef.current = language

  const processRecording = useCallback(async (blob: Blob, mId: string, lang: string) => {
    setProcessingMeetingId(mId)

    try {
      // Split into chunks
      const chunks: Blob[] = []
      let offset = 0
      while (offset < blob.size) {
        chunks.push(blob.slice(offset, offset + CHUNK_SIZE))
        offset += CHUNK_SIZE
      }

      // Transcribe each chunk
      const transcriptParts: string[] = []
      for (const chunk of chunks) {
        const langParam = lang === 'auto' ? '' : `?language=${lang}`
        const resp = await fetch(`/api/transcribe${langParam}`, {
          method: 'POST',
          body: chunk,
          headers: { 'Content-Type': 'audio/webm' },
        })

        if (!resp.ok) throw new Error(`Transcription failed: ${resp.status}`)
        const data = await resp.json()
        if (data.text) transcriptParts.push(data.text)
      }

      const transcript = transcriptParts.join(' ')
      if (!transcript.trim()) {
        setProcessingMeetingId(null)
        return
      }

      // Get agenda items for context
      const allMeetings = [...useStore.getState().meetings, ...useStore.getState().recurringMeetings]
      const meeting = allMeetings.find(m => m.id === mId)
      const agendaItems = meeting?.agendaItems?.map(item => item.title) ?? []

      // Generate structured notes
      const notesResp = await fetch('/api/meeting-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, agendaItems, language: lang }),
      })

      if (!notesResp.ok) throw new Error(`Meeting notes failed: ${notesResp.status}`)
      const notesData = await notesResp.json()

      const meetingNotes: MeetingNotes = {
        transcript,
        summary: notesData.summary,
        actionItems: notesData.actionItems,
        decisions: notesData.decisions,
        generatedAt: new Date().toISOString(),
      }

      saveMeetingNotes(mId, meetingNotes)
    } catch (err) {
      console.error('Recording processing error:', err)
      // Don't block — manual notes still available
    } finally {
      setProcessingMeetingId(null)
    }
  }, [setProcessingMeetingId, saveMeetingNotes])

  // Start recording when meetingId becomes non-null
  useEffect(() => {
    if (!meetingId) return

    let cancelled = false

    async function startRecording() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            sampleRate: 48000,
          },
        })

        if (cancelled) {
          stream.getTracks().forEach(t => t.stop())
          return
        }

        streamRef.current = stream
        chunksRef.current = []

        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm'

        const recorder = new MediaRecorder(stream, {
          mimeType,
          audioBitsPerSecond: 24000,
        })

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data)
        }

        recorder.start(1000) // collect data every 1s
        recorderRef.current = recorder

        // Update store — recording is active
        const session = useStore.getState().meetingSession
        if (session) {
          useStore.setState({
            meetingSession: { ...session, isRecording: true },
          })
        }
      } catch (err) {
        console.error('Mic access error:', err)
        // Update store — recording failed
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

    // Cleanup — stop recording and process
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
    }
  }, [meetingId, processRecording])

  return {
    isRecording: meetingSession?.isRecording ?? false,
    error: meetingSession?.recordingError ?? null,
  }
}
