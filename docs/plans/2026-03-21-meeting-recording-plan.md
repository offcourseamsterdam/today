# Meeting Recording & AI Notes — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add automatic audio recording to live meeting sessions, transcribe via OpenAI Whisper, and generate structured meeting notes (summary, action items, decisions) via GPT-4o.

**Architecture:** Browser records audio via MediaRecorder during meeting sessions. On session end, audio chunks are sent to Vercel serverless functions that proxy OpenAI APIs. Structured results are saved on the Meeting object and displayed in the MeetingsDrawer.

**Tech Stack:** MediaRecorder API (browser), OpenAI SDK (Whisper + GPT-4o), Vercel Serverless Functions, Zustand, React

---

## Context

- **Design doc:** `docs/plans/2026-03-21-meeting-recording-design.md`
- **No test framework** in this project — verify via `tsc -b --noEmit` and `npm run build`
- **Zustand slice pattern:** each slice is `makeXActions(set: StoreSet, get: StoreGet)` factory in its own file
- **VandaagState** lives in `src/store/types.ts`; all types in `src/types/index.ts`
- **Vercel functions** go in `api/` at project root (auto-detected by Vercel)
- **tsconfig.app.json** only includes `src/` — api/ functions need separate TypeScript handling
- **The `api/` directory does not exist yet** — it will be created
- **The `openai` npm package is not installed yet**
- **Existing `.env.example`** has only Firebase vars

---

### Task 1: Types — Add ActionItem, MeetingNotes, recording fields

**Files:**
- Modify: `src/types/index.ts`

**Step 1: Add `MeetingActionItem` and `MeetingNotes` types**

Add after the `AgendaItem` interface (line 69):

```ts
export interface MeetingActionItem {
  description: string
  assignee?: string
}

export interface MeetingNotes {
  transcript: string
  summary: string
  actionItems: MeetingActionItem[]
  decisions: string[]
  generatedAt: string
}
```

Note: named `MeetingActionItem` to avoid collision with any future `ActionItem` type.

**Step 2: Add `language` and `meetingNotes` to `Meeting`**

Add after `takeaways?: string` (line 80):

```ts
  language?: 'auto' | 'nl' | 'en'
  meetingNotes?: MeetingNotes
```

**Step 3: Add `isRecording` and `recordingError` to `MeetingSession`**

Add after `lastTickAt: string` (line 94):

```ts
  isRecording: boolean
  recordingError?: string
```

**Step 4: Verify**

```bash
cd "/Users/beer/Vandaag App" && npx tsc -b --noEmit 2>&1 | head -20
```

