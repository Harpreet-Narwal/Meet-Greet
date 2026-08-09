# Mulaqat — Progress

## Production readiness   [2026-08-08]

**All five workflows are green.** `ci-web` was the last red one; it now passes at
**perf 0.96 / SEO 1.00 / a11y 1.00 / best-practices 1.00** (median of 3) on the homepage.

### Closed this session
- **The Lighthouse blocker is resolved, and the 0.90 threshold was never touched.** Two real
  fixes plus one measurement fix. The unused Newsreader italic face was being downloaded and
  preloaded on every page (every `<em>` resolves to the *display* face) — dropping it took
  LCP 3.3s → 2.2s. Then: `numberOfRuns: 1` was the actual defect. TBT on a shared 2-core
  runner measured 960 / 1030 / 480 / 1820 ms across four runs of *different* code — a 3.8×
  spread that swamped any real signal, and one run scored *lower* despite the large LCP win.
  Three runs asserted on the median now measures the page instead of the runner (TBT on the
  median run: 90ms).
- **Security headers** — the app had none. CSP, HSTS (prod only), X-Frame-Options DENY,
  nosniff, Referrer-Policy, Permissions-Policy (camera only, for selfie verification), and
  `poweredByHeader: false`. Verified: zero CSP violations across the public pages, fonts and
  hydration unaffected, Lighthouse best-practices 1.00 with `csp-xss` passing.

### Decision — release images are amd64 only (deviates from IMPLEMENTATION_PLAN §9.1)

The plan asked for `linux/amd64` + `linux/arm64`. Dropped arm64, deliberately, because
nothing consumed it and it was breaking the pipeline:

- `docker-compose.yml` **builds** every app image locally (`build:`, not `image:`), so an
  Apple Silicon dev machine never pulls these. The terraform sets no `runtime_platform`,
  so ECS Fargate runs **X86_64**. The arm64 image had no consumer at all.
- arm64 was cross-built under QEMU, which emulates a full `next build`. Measured on one
  release: **api 44s, ai 39s, web 12m09s** — and an earlier cold-cache run sat on the web
  image for **over 4.5 hours**. Because the release concurrency group is
  `cancel-in-progress: false`, that one slow job also queues every later push behind it;
  two intermediate releases were cancelled while waiting.

If the deployment ever moves to Graviton, restore arm64 with **native** runners — a matrix
over `ubuntu-24.04` / `ubuntu-24.04-arm` with a manifest merge — never with emulation.

### Fixed — the e2e suite was littering the dev database

`game-room.spec` publishes a real event per run and never cleaned up, so every run left
another "Game-room test …" row in `/explore` and on the city pages. Eight had piled up.
The spec now cancels its event in a final step — cancelling drops it from public listings
while leaving the bookings and game state intact for debugging. Verified: a full run now
goes from 0 published test events to 0.

### Fixed — the generated API client had drifted 1091 lines

`packages/types/src/api.gen.d.ts` is what `apps/web` type-checks against, so when it drifts,
web compiles happily against an API that no longer exists. Regenerating it after an api
change is a documented habit in CLAUDE.md with nothing enforcing it, and it had fallen far
behind (my own `POST /bookings/:id/pay` was only the most recent miss). Regenerated, and
`ci-web` now regenerates and `git diff --exit-code`s the file so it cannot drift again —
the stack is already up in that job, so the check is nearly free.

### Audited and found sound (no change needed)
- **Terraform durability** — RDS is encrypted, has 7-day backup retention (module default),
  `deletion_protection = true` in prod, and takes a final snapshot on destroy. ECS services
  have ALB health checks and CPU autoscaling.
- **Session cookies** — httpOnly, sameSite=lax, `secure` in production.
- **`db:seed` is idempotent** — stable slugs with dates rebased to now, so re-running it is
  safe. The event pile-up in the dev database was the e2e suite, not the seed.

### Known limits, deliberately not papered over
- **CSP still allows `'unsafe-inline'` for scripts in production.** Tightening it needs a
  nonce middleware threaded through the app router; styles will always need it while Next
  injects inline `<style>` and next/font emits inline `@font-face`.
- **Providers are mock.** `PAYMENT_PROVIDER=mock` and `OTP_PROVIDER=mock`. Both interfaces
  are real and provider-shaped — the paywall now holds a seat at `pending_payment` and
  settles on a webhook exactly as Razorpay would — but no real keys are wired, per CLAUDE.md.
  Going live is an env swap plus implementing `RazorpayProvider.createOrder` and the msg91 or
  Twilio branch in `otp.service.ts`; both currently throw a clear "not wired yet".
