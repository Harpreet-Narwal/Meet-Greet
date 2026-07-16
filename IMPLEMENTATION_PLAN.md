# Mulaqat — Master Implementation Plan (v1.0)

> **Audience:** an AI coding agent (Claude Sonnet) executing this plan end-to-end.
> **Product context:** see `plan-1-social-dining-app.md` (the product/business plan). This document is the *engineering* plan.
> **Companion files:** `CLAUDE.md` (working agreement & conventions), `docs/seed-content.md` (quiz + game deck seed data), `assets/` (logo & brand).

---

## 0. Mission

Build **Mulaqat** — a personality-matched social events platform for Indian metros. Strangers take a fun personality quiz, get matched into curated tables of 6 for dinners/run clubs/game nights, play built-in ice-breaker games at the table, and can connect (or Spark → date) only with people they've actually met.

The product must feel **alive, warm, and delightful** — Apple-grade calm design with playful micro-interactions. Every screen should have one obvious action, generous whitespace, and moments people want to screenshot.

### Non-negotiable engineering requirements

1. **Next.js** frontend — chosen specifically for **SEO** (SSR/SSG marketing + city/event pages must be crawlable and fast).
2. **Python AI service** — matching engine, personality profiling, RAG-powered game-content generation.
3. **Monorepo with 3 application workspaces** (`apps/web`, `services/api`, `services/ai`) **plus an isolated `infra/terraform` workspace** (own pipeline; designed so it can be split into its own repo later with zero code changes).
4. **Docker Compose** runs the entire stack locally with one command, including **Ollama** for local LLM inference.
5. **GitHub Actions** CI/CD with path-filtered pipelines per workspace + Terraform plan/apply pipeline.
6. **All AI settings are configuration, not code**: LLM provider, chat model, embedding model, vector store (Qdrant default, pgvector supported), and document store are env/config-driven. The operator (user) will plug in their own model names.
7. **Quality gate: ≥ 90% accuracy** on the AI eval suites (matching evals + retrieval evals + generation-quality evals). CI blocks below threshold.

---

## 1. Architecture Overview

```mermaid
graph TB
    subgraph Client
        B[Browser / PWA]
    end

    subgraph "apps/web — Next.js 15"
        W[SSR/SSG pages<br/>App Router]
        BFF[Route handlers<br/>auth session, BFF proxy]
    end

    subgraph "services/api — NestJS"
        REST[REST API<br/>OpenAPI]
        WS[Socket.IO gateway<br/>game rooms, chat]
        JOBS[BullMQ workers<br/>venue reveal, reminders, expiry]
    end

    subgraph "services/ai — FastAPI (Python)"
        MATCH[Matching engine]
        PROF[Personality profiler]
        RAG[RAG deck generator]
        EVAL[Eval harness]
    end

    subgraph Data
        PG[(Postgres 16<br/>+ pgvector ext)]
        RD[(Redis 7)]
        QD[(Qdrant)]
        S3[(MinIO / S3)]
    end

    subgraph "Local AI"
        OL[Ollama<br/>chat + embed models]
    end

    B --> W
    W --> BFF
    BFF --> REST
    B <-->|websocket| WS
    REST --> PG
    REST --> RD
    REST --> S3
    JOBS --> PG
    JOBS --> RD
    REST -->|internal HTTP| MATCH
    MATCH --> PG
    RAG --> QD
    RAG --> OL
    PROF --> OL
    MATCH -.optional embeddings.-> OL
```

**Service boundaries (keep these strict):**

| Service | Owns | Never does |
|---|---|---|
| `apps/web` | UI, SEO pages, session cookie handling, BFF proxying to api | Direct DB access, business logic |
| `services/api` | All business logic, DB writes, payments, websockets, jobs, authz | LLM calls, matching math |
| `services/ai` | Matching, profiling, embeddings, RAG, evals | User-facing auth, payments, DB writes to core tables (read-only access + its own tables) |
| `infra/terraform` | Cloud infra as code | Application logic; nothing imports from it |

Inter-service auth: `api → ai` uses a shared internal bearer token (`INTERNAL_API_TOKEN`). The `ai` service is never exposed publicly.

---

## 2. Repository Layout

Create a single monorepo named **`mulaqat`**:

