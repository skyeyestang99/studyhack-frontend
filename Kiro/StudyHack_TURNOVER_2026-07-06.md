# StudyHack — Session Turnover (2026-07-06)

Supersedes `StudyHack_TURNOVER_2026-07-04.md`. No secrets here (creds in gitignored `.env`; rotate list §7).

## 1. Where things stand
Full vertical slice works locally **and** the whole **trust stack + retention engine** shipped and merged.
Clerk auth → onboarding/enrollment → materials (R2+Neon, PDF/docx/pptx/txt/md, OCR for scans, auto-embed worker) →
course-scoped pgvector retrieval → chat (grounded, direct answers, multi-turn, citations w/ page jump, grounding badge,
numeric verification ✓, calibrated abstention, 👍/👎/report, stop, snap-a-photo) → AI study tools (study guide,
practice problems, flashcards + spaced repetition + progress) → exam countdowns → admin review queue → eval harness
(retrieval + answer faithfulness/correctness/abstention + auto golden-sets from feedback). All 3 repos' `main`/`staging` current.

## 2. Repos — all under **`~/dev`** (moved off `~/Desktop` to escape iCloud corruption; see §11)
- **studyhack-frontend** (Vercel) — Next.js. Workflow: PR → **staging** → then staging→main.
- **studyhack-backend** (`:8080`, Railway paused) — Fastify/TS. PR → **main**.
- **studyhack-agent** (`:2024`, Railway paused) — Node/TS + Python `eval/`. PR → **main**.
- **StudyWS** (`~/dev/StudyWS`; symlinked from `~/Desktop/StudyWS` for the chat session CWD) — design docs 01–06. Local git works now; API fallback still fine.

