# Meeting Recording & AI Notes — Design

**Date:** 2026-03-21
**Status:** Approved

## Overview

Add automatic audio recording to live meeting sessions. When a session ends, the recording is transcribed (OpenAI Whisper) and processed (Claude) to produce structured meeting notes: summary, action items with assignees, and decisions. Results are stored alongside the meeting and displayed in the MeetingsDrawer. Manual post-meeting notes (actions, takeaways) remain independent.

## Architecture

```
Browser                         Vercel Serverless
┌──────────────────┐            ┌──────────────────┐
│ MediaRecorder    │            │ POST /api/        │
│ (webm/opus 24k) │──chunks──▶ │   transcribe      │──▶ OpenAI Whisper
│                  │            │                   │
│ useRecording     │            │ POST /api/        │
│ hook             │──transcript│   meeting-notes   │──▶ Claude API
│                  │◀──result───│                   │
└──────────────────┘            └──────────────────┘
```

- Audio never stored — lives in memory during session, discarded after processing
- API keys stay server-side (Vercel env vars)
- No Firebase upgrade needed

## Constraints

| Constraint | Value | Impact |
|---|---|---|
| Vercel Hobby request body | 4.5MB | Chunk audio into ≤4MB segments |
| Vercel Hobby timeout | 60s (300s Fluid Compute) | Sufficient per chunk |
| Whisper max file size | 25MB | Not a concern with chunking |
| Whisper pricing | $0.006/min | ~$0.18 per 30-min meeting |
| Opus 24kbps mono | ~180KB/min | 30 min ≈ 5.4MB → 2 chunks |

## Data Model

### New fields on `Meeting`

```ts
language?: 'auto' | 'nl' | 'en'  // default 'auto'

meetingNotes?: {
  transcript: string              // raw Whisper transcript
  summary: string                 // 2-3 sentence overview
  actionItems: ActionItem[]       // structured action items
  decisions: string[]             // key decisions made
  generatedAt: string             // ISO timestamp
}
```

### New `ActionItem` type

```ts
interface ActionItem {
  description: string
  assignee?: string               // name/role if mentioned in transcript
}
```

### New fields on `MeetingSession`

```ts
isRecording: boolean              // true while mic is active
recordingError?: string           // if mic permission denied, etc.
```

### New state field

```ts
processingMeetingId: string | null  // shows spinner in drawer while processing
```

## Recording Flow

### Start (session begins)

1. User clicks "Start meeting" → `startMeetingSession(meetingId)`
2. `useRecording` hook requests mic: `navigator.mediaDevices.getUserMedia({ audio: true })`
3. `MediaRecorder` starts with `audio/webm;codecs=opus`, 24kbps mono
4. Chunks accumulate in `useRef<Blob[]>` via `ondataavailable` (1s interval)
5. `isRecording` = true; red pulsing dot in LiveMeetingPanel
6. If mic permission denied → session starts normally (timer works), `isRecording` = false, error shown

### End (session ends)

1. `MediaRecorder.stop()` → final blob assembled from chunks
2. `processingMeetingId` set → spinner in drawer
3. Browser splits blob into ≤4MB chunks
4. Sequential calls to `POST /api/transcribe`:
   - Each sends binary audio chunk + `?language=auto|nl|en`
   - Each returns `{ text: string }` (partial transcript)
5. Combined transcript sent to `POST /api/meeting-notes`:
   - Body: `{ transcript, agendaItems: string[], language }`
   - Returns: `{ summary, actionItems, decisions }`
6. Result saved to `meeting.meetingNotes` via `updateMeeting()`
7. `processingMeetingId` cleared, AI Notes section appears

### Edge cases

- **Tab closed during recording** — audio lost, no notes generated (acceptable for v1)
- **Mic fails mid-recording** — partial audio processed, best-effort result
- **API errors** — toast "Couldn't process recording", manual notes still available
- **No recording (mic denied)** — meeting timer works normally, no AI notes

## API Routes

### `POST /api/transcribe`

- **Input:** binary audio chunk (≤4.5MB), `?language=auto|nl|en` query param
- **Process:** calls OpenAI Whisper API (`whisper-1` or `gpt-4o-transcribe`)
- **Output:** `{ text: string }`
- **Env var:** `OPENAI_API_KEY`
- **Timeout:** 60s

### `POST /api/meeting-notes`

- **Input:** `{ transcript: string, agendaItems: string[], language: string }`
- **Process:** calls Claude API with structured prompt, requests JSON output
- **Output:** `{ summary: string, actionItems: ActionItem[], decisions: string[] }`
- **Env var:** `ANTHROPIC_API_KEY`
- **Timeout:** 30s

**Claude prompt structure:**
```
You are analyzing a meeting transcript. The agenda was: [items].
Output language: [Dutch/English/match transcript].

Return JSON:
- summary: 2-3 sentences
- actionItems: [{ description, assignee? }]
- decisions: string[]
```

**Server-side dependencies (api/ only):**
- `openai` npm package
- `@anthropic-ai/sdk` npm package

## Hook: `useRecording`

```ts
useRecording(meetingId: string | null, language: string)
// Returns: { isRecording: boolean, error: string | null }
```

- Activates when `meetingId` becomes non-null (session starts)
- Requests mic, starts MediaRecorder, accumulates chunks in ref
- On cleanup (session ends): stops recorder, assembles blob, runs processing pipeline
- Manages `processingMeetingId` in store
- Revokes mic stream on unmount

Used inside `LiveMeetingPanel`.

## UI Changes

### MeetingModal — language picker

- New dropdown below Date/Time row: `Auto` | `Nederlands` | `English`
- Defaults to `Auto`
- Same styling as existing form inputs

### LiveMeetingPanel — recording indicator

- Small pulsing red dot + "Recording" next to amber "Live" indicator
- If mic denied: "No mic" in muted text, timer still works
- No extra controls — recording is automatic

### MeetingsDrawer — AI Notes section

Per meeting row, below manual Actions/Takeaways:

- Collapsible header: "AI Notes" with chevron
- **Summary** — plain text block
- **Action items** — bulleted list, assignee badge if present
- **Decisions** — bulleted list
- Hidden when no `meetingNotes` exists
- "Processing recording..." spinner while API calls in progress
- On error: toast "Couldn't process recording"

## Files to Create/Modify

| File | Change |
|------|--------|
| `src/types/index.ts` | Add `ActionItem`, `MeetingNotes`; add `language`, `meetingNotes` to `Meeting`; add `isRecording`, `recordingError` to `MeetingSession` |
| `src/store/types.ts` | Add `processingMeetingId` state + `setProcessingMeetingId` action |
| `src/store/index.ts` | Wire new state + action, add to partialize |
| `src/store/meetingSessionSlice.ts` | Update `startMeetingSession` to set `isRecording` |
| `src/hooks/useRecording.ts` | CREATE — mic, MediaRecorder, chunking, API pipeline |
| `src/components/meetings/MeetingModal.tsx` | Add language picker |
| `src/components/meetings/LiveMeetingPanel.tsx` | Add recording indicator, wire `useRecording` |
| `src/components/meetings/MeetingsDrawer.tsx` | Add AI Notes section, processing spinner |
| `api/transcribe.ts` | CREATE — Vercel serverless, Whisper proxy |
| `api/meeting-notes.ts` | CREATE — Vercel serverless, Claude proxy |
| `.env.example` | Add `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` |
| `vercel.json` | Add function config (maxDuration) if needed |
