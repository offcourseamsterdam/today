/** Tracks IDs of artwork already shown this session, to avoid duplicates. */
export const usedIds = new Set<string>()

/** Tracks project IDs currently fetching artwork, to prevent duplicate requests. */
const inFlightProjectIds = new Set<string>()

export function markProjectFetchInFlight(projectId: string) {
  inFlightProjectIds.add(projectId)
}

export function unmarkProjectFetchInFlight(projectId: string) {
  inFlightProjectIds.delete(projectId)
}

export function isProjectFetchInFlight(projectId: string): boolean {
  return inFlightProjectIds.has(projectId)
}
