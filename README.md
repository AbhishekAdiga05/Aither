# Aither

> A fast, mobile-friendly chat app powered entirely by **free AI models** — with streaming replies, saved conversations, secure login, and zero AI cost by design.

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

## What is this app?

Aither is a web-based AI chat app. You log in, pick a free AI model, and chat away. Every reply **streams live** (you see words appear as they're generated), all conversations are **saved to a database**, and you can come back later to continue where you left off.

The most important rule: **the app only ever uses free AI models.** Paid models are blocked on the server, so an AI bill of `$0` is guaranteed by design — not by hope.

---

## Features

| Feature | What it means for you |
| --- | --- |
| **Free models only** | The server refuses paid models (HTTP `403`). You can only pick from OpenRouter's `$0` catalog. |
| **Live streaming** | Replies stream token-by-token using SSE — no waiting for the whole answer. |
| **Saved chats** | Every conversation is stored in PostgreSQL and listed in a sidebar, grouped by date. |
| **Model picker** | Browse and search free models with details like context size, vision support, and pricing. |
| **Default model** | Chat opens on `Nex N2.5 Mini`, a capable, fully free model — no setup needed. |
| **Secure login** | Sign in with GitHub or Google (Better Auth). First visitors see a personalized "Welcome". |
| **Web search toggle** | Optionally ground each message with live web results (max 5 pages). |
| **Rate limits & abuse protection** | Per-user limits on chat and on sign-in attempts, backed by the database. |
| **Mobile-friendly** | Sidebar collapses into a drawer, touch-friendly controls, safe-area aware, dark/light themes. |

---

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, React Server Components) |
| UI | React 19, Tailwind CSS v4, shadcn/ui components |
| Data | PostgreSQL + Prisma 7 (ORM) |
| Auth | Better Auth (GitHub + Google OAuth) |
| AI | Vercel AI SDK + OpenRouter provider |
| State / data fetching | TanStack Query (client), Zustand (UI state) |
| Validation | Zod |

---

## How it works

```
You type a message
      │
      ▼
Save your message to the database  (so it's never lost)
      │
      ▼
  Server checks:
   • Are you logged in?          → 401 if not
   • Rate limit OK?              → 429 if too fast
   • Is the model really free?   → 403 if paid
   • Do you own this chat?       → 404 if not
      │
      ▼
 Build AI context from your last messages (max 20)
      │
      ▼
 Stream the AI reply back to you (token by token)
      │
      ▼
 Save the assistant's reply to the database
```

### Good to know

- **Your message is saved before the AI even replies.** If you refresh or close the page mid-stream, your message is still in your history.
- **Duplicate sends are blocked.** If you retry the same message within 10 seconds, it's not saved twice.
- **Context is trimmed.** Only the most recent ~20 messages are sent to the model (and capped at ~12,000 characters), so long chats stay fast and cheap.

---

## Quick start

### Prerequisites