```
mulaqat/
├── apps/
│   └── web/                        # Next.js 15 (App Router, TS)
│       ├── src/app/                # routes (see §8)
│       ├── src/components/         # feature components
│       ├── src/lib/                # api client, auth, utils
│       ├── public/                 # logos, favicon, og fallbacks
│       ├── Dockerfile
│       └── package.json
├── services/
│   ├── api/                        # NestJS 10 (TS)
│   │   ├── src/modules/            # one module per domain (see §6–7)
│   │   ├── prisma/                 # schema.prisma + migrations + seed
│   │   ├── test/                   # e2e tests
│   │   ├── Dockerfile
│   │   └── package.json
│   └── ai/                         # FastAPI (Python 3.12, uv)
│       ├── app/
│       │   ├── main.py
│       │   ├── config.py           # pydantic-settings (see §5)
│       │   ├── providers/          # llm.py, embeddings.py (provider abstraction)
│       │   ├── vectorstore/        # qdrant.py, pgvector.py (same interface)
│       │   ├── matching/           # engine, scoring, constraints
│       │   ├── profiling/          # quiz → traits → archetype
│       │   ├── decks/              # RAG ingestion + generation
│       │   └── routers/
│       ├── evals/                  # golden datasets + eval runners (see §10)
│       ├── tests/
│       ├── Dockerfile
│       └── pyproject.toml
├── packages/
│   ├── ui/                         # shared React components + design tokens
│   ├── types/                      # shared TS types + generated API client
│   └── config/                     # shared eslint/tsconfig/tailwind presets
├── infra/
│   ├── terraform/                  # isolated workspace — own pipeline (see §11.4)
│   │   ├── modules/  (network, ecs-service, rds, redis, s3-cdn, dns)
│   │   ├── envs/dev/  envs/prod/
│   │   └── README.md
│   └── docker/                     # any shared docker bits (init SQL, ollama entrypoint)
├── .github/
│   └── workflows/                  # ci-web.yml, ci-api.yml, ci-ai.yml, ci-terraform.yml, release.yml, evals.yml
├── docker-compose.yml              # full local stack
├── docker-compose.prod.yml         # production-shaped overrides (reference)
├── Makefile                        # dev UX: make up / down / seed / eval / test
├── turbo.json
├── pnpm-workspace.yaml
├── .env.example
├── CLAUDE.md
└── README.md
```

**Tooling versions:** Node 22 LTS, pnpm 9, Turborepo, TypeScript 5.x strict, Python 3.12 + `uv`, Ruff + mypy, Prisma 5, Next.js 15, NestJS 10, Tailwind CSS 4, Postgres 16 (image: `pgvector/pgvector:pg16`), Redis 7, Qdrant latest, Ollama latest.

---

## 3. Local Development (Docker Compose)

`docker-compose.yml` must bring up the **entire** stack: `make up` → working app at `http://localhost:3000`.

```yaml
name: mulaqat
services:
  web:
    build: { context: ., dockerfile: apps/web/Dockerfile, target: dev }
    ports: ["3000:3000"]
    env_file: .env
    volumes: ["./apps/web:/app/apps/web", "/app/node_modules"]
    depends_on: { api: { condition: service_healthy } }

  api:
    build: { context: ., dockerfile: services/api/Dockerfile, target: dev }
    ports: ["4000:4000"]
    env_file: .env
    depends_on:
      postgres: { condition: service_healthy }
      redis: { condition: service_healthy }
    healthcheck: { test: ["CMD", "wget", "-qO-", "http://localhost:4000/health"], interval: 5s, retries: 20 }

  ai:
    build: { context: services/ai }
    ports: ["8000:8000"]
    env_file: .env
    depends_on:
      postgres: { condition: service_healthy }
      qdrant: { condition: service_started }
    healthcheck: { test: ["CMD", "curl", "-f", "http://localhost:8000/health"], interval: 5s, retries: 20 }

  postgres:
    image: pgvector/pgvector:pg16
    environment: { POSTGRES_USER: mulaqat, POSTGRES_PASSWORD: mulaqat, POSTGRES_DB: mulaqat }
    ports: ["5432:5432"]
    volumes: ["pgdata:/var/lib/postgresql/data"]
    healthcheck: { test: ["CMD-SHELL", "pg_isready -U mulaqat"], interval: 5s, retries: 20 }

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    healthcheck: { test: ["CMD", "redis-cli", "ping"], interval: 5s, retries: 20 }

  qdrant:
    image: qdrant/qdrant:latest
    ports: ["6333:6333"]
    volumes: ["qdrant:/qdrant/storage"]

  ollama:
    image: ollama/ollama:latest
    ports: ["11434:11434"]
    volumes: ["ollama:/root/.ollama"]
    # Operator pulls their chosen models once:
    #   docker compose exec ollama ollama pull <LLM_MODEL>
    #   docker compose exec ollama ollama pull <EMBEDDING_MODEL>

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    ports: ["9000:9000", "9001:9001"]
    environment: { MINIO_ROOT_USER: mulaqat, MINIO_ROOT_PASSWORD: mulaqat123 }
    volumes: ["minio:/data"]

  mailhog:
    image: mailhog/mailhog:latest
    ports: ["8025:8025", "1025:1025"]

volumes: { pgdata: {}, qdrant: {}, ollama: {}, minio: {} }
```

**Makefile targets (required):** `up`, `down`, `logs`, `seed` (migrate + seed DB + ingest decks into vector store), `test` (all workspaces), `eval` (AI eval suites), `models` (pulls the configured Ollama models).

**Dev-mode conveniences:** OTP login prints code to api logs and accepts `000000`; payments use the `mock` provider (auto-success); emails land in Mailhog (`:8025`); photos go to MinIO.

---

## 4. Environment Configuration

Single root `.env.example` (compose injects into all services). **Every value below must work out-of-the-box locally except the two Ollama model names, which the operator sets.**

