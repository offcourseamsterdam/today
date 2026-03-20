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
    const { transcript, agendaItems, language } = req.body as {
      transcript: string
      agendaItems: string[]
      language: string
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

    const openai = new OpenAI({ apiKey })
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You analyze meeting transcripts and produce structured notes. ${langInstruction}

Return a JSON object with exactly these fields:
- "summary": string (2-3 sentence overview of the meeting)
- "actionItems": array of { "description": string, "assignee": string | null }
- "decisions": array of strings (key decisions made during the meeting)

Be concise. Only include action items and decisions that are clearly stated or strongly implied.`,
        },
        {
          role: 'user',
          content: `Meeting agenda:\n${agendaItems.map((item, i) => `${i + 1}. ${item}`).join('\n')}\n\nTranscript:\n${transcript}`,
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
    })
  } catch (err) {
    console.error('Meeting notes error:', err)
    res.status(500).json({ error: 'Meeting notes generation failed' })
  }
}
