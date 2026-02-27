import type { Category } from '../../types'

/** Fallback search terms per category — evocative classical art that matches the mood. */
export const CATEGORY_SEARCH_TERMS: Record<Category, string[]> = {
  marketing: ['merchant', 'market', 'harbor', 'ship sailing', 'trade'],
  ops: ['workshop', 'forge', 'craftsman', 'machinery', 'tools'],
  admin: ['writing desk', 'library', 'scholar', 'study', 'letter'],
  finance: ['merchant', 'gold', 'prosperity', 'counting', 'banker'],
  product: ['architect', 'blueprint', 'invention', 'studio', 'creation'],
  personal: ['garden', 'landscape', 'sunrise', 'countryside', 'contemplation'],
}

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'it', 'my', 'our', 'new', 'old',
  'test', 'project', 'plan', 'task', 'sprint', 'phase', 'v1', 'v2',
])

/** Extract meaningful search words from a project title, stripping stop words. */
export function extractSearchWords(title: string): string[] {
  return title
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
}
