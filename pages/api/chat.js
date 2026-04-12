// pages/api/chat.js
// Unified AI proxy — server-side API keys, requires authentication.
// Keys are NEVER sent from the client; they live in server environment variables.

export const config = {
  api: { bodyParser: { sizeLimit: '8mb' }, responseLimit: false }
}

import { requireAuth } from '../../lib/auth'

// Normalize legacy / alternate model IDs to current canonical strings
const MODEL_MAP = {
  'claude-opus-4-20250514':     'claude-opus-4-6',
  'claude-sonnet-4-20250514':   'claude-sonnet-4-6',
  'claude-haiku-4-5-20251001':  'claude-haiku-4-5',
  'claude-3-5-sonnet-20241022': 'claude-sonnet-4-6',
  'claude-3-opus-20240229':     'claude-opus-4-6',
  'claude-3-haiku-20240307':    'claude-haiku-4-5',
}

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

      // Resolve model — normalise legacy IDs
      const model = MODEL_MAP[body.model] || body.model || 'claude-sonnet-4-6'
      const isOpus = model.includes('opus')

      // Wrap system string with cache_control for prompt caching.
      // This keeps the large persona prompt cached across requests, cutting cost & latency.
      const systemPayload = typeof body.system === 'string' && body.system
        ? [{ type: 'text', text: body.system, cache_control: { type: 'ephemeral' } }]
        : (body.system || undefined)

      // Build enhanced request body
      const claudeBody = {
        model,
        messages: body.messages,
        max_tokens: body.max_tokens || 8096,
        ...(systemPayload ? { system: systemPayload } : {}),
        stream: stream || false,

        // Adaptive thinking for Opus 4.6 — model decides when & how much to think.
        // Temperature must be 1 when thinking is enabled.
        ...(isOpus
          ? { thinking: { type: 'adaptive' }, temperature: 1 }
          : { temperature: body.temperature ?? 0.7 }),

        // Native Anthropic-hosted web search — no client-side tool loop needed.
        // Claude calls this automatically; results stream back transparently.
        tools: [
          { type: 'web_search_20260209', name: 'web_search' },
        ],
      }

      const upstream = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(claudeBody),
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

    // ── OpenAI ────────────────────────────────────────────────────────────��
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

      const model = body.model || 'gemini-2.0-flash'
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
