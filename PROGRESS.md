# Mulaqat — Progress

## M3 — Matching & the reveal   [DONE]
- [x] **matching engine** (ai, pure/deterministic, no LLM): hard constraints (age ±4-median &
  ≤8 spread, shared language, women-only, blocked pairs) + weighted chemistry scoring
  (interest Jaccard, energy-variance balance, depth alignment, humor, novelty, optional embeddings)
- [x] seed = language-group → age-sorted **validity-checked** chunking → blocked-pair repair;
  then **steepest-ascent hill-climb** (validity-preserving swaps). Every table valid by construction.
- [x] **matching eval suite ≥ 0.90**: 66 feasible-by-construction golden events → **composite 0.975,
  ZERO hard-constraint violations**, quality measured as lift over best-of-40 random-valid. Blocks in ci-ai.
- [x] engine unit tests (10): placement conservation, every constraint, determinism, no-LLM
- [x] api: `POST /admin/events/:id/match` (proxy → persist match_run + assignments + seat bookings),
  `GET …/match/explain`, `POST …/reveal`; `GET /events/:id/my-table`, `…/checkin-token`, `POST …/checkin`
- [x] BullMQ: venue-reveal (T-24h) + match-trigger (T-36h) job (every 5 min; off under test)
- [x] web: `/events/[id]/table` — locked countdown card → **3D flip** → venue + directions;
  animated **table teaser** (silhouettes fill in with names as people check in, 8s poll); QR check-in
- [x] **matching e2e (6)**: seeded 30-guest event → 5 valid tables w/ explanations, venue hidden
  pre-reveal, time-travel reveal hook, QR check-in unlocks seat, host-only check-in gating
- [x] `make test` green (12 turbo · 27 api e2e · ai ruff/mypy/pytest); `make eval` matching PASS

### Decisions (M3)
- **Hill-climb bug found & fixed**: the first implementation mutated tables mid-scan while iterating
  their own contents → duplicated/lost attendees (masked as "violations"). Rewrote as steepest-ascent
  (find best swap read-only, apply, rescan). Validity-preserving swaps never change the attendee multiset.
- **Golden data is feasible by construction** (built from valid seed-tables) — the eval's zero-violation
  requirement is only fair on solvable events; infeasible synthetic events would be an unfair gate.
- **AiClient resolves AI_URL at call time** (not import) so e2e suites can retarget the ai service
  per-file (onboarding uses a local stub; matching hits the real engine at :8000).
- **api e2e now `--runInBand`**: DB-backed suites raced on shared state under parallel jest workers.
- **Admin dashboard UI deferred to M6** ("admin polish" per plan §11) — the explain view + run-matching
  are exposed and tested via API; the web admin surface lands with deck approvals & moderation queues.
- QR token embeds the booking id + nonce; host/self gating enforced. Stored-nonce verification is a
  noted M7 hardening (dev/mock flow is sufficient now).

## M2 — Events, booking & payments   [DONE]
- [x] seed: 6 venues, 8 events (2 past) + tables, 30 quiz-completed users (deterministic LCG)
- [x] cities + events modules: public list/detail (filters city/type/date/budget), admin CRUD behind RolesGuard
- [x] **venue privacy**: address only in payloads once status ∈ revealed/live/completed — e2e-asserted on list AND detail
- [x] bookings: SELECT…FOR UPDATE capacity transaction, waitlist, two-truths, 48h-credit cancellation
- [x] payments: provider abstraction (mock auto-succeeds | razorpay stub), webhook endpoint
- [x] jobs: BullMQ housekeeping worker — booking-expiry every 60s (skipped under NODE_ENV=test)
- [x] **oversell race e2e**: 10 concurrent bookings × 6 seats → exactly 6 confirmed, wall held in DB
- [x] waitlist promotion on cancel + on expiry — e2e-asserted
- [x] web public: /events/[slug] (ISR 300 + Event JSON-LD + canonical), /cities/[city], sitemap.ts, robots.ts
- [x] web app: /explore (type+budget chips), booking flow (seat → two truths → confirmed/waitlist), /tonight
- [x] **Playwright booking happy path** green (login → explore → book → mock-pay → two truths → confirmed → tonight)
- [x] **Lighthouse: SEO 1.00, Performance 0.98** on /, /cities/bangalore, /events/[slug] (gates ≥ 0.95 / ≥ 0.90)
- [x] `make test` green: 12 turbo tasks · 21 api e2e (4 suites) · 20 ai pytest

