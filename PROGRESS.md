# Mulaqat — Progress

## Homepage redesign + retheme   [DONE — 2026-07-19, operator-directed]
- Palette rethemed per operator direction (reference: sinqlo.com scheme): warm off-white #f9f9f6,
  ink #231f20, ONE vivid orange accent #ff832c, coral spark #ff847e, pastel chips (yellow/green/
  blue/coral/beige, backgrounds only), band #f3f2f0. Supersedes assets/brand.md terracotta.
  AA kept: ink-on-orange 6.6:1; ink-soft darkened to #6c6766 (5.1:1) — reference grey failed AA.
- Homepage rebuilt on the getquoti.ai structure (operator reference): sticky nav with real routes,
  display hero + stacked claims + archetype social-proof row, 3 pain points, value band, 5 format
  cards, 4-step how-it-works, alternating feature blocks with honest mock-UI cards, trust strip,
  pricing teaser, native-details FAQ, orange CTA band, 4-column footer.
- New marketing routes: /how-it-works (with FAQPage JSON-LD), /pricing, /safety — shared
  MarketingNav/MarketingFooter; sitemap updated. Logo SVGs + OG cards recolored.
- Verified: build green, screenshots light/dark/mobile, Lighthouse SEO 1.00 / Perf 0.97 / A11y 1.00.


## M7 — Hardening & launch readiness   [DONE]
- [x] **Redis rate limiting** (`@Throttle` + fixed-window guard): OTP request 5/min, verify 10/min
  per IP; fails OPEN on cache errors; bypassed under NODE_ENV=test
- [x] **security/authz + IDOR e2e (7 tests)**: unauth → 401, tampered token → 401, IDOR on
  bookings/chats → 404 (no existence leak), admin routes → 403 for users, refresh-as-access → 401,
  Zod validation at boundaries
- [x] **SEO**: dynamic OG images for events (`/og/event`, 1200×630) wired into event metadata +
  Twitter card; sitemap/robots/JSON-LD/canonical/blocking-metadata from M2 intact
- [x] **Lighthouse on all public pages**: `/`, `/cities/[city]`, `/events/[slug]`, `/explore` →
  **SEO 1.00, Performance 0.98–0.99** (gates ≥ 0.95 / ≥ 0.90 met everywhere)
- [x] **terraform validate + fmt clean** for dev AND prod (init -backend=false → validate: Success)
- [x] **README runbook**: clone → running app in < 10 min, ops table, prod notes
- [x] `make test` green (12 turbo · 43 api e2e across 8 suites · ai ruff/mypy/pytest)

### Decisions (M7)
- Rate limiter is a global APP_GUARD ordered before the JWT guard; only routes with `@Throttle`
  metadata are limited. Fails open so a Redis blip never locks users out.
- IDOR responses use 404 (not 403) for another user's booking/chat — never confirm the resource
  exists to someone who shouldn't see it.
