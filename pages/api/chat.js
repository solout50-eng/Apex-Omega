// pages/api/chat.js
// Single unified proxy endpoint for all AI providers.
// The API key comes from the user's browser (stored in their localStorage).
// Nothing is stored on the server — zero cost to you.

export const config = {
  api: { bodyParser: { sizeLimit: '8mb' }, responseLimit: false }
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    return res.status(200).end()
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { provider, apiKey, stream, ...body } = req.body

  if (!apiKey) return res.status(401).json({ error: { message: 'No API key provided.' } })

  try {
    if (provider === 'claude') {
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

    if (provider === 'openai') {
      const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
        body: JSON.stringify(body),
      })
      const data = await upstream.json()
      return res.status(upstream.status).json(data)
    }

    if (provider === 'gemini') {
      const model = body.model || 'gemini-1.5-pro'
      const { model: _, ...geminiBody } = body
      const upstream = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey }, body: JSON.stringify(geminiBody) }
      )
      const data = await upstream.json()
      return res.status(upstream.status).json(data)
    }

    return res.status(400).json({ error: { message: 'Unknown provider: ' + provider } })

  } catch (e) {
    return res.status(502).json({ error: { message: 'Proxy error: ' + e.message } })
  }
}
