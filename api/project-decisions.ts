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
      return `Meeting: ${m.title} (${m.date})\nDecisions: ${decisions}\nAction items: ${actions}`
    })

    const userMessage = `Project: ${projectTitle}\n\n${meetingLines.join('\n\n')}`

    const openai = new OpenAI({ apiKey })
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are a concise meeting analyst. Given decisions and action items from multiple meetings for a project, produce a consolidated summary.

For each decision:
- Extract what was decided (one clear sentence)
- Identify who is responsible (from action item owners, or null if unclear)
- Note which meeting date it came from
- Note the meeting title

Group decisions by theme where natural themes emerge.

Rules:
- Only include actual decisions, not discussion points or open questions
- If a decision from an earlier meeting was revised in a later meeting, show the latest version
- Keep decision text concise (one sentence)
- Themes should be 1-2 words (e.g., "Infrastructure", "Hiring", "Product")
- If no clear themes, return an empty themes array

Return a JSON object:
- "decisions": array of { "decision": string, "responsible": string | null, "date": string, "meetingTitle": string }
- "themes": string[] (short theme labels, max 5)`,
        },
        {
          role: 'user',
          content: userMessage,
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
      decisions: parsed.decisions ?? [],
      themes: parsed.themes ?? [],
    })
  } catch (err) {
    console.error('Project decisions error:', err)
    res.status(500).json({ error: 'Decision consolidation failed' })
  }
}
