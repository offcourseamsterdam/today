// src/lib/shareProject.ts
// Publishes project data to Firestore `shared` collection for public sharing.
// Each project gets a stable shareId — the same URL always shows the latest data.
//
// Firestore security rule (must allow public writes for co-founder editing):
//   match /shared/{shareId} {
//     allow read: if true;
//     allow write: if true;
//   }

import { doc, setDoc, getDoc } from 'firebase/firestore'
import { db } from './firebase'
import type { Project, Meeting, AgendaItem, SharedProjectSnapshot } from '../types'

export function generateShareId(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 10)
}

function deepClean<T>(val: T): T {
  return JSON.parse(JSON.stringify(val, (_, v) => (v === undefined ? null : v)))
}

// ── Publish (simple overwrite — used by manual share button) ─────────────

/**
 * Publish (or update) a shared project snapshot.
 * Reuses the project's existing shareId so the URL stays stable.
 * Returns the shareId (caller should persist it on the project if new).
 */
export async function publishSharedProject(
  project: Project,
  meetings: Meeting[],
  displayName?: string,
): Promise<string> {
  const shareId = project.shareId ?? generateShareId()
  const snapshot: SharedProjectSnapshot = {
    project: deepClean(project),
    meetings: deepClean(meetings),
    sharedAt: new Date().toISOString(),
    sharedBy: displayName ?? undefined,
  }
  await setDoc(doc(db, 'shared', shareId), deepClean(snapshot))
  return shareId
}

// ── Publish with merge (used by auto-sync — preserves visitor edits) ─────

/**
 * Like publishSharedProject but reads the remote doc first and preserves
 * any agenda-item edits made by visitors on the shared page.
 * Visitor wins on agendaItems, owner wins on everything else.
 */
export async function publishSharedProjectWithMerge(
  project: Project,
  meetings: Meeting[],
  displayName?: string,
): Promise<string> {
  const shareId = project.shareId ?? generateShareId()

  // Read remote doc to get visitor's agenda edits
  let remoteAgendaMap: Map<string, AgendaItem[]> | null = null
  try {
    const remote = await getDoc(doc(db, 'shared', shareId))
    if (remote.exists()) {
      const data = remote.data() as SharedProjectSnapshot
      remoteAgendaMap = new Map<string, AgendaItem[]>()
      for (const m of data.meetings ?? []) {
        if (m.agendaItems && m.agendaItems.length > 0) {
          remoteAgendaMap.set(m.id, m.agendaItems)
        }
      }
    }
  } catch {
    // If read fails, fall back to simple overwrite
  }

  // Merge: use remote agenda items when they differ from local
  const mergedMeetings = meetings.map(m => {
    if (!remoteAgendaMap) return m
    const remoteAgenda = remoteAgendaMap.get(m.id)
    if (!remoteAgenda) return m
    // If remote agenda differs, keep visitor's version
    const localJson = JSON.stringify(m.agendaItems ?? [])
    const remoteJson = JSON.stringify(remoteAgenda)
    if (localJson !== remoteJson) {
      return { ...m, agendaItems: remoteAgenda }
    }
    return m
  })

  const snapshot: SharedProjectSnapshot = {
    project: deepClean(project),
    meetings: deepClean(mergedMeetings),
    sharedAt: new Date().toISOString(),
    sharedBy: displayName ?? undefined,
  }
  await setDoc(doc(db, 'shared', shareId), deepClean(snapshot))
  return shareId
}

// ── Update a single meeting's agenda (used by shared page visitors) ──────

/**
 * Updates just the agenda items of one meeting in the shared doc.
 * Used by the public shared page when a visitor edits an agenda.
 */
export async function updateSharedMeetingAgenda(
  shareId: string,
  meetingId: string,
  agendaItems: AgendaItem[],
): Promise<void> {
  const ref = doc(db, 'shared', shareId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return

  const data = snap.data() as SharedProjectSnapshot
  const updatedMeetings = (data.meetings ?? []).map(m =>
    m.id === meetingId ? { ...m, agendaItems: deepClean(agendaItems) } : m
  )
  await setDoc(ref, { ...data, meetings: updatedMeetings })
}

// ── Read ─────────────────────────────────────────────────────────────────

export async function fetchSharedProject(
  shareId: string,
): Promise<SharedProjectSnapshot | null> {
  const snap = await getDoc(doc(db, 'shared', shareId))
  if (!snap.exists()) return null
  return snap.data() as SharedProjectSnapshot
}

export function getShareUrl(shareId: string): string {
  return `${window.location.origin}/p/${shareId}`
}
