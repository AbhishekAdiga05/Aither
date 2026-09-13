# Aither

> A wrapper around **free AI models** — a fast, responsive chat app with SSE token streaming, persistent history, and zero-cost inference by design.

<p align="center">
  <a href="#features">Features</a> ·
  <a href="#getting-started">Getting Started</a> ·
  <a href="#architecture">Architecture</a> ·
  <a href="#security--cost-controls">Security &amp; Cost</a> ·
  <a href="#deployment">Deployment</a>
</p>

<p align="center">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js" />
  <img alt="React" src="https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react" />
  <img alt="Tailwind" src="https://img.shields.io/badge/Tailwind-v4-06B6D4?style=flat-square&logo=tailwindcss" />
  <img alt="Prisma" src="https://img.shields.io/badge/Prisma-7-2D3748?style=flat-square&logo=prisma" />
  <img alt="Better Auth" src="https://img.shields.io/badge/Better--Auth-1.5-3B82F6?style=flat-square&logo=auth0" />
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql" />
  <img alt="OpenRouter" src="https://img.shields.io/badge/OpenRouter-free--models-0EA5E9?style=flat-square" />
  <img alt="License" src="https://img.shields.io/badge/License-MIT-green?style=flat-square" />
</p>

---

## What is Aither?

Aither is a full-stack, mobile-friendly chat application built on the modern React stack. It talks to **OpenRouter's free model tier** through a single API key, streams responses token-by-token over SSE, and stores every conversation in PostgreSQL.

It is not just "another chat UI" — it bakes in the things production apps actually need:

- A **cost guard** that makes it *impossible* for a client-supplied model to spend money on your key.
- **Rate limiting** at both the auth layer (DB-backed) and the chat layer (tunable).
- **Hardened auth** — trusted callback origins, invite-only signups, static security headers + production CSP.

---

## Features

