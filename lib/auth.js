// lib/auth.js
// JWT sign/verify, cookie helpers, session extraction.

import jwt from 'jsonwebtoken'
import { serialize, parse } from 'cookie'

const SECRET = process.env.JWT_SECRET || 'apex-dev-secret-change-in-production'
const COOKIE = 'apex_token'
const MAX_AGE = 60 * 60 * 24 * 30 // 30 days

export function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: MAX_AGE })
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, SECRET)
  } catch {
    return null
  }
}

export function setAuthCookie(res, token) {
  const cookie = serialize(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: MAX_AGE,
    path: '/',
  })
  res.setHeader('Set-Cookie', cookie)
}

export function clearAuthCookie(res) {
  const cookie = serialize(COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  })
  res.setHeader('Set-Cookie', cookie)
}

export function getUserFromReq(req) {
  const cookies = parse(req.headers.cookie || '')
  const token = cookies[COOKIE]
  if (!token) return null
  return verifyToken(token)
}

// Middleware helper — call at top of API handlers that require auth.
// Returns the user payload or sends 401 and returns null.
export function requireAuth(req, res) {
  const user = getUserFromReq(req)
  if (!user) {
    res.status(401).json({ error: { message: 'Authentication required.' } })
    return null
  }
  return user
}
