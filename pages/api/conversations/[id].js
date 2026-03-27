// pages/api/conversations/[id].js
// GET    — get full conversation (with messages)
// PATCH  — update title / pinned / model / persona
// DELETE — delete conversation

import { requireAuth } from '../../../lib/auth'
import {
  getConversationById,
  updateConversation,
  deleteConversation,
} from '../../../lib/userStore'

export default function handler(req, res) {
  const user = requireAuth(req, res)
  if (!user) return

  const { id } = req.query
  const conv = getConversationById(id)

  if (!conv) return res.status(404).json({ error: { message: 'Conversation not found.' } })
  if (conv.userId !== user.id) return res.status(403).json({ error: { message: 'Forbidden.' } })

  if (req.method === 'GET') {
    return res.status(200).json({ conversation: conv })
  }

  if (req.method === 'PATCH') {
    const { title, pinned, model, persona } = req.body || {}
    const patch = {}
    if (title !== undefined) patch.title = title.trim().slice(0, 100)
    if (pinned !== undefined) patch.pinned = Boolean(pinned)
    if (model !== undefined) patch.model = model
    if (persona !== undefined) patch.persona = persona
    const updated = updateConversation(id, patch)
    return res.status(200).json({ conversation: updated })
  }

  if (req.method === 'DELETE') {
    deleteConversation(id)
    return res.status(200).json({ ok: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
