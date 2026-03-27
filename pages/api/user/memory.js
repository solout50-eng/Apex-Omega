// pages/api/user/memory.js
// GET    — return user's memory entries
// POST   — add a memory entry
// DELETE — delete a memory entry by index

import { requireAuth } from '../../../lib/auth'
import { getUserById, updateUser } from '../../../lib/userStore'

export default function handler(req, res) {
  const user = requireAuth(req, res)
  if (!user) return

  const full = getUserById(user.id)
  if (!full) return res.status(404).json({ error: { message: 'User not found.' } })

  if (req.method === 'GET') {
    return res.status(200).json({ memories: full.memories || [] })
  }

  if (req.method === 'POST') {
    const { text } = req.body || {}
    if (!text?.trim()) return res.status(400).json({ error: { message: 'text required.' } })
    const entry = { text: text.trim(), createdAt: new Date().toISOString() }
    const memories = [...(full.memories || []), entry]
    if (memories.length > 100) memories.splice(0, memories.length - 100)
    updateUser(user.id, { memories })
    return res.status(201).json({ memory: entry, memories })
  }

  if (req.method === 'DELETE') {
    const { index } = req.body || {}
    if (index === undefined || index < 0) return res.status(400).json({ error: { message: 'index required.' } })
    const memories = [...(full.memories || [])]
    memories.splice(index, 1)
    updateUser(user.id, { memories })
    return res.status(200).json({ memories })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
