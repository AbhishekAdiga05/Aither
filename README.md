# Aither

> A fast, mobile-friendly chat app that runs entirely on **free AI models** — SSE token streaming, persistent history, hardened auth, and zero-cost inference by design.

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

## Features

- **Free-model-only chat** — server whitelists `$0` models from OpenRouter; paid models are rejected with `403` before any API call.
- **SSE streaming** — token-by-token responses via the Vercel AI SDK + OpenRouter provider.
- **Persistent chats** — conversations and messages stored in PostgreSQL (Prisma), searchable and grouped by date.
- **Auth** — GitHub + Google OAuth (Better Auth), invite-only signups, DB-backed rate limiting.
- **Model picker** — searchable catalog of free models with context length, modality, and pricing.
- **Web search toggle** — optional per-message web grounding.
- **Responsive UI** — desktop sidebar collapses into a mobile drawer; safe-area aware, touch-friendly, dark/light themes.

Built with **Next.js 16 · React 19 · Tailwind v4 · Prisma 7 · Better Auth · TanStack Query · Zustand · PostgreSQL**.

---

## Quick Start

**Prerequisites:** Node.js 20+, PostgreSQL 14+, an [OpenRouter](https://openrouter.ai/keys) API key. OAuth apps only needed for social sign-in.

```bash
git clone https://github.com/AbhishekAdiga05/Aither.git
cd Aither
npm install
cp .env.example .env   # then fill in your values
```

```bash
npx prisma db push      # create tables
npx prisma generate     # Prisma 7 doesn't auto-regenerate — run after any schema change
npm run dev             # → http://localhost:3000
```

---

## Environment Variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `OPENROUTER_API_KEY` | Yes | Drives model list + chat |
| `BETTER_AUTH_SECRET` | Yes | Session encryption (`openssl rand -base64 32`) |
| `GITHUB_CLIENT_ID` / `SECRET` | For GitHub login | GitHub OAuth app credentials |
| `GOOGLE_CLIENT_ID` / `SECRET` | For Google login | Google OAuth credentials |
| `BETTER_AUTH_URL` / `NEXT_PUBLIC_APP_URL` | Production only | Your public origin — omit locally; sign-in auto-detects the host |
| `CHAT_RATE_LIMIT_MAX` / `WINDOW_MS` | No | Chat rate limit (default: 40 req / 10 min) |
| `MAX_CONTEXT_CHARS` | No | Prior context cap sent to the model (default 12000) |

---

## Deployment

- **Vercel** — import the repo, add env vars (point `BETTER_AUTH_URL` / `NEXT_PUBLIC_APP_URL` at your domain), build with `npx prisma generate && next build`.
- **Netlify** — build: `node scripts/check-env.mjs && npx prisma db push --accept-data-loss && npx prisma generate && next build`; publish dir `.next`.

**Post-deploy checklist** — add both OAuth callback URLs (`https://<domain>/api/auth/callback/github` and `/google`), run `npx prisma db push && npx prisma generate` against production, and set `BETTER_AUTH_URL` / `NEXT_PUBLIC_APP_URL` to the production domain.

---

## Scripts

`npm run dev` · `npm run build` · `npm run start` · `npm run lint`

---

## Contributing

Fork the repo, create a feature branch, open a PR. Keep it free-model safe: any new default model must be `$0`.

---

## License

[MIT](./LICENSE)