// pages/api/auth/login.js
import bcrypt from 'bcryptjs'
import { getUserByEmail, safeUser } from '../../../lib/userStore'
import { signToken, setAuthCookie } from '../../../lib/auth'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { email, password } = req.body || {}

  if (!email || !password) {
    return res.status(400).json({ error: { message: 'Email and password are required.' } })
  }

  try {
    const user = getUserByEmail(email)
    if (!user) {
      return res.status(401).json({ error: { message: 'Invalid email or password.' } })
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      return res.status(401).json({ error: { message: 'Invalid email or password.' } })
    }

    const token = signToken({ id: user.id, email: user.email, name: user.name })
    setAuthCookie(res, token)
    return res.status(200).json({ user: safeUser(user) })
  } catch (e) {
    return res.status(500).json({ error: { message: 'Login failed.' } })
  }
}
