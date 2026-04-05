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
    const { projectTitle, meetings } = req.body as {
      projectTitle: string
      meetings: Array<{
        title: string
        date: string
        summary: string
        decisions: string[]
        actionItems: Array<{ description: string; owner?: string }>
        openQuestions: string[]
      }>
    }

    if (!meetings || meetings.length === 0) {
      res.status(400).json({ error: 'No meetings provided' })
      return
    }

    const meetingLines = meetings.map((m) => {
      const decisions = m.decisions.join('; ')
      const actions = m.actionItems
        .map((a) => `${a.description}${a.owner ? ` (${a.owner})` : ''}`)
        .join('; ')
      const questions = m.openQuestions.join('; ')
      return `Meeting: ${m.title} (${m.date})\nSummary: ${m.summary}\nDecisions: ${decisions}\nAction items: ${actions}\nOpen questions: ${questions}`
    })

    const userMessage = `Project: ${projectTitle}\n\n${meetingLines.join('\n\n')}`

    const openai = new OpenAI({ apiKey })
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You summarize recent meeting outcomes for a project. Given the last 1-2 meetings, produce:

1. A short narrative summary (2-3 sentences) of what was decided and committed to. Write naturally, not as bullet points.
2. A structured list of commitments (action items with clear owners).

Rules:
- Keep the summary conversational and concise
- Only include commitments that have a clear action or deliverable
- If no owner is identified, set owner to null
- fromMeeting should be the meeting title

Return JSON:
{
  "summary": "string (2-3 sentences)",
  "commitments": [{ "description": "string", "owner": "string | null", "fromMeeting": "string" }]
}`,
        },
        { role: 'user', content: userMessage },
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
      commitments: parsed.commitments ?? [],
    })
  } catch (err) {
    console.error('Recent meeting summary error:', err)
    res.status(500).json({ error: 'Summary generation failed' })
  }
}
