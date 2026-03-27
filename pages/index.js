// pages/index.js
// Serves the app HTML. Injects the current user (if logged in) into window.__APEX_USER__.
// The HTML handles its own auth screen when __APEX_USER__ is null.

import fs from 'fs'
import path from 'path'
import { getUserFromReq } from '../lib/auth'
import { getUserById, safeUser } from '../lib/userStore'

export default function Page() { return null }

export async function getServerSideProps({ req, res }) {
  const htmlPath = path.join(process.cwd(), 'lib', 'app.html')
  let html = fs.readFileSync(htmlPath, 'utf-8')

  // Resolve logged-in user
  let user = null
  try {
    const payload = getUserFromReq(req)
    if (payload) {
      const full = getUserById(payload.id)
      user = safeUser(full)
    }
  } catch {}

  // Inject user into page as a global JS variable
  const injection = `<script>window.__APEX_USER__=${JSON.stringify(user)};</script>`
  html = html.replace('</head>', injection + '\n</head>')

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.write(html)
  res.end()
  return { props: {} }
}
