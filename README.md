# StudyHack Frontend

Next.js 14 · TypeScript · Tailwind · shadcn/ui · **Clerk auth**. UI for the StudyHack platform (frontend → backend → agent).

## The stack (3 repos)
- **studyhack-frontend** (this repo, Vercel) — the UI.
- **studyhack-backend** (`:8080`) — API, Postgres/R2, auth, materials, conversations.
- **studyhack-agent** (`:2024`) — retrieval + LLM chat server.

You can run the UI **alone with mock data**, or the **full stack** for the real end-to-end flow.

## Prerequisites
- Node.js 20+
- A **Clerk publishable key** (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`) — required even in mock mode (the app is wrapped in `<ClerkProvider>`).
- For full-stack testing: the `studyhack-backend` and `studyhack-agent` repos running locally, each with their own `.env` (Neon, R2, Clerk secret, OpenAI). See their READMEs.

## Setup
```bash
npm install
cp .env.local.example .env.local   # then fill in the Clerk key
npm run dev                        # http://localhost:3000
```
> Start at **`/dashboard`** or **`/onboarding`**, not `/` (the root is a legacy landing page).
> Env vars are read **only at startup** — restart `npm run dev` after editing `.env.local`.

---

## Local testing

### Mode A — Frontend only (mock data, no backend) — fastest
Serves built-in mock data; no backend/agent/DB needed.
```
NEXT_PUBLIC_USE_MOCKS=true
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
```
`npm run dev` → sign in with Clerk → the UI runs on mock data (`lib/mock-data.ts`).

Exercise specific dashboard states with a scenario (restart after changing):
```
NEXT_PUBLIC_MOCK_SCENARIO=empty-courses   # no enrollments (empty state)
NEXT_PUBLIC_MOCK_SCENARIO=loading         # loading skeleton
NEXT_PUBLIC_MOCK_SCENARIO=error           # error + retry
NEXT_PUBLIC_MOCK_SCENARIO=default         # seeded courses (default)
```
(Note: in mock mode nothing persists — onboarding just marks complete locally.)

### Mode B — Full stack (real backend + agent) — end-to-end
Run three terminals:
```bash
# 1) agent (needed only for REAL answers)
cd ../studyhack-agent   && npm run dev              # :2024

# 2) backend  — real Clerk auth (mockAuth=false)
cd ../studyhack-backend && npm run dev              # :8080  (mock agent, free)
#    ...or for REAL grounded answers via the agent + OpenAI:
cd ../studyhack-backend && USE_MOCK_AGENT=false npm run dev

# 3) frontend — point at the backend, mocks OFF
#    .env.local: NEXT_PUBLIC_USE_MOCKS=false, NEXT_PUBLIC_API_URL=http://localhost:8080
cd ../studyhack-frontend && npm run dev             # :3000
```
Then the real flow:
1. **Sign in** with Clerk.
2. **Onboarding** → add a course (use **`MATH 20D`** to hit the seeded study materials) → this persists to the backend and enrolls you.
3. **Dashboard** lists your enrolled courses → open one → **Chat** → ask a question → the answer streams back (Approach → Solution → Key Takeaways).

**Agent modes (backend `USE_MOCK_AGENT`):** `true` = canned reply, $0 (default); `false` = real retrieval + OpenAI (agent must be running on `:2024`).

> For seeded content in a course, the backend team seeds materials (`npm run seed:materials`) and they're embedded via the agent's `npm run ingest`. Chat against **MATH 20D** to see grounded answers + citations.

---

## Environment variables
| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://localhost:8080` |
| `NEXT_PUBLIC_USE_MOCKS` | Serve built-in mock data (run UI without a backend) | `true` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key (**required**) | — |
| `NEXT_PUBLIC_APP_ENV` | Environment label | `local` |
| `NEXT_PUBLIC_MOCK_SCENARIO` | Mock state: `default` / `empty-courses` / `loading` / `error` | `default` |
| `NEXT_PUBLIC_MOCK_DELAY_MS` | Optional mock response delay (ms) | `0` |

## Commands
| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server (port 3000) |
| `npm run build` | Production build |
| `npm run type-check` | TypeScript check |
| `npm test` | Vitest |
| `npm run lint` | ESLint |

## Authentication (Clerk)
Auth is handled by **Clerk** (`<ClerkProvider>` in `app/layout.tsx`, `<SignIn>`/`<SignUp>` on `/login` and `/register`). `contexts/AuthContext` is a thin adapter exposing `useAuth()` over Clerk; `lib/auth-token.ts` supplies the Clerk session token to the API client, uploads, and the chat SSE. Route protection: `middleware.ts` + `components/auth/ProtectedRoute`.

## Troubleshooting
- **No Clerk login / blank auth:** ensure `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is set and you're on an up-to-date branch (Clerk is on `main`). Restart after setting env.
- **Empty dashboard / "can't create course":** you're in mock mode — set `NEXT_PUBLIC_USE_MOCKS=false` (and run the backend) for real data, then restart.
- **Chat "failed to send":** make sure the backend is current (SSE responses need CORS headers) and, for real answers, the agent is running on `:2024` with `USE_MOCK_AGENT=false`.
- **First page load ~30–80s:** normal Next.js dev per-route compilation; not frozen. `npm run build` avoids it.
- **Port 3000 in use:** `npx next dev -p 3001`.
