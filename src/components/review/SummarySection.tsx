import { useState } from "react"
import { Check } from "lucide-react"

export interface ReviewStats {
  inboxProcessed: number
  inboxToProject: number
  inboxKept: number
  inboxDeleted: number
  tasksCompleted: number
  tasksDeleted: number
  projectsMoved: number
  recurringDeactivated: number
}

interface SummarySectionProps {
  stats: ReviewStats
  onFinish: () => void
}

export function SummarySection({ stats, onFinish }: SummarySectionProps) {
  const [reflection, setReflection] = useState("")

  const lines: string[] = []

  if (stats.inboxProcessed > 0) {
    const details: string[] = []
    if (stats.inboxToProject > 0) details.push(`${stats.inboxToProject} naar project`)
    if (stats.inboxKept > 0) details.push(`${stats.inboxKept} gehouden`)
    if (stats.inboxDeleted > 0) details.push(`${stats.inboxDeleted} verwijderd`)
    const suffix = details.length > 0 ? ` (${details.join(", ")})` : ""
    lines.push(`${stats.inboxProcessed} inbox items verwerkt${suffix}`)
  }

  if (stats.tasksCompleted > 0) {
    lines.push(`${stats.tasksCompleted} taken afgevinkt`)
  }

  if (stats.tasksDeleted > 0) {
    lines.push(`${stats.tasksDeleted} taken verwijderd`)
  }

  if (stats.projectsMoved > 0) {
    lines.push(`${stats.projectsMoved} projecten verplaatst`)
  }

  if (stats.recurringDeactivated > 0) {
    lines.push(`${stats.recurringDeactivated} recurring tasks verwijderd`)
  }

  const hasActivity = lines.length > 0

  return (
    <div className="space-y-4">
      {/* Stats card */}
      <div className="rounded-lg border border-border bg-canvas p-4">
        {hasActivity ? (
          <ul className="space-y-1 text-[13px] text-charcoal">
            {lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : (
          <p className="text-[13px] text-stone italic">Geen wijzigingen gemaakt</p>
        )}
      </div>

      {/* Reflection textarea */}
      <div className="space-y-1.5">
        <label className="block text-[11px] font-medium uppercase tracking-wide text-stone">
          Reflectie (optioneel)
        </label>
        <textarea
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          placeholder="Hoe ging de week? Wat kan beter?"
          rows={3}
          className="w-full rounded-lg border border-border bg-white px-3 py-2 text-[13px] text-charcoal placeholder:text-stone/50 focus:border-charcoal focus:outline-none resize-none"
        />
      </div>

      {/* Finish button */}
      <button
        onClick={onFinish}
        className="inline-flex items-center gap-2 rounded-lg bg-charcoal px-4 py-2 text-[13px] font-medium text-white hover:bg-charcoal/90 transition-colors"
      >
        <Check size={16} />
        Review afronden
      </button>
    </div>
  )
}
