# Cursive

**Monkeytype for writing, with Copilot built in.** The most satisfying place on the
internet to type: inline AI ghost-text completions (Tab to accept), a buttery animated
caret, tasteful typing effects, beautiful themes. Local-first — no accounts, documents
never leave your browser.

## Repo layout

```
app/        Vite + TypeScript app; app/api/ holds the Vercel Edge Functions (AI proxy)
docs/       ARCHITECTURE.md (design), ROADMAP.md (deliberate non-goals)
```

## Development

```bash
cd app
npm install
npm run dev        # editor at localhost:5173 (AI proxy not served by Vite —
                   #   use `vercel dev` to exercise the free tier locally)
npm test           # Vitest: core policy, ghost-text plugin, proxy handler
npx tsc --noEmit   # typecheck
npm run build
```

## Deploying (Vercel)

- Project root: `app/` (Vite preset; `api/*.ts` become Edge Functions automatically).
- Set the env vars from `app/.env.example` (provider keys, Upstash Redis, caps).
- CI (GitHub Actions) runs typecheck + tests + build; Vercel's Git integration
  provides preview deployments per PR.
- Note: Vercel Hobby is non-commercial — revisit before any monetization.

## Privacy, in one paragraph

Documents persist to IndexedDB in your browser and are never stored server-side.
At suggestion time only ≤ ~1,000 characters before the caret plus your document-intent
line are sent to the AI provider. Free-tier requests go through our proxy to free
model tiers (those providers may train on submitted text — disclosed in-app).
BYOK keys live only in localStorage and go directly from your browser to your provider.