### Decisions (M2)
- Cancellation credit is a status (`refunded`) for v1 — a credits ledger is out of scope; the
  policy boundary (48h) lives in bookings.types.ts and is e2e-tested from the event clock.
- Waitlist promotion auto-charges via the provider abstraction; on mock it confirms instantly.
  With a real provider the promoted booking sits pending_payment under the same 15-min expiry.
- Free events (run club) skip payment entirely — straight to confirmed.
- BFF allowlist moved to regex patterns (paths now carry UUIDs).
- Login honors a sanitized `?next=` redirect after OTP (booking pages send users through it).
- **Next 15.5 streaming metadata** rendered async `generateMetadata` into `<body>` (hoisted to
  head via client JS) — Lighthouse's meta-description audit checks `<head>` and scored dynamic
  pages 0.91. Fixed with `htmlLimitedBots: /.*/` in next.config so all UAs get blocking in-head
  metadata. Fallback metadata (fetch timeout) now also carries a description, defensively.
- **turbo web race**: `build` and `typecheck` both touch `.next/types`; added `apps/web/turbo.json`
  making web's typecheck depend on its build so a combined `turbo run build typecheck` can't flake.
  (The real gates — `make test`, CI — run these as separate sequential steps and never raced.)
- Playwright booking test: the first click after a client-side nav lands in the freshly-mounted
  component's hydration gap; `waitForURL` + `toBeEnabled` before the click makes it deterministic.

## M1 — Auth, profiles & the quiz   [DONE]
- [x] phone-OTP auth: mock provider logs the code, `000000` accepted in dev; JWT access (15m) + refresh (30d); global guard with `@Public` escape hatch
- [x] `GET/PATCH /v1/me`, presigned selfie upload to MinIO (bucket auto-created with public-read `photos/`)
- [x] quiz v1 seeded **verbatim** from docs/seed-content.md (15 questions); `GET /v1/quiz` keeps trait weights server-side; `POST /v1/quiz/responses` → ai → profile persisted + facets (interests/dietary/languages/intent) applied to the user
- [x] ai `/profile/compute`: deterministic trait normalization + the 8-archetype grid + template blurbs — zero LLM required
- [x] web: `/login` (OTP) → quiz intro (asks first name) → one-question-per-screen quiz (springy, resumable via localStorage, honors reduced motion) → 3D flip archetype reveal with trait bars → OG story card (1080×1920) → selfie upload → `/you`
- [x] typed client regenerated (`packages/types/src/api.gen.d.ts`)
- [x] tests: ai 20 pytest · api 10 e2e (full onboarding journey, auth guards, facet assertions, ai-stub with internal-token assertion) · Playwright browser flow ×2 · `make test` green
- [x] verified by hand: OG card renders (screenshot), selfie presign → PUT → public GET all 200

### Decisions (M1)
- **Auth.js v5 deferred** (plan §8 stack note): thin BFF session instead — httpOnly cookies set by
  Next route handlers, `/api/bff/*` proxy with one-shot refresh rotation. Auth.js can wrap this
  later with zero api changes. Recorded as stack friction per CLAUDE.md.
- **Trait normalization**: api derives per-trait ceilings from the quiz definition (sum of max
  |option weight| per question); ai clamps `sum/ceiling` to [-1,1]. Deterministic and unit-tested.
- **ai does not read the DB for profiling** — api resolves selected options → weights and sends
  them over; keeps the service boundary crisp.
- **Presigned uploads sign against `S3_PUBLIC_URL`** (new env var): SigV4 signs the host, and the
  browser hits `localhost:9000`, not the compose-internal `minio:9000`. Found by exercising the
  path with curl — a signed-for-internal-host URL 403s.
- **OG route inlines brand hex** — satori can't resolve CSS custom properties; documented as the
  single sanctioned exception to the tokens-only rule.
- **Motion + tests**: quiz/reveal wrapped in `MotionConfig reducedMotion="user"` (a11y), and
  Playwright emulates reduced motion — springs otherwise never satisfy its stability check.
- **`make up` now passes `--renew-anon-volumes`** — anonymous node_modules volumes survive
  image rebuilds and shadow newly-added dependencies (cost an hour; worth documenting).
- Photo flow e2e: presign+PUT+GET proven via curl; the browser UI path is manual-verified only
  (Playwright skips file-picker upload for now).