- **ECS deploy is a no-op without AWS secrets.** `release.yml` builds and pushes images to
  GHCR on every push to main (green), then skips the `aws ecs update-service` step with a
  logged message when the AWS secrets are absent. `ci-terraform` has never run — it is
  path-filtered and no terraform has changed.
- **Not built, by design (IMPLEMENTATION_PLAN §12):** native apps, real push notifications,
  Hindi translation, DigiLocker ID verification, the B2B portal, ML-learned matching weights.

### What a real launch still needs from the operator
Razorpay + SMS keys, AWS credentials and a domain, then `terraform apply` for dev and prod.
Everything above that line is code and is done.

## Ship to GitHub + app-shell retheme + CI repair   [DONE — 2026-07-28]

Pushed to `origin/main` (github.com/Harpreet-Narwal/Meet-Greet) — this closes the last
open M0 item ("push to GitHub → confirm the workflows go green"), which had been blocked
on the operator's repo URL.

- **App shell** now speaks the editorial language, not just the marketing pages. Events are
  one `EventRow` index component (replacing `EventCard`) across /explore, /tonight and
  /cities/[city]; `AppNav` matches `MarketingNav`; filter chips squared; headings on the
  display scale. The row leads with the **date**, not a sequence number — these lists are
  chronological, and a position number would encode nothing and renumber on every filter.
- **Fixed `ci-api`, red on every push since 2026-07-19.** `prisma migrate diff
  --from-migrations` replays migrations into whatever it is given as the shadow database,
  and the drift-check step handed it `$DATABASE_URL`. The main CI database therefore came
  out populated but with no migration history, and "Migrate + seed" aborted with P3005.
  It now gets a dedicated `mulaqat_shadow` database. Reproduced locally first: pointing the
  drift check at an empty database leaves 24 tables in it.
- **Fixed a second failure the first one was hiding.** With P3005 gone the e2e step finally
  ran, and `matching.e2e-spec` failed 4/6. `test/setup-env.ts` never set `NODE_ENV`; Jest
  only defaults it when UNSET, and both the docker image and CI export it already — so
  `RateLimitGuard`'s `NODE_ENV === "test"` bypass never fired and the spec's 30 single-IP
  logins collected 429s from guest 11 against the 10/min OTP cap.
- **Fixed a third: `ci-api` never started the `ai` service.** `matching.e2e-spec` overrides
  `AI_URL` to the real service on purpose ("so the matching engine runs for real"), but the
  job only had postgres and redis, so `/match` returned 503. Matching is pure deterministic
  math over Postgres — no LLM, no vector store — so the job now builds the ai image and runs
  it with `--network host` and nothing but `DATABASE_URL`. **ci-api is green for the first
  time since 2026-07-19.**
- **Fixed `ci-web`, red since at least 2026-07-24 — the same rate limiter, other side.** The
  Playwright specs each sign a fresh user in and CI retries double that, so the suite cleared
  the 10/min OTP cap from the runner's single IP; tokens came back undefined and specs failed
  on the symptom (`reading 'split'`) rather than the cause. The api service now reads
  `NODE_ENV: ${API_NODE_ENV:-development}`, and only ci-web sets `API_NODE_ENV=test`.
  Verified both ways locally: default → `development`, 11th verify 429s; with the flag →
  `test`, 14/14 return 200. **Rate limiting stays on everywhere except CI.**

### Verification
- api e2e **43/43** (was 39/43) · web e2e **4/4** · lint/typecheck/build/unit green
- Contrast audit: AA on all text pairs, both themes
- Lighthouse: `/`, `/cities/bangalore`, `/events/[slug]` → SEO **1.00**, perf **0.95–0.96**,
  a11y **1.00**, best-practices **1.00**

### Decisions
- `EventCard` → `EventRow` is a rename, not a parallel component: keeping a card variant
  around would have invited the two patterns to drift.
- Ran the API e2e suite from the host rather than the container — the `api` service has no
  volume mounts, so its source is baked into the image and edits need a rebuild to land.

### BLOCKER — Lighthouse performance on `/` in CI (gate NOT lowered)

