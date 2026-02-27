import type { Category } from '../../types'
import type { ArtworkResult } from './types'
import { searchMetMuseum } from './metMuseum'
import { searchRijksmuseum } from './rijksmuseum'
import { CATEGORY_SEARCH_TERMS, extractSearchWords } from './keywords'

export type { ArtworkResult }
export { markProjectFetchInFlight, unmarkProjectFetchInFlight, isProjectFetchInFlight } from './cache'

/**
 * Try Rijksmuseum first (Dutch Golden Age paintings), fall back to Met Museum.
 * Sequential so Rijksmuseum results are preferred when available.
 */
async function searchBothAPIs(query: string): Promise<ArtworkResult | null> {
  try {
    const rijks = await searchRijksmuseum(query)
    if (rijks) return rijks
  } catch {
    // Rijksmuseum failed — continue to Met
  }
  try {
    return await searchMetMuseum(query)
  } catch {
    return null
  }
}

/**
 * Fetch a cover image for a project.
 *
 * Strategy:
 * 1. Search both APIs with the full project title (Rijksmuseum first).
 * 2. Try each significant word, first combined with a category term for
 *    thematic relevance (e.g. "budget gold" for Finance), then plain.
 * 3. Fall back to curated category terms on the Met Museum (hasImages=true).
 */
export async function fetchCoverImage(
  category: Category,
  projectTitle: string
): Promise<ArtworkResult | null> {
  try {
    // Step 1: full title
    const titleResult = await searchBothAPIs(projectTitle)
    if (titleResult) return titleResult

    // Step 2: word-by-word, biased toward category theme
    const words = extractSearchWords(projectTitle)
    const categoryTerms = CATEGORY_SEARCH_TERMS[category]
    for (const word of words) {
      const categoryTerm = categoryTerms[Math.floor(Math.random() * categoryTerms.length)]
      const biased = await searchBothAPIs(`${word} ${categoryTerm}`)
      if (biased) return biased

      const plain = await searchBothAPIs(word)
      if (plain) return plain
    }

    // Step 3: category fallback — try all terms (shuffled) until one succeeds.
    // hasImages=true on the Met API guarantees image availability.
    const shuffledTerms = [...categoryTerms].sort(() => Math.random() - 0.5)
    for (const term of shuffledTerms) {
      const fallback = await searchMetMuseum(term, false)
      if (fallback) return fallback
    }

    return null
  } catch (error) {
    console.error('Artwork fetch error:', error)
    return null
  }
}
