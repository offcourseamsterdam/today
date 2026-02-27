import type { ArtworkResult } from './types'
import { usedIds } from './cache'

const MET_API = 'https://collectionapi.metmuseum.org/public/collection/v1'

interface MetObject {
  objectID: number
  title: string
  artistDisplayName: string
  primaryImageSmall: string
  primaryImage: string
  objectName?: string  // "Painting", "Print", "Drawing", "Etching", etc.
}

/**
 * Search the Met Museum Open Access API for a painting matching `query`.
 *
 * When `strict=true` (default): no extra URL filters (preserves relevance
 * ranking); only accepts results whose object title contains a query word.
 * When `strict=false`: adds hasImages=true&isPublicDomain=true so every
 * returned objectID is guaranteed to have a public image — relevance ranking
 * is less important for the category-based fallback.
 */
export async function searchMetMuseum(query: string, strict = true): Promise<ArtworkResult | null> {
  const params = strict
    ? `q=${encodeURIComponent(query)}`
    : `q=${encodeURIComponent(query)}&hasImages=true&isPublicDomain=true`
  const res = await fetch(`${MET_API}/search?${params}`)
  const data = await res.json()
  if (!data.objectIDs?.length) return null

  const available = data.objectIDs.filter((id: number) => !usedIds.has(`met-${id}`))
  const pool = available.length > 0 ? available : data.objectIDs
  const queryWords = query.toLowerCase().split(/\s+/).filter((w) => w.length > 2)
  const candidates = pool.slice(0, 30)

  // Fetch objects in parallel batches of 10 for speed.
  for (let i = 0; i < candidates.length; i += 10) {
    const batch = candidates.slice(i, i + 10)
    const results = await Promise.allSettled(
      batch.map((id: number) =>
        fetch(`${MET_API}/objects/${id}`).then((r) => r.json() as Promise<MetObject>)
      )
    )

    for (const result of results) {
      if (result.status !== 'fulfilled') continue
      const obj = result.value
      if (!obj.primaryImageSmall) continue
      if (obj.objectName && obj.objectName !== 'Painting') continue  // skip prints, etchings, spotprenten, etc.

      if (strict) {
        const objTitle = (obj.title || '').toLowerCase()
        if (!queryWords.some((w) => objTitle.includes(w))) continue
      }

      usedIds.add(`met-${obj.objectID}`)
      return {
        url: obj.primaryImageSmall,
        title: obj.artistDisplayName
          ? `${obj.title} — ${obj.artistDisplayName}`
          : obj.title,
      }
    }
  }

  return null
}