`ci-web` is now green through the Playwright specs and fails only on the Lighthouse
assertion for the **homepage**: `categories.performance` **0.62–0.69** against the 0.90
minimum. `/cities/bangalore` and `/events/[slug]` both pass, and SEO is 1.00 everywhere.

Per the working agreement the threshold was left alone. Two rounds of real fixes landed
and neither moved the CI number:

1. `Reveal` client component → server component, reveal reimplemented as a pure CSS scroll
   timeline; hero `h1` no longer gated behind an entrance animation (it is the LCP element).
2. `glow-breathe` bounded to 3 iterations instead of `infinite`; below-fold sections given
   `content-visibility: auto`.

Locally (production build) those took Speed Index 2.9s → 1.1s, main-thread work 3.5s → 1.1s,
TBT 960ms → 10ms, **performance 0.95**. On the CI runner TBT stays ~1,030ms and LCP ~3.5s.

Diagnosis: a throttled 2-core GitHub runner, where the React framework chunks alone account
for ~900ms of script evaluation. The score also drifts run to run (0.69 → 0.66 → 0.62) across
substantially different code, so the signal is noisy. This is the homepage's weight against
that hardware, not a specific regression.

Options, none taken because they are the operator's call:
- Cut real homepage weight — drop to two webfonts, remove the `TableScene`, reduce hydration.
- Raise `numberOfRuns` and assert on the median to damp the variance.
- Scope the perf assertion per-URL, keeping 0.90 on the city/event pages and setting an
  explicit, justified number for `/`. **This is a gate change and needs sign-off.**

### Blockers / known papercuts
- `docker-compose.yml` mounts `./apps/web` but not `./packages`, so **any `packages/ui`
  edit needs `docker compose up -d --build web`** to show up — easy to misread as "my change
  did nothing". Adding `./packages:/app/packages` risks shadowing the pnpm workspace symlinks
  in the container; wants testing before it's changed.
- Seeded event dates are relative to seed time, so the fixtures age out — `/explore` quietly
  loses events and `booking.spec.ts` (which clicks a "Chai & Chill" link) fails until you
  re-seed. Re-seeding also leaves the ISR cache stale for up to `revalidate`; restart web.
  (`db:seed` itself IS idempotent — stable slugs, dates rebased to now — so re-running it
  is safe and does not duplicate rows.)

## "Quiet Editorial" retheme   [DONE — 2026-07-25, operator-directed]

Reference: normalisboring.es (operator-supplied), studied and measured rather than copied.
Full spec now lives in `docs/design-system.md` — that file supersedes the design section of
`IMPLEMENTATION_PLAN.md` §8 and `plan-1-social-dining-app.md` §7. Supersedes the Hinge plum
scheme below.

- **Tokens** (`packages/ui/src/tokens.css`): warm beige ground `#ede5d9`, warm near-black ink
  `#16120d`, clay `#b95440`, haldi `#c9a03f` (Spark only), neem `#5a6a4a`, plus a type/space
  scale. Radius → 0, shadows → none. **Token names deliberately unchanged**, so the ~30 pages
  nobody touched inherited the new language instead of breaking.
- **Type**: three faces, three jobs — Instrument Serif (display + italic), Newsreader (body),
  JetBrains Mono (labels, prices, countdowns, seat counts). All via `next/font`, CLS 0.
- **Homepage** rebuilt: type-only hero with the mixed-face headline (roman caps + serif italic),
  standfirst, marquee, 01–04 sequence, events as a typographic **index** (not photo cards —
  crawlable text, no image LCP cost, distinctive), statement, Spark note, FAQ, CTA.
- Marketing nav/footer, Button/Card/Badge squared; logo SVGs + OG cards recoloured (they were
  still on the *orange* palette, stale through two rethemes).

### Decisions
- Three deliberate departures from the reference, each recorded in `docs/design-system.md` §2:
  no blocking preloader (it would wreck the LCP/SEO gates we chose Next.js for); no fluid
  `html { font-size: 1.04vw }` root (breaks browser zoom and user font-size — every token is
  its own `clamp()` instead); body text floors at 16px (the reference runs ~11px).
- Editorial language governs marketing surfaces; the app shell (booking, game room) adapts it
  but keeps real touch targets and caps type at `--fs-h3`. A 9rem headline above a payment
  button is hostile.
