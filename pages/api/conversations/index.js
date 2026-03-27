// pages/api/conversations/index.js
// GET  — list user's conversations
// POST — create new conversation

import { requireAuth } from '../../../lib/auth'
import { getConversationsByUser, createConversation } from '../../../lib/userStore'

export default function handler(req, res) {
  const user = requireAuth(req, res)
  if (!user) return

  if (req.method === 'GET') {
    const convs = getConversationsByUser(user.id)
    // Strip messages from list view — only return metadata
    const list = convs.map(({ messages, ...meta }) => ({
      ...meta,
      messageCount: messages.length,
      lastMessage: messages.length > 0 ? messages[messages.length - 1].content?.slice(0, 120) : null,
    }))
    return res.status(200).json({ conversations: list })
  }

  if (req.method === 'POST') {
    const { title } = req.body || {}
    const conv = createConversation(user.id, title || 'New conversation')
    return res.status(201).json({ conversation: conv })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
