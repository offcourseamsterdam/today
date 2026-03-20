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
    const language = (req.query.language as string) || 'auto'

    // req.body is a Buffer when Content-Type is not JSON
    const buffer = Buffer.isBuffer(req.body)
      ? req.body
      : Buffer.from(req.body)

    const file = new File([buffer], 'audio.webm', { type: 'audio/webm' })

    const openai = new OpenAI({ apiKey })
    const transcription = await openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      ...(language !== 'auto' ? { language } : {}),
    })

    res.status(200).json({ text: transcription.text })
  } catch (err) {
    console.error('Transcription error:', err)
    res.status(500).json({ error: 'Transcription failed' })
  }
}
