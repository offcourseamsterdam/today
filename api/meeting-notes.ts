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
    const { transcript, agendaItems, agendaItemTitle, language, context, projectContext } = req.body as {
      transcript: string
      agendaItems?: string[]
      agendaItemTitle?: string  // when set: per-item mode, focused on this single agenda item
      language: string
      context?: string
      projectContext?: string
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

    const contextBlock = context?.trim()
      ? `\nAdditional context about this meeting:\n${context.trim()}\n`
      : ''

    const projectBlock = projectContext?.trim()
      ? `\nLinked project context:\n${projectContext.trim()}\n`
      : ''

    const openai = new OpenAI({ apiKey })

    if (agendaItemTitle) {
      // ── Per-agenda-item mode ─────────────────────────────────────────────────
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `You analyze a portion of a meeting transcript that covers one specific agenda item. ${langInstruction}${projectBlock ? ' When a linked project is provided, reference its tasks and context where relevant.' : ''}

Return a JSON object with exactly these fields:

- "summary": string — 1-3 sentences covering what was actually discussed and where it landed. Be specific and concrete.
- "decisions": array of strings — Specific decisions or agreements made during this agenda item. Each is a complete, standalone sentence. Empty array if none.
- "actionItems": array of { "description": string, "assignee": string | null, "dueDate": string | null } — Concrete next actions committed to. Only include clearly assigned or committed tasks. dueDate uses natural language ("end of week", "Friday") — do not invent dates.
- "openQuestions": array of strings — Questions raised but not resolved, or topics deferred. Empty array if none.

Only include content clearly supported by the transcript. Return empty arrays where there is no relevant content.`,
          },
          {
            role: 'user',
            content: `Agenda item: "${agendaItemTitle}"${contextBlock}${projectBlock}\n\nTranscript segment:\n${transcript}`,
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
        decisions: parsed.decisions ?? [],
        actionItems: parsed.actionItems ?? [],
        openQuestions: parsed.openQuestions ?? [],
      })
    } else {
      // ── Overall meeting summary mode ─────────────────────────────────────────
      const agendaBlock = (agendaItems ?? []).length > 0
        ? `\nMeeting agenda:\n${agendaItems!.map((item, i) => `${i + 1}. ${item}`).join('\n')}\n`
        : ''

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `You analyze meeting transcripts and produce a high-level overall summary. ${langInstruction} When a linked project is provided, use its tasks, notes, and status to make your analysis more specific and nuanced — reference task names, unresolved blockers, or project status where relevant.

Return a JSON object with exactly these fields:

- "summary": string — A focused 2-4 sentence high-level summary of the meeting as a whole: what was the main thrust, what was the overall outcome, what is the most important next step. Write this as an executive overview, not a list of topics.
- "actionItems": array of { "description": string, "assignee": string | null, "dueDate": string | null } — The most important concrete tasks that came out of the entire meeting. For dueDate use natural language like "end of week", "Friday" — do not invent dates.
- "decisions": array of strings — The key decisions made across the whole meeting. Each is a complete, standalone sentence.
- "openQuestions": array of strings — Unresolved questions or deferred topics from the whole meeting.
- "outcome": one of "productive" | "inconclusive" | "needs-followup" — Overall meeting outcome.

Only include items clearly supported by the transcript. Return empty arrays where there is no relevant content.`,
          },
          {
            role: 'user',
            content: `${agendaBlock}${contextBlock}${projectBlock}\nTranscript:\n${transcript}`,
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
        openQuestions: parsed.openQuestions ?? [],
        outcome: parsed.outcome ?? 'productive',
      })
    }
  } catch (err) {
    console.error('Meeting notes error:', err)
    res.status(500).json({ error: 'Meeting notes generation failed' })
  }
}
