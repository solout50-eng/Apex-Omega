// pages/api/ai/summarize.js
// Generate a short title for a conversation from its first few messages.

import { requireAuth } from '../../../lib/auth'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const user = requireAuth(req, res)
  if (!user) return

  const { messages } = req.body || {}
  if (!messages || !messages.length) {
    return res.status(400).json({ error: { message: 'messages required.' } })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return res.status(503).json({ error: { message: 'Claude API not configured.' } })

  // Only use first 3 exchanges to keep cost low
  const excerpt = messages.slice(0, 6).map(m => {
    const text = typeof m.content === 'string' ? m.content : (m.content?.[0]?.text || '')
    return `${m.role}: ${text.slice(0, 300)}`
  }).join('\n')

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 30,
        system: 'Respond with ONLY a short conversation title (4-7 words, no quotes, no punctuation at end). Nothing else.',
        messages: [{ role: 'user', content: `Create a title for this conversation:\n\n${excerpt}` }],
      }),
    })
    const data = await upstream.json()
    const title = data?.content?.[0]?.text?.trim() || 'New conversation'
    return res.status(200).json({ title })
  } catch (e) {
    return res.status(502).json({ error: { message: 'Summarize error: ' + e.message } })
  }
}
