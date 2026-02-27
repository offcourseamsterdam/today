import type { ArtworkResult } from './types'
import { usedIds } from './cache'

const RIJKS_API = 'https://data.rijksmuseum.nl'

/** Extract numeric ID from a Rijksmuseum URI like "https://id.rijksmuseum.nl/200106038" */
function extractRijksId(uri: string): string | null {
  const m = uri.match(/rijksmuseum\.nl\/(\d+)/)
  return m?.[1] ?? null
}

/** Fetch a Rijksmuseum Linked Art JSON resource */
async function fetchRijksJson(numericId: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${RIJKS_API}/${numericId}?format=json`, {
    headers: { Accept: 'application/ld+json' },
  })
  return res.json()
}

/** Extract title from Linked Art identified_by array */
function extractTitle(obj: Record<string, unknown>): string {
  const identifiedBy = obj.identified_by as Array<Record<string, unknown>> | undefined
  if (!identifiedBy) return 'Untitled'
  const name = identifiedBy.find(
    (e) => e.type === 'Name' && typeof e.content === 'string'
  )
  return (name?.content as string) || 'Untitled'
}

/** Extract artist from Linked Art produced_by */
function extractArtist(obj: Record<string, unknown>): string | null {
  const producedBy = obj.produced_by as Record<string, unknown> | undefined
  if (!producedBy) return null
  const agents = producedBy.carried_out_by as Array<Record<string, unknown>> | undefined
  if (!agents?.length) return null
  const agentNames = agents[0].identified_by as Array<Record<string, unknown>> | undefined
  if (!agentNames?.length) return null
  return (agentNames[0].content as string) || null
}

/** Resolve the Linked Art chain: Object → VisualItem → DigitalObject → IIIF URL */
async function resolveRijksImage(objectId: string): Promise<ArtworkResult | null> {
  const obj = await fetchRijksJson(objectId)

  const title = extractTitle(obj)
  const artist = extractArtist(obj)
  const displayTitle = artist ? `${title} — ${artist}` : title

  const shows = obj.shows as Array<{ id: string }> | undefined
  const visualItemUri = shows?.[0]?.id
  if (!visualItemUri) return null

  const visualItemId = extractRijksId(visualItemUri)
  if (!visualItemId) return null

  const visualItem = await fetchRijksJson(visualItemId)
  const digitalRefs = visualItem.digitally_shown_by as Array<{ id: string }> | undefined
  const digitalUri = digitalRefs?.[0]?.id
  if (!digitalUri) return null

  const digitalId = extractRijksId(digitalUri)
  if (!digitalId) return null

  const digitalObj = await fetchRijksJson(digitalId)
  const accessPoints = digitalObj.access_point as Array<{ id: string }> | undefined
  const iiifUrl = accessPoints?.[0]?.id
  if (!iiifUrl || !iiifUrl.includes('iiif')) return null

  // Resize to 800px wide: IIIF format is /full/{size}/{rotation}/default.jpg
  const imageUrl = iiifUrl.replace(/\/full\/[^/]+\/0\//, '/full/800,/0/')

  return { url: imageUrl, title: displayTitle }
}

/**
 * Search the Rijksmuseum collection API for a painting matching `query`.
 * Searches by title only — description search is too broad.
 */
export async function searchRijksmuseum(query: string): Promise<ArtworkResult | null> {
  const searchRes = await fetch(
    `${RIJKS_API}/search/collection?title=${encodeURIComponent(query)}&type=painting&imageAvailable=true`,
    { headers: { Accept: 'application/ld+json' } },
  )
  const searchData = await searchRes.json()
  const items = searchData.orderedItems as Array<{ id: string; type: string }> | undefined
  if (!items?.length) return null

  const available = items.filter((item) => {
    const id = extractRijksId(item.id)
    return id && !usedIds.has(`rijks-${id}`)
  })
  const pool = available.length > 0 ? available : items

  for (let attempt = 0; attempt < 3; attempt++) {
    const idx = Math.floor(Math.random() * Math.min(pool.length, 30))
    const item = pool[idx]
    const objectId = extractRijksId(item.id)
    if (!objectId) continue

    try {
      const result = await resolveRijksImage(objectId)
      if (result) {
        usedIds.add(`rijks-${objectId}`)
        return result
      }
    } catch {
      continue
    }
  }

  return null
}
