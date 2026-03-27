// pages/api/conversations/[id]/messages.js
// POST — append a message pair (user + assistant) to a conversation

import { requireAuth } from '../../../../lib/auth'
import { getConversationById, appendMessage } from '../../../../lib/userStore'

export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const user = requireAuth(req, res)
  if (!user) return

  const { id } = req.query
  const conv = getConversationById(id)
  if (!conv) return res.status(404).json({ error: { message: 'Conversation not found.' } })
  if (conv.userId !== user.id) return res.status(403).json({ error: { message: 'Forbidden.' } })

  const { role, content } = req.body || {}
  if (!role || !content) return res.status(400).json({ error: { message: 'role and content required.' } })

  const message = { role, content, timestamp: new Date().toISOString() }
  const updated = appendMessage(id, message)
  return res.status(201).json({ message, conversation: updated })
}