| Requirement | Why |
| --- | --- |
| Node.js 20+ | Runtime for Next.js |
| PostgreSQL 14+ | Stores users, sessions, chats, messages |
| OpenRouter API key | Drives the model catalog and chat — [get one free here](https://openrouter.ai/keys) |
| GitHub / Google OAuth app | Only if you want social login (optional) |

### Setup

```bash
git clone https://github.com/AbhishekAdiga05/Aither.git
cd Aither
npm install
cp .env.example .env    # then fill in your values (see below)
```

```bash
npx prisma db push      # create the database tables
npx prisma generate     # generate the Prisma client (needed after schema changes)
npm run dev             # open http://localhost:3000
```

---

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `OPENROUTER_API_KEY` | Yes | Powers the model list and chat replies |
| `BETTER_AUTH_SECRET` | Yes | Encrypts login sessions — generate with `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | Prod only | Your public URL (Netlify/Vercel). Leave unset locally |
| `NEXT_PUBLIC_APP_URL` | Prod only | Optional alias for the public URL |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | For GitHub login | GitHub OAuth app credentials |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | For Google login | Google OAuth credentials |
| `OPENROUTER_DEFAULT_MODEL` | No | Overrides the default chat model (defaults to `nex-agi/nex-n2.5-mini:free`) |
| `CHAT_RATE_LIMIT_MAX` | No | Max chat requests per window (default `40`) |
| `CHAT_RATE_LIMIT_WINDOW_MS` | No | Chat rate-limit window in ms (default `600000` = 10 min) |
| `MAX_CONTEXT_CHARS` | No | Max characters of prior context sent to the model (default `12000`) |

---

## Setting up social login

### GitHub

1. Go to **GitHub → Settings → Developer settings → OAuth Apps → New OAuth App**.
2. Set the callback URL to: `https://<your-domain>/api/auth/callback/github` (use `http://localhost:3000/...` locally).
3. Copy the **Client ID** and **Client Secret** into your `.env`.

### Google

1. Go to [Google Cloud Console](https://console.cloud.google.com) → **Credentials → Create OAuth client ID**.
2. Add this authorized redirect URI: `https://<your-domain>/api/auth/callback/google`.
3. Copy the **Client ID** and **Client Secret** into your `.env`.

> Tip: if both are set up, users see both buttons. If only one is configured, the app automatically hides the other.

---

## Configuration details

### Default model

The app starts every new chat on **`nex-agi/nex-n2.5-mini:free`** (a fully free model that also understands images). To change it, either:

- set `OPENROUTER_DEFAULT_MODEL` in your environment, or
- just pick another model from the picker inside any chat.

### Rate limits

Two layers protect the app:

| Layer | What it guards | Default |
| --- | --- | --- |
| In-memory chat limiter | Chat requests per user | 40 requests / 10 minutes |
| Better Auth DB limiter | Sign-in attempts | 100 / minute, 20 for `/sign-in/social` |

The in-memory limiter is per server instance (fine for most deployments). The sign-in limiter is stored in PostgreSQL, so it survives restarts.

---

## Deployment

### Vercel

1. Import the repository.
2. Add all environment variables (set `BETTER_AUTH_URL` / `NEXT_PUBLIC_APP_URL` to your Vercel domain).
3. Set the build command to `npx prisma generate && next build`.
4. Deploy.

### Netlify

1. Import the repository.
2. Add all environment variables.
3. Build command: `node scripts/check-env.mjs && npx prisma db push --accept-data-loss && npx prisma generate && next build`
4. Publish directory: `.next`.

### Post-deploy checklist

- Set `BETTER_AUTH_URL` / `NEXT_PUBLIC_APP_URL` to the production domain.
- Add both OAuth callback URLs (`/api/auth/callback/github` and `/api/auth/callback/google`) to your OAuth apps.
- Run `npx prisma db push` (and `npx prisma generate`) against the production database.

---

## Security & cost controls

Aither is built to be safe to run in public from day one:

- **No paid AI ever.** The server checks every requested model against the live (or snapshot) free-model list before calling the API.
- **Ownership checks.** You can only read/write your own chats (every query filters by `userId`).
- **Auth on all chat writes.** The `/api/chat` route rejects requests without a valid session (`401`).
- **Payload caps.** Messages longer than `MAX_CONTEXT_CHARS` are rejected, so nobody can send huge prompts that burn bandwidth.
- **Session security.** Sessions are stored with IP + user-agent, and all endpoints are rate limited.
- **Friendly error handling.** AI failures are translated into clear, human-readable messages (rate limit, out of credits, model unavailable, content policy, network errors, etc.).

---

## Project structure

```
app/
├── (auth)/
│   └── sign-in/            # Login page (server-rendered "Welcome")
├── (root)/
│   ├── page.jsx            # Home chat landing page
│   └── chat/[chatId]/      # Individual chat screen
├── api/
│   ├── auth/               # Better Auth endpoints
│   ├── ai/get-models/      # Free-model catalog API
│   └── chat/               # Streaming chat API
└── modules/
    ├── authentication/     # Login actions, user button
    └── chat/               # Chat UI, sidebar, forms, models, actions
lib/
├── ai-models.js            # Default model + fallback model list
├── free-models.mjs         # Cached free-model catalog + safety snapshot
├── ai-errors.js            # AI error → friendly messages
├── auth.js / auth-client.js
├── db.js / rate-limit.mjs / prompt.js
prisma/
└── schema.prisma           # User, Session, Account, Chat, Message, rateLimit
```

---

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server at `http://localhost:3000` |
| `npm run build` | Create a production build |
| `npm start` | Serve the production build |
| `npm run lint` | Check code style with ESLint |
| `npx prisma db push` | Sync the database schema (dev) |
| `npx prisma generate` | Regenerate the Prisma client after schema changes |

---

## Troubleshooting

| Problem | Fix |
| --- | --- |
| "401 Unauthorized" on chat | You're not logged in — sign in first. |
| "The requested model is unavailable" | That model isn't in the free catalog (it's paid or removed). Pick another from the picker. |
| "This model is currently unavailable" | The model was removed from OpenRouter. Choose a different one. |
| Sign-in fails with origin error | You tested from a different host (e.g. LAN IP). Open the exact URL the dev server printed. |
| "Provider not found" | The OAuth env vars aren't set on the server. Add the credentials and redeploy. |
| Warning that a model "doesn't support images" | You attached an image but the selected model is text-only — switch to a vision-capable model or remove the attachment. |
| Chat history missing / empty | Check `DATABASE_URL` and run `npx prisma db push`. |

---

## FAQ

**Does this app cost money?**
No. Every model is verified `$0` on the OpenRouter catalog before a request is allowed.

**Can I use paid models?**
Nowhere. The server blocks them so a client-side trick can never rack up charges on your key.

**What is the default model?**
`nex-agi/nex-n2.5-mini:free` — a free model that also supports image inputs.

**Are my chats private?**
Each user only sees their own chats. All data lives in your own PostgreSQL database.

**Where are files/attachments handled?**
Messages can carry text and file parts (e.g. images). The model is only sent parts it actually supports.

---

## Contributing

1. Fork the repo and create a feature branch.
2. Keep changes free-model safe: any new default model must be `$0`.
3. Run `npm run lint` and `npm run build` before opening a pull request.

---

## License

[MIT](./LICENSE)