```bash
# ── Core ────────────────────────────────────────────
NODE_ENV=development
APP_URL=http://localhost:3000
API_URL=http://api:4000            # internal
NEXT_PUBLIC_API_URL=http://localhost:4000
AI_URL=http://ai:8000              # internal only
INTERNAL_API_TOKEN=dev-internal-token-change-me

# ── Database / cache / storage ─────────────────────
DATABASE_URL=postgresql://mulaqat:mulaqat@postgres:5432/mulaqat
REDIS_URL=redis://redis:6379
S3_ENDPOINT=http://minio:9000
S3_BUCKET=mulaqat
S3_ACCESS_KEY=mulaqat
S3_SECRET_KEY=mulaqat123

# ── Auth ────────────────────────────────────────────
AUTH_SECRET=dev-auth-secret-change-me
OTP_PROVIDER=mock                  # mock | msg91 | twilio

# ── Payments ────────────────────────────────────────
PAYMENT_PROVIDER=mock              # mock | razorpay
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=

# ── AI service (ALL configurable — never hardcode) ──
LLM_PROVIDER=ollama                # ollama | openai | anthropic
OLLAMA_BASE_URL=http://ollama:11434
LLM_MODEL=                         # e.g. llama3.1:8b — OPERATOR SETS THIS
LLM_TEMPERATURE=0.7
EMBEDDING_PROVIDER=ollama          # ollama | openai
EMBEDDING_MODEL=                   # e.g. nomic-embed-text — OPERATOR SETS THIS
EMBEDDING_DIM=768                  # must match the embedder
VECTOR_STORE=qdrant                # qdrant | pgvector
QDRANT_URL=http://qdrant:6333
QDRANT_COLLECTION=mulaqat_decks
DOCUMENT_STORE=postgres            # where raw corpus docs live
MATCHING_ALGO_VERSION=v1
EVAL_PASS_THRESHOLD=0.90
```

**AI provider abstraction (services/ai/app/providers/):** define `ChatProvider` and `EmbeddingProvider` protocols with `ollama` implementations now and stubs for `openai`/`anthropic`. `VectorStore` protocol with `QdrantStore` and `PgVectorStore` implementations — identical interface (`upsert`, `search`, `delete_collection`). Selection happens **only** in `config.py` via env. Swapping model/store must require zero code changes.

If `LLM_MODEL`/`EMBEDDING_MODEL` are unset, the ai service must boot fine and return a clear `503 {"error": "LLM_MODEL not configured"}` from generation endpoints — never crash the stack. Matching (which is deterministic math, §9.2) must work **without any LLM configured**.

---

## 5. Data Model (Postgres via Prisma — owned by `services/api`)

All tables snake_case, UUID v7 PKs, `created_at`/`updated_at` everywhere. Soft-delete (`deleted_at`) on user-generated content.

```prisma
// Identity & profile
users(id, phone UNIQUE, email?, full_name, first_name, dob, gender enum(woman|man|nonbinary|prefer_not),
      city_id FK, photo_url?, selfie_verified bool, id_verified bool, role enum(user|host|admin),
      relationship_intent enum(friends_only|open_to_dating), dietary enum(veg|nonveg|jain|vegan|eggetarian),
      languages text[], interests text[], bio?, status enum(active|suspended|banned))

personality_profiles(user_id PK/FK, quiz_version, trait_energy float, trait_depth float, trait_novelty float,
      trait_structure float, humor_styles text[], archetype text, archetype_emoji text,
      embedding_id?,           // reference into vector store, optional
      completed_at)

quiz_questions(id, version, ord, locale, kind enum(single|multi|slider|either_or), text, subtext?,
      options jsonb,           // [{id, label, emoji, trait_weights: {energy: +0.5, ...}}]
      trait_key?)              // for sliders
quiz_responses(id, user_id, question_id, answer jsonb, UNIQUE(user_id, question_id))

// Geography & venues
cities(id, name, slug UNIQUE, state, is_live bool, launch_order int)
venues(id, city_id, name, slug, address, neighborhood, lat, lng, vibe_tags text[],
       price_band enum(low|mid|high), capacity, partner_status enum(prospect|active|paused), photos text[])

// Events & booking
events(id, city_id, venue_id?,                       // venue hidden from users until reveal
       type enum(dinner|run_club|game_night|chai|trek), title, slug, description,
       starts_at timestamptz, duration_min, price_inr int, capacity int,
       budget_band enum(₹|₹₹|₹₹₹), women_only bool, host_id FK?,
       status enum(draft|published|matching|revealed|live|completed|cancelled),
       neighborhood_teaser text, cover_image?)
event_tables(id, event_id, table_number, capacity default 6)
bookings(id, user_id, event_id, table_id?, status enum(pending_payment|confirmed|waitlisted|checked_in|no_show|cancelled|refunded),
       amount_inr, payment_id?, two_truths jsonb?,   // {truths: [a,b], lie: c} collected at booking
       UNIQUE(user_id, event_id))
payments(id, booking_id?, subscription_id?, provider, provider_order_id, provider_payment_id?,
       amount_inr, status enum(created|paid|failed|refunded), raw jsonb)

// Matching
match_runs(id, event_id, algo_version, params jsonb, status enum(running|completed|failed),
       score_summary jsonb, created_by FK)
match_assignments(id, match_run_id, table_id, user_id, table_score float, explain jsonb)

// Games
decks(id, kind enum(icebreaker|hot_takes|most_likely|trivia|two_truths), locale enum(en|hinglish),
      title, level int?,       // icebreakers: 1|2|3
      source enum(seed|generated|admin), status enum(active|draft|retired))
deck_cards(id, deck_id, ord, text, answer?,          // answer for trivia
      tags text[], safety_reviewed bool)
game_sessions(id, table_id, event_id, deck_id, state jsonb,   // {phase, current_card, votes, scores, level}
      started_by FK, started_at, ended_at?)

// Post-event
event_ratings(id, booking_id UNIQUE, overall int 1-5, host_rating int?, venue_rating int?, feedback?)
connections(id, event_id, from_user, to_user, kind enum(connect|spark),
      status enum(pending|mutual|expired|declined),
      UNIQUE(event_id, from_user, to_user, kind))    // sparks require BOTH users open_to_dating
chats(id, kind enum(direct|table_group), event_id?, expires_at?)   // table groups expire T+7d
chat_members(chat_id, user_id, joined_at)
messages(id, chat_id, sender_id, body, kind enum(text|image|voice), created_at)

// Trust & safety
reports(id, reporter_id, reported_id, event_id?, reason enum, details, status enum(open|actioned|dismissed))
blocks(blocker_id, blocked_id, UNIQUE pair)
verifications(id, user_id, kind enum(selfie|gov_id), status enum(pending|approved|rejected), media_url, reviewed_by?)

// Membership
subscriptions(id, user_id, tier enum(plus|concierge), status enum(active|past_due|cancelled),
      provider_sub_id, current_period_end)

// AI-service-owned (separate schema `ai`)
ai.documents(id, source, title, body, metadata jsonb)           // document store corpus
ai.ingestions(id, collection, doc_count, embedder, dim, created_at)
ai.eval_runs(id, suite, score float, passed bool, report jsonb, git_sha, created_at)
```

