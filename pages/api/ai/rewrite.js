// pages/api/ai/rewrite.js
// Rewrite the last assistant message in a different style.

import { requireAuth } from '../../../lib/auth'

const STYLES = {
  concise: 'Rewrite the following in a much shorter, more concise form. Keep only key points.',
  formal: 'Rewrite the following in a professional, formal tone suitable for business communication.',
  simple: 'Rewrite the following in very simple language, as if explaining to a 12-year-old.',
  bullet: 'Rewrite the following as a clear bulleted list of key points.',
  detailed: 'Rewrite the following with more depth, examples, and elaboration.',
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const user = requireAuth(req, res)
  if (!user) return

  const { text, style } = req.body || {}
  if (!text) return res.status(400).json({ error: { message: 'text required.' } })
  if (!STYLES[style]) return res.status(400).json({ error: { message: `style must be one of: ${Object.keys(STYLES).join(', ')}` } })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return res.status(503).json({ error: { message: 'Claude API not configured.' } })

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
        max_tokens: 1024,
        system: STYLES[style],
        messages: [{ role: 'user', content: text }],
      }),
    })
    const data = await upstream.json()
    const result = data?.content?.[0]?.text?.trim() || ''
    return res.status(200).json({ result })
  } catch (e) {
    return res.status(502).json({ error: { message: 'Rewrite error: ' + e.message } })
  }
}