- Dynamic OG images inline brand hex (satori can't read CSS custom properties) — same documented
  exception as the archetype card.
- `terraform plan` (vs validate) needs real AWS creds; ci-terraform runs it on PRs when secrets
  exist and degrades to a logged skip otherwise (from M0). Validate+fmt+tflint gate every PR.

## M6 — RAG decks, membership & admin polish   [DONE]
- [x] **RAG pipeline** (ai): corpus ingest (chunk → embed → qdrant), top-k retrieval, generation
  (retrieve exemplars → prompt → parse → moderate), deterministic safety+format moderation
- [x] versioned prompts (`app/prompts/*.md`): deck_generate, judge_card_quality
- [x] **all three eval suites ≥ 0.90**: matching **0.975**, retrieval **0.92–1.0** (hit-rate@5),
  generation **1.0** (stable) with **0 safety violations** — blocking in ci-ai (matching) + nightly evals.yml
- [x] api: subscriptions (mock provider, auto-active), `/me/membership`, subscribe, who-sparked-me
- [x] **Plus gating server-side**: free = 3 connects/event, 4th → 403; Plus unlimited; Sparks never capped
- [x] admin deck queue: `POST /admin/decks/generate` (RAG → draft), `/pending`, `/:id/approve|reject`
  — generated cards land `safety_reviewed=false`, deck stays `draft` until an admin approves
- [x] **membership e2e (4)**: connects cap enforced server-side, Plus removes it, sparks uncapped,
  who-sparked-me is Plus-only AND shows MUTUAL sparks only (spark-privacy invariant preserved)
- [x] verified live: RAG generate → moderation queue → approve; `make test` green (12 turbo · 36 api e2e · 39 pytest)

### Decisions (M6)
- **"See who Sparked you" (a plan Plus perk) CANNOT reveal one-sided Sparks** — that breaks the
  non-negotiable Spark-privacy invariant AND paywalls around safety. So `who-sparked-me` returns
  MUTUAL sparks only, Plus or not. The genuine Plus levers are unlimited connects + priority seats.
- **Eval models**: a 3B model is too weak to reliably clear the 0.90 creative-quality bar (generation
  dipped to 0.72 on unlucky runs; the 3B judge even rejected gold-standard seed cards). Pinned
  **qwen2.5:7b** for generation + judging in CI (CI-only, in evals.yml — allowed). nomic-embed-text
  for embeddings. `EVAL_JUDGE_MODEL` config lets the judge differ from the app's LLM.
- **LLM-judge scope**: it is a SAFETY/usability reviewer (rejects unsafe / >140 / gibberish), NOT a
  creativity critic — a reliable automated judge can't grade "fun" without heavy false-rejects.
  Subjective taste is the human admin-approval step (decks are draft until approved). `safety_violations`
  stays an independent hard gate (any → suite fails). This makes the gate meaningful AND stable.
- **Ollama `OLLAMA_MAX_LOADED_MODELS=1`** in compose — local machines can't hold 3B+7B+embed at once;
  the eval swaps generator↔judge in sequential phases.
- Deterministic moderation (regex/format) is the first-pass quality gate; `multiple_questions` flags
  only 3+ `?` so rhetorical "A or B? which?" cards survive.

## M5 — Connections, Spark & chat   [DONE]
- [x] **Spark privacy invariant** (the M5 crown jewel): a one-sided Spark is invisible to the
  recipient in EVERY response shape — `/me/connections` (only mine-outgoing + mutual), `/debrief`
  (only my own i_sparked/i_connected flags, no "sparked_me"), `/chats` (none until mutual). Sparks
  require BOTH users open_to_dating AND both sent → only then `mutual` + a direct chat opens.
- [x] Connect (friends) mutual-gated the same way; both only ever between people who attended the
  same event (checked-in bookings) — no swipe-on-strangers, ever.
- [x] ratings (`POST /events/:id/ratings`, private, one per booking) + `/events/:id/debrief`
- [x] chat: direct (spark) + table-group (7-day expiry); `ChatGateway` (`/chat` ns, JWT, rooms
  `chat:{id}`, member-gated); REST list/messages/send; sends blocked past `expires_at`
- [x] jobs: rating-nudge (T+2h opens the table group chat), chat-expiry (daily)
- [x] web: `/debrief/[id]` (star rating → Connect/Spark picker → **full-screen mutual-Spark glow**,
  classy, no confetti), `/people` (chats + connected + "you reached out", never incoming one-sided),
  `/people/chats/[id]` (realtime socket chat, reconnect-safe)
- [x] **spark-privacy e2e (6 tests)**: one-sided invisible everywhere · mutual opens chat ·
  friends_only can't spark · spark toward friends_only never mutualizes · connect mutual-gated
- [x] `make test` green (12 turbo · 32 api e2e · ai); 4 Playwright regressions still green

### Decisions (M5)
- `myConnections` query is `OR[{fromUserId: me}, {status: mutual, toUserId: me}]` — structurally
  impossible to surface an incoming pending spark. Belt: `direction` is only "outgoing" or "mutual".
- No error oracle when sparking someone not open_to_dating — the spark is recorded silently (can
  never mutualize) so the sender can't infer the recipient's intent from an error.
- Table-group chats aren't deleted at T+7d; `expires_at` blocks sends and hides them from `/chats`
  (reversible, keeps history for possible re-open). "chat-expiry" job reports the count for observability.
- `/debrief/[id]` and `/people/chats/[id]` use event/chat UUIDs (not under `/events/[slug]`).

## M4 — The game room   [DONE]
- [x] **5 game engines** as pure state-machine reducers (`games/engines/`): icebreaker (level-vote
  majority unlocks L2/L3), hot_takes (A/B split), most_likely (**counts only, never who voted**),
  two_truths (vote the lie), trivia (first-correct scores) — 14 unit tests incl. the privacy invariant
- [x] **Socket.IO gateway** `/games` ns, JWT handshake, rooms `table:{id}`; **Redis-backed state**
  so refresh/reconnect resume via a full `room:state` snapshot on join
- [x] vote privacy at the wire: per-voter choices stripped from broadcasts during voting; most_likely
  never exposes the vote map even at reveal
- [x] decks seeded verbatim from seed-content.md (9 decks, 89 cards, safety_reviewed=true)
- [x] web game room (`/rooms/[id]`): lobby → synced card deck (spring animations), icebreaker level
  meter, A/B + player vote UIs, trivia buzz, animated vote-result bars, "Play something else"
- [x] **2-context Playwright**: two browsers play icebreaker (synced card, **survives refresh**,
  advance-in-sync) → play deck to end → hot-takes round (both vote, both see the split)
- [x] engine edge-case fix: tongueless attendees now group into one table (was N singleton tables)

### Decisions (M4)
- Routes reorganized: authed `/rooms/[id]` and `/tables/[id]` (event UUID) moved OUT of
  `/events/[slug]/*` — Next forbids two dynamic segment names (`[id]` vs `[slug]`) at one path.
- Game state is the single source of truth in Redis; the gateway rebroadcasts the full snapshot
  after every event so all clients (and reconnects) render identically — no client-side game logic.
- **most_likely privacy**: enforced in BOTH the engine (result carries counts only) and the gateway
  (`publicState` blanks the vote map) — belt and suspenders, unit-tested.
- Engine `_language_groups` folds languageless attendees into the largest group (found via the M4
  game test: 6 profileless guests were being split into 6 singleton tables).

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

### Decisions (palette application pass, 2026-07-24)
Operator reported twice that the theme "still looks the same". Diagnosis: the
tokens **were** already sinqlo's exact palette (verified against their live
`themes/sinqlo/style.css` — `#f9f9f6` `#231f20` `#ff832c` `#ff847e` `#ffff97`
`#c4f3c4` `#bde2f8` `#e6e4dd` all match). The problem was *distribution*, not hue:
the retheme swapped hex values while keeping the old layout of colour — orange
fill on every button and CTA band, pastels reduced to 8px dots — so it read as
the old terracotta design. Copying sinqlo's hexes alone cannot look different,
because their scheme is the same warm-orange-on-off-white family.