| Feature | Details |
| --- | --- |
| **Free-model-only chat** | Only zero-cost OpenRouter models can be invoked; anything else is rejected with `403` |
| **SSE streaming** | Token-by-token responses via the Vercel AI SDK (`ai` v6 + `@openrouter/ai-sdk-provider`) |
| **Model picker** | Searchable list of every available free model, with context length, modality & pricing details |
| **Persistent chats** | All messages saved to PostgreSQL via Prisma — searchable and grouped by date |
| **Chat search** | Instant client-side filter across titles and message content |
| **Web search toggle** | Optional web grounding per message |
| **Auth** | GitHub + Google OAuth via Better Auth; invite-only (`disableSignUp`), DB-backed rate limiting |
| **Responsive UI** | Desktop sidebar collapses into a mobile drawer; `dvh`, safe-area insets, touch-friendly controls |
| **Light / dark theme** | Two-tone theme with system detection |
| **Markdown rendering** | Code blocks with lightweight syntax highlighting, tables, lists, blockquotes |
| **Fault-tolerance** | Live model catalog with a 1-hour cache *and* a static snapshot fallback so chat never dies |

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | [Next.js 16](https://nextjs.org/) (App Router) · React 19 |
| Styling | [Tailwind CSS v4](https://tailwindcss.com/) · shadcn-style components on `radix-ui` |
| AI | [Vercel AI SDK](https://ai-sdk.dev/) v6 · [OpenRouter provider](https://openrouter.ai) |
| Auth | [Better Auth](https://www.better-auth.com/) v1.5 |
| Database | [Prisma](https://prisma.io/) 7 ORM · PostgreSQL (via `@prisma/adapter-pg`) |
| State / data | Zustand (UI state) · TanStack Query (server state) · @ai-sdk/react `useChat` |
| Utilities | `lucide-react`, `sonner`, `react-textarea-autosize`, `date-fns`, `zod` |

---

## Getting Started

### Prerequisites

- Node.js **20+** (Next.js 16 requirement)
- PostgreSQL 14+ (local or hosted, e.g. Neon / Supabase)
- An [OpenRouter](https://openrouter.ai/keys) API key
- GitHub and/or Google OAuth apps (only needed if you use social sign-in)

### 1. Clone & install

```bash
# Use your own URL — this points to the Aither repo
git clone https://github.com/AbhishekAdiga05/Aither.git
cd Aither
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Then fill in the values — see the [Environment Variables](#environment-variables) reference. The defaults in `.env.example` let you run the app locally with just `DATABASE_URL`, `BETTER_AUTH_SECRET`, and `OPENROUTER_API_KEY`.

### 3. Set up the database

```bash
npx prisma db push          # create tables from schema.prisma
npx prisma generate         # regenerate the Prisma client
```

> **Important:** Prisma 7 does **not** regenerate the client automatically on `db push`. Always run `npx prisma generate` after any schema change, or the app will fail with `model does not exist` errors.

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

All optional variables are safe to omit in local dev — they have code defaults.

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `OPENROUTER_API_KEY` | Yes | OpenRouter API key (drives both the model list and chat) |
| `BETTER_AUTH_SECRET` | Yes | Secret for session encryption — `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | Yes* | Public app URL, e.g. `http://localhost:3000` |
| `NEXT_PUBLIC_APP_URL` | Yes* | Client-side app URL (same value) |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | For GitHub sign-in | GitHub OAuth App credentials |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | For Google sign-in | Google OAuth credentials |
| `CHAT_RATE_LIMIT_MAX` | No | Chat requests allowed per user/IP per window (default `40`) |
| `CHAT_RATE_LIMIT_WINDOW_MS` | No | Chat rate-limit window (default `600000` = 10 min) |
| `MAX_CONTEXT_CHARS` | No | Max characters of prior context sent to the model (default `12000`) |

\* Required **and must be your real domain in production** — it is pinned into `trustedOrigins`, so sign-in callbacks from any other origin are rejected with `403`.

---

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |
| `npx prisma db push` | Sync database schema (use in dev) |
| `npx prisma migrate dev` | Create & apply a migration |
| `npx prisma generate` | Regenerate the Prisma client |

---

## Architecture

### Request flow for a chat message

```
Client (useChat)
   │  POST /api/chat  { chatId, model, messages, useWebSearch }
   ▼
/app/api/chat/route.js
   1. Verify session ────────────────✗ 401
   2. Rate limit (per user/IP) ──────✗ 429  (40 req / 10 min)
   3. Free-model check ──────────────✗ 403  (client can't pick paid models)
   4. Chat ownership ────────────────✗ 404
   5. Sanitize context → text/file parts only, capped at MAX_CONTEXT_CHARS
   6. Stream via @openrouter/ai-sdk-provider ──► SSE 200
   7. Persist user + assistant messages on finish
```

### Key modules

```
app/
├── api/
│   ├── chat/route.js            # SSE stream + all server-side guards
│   ├── ai/get-models/route.js   # Free-model catalog (1h cache)
│   └── auth/[...all]/route.js   # Better Auth handlers
├── (root)/
│   ├── layout.jsx               # AppShell: desktop sidebar + mobile drawer
│   ├── page.jsx                 # Home / new-chat with starter suggestions
│   └── chat/[chatId]/page.jsx   # Conversation view (auto-resume stream)
└── modules/
    ├── authentication/          # currentUser action, UserButton
    └── chat/
        ├── actions/             # Server actions (CRUD chats/messages)
        ├── components/          # Forms, message cards, sidebar, model picker
        ├── hooks/               # React Query + useChat hooks
        └── store/               # Zustand (active chat id)

lib/
├── auth.js                     # Better Auth server config & security options
├── auth-client.js              # Better Auth client config
├── db.js                       # Singleton Prisma client
├── ai-models.js                # AI SDK provider wiring
├── free-models.mjs             # Free-model catalog + static fallback snapshot
├── rate-limit.mjs              # In-memory fixed-window rate limiter
└── prompt.js                   # System prompt

proxy.ts                        # Middleware: auth gate, CSP (prod), nonce
next.config.js                  # Static security headers (nosniff, HSTS, …)
prisma/schema.prisma            # DB schema incl. rateLimit table
```

### Data model

```
User ──┬── Session        (auth sessions)
       ├── Account        (OAuth provider links)
       ├── Chat ── Message (conversation history)
       └── RateLimit      (better-auth DB-backed rate limiting)
```

---

## Security & Cost Controls

This is the part most AI chat demos skip — here's exactly what Aither enforces:

| Control | Where | Behavior |
| --- | --- | --- |
| **Cost guard** | `lib/free-models.mjs` + `/api/chat` | Server fetches OpenRouter models, keeps only `$0/0` text models, and whitelists them. A client-supplied paid `model` is rejected with `403` **before** any provider call |
| **Failsafe model list** | `lib/free-models.mjs` | If OpenRouter is unreachable, chat falls back to a bundled snapshot (`SAFE_FREE_MODEL_IDS`) — still 100 % free |
| **Chat rate limit** | `lib/rate-limit.mjs` | Per-user/per-IP fixed window, 40 req / 10 min, explicit `Retry-After` + `X-RateLimit-*` headers. Tunable via env |
| **Auth rate limit** | `lib/auth.js` | DB-backed (better-auth) — 100 req/min globally, 20 req/min on `/sign-in/social` |
| **Invite-only auth** | `lib/auth.js` | `disableSignUp: true` — only pre-existing accounts can sign in |
| **Trusted origins** | `lib/auth.js` | Callback origins outside `BETTER_AUTH_URL` get `403` (blocks open-redirect / CSRF-style abuse) |
| **Security headers** | `next.config.js` | `nosniff`, `Referrer-Policy`, `X-Frame-Options: DENY`, `Permissions-Policy`, HSTS (prod) |
| **CSP** | `proxy.ts` | Production-only Content-Security-Policy using a per-request nonce |
| **Context sanitization** | `/api/chat` | Only text/file parts are ever persisted or sent to the model; size capped |

> **Note:** the chat limiter is an in-memory `Map`, so on multi-instance/serverless deploys it is per-instance (still a useful shield). Swap it for Redis (`@upstash/redis`) if you need a hard global quota.

---

## API Endpoints

| Endpoint | Method | Description |
| --- | --- | --- |
| `/api/chat` | `POST` | Stream an AI response as SSE. Auth → rate limit → free-model → ownership checks |
| `/api/ai/get-models` | `GET` | List currently free, text-capable OpenRouter models (cached 1 h, `public, max-age=3600`) |
| `/api/auth/[...all]` | `*` | Better Auth — sign-in, sign-out, session, social OAuth callbacks |

`/api/chat` error mapping: `401` unauthenticated · `429` rate limited · `403` non-free model · `404` chat not found/not yours · `400` malformed request.

---

## Deployment

### Vercel

1. Push the repo to GitHub and import it on Vercel.
2. Add every variable from [Environment Variables](#environment-variables), pointing `BETTER_AUTH_URL` / `NEXT_PUBLIC_APP_URL` at your Vercel domain.
3. Use build command `npx prisma generate && next build`. Optionally run `node scripts/check-env.mjs` before it to fail fast on missing required env vars: `node scripts/check-env.mjs && npx prisma generate && next build`.
4. Migrate your production database once (`npx prisma db push`), then deploy.

### Netlify

- Build command: `node scripts/check-env.mjs && npx prisma db push --skip-generate && npx prisma generate && next build` (fail fast on missing env vars, applies schema changes to the production DB on every deploy)
- Publish directory: `.next`

### Post-deploy checklist

- [ ] `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` are set to the **production domain**
- [ ] OAuth callback URLs registered:
  - GitHub: `https://<domain>/api/auth/callback/github`
  - Google: `https://<domain>/api/auth/callback/google`
- [ ] `npx prisma db push && npx prisma generate` run against the production DB
- [ ] `OPENROUTER_API_KEY` has credits enabled for free-tier access

---

## Contributing

1. Fork the repository.
2. Create a feature branch (`git checkout -b feat/my-feature`).
3. Commit your changes and open a Pull Request.
4. Keep it free-model safe: any new default model must be `$0`/0.

---

## License

[MIT](./LICENSE)