**Prisma seed (`make seed`)** loads: 2 cities (Bangalore live, Mumbai coming-soon), 6 venues, 8 events across types (some in the past for testing history), 30 fake users with completed quizzes (varied traits), the full quiz from `docs/seed-content.md`, all seed decks, 1 admin (`admin@mulaqat.app`), 2 hosts. Then triggers deck ingestion into the vector store (skips gracefully if `EMBEDDING_MODEL` unset).

---

## 6. API Service (`services/api`) — NestJS

Modules: `auth`, `users`, `quiz`, `cities`, `events`, `bookings`, `payments`, `matching` (proxy to ai), `games` (+ Socket.IO gateway), `connections`, `chat`, `ratings`, `safety`, `subscriptions`, `admin`, `jobs`.

**Cross-cutting:** global Zod validation pipe, OpenAPI at `/docs` (generates typed client into `packages/types` via `pnpm gen:client`), rate limiting (Redis), structured pino logs, `/health` + `/ready`, RBAC guard (`user|host|admin`).

### REST surface (v1 — prefix `/v1`)

```
POST   /auth/otp/request            {phone} → sends OTP (mock logs it)
POST   /auth/otp/verify             {phone, code} → {access_token(JWT 15m), refresh_token(30d), is_new_user}
POST   /auth/refresh
GET    /me                          profile + personality + subscription + counters
PATCH  /me                          profile fields
POST   /me/photo                    → presigned upload URL

GET    /quiz                        active quiz for locale
POST   /quiz/responses              bulk answers → api forwards to ai /profile/compute → stores profile
GET    /me/personality              archetype card data (shareable)

GET    /cities
GET    /events?city=&type=&date=&budget=      public, cached, SEO-consumable
GET    /events/:slug                          public detail (venue hidden pre-reveal)
POST   /events/:id/bookings                   → creates booking + payment order
POST   /payments/webhook                      provider webhook (mock provider: auto-fires)
GET    /me/bookings                           upcoming + past
POST   /bookings/:id/two-truths               {truths, lie}
POST   /bookings/:id/checkin                  {qr_token} → unlocks game room (host or geo+time gated)
DELETE /bookings/:id                          cancel (policy: >48h full credit)

POST   /admin/events                          CRUD events, assign venue/host
POST   /admin/events/:id/match                → ai /match/compose → persists assignments
POST   /admin/events/:id/reveal               manual reveal override
GET    /admin/reports, /admin/verifications   moderation queues

GET    /events/:id/my-table                   post-reveal: first names, fun facts, teaser
POST   /events/:id/ratings
POST   /events/:id/connections                {to_user, kind: connect|spark}
GET    /me/connections?status=mutual|pending
GET    /chats /chats/:id/messages  POST /chats/:id/messages
POST   /safety/reports  POST /safety/blocks  POST /safety/sos     (SOS: logs + notifies admin channel)
```

**Booking flow invariants:** seat capacity enforced with a DB transaction + `SELECT … FOR UPDATE`; double-booking impossible (`UNIQUE(user_id,event_id)`); waitlist auto-promotes on cancellation; **no payment → no seat** (pending bookings expire after 15 min via BullMQ job).

