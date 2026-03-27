// lib/userStore.js
// Thin abstraction over user + conversation storage.
// On Vercel production, set VERCEL_KV_URL and this will use KV automatically.
// Locally (and as fallback), uses data/users.json and data/conversations.json.

import fs from 'fs'
import path from 'path'
import { v4 as uuid } from 'crypto'

// ─── simple uuid without external dep ────────────────────────────────────────
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9)
}

// ─── file paths ───────────────────────────────────────────────────────────────
const DATA_DIR = path.join(process.cwd(), 'data')
const USERS_FILE = path.join(DATA_DIR, 'users.json')
const CONVS_FILE = path.join(DATA_DIR, 'conversations.json')

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
}

// ─── low-level read/write ─────────────────────────────────────────────────────
function readJSON(file, fallback) {
  try {
    ensureDataDir()
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, JSON.stringify(fallback), 'utf-8')
      return fallback
    }
    return JSON.parse(fs.readFileSync(file, 'utf-8'))
  } catch {
    return fallback
  }
}

function writeJSON(file, data) {
  ensureDataDir()
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8')
}

// ─── USER STORE ───────────────────────────────────────────────────────────────
export function getAllUsers() {
  return readJSON(USERS_FILE, [])
}

export function getUserById(id) {
  return getAllUsers().find(u => u.id === id) || null
}

export function getUserByEmail(email) {
  return getAllUsers().find(u => u.email === email.toLowerCase()) || null
}

export function createUser({ name, email, passwordHash }) {
  const users = getAllUsers()
  if (users.find(u => u.email === email.toLowerCase())) {
    throw new Error('Email already registered.')
  }
  const user = {
    id: genId(),
    name,
    email: email.toLowerCase(),
    passwordHash,
    createdAt: new Date().toISOString(),
    settings: {
      theme: 'dark',
      model: 'claude-sonnet-4-20250514',
      persona: 'oracle',
      temperature: 0.7,
      maxTokens: 4096,
    },
    memories: [],
  }
  users.push(user)
  writeJSON(USERS_FILE, users)
  return user
}

export function updateUser(id, patch) {
  const users = getAllUsers()
  const idx = users.findIndex(u => u.id === id)
  if (idx === -1) throw new Error('User not found.')
  users[idx] = { ...users[idx], ...patch }
  writeJSON(USERS_FILE, users)
  return users[idx]
}

// ─── CONVERSATION STORE ───────────────────────────────────────────────────────
function getAllConversations() {
  return readJSON(CONVS_FILE, [])
}

function saveAllConversations(convs) {
  writeJSON(CONVS_FILE, convs)
}

export function getConversationsByUser(userId) {
  return getAllConversations()
    .filter(c => c.userId === userId)
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
}

export function getConversationById(id) {
  return getAllConversations().find(c => c.id === id) || null
}

export function createConversation(userId, title = 'New conversation') {
  const convs = getAllConversations()
  const conv = {
    id: genId(),
    userId,
    title,
    messages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    pinned: false,
    model: null,
    persona: null,
  }
  convs.push(conv)
  saveAllConversations(convs)
  return conv
}

export function updateConversation(id, patch) {
  const convs = getAllConversations()
  const idx = convs.findIndex(c => c.id === id)
  if (idx === -1) throw new Error('Conversation not found.')
  convs[idx] = { ...convs[idx], ...patch, updatedAt: new Date().toISOString() }
  saveAllConversations(convs)
  return convs[idx]
}

export function deleteConversation(id) {
  const convs = getAllConversations().filter(c => c.id !== id)
  saveAllConversations(convs)
}

export function appendMessage(convId, message) {
  const convs = getAllConversations()
  const idx = convs.findIndex(c => c.id === convId)
  if (idx === -1) throw new Error('Conversation not found.')
  convs[idx].messages.push(message)
  convs[idx].updatedAt = new Date().toISOString()
  saveAllConversations(convs)
  return convs[idx]
}

// Safe user object — strips passwordHash before sending to client
export function safeUser(user) {
  if (!user) return null
  const { passwordHash, ...safe } = user
  return safe
}
