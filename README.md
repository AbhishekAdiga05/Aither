# ⚡ Aither

> A fast, secure, and production-ready full-stack AI chat platform powered by **free AI models** with real-time SSE token streaming.

<p align="center">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js" />
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react" />
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind-v4-06B6D4?style=flat-square&logo=tailwindcss" />
  <img alt="Prisma" src="https://img.shields.io/badge/Prisma-7-2D3748?style=flat-square&logo=prisma" />
  <img alt="Better Auth" src="https://img.shields.io/badge/Better--Auth-1.5-3B82F6?style=flat-square&logo=auth0" />
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql" />
  <img alt="License" src="https://img.shields.io/badge/License-MIT-green?style=flat-square" />
</p>

---

## ✨ Features

- **⚡ Zero-Cost Model Guard**: Server-side enforcement ensuring only `$0/0` free OpenRouter models can be invoked (HTTP `403` on paid models).
- **🔁 Real-time SSE Streaming**: Low-latency token-by-token streaming using Vercel AI SDK v6 (`streamText`).
- **🛡️ Resilience & Auto-Fallback**: Auto-retries on alternative verified free models if a provider times out (~1.3s average response time).
- **🗄️ Database Chat History**: Persistent chat threads, message history, and user sessions powered by PostgreSQL & Prisma 7.
- **🔐 Hardened Auth**: GitHub & Google OAuth via Better Auth with origin validation, trusted origins, and rate limiting.
- **📱 Responsive UX**: Collapsible desktop sidebar, mobile drawer, light/dark themes, syntax-highlighted code blocks, and markdown support.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router) + React 19 |
| **AI Engine** | Vercel AI SDK v6 + `@openrouter/ai-sdk-provider` |
| **Auth** | Better Auth v1.5 (GitHub & Google OAuth) |
| **Database & ORM** | PostgreSQL + Prisma 7 ORM |
| **Styling & Components** | Tailwind CSS v4 + Shadcn UI + Lucide Icons |
| **State & Data Fetching** | TanStack Query + Zustand |

---

## 💡 Key Technical Highlights

- **Atomic Message Persistence**: Streams complete by saving both user prompts and assistant replies to PostgreSQL in a single `onFinish` callback — preventing orphaned messages even if client disconnects mid-stream.
- **Dynamic Cost Safeguard**: Server-side model Whitelist cached for 1 hour and backed by static snapshots so paid models can never burn API key credits.
- **Context Window Protection**: Server-side context trimming caps prior conversation history to `MAX_CONTEXT_CHARS` (12,000 chars), keeping chats fast and reliable.
- **Layered Rate Limiting**: Fixed-window in-memory rate limiting on `/api/chat` + database-backed rate limiting on auth endpoints.

---

## 🚀 Quick Start

### 1. Clone & Install
```bash
git clone https://github.com/AbhishekAdiga05/Aither.git
cd Aither
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and fill in your keys:
```bash
cp .env.example .env
```

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `OPENROUTER_API_KEY` | Yes | OpenRouter API Key ([get a free key](https://openrouter.ai/keys)) |
| `BETTER_AUTH_SECRET` | Yes | Secret for session encryption (`openssl rand -base64 32`) |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | Optional | GitHub OAuth credentials |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Optional | Google OAuth credentials |

### 3. Setup Database & Start Server
```bash
npx prisma db push
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to start chatting!

---

## 📁 Project Structure

```
├── app/
│   ├── (auth)/sign-in/       # Login page & OAuth buttons
│   ├── (root)/chat/[chatId]/ # Individual chat view & streaming interface
│   └── api/
│       ├── ai/get-models/    # Free model catalog API route
│       ├── auth/             # Better Auth endpoints
│       └── chat/             # Streaming AI chat route handler
├── lib/
│   ├── ai-models.js          # Default & fallback model configurations
│   ├── free-models.mjs       # Cached catalog & static fallback snapshot
│   ├── auth.js / db.js       # Better Auth server config & Prisma client
│   └── rate-limit.mjs        # In-memory rate limiting middleware
├── prisma/
│   └── schema.prisma         # Models: User, Session, Account, Chat, Message, RateLimit
```

---

## ⚙️ Commands Reference

| Command | Action |
|---|---|
| `npm run dev` | Start development server at `http://localhost:3000` |
| `npm run build` | Generate production build |
| `npm start` | Serve production build |
| `npm run lint` | Run ESLint checks |
| `npx prisma db push` | Push Prisma schema to PostgreSQL database |
| `npx prisma generate` | Regenerate Prisma client |

---

## 📄 License

Distributed under the [MIT License](./LICENSE).