**Spark privacy invariant (critical):** a one-sided Spark is **never** visible to the recipient. Only when both users have `relationship_intent=open_to_dating` AND both sent Sparks does it become `mutual` and open a direct chat. Enforce in service layer + test explicitly.

### BullMQ scheduled jobs

| Job | Schedule | Action |
|---|---|---|
| `venue-reveal` | event T-24h | set `status=revealed`, notify attendees, expose venue + table teaser |
| `match-trigger` | event T-36h | auto-run matching if admin hasn't |
| `booking-expiry` | every minute | expire unpaid pending bookings |
| `event-reminder` | T-3h | email/notification nudge |
| `chat-expiry` | daily | close table group chats at T+7d |
| `rating-nudge` | event T+2h | prompt ratings + connections |

### Socket.IO gateway (`/games` namespace)

Auth via JWT in handshake. Rooms: `table:{table_id}`.

```
client→server: room:join {table_id}          (must be checked-in attendee or host)
               game:start {deck_kind, level} (host or table vote)
               card:advance | card:answer {answer} | vote:cast {card_id, choice}
               level:vote {level}            (majority vote to go deeper)
server→client: room:state (full snapshot on join/reconnect — state lives in Redis)
               presence:update, game:started, card:revealed, vote:result, scores:update, game:ended
```

Game state machine per deck kind lives in `games/engines/*.ts` (pure functions, unit-tested):
- **icebreaker:** deal card → discuss → advance; `level:vote` majority unlocks L2/L3.
- **hot_takes:** show prompt → 30s vote (side A/B) → reveal split → discuss.
- **most_likely:** anonymous vote for a table-mate → reveal counts only (never who voted).
- **two_truths:** pull each attendee's booking entries → table guesses the lie → reveal.
- **trivia:** timed rounds, table score, leaderboard across tables at multi-table events.

---

## 7. AI Service (`services/ai`) — FastAPI

### Endpoints (all require `INTERNAL_API_TOKEN`)

```
GET  /health                        → {status, llm_configured, vector_store, models}
POST /profile/compute               {quiz_version, answers[]} → {traits, humor_styles, archetype, archetype_emoji, blurb}
POST /match/compose                 {event_id | inline attendees[], params?} → {tables[], score_summary, explain}
POST /decks/ingest                  (re)ingest corpus → chunks → embeddings → vector store
POST /decks/generate                {kind, level?, locale, count, context_tags[]} → cards[] (RAG, see below)
POST /decks/moderate                {cards[]} → safety verdicts
POST /embeddings                    {texts[]} → vectors (thin passthrough, used for profile embeddings)
POST /eval/run                      {suite: matching|retrieval|generation|all} → scores + pass/fail
```

### 7.1 Personality profiling (deterministic + LLM flavor)

- Trait scores are **computed deterministically** from `trait_weights` in the quiz definition (weighted sum, normalized to [-1, 1]). No LLM in the scoring path → reproducible.
- Archetype = lookup on the (energy × depth × novelty) grid → 8 archetypes (defined in `docs/seed-content.md`).
- The LLM (if configured) only writes the 2-sentence personalized blurb for the share card; fallback to templated blurbs when LLM unset.

### 7.2 Matching engine (the crown jewel — must NOT require an LLM)

Input: attendees with traits, interests, languages, age, gender, dietary, intent + event params. Output: tables of 5–6 maximizing group chemistry.

**Hard constraints (violations = invalid, never emit):**
1. Age band: max spread 8 years per table (±4 from median).
2. Language: every member shares ≥1 language with the whole table.
3. Gender balance: within event target (default 50±1 per table; `women_only` → all women).
4. Dietary compatibility: veg/Jain-heavy tables flagged for veg-friendly venue routing.
5. Blocked pairs (blocks table) never seated together; "met before" pairs avoided (soft→hard if rating was low).

**Scoring (weighted sum, weights in config):**
- `interest_overlap` — pairwise Jaccard on interests, averaged (want common ground).
- `personality_balance` — energy variance near target 0.35 (mix of talkers & listeners beats all-loud or all-quiet).
- `depth_alignment` — low variance on depth preference.
- `humor_compat` — overlap in humor styles.
- `novelty_bonus` — small bonus for 1–2 "wildcard" members (novelty trait high).
- `embedding_affinity` (optional) — mean pairwise cosine on profile embeddings; auto-skipped when embedder unset.

**Algorithm:** greedy seeding (most-constrained-first) → hill-climbing swaps between tables until no swap improves total score (max 500 iterations, seeded RNG for reproducibility). Every table gets an `explain` payload (top shared interests, balance notes) → powers the "table teaser" copy.

### 7.3 RAG deck generation

**Ingestion:** corpus = seed decks + admin-curated docs in `ai.documents` (document store). Chunk (per-card granularity), embed with configured embedder, upsert into configured vector store (Qdrant collection or pgvector table — same interface).

