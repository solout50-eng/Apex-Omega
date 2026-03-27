// pages/api/chat.js
// Unified AI proxy — server-side API keys, requires authentication.
// Keys are NEVER sent from the client; they live in server environment variables.

export const config = {
  api: { bodyParser: { sizeLimit: '8mb' }, responseLimit: false }
}

import { requireAuth } from '../../lib/auth'

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    res.setHeader('Access-Control-Allow-Credentials', 'true')
    return res.status(200).end()
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Auth guard — every AI call requires a logged-in user
  const user = requireAuth(req, res)
  if (!user) return

  const { provider, stream, ...body } = req.body

  try {
    // ── Claude (Anthropic) ─────────────────────────────────────────────────
    if (provider === 'claude') {
      const apiKey = process.env.ANTHROPIC_API_KEY
      if (!apiKey) return res.status(503).json({ error: { message: 'Claude API not configured.' } })

      const upstream = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({ ...body, stream: stream || false }),
      })

      if (stream) {
        res.setHeader('Content-Type', 'text/event-stream')
        res.setHeader('Cache-Control', 'no-cache')
        res.setHeader('X-Accel-Buffering', 'no')
        res.status(upstream.status)
        const reader = upstream.body.getReader()
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          res.write(value)
        }
        return res.end()
      } else {
        const data = await upstream.json()
        return res.status(upstream.status).json(data)
      }
    }

    // ── OpenAI ─────────────────────────────────────────────────────────────
    if (provider === 'openai') {
      const apiKey = process.env.OPENAI_API_KEY
      if (!apiKey) return res.status(503).json({ error: { message: 'OpenAI API not configured.' } })

      const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
        body: JSON.stringify(body),
      })
      const data = await upstream.json()
      return res.status(upstream.status).json(data)
    }

    // ── Google Gemini ──────────────────────────────────────────────────────
    if (provider === 'gemini') {
      const apiKey = process.env.GEMINI_API_KEY
      if (!apiKey) return res.status(503).json({ error: { message: 'Gemini API not configured.' } })

      const model = body.model || 'gemini-1.5-pro'
      const { model: _, ...geminiBody } = body
      const upstream = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
          body: JSON.stringify(geminiBody)
        }
      )
      const data = await upstream.json()
      return res.status(upstream.status).json(data)
    }

    return res.status(400).json({ error: { message: 'Unknown provider: ' + provider } })

  } catch (e) {
    return res.status(502).json({ error: { message: 'Proxy error: ' + e.message } })
  }
}
