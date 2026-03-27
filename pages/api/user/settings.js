// pages/api/user/settings.js
// GET  — return current user settings
// PATCH — update user settings

import { requireAuth } from '../../../lib/auth'
import { getUserById, updateUser, safeUser } from '../../../lib/userStore'

const ALLOWED_SETTINGS = ['theme', 'model', 'persona', 'temperature', 'maxTokens']

export default function handler(req, res) {
  const user = requireAuth(req, res)
  if (!user) return

  const full = getUserById(user.id)
  if (!full) return res.status(404).json({ error: { message: 'User not found.' } })

  if (req.method === 'GET') {
    return res.status(200).json({ settings: full.settings || {} })
  }

  if (req.method === 'PATCH') {
    const patch = {}
    for (const key of ALLOWED_SETTINGS) {
      if (req.body[key] !== undefined) patch[key] = req.body[key]
    }
    const updated = updateUser(user.id, { settings: { ...full.settings, ...patch } })
    return res.status(200).json({ settings: updated.settings })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