**Generation flow** (`/decks/generate`): retrieve top-k=12 similar cards for the requested kind/level/tags → prompt LLM with retrieved exemplars as style/quality anchors + hard rules (no politics/religion/sexual content, no income/caste/appearance questions, Hinglish natural not forced, Indian cultural context, one question per card, ≤140 chars) → parse to JSON (retry once on invalid) → run `/decks/moderate` safety pass → return with `safety_reviewed=false` (admin approves in dashboard before decks go live).

### 7.4 Prompts

All prompts live in `services/ai/app/prompts/*.md` as versioned files (never inline strings). Required prompts: `deck_generate.md`, `deck_moderate.md`, `archetype_blurb.md`, `table_teaser.md`, `judge_card_quality.md` (for evals).

---

## 8. Web App (`apps/web`) — Next.js 15

**Stack:** App Router, TypeScript strict, Tailwind 4 + design tokens from `packages/ui`, shadcn/ui primitives restyled to brand, Framer Motion, TanStack Query, Auth.js v5 (JWT session bridged to api tokens), Socket.IO client, `next-intl` scaffolding (en now, hi-ready).

### Route map

```
(marketing) — SSG/ISR, fully SEO'd, no auth
  /                       Landing: hero, how-it-works, testimonials, city selector, waitlist CTA
  /cities/[city]          City page (SEO: "meet new people in Bangalore")
  /cities/[city]/[type]   Category pages: dinners|run-clubs|game-nights|chai|treks
  /events/[slug]          Public event page (JSON-LD Event schema)
  /how-it-works  /safety  /pricing  /about  /blog/[slug]

(auth)
  /login                  Phone → OTP (dev: code shown in toast)
  /onboarding/quiz        The 5-min personality quiz (see below)
  /onboarding/result      Archetype reveal + share card
  /onboarding/photo       Selfie + verification

(app) — authed, app-shell with 4-tab bottom nav (mobile) / sidebar (desktop)
  /tonight                Home: upcoming event card (countdown → reveal → teaser), recs below
  /explore                Category chips, calendar strip, budget filter, event cards
  /events/[slug]/book     Booking flow: seat → two-truths entry → pay → confirmed
  /events/[id]/table      Post-reveal: venue card, table teaser, directions, check-in QR
  /events/[id]/room       THE GAME ROOM (realtime, see below)
  /events/[id]/debrief    T+2h: rate night → Connect/Spark picker
  /people                 Connections, pending, group chats
  /people/chats/[id]      Chat (big photos, voice notes stub, date-idea prompts on Spark chats)
  /you                    Profile, personality card, badges, history ("12 dinners · 23 people met"), membership

(host)  /host/events/[id]     Roster, QR check-in scanner, game-room controls
(admin) /admin                Events CRUD, run matching (with explain view), venues, deck approvals, moderation queues
```

### SEO requirements (the reason Next.js was chosen — treat as acceptance criteria)

- Marketing + event pages: SSG/ISR (`revalidate: 300`), **zero** client-side data fetch for primary content.
- `generateMetadata` on every public route; canonical URLs; OG + Twitter cards.
- **Dynamic OG images** via `next/og` for events and personality archetype share cards.
- `sitemap.ts` (cities × categories × published events) + `robots.ts`.
- JSON-LD: `Organization`, `Event` (with offers/price), `FAQPage` on how-it-works.
- Core Web Vitals: LCP < 2.5s, CLS < 0.1; Lighthouse SEO ≥ 95, Performance ≥ 90 (CI check via `unlighthouse` or `lighthouse-ci` against the built app).
- Semantic HTML, `next/image` everywhere, font via `next/font` (Inter, self-hosted).

### Design system (`packages/ui`) — "Apple-grade warmth"

Tokens (CSS variables, light + dark from day one):

```
--paper: #FAF7F2      --ink: #1E1912       (dark: #121009 / #F2EDE4)
--accent: #D9603B     (terracotta — primary actions, the table)
--accent-2: #ECA72C   (saffron — sparks, highlights, celebration)
--sage: #7A8B6F       (success/verified)   --danger: #C24141
--radius: 14px/20px cards   --shadow: soft ambient, never harsh
Type: Inter — 34px/700 large titles, 17px body, tight tracking on headings
Motion: springs (stiffness 300, damping 30), 150–250ms, respects prefers-reduced-motion
```

Principles enforced in review: one primary action per screen; cards not lists (full-bleed photo event cards); frosted-glass sheets (`backdrop-blur`) for event details; no banner ads, no dark patterns, ever.

### Signature interactive moments (build these with care — they ARE the product)

1. **Quiz** — one question per screen, big tappable emoji option cards, springy progress bar, haptic-feel micro-bounce on select, sliders with playful labels. Must feel like a game, not a form. Auto-saves; resumable.
2. **Archetype reveal** — card-flip 3D animation into the personality card ("Warm Firecracker 🔥"), watermarked, `Web Share API` + downloadable PNG (via the OG-image endpoint) sized for Instagram Stories.
3. **Venue reveal (T-24h)** — locked card with live countdown → flip animation → venue photo, map, table teaser. The lock state should make people check the app repeatedly.
4. **Table teaser** — 6 anonymized silhouettes that fill in with first names as people check in at the venue (live via socket).
5. **Game room** — synced card deck: current card huge and centered, level meter ("Going deeper 🔥"), vote reveals animate in, trivia has a table-vs-table pulse bar. Reconnect-safe (state snapshot on join).
6. **Mutual Spark** — full-screen warm saffron glow + gentle scale-in of both avatars. Classy, no confetti spam. One-sided sparks: absolutely no UI trace.
7. **Empty states & copy** — warm, funny, Indian-flavored ("Your Wednesday table awaits. Chai's on them if you're late."). No lorem ipsum anywhere.

