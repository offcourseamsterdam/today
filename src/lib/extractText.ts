// Extract plain text from BlockNote JSON (stored as a JSON string)
// Recursively walks the node tree and collects text content.
export function extractBlockNoteText(jsonString: string): string {
  if (!jsonString) return ''
  try {
    const nodes = JSON.parse(jsonString)
    return collectText(nodes).trim()
  } catch {
    return ''
  }
}

function collectText(nodes: unknown[]): string {
  if (!Array.isArray(nodes)) return ''
  return nodes.map(node => {
    if (typeof node !== 'object' || !node) return ''
    const n = node as Record<string, unknown>
    const parts: string[] = []
    // Direct text node
    if (typeof n.text === 'string') parts.push(n.text)
    // Inline content array
    if (Array.isArray(n.content)) parts.push(collectText(n.content))
    // Children array
    if (Array.isArray(n.children)) parts.push(collectText(n.children))
    return parts.join('')
  }).join('\n')
}
