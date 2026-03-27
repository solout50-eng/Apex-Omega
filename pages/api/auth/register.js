// pages/api/auth/register.js
import bcrypt from 'bcryptjs'
import { createUser, safeUser } from '../../../lib/userStore'
import { signToken, setAuthCookie } from '../../../lib/auth'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { name, email, password } = req.body || {}

  if (!name || !email || !password) {
    return res.status(400).json({ error: { message: 'Name, email, and password are required.' } })
  }
  if (name.trim().length < 2) {
    return res.status(400).json({ error: { message: 'Name must be at least 2 characters.' } })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: { message: 'Invalid email address.' } })
  }
  if (password.length < 8) {
    return res.status(400).json({ error: { message: 'Password must be at least 8 characters.' } })
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12)
    const user = createUser({ name: name.trim(), email, passwordHash })
    const token = signToken({ id: user.id, email: user.email, name: user.name })
    setAuthCookie(res, token)
    return res.status(201).json({ user: safeUser(user) })
  } catch (e) {
    if (e.message === 'Email already registered.') {
      return res.status(409).json({ error: { message: e.message } })
    }
    return res.status(500).json({ error: { message: 'Registration failed.' } })
  }
}