---

## 9. DevOps

### 9.1 Dockerfiles

- `apps/web`: multi-stage — deps → build (standalone output) → `node:22-alpine` runner, non-root, `NEXT_TELEMETRY_DISABLED=1`. Dev target with HMR.
- `services/api`: multi-stage build → dist runner, prisma engines included, non-root.
- `services/ai`: `python:3.12-slim` + `uv sync --frozen`, non-root, uvicorn.
- All images: healthchecks, `linux/amd64` + `arm64` (buildx), pinned base images.

### 9.2 GitHub Actions (`.github/workflows/`)

All Node jobs use pnpm + Turborepo remote-cache-ready setup; concurrency groups cancel superseded runs.

**`ci-web.yml`** — on PR/push touching `apps/web/**`, `packages/**`:
lint → typecheck → unit tests (Vitest) → build → Playwright smoke (booking happy path against compose stack) → docker build (no push).

**`ci-api.yml`** — on PR/push touching `services/api/**`, `packages/**`:
lint → typecheck → `prisma validate` + migration drift check → unit tests → e2e tests with Postgres/Redis service containers → docker build.

**`ci-ai.yml`** — on PR/push touching `services/ai/**`:
`ruff check` + `ruff format --check` → `mypy` → pytest unit tests → **matching eval suite (blocking, ≥ `EVAL_PASS_THRESHOLD`)** — deterministic, no LLM needed → docker build.

**`evals.yml`** — nightly + manual dispatch + required before release:
spins up Ollama service container, pulls small pinned models (`llama3.2:3b` + `nomic-embed-text` — CI-only defaults), runs **retrieval + generation eval suites**, uploads report artifact, fails below 0.90.

**`ci-terraform.yml`** — on PR touching `infra/terraform/**`:
`fmt -check` → `validate` → `tflint` → `terraform plan` per env, plan posted as PR comment. On merge to `main`: `apply` gated behind GitHub Environment approval (`dev` auto after plan review, `prod` requires manual approval).

**`release.yml`** — on push to `main`:
build & push all three images to GHCR tagged `sha` + `latest`; on git tag `v*`: semver tags + GitHub Release with changelog. Deploy step = update ECS services to new image (via terraform output-driven `aws ecs update-service`), behind `prod` environment gate.

### 9.3 Terraform (`infra/terraform`) — isolated workspace

AWS (Mumbai `ap-south-1`). Remote state: S3 + DynamoDB lock. Two envs: `dev`, `prod` (thin `envs/*` roots composing shared `modules/`).

| Module | Contents |
|---|---|
| `network` | VPC, public/private subnets, NAT, SGs |
| `ecs-service` | Reusable Fargate service (used 3× for web/api/ai), ALB (web+api public, ai internal), autoscaling, CloudWatch logs |
| `rds` | Postgres 16 + pgvector, automated backups, param group |
| `redis` | ElastiCache Redis 7 |
| `s3-cdn` | Media bucket + CloudFront |
| `dns` | Route53 + ACM certs |
| `secrets` | SSM Parameter Store for env vars (never in state as plaintext where avoidable) |