## M0 — Scaffold & pipelines   [DONE — CI proof pending first push]
- [x] monorepo tooling (pnpm + turbo + root scripts)
- [x] docker compose stack + Makefile + .env.example
- [x] packages/ui tokens + base components, packages/types, packages/config
- [x] services/ai boots `/health` (works with LLM_MODEL unset) — ruff/mypy/pytest green (12 tests)
- [x] services/api `/health` + `/ready` + `/docs`, full Prisma schema (§5) + migrations + seed skeleton
- [x] apps/web builds statically with brand landing, logos wired from assets/
- [x] infra/terraform isolated skeleton — fmt clean, `validate` green for dev+prod (checked via dockerized terraform 1.9)
- [x] CI workflows (web/api/ai/terraform/evals/release) — every step also executed locally
- [x] **clean-slate acceptance**: `make down-v && make up && make seed && make test` all green
      (web :3000 ✓ · api :4000 /health /ready /docs ✓ · ai :8000/health with models unset ✓)
- [ ] push to GitHub → confirm the six workflows go green on a hello-world PR
      (no remote configured yet — needs the operator's repo URL)

### Decisions
- **UUID v7 PKs**: Postgres 16 has no native `uuidv7()`, so the base migration
  (`00000000000000_base_extensions`) defines `uuid_generate_v7()` in plpgsql; all PKs use
  `dbgenerated`. Verified: seeded ids carry the version-7 nibble.
- **`bookings.payment_id` dropped** from the schema — the `payments.booking_id` FK covers the
  relation; keeping both invites drift (plan §5 listed both directions).
- **User profile fields nullable** (name/dob/gender/city/dietary): users are created at first
  OTP verify with only a phone; onboarding (M1) fills the rest.
- **Web CI smoke for M0** is `next start` + curl (landing + /health) — the Playwright
  booking-happy-path smoke replaces it in M2 when booking exists (plan §9.2 target intact).
- **Eval runner exists from M0** (`python -m evals.run`): suites register as they land
  (matching M3, retrieval/generation M6); an implemented suite scoring < 0.90 exits non-zero.
  Runner currently reports "not implemented yet" — no gate is faked green.
- **ESLint**: flat-config base shared via `@mulaqat/config` (no-explicit-any = error per
  CLAUDE.md). Web uses the same base; `eslint-config-next` can layer on in M1 if wanted.
- **Compose dev volumes**: only `apps/web` is bind-mounted for HMR (with anonymous volumes
  shielding node_modules/.next). api/ai rebuild on change — revisit in M4 if it drags.
- **Terraform secrets module**: `for_each` over a sensitive map is invalid in TF —
  iterate `nonsensitive(var.parameters)` (keys are env-var names), values wrapped `sensitive()`.
- **terraform plan/apply in CI degrade gracefully**: when AWS secrets are absent the jobs
  log "skipped" instead of failing — fmt/validate/tflint still gate every PR.
- **prod compose override** disables ollama/mailhog via `deploy.replicas: 0` — prod uses a
  hosted LLM API through env (plan §9.3).

### Decisions (landing design pass, 2026-07-17)
- **Design working agreement**: operator supplied `system-prompt.md` (design principles —
  intentional hierarchy, no AI-template tropes, WCAG AA, polish states). Applied on top of
  CLAUDE.md; where they conflict, CLAUDE.md + brand.md win (Inter and the warm palette are
  deliberate brand choices, not defaults).
- **Button text on terracotta is ink, not white**: white on #D9603B is 3.7:1 (fails AA for
  body-size); ink #1E1912 is 4.6:1. New constant token `--on-accent` (does not flip in dark).
- **Testimonials section skipped** (plan §8 lists one): no real quotes exist pre-launch and
  fabricated social proof is off-brand and dishonest. Replaced with formats + trust sections,
  all copy sourced from plan-1 §5. Revisit when Phase-0 dinners produce real quotes.
- **Hero visual = the brand mark, animated** (seats settle in, saffron "you" last, dashed
  seating orbit): brand geometry instead of invented illustration/stock. Photography can
  replace it when real event photos exist (product plan prefers photography).
- **Scroll reveals are progressive enhancement**: hidden states gated on `html.js`; no-JS
  users and `prefers-reduced-motion` get the full static page.
- Verified via Playwright screenshots: desktop light/dark + mobile, stepped-scroll pass.

### Blockers
- none