## 3. Backend migrations (Neon **dev**, applied 0001–0013)
0001 materials · 0002 catalog+auth (+seed UCSD/Prof.Demo/**MATH 20D** `33333333-…`) · 0003 clerk_id · 0004 enrollments+course dedup ·
0005 material_chunks (vector 1536, HNSW, **page** col) · 0006 conversations+messages · **0007** conversations.user_id/course_id→uuid+FK ·
**0008** materials.embedding_attempts · **0009** messages.mode · **0010** messages.verified · **0011** message_feedback ·
**0012** syllabus_events · **0013** flashcards.

## 4. Feature inventory (all merged)
- **Auth/RBAC**: Clerk verify + upsert; `MOCK_AUTH` = fixed uuid user (upserted). **Admin = `ADMIN_EMAILS` allowlist** (server-side) + `requireAdmin`; `/admin` page + `GET /api/admin/feedback` review queue.
- **Access control**: `requireEnrollment` (uuid+exists+enrolled → 400/404/403) on chat/conversations/upload/study-tools/flashcards/syllabus.
- **Materials/ingest**: upload validated (non-empty, ext pdf/txt/md/docx/pptx, materialType allow-list, sha256 dedup 409); agent `extract` = PDF(+per-page)/office/text + **OCR fallback** (pdf-to-img + @napi-rs/canvas → gpt-4o-mini vision); **background embed worker** (agent poller `ingestPending`, retry `embedding_attempts`<3); status derived VALIDATING→READY/FAILED.
- **Chat**: course-scoped retrieve (`hnsw.iterative_scan` on), **direct-answer** grounded prompt + **labeled general fallback**, **multi-turn history**, **S4 injection-hardened** (untrusted `<course_materials>`), **grounding mode badge** (grounded≥0.45/partial≥0.30/general), **numeric verification** (mathjs; "✓ Steps checked"), **citations relevance-gated (≥0.35)** + **jump-to-source page** (`file · p.N` → PDF `#page=N`), **abstention CTA**, **👍/👎/report**, **stop/cancel**, **snap-a-problem** image (client-compress → gpt-4o-mini vision).
- **Study tools**: `/study-tool` (study_guide, practice_problems, streamed) + `/flashcards` (JSON) → flashcards table + **SM-2-lite** review + progress (Study Guide tab: StudyToolsPanel + FlashcardsPanel).
- **Retention**: `syllabus_events` CRUD → ExamReminderStrip + SyllabusPanel countdowns ("exam in N days" → Generate Study Guide).
- **Eval (`agent/eval/`, Python)**: retrieval (recall/mrr/ndcg/isolation) + **answer** (faithfulness/correctness/abstention, `run_answer_eval.py`) + **`build_goldenset_from_feedback.py`** (👍 → golden set).

## 5. Contracts / thresholds (tunable)
- SSE events: `token`(JSON string) · `mode`{mode,topSource} · `verification`{status} · `citation`{materialId,fileName,page?,score,kind} · `done`{messageId} · `error`. Frontend named-event framing.
- Thresholds: citation ≥0.35; grounded ≥0.45 / partial ≥0.30; verification numeric tol 1e-3; SRS mastered = interval≥21d; OCR cap 15 pages; embed retry cap 3.

## 6. Run locally (no Railway)
- agent `npm run dev` (:2024) · backend `USE_MOCK_AGENT=false npm run dev` (:8080) · frontend `npm run dev` (:3000, `NEXT_PUBLIC_USE_MOCKS=false`).
- Mock modes: `USE_MOCK_AGENT=true` (canned) / `MOCK_AUTH=true` (bypass Clerk, curl) / `NEXT_PUBLIC_USE_MOCKS=true` (UI-only).
- Restart servers from `~/dev/...` after `git pull`.

## 7. Credentials (gitignored `.env`; ROTATE — chat-exposed)
- backend: Neon dev URL, R2, CLERK_SECRET_KEY, INTERNAL_JWT_SECRET, AGENT_URL, MOCK_AUTH, USE_MOCK_AGENT, **ADMIN_EMAILS** (set to your email for admin).
- agent: DATABASE_URL, R2, OPENAI_API_KEY, INTERNAL_JWT_SECRET, PORT=2024, chunk sizes, (opt) OCR_MAX_PAGES/INGEST_POLL_MS.
- frontend: NEXT_PUBLIC_API_URL, NEXT_PUBLIC_USE_MOCKS, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.
- Backups: `~/dev/.env-backups/`. ⚠️ Rotate OpenAI/Neon/R2/Clerk/Vercel; untrack `.kiro/settings/mcp.json` (Google secret) in StudyAiApplication.

## 8. Branching workflow (per user)
- **frontend** → PR into `staging`, then `staging`→`main`. **backend + agent** → PR into `main`. **docs** → direct to main.
- **User authorized direct merges** — this session used `gh pr merge <branch> --merge --delete-branch --admin` after local verify.
- **Stranding lesson**: merging a PR mid-work orphans later commits. Either merge only after I signal a batch complete, or I self-merge each verified feature immediately (now the norm).

## 9. Open items / next
- **Cold-start seeding + crowdsourcing (#2 / backlog #30)** — USER OWNS. Doc 06 scoping hierarchy (personal⊂professor⊂course⊂canonical; retrieve-and-merge-never-exclude + label; delete/donation semantics) still undecided.
- **Deploy to Railway** (backend+agent) + point Vercel at it + Clerk prod + `ADMIN_EMAILS`.
- **Monetization**: Stripe + tiered quotas (users.subscription_tier exists) — cost control before growth.
- **Scaling**: course-partition `material_chunks` (durable filtered-ANN fix; iterative_scan is the interim); hybrid+rerank for precision.
- **Re-ingest** existing materials (`npm run ingest`) so they gain **page** provenance (chunker now per-page).
- **Mobile**: real on-device pass (code-level fix done). **Grading/interactive quiz** (fast-follow on study tools). **Review-queue** beyond allowlist (Clerk roles).
- Tune thresholds w/ the answer-eval; grow corpus for real scaling numbers.

## 10. Key commands
- backend: `npm run dev` · `npm run migrate` · `npm test` · `npm run seed:materials`
- agent: `npm run dev` · `npm run ingest [--pending|<id>]` · `npm run typecheck`
- eval (venv + OPENAI_API_KEY, from agent dir): `python -m eval.run_retrieval_eval` · `python -m eval.run_answer_eval --limit 5` · `python -m eval.build_goldenset_from_feedback`

## 11. Gotchas
- **iCloud was the corruption root cause** (repos under `~/Desktop` synced to iCloud → evicted `node_modules`/`app/`/`types.ts`, `" 2"` dupes, git hangs). Fixed by moving to `~/dev`. Recovery if it recurs: `git checkout -- .`, `npm install`, keep repos off Desktop/Documents.
- `~/Desktop/StudyWS` is a **symlink** → `~/dev/StudyWS` (so this chat session's CWD + `/chat save` path still resolve; session files live safely in ~/dev).
- pgvector 0.8.0 on Neon (iterative_scan supported). Node 20. psql `/opt/homebrew/opt/libpq/bin/psql`.
- officeparser has a harmless `node -e` CLI-detection crash (fine under tsx). pdf-to-img needs @napi-rs/canvas (installed).
