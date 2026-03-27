// pages/api/ai/suggest.js
// Generate 3 follow-up question suggestions based on current conversation.

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

  const recent = messages.slice(-4).map(m => {
    const text = typeof m.content === 'string' ? m.content : (m.content?.[0]?.text || '')
    return `${m.role}: ${text.slice(0, 400)}`
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
        max_tokens: 200,
        system: 'Output exactly 3 follow-up questions, one per line, no numbering, no extra text.',
        messages: [{ role: 'user', content: `Suggest 3 follow-up questions for this conversation:\n\n${recent}` }],
      }),
    })
    const data = await upstream.json()
    const raw = data?.content?.[0]?.text?.trim() || ''
    const suggestions = raw.split('\n').map(s => s.trim()).filter(Boolean).slice(0, 3)
    return res.status(200).json({ suggestions })
  } catch (e) {
    return res.status(502).json({ error: { message: 'Suggest error: ' + e.message } })
  }
}
