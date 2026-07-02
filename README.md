# StudyAI Frontend

Next.js 14 application with TypeScript, Tailwind CSS, shadcn/ui, and JWT-based authentication.

## Prerequisites

- Node.js 20+
- (Optional) Backend running on http://localhost:8080 — only needed when **not** using mock mode (see [backend/README.md](../backend/README.md))

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy environment variables
cp .env.local.example .env.local

# 3. Start development server
npm run dev
```

Then open **http://localhost:3000/dashboard**.

### Run standalone (mock mode — no backend)

The UI ships with built-in mock data so you can run it without the Spring backend or a database. `.env.local.example` defaults to mock mode:

```
NEXT_PUBLIC_USE_MOCKS=true
```

With mocks on, `AuthContext` auto-signs-in a demo user and all data comes from `lib/mock-data.ts`. To run against the real backend instead, set `NEXT_PUBLIC_USE_MOCKS=false` and start the backend on `:8080`. **Env vars are read only at startup — restart `npm run dev` after changing `.env.local`.**

To manually verify non-default dashboard states, set one of these scenarios
in `.env.local` and restart the dev server:

```bash
# New user with no enrollments
NEXT_PUBLIC_MOCK_SCENARIO=empty-courses

# Keep the loading skeleton visible for 1.5 seconds
NEXT_PUBLIC_MOCK_SCENARIO=loading

# Show API error and retry states
NEXT_PUBLIC_MOCK_SCENARIO=error
```

`NEXT_PUBLIC_MOCK_DELAY_MS` can override the response delay for any scenario.
Return to `NEXT_PUBLIC_MOCK_SCENARIO=default` for the original seeded courses.

> ⚠️ **First load is slow.** Next.js dev compiles each route on first visit — a heavy page (e.g. `/dashboard`, `/dashboard/qa`) can take **30–80s the first time** and looks frozen, but isn't. Subsequent loads are instant. (Production `next build` does not have this.)
>
> ⚠️ **Start at `/dashboard` or `/onboarding`, not `/`.** The root `/` page is a legacy landing page that pings the backend health check on `:8080`, so it will spin/error in mock mode. The app lives at `/dashboard`, `/onboarding`, and `/courses/<id>`.

## Environment Variables

Copy `.env.local.example` to `.env.local` and configure:

| Variable                 | Description                                              | Default                 |
| ------------------------ | -------------------------------------------------------- | ----------------------- |
| `NEXT_PUBLIC_API_URL`    | Backend API URL                                          | `http://localhost:8080` |
| `NEXT_PUBLIC_APP_ENV`    | Environment label                                        | `local`                 |
| `NEXT_PUBLIC_USE_MOCKS`  | Serve built-in mock data; run UI without a backend       | `true`                  |
| `NEXT_PUBLIC_MOCK_SCENARIO` | Mock state: `default`, `empty-courses`, `loading`, or `error` | `default` |
| `NEXT_PUBLIC_MOCK_DELAY_MS` | Optional mock response delay in milliseconds          | `0`                     |

## Available Commands

| Command              | Description                          |
| -------------------- | ------------------------------------ |
| `npm run dev`        | Start development server (port 3000) |
| `npm run build`      | Create production build              |
| `npm run start`      | Start production server              |
| `npm run lint`       | Run ESLint                           |
| `npm run type-check` | Run TypeScript type checking         |

## Pages

| Route        | Description                             | Auth      |
| ------------ | --------------------------------------- | --------- |
| `/`          | Landing page with health check status   | Public    |
| `/login`     | Login form (redirects to /dashboard)    | Public    |
| `/register`  | Registration form (redirects to /login) | Public    |
| `/dashboard` | User dashboard                          | Protected |

Authenticated users are redirected away from `/login` and `/register`. Unauthenticated users are redirected to `/login` from protected pages.

## Project Structure

```
frontend/
├── app/
│   ├── layout.tsx           # Root layout (AuthProvider + Navigation + Footer)
│   ├── page.tsx             # Landing page with health check
│   ├── login/page.tsx       # Login form
│   ├── register/page.tsx    # Registration form
│   ├── dashboard/page.tsx   # Protected dashboard
│   └── globals.css
├── components/
│   ├── ui/                  # shadcn/ui components (button, card, input)
│   ├── auth/
│   │   └── ProtectedRoute.tsx  # Auth guard component
│   └── layout/
│       ├── Navigation.tsx
│       └── Footer.tsx
├── contexts/
│   └── AuthContext.tsx       # JWT token + user state management
├── lib/
│   ├── api-client.ts        # HTTP client with auth headers + 401 handling
│   ├── env.ts               # Environment variable validation
│   └── utils.ts
├── types/
│   └── api.ts               # TypeScript interfaces for API
├── .env.local.example
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

## Authentication Flow

1. User registers at `/register` → backend creates account → redirected to `/login`
2. User logs in at `/login` → backend returns JWT + user profile → stored in localStorage via `AuthContext`
3. `api-client.ts` automatically injects `Authorization: Bearer <token>` on all requests
4. On 401 response, the client clears the token and redirects to `/login`
5. `ProtectedRoute` component guards pages that require authentication

## Troubleshooting

### Page stuck on an infinite loading spinner

You're not in mock mode and there's no backend. Set `NEXT_PUBLIC_USE_MOCKS=true` in `.env.local`, then **restart** `npm run dev` (env is read at startup). Also navigate to `/dashboard`, not `/`.

### First page load takes ~30–80s

Normal for Next.js dev — it compiles each route on first visit (heavy deps: KaTeX, react-markdown, radix). It's compiling, not frozen; subsequent loads are milliseconds. Run `npm run build` for a production-style compile that avoids per-route lazy compilation.

### Health check shows "DOWN" or connection error

Make sure the backend is running and Docker services are up:

```bash
curl http://localhost:8080/api/health
docker-compose up -d
```

### TypeScript errors

```bash
npx tsc --noEmit
```

### Port 3000 already in use

```bash
npx next dev -p 3001
```
