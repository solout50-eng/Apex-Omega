// pages/index.js
// Reads the app HTML from lib/app.html and serves it directly.
// This completely avoids template literal / String.raw conflicts.

import fs from 'fs'
import path from 'path'

export default function Page() { return null }

export async function getServerSideProps({ res }) {
  const htmlPath = path.join(process.cwd(), 'lib', 'app.html')
  const html = fs.readFileSync(htmlPath, 'utf-8')
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.write(html)
  res.end()
  return { props: {} }
}