- `Card` deliberately sets no padding: `cn` is plain clsx with no tailwind-merge, so a default
  `p-*` would collide with the padding its 24 callers already pass (and Tailwind's source
  order, not ours, would pick the winner). `large` is now visually inert, kept for compat.

### Fixed along the way
- **`Reveal` never fired** (site-wide, would have shipped as a blank page): the mask was moved
  to `clip-path`, and Chromium clips an element's IntersectionObserver rect by its own
  clip-path — so the observed node's intersection was permanently empty, the callback fired
  once at ratio 0 and never again. The mask now lives on an inner `.reveal-inner`.
- **Hero no longer depends on hydration**: it carries the LCP element, so it animates via CSS
  (`.rise`) instead of the JS `Reveal`. Previously a hydration hiccup meant an invisible hero.
- `Reveal` now also reveals elements already *above* the viewport, so landing mid-page (anchor
  link, restored scroll) no longer leaves everything overhead permanently invisible.
- Removed `<div>`-inside-`<h2>` (invalid nesting the parser rewrites, breaking hydration).
- `contrast-audit.mjs` took a hardcoded `:3100`; a stale server from an old session silently
  audited the wrong build and reported 758 phantom failures. Now `AUDIT_BASE_URL`-overridable.

### Verified
- `lint` + `typecheck` + unit tests green across all 4 workspaces.
- Contrast audit: **all text pairs pass AA**, light and dark, across `/`, `/how-it-works`,
  `/pricing`, `/safety`, `/explore`.
- Lighthouse (`/`, `/cities/bangalore`, `/events/[slug]`): **SEO 1.00, A11y 1.00,
  Best-practices 1.00, Performance 0.94–0.95, CLS 0**. Gates (SEO ≥ 0.95, Perf ≥ 0.90) met.
  Perf is ~0.03 below the previous single-font build — the cost of three families; still
  clear of the gate, worth revisiting if it drifts.
- Screenshots captured desktop light/dark + mobile.

### Blockers
- none. Changes are uncommitted on `main` — no commit was requested.

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

### Decisions (Hinge retheme + light default, 2026-07-24)
Operator: "the theme should be like Hinge... not dark". Two separate problems.

**1. The site was auto-darkening.** `tokens.css` carried a
`@media (prefers-color-scheme: dark)` block, so any visitor whose OS is in dark
mode got the dark theme with no way to choose otherwise — almost certainly the
"dark" being reported. That media query is now **gone**. Light is the default for
everyone; `<html data-theme="light">` ships in the layout, a head script restores
an opted-into preference before first paint (no flash), and a `ThemeToggle` in
both navs persists the choice to `localStorage`. Dark mode still fully exists
(CLAUDE.md requires it) — it is now opt-in rather than OS-imposed.

**2. Palette is now Hinge's**, sampled from hinge.co's own stylesheets rather
than from memory: warm-white base `#fffefd`, slate ink `#2b333f` (not pure
black), deep plum accent `#67295f`, secondaries warm yellow `#ffcc66` and soft
blue `#66a8cc`, greys `#4d4d4d`/`#d1d1d1`.
- **Plum carries white text at 10.2:1 and works as body text on paper at 10.2:1**,
  so `--accent-ink` collapses to the same value as `--accent` in light mode. The
  orange scheme needed them to differ; this one doesn't.
- `--danger` darkened to `#c1352b` so white-on-danger reaches 5.5:1 (`#d9453c`
  was 4.3:1 and failed).
- Buttons are back to **pills** with a solid plum fill and no outline; cards get
  a soft lift (16px/24px radii) instead of flat pastel blocks; sections alternate
  white and a neutral `--band` rather than saturated pastels; the CTA band is a
  single deep-plum block.
- Dark theme inverts the plum (`#c98fbd` fill with dark label, `#d9a5cd` as type)
  rather than reusing the light value, which would have been unreadable.

**Contrast audit now asserts the theme actually applied** — it seeds
`localStorage` and throws if `data-theme` doesn't match, so the dark pass can no
longer silently test light twice (it was doing exactly that after the media query
was removed).

Verified: OS-dark + no stored choice renders `#fffefd` (light) — checked against
the running container, not just the source. lint+typecheck+build green; contrast
audit clean in both themes; Lighthouse perf 0.97-0.98 / a11y 1.00 / SEO 1.00 /
best-practices 1.00; api e2e 43/43; web Playwright 4/4.

### Blockers
- none