Qdrant in prod: Qdrant Cloud (variable-provided URL/key) — or the `ecs-service` module with an EFS volume; make it a `var.vector_store_mode` choice. Ollama is **local-dev only**; prod points `LLM_PROVIDER` at a hosted API via env — zero code change (this is why §4's abstraction exists).

The workspace must never import from app code; document in `infra/terraform/README.md` how to extract it to a standalone repo (move folder + update one workflow path filter).

---

## 10. Quality: Testing & the 90% Accuracy Gate

### Test pyramid

| Layer | Tool | Blocking? |
|---|---|---|
| Unit (web/api) | Vitest / Jest | ✅ CI |
| Unit (ai) | pytest | ✅ CI |
| Game engines (pure state machines) | Vitest, property-based where useful | ✅ CI |
| API e2e (booking, spark privacy, capacity race) | Jest + supertest + real Postgres | ✅ CI |
| Web smoke (login → book → mock-pay → confirmed) | Playwright | ✅ CI |
| Matching evals | pytest eval harness | ✅ CI, ≥ 0.90 |
| Retrieval + generation evals | eval harness + Ollama | ✅ nightly/release, ≥ 0.90 |
| Lighthouse SEO/perf | lighthouse-ci | ✅ CI (web) |

### Eval suites (`services/ai/evals/`) — the ≥ 90% requirement

1. **Matching evals** (`evals/matching/`) — 60+ synthetic events in `golden/matching.jsonl` (varied sizes, skewed genders, language islands, blocked pairs, edge cases). Metrics: hard-constraint violation rate must be **0**; mean normalized table score; % of tables ≥ quality threshold. **Pass = composite ≥ 0.90.** Deterministic (seeded), runs in every CI.
2. **Retrieval evals** (`evals/retrieval/`) — 100 golden queries ("light icebreaker about food for a Hinglish table") with labeled relevant cards. Metrics: hit-rate@5, MRR. **Pass = hit-rate@5 ≥ 0.90.**
3. **Generation evals** (`evals/generation/`) — generate 50 cards across kinds/levels; LLM-judge (rubric in `judge_card_quality.md`: on-topic, safe, culturally apt, correct level, ≤140 chars, actually fun) + hard regex/safety checks. **Pass = ≥ 0.90 judged acceptable AND 0 safety violations.**
4. Every run writes to `ai.eval_runs` + prints a scorecard table. `make eval` runs all three locally.

If an eval suite fails, the agent must **fix the system, not lower the threshold.** Thresholds only change via explicit human sign-off.

---

## 11. Milestones (execute in order; each ends green)

Each milestone = branch → implement → all tests/evals pass → update `PROGRESS.md` → conventional commits. **Definition of done for every milestone:** `make up && make seed && make test` fully green from a clean clone.

**M0 — Scaffold & pipelines (foundation)**
Monorepo tooling, all three services boot with `/health`, compose stack + Makefile, `.env.example`, CI workflows green on a hello-world PR, Prisma schema + migrations + seed skeleton, `packages/ui` tokens + base components, logos wired into web (`assets/` → `apps/web/public/`).
*Accept:* `make up` from clean clone → web 3000, api 4000/docs, ai 8000/health all respond; every workflow passes.

**M1 — Auth, profiles & the quiz**
Phone-OTP auth (mock), JWT + refresh, onboarding quiz UI (seed content), `POST /quiz/responses` → ai `/profile/compute` → archetype reveal + share card (OG image), profile page, selfie upload to MinIO.
*Accept:* new user completes quiz → sees archetype card → shareable PNG; profile persisted; Playwright covers the flow.

**M2 — Events, booking & payments**
Cities/events/venues CRUD (admin), explore + event pages (SSG/ISR + JSON-LD), booking flow with mock payments + capacity transactions + waitlist + expiry job, two-truths collection, my-bookings, cancellation policy.
*Accept:* concurrent-booking race test proves no oversell; booking e2e green; event pages pass Lighthouse SEO ≥ 95.

**M3 — Matching & the reveal**
AI matching engine + **matching eval suite ≥ 0.90 in CI**, admin "run matching" with explain view, T-24h venue-reveal job, reveal UI (countdown → flip), table teaser, QR check-in.
*Accept:* seeded event of 30 users → 5 valid tables with explanations; reveal flow works end-to-end with a time-travel test hook.

**M4 — The game room**
Socket.IO gateway + Redis state, all 5 game engines, game room UI with animations, reconnect handling, host controls.
*Accept:* two browser contexts play a full icebreaker + hot-takes round in Playwright; state survives refresh.

**M5 — Connections, Spark & chat**
Ratings, Connect/Spark with the privacy invariant (explicit tests), mutual reveal moment, direct + 7-day table group chats (socket), people tab.
*Accept:* one-sided spark invisible in every API response (asserted by test); mutual flow opens chat; group chat expires via job.

**M6 — RAG decks, membership & admin polish**
Deck ingestion + generation + moderation queue (admin approves), **retrieval + generation evals ≥ 0.90**, subscriptions (mock provider) with Plus gating (connects limit, who-sparked-you), moderation/safety queues, host view.
*Accept:* `make eval` all suites ≥ 0.90; generated deck goes seed→review→live; Plus gates enforced server-side.

**M7 — Hardening & launch readiness**
Full SEO audit (sitemap, OG, structured data), dark mode QA, empty/loading/error states everywhere, rate limits, security pass (authz on every route, IDOR tests), Terraform envs apply cleanly (`plan` in CI), release pipeline pushes images, README + runbooks.
*Accept:* Lighthouse ≥ 90 perf / ≥ 95 SEO on all public pages; `terraform plan` clean in CI for dev+prod; a new dev can go clone → running app in < 10 minutes using README only.

---

## 12. Out of Scope for v1 (do NOT build yet)

Native mobile apps (the web app must be an installable PWA instead), real SMS/UPI providers (interfaces + mock only, real keys are env swaps), Hindi full translation (i18n scaffolding only), ML-learned matching weights (rule-based v1 + data collection hooks), B2B portal, DigiLocker ID verification (selfie review queue only), push notifications (email + in-app only).

---

## 13. Open Questions (safe defaults chosen — flag, don't block)

1. Brand name is a working title — build with the `mulaqat` token everywhere via a single `BRAND_NAME` constant so a rename is one commit.
2. Qdrant chosen as default vector store; pgvector implementation must stay green in tests (it's the prod-simplification path).
3. NestJS chosen for the api; if the agent hits friction, do NOT silently switch frameworks — note it in `PROGRESS.md`.

---

*End of plan. Read `CLAUDE.md` for the working agreement, then start at M0.*