- **Primary button is pastel green with an ink hairline, 12px radius** (sinqlo's
  `.green-button`), not an orange pill. Orange moved to a new `accent` variant.
  This is the single highest-leverage change — buttons appear on every page.
- **Sections are flat pastel blocks** (`bg-chip-beige`, `bg-chip-green`) instead
  of three near-identical off-whites; pricing tiers are white/yellow/green per
  `.pricing-card:nth-child(n)`; CTA bands are ink with a green button.
- **New `Mark` component** — marker-pen highlight behind headline words
  (sinqlo `.ellipse-text span`). Uses `<mark>` so emphasis survives unstyled.
- **Cards are flat**: beige hairline, no drop shadow — depth comes from the
  colour block, not elevation.
- **New `--accent-ink` token.** `#ff832c` as *text* on paper is 2.33:1 and fails
  AA; it works only as a fill. Coloured type now uses `#a34600` (5.8:1) in light
  and stays `#ff832c` in dark (7.3:1 on `--paper`). This was a real pre-existing
  a11y bug introduced with the orange retheme, found by the new audit below.
- **New `--ink-muted` token** for body copy on pastel fills: `--ink-soft` lands
  at 4.4:1 on beige/green (fails). `#484344` is 7.6:1.
- **`EventCard` heading is h2, not h3** — on /explore and /cities/[city] the grid
  follows the h1 directly, so h3 tripped the heading-order audit.
- **New `pnpm --filter @mulaqat/web audit:contrast`** — walks every text node on
  the public pages in both colour schemes, resolves Tailwind's
  `color-mix(in oklab,…)` output, and fails on any pair under AA. It caught 7 real
  contrast defects this pass; keeping it as a standing gate.

Verified: lint+typecheck+build green; contrast audit clean (light + dark);
Lighthouse perf 0.98 / a11y 1.00 / SEO 1.00 / best-practices 1.00 on all three
public URLs (a11y was 0.98 on /cities/bangalore before the heading fix).

### Blockers
- none
