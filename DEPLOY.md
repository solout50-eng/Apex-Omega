# Apex Ω — Deploy to Vercel

## What's in this folder

```
apex-vercel/
├── pages/
│   ├── index.js          ← Full app (landing + chat)
│   └── api/
│       ├── claude.js     ← Anthropic proxy (serverless)
│       ├── openai.js     ← OpenAI proxy (serverless)
│       └── gemini.js     ← Gemini proxy (serverless)
├── package.json
├── next.config.js
├── vercel.json
└── .env.example
```

---

## Deploy in 5 steps

### 1. Create a GitHub repository
- Go to github.com → New repository → name it `apex-omega`
- Upload all files from this folder

### 2. Connect to Vercel
- Go to vercel.com → Sign up (free)
- Click "Add New Project"
- Import your GitHub repository
- Framework: Next.js (auto-detected)

### 3. Add environment variables
In Vercel → Project Settings → Environment Variables, add:

| Name | Value | Required |
|------|-------|----------|
| `ANTHROPIC_API_KEY` | `sk-ant-...` | ✅ Yes |
| `OPENAI_API_KEY` | `sk-...` | Optional |
| `GEMINI_API_KEY` | `AIzaSy...` | Optional |

⚠️  Keys are stored securely on Vercel — never visible to users.

### 4. Deploy
Click "Deploy". Vercel builds and deploys in ~60 seconds.

### 5. Your site is live
You get a URL like: `https://apex-omega.vercel.app`

---

## How it works

```
User's browser  →  /api/claude  →  Anthropic API
                →  /api/openai  →  OpenAI API
                →  /api/gemini  →  Google API
```

- All API calls go through Vercel serverless functions
- Your API keys stay on Vercel's servers — **never in browser code**
- Users can't see or steal your keys
- Free tier: 100GB bandwidth, unlimited deployments

---

## Local development

```bash
cd apex-vercel
npm install
cp .env.example .env.local
# Edit .env.local and add your keys
npm run dev
# Open http://localhost:3000
```

---

## Custom domain (optional)

In Vercel → Project → Domains → Add your domain.
Free SSL certificate included automatically.
