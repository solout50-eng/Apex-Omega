// pages/api/auth/me.js
import { requireAuth } from '../../../lib/auth'
import { getUserById, safeUser } from '../../../lib/userStore'

export default function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const payload = requireAuth(req, res)
  if (!payload) return

  const user = getUserById(payload.id)
  if (!user) return res.status(404).json({ error: { message: 'User not found.' } })

  return res.status(200).json({ user: safeUser(user) })
}