Expected: zero errors (the new types are used nowhere yet — no unused-import errors since they're `export`ed).

**Step 5: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add MeetingNotes, MeetingActionItem types and recording fields"
```

---

### Task 2: Store — Add processingMeetingId + update session actions

**Files:**
- Modify: `src/store/types.ts`
- Modify: `src/store/index.ts`
- Modify: `src/store/meetingSessionSlice.ts`

**Step 1: Add state + action to VandaagState**

In `src/store/types.ts`:

Add import for `MeetingNotes` (line 2, extend the existing import):
```ts
import type { ..., MeetingNotes } from '../types'
```

Add after `meetingSession: MeetingSession | null` (line 34):
```ts
  processingMeetingId: string | null
```

Add after the meeting session actions block (after line 98):
```ts
  // Recording processing
  setProcessingMeetingId: (id: string | null) => void
  saveMeetingNotes: (meetingId: string, notes: MeetingNotes) => void
```

**Step 2: Wire in store index**

In `src/store/index.ts`:

Add initial state after `meetingSession: null` (line 39):
```ts
      processingMeetingId: null,
```

Add `setProcessingMeetingId` and `saveMeetingNotes` inline (after `setOpenProjectId` on line 44, before the slices):
```ts
      setProcessingMeetingId: (id) => set({ processingMeetingId: id }),
      saveMeetingNotes: (meetingId, notes) => {
        const { meetings, recurringMeetings } = get()
        const inMeetings = meetings.some(m => m.id === meetingId)
        if (inMeetings) {
          set({ meetings: meetings.map(m => m.id === meetingId ? { ...m, meetingNotes: notes } : m) })
        } else {
          set({ recurringMeetings: recurringMeetings.map(m => m.id === meetingId ? { ...m, meetingNotes: notes } : m) })
        }
      },
```

Note: `processingMeetingId` is UI state — do NOT add to `partialize` (it resets on reload, which is correct).

**Step 3: Update `startMeetingSession` to include recording fields**

In `src/store/meetingSessionSlice.ts`, update the `set` call in `startMeetingSession` (line 10-14). Add `isRecording: false` to initial state (the hook sets it to true once mic is acquired):

```ts
      set({ meetingSession: {
        meetingId, currentItemIndex: 0, completedItemIds: [],
        secondsLeft: firstItem?.durationMinutes != null ? firstItem.durationMinutes * 60 : null,
        isRunning: true, startedAt: now, lastTickAt: now,
        isRecording: false,
      }})
```

**Step 4: Verify**

```bash
cd "/Users/beer/Vandaag App" && npx tsc -b --noEmit 2>&1 | head -20
```

Expected: zero errors.

**Step 5: Commit**

```bash
git add src/store/types.ts src/store/index.ts src/store/meetingSessionSlice.ts
git commit -m "feat: add processingMeetingId, saveMeetingNotes, recording fields to store"
```

---

### Task 3: Install openai package + setup API infrastructure

**Files:**
- Modify: `package.json` (via npm install)
- Modify: `.env.example`
- Create: `api/transcribe.ts`
- Create: `api/meeting-notes.ts`

**Step 1: Install openai**

```bash
cd "/Users/beer/Vandaag App" && npm install openai
```

**Step 2: Update .env.example**

Add to `.env.example`:
```
OPENAI_API_KEY=
```

**Step 3: Create `api/transcribe.ts`**

```ts
import type { VercelRequest, VercelResponse } from '@vercel/node'
import OpenAI from 'openai'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    res.status(500).json({ error: 'OPENAI_API_KEY not configured' })
    return
  }

  try {
    const language = (req.query.language as string) || 'auto'

    // req.body is a Buffer when Content-Type is not JSON
    const buffer = Buffer.isBuffer(req.body)
      ? req.body
      : Buffer.from(req.body)

    const file = new File([buffer], 'audio.webm', { type: 'audio/webm' })

    const openai = new OpenAI({ apiKey })
    const transcription = await openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      ...(language !== 'auto' ? { language } : {}),
    })

    res.status(200).json({ text: transcription.text })
  } catch (err) {
    console.error('Transcription error:', err)
    res.status(500).json({ error: 'Transcription failed' })
  }
}
```

**Step 4: Create `api/meeting-notes.ts`**

```ts
import type { VercelRequest, VercelResponse } from '@vercel/node'
import OpenAI from 'openai'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    res.status(500).json({ error: 'OPENAI_API_KEY not configured' })
    return
  }

  try {
    const { transcript, agendaItems, language } = req.body as {
      transcript: string
      agendaItems: string[]
      language: string
    }

    if (!transcript) {
      res.status(400).json({ error: 'No transcript provided' })
      return
    }

    const langInstruction = language === 'nl'
      ? 'Respond in Dutch.'
      : language === 'en'
        ? 'Respond in English.'
        : 'Respond in the same language as the transcript.'

    const openai = new OpenAI({ apiKey })
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You analyze meeting transcripts and produce structured notes. ${langInstruction}

Return a JSON object with exactly these fields:
- "summary": string (2-3 sentence overview of the meeting)
- "actionItems": array of { "description": string, "assignee": string | null }
- "decisions": array of strings (key decisions made during the meeting)

Be concise. Only include action items and decisions that are clearly stated or strongly implied.`,
        },
        {
          role: 'user',
          content: `Meeting agenda:\n${agendaItems.map((item, i) => `${i + 1}. ${item}`).join('\n')}\n\nTranscript:\n${transcript}`,
        },
      ],
    })

    const content = completion.choices[0]?.message?.content
    if (!content) {
      res.status(500).json({ error: 'No response from model' })
      return
    }

    const parsed = JSON.parse(content)
    res.status(200).json({
      summary: parsed.summary ?? '',
      actionItems: parsed.actionItems ?? [],
      decisions: parsed.decisions ?? [],
    })
  } catch (err) {
    console.error('Meeting notes error:', err)
    res.status(500).json({ error: 'Meeting notes generation failed' })
  }
}
```

**Step 5: Install @vercel/node types**

```bash
cd "/Users/beer/Vandaag App" && npm install -D @vercel/node
```

**Step 6: Verify build** (api/ files won't be checked by `tsc -b` since they're outside `src/`, but verify the main app still builds)

```bash
cd "/Users/beer/Vandaag App" && npx tsc -b --noEmit && npm run build 2>&1 | tail -5
```

**Step 7: Commit**

```bash
git add package.json package-lock.json .env.example api/transcribe.ts api/meeting-notes.ts
git commit -m "feat: add Vercel serverless functions for transcription and meeting notes"
```

---

### Task 4: useRecording hook

**Files:**
- Create: `src/hooks/useRecording.ts`

**Step 1: Create the hook**

```ts
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
  const updateMeeting = useStore(s => s.updateMeeting)
  const updateRecurringMeeting = useStore(s => s.updateRecurringMeeting)
  const meetings = useStore(s => s.meetings)
  const recurringMeetings = useStore(s => s.recurringMeetings)
  const showToast = useStore(s => s.showToast)

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
        const formData = new FormData()
        formData.append('file', chunk, 'audio.webm')

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
```

**Step 2: Verify**

```bash
cd "/Users/beer/Vandaag App" && npx tsc -b --noEmit 2>&1 | head -20
```

Note: `updateMeeting`, `updateRecurringMeeting`, `meetings`, `recurringMeetings`, and `showToast` are selected from the store but some may be unused — remove any that cause `noUnusedLocals` errors. The hook uses `saveMeetingNotes` instead of direct updates.

**Step 3: Commit**

```bash
git add src/hooks/useRecording.ts
git commit -m "feat: add useRecording hook for mic capture and AI processing pipeline"
```

---

### Task 5: MeetingModal — language picker

**Files:**
- Modify: `src/components/meetings/MeetingModal.tsx`

**Step 1: Add language state**

After the `ruleState` state declaration (around line 32), add:
```ts
  const [language, setLanguage] = useState<'auto' | 'nl' | 'en'>('auto')
```

**Step 2: Populate from existing meeting**

In the `useEffect` that resets form (line 35-72):

In the `isNew` branch, add:
```ts
      setLanguage('auto')
```

In the `existingMeeting` branch, add:
```ts
      setLanguage(existingMeeting.language ?? 'auto')
```

**Step 3: Include in `handleSave`**

In `meetingData` (line 79-90), add after `recurrenceRule`:
```ts
      language: language !== 'auto' ? language : undefined,
```

**Step 4: Add language picker UI**

After the Date + Time row closing `</div>` (after line 190), add:

```tsx
          {/* Language */}
          <div>
            <label className="text-[10px] uppercase tracking-[0.08em] text-stone/50 font-medium mb-1 block">
              Recording language
            </label>
            <div className="flex gap-1">
              {([['auto', 'Auto'], ['nl', 'Nederlands'], ['en', 'English']] as const).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setLanguage(val)}
                  className={`text-[10px] px-3 py-2 rounded-[4px] border transition-all flex-1
                    ${language === val
                      ? 'border-charcoal bg-charcoal text-canvas'
                      : 'border-border text-stone hover:border-stone/40'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
```

**Step 5: Verify**

```bash
cd "/Users/beer/Vandaag App" && npx tsc -b --noEmit 2>&1 | head -20
```

**Step 6: Commit**

```bash
git add src/components/meetings/MeetingModal.tsx
git commit -m "feat: add recording language picker to MeetingModal"
```

---

### Task 6: LiveMeetingPanel — recording indicator + useRecording

**Files:**
- Modify: `src/components/meetings/LiveMeetingPanel.tsx`

**Step 1: Import and wire useRecording**

Add import:
```ts
import { useRecording } from '../../hooks/useRecording'
import { Mic, MicOff } from 'lucide-react'
```

Inside the component, after the store selectors (around line 17), add:
```ts
  // Derive language from meeting
  const language = meeting?.language ?? 'auto'
  const { isRecording, error: recordingError } = useRecording(
    meetingSession ? meetingSession.meetingId : null,
    language,
  )
```

Note: `meeting` is derived on line 21-23. Move the `useRecording` call after the `meeting` derivation but BEFORE the early returns. Actually, hooks cannot be called after early returns. Restructure: move the `if (!meetingSession) return null` and `if (!meeting) return null` checks AFTER all hooks. Use conditional rendering in the JSX instead.

Revised approach — replace the early returns with a wrapper:

```tsx
export function LiveMeetingPanel() {
  const meetingSession = useStore(s => s.meetingSession)
  const meetings = useStore(s => s.meetings)
  const recurringMeetings = useStore(s => s.recurringMeetings)
  const endMeetingSession = useStore(s => s.endMeetingSession)
  const pauseMeetingSession = useStore(s => s.pauseMeetingSession)
  const resumeMeetingSession = useStore(s => s.resumeMeetingSession)
  const advanceMeetingItem = useStore(s => s.advanceMeetingItem)

  const meeting = meetingSession
    ? [...meetings, ...recurringMeetings].find(m => m.id === meetingSession.meetingId)
    : undefined

  const { isRecording, error: recordingError } = useRecording(
    meetingSession ? meetingSession.meetingId : null,
    meeting?.language ?? 'auto',
  )

  if (!meetingSession || !meeting) return null

  // ... rest of component unchanged
```

**Step 2: Add recording indicator in the header**

In the header div, after the amber pulsing dot + "Live — {meeting.title}" span, add a recording indicator:

```tsx
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
          <span className="text-[11px] font-medium text-charcoal uppercase tracking-[0.06em]">
            Live — {meeting.title}
          </span>
          {isRecording ? (
            <span className="flex items-center gap-1 text-[10px] text-red-400">
              <Mic size={10} className="animate-pulse" />
              Rec
            </span>
          ) : recordingError ? (
            <span className="flex items-center gap-1 text-[10px] text-stone/40">
              <MicOff size={10} />
              No mic
            </span>
          ) : null}
        </div>
```

**Step 3: Verify**

```bash
cd "/Users/beer/Vandaag App" && npx tsc -b --noEmit 2>&1 | head -20
```

**Step 4: Commit**

```bash
git add src/components/meetings/LiveMeetingPanel.tsx
git commit -m "feat: add recording indicator and wire useRecording in LiveMeetingPanel"
```

---

### Task 7: MeetingsDrawer — AI Notes section

**Files:**
- Modify: `src/components/meetings/MeetingsDrawer.tsx`

**Step 1: Add AI Notes section to MeetingRow**

In the `MeetingRow` component, after the Takeaways textarea `</div>` (line 190) and before the Edit/Delete section (line 193), add:

```tsx
          {/* AI Notes */}
          {meeting.meetingNotes && (
            <AiNotesSection notes={meeting.meetingNotes} />
          )}
          {processingMeetingId === meeting.id && (
            <div className="flex items-center gap-2 py-3 text-[11px] text-stone/50">
              <span className="w-3 h-3 border-2 border-stone/30 border-t-stone/60 rounded-full animate-spin" />
              Processing recording...
            </div>
          )}
```

**Step 2: Add processingMeetingId selector to MeetingRow**

Add to the `MeetingRow` component body:
```ts
  const processingMeetingId = useStore(s => s.processingMeetingId)
```

**Step 3: Create AiNotesSection component**

Add above or below `MeetingRow` in the same file:

```tsx
function AiNotesSection({ notes }: { notes: import('../../types').MeetingNotes }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="border-t border-border/30 pt-2">
      <button
        onClick={() => setExpanded(e => !e)}
        className="flex items-center gap-2 text-[10px] uppercase tracking-[0.08em]
          text-stone/40 hover:text-stone/60 transition-colors font-medium w-full text-left"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0" />
        AI Notes
        <ChevronDown
          size={10}
          className={`transition-transform ml-auto ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {expanded && (
        <div className="mt-2 space-y-3 animate-slide-up">
          {/* Summary */}
          <div>
            <div className="text-[10px] uppercase tracking-[0.08em] text-stone/40 font-medium mb-1">
              Summary
            </div>
            <p className="text-[12px] text-charcoal/80 leading-relaxed">
              {notes.summary}
            </p>
          </div>

          {/* Action items */}
          {notes.actionItems.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-[0.08em] text-stone/40 font-medium mb-1">
                Action items
              </div>
              <ul className="space-y-1">
                {notes.actionItems.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12px] text-charcoal/80">
                    <span className="text-stone/30 mt-0.5">•</span>
                    <span className="flex-1">
                      {item.description}
                      {item.assignee && (
                        <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-500 font-medium">
                          {item.assignee}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Decisions */}
          {notes.decisions.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-[0.08em] text-stone/40 font-medium mb-1">
                Decisions
              </div>
              <ul className="space-y-1">
                {notes.decisions.map((decision, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12px] text-charcoal/80">
                    <span className="text-stone/30 mt-0.5">•</span>
                    <span>{decision}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

**Step 4: Verify**

```bash
cd "/Users/beer/Vandaag App" && npx tsc -b --noEmit 2>&1 | head -20
```

**Step 5: Commit**

```bash
git add src/components/meetings/MeetingsDrawer.tsx
git commit -m "feat: add AI Notes section to MeetingsDrawer with processing spinner"
```

---

### Task 8: Build verification

**Step 1: TypeScript check**

```bash
cd "/Users/beer/Vandaag App" && npx tsc -b --noEmit 2>&1 | head -40
```

Expected: zero errors.

**Step 2: Full build**

```bash
cd "/Users/beer/Vandaag App" && npm run build 2>&1 | tail -10
```

Expected: `✓ built in Xs`.

**Step 3: Fix any errors found, then commit fixes**

---

## Verification Checklist

1. Create a meeting with agenda items → set language to Nederlands → save
2. Start meeting from modal or drawer → mic permission prompt appears
3. If mic granted: red pulsing "Rec" indicator in LiveMeetingPanel
4. If mic denied: "No mic" shown, timer still works normally
5. End meeting session → "Processing recording..." spinner appears
6. After processing: AI Notes section appears with summary, action items, decisions
7. Expand AI Notes → content is in the correct language
8. Manual Actions/Takeaways fields remain independent and editable
9. Reload page → meetingNotes persisted on meeting object
10. TypeScript + build clean
